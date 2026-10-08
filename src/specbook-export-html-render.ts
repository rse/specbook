/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { Marked, type Tokens } from "marked"
import { markedSmartypants }    from "marked-smartypants"
import type nunjucks            from "nunjucks"

import type { SpecArtifact, SpecObject, SpecProperty, SpecDescription }
    from "./specbook-format-spec.js"
import type { SchemaObject, SchemaFormat }
    from "./specbook-format-schema.js"
import { resolveUnique, expandReferences, type LinkIndex }
    from "./specbook-link.js"
import { compileValueExpr, splitItems, type ValueExpr }
    from "./specbook-parse-value.js"
import { embeddingRegex, embeddingCount, embeddingThemes, darkMark, type DarkMark }
    from "./specbook-parse-common.js"
import { escapeHtml, fallbackLogo, imageDark, isTitleObject, titleProperties, type OmitAspect }
    from "./specbook-export-common.js"
import { isDocument }
    from "./specbook-export-image.js"
import { embeddedSource, fenceLanguage, diagramKey, omittedDiagram,
    type DiagramLanguage, type DiagramVariants }
    from "./specbook-export-diagram.js"
import { embeddedListing, fencedListing, type Listing, type ListingRenderer }
    from "./specbook-export-code.js"
import { coverageRatio, type Coverage }
    from "./specbook-coverage.js"
import { safe, render }
    from "./specbook-export-html-template.js"
import type { InfoEntry, SpecEntry }
    from "./specbook-export-html-widget.js"
import { omitLong }
    from "./specbook-export-html-fold.js"

/*  ==== Rendering ====  */

/*  the per-language double quote styles for the smart typography
    (single quotes stay curly, as smartypants cannot distinguish a
    closing single quote from an apostrophe)  */
const quoteStyles: Record<string, [ string, string ]> = {
    "en": [ "&#8220;",      "&#8221;"      ],  /*  “...”    */
    "nl": [ "&#8220;",      "&#8221;"      ],  /*  “...”    */
    "de": [ "&#8222;",      "&#8220;"      ],  /*  „...“    */
    "cs": [ "&#8222;",      "&#8220;"      ],  /*  „...“    */
    "sk": [ "&#8222;",      "&#8220;"      ],  /*  „...“    */
    "pl": [ "&#8222;",      "&#8221;"      ],  /*  „...”    */
    "fr": [ "&#171;&#160;", "&#160;&#187;" ],  /*  « ... »  */
    "it": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "es": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "pt": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "no": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "da": [ "&#187;",       "&#171;"       ],  /*  »...«    */
    "sv": [ "&#8221;",      "&#8221;"      ],  /*  ”...”    */
    "fi": [ "&#8221;",      "&#8221;"      ]   /*  ”...”    */
}

/*  the active double quote style (set per document during rendering)  */
let quotes: [ string, string ] = quoteStyles.en

/*  the private Markdown renderer instance, as the hooks below must not
    leak into the "marked" singleton shared with the parser and with the
    application embedding SpecBook as a library  */
const marked = new Marked()

/*  improve the typography of all rendered Markdown text (curly quotes,
    "--" as the em dash, ellipsis); as smartypants requires unescaped text,
    the extension switches off the text escaping of marked, so the stray
    ampersands left behind have to be re-escaped afterwards; the English
    double quotes of smartypants are remapped to the document language;
    as marked runs later-registered pass-through hooks first, the
    post-processing hook has to be registered before smartypants  */
