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

/*  the maximum number of tables of a document whose cell texts the
    client-side folding lays out at once (a larger document has them
    laid out lazily, once they come near the viewport), and the number
    of tables it lays out lazily per animation frame  */
const eagerTables = 250
const tableBatch  = 8

/*  the client-side script of the folding: it wraps every diagram of the
    content into a fold container carrying a chevron mark at its top
    left corner, folds the text of every table cell towering over the
    other cells of its row behind a chevron mark of its own, and lets
    the controls of the fold tab fold and unfold all diagrams of a type
    ("graph", "hub", "grid", "state", "layer", "slice", "tree", "matrix",
    "sequence", "petri", "gantt", plus the embedded Mermaid/D2 ones as
    "code", the embedded images and PDF pages as "image", and the code
    listings as "listing"), all diagrams from an object tree nesting
    level on (1, 2, 3), and all cell texts at once, with their state
    persisted across page loads and their icons marked while they are
    active (the diagram ones, OR-combined) or any cell text is folded
    (the tab icon while anything at all is). The cell texts of a large
    document are laid out lazily, once their tables come near the
    viewport, so its loading does not stall. The script runs at
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
            graph:    tab.querySelector("div.fold-graphs"),
            hub:      tab.querySelector("div.fold-hubs"),
            grid:     tab.querySelector("div.fold-grids"),
            state:    tab.querySelector("div.fold-states"),
            layer:    tab.querySelector("div.fold-layers"),
            slice:    tab.querySelector("div.fold-slices"),
            tree:     tab.querySelector("div.fold-trees"),
            matrix:   tab.querySelector("div.fold-matrices"),
            sequence: tab.querySelector("div.fold-sequences"),
            petri:    tab.querySelector("div.fold-petris"),
            gantt:    tab.querySelector("div.fold-gantts"),
            code:     tab.querySelector("div.fold-codes"),
            image:    tab.querySelector("div.fold-images"),
            listing:  tab.querySelector("div.fold-listings"),
            level1:   tab.querySelector("div.fold-level1"),
            level2:   tab.querySelector("div.fold-level2"),
            level3:   tab.querySelector("div.fold-level3"),
            text:     tab.querySelector("div.fold-texts")
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
        const folds = Object.fromEntries(Object.keys(controls).map((kind) => [ kind, [] ]))
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

        /*  the tables whose cell texts can fold, the ones laid out
            already, the fold state every cell folding anew adopts (the
            stored or last chosen one of the text control), and the
            per-cell fold states carried over a redone layout  */
        const tables  = ${textless ? "[]" : "Array.from(document.querySelectorAll(\"article table\"))"}
        const laid    = new Set()
        const carried = new Map()
        let textFolded = false

        /*  lay out the text folds of a set of tables, which holds for the
            current line breaks only and hence is redone on every change of
            them. As every measurement after a change of the document
            forces the browser to lay out the document again, all
            measurements precede all changes: first the cells to fold are
            decided (the ones taller than the configured percentage above
            every other cell of their row, the leading name column of a
            compact table excluded, as it is no text of its own) and the
            last word position still fitting their height limit is found
            by a binary search over their measured word positions, then all
            of them are cut there (the text node split, the chevron mark
            taking its place, followed by the remainder hidden up the
            ancestor chain of the cell), then the gain of all applied folds
            is measured (as only that one tells the real one), and finally
            the folds gaining less than the minimum share are taken back
            again, while the kept ones take their fold state  */
        const foldTables = (list) => {
            const cuts = []
            for (const table of list) {
                laid.add(table)
                const configured = table.closest("table[data-fold-height]")
                const percent = Number(configured?.getAttribute("data-fold-height")) || cellHeight
                for (const row of table.rows) {
                    let cells = Array.from(row.children).filter((el) => el.tagName === "TD")
                    if (!table.classList.contains("chunks"))
                        cells = cells.slice(1)
                    cells = cells.filter(candidate)
                    if (cells.length < 2)
                        continue
                    const heights = cells.map((cell) => height(cell))
                    cells.forEach((cell, i) => {
                        const other = Math.max(...heights.filter((_, j) => j !== i))
                        const limit = other * (1 + percent / 100)
                        if (heights[i] > limit)
                            cuts.push({ cell, limit, full: heights[i], word: null, chevron: null })
                    })
                }
            }
            for (const cut of cuts) {
                const words = positions(cut.cell)
                if (words.length === 0)
                    continue
                let lo = 0
                let hi = words.length - 1
                while (lo < hi) {
                    const mid = Math.ceil((lo + hi) / 2)
                    if (height(cut.cell, words[mid]) <= cut.limit)
                        lo = mid
                    else
                        hi = mid - 1
                }
                cut.word = words[lo]
            }
            const applied = cuts.filter((cut) => cut.word !== null)
            for (const cut of applied) {
                const tail = cut.word.node.splitText(cut.word.offset)
                cut.chevron = mark("fold-more", "fold/unfold the remaining text")
                tail.parentNode.insertBefore(cut.chevron, tail)
                let current = cut.chevron
                while (current !== cut.cell) {
                    let next = current.nextSibling
                    while (next !== null) {
                        const following = next.nextSibling
                        rest(next)
                        next = following
                    }
                    current = current.parentNode
                }
                cut.cell.classList.add("folded")
            }
            const gained = applied.map((cut) => height(cut.cell) <= cut.full * (1 - cellGain / 100))
            applied.forEach((cut, i) => {
                if (!gained[i]) {
                    uncut(cut.cell)
                    return
                }
                cut.cell.classList.toggle("folded", carried.get(cut.cell) ?? textFolded)
                carried.delete(cut.cell)
                folds.text.push(cut.cell)
                cut.chevron.addEventListener("click", (event) => {
                    /*  the cut can land inside a hyperlink, whose navigation
                        the chevron has to suppress for its own click alone,
                        so the remaining link text still follows the link  */
                    event.preventDefault()
                    cut.cell.classList.toggle("folded")
                    sync()
                })
            })
        }

        /*  lay out the text folds of tables while the document is scrolled
            to somewhere, keeping the content at the top of the viewport in
            place: the scroll anchoring of the browser, which usually does
            that, is confused by the intermediate layout of the folds (as
            its anchor can move between the measurements), so it is
            suspended meanwhile and the element at the top of the viewport
            (the table row for a table cell, as a cell can be cut) is kept
            in place by hand instead  */
        const steady = (list) => {
            const root = document.documentElement
            const x    = window.innerWidth / 2
            let   ref  = null
            for (let y = 0; ref === null && y < window.innerHeight / 2; y += 16) {
                const hit = document.elementFromPoint(x, y)
                if (hit !== null && hit.closest("article") !== null && !(/^(?:ARTICLE|SECTION)$/).test(hit.tagName))
                    ref = hit.closest("tr") ?? hit
            }
            const top = ref?.getBoundingClientRect().top ?? 0
            root.style.overflowAnchor = "none"
            foldTables(list)
            if (ref !== null && ref.isConnected) {
                const shift = ref.getBoundingClientRect().top - top
                if (shift !== 0)
                    window.scrollBy(0, shift)
            }
            root.style.overflowAnchor = ""
        }

        /*  the tables of a small document are laid out at once, so the
            first rendering shows their folds already, while the ones of a
            larger document are laid out lazily, as laying out all of them
            up-front stalls its loading for a long time and the browser
            does not even render the content far outside the viewport (see
            "content-visibility" in the stylesheet): only the tables coming
            near the viewport (within a generous margin, so they are laid
            out before they get visible) are laid out, the nearest ones
            first and in small batches per animation frame, so even a long
            jump through the document never stalls the page. A running
            search (which shows the remainders) defers it, and a live
            preview body swap, which left this script behind, ends it  */
        const eager    = tables.length <= ${eagerTables}
        const near     = new Map()
        let   pending  = false
        let   observer = null
        const distance = (rect) => rect.bottom < 0 ? -rect.bottom :
            rect.top > window.innerHeight ? rect.top - window.innerHeight : 0
        const request = () => {
            if (pending || near.size === 0)
                return
            pending = true
            requestAnimationFrame(flush)
        }
        const flush = () => {
            pending = false
            if (!tab.isConnected) {
                observer.disconnect()
                return
            }
            if (document.body.classList.contains("searching")) {
                pending = true
                setTimeout(() => {
                    pending = false
                    request()
                }, 250)
                return
            }
            const batch = Array.from(near.entries())
                .filter(([ table ]) => !laid.has(table) && table.isConnected)
                .sort((a, b) => distance(a[1]) - distance(b[1]))
                .slice(0, ${tableBatch})
                .map(([ table ]) => table)
            if (batch.length === 0)
                return
            steady(batch)
            sync()
            request()
        }
        if (!eager) {
            observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting)
                        near.set(entry.target, entry.boundingClientRect)
                    else
                        near.delete(entry.target)
                }
                request()
            }, { rootMargin: "100% 0px" })
            tables.forEach((table) => { observer.observe(table) })
        }

        /*  mark the text control while any cell text is folded (where the
            tables still to lay out count as carrying cells in the adopted
            fold state), a diagram control while it is active itself (as
            the sets of the diagram controls overlap, the fold state of
            their diagrams tells nothing), and the tab itself while
            anything at all is folded  */
        const active = new Set()
        const sync = () => {
            const texts = folds.text.some((fold) => fold.classList.contains("folded"))
                || (textFolded && laid.size < tables.length)
            for (const kind of Object.keys(folds))
                controls[kind].classList.toggle("folded", kind === "text" ? texts : active.has(kind))
            tab.classList.toggle("folded", texts || Object.keys(folds).some((kind) =>
                kind !== "text" && folds[kind].some((fold) => fold.classList.contains("folded"))))
        }

        /*  fold exactly the diagrams at least one active control covers  */
        const apply = () => {
            const covered = new Set(Array.from(active).flatMap((kind) => folds[kind]))
            folds.level1.forEach((fold) => {
                fold.classList.toggle("folded", covered.has(fold))
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
            textFolded = stored.text === "folded"
        if (stored.diagrams !== null) {
            stored.diagrams.split(",").filter((kind) => kind !== "text" && Object.hasOwn(folds, kind))
                .forEach((kind) => { active.add(kind) })
            apply()
        }

        /*  the text control folds all cell texts unless all of them are
            folded already, including the ones of the tables still to lay
            out, which adopt the chosen state once they are laid out  */
        for (const kind of Object.keys(folds)) {
            controls[kind].addEventListener("click", () => {
                try {
                    if (kind === "text") {
                        const all = !(folds.text.every((fold) => fold.classList.contains("folded"))
                            && (textFolded || laid.size === tables.length))
                        textFolded = all
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
        if (eager)
            foldTables(tables)
        sync()

        /*  redo the text folds once the line breaks change, which a new
            viewport width and the arrival of the embedded fonts (still
            loading while this script runs) cause: the previous cuts are
            taken back, with their fold state carried over, the tables
            near the viewport are laid out anew right away and the others
            once they come near it again. A running search (which shows
            the remainders) defers it, and a live preview body swap, which
            left this script behind, ends it  */
        let width = document.documentElement.clientWidth
        let timer = 0
        const relayout = () => {
            if (!tab.isConnected)
                return
            if (document.body.classList.contains("searching")) {
                schedule()
                return
            }
            for (const cell of folds.text) {
                carried.set(cell, cell.classList.contains("folded"))
                uncut(cell)
            }
            folds.text.length = 0
            const again = Array.from(laid).filter((table) => table.isConnected && (eager || near.has(table)))
            laid.clear()
            steady(again)
            sync()
            request()
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
export const lineChars = 140

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
    const textLen = (html: string) => html.replace(/<[^>]*>/g, "").trim().length
    const lengths = htmls.map((html) => (/<td[\s>]|<div class="diagram"/).test(html) ? 0 : textLen(html))
    if (lengths.filter((length) => length > 0).length < 2)
        return cells
    const chars = shares.map((share) => Math.max(1, Math.floor(lineChars * share)))
    const lines = htmls.map((html, i) => lengths[i] === 0 ? 0 :
        html.split(/<\/(?:p|li|div|pre)>|<br\s*\/?>/)
            .reduce((sum, block) => sum + Math.ceil(textLen(block) / chars[i]), 0))
    return htmls.map((html, i) => {
        const other = Math.max(...lines.filter((_, j) => j !== i)) *
            (1 + (percent > 0 ? percent : cellHeightDefault) / 100)
        const limit = Math.floor(other) * chars[i] - " [...]".length
        if (lines[i] === 0 || lines[i] <= other || limit <= 0 || limit > lengths[i] * (1 - cellGainMin / 100))
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

/*  the diagram types of the fold controls, the Gradia ones first  */
const gradiaTypes  = [ "graph", "hub", "grid", "state", "layer", "slice",
    "tree", "matrix", "sequence", "petri", "gantt" ] as const
const diagramTypes = [ ...gradiaTypes, "code", "image", "listing" ] as const

/*  the fold controls the omitted aspects drop, along with the implied
    ones (no type control without diagrams of that type, no level
    control without diagrams from that level on, no fold tab without
    any control, which lets the tabs below it move up), plus the extra
    style rules the omission brings (the "[...]" mark of the omitted
    long texts and the moved-up tabs of a dropped fold tab)  */
export const omittedControls = (omit: Set<OmitAspect>) => {
    const none    = omit.has("diagram:1") || diagramTypes.every((type) => omit.has(`diagram:${type}` as const))
    const types   = Object.fromEntries(diagramTypes.map((type) =>
        [ type, none || omit.has(`diagram:${type}` as const) ])) as Record<typeof diagramTypes[number], boolean>
    const omitted = {
        ...types,
        level1:  none,
        level2:  none || omit.has("diagram:2"),
        level3:  none || omit.has("diagram:2") || omit.has("diagram:3"),
        text:    omit.has("text:long"),
        all:     none && omit.has("text:long")
    }

    /*  the first row of the fold panel (the Gradia diagram types) is
        dropped once all of its controls are  */
    const gradia = gradiaTypes.every((type) => omitted[type])
    const css =
        (omitted.text ? "\nspan.omit { color: var(--theme-color-specbook-muted) }" : "") +
        (omitted.all  ? "\nnav.toc-panel div.toc-tab { top: 13.89rem }" +
            "\ndiv.realtime-status { top: 17.12rem }" : "")
    return { omitted: { ...omitted, gradia }, css }
}
