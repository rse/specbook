/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { Marked }            from "marked"
import { markedSmartypants } from "marked-smartypants"
import nunjucks              from "nunjucks"
import nunjucksAddons        from "@rse/nunjucks-addons"
import textframe             from "textframe"
import { Gradia }            from "@rse/gradia"

import type { Spec, SpecArtifact, SpecObject, SpecProperty, SpecDescription }
    from "./specbook-format-spec.js"
import type { Schema, SchemaObject, SchemaFormat }
    from "./specbook-format-schema.js"
import { buildLinkIndex, resolveUnique, expandReferences, anchorPaths, plainText }
    from "./specbook-link.js"
import { compileValueExpr, splitItems }
    from "./specbook-parse-value.js"
import { embeddingRegex, embeddingMimeType, embeddingThemes, embeddingVariants }
    from "./specbook-parse-common.js"
import { escapeHtml, stylesheet, searchScript, fallbackLogo,
    isTitleObject, titleObject, documentTitle, documentLang, documentThemeStyle }
    from "./specbook-export-common.js"
import { collectSchemas }
    from "./specbook-parse-semantic.js"
import { specDiagrams }
    from "./specbook-diagram.js"

/*  ==== Templates ====  */

/*  the built-in Nunjucks templates for the HTML export  */
const templates = {
    /*  <Document/>  */
    "Document": textframe`
        <!DOCTYPE html>
        <html{% if Document.lang %} lang="{{ Document.lang }}"{% endif %}{% if Document.theme %} class="theme-{{ Document.theme }}"{% endif %}>
            <head>
                <meta charset="utf-8"/>
                <title>{{ Document.title }}</title>
                <style>
                    {{ Document.css }}
                </style>
                <script>
                    (function () {
                        let style = null
                        try { style = localStorage.getItem("specbook-theme") }
                        catch { /*  an inaccessible storage just means no stored choice  */ }
                        if (style === null) {
                            const m = document.documentElement.className.match(/theme-(light|dark)/)
                            style = m !== null ? m[1] : null
                        }
                        if (style === null)
                            style = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
                        document.documentElement.className = "theme-" + style
                    })()
                    function themeSwitch () {
                        const style = document.documentElement.className === "theme-dark" ? "light" : "dark"
                        document.documentElement.className = "theme-" + style
                        try { localStorage.setItem("specbook-theme", style) }
                        catch { /*  an inaccessible storage just loses the choice  */ }
                    }
                </script>
            </head>
            <body>
                {% if Document.realtime %}<div class="realtime-status disconnected" title="live preview connection">&#x25CF;</div>{% endif %}
                <div class="theme-switch" onclick="themeSwitch()" title="switch color theme">&#x25D0;</div>
                {{ Document.titlepage }}
                {{ Document.toc }}
                {{ Document.doc }}
                {{ Document.artifacts }}
                {% if Document.search %}<script>{{ Document.search }}</script>{% endif %}
                {% if Document.realtime %}<script class="realtime">{{ Document.realtime }}</script>{% endif %}
            </body>
        </html>
    `,

    /*  <TitlePage/>  */
    "TitlePage": textframe`
        <div class="titlepage">
            {% if TitlePage.logo %}<div class="logo">{{ TitlePage.logo }}</div>{% endif %}
            <div class="title">{{ TitlePage.title }}</div>
            {% if TitlePage.subtitle %}<div class="subtitle">{{ TitlePage.subtitle }}</div>{% endif %}
            {% if TitlePage.author %}<div class="author">{{ TitlePage.author }}</div>{% endif %}
            <table class="meta">
                {% if TitlePage.version %}<tr><td class="label">Version:</td><td>{{ TitlePage.version }}</td></tr>{% endif %}
                <tr><td class="label">Created:</td><td>{{ TitlePage.created }}</td></tr>
                <tr><td class="label">Modified:</td><td>{{ TitlePage.modified }}</td></tr>
            </table>
            {{ TitlePage.description }}
            {{ TitlePage.properties }}
            <div class="search">
                <input type="text" id="search-input" placeholder="Search&hellip;" autocomplete="off" spellcheck="false"/>
                <span class="search-clear" id="search-clear" title="clear search">&#x00D7;</span>
            </div>
        </div>
    `,

    /*  <Toc/>  */
    "Toc": textframe`
        <nav class="toc">
            <h1>Table of Contents</h1>
            <table>
                {% for entry in Toc.entries %}
                <tr><td><a href="#{{ entry.id }}"><span class="object-kind">{{ entry.kind }}:</span> {{ entry.name }} <span class="link-symbol">&#x26AD;</span></a></td>{% if entry.page %}<td class="page"><a href="#{{ entry.id }}">{{ entry.page }}</a></td>{% endif %}</tr>
                {% endfor %}
            </table>
        </nav>
    `,

    /*  <Doc/>  */
    "Doc": textframe`
        <nav class="doc">
            <h1>Diagram of Contents</h1>
            <div class="diagram">{{ Doc.diagram }}</div>
        </nav>
    `,

    /*  <Artifact/>  */
    "Artifact": textframe`
        <article>
            {{ Artifact.objects }}
        </article>
    `,

    /*  <Object/>  */
    "Object": textframe`
        <section>
            <h{{ Object.level }} id="{{ Object.id }}"><span class="object-kind">{{ Object.kind }}:</span> {{ Object.name }}{% if Object.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if Object.paren %} <span class="anchor-paren">({{ Object.paren }})</span>{% endif %} <a href="#{{ Object.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></h{{ Object.level }}>
            {{ Object.diagram }}
            {{ Object.properties }}
            {{ Object.description }}
            {{ Object.childs }}
        </section>
    `,

    /*  <Properties/>  */
    "Properties": textframe`
        <table class="props">
            {% for property in Properties %}
            <tr><td class="key property-name">{{ property.key }}</td><td>{{ property.value }}</td></tr>
            {% endfor %}
        </table>
    `,

    /*  <Description/>  */
    "Description": textframe`
        {%- if Description.block %}
        <div class="description">{{ Description.description }}{% if Description.rationale %}
            <p class="rationale">&mdash; <span class="keyword">BECAUSE</span> {{ Description.rationale }}</p>{% endif %}</div>
        {%- elif Description.description or Description.rationale %}
        <p class="description">{{ Description.description }}{% if Description.rationale %}
            <span class="rationale">&mdash; <span class="keyword">BECAUSE</span> {{ Description.rationale }}</span>{% endif %}</p>
        {%- endif %}
        {%- for embedding in Description.embeddings %}
        <div class="embedding">{{ embedding }}</div>
        {%- endfor %}
    `,

    /*  <Table/>  */
    "Table": textframe`
        <table class="objects">
            <thead>
                <tr>
                    <th class="object-kind">{{ Table.head }}</th>
                    {%- for key in Table.keys %}<th class="property-name">{{ key }}</th>{% endfor %}
                    {%- if Table.desc %}<th class="description" style="width: {{ Table.width }}%">Description</th>{% endif %}
                </tr>
            </thead>
            <tbody>
                {% for row in Table.rows %}
                <tr id="{{ row.id }}">
                    <td>{{ row.name }}{% if row.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    {%- for value in row.values %}<td>{{ value }}</td>{% endfor %}
                    {%- if Table.desc %}<td>{{ row.description }}</td>{% endif %}
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `,

    /*  <TableChunked/>  */
    "TableChunked": textframe`
        <table class="objects">
            <thead>
                <tr>
                    <th class="object-kind" style="width: {{ Table.width }}%">{{ Table.head }}</th>
                    <th class="description">Properties</th>
                </tr>
            </thead>
            <tbody>
                {% for row in Table.rows %}
                <tr id="{{ row.id }}">
                    <td>{{ row.name }}{% if row.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    <td class="chunks">
                        <table class="chunks">
                            {% for chunk in row.chunks %}
                            <tr>{% for cell in chunk %}<th{% if not cell.desc %} class="property-name"{% endif %}{% if cell.span > 1 %} colspan="{{ cell.span }}"{% endif %}>{{ cell.key }}</th>{% endfor %}</tr>
                            <tr>{% for cell in chunk %}<td{% if cell.span > 1 %} colspan="{{ cell.span }}"{% endif %}>{{ cell.value }}</td>{% endfor %}</tr>
                            {% endfor %}
                        </table>
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `
}

