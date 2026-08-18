/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { marked }            from "marked"
import { markedSmartypants } from "marked-smartypants"
import nunjucks              from "nunjucks"
import nunjucksAddons        from "@rse/nunjucks-addons"
import textframe             from "textframe"

import type { Specification, Artifact, Object as SpecObject, Property, Description }
    from "./specbook-struct-spec.js"
import type { SchemaSpecification, SchemaObject }
    from "./specbook-struct-schema.js"
import { buildLinkIndex, resolveUnique, expandReferences, anchorPaths }
    from "./specbook-link.js"
import { compileValueExpr, splitItems }
    from "./specbook-parse-value.js"
import { embeddingRegex, embeddingMimeType }
    from "./specbook-parse-common.js"
import { escapeHtml, stylesheet, searchScript, fallbackLogo, isTitleObject, documentTitle, documentLang, documentThemeStyle }
    from "./specbook-export-common.js"

/*  ==== Templates ====  */

/*  the built-in Nunjucks templates for the HTML export  */
const templates: { [ name: string ]: string } = {
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
                        try { style = localStorage.getItem("specbook-theme") } catch (ex) {}
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
                        try { localStorage.setItem("specbook-theme", style) } catch (ex) {}
                    }
                </script>
            </head>
            <body>
                <div class="theme-switch" onclick="themeSwitch()" title="switch color theme">&#x25D0;</div>
                {{ Document.titlepage }}
                {% if not Document.titlepage %}<div class="meta">created: {{ Document.created }}, modified: {{ Document.modified }}</div>{% endif %}
                {{ Document.toc }}
                {{ Document.artifacts }}
                {% if Document.search %}<script>{{ Document.search }}</script>{% endif %}
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
        {%- else %}
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
    `
}

/*  ==== Rendering ====  */

/*  the per-language double quote styles for the smart typography
    (single quotes stay curly, as smartypants cannot distinguish a
    closing single quote from an apostrophe)  */
const quoteStyles: { [ lang: string ]: [ string, string ] } = {
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

/*  the Nunjucks environment with the @rse/nunjucks-addons extensions  */
const env = new nunjucks.Environment(null, { autoescape: true })
nunjucksAddons(env)

/*  mark pre-rendered HTML as safe for template interpolation  */
const safe = (html: string) =>
    new nunjucks.runtime.SafeString(html)

const render = (name: string, context: object): string =>
    env.renderString(templates[name], context)

/*  the active per-document reference expander, fully-qualified
    anchor paths, and enum/tags property value kinds
    (all set during HTML rendering)  */
let linker: ((text: string) => string) | null = null
let anchors: Map<SpecObject, string> | null  = null
let members: Map<string, "enum" | "tags"> | null = null

/*  determine the fully-qualified anchor path of an object  */
const anchorOf = (object: SpecObject): string =>
    anchors?.get(object) ?? object.id

/*  expand the inline Markdown of a text (code spans, emphasis, etc.),
    with Wiki-style references expanded upfront  */
const inline = (text: string) =>
    safe(marked.parseInline(linker !== null ? linker(text) : text) as string)

/*  expand the full Markdown of a text, keeping its block-level
    constructs (lists, quotes, code blocks, tables) intact  */
const block = (text: string) =>
    safe(marked.parse(linker !== null ? linker(text) : text) as string)

/*  check whether a text carries any block-level Markdown, i.e. is
    anything else than the single paragraph a description usually is  */
const isBlock = (text: string): boolean => {
    const tokens = marked.lexer(text).filter((token) => token.type !== "space")
    return tokens.length > 0 && !(tokens.length === 1 && tokens[0].type === "paragraph")
}

/*  render the embedded image files of a text into HTML (SVG inlined
    as-is, PNG/JPEG placed onto <img> tags), taking the image alternate
    texts from the corresponding "![alt](file)" markups  */
const renderEmbeddings = (text: string, embedding: string[]): string[] => {
    const alts = [ ...text.matchAll(embeddingRegex) ]
        .filter((m) => embeddingMimeType(m[2].trim()) !== undefined)
        .map((m) => m[1].trim())
    return embedding.map((content, i) =>
        content.startsWith("data:") ?
            `<img src="${content}" alt="${escapeHtml(alts[i] ?? "")}"/>` :
            content.replace(/^\s*<\?xml[^>]*\?>\s*(?:<!DOCTYPE[^>]*>\s*)?/i, ""))
}

/*  render a description into HTML, expanding its inline Markdown and
    moving the file embeddings to the end of the description  */
const renderDescription = (description: Description): string => {
    const text = description.description
        .replace(embeddingRegex, (markup, _alt, reference: string) =>
            embeddingMimeType(reference.trim()) !== undefined ? "" : markup)
        .replace(/(?<=\S)[ \t]{2,}/g, " ").trim()
    const embeddings = renderEmbeddings(description.description,
        description.embedding ?? []).map((content) => safe(content))
    const blocked = isBlock(text)
    return render("Description", { Description: {
        block:       blocked,
        description: blocked ? block(text) : inline(text),
        rationale:   description.rationale !== undefined ?
            inline(description.rationale) : undefined,
        embeddings
    } })
}

/*  collect the "enum(...)"/"tags(...)" constrained properties of the
    schema configuration, keyed by object kind and property name  */
const collectMembers = (schemas: SchemaObject[], result: Map<string, "enum" | "tags">) => {
    for (const schema of schemas) {
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
    "enum(...)" (a single member) or "tags(...)" (a member set) value  */
const inlineValue = (kind: string, key: string, value: string) => {
    const member = members?.get(`${kind} ${key.replace(/\s*\([^)]*\)\s*$/, "").trim()}`)
    if (member === undefined)
        return inline(value)
    const items = member === "tags" ? splitItems(value) : [ value.trim() ]
    return safe(items.map((item) =>
        `<span class="value-member">${inline(item)}</span>`).join(" "))
}

/*  expand the inline Markdown of the property values  */
const inlineProperties = (kind: string, properties: Property[]) =>
    properties.map((property) => ({ key: property.key,
        value: inlineValue(kind, property.key, property.value) }))

/*  determine the column shape of a potential compact table  */
const tableShape = (childs: SpecObject[]) => {
    const keys = new Array<string>()
    for (const child of childs)
        for (const property of child.properties)
            if (!keys.includes(property.key))
                keys.push(property.key)
    return { keys, desc: childs.some((child) => child.description !== undefined) }
}

/*  check whether the childs of an object form the deepest level and every
    per-kind group is compact enough (at most maxColumns name/property/
    description columns) for a tabular rendering  */
const tabularChilds = (object: SpecObject, maxColumns: number): boolean => {
    if (object.childs.length === 0
        || !object.childs.every((child) => child.childs.length === 0))
        return false
    return groupChilds(object.childs).every((group) => {
        const { keys, desc } = tableShape(group)
        return 1 + keys.length + (desc ? 1 : 0) <= maxColumns
    })
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

/*  render a single-kind group of leaf childs into one compact table:
    the name first, then the property columns, then the description  */
const renderTable = (childs: SpecObject[]): string => {
    const { keys, desc } = tableShape(childs)
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
                const value = child.properties.find((property) => property.key === key)?.value
                return value !== undefined ? inlineValue(child.kind, key, value) : ""
            }),
            description: child.description !== undefined ?
                safe(renderDescription(child.description)) : ""
        }))
    } })
}

/*  recursively render an object into HTML  */
const renderObject = (object: SpecObject, level: number, maxColumns: number): string =>
    render("Object", { Object: {
        level:       Math.min(level, 6),
        kind:        object.kind,
        id:          anchorOf(object),
        paren:       object.paren,
        primary:     object.primary,
        name:        inline(object.name),
        properties:  object.properties.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object.kind, object.properties) })) : "",
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        childs:      tabularChilds(object, maxColumns) ?
            safe(groupChilds(object.childs).map(renderTable).join("")) :
            safe(object.childs.map((child) => renderObject(child, level + 1, maxColumns)).join(""))
    } })

/*  render the title object into a title page  */
const renderTitlePage = (object: SpecObject, created: string, modified: string): string => {
    const prop = (name: string) =>
        object.properties.find((property) => property.key === name)?.value
    const rest = object.properties.filter((property) =>
        ![ "LOGO", "TITLE", "SUBTITLE", "AUTHOR", "VERSION",
            "LANG", "CHARSET", "THEME-STYLE", "THEME-TONE" ].includes(property.key))

    /*  the logo is rendered above the title, from the embedded image content
        of the LOGO property or, for a non-embeddable reference, as its inline
        Markdown; without a LOGO property the built-in SpecBook logo is used  */
    const logo  = object.properties.find((property) => property.key === "LOGO")
    const image = logo !== undefined ? renderEmbeddings(logo.value, logo.embedding ?? []) : []
    return render("TitlePage", { TitlePage: {
        logo:        logo === undefined ? safe(`<img src="${fallbackLogo()}" alt="SpecBook"/>`) :
            (image.length > 0 ? safe(image.join("")) : inline(logo.value)),
        title:       inline(prop("TITLE") ?? object.name),
        subtitle:    prop("SUBTITLE") !== undefined ? inline(prop("SUBTITLE") ?? "") : "",
        author:      prop("AUTHOR")   !== undefined ? inline(prop("AUTHOR")   ?? "") : "",
        version:     prop("VERSION")  !== undefined ? inline(prop("VERSION")  ?? "") : "",
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        properties:  rest.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object.kind, rest) })) : "",
        created, modified
    } })
}

/*  render an artifact into HTML  */
const renderArtifact = (artifact: Artifact, maxColumns: number): string =>
    render("Artifact", { Artifact: {
        objects:  safe(artifact.objects.map((object) => renderObject(object, 1, maxColumns)).join(""))
    } })

/*  render the entire specification into a self-contained HTML document,
    with the build-time pre-assembled stylesheet embedded inline, the
    artifact timestamps aggregated into min(Created)/max(Modified), and
    optional per-anchor page numbers attached to the ToC entries  */
export const renderHtml = (specification: Specification, maxColumns: number,
    config?: SchemaSpecification, tocPages?: Map<string, number>, css?: string): string => {
    /*  the document language selects the smart typography quote style  */
    const lang = documentLang(specification)
    quotes = quoteStyles[lang?.toLowerCase().split(/[-_]/)[0] ?? "en"] ?? quoteStyles.en

    /*  expand "[[xxx]]" references into hyperlinks (an unresolvable or
        ambiguous reference stays literal, marked as broken), targeting
        the fully-qualified anchor paths of the objects  */
    const index = buildLinkIndex(specification)
    anchors = anchorPaths(index)
    members = config !== undefined ? collectMembers(config, new Map()) : null
    linker  = (text) => expandReferences(text, (reference) => {
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

    /*  a "META: Title" object becomes the title page and leaves the regular flow  */
    const title     = specification.artifacts
        .flatMap((artifact) => artifact.objects).find(isTitleObject)
    const artifacts = specification.artifacts
        .filter((artifact) => !artifact.objects.some(isTitleObject))
    const entries = artifacts.flatMap((artifact) => artifact.objects)
        .map((object) => ({ id: anchorOf(object), kind: object.kind, name: inline(object.name),
            page: tocPages?.get(anchorOf(object)) }))
    return render("Document", { Document: {
        title:     documentTitle(specification).title,
        lang,
        theme:     documentThemeStyle(specification)?.toLowerCase(),
        css:       safe(css ?? stylesheet()),
        created:   created.toISOString(),
        modified:  modified.toISOString(),
        titlepage: title !== undefined ?
            safe(renderTitlePage(title,
                created.toISOString().slice(0, 10),
                modified.toISOString().slice(0, 10))) : "",
        search:    title !== undefined ? safe(searchScript()) : "",
        toc:       entries.length > 0 ? safe(render("Toc", { Toc: { entries } })) : "",
        artifacts: safe(artifacts.map((artifact) => renderArtifact(artifact, maxColumns)).join(""))
    } })
}
