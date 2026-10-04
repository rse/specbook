/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import textframe from "textframe"

/*  ==== Scripts ====  */

/*  the client-side script of the color theme: it applies the stored
    choice (or, without one, the document default and finally the system
    preference) before the first paint and toggles it on demand. The
    live preview placeholder page carries it, too, as an in-place
    document update never re-executes a head script  */
export const themeScript = textframe`
    (function () {
        let style = null
        try { style = localStorage.getItem("specbook-theme") }
        catch { /*  an inaccessible storage just means no stored choice  */ }
        const html = document.documentElement.classList
        if (style === null)
            style = html.contains("theme-dark") ? "dark" : (html.contains("theme-light") ? "light" : null)
        if (style === null)
            style = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        html.remove("theme-light", "theme-dark")
        html.add("theme-" + style)
    })()
    function themeSwitch () {
        const html  = document.documentElement.classList
        const style = html.contains("theme-dark") ? "light" : "dark"
        html.remove("theme-light", "theme-dark")
        html.add("theme-" + style)
        try { localStorage.setItem("specbook-theme", style) }
        catch { /*  an inaccessible storage just loses the choice  */ }
    }
`

/*  the minimal stylesheet of the live preview placeholder page: it also
    provides the <style> element the in-place document update swaps with
    the real stylesheet, so it carries the centered message only  */
export const placeholderStylesheet = textframe`
    html.theme-light body { color: #333333; background-color: #ffffff }
    html.theme-dark  body { color: #cccccc; background-color: #1a1a1a }
    body { font-family: sans-serif; margin: 0 }
    div.placeholder { position: absolute; top: 50%; left: 0; right: 0;
        transform: translateY(-50%); text-align: center; opacity: 0.6 }
`

/*  the client-side script of the live preview: it connects back to
    its own page over WebSocket (the URL scheme "http"/"https" replaced with
    "ws"/"wss"), re-connects every second after a lost connection, and
    updates the page on a received "RELOAD" command as well as on every
    re-established connection (as the server was restarted meanwhile).
    The update fetches the fresh page and replaces the document in place
    -- instead of reloading the page -- so the scroll position and the
    theme choice survive: the title, the stylesheet (if changed), and
    the body are swapped, and the scripts of the fresh body re-executed
    through clones (as parsed scripts never execute), except this
    realtime script itself, whose connection stays alive. The status
    icon (re-created by every body swap) reflects the connection state
    and blinks for 2s after every update, unless the connection is
    lost meanwhile  */
export const realtimeScript = textframe`
    (function () {
        const url = window.location.protocol.replace(/^http/, "ws") + "//" +
            window.location.host + window.location.pathname
        const status = (state) => {
            const icon = document.querySelector("div.realtime-status")
            if (icon !== null)
                icon.className = "realtime-status " + state
        }
        let blink = 0
        let seq   = 0
        let lost  = false
        const update = async () => {
            /*  a superseded update (an overlapping newer one started
                meanwhile) is dropped, as its stale page could arrive last  */
            const mine = ++seq
            let html
            try {
                const response = await fetch(window.location.pathname, { cache: "no-store" })
                if (!response.ok)
                    return
                html = await response.text()
            }
            catch {
                /*  an unreachable server just skips the update  */
                return
            }
            if (mine !== seq)
                return
            const doc = new DOMParser().parseFromString(html, "text/html")
            const x = window.scrollX
            const y = window.scrollY
            document.title = doc.title
            const style = document.head.querySelector("style")
            const fresh = doc.head.querySelector("style")
            if (style !== null && fresh !== null && style.textContent !== fresh.textContent)
                style.replaceWith(fresh)
            document.body.replaceWith(doc.body)

            /*  a swapped-out maximization overlay can no longer unlock the scrolling  */
            document.documentElement.classList.remove("maximized")
            for (const script of document.body.querySelectorAll("script:not(.realtime)")) {
                const clone = document.createElement("script")
                clone.textContent = script.textContent
                script.replaceWith(clone)
            }
            window.scrollTo(x, y)
            if (lost)
                return
            status("reloaded")
            clearTimeout(blink)
            blink = setTimeout(() => { status("connected") }, 2000)
        }
        const connect = () => {
            const ws = new WebSocket(url)
            ws.onopen = () => {
                status("connected")
                if (lost) {
                    console.log("specbook: live preview connection re-established")
                    lost = false
                    update()
                }
            }
            ws.onmessage = (event) => {
                if (event.data === "RELOAD")
                    update()
            }
            ws.onclose = () => {
                clearTimeout(blink)
                status("disconnected")
                if (!lost)
                    console.log("specbook: live preview connection lost")
                lost = true
                setTimeout(connect, 1000)
            }
        }
        connect()
    })()
`

