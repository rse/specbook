/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import fs   from "node:fs"
import path from "node:path"

import { marked, type Tokens } from "marked"
import * as v from "valibot"

import { Specification, type Artifact, type Object as SpecObject, type Property }
    from "./specbook-struct-spec.js"
import { type SchemaSpecification, type SchemaObject }
    from "./specbook-struct-schema.js"
import { type Diagnostic }
    from "./specbook-config.js"
import { referenceRegex, buildLinkIndex, resolveUnique, resolveSet, splitQuoted, type LinkIndex }
    from "./specbook-link.js"

/*  a single specification Markdown source file  */
export interface SourceFile {
    file: string
    text: string
}

/*  the result of parsing a set of specification Markdown files  */
export interface ParseResult {
    specification: Specification
    diagnostics:   Diagnostic[]
}

/*  per-object parsing meta information, kept outside the AST  */
interface ObjectMeta {
    file:    string
    line:    number
    tokens?: string[]
}

/*  a grouping container context (e.g. "### STATES")  */
interface Group {
    parent: SpecObject
    kind:   string
}

/*  the Markdown image embedding syntax ("![alt](file)")  */
export const embeddingRegex = /!\[([^\]]*)\]\(([^()]+)\)/g

/*  the embeddable file types and their MIME types  */
const embeddingTypes: { [ extension: string ]: string } = {
    svg:  "image/svg+xml",
    png:  "image/png",
    jpg:  "image/jpeg",
    jpeg: "image/jpeg"
}

/*  map a local image embedding reference onto its MIME type
    (URLs and other file types are not embeddable)  */
export const embeddingMimeType = (reference: string): string | undefined => {
    if (/^[a-z][a-z0-9+.-]+:/i.test(reference))
        return undefined
    const extension = reference.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase()
    return extension !== undefined ? embeddingTypes[extension] : undefined
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

    /*  detect the trailing explicit Wiki-style anchor ("{{xxx}}") and/or
        the implicit parenthesized anchor token ("(xxx)"), in any order  */
    let paren: string | undefined
    for (;;) {
        const wm = text.match(/\{\{([^{}]+)\}\}\s*$/)
        if (wm !== null && wm.index !== undefined) {
            id ??= wm[1].trim()
            text  = text.slice(0, wm.index).trim()
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
        id, paren, malformed
    }
}

/*  derive a stable slug identifier from an object name  */
const slugify = (text: string): string =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

/*  strip a trailing parenthesized annotation from a
    property key (e.g. "WHEN (Context)")  */
const plainKey = (key: string): string =>
    key.replace(/\s*\([^)]*\)\s*$/, "").trim()

/*  strip the inline code markup of a name or property value
    (preserved in the AST for rendering) for matching purposes  */
