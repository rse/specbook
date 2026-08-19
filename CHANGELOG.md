
ChangeLog
=========

0.9.3 (2026-08-19)
------------------

-   FEATURE [code, docs]: support "format" schema field ("type", "maxTableColumns", "withUnusedProps") for configuring the complex-to-concise collapse of the HTML/PDF export
-   CLEANUP [code, docs]: remove CLI option "--max-table-columns" in favor of the per-object-kind "maxTableColumns" schema field
-   FEATURE [code]: render over-wide concise object groups as chunked tables honoring "--max-table-columns"
-   FEATURE [code, othr]: support "properties" in diagram schema to attach property values to nodes
-   IMPROVEMENT [code]: resolve "[[...]]" references in diagram property values to object names
-   IMPROVEMENT [othr]: limit diagram node width in sample schema configuration
-   UPDATE [infr]: upgrade dependencies (@rse/gradia, @rse/mrcs, ai)

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

