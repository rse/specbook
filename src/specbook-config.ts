/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"
import { parse as parseYaml, parseDocument, isNode, LineCounter, YAMLParseError, type Document } from "yaml"
import * as v  from "valibot"

import { Schema, type SchemaObject } from "./specbook-format-schema.js"
import { compileValueExpr }  from "./specbook-parse-value.js"
import { anchored }          from "./specbook-parse-semantic.js"
import { type Diagnostic }   from "./specbook-diagnostic.js"

/*  determine line/column of a YAML document path via the node ranges
    of the parsed document, falling back to the closest ancestor node  */
const lineColOfPath = (doc: Document, lines: LineCounter, path: (string | number)[]) => {
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

    /*  syntactically parse the YAML content  */
    let obj: unknown
    try {
        obj = parseYaml(yaml)
    }
    catch (err) {
        /*  strip the position and the source snippet the YAML parser
            appends to its message, as the diagnostic carries the
            position itself  */
        const e   = err instanceof YAMLParseError ? err : undefined
        const msg = err instanceof Error ? err.message : String(err)
        diagnostics.push({
            file,
            line:    e?.linePos?.[0]?.line ?? 1,
            column:  e?.linePos?.[0]?.col  ?? 1,
            message: "invalid YAML syntax: " + msg.replace(/ at line \d+, column \d+(?::\n[\s\S]*)?$/, "")
        })
        return { diagnostics }
    }

    /*  semantically validate against the schema of the configuration
        (the document is parsed lazily, as it is needed for positions only)  */
    let   doc: Document | undefined
    const lines     = new LineCounter()
    const posOfPath = (path: (string | number)[]) => {
        doc ??= parseDocument(yaml, { lineCounter: lines })
        return lineColOfPath(doc, lines, path)
    }
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

    /*  reject "file" fields below the first (artifact) level  */
    const checkFileField = (objects: SchemaObject[], path: (string | number)[], depth: number) => {
        objects.forEach((object, i) => {
            if (depth > 1 && object.file !== undefined) {
                const pos = posOfPath([ ...path, i, "file" ])
                diagnostics.push({ file, line: pos.line, column: pos.column,
                    message: `"file" field is only allowed on the first (artifact) level (found on level ${depth})` })
            }
            if (object.childs !== undefined)
                checkFileField(object.childs, [ ...path, i, "childs" ], depth + 1)
        })
    }
    checkFileField(result.output, [], 1)

    /*  reject syntactically invalid property value expressions  */
    const checkValueExpr = (objects: SchemaObject[], path: (string | number)[]) => {
        objects.forEach((object, i) => {
            (object.props ?? []).forEach((prop, j) => {
                if (prop.value === undefined)
                    return
                try {
                    compileValueExpr(prop.value)
                }
                catch (err) {
                    const pos = posOfPath([ ...path, i, "props", j, "value" ])
                    diagnostics.push({ file, line: pos.line, column: pos.column,
                        message: `invalid value expression "${prop.value}": ` +
                            (err instanceof Error ? err.message : String(err)) })
                }
            })
            if (object.childs !== undefined)
                checkValueExpr(object.childs, [ ...path, i, "childs" ])
        })
    }
    checkValueExpr(result.output, [])

    /*  reject syntactically invalid object name patterns (the names of
        non-artifact objects are compiled into regular expressions)  */
    const checkNamePattern = (objects: SchemaObject[], path: (string | number)[], depth: number) => {
        objects.forEach((object, i) => {
            if (depth > 1 && object.name !== undefined) {
                try {
                    anchored(object.name)
                }
                catch (err) {
                    const pos = posOfPath([ ...path, i, "name" ])
                    diagnostics.push({ file, line: pos.line, column: pos.column,
                        message: `invalid name pattern "${object.name}": ` +
                            (err instanceof Error ? err.message : String(err)) })
                }
            }
            if (object.childs !== undefined)
                checkNamePattern(object.childs, [ ...path, i, "childs" ], depth + 1)
        })
    }
    checkNamePattern(result.output, [], 1)

    return { config: diagnostics.length === 0 ? result.output : undefined, diagnostics }
}
