/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Spec, SpecObject }  from "./specbook-format-spec.js"
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
    transparency, the PNG is flattened onto the white of the paper)  */
const optimizeRaster = async (content: string, print: boolean): Promise<string> => {
    const m = content.match(/^data:(image\/(?:png|jpeg));base64,(.*)$/s)
    if (m === null)
        return content
    const { default: sharp } = await import("sharp")
    const image = sharp(Buffer.from(m[2], "base64"))
        .rotate()
        .resize({ width: maxWidth, withoutEnlargement: true })
    const webp = m[1] === "image/png" && !print
    const data = webp ?
        await image.webp({ quality }).toBuffer() :
        await image.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true }).toBuffer()
    const type = webp ? "image/webp" : "image/jpeg"
    return `data:${type};base64,${data.toString("base64")}`
}

/*  collect the embedded image contents of an object and its descendants
    (the empty entries of the unreadable files left out)  */
const collect = (object: SpecObject, contents: Set<string>) => {
    for (const content of object.description?.embedding ?? [])
        if (content !== "")
            contents.add(content)
    for (const property of object.properties)
        for (const content of property.embedding ?? [])
            if (content !== "")
                contents.add(content)
    for (const child of object.children)
        collect(child, contents)
}

/*  optimize the embedded images of a specification for the HTML export
    (the screen) or the PDF export (print), yielding the map from the
    embedded image contents onto their optimized ones, served from the
    cache where possible: an optimization which fails (an image the
    libraries cannot process, or a platform Sharp provides no binary
    for) or which does not shrink the image keeps the original, so the
    export never depends on it  */
export const optimizeImages = async (specification: Spec, print: boolean,
    verbose?: Verbose): Promise<Map<string, string>> => {
    const medium   = print ? "print" : "screen"
    const contents = new Set<string>()
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            collect(object, contents)
    const cache  = new Map<string, string>()
    let   cached = 0
    let   before = 0
    let   after  = 0
    for (const content of contents) {
        let optimized = imageCaches[medium].get(content)
        if (optimized !== undefined)
            cached++
        else {
            try {
                optimized = content.startsWith("data:") ?
                    await optimizeRaster(content, print) : await optimizeSvg(content)
            }
            catch {
                optimized = content
            }
            if (optimized.length >= content.length)
                optimized = content
        }
        cache.set(content, optimized)
        before += content.length
        after  += optimized.length
    }
    imageCaches[medium] = cache
    if (contents.size > 0)
        verbose?.(`optimizing ${literal(contents.size)} image(s) for ${medium} (${literal(cached)} cached): ` +
            `${literal(Math.round(before / 1024))} KB -> ${literal(Math.round(after / 1024))} KB`)
    return cache
}
