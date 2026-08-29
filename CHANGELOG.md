
ChangeLog
=========

1.0.4 (2026-08-28)
------------------

-   IMPROVEMENT [code, docs]: Absent Property Marker
    The HTML/PDF export now renders an "empty set" marker into the property table lines and table
    cells of properties absent from an object (including the ones injected by "withUnusedProps"),
    telling a not given property apart from one given with an empty value.

-   FEATURE [code, spec, docs]: Diagram of Contents
    The HTML/PDF export renders the diagram of the "META: Title" object on its own "Diagram of
    Contents" page directly after the Table of Contents (while the MD/AST exports suppress this
    diagram), and the standard schema configures such a "graph" diagram over all "SPEC" and "ARCH"
    artifacts, connected by the references living in their nested objects.

-   FEATURE [code, docs]: Deep Diagram Edges
    The new diagram option "deep" derives the edges of a node from the "[[...]]" references of its
    descendants, too, lifting every referenced object to its nearest node and rendering the number
    of references as the edge arity.

-   FEATURE [code, othr]: Live Preview Status Icon
    The live preview page now shows a connection status icon left of the theme switcher, which is
    grey while the WebSocket connection is active, takes the search highlight color while it is
    disconnected, and blinks for 2s after every in-place content update.

-   FEATURE [code, infr, othr]: Live Preview
    The new "preview" command in API/CLI serves the HTML export via Fastify on
    "http://<ip-addr>:<tcp-port>/" (options "-a"/"--addr" and "-p"/"--port", default
    "127.0.0.1:12345"), re-exports the specification on every source change like "export --watch",
    and sends "RELOAD" to all connected WebSocket clients, which the client-side script of the new
    "realtime" option of the API "export"/"watch" methods turns into an in-place document update
    which keeps the scroll position and the theme choice.

-   FEATURE [code, infr, othr]: Watched Export
    The "export" command in API/CLI gained the option "-w"/"--watch", which performs the regular
    export and afterwards re-exports the specification on every change of a referenced artifact
    file or an embedded asset, once the sources stayed silent for one second.

-   BUGFIX [code]: Untruncated CLI Output
    Commander no longer terminates the process on its own: its help, version, and usage-error
    output is collected and flushed through the awaiting stdout/stderr writers, so a piped output
    is no longer cut off.

-   IMPROVEMENT [code]: Specification File Set
    The parser now records the resolved paths of the embedded assets and the "LintResult" carries
    the resulting "files" set of the entire specification.

1.0.3 (2026-08-27)
------------------

-   FEATURE [code]: PDF Export Browser Preflight
    The "export" command now ensures a Chromium-class browser is available before the specification
    is parsed and names "npx playwright install chromium" as the remedy when none is found.

-   FEATURE [code, infr]: Verbose Message Severity
    The "VerboseSink" gained a third "level" argument ("debug" or "notice"), where the CLI prints
    the environment-related "notice" messages regardless of the "-v"/"--verbose" option.

1.0.2 (2026-08-26)
------------------

-   IMPROVEMENT [othr]: Restructured ChangeLog Layout
    The ChangeLog entries are now laid out as a titled headline plus an indented, wrapped
    description paragraph, instead of a single long one-line entry.

1.0.1 (2026-08-26)
------------------

-   FEATURE [code, infr, othr]: Describe Format and Part Options
    The "describe" command in API/CLI/MCP gained the options "-f"/"--format" ("md", "raw") and
    "-p"/"--part" ("all", "meta", "schema", "spec") to reduce the description to a single part.

-   IMPROVEMENT [code, infr, othr]: Embedded Standard Schema
    The bundled standard YAML schema configuration is now embedded in "describe" even without the
    option "-c", dropping its leading comment block.

-   IMPROVEMENT [code]: Direct File References
    The "describe" pointers to the YAML schema configuration and the base directory are now rendered
    as direct file references.

-   IMPROVEMENT [othr]: README Installation Step
    The missing installation step was added to README, its information reordered and its shell block
    rendering fixed.

-   BUGFIX [code, othr]: Proofreading Fixes
    Proofreading issues were fixed in README, the sample broadcast specification and the bundled
    format description.

-   UPDATE [infr]: Release Version Bump
    The package version was bumped for the release.

0.9.9 (2026-08-26)
------------------

-   IMPROVEMENT [code, docs]: Optional Schema Configuration
    The YAML schema configuration of "init", "lint", and "export" is optional again, as it now falls
    back onto the bundled standard schema configuration.

-   IMPROVEMENT [code]: Explicit Schema in Verbose Output
    The YAML schema configuration in use is now named explicitly in the verbose output.

-   IMPROVEMENT [code]: Tightened Instantiation Wording
    The wording of the "describe" project instantiation section was tightened.

-   IMPROVEMENT [infr, othr]: Second Overview Poster
    A second overview poster is now shown in README.

-   IMPROVEMENT [infr]: Split Sample Build Targets
    The "sample" build target was split into "sample-broadcast"/"sample-sample" and now fails on
    lint problems.

-   CLEANUP [infr, othr]: Bundled Standard Schema
    The sample YAML schema configuration was promoted to the bundled standard schema configuration
    "src/specbook-format.yaml".