/*  the client-side script of the live preview: it connects back to the
    own page over WebSocket (the URL scheme "http"/"https" replaced with
    "ws"/"wss"), re-connects every second after a lost connection, and
    updates the page on a received "RELOAD" command as well as on every
    re-established connection (as the server was restarted meanwhile).
    The update fetches the fresh page and replaces the document in place
    -- instead of reloading the page -- so the scroll position and the
    theme choice survive: the title, the stylesheet (if changed), and
    the body are swapped, and the scripts of the fresh body re-executed
    through clones (as parsed scripts never execute), except this
    realtime script itself, whose connection stays alive. The status
    icon (re-created by every body swap) reflects the connection state
    and blinks for 2s after every update, unless the connection is
    lost meanwhile  */
const realtimeScript = textframe`
    (function () {
        const url = window.location.protocol.replace(/^http/, "ws") + "//" +
            window.location.host + window.location.pathname
        const status = (state) => {
            const icon = document.querySelector("div.realtime-status")
            if (icon !== null)
                icon.className = "realtime-status " + state
        }
        let blink = 0
        const update = async () => {
            const response = await fetch(window.location.pathname, { cache: "no-store" })
            if (!response.ok)
                return
            const doc = new DOMParser().parseFromString(await response.text(), "text/html")
            const x = window.scrollX
            const y = window.scrollY
            document.title = doc.title
            const style = document.head.querySelector("style")
            const fresh = doc.head.querySelector("style")
            if (style !== null && fresh !== null && style.textContent !== fresh.textContent)
                style.replaceWith(fresh)
            document.body.replaceWith(doc.body)
            for (const script of document.body.querySelectorAll("script:not(.realtime)")) {
                const clone = document.createElement("script")
                clone.textContent = script.textContent
                script.replaceWith(clone)
            }
            window.scrollTo(x, y)
            status("reloaded")
            clearTimeout(blink)
            blink = setTimeout(() => { status("connected") }, 2000)
        }
        let lost = false
        const connect = () => {
            const ws = new WebSocket(url)
            ws.onopen = () => {
                status("connected")
                if (lost) {
                    console.log("specbook: live preview connection re-established")
                    lost = false
                    update()
                }
            }
            ws.onmessage = (event) => {
                if (event.data === "RELOAD")
                    update()
            }
            ws.onclose = () => {
                clearTimeout(blink)
                status("disconnected")
                if (!lost)
                    console.log("specbook: live preview connection lost")
                lost = true
                setTimeout(connect, 1000)
            }
        }
        connect()
    })()
`

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

