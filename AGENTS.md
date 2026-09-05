
## About

**Specification Book (SpecBook)** is the opinionated tooling of *Dr.
Ralf S. Engelschall* for a generic, Markdown-based *specification
format*, which is configured for particular contexts through a YAML
*schema configuration*. SpecBook allows specifications to be
*initialized*, *linted*, *exported* (JSON, JSON5, YAML, TOON, HTML, PDF,
and normalized Markdown), *previewed* (HTML, live in the browser), and
*described* -- through an API class
`SpecBook`, a CLI `specbook <cmd>`, and an MCP service `specbook mcp`
with tools `specbook_<cmd>`, where CLI and MCP are based entirely on the
API.

## Repository Layout

-   `src/`: the TypeScript sources
    -   `src/specbook-api.ts`: the API facade class `SpecBook`, wiring all commands
    -   `src/specbook-cli.ts`: the Commander-based CLI (thin wrapper over the API)
    -   `src/specbook-mcp.ts`: the MCP stdio service (thin wrapper over the API)
    -   `src/specbook-cmd-*.ts`: one module per command
        (`init`, `lint`, `export`, `preview`, `describe`);
        `export` dispatches onto the format renderers in `src/specbook-export-*.ts`;
        `preview` is the Fastify-based HTTP/WebSocket server of the live
        HTML preview, fed by the watch mechanism of `export`;
        `describe` emits `src/specbook-format.md`, the static description of
        the SpecBook models and formats
    -   `src/specbook-export-common.ts`: cross-renderer helpers (HTML
        escaping, the pre-assembled stylesheet plus its charset-driven
        font subsetting, the bundled fallback logo, and the document
        properties of the title object: `TITLE`, `SUBTITLE`, `LOGO`,
        `LANG`, `CHARSET`, `THEME-STYLE`, `THEME-TONE`, `PAPER-SIZE`,
        the latter also yielding the print stylesheet)
    -   `src/specbook-export-ast.ts`: the AST renderer (JSON, JSON5,
        YAML, TOON), attaching the derived Gradia spec of a
        diagram-configured object as its `diagram` field (except for the
        title object, whose diagram the HTML/PDF export reserves) and
        the covered/total counts of a coverage-configured object as its
        `coverage` field
    -   `src/specbook-export-md.ts`: the normalized Markdown renderer
    -   `src/specbook-export-html.ts`: the HTML renderer
        (with `src/specbook-export-html.styl` as its inlined stylesheet,
        compiled from Stylus to CSS at build time, and
        `src/specbook-export-html-search.js` as its bundled client-side
        fuzzy search; the other client-side scripts -- color theme,
        scroll progress meter, table of contents side panel, description
        popups, and live preview -- are inlined in the module itself)
    -   `src/specbook-export-pdf.ts`: the PDF renderer (HTML printed
        via Playwright/Chromium, post-processed with `pdf-lib`)
    -   `src/specbook-theme.ts`: the theme color spreads generated from
        the `THEME-TONE` (via `@rse/mrcs`), their layer-1 `:root` CSS
        variable block, and the layer-2 semantic mapping the PDF
        decoration needs outside of CSS
    -   `src/specbook-diagram.ts`: the derivation of the Gradia specs of
        the configured `graph`/`hub`/`grid` diagrams from the object
        model and its references (including the `nest` container
        nesting of the nodes), their validation, and the in-memory
        cache of the rendered SVGs
    -   `src/specbook-config.ts`: YAML schema configuration loading, merging, and validation (Valibot)
    -   `src/specbook-diagnostic.ts`: the `Diagnostic` type and its
        single-line/verbose renderers, shared by all layers
    -   `src/specbook-verbose.ts`: the marking (`literal`) and rendering
        (`renderVerbose`) of the literal values inside verbose messages,
        which the CLI styles with Chalk
    -   `src/specbook-link.ts`: Wiki-style reference (`[[xxx]]`) syntax,
        link index building, reference resolution, and anchor path derivation
    -   `src/specbook-parse.ts`: the parser facade `parseSpecification`,
        wiring the two parsing phases plus the diagram validation with
        file/line-precise diagnostics
    -   `src/specbook-parse-common.ts`: parsing types, the shared phase
        context, and the image embedding syntax, theme variants, and
        MIME type mapping
    -   `src/specbook-parse-syntax.ts`: the syntactic phase, parsing
        Markdown into the `Spec` AST
    -   `src/specbook-parse-semantic.ts`: the semantic phase, validating
        the AST against the schema configuration (property values,
        uniqueness/presence, symmetric/acyclic references, the
        `automaton` state machines, and the `referenced` coverage) and
        the link references
    -   `src/specbook-coverage.ts`: the reference coverage the
        `referenced`-flagged object kinds receive (feeding the semantic
        check and the verbose ratio) and the `coverage`-configured
        objects report (feeding the verbose output, the HTML coverage
        table, and the AST `coverage` field)
    -   `src/specbook-parse-value.ts`: property value expression language
        (Tokenizr-based compiler for regex/enum/tags/list/reference constraints)
    -   `src/specbook-format-spec.ts`: types/schema of the generic Markdown
        structure (the AST of the specification)
    -   `src/specbook-format-schema.ts`: types/schema of the YAML schema
        configuration (which domain-specific objects are allowed)
    -   `src/specbook-format.d/std-N-XXX.yaml`: the bundled standard YAML schema
        configuration (`std-0-meta` through `std-6-test`), assembled into
        one file at build time and used whenever no particular one is given
