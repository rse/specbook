/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"
import { parseDocument, isNode, LineCounter, type Document } from "yaml"
import * as v  from "valibot"

import { Schema, type SchemaObject }  from "./specbook-format-schema.js"
import { compileValueExpr, anchored } from "./specbook-parse-value.js"
import { type Diagnostic }            from "./specbook-diagnostic.js"

/*  a path into the YAML document (object keys and sequence indexes)  */
type YamlPath = (string | number)[]

/*  determine line/column of a YAML document path via the node ranges
    of the parsed document, falling back to the closest ancestor node  */
const lineColOfPath = (doc: Document, lines: LineCounter, path: YamlPath) => {
    for (let i = path.length; i >= 0; i--) {
        const node  = doc.getIn(path.slice(0, i), true)
        const start = isNode(node) ? node.range?.[0] : undefined
        if (start !== undefined) {
            const pos = lines.linePos(start)
            return { line: pos.line, column: pos.col }
        }
    }
    return { line: 1, column: 1 }
}

/*  check the constraints of a structurally valid configuration which
    are beyond its schema: "file" fields are allowed on the first
    (artifact) level only, property value expressions have to be
    syntactically valid, and the names of non-artifact objects have to
    be valid patterns (as they are compiled into regular expressions)  */
const checkConstraints = (
    config:    Schema,
    file:      string,
    posOfPath: (path: YamlPath) => { line: number, column: number }
): Diagnostic[] => {
    const diagnostics = new Array<Diagnostic>()
    const diagnose = (path: YamlPath, message: string) => {
        const pos = posOfPath(path)
        diagnostics.push({ file, line: pos.line, column: pos.column, message })
    }
    const check = (objects: SchemaObject[], path: YamlPath, depth: number) => {
        for (const [ i, object ] of objects.entries()) {
            const at = [ ...path, i ]
            if (depth > 1 && object.file !== undefined)
                diagnose([ ...at, "file" ],
                    `"file" field is only allowed on the first (artifact) level (found on level ${depth})`)
            for (const [ j, prop ] of (object.props ?? []).entries()) {
                if (prop.value === undefined)
                    continue
                try {
                    compileValueExpr(prop.value)
                }
                catch (err) {
                    diagnose([ ...at, "props", j, "value" ],
                        `invalid value expression "${prop.value}": ` +
                            (err instanceof Error ? err.message : String(err)))
                }
            }
            if (depth > 1 && object.name !== undefined) {
                try {
                    anchored(object.name)
                }
                catch (err) {
                    diagnose([ ...at, "name" ],
                        `invalid name pattern "${object.name}": ` +
                            (err instanceof Error ? err.message : String(err)))
                }
            }
            if (object.childs !== undefined)
                check(object.childs, [ ...at, "childs" ], depth + 1)
        }
    }
    check(config, [], 1)
    return diagnostics
}

/*  load and validate a YAML schema configuration file  */
export const loadConfig = (file: string): { config?: Schema, diagnostics: Diagnostic[] } => {
    const diagnostics = new Array<Diagnostic>()

    /*  read the configuration file  */
    let yaml: string
    try {
        yaml = fs.readFileSync(file, "utf8")
    }
    catch (err) {
        diagnostics.push({ file, line: 1, column: 1,
            message: "cannot read configuration file: " +
                (err instanceof Error ? err.message : String(err)) })
        return { diagnostics }
    }

    /*  syntactically parse the YAML content into its document, keeping
        the line positions for the diagnostics  */
    const lines = new LineCounter()
    const doc   = parseDocument(yaml, { lineCounter: lines })
    if (doc.errors.length > 0) {
        /*  strip the position and the source snippet the YAML parser
            appends to its message, as the diagnostic carries the
            position itself  */
        for (const err of doc.errors)
            diagnostics.push({
                file,
                line:    err.linePos?.[0].line ?? 1,
                column:  err.linePos?.[0].col  ?? 1,
                message: "invalid YAML syntax: " + err.message.replace(/ at line \d+, column \d+(?::\n[\s\S]*)?$/, "")
            })
        return { diagnostics }
    }
    const obj: unknown = doc.toJS()

    /*  semantically validate against the schema of the configuration  */
    const posOfPath = (path: YamlPath) => lineColOfPath(doc, lines, path)
    const result = v.safeParse(Schema, obj)
    if (!result.success) {
        for (const issue of result.issues) {
            const path  = (issue.path ?? []).map((item) => item.key as string | number)
            const pos   = posOfPath(path)
            const where = path.length > 0 ? `${path.join(".")}: ` : ""
            diagnostics.push({ file, line: pos.line, column: pos.column,
                message: `invalid configuration: ${where}${issue.message}` })
        }
        return { diagnostics }
    }

    /*  check the constraints beyond the structural schema  */
    diagnostics.push(...checkConstraints(result.output, file, posOfPath))

    return { config: diagnostics.length === 0 ? result.output : undefined, diagnostics }
}