/*  the Nunjucks environment with the @rse/nunjucks-addons extensions  */
const env = new nunjucks.Environment(null, { autoescape: true })
nunjucksAddons(env)

/*  mark pre-rendered HTML as safe for template interpolation  */
const safe = (html: string) =>
    new nunjucks.runtime.SafeString(html)

/*  render one of the built-in Nunjucks templates with a context  */
const render = (name: keyof typeof templates, context: object): string =>
    env.renderString(templates[name], context)

/*  the active per-document reference expander, fully-qualified
    anchor paths, enum/tags property value kinds, object schema nodes,
    and pre-rendered diagram SVGs (all set during HTML rendering)  */
let linker:   ((text: string) => string) | null    = null
let anchors:  Map<SpecObject, string> | null       = null
let members:  Map<string, "enum" | "tags"> | null  = null
let schemas:  Map<SpecObject, SchemaObject> | null = null
let diagrams: Map<SpecObject, string> | null       = null

/*  the cache of the pre-rendered diagram SVGs, keyed by specification,
    as the PDF export renders the very same document multiple times  */
const diagramCache = new WeakMap<Spec,
    { config: Schema, diagrams: Map<SpecObject, string> }>()

/*  determine the fully-qualified anchor path of an object  */
const anchorOf = (object: SpecObject): string =>
    anchors?.get(object) ?? object.id

