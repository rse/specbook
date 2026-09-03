
ChangeLog
=========

1.1.1 (2026-09-02)
------------------

-   IMPROVEMENT [code, othr]: Decision Record Delineation
    The standard "Decision Record" moves last, gains "DRIVEN-BY", "DECIDES", "ALTERNATIVES", and
    "CONSEQUENCES", widens "AFFECTS", and capitalizes "STATUS" (adding "Rejected").

-   IMPROVEMENT [code, othr]: Technology Stack Delineation
    The standard "Technology Stack" opens the tier names (adding "Common"), renames "WHEN" to the
    mandatory tags "PHASE", constrains a phase-aware "COVERAGE", and gains "LICENSE", "USED-BY", and
    a component hub diagram.

-   IMPROVEMENT [code, othr]: Quality Perspectives Delineation
    The standard "Quality Perspectives" delineates its scope, renames "PERSPECTIVE" to "TACTIC" with
    "MECHANISM", gains "TRADES-OFF" and "TOOLS", widens "AFFECTS", swaps "Compliance" for "Safety"
    in "QUALITY", and the Operations View concern gains "OPERATES" referencing tactics.

-   IMPROVEMENT [code, othr]: Operations View Delineation
    The standard "Operations View" delineates its scope, realigns its categories, gains "TRIGGER",
    "OPERATOR", "ADDRESSES", and "TOOLS", and the Technology Stack "WHEN" gains "Operate-Time".

-   IMPROVEMENT [code, othr]: Deployment View Topology
    The standard "Deployment View" gains "TIER" (horizontal) and optional "AREA" (vertical) partitions,
    optional "NETWORK" segments replacing the node "NETWORK" property, and node "PART-OF", "CONNECTS-TO",
    and "INSTANCES".

-   IMPROVEMENT [code, othr]: All Standard Artifacts Optional
    All artifacts of the standard schema are now optional, so that the various specification types
    of the modeling coverage matrix (PRD, StRS, SyRS, SRS, UIS, TCS, AD) can be written alone.

-   IMPROVEMENT [code, othr]: Development View Delineation
    The standard "Development View" becomes optional, gains a "Testing" category and a delineation
    of its scope, and the Decision Record "AFFECTS" now also accepts development aspects.

-   IMPROVEMENT [code, othr]: Concurrency View Traceability
    The Deployment View "HOSTS" and the Quality Perspectives "AFFECTS" now also accept concurrency
    units, closing the deployment mapping and quality traceability chains with backward references.

-   IMPROVEMENT [code, othr]: Concurrency View Structure
    The standard "Concurrency View" gains "PART-OF" containment, "COORDINATES-WITH" peer references,
    and the "Task" kind, drops "Queue", becomes optional, delineates scope, gets a graph overview.

-   IMPROVEMENT [code, othr]: Functionality View Traceability
    The standard "Functionality View" replaces the prose "RESPONSIBILITY" property by "PART-OF" (acyclic
    composition), "REALIZES" (Functional Requirements traceability), and "CONSUMES" (consumed interfaces).

-   IMPROVEMENT [code, othr]: Component Entity Ownership
    The components of the standard "Functionality View" gain the optional "OWNS" property, naming the Data
    Model entities the component is the single authoritative source of truth for.

-   IMPROVEMENT [infr]: Markdown Linting
    The build now lints the Markdown format documents below src/ with markdownlint-cli2, configured
    in etc/markdownlint.yaml to reflect the house style (Setext/ATX headings, 3-space list markers).

-   UPDATE [infr]: Dependency Upgrades
    The dependencies subset-font, zod, typescript-eslint, globals, @types/node, and tsx were upgraded.

-   CLEANUP [code, othr]: Information View Removed
    The artifact "Information View" was removed from the standard schema, as the Data Model, the other
    views, and the Quality Perspectives already cover its concerns, and the files renumbered "25"-"31".

