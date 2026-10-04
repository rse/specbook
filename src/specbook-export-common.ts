/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import fs from "node:fs"

import type { Spec, SpecObject }
    from "./specbook-format-spec.js"
import { embeddingThemes, darkMark, type DarkMark }
    from "./specbook-parse-common.js"
import { plainText }
    from "./specbook-link.js"

/*  escape a text for embedding into template HTML (text and attributes)  */
export const escapeHtml = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;")

/*  provide the build-time pre-assembled stylesheet (with the
    font faces already inlined as base64 data: URIs)  */
export const stylesheet = (): string =>
    fs.readFileSync(new URL("specbook-export-html.css", import.meta.url), "utf8")

/*  provide the build-time bundled client-side fuzzy search script  */
export const searchScript = (): string =>
    fs.readFileSync(new URL("specbook-export-html-search.js", import.meta.url), "utf8")

/*  provide a theme variant of the build-time bundled fallback logo of
    SpecBook itself (as a self-contained data: URL, to keep its styles isolated)  */
export const fallbackLogo = (theme: typeof embeddingThemes[number]): string =>
    "data:image/svg+xml;base64," +
    fs.readFileSync(new URL(`specbook-export-logo-${theme}.svg`, import.meta.url)).toString("base64")

/*  the content aspects an export can omit, each matching the set of a
    folding control of the HTML export: the diagrams of a type (the
    derived Gradia ones, the embedded Mermaid/D2 ones as "code", and the
    embedded images and PDF pages as "image"), the diagrams from an object
    tree nesting level on, and the long texts  */
export const omitAspects = [ "diagram:graph", "diagram:hub", "diagram:grid",
    "diagram:code", "diagram:image",
    "diagram:1", "diagram:2", "diagram:3", "text:long" ] as const
export type OmitAspect = typeof omitAspects[number]

/*  parse the (comma-separated) aspects to omit, where the
    plain "diagram" is the alias of "diagram:1", hence of all diagrams  */
export const parseOmit = (omit: string[] = []): Set<OmitAspect> => {
    const aspects = new Set<OmitAspect>()
    for (const item of omit.flatMap((list) => list.split(",")).map((entry) => entry.trim())) {
        const aspect = omitAspects.find((known) => known === (item === "diagram" ? "diagram:1" : item))
        if (aspect === undefined)
            throw new Error(`unknown omit aspect "${item}" ` +
                `(expected "diagram" or one of "${omitAspects.join("\", \"")}")`)
        aspects.add(aspect)
    }
    return aspects
}

/*  the rendering options of an export: "realtime" injects the client-side
    script of the live preview into the HTML and "omit" names the
    aspects left out of the HTML, the PDF, and (the diagrams) the AST  */
export interface ExportOptions { realtime?: boolean, omit?: Set<OmitAspect> }

/*  check whether an object is the specification title object  */
export const isTitleObject = (object: SpecObject): boolean =>
    object.kind === "META" && object.name.toUpperCase() === "TITLE"

/*  determine the title object of the specification, searched at any
    nesting level in document order, where the first match wins  */
export const titleObject = (specification: Spec): SpecObject | undefined => {
    const search = (objects: SpecObject[]): SpecObject | undefined => {
        for (const object of objects) {
            if (isTitleObject(object))
                return object
            const found = search(object.children)
            if (found !== undefined)
                return found
        }
        return undefined
    }
    return search(specification.artifacts.flatMap((artifact) => artifact.objects))
}

/*  determine the (trimmed) value of a property of the title object (a
    present but empty value counting as an absent property, so every
    consumer falls back onto its own default)  */
const titleProperty = (specification: Spec, name: string): string | undefined => {
    const value = titleObject(specification)
        ?.properties.find((property) => property.key === name)?.value.trim()
    return value !== undefined && value !== "" ? value : undefined
}

/*  determine the document language (LANG) from the title object  */
export const documentLang = (specification: Spec): string | undefined =>
    titleProperty(specification, "LANG")

