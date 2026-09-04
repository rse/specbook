/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                                               from "node:fs"
import { parseDocument, isNode, LineCounter, type Document } from "yaml"
import * as v                                                from "valibot"
import { mergeWith, isPlainObject }                          from "es-toolkit"

import { Schema, type SchemaObject, type SchemaProperty }               from "./specbook-format-schema.js"
import { compileValueExpr, anchored, admitsReferences, type ValueExpr } from "./specbook-parse-value.js"
import { type Diagnostic }                                              from "./specbook-diagnostic.js"

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

/*  the identity by which the elements of the lists of the configuration
    are matched on merging: the artifacts by their kind plus id or name
    and the nested objects by their kind alone (exactly like the sibling
    resolution), the properties by their name, and the scalar entries
    by their value  */
const identityOf = (item: unknown, list?: string): string => {
    if (!isPlainObject(item))
        return String(item)
    const object = item as Record<string, unknown>
    if (list === "props")
        return String(object.name ?? "")
    else if (list === "childs")
        return String(object.kind ?? "")
    else
        return `${String(object.kind ?? "")}:${String(object.id ?? object.name ?? "")}`
}

/*  merge a source configuration (or a nested part of it) into a target
    one: the objects merge deeply, while the elements of the lists are
    matched by their identity, so a matching element is merged into its
    counterpart and an unmatched one is appended  */
const mergeConfig = (target: unknown, source: unknown, list?: string): unknown => {
    /*  an empty or comment-only YAML document carries no content at
        all, so it leaves the target intact instead of discarding it  */
    if (source === null || source === undefined)
        return target
    else if (Array.isArray(target) && Array.isArray(source)) {
        for (const item of source as unknown[]) {
            const i = (target as unknown[]).findIndex((existing) =>
                identityOf(existing, list) === identityOf(item, list))
            if (i < 0)
                target.push(item)
            else
                target[i] = mergeConfig(target[i], item, list)
        }
        return target
    }
    else if (isPlainObject(target) && isPlainObject(source))
        return mergeWith(target, source, (t: unknown, s: unknown, key: string) =>
            Array.isArray(t) && Array.isArray(s) ? mergeConfig(t, s, key) : undefined)
    else
        return source
}

/*  deep copy a converted YAML document, as the conversion resolves all
    aliases of an anchor onto one shared object, which the in-place
    merge otherwise would alter through every alias at once  */
const unshared = (value: unknown): unknown => {
    if (Array.isArray(value))
        return value.map((item) => unshared(item))
    else if (isPlainObject(value))
        return Object.fromEntries(Object.entries(value).map(([ key, val ]) => [ key, unshared(val) ]))
    else
        return value
}

/*  a parsed configuration file: its document (with the line positions
    for the diagnostics) and its raw content for the path translation  */
type ConfigDoc = { file: string, doc: Document, lines: LineCounter, raw: unknown }

/*  determine file and line/column of a path into the merged
    configuration by translating the path into every document (from the
    last to the first one, as a later document overrides an earlier one),
    where a list index is translated through the identity of the merged
    element, and by taking the deepest reaching translation, whose path
    is returned, too (or the original one if it does not reach fully)  */
const posOfMergedPath = (docs: ConfigDoc[], merged: unknown, path: YamlPath) => {
    const at = (value: unknown, key: string | number): unknown =>
        (value as Record<string | number, unknown> | null | undefined)?.[key]
    let best = { file: docs[docs.length - 1].file, line: 1, column: 1, path, depth: -1 }
    for (const { file, doc, lines, raw } of docs.toReversed()) {
        const translated: YamlPath = []
        let node = merged
        let own  = raw
        let list: string | undefined
        for (const segment of path) {
            const key = typeof segment === "number" && Array.isArray(own) ?
                own.findIndex((item: unknown) => identityOf(item, list) === identityOf(at(node, segment), list)) : segment
            if (typeof key === "number" ? !Array.isArray(own) || key < 0 : !isPlainObject(own) || !(key in own))
                break
            translated.push(key)
            node = at(node, segment)
            own  = at(own, key)
            if (typeof segment === "string")
                list = segment
        }
        if (translated.length > best.depth)
            best = { file, ...lineColOfPath(doc, lines, translated), path: translated, depth: translated.length }
    }
    return { file: best.file, line: best.line, column: best.column,
        path: best.depth === path.length ? best.path : path }
}

/*  the sink of the constraint diagnostics, positioned by a path into
    the merged configuration  */
type Diagnose = (path: YamlPath, message: string) => void

/*  check the properties of an object: the value expressions have to be
    syntactically valid, the relation shape flags apply to
    reference-valued properties only, and the sibling marker flags
    optionally carry a regexp or enum expression  */
const checkProperties = (props: SchemaProperty[], at: YamlPath, diagnose: Diagnose) => {
    for (const [ j, prop ] of props.entries()) {
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
    }
}