/*  the client-side script of the scroll progress meter: it drives the
    DONE arc of the ring (through the dash offset of its unit-length
    circle) with the scrolled fraction of the document, shows the meter
    once the page is scrolled beyond 400px, and scrolls the page back
    to the top on a click (stripping the URL hash, so a later reload
    stays at the top). The updates are throttled onto animation frames,
    and the window-bound listeners retire themselves once a live preview
    body swap replaced the meter (whose fresh script re-attaches)  */
export const scrollProgressScript = textframe`
    (function () {
        const meter = document.querySelector("div.scroll-progress")
        const ring  = meter.querySelector("circle.scroll-done")
        let ticking = false
        const update = () => {
            ticking = false
            if (!meter.isConnected) {
                window.removeEventListener("scroll", schedule)
                window.removeEventListener("resize", schedule)
                return
            }
            const doc = document.documentElement
            const max = doc.scrollHeight - doc.clientHeight
            ring.setAttribute("stroke-dashoffset", String(1 - (max > 0 ? doc.scrollTop / max : 0)))
            meter.classList.toggle("shown", doc.scrollTop > 400)
        }
        const schedule = () => {
            if (!ticking) {
                ticking = true
                requestAnimationFrame(update)
            }
        }
        meter.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" })
            if (window.location.hash)
                history.replaceState(null, "", window.location.pathname + window.location.search)
        })
        window.addEventListener("scroll", schedule, { passive: true })
        window.addEventListener("resize", schedule)
        update()
    })()
`

/*  the client-side script of the diagram maximization: it attaches two
    controls to the top right corner of every diagram, revealed by the
    stylesheet while the diagram is hovered, which maximize the diagram
    temporarily in a single shared overlay covering the viewport (the
    SVG cloned into it and fitted by the stylesheet), the second one
    additionally taking the overlay into the browser fullscreen (a
    refused request leaves the viewport overlay), where the close mark
    at the top right corner, "Escape", a click beside the diagram, and
    a jump through a node hyperlink close the overlay again (a browser
    leaving the fullscreen on its own closes it, too). The script runs
    at the end of the body, as the diagrams it decorates have to exist
    already, and a live preview body swap replaces the overlay and the
    body-bound listeners along with the body, while the document-bound
    fullscreen listener retires itself  */
export const maximizeScript = textframe`
    (function () {
        /*  an icon control drawn like the tab icons  */
        const svgNS = "http://www.w3.org/2000/svg"
        const mark = (name, title, paths) => {
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
            for (const d of paths) {
                const path = document.createElementNS(svgNS, "path")
                path.setAttribute("d", d)
                svg.appendChild(path)
            }
            span.appendChild(svg)
            return span
        }

        /*  the shared overlay: the close mark plus the content holding
            the clone of the maximized diagram  */
        const overlay = document.createElement("div")
        overlay.className = "maximize"
        const close   = mark("maximize-close", "close the maximized diagram",
            [ "M18 6 6 18", "M6 6l12 12" ])
        const content = document.createElement("div")
        content.className = "maximize-content"
        overlay.append(close, content)
        document.body.appendChild(overlay)

        /*  open the overlay onto a diagram (its inline SVG, its code listing,
            which keeps its line numbering style, or the image of the theme
            variant currently shown), optionally in the browser fullscreen,
            and close it again (leaving the fullscreen, too), with the
            document scrolling locked while it is open  */
        const open = (diagram, fullscreen) => {
            const shown = Array.from(diagram.querySelectorAll(":scope > svg, :scope > pre, img"))
                .find((el) => el.getClientRects().length > 0)
            if (shown === undefined)
                return
            const svg = shown.cloneNode(true)
            if (svg.tagName !== "PRE")
                svg.removeAttribute("style")
            content.replaceChildren(svg)
            overlay.classList.add("open")
            document.documentElement.classList.add("maximized")
            if (fullscreen)
                overlay.requestFullscreen().catch(() => { /*  a refused request leaves the viewport overlay  */ })
        }
        const shut = () => {
            overlay.classList.remove("open")
            document.documentElement.classList.remove("maximized")
            content.replaceChildren()
            if (document.fullscreenElement === overlay)
                document.exitFullscreen().catch(() => { /*  a fullscreen left already needs no exit  */ })
        }
        close.addEventListener("click", shut)
        overlay.addEventListener("click", (event) => {
            /*  a node hyperlink navigates on its own, the overlay just
                gets out of its way, while a click beside the diagram
                closes the overlay alone  */
            if (event.target.closest("a") !== null || event.target.closest("svg, pre, img") === null)
                shut()
        })
        document.body.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && overlay.classList.contains("open"))
                shut()
        })
        const left = () => {
            if (!overlay.isConnected)
                document.removeEventListener("fullscreenchange", left)
            else if (document.fullscreenElement === null && overlay.classList.contains("open"))
                shut()
        }
        document.addEventListener("fullscreenchange", left)

        /*  attach the two controls to every diagram  */
        document.querySelectorAll("article div.diagram, nav.doc div.diagram").forEach((diagram) => {
            const controls = document.createElement("span")
            controls.className = "maximize-controls"
            const view = mark("maximize-view", "maximize this diagram in the viewport",
                [ "M15 3h6v6", "M21 3l-7 7", "M9 21H3v-6", "M3 21l7-7" ])
            const full = mark("maximize-full", "maximize this diagram in fullscreen",
                [ "M3 7V5a2 2 0 0 1 2-2h2", "M17 3h2a2 2 0 0 1 2 2v2",
                  "M21 17v2a2 2 0 0 1-2 2h-2", "M7 21H5a2 2 0 0 1-2-2v-2" ])
            view.addEventListener("click", () => { open(diagram, false) })
            full.addEventListener("click", () => { open(diagram, true) })
            controls.append(view, full)
            diagram.appendChild(controls)
        })
    })()
`

