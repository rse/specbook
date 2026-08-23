/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import path              from "node:path"
import fs                from "node:fs"
import { fileURLToPath } from "node:url"

import type { Spec, SpecObject }
    from "./specbook-format-spec.js"

/*  escape a text for embedding into template HTML (text and attributes)  */
export const escapeHtml = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;")

/*  provide the build-time pre-assembled stylesheet (with the
    font faces already inlined as base64 data: URIs)  */
export const stylesheet = (): string =>
    fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-export-html.css"), "utf8")

/*  provide the build-time bundled client-side fuzzy search script  */
export const searchScript = (): string =>
    fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-export-html-search.js"), "utf8")

/*  provide the build-time bundled fallback logo of SpecBook itself
    (as a self-contained data: URL, to keep its styles isolated)  */
export const fallbackLogo = (): string =>
    "data:image/svg+xml;base64," + fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-export-logo.svg")).toString("base64")

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
            const found = search(object.childs)
            if (found !== undefined)
                return found
        }
        return undefined
    }
    return search(specification.artifacts.flatMap((artifact) => artifact.objects))
}

/*  determine a property value of the title object  */
const titleProperty = (specification: Spec, name: string): string | undefined =>
    titleObject(specification)?.properties.find((property) => property.key === name)?.value

/*  determine the document language (LANG) from the title object  */
export const documentLang = (specification: Spec): string | undefined =>
    titleProperty(specification, "LANG")?.trim()

/*  determine the document character set (CHARSET) from the title object  */
export const documentCharset = (specification: Spec): string | undefined =>
    titleProperty(specification, "CHARSET")?.trim()

/*  determine the document theme style (THEME-STYLE) from the title object  */
export const documentThemeStyle = (specification: Spec): string | undefined =>
    titleProperty(specification, "THEME-STYLE")?.trim()

/*  determine the document theme color tone (THEME-TONE) from the title object  */
export const documentThemeTone = (specification: Spec): string | undefined =>
    titleProperty(specification, "THEME-TONE")?.trim()

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
const papers: { [ name: string ]: PaperSetup } = {
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
    const value = titleProperty(specification, "PAPER-SIZE")?.trim()
    if (value === undefined)
        return paperSizeDefault
    const paper = paperSizes.find((name) => name.toLowerCase() === value.toLowerCase())
    if (paper === undefined)
        throw new Error(`unknown paper size "${value}" ` +
            `(expected ${paperSizes.join(", ")})`)
    return paper
}

/*  provide the paper-dependent print stylesheet: a diagram is scaled
    down to still fit onto a single page (the paper height less the
    print margins, the own vertical margins of the diagram, and the
    room its introducing heading claims above it) and is never broken
    across a page boundary; without the heading reserve a maximally
    sized diagram could not share its page with the heading, which
    would defeat the "break-after: avoid" bundling of the stylesheet  */
const headingReserve = 6

export const paperStylesheet = (paper: string): string => {
    const setup = paperSetup(paper)
    const avail = setup.height - setup.margin.top - setup.margin.bottom
    return "@media print {\n" +
        "div.diagram { break-inside: avoid; }\n" +
        `div.diagram svg { max-height: calc(${paperLength(setup, avail)} - ${headingReserve}rem);` +
        " width: auto; height: auto; }\n" +
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
    bullets, link symbol, primary marker, theme switch icon, anchor
    symbol plus its text presentation variation selector, and the
    search field clearing icon)  */
const symbolGlyphs = [ 0x25CF, 0x25CB, 0x26AD, 0x2318, 0x25D0, 0x2693, 0xFE0E, 0x00D7 ]

/*  the typographic glyphs producible by the smart typography rendering
    (language-specific quotes, dashes, ellipsis, bullet, nbsp)  */
const typographyGlyphs = [
    0x00A0, 0x00AB, 0x00BB, 0x2013, 0x2014, 0x2018, 0x2019,
    0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2039, 0x203A ]

/*  provide the stylesheet with its embedded fonts subsetted to the
    codepoints of a charset plus the always-used symbol and typography
    glyphs (no charset or a full Unicode charset keeps the fonts complete)  */
export const subsetStylesheet = async (charset?: string): Promise<string> => {
    const css = stylesheet()
    if (charset === undefined)
        return css
    const codepoints = charsetCodepoints(charset)
    if (codepoints === undefined)
        return css
    const { default: subsetFont } = await import("subset-font")
    const text = String.fromCodePoint(...codepoints, ...symbolGlyphs, ...typographyGlyphs)
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

/*  determine the document title and subtitle from the title object  */
export const documentTitle = (specification: Spec): { title: string, subtitle?: string } => ({
    title:    titleProperty(specification, "TITLE") ??
        titleObject(specification)?.name ?? "Specification",
    subtitle: titleProperty(specification, "SUBTITLE")
})

/*  determine the document logo as a self-contained data: URL, taken from the
    embedded image of the LOGO property of the title object, and falling back
    onto the built-in SpecBook logo (for use in isolated rendering contexts,
    like the print header/footer, which load no external resources)  */
export const documentLogo = (specification: Spec): string => {
    const content = titleObject(specification)
        ?.properties.find((property) => property.key === "LOGO")?.embedding?.[0]
    if (content === undefined)
        return fallbackLogo()
    return content.startsWith("data:") ? content :
        `data:image/svg+xml;base64,${Buffer.from(content, "utf8").toString("base64")}`
}
