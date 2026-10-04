/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { type Spec, type SpecArtifact, type SpecObject, type SpecProperty }
    from "./specbook-format-spec.js"
import { type Diagnostic, type DiagnosticSeverity }
    from "./specbook-diagnostic.js"
import { type LinkIndex }
    from "./specbook-link.js"

/*  a single specification Markdown source file  */
export interface SourceFile {
    file: string
    text: string
}

/*  the result of parsing a set of specification Markdown files, where
    "origins" maps every artifact onto the source file it stems from  */
export interface ParseResult {
    specification: Spec
    diagnostics:   Diagnostic[]
    assets:        string[]
    origins:       Map<SpecArtifact, string>
}

/*  per-object parsing meta information, kept outside the AST  */
export interface ObjectMeta {
    file: string
    line: number
}

/*  the state shared between the syntactic and semantic parsing phases  */
export class ParseContext {
    diagnostics          = new Array<Diagnostic>()
    objectMeta           = new WeakMap<SpecObject, ObjectMeta>()
    propMeta             = new WeakMap<SpecProperty, { line: number }>()
    linkIndex: LinkIndex = []

    /*  the synthetic properties supplied by the parenthesized name
        tokens consumed as property values (kept outside the AST, so
        the tokens stay plain heading markers on export)  */
    parenProps           = new WeakMap<SpecObject, SpecProperty>()

    /*  the resolved paths of the embedded asset files, recorded even for
        an unreadable one, as a watching consumer has to observe it, too  */
    assets               = new Set<string>()

    /*  record a single diagnostic (an error, unless flagged otherwise)  */
    diagnose (file: string, line: number, message: string, severity: DiagnosticSeverity = "error") {
        this.diagnostics.push({ file, line, column: 1, severity, message })
    }

    /*  the source location of an object (defensively falling back onto
        line 1 of no file for an object unknown to the syntactic phase)  */
    metaOf (object: SpecObject): ObjectMeta {
        return this.objectMeta.get(object) ?? { file: "", line: 1 }
    }
}

/*  the marker separating a statement from its rationale  */
export const becauseRegex = /,\s*(?:\*\*BECAUSE\*\*|BECAUSE)\s+/

/*  the Markdown image embedding syntax: inline ("![alt](file)") or
    reference-style ("![alt][label]", the label naming a "[label]: data:..."
    definition, as the normalized Markdown export embeds the images)  */
export const embeddingRegex = /!\[([^\]]*)\](?:\(([^()]+)\)|\[([^[\]]+)\])/g

/*  the theme variants of a theme-aware image embedding  */
export const embeddingThemes = [ "light", "dark" ] as const

/*  expand an image embedding reference into its variants: a reference
    carrying the "{theme}" placeholder yields one variant per theme,
    while every other reference stays its own single variant  */
export const embeddingVariants = (reference: string): string[] =>
    reference.includes("{theme}") ?
        embeddingThemes.map((theme) => reference.replace(/\{theme\}/g, theme)) :
        [ reference ]

/*  the MIME type of a PDF document  */
export const pdfType = "application/pdf"

/*  the embeddable file types and their MIME types: the images plus the
    diagram sources (Mermaid and D2) and the documents (PDF), which the
    exports render  */
const embeddingTypes: Record<string, string | undefined> = {
    svg:     "image/svg+xml",
    png:     "image/png",
    jpg:     "image/jpeg",
    jpeg:    "image/jpeg",
    webp:    "image/webp",
    mmd:     "text/vnd.mermaid",
    mermaid: "text/vnd.mermaid",
    d2:      "text/vnd.d2",
    pdf:     pdfType
}

/*  the fragment parameters ("#<key>=<value>&...") each file type accepts,
    with the patterns of their values: the treatment on the dark theme
    of an image and a document, and the 1-based page of a document  */
const darkAuto   = /^(?:auto|invert|none)$/
const pageNumber = /^[1-9]\d*$/
const fragmentParams: Record<string, Record<string, RegExp> | undefined> = {
    "image/svg+xml": { dark: darkAuto },
    "image/png":     { dark: darkAuto },
    "image/jpeg":    { dark: darkAuto },
    "image/webp":    { dark: darkAuto },
    [pdfType]:       { page: pageNumber, dark: darkAuto }
}

