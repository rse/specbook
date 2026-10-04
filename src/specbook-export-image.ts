/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as path                  from "node:path"
import { createRequire }          from "node:module"

import type { Spec, SpecObject }  from "./specbook-format-spec.js"
import { embeddedSource }         from "./specbook-export-diagram.js"
import { embeddedListing }        from "./specbook-export-code.js"
import { svgInvertible }          from "./specbook-export-common.js"
import { darkMark, markDark, pdfType } from "./specbook-parse-common.js"
import { plainText }              from "./specbook-link.js"
import { literal, type Verbose }  from "./specbook-verbose.js"

/*  the pixel width the raster images are capped to: the 60rem content
    width of the document (at 16px per rem) at a 2x device pixel ratio  */
const maxWidth = 60 * 16 * 2

/*  the lossy encoding quality of the re-encoded raster images  */
const quality = 85

/*  the in-memory caches of the optimized images (one per target medium,
    as the two optimize a PNG differently), keyed by the embedded image
    content and swept to the images of the latest optimization for the
    medium, so they serve the repeated renderings of a process (watch,
    preview, MCP, and the passes and formats of a single export) without
    growing over a long-running one  */
const imageCaches = {
    screen: new Map<string, string>(),
    print:  new Map<string, string>()
}

/*  whether an embedded content is a page of a PDF document, which is
    converted into an SVG image and then treated exactly like one  */
export const isDocument = (content: string): boolean =>
    darkMark(content).content.startsWith(`data:${pdfType};`)

/*  render the selected page of a PDF document (given as its embedding
    data: URL carrying the 1-based "page" parameter, the first by default)
    with PDF.js onto an SVG canvas of @napi-rs/canvas, i.e. as vector
    graphics with the glyphs drawn as outlines, where PDF.js takes the
    standard fonts, CMaps, ICC profiles, and WebAssembly decoders of
    non-self-contained documents from its own package  */
const renderPdf = async (content: string): Promise<string> => {
    const page = Number(content.match(/^data:[^,]*?;page=(\d+)[;,]/)?.[1] ?? "1")
    const data = content.slice(content.indexOf(",") + 1)
    const { getDocument }                 = await import("pdfjs-dist/legacy/build/pdf.mjs")
    const { createCanvas, SvgExportFlag } = await import("@napi-rs/canvas")
    const dir  = path.dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"))
    const task = getDocument({ data: new Uint8Array(Buffer.from(data, "base64")), verbosity: 0,
        standardFontDataUrl: `${dir}/standard_fonts/`, cMapUrl: `${dir}/cmaps/`,
        iccUrl: `${dir}/iccs/`, wasmUrl: `${dir}/wasm/` })
    try {
        const doc = await task.promise
        if (page < 1 || page > doc.numPages)
            throw new Error(`document has no page ${page}`)
        const sheet    = await doc.getPage(page)
        const viewport = sheet.getViewport({ scale: 1 })
        const canvas   = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height),
            SvgExportFlag.NoPrettyXML)
        await sheet.render({ viewport,
            canvas:        canvas as unknown as HTMLCanvasElement,
            canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D }).promise
        return canvas.getContent().toString("utf8")
    }
    finally {
        await task.destroy()
    }
}

/*  the in-memory cache of the SVG renderings of the embedded PDF pages
    (null for a failed one), keyed by their plain embedded content and
    swept to the pages of the latest conversion, like the optimized images  */
let documentCache = new Map<string, string | null>()

/*  convert the embedded PDF pages of a specification into SVG images,
    served from the cache where possible, where a rendering failure (e.g.
    an absent page) is surfaced as a notice only and omits the page  */
const convertDocuments = async (specification: Spec, verbose?: Verbose) => {
    const cache = new Map<string, string | null>()
    const walk  = async (object: SpecObject) => {
        const contents = [ ...object.description?.embedding ?? [],
            ...object.properties.flatMap((property) => property.embedding ?? []) ]
        for (const plain of contents.filter(isDocument).map((content) => darkMark(content).content)) {
            if (cache.has(plain))
                continue
            let svg = documentCache.get(plain)
            if (svg === undefined)
                svg = await renderPdf(plain).catch((err: unknown) => {
                    verbose?.(`rendering PDF page of ${object.kind} "${literal(plainText(object.name))}" failed: ` +
                        (err instanceof Error ? err.message : String(err)))
                    return null
                })
            cache.set(plain, svg)
        }
        for (const child of object.children)
            await walk(child)
    }
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            await walk(object)
    documentCache = cache
}

