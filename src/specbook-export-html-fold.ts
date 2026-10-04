/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type nunjucks from "nunjucks"
import textframe     from "textframe"

import type { OmitAspect }
    from "./specbook-export-common.js"
import { safe }
    from "./specbook-export-html-template.js"

/*  ==== Folding & Omitting ====  */

/*  the default percentage by which the text of a table cell may exceed
    the height of every other cell of its row before it folds (or is
    omitted), overridden per object kind by "maxCellHeight", and the
    minimum percentage of its own height a cell has to gain by that,
    shared by the client-side folding and the server-side omitting  */
const cellHeightDefault = 40
const cellGainMin       = 25

/*  the client-side script of the folding: it wraps every diagram of the
    content into a fold container carrying a chevron mark at its top
    left corner, folds the text of every table cell towering over the
    other cells of its row behind a chevron mark of its own, and lets
    the controls of the fold tab fold and unfold all diagrams of a type
    ("graph", "hub", "grid", plus the embedded Mermaid/D2 ones as "code",
    the embedded images and PDF pages as "image", and the code listings
    as "listing"), all diagrams from an object tree nesting level on
    (1, 2, 3), and all cell texts at once, with their state
    persisted across page loads and their icons marked while they are
    active (the diagram ones, OR-combined) or any cell text is folded
    (the tab icon while anything at all is). The script runs at
    the end of the body, as the content it wraps has to exist already,
    and a live preview body swap replaces the containers and their
    listeners along with the body. An export omitting aspects lacks
    their controls ("standins" lets detached elements take their place)
    and, with the long texts omitted, folds no cell text ("textless")  */
