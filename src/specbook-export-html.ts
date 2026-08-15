/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { marked }        from "marked"
import nunjucks          from "nunjucks"
import nunjucksAddons    from "@rse/nunjucks-addons"
import textframe         from "textframe"

import type { Specification, Artifact, Object as SpecObject, Property, Description }
    from "./specbook-struct-spec.js"
import { buildLinkIndex, resolveUnique, expandReferences, anchorPaths }
    from "./specbook-link.js"
import { embeddingRegex, embeddingMimeType }
    from "./specbook-parse-common.js"
import { escapeHtml, stylesheet, isTitleObject, documentTitle }
    from "./specbook-export-common.js"

/*  ==== Templates ====  */

/*  the built-in Nunjucks templates for the HTML export  */
const templates: { [ name: string ]: string } = {
    /*  <Document/>  */
    "Document": textframe`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8"/>
                <title>{{ Document.title }}</title>
                <style>
                    {{ Document.css }}
                </style>
            </head>
            <body>
                {{ Document.titlepage }}
                {% if not Document.titlepage %}<div class="meta">created: {{ Document.created }}, modified: {{ Document.modified }}</div>{% endif %}
                {{ Document.toc }}
                {{ Document.artifacts }}
            </body>
        </html>
    `,

    /*  <TitlePage/>  */
    "TitlePage": textframe`
        <div class="titlepage">
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
            <h{{ Object.level }} id="{{ Object.id }}"><span class="object-kind">{{ Object.kind }}:</span> {{ Object.name }}{% if Object.paren %} <span class="anchor-paren">({{ Object.paren }})</span>{% endif %} <a href="#{{ Object.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></h{{ Object.level }}>
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
        <p class="description">{{ Description.description }}{% if Description.rationale %}
            <span class="rationale">&mdash; <span class="keyword">BECAUSE</span> {{ Description.rationale }}</span>{% endif %}</p>
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
                    <td>{{ row.name }}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    {%- for value in row.values %}<td>{{ value }}</td>{% endfor %}
                    {%- if Table.desc %}<td>{{ row.description }}</td>{% endif %}
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `
}

/*  ==== Rendering ====  */

/*  the Nunjucks environment with the @rse/nunjucks-addons extensions  */
const env = new nunjucks.Environment(null, { autoescape: true })
nunjucksAddons(env)

/*  mark pre-rendered HTML as safe for template interpolation  */
const safe = (html: string) =>
    new nunjucks.runtime.SafeString(html)

const render = (name: string, context: object): string =>
    env.renderString(templates[name], context)

/*  the active per-document reference expander and fully-qualified
    anchor paths (both set during HTML rendering)  */
let linker: ((text: string) => string) | null = null
let anchors: Map<SpecObject, string> | null  = null

/*  determine the fully-qualified anchor path of an object  */
const anchorOf = (object: SpecObject): string =>
    anchors?.get(object) ?? object.id

/*  expand the inline Markdown of a text (code spans, emphasis, etc.),
    with Wiki-style references expanded upfront  */
const inline = (text: string) =>
    safe(marked.parseInline(linker !== null ? linker(text) : text) as string)

/*  render a description into HTML, expanding its inline Markdown and
    moving the file embeddings to the end of the description
    (SVG inlined as-is, PNG/JPEG placed onto <img> tags)  */
const renderDescription = (description: Description): string => {
    const alts = [ ...description.description.matchAll(embeddingRegex) ]
        .filter((m) => embeddingMimeType(m[2].trim()) !== undefined)
        .map((m) => m[1].trim())
    const text = description.description
        .replace(embeddingRegex, (markup, _alt, reference: string) =>
            embeddingMimeType(reference.trim()) !== undefined ? "" : markup)
        .replace(/[ \t]{2,}/g, " ").trim()
    const embeddings = (description.embedding ?? []).map((content, i) =>
        content.startsWith("data:") ?
            safe(`<img src="${content}" alt="${escapeHtml(alts[i] ?? "")}"/>`) :
            safe(content.replace(/^\s*<\?xml[^>]*\?>\s*(?:<!DOCTYPE[^>]*>\s*)?/i, "")))
    return render("Description", { Description: {
        description: inline(text),
        rationale:   description.rationale !== undefined ?
            inline(description.rationale) : undefined,
        embeddings
    } })
}

/*  expand the inline Markdown of the property values  */
const inlineProperties = (properties: Property[]) =>
    properties.map((property) => ({ key: property.key, value: inline(property.value) }))

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
            name:        inline(child.name),
            values:      keys.map((key) => {
                const value = child.properties.find((property) => property.key === key)?.value
                return value !== undefined ? inline(value) : ""
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
        name:        inline(object.name),
        properties:  object.properties.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object.properties) })) : "",
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
        ![ "TITLE", "SUBTITLE", "AUTHOR", "VERSION" ].includes(property.key))
    return render("TitlePage", { TitlePage: {
        title:       inline(prop("TITLE") ?? object.name),
        subtitle:    prop("SUBTITLE") !== undefined ? inline(prop("SUBTITLE") ?? "") : "",
        author:      prop("AUTHOR")   !== undefined ? inline(prop("AUTHOR")   ?? "") : "",
        version:     prop("VERSION")  !== undefined ? inline(prop("VERSION")  ?? "") : "",
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        properties:  rest.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(rest) })) : "",
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
    tocPages?: Map<string, number>): string => {
    /*  expand "[[xxx]]" references into hyperlinks (an unresolvable or
        ambiguous reference stays literal, marked as broken), targeting
        the fully-qualified anchor paths of the objects  */
    const index = buildLinkIndex(specification)
    anchors = anchorPaths(index)
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
        css:       safe(stylesheet()),
        created:   created.toISOString(),
        modified:  modified.toISOString(),
        titlepage: title !== undefined ?
            safe(renderTitlePage(title,
                created.toISOString().slice(0, 10),
                modified.toISOString().slice(0, 10))) : "",
        toc:       entries.length > 0 ? safe(render("Toc", { Toc: { entries } })) : "",
        artifacts: safe(artifacts.map((artifact) => renderArtifact(artifact, maxColumns)).join(""))
    } })
}
