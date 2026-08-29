/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                                               from "node:fs"
import { parseDocument, isNode, LineCounter, type Document } from "yaml"
import * as v                                                from "valibot"

import { Schema, type SchemaObject, type SchemaProperty }             from "./specbook-format-schema.js"
import { compileValueExpr, anchored, admitsReferences, type ValueExpr } from "./specbook-parse-value.js"
import { type Diagnostic }                                            from "./specbook-diagnostic.js"

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
    are beyond its schema: sibling objects have to stay distinctly
    resolvable, "file" fields are allowed on the first (artifact) level
    only, property value and marker expressions have to be syntactically
    valid, "referenced" entries have to be reference expressions, an
    "automaton" has to name existing child kinds and properties, and the
    names of non-artifact objects have to be valid patterns (as they are
    compiled into regular expressions)  */
const checkConstraints = (
    config:    Schema,
    file:      string,
    posOfPath: (path: YamlPath) => { line: number, column: number }
): Diagnostic[] => {
    const diagnostics = new Array<Diagnostic>()
    const diagnose = (path: YamlPath, message: string) => {
        const pos = posOfPath(path)
        diagnostics.push({ file, line: pos.line, column: pos.column, severity: "error", message })
    }
    const check = (objects: SchemaObject[], path: YamlPath, depth: number) => {
        /*  the sibling objects are resolved by kind and id on the first
            (artifact) level and by kind alone below it, so a sibling
            colliding on this key stays unreachable dead configuration  */
        const seen = new Set<string>()
        for (const [ i, object ] of objects.entries()) {
            const at    = [ ...path, i ]
            const ident = depth > 1 ? object.kind : `${object.kind}:${object.id ?? object.name ?? ""}`
            if (seen.has(ident))
                diagnose([ ...at, "kind" ],
                    `object "${ident}" collides with a preceding sibling object (the later one is unreachable)`)
            else
                seen.add(ident)
            if (depth > 1 && object.file !== undefined)
                diagnose([ ...at, "file" ],
                    `"file" field is only allowed on the first (artifact) level (found on level ${depth})`)
            for (const [ j, prop ] of (object.props ?? []).entries()) {
                /*  the relation shape flags apply to reference-valued
                    properties only (an invalid expression is reported on
                    its own, without a cascading flag diagnostic)  */
                let expr: ValueExpr | undefined
                if (prop.value !== undefined) {
                    try {
                        expr = compileValueExpr(prop.value)
                    }
                    catch (err) {
                        diagnose([ ...at, "props", j, "value" ],
                            `invalid value expression "${prop.value}": ` +
                                (err instanceof Error ? err.message : String(err)))
                        continue
                    }
                }
                for (const flag of [ "local", "symmetric", "acyclic" ] as const)
                    if (prop[flag] === true && (expr === undefined || !admitsReferences(expr)))
                        diagnose([ ...at, "props", j, flag ],
                            `"${flag}" flag requires a reference-valued property`)

                /*  the sibling marker flags optionally carry a regexp or
                    enum expression selecting the values they apply to  */
                for (const flag of [ "unique", "present" ] as const) {
                    const marker = prop[flag]
                    if (typeof marker !== "string")
                        continue
                    let kind: ValueExpr["kind"] | undefined
                    try {
                        kind = compileValueExpr(marker).kind
                    }
                    catch (err) {
                        diagnose([ ...at, "props", j, flag ],
                            `invalid "${flag}" expression "${marker}": ` +
                                (err instanceof Error ? err.message : String(err)))
                    }
                    if (kind !== undefined && kind !== "regex" && kind !== "enum")
                        diagnose([ ...at, "props", j, flag ],
                            `"${flag}" expression "${marker}" is neither a regexp nor an enum`)
                }
            }
            if (object.automaton !== undefined) {
                /*  an automaton names the child kinds acting as nodes and
                    edges, the reference-valued edge properties referencing
                    the source and target nodes, and the node properties
                    flagging the initial and final nodes  */
                const automaton = object.automaton
                const childOf   = (kind: string) => (object.childs ?? []).find((c) => c.kind === kind)
                const propOf    = (child: SchemaObject | undefined, name: string) =>
                    (child?.props ?? []).find((p) => p.name === name)
                const isReference = (prop: SchemaProperty) => {
                    try {
                        return prop.value !== undefined && admitsReferences(compileValueExpr(prop.value))
                    }
                    catch {
                        return false
                    }
                }
                const nodes = childOf(automaton.nodes)
                const edges = childOf(automaton.edges)
                for (const [ field, child ] of [ [ "nodes", nodes ], [ "edges", edges ] ] as const)
                    if (child === undefined)
                        diagnose([ ...at, "automaton", field ],
                            `"automaton" ${field} kind "${automaton[field]}" is not a child object kind`)
                for (const field of [ "source", "target" ] as const) {
                    const prop = propOf(edges, automaton[field])
                    if (edges !== undefined && prop === undefined)
                        diagnose([ ...at, "automaton", field ],
                            `"automaton" ${field} property "${automaton[field]}" is not a property of "${automaton.edges}"`)
                    else if (prop !== undefined && !isReference(prop))
                        diagnose([ ...at, "automaton", field ],
                            `"automaton" ${field} property "${automaton[field]}" is not reference-valued`)
                }
                for (const field of [ "initial", "final" ] as const)
                    if (nodes !== undefined && propOf(nodes, automaton[field]) === undefined)
                        diagnose([ ...at, "automaton", field ],
                            `"automaton" ${field} property "${automaton[field]}" is not a property of "${automaton.nodes}"`)
            }
            for (const [ j, entry ] of (object.referenced ?? []).entries()) {
                /*  a reference coverage entry has to be a single
                    (usually wildcard) reference expression  */
                let expr: ValueExpr | undefined
                try {
                    expr = compileValueExpr(entry)
                }
                catch (err) {
                    diagnose([ ...at, "referenced", j ],
                        `invalid "referenced" entry "${entry}": ` +
                            (err instanceof Error ? err.message : String(err)))
                }
                if (expr !== undefined && expr.kind !== "reference")
                    diagnose([ ...at, "referenced", j ],
                        `"referenced" entry "${entry}" is not a single "[[xxx]]" reference`)
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
        diagnostics.push({ file, line: 1, column: 1, severity: "error",
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
                line:     err.linePos?.[0].line ?? 1,
                column:   err.linePos?.[0].col  ?? 1,
                severity: "error",
                message:  "invalid YAML syntax: " + err.message.replace(/ at line \d+, column \d+(?::\n[\s\S]*)?$/, "")
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
            diagnostics.push({ file, line: pos.line, column: pos.column, severity: "error",
                message: `invalid configuration: ${where}${issue.message}` })
        }
        return { diagnostics }
    }

    /*  check the constraints beyond the structural schema  */
    diagnostics.push(...checkConstraints(result.output, file, posOfPath))

    return { config: diagnostics.length === 0 ? result.output : undefined, diagnostics }
}
