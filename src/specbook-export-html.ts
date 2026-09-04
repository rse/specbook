/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { Marked }            from "marked"
import { markedSmartypants } from "marked-smartypants"
import nunjucks              from "nunjucks"
import nunjucksAddons        from "@rse/nunjucks-addons"
import textframe             from "textframe"
import { Gradia }            from "@rse/gradia"

import type { Spec, SpecArtifact, SpecObject, SpecProperty, SpecDescription }
    from "./specbook-format-spec.js"
import type { Schema, SchemaObject, SchemaFormat }
    from "./specbook-format-schema.js"
import { buildLinkIndex, resolveUnique, expandReferences, anchorPaths, plainText, type LinkIndex }
    from "./specbook-link.js"
import { compileValueExpr, splitItems, type ValueExpr }
    from "./specbook-parse-value.js"
import { embeddingRegex, embeddingMimeType, embeddingThemes, embeddingVariants }
    from "./specbook-parse-common.js"
import { escapeHtml, stylesheet, searchScript, fallbackLogo,
    isTitleObject, titleObject, documentTitle, documentLang, documentThemeStyle }
    from "./specbook-export-common.js"
import { collectSchemas }
    from "./specbook-parse-semantic.js"
import { renderDiagrams }
    from "./specbook-diagram.js"
import type { Verbose }
    from "./specbook-verbose.js"

/*  ==== Templates ====  */

