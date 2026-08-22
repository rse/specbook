/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"
import { parse as parseYaml, parseDocument, YAMLParseError } from "yaml"
import * as v  from "valibot"

import { SchemaSpecification, type SchemaObject } from "./specbook-format-schema.js"
import { compileValueExpr }  from "./specbook-parse-value.js"
import { type Diagnostic }   from "./specbook-diagnostic.js"

/*  determine line/column of a YAML document path via the CST  */
const lineColOfPath = (yaml: string, cst: ReturnType<typeof parseDocument>, path: (string | number)[]) => {
    for (let i = path.length; i >= 0; i--) {
        const node: unknown = cst.getIn(path.slice(0, i), true)
        if (typeof node === "object" && node !== null
            && "range" in node && Array.isArray(node.range)) {
            const start = node.range[0] as number
            const lines = yaml.slice(0, start).split("\n")
            return { line: lines.length, column: lines[lines.length - 1].length + 1 }
        }
    }
    return { line: 1, column: 1 }
}

/*  load and validate a YAML schema configuration file  */
export const loadConfig = (file: string): { config: SchemaSpecification | null, diagnostics: Diagnostic[] } => {
    const diagnostics: Diagnostic[] = []

    /*  read the configuration file  */
    let yaml: string
    try {
        yaml = fs.readFileSync(file, "utf8")
    }
    catch (err) {
        diagnostics.push({ file, line: 1, column: 1,
            message: "cannot read configuration file: " +
                (err instanceof Error ? err.message : String(err)) })
        return { config: null, diagnostics }
    }

    /*  syntactically parse the YAML content  */
    let obj: unknown
    try {
        obj = parseYaml(yaml)
    }
    catch (err) {
        const e = err instanceof YAMLParseError ? err : null
        diagnostics.push({
            file,
            line:    e?.linePos?.[0]?.line ?? 1,
            column:  e?.linePos?.[0]?.col  ?? 1,
            message: "invalid YAML syntax: " +
                (err instanceof Error ? err.message.replace(/:[\s\S]*$/, "") : String(err))
        })
        return { config: null, diagnostics }
    }

    /*  semantically validate against the schema of the configuration
        (the CST is parsed lazily, as it is needed for positions only)  */
    let   cst: ReturnType<typeof parseDocument> | undefined
    const posOfPath = (path: (string | number)[]) => {
        cst ??= parseDocument(yaml)
        return lineColOfPath(yaml, cst, path)
    }
    const result = v.safeParse(SchemaSpecification, obj)
    if (!result.success) {
        for (const issue of result.issues) {
            const path = (issue.path ?? []).map((item) => item.key as string | number)
            const pos  = posOfPath(path)
            diagnostics.push({ file, line: pos.line, column: pos.column,
                message: `invalid configuration: ${path.join(".")}: ${issue.message}` })
        }
        return { config: null, diagnostics }
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

    return { config: diagnostics.length === 0 ? result.output : null, diagnostics }
}
