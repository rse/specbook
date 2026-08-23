/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"
import textframe from "textframe"

import { type Schema }    from "./specbook-format-schema.js"
import { describeFormat } from "./specbook-cmd-describe.js"
import { complete, timestamp, renderFileBlock, parseFileBlocks, type AiOptions }
    from "./specbook-llm.js"

/*  the options of the edit command  */
export interface EditOptions extends AiOptions {
    config:      Schema
    configfile?: string
    basedir?:    string
    query:       string
    verbose:     (msg: string) => void
}

/*  the LLM instruction for the edit command (the format description is
    concatenated outside the template, as its own column 0 indentation
    would otherwise defeat the re-framing of the template)  */
const instruction = (description: string, files: string[], now: string): string => textframe`
    You are the edit engine of SpecBook, a Markdown-based specification
    format. Apply the given edit request to the Markdown specification
    artifact files of the project. Strictly honor the following rules:

    -   Surgical changes: change only what the edit request actually
        demands; do not rewrite unrelated parts of an artifact.
    -   No fabrication: never invent content the edit request does not
        support; leave gaps open instead of guessing.
    -   Format conformance: strictly follow the specification format
        described below.
    -   Markdown generation: MIRROR the format each existing object already
        uses (keep Complex Format objects complex and Concise Format
        objects concise); for entirely new objects emit the Complex Format
        on levels 1-3 ("#"/"##"/"###") and the Concise Format on level 4
        and deeper.
    -   Timestamps: refresh the "Modified:" frontmatter of every changed
        file to "${now}"; keep "Created:" untouched.
    -   Files: update ONLY the following configured artifact files --
        never any other file: ${files.join(", ")}
    -   Output: return ONLY the actually changed files, each as a block of
        the exact form below, and no other text at all:

        <<<FILE: <name>>>>
        <content>
        <<<END-FILE>>>
` + `\n${description}`

/*  apply an edit request to the specification artifact files  */
export const editSpecification = async (options: EditOptions): Promise<string[]> => {
    const basedir = options.basedir ?? "."
    const files   = options.config.map((artifact) => artifact.file).filter((file) => file !== undefined)

    /*  ensure a non-empty edit request was given  */
    if (options.query.trim() === "")
        throw new Error("no edit request given")

    /*  gather the existing artifact files  */
    const existing = files
        .filter((file) => fs.existsSync(path.join(basedir, file)))
        .map((file) => renderFileBlock(file, fs.readFileSync(path.join(basedir, file), "utf8")))
    if (existing.length === 0)
        throw new Error(`no configured artifact files found in "${basedir}"`)

    /*  let the LLM apply the edit request  */
    options.verbose(`editing artifact files in "${basedir}"`)
    const system = instruction(describeFormat({ config: options.configfile, basedir, embed: true }),
        files, timestamp())
    const prompt =
        "EXISTING ARTIFACT FILES:\n\n" + existing.join("\n\n") +
        "\n\nEDIT REQUEST:\n\n" + options.query
    const response = await complete(options, system, prompt)

    /*  write back all returned artifact files  */
    const written = new Array<string>()
    for (const block of parseFileBlocks(response)) {
        if (!files.includes(block.name)) {
            options.verbose(`ignoring unconfigured file "${block.name}"`)
            continue
        }
        const file = path.join(basedir, block.name)
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, block.content, "utf8")
        options.verbose(`wrote artifact file "${block.name}"`)
        written.push(block.name)
    }
    return written
}