/*  expand the inline Markdown of a text (code spans, emphasis, etc.),
    with Wiki-style references expanded upfront  */
const inline = (text: string) =>
    safe(marked.parseInline(linker !== null ? linker(text) : text, { async: false }))

/*  expand the full Markdown of a text, keeping its block-level
    constructs (lists, quotes, code blocks, tables) intact  */
const block = (text: string) =>
    safe(marked.parse(linker !== null ? linker(text) : text, { async: false }))

/*  check whether a text carries any block-level Markdown, i.e. is
    anything other than the single paragraph a description usually is  */
const isBlock = (text: string): boolean => {
    const tokens = marked.lexer(text).filter((token) => token.type !== "space")
    return tokens.length > 0 && !(tokens.length === 1 && tokens[0].type === "paragraph")
}

/*  render a single embedded image file onto an <img> tag with a
    self-contained data: URL (converting the SVG text into one, as an
    SVG inlined as-is would leak its document-global <style> rules
    into all other inlined SVGs sharing the same class names)  */
const renderImage = (content: string, alt: string): string => {
    const url = content.startsWith("data:") ? content :
        `data:image/svg+xml;base64,${Buffer.from(content, "utf8").toString("base64")}`
    return `<img src="${url}" alt="${escapeHtml(alt)}"/>`
}

/*  wrap the theme variants of an image into their layout-neutral theme
    containers, of which the stylesheet shows just the one matching the
    color theme currently active in the document  */
const renderThemed = (images: string[]): string =>
    images.map((image, i) =>
        `<span class="theme-${embeddingThemes[i]}-only">${image}</span>`).join("")

/*  render the embedded image files of a text into HTML, taking the image
    alternate texts from the corresponding "![alt](file)" markups and
    pairing up the consecutive theme variants of a "{theme}" markup
    (the empty entries of unreadable files are skipped)  */
const renderEmbeddings = (text: string, embedding: string[]): string[] => {
    const result = new Array<string>()
    let i = 0
    for (const m of text.matchAll(embeddingRegex)) {
        const reference = m[2].trim()
        if (embeddingMimeType(reference) === undefined)
            continue
        const variants = embeddingVariants(reference)
        const contents = embedding.slice(i, i + variants.length)
        const images   = contents.filter((content) => content !== "")
            .map((content) => renderImage(content, m[1].trim()))
        i += variants.length
        if (variants.length > 1 && images.length === variants.length)
            result.push(renderThemed(images))
        else
            result.push(...images)
    }
    return result
}

/*  the image embedding markup including the horizontal whitespace
    before it, so that its removal leaves no double space behind  */
const embeddingMarkup = new RegExp(`[ \\t]*${embeddingRegex.source}`, "g")

/*  render a description into HTML, expanding its inline Markdown and
    moving the file embeddings to the end of the description  */
const renderDescription = (description: SpecDescription): string => {
    const text = description.description
        .replace(embeddingMarkup, (markup, _alt, reference: string) =>
            embeddingMimeType(reference.trim()) !== undefined ? "" : markup)
        .trim()
    const embeddings = renderEmbeddings(description.description,
        description.embedding ?? []).map((content) => safe(content))
    const blocked = isBlock(text)
    return render("Description", { Description: {
        block:       blocked,
        description: text !== "" ? (blocked ? block(text) : inline(text)) : "",
        rationale:   description.rationale !== undefined ?
            inline(description.rationale) : undefined,
        embeddings
    } })
}