/*  optimize a single SVG image with SVGO (the identifiers and classes
    are free to be minified, as the image is rendered in isolation
    through an <img> element), after stripping the "content" attribute
    draw.io leaves on the root element: it carries the entire
    entity-escaped diagram source, which is needless for the rendering
    and exceeds the entity limit of the SVGO parser (an SVG which SVGO
    still rejects stays just stripped)  */
const optimizeSvg = async (content: string): Promise<string> => {
    const stripped = content.replace(/(<svg\b[^>]*?)\s+content="[^"]*"/, "$1")
    try {
        const { optimize } = await import("svgo")
        return optimize(stripped, { multipass: true }).data
    }
    catch {
        return stripped
    }
}

/*  optimize a single raster image given as a base64 data: URL with
    Sharp: an image wider than the cap is downscaled and a JPEG stays a
    JPEG, while a PNG is converted to WebP for the screen and to JPEG
    for print, as Chromium passes just this format through into the PDF
    unchanged and embeds every other one losslessly (as JPEG knows no
    transparency, the image is flattened onto the white of the paper); a
    WebP is treated like a PNG, but for the screen one within the cap
    stays untouched, as re-encoding it again would just degrade it  */
const optimizeRaster = async (content: string, print: boolean): Promise<string> => {
    const m = content.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/s)
    if (m === null)
        return content
    const { default: sharp } = await import("sharp")
    const source = sharp(Buffer.from(m[2], "base64"))
    if (m[1] === "image/webp" && !print && ((await source.metadata()).width ?? 0) <= maxWidth)
        return content
    const image = source
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
    const webp = m[1] !== "image/jpeg" && !print
    const data = webp ?
        await image.webp({ quality }).toBuffer() :
        await image.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true }).toBuffer()
    const type = webp ? "image/webp" : "image/jpeg"
    return `data:${type};base64,${data.toString("base64")}`
}

/*  collect the embedded image contents of an object and its descendants
    (the empty entries of the unreadable files, the embedded diagram
    sources, which are rendered instead, and the embedded source code
    files, which are listed instead, left out)  */
const isImage = (content: string): boolean =>
    content !== "" && embeddedSource(content) === undefined && embeddedListing(content) === undefined
const collect = (object: SpecObject, contents: Set<string>) => {
    for (const content of object.description?.embedding ?? [])
        if (isImage(content))
            contents.add(content)
    for (const property of object.properties)
        for (const content of property.embedding ?? [])
            if (isImage(content))
                contents.add(content)
    for (const child of object.children)
        collect(child, contents)
}

/*  optimize the embedded images of a specification (the PDF pages as
    their converted SVGs, a failed one left out) for the HTML export
    (the screen) or the PDF export (print), yielding the map from the
    embedded image contents onto their optimized ones, served from the
    cache where possible: an optimization which fails (an image the
    libraries cannot process, or a platform Sharp provides no binary
    for) or which does not shrink the image keeps the original, so the
    export never depends on it  */
