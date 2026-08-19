/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import fs   from "node:fs"
import path from "node:path"

import { marked, type Tokens } from "marked"

import { type Artifact, type Object as SpecObject, type Property }
    from "./specbook-struct-spec.js"
import { ParseContext, embeddingRegex, embeddingMimeType, type SourceFile }
    from "./specbook-parse-common.js"

/*  a grouping container context (e.g. "### STATES")  */
interface Group {
    parent: SpecObject
    kind:   string
}

/*  split a description text into statement and optional rationale  */
const splitDescription = (text: string) => {
    const m = text.match(/,\s*(?:\*\*BECAUSE\*\*|BECAUSE)\s+/)
    if (m === null || m.index === undefined)
        return { description: text }
    return {
        description: text.slice(0, m.index),
        rationale:   text.slice(m.index + m[0].length)
    }
}

/*  parse a heading text of the form "<KIND>: <name> [(<token>)] [<a id="..."></a>]"  */
const parseHeadingText = (raw: string) => {
    let text = raw.trim()
    let id: string | undefined
    const am = text.match(/<a\s+id="([^"]+)"\s*>\s*<\/a>\s*$/)
    if (am !== null && am.index !== undefined) {
        id   = am[1]
        text = text.slice(0, am.index).trim()
    }

    /*  detect a malformed trailing anchor fragment, still salvaging its id  */
    let malformed: string | undefined
    const fm = text.match(/<a\b[^>]*>?\s*(?:<\/a>)?\s*$/)
    if (fm !== null && fm.index !== undefined) {
        malformed = fm[0].trim()
        id      ??= malformed.match(/id="([^"]+)"/)?.[1]
        text      = text.slice(0, fm.index).trim()
    }

    /*  detect the trailing explicit Wiki-style anchor ("{{xxx}}"), the
        primary marker ("(*)"), and/or the implicit parenthesized anchor
        token ("(xxx)"), in any order  */
    let paren:   string | undefined
    let primary = false
    for (;;) {
        const wm = text.match(/\{\{([^{}]+)\}\}\s*$/)
        if (wm !== null && wm.index !== undefined) {
            id ??= wm[1].trim()
            text  = text.slice(0, wm.index).trim()
            continue
        }
        const sm = text.match(/\(\*\)\s*$/)
        if (sm !== null && sm.index !== undefined) {
            primary = true
            text    = text.slice(0, sm.index).trim()
            continue
        }
        const pm = text.match(/\(([^()]+)\)\s*$/)
        if (pm !== null && pm.index !== undefined && paren === undefined) {
            paren = pm[1].trim()
            text  = text.slice(0, pm.index).trim()
            continue
        }
        break
    }
    const km = text.match(/^([^:]+):\s*(.*)$/)
    return {
        kind: km !== null ? km[1].trim() : text,
        name: km !== null ? km[2].trim() : "",
        id, paren, primary, malformed
    }
}

/*  derive a stable slug identifier from an object name  */
const slugify = (text: string): string =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

/*  extract the plain text lines of a Markdown list item
    (excluding any nested lists)  */
const itemLines = (item: Tokens.ListItem): string[] => {
    const body = item.tokens.find((token) => token.type === "text")
    const text = body !== undefined ? (body as Tokens.Text).text : item.text
    return text.split("\n").map((line) => line.trim())
}

/*  a single parsed frontmatter timestamp key  */
interface FrontmatterKey {
    date:  Date | null
    line:  number
    value: string | null
}

/*  parse the optional Markdown frontmatter with Created/Modified timestamps  */
const parseFrontmatter = (text: string) => {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
    const missing: FrontmatterKey = { date: null, line: 1, value: null }
    if (m === null)
        return { present: false, created: missing, modified: missing, body: text, offset: 0 }
    const grab = (key: string): FrontmatterKey => {
        const km = m[1].match(new RegExp(`^${key}:\\s*(.+)$`, "m"))
        if (km === null || km.index === undefined)
            return missing
        const line  = 2 + (m[1].slice(0, km.index).match(/\n/g) ?? []).length
        const value = km[1].trim()
        const date  = new Date(value)
        return { date: Number.isNaN(date.getTime()) ? null : date, line, value }
    }
    return {
        present:  true,
        created:  grab("Created"),
        modified: grab("Modified"),
        body:     text.slice(m[0].length),
        offset:   m[0].split("\n").length - 1
    }
}

/*  recursively load the image files embedded via "![alt](file)" into the
    description and the property values of an object (SVG as-is, PNG/JPEG
    as base64 data: URLs), resolving the references relative to the source file  */