/*  the built-in Nunjucks templates for the HTML export  */
const templates = {
    /*  <Document/>  */
    "Document": textframe`
        <!DOCTYPE html>
        <html{% if Document.lang %} lang="{{ Document.lang }}"{% endif %}{% if Document.theme %} class="theme-{{ Document.theme }}"{% endif %}>
            <head>
                <meta charset="utf-8"/>
                <title>{{ Document.title }}</title>
                <style>
                    {{ Document.css }}
                </style>
                <script>
                    {{ Document.themescript }}
                </script>
            </head>
            <body>
                {% if Document.realtime %}<div class="realtime-status disconnected" title="live preview connection"><svg class="realtime-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/><path d="M12 22v-5"/></svg></div>{% endif %}
                <div class="theme-switch" onclick="themeSwitch()" title="switch color theme"><svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5 A 8.5 8.5 0 0 0 12 20.5 Z" fill="currentColor" stroke="none"/></svg></div>
                {% if Document.info %}<div class="info-switch" title="toggle description popups"><svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="7.75" x2="12.01" y2="7.75"/></svg></div>{% endif %}
                <div class="search" id="search">
                    <div class="search-toggle" id="search-toggle" title="toggle search field"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="10" cy="10" r="6.5"/><line x1="15" y1="15" x2="21" y2="21"/></svg></div>
                    <div class="search-field">
                        <input type="text" id="search-input" placeholder="Search&hellip;" autocomplete="off" spellcheck="false"/>
                        <span class="search-clear" id="search-clear" title="clear search">&#x00D7;</span>
                    </div>
                </div>
                <div class="scroll-progress" title="scroll to top"><svg class="scroll-ring" viewBox="0 0 44 44" fill="none" stroke-width="2.5"><circle class="scroll-todo" cx="22" cy="22" r="20"/><circle class="scroll-done" cx="22" cy="22" r="20" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg><svg class="scroll-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></div>
                {{ Document.tocpanel }}
                {{ Document.titlepage }}
                {{ Document.toc }}
                {{ Document.doc }}
                {{ Document.artifacts }}
                {% if Document.search %}<script>{{ Document.search }}</script>{% endif %}
                <script>{{ Document.progress }}</script>
                {% if Document.tocpanel %}<script>{{ Document.tocscript }}</script>{% endif %}
                {% if Document.info %}<script>{{ Document.info }}</script>{% endif %}
                {% if Document.realtime %}<script class="realtime">{{ Document.realtime }}</script>{% endif %}
            </body>
        </html>
    `,

    /*  <Placeholder/>  */
    "Placeholder": textframe`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8"/>
                <title>{{ Placeholder.title }}</title>
                <style>
                    {{ Placeholder.css }}
                </style>
                <script>
                    {{ Placeholder.themescript }}
                </script>
            </head>
            <body>
                <div class="placeholder">{{ Placeholder.message }}</div>
                <script class="realtime">{{ Placeholder.realtime }}</script>
            </body>
        </html>
    `,

    /*  <TitlePage/>  */
    "TitlePage": textframe`
        <div class="titlepage" id="titlepage">
            {% if TitlePage.logo %}<div class="logo">{{ TitlePage.logo }}</div>{% endif %}
            <div class="title">{{ TitlePage.title }}</div>
            {% if TitlePage.subtitle %}<div class="subtitle">{{ TitlePage.subtitle }}</div>{% endif %}
            {% if TitlePage.author %}<div class="author">{{ TitlePage.author }}</div>{% endif %}
            <table class="meta">
                {% if TitlePage.version %}<tr><td class="label">Version:</td><td>{{ TitlePage.version }}</td></tr>{% endif %}
                <tr><td class="label">Created:</td><td>{{ TitlePage.created }}</td></tr>
                <tr><td class="label">Modified:</td><td>{{ TitlePage.modified }}</td></tr>
            </table>
            {{ TitlePage.description }}
            {{ TitlePage.properties }}
        </div>
    `,

    /*  <Toc/>  */
    "Toc": textframe`
        <nav class="toc" id="toc">
            <h1>Table of Contents</h1>
            <table>
                {% for entry in Toc.entries %}
                <tr class="level-{{ entry.level }}"><td><a href="#{{ entry.id }}"><span class="object-kind"{% if entry.info %} data-info="{{ entry.info }}" data-info-path="{{ entry.infopath }}"{% endif %}>{{ entry.kind }}:</span> <span class="object-name"{% if entry.spec %} data-info-spec="{{ entry.spec }}" data-info-path="{{ entry.specpath }}"{% endif %}>{{ entry.name }}</span> <span class="link-symbol">&#x26AD;</span></a></td>{% if entry.page %}<td class="page"><a href="#{{ entry.id }}">{{ entry.page }}</a></td>{% endif %}</tr>
                {% endfor %}
            </table>
        </nav>
    `,

    /*  <TocPanel/>  */
    "TocPanel": textframe`
        <nav class="toc-panel">
            <div class="toc-tab" title="toggle table of contents"><svg class="toc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></div>
            <div class="toc-list">
                <ul class="extra">
                    {% if TocPanel.title %}<li><a href="#titlepage"><span class="entry">Title</span></a></li>{% endif %}
                    <li><a href="#toc"><span class="entry">Table of Contents</span></a></li>
                    {% if TocPanel.doc %}<li><a href="#doc"><span class="entry">Diagram of Contents</span></a></li>{% endif %}
                </ul>
                {{ TocPanel.entries }}
            </div>
        </nav>
    `,

    /*  <TocPanelEntries/>  */
    "TocPanelEntries": textframe`
        <ul>
            {% for entry in Entries %}
            <li><a href="#{{ entry.id }}"><span class="entry"><span class="object-kind"{% if entry.info %} data-info="{{ entry.info }}" data-info-path="{{ entry.infopath }}"{% endif %}>{{ entry.kind }}:</span> <span class="object-name"{% if entry.spec %} data-info-spec="{{ entry.spec }}" data-info-path="{{ entry.specpath }}"{% endif %}>{{ entry.name }}</span></span></a>{{ entry.children }}</li>
            {% endfor %}
        </ul>
    `,

    /*  <Doc/>  */
    "Doc": textframe`
        <nav class="doc" id="doc">
            <h1>Diagram of Contents</h1>
            <div class="diagram">{{ Doc.diagram }}</div>
        </nav>
    `,

    /*  <Artifact/>  */
    "Artifact": textframe`
        <article>
            {{ Artifact.objects }}
        </article>
    `,

    /*  <Object/>  */
    "Object": textframe`
        <section>
            <h{{ Object.level }} id="{{ Object.id }}"><span class="object-kind"{% if Object.info %} data-info="{{ Object.info }}" data-info-path="{{ Object.infopath }}"{% endif %}>{{ Object.kind }}:</span> <span class="object-name"{% if Object.spec %} data-info-spec="{{ Object.spec }}" data-info-path="{{ Object.specpath }}"{% endif %}>{{ Object.name }}</span>{% if Object.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if Object.paren %} <span class="anchor-paren">({{ Object.paren }})</span>{% endif %} <a href="#{{ Object.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></h{{ Object.level }}>
            {{ Object.diagram }}
            {{ Object.properties }}
            {{ Object.description }}
            {{ Object.children }}
        </section>
    `,

    /*  <Properties/>  */
    "Properties": textframe`
        <table class="props">
            {% for property in Properties %}
            <tr><td class="key property-name"><span{% if property.info %} data-info="{{ property.info }}" data-info-path="{{ property.infopath }}" data-info-prop="{{ property.key }}"{% endif %}>{{ property.key }}</span></td><td>{{ property.value }}</td></tr>
            {% endfor %}
        </table>
    `,

    /*  <Description/>  */
    "Description": textframe`
        {%- if Description.block %}
        <div class="description">{{ Description.description }}{% if Description.rationale %}
            <p class="rationale">&mdash; <span class="keyword">BECAUSE</span> {{ Description.rationale }}</p>{% endif %}</div>
        {%- elif Description.description or Description.rationale %}
        <p class="description">{{ Description.description }}{% if Description.rationale %}
            <span class="rationale">&mdash; <span class="keyword">BECAUSE</span> {{ Description.rationale }}</span>{% endif %}</p>
        {%- endif %}
        {%- for embedding in Description.embeddings %}
        <div class="embedding">{{ embedding }}</div>
        {%- endfor %}
    `,

    /*  <Table/>  */
    "Table": textframe`
        <table class="objects">
            <thead>
                <tr>
                    <th class="object-kind"><span{% if Table.info %} data-info="{{ Table.info }}" data-info-path="{{ Table.infopath }}"{% endif %}>{{ Table.head }}</span></th>
                    {%- for key in Table.keys %}<th class="property-name"><span{% if Table.info %} data-info="{{ Table.info }}" data-info-path="{{ Table.infopath }}" data-info-prop="{{ key }}"{% endif %}>{{ key }}</span></th>{% endfor %}
                    {%- if Table.desc %}<th class="description" style="width: {{ Table.width }}%">Description</th>{% endif %}
                </tr>
            </thead>
            <tbody>
                {% for row in Table.rows %}
                <tr id="{{ row.id }}"{% if row.even %} class="even"{% endif %}>
                    <td><span{% if row.spec %} data-info-spec="{{ row.spec }}" data-info-path="{{ row.specpath }}"{% endif %}>{{ row.name }}</span>{% if row.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    {%- for value in row.values %}<td>{{ value }}</td>{% endfor %}
                    {%- if Table.desc %}<td>{{ row.description }}</td>{% endif %}
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `,

    /*  <TableChunked/>  */
    "TableChunked": textframe`
        <table class="objects">
            <thead>
                <tr>
                    <th class="object-kind" style="width: {{ Table.width }}%"><span{% if Table.info %} data-info="{{ Table.info }}" data-info-path="{{ Table.infopath }}"{% endif %}>{{ Table.head }}</span></th>
                    <th class="description">Properties</th>
                </tr>
            </thead>
            <tbody>
                {% for row in Table.rows %}
                <tr id="{{ row.id }}"{% if row.even %} class="even"{% endif %}>
                    <td><span{% if row.spec %} data-info-spec="{{ row.spec }}" data-info-path="{{ row.specpath }}"{% endif %}>{{ row.name }}</span>{% if row.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    <td class="chunks">
                        <table class="chunks">
                            {% for chunk in row.chunks %}
                            <tr>{% for cell in chunk %}<th{% if not cell.desc %} class="property-name"{% endif %}{% if cell.span > 1 %} colspan="{{ cell.span }}"{% endif %}><span{% if not cell.desc and Table.info %} data-info="{{ Table.info }}" data-info-path="{{ row.specpath }}" data-info-prop="{{ cell.key }}"{% endif %}>{{ cell.key }}</span></th>{% endfor %}</tr>
                            <tr>{% for cell in chunk %}<td{% if cell.span > 1 %} colspan="{{ cell.span }}"{% endif %}>{{ cell.value }}</td>{% endfor %}</tr>
                            {% endfor %}
                        </table>
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `
}

/*  the client-side script of the color theme: it applies the stored
    choice (or, without one, the document default and finally the system
    preference) before the first paint and toggles it on demand. The
    live preview placeholder page carries it, too, as an in-place
    document update never re-executes a head script  */