/*  determine the document character set (CHARSET) from the title object  */
export const documentCharset = (specification: Spec): string | undefined =>
    titleProperty(specification, "CHARSET")

/*  determine the document theme style (THEME-STYLE) from the title
    object, lower-cased and rejecting an unknown style (the styles being
    the very themes the "{theme}" image embeddings know)  */
export const documentThemeStyle = (specification: Spec): typeof embeddingThemes[number] | undefined => {
    const value = titleProperty(specification, "THEME-STYLE")
    if (value === undefined)
        return undefined
    const style = embeddingThemes.find((name) => name === value.toLowerCase())
    if (style === undefined)
        throw new Error(`unknown theme style "${value}" ` +
            `(expected ${embeddingThemes.join(", ")})`)
    return style
}

/*  determine the document theme color tone (THEME-TONE) from the title object  */
export const documentThemeTone = (specification: Spec): string | undefined =>
    titleProperty(specification, "THEME-TONE")

/*  the setup of a paper size for print: its physical height and its
    print margins, both expressed in the unit native to the paper  */
export type PaperSetup = {
    unit:   "mm" | "in"
    height: number
    margin: { top: number, bottom: number, left: number, right: number }
}

/*  the supported paper sizes for print: ISO A4 in millimeters and the
    two US sizes closest to it in inches, each with the default margins
    of 1in (25mm) at the top/bottom and 0.8in (20mm) at the left/right  */
const papers: Record<string, PaperSetup> = {
    "A4":     { unit: "mm", height: 297, margin: { top: 25, bottom: 25, left: 20,  right: 20  } },
    "Letter": { unit: "in", height: 11,  margin: { top: 1,  bottom: 1,  left: 0.8, right: 0.8 } },
    "Legal":  { unit: "in", height: 14,  margin: { top: 1,  bottom: 1,  left: 0.8, right: 0.8 } }
}
const paperSizes = Object.keys(papers)
export const paperSizeDefault = "A4"

/*  provide the setup of a paper size, falling back onto the default  */
export const paperSetup = (paper: string): PaperSetup =>
    papers[paper] ?? papers[paperSizeDefault]

/*  render a paper dimension as its CSS length  */
export const paperLength = (setup: PaperSetup, value: number): string =>
    `${value}${setup.unit}`

/*  determine the document paper size (PAPER-SIZE) from the title object,
    matched case-insensitively, falling back onto the default if unset
    and rejecting an unknown size  */
export const documentPaperSize = (specification: Spec): string => {
    const value = titleProperty(specification, "PAPER-SIZE")
    if (value === undefined)
        return paperSizeDefault
    const paper = paperSizes.find((name) => name.toLowerCase() === value.toLowerCase())
    if (paper === undefined)
        throw new Error(`unknown paper size "${value}" ` +
            `(expected ${paperSizes.join(", ")})`)
    return paper
}

/*  the vertical room (in rem) the introducing heading of a diagram
    claims above it on the same page: without this reserve a maximally
    sized diagram could not share its page with the heading, which
    would defeat the "break-after: avoid" bundling of the stylesheet  */
const headingReserve = 6

/*  the vertical room (in rem) the "Diagram of Contents" heading claims
    above its diagram: this <h1> opens its page and hence carries its
    full margins (3rem above, 2rem below) plus its own 2.4rem line and
    the 2rem margins of the diagram, which the flat reserve above
    underestimates, so the diagram would be pushed onto the next page  */
const docHeadingReserve = 10

/*  provide the paper-dependent print stylesheet: a diagram is scaled
    down to still fit onto a single page (the paper height less the
    print margins, the own vertical margins of the diagram, and the
    heading reserve above it) and is never broken across a page boundary,
    where the diagram of the "Diagram of Contents" page gets the larger
    reserve its own heading demands  */
