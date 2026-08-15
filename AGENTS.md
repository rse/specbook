## About

**Specification Book (SpecBook)** is the opinionated tooling of *Dr.
Ralf S. Engelschall* for a generic, Markdown-based *specification
format*, which is configured for particular contexts through a YAML
*schema configuration*. SpecBook allows specifications to be
*initialized*, *linted*, *exported* (JSON, JSON5, YAML, TOON, HTML,
PDF, and normalized Markdown), *described*, and
LLM-assisted *imported* and *edited* -- through an API class `SpecBook`,
a CLI `specbook <cmd>`, and an MCP service `specbook mcp` with tools
`specbook_<cmd>`, where CLI and MCP are based entirely on the API.

## Repository Layout

-   `src/`: the TypeScript sources
    -   `src/specbook-api.ts`: the API facade class `SpecBook`, wiring all commands
    -   `src/specbook-cli.ts`: the Commander-based CLI (thin wrapper over the API)
    -   `src/specbook-mcp.ts`: the MCP stdio service (thin wrapper over the API)
    -   `src/specbook-cmd-*.ts`: one module per command
        (`init`, `lint`, `export`, `describe`, `import`, `edit`);
        `export` covers JSON, JSON5, YAML, TOON, HTML, PDF, and normalized Markdown
    -   `src/specbook-config.ts`: YAML schema configuration loading and validation (Valibot)
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
    -   `src/specbook-struct-spec.ts`: types/schema of the generic Markdown
        structure (the AST of the specification)
    -   `src/specbook-struct-schema.ts`: types/schema of the YAML schema
        configuration (which domain-specific objects are allowed)
    -   `src/specbook-llm.ts`: AI provider/model resolution and the LLM
        file exchange protocol for `import`/`edit`
-   `etc/`: the tool configurations (`eslint.mjs`, `tsconfig.json`, `stx.conf`)
-   `smp/`: the sample YAML schema configuration (`ase.specbook.yaml`)
    and the sample specification corpus (`broadcast/`)
-   `dist/`: the compiled output (`main` is `dist/specbook-api.js`,
    `bin` `specbook` is `dist/specbook-cli.js`) -- never edit it, it is regenerated

## Build System

Build orchestration uses `@rse/stx`, not plain npm scripts. The only npm
script is `npm start`, which invokes stx with `etc/stx.conf`:

```
npm start build         # lint + build-cmd
npm start build-cmd     # tsc --project etc/tsconfig.json (emits into dist/)
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
specbook export   [-v] [-c <yaml-file>] [-b <basedir>] [-o <output-file>] [-f json|json5|yaml|toon|html|pdf|md]
                  [--max-table-columns <count>]
specbook describe [-v] [-c <yaml-file>] [-o <markdown-file>]
specbook import   [-v] [-c <yaml-file>] [-b <basedir>] <input-files...>
specbook edit     [-v] [-c <yaml-file>] [-b <basedir>] <query>
specbook mcp      [-v]
```

The base directory is scanned recursively for the specification Markdown
files, and generated specification Markdown files are placed inside it.
The default value of every CLI option `--xxx` can be overridden by a
corresponding `SPECBOOK_XXX` environment variable. The LLM-based
commands `import` and `edit` use the `ai` package: the environment
variables `SPECBOOK_AI_PROVIDER`/`SPECBOOK_AI_MODEL` provide the
defaults, which API/CLI/MCP parameters override; the provider keys come
from `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`OPENROUTER_API_KEY`, while
`ollama` needs no key and uses the local Ollama service.

## Code Style

Strict TypeScript conventions are enforced in `src/`: no semicolons
(except inside `for`), double quotes, K&R braces, no braces around
single-statement `if`/`while` blocks, vertically-aligned operators
on similar consecutive lines, `/* ... */` block comments with two
leading/trailing spaces, parens around all arrow parameters, and line
breaks before `else`/`catch`/`finally`. Match existing formatting
exactly when editing.