/*  collect the "enum(...)"/"tags(...)" constrained properties of the
    schema configuration, keyed by object kind and property name  */
const collectMembers = (nodes: SchemaObject[], result: Map<string, "enum" | "tags">) => {
    for (const schema of nodes) {
        for (const property of schema.props ?? []) {
            if (property.value === undefined)
                continue
            try {
                const expr = compileValueExpr(property.value)
                if (expr.kind === "enum" || expr.kind === "tags")
                    result.set(`${schema.kind} ${property.name}`, expr.kind)
            }
            catch {
                /*  an invalid expression is the concern of lint  */
            }
        }
        collectMembers(schema.childs ?? [], result)
    }
    return result
}

/*  render a property value, badging the individual members of an
    "enum(...)" (a single member) or "tags(...)" (a member set) value
    and moving its image embeddings behind the value, rendered from the
    embedded image contents (as for a description), not from the markup  */
const inlineValue = (kind: string, { key, value, embedding }: SpecProperty) => {
    const member = members?.get(`${kind} ${key}`)
    const text = value
        .replace(embeddingMarkup, (markup, _alt, reference: string) =>
            embeddingMimeType(reference.trim()) !== undefined ? "" : markup)
        .trim()
    const embeddings = renderEmbeddings(value, embedding ?? [])
        .map((content) => `<div class="embedding">${content}</div>`).join("")
    if (member === undefined || text === "")
        return safe(`${inline(text)}${embeddings}`)
    const items = member === "tags" ?
        splitItems(text).filter((item) => item !== "") : [ text ]
    return safe(items.map((item) =>
        `<span class="value-member">${inline(item)}</span>`).join(" ") + embeddings)
}

/*  expand the inline Markdown of the property values  */
const inlineProperties = (kind: string, properties: SpecProperty[]) =>
    properties.map((property) => ({ key: property.key,
        value: inlineValue(kind, property) }))

/*  resolve the format configuration of an object  */
const formatOf = (object: SpecObject): SchemaFormat | undefined =>
    schemas?.get(object)?.format

/*  determine the maximum table columns configured on an object (at
    least two, as a single column cannot carry a name and a value)  */
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
const tableShape = (childs: SpecObject[]) => {
    const used   = [ ...new Set(childs.flatMap((child) =>
        child.properties.map((property) => property.key))) ]
    const schema = schemas?.get(childs[0])
    const names  = (schema?.props ?? []).map((prop) => prop.name)
    const known  = schema?.format?.withUnusedProps === true ?
        names : names.filter((name) => used.includes(name))
    const keys   = [ ...known, ...used.filter((key) => !names.includes(key)) ]
    return { keys, desc: childs.some((child) =>
        child.description !== undefined || child.childs.length > 0) }
}

/*  provide the childs of an object taking part in the regular document
    flow: a nested title object leaves the flow, as it is rendered as the
    title page instead (a top-level one instead removes its whole artifact)  */
const flowChilds = (object: SpecObject): SpecObject[] =>
    object.childs.filter((child) => !isTitleObject(child))

/*  decide whether the childs of an object collapse into the concise
    (tabular) rendering: an explicit "format" type wins, "auto" collapses
    the deepest level only, and inside an already concise rendering
    context "auto" childs implicitly stay concise, too  */
const conciseChilds = (object: SpecObject, schemaMap: Map<SpecObject, SchemaObject> | null,
    concise: boolean): boolean => {
    const childs = flowChilds(object)
    if (childs.length === 0)
        return false
    const type = schemaMap?.get(object)?.format?.type ?? "auto"
    if (type !== "auto")
        return type === "concise"
    return concise || childs.every((child) => child.childs.length === 0)
}

/*  group the childs of an object by their kind, preserving order  */
const groupChilds = (childs: SpecObject[]): SpecObject[][] => {
    const groups = new Map<string, SpecObject[]>()
    for (const child of childs) {
        const group = groups.get(child.kind)
        if (group === undefined)
            groups.set(child.kind, [ child ])
        else
            group.push(child)
    }
    return [ ...groups.values() ]
}

