/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { marked, type Tokens }                       from "marked"
import type { HighlighterCore, ThemeRegistrationRaw } from "shiki/core"

import type { Spec, SpecObject }
    from "./specbook-format-spec.js"
import { codeLanguage, fenceInfo, markedLines }
    from "./specbook-parse-common.js"
import { escapeHtml }
    from "./specbook-export-common.js"
import { literal, type Verbose }
    from "./specbook-verbose.js"

/*  a code listing: its language id, its source code, the number of
    its first line, and the hunks of its marked lines  */
export interface Listing {
    lang:   string
    source: string
    start:  number
    mark:   string
}

/*  the renderer of a code listing into its HTML  */
export type ListingRenderer = (listing: Listing) => string

/*  decode an embedded source code file, which the parser loads as a base64
    data: URL of its code MIME type (undefined for any other content)  */
export const embeddedListing = (content: string): Listing | undefined => {
    const m = content.match(/^data:text\/x-code;lang=([^;,]+);start=(\d+)(?:;mark=([^;,]+))?;base64,(.*)$/s)
    return m !== null ? {
        lang:   m[1],
        source: Buffer.from(m[4], "base64").toString("utf8"),
        start:  Number(m[2]),
        mark:   decodeURIComponent(m[3] ?? "")
    } : undefined
}

/*  determine the code listing of a fenced code block (undefined for a
    block of no or an unknown language, and for invalid parameters, which
    the parser reports)  */
export const fencedListing = (token: Tokens.Code): Listing | undefined => {
    const info = fenceInfo(token.lang)
    const lang = codeLanguage(info.lang)
    if (lang === undefined || info.error !== undefined)
        return undefined
    return { lang, source: token.text, start: Number(info.params.start ?? "1"), mark: info.params.mark ?? "" }
}

/*  render a code listing back into a fenced code block, with its
    parameters deviating from the defaults (the fence outgrowing the
    longest backtick run of the source code)  */
