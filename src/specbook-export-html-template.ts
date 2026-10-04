/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import nunjucks       from "nunjucks"
import nunjucksAddons from "@rse/nunjucks-addons"
import textframe      from "textframe"

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
                    <div class="search-toggle" id="search-toggle" title="toggle search field"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3.5,4.5 20.5,4.5 14,12.5 14,20 10,17.5 10,12.5"/></svg></div>
                    <div class="search-field">
                        <input type="text" id="search-input" placeholder="Filter&hellip; (fuzzy matched keywords)" autocomplete="off" spellcheck="false"/>
                        <span class="search-clear" id="search-clear" title="clear search">&#x00D7;</span>
                    </div>
                </div>
                {%- if not Document.omitted.all %}
                <div class="fold-switch">
                    <div class="fold-toggle" title="toggle folding controls"><svg class="fold-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5l5 5 5-5"/><path d="M7 20.5l5-5 5 5"/></svg></div>
                    <div class="fold-controls">
                        {% if not Document.omitted.graph %}<div class="fold-graphs" title="fold/unfold all graph diagrams"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="5.5" r="3"/><circle cx="18.5" cy="5.5" r="3"/><circle cx="12" cy="18.5" r="3"/><path d="M7.3 8.1 10.6 15.9"/><path d="M16.7 8.1 13.4 15.9"/></svg></div>{% endif %}
                        {% if not Document.omitted.hub %}<div class="fold-hubs" title="fold/unfold all hub diagrams"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><circle cx="3.5" cy="4.5" r="2"/><circle cx="3.5" cy="19.5" r="2"/><circle cx="20.5" cy="4.5" r="2"/><circle cx="20.5" cy="19.5" r="2"/><path d="M5.5 4.5H10V9.1"/><path d="M18.5 4.5H14V9.1"/><path d="M5.5 19.5H10V14.9"/><path d="M18.5 19.5H14V14.9"/></svg></div>{% endif %}
                        {% if not Document.omitted.grid %}<div class="fold-grids" title="fold/unfold all grid diagrams"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></svg></div>{% endif %}
                        {% if not Document.omitted.code %}<div class="fold-codes" title="fold/unfold all diagrams as code"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5"/><path d="M16 7l5 5-5 5"/><path d="M13.5 4l-3 16"/></svg></div>{% endif %}
                        {% if not Document.omitted.image %}<div class="fold-images" title="fold/unfold all images"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="19" height="17" rx="2"/><circle cx="8.5" cy="9" r="2"/><path d="M21.5 15.5l-5-5-11 10"/></svg></div>{% endif %}
                        {% if not Document.omitted.listing %}<div class="fold-listings" title="fold/unfold all code listings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11.5"/><path d="M9 12h11.5"/><path d="M9 18h7"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/></svg></div>{% endif %}
                        {% for level in [ 1, 2, 3 ] %}{% if not Document.omitted["level" ~ level] %}<div class="fold-level{{ level }}" title="fold/unfold all diagrams from nesting level {{ level }} on"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><rect x="6.5" y="6.5" width="3" height="3" rx="0.5"/><text x="19.5" y="23" text-anchor="middle" font-size="14.5" font-weight="bold" fill="currentColor" stroke="none">{{ level }}</text></svg></div>{% endif %}{% endfor %}
                        {% if not Document.omitted.text %}<div class="fold-texts" title="fold/unfold all cell texts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7V4.5h15V7"/><path d="M12 4.5v15"/><path d="M8.5 19.5h7"/></svg></div>{% endif %}
                    </div>
                </div>
                {%- endif %}
                <div class="scroll-progress" title="scroll to top"><svg class="scroll-ring" viewBox="0 0 44 44" fill="none" stroke-width="2.5"><circle class="scroll-todo" cx="22" cy="22" r="20"/><circle class="scroll-done" cx="22" cy="22" r="20" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg><svg class="scroll-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></div>
                {{ Document.tocpanel }}
                {{ Document.titlepage }}
                {{ Document.toc }}
                {{ Document.doc }}
                {{ Document.artifacts }}
                {% if Document.search %}<script>{{ Document.search }}</script>{% endif %}
                <script>{{ Document.progress }}</script>
                <script>{{ Document.fold }}</script>
                <script>{{ Document.maximize }}</script>
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
                <tr class="level-{{ entry.level }}"><td><a href="#{{ entry.id }}"><span class="object-kind"{% if entry.info %} data-info="{{ entry.info }}" data-info-path="{{ entry.infopath }}"{% endif %}>{{ entry.kind }}:</span> <span class="object-name"{% if entry.spec %} data-info-spec="{{ entry.spec }}"{% endif %}>{{ entry.name }}</span> <span class="link-symbol">&#x26AD;</span></a></td>{% if entry.page %}<td class="page"><a href="#{{ entry.id }}">{{ entry.page }}</a></td>{% endif %}</tr>
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
            <li><a href="#{{ entry.id }}"><span class="entry"><span class="object-kind"{% if entry.info %} data-info="{{ entry.info }}" data-info-path="{{ entry.infopath }}"{% endif %}>{{ entry.kind }}:</span> <span class="object-name"{% if entry.spec %} data-info-spec="{{ entry.spec }}"{% endif %}>{{ entry.name }}</span></span></a>{{ entry.children }}</li>
            {% endfor %}
        </ul>
    `,

    /*  <Doc/>  */
    "Doc": textframe`
        <nav class="doc" id="doc">
            <h1>Diagram of Contents</h1>
            {{ Doc.diagram }}
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
            <h{{ Object.level }} id="{{ Object.id }}"{% if Object.anchor %} data-id="{{ Object.anchor }}"{% endif %}><span class="object-kind"{% if Object.info %} data-info="{{ Object.info }}" data-info-path="{{ Object.infopath }}"{% endif %}>{{ Object.kind }}:</span> <span class="object-name"{% if Object.spec %} data-info-spec="{{ Object.spec }}"{% endif %}>{{ Object.name }}</span>{% if Object.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if Object.paren %} <span class="anchor-paren">({{ Object.paren }})</span>{% endif %} <a href="#{{ Object.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></h{{ Object.level }}>
            {{ Object.diagram }}
            {{ Object.properties }}
            {{ Object.description }}
            {{ Object.coverage }}
            {{ Object.children }}
        </section>
    `,

    /*  <Coverage/>  */
    "Coverage": textframe`
        <table class="coverage">
            <thead>
                <tr><th>Coverage</th><th>Covered</th><th>Total</th><th class="ratio">Ratio</th></tr>
            </thead>
            <tbody>
                {% for entry in Coverage %}
                <tr{% if entry.even %} class="even"{% endif %}><td>{{ entry.label }}</td><td>{{ entry.covered }}</td><td>{{ entry.total }}</td><td class="ratio"><span class="bar"><span style="width: {{ entry.ratio }}%"></span></span> {{ entry.ratio }}%</td></tr>
                {% endfor %}
            </tbody>
        </table>
    `,

    /*  <Properties/>  */
    "Properties": textframe`
        <table class="props"{% if Fold %} data-fold-height="{{ Fold }}"{% endif %}>
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
        {%- if Description.elaboration %}
        <div class="description">{{ Description.elaboration }}</div>
        {%- endif %}
        {%- for embedding in Description.embeddings %}
        <div class="embedding">{{ embedding }}</div>
        {%- endfor %}
    `,

    /*  <Table/>  */
    "Table": textframe`
        <table class="objects"{% if Table.fold %} data-fold-height="{{ Table.fold }}"{% endif %}>
            <thead>
                <tr>
                    <th class="object-kind"><span{% if Table.info %} data-info="{{ Table.info }}" data-info-path="{{ Table.infopath }}"{% endif %}>{{ Table.head }}</span></th>
                    {%- for key in Table.keys %}<th class="property-name"><span{% if Table.info %} data-info="{{ Table.info }}" data-info-path="{{ Table.infopath }}" data-info-prop="{{ key }}"{% endif %}>{{ key }}</span></th>{% endfor %}
                    {%- if Table.desc %}<th class="description" style="width: {{ Table.width }}%">Description</th>{% endif %}
                </tr>
            </thead>
            <tbody>
                {% for row in Table.rows %}
                <tr id="{{ row.id }}"{% if row.anchor %} data-id="{{ row.anchor }}"{% endif %}{% if row.even %} class="even"{% endif %}>
                    <td><span{% if row.spec %} data-info-spec="{{ row.spec }}"{% endif %}>{{ row.name }}</span>{% if row.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    {%- for value in row.values %}<td>{{ value }}</td>{% endfor %}
                    {%- if Table.desc %}<td>{{ row.description }}</td>{% endif %}
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `,

    /*  <TableChunked/>  */
    "TableChunked": textframe`
        <table class="objects"{% if Table.fold %} data-fold-height="{{ Table.fold }}"{% endif %}>
            <thead>
                <tr>
                    <th class="object-kind"><span{% if Table.info %} data-info="{{ Table.info }}" data-info-path="{{ Table.infopath }}"{% endif %}>{{ Table.head }}</span></th>
                    <th class="description">Properties{% if Table.desc %} &amp; Description{% endif %}</th>
                </tr>
            </thead>
            <tbody>
                {% for row in Table.rows %}
                <tr id="{{ row.id }}"{% if row.anchor %} data-id="{{ row.anchor }}"{% endif %}{% if row.even %} class="even"{% endif %}>
                    <td><span{% if row.spec %} data-info-spec="{{ row.spec }}"{% endif %}>{{ row.name }}</span>{% if row.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    <td class="chunks">
                        <table class="chunks">
                            {% for chunk in row.chunks %}
                            <tr>{% for cell in chunk %}<th{% if not cell.desc %} class="property-name"{% endif %}{% if cell.span > 1 %} colspan="{{ cell.span }}"{% endif %}><span{% if not cell.desc and Table.info %} data-info="{{ Table.info }}" data-info-path="{{ row.spec }}" data-info-prop="{{ cell.key }}"{% endif %}>{{ cell.key }}</span></th>{% endfor %}</tr>
                            <tr>{% for cell in chunk %}<td{% if cell.span > 1 %} colspan="{{ cell.span }}"{% endif %}>{{ cell.value }}</td>{% endfor %}</tr>
                            {% endfor %}
                        </table>
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `,

    /*  <TableCompact/>  */
    "TableCompact": textframe`
        <table class="objects"{% if Table.fold %} data-fold-height="{{ Table.fold }}"{% endif %}>
            <thead>
                <tr>
                    <th class="object-kind"><span{% if Table.info %} data-info="{{ Table.info }}" data-info-path="{{ Table.infopath }}"{% endif %}>{{ Table.head }}</span></th>
                    <th class="description">{{ Table.label }}</th>
                </tr>
            </thead>
            <tbody>
                {% for row in Table.rows %}
                <tr id="{{ row.id }}"{% if row.anchor %} data-id="{{ row.anchor }}"{% endif %}{% if row.even %} class="even"{% endif %}>
                    <td><span{% if row.spec %} data-info-spec="{{ row.spec }}"{% endif %}>{{ row.name }}</span>{% if row.primary %} <span class="primary-marker">&#x2318;</span>{% endif %}{% if row.paren %} <span class="anchor-paren">({{ row.paren }})</span>{% endif %} <a href="#{{ row.id }}"><span class="anchor-symbol">&#x2693;&#xFE0E;</span></a></td>
                    <td class="compact">{{ row.content }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    `
}

/*  the Nunjucks environment with the @rse/nunjucks-addons extensions  */
const env = new nunjucks.Environment(null, { autoescape: true })
nunjucksAddons(env)

/*  mark pre-rendered HTML as safe for template interpolation  */
export const safe = (html: string) =>
    new nunjucks.runtime.SafeString(html)

/*  the built-in Nunjucks templates compiled on first use, as
    renderString() would re-compile a template on every single call
    (i.e. for every rendered object, property table, and description)  */
const compiled = new Map<keyof typeof templates, nunjucks.Template>()

/*  render one of the built-in Nunjucks templates with a context  */
export const render = (name: keyof typeof templates, context: object): string => {
    let template = compiled.get(name)
    if (template === undefined) {
        template = new nunjucks.Template(templates[name], env, undefined, true)
        compiled.set(name, template)
    }
    return template.render(context)
}