0.9.8 (2026-08-25)
------------------

-   IMPROVEMENT [docs]: Collapsed Timestamps Documented
    It is now documented that the normalized Markdown export collapses the per-artifact
    "Created"/"Modified" timestamps.

-   BUGFIX [code]: Parentless Heading Handling
    The current object is now detached on a heading without a parent object.

-   BUGFIX [code]: Unresolved Edge Reported Once
    A diagram edge object carrying no resolvable source or target reference is now reported just
    once.

-   BUGFIX [code, docs]: Property Values With "BECAUSE"
    A property value carrying a ", BECAUSE " is now emitted as a nested key/value item in the
    Markdown export.

-   BUGFIX [code, docs]: Complex Format Child Objects
    The child objects of an object in Complex Format are now kept in the Markdown export when a
    descendant carries a description containing a ";", too.

-   BUGFIX [code]: Unknown Output Format Prefix
    An unrecognized explicit "<format>:" output prefix is now reported as an error, listing the
    accepted format names, instead of being silently ignored.

-   BUGFIX [code, docs]: Colliding Resolution Keys
    The sibling objects of the schema configuration which collide on their resolution key are now
    reported.

-   BUGFIX [code]: Empty List/Tags Items
    An empty item in a "tags(...)"/"list(...)" property value is now reported.

-   BUGFIX [code]: Anchor Ids Below Unknown Kinds
    The implicit "(xxx)" anchor ids of the objects below an unresolved artifact or an unknown object
    kind are now assigned.

-   BUGFIX [code]: Unsupported Block Content
    Raw HTML (like an "<img>" tag), a horizontal rule, and a link definition below an object are now
    reported as unsupported content, instead of being silently dropped from the AST and the exports.

0.9.7 (2026-08-24)
------------------

-   BUGFIX [code, docs]: Multi-Line Descendant Descriptions
    The child objects of an object in Complex Format are now kept in the Markdown export when a
    descendant carries a multi-line description.

-   BUGFIX [code, docs, othr]: Colliding Anchor Ids
    The sibling objects of the same kind which collide on their anchor id are now reported, instead
    of silently deriving identical anchor paths surfacing only as an ambiguous link reference.

-   BUGFIX [code]: Gradia Rendering Options
    Negative or non-finite numeric Gradia rendering options are now rejected and the configured
    options passed explicitly, so "font-embed" and a WOFF2 "font-family" take effect.

-   BUGFIX [code]: Self-Contained SVG Embedding
    SVG images are now embedded in the HTML/PDF export as "data:" URLs on `<img>` tags, as the
    `<style>` class rules of one inlined SVG silently restyled all others sharing its class names.

-   BUGFIX [code]: Image Embeddings in Properties
    The image embeddings of regular property values are now rendered in the HTML/PDF export from the
    embedded image contents, instead of from their "![xxx](yyy)" markup with a relative file path.

-   BUGFIX [infr]: Generated Sample Files
    The sample files which were generated are no longer shipped.

-   BUGFIX [code, docs]: Concise Format Trailing Segment
    The last segment of a "."-terminated Concise Format item is now always parsed as the description
    and an empty property value accepted, so both no longer swap their roles on re-parsing.

-   BUGFIX [code]: Format Prefix Extension Aliases
    The filename extension aliases ("yml", "htm", "markdown") are now accepted in an explicit
    "<format>:" output prefix, too, instead of such a prefix being silently ignored.

-   BUGFIX [code, docs]: Export Fails on Diagnostics
    The "export" command now fails on any diagnostics, listing them like an invalid configuration,
    instead of silently emitting a partial or invalid specification with exit code 0.

-   BUGFIX [code]: Single Markdown Frontmatter
    A single frontmatter block, carrying the earliest "Created" and latest "Modified" timestamp of
    all artifacts, is now emitted at the start of the Markdown export instead of one per artifact.

-   BUGFIX [code, docs]: Duplicate Property Keys
    A duplicate property key on an object is now reported and the value of every property occurrence
    checked, instead of all occurrences but the first one being silently ignored.

-   BUGFIX [code]: Anchor Ids Before Constraints
    The implicit "(xxx)" anchor ids of all objects are now assigned before checking any property
    reference constraint, so a forward reference to such an object no longer skips its constraint.

-   BUGFIX [code]: MCP Export Stdout Sentinel
    The result of the MCP tool `specbook_export` is now returned directly for the "-" stdout
    sentinel, instead of a file literally named "-" being written.

-   BUGFIX [code, docs]: Anchored Regex Constraints
    The regular expression value constraints "/xxx/" of the schema configuration are now anchored
    implicitly, so a property value has to match as a whole instead of just containing a match.

-   BUGFIX [code, docs]: Semicolons in Property Values
    A property value carrying a ";" is now emitted on a continuation line of its key/value item, as
    a ";" on the first line let a re-parse take the property for a concise child object.

-   IMPROVEMENT [code, docs]: Absent Non-Optional Artifacts
    A non-optional artifact which is absent from its present artifact file is now reported, instead
    of just the existence of the file being checked.