/*  the client-side script of the table of contents side panel: it
    slides the panel out of and back into the viewport edge (closing it
    also on a jump, on "Escape", and on a click outside), remembers the
    open state across page loads, and marks the active entry (the first
    heading visible in the viewport, or, without any, the last heading
    above the viewport, i.e. the section scrolled into), scrolling it
    into the middle of the panel whenever it changes and is not visible
    in the panel already (even while the panel is slid in, so it opens
    at the right position), plus the anchored entry (the one the URL
    hash currently addresses, which a jump synchronizes with the active
    one, while a subsequent scrolling moves the active one only). The
    script runs at the end of the body, as the headings it targets
    have to exist already, and a live preview body swap replaces the
    body-bound listeners along with the panel, while the document- and
    window-bound ones (the outside click, as the body does not span
    the viewport margins, plus scroll and hash change) retire
    themselves  */
export const tocPanelScript = textframe`
    (function () {
        const panel   = document.querySelector("nav.toc-panel")
        const list    = panel.querySelector("div.toc-list")
        const links   = Array.from(panel.querySelectorAll("a"))
        const targets = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
        let active = null
        const reveal = () => {
            const top = active.getBoundingClientRect().top - list.getBoundingClientRect().top
            if (top < 0 || top + active.offsetHeight > list.clientHeight)
                list.scrollTop += top - (list.clientHeight - active.offsetHeight) / 2
        }
        const spy = () => {
            if (!panel.isConnected) {
                window.removeEventListener("scroll", spy)
                return
            }
            let current = null
            for (let i = 0; i < targets.length; i++) {
                if (targets[i] === null)
                    continue
                const top = targets[i].getBoundingClientRect().top
                if (top >= -1 && top < window.innerHeight) {
                    current = links[i]
                    break
                }
                if (top < -1)
                    current = links[i]
            }
            if (current === active)
                return
            if (active !== null)
                active.classList.remove("active")
            active = current
            if (active !== null) {
                active.classList.add("active")
                reveal()
            }
        }
        let anchored = null
        const anchor = () => {
            if (!panel.isConnected) {
                window.removeEventListener("hashchange", anchor)
                return
            }
            const current = links.find((a) => a.hash === window.location.hash) ?? null
            if (current === anchored)
                return
            if (anchored !== null)
                anchored.classList.remove("anchored")
            anchored = current
            if (anchored !== null)
                anchored.classList.add("anchored")
        }
        const toggle = (open) => {
            panel.classList.toggle("open", open)
            try { localStorage.setItem("specbook-toc", panel.classList.contains("open") ? "open" : "closed") }
            catch { /*  an inaccessible storage just loses the state  */ }
        }
        try { if (localStorage.getItem("specbook-toc") === "open") panel.classList.add("open") }
        catch { /*  an inaccessible storage just means no stored state  */ }
        panel.querySelector("div.toc-tab").addEventListener("click", () => { toggle() })
        links.forEach((a) => { a.addEventListener("click", () => { toggle(false) }) })
        document.body.addEventListener("keydown", (event) => { if (event.key === "Escape") toggle(false) })
        const outside = (event) => {
            if (!panel.isConnected)
                document.removeEventListener("click", outside)
            else if (!panel.contains(event.target)
                && event.target.closest("div.search")          === null
                && event.target.closest("div.theme-switch")    === null
                && event.target.closest("div.info-switch")     === null
                && event.target.closest("div.fold-switch")     === null
                && event.target.closest("div.realtime-status") === null)
                toggle(false)
        }
        document.addEventListener("click", outside)
        window.addEventListener("scroll", spy, { passive: true })
        window.addEventListener("hashchange", anchor)
        spy()
        anchor()
    })()
`