export const paperStylesheet = (paper: string): string => {
    const setup = paperSetup(paper)
    const avail = setup.height - setup.margin.top - setup.margin.bottom
    return "@media print {\n" +
        "div.diagram { break-inside: avoid; }\n" +
        `div.diagram svg, div.diagram img { max-height: calc(${paperLength(setup, avail)} - ${headingReserve}rem);` +
        " width: auto; height: auto; }\n" +
        `nav.doc div.diagram svg { max-height: calc(${paperLength(setup, avail)} - ${docHeadingReserve}rem); }\n` +
        "}\n"
}

/*  generate a contiguous codepoint range  */
const range = (from: number, to: number): number[] =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i)

/*  the codepoints of US-ASCII and ISO-8859-1 (ISO Latin 1), plus the
    ISO-8859-15 (ISO Latin 9) revision, which replaces eight Latin 1
    codepoints with the Euro sign and the missing French/Finnish letters  */
const codepointsAscii  = range(0x20, 0x7E)
const codepointsLatin1 = [ ...codepointsAscii, ...range(0xA0, 0xFF) ]
const codepointsLatin9 = [
    ...codepointsLatin1.filter((cp) =>
        ![ 0xA4, 0xA6, 0xA8, 0xB4, 0xB8, 0xBC, 0xBD, 0xBE ].includes(cp)),
    0x20AC, 0x160, 0x161, 0x17D, 0x17E, 0x152, 0x153, 0x178 ]

/*  map a charset name (under its usual aliases) onto its codepoints,
    with the full Unicode charsets mapping onto undefined (no subsetting)  */
export const charsetCodepoints = (charset: string): number[] | undefined => {
    const name = charset.toLowerCase().replace(/[^a-z0-9]+/g, "")
    if (name === "ascii" || name === "usascii")
        return codepointsAscii
    else if (name === "iso88591" || name === "isolatin1" || name === "latin1")
        return codepointsLatin1
    else if (name === "iso885915" || name === "isolatin15" || name === "latin15"
        || name === "isolatin9" || name === "latin9")
        return codepointsLatin9
    else if (name === "utf8" || name === "utf16" || name === "unicode")
        return undefined
    throw new Error(`unknown charset "${charset}" ` +
        "(expected US-ASCII, ISO-8859-1/ISO-Latin-1, ISO-8859-15/ISO-Latin-9, or UTF-8)")
}

/*  the symbol glyphs used by the HTML/PDF rendering (kind and property
    bullets, link symbol, primary marker, anchor symbol plus its text
    presentation variation selector, the search field clearing icon,
    the absent property marker, the active entry pointer of the table
    of contents side panel, and the title path segment pointer of the
    description popups)  */
const symbolGlyphs = [ 0x25CF, 0x25CB, 0x26AD, 0x2318, 0x2693, 0xFE0E, 0x00D7, 0x2205, 0x25C0, 0x25B7 ]

/*  the typographic glyphs producible by the smart typography rendering
    (language-specific quotes, dashes, ellipsis, bullet, nbsp)  */
const typographyGlyphs = [
    0x00A0, 0x00AB, 0x00BB, 0x2013, 0x2014, 0x2018, 0x2019,
    0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2039, 0x203A ]

/*  the memoized subsetted stylesheets (as pending or settled promises,
    so concurrent requests share a single subsetting), keyed by the
    (shared) codepoint set of the charset, as the font subsetting is
    expensive and the formats of a single export, the watch and preview
    re-exports, and the MCP service request the very same subset over
    and over again  */
const subsetCache = new Map<number[], Promise<string>>()

/*  subset the embedded fonts of a stylesheet to the glyphs of a text  */
const subsetFonts = async (css: string, text: string): Promise<string> => {
    const { default: subsetFont } = await import("subset-font")
    let result = ""
    let last   = 0
    for (const m of css.matchAll(/url\("data:font\/woff2;base64,([^"]+)"\)/g)) {
        const subset = await subsetFont(Buffer.from(m[1], "base64"), text, { targetFormat: "woff2" })
        result += css.slice(last, m.index) +
            `url("data:font/woff2;base64,${subset.toString("base64")}")`
        last = m.index + m[0].length
    }
    return result + css.slice(last)
}