0.9.6 (2026-08-23)
------------------

-   FEATURE [code, docs]: Theme-Aware Image Embeddings
    Theme-aware image embeddings are supported by expanding a "{theme}" placeholder in "![xxx](yyy)"
    references into light/dark variants, of which the HTML export shows the active one only.

-   FEATURE [code, docs]: Multiple Artifacts Per File
    Multiple level 1 artifacts are supported in a single Markdown file by configuring the same
    "file" field on them.

-   IMPROVEMENT [code, infr]: Theme-Aware Fallback Logo
    The built-in fallback logo is now rendered theme-aware and the plain "specbook-export-logo.svg"
    dropped in favor of the "specbook-export-logo-{light,dark}.svg" pair.

-   IMPROVEMENT [code]: Conditional Title Page
    The title page is now rendered only if a "TITLE" property exists and "Created"/"Modified" are
    rendered exclusively on it.

-   IMPROVEMENT [code, docs]: File-Driven Specification Discovery
    The specification files are now determined from the "file" fields of the schema configuration
    instead of by scanning all Markdown files, and a referenced but absent file is reported.

-   IMPROVEMENT [code, docs]: Mandatory Schema Configuration
    The YAML schema configuration is now required for "init", "lint", and "export", as only
    "describe" still works without it.

-   IMPROVEMENT [code, docs]: Command-Qualified Verbose Output
    All verbose output lines are now qualified with the emitting command as in "specbook: lint:
    xxx" and nest the MCP scope as in "specbook: mcp: lint: xxx".

-   IMPROVEMENT [code, infr]: Colorized Verbose Output
    The verbose output lines are now colorized with Chalk (bold command scope, blue literal values),
    but only if the terminal supports colors.

-   IMPROVEMENT [docs, othr]: Spaced Data Model Diagram Edges
    The edges of the sample data model diagram are now spaced out via the new Gradia
    "size-edge-port-gap" option.

0.9.5 (2026-08-21)
------------------

-   IMPROVEMENT [infr, othr]: Rendering Screenshots
    Light/dark HTML and PDF rendering screenshots are now shown in README.

-   UPDATE [infr]: ESLint 10 Upgrade
    The build was upgraded from ESLint 9 to 10.

0.9.4 (2026-08-20)
------------------

-   IMPROVEMENT [code]: Heading Orphan Avoidance
    Headings are now bundled with their following content in the HTML/PDF export to avoid orphans.

-   IMPROVEMENT [code]: Compressed JSON Export
    The JSON/JSON5 export output is now compressed by default, as it is machine-readable only.

-   IMPROVEMENT [code]: Version From Package Manifest
    The own version is now determined from the package manifest instead of being hard-coded.

-   BUGFIX [othr]: Proofreading Fixes
    Proofreading issues were fixed in README and the sample broadcast specification.

-   UPDATE [infr]: Gradia 1.0.0 Upgrade
    The dependency @rse/gradia was upgraded to 1.0.0.

-   CLEANUP [code, infr]: Code and Configuration Cleanups
    Various code and tool configuration cleanups were performed.

0.9.3 (2026-08-19)
------------------

-   FEATURE [code, docs]: Format Schema Field
    The "format" schema field ("type", "maxTableColumns", "withUnusedProps") is supported for
    configuring the complex-to-concise collapse of the HTML/PDF export.

-   FEATURE [code]: Chunked Concise Tables
    Over-wide concise object groups are now rendered as chunked tables honoring
    "--max-table-columns".

-   FEATURE [code, othr]: Diagram Node Properties
    The "properties" field is supported in the diagram schema to attach property values to nodes.

-   IMPROVEMENT [code]: References in Diagram Values
    The "[[...]]" references in diagram property values are now resolved to object names.

-   IMPROVEMENT [othr]: Documented Input Schema Format
    The entire input schema format is now documented in README.

-   IMPROVEMENT [othr]: Interlinked Glossary Terms
    The glossary terms in the sample broadcast specification are now interlinked.

-   IMPROVEMENT [othr]: Improved Sample Schema
    The sample schema configuration was improved by showing more properties and limiting the diagram
    node width.

-   UPDATE [infr]: Dependency Upgrades
    The dependencies @rse/gradia, @rse/mrcs and ai were upgraded.

-   CLEANUP [code, docs]: Per-Kind Table Column Limit
    The CLI option "--max-table-columns" was removed in favor of the per-object-kind
    "maxTableColumns" schema field.

0.9.2 (2026-08-19)
------------------

-   BUGFIX [infr, othr]: Namespaced NPM Package
    The package is now published under the namespaced NPM package name "@rse/specbook".

-   UPDATE [infr]: Release Version Bump
    The package version was bumped for the release.

0.9.1 (2026-08-19)
------------------

-   IMPROVEMENT [infr]: NPM Package Exclusions
    An ".npmignore" was added to exclude files from the NPM package.

-   UPDATE [infr]: Release Version Bump
    The package version was bumped for the release.

-   CLEANUP [infr]: Output Directory Rename
    The compiled output directory was renamed from "dist" to "dst".

0.9.0 (2026-08-19)
------------------

(first rough cut)

