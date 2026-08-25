/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { PDFDocument, PDFArray, PDFRef }
    from "pdf-lib"
import type { Browser }
    from "playwright"

import { escapeHtml, paperSetup, paperLength, paperSizeDefault }
    from "./specbook-export-common.js"
import type { OutlineEntry }
    from "./specbook-export-html.js"
import type { ThemeMapping }
    from "./specbook-theme.js"

/*  the document heading rendered into the page decoration  */
type Heading = { title: string, subtitle?: string, logo: string }

/*  extract the per-anchor page numbers from a Chromium-generated PDF,
    which records the internal link targets as named PDF destinations  */
const anchorPages = async (pdf: Uint8Array): Promise<Map<string, number>> => {
    const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef } = await import("pdf-lib")
    const doc = await PDFDocument.load(pdf)
    const indexes = new Map<string, number>()
    doc.getPages().forEach((page, index) => indexes.set(page.ref.toString(), index + 1))
    const pages = new Map<string, number>()
    const dests = doc.catalog.lookupMaybe(PDFName.of("Dests"), PDFDict)
    if (dests !== undefined) {
        for (const [ name ] of dests.entries()) {
            const dest   = dests.lookup(name)
            const target = dest instanceof PDFArray ? dest.get(0) : undefined
            const page   = target instanceof PDFRef ? indexes.get(target.toString()) : undefined
            if (page !== undefined)
                pages.set(name.decodeText(), page)
        }
    }
    return pages
}

/*  attach a hierarchical PDF outline (the "bookmarks" of the viewer
    side-bar) to a document, resolving the entry anchors against the
    named destinations and hoisting the childs of an unresolvable entry  */
const addOutline = async (doc: PDFDocument, entries: OutlineEntry[]) => {
    const { PDFName, PDFDict, PDFArray, PDFRef, PDFHexString } = await import("pdf-lib")
    const context = doc.context

    /*  collect the still intact named destinations  */
    const live    = new Set(doc.getPages().map((page) => page.ref.toString()))
    const targets = new Map<string, PDFArray>()
    const dests   = doc.catalog.lookupMaybe(PDFName.of("Dests"), PDFDict)
    if (dests !== undefined) {
        for (const [ name ] of dests.entries()) {
            const dest = dests.lookup(name)
            const page = dest instanceof PDFArray ? dest.get(0) : undefined
            if (dest instanceof PDFArray && page instanceof PDFRef && live.has(page.toString()))
                targets.set(name.decodeText(), dest)
        }
    }

    /*  resolve the outline entries against the live destinations,
        hoisting the childs of an entry without a live destination  */
    type OutlineItem = { title: string, dest: PDFArray, childs: OutlineItem[] }
    const resolve = (entries: OutlineEntry[]): OutlineItem[] =>
        entries.flatMap((entry) => {
            const dest   = targets.get(entry.anchor)
            const childs = resolve(entry.childs)
            return dest !== undefined ? [ { title: entry.title, dest, childs } ] : childs
        })
    const items = resolve(entries)
    if (items.length === 0)
        return

    /*  recursively materialize the outline items, wiring up the
        Parent/Prev/Next/First/Last cross-references of the tree  */
    const materialize = (items: OutlineItem[], parent: PDFRef) => {
        const refs = items.map(() => context.nextRef())
        items.forEach((item, i) => {
            const childs = item.childs.length > 0 ? materialize(item.childs, refs[i]) : undefined
            context.assign(refs[i], context.obj({
                Title:  PDFHexString.fromText(item.title),
                Parent: parent,
                Prev:   i > 0                ? refs[i - 1] : undefined,
                Next:   i < refs.length - 1  ? refs[i + 1] : undefined,
                First:  childs?.first,
                Last:   childs?.last,

                /*  a negative count keeps the sub-tree initially collapsed  */
                Count:  childs !== undefined ? -item.childs.length : undefined,
                Dest:   item.dest
            }))
        })
        return { first: refs[0], last: refs[refs.length - 1] }
    }
    const root = context.nextRef()
    const top  = materialize(items, root)
    context.assign(root, context.obj({
        Type: "Outlines", First: top.first, Last: top.last, Count: items.length }))
    doc.catalog.set(PDFName.of("Outlines"), root)
    doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"))
}

/*  render the header/footer templates for the page decoration: they
    render in an isolated context, so they need their own inline styling,
    the regular font face embedded as a data: URI, and the special
    "pageNumber" class for the injected page number  */