/*  provide the stylesheet with its embedded fonts subsetted to the
    codepoints of a charset plus the always-used symbol and typography
    glyphs (no charset or a full Unicode charset keeps the fonts complete),
    where a failed subsetting leaves the cache, so the next request retries  */
export const subsetStylesheet = async (charset?: string): Promise<string> => {
    const codepoints = charset !== undefined ? charsetCodepoints(charset) : undefined
    if (codepoints === undefined)
        return stylesheet()
    let subsetted = subsetCache.get(codepoints)
    if (subsetted === undefined) {
        const text = String.fromCodePoint(...codepoints, ...symbolGlyphs, ...typographyGlyphs)
        subsetted  = subsetFonts(stylesheet(), text)
        subsetted.catch(() => { subsetCache.delete(codepoints) })
        subsetCache.set(codepoints, subsetted)
    }
    return subsetted
}

/*  determine the document title and subtitle from the title object (an
    empty TITLE counts as absent, exactly like for the title page), with
    the inline code markup stripped, as the plain-text targets (the HTML
    <title>, the PDF metadata and page header) render no Markdown  */
export const documentTitle = (specification: Spec): { title: string, subtitle?: string } => {
    const title    = titleProperty(specification, "TITLE")
    const subtitle = titleProperty(specification, "SUBTITLE")
    return {
        title:    plainText(title ?? "Specification"),
        subtitle: subtitle !== undefined ? plainText(subtitle) : undefined
    }
}

/*  the relative luminance (0-1) of a CSS color given as "#rgb", "#rrggbb",
    "rgb(r, g, b)", "white", or "black" (undefined for any other one)  */
const luminance = (color: string): number | undefined => {
    const value = color.trim().toLowerCase()
    const named = value === "white" ? "#ffffff" : value === "black" ? "#000000" : value
    const hex   = named.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/)
    const rgb   = named.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
    const parts = hex !== null ?
        (hex[1].length === 3 ? hex[1].split("").map((c) => c + c) : hex[1].match(/../g) ?? [])
            .map((c) => parseInt(c, 16)) :
        rgb !== null ? rgb.slice(1, 4).map(Number) : undefined
    return parts !== undefined ? (0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]) / 255 : undefined
}

/*  whether an SVG image is most likely dark ink on a transparent or light
    canvas and hence safe to invert on the dark theme ("dark=auto"): it
    neither adapts itself (via "light-dark()" colors, "prefers-color-scheme"
    rules, or a "color-scheme" declaration), nor embeds a raster image
    (which would turn into a negative), nor paints a background of its own
    which is not light (by the style of its root element or by the topmost
    of the leading shapes covering the whole canvas -- rectangles or
    rectangular paths, as a rendered PDF page paints its background over
    the white paper of PDF.js --, an unknown color counting as not light)  */
