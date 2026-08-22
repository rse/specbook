/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

import { type Schema } from "./specbook-format-schema.js"
import { timestamp }                from "./specbook-llm.js"

/*  the options of the init command  */
export interface InitOptions {
    config:   Schema
    basedir?: string
    verbose:  (msg: string) => void
}

/*  initialize the configured specification artifact files below the
    base directory with their frontmatter and artifact heading  */
export const initSpecification = (options: InitOptions): string[] => {
    const basedir = options.basedir ?? "."
    fs.mkdirSync(basedir, { recursive: true })
    const now     = timestamp()
    const created = new Array<string>()
    for (const artifact of options.config) {
        if (artifact.file === undefined)
            continue
        const file = path.join(basedir, artifact.file)
        if (fs.existsSync(file)) {
            options.verbose(`skipping existing artifact file "${artifact.file}"`)
            continue
        }
        const name  = artifact.name ?? ""
        const paren = artifact.id !== undefined ? ` (${artifact.id})` : ""
        const text  =
            "---\n" +
            `Created:  ${now}\n` +
            `Modified: ${now}\n` +
            "---\n" +
            "\n" +
            `#   ${artifact.kind}: ${name}${paren}\n` +
            "\n"
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, text, "utf8")
        options.verbose(`created artifact file "${artifact.file}"`)
        created.push(artifact.file)
    }
    return created
}
