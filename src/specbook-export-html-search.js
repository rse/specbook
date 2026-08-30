/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  the client-side fuzzy search over the rendered specification: the
    whitespace-separated words of a comma-separated query part are
    (fuzzy) matched and AND-combined, while the parts are OR-combined;
    a match keeps its complete paragraph, table row, or diagram, plus
    the table header and the headings of all enclosing objects, and
    every matched word is highlighted with a <mark> element (an SVG
    <tspan> element underlaid with a <rect> inside a diagram), while
    the side panel of the table of contents is filtered along  */
(function () {
    const tab    = document.getElementById("search")
    const toggle = document.getElementById("search-toggle")
    const input  = document.getElementById("search-input")
    const clear  = document.getElementById("search-clear")
    if (tab === null || toggle === null || input === null || clear === null)
        return

    /*  let the search icon slide the input field out of the tab (and
        back in again), remembering the choice across page loads  */
    const slide = (open) => {
        tab.classList.toggle("open", open)
        if (tab.classList.contains("open"))
            input.focus()
        else
            input.blur()
        try { localStorage.setItem("specbook-search", tab.classList.contains("open") ? "open" : "closed") }
        catch { /*  an inaccessible storage just loses the state  */ }
    }
    try { if (localStorage.getItem("specbook-search") === "open") tab.classList.add("open") }
    catch { /*  an inaccessible storage just means no stored state  */ }
    toggle.addEventListener("click", () => { slide() })

    /*  shortest word still eligible for fuzzy matching: below it the
        edit distance would equate it with almost any short word  */
    const fuzzyMin = 4

    /*  the searchable units (paragraphs, list items, table rows,
        headings, and diagrams), the corpus vocabulary, and the per-word
        cache of the fuzzy-equivalent vocabulary words  */
    const units = []
    const vocab = new Set()
    const fuzzy = new Map()
    let indexed = false

    /*  fill the unit and vocabulary indices once on first use: a unit
        is an outermost paragraph-level element within an article, i.e.
        one not nested inside another unit (like a paragraph or diagram
        in a table cell, which is covered by its table row), where a
        diagram is searched by its SVG text labels, joined by spaces,
        as its raw text content would run them together  */
    const index = () => {
        if (indexed)
            return
        indexed = true
        document.querySelectorAll("article").forEach((article) => {
            article.querySelectorAll("p, li, tr, pre, blockquote, h1, h2, h3, h4, h5, h6, div.diagram")
                .forEach((el) => {
                    let parent = el.parentElement
                    while (parent !== null && parent.tagName !== "ARTICLE") {
                        if (/^(TR|TD|TH|LI|P|BLOCKQUOTE)$/.test(parent.tagName))
                            return
                        parent = parent.parentElement
                    }
                    const text  = (el.classList.contains("diagram") ?
                        Array.from(el.querySelectorAll("text")).map((t) => t.textContent ?? "").join(" ") :
                        (el.textContent ?? "")).toLowerCase()
                    const words = new Set(text.split(/[^\p{L}\p{N}]+/u).filter((w) => w !== ""))
                    words.forEach((w) => { vocab.add(w) })
                    units.push({ el, text, words, keep: false })
                })
        })
    }

    /*  the Levenshtein edit distance of two words  */
    const levenshtein = (a, b) => {
        let prev = []
        let curr = []
        for (let j = 0; j <= b.length; j++)
            prev[j] = j
        for (let i = 1; i <= a.length; i++) {
            curr[0] = i
            for (let j = 1; j <= b.length; j++)
                curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1,
                    prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
            const swap = prev
            prev = curr
            curr = swap
        }
        return prev[b.length]
    }

    /*  the Sorensen-Dice bigram similarity coefficient of two words  */
    const diceCoefficient = (a, b) => {
        if (a === b)
            return 1
        if (a.length < 2 || b.length < 2)
            return 0
        const bigrams = new Map()
        for (let i = 0; i < a.length - 1; i++) {
            const bigram = a.substring(i, i + 2)
            bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1)
        }
        let hits = 0
        for (let i = 0; i < b.length - 1; i++) {
            const bigram = b.substring(i, i + 2)
            const count  = bigrams.get(bigram) ?? 0
            if (count > 0) {
                bigrams.set(bigram, count - 1)
                hits++
            }
        }
        return (2 * hits) / (a.length + b.length - 2)
    }

    /*  the fuzzy-equivalent vocabulary words of a query word, cached
        across keystrokes, as this comparison is the expensive part  */
    const fuzzyWords = (word) => {
        let result = fuzzy.get(word)
        if (result !== undefined)
            return result
        result = []
        if (word.length >= fuzzyMin)
            vocab.forEach((given) => {
                if (Math.abs(word.length - given.length) <= 1
                    && (diceCoefficient(word, given) >= 0.50
                        || levenshtein(word, given) <= 2))
                    result.push(given)
            })
        fuzzy.set(word, result)
        return result
    }

    /*  match a query word against a unit, as a literal substring or as
        a fuzzy variant, remembering the variants for the highlighting  */
    const wordMatch = (word, unit, variants) => {
        if (unit.text.includes(word))
            return true
        const near = fuzzyWords(word).filter((v) => unit.words.has(v))
        near.forEach((v) => { variants.add(v) })
        return near.length > 0
    }

    /*  escape a text for its literal use inside a regular expression  */
    const escapeRegex = (s) =>
        s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

    /*  the alternation matching everything worth highlighting: the
        query words as plain substrings plus the fuzzy variants as
        whole words, longest alternative first, so a variant is never
        cut short by a query word nested inside it  */
    const buildRegex = (words, variants) => {
        const alts = words.map((w) => ({ len: w.length, src: escapeRegex(w) }))
            .concat(variants.map((v) => ({ len: v.length,
                src: "(?<![\\p{L}\\p{N}])" + escapeRegex(v) + "(?![\\p{L}\\p{N}])" })))
        alts.sort((a, b) => b.len - a.len)
        return new RegExp(alts.map((alt) => alt.src).join("|"), "giu")
    }

    /*  wrap every match in the text nodes of a unit into a <mark>, or
        into a <tspan> inside the SVG text labels of a diagram (as a
        foreign <mark> renders nothing there), leaving all other SVG
        text nodes (like an embedded font style) untouched; walking the
        text nodes (instead of replacing in the raw HTML) keeps the tags
        and attributes untouched  */
    const svgNS = "http://www.w3.org/2000/svg"
    const highlight = (el, regex) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        const nodes  = []
        let node
        while ((node = walker.nextNode()) !== null)
            nodes.push(node)
        const spans = []
        nodes.forEach((text) => {
            const parent = text.parentNode
            if (parent === null)
                return
            const svg = parent.namespaceURI === svgNS
            if (svg && !/^(text|tspan)$/.test(parent.localName))
                return
            const value = text.nodeValue ?? ""
            const frag  = document.createDocumentFragment()
            let last = 0
            let m
            regex.lastIndex = 0
            while ((m = regex.exec(value)) !== null) {
                if (m.index > last)
                    frag.appendChild(document.createTextNode(value.slice(last, m.index)))
                const mark = svg ?
                    document.createElementNS(svgNS, "tspan") :
                    document.createElement("mark")
                mark.classList.add("search-hit")
                mark.textContent = m[0]
                frag.appendChild(mark)
                if (svg)
                    spans.push(mark)
                last = m.index + m[0].length
            }
            if (last === 0)
                return
            if (last < value.length)
                frag.appendChild(document.createTextNode(value.slice(last)))
            parent.replaceChild(frag, text)
        })

        /*  underlay every <tspan> with a rounded <rect> (placed below
            its <text> label, padded and rounded relative to the label
            height like a <mark>), as SVG text has no background of its
            own; all extents are measured up-front, as every insertion
            would invalidate the layout again  */
        const boxes = spans.map((span) => span.getBBox())
        spans.forEach((span, i) => {
            const label = span.closest("text")
            const box   = boxes[i]
            const pad   = box.height * 0.1
            const rect  = document.createElementNS(svgNS, "rect")
            rect.classList.add("search-hit")
            rect.setAttribute("x",      String(box.x - pad))
            rect.setAttribute("y",      String(box.y))
            rect.setAttribute("width",  String(box.width + 2 * pad))
            rect.setAttribute("height", String(box.height))
            rect.setAttribute("rx",     String(box.height * 0.2))
            label.parentNode.insertBefore(rect, label)
        })
    }

    /*  undo a previous search: unwrap the injected <mark>, <tspan>,
        and <rect> elements (re-normalizing the fragmented text nodes),
        drop the filtering classes, and leave the search mode  */
    const unmark = () => {
        document.querySelectorAll(".search-hit").forEach((mark) => {
            const parent = mark.parentNode
            while (mark.firstChild !== null)
                parent.insertBefore(mark.firstChild, mark)
            parent.removeChild(mark)
            parent.normalize()
        })
        document.querySelectorAll(".search-keep").forEach((el) => { el.classList.remove("search-keep") })
        document.querySelectorAll(".search-hide").forEach((el) => { el.classList.remove("search-hide") })
        document.body.classList.remove("searching")
    }

    /*  apply the current query onto the units: each part matches in up
        to two passes, literal substrings first and, only if those match
        nothing at all, the fuzzy variants, as the edit-distance
        neighborhood of a word is wide enough to dilute a correctly
        spelled query and has to stay a fallback for misspelled ones  */
    const search = () => {
        unmark()
        const parts = input.value.toLowerCase().split(",")
            .map((part) => part.split(/\s+/).filter((word) => word !== ""))
            .filter((part) => part.length > 0)
        if (parts.length === 0)
            return
        index()
        document.body.classList.add("searching")
        const variants = new Set()
        units.forEach((unit) => { unit.keep = false })
        parts.forEach((part) => {
            let matched = units.filter((unit) =>
                part.every((word) => unit.text.includes(word)))
            if (matched.length === 0)
                matched = units.filter((unit) =>
                    part.every((word) => wordMatch(word, unit, variants)))
            matched.forEach((unit) => { unit.keep = true })
        })

        /*  a kept table row also keeps the table header, and a kept
            unit keeps the headings of all its enclosing objects  */
        units.forEach((unit) => {
            if (!unit.keep)
                return
            unit.el.classList.add("search-keep")
            if (unit.el.tagName === "TR") {
                const table = unit.el.closest("table")
                if (table !== null)
                    table.querySelectorAll("thead tr").forEach((tr) => { tr.classList.add("search-keep") })
            }
            let section = unit.el.closest("section")
            while (section !== null) {
                const heading = section.firstElementChild
                if (heading !== null && /^H[1-6]$/.test(heading.tagName))
                    heading.classList.add("search-keep")
                section = section.parentElement?.closest("section") ?? null
            }
        })

        /*  hide the units not kept, plus the objects and tables which
            ran entirely empty in the process (a table nested inside a
            kept unit, like a chunked property table, stays visible)  */
        units.forEach((unit) => {
            if (!unit.el.classList.contains("search-keep"))
                unit.el.classList.add("search-hide")
        })
        document.querySelectorAll("article section, article table").forEach((el) => {
            if (el.querySelector(".search-keep") === null
                && el.closest(".search-keep") === null)
                el.classList.add("search-hide")
        })

        /*  highlight every matched word within the kept units  */
        const words = Array.from(new Set(parts.flat()))
        const regex = buildRegex(words, Array.from(variants))
        units.forEach((unit) => {
            if (unit.el.classList.contains("search-keep"))
                highlight(unit.el, regex)
        })

        /*  filter the side panel of the table of contents along: an
            entry stays visible only while its target still is, which
            covers the front matter entries, too, as their targets are
            suppressed by the search mode anyway  */
        document.querySelectorAll("nav.toc-panel div.toc-list li").forEach((li) => {
            const link   = li.querySelector(":scope > a")
            const target = link !== null ?
                document.getElementById(decodeURIComponent(link.hash.slice(1))) : null
            if (target === null || target.getClientRects().length === 0)
                li.classList.add("search-hide")
        })
    }

    /*  run the search debounced on every keystroke (750ms after the
        last one, as re-filtering the whole document is not cheap), let
        the "X" clear the input field and the search results again, let
        the Escape key additionally slide the input field back in, and
        let the Enter key slide it back in with the query kept (and
        applied immediately)  */
    let debounce = 0
    const reset = () => {
        window.clearTimeout(debounce)
        input.value = ""
        unmark()
    }
    input.addEventListener("input", () => {
        window.clearTimeout(debounce)
        debounce = window.setTimeout(search, 750)
    })
    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape")
            reset()
        else if (event.key === "Enter") {
            window.clearTimeout(debounce)
            search()
        }
        else
            return
        slide(false)
    })
    clear.addEventListener("click", () => {
        reset()
        input.focus()
    })
})()