/*  split an embedding reference into its file and its fragment parameters
    (URI-decoded and in the canonical order of its type), or undefined for
    a fragment its type does not accept (an unknown or repeated key, or an
    invalid value)  */
export const embeddingFragment = (reference: string, type: string):
    { file: string, params: Record<string, string> } | undefined => {
    const hash = reference.indexOf("#", reference.lastIndexOf("/") + 1)
    if (hash < 0)
        return { file: reference, params: {} }
    const accepted = fragmentParams[type] ?? {}
    const given    = new Map<string, string>()
    for (const pair of reference.slice(hash + 1).split("&")) {
        const m = pair.match(/^([a-z]+)=(.*)$/s)
        if (m === null || given.has(m[1]))
            return undefined
        let value = m[2]
        try {
            value = decodeURIComponent(value)
        }
        catch {
            /*  an invalid escape sequence is taken literally  */
        }
        if (!(accepted[m[1]]?.test(value) ?? false))
            return undefined
        given.set(m[1], value)
    }
    const params: Record<string, string> = {}
    for (const key of Object.keys(accepted)) {
        const value = given.get(key)
        if (value !== undefined)
            params[key] = value
    }
    return { file: reference.slice(0, hash), params }
}

/*  map a local image embedding reference onto the MIME type of its file
    (URLs and other file types are not embeddable), regardless of any
    fragment  */
export const embeddingFileType = (reference: string): string | undefined => {
    if (/^[a-z][a-z0-9+.-]+:/i.test(reference))
        return undefined
    const m = reference.match(/^.*?\.([a-z0-9]+)(?:#.*)?$/is)
    return m !== null ? embeddingTypes[m[1].toLowerCase()] : undefined
}

/*  map a local image embedding reference onto its MIME type, provided its
    fragment (if any) is one its type accepts  */
export const embeddingMimeType = (reference: string): string | undefined => {
    const type = embeddingFileType(reference)
    return type !== undefined && embeddingFragment(reference, type) !== undefined ? type : undefined
}

/*  the number of embedding entries an image embedding markup occupies,
    given its inline reference: one per variant of an embeddable one, none
    for any other one, and one for a reference-style markup (no reference)  */
export const embeddingCount = (reference: string | undefined): number => {
    if (reference === undefined)
        return 1
    const trimmed = reference.trim()
    return embeddingMimeType(trimmed) !== undefined ? embeddingVariants(trimmed).length : 0
}

/*  the image definition ("[label]: data:...") a reference-style image
    embedding refers to: a base64 data: URL of an embeddable image type,
    optionally marked with its treatment on the dark theme  */
export const embeddingDataRegex =
    /^data:(image\/(?:svg\+xml|png|jpeg|webp))(;dark=(?:invert|none))?;base64,([A-Za-z0-9+/=]+)$/

/*  the explicit treatments of an embedded image on the dark theme  */
export type DarkMark = "invert" | "none"

/*  split an embedded image or document content (an SVG text or a data:
    URL) into its plain content and its explicit treatment on the dark
    theme, which a "#dark=invert" or "#dark=none" fragment (deviating from
    the default "auto") turns into the "dark" data: URL parameter directly
    behind the MIME type (an SVG hence becoming a data: URL, too)  */
export const darkMark = (content: string): { content: string, dark?: DarkMark } => {
    const m = content.match(/^data:([^;,]+);dark=(invert|none)((?:;[a-z]+=[^;,]*)*);base64,(.*)$/s)
    if (m === null)
        return { content }
    return { dark: m[2] as DarkMark, content: m[1] === "image/svg+xml" && m[3] === "" ?
        Buffer.from(m[4], "base64").toString("utf8") : `data:${m[1]}${m[3]};base64,${m[4]}` }
}

/*  mark a plain embedded image or document content with its explicit
    treatment on the dark theme  */
export const markDark = (content: string, dark: DarkMark): string =>
    content.startsWith("data:") ? content.replace(/^(data:[^;,]+)/, `$1;dark=${dark}`) :
        `data:image/svg+xml;dark=${dark};base64,${Buffer.from(content, "utf8").toString("base64")}`