export const foldScript = (standins: boolean, textless: boolean) => textframe`
    (function () {
        const tab = document.querySelector("div.fold-switch")
        if (tab === null)
            return
        const controls = {
            graph:   tab.querySelector("div.fold-graphs"),
            hub:     tab.querySelector("div.fold-hubs"),
            grid:    tab.querySelector("div.fold-grids"),
            code:    tab.querySelector("div.fold-codes"),
            image:   tab.querySelector("div.fold-images"),
            listing: tab.querySelector("div.fold-listings"),
            level1:  tab.querySelector("div.fold-level1"),
            level2:  tab.querySelector("div.fold-level2"),
            level3:  tab.querySelector("div.fold-level3"),
            text:    tab.querySelector("div.fold-texts")
        }${standins ? `
        for (const kind of Object.keys(controls))
            controls[kind] ??= document.createElement("div")` : ""}

        /*  let the fold icon slide the controls out of the tab (and
            back in again), remembering the choice across page loads  */
        try { if (localStorage.getItem("specbook-fold") === "open") tab.classList.add("open") }
        catch { /*  an inaccessible storage just means no stored state  */ }
        tab.querySelector("div.fold-toggle").addEventListener("click", () => {
            tab.classList.toggle("open")
            try { localStorage.setItem("specbook-fold", tab.classList.contains("open") ? "open" : "closed") }
            catch { /*  an inaccessible storage just loses the state  */ }
        })

        /*  the default percentage by which the text of a table cell may
            exceed the height of every other cell of its row before it
            folds, overridden per object kind by the "data-fold-height"
            attribute the schema configuration puts onto its table  */
        const cellHeight = ${cellHeightDefault}

        /*  the chevron mark of a foldable element, rotated by the
            stylesheet while the element is folded  */
        const svgNS = "http://www.w3.org/2000/svg"
        const mark = (name, title) => {
            const span = document.createElement("span")
            span.className = name
            span.title = title
            const svg = document.createElementNS(svgNS, "svg")
            svg.setAttribute("viewBox", "0 0 24 24")
            svg.setAttribute("fill", "none")
            svg.setAttribute("stroke", "currentColor")
            svg.setAttribute("stroke-width", "2.5")
            svg.setAttribute("stroke-linecap", "round")
            svg.setAttribute("stroke-linejoin", "round")
            const path = document.createElementNS(svgNS, "path")
            path.setAttribute("d", "M5 9l7 7 7-7")
            svg.appendChild(path)
            span.appendChild(svg)
            return span
        }

        /*  wrap every diagram into its fold container, carrying the
            chevron mark plus the muted placeholder the diagram leaves
            behind while folded, which is the very icon of its type
            control; a diagram joins the set of its type plus the sets
            of all nesting levels up to its own one (3 standing for all
            deeper ones), so the sets of the controls overlap  */
        const folds = { graph: [], hub: [], grid: [], code: [], image: [], listing: [],
            level1: [], level2: [], level3: [], text: [] }
        document.querySelectorAll("article div.diagram, nav.doc div.diagram").forEach((el) => {
            const type  = el.getAttribute("data-type") ?? "graph"
            const level = Math.min(Number(el.getAttribute("data-level")) || 1, 3)
            const fold  = document.createElement("div")
            fold.className = "fold"
            el.parentNode.insertBefore(fold, el)
            const chevron = mark("fold-mark", "fold/unfold this diagram")
            const label   = document.createElement("span")
            label.className = "fold-label"
            label.appendChild(controls[type].querySelector("svg").cloneNode(true))
            fold.append(chevron, label, el)
            chevron.addEventListener("click", () => {
                fold.classList.toggle("folded")
                sync()
            })
            folds[type].push(fold)
            for (let n = 1; n <= level; n++)
                folds["level" + n].push(fold)
        })

        /*  the rendered height of the content of a table cell, or of its
            leading part up to a word position: a cell box itself always
            spans the whole row, so only a range over the content
            measures the text  */
        const range = document.createRange()
        const height = (cell, upto) => {
            if (upto === undefined)
                range.selectNodeContents(cell)
            else {
                range.setStart(cell, 0)
                range.setEnd(upto.node, upto.offset)
            }
            return range.getBoundingClientRect().height
        }

        /*  the word positions of a table cell, each right behind one word  */
        const positions = (cell) => {
            const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
            const list = []
            let node
            while ((node = walker.nextNode()) !== null) {
                const regex = /\\S+/g
                let m
                while ((m = regex.exec(node.nodeValue ?? "")) !== null)
                    list.push({ node, offset: m.index + m[0].length })
            }
            return list
        }

        /*  a cell taking part in the comparison of its row: one with
            content of its own, i.e. neither empty (a not given property
            draws its marker through the stylesheet alone) nor holding
            further cells (a chunked or nested table, whose own cells are
            compared instead) nor a diagram (which folds on its own and
            whose SVG text cannot carry the wrapper of a hidden
            remainder)  */
        const candidate = (cell) =>
            cell.querySelector("td") === null
            && cell.querySelector("div.diagram") === null
            && (cell.textContent.trim() !== "" || cell.querySelector("img") !== null)

        /*  hide a node of the folded remainder of a table cell: an
            element carries the class itself, a text node gets wrapped  */
        const rest = (node) => {
            if (node.nodeType === Node.ELEMENT_NODE)
                node.classList.add("fold-rest")
            else if (node.nodeType === Node.TEXT_NODE) {
                const span = document.createElement("span")
                span.className = "fold-rest fold-wrap"
                node.parentNode.insertBefore(span, node)
                span.appendChild(node)
            }
        }

        /*  take the cut of a table cell back again: the chevron mark
            leaves, the remainder sheds its class or wrapper, and the
            split text nodes merge  */
        const uncut = (cell) => {
            cell.classList.remove("folded")
            cell.querySelectorAll("span.fold-more").forEach((el) => { el.remove() })
            cell.querySelectorAll(".fold-rest").forEach((el) => {
                if (el.classList.contains("fold-wrap"))
                    el.replaceWith(...el.childNodes)
                else
                    el.classList.remove("fold-rest")
            })
            cell.normalize()
        }

        /*  the minimum percentage of its own height a cell has to gain
            by folding, as hiding less than that is no visible relief
            and only costs the reader a chevron to click (measured after
            the cut, as the chevron itself can claim a line of its own)  */
        const cellGain = ${cellGainMin}

        /*  lay out the text folds, which holds for the current line
            breaks only and hence is redone on every change of them: the
            previous cuts are taken back, with their fold state carried
            over (a cell folding anew follows the others)  */
        const layout = () => {${textless ? `
            return` : ""}
            const all = folds.text.length > 0 && folds.text.every((cell) => cell.classList.contains("folded"))
            const state = new Map(folds.text.map((cell) => [ cell, cell.classList.contains("folded") ]))
            folds.text.forEach(uncut)
            folds.text.length = 0

            /*  decide which table cells fold: one which is taller than the
                configured percentage above every other cell of its row (the
                leading name column of a compact table excluded, as it is no
                text of its own). All rows are measured before the first cut,
                as every cut shifts the layout of the ones still to come  */
            const cuts = []
            document.querySelectorAll("article table tr").forEach((row) => {
                const table = row.closest("table")
                let cells = Array.from(row.children).filter((el) => el.tagName === "TD")
                if (!table.classList.contains("chunks"))
                    cells = cells.slice(1)
                cells = cells.filter(candidate)
                if (cells.length < 2)
                    return
                const configured = row.closest("table[data-fold-height]")
                const percent = Number(configured?.getAttribute("data-fold-height")) || cellHeight
                const heights = cells.map((cell) => height(cell))
                cells.forEach((cell, i) => {
                    const other = Math.max(...heights.filter((_, j) => j !== i))
                    const limit = other * (1 + percent / 100)
                    if (heights[i] > limit)
                        cuts.push({ cell, limit, full: heights[i] })
                })
            })

            /*  fold the decided cells back onto their height limit: the last
                word position still fitting is found by a binary search over
                the measured word positions, the text node is split there and
                the chevron mark takes its place, followed by the remainder
                hidden up the ancestor chain of the cell  */
            for (const cut of cuts) {
                const list = positions(cut.cell)
                if (list.length === 0)
                    continue
                let lo = 0
                let hi = list.length - 1
                while (lo < hi) {
                    const mid = Math.ceil((lo + hi) / 2)
                    if (height(cut.cell, list[mid]) <= cut.limit)
                        lo = mid
                    else
                        hi = mid - 1
                }
                const tail    = list[lo].node.splitText(list[lo].offset)
                const chevron = mark("fold-more", "fold/unfold the remaining text")
                tail.parentNode.insertBefore(chevron, tail)
                let current = chevron
                while (current !== cut.cell) {
                    let next = current.nextSibling
                    while (next !== null) {
                        const following = next.nextSibling
                        rest(next)
                        next = following
                    }
                    current = current.parentNode
                }

                /*  the gain is measured on the applied fold, as only that
                    one tells the real one, and a fold gaining less than the
                    minimum share is taken back again, while a kept fold
                    sheds the class again, as every cell starts out unfolded  */
                cut.cell.classList.add("folded")
                const gained = height(cut.cell) <= cut.full * (1 - cellGain / 100)
                if (!gained) {
                    uncut(cut.cell)
                    continue
                }
                cut.cell.classList.toggle("folded", state.get(cut.cell) ?? all)
                folds.text.push(cut.cell)
                chevron.addEventListener("click", (event) => {
                    /*  the cut can land inside a hyperlink, whose navigation
                        the chevron has to suppress for its own click alone,
                        so the remaining link text still follows the link  */
                    event.preventDefault()
                    cut.cell.classList.toggle("folded")
                    sync()
                })
            }
        }
        layout()

        /*  mark the text control while any cell text is folded, a diagram
            control while it is active itself (as the sets of the diagram
            controls overlap, the fold state of their diagrams tells
            nothing), and the tab itself while anything at all is folded  */
        const active = new Set()
        const sync = () => {
            for (const kind of Object.keys(folds))
                controls[kind].classList.toggle("folded", kind === "text" ?
                    folds.text.some((fold) => fold.classList.contains("folded")) : active.has(kind))
            tab.classList.toggle("folded", Object.keys(folds).some((kind) =>
                folds[kind].some((fold) => fold.classList.contains("folded"))))
        }

        /*  fold exactly the diagrams at least one active control covers  */
        const apply = () => {
            folds.level1.forEach((fold) => {
                fold.classList.toggle("folded", Array.from(active).some((kind) => folds[kind].includes(fold)))
            })
        }

        /*  without a stored state the rendered one stands, which is
            everything unfolded: the cell texts store their state as a
            whole, the diagrams as the list of their active controls  */
        const stored = { text: null, diagrams: null }
        for (const name of Object.keys(stored)) {
            try { stored[name] = localStorage.getItem("specbook-fold-" + name) }
            catch { /*  an inaccessible storage just means no stored state  */ }
        }
        if (stored.text !== null)
            folds.text.forEach((fold) => { fold.classList.toggle("folded", stored.text === "folded") })
        if (stored.diagrams !== null) {
            stored.diagrams.split(",").filter((kind) => kind !== "text" && Object.hasOwn(folds, kind))
                .forEach((kind) => { active.add(kind) })
            apply()
        }
        for (const kind of Object.keys(folds)) {
            controls[kind].addEventListener("click", () => {
                try {
                    if (kind === "text") {
                        const all = !folds.text.every((fold) => fold.classList.contains("folded"))
                        folds.text.forEach((fold) => { fold.classList.toggle("folded", all) })
                        localStorage.setItem("specbook-fold-text", all ? "folded" : "unfolded")
                    }
                    else {
                        if (!active.delete(kind))
                            active.add(kind)
                        apply()
                        localStorage.setItem("specbook-fold-diagrams", Array.from(active).join(","))
                    }
                }
                catch { /*  an inaccessible storage just loses the state  */ }
                sync()
            })
        }
        sync()

        /*  redo the text folds once the line breaks change, which a new
            viewport width and the arrival of the embedded fonts (still
            loading while this script runs) cause. A running search
            (which shows the remainders) defers it, and a live preview
            body swap, which left this script behind, ends it  */
        let width = document.documentElement.clientWidth
        let timer = 0
        const relayout = () => {
            if (!tab.isConnected)
                return
            if (document.body.classList.contains("searching")) {
                schedule()
                return
            }
            layout()
            sync()
        }
        const schedule = () => {
            clearTimeout(timer)
            timer = setTimeout(relayout, 250)
        }
        const resized = () => {
            if (!tab.isConnected)
                window.removeEventListener("resize", resized)
            else if (width !== document.documentElement.clientWidth) {
                width = document.documentElement.clientWidth
                schedule()
            }
        }
        window.addEventListener("resize", resized)
        document.fonts.ready.then(() => {
            if (tab.isConnected)
                schedule()
        })
    })()
`