/*  check the automaton of an object (if any): it names the child kinds
    acting as nodes and edges, the reference-valued edge properties
    referencing the source and target nodes, and the node properties
    flagging the initial and final nodes  */
const checkAutomaton = (object: SchemaObject, at: YamlPath, diagnose: Diagnose) => {
    if (object.automaton === undefined)
        return
    const automaton = object.automaton
    const childOf   = (kind: string) => (object.childs ?? []).find((c) => c.kind === kind)
    const propOf    = (child: SchemaObject | undefined, name: string) =>
        (child?.props ?? []).find((p) => p.name === name)
    /*  an invalid value expression is reported on its own (see
        "checkProperties"), so it must not cascade into a shape diagnostic  */
    const isReference = (prop: SchemaProperty): boolean | undefined => {
        try {
            return prop.value !== undefined && admitsReferences(compileValueExpr(prop.value))
        }
        catch {
            return undefined
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
        else if (prop !== undefined && isReference(prop) === false)
            diagnose([ ...at, "automaton", field ],
                `"automaton" ${field} property "${automaton[field]}" is not reference-valued`)
    }
    for (const field of [ "initial", "final" ] as const)
        if (nodes !== undefined && propOf(nodes, automaton[field]) === undefined)
            diagnose([ ...at, "automaton", field ],
                `"automaton" ${field} property "${automaton[field]}" is not a property of "${automaton.nodes}"`)
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
    posOfPath: (path: YamlPath) => { file: string, line: number, column: number }
): Diagnostic[] => {
    const diagnostics = new Array<Diagnostic>()
    const diagnose = (path: YamlPath, message: string) => {
        const { file, line, column } = posOfPath(path)
        diagnostics.push({ file, line, column, severity: "error", message })
    }
    const check = (objects: SchemaObject[], path: YamlPath, depth: number) => {
        /*  the sibling objects are resolved by kind and id on the first
            (artifact) level and by kind alone below it, so a sibling
            colliding on this key stays unreachable dead configuration  */
        const seen = new Set<string>()
        for (const [ i, object ] of objects.entries()) {
            const at    = [ ...path, i ]
            const ident = identityOf(object, depth > 1 ? "childs" : undefined)
            if (seen.has(ident))
                diagnose([ ...at, "kind" ],
                    `object "${ident}" collides with a preceding sibling object (the later one is unreachable)`)
            else
                seen.add(ident)
            if (depth > 1 && object.file !== undefined)
                diagnose([ ...at, "file" ],
                    `"file" field is only allowed on the first (artifact) level (found on level ${depth})`)
            checkProperties(object.props ?? [], at, diagnose)
            checkAutomaton(object, at, diagnose)
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

/*  load and validate the YAML schema configuration, merged in order out
    of its files (the later ones into the earlier ones), where every file
    has to be readable and syntactically valid on its own, while the
    merged result alone is validated  */
export const loadConfig = (files: string[]): { config?: Schema, diagnostics: Diagnostic[] } => {
    if (files.length === 0)
        throw new Error("no configuration files given")
    const diagnostics = new Array<Diagnostic>()

    /*  read and syntactically parse every configuration file into its
        document, keeping the line positions for the diagnostics  */
    const docs = new Array<ConfigDoc>()
    for (const file of files) {
        let yaml: string
        try {
            yaml = fs.readFileSync(file, "utf8")
        }
        catch (err) {
            diagnostics.push({ file, line: 1, column: 1, severity: "error",
                message: "cannot read configuration file: " +
                    (err instanceof Error ? err.message : String(err)) })
            continue
        }
        const lines = new LineCounter()
        const doc   = parseDocument(yaml, { lineCounter: lines })

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
        if (doc.errors.length === 0)
            docs.push({ file, doc, lines, raw: doc.toJS() })
    }
    if (diagnostics.length > 0)
        return { diagnostics }

    /*  merge the documents in order, out of fresh and unshared
        conversions, as the merge mutates its target while the raw ones
        have to stay intact for the path translation  */
    const merged = docs.map(({ doc }) => unshared(doc.toJS()))
        .reduce((target, source) => mergeConfig(target, source))

    /*  semantically validate the merged result against the schema of the configuration  */
    const posOfPath = (path: YamlPath) => posOfMergedPath(docs, merged, path)
    const result = v.safeParse(Schema, merged)
    if (!result.success) {
        for (const issue of result.issues) {
            /*  the path is rendered as it is in the positioned file  */
            const { file, line, column, path } =
                posOfPath((issue.path ?? []).map((item) => item.key as string | number))
            const where = path.length > 0 ? `${path.join(".")}: ` : ""
            diagnostics.push({ file, line, column, severity: "error",
                message: `invalid configuration: ${where}${issue.message}` })
        }
        return { diagnostics }
    }

    /*  check the constraints beyond the structural schema  */
    diagnostics.push(...checkConstraints(result.output, posOfPath))

    return { config: diagnostics.length === 0 ? result.output : undefined, diagnostics }
}
