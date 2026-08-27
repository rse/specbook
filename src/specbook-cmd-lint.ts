/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

import { loadConfig }                                           from "./specbook-config.js"
import { literal, type Verbose }                                from "./specbook-verbose.js"
import { type Diagnostic }                                      from "./specbook-diagnostic.js"
import { parseSpecification, resolveArtifact, type SourceFile } from "./specbook-parse.js"
import { type Spec }                                            from "./specbook-format-spec.js"
import { type Schema, type SchemaObject }                       from "./specbook-format-schema.js"

/*  the options of the lint command  */
export interface LintOptions {
    config:  string
    basedir: string
    verbose: Verbose
}

/*  the result of the lint command  */
export interface LintResult {
    specification: Spec
    diagnostics:   Diagnostic[]
    config?:       Schema
}

/*  collect the distinct artifact files the schema configuration
    references, in their declaration order, each mapped onto whether
    all of its artifacts are optional and hence the file may be absent  */
const schemaFiles = (config: Schema): Map<string, boolean> => {
    const files = new Map<string, boolean>()
    for (const artifact of config) {
        if (artifact.file === undefined)
            continue
        files.set(artifact.file,
            (files.get(artifact.file) ?? true) && artifact.optional === true)
    }
    return files
}

/*  lint the specification Markdown files below the base directory
    against the configuration  */
export const lint = (options: LintOptions): LintResult => {
    const diagnostics = new Array<Diagnostic>()

    /*  load the mandatory YAML schema configuration  */
    options.verbose(`loading schema configuration "${literal(options.config)}"`)
    const loaded = loadConfig(options.config)
    diagnostics.push(...loaded.diagnostics)
    const config = loaded.config

    /*  read the artifact files the configuration references, resolved
        against the base directory and tolerating an absent file if all
        its artifacts are optional  */
    const files = config !== undefined ? schemaFiles(config) : new Map<string, boolean>()
    if (config !== undefined && files.size === 0)
        diagnostics.push({ file: options.config, line: 1, column: 1,
            message: "no artifact files configured" })
    const sources = new Array<SourceFile>()
    const present = new Set<string>()
    for (const [ name, optional ] of files) {
        const file = path.join(options.basedir, name)
        if (!fs.existsSync(file)) {
            if (!optional)
                diagnostics.push({ file, line: 1, column: 1,
                    message: "missing artifact file" })
            continue
        }
        try {
            sources.push({ file, text: fs.readFileSync(file, "utf8") })
            present.add(name)
        }
        catch (err) {
            diagnostics.push({ file, line: 1, column: 1,
                message: `unreadable file: ${err instanceof Error ? err.message : String(err)}` })
        }
    }

    /*  parse and validate the artifact files against the configuration  */
    options.verbose(`parsing ${literal(sources.length)} specification file(s) ` +
        `below "${literal(options.basedir)}"`)
    const result = parseSpecification(sources, config)
    diagnostics.push(...result.diagnostics)

    /*  report the non-optional artifacts absent from the specification,
        against their loaded artifact file (an absent or unreadable file
        is already reported above) or else against the configuration  */
    if (config !== undefined) {
        const found = new Set<SchemaObject>()
        for (const artifact of result.specification.artifacts)
            for (const object of artifact.objects) {
                const schema = resolveArtifact(config, object)
                if (schema !== undefined)
                    found.add(schema)
            }
        for (const schema of config) {
            if (schema.optional === true || found.has(schema)
                || (schema.file !== undefined && !present.has(schema.file)))
                continue
            const file  = schema.file !== undefined ? path.join(options.basedir, schema.file) : options.config
            const paren = schema.id !== undefined ? ` (${schema.id})` : ""
            diagnostics.push({ file, line: 1, column: 1,
                message: `missing artifact "${schema.kind}: ${schema.name ?? ""}${paren}"` })
        }
    }
    return { specification: result.specification, diagnostics, config }
}