marked.use({ hooks: { postprocess: (html) =>
    html.replace(/&#8220;/g, quotes[0]).replace(/&#8221;/g, quotes[1])
        .replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;") } })
marked.use(markedSmartypants({ config: 1 }))

/*  the switched-off text escaping of marked also leaves the angle
    brackets of the inline text unescaped, which a browser then takes
    for tags ("Map<String, Object>"), so they are escaped upfront in
    the inline text tokenizer (registered after smartypants, as the
    later-registered tokenizer takes precedence)  */
marked.use({ tokenizer: { inlineText (src) {
    const cap = this.rules.inline.text.exec(src)
    if (cap === null)
        return undefined
    return { type: "text", raw: cap[0], escaped: true,
        text: cap[0].replace(/</g, "&lt;").replace(/>/g, "&gt;") }
} } })

/*  the active per-document reference expander, fully-qualified
    anchor paths, member-carrying property value constraints, object
    schema nodes, pre-rendered diagram blocks, optimized embedded images,
    dark theme judgements of the images, pre-rendered embedded diagrams,
    code listing renderer, object nesting levels, reference coverages,
    description popup keys of the schema nodes, description popup keys
    of the objects, and omitted aspects (all set by "withDocument")  */
let linker:      ((text: string, compact: boolean) => string) | null = null
let anchors:     Map<SpecObject, string> | null       = null
let members:     Map<string, ValueExpr> | null        = null
let schemas:     Map<SpecObject, SchemaObject> | null = null
let diagrams:    Map<SpecObject, string> | null       = null
let images:      Map<string, string> | null           = null
let rasters:     Map<string, boolean> | null          = null
let embedded:    Map<string, DiagramVariants> | null  = null
let listings:    ListingRenderer | null               = null
let levels:      Map<SpecObject, number> | null       = null
let coverages:   Map<SpecObject, Coverage[]> | null   = null
let infoKeys:    Map<SchemaObject, string> | null     = null
let infoObjects: Map<SpecObject, string> | null       = null
let omits:       Set<OmitAspect> | null               = null

/*  the per-document rendering state, plus the document language
    selecting the smart typography quote style  */
export type DocumentState = {
    lang:        string | undefined
    linker:      (text: string, compact: boolean) => string
    anchors:     Map<SpecObject, string>
    members:     Map<string, ValueExpr> | null
    schemas:     Map<SpecObject, SchemaObject> | null
    diagrams:    Map<SpecObject, string> | null
    images:      Map<string, string>
    rasters:     Map<string, boolean>
    embedded:    Map<string, DiagramVariants>
    listings:    ListingRenderer
    levels:      Map<SpecObject, number>
    coverages:   Map<SpecObject, Coverage[]> | null
    infoKeys:    Map<SchemaObject, string> | null
    infoObjects: Map<SpecObject, string> | null
    omits:       Set<OmitAspect>
}

/*  establish the per-document rendering state around the rendering of a
    document and release it again afterwards (also on a rendering failure),
    as it would otherwise retain the specification (and its embedded
    images) until the next rendering  */
export const withDocument = <T>(state: DocumentState, body: () => T): T => {
    quotes      = quoteStyles[state.lang?.toLowerCase().split(/[-_]/)[0] ?? "en"] ?? quoteStyles.en
    linker      = state.linker
    anchors     = state.anchors
    members     = state.members
    schemas     = state.schemas
    diagrams    = state.diagrams
    images      = state.images
    rasters     = state.rasters
    embedded    = state.embedded
    listings    = state.listings
    levels      = state.levels
    coverages   = state.coverages
    infoKeys    = state.infoKeys
    infoObjects = state.infoObjects
    omits       = state.omits
    try {
        return body()
    }
    finally {
        linker      = null
        anchors     = null
        members     = null
        schemas     = null
        diagrams    = null
        images      = null
        rasters     = null
        embedded    = null
        listings    = null
        levels      = null
        coverages   = null
        infoKeys    = null
        infoObjects = null
        omits       = null
    }
}

/*  the object whose texts are currently rendered, scoping the
    resolution of the references inside them (nearest object wins),
    established around every object rendering and restored afterwards  */
let scope: SpecObject | null = null
const scoped = <T>(object: SpecObject, body: () => T): T => {
    const outer = scope
    scope = object
    try {
        return body()
    }
    finally {
        scope = outer
    }
}

/*  determine the fully-qualified anchor path of an object  */
const anchorOf = (object: SpecObject): string =>
    anchors?.get(object) ?? object.id

/*  determine the schema description popup key of an object (the
    INFO table index of its schema node)  */
const infoKeyOf = (object: SpecObject): string | undefined => {
    const schema = schemas?.get(object)
    return schema !== undefined ? infoKeys?.get(schema) : undefined
}

/*  determine the corpus description popup key of an object (its SPEC
    table index), which a schema popup references for its title path,
    too: "named = false" keeps the last path segment kind-only there,
    as the kind popups (and the group headers of the compact tables)
    describe the object class instead of the single instance  */
const infoRefOf = (object: SpecObject, named = true): string | undefined => {
    const key = infoObjects?.get(object)
    return key !== undefined ? key + (named ? "" : "^") : undefined
}

/*  render the schema description popup key and kind-ending title path
    reference of an object as "data-info" attributes for the manually
    assembled hyperlink markup (the kind popup of the full hyperlinks)  */
const infoAttr = (object: SpecObject): string => {
    const key = infoKeyOf(object)
    const ref = infoRefOf(object, false)
    return key !== undefined && ref !== undefined ?
        ` data-info="${key}" data-info-path="${ref}"` : ""
}

/*  render the corpus description popup key of an object as the
    "data-info-spec" attribute for the manually assembled hyperlink
    markup (the instance popup of the compact and full hyperlinks)  */
const specAttr = (object: SpecObject): string => {
    const ref = infoRefOf(object)
    return ref !== undefined ? ` data-info-spec="${ref}"` : ""
}

/*  create the reference expander of a document: "[[xxx]]" references
    expand into hyperlinks (an unresolvable or ambiguous reference stays
    literal, marked as broken), resolved from the object currently
    rendered and targeting the fully-qualified anchor paths of the
    objects: in the full form (kind, name, and link symbol), or in the
    compact form for prose (the object icon and the name only, via CSS
    and markup, with the full form shown by the description popups)  */
export const makeLinker = (index: LinkIndex) => (text: string, compact: boolean): string =>
    expandReferences(text, (reference) => {
        const target = resolveUnique(index, reference, scope ?? undefined).target
        if (target === undefined)
            return `<span class="link-broken">[[${escapeHtml(reference)}]]</span>`

        /*  the full form carries the popup attributes on its kind and
            name, with the kind bold in the accent color and the name
            bold in the regular text color (via the stylesheet)  */
        const full =
            `<strong class="object-kind"${infoAttr(target)}>${escapeHtml(target.kind)}:</strong>` +
            ` <span class="object-name"${specAttr(target)}>${target.name}</span>` +
            " <span class=\"link-symbol\">&#x26AD;</span>"
        return compact ?
            `<a href="#${escapeHtml(anchorOf(target))}" class="link-compact"${specAttr(target)}>${target.name}</a>` :
            `<a href="#${escapeHtml(anchorOf(target))}" class="link-full">${full}</a>`
    })

/*  collect the description popup table of the schema nodes and their
    keys (the table indices), with the description Markdown of the
    objects and properties pre-rendered to HTML  */
export const collectInfo = (nodes: SchemaObject[],
    keys: Map<SchemaObject, string>, info: InfoEntry[]) => {
    for (const schema of nodes) {
        keys.set(schema, String(info.length))
        const entry: InfoEntry = {}
        if (schema.desc !== undefined)
            entry.d = marked.parse(schema.desc, { async: false }).trim()
        for (const property of schema.props ?? []) {
            if (property.desc === undefined)
                continue
            entry.p ??= {}
            entry.p[property.name] = marked.parse(property.desc, { async: false }).trim()
        }
        info.push(entry)
        collectInfo(schema.children ?? [], keys, info)
    }
}

/*  expand the inline Markdown of a text (code spans, emphasis, etc.),
    with Wiki-style references expanded upfront (in their compact form
    for prose, i.e. descriptions, in their full form otherwise)  */
const inline = (text: string, compact = false) =>
    safe(marked.parseInline(linker !== null ? linker(text, compact) : text, { async: false }))

/*  expand the full Markdown of a text, keeping its block-level
    constructs (lists, quotes, code blocks, tables) intact  */
const block = (text: string, compact = false) =>
    safe(marked.parse(linker !== null ? linker(text, compact) : text, { async: false }))

/*  check whether a text carries any block-level Markdown, i.e. is
    anything other than the single paragraph a description usually is  */
const isBlock = (text: string): boolean => {
    const tokens = marked.lexer(text).filter((token) => token.type !== "space")
    return tokens.length > 0 && !(tokens.length === 1 && tokens[0].type === "paragraph")
}

/*  render a single embedded image file (in its optimized form) onto an
    <img> tag with a self-contained data: URL (converting the SVG text
    into one, as an SVG inlined as-is would leak its document-global
    <style> rules into all other inlined SVGs sharing the same class names),
    where an image inverted on the dark theme (as given for a diagram or a
    theme variant, else as the image itself says) is marked by a class  */
const renderImage = (original: string, alt: string,
    dark: DarkMark = imageDark(original, rasters ?? undefined)): string => {
    const content = darkMark(images?.get(original) ?? original).content
    const url = content.startsWith("data:") ? content :
        `data:image/svg+xml;base64,${Buffer.from(content, "utf8").toString("base64")}`
    return `<img src="${url}"${dark === "invert" ? " class=\"dark-invert\"" : ""} alt="${escapeHtml(alt)}"/>`
}

/*  wrap the theme variants of an image into their layout-neutral theme
    containers, of which the stylesheet shows just the one matching the
    color theme currently active in the document  */
const renderThemed = (variants: string[]): string =>
    variants.map((variant, i) =>
        `<span class="theme-${embeddingThemes[i]}-only">${variant}</span>`).join("")

/*  render an embedded diagram (a fenced code block of a diagram language
    or an embedded diagram source file) into a diagram block like the one
    of a Gradia diagram (of the type "code" and carrying the nesting level
    of the object rendered), so it folds and maximizes alike, with its
    pre-rendered theme variants as images (as an SVG inlined as-is would
    leak its document-global <style> rules); an omitted or failed diagram
    leaves nothing behind  */
const renderEmbedded = (language: DiagramLanguage, source: string, alt: string): string => {
    const variants = embedded?.get(diagramKey(language, source))
    const level    = (scope !== null ? levels?.get(scope) : undefined) ?? 1
    if (variants === undefined || (omits !== null && omittedDiagram(language, level, omits)))
        return ""
    return `<div class="diagram" data-type="code" data-level="${level}">` +
        renderThemed(embeddingThemes.map((theme) => renderImage(variants[theme], alt, "none"))) + "</div>"
}

/*  render a code listing (a fenced code block of a known language or an
    embedded source code file) into a diagram block (of the type "listing"
    and carrying the nesting level of the object rendered), so it folds,
    maximizes, and is omitted like a diagram  */
const renderListingBlock = (renderer: ListingRenderer, listing: Listing): string => {
    const level = (scope !== null ? levels?.get(scope) : undefined) ?? 1
    if (omits !== null && omittedDiagram("listing", level, omits))
        return ""
    return `<div class="diagram" data-type="listing" data-level="${level}">${renderer(listing)}</div>`
}

/*  render a fenced code block of a diagram language as its embedded
    diagram and one of a known language as its code listing instead of
    as plain code (outside of an HTML rendering, too)  */
marked.use({ renderer: { code (token) {
    const language = fenceLanguage(token.lang)
    if (language !== undefined)
        return renderEmbedded(language, token.text, `${language} diagram`)
    const listing = fencedListing(token)
    return listing !== undefined && listings !== null ? renderListingBlock(listings, listing) : false
} } })

/*  strip the fenced code blocks of a diagram language or a code listing
    off a text  */
const stripDiagrams = (text: string): string =>
    marked.lexer(text)
        .filter((token) => !(token.type === "code" && (fenceLanguage((token as Tokens.Code).lang) !== undefined
            || fencedListing(token as Tokens.Code) !== undefined)))
        .map((token) => token.raw).join("")

/*  render the embedded image files of a text into HTML, taking the image
    alternate texts from the corresponding "![alt](file)" markups and
    pairing up the consecutive theme variants of a "{theme}" markup, where
    an embedded diagram source file renders as its diagram block, an
    embedded source code file as its code listing block, and an
    image or PDF page (unless unframed, like the title page logo) sits in a
    diagram block of type "image", so it folds, maximizes, and is omitted
    like a diagram (the empty entries of unreadable files, the failed PDF
    pages, and the omitted diagrams and images are skipped)  */
const renderEmbeddings = (text: string, embedding: string[], framed = true): string[] => {
    const result  = new Array<string>()
    const level   = (scope !== null ? levels?.get(scope) : undefined) ?? 1
    const omitted = framed && omits !== null && omittedDiagram("image", level, omits)
    const frame   = (html: string) => framed ?
        `<div class="diagram" data-type="image" data-level="${level}">${html}</div>` : html
    let i = 0
    for (const m of text.matchAll(embeddingRegex)) {
        const count = embeddingCount(m[2])
        if (count === 0)
            continue
        const contents = embedding.slice(i, i + count).filter((content) => content !== "")
        i += count
        if (contents.some((content) => embeddedSource(content) !== undefined || embeddedListing(content) !== undefined))
            result.push(...contents.map((content) => {
                const diagram = embeddedSource(content)
                const listing = embeddedListing(content)
                return diagram !== undefined ? renderEmbedded(diagram.language, diagram.source, m[1].trim()) :
                    listing !== undefined && listings !== null ? renderListingBlock(listings, listing) : ""
            }).filter((html) => html !== ""))
        else if (!omitted) {
            const variants = contents.filter((content) => !isDocument(content) || images?.has(content) === true)
                .map((content) => renderImage(content, m[1].trim(), count > 1 ? "none" : undefined))
            result.push(...(count > 1 && variants.length === count ? [ renderThemed(variants) ] : variants).map(frame))
        }
    }
    return result
}

/*  the image embedding markup including the horizontal whitespace
    before it, so that its removal leaves no double space behind  */
const embeddingMarkup = new RegExp(`[ \\t]*${embeddingRegex.source}`, "g")

/*  strip the markup of the file embeddings off a description text  */
const stripEmbeddings = (text: string): string =>
    text.replace(embeddingMarkup, (markup: string, _alt: string, reference?: string) =>
        embeddingCount(reference) > 0 ? "" : markup).trim()

/*  render a description into HTML, expanding its inline Markdown,
    rendering its elaboration as blocks below the statement and the
    rationale, and moving the file embeddings to the end of it all  */
const renderDescription = (description: SpecDescription): string => {
    const text        = stripEmbeddings(description.description)
    const elaboration = stripEmbeddings(description.elaboration ?? "")
    const embeddings  = renderEmbeddings(`${description.description}\n\n${description.elaboration ?? ""}`,
        description.embedding ?? []).map((content) => safe(content))
    const blocked     = isBlock(text)
    return render("Description", { Description: {
        block:       blocked,
        description: text !== "" ? (blocked ? block(text, true) : inline(text, true)) : "",
        rationale:   description.rationale !== undefined ?
            inline(description.rationale, true) : undefined,
        elaboration: elaboration !== "" ? block(elaboration, true) : undefined,
        embeddings
    } })
}

/*  collect the description popups of the object instances: the corpus
    description Markdown of every object, pre-rendered to HTML into
    its SPEC table entry (the embedded images and diagrams and the
    rationale are left out, as the popup shows the prose alone)  */
export const collectSpec = (objects: SpecObject[], spec: SpecEntry[]) => {
    for (const object of objects) {
        const text = stripEmbeddings(stripDiagrams(
            [ object.description?.description ?? "", object.description?.elaboration ?? "" ].join("\n\n")))
        const key = infoObjects?.get(object)
        if (key !== undefined && text !== "")
            spec[Number(key)][4] = scoped(object, () =>
                block(text, true).toString().trim())
        collectSpec(object.children, spec)
    }
}

/*  the literal members of an "enum(...)"/"tags(...)" expression, or
    of the "enum(...)"/"tags(...)" alternatives of a "list(...)" one
    (empty for every other expression)  */
const literalMembers = (expr: ValueExpr): string[] =>
    expr.kind === "enum" || expr.kind === "tags" ? expr.members :
        expr.kind === "list" ? expr.alternatives.flatMap(literalMembers) : []

/*  collect the properties of the schema configuration constrained by
    literal members (an "enum(...)", a "tags(...)", or a "list(...)"
    with such alternatives), keyed by object kind and property name  */
export const collectMembers = (nodes: SchemaObject[], result: Map<string, ValueExpr>) => {
    for (const schema of nodes) {
        for (const property of schema.props ?? []) {
            if (property.value === undefined)
                continue
            try {
                const expr = compileValueExpr(property.value)
                if (literalMembers(expr).length > 0)
                    result.set(`${schema.kind} ${property.name}`, expr)
            }
            catch {
                /*  an invalid expression is the concern of lint  */
            }
        }
        collectMembers(schema.children ?? [], result)
    }
    return result
}

/*  render a property value, badging the individual members of an
    "enum(...)" (a single member) or "tags(...)" (a member set) value
    and the literal member items of a "list(...)" value (the other items,
    like references, stay prose), moving its image embeddings behind the
    value, rendered from the embedded image contents (as for a
    description), not from the markup; an absent property renders as the
    marker telling it apart from a property given with an empty value  */
const inlineValue = (kind: string, property: SpecProperty | undefined) => {
    if (property === undefined)
        return safe("<span class=\"value-absent\"></span>")
    const { key, value, embedding } = property
    const expr = members?.get(`${kind} ${key}`)
    const text = stripEmbeddings(value)
    const embeddings = renderEmbeddings(value, embedding ?? [])
        .map((content) => `<div class="embedding">${content}</div>`).join("")
    if (expr === undefined || text === "")
        return safe(`${inline(text)}${embeddings}`)
    const badge = (item: string) => `<span class="value-member">${inline(item)}</span>`
    if (expr.kind === "enum")
        return safe(badge(text) + embeddings)
    const items = splitItems(text).filter((item) => item !== "")
    if (expr.kind === "tags")
        return safe(items.map(badge).join(" ") + embeddings)
    const literals = new Set(literalMembers(expr))
    return safe(items.map((item) => literals.has(item) ? badge(item) : inline(item)).join(", ") + embeddings)
}

/*  expand the inline Markdown of the property values, with the
    entries injected for unused properties (foreign to the object)
    rendered as absent  */
const inlineProperties = (object: SpecObject, properties: SpecProperty[]) =>
    properties.map((property) => ({ key: property.key,
        info: infoKeyOf(object), infopath: infoRefOf(object),
        value: inlineValue(object.kind, object.properties.includes(property) ? property : undefined) }))

/*  resolve the format configuration of the kind of an object  */
const formatOf = (object: SpecObject): SchemaFormat | undefined =>
    schemas?.get(object)?.format

/*  determine the maximum table columns configured on the kind of an
    object (at least two, as a single column cannot carry a name and a
    value)  */
const maxColumnsOf = (object: SpecObject): number =>
    Math.max(2, formatOf(object)?.maxTableColumns ?? 4)

/*  determine the effective properties of an object in schema order
    (unknown keys appended in document order), with "withUnusedProps"
    injecting the defined but still unused schema properties as empty
    key/value entries  */
const effectiveProperties = (object: SpecObject): SpecProperty[] => {
    const schema = schemas?.get(object)
    if (schema === undefined)
        return object.properties
    const unused = schema.format?.withUnusedProps === true
    const merged = (schema.props ?? []).flatMap((prop) => {
        const present = object.properties.filter((property) => property.key === prop.name)
        return present.length > 0 ? present : (unused ? [ { key: prop.name, value: "" } ] : [])
    })
    return [ ...merged, ...object.properties.filter((property) => !merged.includes(property)) ]
}

/*  determine the column shape of a potential compact table in schema
    order (unknown keys appended in occurrence order), with
    "withUnusedProps" injecting the defined but still unused schema
    properties as additional columns  */
const tableShape = (children: SpecObject[]) => {
    const used   = [ ...new Set(children.flatMap((child) =>
        child.properties.map((property) => property.key))) ]
    const schema = schemas?.get(children[0])
    const names  = (schema?.props ?? []).map((prop) => prop.name)
    const known  = schema?.format?.withUnusedProps === true ?
        names : names.filter((name) => used.includes(name))
    const keys   = [ ...known, ...used.filter((key) => !names.includes(key)) ]
    return { keys, desc: children.some((child) =>
        child.description !== undefined || child.children.length > 0) }
}

/*  provide the children of an object taking part in the regular document
    flow: a nested title object leaves the flow, as it is rendered as the
    title page instead (a top-level one instead removes its whole artifact)  */
export const flowChildren = (object: SpecObject): SpecObject[] =>
    object.children.filter((child) => !isTitleObject(child))

/*  decide whether a single-kind group of children collapses into the
    concise or compact (tabular) rendering: an explicit "format" type of
    the kind wins, "auto" collapses the deepest level only, and inside an
    already concise rendering context "auto" groups implicitly stay concise, too  */
export const conciseGroup = (group: SpecObject[], schemaMap: Map<SpecObject, SchemaObject> | null,
    concise: boolean): boolean => {
    const type = schemaMap?.get(group[0])?.format?.type ?? "auto"
    if (type !== "auto")
        return type !== "complex"
    return concise || group.every((child) => child.children.length === 0)
}

/*  group the children of an object by their kind, preserving order  */
export const groupChildren = (children: SpecObject[]): SpecObject[][] => {
    const groups = new Map<string, SpecObject[]>()
    for (const child of children) {
        const group = groups.get(child.kind)
        if (group === undefined)
            groups.set(child.kind, [ child ])
        else
            group.push(child)
    }
    return [ ...groups.values() ]
}

/*  render the children of an object group-wise by kind: a concise group
    as one compact table (a "compact" one with a single content column),
    a complex group as regular nested object renderings  */
const renderChildren = (object: SpecObject, level: number, concise: boolean): string =>
    groupChildren(flowChildren(object)).map((group) => !conciseGroup(group, schemas, concise) ?
        group.map((child) => renderObject(child, level, concise)).join("") :
        formatOf(group[0])?.type === "compact" ?
            renderCompact(group) :
            renderTable(group, maxColumnsOf(group[0]))).join("")

/*  render the description cell of a table row: the description of the
    object followed by its recursively rendered children (implicitly or
    explicitly concise groups as nested sub-tables, explicitly complex
    ones as regular nested object renderings pressed into the cell);
    a cell left without any content renders as the absent marker,
    exactly like a property cell of a not given property  */
const renderCell = (child: SpecObject): string => {
    let html = child.description !== undefined ? renderDescription(child.description) : ""
    html += renderChildren(child, 6, true)
    return html.trim() !== "" ? html : "<span class=\"value-absent\"></span>"
}

/*  the pre-rendered diagram of an object as an embeddable block
    (empty for an object without a configured or renderable diagram)  */
const diagramOf = (object: SpecObject) => {
    const diagram = diagrams?.get(object)
    return diagram !== undefined ? safe(diagram) : ""
}

/*  the reference coverage of an object as a table: one row per
    configured pattern, labeled by the kinds of the matching objects,
    marked as object kinds and carrying the description popup of the
    first matching object of each kind (by the bare pattern, if none
    matches), with the counts and the ratio as a bar (empty for an
    object without a configured coverage)  */
const coverageOf = (object: SpecObject) => {
    const coverage = coverages?.get(object)
    if (coverage === undefined)
        return ""
    const kindLabel = (entry: Coverage, kind: string) => {
        const first = [ ...entry.covered, ...entry.uncovered ].find((target) => target.kind === kind)
        return `<span class="object-kind"${first !== undefined ? infoAttr(first) : ""}>${escapeHtml(kind)}</span>`
    }
    return safe(render("Coverage", { Coverage: coverage.map((entry, i) => ({
        label:   entry.kinds.length > 0 ?
            safe(entry.kinds.map((kind) => kindLabel(entry, kind)).join(", ")) :
            entry.pattern.replace(/^\[\[(.*)\]\]$/s, "$1"),
        covered: entry.covered.length,
        total:   entry.covered.length + entry.uncovered.length,
        ratio:   coverageRatio(entry.covered.length, entry.covered.length + entry.uncovered.length),
        even:    i % 2 === 1
    })) }))
}

/*  render a single-kind group of children into one compact table:
    the name first, then the property columns, then the description;
    a group wider than maxColumns, or carrying diagrams, instead chunks
    the property and description cells (and the leading diagram) of
    every object into an embedded per-object table, as a diagram is
    identifiable only under a header of its own, not under the column
    headers of a plain table  */
const renderTable = (children: SpecObject[], maxColumns: number): string => {
    const { keys, desc } = tableShape(children)
    const diagrammed = children.some((child) => diagrams?.has(child) === true)
    const fold       = formatOf(children[0])?.maxCellHeight
    if (!diagrammed && 1 + keys.length + (desc ? 1 : 0) <= maxColumns)
        return render("Table", { Table: {
            head:     children[0].kind !== "" ? children[0].kind : "Name",
            info:     infoKeyOf(children[0]),
            infopath: infoRefOf(children[0], false),
            keys,
            desc,
            fold,

            /*  under the fixed table layout the name column takes a fixed
                20% (via CSS) and the description column claims twice the
                share of a property column of the remaining 80%  */
            width:    Math.round(1600 / (keys.length + 2)) / 10,
            rows:     children.map((child, i) => scoped(child, () => {
                const values = keys.map((key) =>
                    inlineValue(child.kind, child.properties.find((property) => property.key === key)))
                const shares = desc ? [ ...keys.map(() => 1), 2 ] : keys.map(() => 1)
                const cells  = omitLong(omits, desc ? [ ...values, safe(renderCell(child)) ] : values,
                    shares.map((share) => 0.8 * share / (keys.length + (desc ? 2 : 0))), fold)
                return {
                    id:          anchorOf(child),
                    anchor:      child.anchor,
                    paren:       child.paren,
                    primary:     child.primary,
                    spec:        infoRefOf(child),
                    name:        inline(child.name),
                    even:        i % 2 === 1,
                    values:      cells.slice(0, keys.length),
                    description: cells[keys.length]
                }
            }))
        } })

    /*  the embedded rows hold at most maxColumns - 1 cells (of the
        group-wide union of property keys, plus the trailing description),
        with the last cell spanning the leftover columns of the final row,
        all of them sharing the 80% beside the fixed 20% name column  */
    const size = Math.max(1, maxColumns - 1)
    return render("TableChunked", { Table: {
        head:     children[0].kind !== "" ? children[0].kind : "Name",
        info:     infoKeyOf(children[0]),
        infopath: infoRefOf(children[0], false),
        desc,
        fold,
        rows:     children.map((child, i) => scoped(child, () => {
            const cells = keys.map((key) => ({ key, desc: false, span: 1,
                value: inlineValue(child.kind, child.properties.find((property) => property.key === key)) }))
            if (desc)
                cells.push({ key: "Description", desc: true, span: 1,
                    value: safe(renderCell(child)) })
            const chunks = new Array<typeof cells>()
            for (let pos = 0; pos < cells.length; pos += size)
                chunks.push(cells.slice(pos, pos + size))
            if (chunks.length > 0) {
                const last = chunks[chunks.length - 1]
                last[last.length - 1].span = size - last.length + 1
            }
            for (const chunk of chunks)
                omitLong(omits, chunk.map((cell) => cell.value), chunk.map((cell) => 0.8 * cell.span / size), fold)
                    .forEach((value, k) => { chunk[k].value = value })

            /*  the diagram leads the chunks as a full-width chunk of its
                own, headed like the description  */
            const diagram = diagramOf(child)
            if (diagram !== "")
                chunks.unshift([ { key: "Diagram", desc: true, span: size, value: diagram } ])
            return {
                id:       anchorOf(child),
                anchor:   child.anchor,
                paren:    child.paren,
                primary:  child.primary,
                spec:     infoRefOf(child),
                name:     inline(child.name),
                even:     i % 2 === 1,
                chunks
            }
        }))
    } })
}

/*  render a single-kind group of children into one compact table of the
    "compact" format: the name first, then a single cell rendering the
    object like a complex one, but without its heading (diagram,
    key/value properties, description, coverage, and children), for the
    objects whose many properties a table row could not hold, the first
    three led by sub-headers like the chunk headers of "TableChunked"  */
const renderCompact = (children: SpecObject[]): string => {
    const { keys, desc } = tableShape(children)
    const head = (label: string, html: string) =>
        html.trim() !== "" ? `<div class="compact-head">${label}</div>${html}` : ""
    return render("TableCompact", { Table: {
        head:     children[0].kind !== "" ? children[0].kind : "Name",
        info:     infoKeyOf(children[0]),
        infopath: infoRefOf(children[0], false),
        label:    keys.length > 0 && desc ? "Properties & Description" :
            (desc ? "Description" : "Properties"),
        fold:     formatOf(children[0])?.maxCellHeight,
        rows:     children.map((child, i) => scoped(child, () => {
            const properties = effectiveProperties(child)
            let html = head("Diagram", diagramOf(child).toString())
            if (properties.length > 0)
                html += head("Properties", render("Properties", { Properties: inlineProperties(child, properties),
                    Fold: formatOf(child)?.maxCellHeight }))
            if (child.description !== undefined)
                html += head("Description", renderDescription(child.description))
            html += coverageOf(child).toString()
            html += renderChildren(child, 6, true)
            return {
                id:      anchorOf(child),
                anchor:  child.anchor,
                paren:   child.paren,
                primary: child.primary,
                spec:    infoRefOf(child),
                name:    inline(child.name),
                even:    i % 2 === 1,
                content: safe(html.trim() !== "" ? html : "<span class=\"value-absent\"></span>")
            }
        }))
    } })
}

/*  recursively render an object into HTML  */
const renderObject = (object: SpecObject, level: number, concise: boolean): string => {
    const properties = effectiveProperties(object)
    return scoped(object, () => render("Object", { Object: {
        level:       Math.min(level, 6),
        kind:        object.kind,
        info:        infoKeyOf(object),
        infopath:    infoRefOf(object, false),
        spec:        infoRefOf(object),
        id:          anchorOf(object),
        anchor:      object.anchor,
        paren:       object.paren,
        primary:     object.primary,
        name:        inline(object.name),
        diagram:     diagramOf(object),
        properties:  properties.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object, properties),
                Fold: formatOf(object)?.maxCellHeight })) : "",
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        coverage:    coverageOf(object),
        children:    safe(renderChildren(object, level + 1, concise))
    } }))
}

