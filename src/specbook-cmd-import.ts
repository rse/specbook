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

/*  the options of the import command  */
export interface ImportOptions extends AiOptions {
    config:      Schema
    configfile?: string
    basedir?:    string
    inputs:      string[]
    verbose:     (msg: string) => void
}

/*  the LLM instruction for the import command (the format description is
    concatenated outside the template, as its own column 0 indentation
    would otherwise defeat the re-framing of the template)  */
const instruction = (description: string, files: string[], now: string): string => textframe`
    You are the import engine of SpecBook, a Markdown-based specification
    format. Import the information of the given foreign sources into the
    Markdown specification artifact files of the project, generating or
    updating the artifact files so they faithfully reflect the imported
    information. Strictly honor the following rules:

    -   Faithful reflection: the artifacts must reflect the imported
        sources exactly -- no more, no less.
    -   No fabrication: never invent content the sources do not support;
        leave gaps open instead of guessing.
    -   Surgical updates: when updating an existing artifact, change only
        what the imported information actually requires.
    -   Level-appropriate translation: re-express the imported facts at the
        artifact's level of abstraction; do not copy verbatim.
    -   Format conformance: strictly follow the specification format
        described below.
    -   Markdown generation: emit the Complex Format on levels 1-3
        ("#"/"##"/"###") and the Concise Format on level 4 and deeper.
    -   Timestamps: use "${now}" for the "Created:" and "Modified:"
        frontmatter of generated files, and refresh "Modified:" to
        "${now}" on updated files.
    -   Files: generate or update ONLY the following configured artifact
        files -- never any other file: ${files.join(", ")}
    -   Output: return ONLY the generated or updated files, each as a block
        of the exact form below, and no other text at all:

        <<<FILE: <name>>>>
        <content>
        <<<END-FILE>>>
` + `\n${description}`

/*  import foreign sources into the specification artifact files  */
export const importSpecification = async (options: ImportOptions): Promise<string[]> => {
    const basedir = options.basedir ?? "."
    const files   = options.config.map((artifact) => artifact.file).filter((file) => file !== undefined)

    /*  ensure at least one foreign source was given  */
    if (options.inputs.length === 0)
        throw new Error("no foreign sources given to import")

    /*  gather the existing artifact files and the foreign sources  */
    const existing = files
        .filter((file) => fs.existsSync(path.join(basedir, file)))
        .map((file) => renderFileBlock(file, fs.readFileSync(path.join(basedir, file), "utf8")))
    const sources = options.inputs
        .map((input) => renderFileBlock(input, fs.readFileSync(input, "utf8")))

    /*  let the LLM generate or update the artifact files  */
    options.verbose(`importing ${options.inputs.length} foreign source(s) into "${basedir}"`)
    const system = instruction(describeFormat({ config: options.configfile, basedir, embed: true }),
        files, timestamp())
    const prompt =
        "EXISTING ARTIFACT FILES:\n\n" + (existing.length > 0 ? existing.join("\n\n") : "(none)") +
        "\n\nFOREIGN SOURCES TO IMPORT:\n\n" + sources.join("\n\n")
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
