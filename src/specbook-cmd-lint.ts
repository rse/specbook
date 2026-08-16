/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

import { loadConfig }                          from "./specbook-config.js"
import { type Diagnostic }                     from "./specbook-diagnostic.js"
import { parseSpecification, type SourceFile } from "./specbook-parse.js"
import { type Specification }                  from "./specbook-struct-spec.js"
import { type SchemaSpecification }            from "./specbook-struct-schema.js"

/*  the options of the lint command  */
export interface LintOptions {
    config?: string
    basedir: string
    verbose: (msg: string) => void
}

/*  the result of the lint command  */
export interface LintResult {
    specification: Specification
    diagnostics:   Diagnostic[]
    config?:       SchemaSpecification
}

/*  recursively scan a base directory for Markdown files  */
export const scanMarkdown = (basedir: string): string[] =>
    fs.readdirSync(basedir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => path.join(entry.parentPath, entry.name))
        .sort()

/*  lint the specification Markdown files below the base directory
    against the optional configuration  */
export const lint = (options: LintOptions): LintResult => {
    const diagnostics = new Array<Diagnostic>()

    /*  load the optional YAML schema configuration  */
    let config
    if (options.config !== undefined) {
        options.verbose(`loading configuration "${options.config}"`)
        const loaded = loadConfig(options.config)
        diagnostics.push(...loaded.diagnostics)
        config = loaded.config ?? undefined
    }

    /*  parse and validate the specification Markdown files  */
    const files = scanMarkdown(options.basedir)
    options.verbose(`parsing ${files.length} specification file(s) below "${options.basedir}"`)
    if (files.length === 0)
        diagnostics.push({ file: options.basedir, line: 1, column: 1,
            message: "no Markdown files found below base directory" })
    const sources = new Array<SourceFile>()
    for (const file of files) {
        try {
            sources.push({ file, text: fs.readFileSync(file, "utf8") })
        }
        catch (err) {
            diagnostics.push({ file, line: 1, column: 1,
                message: `unreadable file: ${err instanceof Error ? err.message : String(err)}` })
        }
    }
    const result  = parseSpecification(sources, config)
    diagnostics.push(...result.diagnostics)
    return { specification: result.specification, diagnostics, config }
}
