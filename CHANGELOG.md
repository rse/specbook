
ChangeLog
=========

0.9.8 (2026-08-25)
------------------

-   BUGFIX [code]: report a diagram edge object carrying no resolvable source or target reference just once
-   BUGFIX [code, docs]: emit a property value carrying a ", BECAUSE " as a nested key/value item in the Markdown export
-   BUGFIX [code, docs]: keep child objects of object in Complex Format in Markdown export when a descendant carries a description containing a ";", too
-   BUGFIX [code]: report an unrecognized explicit "<format>:" output prefix as an error (listing the accepted format names) instead of silently ignoring it
-   BUGFIX [code, docs]: report the sibling objects of the schema configuration which collide on their resolution key
-   BUGFIX [code]: assign the implicit "(xxx)" anchor ids of the objects below an unresolved artifact or an unknown object kind

0.9.7 (2026-08-24)
------------------

-   BUGFIX [code, docs]: keep child objects of object in Complex Format in Markdown export when a descendant carries multi-line description
-   BUGFIX [code, docs, othr]: report sibling objects of the same kind which collide on their anchor id (like two "start" transitions below one lifecycle of the sample state model, now disambiguated with explicit "{{xxx}}" anchors), instead of silently deriving identical anchor paths for them, which only surfaced indirectly as an ambiguous link reference
-   BUGFIX [code]: reject negative or non-finite numeric Gradia rendering options in the schema configuration and pass the configured options explicitly to the HTML diagram rendering, so "font-embed" and a WOFF2 "font-family" take effect, instead of Gradia silently dropping all of them from the "#config" directives
-   BUGFIX [code]: embed SVG images in the HTML/PDF export as self-contained "data:" URLs on "<img>" tags instead of inlining them as-is, as the document-global `<style>` class rules of one inlined SVG (like the Illustrator-typical ".st0") silently restyled all other inlined SVGs sharing the same class names
-   BUGFIX [code]: render the image embeddings of regular property values in the HTML/PDF export from the embedded image contents (like the ones of descriptions and of the title page "LOGO"), instead of rendering their "![xxx](yyy)" markup with its source-relative file path, which was broken in the self-contained HTML and absent in the PDF
-   BUGFIX [infr]: do not ship the sample files which were generated
-   BUGFIX [code, docs]: parse the last segment of a "."-terminated Concise Format item always as the description and accept an empty property value, so a "Note: xxx"-shaped description and an empty-valued property of an object exported in the Concise Format no longer swap their roles on re-parsing
-   BUGFIX [code]: accept the filename extension aliases ("yml", "htm", "markdown") in an explicit "<format>:" output prefix, too, instead of silently ignoring such a prefix and inferring the format from the extension of the entire output specification
-   BUGFIX [code, docs]: fail "export" on any diagnostics (listing them like an invalid configuration) instead of silently emitting a partial or invalid specification with exit code 0, as the diagnostics surfaced in verbose mode only
-   BUGFIX [code]: emit a single frontmatter block (carrying the earliest "Created" and the latest "Modified" timestamp of all artifacts) at the start of the Markdown export, instead of one block per artifact, of which a re-parse recognizes only the first
-   BUGFIX [code, docs]: report a duplicate property key on an object and check the value of every property occurrence, instead of silently ignoring all occurrences but the first one
-   BUGFIX [code]: assign the implicit "(xxx)" anchor ids of all objects before checking any property reference constraint, so a forward reference to such an object no longer silently skips its constraint
-   BUGFIX [code]: return the result of the MCP tool `specbook_export` directly for the "-" stdout sentinel as output, instead of writing a file literally named "-"
-   BUGFIX [code, docs]: anchor the regular expression value constraints "/xxx/" of the schema configuration implicitly (like the object name patterns already were), so a property value has to match the constraint as a whole instead of just containing a match, and a trailing "(xxx)" heading token is no longer silently consumed as a property value on a mere partial match instead of acting as the implicit id
-   BUGFIX [code, docs]: emit a property value carrying a ";" on a continuation line of its key/value item in the Markdown export (nested below the item of a concise object instead of as a segment), as a ";" on the first line of a list item let a re-parse take the property for a concise child object
-   IMPROVEMENT [code, docs]: report a non-optional artifact which is absent from its present artifact file, instead of just checking the existence of the file