const embed = (ctx: ParseContext, object: SpecObject, file: string) => {
    const load = (target: { embedding?: string[] }, text: string, line: number) => {
        for (const m of text.matchAll(embeddingRegex)) {
            const reference = m[2].trim()
            const type = embeddingMimeType(reference)
            if (type === undefined)
                continue
            try {
                const data = fs.readFileSync(path.resolve(path.dirname(file), reference))
                target.embedding ??= []
                target.embedding.push(type === "image/svg+xml" ?
                    data.toString("utf8") : `data:${type};base64,${data.toString("base64")}`)
            }
            catch (err) {
                ctx.diagnose(file, line, `unreadable embedding file "${reference}": ` +
                    (err instanceof Error ? err.message : String(err)))
            }
        }
    }
    const line = ctx.objectMeta.get(object)?.line ?? 1
    if (object.description !== undefined)
        load(object.description, object.description.description, line)
    for (const property of object.properties)
        load(property, property.value, ctx.propMeta.get(property)?.line ?? line)
    for (const child of object.childs)
        embed(ctx, child, file)
}

/*  parse an unordered list of key-values and/or concise-format objects  */
const parseList = (ctx: ParseContext, list: Tokens.List, object: SpecObject, file: string, line: number) => {
    for (const item of list.items) {
        const lines = itemLines(item)
        const first = lines[0]

        /*  a concise-format item carries a further segment on its first
            line, or ends it with the segment terminator (the case of an
            object without properties, whose description follows below)  */
        const cm = first.match(/^([^:;]+):\s+(.+;.*)$/)
        if (cm !== null)
            parseConcise(ctx, item, object, file, line)
        else {
            const km = first.match(/^([^:;]+):\s*(.*)$/)
            if (km !== null) {
                /*  a key/value property, whose value may continue
                    on the following lines of the item  */
                const value = [ km[2], ...lines.slice(1) ].join(" ").trim()
                const property: Property = { key: km[1].trim(), value }
                ctx.propMeta.set(property, { line })
                object.properties.push(property)
            }
            else
                ctx.diagnose(file, line, `unrecognized list item "${first}"`)
        }
        line += (item.raw.match(/\n/g) ?? []).length
    }
}

/*  parse a grouped list of concise-format object items of the form
    "`<name>`; <key>: <value>; ...; <statement>, BECAUSE <rationale>.",
    whose kind is given by the enclosing grouping container heading  */
const parseGrouped = (ctx: ParseContext, list: Tokens.List, group: Group, file: string, line: number) => {
    for (const item of list.items) {
        parseConcise(ctx, item, group.parent, file, line, group.kind)
        line += (item.raw.match(/\n/g) ?? []).length
    }
}

/*  parse a concise-format object item of the form
    "<kind>: <name>; <key>: <value>; ...; <statement>, BECAUSE <rationale>.",
    which may continue on the following lines of the item; a grouped item
    omits the leading "<kind>: " and receives its kind from the group  */
const parseConcise = (ctx: ParseContext, item: Tokens.ListItem, parent: SpecObject, file: string, line: number, group?: string) => {
    const text     = itemLines(item).join(" ").trim()
    const segments = text.split(/;\s*/).filter((segment) => segment !== "")
    const head     = segments.shift() ?? ""
    let   kind:  string
    let   name:  string
    if (group !== undefined) {
        const nm = head.match(/^`([^`]+)`$|^([^`:]+)$/)
        if (nm === null) {
            ctx.diagnose(file, line, `unrecognized ${group} item "${text}"`)
            return
        }
        kind = group
        name = (nm[1] ?? nm[2]).trim()
    }
    else {
        const km = head.match(/^([^:]+):\s*(.*)$/)
        if (km === null) {
            ctx.diagnose(file, line, `invalid concise object item "${text}"`)
            return
        }
        kind = km[1].trim()
        name = km[2].trim()
    }
    let anchor:  string | undefined
    let paren:   string | undefined
    let primary = false
    for (;;) {
        const am = name.match(/\{\{([^{}]+)\}\}\s*$/)
        if (am !== null && am.index !== undefined) {
            anchor ??= am[1].trim()
            name     = name.slice(0, am.index).trim()
            continue
        }
        const sm = name.match(/\(\*\)\s*$/)
        if (sm !== null && sm.index !== undefined) {
            primary = true
            name    = name.slice(0, sm.index).trim()
            continue
        }
        const pm = name.match(/\(([^()]+)\)\s*$/)
        if (pm !== null && pm.index !== undefined && paren === undefined) {
            paren = pm[1].trim()
            name  = name.slice(0, pm.index).trim()
            continue
        }
        break
    }
    const object: SpecObject = {
        kind,
        id:         anchor ?? slugify(name),
        name,
        properties: [],
        childs:     []
    }
    if (anchor !== undefined)
        object.anchor = anchor
    if (paren !== undefined)
        object.paren = paren
    if (primary)
        object.primary = true
    ctx.objectMeta.set(object, { file, line })
    const statements = new Array<string>()
    for (const segment of segments) {
        const km = segment.match(/^([^:;]+):\s+(.+)$/)
        if (km !== null && !(/\s(?:\*\*BECAUSE\*\*|BECAUSE)\s/.test(segment))) {
            const property: Property = { key: km[1].trim(), value: km[2].trim() }
            ctx.propMeta.set(property, { line })
            object.properties.push(property)
        }
        else
            statements.push(segment)
    }
    if (statements.length > 0)
        object.description = splitDescription(statements.join("; ").replace(/\.\s*$/, ""))

    /*  recurse into nested concise-format child objects  */
    for (const sub of item.tokens)
        if (sub.type === "list" && !(sub as Tokens.List).ordered)
            parseList(ctx, sub as Tokens.List, object, file, line)
    parent.childs.push(object)
}