-   `etc/`: the tool configurations (`eslint.mjs`, `markdownlint.yaml`,
    `tsconfig.json`, `postcss.config.mjs`, `stx.conf`), the assembler of
    the standard schema configuration (`specbook-format-assemble.mjs`),
    and the artwork (logos, posters, screenshots)
-   `smp/`: the sample specification corpus (`broadcast/`, based on the
    standard schema configuration, exported into the git-ignored
    `smp/broadcast.*` files) and a small standalone sample (`sample/`,
    with its own `sample.yaml` schema configuration)
-   `dst/`: the compiled output (`main` is `dst/specbook-api.js`,
    `bin` `specbook` is `dst/specbook-cli.js`) -- never edit it, it is regenerated

## Build System

Build orchestration uses `@rse/stx`, not plain npm scripts. The only npm
script is `npm start`, which invokes stx with `etc/stx.conf`:

```
npm start build            # lint + build-cmd
npm start build-cmd        # tsc, stylus+postcss, and the asset copies (all into dst/)
npm start lint             # eslint on src/*.ts, markdownlint-cli2 on src/specbook-format{.md,.d/*.md}
npm start build-watch      # nodemon rebuild on src/**/*.{ts,md}
npm start lint-watch       # nodemon relint on src/**/*.{ts,md}
npm start sample           # sample-broadcast + sample-sample
npm start sample-broadcast # lint smp/broadcast/, export it into all formats, and describe it
npm start sample-sample    # lint smp/sample/ and export it into HTML and PDF
npm start dev              # chokidar rebuild + dev-sample on src/ and smp/broadcast/ changes
npm start dev-sample       # export smp/broadcast/ into smp/broadcast.html only
npm start publish          # kickout, GitHub release from the CHANGELOG.md section
npm start clean            # remove regularly built files
npm start distclean        # also remove node_modules and package-lock.json
```

Beyond `tsc`, the `build-cmd` target compiles `src/specbook-export-html.styl`
to `dst/specbook-export-html.css` (Stylus, then PostCSS inlining the font
faces as base64 `data:` URIs), copies the client-side search script and
`src/specbook-format.md`, assembles `src/specbook-format.d/*.yaml` into
`dst/specbook-format.yaml`, and copies the two theme variants of the logo.

No test target is defined.

## CLI Commands

