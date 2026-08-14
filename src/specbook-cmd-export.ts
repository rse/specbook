/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import path              from "node:path"
import fs                from "node:fs"
import { fileURLToPath } from "node:url"

import { marked }        from "marked"
import nunjucks          from "nunjucks"
import nunjucksAddons    from "@rse/nunjucks-addons"
import textframe         from "textframe"
import JSON5             from "json5"
import { stringify as stringifyYaml }             from "yaml"
import { encode as encodeToon, type JsonValue }   from "@toon-format/toon"

import type { Specification, Artifact, Object as SpecObject, Property, Description }
    from "./specbook-struct-spec.js"
import { buildLinkIndex, resolveUnique, expandReferences, anchorPaths }
    from "./specbook-link.js"
import { embeddingRegex, embeddingMimeType }
    from "./specbook-parse.js"

/*  the supported export formats  */
export const formats = [ "json", "json5", "yaml", "toon", "html", "pdf", "md" ] as const
export type ExportFormat = typeof formats[number]

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

/*  escape a text for embedding into template HTML  */
const escapeHtml = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

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

/*  provide the build-time pre-assembled stylesheet (with the
    font faces already inlined as base64 data: URIs)  */
const stylesheet = (): string =>
    fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-cmd-export.css"), "utf8")

/*  check whether an object is the specification title object  */
const isTitleObject = (object: SpecObject): boolean =>
    object.kind === "META" && object.name.toUpperCase() === "TITLE"

/*  determine the document title and subtitle from the title object  */
const documentTitle = (specification: Specification): { title: string, subtitle?: string } => {
    const object = specification.artifacts.flatMap((artifact) => artifact.objects).find(isTitleObject)
    const prop = (name: string) =>
        object?.properties.find((property) => property.key === name)?.value
    return { title: prop("TITLE") ?? object?.name ?? "Specification", subtitle: prop("SUBTITLE") }
}

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
const renderHtml = (specification: Specification, maxColumns: number,
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

/*  ==== Markdown Rendering (normalization) ====  */

/*  format a timestamp in the frontmatter format  */
const formatTimestamp = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/*  render the properties as a value-aligned key/value list  */
const renderKeyValuesMd = (properties: Property[]): string => {
    const width = Math.max(...properties.map((property) => property.key.length)) + 1
    return properties.map((property) =>
        `-   ${`${property.key}:`.padEnd(width)} ${property.value}`).join("\n")
}

/*  render a description statement with its optional rationale  */
const renderDescriptionMd = (description: Description): string =>
    description.description + (description.rationale !== undefined ?
        `, BECAUSE ${description.rationale}` : "")

/*  render the implicit "(xxx)" and/or explicit "{{xxx}}" anchor suffix  */
const anchorSuffixMd = (object: SpecObject): string =>
    (object.paren  !== undefined ? ` (${object.paren})`    : "") +
    (object.anchor !== undefined ? ` {{${object.anchor}}}` : "")

/*  render an object in the Concise Format (level 4 and deeper),
    with its childs as nested list items  */
const renderConciseMd = (object: SpecObject, level: number): string => {
    const indent   = " ".repeat((level - 4) * 4)
    const segments = [ `${object.kind}: ${object.name}${anchorSuffixMd(object)}` ]
    segments.push(...object.properties.map((property) => `${property.key}: ${property.value}`))
    if (object.description !== undefined)
        segments.push(renderDescriptionMd(object.description))
    const item = `${indent}-   ${segments.join("; ").replace(/\.?$/, ".")}`
    return [ item, ...object.childs.map((child) => renderConciseMd(child, level + 1)) ].join("\n")
}

/*  render an object in the Complex Format (levels 1-3),
    with childs from level 4 upwards in the Concise Format  */
const renderObjectMd = (object: SpecObject, level: number): string => {
    const heading = level === 1 ?
        `#   ${object.kind}: ${object.name}${anchorSuffixMd(object)}` :
        `${"#".repeat(level)}${" ".repeat(4 - level)}${object.kind}: ${object.name}${anchorSuffixMd(object)}`
    const parts = [ heading ]
    if (object.properties.length > 0)
        parts.push(renderKeyValuesMd(object.properties))
    if (object.description !== undefined)
        parts.push(renderDescriptionMd(object.description))
    if (level >= 3)
        parts.push(object.childs.map((child) => renderConciseMd(child, level + 1)).join("\n"))
    else
        parts.push(...object.childs.map((child) => renderObjectMd(child, level + 1)))
    return parts.filter((part) => part !== "").join("\n\n")
}

/*  render the entire specification into normalized Markdown  */
const renderMarkdown = (specification: Specification): string =>
    specification.artifacts.map((artifact) =>
        artifact.objects.map((object) =>
            "---\n" +
            `Created:  ${formatTimestamp(artifact.created)}\n` +
            `Modified: ${formatTimestamp(artifact.modified)}\n` +
            "---\n\n" +
            renderObjectMd(object, 1)
        ).join("\n\n")
    ).join("\n\n") + "\n"

/*  extract the per-anchor page numbers from a Chromium-generated PDF,
    which records the internal link targets as named PDF destinations  */
const anchorPages = async (pdf: Uint8Array): Promise<Map<string, number>> => {
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } = await import("pdf-lib")
    const doc = await PDFDocument.load(pdf)
    const indexes = new Map<string, number>()
    doc.getPages().forEach((page, index) => indexes.set(page.ref.toString(), index + 1))
    const pages = new Map<string, number>()
    const dests = doc.catalog.lookupMaybe(PDFName.of("Dests"), PDFDict)
    if (dests !== undefined) {
        for (const [ name ] of dests.entries()) {
            const dest   = dests.lookup(name)
            const target = dest instanceof PDFArray ? dest.get(0) : undefined
            const page   = target instanceof PDFRef ? indexes.get(target.toString()) : undefined
            if (page !== undefined)
                pages.set(name.decodeText(), page)
        }
    }
    return pages
}