/*  the estimated number of characters a text line spanning the
    entire content width holds (60rem at the document font)  */
const lineChars = 140

/*  omit the long texts of the comparable cells of a table row, the
    server-side heuristic counterpart of the client-side cell text
    folding, judging a cell by its estimated number of text lines (its
    plain text per block, wrapped at the characters its column width
    share holds per line) instead of its rendered height: a cell
    exceeding every other one by more than the "maxCellHeight"
    percentage is cut back onto the whole lines of that limit (less the
    room of the mark) at a word boundary, its open elements closed
    again, and ends in a grey "[...]" mark, unless that hides less than
    25% of it, where the empty cells and the ones carrying further cells
    or a diagram take no part at all  */
export const omitLong = (omit: Set<OmitAspect> | null,
    cells: nunjucks.runtime.SafeString[], shares: number[], percent = 0) => {
    if (omit?.has("text:long") !== true)
        return cells
    const htmls   = cells.map(String)
    const plain   = (html: string) => html.replace(/<[^>]*>/g, "").trim().length
    const lengths = htmls.map((html) => (/<td[\s>]|<div class="diagram"/).test(html) ? 0 : plain(html))
    if (lengths.filter((length) => length > 0).length < 2)
        return cells
    const chars = shares.map((share) => Math.max(1, Math.floor(lineChars * share)))
    const lines = htmls.map((html, i) => lengths[i] === 0 ? 0 :
        html.split(/<\/(?:p|li|div|pre)>|<br\s*\/?>/)
            .reduce((sum, block) => sum + Math.ceil(plain(block) / chars[i]), 0))
    return htmls.map((html, i) => {
        const other = Math.max(...lines.filter((_, j) => j !== i)) *
            (1 + (percent > 0 ? percent : cellHeightDefault) / 100)
        const limit = Math.floor(other) * chars[i] - " [...]".length
        if (lines[i] === 0 || lines[i] <= other || limit > lengths[i] * (1 - cellGainMin / 100))
            return cells[i]
        const open  = new Array<string>()
        let   out   = ""
        let   count = 0
        for (const [ token ] of html.matchAll(/<[^>]*>|[^<]+/g)) {
            if (token.startsWith("<")) {
                const tag = (/^<(\/?)([a-zA-Z][^\s/>]*)[^>]*?(\/?)>$/).exec(token)
                if (tag?.[1] === "/")
                    open.pop()
                else if (tag !== null && tag[3] !== "/" && !(/^(?:br|hr|img|input|wbr)$/).test(tag[2]))
                    open.push(tag[2])
            }
            else if (count + token.length > limit)
                return safe(out + token.slice(0, limit - count).replace(/\S*$/, "") +
                    "<span class=\"omit\">[...]</span>" +
                    open.reverse().map((name) => `</${name}>`).join(""))
            else
                count += token.length
            out += token
        }
        return cells[i]
    })
}

