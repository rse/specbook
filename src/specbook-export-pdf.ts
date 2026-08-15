/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { escapeHtml, stylesheet }
    from "./specbook-export-common.js"

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

/*  render a self-contained HTML document into a PDF via Playwright,
    re-rendering the HTML with the discovered ToC page numbers  */
export const htmlToPdf = async (renderHtmlPass: (tocPages?: Map<string, number>) => string,
    heading: { title: string, subtitle?: string },
    verbose: (msg: string) => void): Promise<Buffer> => {
    const { chromium } = await import("playwright")

    /*  the regular font face and the title/subtitle
        text for the header/footer templates  */
    const fontFace = stylesheet().match(/@font-face\s*\{[^}]*\}/)?.[0] ?? ""
    const headText = escapeHtml(heading.title) +
        (heading.subtitle !== undefined ? ` &mdash; ${escapeHtml(heading.subtitle)}` : "")

    /*  launch the Playwright Chromium browser, falling back to a
        system-installed Google Chrome if the Chromium download is missing  */
    let browser
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
        const renderPdf = async (html: string, options: object = {}) => {
            await page.setContent(html, { waitUntil: "networkidle" })
            await page.evaluate(() => document.fonts.ready)
            return page.pdf({
                format:            "A4",
                margin:            { top: "2.5cm", right: "2cm", bottom: "2.5cm", left: "2cm" },
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
        let html  = renderHtmlPass()
        let plain = await renderPdf(html)
        for (let i = 0; i < 3; i++) {
            const next = renderHtmlPass(await anchorPages(plain))
            if (next === html)
                break
            html  = next
            plain = await renderPdf(html)
        }

        const decorated = await renderPdf(html, {
            /*  the header/footer templates render in an isolated context,
                so they need their own inline styling, the regular font face
                embedded as a data: URI, and the special "title"/"pageNumber"
                classes for the injected values  */
            displayHeaderFooter: true,
            headerTemplate:
                `<style>${fontFace}</style>` +
                "<div style=\"width: 100%; margin-top: 0.8cm;\">" +
                "<div style=\"margin: 0 2cm; " +
                "font-family: 'Source Sans 3', sans-serif; " +
                "font-size: 8pt; color: #c0c0c0; border-bottom: 1px solid #d0d0d0; " +
                "padding-bottom: 1mm; display: flex; justify-content: space-between;\">" +
                `<span>${headText}</span>` +
                "<span class=\"pageNumber\" style=\"color: #303030\"></span></div></div>",
            footerTemplate:
                `<style>${fontFace}</style>` +
                "<div style=\"width: 100%; margin-bottom: 0.8cm;\">" +
                "<div style=\"margin: 0 2cm; " +
                "font-family: 'Source Sans 3', sans-serif; " +
                "font-size: 8pt; color: #303030; display: flex; " +
                "justify-content: space-between; border-top: 1px solid #d0d0d0; " +
                "padding-top: 1mm;\">" +
                `<span style="color: #c0c0c0">${headText}</span>` +
                "<span style=\"color: #999999; font-weight: bold;\" class=\"pageNumber\"></span></div></div>"
        })

        /*  a title page carries no header/footer: as Chromium decorates
            all pages unconditionally, swap the first page of the
            identically paginated undecorated document (left over from
            the ToC page number iteration) into the decorated document
            *in place*, which keeps the decorated document's link
            destinations (and hence the internal hyperlinks) intact  */
        const { PDFDocument, rgb } = await import("pdf-lib")
        const merged = await PDFDocument.load(decorated)
        if (html.includes("class=\"titlepage\"")) {
            const source = await PDFDocument.load(plain)
            const [ titlePage ] = await merged.copyPages(source, [ 0 ])
            merged.removePage(0)
            merged.insertPage(0, titlePage)
        }

        /*  draw the vertical brand bar onto the left edge of the
            physical paper of every page, as Chromium clips print
            content to the page box (0.6rem at the 9pt print root)  */
        for (const pdfPage of merged.getPages())
            pdfPage.drawRectangle({ x: 0, y: 0, width: 5.4,
                height: pdfPage.getHeight(), color: rgb(0.2, 0.4, 0.6) })
        return Buffer.from(await merged.save())
    }
    finally {
        await browser.close()
    }
}
