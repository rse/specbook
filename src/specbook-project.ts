/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                               from "node:fs"
import * as path                             from "node:path"
import { parseDocument, LineCounter }        from "yaml"
import * as v                                from "valibot"

import { lineColOfPath }                     from "./specbook-config.js"
import { renderDiagnostic, type Diagnostic } from "./specbook-diagnostic.js"

/*  the name of the YAML project configuration file  */
export const projectFile = ".specbook.yaml"

/*  the schema of the YAML project configuration: the files or glob
    patterns of the YAML schema configuration and the base directory
    of the specification Markdown files  */
const ProjectEntries = v.strictObject({
    config:  v.optional(v.union([ v.pipe(v.string(), v.minLength(1)),
        v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(1)) ])),
    basedir: v.optional(v.pipe(v.string(), v.minLength(1)))
}, (issue) =>
    issue.expected === "never" ? "unknown project configuration entry" :
        "expected a map of project configuration entries")

/*  the loaded project configuration, with all paths already absolute  */
export interface Project {
    file:     string
    config?:  string[]
    basedir?: string
}

/*  whether a path names an existing regular file, where an
    inaccessible one (not just an absent one) counts as absent  */
const isFile = (file: string): boolean => {
    try {
        return fs.statSync(file, { throwIfNoEntry: false })?.isFile() === true
    }
    catch {
        return false
    }
}

/*  find the project configuration file in the closest ancestor-or-self
    of the directory (up to the filesystem root, as the file can reside
    even above a nested Git working tree)  */
const findProject = (dir: string): string | undefined => {
    let current = path.resolve(dir)
    for (;;) {
        const file = path.join(current, projectFile)
        if (isFile(file))
            return file
        const parent = path.dirname(current)
        if (parent === current)
            return undefined
        current = parent
    }
}

/*  read the project configuration file, reporting an unreadable file
    as a positioned diagnostic instead of a raw I/O error  */
const readProject = (file: string): string => {
    try {
        return fs.readFileSync(file, "utf8")
    }
    catch (err) {
        throw new Error("invalid project configuration:\n" + renderDiagnostic({
            file, line: 1, column: 1, severity: "error",
            message: "cannot read project configuration file: " +
                (err instanceof Error ? err.message : String(err))
        }), { cause: err })
    }
}

/*  find, load, and validate the project configuration, failing on any
    problem, where its relative paths resolve against the directory of
    the file itself (and not against the perhaps deeper directory the
    search started at) and the literal "std" still names the bundled
    standard schema configuration  */
export const loadProject = (dir: string): Project | undefined => {
    const file = findProject(dir)
    if (file === undefined)
        return undefined

    /*  parse the YAML, reporting its syntax errors as positioned diagnostics  */
    const diagnostics = new Array<Diagnostic>()
    const lines = new LineCounter()
    const yaml  = readProject(file)
    const doc   = parseDocument(yaml, { lineCounter: lines })
    for (const err of doc.errors)
        diagnostics.push({
            file,
            line:     err.linePos?.[0].line ?? 1,
            column:   err.linePos?.[0].col  ?? 1,
            severity: "error",
            message:  "invalid YAML syntax: " + err.message.replace(/ at line \d+, column \d+(?::\n[\s\S]*)?$/, "")
        })

    /*  an empty or comment-only file carries no entries at all  */
    const result = v.safeParse(ProjectEntries, doc.errors.length === 0 ? (doc.toJS() ?? {}) : {})
    if (!result.success)
        for (const issue of result.issues) {
            const keys  = (issue.path ?? []).map((item) => item.key as string | number)
            const where = keys.length > 0 ? `${keys.join(".")}: ` : ""
            diagnostics.push({ file, ...lineColOfPath(doc, lines, keys), severity: "error",
                message: `invalid project configuration: ${where}${issue.message}` })
        }
    /*  (the second condition just narrows the result type below)  */
    if (diagnostics.length > 0 || !result.success)
        throw new Error("invalid project configuration:\n" +
            diagnostics.map(renderDiagnostic).join("\n"))

    /*  resolve the relative paths against the directory of the file  */
    const base     = path.dirname(file)
    const { config, basedir } = result.output
    const patterns = typeof config === "string" ? [ config ] : config
    return {
        file,
        config:  patterns?.map((pattern) => pattern === "std" ? pattern : path.resolve(base, pattern)),
        basedir: basedir !== undefined ? path.resolve(base, basedir) : undefined
    }
}