/*  render a self-contained HTML document into a PDF via Playwright,
    re-rendering the HTML with the discovered ToC page numbers  */
const htmlToPdf = async (renderHtmlPass: (tocPages?: Map<string, number>) => string,
    heading: { title: string, subtitle?: string },
    verbose: (msg: string) => void): Promise<Buffer> => {
    const { chromium } = await import("playwright")

    /*  the regular font face and the title/subtitle
        text for the header/footer templates  */
    const fontFace = stylesheet().match(/@font-face\s*\{[^}]*\}/)?.[0] ?? ""
    const headText = escapeHtml(heading.title) +
        (heading.subtitle !== undefined ? ` &mdash; ${escapeHtml(heading.subtitle)}` : "")

    /*  launch the Playwright Chromium browser, falling back to a
        system-installed Google Chrome if the Chromium download is missing  */
    let browser
    try {
        browser = await chromium.launch()
    }
    catch (err) {
        verbose("Playwright Chromium unavailable -- falling back to installed Google Chrome")
        try {
            browser = await chromium.launch({ channel: "chrome" })
        }
        catch {
            /*  report the original, more instructive error  */
            throw err
        }
    }
    try {
        const page = await browser.newPage()

        /*  render an HTML document into a paginated PDF  */
        const renderPdf = async (html: string, options: object = {}) => {
            await page.setContent(html, { waitUntil: "networkidle" })
            await page.evaluate(() => document.fonts.ready)
            return page.pdf({
                format:            "A4",
                margin:            { top: "2.5cm", right: "2cm", bottom: "2.5cm", left: "2cm" },
                printBackground:   true,
                preferCSSPageSize: true,
                ...options
            })
        }

        /*  determine the ToC page numbers via a fixpoint iteration:
            paginate undecorated, extract the per-anchor pages, and
            re-render until the HTML is stable, as the ToC page number
            column itself can shift the pagination  */
        verbose("determining ToC page numbers")
        let html  = renderHtmlPass()
        let plain = await renderPdf(html)
        for (let i = 0; i < 3; i++) {
            const next = renderHtmlPass(await anchorPages(plain))
            if (next === html)
                break
            html  = next
            plain = await renderPdf(html)
        }

        const decorated = await renderPdf(html, {
            /*  the header/footer templates render in an isolated context,
                so they need their own inline styling, the regular font face
                embedded as a data: URI, and the special "title"/"pageNumber"
                classes for the injected values  */
            displayHeaderFooter: true,
            headerTemplate:
                `<style>${fontFace}</style>` +
                "<div style=\"width: 100%; margin-top: 0.8cm;\">" +
                "<div style=\"margin: 0 2cm; " +
                "font-family: 'Source Sans 3', sans-serif; " +
                "font-size: 8pt; color: #c0c0c0; border-bottom: 1px solid #d0d0d0; " +
                "padding-bottom: 1mm; display: flex; justify-content: space-between;\">" +
                `<span>${headText}</span>` +
                "<span class=\"pageNumber\" style=\"color: #303030\"></span></div></div>",
            footerTemplate:
                `<style>${fontFace}</style>` +
                "<div style=\"width: 100%; margin-bottom: 0.8cm;\">" +
                "<div style=\"margin: 0 2cm; " +
                "font-family: 'Source Sans 3', sans-serif; " +
                "font-size: 8pt; color: #303030; display: flex; " +
                "justify-content: space-between; border-top: 1px solid #d0d0d0; " +
                "padding-top: 1mm;\">" +
                `<span style="color: #c0c0c0">${headText}</span>` +
                "<span style=\"color: #999999; font-weight: bold;\" class=\"pageNumber\"></span></div></div>"
        })

        /*  a title page carries no header/footer: as Chromium decorates
            all pages unconditionally, swap the first page of the
            identically paginated undecorated document (left over from
            the ToC page number iteration) into the decorated document
            *in place*, which keeps the decorated document's link
            destinations (and hence the internal hyperlinks) intact  */
        const { PDFDocument, rgb } = await import("pdf-lib")
        const merged = await PDFDocument.load(decorated)
        if (html.includes("class=\"titlepage\"")) {
            const source = await PDFDocument.load(plain)
            const [ titlePage ] = await merged.copyPages(source, [ 0 ])
            merged.removePage(0)
            merged.insertPage(0, titlePage)
        }

        /*  draw the vertical brand bar onto the left edge of the
            physical paper of every page, as Chromium clips print
            content to the page box (0.6rem at the 9pt print root)  */
        for (const pdfPage of merged.getPages())
            pdfPage.drawRectangle({ x: 0, y: 0, width: 5.4,
                height: pdfPage.getHeight(), color: rgb(0.2, 0.4, 0.6) })
        return Buffer.from(await merged.save())
    }
    finally {
        await browser.close()
    }
}

