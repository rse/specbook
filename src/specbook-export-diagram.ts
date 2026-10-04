/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Worker }                         from "node:worker_threads"

import { marked, type Tokens }                 from "marked"
import type { D2 }                             from "@terrastruct/d2"
import type { RenderOptions as MermaidOptions } from "beautiful-mermaid"

import type { Spec, SpecObject }
    from "./specbook-format-spec.js"
import { documentThemeTone, type OmitAspect }
    from "./specbook-export-common.js"
import { themeColors, themeToneDefault, type ThemeColors, type ThemeStyle }
    from "./specbook-theme.js"
import { plainText }
    from "./specbook-link.js"
import { literal, type Verbose }
    from "./specbook-verbose.js"

/*  the languages of the embedded diagrams  */
export type DiagramLanguage = "mermaid" | "d2"

/*  the rendered SVGs of an embedded diagram, one per theme style  */
export type DiagramVariants = Record<ThemeStyle, string>

/*  the fenced code block languages of the embedded diagrams  */
const fenceLanguages: Record<string, DiagramLanguage | undefined> = {
    mermaid: "mermaid",
    mmd:     "mermaid",
    d2:      "d2"
}

/*  map the language of a fenced code block onto its diagram language
    (undefined for a regular code block)  */
export const fenceLanguage = (lang: string | undefined): DiagramLanguage | undefined =>
    fenceLanguages[(lang ?? "").trim().toLowerCase()]

/*  decode an embedded diagram source file, which the parser loads as a
    base64 data: URL of its diagram MIME type (undefined for an image)  */
export const embeddedSource = (content: string): { language: DiagramLanguage, source: string } | undefined => {
    const m = content.match(/^data:text\/vnd\.(mermaid|d2);base64,(.*)$/s)
    return m !== null ?
        { language: m[1] as DiagramLanguage, source: Buffer.from(m[2], "base64").toString("utf8") } :
        undefined
}

/*  the key of an embedded diagram in the map of the rendered ones  */
export const diagramKey = (language: DiagramLanguage, source: string): string =>
    `${language}\u0000${source}`

/*  whether an embedded diagram of a language (a Mermaid/D2 one being of
    the type "code"), an image, or a code listing, carried by an object of
    a nesting level, is omitted (exactly like a Gradia diagram: by its
    type, or from an object tree nesting level on)  */
export const omittedDiagram = (language: DiagramLanguage | "image" | "listing", level: number,
    omit: Set<OmitAspect>): boolean =>
    omit.has(language === "image" ? "diagram:image" : language === "listing" ? "diagram:listing" : "diagram:code")
    || ([ 1, 2, 3 ] as const).some((n) => n <= level && omit.has(`diagram:${n}`))

/*  the object tree nesting levels of the objects of a specification
    (the top-level objects of an artifact being level 1)  */
export const objectLevels = (specification: Spec): Map<SpecObject, number> => {
    const levels = new Map<SpecObject, number>()
    const walk = (object: SpecObject, level: number) => {
        levels.set(object, level)
        for (const child of object.children)
            walk(child, level + 1)
    }
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            walk(object, 1)
    return levels
}

/*  an embedded diagram of a specification, with the object carrying it  */
interface EmbeddedDiagram {
    language: DiagramLanguage
    source:   string
    object:   SpecObject
    level:    number
}

/*  collect the embedded diagrams of an object and its descendants: the
    fenced code blocks of a diagram language inside its description
    statement and elaboration and the diagram source files embedded into
    its description and property values  */
const collect = (object: SpecObject, level: number, diagrams: EmbeddedDiagram[]) => {
    for (const text of [ object.description?.description ?? "", object.description?.elaboration ?? "" ])
        marked.walkTokens(marked.lexer(text), (token) => {
            const language = token.type === "code" ? fenceLanguage((token as Tokens.Code).lang) : undefined
            if (language !== undefined)
                diagrams.push({ language, source: (token as Tokens.Code).text, object, level })
        })
    const contents = [ ...object.description?.embedding ?? [],
        ...object.properties.flatMap((property) => property.embedding ?? []) ]
    for (const content of contents) {
        const embedded = embeddedSource(content)
        if (embedded !== undefined)
            diagrams.push({ ...embedded, object, level })
    }
    for (const child of object.children)
        collect(child, level + 1, diagrams)
}

/*  the colors of the Mermaid diagrams per theme style, picked out of the
    theme color spreads like the layer-2 mapping of the HTML rendering
    (Mermaid derives all further colors of a diagram from these)  */
const mermaidColors = (colors: ThemeColors, style: ThemeStyle): MermaidOptions => {
    const [ b, a ] = [ colors.base, colors.accent ]
    return style === "dark" ?
        { bg: b[6],  fg: b[28], line: b[21], accent: a[21], muted: b[21], surface: a[7],  border: a[13] } :
        { bg: b[31], fg: b[5],  line: b[21], accent: a[11], muted: b[21], surface: a[30], border: a[23] }
}

/*  the colors of the D2 diagrams per theme style, picked out of the
    theme color spreads after the shape of the D2 themes "Neutral
    Default" (light) and "Dark Mauve" (dark): the neutrals "N1" (text)
    to "N7" (background), the base colors "B1" (strokes) to "B6"
    (fills), and the alternative accents "AA*"/"AB*"  */