export const svgInvertible = (svg: string): boolean => {
    if (/light-dark\(|prefers-color-scheme|color-scheme|<image\b/.test(svg))
        return false
    const root  = svg.match(/<svg\b[^>]*>/)?.[0] ?? ""
    const light = (color: string | undefined) => (luminance(color ?? "#000000") ?? 0) >= 0.5
    const back  = root.match(/background(?:-color)?\s*:\s*([^;"]+)/)?.[1]
    if (back !== undefined && !/^\s*(?:none|transparent)\s*$/.test(back) && !light(back))
        return false

    /*  the canvas size (in the user units of the viewBox, if any)  */
    const attr  = (element: string, name: string) =>
        element.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ??
        element.match(new RegExp(`[\\s;"]${name}\\s*:\\s*([^;"]+)`))?.[1]
    const box   = attr(root, "viewBox")?.trim().split(/[\s,]+/).map(Number) ?? []
    const width = box[2] || parseFloat(attr(root, "width") ?? "")
    const high  = box[3] || parseFloat(attr(root, "height") ?? "")

    /*  whether a shape covers the whole canvas: the corner points of a
        rectangle or of a path of straight absolute segments only, mapped
        through its "scale()" or "matrix()" transform (if any)  */
    const covers = (kind: string, element: string): boolean => {
        const num = (name: string) => parseFloat(attr(element, name) ?? "0") || 0
        let points: number[][]
        if (kind === "rect") {
            if (attr(element, "width") === "100%" && attr(element, "height") === "100%")
                return true
            const [ x, y ] = [ num("x"), num("y") ]
            points = [ [ x, y ], [ x + num("width"), y + num("height") ] ]
        }
        else {
            const d = attr(element, "d") ?? ""
            if (kind !== "path" || !/^[\sMLHVZ\d.,-]*$/.test(d))
                return false
            points = []
            for (const [ , cmd, args ] of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
                const n    = args.trim().split(/[\s,]+/).filter((a) => a !== "").map(Number)
                const last = points.at(-1) ?? [ 0, 0 ]
                if (cmd === "H")
                    points.push(...n.map((x) => [ x, last[1] ]))
                else if (cmd === "V")
                    points.push(...n.map((y) => [ last[0], y ]))
                else
                    for (let k = 0; k + 1 < n.length; k += 2)
                        points.push([ n[k], n[k + 1] ])
            }
        }
        const t = attr(element, "transform")?.trim() ?? ""
        const f = t.match(/^(matrix|scale)\(([^)]*)\)$/)
        const v = f?.[2].trim().split(/[\s,]+/).map(Number) ?? []
        const m = t === "" ? [ 1, 0, 0, 1, 0, 0 ] :
            f?.[1] === "matrix" && v.length === 6 ? v :
                f?.[1] === "scale" ? [ v[0], 0, 0, v[1] ?? v[0], 0, 0 ] : undefined
        if (m === undefined || points.length === 0)
            return false
        const xs = points.map(([ x, y ]) => m[0] * x + m[2] * y + m[4])
        const ys = points.map(([ x, y ]) => m[1] * x + m[3] * y + m[5])
        return Math.min(...xs) <= 1 && Math.min(...ys) <= 1
            && Math.max(...xs) >= width - 1 && Math.max(...ys) >= high - 1
    }

    /*  the topmost leading canvas-covering shape (outside of any
        definition) forms the background  */
    let fill: string | undefined
    const body = svg.slice(svg.indexOf(root) + root.length)
        .replace(/<(clipPath|defs|mask|pattern|symbol)\b[\s\S]*?<\/\1>/g, "")
    for (const shape of body.matchAll(/<(rect|path|circle|ellipse|line|polyline|polygon|text|use)\b[^>]*>/g)) {
        if (!covers(shape[1], shape[0]))
            break
        fill = attr(shape[0], "fill") ?? "#000000"
    }
    return fill === undefined || fill === "none" || fill === "transparent" || light(fill)
}

/*  the treatment of an embedded image on the dark theme: its explicit
    mark, else the "auto" detection (for a raster image the judgement of
    "analyzeRasters", none where absent)  */
export const imageDark = (content: string, rasters?: Map<string, boolean>): DarkMark => {
    const { content: plain, dark } = darkMark(content)
    return dark ?? ((plain.startsWith("data:") ? rasters?.get(plain) === true : svgInvertible(plain)) ?
        "invert" : "none")
}

/*  determine the document logo as a self-contained data: URL, taken from the
    first embedded image of the LOGO property of the title object -- the light
    variant of a "{theme}" reference -- and falling back onto the built-in
    SpecBook logo (for use in isolated rendering contexts, like the print
    header/footer, which load no external resources and are always light)  */
export const documentLogo = (specification: Spec): string => {
    const content = titleObject(specification)
        ?.properties.find((property) => property.key === "LOGO")?.embedding?.[0]
    if (content === undefined || content === "")
        return fallbackLogo("light")
    const plain = darkMark(content).content
    return plain.startsWith("data:") ? plain :
        `data:image/svg+xml;base64,${Buffer.from(plain, "utf8").toString("base64")}`
}