const decorationTemplates = (
    heading: Heading,
    css:     string,
    theme:   ThemeMapping,
    inset:   string
): { headerTemplate: string, footerTemplate: string } => {
    const fontFace = css.match(/@font-face\s*\{[^}]*\}/)?.[0] ?? ""
    const subtitle = heading.subtitle?.trim()
    const headText = escapeHtml(heading.title) +
        (subtitle !== undefined && subtitle !== "" ? ` &mdash; ${escapeHtml(subtitle)}` : "")
    return {
        headerTemplate:
            `<style>${fontFace}</style>` +
            "<div style=\"width: 100%; margin-top: 0.8cm;\">" +
            `<div style="margin: 0 ${inset}; ` +
            "font-family: 'Source Sans 3', sans-serif; " +
            `font-size: 8pt; color: ${theme.symbol}; border-bottom: 1px solid ${theme.border}; ` +
            "padding-bottom: 1mm; display: flex; justify-content: space-between; " +
            "align-items: flex-end;\">" +
            `<span>${headText}</span>` +
            `<img src="${escapeHtml(heading.logo)}" alt="" style="height: 3.5mm;"/>` +
            "</div></div>",
        footerTemplate:
            `<style>${fontFace}</style>` +
            "<div style=\"width: 100%; margin-bottom: 0.8cm;\">" +
            `<div style="margin: 0 ${inset}; ` +
            "font-family: 'Source Sans 3', sans-serif; " +
            `font-size: 8pt; color: ${theme.symbol}; display: flex; ` +
            `justify-content: space-between; border-top: 1px solid ${theme.border}; ` +
            "padding-top: 1mm;\">" +
            `<span>${headText}</span>` +
            `<span style="color: ${theme.muted}; font-weight: bold;" class="pageNumber"></span></div></div>`
    }
}

/*  draw the vertical brand bar onto the left edge of the physical
    paper of every page, as Chromium clips print content to the page
    box (0.6rem at the 9pt print root)  */
const drawBrandBar = async (doc: PDFDocument, accent: string) => {
    const { rgb } = await import("pdf-lib")
    const hex = accent.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
    const [ r, g, b ] = (hex !== null ? hex.slice(1) : [ "00", "00", "00" ])
        .map((component) => parseInt(component, 16) / 255)
    for (const page of doc.getPages())
        page.drawRectangle({ x: 0, y: 0, width: 5.4,
            height: page.getHeight(), color: rgb(r, g, b) })
}

/*  render a self-contained HTML document into a PDF via Playwright,
    re-rendering the HTML with the discovered ToC page numbers  */
export const htmlToPdf = async (
    renderHtmlPass: (tocPages?: Map<string, number>) => Promise<string>,
    heading:        Heading,
    outline:        OutlineEntry[],
    verbose:        (msg: string) => void,
    css:            string,
    theme:          ThemeMapping,
    paper:          string = paperSizeDefault
): Promise<Buffer> => {
    const { chromium } = await import("playwright")

    /*  the page geometry of the chosen paper size  */
    const setup  = paperSetup(paper)
    const margin = setup.margin

    /*  launch the Playwright Chromium browser, falling back to a
        system-installed Google Chrome if the Chromium download is missing  */
    let browser: Browser
    try {
        browser = await chromium.launch()
    }
    catch (err) {
        verbose("Playwright Chromium unavailable -- falling back to installed Google Chrome")
        try {
            browser = await chromium.launch({ channel: "chrome" })
        }
        catch {
            /*  report the original, more instructive error  */
            throw err
        }
    }
    try {
        const page = await browser.newPage()

        /*  render an HTML document into a paginated PDF  */
        const renderPdf = async (html: string,
            options: NonNullable<Parameters<typeof page.pdf>[0]> = {}) => {
            await page.setContent(html, { waitUntil: "networkidle" })
            await page.evaluate(() => document.fonts.ready)
            return page.pdf({
                format:            paper,
                margin:            {
                    top:    paperLength(setup, margin.top),
                    right:  paperLength(setup, margin.right),
                    bottom: paperLength(setup, margin.bottom),
                    left:   paperLength(setup, margin.left) },
                printBackground:   true,
                preferCSSPageSize: true,
                ...options
            })
        }

        /*  determine the ToC page numbers via a fixpoint iteration:
            paginate undecorated, extract the per-anchor pages, and
            re-render until the HTML is stable, as the ToC page number
            column itself can shift the pagination  */
        verbose("determining ToC page numbers")
        let html  = await renderHtmlPass()
        let plain = await renderPdf(html)
        for (let i = 0; i < 3; i++) {
            const next = await renderHtmlPass(await anchorPages(plain))
            if (next === html)
                break
            html  = next
            plain = await renderPdf(html)
        }

        /*  render the final document, decorated with header/footer  */
        const decorated = await renderPdf(html, {
            displayHeaderFooter: true,
            ...decorationTemplates(heading, css, theme, paperLength(setup, margin.left))
        })

        /*  a title page carries no header/footer: as Chromium decorates
            all pages unconditionally, swap the first page of the
            identically paginated undecorated document (left over from
            the ToC page number iteration) into the decorated document
            *in place*, which keeps the decorated document's link
            destinations (and hence the internal hyperlinks) intact  */
        const { PDFDocument } = await import("pdf-lib")
        const merged = await PDFDocument.load(decorated)
        if (html.includes("class=\"titlepage\"")) {
            const source = await PDFDocument.load(plain)
            const [ titlePage ] = await merged.copyPages(source, [ 0 ])
            merged.removePage(0)
            merged.insertPage(0, titlePage)
        }

        /*  attach the document outline for the viewer side-bar  */
        verbose("attaching PDF outline (bookmarks)")
        await addOutline(merged, outline)

        /*  decorate every page with the vertical brand bar  */
        await drawBrandBar(merged, theme.accent)
        return Buffer.from(await merged.save())
    }
    finally {
        await browser.close()
    }
}