/*  format a timestamp as its calendar date in local time (the
    frontmatter timestamps are parsed in local time, too, so the UTC
    date of toISOString() could shift the day)  */
export const formatDate = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-` +
    String(date.getDate()).padStart(2, "0")

/*  render the title object into a title page  */
export const renderTitlePage = (object: SpecObject, created: string, modified: string): string => {
    const prop = (name: string) =>
        object.properties.find((property) => property.key === name)?.value
    const inlineProp = (name: string) => {
        const value = prop(name)
        return value !== undefined && value.trim() !== "" ? inline(value) : ""
    }
    const rest = object.properties.filter((property) =>
        !titleProperties.some((prop) => prop.name === property.key))

    /*  the logo is rendered above the title, from the embedded image content
        of the LOGO property or, for a non-embeddable reference, as its inline
        Markdown; without a (non-empty) LOGO property the built-in SpecBook
        logo is used, in both its theme variants  */
    const logo  = object.properties.find((property) =>
        property.key === "LOGO" && property.value.trim() !== "")
    const image = logo !== undefined ? renderEmbeddings(logo.value, logo.embedding ?? [], false) : []
    return scoped(object, () => render("TitlePage", { TitlePage: {
        logo:        logo === undefined ?
            safe(renderThemed(embeddingThemes.map((theme) =>
                `<img src="${fallbackLogo(theme)}" alt="SpecBook"/>`))) :
            (image.length > 0 ? safe(image.join("")) : inline(logo.value)),
        title:       inline(prop("TITLE") ?? object.name),
        subtitle:    inlineProp("SUBTITLE"),
        author:      inlineProp("AUTHOR"),
        version:     inlineProp("VERSION"),
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        properties:  rest.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object, rest) })) : "",
        created, modified
    } }))
}

/*  render an artifact into HTML  */
export const renderArtifact = (artifact: SpecArtifact): string =>
    render("Artifact", { Artifact: {
        objects: safe(artifact.objects.map((object) => renderObject(object, 1, false)).join(""))
    } })

/*  provide the children of an object rendered with headings of their own
    (skipping the child groups collapsing into compact tables), which
    are the ones taking part in the table of contents and its side panel  */
const headingChildren = (object: SpecObject): SpecObject[] =>
    groupChildren(flowChildren(object))
        .filter((group) => !conciseGroup(group, schemas, false))
        .flat()

/*  an entry of the table of contents  */
type TocEntry = { id: string, kind: string, name: nunjucks.runtime.SafeString,
    level: number, page?: number, info?: string, infopath?: string, spec?: string }

/*  flatten the hierarchy of the rendered object headings (exactly like
    the PDF outline) into the entries of the table of contents, each
    carrying its nesting level and its optional page number  */
export const tocEntries = (objects: SpecObject[], pages?: Map<string, number>): TocEntry[] => {
    const entries: TocEntry[] = []
    const collect = (objects: SpecObject[], level: number) => {
        for (const object of objects) {
            const id = anchorOf(object)
            entries.push({ id, kind: object.kind,
                info: infoKeyOf(object), infopath: infoRefOf(object, false), spec: infoRefOf(object),
                name: inline(object.name), level: Math.min(level, 6), page: pages?.get(id) })
            collect(headingChildren(object), level + 1)
        }
    }
    collect(objects, 1)
    return entries
}

/*  render the side panel of the table of contents (its behavior is
    driven by its client-side script): the unnumbered entries of
    the front matter (title page, table and diagram of contents, as far
    as present) are followed by the hierarchical entries of the rendered
    object headings, exactly like the table of contents itself  */
export const renderTocPanel = (objects: SpecObject[], title: boolean, doc: boolean): string => {
    const entries = (objects: SpecObject[]): string =>
        objects.length === 0 ? "" : render("TocPanelEntries", { Entries: objects.map((object) => ({
            id:       anchorOf(object),
            kind:     object.kind,
            info:     infoKeyOf(object),
            infopath: infoRefOf(object, false),
            spec:     infoRefOf(object),
            name:     inline(object.name),
            children: safe(entries(headingChildren(object)))
        })) })
    return render("TocPanel", { TocPanel: { title, doc, entries: safe(entries(objects)) } })
}