/*  the client-side script of the description popups: the info tab
    toggles the popups (off by default, persisted across page loads),
    and while they are on, a mouse resting 400ms on an element carrying
    a "data-info" key (plus "data-info-prop" for a property) pops up the
    schema description of its object kind (or property), while one
    carrying a "data-info-spec" key pops up the corpus description of
    the object instance (a diagram node box resolves through its
    hyperlinked object anchor), titled with the object path (an instance
    popup trailing the anchor id of the object) and fed from the
    injected INFO/SPEC tables: as thousands of elements carry those
    keys, they are just the table indices, and a title path is composed
    from the SPEC table (the anchor id, parent index, kind, plain name,
    and pre-rendered description HTML per object) instead of being
    repeated on every element -- the path of an instance popup is the
    one of its own object, while "data-info-path" names the object of a
    schema popup, a trailing "^" keeping its last segment kind-only;
    the popup is capped at 40% viewport width and attached above or
    below, whichever side offers more space; the script runs at the
    end of the body, so a live preview body swap replaces the popup
    and the body-bound listeners along with it  */
const infoPopupScript = textframe`
    (function (INFO, SPEC) {
        const popup = document.createElement("div")
        popup.className = "info-popup"
        document.body.appendChild(popup)
        let enabled = false
        try { enabled = localStorage.getItem("specbook-info") === "on" }
        catch { /*  an inaccessible storage just means no stored choice  */ }
        let current   = null
        let pending   = null
        let pendingId = 0
        const cancel = () => {
            clearTimeout(pendingId)
            pending = null
        }
        const hide = () => {
            popup.classList.remove("open")
            current = null
        }
        const apply = () => {
            document.body.classList.toggle("info-on", enabled)
            if (!enabled) {
                cancel()
                hide()
            }
        }
        apply()
        document.querySelector("div.info-switch").addEventListener("click", () => {
            enabled = !enabled
            try { localStorage.setItem("specbook-info", enabled ? "on" : "off") }
            catch { /*  an inaccessible storage just loses the choice  */ }
            apply()
        })

        /*  compose the title of a popup: the title path segments of the
            object (the last one kind-only for a kind popup), the anchor
            id trailing an instance popup, and the property name trailing
            a property popup  */
        const titleOf = (source, spec, prop) => {
            /*  compose the title path segments of an object  */
            const pathOf = (n, named) => {
                const [ , up, kind, title ] = SPEC[n]
                const name = named ? title : ""
                return [ ...(up >= 0 ? pathOf(up, true) : []),
                    name !== "" && kind !== "" ? kind + ": " + name : (name !== "" ? name : kind) ]
            }
            const title = document.createElement("div")
            title.className = "info-title"

            /*  create a pointer, separating the title path segments  */
            const pointer = () => {
                const span = document.createElement("span")
                span.className = "info-pointer"
                span.textContent = "▷"
                return span
            }
            const ref      = spec ?? source.getAttribute("data-info-path") ?? ""
            const index    = parseInt(ref, 10)
            const segments = SPEC[index] !== undefined ? pathOf(index, !ref.endsWith("^")) : []
            for (const [ i, segment ] of segments.entries()) {
                if (i > 0)
                    title.appendChild(pointer())
                const path = document.createElement("span")
                path.className = "info-object"

                /*  a segment renders as in the document content (the kind
                    bold in the path color, the name semi-bold in the
                    description color), where a segment without a kind
                    prefix is the kind-only ending of a kind popup or the
                    name of a kind-less object  */
                const m    = /^([^\\s:]+): (.*)$/.exec(segment)
                const bare = i === segments.length - 1 && spec === null && prop === null
                const name = document.createElement("span")
                name.className = "info-name"
                if (m !== null || bare) {
                    const kind = document.createElement("span")
                    kind.className = "info-kind"
                    kind.textContent = m !== null ? m[1] + ":" : segment
                    path.appendChild(kind)
                    if (m !== null) {
                        name.textContent = m[2]
                        path.append(" ", name)
                    }
                }
                else {
                    name.textContent = segment
                    path.appendChild(name)
                }
                title.appendChild(path)
            }

            /*  the anchor id of an object instance (explicit or derived
                from its name) trails the last segment  */
            const anchor = spec !== null ? SPEC[spec]?.[0] : undefined
            if (anchor !== undefined) {
                const id = document.createElement("span")
                id.className = "info-id"
                const name = document.createElement("span")
                name.className = "info-id-name"
                name.textContent = anchor
                id.append(" (#", name, ")")
                title.appendChild(id)
            }
            if (prop !== null) {
                title.appendChild(pointer())
                const name = document.createElement("span")
                name.className = "info-property"
                name.textContent = prop
                title.appendChild(name)
            }
            return title
        }
        const show = (el) => {
            /*  a diagram node box carries no popup attributes itself, but
                hyperlinks its object, whose heading name or table row name
                carries the instance popup attributes  */
            let source = el
            if (!el.hasAttribute("data-info") && !el.hasAttribute("data-info-spec")) {
                const target = document.getElementById(
                    decodeURIComponent((el.getAttribute("href") ?? "").replace(/^#/, "")))
                source = target === null ? null :
                    (target.hasAttribute("data-info-spec") ? target : target.querySelector("[data-info-spec]"))
                if (source === null)
                    return
            }
            current = el
            const key   = source.getAttribute("data-info")
            const spec  = source.getAttribute("data-info-spec")
            const prop  = source.getAttribute("data-info-prop")
            popup.classList.toggle("spec", spec !== null)
            popup.replaceChildren(titleOf(source, spec, prop))
            const entry = key !== null ? INFO[key] : undefined
            const desc  = prop !== null ? entry?.p?.[prop] :
                (spec !== null ? SPEC[spec]?.[4] : entry?.d)
            if (desc !== undefined && desc !== "") {
                const text = document.createElement("div")
                text.className = "info-desc"
                text.innerHTML = desc

                /*  the origin label leads the description inline, so it is
                    hoisted into the leading paragraph (if there is one),
                    with its prefix word in a span of its own for the
                    rounded box styling  */
                const label = document.createElement("strong")
                label.className = "info-label"
                const origin = document.createElement("span")
                origin.className = "info-origin"
                origin.textContent = spec !== null ? "Specification" : "Schema"
                label.append(origin, " ")
                const lead = text.firstElementChild
                if (lead !== null && lead.tagName === "P")
                    lead.insertBefore(label, lead.firstChild)
                else
                    text.insertBefore(label, text.firstChild)
                popup.appendChild(text)
            }

            /*  measure the popup at the viewport origin first, as a
                position near the right or bottom edge would clamp it  */
            popup.style.left = "0px"
            popup.style.top  = "0px"
            popup.classList.add("open")
            const rect  = el.getBoundingClientRect()
            const left  = Math.max(8, Math.min(rect.left, window.innerWidth - popup.offsetWidth - 8))
            const above = rect.top > window.innerHeight - rect.bottom
            popup.style.left = left + "px"
            popup.style.top  = (above ? rect.top - popup.offsetHeight - 6 : rect.bottom + 6) + "px"
        }
        const targets = "[data-info], [data-info-spec], div.diagram a"
        document.body.addEventListener("mouseover", (event) => {
            if (!enabled)
                return
            const el = event.target.closest(targets)
            if (el === null || el === current || el === pending)
                return
            cancel()
            pending   = el
            pendingId = setTimeout(() => { pending = null; show(el) }, 400)
        })
        document.body.addEventListener("mouseout", (event) => {
            const el = event.target.closest(targets)
            if (el === null || (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)))
                return
            if (el === pending)
                cancel()
            if (el === current)
                hide()
        })
    })(@INFO@, @SPEC@)
`

/*  an entry of the description popup map embedded into the document:
    the pre-rendered description HTML of an object kind ("d") and of
    its properties ("p", keyed by property name)  */
export type InfoEntry = { d?: string, p?: Record<string, string> }

/*  an entry of the object table embedded into the document: the anchor
    id, the table index of the parent (-1 for none), the kind, the
    plain name, and the pre-rendered description HTML of an object  */
export type SpecEntry = [ id: string, parent: number, kind: string, name: string, desc: string ]

/*  inject the description popup tables into their client-side script ("<"
    escaped, so no embedded HTML can close the surrounding <script>
    element, and the trailing table first, so a placeholder text
    inside an injected table is never taken for the placeholder)  */
export const infoScript = (info: InfoEntry[], spec: SpecEntry[]): string =>
    infoPopupScript
        .replace("@SPEC@", () => JSON.stringify(spec).replace(/</g, "\\u003c"))
        .replace("@INFO@", () => JSON.stringify(info).replace(/</g, "\\u003c"))
