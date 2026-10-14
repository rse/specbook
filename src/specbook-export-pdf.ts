/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs
    from "node:fs"

import type { PDFDocument, PDFPage, PDFArray, PDFRef }
    from "pdf-lib"
import type { LaunchOptions }
    from "playwright"

import { escapeHtml, paperSetup, paperLength, paperSizeDefault }
    from "./specbook-export-common.js"
import type { OutlineEntry, PrintDocument }
    from "./specbook-export-html.js"
import type { ThemeMapping }
    from "./specbook-theme.js"
import { literal, type Verbose }
    from "./specbook-verbose.js"

/*  the document heading rendered into the page decoration  */
type Heading = { title: string, subtitle?: string, logo: string }

/*  extract the per-anchor page numbers from a Chromium-generated PDF,
    which records the internal link targets as named PDF destinations  */
const anchorPages = async (doc: PDFDocument): Promise<Map<string, number>> => {
    const { PDFName, PDFDict, PDFArray, PDFRef } = await import("pdf-lib")
    const indexes = new Map<string, number>()
    doc.getPages().forEach((page, index) => indexes.set(page.ref.toString(), index + 1))

    /*  map every named destination onto the page number of its target  */
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
    const resolve = (list: OutlineEntry[]): OutlineItem[] =>
        list.flatMap((entry) => {
            const dest     = targets.get(entry.anchor)
            const children = resolve(entry.children)
            return dest !== undefined ? [ { title: entry.title, dest, children } ] : children
        })
    const items = resolve(entries)
    if (items.length === 0)
        return

    /*  recursively materialize the outline items, wiring up the
        Parent/Prev/Next/First/Last cross-references of the tree  */
    const materialize = (list: OutlineItem[], parent: PDFRef) => {
        const refs = list.map(() => context.nextRef())
        list.forEach((item, i) => {
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
    resolved just once per process (a failed resolution excepted, so a
    long-running process retries after the remedy), as probing a
    system-installed Google Chrome has to actually launch it and as the
    export preflight and the renderer both ask for the very same browser  */
let browserOptions: Promise<LaunchOptions | undefined> | undefined

/*  the remedy of an unavailable Playwright Chromium, shared by the
    fallback notice and the missing-browser error, as both have to point
    at the very same one-time command  */
const chromiumRemedy =
    `run "${literal("npx playwright install chromium")}" once to download the Playwright Chromium`

/*  resolve the browser printing the PDF: an explicitly configured one
    wins, then the downloaded Playwright Chromium as a plain file check,
    while a system-installed Google Chrome is only detectable by
    launching it  */
const resolveBrowser = async (verbose: Verbose): Promise<LaunchOptions | undefined> => {
    const { chromium } = await import("playwright")

    /*  an explicitly configured browser is taken as an executable path
        once it carries a path separator and as a Playwright channel
        name otherwise, and it never falls back onto another browser, as
        an explicit choice has to be either honored or reported  */
    const configured = process.env.SPECBOOK_BROWSER ?? ""
    if (configured !== "") {
        const options: LaunchOptions = /[\\/]/.test(configured) ?
            { executablePath: configured } : { channel: configured }
        try {
            const browser = await chromium.launch(options)
            await browser.close()
        }
        catch (err) {
            throw new Error(`the browser "${literal(configured)}" configured by ` +
                `"${literal("SPECBOOK_BROWSER")}" failed to launch`, { cause: err })
        }
        verbose(`using the browser "${literal(configured)}" configured by ` +
            `"${literal("SPECBOOK_BROWSER")}"`)
        return options
    }

    /*  prefer the downloaded Playwright Chromium and
        else probe a system-installed Google Chrome  */
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
            `system-installed Google Chrome (${chromiumRemedy})`, "none")
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
    const options = await browserOptions.catch((err: unknown) => {
        browserOptions = undefined
        throw err
    })
    if (options === undefined) {
        browserOptions = undefined
        throw new Error("the PDF export requires a Chromium-class browser, but neither the " +
            `Playwright Chromium nor a system-installed Google Chrome was found -- ${chromiumRemedy}`)
    }
    return options
}

/*  the bound of the ToC page count fixpoint iteration, as the page
    number column itself shifts the pagination of the table of contents
    and hence the iteration can oscillate instead of ever reaching a
    stable rendering  */
const tocPasses = 3

/*  the placeholder origin of the links of the separately paginated
    table of contents, which Chromium would drop as internal links
    without their targets in the same document, so they are turned into
    external ones and back into internal ones once merged into the body  */
const tocOrigin = "https://toc.invalid/"

/*  turn the placeholder links of the merged table of contents pages back
    into internal links onto the named destinations of the document  */
const relinkPages = async (pages: PDFPage[]) => {
    const { PDFName, PDFDict, PDFString, PDFHexString } = await import("pdf-lib")
    for (const page of pages) {
        const annots = page.node.Annots()
        if (annots === undefined)
            continue
        for (let i = 0; i < annots.size(); i++) {
            const annot  = annots.lookup(i, PDFDict)
            const action = annot.lookupMaybe(PDFName.of("A"), PDFDict)
            const uri    = action?.lookupMaybe(PDFName.of("URI"), PDFString, PDFHexString)?.decodeText()
            if (uri === undefined || !uri.startsWith(`${tocOrigin}#`))
                continue
            annot.delete(PDFName.of("A"))
            annot.set(PDFName.of("Dest"), PDFName.of(uri.slice(tocOrigin.length + 1)))
        }
    }
}

/*  render a self-contained HTML document into a PDF via Playwright: the
    body of the document is paginated just once, the table of contents
    apart from it (re-rendered with the page numbers of the body until
    its own page count is stable) and merged in front of the body (right
    behind a title page), and the page decoration (header/footer, with
    page numbers counting all pages) is rendered as a document of empty
    pages laid over the merged pages (except a title page), as only that
    renders the page numbers of the body behind the table of contents  */
export const htmlToPdf = async (
    print:     PrintDocument,
    heading:   Heading,
    outline:   OutlineEntry[],
    titlePage: boolean,
    verbose:   Verbose,
    css:       string,
    theme:     ThemeMapping,
    paper      = paperSizeDefault
): Promise<Buffer> => {
    const { chromium }    = await import("playwright")
    const { PDFDocument } = await import("pdf-lib")

    /*  the page geometry of the chosen paper size  */
    const setup  = paperSetup(paper)
    const margin = setup.margin

    /*  launch the browser resolved for this process  */
    const browser = await chromium.launch(await requireBrowser(verbose))
    try {
        const page = await browser.newPage()

        /*  render an HTML document into a paginated PDF, optionally with
            its internal links turned into placeholder ones  */
        const renderPdf = async (html: string,
            options: NonNullable<Parameters<typeof page.pdf>[0]> = {}, external = false) => {
            await page.setContent(html, { waitUntil: "load", timeout: 0 })
            await page.evaluate(() => document.fonts.ready)
            if (external)
                await page.evaluate((origin) => {
                    document.querySelectorAll("a[href^='#']").forEach((a) => {
                        a.setAttribute("href", origin + a.getAttribute("href"))
                    })
                }, tocOrigin)
            return PDFDocument.load(await page.pdf({
                format:            paper,
                margin:            {
                    top:    paperLength(setup, margin.top),
                    right:  paperLength(setup, margin.right),
                    bottom: paperLength(setup, margin.bottom),
                    left:   paperLength(setup, margin.left) },
                printBackground:   true,
                preferCSSPageSize: true,
                ...options
            }))
        }

        /*  paginate the body of the document just once  */
        verbose("paginating document body")
        const doc = await renderPdf(print.body)

        /*  determine the page count of the table of contents via a
            fixpoint iteration: render it with the page numbers of the
            body shifted by the assumed page count of itself (where only
            a title page stays in front of it) and re-render until the
            assumption holds (bounded to "tocPasses" passes)  */
        const front  = titlePage ? 1 : 0
        const render = print.toc
        if (render !== null) {
            verbose("paginating table of contents")
            const anchors  = await anchorPages(doc)
            const paginate = (count: number) => renderPdf(render(new Map(Array.from(anchors,
                ([ anchor, number ]) => [ anchor, number > front ? number + count : number ]))), {}, true)
            let count = 0
            let toc   = await paginate(count)
            for (let i = 0; i < tocPasses && toc.getPageCount() !== count; i++) {
                count = toc.getPageCount()
                toc   = await paginate(count)
            }

            /*  report an unconverged iteration, as the ToC then carries the
                page numbers of a pagination other than the final one and
                would otherwise ship silently wrong page numbers  */
            if (toc.getPageCount() !== count)
                verbose(`the ToC page numbers did not stabilize within ${literal(tocPasses)} ` +
                    "passes -- they can be off by a page", "none")

            /*  merge the table of contents into the body (keeping the
                named destinations of the body and hence its internal
                hyperlinks intact) and link its entries to them  */
            const pages = await doc.copyPages(toc, toc.getPageIndices())
            pages.forEach((merged, i) => { doc.insertPage(front + i, merged) })
            await relinkPages(pages)
        }

        /*  render the page decoration onto all pages except a title page,
            which carries no header/footer, as the decoration of empty
            pages laid over the pages  */
        verbose("decorating pages with header and footer")
        const count = doc.getPageCount()
        const decoration = await renderPdf("<!DOCTYPE html><html><head><style>" +
            "div { height: 1px } div + div { break-before: page }</style></head><body>" +
            "<div></div>".repeat(count) + "</body></html>", {
            displayHeaderFooter: true,
            printBackground:     false,
            ...decorationTemplates(heading, css, theme,
                paperLength(setup, margin.left), paperLength(setup, margin.right))
        })
        if (decoration.getPageCount() !== count)
            throw new Error(`page decoration paginated into ${decoration.getPageCount()} ` +
                `instead of ${count} pages`)
        const indices  = doc.getPageIndices().slice(front)
        const overlays = await doc.embedPages(indices.map((index) => decoration.getPage(index)))
        indices.forEach((index, i) => { doc.getPage(index).drawPage(overlays[i]) })

        /*  attach the document outline for the viewer side-bar  */
        verbose("attaching PDF outline (bookmarks)")
        await addOutline(doc, outline)

        /*  decorate every page with the vertical brand bar  */
        await drawBrandBar(doc, theme.accent)
        return Buffer.from(await doc.save())
    }
    finally {
        await browser.close()
    }
}
