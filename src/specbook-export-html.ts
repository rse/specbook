/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { Gradia } from "@rse/gradia"

import type { Spec, SpecObject }
    from "./specbook-format-spec.js"
import type { Schema, SchemaObject }
    from "./specbook-format-schema.js"
import { buildLinkIndex, anchorPaths, plainText }
    from "./specbook-link.js"
import { stylesheet, searchScript, isTitleObject, titleObject,
    documentTitle, documentLang, documentThemeStyle,
    type ExportOptions, type OmitAspect }
    from "./specbook-export-common.js"
import { collectSchemas }
    from "./specbook-parse-semantic.js"
import { renderDiagrams }
    from "./specbook-diagram.js"
import { optimizeImages, analyzeImages }
    from "./specbook-export-image.js"
import { renderEmbeddedDiagrams, objectLevels }
    from "./specbook-export-diagram.js"
import { prepareListings }
    from "./specbook-export-code.js"
import { specCoverage }
    from "./specbook-coverage.js"
import type { Verbose }
    from "./specbook-verbose.js"
import { safe, render }
    from "./specbook-export-html-template.js"
import { themeScript, placeholderStylesheet, realtimeScript, scrollProgressScript,
    maximizeScript, tocPanelScript, infoScript, type InfoEntry, type SpecEntry }
    from "./specbook-export-html-script.js"
import { foldScript, omittedControls }
    from "./specbook-export-html-fold.js"
import { withDocument, makeLinker, collectInfo, collectSpec, collectMembers,
    conciseGroup, flowChildren, groupChildren, formatDate,
    renderTitlePage, renderArtifact, tocEntries, renderTocPanel }
    from "./specbook-export-html-render.js"

/*  ==== Outline ====  */

/*  an entry of the hierarchical document outline  */
export type OutlineEntry = { title: string, anchor: string, children: OutlineEntry[] }

/*  derive the hierarchy of the rendered object headings, skipping the
    title page object and the child groups collapsing into compact tables  */
export const htmlOutline = (specification: Spec,
    config?: Schema): OutlineEntry[] => {
    const paths     = anchorPaths(buildLinkIndex(specification))
    const schemaMap = config !== undefined ? collectSchemas(specification, config) : null
    const entry = (object: SpecObject): OutlineEntry => ({
        title:    (object.kind !== "" ? `${object.kind}: ` : "") + plainText(object.name),
        anchor:   paths.get(object) ?? object.id,
        children: groupChildren(flowChildren(object))
            .filter((group) => !conciseGroup(group, schemaMap, false))
            .flatMap((group) => group.map(entry))
    })
    return specification.artifacts
        .filter((artifact) => !artifact.objects.some(isTitleObject))
        .flatMap((artifact) => artifact.objects)
        .map(entry)
}

/*  determine the object a title page is rendered from: the title object
    has to carry a non-empty "TITLE" property, as without it there is
    nothing to render a title page from (the object stays suppressed in
    the regular flow nevertheless)  */
export const titlePageObject = (specification: Spec): SpecObject | undefined => {
    const object = titleObject(specification)
    const title  = object?.properties.find((property) => property.key === "TITLE")
    return title !== undefined && title.value.trim() !== "" ? object : undefined
}

/*  pre-render the configured diagrams as embeddable SVGs, displayed
    at a reduced coordinate scale, as the Gradia geometry (node
    boxes, font sizes) is dimensioned for a stand-alone canvas and
    would dwarf the document text at 1:1: the scale renders the node
    names (30 units) at 15px, about the size of the document text, so a
    diagram narrower than its container is no longer blown up beyond
    the zoom level of the diagrams the container width caps anyway. The
    <style> elements are stripped off the diagrams and the union of
    their CSS rules is returned for the document stylesheet instead, as
    Gradia names a class after its declarations and hence hundreds of
    diagrams repeat the very same few rules (which are XML-escaped
    inside an SVG, but plain text inside the HTML <style> element,
    which no unescaped "</" of a configured value may close)  */