export const listingFence = (listing: Listing): string => {
    const run    = Math.max(2, ...Array.from(listing.source.matchAll(/`+/g), (m) => m[0].length))
    const fence  = "`".repeat(run + 1)
    const params = [ listing.start !== 1 ? ` start=${listing.start}` : "",
        listing.mark !== "" ? ` mark=${listing.mark}` : "" ].join("")
    return `${fence}${listing.lang}${params}\n${listing.source}\n${fence}`
}

/*  the marker theme of the syntax highlighting: it maps the TextMate
    scopes onto marker colors, which the rendering turns into the token
    classes, so no color enters the HTML and the stylesheet alone colors
    the tokens (the more specific scope wins, e.g. the string quotes
    over the other punctuation, and the code embedded into a string
    turns regular again)  */
const tokenClasses: Record<string, string | undefined> = {
    "#000001": "code-keyword",
    "#000002": "code-literal",
    "#000003": "code-comment"
}
const markerTheme: ThemeRegistrationRaw = {
    name: "specbook",
    type: "light",
    settings: [
        { settings: { foreground: "#000000", background: "#ffffff" } },
        { scope: [ "keyword", "storage", "punctuation", "meta.brace", "variable.language", "entity.name.tag" ],
            settings: { foreground: "#000001" } },
        { scope: [ "string", "constant", "support.constant", "punctuation.definition.string" ],
            settings: { foreground: "#000002" } },
        { scope: [ "comment", "punctuation.definition.comment" ],
            settings: { foreground: "#000003" } },
        { scope: [ "meta.template.expression", "meta.embedded" ],
            settings: { foreground: "#000000" } }
    ]
}

/*  the syntax highlighter, created on first use (with the JavaScript
    regular expression engine, so no WebAssembly is needed) and loading
    the grammars of the languages on demand  */
let highlighter: Promise<HighlighterCore> | null = null

/*  render a code listing into a "pre" block: one block-level line per
    source line (marked ones carrying a class), whose number the stylesheet
    draws from a counter (so it neither is copied nor searched), and the
    highlighted tokens of a loaded language as token class spans (adjacent
    tokens of the same class merged)  */
const renderListing = (shiki: HighlighterCore | null, listing: Listing): string => {
    const tokens = shiki !== null && shiki.getLoadedLanguages().includes(listing.lang) ?
        shiki.codeToTokensBase(listing.source, { lang: listing.lang, theme: markerTheme.name })
            .map((line) => line.map((token) =>
                ({ content: token.content, cls: tokenClasses[(token.color ?? "").toLowerCase()] }))) :
        listing.source.split(/\r?\n/).map((line) => [ { content: line, cls: undefined } ])
    const marks  = markedLines(listing.mark)
    const digits = String(listing.start + tokens.length - 1).length
    const lines  = tokens.map((line, i) => {
        const spans = new Array<{ content: string, cls?: string }>()
        for (const token of line) {
            const prev = spans.at(-1)
            if (prev !== undefined && prev.cls === token.cls)
                prev.content += token.content
            else
                spans.push({ ...token })
        }
        return `<span class="line${marks.has(listing.start + i) ? " marked" : ""}">` +
            spans.map((span) => span.cls !== undefined ?
                `<span class="${span.cls}">${escapeHtml(span.content)}</span>` : escapeHtml(span.content)).join("") +
            "</span>"
    })
    return `<pre class="listing" style="--listing-start: ${listing.start}; --listing-digits: ${digits}">` +
        `<code>${lines.join("")}</code></pre>`
}

/*  collect the languages of the code listings of an object and its
    descendants: the fenced code blocks of a known language inside its
    description statement and elaboration and the source code files
    embedded into its description and property values  */
const collect = (object: SpecObject, langs: Set<string>) => {
    for (const text of [ object.description?.description ?? "", object.description?.elaboration ?? "" ])
        marked.walkTokens(marked.lexer(text), (token) => {
            const listing = token.type === "code" ? fencedListing(token as Tokens.Code) : undefined
            if (listing !== undefined)
                langs.add(listing.lang)
        })
    const contents = [ ...object.description?.embedding ?? [],
        ...object.properties.flatMap((property) => property.embedding ?? []) ]
    for (const content of contents) {
        const listing = embeddedListing(content)
        if (listing !== undefined)
            langs.add(listing.lang)
    }
    for (const child of object.children)
        collect(child, langs)
}

/*  prepare the rendering of the code listings of a specification: the
    syntax highlighter is loaded (on first use) together with the grammars
    of all languages used, as the Markdown rendering is synchronous, and
    a failure to load is surfaced as a notice only, leaving the listings
    of the affected languages unhighlighted  */
export const prepareListings = async (specification: Spec, verbose?: Verbose): Promise<ListingRenderer> => {
    const langs = new Set<string>()
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            collect(object, langs)
    if (langs.size === 0)
        return (listing) => renderListing(null, listing)
    let shiki: HighlighterCore | null = null
    try {
        highlighter ??= Promise.all([ import("shiki/core"), import("shiki/engine/javascript") ])
            .then(([ { createHighlighterCore }, { createJavaScriptRegexEngine } ]) =>
                createHighlighterCore({ themes: [ markerTheme ], langs: [], engine: createJavaScriptRegexEngine() }))
        shiki = await highlighter
    }
    catch (err) {
        highlighter = null
        verbose?.("loading syntax highlighter failed: " + (err instanceof Error ? err.message : String(err)))
    }
    if (shiki !== null) {
        const { bundledLanguages } = await import("shiki/langs")
        const missing = Array.from(langs).filter((lang) => !shiki.getLoadedLanguages().includes(lang))
        for (const lang of missing)
            await shiki.loadLanguage(bundledLanguages[lang as keyof typeof bundledLanguages]).catch((err: unknown) => {
                verbose?.(`loading syntax highlighting of language "${literal(lang)}" failed: ` +
                    (err instanceof Error ? err.message : String(err)))
            })
        verbose?.(`highlighting code listings of ${literal(langs.size)} language(s) ` +
            `(${literal(missing.length)} newly loaded)`)
    }
    return (listing) => renderListing(shiki, listing)
}