```
specbook init     [-v] [-c <yaml-file>] [-b <basedir>]
specbook lint     [-v] [-c <yaml-file>] [-b <basedir>]
specbook export   [-v] [-c <yaml-file>] [-b <basedir>] [-w] [-o [<format>:]<output-file>] [...]
specbook preview  [-v] [-c <yaml-file>] [-b <basedir>] [-a <ip-addr>] [-p <tcp-port>]
specbook describe [-v] [-c <yaml-file>] [-b <basedir>] [-e] [-z [<level>]] [-f <format>] [-p <part>] [-o <markdown-file>]
specbook mcp      [-v]
```

The YAML schema configuration of `init`, `lint`, `export`, and `preview` falls back
onto the bundled standard one (assembled from `src/specbook-format.d/` into
`dst/` at build time), while `describe` references the given one only
and falls back onto the standard one by embedding it.

The option `-c`/`--config` accepts glob patterns (expanded via `glob`)
and can occur multiple times: the matching files (in pattern order,
alphabetically within a pattern, with the literal `std` naming the
bundled standard one, and a pattern matching no file being an error) are
merged in order into one effective schema configuration (the later files
into the earlier ones, via `mergeWith` of `es-toolkit`), where the
objects merge deeply and the list elements are matched by identity
(artifacts by `kind` plus `id`/`name`, nested objects by `kind`,
properties by `name`): every file has to be valid YAML on its own, while
the merged result alone is validated.

The API methods and MCP tools take the patterns as `string[]`, and
`SPECBOOK_CONFIG` carries a `path.delimiter`-separated list of patterns.
With several files, `describe` references each of them, and embeds (or
emits raw) the merged configuration re-emitted as YAML instead of a
verbatim file.

Exactly the artifact files referenced by its `file` fields are loaded and parsed,
resolved against the base directory, in which generated specification
Markdown files are placed, too. All other Markdown files below the base
directory are ignored, while a referenced but absent file is reported
unless all of its artifacts are optional.

Parsing runs in two phases: the syntactic one turns the Markdown into
the `Spec` AST, the semantic one validates it against the schema
configuration. The latter checks the property values against the value
expression language (regex, `enum(...)`, `tags(...)`, `list(...)`, and
`[[...]]` reference constraints), the `unique`/`present` flags among the
sibling objects, the `local`/`symmetric`/`acyclic` shape of the
reference-valued properties, the finite state machines of the
`automaton` object kinds (reachability, dead-ends, livelocks), the
`referenced` coverage an object kind demands (a warning), and the
resolvability of every Wiki-style reference. Both `lint` and `export`
report all diagnostics and fail on any error among them, so a partial or
invalid specification is never exported.

The `coverage` field of an object kind lists `[[...]]` patterns whose
matching objects (a target also counting through its descendants) every
object of the kind reports as covered/total counts of the references
from its own subtree: the verbose output of `lint` and `export` prints
one line per `referenced` flag (the ratio only, as the lapses are
warnings) and per `coverage` pattern (the ratio plus the unreferenced
objects by name), the HTML/PDF export renders a coverage table (kinds,
counts, ratio bar) below the description of the reporting object, and
the AST exports attach the counts as its `coverage` field. The standard
schema configuration reports the use case, scenario, requirement, and
rule coverage on the Test Cases artifact.

The export output option `-o`/`--output` (default: `-` for stdout) can
occur multiple times; the format is inferred from the filename extension,
unless explicitly given as a `<format>:` prefix, and plain `-` (stdout)
defaults to JSON.

The export option `-w`/`--watch` performs the regular export and then
observes the schema configuration files, the referenced artifact files,
and their embedded assets, re-exporting once a change burst stayed
silent for one second, where a failed re-export is reported but leaves
the observe loop intact and where `-` (stdout) and an output which is
itself an observed source file are rejected as an output. The observed
set is re-synchronized after every re-export, as an edit can add or drop
an embedded asset.

The rendered diagram SVGs are cached in memory per Gradia spec and swept
to the diagrams of the latest rendering, so the repeated renderings of a
process (watch, preview, MCP, and the passes and formats of a single
export) reuse them.