export const optimizeImages = async (specification: Spec, print: boolean,
    verbose?: Verbose): Promise<Map<string, string>> => {
    /*  collect the distinct embedded image contents of the specification
        and convert its PDF pages  */
    await convertDocuments(specification, verbose)
    const medium   = print ? "print" : "screen"
    const contents = new Set<string>()
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            collect(object, contents)

    /*  optimize every image the cache of the medium cannot serve (an
        optimization which fails or does not shrink keeps the original),
        accounting the sizes for the report below  */
    const cache  = new Map<string, string>()
    let   cached = 0
    let   before = 0
    let   after  = 0
    for (const content of contents) {
        const plain    = darkMark(content)
        const document = isDocument(content) ? documentCache.get(plain.content) ?? null : undefined
        if (document === null)
            continue
        let optimized = imageCaches[medium].get(content)
        if (optimized !== undefined)
            cached++
        else {
            try {
                /*  an image marked with its treatment on the dark theme is
                    optimized plain and marked again, a PDF page as its SVG  */
                optimized = document !== undefined ? await optimizeSvg(document) :
                    plain.content.startsWith("data:") ?
                        await optimizeRaster(plain.content, print) : await optimizeSvg(plain.content)
                if (plain.dark !== undefined)
                    optimized = markDark(optimized, plain.dark)
            }
            catch (err) {
                verbose?.("optimizing image failed (keeping the original): " +
                    (err instanceof Error ? err.message : String(err)))
                optimized = document !== undefined ? document : content
            }
            if (document === undefined && optimized.length >= content.length)
                optimized = content
        }
        cache.set(content, optimized)
        before += content.length
        after  += optimized.length
    }

    /*  sweep the cache of the medium to the images of this
        optimization and report its figures  */
    imageCaches[medium] = cache
    if (contents.size > 0)
        verbose?.((cached === contents.size ?
            `reusing ${literal(cached)} cached image(s) for ${medium}: ` :
            `optimizing ${literal(contents.size)} image(s) for ${medium} (${literal(cached)} cached): `) +
            `${literal(Math.round(before / 1024))} KB -> ${literal(Math.round(after / 1024))} KB`)
    return cache
}

/*  the in-memory cache of the "auto" judgements of the raster images,
    keyed by the embedded image content and swept to the images of the
    latest analysis, exactly like the optimized images  */
let rasterCache = new Map<string, boolean>()

/*  whether a raster image (given as a base64 data: URL) is most likely
    dark ink on a transparent or light canvas and hence safe to invert on
    the dark theme ("dark=auto"), judged on a downscaled copy of its
    pixels: at least 60% of them are transparent or near-white (the
    canvas), the others (the ink) exist, are dark on average, and consist
    of a few colors only (the quantized colors holding at least 2% of the
    ink cover at least 85% of it), unlike a photo or a colorful screenshot  */
const rasterInvertible = async (content: string): Promise<boolean> => {
    const m = content.match(/^data:image\/(?:png|jpeg|webp);base64,(.*)$/s)
    if (m === null)
        return false
    const { default: sharp } = await import("sharp")
    const { data, info } = await sharp(Buffer.from(m[1], "base64"))
        .resize({ width: 128, height: 128, fit: "inside", withoutEnlargement: true })
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let canvas = 0
    let ink    = 0
    let luma   = 0
    const bins = new Map<number, number>()
    for (let p = 0; p < data.length; p += info.channels) {
        const [ r, g, b, a ] = [ data[p], data[p + 1], data[p + 2], data[p + 3] ]
        if (a < 32 || Math.min(r, g, b) >= 235)
            canvas++
        else {
            ink++
            luma += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
            const bin = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
            bins.set(bin, (bins.get(bin) ?? 0) + 1)
        }
    }
    const few = Array.from(bins.values()).filter((n) => n >= ink * 0.02).reduce((sum, n) => sum + n, 0)
    return ink > 0 && canvas / (canvas + ink) >= 0.6 && luma / ink < 0.6 && few >= ink * 0.85
}

/*  judge the raster images and PDF pages of a specification without an
    explicit treatment on the dark theme for the "auto" one, yielding the
    map from their embedded contents onto whether they are invertible,
    served from the cache where possible (an image Sharp cannot process
    and a failed PDF page count as not invertible), where a PDF page is
    judged on its converted SVG like an SVG image  */
export const analyzeImages = async (specification: Spec, verbose?: Verbose): Promise<Map<string, boolean>> => {
    await convertDocuments(specification, verbose)
    const contents = new Set<string>()
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            collect(object, contents)
    const cache = new Map<string, boolean>()
    for (const content of contents) {
        if (!content.startsWith("data:") || darkMark(content).dark !== undefined)
            continue
        if (isDocument(content)) {
            const document = documentCache.get(content)
            cache.set(content, typeof document === "string" && svgInvertible(document))
        }
        else
            cache.set(content, rasterCache.get(content) ?? await rasterInvertible(content).catch(() => false))
    }
    rasterCache = new Map(Array.from(cache).filter(([ content ]) => !isDocument(content)))
    return cache
}
