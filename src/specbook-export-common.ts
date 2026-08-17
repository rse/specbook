/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import path              from "node:path"
import fs                from "node:fs"
import { fileURLToPath } from "node:url"

import type { Specification, Object as SpecObject }
    from "./specbook-struct-spec.js"

/*  escape a text for embedding into template HTML  */
export const escapeHtml = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/*  provide the build-time pre-assembled stylesheet (with the
    font faces already inlined as base64 data: URIs)  */
export const stylesheet = (): string =>
    fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-export-html.css"), "utf8")

/*  provide the build-time bundled fallback logo of SpecBook itself
    (as a self-contained data: URL, to keep its styles isolated)  */
export const fallbackLogo = (): string =>
    "data:image/svg+xml;base64," + fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-export-logo.svg")).toString("base64")

/*  check whether an object is the specification title object  */
export const isTitleObject = (object: SpecObject): boolean =>
    object.kind === "META" && object.name.toUpperCase() === "TITLE"

/*  determine a property value of the title object  */
const titleProperty = (specification: Specification, name: string): string | undefined =>
    specification.artifacts.flatMap((artifact) => artifact.objects).find(isTitleObject)
        ?.properties.find((property) => property.key === name)?.value

/*  determine the document language (LANG) from the title object  */
export const documentLang = (specification: Specification): string | undefined =>
    titleProperty(specification, "LANG")?.trim()

/*  determine the document character set (CHARSET) from the title object  */
export const documentCharset = (specification: Specification): string | undefined =>
    titleProperty(specification, "CHARSET")?.trim()

/*  determine the document theme style (THEME-STYLE) from the title object  */
export const documentThemeStyle = (specification: Specification): string | undefined =>
    titleProperty(specification, "THEME-STYLE")?.trim()

/*  determine the document theme color tone (THEME-TONE) from the title object  */
export const documentThemeTone = (specification: Specification): string | undefined =>
    titleProperty(specification, "THEME-TONE")?.trim()

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
        "(expected US-ASCII, ISO-8859-1/ISO-Latin-1, ISO-8859-15/ISO-Latin-15, or UTF-8)")
}

/*  the symbol glyphs used by the HTML/PDF rendering (kind and property
    bullets, link symbol, primary marker, theme switch icon, anchor
    symbol plus its text presentation variation selector)  */
const symbolGlyphs = [ 0x25CF, 0x25CB, 0x26AD, 0x2318, 0x25D0, 0x2693, 0xFE0E ]

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
export const documentTitle = (specification: Specification): { title: string, subtitle?: string } => {
    const object = specification.artifacts.flatMap((artifact) => artifact.objects).find(isTitleObject)
    const prop = (name: string) =>
        object?.properties.find((property) => property.key === name)?.value
    return { title: prop("TITLE") ?? object?.name ?? "Specification", subtitle: prop("SUBTITLE") }
}

/*  determine the document logo as a self-contained data: URL, taken from the
    embedded image of the LOGO property of the title object, and falling back
    onto the built-in SpecBook logo (for use in isolated rendering contexts,
    like the print header/footer, which load no external resources)  */
export const documentLogo = (specification: Specification): string => {
    const object  = specification.artifacts.flatMap((artifact) => artifact.objects).find(isTitleObject)
    const content = object?.properties.find((property) => property.key === "LOGO")?.embedding?.[0]
    if (content === undefined)
        return fallbackLogo()
    return content.startsWith("data:") ? content :
        `data:image/svg+xml;base64,${Buffer.from(content, "utf8").toString("base64")}`
}