/*  parse a single source file into its artifacts  */
export const parseFile = (ctx: ParseContext, source: SourceFile): Artifact[] => {
    const { present, created, modified, body, offset } = parseFrontmatter(source.text)
    if (!present)
        ctx.diagnose(source.file, 1, "missing frontmatter (\"Created:\"/\"Modified:\" block)")
    else
        for (const [ key, info ] of [ [ "Created", created ], [ "Modified", modified ] ] as const)
            if (info.date === null)
                ctx.diagnose(source.file, info.line, info.value === null ?
                    `missing "${key}:" frontmatter key` :
                    `invalid "${key}:" frontmatter timestamp "${info.value}"`)

    /*  the state tracked while walking the Markdown tokens  */
    const artifacts = new Array<Artifact>()
    const stack     = new Array<SpecObject>()
    let   current: SpecObject | null = null
    let   group:   Group | null      = null
    let   parts    = new Array<string>()

    /*  flush the accumulated description parts into the current object  */
    const flush = () => {
        if (current !== null && parts.length > 0 && current.description === undefined)
            current.description = splitDescription(parts.join("\n\n").trim())
        parts = []
    }

    /*  walk the top-level Markdown tokens, tracking source lines  */
    let line = offset + 1
    for (const token of marked.lexer(body)) {
        if (token.type === "heading") {
            flush()
            group = null
            const heading = parseHeadingText(token.text)
            if (heading.malformed !== undefined)
                ctx.diagnose(source.file, line, `malformed anchor "${heading.malformed}" in heading`)
            if (heading.name === "" && token.depth > 1) {
                /*  a grouping container heading (e.g. "### STATES") collects
                    objects of its singular kind below the parent object  */
                const parent = stack[token.depth - 2]
                if (parent === undefined)
                    ctx.diagnose(source.file, line, `heading level ${token.depth} without parent object`)
                else {
                    group   = { parent, kind: heading.kind.replace(/S$/, "") }
                    current = parent
                }
            }
            else {
                const object: SpecObject = {
                    kind:       heading.kind,
                    id:         heading.id ?? (token.depth === 1 ? heading.paren : undefined) ?? slugify(heading.name),
                    name:       heading.name,
                    properties: [],
                    childs:     []
                }
                if (heading.id !== undefined)
                    object.anchor = heading.id
                if (heading.paren !== undefined)
                    object.paren = heading.paren
                if (heading.primary)
                    object.primary = true
                ctx.objectMeta.set(object, { file: source.file, line })
                if (token.depth === 1) {
                    artifacts.push({
                        created:  created.date  ?? new Date(),
                        modified: modified.date ?? new Date(),
                        objects:  [ object ]
                    })
                    stack.length = 0
                }
                else {
                    const parent = stack[token.depth - 2]
                    if (parent === undefined) {
                        ctx.diagnose(source.file, line, `heading level ${token.depth} without parent object`)
                        line += (token.raw.match(/\n/g) ?? []).length
                        continue
                    }
                    parent.childs.push(object)
                }
                stack.length = token.depth - 1
                stack[token.depth - 1] = object
                current = object
            }
        }
        else if (token.type === "list") {
            const list = token as Tokens.List
            if (current === null)
                ctx.diagnose(source.file, line, "content outside of any object")
            else if (!list.ordered && group !== null)
                parseGrouped(ctx, list, group, source.file, line)
            else if (!list.ordered)
                parseList(ctx, list, current, source.file, line)
            else
                parts.push(token.raw.trim())
        }
        else if (token.type === "paragraph" || token.type === "blockquote"
            || (token.type === "code" && (token as Tokens.Code).lang !== "gradia")) {
            /*  notice: a "gradia" code block is skipped entirely, as it is
                the derived diagram of the Markdown renderer and hence must
                not become authored content on a re-parse of exported files  */
            if (current === null)
                ctx.diagnose(source.file, line, "content outside of any object")
            else
                parts.push(token.raw.trim())
        }
        line += (token.raw.match(/\n/g) ?? []).length
    }
    flush()

    /*  load the embedded image files of all fully parsed objects  */
    for (const artifact of artifacts)
        for (const object of artifact.objects)
            embed(ctx, object, source.file)
    if (artifacts.length === 0)
        ctx.diagnose(source.file, 1, "no artifact (level 1 heading) found")
    return artifacts
}