The `preview` command serves the HTML export as a live preview through
Fastify on `http://<ip-addr>:<tcp-port>/` (`-a`/`--addr`, default
`127.0.0.1`, and `-p`/`--port`, default `12345`): it observes the
sources exactly like `export --watch`, keeps the HTML export in memory
(a failed re-export keeps the previous one, and before the first
successful export a GET answers `503` with a placeholder page which
carries the very same client-side script and hence replaces itself with
the document once the first export arrives), and sends the string `RELOAD` to
all connected WebSocket clients (on `/`, too) after every re-export.

The served HTML is exported with the API-only `realtime` option of
`export`/`watch`, which injects a client-side script connecting back to
the page URL with the scheme `http`/`https` replaced by `ws`/`wss`,
re-connecting every second after a lost connection, and updating the
page on `RELOAD` and on every re-established connection: the fresh page
is fetched and the document replaced in place (title, changed
stylesheet, body, with the body scripts re-executed), so the scroll
position and the theme choice survive the update.

A status tab at the brand bar below the table of contents tab shows the
connection state: its plug icon carries the search filter mark colors
while disconnected (also before the first connection) and blinks in a
soft accent box for 2s after every update. There is no `preview` MCP
tool, as it is a long-running server.

The HTML export (screen only, hidden for print and hence PDF) carries a
scroll progress meter at the bottom right corner of the viewport: a ring
whose done arc and upward arrow (colored `--theme-color-specbook-progress-done`,
by default the accent color) grow over the remaining circle (colored
`--theme-color-specbook-progress-todo`, by default a lighter accent
spread index) with the scrolled fraction of the document, which fades in
once the page is scrolled beyond 400px and scrolls the page back to the
top (stripping the URL hash) on click.

The HTML document is assembled out of the front matter (the title page
rendered from the `META: Title` object, the table of contents, and the
"Diagram of Contents" page rendered from the diagram configured on that
very object) followed by the artifacts, with the title object itself
leaving the regular document flow. The vertical brand bar at the left
viewport edge carries, top down, the theme-switching tab, the
description popup tab, the search tab, the folding tab, the table of
contents side panel tab, and (in the live preview only) the connection
status tab, all of
which follow the bar when the side panel shifts it aside. The side panel
remembers its open state, marks the active and the anchored entry, and
closes on a jump, on `Escape`, and on an outside click. The search is a
client-side fuzzy one: the words of a comma-separated query part are
AND-combined and the parts OR-combined, a match keeps its whole
paragraph, table row, or diagram plus its enclosing headings, and the
table of contents is filtered along. The description popups (off by
default, persisted) show the schema `desc` of an object kind or property
and the corpus description of an object instance after the mouse rested
400ms on it. The rendered HTML is finally minified with `@swc/html`.

The HTML export (screen only, so print and hence PDF always show the
full content) folds the content on two levels: every diagram sits in a
container carrying a
chevron mark in the muted anchor color at its top left corner (in the
page margin beside the content, in the flow left of the diagram inside
a table cell),
and every table cell whose text is taller than the `maxCellHeight`
percentage of its object kind (default: 40) above every other cell of
its row -- the leading name column, the empty cells, the cells carrying
a diagram, and the cells carrying further cells excluded -- gets a fold
back onto
that height, offered by its own chevron in a rounded grey box behind
the last word still shown while folded -- unless that fold would hide
less than 25% of the height of the cell, which is no visible relief. A
folded diagram leaves the icon of its tab control behind in the muted
color,
and a running search unfolds
everything, so no match hides inside. Everything starts out
unfolded, while the folding tab slides
out two controls (exactly as the search tab slides out its input
field), which fold and unfold all diagrams and all cell texts at once
and persist their own state across page loads, a stored state
overriding the rendered default. A control carries the search filter
mark colors while anything of its kind is folded, and the tab icon
carries them while either control does.