/*  the fold controls the omitted aspects drop, along with the implied
    ones (no type control without diagrams of that type, no level
    control without diagrams from that level on, no fold tab without
    any control, which lets the tabs below it move up), plus the extra
    style rules the omission brings (the "[...]" mark of the omitted
    long texts and the moved-up tabs of a dropped fold tab)  */
export const omittedControls = (omit: Set<OmitAspect>) => {
    const none    = omit.has("diagram:1")
        || (omit.has("diagram:graph") && omit.has("diagram:hub") && omit.has("diagram:grid")
            && omit.has("diagram:code") && omit.has("diagram:image") && omit.has("diagram:listing"))
    const omitted = {
        graph:   none || omit.has("diagram:graph"),
        hub:     none || omit.has("diagram:hub"),
        grid:    none || omit.has("diagram:grid"),
        code:    none || omit.has("diagram:code"),
        image:   none || omit.has("diagram:image"),
        listing: none || omit.has("diagram:listing"),
        level1:  none,
        level2:  none || omit.has("diagram:2"),
        level3:  none || omit.has("diagram:2") || omit.has("diagram:3"),
        text:    omit.has("text:long"),
        all:     none && omit.has("text:long")
    }
    const css =
        (omitted.text ? "\nspan.omit { color: var(--theme-color-specbook-muted) }" : "") +
        (omitted.all  ? "\nnav.toc-panel div.toc-tab { top: 10.66rem }" +
            "\ndiv.realtime-status { top: 13.89rem }" : "")
    return { omitted, css }
}