const themeScript = textframe`
    (function () {
        let style = null
        try { style = localStorage.getItem("specbook-theme") }
        catch { /*  an inaccessible storage just means no stored choice  */ }
        if (style === null) {
            const m = document.documentElement.className.match(/theme-(light|dark)/)
            style = m !== null ? m[1] : null
        }
        if (style === null)
            style = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        document.documentElement.className = "theme-" + style
    })()
    function themeSwitch () {
        const style = document.documentElement.className === "theme-dark" ? "light" : "dark"
        document.documentElement.className = "theme-" + style
        try { localStorage.setItem("specbook-theme", style) }
        catch { /*  an inaccessible storage just loses the choice  */ }
    }
`

/*  the minimal stylesheet of the live preview placeholder page: it also
    provides the <style> element the in-place document update swaps with
    the real stylesheet, so it carries the centered message only  */
const placeholderStylesheet = textframe`
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
const realtimeScript = textframe`
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
        const update = async () => {
            /*  a superseded update (an overlapping newer one started
                meanwhile) is dropped, as its stale page could arrive last  */
            const mine = ++seq
            let response
            try {
                response = await fetch(window.location.pathname, { cache: "no-store" })
            }
            catch {
                /*  an unreachable server just skips the update  */
                return
            }
            if (!response.ok)
                return
            const html = await response.text()
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
            for (const script of document.body.querySelectorAll("script:not(.realtime)")) {
                const clone = document.createElement("script")
                clone.textContent = script.textContent
                script.replaceWith(clone)
            }
            window.scrollTo(x, y)
            status("reloaded")
            clearTimeout(blink)
            blink = setTimeout(() => { status("connected") }, 2000)
        }
        let lost = false
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
const scrollProgressScript = textframe`
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
const tocPanelScript = textframe`
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
    hyperlinked object anchor), titled with the "data-info-path" object
    path and fed from the injected INFO/SPEC maps of pre-rendered
    description HTML; the popup is capped at 40% viewport width and
    attached above or below, whichever side offers more space; the
    script runs at the end of the body, so a live preview body swap
    replaces the popup and the body-bound listeners along with it  */
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
            const title = document.createElement("div")
            title.className = "info-title"

            /*  create a pointer, separating the title path segments  */
            const pointer = () => {
                const span = document.createElement("span")
                span.className = "info-pointer"
                span.textContent = "▷"
                return span
            }
            const segments = (source.getAttribute("data-info-path") ?? key ?? spec).split(" . ")
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
                const m    = /^([^\s:]+): (.*)$/.exec(segment)
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
            if (prop !== null) {
                title.appendChild(pointer())
                const name = document.createElement("span")
                name.className = "info-property"
                name.textContent = prop
                title.appendChild(name)
            }
            popup.replaceChildren(title)
            const entry = key !== null ? INFO[key] : undefined
            const desc  = prop !== null ? entry?.p?.[prop] :
                (spec !== null ? SPEC[spec] : entry?.d)
            if (desc !== undefined) {
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

/*  ==== Rendering ====  */

/*  the per-language double quote styles for the smart typography
    (single quotes stay curly, as smartypants cannot distinguish a
    closing single quote from an apostrophe)  */
const quoteStyles: Record<string, [ string, string ]> = {
    "en": [ "&#8220;",      "&#8221;"      ],  /*  “...”    */
    "nl": [ "&#8220;",      "&#8221;"      ],  /*  “...”    */
    "de": [ "&#8222;",      "&#8220;"      ],  /*  „...“    */
    "cs": [ "&#8222;",      "&#8220;"      ],  /*  „...“    */
    "sk": [ "&#8222;",      "&#8220;"      ],  /*  „...“    */
    "pl": [ "&#8222;",      "&#8221;"      ],  /*  „...”    */
    "fr": [ "&#171;&#160;", "&#160;&#187;" ],  /*  « ... »  */
    "it": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "es": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "pt": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "no": [ "&#171;",       "&#187;"       ],  /*  «...»    */
    "da": [ "&#187;",       "&#171;"       ],  /*  »...«    */
    "sv": [ "&#8221;",      "&#8221;"      ],  /*  ”...”    */
    "fi": [ "&#8221;",      "&#8221;"      ]   /*  ”...”    */
}

/*  the active double quote style (set per document during rendering)  */
let quotes: [ string, string ] = quoteStyles.en

/*  the private Markdown renderer instance, as the hooks below must not
    leak into the "marked" singleton shared with the parser and with the
    application embedding SpecBook as a library  */
const marked = new Marked()

/*  improve the typography of all rendered Markdown text (curly quotes,
    "--" as the em dash, ellipsis); as smartypants requires unescaped text,
    the extension switches off the text escaping of marked, so the stray
    ampersands left behind have to be re-escaped afterwards; the English
    double quotes of smartypants are remapped to the document language;
    as marked runs later-registered pass-through hooks first, the
    post-processing hook has to be registered before smartypants  */
marked.use({ hooks: { postprocess: (html) =>
    html.replace(/&#8220;/g, quotes[0]).replace(/&#8221;/g, quotes[1])
        .replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;") } })
marked.use(markedSmartypants({ config: 1 }))

/*  the switched-off text escaping of marked also leaves the angle
    brackets of the inline text unescaped, which a browser then takes
    for tags ("Map<String, Object>"), so they are escaped upfront in
    the inline text tokenizer (registered after smartypants, as the
    later-registered tokenizer takes precedence)  */
marked.use({ tokenizer: { inlineText (src) {
    const cap = this.rules.inline.text.exec(src)
    if (cap === null)
        return undefined
    return { type: "text", raw: cap[0], escaped: true,
        text: cap[0].replace(/</g, "&lt;").replace(/>/g, "&gt;") }
} } })

/*  the Nunjucks environment with the @rse/nunjucks-addons extensions  */
const env = new nunjucks.Environment(null, { autoescape: true })
nunjucksAddons(env)

/*  mark pre-rendered HTML as safe for template interpolation  */
const safe = (html: string) =>
    new nunjucks.runtime.SafeString(html)

/*  the built-in Nunjucks templates compiled on first use, as
    renderString() would re-compile a template on every single call
    (i.e. for every rendered object, property table, and description)  */
const compiled = new Map<keyof typeof templates, nunjucks.Template>()

/*  render one of the built-in Nunjucks templates with a context  */
const render = (name: keyof typeof templates, context: object): string => {
    let template = compiled.get(name)
    if (template === undefined) {
        template = new nunjucks.Template(templates[name], env, undefined, true)
        compiled.set(name, template)
    }
    return template.render(context)
}

/*  the active per-document reference expander, fully-qualified
    anchor paths, member-carrying property value constraints, object
    schema nodes, pre-rendered diagram SVGs, description popup keys
    of the schema nodes, and object parents of the description popup
    title paths (all set during HTML rendering)  */
let linker:      ((text: string, compact: boolean) => string) | null = null
let anchors:     Map<SpecObject, string> | null       = null
let members:     Map<string, ValueExpr> | null        = null
let schemas:     Map<SpecObject, SchemaObject> | null = null
let diagrams:    Map<SpecObject, string> | null       = null
let infoKeys:    Map<SchemaObject, string> | null     = null
let infoParents: Map<SpecObject, SpecObject> | null   = null

/*  the object whose texts are currently rendered, scoping the
    resolution of the references inside them (nearest object wins),
    established around every object rendering and restored afterwards  */
let scope: SpecObject | null = null
const scoped = <T>(object: SpecObject, body: () => T): T => {
    const outer = scope
    scope = object
    try {
        return body()
    }
    finally {
        scope = outer
    }
}

/*  determine the fully-qualified anchor path of an object  */
const anchorOf = (object: SpecObject): string =>
    anchors?.get(object) ?? object.id

/*  determine the description popup key of an object (the qualified
    title path of its schema node)  */
const infoKeyOf = (object: SpecObject): string | undefined => {
    const schema = schemas?.get(object)
    return schema !== undefined ? infoKeys?.get(schema) : undefined
}

/*  determine the description popup title path of an object: the chain
    of "KIND: Name" segments from the artifact down to the object
    (arbitrarily deep), where "named = false" keeps the last segment
    kind-only, as the kind popups (and the group headers of the compact
    tables) describe the object class instead of the single instance  */
const infoPathOf = (object: SpecObject, named = true): string => {
    const parent  = infoParents?.get(object)
    const prefix  = parent !== undefined ? `${infoPathOf(parent)} . ` : ""
    const name    = named ? plainText(object.name).trim() : ""
    const segment = name !== "" && object.kind !== "" ? `${object.kind}: ${name}` :
        (name !== "" ? name : object.kind)
    return prefix + segment
}

/*  render the schema description popup key and kind-ending title path
    of an object as "data-info" attributes for the manually assembled
    hyperlink markup (the kind popup of the full hyperlinks)  */
const infoAttr = (object: SpecObject): string => {
    const key = infoKeyOf(object)
    return key !== undefined ?
        ` data-info="${escapeHtml(key)}" data-info-path="${escapeHtml(infoPathOf(object, false))}"` : ""
}

/*  render the corpus description popup key (the fully-qualified anchor
    path) and name-ending title path of an object as "data-info-spec"
    attributes for the manually assembled hyperlink markup (the
    instance popup of the compact and full hyperlinks)  */
const specAttr = (object: SpecObject): string =>
    infoParents !== null ?
        ` data-info-spec="${escapeHtml(anchorOf(object))}" data-info-path="${escapeHtml(infoPathOf(object))}"` : ""

/*  an entry of the description popup map embedded into the document:
    the pre-rendered description HTML of an object kind ("d") and of
    its properties ("p", keyed by property name)  */
type InfoEntry = { d?: string, p?: Record<string, string> }

/*  collect the description popup map and the qualified title paths of
    the schema nodes (the artifact kind leading its name, the nested
    kinds appended), with the description Markdown of the objects and
    properties pre-rendered to HTML  */
const collectInfo = (nodes: SchemaObject[], prefix: string,
    keys: Map<SchemaObject, string>, info: Record<string, InfoEntry>) => {
    for (const schema of nodes) {
        const path = prefix !== "" ? `${prefix} . ${schema.kind}` :
            (schema.name !== undefined ? `${schema.kind}: ${schema.name}` : schema.kind)
        keys.set(schema, path)
        const entry: InfoEntry = {}
        if (schema.desc !== undefined)
            entry.d = marked.parse(schema.desc, { async: false }).trim()
        for (const property of schema.props ?? []) {
            if (property.desc === undefined)
                continue
            entry.p ??= {}
            entry.p[property.name] = marked.parse(property.desc, { async: false }).trim()
        }
        if (entry.d !== undefined || entry.p !== undefined)
            info[path] = entry
        collectInfo(schema.children ?? [], path, keys, info)
    }
}

/*  inject the description popup maps into their client-side script ("<"
    escaped, so no embedded HTML can close the surrounding <script>
    element)  */
const infoScript = (info: Record<string, InfoEntry>, spec: Record<string, string>): string =>
    infoPopupScript
        .replace("@INFO@", () => JSON.stringify(info).replace(/</g, "\\u003c"))
        .replace("@SPEC@", () => JSON.stringify(spec).replace(/</g, "\\u003c"))

/*  expand the inline Markdown of a text (code spans, emphasis, etc.),
    with Wiki-style references expanded upfront (in their compact form
    for prose, i.e. descriptions, in their full form otherwise)  */
const inline = (text: string, compact = false) =>
    safe(marked.parseInline(linker !== null ? linker(text, compact) : text, { async: false }))

/*  expand the full Markdown of a text, keeping its block-level
    constructs (lists, quotes, code blocks, tables) intact  */
const block = (text: string, compact = false) =>
    safe(marked.parse(linker !== null ? linker(text, compact) : text, { async: false }))

/*  check whether a text carries any block-level Markdown, i.e. is
    anything other than the single paragraph a description usually is  */
const isBlock = (text: string): boolean => {
    const tokens = marked.lexer(text).filter((token) => token.type !== "space")
    return tokens.length > 0 && !(tokens.length === 1 && tokens[0].type === "paragraph")
}

/*  render a single embedded image file onto an <img> tag with a
    self-contained data: URL (converting the SVG text into one, as an
    SVG inlined as-is would leak its document-global <style> rules
    into all other inlined SVGs sharing the same class names)  */
const renderImage = (content: string, alt: string): string => {
    const url = content.startsWith("data:") ? content :
        `data:image/svg+xml;base64,${Buffer.from(content, "utf8").toString("base64")}`
    return `<img src="${url}" alt="${escapeHtml(alt)}"/>`
}

/*  wrap the theme variants of an image into their layout-neutral theme
    containers, of which the stylesheet shows just the one matching the
    color theme currently active in the document  */
const renderThemed = (images: string[]): string =>
    images.map((image, i) =>
        `<span class="theme-${embeddingThemes[i]}-only">${image}</span>`).join("")

/*  render the embedded image files of a text into HTML, taking the image
    alternate texts from the corresponding "![alt](file)" markups and
    pairing up the consecutive theme variants of a "{theme}" markup
    (the empty entries of unreadable files are skipped)  */
const renderEmbeddings = (text: string, embedding: string[]): string[] => {
    const result = new Array<string>()
    let i = 0
    for (const m of text.matchAll(embeddingRegex)) {
        const reference = m[2].trim()
        if (embeddingMimeType(reference) === undefined)
            continue
        const variants = embeddingVariants(reference)
        const contents = embedding.slice(i, i + variants.length)
        const images   = contents.filter((content) => content !== "")
            .map((content) => renderImage(content, m[1].trim()))
        i += variants.length
        if (variants.length > 1 && images.length === variants.length)
            result.push(renderThemed(images))
        else
            result.push(...images)
    }
    return result
}

/*  the image embedding markup including the horizontal whitespace
    before it, so that its removal leaves no double space behind  */
const embeddingMarkup = new RegExp(`[ \\t]*${embeddingRegex.source}`, "g")

/*  render a description into HTML, expanding its inline Markdown and
    moving the file embeddings to the end of the description  */
const renderDescription = (description: SpecDescription): string => {
    const text = description.description
        .replace(embeddingMarkup, (markup, _alt, reference: string) =>
            embeddingMimeType(reference.trim()) !== undefined ? "" : markup)
        .trim()
    const embeddings = renderEmbeddings(description.description,
        description.embedding ?? []).map((content) => safe(content))
    const blocked = isBlock(text)
    return render("Description", { Description: {
        block:       blocked,
        description: text !== "" ? (blocked ? block(text, true) : inline(text, true)) : "",
        rationale:   description.rationale !== undefined ?
            inline(description.rationale, true) : undefined,
        embeddings
    } })
}

/*  collect the description popup map of the object instances: the
    corpus description Markdown of every object, pre-rendered to HTML
    and keyed by the fully-qualified anchor path (the embedded images
    and the rationale are left out, as the popup shows the prose alone)  */
const collectSpec = (objects: SpecObject[], spec: Record<string, string>) => {
    for (const object of objects) {
        const text = (object.description?.description ?? "")
            .replace(embeddingMarkup, (markup, _alt, reference: string) =>
                embeddingMimeType(reference.trim()) !== undefined ? "" : markup)
            .trim()
        if (text !== "")
            spec[anchorOf(object)] = scoped(object, () =>
                block(text, true).toString().trim())
        collectSpec(object.children, spec)
    }
}

/*  the literal members of an "enum(...)"/"tags(...)" expression, or
    of the "enum(...)"/"tags(...)" alternatives of a "list(...)" one
    (empty for every other expression)  */
const literalMembers = (expr: ValueExpr): string[] =>
    expr.kind === "enum" || expr.kind === "tags" ? expr.members :
        expr.kind === "list" ? expr.alternatives.flatMap(literalMembers) : []

/*  collect the properties of the schema configuration constrained by
    literal members (an "enum(...)", a "tags(...)", or a "list(...)"
    with such alternatives), keyed by object kind and property name  */
const collectMembers = (nodes: SchemaObject[], result: Map<string, ValueExpr>) => {
    for (const schema of nodes) {
        for (const property of schema.props ?? []) {
            if (property.value === undefined)
                continue
            try {
                const expr = compileValueExpr(property.value)
                if (literalMembers(expr).length > 0)
                    result.set(`${schema.kind} ${property.name}`, expr)
            }
            catch {
                /*  an invalid expression is the concern of lint  */
            }
        }
        collectMembers(schema.children ?? [], result)
    }
    return result
}

/*  render a property value, badging the individual members of an
    "enum(...)" (a single member) or "tags(...)" (a member set) value
    and the literal member items of a "list(...)" value (the other items,
    like references, stay prose), moving its image embeddings behind the
    value, rendered from the embedded image contents (as for a
    description), not from the markup; an absent property renders as the
    marker telling it apart from a property given with an empty value  */
const inlineValue = (kind: string, property: SpecProperty | undefined) => {
    if (property === undefined)
        return safe("<span class=\"value-absent\"></span>")
    const { key, value, embedding } = property
    const expr = members?.get(`${kind} ${key}`)
    const text = value
        .replace(embeddingMarkup, (markup, _alt, reference: string) =>
            embeddingMimeType(reference.trim()) !== undefined ? "" : markup)
        .trim()
    const embeddings = renderEmbeddings(value, embedding ?? [])
        .map((content) => `<div class="embedding">${content}</div>`).join("")
    if (expr === undefined || text === "")
        return safe(`${inline(text)}${embeddings}`)
    const badge = (item: string) => `<span class="value-member">${inline(item)}</span>`
    if (expr.kind === "enum")
        return safe(badge(text) + embeddings)
    const items = splitItems(text).filter((item) => item !== "")
    if (expr.kind === "tags")
        return safe(items.map(badge).join(" ") + embeddings)
    const literals = new Set(literalMembers(expr))
    return safe(items.map((item) => literals.has(item) ? badge(item) : inline(item)).join(", ") + embeddings)
}

/*  expand the inline Markdown of the property values, with the
    entries injected for unused properties (foreign to the object)
    rendered as absent  */
const inlineProperties = (object: SpecObject, properties: SpecProperty[]) =>
    properties.map((property) => ({ key: property.key,
        info: infoKeyOf(object), infopath: infoPathOf(object),
        value: inlineValue(object.kind, object.properties.includes(property) ? property : undefined) }))

/*  resolve the format configuration of the kind of an object  */
const formatOf = (object: SpecObject): SchemaFormat | undefined =>
    schemas?.get(object)?.format

/*  determine the maximum table columns configured on the kind of an
    object (at least two, as a single column cannot carry a name and a
    value)  */
const maxColumnsOf = (object: SpecObject): number =>
    Math.max(2, formatOf(object)?.maxTableColumns ?? 4)

/*  determine the effective properties of an object in schema order
    (unknown keys appended in document order), with "withUnusedProps"
    injecting the defined but still unused schema properties as empty
    key/value entries  */
const effectiveProperties = (object: SpecObject): SpecProperty[] => {
    const schema = schemas?.get(object)
    if (schema === undefined)
        return object.properties
    const unused = schema.format?.withUnusedProps === true
    const merged = (schema.props ?? []).flatMap((prop) => {
        const present = object.properties.filter((property) => property.key === prop.name)
        return present.length > 0 ? present : (unused ? [ { key: prop.name, value: "" } ] : [])
    })
    return [ ...merged, ...object.properties.filter((property) => !merged.includes(property)) ]
}

/*  determine the column shape of a potential compact table in schema
    order (unknown keys appended in occurrence order), with
    "withUnusedProps" injecting the defined but still unused schema
    properties as additional columns  */
const tableShape = (children: SpecObject[]) => {
    const used   = [ ...new Set(children.flatMap((child) =>
        child.properties.map((property) => property.key))) ]
    const schema = schemas?.get(children[0])
    const names  = (schema?.props ?? []).map((prop) => prop.name)
    const known  = schema?.format?.withUnusedProps === true ?
        names : names.filter((name) => used.includes(name))
    const keys   = [ ...known, ...used.filter((key) => !names.includes(key)) ]
    return { keys, desc: children.some((child) =>
        child.description !== undefined || child.children.length > 0) }
}

/*  provide the children of an object taking part in the regular document
    flow: a nested title object leaves the flow, as it is rendered as the
    title page instead (a top-level one instead removes its whole artifact)  */
const flowChildren = (object: SpecObject): SpecObject[] =>
    object.children.filter((child) => !isTitleObject(child))

/*  decide whether a single-kind group of children collapses into the
    concise (tabular) rendering: an explicit "format" type of the kind
    wins, "auto" collapses the deepest level only, and inside an already
    concise rendering context "auto" groups implicitly stay concise, too  */
const conciseGroup = (group: SpecObject[], schemaMap: Map<SpecObject, SchemaObject> | null,
    concise: boolean): boolean => {
    const type = schemaMap?.get(group[0])?.format?.type ?? "auto"
    if (type !== "auto")
        return type === "concise"
    return concise || group.every((child) => child.children.length === 0)
}

/*  group the children of an object by their kind, preserving order  */
const groupChildren = (children: SpecObject[]): SpecObject[][] => {
    const groups = new Map<string, SpecObject[]>()
    for (const child of children) {
        const group = groups.get(child.kind)
        if (group === undefined)
            groups.set(child.kind, [ child ])
        else
            group.push(child)
    }
    return [ ...groups.values() ]
}

/*  render the children of an object group-wise by kind: a concise group
    as one compact table, a complex group as regular nested object
    renderings  */
const renderChildren = (object: SpecObject, level: number, concise: boolean): string =>
    groupChildren(flowChildren(object)).map((group) => conciseGroup(group, schemas, concise) ?
        renderTable(group, maxColumnsOf(group[0])) :
        group.map((child) => renderObject(child, level, concise)).join("")).join("")

/*  render the description cell of a table row: the description of the
    object followed by its recursively rendered children (implicitly or
    explicitly concise groups as nested sub-tables, explicitly complex
    ones as regular nested object renderings pressed into the cell);
    a cell left without any content renders as the absent marker,
    exactly like a property cell of a not given property  */
const renderCell = (child: SpecObject): string => {
    let html = child.description !== undefined ? renderDescription(child.description) : ""
    html += renderChildren(child, 6, true)
    return html.trim() !== "" ? html : "<span class=\"value-absent\"></span>"
}

/*  the pre-rendered diagram of an object as an embeddable block
    (empty for an object without a configured or renderable diagram)  */
const diagramOf = (object: SpecObject) => {
    const diagram = diagrams?.get(object)
    return diagram !== undefined ? safe(`<div class="diagram">${diagram}</div>`) : ""
}

/*  render a single-kind group of children into one compact table:
    the name first, then the property columns, then the description;
    a group wider than maxColumns, or carrying diagrams, instead chunks
    the property and description cells (and the leading diagram) of
    every object into an embedded per-object table, as a diagram is
    identifiable only under a header of its own, not under the column
    headers of a plain table  */
const renderTable = (children: SpecObject[], maxColumns: number): string => {
    const { keys, desc } = tableShape(children)
    const diagrammed = children.some((child) => diagramOf(child) !== "")
    if (!diagrammed && 1 + keys.length + (desc ? 1 : 0) <= maxColumns)
        return render("Table", { Table: {
            head:     children[0].kind !== "" ? children[0].kind : "Name",
            info:     infoKeyOf(children[0]),
            infopath: infoPathOf(children[0], false),
            keys,
            desc,

            /*  under the fixed table layout the description column claims
                twice the share of a regular column, compressing the others  */
            width:    Math.round(200 / (keys.length + 3)),
            rows:     children.map((child, i) => scoped(child, () => ({
                id:          anchorOf(child),
                paren:       child.paren,
                primary:     child.primary,
                spec:        infoParents !== null ? anchorOf(child) : undefined,
                specpath:    infoPathOf(child),
                name:        inline(child.name),
                even:        i % 2 === 1,
                values:      keys.map((key) =>
                    inlineValue(child.kind, child.properties.find((property) => property.key === key))),
                description: safe(renderCell(child))
            })))
        } })

    /*  the embedded rows hold at most maxColumns - 1 cells (of the
        group-wide union of property keys, plus the trailing description),
        with the last cell spanning the leftover columns of the final row  */
    const size = Math.max(1, maxColumns - 1)
    return render("TableChunked", { Table: {
        head:     children[0].kind !== "" ? children[0].kind : "Name",
        info:     infoKeyOf(children[0]),
        infopath: infoPathOf(children[0], false),
        width:    Math.round(100 / maxColumns),
        rows:     children.map((child, i) => scoped(child, () => {
            const cells = keys.map((key) => ({ key, desc: false, span: 1,
                value: inlineValue(child.kind, child.properties.find((property) => property.key === key)) }))
            if (desc)
                cells.push({ key: "Description", desc: true, span: 1,
                    value: safe(renderCell(child)) })
            const chunks = new Array<typeof cells>()
            for (let pos = 0; pos < cells.length; pos += size)
                chunks.push(cells.slice(pos, pos + size))
            if (chunks.length > 0) {
                const last = chunks[chunks.length - 1]
                last[last.length - 1].span = size - last.length + 1
            }

            /*  the diagram leads the chunks as a full-width chunk of its
                own, headed like the description  */
            const diagram = diagramOf(child)
            if (diagram !== "")
                chunks.unshift([ { key: "Diagram", desc: true, span: size, value: diagram } ])
            return {
                id:       anchorOf(child),
                paren:    child.paren,
                primary:  child.primary,
                spec:     infoParents !== null ? anchorOf(child) : undefined,
                specpath: infoPathOf(child),
                name:     inline(child.name),
                even:     i % 2 === 1,
                chunks
            }
        }))
    } })
}

/*  recursively render an object into HTML  */
const renderObject = (object: SpecObject, level: number, concise: boolean): string => {
    const properties = effectiveProperties(object)
    return scoped(object, () => render("Object", { Object: {
        level:       Math.min(level, 6),
        kind:        object.kind,
        info:        infoKeyOf(object),
        infopath:    infoPathOf(object, false),
        spec:        infoParents !== null ? anchorOf(object) : undefined,
        specpath:    infoPathOf(object),
        id:          anchorOf(object),
        paren:       object.paren,
        primary:     object.primary,
        name:        inline(object.name),
        diagram:     diagramOf(object),
        properties:  properties.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object, properties) })) : "",
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        children:    safe(renderChildren(object, level + 1, concise))
    } }))
}

/*  format a timestamp as its calendar date in local time (the
    frontmatter timestamps are parsed in local time, too, so the UTC
    date of toISOString() could shift the day)  */
const formatDate = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-` +
    String(date.getDate()).padStart(2, "0")

/*  render the title object into a title page  */
const renderTitlePage = (object: SpecObject, created: string, modified: string): string => {
    const prop = (name: string) =>
        object.properties.find((property) => property.key === name)?.value
    const inlineProp = (name: string) => {
        const value = prop(name)
        return value !== undefined ? inline(value) : ""
    }
    const rest = object.properties.filter((property) =>
        ![ "LOGO", "TITLE", "SUBTITLE", "AUTHOR", "VERSION",
            "LANG", "CHARSET", "PAPER-SIZE", "THEME-STYLE", "THEME-TONE" ].includes(property.key))

    /*  the logo is rendered above the title, from the embedded image content
        of the LOGO property or, for a non-embeddable reference, as its inline
        Markdown; without a LOGO property the built-in SpecBook logo is used,
        in both its theme variants  */
    const logo  = object.properties.find((property) => property.key === "LOGO")
    const image = logo !== undefined ? renderEmbeddings(logo.value, logo.embedding ?? []) : []
    return scoped(object, () => render("TitlePage", { TitlePage: {
        logo:        logo === undefined ?
            safe(renderThemed(embeddingThemes.map((theme) =>
                `<img src="${fallbackLogo(theme)}" alt="SpecBook"/>`))) :
            (image.length > 0 ? safe(image.join("")) : inline(logo.value)),
        title:       inline(prop("TITLE") ?? object.name),
        subtitle:    inlineProp("SUBTITLE"),
        author:      inlineProp("AUTHOR"),
        version:     inlineProp("VERSION"),
        description: object.description !== undefined ?
            safe(renderDescription(object.description)) : "",
        properties:  rest.length > 0 ?
            safe(render("Properties", { Properties: inlineProperties(object, rest) })) : "",
        created, modified
    } }))
}

/*  render an artifact into HTML  */
const renderArtifact = (artifact: SpecArtifact): string =>
    render("Artifact", { Artifact: {
        objects: safe(artifact.objects.map((object) => renderObject(object, 1, false)).join(""))
    } })

/*  provide the children of an object rendered with headings of their own
    (skipping the child groups collapsing into compact tables), which
    are the ones taking part in the table of contents and its side panel  */
const headingChildren = (object: SpecObject): SpecObject[] =>
    groupChildren(flowChildren(object))
        .filter((group) => !conciseGroup(group, schemas, false))
        .flat()

/*  an entry of the table of contents  */
type TocEntry = { id: string, kind: string, name: nunjucks.runtime.SafeString,
    level: number, page?: number, info?: string, infopath?: string,
    spec?: string, specpath?: string }

/*  flatten the hierarchy of the rendered object headings (exactly like
    the PDF outline) into the entries of the table of contents, each
    carrying its nesting level and its optional page number  */
const tocEntries = (objects: SpecObject[], pages?: Map<string, number>): TocEntry[] => {
    const entries: TocEntry[] = []
    const collect = (objects: SpecObject[], level: number) => {
        for (const object of objects) {
            const id = anchorOf(object)
            entries.push({ id, kind: object.kind,
                info: infoKeyOf(object), infopath: infoPathOf(object, false),
                spec: infoParents !== null ? id : undefined, specpath: infoPathOf(object),
                name: inline(object.name), level: Math.min(level, 6), page: pages?.get(id) })
            collect(headingChildren(object), level + 1)
        }
    }
    collect(objects, 1)
    return entries
}

/*  render the side panel of the table of contents (its behavior is
    driven by the client-side script above): the unnumbered entries of
    the front matter (title page, table and diagram of contents, as far
    as present) are followed by the hierarchical entries of the rendered
    object headings, exactly like the table of contents itself  */
const renderTocPanel = (objects: SpecObject[], title: boolean, doc: boolean): string => {
    const entries = (objects: SpecObject[]): string =>
        objects.length === 0 ? "" : render("TocPanelEntries", { Entries: objects.map((object) => ({
            id:       anchorOf(object),
            kind:     object.kind,
            info:     infoKeyOf(object),
            infopath: infoPathOf(object, false),
            spec:     infoParents !== null ? anchorOf(object) : undefined,
            specpath: infoPathOf(object),
            name:     inline(object.name),
            children: safe(entries(headingChildren(object)))
        })) })
    return render("TocPanel", { TocPanel: { title, doc, entries: safe(entries(objects)) } })
}

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
        title:  (object.kind !== "" ? `${object.kind}: ` : "") + plainText(object.name),
        anchor: paths.get(object) ?? object.id,
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
    would dwarf the document text at 1:1  */
const scaledDiagrams = async (specification: Spec, config: Schema,
    verbose?: Verbose): Promise<Map<SpecObject, string>> => {
    const scale    = 0.75
    const rendered = new Map<SpecObject, string>()
    for (const [ object, result ] of await renderDiagrams(specification, config, verbose)) {
        /*  a "hub" diagram is capped to the width share it would
            occupy on its full three-column canvas (padded by the
            minimum widths of the absent columns and their channels),
            so all hub diagrams share the zoom level of the
            three-column ones and are centered in the leftover space  */
        const absent = result.columns !== undefined ? 3 - result.columns : 0
        const pad    = absent * (
            (result.config?.["size-node-width-min"]  ?? Gradia.config["size-node-width-min"]) +
            (result.config?.["hub-channel-width-min"] ?? Gradia.config["hub-channel-width-min"]))
        rendered.set(object, result.svg.replace(/(<svg[^>]*) width="([0-9.]+)" height="([0-9.]+)"/,
            (_, head: string, w: string, h: string) =>
                `${head} width="${Number(w) * scale}" height="${Number(h) * scale}"` +
                (result.columns !== undefined ? " class=\"hub\"" : "") +
                (absent > 0 ? ` style="max-width: ${(Number(w) / (Number(w) + pad) * 100).toFixed(2)}%"` : "")))
    }
    return rendered
}

/*  create the reference expander of a document: "[[xxx]]" references
    expand into hyperlinks (an unresolvable or ambiguous reference stays
    literal, marked as broken), resolved from the object currently
    rendered and targeting the fully-qualified anchor paths of the
    objects: in the full form (kind, name, and link symbol), or in the
    compact form for prose (the object icon and the name only, via CSS
    and markup, with the full form shown by the description popups)  */
const makeLinker = (index: LinkIndex) => (text: string, compact: boolean): string =>
    expandReferences(text, (reference) => {
        const target = resolveUnique(index, reference, scope ?? undefined).target
        if (target === undefined)
            return `<span class="link-broken">[[${escapeHtml(reference)}]]</span>`

        /*  the full form carries the popup attributes on its kind and
            name, with the kind bold in the accent color and the name
            bold in the regular text color (via the stylesheet)  */
        const full =
            `<strong class="object-kind"${infoAttr(target)}>${escapeHtml(target.kind)}:</strong>` +
            ` <span class="object-name"${specAttr(target)}>${target.name}</span>` +
            " <span class=\"link-symbol\">&#x26AD;</span>"
        return compact ?
            `<a href="#${escapeHtml(anchorOf(target))}" class="link-compact"${specAttr(target)}>${target.name}</a>` :
            `<a href="#${escapeHtml(anchorOf(target))}" class="link-full">${full}</a>`
    })

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

/*  render the entire specification into a self-contained HTML document,
    with the build-time pre-assembled stylesheet embedded inline, the
    artifact timestamps aggregated into min(Created)/max(Modified),
    optional per-anchor page numbers attached to the ToC entries, and
    optionally the client-side script of the live preview injected  */
export const renderHtml = async (specification: Spec, config?: Schema,
    tocPages?: Map<string, number>, css?: string, realtime = false,
    verbose?: Verbose): Promise<string> => {
    /*  pre-render the configured diagrams as scaled embeddable SVGs  */
    const rendered = config !== undefined ?
        await scaledDiagrams(specification, config, verbose) : null

    /*  the document language selects the smart typography quote style  */
    const lang = documentLang(specification)
    quotes = quoteStyles[lang?.toLowerCase().split(/[-_]/)[0] ?? "en"] ?? quoteStyles.en

    /*  establish the per-document rendering state (released again
        below, also on a failure of the collecting or rendering)  */
    const index = buildLinkIndex(specification)
    try {
        anchors  = anchorPaths(index)
        members  = config !== undefined ? collectMembers(config, new Map()) : null
        schemas  = config !== undefined ? collectSchemas(specification, config) : null
        diagrams = rendered

        /*  collect the schema descriptions for the description popups,
            plus the object parents composing their title paths  */
        let info: Record<string, InfoEntry> | null = null
        if (config !== undefined) {
            infoKeys = new Map<SchemaObject, string>()
            info     = {}
            collectInfo(config, "", infoKeys, info)
            const parents = new Map<SpecObject, SpecObject>()
            for (const node of index)
                if (node.parent !== undefined)
                    parents.set(node.object, node.parent.object)
            infoParents = parents
        }
        linker   = makeLinker(index)

        /*  collect the corpus descriptions of the object instances for the
            description popups (after the linker is in place, as the
            pre-rendered descriptions expand their references, too)  */
        let spec: Record<string, string> | null = null
        if (info !== null) {
            spec = {}
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
        const doc       = meta !== undefined ? rendered?.get(meta) : undefined
        const objects   = artifacts.flatMap((artifact) => artifact.objects)
        const entries   = tocEntries(objects, tocPages)
        return render("Document", { Document: {
            title:       documentTitle(specification).title,
            lang,
            theme:       documentThemeStyle(specification)?.toLowerCase(),
            css:         safe(css ?? stylesheet()),
            themescript: safe(themeScript),
            titlepage:   title !== undefined ?
                safe(renderTitlePage(title,
                    formatDate(created), formatDate(modified))) : "",
            search:      safe(searchScript()),
            progress:    safe(scrollProgressScript),
            info:        info !== null ? safe(infoScript(info, spec ?? {})) : "",
            realtime:    realtime ? safe(realtimeScript) : "",
            toc:         entries.length > 0 ? safe(render("Toc", { Toc: { entries } })) : "",
            tocpanel:    entries.length > 0 ?
                safe(renderTocPanel(objects,
                    title !== undefined, doc !== undefined)) : "",
            tocscript:   entries.length > 0 ? safe(tocPanelScript) : "",
            doc:         doc !== undefined ? safe(render("Doc", { Doc: { diagram: safe(doc) } })) : "",
            artifacts:   safe(artifacts.map((artifact) => renderArtifact(artifact)).join(""))
        } })
    }
    finally {
        /*  release the per-document state (also on a rendering failure),
            as it would otherwise retain the specification (and its
            embedded images) until the next rendering  */
        linker      = null
        anchors     = null
        members     = null
        schemas     = null
        diagrams    = null
        infoKeys    = null
        infoParents = null
    }
}