The `META: Title` object drives the document beyond the title page:
`TITLE`/`SUBTITLE`/`AUTHOR`/`VERSION`/`LOGO` fill the title page (a
`{theme}` placeholder in a `LOGO` reference yields one variant per
theme, and an absent `LOGO` falls back onto the bundled SpecBook logo),
`LANG` selects the smart typography quote style, `CHARSET` (US-ASCII,
ISO-8859-1, ISO-8859-15, or UTF-8) subsets the embedded fonts,
`THEME-STYLE` presets the light/dark theme, `THEME-TONE` seeds the theme
color spreads, and `PAPER-SIZE` (A4, Letter, or Legal) sets up the PDF
pagination and the print-time height cap of the diagrams. The subsetted
stylesheets are memoized per charset.

The PDF export prints the HTML through Playwright/Chromium (the browser
explicitly configured by `SPECBOOK_BROWSER`, else the downloaded
Playwright Chromium, else a system-installed Google Chrome, with a
missing browser failing the export before the specification is
even parsed) and post-processes it with `pdf-lib`: header/footer
decoration, a vertical brand bar drawn onto the left edge of every page,
and a hierarchical PDF outline. The page numbers of the table of
contents are found by a bounded fixpoint iteration of at most three
rendering passes, as the number column itself shifts the pagination.

The `describe` command outputs `src/specbook-format.md` verbatim,
followed by a "SpecBook Project Instantiation" section pointing to the
YAML schema configuration (`-c`, falling back onto the embedded standard
one) and the base directory (`-b`) whenever one of them is present.

There, `-e`/`--embed` embeds the given YAML schema configuration itself
instead of just referencing it, and `-z`/`--compress [<level>]` (default and
bare flag `1`) emits the YAML schema configuration (embedded into the
Markdown or as the `raw` file content) compressed instead of verbatim:
level `1` re-emits it with 2-space indentation, unwrapped lines, and
without comments, level `2` additionally drops its `refs` fields, and level `3`
additionally drops its `desc` fields of objects and properties.

The `describe` option `-p`/`--part` (default: `all`) reduces the output
to the generic description alone (`meta`), the YAML schema configuration
alone (`schema`, falling back onto the embedded standard one), or the base
directory reference alone (`spec`), while `-f`/`--format` (default: `md`)
switches from the rendered Markdown onto the raw original file content
(the `schema` one compressed by the `--compress` level)
(`raw`), which is available for the file-backed parts `meta` and
`schema` only.

The default value of every CLI option `--xxx` can be overridden by a
corresponding `SPECBOOK_XXX` environment variable. Beyond those, the
option-less `SPECBOOK_BROWSER` selects the browser of the PDF export: a
value carrying a path separator is taken as an executable path and any
other one as a Playwright channel name (`chromium`,
`chromium-headless-shell`, `chrome`, `chrome-beta`, `chrome-dev`,
`chrome-canary`, `msedge`, `msedge-beta`, `msedge-dev`, or
`msedge-canary`). The variable itself has no default value: an unset one
uses the downloaded Playwright Chromium (the equivalent of `chromium`)
and, only if that one is absent, a system-installed Google Chrome (the
equivalent of `chrome`). An explicitly configured browser failing to
launch fails the export instead of falling back onto another browser.

Every verbose message carries a level: `debug` for the regular
processing information, which `-v`/`--verbose` gates, and `notice` for
the environment problems, the warning diagnostics, and the preview
server events, which the CLI prints regardless of the option. The
literal values inside a message are marked by `literal()` and styled by
`renderVerbose()`, which the CLI feeds with Chalk.

## Code Style

Strict TypeScript conventions are enforced in `src/`: no semicolons
(except inside `for`), double quotes, K&R braces, no braces around
single-statement `if`/`while` blocks, vertically-aligned operators
on similar consecutive lines, `/* ... */` block comments with two
leading/trailing spaces, parens around all arrow parameters, and line
breaks before `else`/`catch`/`finally`. Match existing formatting
exactly when editing.

## CHANGELOG.md entries

Entries to CHANGELOG.md are minimally 2 and maximally 3 lines long.
The first line is always just the classification and the summary. The
description then is just 1 or 2 lines. All lines have to be line-wrapped
at column 100.