const d2Colors = (colors: ThemeColors, style: ThemeStyle): Record<string, string> => {
    const [ b, a, s ] = [ colors.base, colors.accent, colors.signal ]
    return style === "dark" ? {
        N1:  b[28], N2: b[25], N3: b[22], N4: b[13], N5: b[10], N6: b[8], N7: b[6],
        B1:  a[21], B2: a[21], B3: a[13], B4: a[10], B5: a[8],  B6: a[7],
        AA2: s[19], AA4: s[10], AA5: s[8], AB4: s[10], AB5: s[8]
    } : {
        N1:  b[3],  N2: b[13], N3: b[19], N4: b[25], N5: b[27], N6: b[29], N7: b[31],
        B1:  a[7],  B2: a[11], B3: a[27], B4: a[28], B5: a[29], B6: a[30],
        AA2: s[13], AA4: s[28], AA5: s[30], AB4: s[28], AB5: s[30]
    }
}

/*  render a Mermaid diagram, stripping the web font import the SVG
    carries, as an SVG embedded through an <img> never loads it and it
    would be the only external reference of the exported document  */
const renderMermaid = async (source: string, colors: MermaidOptions): Promise<string> => {
    const { renderMermaidSVG } = await import("beautiful-mermaid")
    return renderMermaidSVG(source, { ...colors, transparent: true, padding: 4 })
        .replace(/^\s*@import url\([^)]*\);\s*$/m, "")
}

/*  the D2 compiler, created on first use (as it spins up its WebAssembly
    build in a worker thread), and the chain of its requests, as it
    resolves just the latest pending one and hence has to be fed one
    request at a time: the worker is referenced during a request only,
    as it would otherwise keep the process alive forever  */
let d2:      Promise<D2> | null = null
let d2Chain: Promise<unknown>   = Promise.resolve()

/*  turn a D2 compile failure (a JSON-encoded list of the errors, whose
    source lines are shifted by the prepended theme line) into a message  */
const d2Error = (err: unknown): string => {
    const message = err instanceof Error ? err.message : String(err)
    try {
        return (JSON.parse(message) as { errmsg: string }[])
            .map((error) => error.errmsg.replace(/^index:(\d+):/,
                (_, line: string) => `line ${Number(line) - 1}:`))
            .join("; ")
    }
    catch {
        return message
    }
}

/*  render a D2 diagram, with the theme colors prepended as one line of
    theme overrides (on the theme of the style), so the overrides of the
    diagram itself still win  */
const renderD2 = (source: string, colors: Record<string, string>, style: ThemeStyle): Promise<string> => {
    const overrides = Object.entries(colors).map(([ key, color ]) => `${key}: "${color}"`).join("; ")
    const request = d2Chain.then(async () => {
        d2 ??= import("@terrastruct/d2").then((module) => new module.D2())
            .catch((err: unknown) => {
                d2 = null
                throw err
            })
        const compiler = await d2
        const worker   = () => (compiler as unknown as { worker?: Worker }).worker
        worker()?.ref()
        try {
            const result = await compiler.compile({
                fs:      { index: `vars: { d2-config: { theme-overrides: { ${overrides} } } }\n${source}` },
                options: { themeID: style === "dark" ? 200 : 0, scale: 1, pad: 0, noXMLTag: true }
            })
            return await compiler.render(result.diagram, result.renderOptions)
        }
        catch (err) {
            throw new Error(d2Error(err), { cause: err })
        }
        finally {
            worker()?.unref()
        }
    })
    d2Chain = request.catch(() => undefined)
    return request
}

/*  the in-memory cache of the rendered embedded diagrams, keyed by theme
    tone and diagram, and swept to the diagrams of the latest rendering,
    exactly like the one of the Gradia diagrams  */
let diagramCache = new Map<string, DiagramVariants>()

/*  render the embedded diagrams of a specification (the fenced code blocks
    of a diagram language and the embedded diagram source files) into their
    theme variants, drawn in the theme colors of the document and keyed by
    "diagramKey" (a rendering failure omits the diagram and is surfaced as
    a notice only, like the one of a Gradia diagram), served from the cache
    where possible; the omitted diagrams are skipped  */
export const renderEmbeddedDiagrams = async (specification: Spec,
    verbose?: Verbose, omit = new Set<OmitAspect>()): Promise<Map<string, DiagramVariants>> => {
    const diagrams = new Array<EmbeddedDiagram>()
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            collect(object, 1, diagrams)
    const tone     = documentThemeTone(specification) ?? themeToneDefault
    const colors   = themeColors(tone)
    const cache    = new Map<string, DiagramVariants>()
    const rendered = new Map<string, DiagramVariants>()
    const failed   = new Set<string>()
    let   cached   = 0
    for (const { language, source, object, level } of diagrams) {
        const key = diagramKey(language, source)
        if (rendered.has(key) || failed.has(key) || omittedDiagram(language, level, omit))
            continue
        let variants = diagramCache.get(`${tone}\u0000${key}`) ?? cache.get(`${tone}\u0000${key}`)
        if (variants !== undefined)
            cached++
        else {
            try {
                variants = language === "mermaid" ? {
                    light: await renderMermaid(source, mermaidColors(colors, "light")),
                    dark:  await renderMermaid(source, mermaidColors(colors, "dark"))
                } : {
                    light: await renderD2(source, d2Colors(colors, "light"), "light"),
                    dark:  await renderD2(source, d2Colors(colors, "dark"),  "dark")
                }
            }
            catch (err) {
                verbose?.(`rendering ${language} diagram of ${object.kind} ` +
                    `"${literal(plainText(object.name))}" failed: ` +
                    (err instanceof Error ? err.message : String(err)))
                failed.add(key)
                continue
            }
        }
        cache.set(`${tone}\u0000${key}`, variants)
        rendered.set(key, variants)
    }
    diagramCache = cache
    if (rendered.size > 0)
        verbose?.(cached === rendered.size ?
            `reusing ${literal(cached)} cached embedded diagram(s)` :
            `rendering ${literal(rendered.size)} embedded diagram(s) (${literal(cached)} cached)`)
    return rendered
}

