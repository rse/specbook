/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  the "Fit Check" self-qualification entries

    SpecBook is deliberately opinionated, so it inherently fits some people and
    inherently repels others. The two lists below state this plainly instead of
    leaving the visitor to discover it after installing: `fitFor` restates the
    documented design assumptions from the visitor's point of view, `fitAgainst`
    states the honest boundaries and the non-goals.

    The `body` texts carry the same lightweight inline HTML the other data
    modules use, so the section renders them via `set:html`.

    The optional `icon` carries a Lucide component that the section renders as a
    prefix of the title. The icons are imported one by one from
    `@lucide/astro/icons/*` instead of the package barrel, so only the used ones
    are pulled through the bundler.  */

import type { AstroComponent } from "@lucide/astro"
import GitCompareArrows        from "@lucide/astro/icons/git-compare-arrows"
import Ruler                   from "@lucide/astro/icons/ruler"
import Bot                     from "@lucide/astro/icons/bot"
import FileOutput              from "@lucide/astro/icons/file-output"
import SquareTerminal          from "@lucide/astro/icons/square-terminal"
import Puzzle                  from "@lucide/astro/icons/puzzle"
import MousePointerClick       from "@lucide/astro/icons/mouse-pointer-click"
import Images                  from "@lucide/astro/icons/images"
import Users                   from "@lucide/astro/icons/users"
import Table                   from "@lucide/astro/icons/table"
import SlidersHorizontal       from "@lucide/astro/icons/sliders-horizontal"
import Gauge                   from "@lucide/astro/icons/gauge"

export type Fit = {
    icon?: AstroComponent  /*  Lucide icon rendered as prefix of the title          */
    title: string          /*  short, bold headline of the qualification criterion  */
    body:  string          /*  one- to two-sentence elaboration of the criterion    */
}

export const fitFor: Fit[] = [
    {
        icon:  GitCompareArrows,
        title: "You want your specification in version control",
        body:  "A specification is plain Markdown here, so it branches, diffs, reviews, and merges " +
               "exactly like the code it specifies &mdash; no binary document, no shared drive, no lock."
    },
    {
        icon:  Ruler,
        title: "You want a specification that is actually checked",
        body:  "<b>SpecBook</b> validates object kinds, hierarchies, property values, and references, " +
               "and reports every violation as a file- and line-precise diagnostic. " +
               "An invalid specification never gets exported."
    },
    {
        icon:  Bot,
        title: "You want AI agents to read and write your specification",
        body:  "The AST exports (JSON, JSON5, YAML, TOON) plus the <code>specbook describe</code> command give an " +
               "LLM both the content and the rules of the format, so it can consume and produce a " +
               "specification instead of guessing at one."
    },
    {
        icon:  FileOutput,
        title: "You need one source but several renderings",
        body:  "The same specification corpus becomes a searchable HTML document for developers, a paginated PDF for " +
               "customers, a normalized Markdown file, and a machine-readable AST &mdash; from a single " +
               "<code>specbook export</code> run."
    },
    {
        icon:  SquareTerminal,
        title: "You like the Unix command-line style",
        body:  "<b>SpecBook</b> is a CLI with explicit commands and Unix-style options, like " +
               "<code>specbook export -b docs -o spec.pdf</code> &mdash; scriptable, watchable, and " +
               "CI-friendly."
    },
    {
        icon:  Puzzle,
        title: "Your domain needs its own object kinds",
        body:  "The YAML schema configuration defines the objects and properties a specification may contain. An " +
               "extensive, bundled, standard configuration applies out of the box, and several configurations can be " +
               "merged into one effective schema."
    }
]

export const fitAgainst: Fit[] = [
    {
        icon:  MousePointerClick,
        title: "You want a WYSIWYG editor",
        body:  "<b>SpecBook</b> has no authoring UI at all. You write Markdown in your prefered text editor and " +
               "let the tool lint, export, and preview it."
    },
    {
        icon:  Images,
        title: "You want free-form documents",
        body:  "Every object has to strictly conform to the schema configuration: allowed object kinds, allowed object nesting, " +
               "mandatory object properties, and constrained values. That rigor is the whole point &mdash; and " +
               "it is a cost."
    },
    {
        icon:  Users,
        title: "You need real-time collaborative editing",
        body:  "Collaboration happens through your version control system, with branches, pull requests, " +
               "and reviews &mdash; not through simultaneous cursors in a shared document."
    },
    {
        icon:  Table,
        title: "You are looking for a requirements management suite",
        body:  "There is no issue tracker, no baseline management, no approval workflow, and no user " +
               "administration. <b>SpecBook</b> is a specification <i>format</i> plus its tooling."
    },
    {
        icon:  SlidersHorizontal,
        title: "You want an unopinionated document generator",
        body:  "<b>SpecBook</b> ships a fixed object model, a fixed Markdown mapping, and a fixed theming " +
               "mechanism. You configure it through the schema, but you cannot make it neutral."
    },
    {
        icon:  Gauge,
        title: "Your specification is a single short page of prose",
        body:  "Below a certain size the schema configuration, the linting, and the export pipeline cost " +
               "more than they return. Plain Markdown is then simply the better tool."
    }
]