1.1.0 (2026-09-01)
------------------

-   FEATURE [code]: Description Popups
    The HTML export gains an "info" tab below the theme tab, toggling description popups on and off
    (default off, persisted): hovering an object kind or property name label pops up the schema "desc"
    text, titled with the qualified object path, attached above or below the hovered element by the
    larger viewport space, and absent from the PDF print.

-   IMPROVEMENT [code]: Instance Description Popups
    The description popups of the HTML export now distinguish three types: an object kind pops up the
    schema "desc" of the kind (the path ending in the kind), a property name the schema "desc" of the
    property, and -- newly -- an object name (in headings, tables, compact hyperlinks, and diagram
    nodes) the corpus description of the instance (the path ending in "KIND: Name"), with a bold
    "Schema:" or "Specification:" label leading the description to name its origin.

-   IMPROVEMENT [code]: Search Tab
    The full-text search field of the HTML export moved from the title page into a fixed tab riding the
    brand bar below the table of contents tab (following the bar when the panel shifts it aside), whose
    search icon slides the input field out to the right and back in, persisting this across page loads.

-   BUGFIX [code]: Diagram Search Filtering
    The full-text search of the HTML export now treats the diagrams as searchable units: a diagram stays
    visible only if its text labels match the query, with the matched labels highlighted like the prose.

-   FEATURE [code, docs]: Merged Schema Configurations
    The option "-c"/"--config" of all commands in API/CLI/MCP now accepts glob patterns and can be given
    multiple times ("std" for the bundled standard schema), merging the matching files in order into one schema.

-   FEATURE [spec, docs]: Solution Premises
    The standard schema gains the artifact "Solution Premises" (file "02", behind the solution vision),
    recording the assumptions, dependencies, and risks the specification rests on, rated by likelihood/impact.

-   FEATURE [spec, docs]: Authorization Model
    The standard schema gains the artifact "Authorization Model" (file "13", placed between the state
    model and the interface model).

-   FEATURE [spec, docs]: Domain Workflows
    The standard schema gains the optional artifact "Domain Workflows" (file "09"), placed between the
    domain rules and the use cases.

-   FEATURE [spec, othr]: Interface Specification
    The standard schema gains the kind "APIS" with the artifacts "Interface Model", "Interface Datatypes"
    (with an acyclic "EXTENDS" inheritance), and "Interface Endpoints" (files "14"-"16"), before the UXUI.

-   FEATURE [code, docs]: Table of Contents Side Panel
    The HTML export gains a "Table of Contents" tab at the left viewport edge, sliding out a panel with the
    hierarchical, numbered section headings (active/anchored one highlighted), whose open state persists.

-   FEATURE [code, infr, othr]: Describe Schema Compression
    The "describe" command in API/CLI/MCP gained the option "-z"/"--compress [<level>]" (default "1"),
    re-emitting the YAML schema unwrapped (level 1), without "refs" (level 2), and without "desc" (level 3).

-   FEATURE [code]: Schema Method References
    The new object kind field "refs" carries a Markdown list of the standards, books, articles, or websites
    describing the methodology the object kind picks up, which the standard schema now uses throughout.

-   FEATURE [code]: Symmetric and Acyclic References
    The new property flags "symmetric" and "acyclic" demand that a referenced object references back through
    the same property, or that following the property never returns to an already passed object.

-   FEATURE [code]: Unique Sibling Values
    The new property flag "unique" demands that every value (or only the values matching a regexp or enum
    expression) occurs at most once among the sibling objects of the kind.

-   FEATURE [code]: Labeled Diagram Edges
    The new diagram option "labeled" lets the edges derived from property values carry the lower-cased
    property key as their label, while the edges derived from descriptions stay unlabeled.

-   FEATURE [code]: Diagrams in Concise Tables
    The HTML/PDF export now renders the diagram of an object in Concise Format into an additional row of
    its table, spanning all columns but the name one.