const scaledDiagrams = async (specification: Spec, config: Schema,
    verbose?: Verbose, omit?: Set<OmitAspect>): Promise<{ svgs: Map<SpecObject, string>, css: string }> => {
    const scale    = 0.5
    const rendered = new Map<SpecObject, string>()
    const rules    = new Set<string>()
    const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"" }
    for (const [ object, result ] of await renderDiagrams(specification, config, verbose, omit)) {
        const svg = result.svg.replace(/<style>([\s\S]*?)<\/style>\s*/g, (_, css: string) => {
            for (const rule of css.split("\n"))
                if (rule.trim() !== "")
                    rules.add(rule.trim()
                        .replace(/&(amp|lt|gt|quot);/g, (_, name: string) => entities[name])
                        .replace(/<\//g, "<\\/"))
            return ""
        })

        /*  a "hub" diagram is capped to the width share it would
            occupy on its full three-column canvas (padded by the
            minimum widths of the absent columns and their channels),
            so all hub diagrams share the zoom level of the
            three-column ones, the leftover space splitting evenly, as
            the stylesheet centers every diagram  */
        const absent = result.columns !== undefined ? 3 - result.columns : 0
        const pad    = absent * (
            (result.config?.["size-node-width-min"]  ?? Gradia.config["size-node-width-min"]) +
            (result.config?.["hub-channel-width-min"] ?? Gradia.config["hub-channel-width-min"]))
        rendered.set(object, svg.replace(/(<svg[^>]*) width="([0-9.]+)" height="([0-9.]+)"/,
            (_, head: string, w: string, h: string) =>
                `${head} width="${Number(w) * scale}" height="${Number(h) * scale}"` +
                (absent > 0 ? ` style="max-width: ${(Number(w) / (Number(w) + pad) * 100).toFixed(2)}%"` : "")))
    }
    return { svgs: rendered, css: Array.from(rules).join("\n") }
}

/*  render the placeholder page of the live preview, served instead of
    the document before the first successful export: it carries the very
    same client-side script as the regular export, so the page recovers
    on its own -- as the usual in-place document update -- once the
    specification becomes exportable, plus a <style> element and the
    color theme script the update expects to find in the head  */
export const renderPlaceholder = (message: string): string =>
    render("Placeholder", { Placeholder: {
        title:       "SpecBook",
        css:         safe(placeholderStylesheet),
        themescript: safe(themeScript),
        realtime:    safe(realtimeScript),
        message
    } })

/*  wrap the pre-rendered diagrams into their blocks, carrying the
    diagram type and the object tree nesting level the folding
    distinguishes (the top-level objects of an artifact being level 1)  */
const wrapDiagrams = (svgs: Map<SpecObject, string>,
    schemas: Map<SpecObject, SchemaObject> | null, levels: Map<SpecObject, number>): Map<SpecObject, string> => {
    const blocks = new Map<SpecObject, string>()
    for (const [ object, svg ] of svgs) {
        const level = levels.get(object) ?? 1
        const type  = schemas?.get(object)?.diagram?.type ?? "graph"
        blocks.set(object, `<div class="diagram" data-type="${type}" data-level="${level}">${svg}</div>`)
    }
    return blocks
}

/*  render the entire specification into a self-contained HTML document,
    with the build-time pre-assembled stylesheet embedded inline, the
    artifact timestamps aggregated into min(Created)/max(Modified),
    optional per-anchor page numbers attached to the ToC entries,
    optionally the client-side script of the live preview injected and
    aspects omitted (see "ExportOptions"), the embedded images
    optimized for the screen or for print (the PDF), and the embedded
    Mermaid/D2 diagrams rendered in the theme colors  */
export const renderHtml = async (specification: Spec, config?: Schema,
    tocPages?: Map<string, number>, css?: string, options: ExportOptions = {},
    verbose?: Verbose, print = false): Promise<string> => {
    /*  pre-render the configured diagrams as scaled embeddable SVGs
        (except for the omitted ones, which hence leave no trace at all)  */
    const omit     = options.omit ?? new Set<OmitAspect>()
    const rendered = config !== undefined ?
        await scaledDiagrams(specification, config, verbose, omit) : null

    /*  the fold controls and the extra style rules of the omitted aspects  */
    const { omitted, css: omitCss } = omittedControls(omit)

    /*  pre-optimize the embedded images (downscaled and re-encoded)
        and judge the raster ones for their treatment on the dark theme  */
    const optimized = await optimizeImages(specification, print, verbose)
    const analyzed  = await analyzeImages(specification, verbose)

    /*  pre-render the embedded Mermaid/D2 diagrams (except the omitted ones)
        and prepare the syntax highlighting of the code listings  */
    const sources  = await renderEmbeddedDiagrams(specification, verbose, omit)
    const renderer = await prepareListings(specification, verbose)

    /*  collect the per-document rendering state, where the description
        popup keys are filled in below, once the state is established  */
    const index       = buildLinkIndex(specification)
    const schemas     = config !== undefined ? collectSchemas(specification, config) : null
    const levels      = objectLevels(specification)
    const infoKeys    = new Map<SchemaObject, string>()
    const infoObjects = new Map<SpecObject, string>()

    /*  wrap the diagrams into their blocks, carrying the diagram type
        and the object tree nesting level the folding distinguishes  */
    const diagrams = rendered !== null ? wrapDiagrams(rendered.svgs, schemas, levels) : null

    /*  the document language selects the smart typography quote style  */
    const lang = documentLang(specification)

    /*  establish the per-document rendering state (released again
        afterwards, also on a failure of the collecting or rendering)  */
    return withDocument({
        lang,
        linker:      makeLinker(index),
        anchors:     anchorPaths(index),
        members:     config !== undefined ? collectMembers(config, new Map()) : null,
        schemas,
        diagrams,
        images:      optimized,
        rasters:     analyzed,
        embedded:    sources,
        listings:    renderer,
        levels,
        coverages:   schemas !== null ? specCoverage(index, schemas) : null,
        infoKeys:    config !== undefined ? infoKeys : null,
        infoObjects: config !== undefined ? infoObjects : null,
        omits:       omit
    }, () => {
        /*  collect the schema descriptions for the description popups,
            plus the object table composing their title paths  */
        let info: InfoEntry[] | null = null
        const spec: SpecEntry[] = []
        if (config !== undefined) {
            info = []
            collectInfo(config, infoKeys, info)
            for (const node of index) {
                infoObjects.set(node.object, String(node.pos))
                spec.push([ node.object.id, node.parent?.pos ?? -1,
                    node.object.kind, plainText(node.object.name).trim(), "" ])
            }

            /*  collect the corpus descriptions of the object instances for the
                description popups (after the object table, as the
                pre-rendered descriptions expand their references, too)  */
            for (const artifact of specification.artifacts)
                collectSpec(artifact.objects, spec)
        }

        /*  the artifact timestamps aggregate into the earliest creation
            and the latest modification timestamp of the document  */
        const created  = new Date(Math.min(
            ...specification.artifacts.map((artifact) => artifact.created.getTime())))
        const modified = new Date(Math.max(
            ...specification.artifacts.map((artifact) => artifact.modified.getTime())))

        /*  a "META: Title" object becomes the title page and leaves the regular
            flow, while its diagram becomes the "Diagram of Contents" page  */
        const title     = titlePageObject(specification)
        const artifacts = specification.artifacts
            .filter((artifact) => !artifact.objects.some(isTitleObject))
        const meta      = titleObject(specification)
        const doc       = meta !== undefined ? diagrams?.get(meta) : undefined
        const objects   = artifacts.flatMap((artifact) => artifact.objects)
        const entries   = tocEntries(objects, tocPages)
        return render("Document", { Document: {
            title:       documentTitle(specification).title,
            lang,
            theme:       documentThemeStyle(specification),
            css:         safe((css ?? stylesheet()) + (rendered !== null ? `\n${rendered.css}` : "") + omitCss),
            themescript: safe(themeScript),
            titlepage:   title !== undefined ?
                safe(renderTitlePage(title,
                    formatDate(created), formatDate(modified))) : "",
            search:      safe(searchScript()),
            progress:    safe(scrollProgressScript),
            omitted,
            fold:        safe(foldScript(omit.size > 0, omitted.text)),
            maximize:    safe(maximizeScript),
            info:        info !== null ? safe(infoScript(info, spec)) : "",
            realtime:    options.realtime === true ? safe(realtimeScript) : "",
            toc:         entries.length > 0 ? safe(render("Toc", { Toc: { entries } })) : "",
            tocpanel:    entries.length > 0 ?
                safe(renderTocPanel(objects,
                    title !== undefined, doc !== undefined)) : "",
            tocscript:   entries.length > 0 ? safe(tocPanelScript) : "",
            doc:         doc !== undefined ? safe(render("Doc", { Doc: { diagram: safe(doc) } })) : "",
            artifacts:   safe(artifacts.map((artifact) => renderArtifact(artifact)).join(""))
        } })
    })
}
