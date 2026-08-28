/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { type Spec, type SpecObject, type SpecProperty }
    from "./specbook-format-spec.js"
import { type Diagnostic }
    from "./specbook-diagnostic.js"
import { type LinkIndex }
    from "./specbook-link.js"

/*  a single specification Markdown source file  */
export interface SourceFile {
    file: string
    text: string
}

/*  the result of parsing a set of specification Markdown files  */
export interface ParseResult {
    specification: Spec
    diagnostics:   Diagnostic[]
    assets:        string[]
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

    /*  the resolved paths of the embedded asset files, recorded even for
        an unreadable one, as a watching consumer has to observe it, too  */
    assets               = new Set<string>()

    /*  record a single diagnostic  */
    diagnose (file: string, line: number, message: string) {
        this.diagnostics.push({ file, line, column: 1, message })
    }
}

/*  the marker separating a statement from its rationale  */
export const becauseRegex = /,\s*(?:\*\*BECAUSE\*\*|BECAUSE)\s+/

/*  the Markdown image embedding syntax ("![alt](file)")  */
export const embeddingRegex = /!\[([^\]]*)\]\(([^()]+)\)/g

/*  the theme variants of a theme-aware image embedding  */
export const embeddingThemes = [ "light", "dark" ] as const

/*  expand an image embedding reference into its variants: a reference
    carrying the "{theme}" placeholder yields one variant per theme,
    while every other reference stays its own single variant  */
export const embeddingVariants = (reference: string): string[] =>
    reference.includes("{theme}") ?
        embeddingThemes.map((theme) => reference.replace(/\{theme\}/g, theme)) :
        [ reference ]

/*  the embeddable file types and their MIME types  */
const embeddingTypes: Record<string, string | undefined> = {
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