-   FEATURE [code, spec, docs]: Per-Kind Rendering Format
    The "format" schema field now configures the HTML/PDF rendering of the objects of the kind it is placed
    on (instead of all child objects), so sibling kinds below one parent can render differently.

-   FEATURE [code, spec, docs]: State Machine Checks
    The new object kind field "automaton" declares the state/transition child kinds of a finite state
    machine, which the linter checks for unreachable states, dead-ends, and livelocks.

-   FEATURE [code, spec, docs]: Scoped Reference Resolution
    A reference matching several objects is narrowed down to the ones nearest to the referencing object,
    so `[[STATE:Draft]]` resolves within its own lifecycle and is ambiguous only if still more remain.

-   FEATURE [code, spec, docs]: Local References
    The new property flag "local" demands that a reference-valued property references objects below the
    parent object of the referencing object only, ruling out transitions between lifecycles.

-   FEATURE [code, spec, docs]: Sibling Presence
    The new property flag "present", the counterpart of "unique", demands that some (or a matching) value
    occurs on at least one sibling object, so "unique" plus "present" demand exactly one.

-   FEATURE [code, spec, docs]: Reference Coverage
    The new object kind flag "referenced" lists the wildcard references (e.g. `[[*]]`) matching the objects
    from which every object of the kind has to be referenced at least once.

-   FEATURE [code, spec, docs]: Diagram of Contents
    The HTML/PDF export renders the diagram of the "META: Title" object on its own page after the Table of
    Contents, which the standard schema configures as a "graph" over all specification/architecture artifacts.

-   FEATURE [code, docs]: Deep Diagram Edges
    The new diagram option "deep" derives the edges of a node from the "[[...]]" references of its
    descendants, too, lifting each referenced object to its nearest node with the reference count as arity.

-   FEATURE [code, othr]: Live Preview Status Icon
    The live preview page shows a connection status icon left of the theme switcher: grey while connected,
    in the search highlight color while disconnected, and blinking for 2s after every content update.

-   FEATURE [code, infr, othr]: Live Preview
    The new "preview" command in API/CLI serves the HTML export via Fastify ("-a"/"--addr", "-p"/"--port"),
    re-exports on every source change, and updates all WebSocket clients in place via "RELOAD".

-   FEATURE [code, infr, othr]: Watched Export
    The "export" command in API/CLI gained the option "-w"/"--watch", re-exporting the specification on
    every change of a referenced artifact file or embedded asset, once the sources stayed silent for 1s.

-   IMPROVEMENT [spec, docs]: Domain Rules
    The artifact "Business Rules" of the standard schema is renamed to "Domain Rules" with the identifier
    "DR" (file "08-REQS-DR-Domain-Rules.md"), as not every domain is a business.

-   IMPROVEMENT [spec, docs]: Split Specification Kind
    The standard schema replaces its catch-all artifact kind "SPEC" by the kinds "REQS", "DATA", "APIS",
    "UXUI", "TEST", and "ARCH".

-   IMPROVEMENT [spec, othr]: Numbered Artifact Files
    The artifact files of the standard schema are now named "NN-KIND-ID-Name.md", numbered consecutively
    across all artifact kinds, instead of "KIND-NN-ID-Name.md".

-   IMPROVEMENT [code]: Standard Schema Coverage Matrix
    The bundled standard schema now opens with its modeling purpose and a coverage matrix, mapping its
    artifacts onto the classical document types PRD, StRS, SyRS, SRS, UIS, UISG, TCS, and AD.

-   IMPROVEMENT [code, othr]: Data Protection Attributes
    The entity attributes of the standard "Data Model" gain the optional GDPR-motivated properties
    "CLASSIFICATION" ("Public", "Internal", "Confidential", "Personal") and "RETENTION".

