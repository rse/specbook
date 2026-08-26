
## About

**Specification Book (SpecBook)** is the opinionated tooling of *Dr.
Ralf S. Engelschall* for a generic, Markdown-based *specification
format*, which is configured for particular contexts through a YAML
*schema configuration*. SpecBook allows specifications to be
*initialized*, *linted*, *exported* (JSON, JSON5, YAML, TOON, HTML, PDF,
and normalized Markdown), and *described* -- through an API class
`SpecBook`, a CLI `specbook <cmd>`, and an MCP service `specbook mcp`
with tools `specbook_<cmd>`, where CLI and MCP are based entirely on the
API.

## Repository Layout

-   `src/`: the TypeScript sources
    -   `src/specbook-api.ts`: the API facade class `SpecBook`, wiring all commands
    -   `src/specbook-cli.ts`: the Commander-based CLI (thin wrapper over the API)
    -   `src/specbook-mcp.ts`: the MCP stdio service (thin wrapper over the API)
    -   `src/specbook-cmd-*.ts`: one module per command
        (`init`, `lint`, `export`, `describe`);
        `export` dispatches onto the format renderers in `src/specbook-export-*.ts`;
        `describe` emits `src/specbook-format.md`, the static description of
        the SpecBook models and formats
    -   `src/specbook-export-common.ts`: cross-renderer helpers
        (HTML escaping, stylesheet, document title)
    -   `src/specbook-export-ast.ts`: the AST renderer (JSON, JSON5, YAML, TOON)
    -   `src/specbook-export-md.ts`: the normalized Markdown renderer
    -   `src/specbook-export-html.ts`: the HTML renderer
        (with `src/specbook-export-html.css` as its inlined stylesheet)
    -   `src/specbook-export-pdf.ts`: the PDF renderer (HTML printed
        via Playwright/Chromium, post-processed with `pdf-lib`)
    -   `src/specbook-config.ts`: YAML schema configuration loading and validation (Valibot)
    -   `src/specbook-diagnostic.ts`: the `Diagnostic` type and its
        single-line/verbose renderers, shared by all layers
    -   `src/specbook-verbose.ts`: the marking (`literal`) and rendering
        (`renderVerbose`) of the literal values inside verbose messages,
        which the CLI styles with Chalk
    -   `src/specbook-link.ts`: Wiki-style reference (`[[xxx]]`) syntax,
        link index building, reference resolution, and anchor path derivation
    -   `src/specbook-parse.ts`: parser facade class `Parser`, wiring the
        two parsing phases with file/line-precise diagnostics
    -   `src/specbook-parse-common.ts`: parsing types, the shared phase
        context, and the image embedding MIME type mapping
    -   `src/specbook-parse-syntax.ts`: the syntactic phase, parsing
        Markdown into the `Specification` AST
    -   `src/specbook-parse-semantic.ts`: the semantic phase, validating
        the AST against the schema configuration and the link references
    -   `src/specbook-parse-value.ts`: property value expression language
        (Tokenizr-based compiler for regex/enum/tags/list/reference constraints)
    -   `src/specbook-format-spec.ts`: types/schema of the generic Markdown
        structure (the AST of the specification)
    -   `src/specbook-format-schema.ts`: types/schema of the YAML schema
        configuration (which domain-specific objects are allowed)
    -   `src/specbook-format.yaml`: the bundled standard YAML schema
        configuration, used whenever no particular one is given
-   `etc/`: the tool configurations (`eslint.mjs`, `tsconfig.json`, `stx.conf`)
-   `smp/`: the sample specification corpus (`broadcast/`, based on the
    standard schema configuration) and a small standalone sample (`sample/`)
-   `dst/`: the compiled output (`main` is `dst/specbook-api.js`,
    `bin` `specbook` is `dst/specbook-cli.js`) -- never edit it, it is regenerated

## Build System

Build orchestration uses `@rse/stx`, not plain npm scripts. The only npm
script is `npm start`, which invokes stx with `etc/stx.conf`:

```
npm start build         # lint + build-cmd
npm start build-cmd     # tsc --project etc/tsconfig.json (emits into dst/)
npm start lint          # eslint --config etc/eslint.mjs src/*.ts
npm start build-watch   # nodemon rebuild on src/**/*.ts
npm start lint-watch    # nodemon relint on src/**/*.ts
npm start sample        # lint smp/broadcast/ and export it into smp/broadcast.html
npm start clean         # remove regularly built files
npm start distclean     # also remove node_modules and package-lock.json
```

No test target is defined.

## CLI Commands

```
specbook init     [-v] [-c <yaml-file>] [-b <basedir>]
specbook lint     [-v] [-c <yaml-file>] [-b <basedir>]
specbook export   [-v] [-c <yaml-file>] [-b <basedir>] [-o [<format>:]<output-file>] [...]
specbook describe [-v] [-c <yaml-file>] [-b <basedir>] [-e] [-o <markdown-file>]
specbook mcp      [-v]
```

The YAML schema configuration of `init`, `lint`, and `export` falls back
onto the bundled standard one (`src/specbook-format.yaml`, copied to
`dst/` at build time), while `describe` references the given one only.
Exactly the artifact files referenced by its `file` fields are loaded and parsed,
resolved against the base directory, in which generated specification
Markdown files are placed, too. All other Markdown files below the base
directory are ignored, while a referenced but absent file is reported
unless all of its artifacts are optional.
The export output option `-o`/`--output` (default: `-` for stdout) can
occur multiple times; the format is inferred from the filename extension,
unless explicitly given as a `<format>:` prefix, and plain `-` (stdout)
defaults to JSON.
The `describe` command outputs `src/specbook-format.md` verbatim and
appends a "SpecBook Project Instantiation" section pointing to the
configuration file (`-c`) and the base directory (`-b`) whenever one of
these options is given, where `-e`/`--embed` embeds the YAML schema
configuration itself instead of just referencing it.
The default value of every CLI option `--xxx` can be overridden by a
corresponding `SPECBOOK_XXX` environment variable.

## Code Style

Strict TypeScript conventions are enforced in `src/`: no semicolons
(except inside `for`), double quotes, K&R braces, no braces around
single-statement `if`/`while` blocks, vertically-aligned operators
on similar consecutive lines, `/* ... */` block comments with two
leading/trailing spaces, parens around all arrow parameters, and line
breaks before `else`/`catch`/`finally`. Match existing formatting
exactly when editing.