0.9.6 (2026-08-23)
------------------

-   FEATURE [code, docs]: support theme-aware image embeddings by expanding a "{theme}" placeholder in "![xxx](yyy)" references into their light/dark variants, of which the HTML export shows just the one of the active color theme
-   FEATURE [code, docs]: support multiple level 1 artifacts in a single Markdown file by configuring the same "file" field on them
-   IMPROVEMENT [code, infr]: render the built-in fallback logo theme-aware and drop the plain "specbook-export-logo.svg" in favor of the "specbook-export-logo-{light,dark}.svg" pair
-   IMPROVEMENT [code]: render the title page only if a "TITLE" property exists and render "Created"/"Modified" exclusively on it
-   IMPROVEMENT [code, docs]: determine the specification files from the "file" fields of the schema configuration instead of recursively scanning all Markdown files below the base directory, and report a referenced but absent file unless all its artifacts are optional
-   IMPROVEMENT [code, docs]: require the YAML schema configuration for "init", "lint", and "export" (only "describe" still works without it)
-   IMPROVEMENT [code, docs]: qualify all verbose output lines with the emitting command as in "specbook: lint: xxx", nesting the MCP scope as in "specbook: mcp: lint: xxx"
-   IMPROVEMENT [code, infr]: colorize the verbose output lines with Chalk (bold command scope, blue literal values), but only if the terminal supports colors
-   IMPROVEMENT [docs, othr]: space out the edges of the sample data model diagram via the new Gradia "size-edge-port-gap" option

0.9.5 (2026-08-21)
------------------

-   IMPROVEMENT [infr, othr]: show light/dark HTML and PDF rendering screenshots in README
-   UPDATE [infr]: upgrade from ESLint 9 to 10

0.9.4 (2026-08-20)
------------------

-   IMPROVEMENT [code]: bundle headings with their following content in HTML/PDF export to avoid orphans
-   IMPROVEMENT [code]: compress JSON/JSON5 export output by default as it is machine-readable only
-   IMPROVEMENT [code]: determine own version from package manifest instead of hard-coding it
-   BUGFIX [othr]: fix proofreading issues in README and sample broadcast specification
-   UPDATE [infr]: upgrade dependency @rse/gradia to 1.0.0
-   CLEANUP [code, infr]: various code and tool configuration cleanups

0.9.3 (2026-08-19)
------------------

-   FEATURE [code, docs]: support "format" schema field ("type", "maxTableColumns", "withUnusedProps") for configuring the complex-to-concise collapse of the HTML/PDF export
-   FEATURE [code]: render over-wide concise object groups as chunked tables honoring "--max-table-columns"
-   FEATURE [code, othr]: support "properties" in diagram schema to attach property values to nodes
-   IMPROVEMENT [code]: resolve "[[...]]" references in diagram property values to object names
-   IMPROVEMENT [othr]: document the entire input schema format in README
-   IMPROVEMENT [othr]: interlink glossary terms in sample broadcast specification
-   IMPROVEMENT [othr]: improve sample schema configuration (show more properties, limit diagram node width)
-   UPDATE [infr]: upgrade dependencies (@rse/gradia, @rse/mrcs, ai)
-   CLEANUP [code, docs]: remove CLI option "--max-table-columns" in favor of the per-object-kind "maxTableColumns" schema field

0.9.2 (2026-08-19)
------------------

-   BUGFIX [infr, othr]: publish under namespaced NPM package name "@rse/specbook"
-   UPDATE [infr]: bump package version for release

0.9.1 (2026-08-19)
------------------

-   IMPROVEMENT [infr]: add ".npmignore" to exclude files from NPM package
-   UPDATE [infr]: bump package version for release
-   CLEANUP [infr]: rename compiled output directory from "dist" to "dst"

0.9.0 (2026-08-19)
------------------

(first rough cut)

