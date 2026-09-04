/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import fs
    from "node:fs"

import type { PDFDocument, PDFArray, PDFRef }
    from "pdf-lib"
import type { LaunchOptions }
    from "playwright"

import { escapeHtml, paperSetup, paperLength, paperSizeDefault }
    from "./specbook-export-common.js"
import type { OutlineEntry }
    from "./specbook-export-html.js"
import type { ThemeMapping }
    from "./specbook-theme.js"
import { literal, type Verbose }
    from "./specbook-verbose.js"

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
    named destinations and hoisting the children of an unresolvable entry  */
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
            if (!(dest instanceof PDFArray))
                continue
            const page = dest.get(0)
            if (page instanceof PDFRef && live.has(page.toString()))
                targets.set(name.decodeText(), dest)
        }
    }

    /*  resolve the outline entries against the live destinations,
        hoisting the children of an entry without a live destination  */
    type OutlineItem = { title: string, dest: PDFArray, children: OutlineItem[] }
    const resolve = (entries: OutlineEntry[]): OutlineItem[] =>
        entries.flatMap((entry) => {
            const dest   = targets.get(entry.anchor)
            const children = resolve(entry.children)
            return dest !== undefined ? [ { title: entry.title, dest, children } ] : children
        })
    const items = resolve(entries)
    if (items.length === 0)
        return

    /*  recursively materialize the outline items, wiring up the
        Parent/Prev/Next/First/Last cross-references of the tree  */
    const materialize = (items: OutlineItem[], parent: PDFRef) => {
        const refs = items.map(() => context.nextRef())
        items.forEach((item, i) => {
            const children = item.children.length > 0 ? materialize(item.children, refs[i]) : undefined
            context.assign(refs[i], context.obj({
                Title:  PDFHexString.fromText(item.title),
                Parent: parent,
                Prev:   i > 0                ? refs[i - 1] : undefined,
                Next:   i < refs.length - 1  ? refs[i + 1] : undefined,
                First:  children?.first,
                Last:   children?.last,

                /*  a negative count keeps the sub-tree initially collapsed  */
                Count:  children !== undefined ? -item.children.length : undefined,
                Dest:   item.dest
            }))
        })
        return { first: refs[0], last: refs[refs.length - 1] }
    }
    const root = context.nextRef()
    const top  = materialize(items, root)
    context.assign(root, context.obj({
        Type:  "Outlines",
        First: top.first,
        Last:  top.last,
        Count: items.length
    }))
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
    left:    string,
    right:   string
): { headerTemplate: string, footerTemplate: string } => {
    const fontFace = css.match(/@font-face\s*\{[^}]*\}/)?.[0] ?? ""
    const subtitle = heading.subtitle?.trim()
    const headText = escapeHtml(heading.title) +
        (subtitle !== undefined && subtitle !== "" ? ` &mdash; ${escapeHtml(subtitle)}` : "")
    return {
        headerTemplate:
            `<style>${fontFace}</style>` +
            "<div style=\"width: 100%; margin-top: 0.8cm;\">" +
            `<div style="margin: 0 ${right} 0 ${left}; ` +
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
            `<div style="margin: 0 ${right} 0 ${left}; ` +
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

/*  the launch options of the Chromium-class browser printing the PDF,
    resolved just once per process, as probing a system-installed Google
    Chrome has to actually launch it and as the export preflight and the
    renderer both ask for the very same browser  */
let browserOptions: Promise<LaunchOptions | undefined> | undefined

/*  resolve the browser printing the PDF: the downloaded Playwright
    Chromium is a plain file check, while a system-installed Google
    Chrome is only detectable by launching it  */
const resolveBrowser = async (verbose: Verbose): Promise<LaunchOptions | undefined> => {
    const { chromium } = await import("playwright")
    let executable = ""
    try {
        executable = chromium.executablePath()
    }
    catch {
        /*  Playwright knows no Chromium distribution at all  */
    }
    if (executable !== "" && fs.existsSync(executable))
        return {}
    try {
        const chrome = await chromium.launch({ channel: "chrome" })
        await chrome.close()
        verbose("Playwright Chromium unavailable -- falling back to the " +
            "system-installed Google Chrome", "notice")
        return { channel: "chrome" }
    }
    catch {
        return undefined
    }
}

/*  ensure a browser printing the PDF is available, so a missing browser
    fails the export early and with an actionable remedy instead of deep
    inside the rendering and with a Playwright-internal message  */
export const requireBrowser = async (verbose: Verbose): Promise<LaunchOptions> => {
    browserOptions ??= resolveBrowser(verbose)
    const options = await browserOptions
    if (options === undefined)
        throw new Error("the PDF export requires a Chromium-class browser, but neither the " +
            "Playwright Chromium nor a system-installed Google Chrome was found -- run " +
            `"${literal("npx playwright install chromium")}" once to download the Playwright Chromium`)
    return options
}

/*  the bound of the ToC page number fixpoint iteration, as the page
    number column itself shifts the pagination and hence the iteration
    can oscillate instead of ever reaching a stable rendering  */
const tocPasses = 3

/*  render a self-contained HTML document into a PDF via Playwright,
    re-rendering the HTML with the discovered ToC page numbers  */
export const htmlToPdf = async (
    renderHtmlPass: (tocPages?: Map<string, number>) => Promise<string>,
    heading:        Heading,
    outline:        OutlineEntry[],
    titlePage:      boolean,
    verbose:        Verbose,
    css:            string,
    theme:          ThemeMapping,
    paper           = paperSizeDefault
): Promise<Buffer> => {
    const { chromium } = await import("playwright")

    /*  the page geometry of the chosen paper size  */
    const setup  = paperSetup(paper)
    const margin = setup.margin

    /*  launch the browser resolved for this process  */
    const browser = await chromium.launch(await requireBrowser(verbose))
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
            re-render until the HTML is stable (bounded to "tocPasses"
            passes), as the ToC page number column itself can shift
            the pagination  */
        verbose("determining ToC page numbers")
        let html   = await renderHtmlPass()
        let plain  = await renderPdf(html)
        let stable = false
        for (let i = 0; i < tocPasses && !stable; i++) {
            const next = await renderHtmlPass(await anchorPages(plain))
            stable = next === html
            if (!stable) {
                html  = next
                plain = await renderPdf(html)
            }
        }

        /*  report an unconverged iteration, as the ToC then carries the
            page numbers of a pagination other than the final one and
            would otherwise ship silently wrong page numbers  */
        if (!stable)
            verbose(`the ToC page numbers did not stabilize within ${literal(tocPasses)} ` +
                "passes -- they can be off by a page", "notice")

        /*  render the final document, decorated with header/footer  */
        const decorated = await renderPdf(html, {
            displayHeaderFooter: true,
            ...decorationTemplates(heading, css, theme,
                paperLength(setup, margin.left), paperLength(setup, margin.right))
        })

        /*  a title page carries no header/footer: as Chromium decorates
            all pages unconditionally, swap the first page of the
            identically paginated undecorated document (left over from
            the ToC page number iteration) into the decorated document
            *in place*, which keeps the decorated document's link
            destinations (and hence the internal hyperlinks) intact  */
        const { PDFDocument } = await import("pdf-lib")
        const merged = await PDFDocument.load(decorated)
        if (titlePage) {
            const source = await PDFDocument.load(plain)
            const [ first ] = await merged.copyPages(source, [ 0 ])
            merged.removePage(0)
            merged.insertPage(0, first)
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