/*  export a specification into the requested format  */
export const exportSpecification = async (
    specification:   Specification,
    format:          ExportFormat,
    verbose:         (msg: string) => void,
    maxTableColumns = 4
): Promise<Buffer> => {
    if (!(formats as readonly string[]).includes(format))
        throw new Error(`unknown export format "${format}"`)
    verbose(`exporting specification as "${format}"`)

    /*  reduce the specification to plain JSON values (ISO date strings)  */
    const plain = (): JsonValue => JSON.parse(JSON.stringify(specification))
    if (format === "json")
        return Buffer.from(JSON.stringify(specification, null, 4) + "\n", "utf8")
    else if (format === "json5")
        return Buffer.from(JSON5.stringify(plain(), null, 4) + "\n", "utf8")
    else if (format === "yaml")
        return Buffer.from(stringifyYaml(plain()), "utf8")
    else if (format === "toon")
        return Buffer.from(encodeToon(plain()) + "\n", "utf8")
    else if (format === "md")
        return Buffer.from(renderMarkdown(specification), "utf8")
    else if (format === "html")
        return Buffer.from(renderHtml(specification, maxTableColumns), "utf8")
    else
        return htmlToPdf((tocPages) => renderHtml(specification, maxTableColumns, tocPages),
            documentTitle(specification), verbose)
}
