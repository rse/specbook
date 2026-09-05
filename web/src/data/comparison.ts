/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  the three-way comparison of how a recurring specification work-step plays
    out with an office document, with plain Markdown, and with SpecBook. The
    cells carry the same lightweight inline markup the other data modules use
    ("**bold**", "*italic*", "`code`"), which the rendering section expands.  */

export type Comparison = {
    topic:    string  /*  the recurring work-step being compared           */
    office:   string  /*  how it plays out in a classic office document    */
    markdown: string  /*  how it plays out in plain, unconstrained Markdown */
    specbook: string  /*  how it plays out with SpecBook                    */
}

export const comparison: Comparison[] = [
    {
        topic:    "Reviewing a change",
        office:   "Track-changes inside a binary file, reviewed *outside* of the code review.",
        markdown: "A textual diff in the pull request, but **no** notion whether the structure is still valid.",
        specbook: "A textual diff in the pull request **plus** a `specbook lint` run tells whether the structure is still valid."
    },
    {
        topic:    "Keeping structure",
        office:   "Structure is a **styling** convention, upheld by discipline alone.",
        markdown: "Headings are free-form; nothing stops a new, undeclared section kind.",
        specbook: "Object kinds, nesting, and properties are declared in the **schema configuration** and enforced on every run."
    },
    {
        topic:    "Cross-referencing",
        office:   "Manual cross-references that silently rot when a chapter is renamed.",
        markdown: "Hand-written anchors, checked by nothing.",
        specbook: "Wiki-style `[[xxx]]` references, resolved against object ids and names; an unresolvable one is an **error**."
    },
    {
        topic:    "Drawing a diagram",
        office:   "With a drawing tool, exported as a bitmap image, updated by hand — if at all.",
        markdown: "An embedded image or a hand-written diagram source, maintained separately.",
        specbook: "Derived **automatically** from the object model, so it cannot drift away from the text."
    },
    {
        topic:    "Handing it over",
        office:   "The document *is* the deliverable — one format, one audience.",
        markdown: "A separate converter run per target format, configured per project.",
        specbook: "One `specbook export` run can yield **HTML**, **PDF**, normalized **Markdown**, and the machine-readable **AST**."
    },
    {
        topic:    "Feeding an AI agent",
        office:   "Extract the text first and lose the structure on the way.",
        markdown: "The agent sees prose and has to *infer* the intended structure.",
        specbook: "The agent reads the **AST** and the `specbook describe` output — content *and* rules, so it can also write back."
    },
    {
        topic:    "Checking test coverage",
        office:   "A traceability matrix maintained by hand in yet another table.",
        markdown: "Not available at all.",
        specbook: "The `coverage` declaration reports the **covered/total ratio** per object kind, in the verbose log, the HTML export, and the AST."
    },
    {
        topic:    "Reading while writing",
        office:   "Save, switch application, scroll back to where you were.",
        markdown: "Editor preview, usually per single file.",
        specbook: "`specbook preview` serves the **whole corpus** live and replaces the document in place — scroll position and theme survive."
    }
]