const plainText = (text: string): string =>
    text.replace(/`/g, "")

/*  compile a configured pattern into an anchored regular expression  */
const anchored = (pattern: string, flags = ""): RegExp =>
    new RegExp(`^(?:${pattern})$`, flags)

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
        return { date: isNaN(date.getTime()) ? null : date, line, value }
    }
    return {
        present:  true,
        created:  grab("Created"),
        modified: grab("Modified"),
        body:     text.slice(m[0].length),
        offset:   m[0].split("\n").length - 1
    }
}

/*  parser for a set of specification Markdown files  */
export class Parser {
    private diagnostics = new Array<Diagnostic>()
    private objectMeta  = new WeakMap<SpecObject, ObjectMeta>()
    private propMeta    = new WeakMap<Property, { line: number }>()
    private linkIndex: LinkIndex = []

    /*  parse all source files into the specification AST and
        optionally validate the result against a configuration  */
    parse (sources: SourceFile[], config?: SchemaSpecification): ParseResult {
        const artifacts = new Array<Artifact>()
        for (const source of sources)
            artifacts.push(...this.parseFile(source))
        const specification: Specification = { artifacts }
        if (artifacts.length > 0) {
            this.linkIndex = buildLinkIndex(specification)
            if (config !== undefined)
                this.validate(specification, config)
            this.validateReferences(specification)
            const result = v.safeParse(Specification, specification)
            if (!result.success)
                for (const issue of result.issues) {
                    const path = (issue.path ?? []).map((item) => String(item.key)).join(".")
                    this.diagnose(sources[0]?.file ?? "", 1, `internal AST invalid at "${path}": ${issue.message}`)
                }
        }
        return { specification, diagnostics: this.diagnostics }
    }

    /*  record a single diagnostic  */
    private diagnose (file: string, line: number, message: string) {
        this.diagnostics.push({ file, line, column: 1, message })
    }

    /*  load the image files embedded via "![alt](file)" into the description
        of an object (SVG as-is, PNG/JPEG as base64 data: URLs), resolving
        the references relative to the source file  */
    private embed (object: SpecObject, file: string) {
        const description = object.description
        if (description === undefined)
            return
        const line = this.objectMeta.get(object)?.line ?? 1
        for (const m of description.description.matchAll(embeddingRegex)) {
            const reference = m[2].trim()
            const type = embeddingMimeType(reference)
            if (type === undefined)
                continue
            try {
                const data = fs.readFileSync(path.resolve(path.dirname(file), reference))
                description.embedding ??= []
                description.embedding.push(type === "image/svg+xml" ?
                    data.toString("utf8") : `data:${type};base64,${data.toString("base64")}`)
            }
            catch (err) {
                this.diagnose(file, line, `unreadable embedding file "${reference}": ` +
                    (err instanceof Error ? err.message : String(err)))
            }
        }
    }

    /*  parse a single source file into its artifacts  */
    private parseFile (source: SourceFile): Artifact[] {
        const { present, created, modified, body, offset } = parseFrontmatter(source.text)
        if (!present)
            this.diagnose(source.file, 1, "missing frontmatter (\"Created:\"/\"Modified:\" block)")
        else
            for (const [ key, info ] of [ [ "Created", created ], [ "Modified", modified ] ] as const)
                if (info.date === null)
                    this.diagnose(source.file, info.line, info.value === null ?
                        `missing "${key}:" frontmatter key` :
                        `invalid "${key}:" frontmatter timestamp "${info.value}"`)
        const artifacts = new Array<Artifact>()
        const stack     = new Array<SpecObject>()
        let   current: SpecObject | null = null
        let   group:   Group | null      = null
        let   parts    = new Array<string>()

        /*  flush the accumulated description parts into the current object  */
        const flush = () => {
            if (current !== null && parts.length > 0 && current.description === undefined) {
                current.description = splitDescription(parts.join("\n\n").trim())
                this.embed(current, source.file)
            }
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
                    this.diagnose(source.file, line, `malformed anchor "${heading.malformed}" in heading`)
                if (heading.name === "" && token.depth > 1) {
                    /*  a grouping container heading (e.g. "### STATES") collects
                        objects of its singular kind below the parent object  */
                    const parent = stack[token.depth - 2]
                    if (parent === undefined)
                        this.diagnose(source.file, line, `heading level ${token.depth} without parent object`)
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
                    this.objectMeta.set(object, { file: source.file, line })
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
                            this.diagnose(source.file, line, `heading level ${token.depth} without parent object`)
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
                    this.diagnose(source.file, line, "content outside of any object")
                else if (!list.ordered && group !== null)
                    this.parseGrouped(list, group, source.file, line)
                else if (!list.ordered)
                    this.parseList(list, current, source.file, line)
                else if (list.items.every((item) => /^\*\*(.+?)\*\*:/.test(item.text.trim())))
                    this.parseFrames(list, current, source.file, line)
                else
                    parts.push(token.raw.trim())
            }
            else if (token.type === "paragraph" || token.type === "blockquote" || token.type === "code") {
                if (current === null)
                    this.diagnose(source.file, line, "content outside of any object")
                else
                    parts.push(token.raw.trim())
            }
            line += (token.raw.match(/\n/g) ?? []).length
        }
        flush()
        if (artifacts.length === 0)
            this.diagnose(source.file, 1, "no artifact (level 1 heading) found")
        return artifacts
    }

    /*  parse an unordered list of key-values and/or concise-format objects  */
    private parseList (list: Tokens.List, object: SpecObject, file: string, line: number) {
        for (const item of list.items) {
            const lines = itemLines(item)
            const first = lines[0]
            const cm = first.match(/^([^:;]+):\s+(.+;.+)$/)
            if (cm !== null)
                this.parseConcise(item, object, file, line)
            else {
                const km = first.match(/^([^:;]+):\s*(.*)$/)
                if (km !== null) {
                    /*  a key/value property, whose value may continue
                        on the following lines of the item  */
                    const value = [ km[2], ...lines.slice(1) ].join(" ").trim()
                    const property: Property = { key: km[1].trim(), value }
                    this.propMeta.set(property, { line })
                    object.properties.push(property)
                }
                else
                    this.diagnose(file, line, `unrecognized list item "${first}"`)
            }
            line += (item.raw.match(/\n/g) ?? []).length
        }
    }

    /*  parse a grouped object item of the forms
        "`<name>`: <description>",
        "`<from>` ─(<name>)─► `<to>`: <description>",
        "`<name>`: `<token> ...`:<br/> <description>", and
        "`<name>`: [`<type>`](#<ref>)(`<arity>`):<br/> <description>"  */
    private parseGrouped (list: Tokens.List, group: Group, file: string, line: number) {
        for (const item of list.items) {
            const lines = itemLines(item)
            const m = lines[0].match(
                /^`?([^`:]+?)`?(?:\s+─\(([^)]+)\)─►\s+`?([^`:]+?)`?)?:\s*(?:`([^`]+)`:\s*(?:<br\s*\/?>)?|\[`?([^`\]]+)`?\]\(#[^)]*\)(?:\(`?([^`)]+)`?\))?:\s*(?:<br\s*\/?>)?)?\s*(.*)$/)
            if (m === null) {
                this.diagnose(file, line, `unrecognized ${group.kind} item "${lines[0]}"`)
                line += (item.raw.match(/\n/g) ?? []).length
                continue
            }
            const name = (m[2] ?? m[1]).trim()
            const object: SpecObject = {
                kind:       group.kind,
                id:         slugify(name),
                name,
                properties: [],
                childs:     []
            }
            if (m[2] !== undefined) {
                /*  a transition-style arrow decoration encodes
                    the FROM and TO properties  */
                object.properties.push({ key: "FROM", value: m[1].trim() })
                object.properties.push({ key: "TO",   value: m[3].trim() })
            }
            let tokens
            if (m[4] !== undefined)
                tokens = m[4].trim().split(/\s+/)
            else if (m[5] !== undefined)
                tokens = [ m[5].trim(), ...(m[6] !== undefined ? [ m[6].trim() ] : []) ]
            this.objectMeta.set(object, { file, line, tokens })
            const description = [ m[7], ...lines.slice(1) ].join(" ").trim()
            if (description !== "") {
                object.description = splitDescription(description.replace(/\.\s*$/, ""))
                this.embed(object, file)
            }
            group.parent.childs.push(object)
            line += (item.raw.match(/\n/g) ?? []).length
        }
    }

    /*  parse a frame-style ordered list of items of the form
        "**<name>**: <description>" into child objects  */
    private parseFrames (list: Tokens.List, parent: SpecObject, file: string, line: number) {
        for (const item of list.items) {
            const m = itemLines(item).join(" ").match(/^\*\*(.+?)\*\*:\s*(.*)$/)
            if (m !== null) {
                const object: SpecObject = {
                    kind:       "",
                    id:         slugify(m[1]),
                    name:       m[1],
                    properties: [],
                    childs:     []
                }
                this.objectMeta.set(object, { file, line })
                if (m[2] !== "") {
                    object.description = splitDescription(m[2])
                    this.embed(object, file)
                }
                parent.childs.push(object)
            }
            line += (item.raw.match(/\n/g) ?? []).length
        }
    }

    /*  parse a concise-format object item of the form
        "<kind>: <name>; <key>: <value>; ...; <statement>, BECAUSE <rationale>.",
        which may continue on the following lines of the item  */
    private parseConcise (item: Tokens.ListItem, parent: SpecObject, file: string, line: number) {
        const text     = itemLines(item).join(" ").trim()
        const segments = text.split(/;\s*/).filter((segment) => segment !== "")
        const head     = segments.shift()?.match(/^([^:]+):\s*(.*)$/)
        if (head === null || head === undefined) {
            this.diagnose(file, line, `invalid concise object item "${text}"`)
            return
        }
        let name = head[2].trim()
        let anchor: string | undefined
        let paren:  string | undefined
        for (;;) {
            const am = name.match(/\{\{([^{}]+)\}\}\s*$/)
            if (am !== null && am.index !== undefined) {
                anchor ??= am[1].trim()
                name     = name.slice(0, am.index).trim()
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
            kind:       head[1].trim(),
            id:         anchor ?? slugify(name),
            name,
            properties: [],
            childs:     []
        }
        if (anchor !== undefined)
            object.anchor = anchor
        if (paren !== undefined)
            object.paren = paren
        this.objectMeta.set(object, { file, line })
        const statements = new Array<string>()
        for (const segment of segments) {
            const km = segment.match(/^([^:;]+):\s+(.+)$/)
            if (km !== null && !(/\sBECAUSE\s/.test(segment))) {
                const property: Property = { key: km[1].trim(), value: km[2].trim() }
                this.propMeta.set(property, { line })
                object.properties.push(property)
            }
            else
                statements.push(segment)
        }
        if (statements.length > 0) {
            object.description = splitDescription(statements.join("; ").replace(/\.\s*$/, ""))
            this.embed(object, file)
        }

        /*  recurse into nested concise-format child objects  */
        for (const sub of item.tokens)
            if (sub.type === "list" && !(sub as Tokens.List).ordered)
                this.parseList(sub as Tokens.List, object, file, line)
        parent.childs.push(object)
    }

    /*  validate every Wiki-style reference for unique resolvability,
        independent of any configuration  */
    private validateReferences (specification: Specification) {
        const check = (text: string, file: string, line: number) => {
            for (const m of text.matchAll(referenceRegex)) {
                const ref = m[1].trim()
                const resolution = resolveUnique(this.linkIndex, ref)
                if (resolution.ambiguous)
                    this.diagnose(file, line, `ambiguous link reference "[[${ref}]]"`)
                else if (resolution.target === undefined)
                    this.diagnose(file, line, `unresolvable link reference "[[${ref}]]"`)
            }
        }
        const walk = (object: SpecObject) => {
            const meta = this.objectMeta.get(object) ?? { file: "", line: 1 }
            check(object.name, meta.file, meta.line)
            for (const property of object.properties)
                check(property.value, meta.file, this.propMeta.get(property)?.line ?? meta.line)
            if (object.description !== undefined) {
                check(object.description.description, meta.file, meta.line)
                if (object.description.rationale !== undefined)
                    check(object.description.rationale, meta.file, meta.line)
            }
            object.childs.forEach(walk)
        }
        for (const artifact of specification.artifacts)
            artifact.objects.forEach(walk)
    }

    /*  validate the parsed specification against the configuration  */
    private validate (specification: Specification, config: SchemaSpecification) {
        const position = new Map<Artifact, number>()
        for (const artifact of specification.artifacts) {
            for (const object of artifact.objects) {
                const meta   = this.objectMeta.get(object) ?? { file: "", line: 1 }
                const schema = config.find((s) =>
                    (s.kind === object.kind && s.id === object.id) || `${s.kind}-${s.id}` === object.id) ??
                    config.find((s) => (s.name ?? "").toUpperCase() === plainText(object.name).toUpperCase())
                if (schema === undefined) {
                    this.diagnose(meta.file, meta.line,
                        `unknown artifact "${object.kind}: ${object.name}" (id "${object.id}")`)
                    continue
                }

                /*  the artifact heading must carry the configured kind and
                    name verbatim (the resolution above is deliberately
                    lenient, so deviations are still precisely reported)  */
                if (object.kind !== schema.kind)
                    this.diagnose(meta.file, meta.line,
                        `artifact kind "${object.kind}" does not match configured kind "${schema.kind}"`)
                if (schema.name !== undefined && plainText(object.name) !== schema.name)
                    this.diagnose(meta.file, meta.line,
                        `artifact name "${object.name}" does not match configured name "${schema.name}"`)
                if (!position.has(artifact))
                    position.set(artifact, config.indexOf(schema))
                this.validateObject(object, schema, 1)
            }
        }

        /*  order the artifacts exactly along the schema definition  */
        specification.artifacts.sort((a, b) =>
            (position.get(a) ?? config.length) - (position.get(b) ?? config.length))
    }

    /*  validate a single object (and recursively its childs) against its schema  */
    private validateObject (object: SpecObject, schema: SchemaObject, level: number) {
        const meta  = this.objectMeta.get(object) ?? { file: "", line: 1, tokens: undefined }
        const props = schema.props ?? []

        /*  check the name convention (the configured name of non-artifact
            objects is a regular expression pattern)  */
        if (level > 1 && schema.name !== undefined && !anchored(schema.name).test(plainText(object.name)))
            this.diagnose(meta.file, meta.line,
                `${object.kind} name "${object.name}" does not match pattern "${schema.name}"`)

        /*  a configured id has to be explicitly specified 1:1 in the
            input, via either "{{<id>}}" or "(<id>)"  */
        if (schema.id !== undefined && (object.anchor ?? object.paren) !== schema.id)
            this.diagnose(meta.file, meta.line,
                `configured id "${schema.id}" not explicitly specified on ${object.kind} "${object.name}"`)

        /*  find a property by its key (case-sensitive)  */
        const findProp = (name: string) =>
            object.properties.find((p) => plainKey(p.key) === name)

        /*  assign the pending inline tokens of grouped items to the still
            unset configured properties by matching their patterns  */
        const tokens        = [ ...(meta.tokens ?? []) ]
        const tokenAssigned = new Set<string>()

        /*  explode a multi-token property value whose direct pattern check
            fails: keep the token matching the own pattern and distribute
            the remaining tokens across the sibling properties  */
        for (const prop of props) {
            if (prop.value === undefined || prop.value.startsWith("[["))
                continue
            const match = findProp(prop.name)
            if (match === undefined || new RegExp(prop.value).test(plainText(match.value)))
                continue
            const parts = plainText(match.value).split(/\s+/)
            if (parts.length < 2)
                continue
            const idx = parts.findIndex((part) => anchored(prop.value ?? "", "i").test(part))
            if (idx < 0)
                continue
            match.value = parts[idx]
            tokenAssigned.add(prop.name)
            parts.splice(idx, 1)
            tokens.push(...parts)
        }
        for (const prop of props) {
            if (prop.value === undefined || prop.value.startsWith("[[") || findProp(prop.name) !== undefined)
                continue
            const idx = tokens.findIndex((token) => anchored(prop.value ?? "", "i").test(token))
            if (idx >= 0) {
                object.properties.push({ key: prop.name, value: tokens[idx] })
                tokenAssigned.add(prop.name)
                tokens.splice(idx, 1)
            }
        }
        for (const token of tokens)
            this.diagnose(meta.file, meta.line,
                `unassignable inline token "${token}" on ${object.kind} "${object.name}"`)

        /*  check the configured properties  */
        let parenConsumed = false
        for (const prop of props) {
            const match = findProp(prop.name)
            if (match === undefined) {
                /*  accept a trailing parenthesized name token as the value of a
                    still missing property when it matches the property pattern  */
                if (object.paren !== undefined && prop.value !== undefined
                    && !prop.value.startsWith("[[")
                    && new RegExp(prop.value).test(object.paren)) {
                    parenConsumed = true
                    continue
                }
                if (prop.optional !== true)
                    this.diagnose(meta.file, meta.line,
                        `required property "${prop.name}" missing on ${object.kind} "${object.name}"`)
            }
            else if (prop.value !== undefined && prop.value.startsWith("[[")) {
                /*  a link constraint: the value has to be one reference or a
                    comma-separated list of them, each resolving into the union
                    of the wildcard match sets of the constraint's alternatives
                    (e.g. "[[PERSONA:*,TOUCHPOINT:*]]")  */
                const line = this.propMeta.get(match)?.line ?? meta.line
                if (!/^\[\[[^[\]]+\]\](?:\s*,\s*\[\[[^[\]]+\]\])*$/.test(match.value.trim()))
                    this.diagnose(meta.file, line,
                        `property "${prop.name}" value "${match.value}" is not a link reference list`)
                else {
                    const allowed = new Set(splitQuoted(prop.value.slice(2, -2), ",")
                        .map((alternative) => alternative.trim())
                        .filter((alternative) => alternative !== "")
                        .flatMap((alternative) => resolveSet(this.linkIndex, alternative)))
                    for (const m of match.value.matchAll(referenceRegex)) {
                        const target = resolveUnique(this.linkIndex, m[1].trim()).target
                        if (target !== undefined && !allowed.has(target))
                            this.diagnose(meta.file, line,
                                `link reference "[[${m[1].trim()}]]" does not match constraint "${prop.value}"`)
                    }
                }
            }
            else if (prop.value !== undefined && !tokenAssigned.has(prop.name)
                && !new RegExp(prop.value).test(plainText(match.value)))
                this.diagnose(meta.file, this.propMeta.get(match)?.line ?? meta.line,
                    `property "${prop.name}" value "${match.value}" does not match pattern "${prop.value}"`)
        }
        for (const property of object.properties)
            if (!props.some((p) => p.name === plainKey(property.key)))
                this.diagnose(meta.file, this.propMeta.get(property)?.line ?? meta.line,
                    `unknown property "${property.key}" on ${object.kind} "${object.name}"`)

        /*  a parenthesized token not consumed as a property value acts as
            the implicit anchor (an explicit "{{...}}" anchor takes precedence)  */
        if (object.paren !== undefined && !parenConsumed && object.anchor === undefined)
            object.id = object.paren

        /*  check the configured child objects  */
        const childs = schema.childs ?? []
        for (const child of object.childs) {
            const childMeta = this.objectMeta.get(child) ?? { file: "", line: 1 }

            /*  adopt the sole configured kind for objects whose
                syntax carries no explicit kind (e.g. frames)  */
            if (child.kind === "" && childs.length === 1)
                child.kind = childs[0].kind
            const childSchema = childs.find((c) => c.kind === child.kind)
            if (childSchema === undefined) {
                this.diagnose(childMeta.file, childMeta.line,
                    `unknown object kind "${child.kind}" below ${object.kind} "${object.name}"`)
                continue
            }
            this.validateObject(child, childSchema, level + 1)
        }
        for (const child of childs)
            if (child.optional !== true
                && !object.childs.some((c) => c.kind === child.kind))
                this.diagnose(meta.file, meta.line,
                    `required object kind "${child.kind}" missing below ${object.kind} "${object.name}"`)

        /*  order the childs and properties exactly along the schema
            definition (the sort is stable, so objects of the same kind
            and unknown items keep their document order)  */
        const kindPos = (kind: string) => {
            const i = childs.findIndex((c) => c.kind === kind)
            return i >= 0 ? i : childs.length
        }
        object.childs.sort((a, b) => kindPos(a.kind) - kindPos(b.kind))
        const propPos = (key: string) => {
            const i = props.findIndex((p) => p.name === plainKey(key))
            return i >= 0 ? i : props.length
        }
        object.properties.sort((a, b) => propPos(a.key) - propPos(b.key))
    }
}

/*  convenience wrapper for one-shot parsing  */
export const parseSpecification = (sources: SourceFile[], config?: SchemaSpecification): ParseResult =>
    new Parser().parse(sources, config)