-   IMPROVEMENT [code]: Stakeholder Personas
    The standard "User Personas" gain the optional "TYPE" property ("User" or "Stakeholder"), so that
    non-user stakeholders like sponsors, regulators, or auditors are modeled as personas, too.

-   IMPROVEMENT [code, othr]: Refined Standard Schema
    The standard schema was refined throughout (Glossary moved second, Use Cases behind the workflows, new
    "OPPORTUNITY", "GOVERNS", "RULES", "RESULT", "OUTCOME" properties, reworked REQS/DATA/TEST/UXUI parts).

-   IMPROVEMENT [othr]: Refined Sample Corpus
    The sample broadcast specification follows the refined standard schema, with missing use/test cases
    added, glossary terms hyperlinked, and "Ventari" replaced by "Event Registration System".

-   IMPROVEMENT [code, docs]: Hierarchical Table of Contents
    The "Table of Contents" of the HTML/PDF export now lists all section headings (exactly like the side
    panel and the PDF outline).

-   IMPROVEMENT [code]: Compact Prose References
    The "[[...]]" references inside descriptions and rationales are rendered in the HTML/PDF export in a
    compact form (icon and name only, full form as tooltip), while property values keep the full form.

-   IMPROVEMENT [code]: Uniform Hub Diagram Zoom
    The "hub" diagrams of the HTML/PDF export are capped to their width share of a full three-column
    canvas, so all hub diagrams share the zoom level of the three-column ones.

-   IMPROVEMENT [code]: HTML Layout Polish
    The HTML/PDF export keeps the line height on lines carrying a link, top-aligns the property names,
    lets empty cells cover a line height, and spaces the parts of an object slightly wider apart.

-   IMPROVEMENT [code]: Live Preview Client Logging
    The "preview" command reports connecting/disconnecting WebSocket clients and the first served export
    as "notice" messages, while the client-side script logs its connection states to the console.

-   IMPROVEMENT [infr]: Developer Build Targets
    The new "dev" build target rebuilds and re-exports the sample broadcast specification on every source
    change through chokidar, with "dev-sample" performing the export alone.

-   IMPROVEMENT [spec, docs]: Visual Design Schema
    The standard "Visual Design" states its decisions with rationale (new "TRADE-OFF", "ACTORS",
    "PRINCIPLES", "SOURCE", and enum "CATEGORY" properties) and carries its mockups as "MOCKUP" objects.

-   IMPROVEMENT [code]: Badged List Members
    The HTML/PDF export now badges the items of a "list(...)" property value which are literal members of
    its "enum(...)"/"tags(...)" alternatives, while the other items (like references) stay prose.

-   IMPROVEMENT [spec, docs]: State Model Schema
    The standard "State Model" checks its lifecycles as automata, scopes transitions to their lifecycle,
    carries "GUARD", "ACTOR", and "RULES" properties, and expects each transition to be referenced.

-   IMPROVEMENT [code, docs]: Absent Property Marker
    The HTML/PDF export renders an "empty set" marker into the table lines/cells of absent properties and
    descriptions, telling a not given property apart from one given with an empty value.

-   IMPROVEMENT [code]: Specification File Set
    The parser now records the resolved paths of the embedded assets and the "LintResult" carries the
    resulting "files" set of the entire specification.

-   BUGFIX [code]: Untruncated CLI Output
    Commander no longer terminates the process on its own: its help, version, and usage-error output is
    flushed through the awaiting stdout/stderr writers, so a piped output is no longer cut off.

-   UPDATE [infr]: Dependency Upgrades
    The dependencies marked, subset-font, zod, typescript-eslint, and @types/node were upgraded and
    chokidar-cli was added for the developer build targets.

-   REFACTOR [code, infr]: Split Standard Schema Files
    The bundled standard schema was split into the per-kind files "src/specbook-format.d/std-N-XXX.yaml",
    assembled by "etc/specbook-format-assemble.mjs" into "dst/specbook-format.yaml" at build time.

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