/*  render the description cell of a table row: the description of the
    object followed by its recursively rendered childs (implicitly or
    explicitly concise childs as nested sub-tables, explicitly complex
    ones as regular nested object renderings pressed into the cell)  */
const renderCell = (child: SpecObject): string => {
    let html = child.description !== undefined ? renderDescription(child.description) : ""
    const childs = flowChilds(child)
    if (childs.length > 0)
        html += conciseChilds(child, schemas, true) ?
            groupChilds(childs).map((group) => renderTable(group, maxColumnsOf(child))).join("") :
            childs.map((sub) => renderObject(sub, 6, true)).join("")
    return html
}

/*  render a single-kind group of childs into one compact table:
    the name first, then the property columns, then the description;
    a group wider than maxColumns instead chunks the property and
    description cells of every object into an embedded per-object table  */
const renderTable = (childs: SpecObject[], maxColumns: number): string => {
    const { keys, desc } = tableShape(childs)
    if (1 + keys.length + (desc ? 1 : 0) <= maxColumns)
        return render("Table", { Table: {
            head: childs[0].kind !== "" ? childs[0].kind : "Name",
            keys,
            desc,

            /*  under the fixed table layout the description column claims
                twice the share of a regular column, compressing the others  */
            width: Math.round(200 / (keys.length + 3)),
            rows: childs.map((child) => ({
                id:          anchorOf(child),
                paren:       child.paren,
                primary:     child.primary,
                name:        inline(child.name),
                values:      keys.map((key) => {
                    const property = child.properties.find((property) => property.key === key)
                    return property !== undefined ? inlineValue(child.kind, property) : ""
                }),
                description: safe(renderCell(child))
            }))
        } })

    /*  the embedded rows hold at most maxColumns - 1 cells (of the
        group-wide union of property keys, plus the trailing description),
        with the last cell spanning the leftover columns of the final row  */
    const size = Math.max(1, maxColumns - 1)
    return render("TableChunked", { Table: {
        head:  childs[0].kind !== "" ? childs[0].kind : "Name",
        width: Math.round(100 / maxColumns),
        rows:  childs.map((child) => {
            const cells = keys.map((key) => {
                const property = child.properties.find((property) => property.key === key)
                return { key, desc: false, span: 1,
                    value: property !== undefined ? inlineValue(child.kind, property) : "" }
            })
            if (desc)
                cells.push({ key: "Description", desc: true, span: 1,
                    value: safe(renderCell(child)) })
            const chunks = new Array<typeof cells>()
            for (let i = 0; i < cells.length; i += size)
                chunks.push(cells.slice(i, i + size))
            const last = chunks[chunks.length - 1]
            last[last.length - 1].span = size - last.length + 1
            return {
                id:      anchorOf(child),
                paren:   child.paren,
                primary: child.primary,
                name:    inline(child.name),
                chunks
            }
        })
    } })
}

/*  recursively render an object into HTML  */
const renderObject = (object: SpecObject, level: number, concise: boolean): string => {
    const properties = effectiveProperties(object)
    const diagram    = diagrams?.get(object)
    return render("Object", { Object: {
        level:       Math.min(level, 6),
        kind:        object.kind,
        id:          anchorOf(object),
        paren:       object.paren,
        primary:     object.primary,
        name:        inline(object.name),
        diagram:     diagram !== undefined ? safe(`<div class="diagram">${diagram}</div>`) : "",
        properties:  properties.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object.kind, properties) })) : "",
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        childs:      conciseChilds(object, schemas, concise) ?
            safe(groupChilds(flowChilds(object)).map((group) => renderTable(group, maxColumnsOf(object))).join("")) :
            safe(flowChilds(object).map((child) => renderObject(child, level + 1, concise)).join(""))
    } })
}

