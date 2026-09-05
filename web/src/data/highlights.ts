/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  curated Unique-Selling-Point (USP) highlights

    Each entry states one distinct SpecBook feature (distilled from the project
    `README.md`) and optionally pairs it with one illustrating asset from
    `public/assets/`. The `Widget-Feature-Row.astro` component alternates the
    text/figure column order per row, so the order below is also the visual
    top-to-bottom order on the page.

    The `figure` is optional: a row without one renders its text full-width, so
    only the features that genuinely have something to show carry an image.

    Each entry also carries the Lucide icon the row renders in front of its
    headline. The icons are imported one by one from `@lucide/astro/icons/*`
    instead of the package barrel, so only the used ones are pulled through the
    bundler.  */

import type { AstroComponent } from "@lucide/astro"
import ListTree                from "@lucide/astro/icons/list-tree"
import FileText                from "@lucide/astro/icons/file-text"
import Link                    from "@lucide/astro/icons/link"
import ShieldCheck             from "@lucide/astro/icons/shield-check"
import Workflow                from "@lucide/astro/icons/workflow"
import Braces                  from "@lucide/astro/icons/braces"
import MonitorSmartphone       from "@lucide/astro/icons/monitor-smartphone"
import Printer                 from "@lucide/astro/icons/printer"
import Palette                 from "@lucide/astro/icons/palette"

export type Highlight = {
    icon:     AstroComponent  /*  the Lucide icon prefixing the headline           */
    eyebrow:  string          /*  short, signal-colored eyebrow above the heading  */
    title:    string          /*  the headline of the USP                          */
    body:     string          /*  a two- to four-sentence elaboration              */
    figure?:  string          /*  optional path of the illustrating asset          */
    label?:   string          /*  the accessible label/caption of the figure       */
}

export const highlights: Highlight[] = [
    {
        icon:    ListTree,
        eyebrow: "Hierarchical Object Model",
        title:   "A specification is a tree of typed objects",
        body:    "Every object carries a kind and a name, an optional id, optional properties, " +
                 "an optional description, and optional child objects. Which object kinds are " +
                 "allowed, how they may nest, and which properties they carry is defined per " +
                 "context by the YAML schema configuration &mdash; not hard-wired into the tool."
    },
    {
        icon:    FileText,
        eyebrow: "Versatile Markdown Mapping",
        title:   "Authored as plain Markdown, not as a foreign format",
        body:    "Objects are written as ordinary Markdown headings, property lists, and " +
                 "description prose &mdash; readable and diff-able in any editor and any code review. " +
                 "The very same object model maps onto nested sections (the <i>complex</i> format) " +
                 "or onto compact bullet point lists (the <i>concise</i> and <i>group</i> formats).",
        figure:  "/assets/screenshot-sample.png",
        label:   "SpecBook HTML rendering of the simple sample specification"
    },
    {
        icon:    Link,
        eyebrow: "Wiki-Style Object Linking",
        title:   "Objects reference each other through [[xxx]] links",
        body:    "References are resolved against the locally-unique ids and names of all objects " +
                 "across the entire corpus, so a fact lives in exactly one place and every other " +
                 "place points at it. In the HTML and PDF exports the references become navigable " +
                 "links onto precise anchors."
    },
    {
        icon:    ShieldCheck,
        eyebrow: "Strict Validation",
        title:   "The schema configuration is enforced, not suggested",
        body:    "The YAML schema configuration defines the allowed object kinds, hierarchies, and " +
                 "properties, whose values are constrained by an expression language (regex, enum, " +
                 "tags, list, and reference). Beyond the plain values it constrains the uniqueness " +
                 "and presence of a property among the sibling objects, the shape of a " +
                 "reference-valued property (local, symmetric, and/or acyclic), and it can declare " +
                 "the child objects of an object kind a finite state machine, whose reachability, " +
                 "dead-ends, and livelocks are then checked. Violations are reported as file- and " +
                 "line-precise diagnostics."
    },
    {
        icon:    Workflow,
        eyebrow: "Diagram Visualisation",
        title:   "Diagrams derived from the object model itself",
        body:    "Object kinds can declare <code>graph</code>, <code>hub</code>, or <code>grid</code> " +
                 "diagrams in the schema, whose nodes and edges are derived automatically from the " +
                 "object model and its references &mdash; so a diagram can never drift away from the " +
                 "specification it depicts. The rendering is done by the sibling project " +
                 "<a href=\"https://github.com/rse/gradia\">Gradia</a>, which is specialized in " +
                 "rendering object models.",
        figure:  "/assets/poster-2.png",
        label:   "SpecBook object model and diagram overview poster"
    },
    {
        icon:    Braces,
        eyebrow: "AST Exports for AI/LLMs",
        title:   "Machine-readable, so agents read and write specifications",
        body:    "The parsed Abstract Syntax Tree (AST) exports into JSON, JSON5, YAML, or TOON for " +
                 "machine consumption, with the derived diagram of an object attached as a textual " +
                 "Gradia spec and the reference coverage it reports attached as its counts. " +
                 "Together with the <code>describe</code> command, which explains the models and " +
                 "formats, this enables LLMs to both read and write specifications."
    },
    {
        icon:    MonitorSmartphone,
        eyebrow: "HTML Export for Developers",
        title:   "One self-contained document for daily reading",
        body:    "A single HTML document with a title page, a table of contents (also as a slide-in " +
                 "side panel), a diagram of contents, a fuzzy full-text search, embedded images, " +
                 "reference coverage tables, a scroll progress meter, description popups, and a " +
                 "light/dark theme toggle. It can even be previewed live in the browser, updating " +
                 "in place on every change while the scroll position survives.",
        figure:  "/assets/screenshot-broadcast.png",
        label:   "SpecBook HTML rendering of the complex Broadcast specification"
    },
    {
        icon:    Printer,
        eyebrow: "PDF Export for Customers",
        title:   "A polished, paginated document to hand over",
        body:    "The PDF export prints the HTML rendering through Chromium and post-processes it " +
                 "with page numbers, headers and footers, a brand bar, and a hierarchical PDF " +
                 "outline. The paper size (A4, Letter, or Legal) drives the pagination and scales " +
                 "the diagrams down to fit onto a single page.",
        figure:  "/assets/screenshot-broadcast-print.png",
        label:   "SpecBook PDF rendering of the complex Broadcast specification"
    },
    {
        icon:    Palette,
        eyebrow: "Theming and Typography",
        title:   "The title object drives the whole document",
        body:    "Title, subtitle, author, version, and logo fill the title page (with an optional " +
                 "light/dark variant of the logo), the language selects the smart typography quote " +
                 "style, the color tone seeds the theme color spreads of both the light and the " +
                 "dark theme, and the character set subsets the embedded fonts down to the actually " +
                 "needed glyphs."
    }
]
