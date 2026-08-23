
ChangeLog
=========

0.9.6 (2026-08-23)
------------------

-   FEATURE [code, docs]: support multiple level 1 artifacts in a single Markdown file by configuring the same "file" field on them

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