/*  format a timestamp as its calendar date in local time (the
    frontmatter timestamps are parsed in local time, too, so the UTC
    date of toISOString() could shift the day)  */
const formatDate = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-` +
    String(date.getDate()).padStart(2, "0")

/*  render the title object into a title page  */
const renderTitlePage = (object: SpecObject, created: string, modified: string): string => {
    const prop = (name: string) =>
        object.properties.find((property) => property.key === name)?.value
    const inlineProp = (name: string) => {
        const value = prop(name)
        return value !== undefined ? inline(value) : ""
    }
    const rest = object.properties.filter((property) =>
        ![ "LOGO", "TITLE", "SUBTITLE", "AUTHOR", "VERSION",
            "LANG", "CHARSET", "PAPER-SIZE", "THEME-STYLE", "THEME-TONE" ].includes(property.key))

    /*  the logo is rendered above the title, from the embedded image content
        of the LOGO property or, for a non-embeddable reference, as its inline
        Markdown; without a LOGO property the built-in SpecBook logo is used,
        in both its theme variants  */
    const logo  = object.properties.find((property) => property.key === "LOGO")
    const image = logo !== undefined ? renderEmbeddings(logo.value, logo.embedding ?? []) : []
    return render("TitlePage", { TitlePage: {
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
            safe(render("Properties", { Properties: inlineProperties(object.kind, rest) })) : "",
        created, modified
    } })
}

/*  render an artifact into HTML  */
const renderArtifact = (artifact: SpecArtifact): string =>
    render("Artifact", { Artifact: {
        objects: safe(artifact.objects.map((object) => renderObject(object, 1, false)).join(""))
    } })

/*  ==== Outline ====  */

/*  an entry of the hierarchical document outline  */
export type OutlineEntry = { title: string, anchor: string, childs: OutlineEntry[] }

/*  derive the hierarchy of the rendered object headings, skipping the
    title page object and the childs collapsing into compact tables  */
export const htmlOutline = (specification: Spec,
    config?: Schema): OutlineEntry[] => {
    const paths     = anchorPaths(buildLinkIndex(specification))
    const schemaMap = config !== undefined ? collectSchemas(specification, config) : null
    const entry = (object: SpecObject): OutlineEntry => ({
        title:  (object.kind !== "" ? `${object.kind}: ` : "") + plainText(object.name),
        anchor: paths.get(object) ?? object.id,
        childs: conciseChilds(object, schemaMap, false) ? [] : flowChilds(object).map(entry)
    })
    return specification.artifacts
        .filter((artifact) => !artifact.objects.some(isTitleObject))
        .flatMap((artifact) => artifact.objects)
        .map(entry)
}

/*  determine the object a title page is rendered from: the title object
    has to carry a non-empty "TITLE" property, as without it there is
    nothing to render a title page from (the object stays suppressed in
    the regular flow nevertheless)  */
const titlePageObject = (specification: Spec): SpecObject | undefined => {
    const object = titleObject(specification)
    const title  = object?.properties.find((property) => property.key === "TITLE")
    return title !== undefined && title.value.trim() !== "" ? object : undefined
}

/*  render the entire specification into a self-contained HTML document,
    with the build-time pre-assembled stylesheet embedded inline, the
    artifact timestamps aggregated into min(Created)/max(Modified),
    optional per-anchor page numbers attached to the ToC entries, and
    optionally the client-side script of the live preview injected  */
export const renderHtml = async (specification: Spec, config?: Schema,
    tocPages?: Map<string, number>, css?: string, realtime = false): Promise<string> => {
    /*  pre-render the configured diagrams as embeddable SVGs (a runtime
        rendering failure omits the diagram, as the statically detectable
        invalid situations are already reported as lint diagnostics),
        displayed at a reduced coordinate scale, as the Gradia geometry
        (node boxes, font sizes) is dimensioned for a stand-alone
        canvas and would dwarf the document text at 1:1  */
    const scale  = 0.75
    const cached = diagramCache.get(specification)
    let rendered: Map<SpecObject, string> | null = null
    if (cached !== undefined && cached.config === config)
        rendered = cached.diagrams
    else if (config !== undefined) {
        rendered = new Map<SpecObject, string>()
        for (const [ object, result ] of specDiagrams(specification, config)) {
            if (result.spec === undefined)
                continue
            try {
                const svg = await Gradia.render(result.spec,
                    { format: "svg:embedded", config: result.config })
                rendered.set(object, svg.replace(/(<svg[^>]*) width="([0-9.]+)" height="([0-9.]+)"/,
                    (_, head: string, w: string, h: string) =>
                        `${head} width="${Number(w) * scale}" height="${Number(h) * scale}"`))
            }
            catch {
                /*  intentionally omitted  */
            }
        }
        diagramCache.set(specification, { config, diagrams: rendered })
    }

    /*  the document language selects the smart typography quote style  */
    const lang = documentLang(specification)
    quotes = quoteStyles[lang?.toLowerCase().split(/[-_]/)[0] ?? "en"] ?? quoteStyles.en

    /*  expand "[[xxx]]" references into hyperlinks (an unresolvable or
        ambiguous reference stays literal, marked as broken), targeting
        the fully-qualified anchor paths of the objects  */
    const index = buildLinkIndex(specification)
    anchors  = anchorPaths(index)
    members  = config !== undefined ? collectMembers(config, new Map()) : null
    schemas  = config !== undefined ? collectSchemas(specification, config) : null
    diagrams = rendered
    linker   = (text) => expandReferences(text, (reference) => {
        const target = resolveUnique(index, reference).target
        if (target === undefined)
            return `<span class="link-broken">[[${escapeHtml(reference)}]]</span>`
        return `<a href="#${escapeHtml(anchorOf(target))}">` +
            `<span class="object-kind">${escapeHtml(target.kind)}:</span> <strong>${target.name}</strong>` +
            " <span class=\"link-symbol\">&#x26AD;</span></a>"
    })
    const created  = new Date(Math.min(
        ...specification.artifacts.map((artifact) => artifact.created.getTime())))
    const modified = new Date(Math.max(
        ...specification.artifacts.map((artifact) => artifact.modified.getTime())))

    /*  a "META: Title" object becomes the title page and leaves the regular
        flow, while its diagram becomes the "Diagram of Contents" page  */
    const title     = titlePageObject(specification)
    const artifacts = specification.artifacts
        .filter((artifact) => !artifact.objects.some(isTitleObject))
    const meta      = titleObject(specification)
    const doc       = meta !== undefined ? rendered?.get(meta) : undefined
    try {
        const entries = artifacts.flatMap((artifact) => artifact.objects)
            .map((object) => ({ id: anchorOf(object), kind: object.kind, name: inline(object.name),
                page: tocPages?.get(anchorOf(object)) }))
        return render("Document", { Document: {
            title:     documentTitle(specification).title,
            lang,
            theme:     documentThemeStyle(specification)?.toLowerCase(),
            css:       safe(css ?? stylesheet()),
            titlepage: title !== undefined ?
                safe(renderTitlePage(title,
                    formatDate(created), formatDate(modified))) : "",
            search:    title !== undefined ? safe(searchScript()) : "",
            realtime:  realtime ? safe(realtimeScript) : "",
            toc:       entries.length > 0 ? safe(render("Toc", { Toc: { entries } })) : "",
            doc:       doc !== undefined ? safe(render("Doc", { Doc: { diagram: safe(doc) } })) : "",
            artifacts: safe(artifacts.map((artifact) => renderArtifact(artifact)).join(""))
        } })
    }
    finally {
        /*  release the per-document state (also on a rendering failure),
            as it would otherwise retain the specification (and its
            embedded images) until the next rendering  */
        linker   = null
        anchors  = null
        members  = null
        schemas  = null
        diagrams = null
    }
}
