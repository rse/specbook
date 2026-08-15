
# SpecBook

**Markdown-based Specification Format**

## About

**SpecBook** defines a generic, Markdown-based *specification format*
which can be configured for the specifications of particular contexts
through a YAML *schema configuration*. SpecBook allows specifications to
be *initialized*, *linted*, *exported* (JSON, JSON5, YAML, TOON, HTML,
PDF, and normalized Markdown), *described*
to LLMs, and LLM-assisted *imported* and *edited* -- through an API
class `SpecBook`, a CLI `specbook <cmd>`, and an MCP service with tools
`specbook_<cmd>`, where CLI and MCP are based entirely on the API.

## Specification Format

A specification consists of Markdown *artifact* files, each carrying a
frontmatter with `Created:` and `Modified:` timestamps and a tree of
*objects*. Every object has a *kind*, a *name*, a unique anchor *id*,
optional *properties* (key/value pairs), an optional *description*
statement with an optional rationale, and optional *child* objects.
Two concrete syntaxes exist:

### Complex Format

Usually used on levels 1-3 (`#`, `##`, `###`). Level 1 carries the artifact id
in parentheses, levels 2-3 carry an HTML anchor after the name:

```
#   <kind/>: <name/> (<id/>)

-   <key/>: <value/>
-   [...]

<statement/>, BECAUSE <rationale/>.
```

### Concise Format

Usually used on level 4 and deeper, with child objects nested as
indented list items below their parent item:

```
-   <kind/>: <name/>; <key/>: <value/>; [...]; <statement/>, BECAUSE <rationale/>.
```

When SpecBook itself generates specification Markdown, it emits the
Complex Format on levels 1-3 and the Concise Format from level 4
upwards. When SpecBook edits existing files, it mirrors the format each
existing object already uses.

## Schema Configuration

The YAML schema configuration (see `ase.specbook.yaml` for a
comprehensive example) defines which domain-specific objects are
allowed: the artifact kinds with their `file` mapping on the first
level, the object kinds of the deeper levels, and their properties with
optional value constraints: regular expressions `/xxx/`, object
references `[[xxx]]`, enumerations `enum(xxx,yyy)`, tag sets
`tags(xxx,yyy)`, and lists `list(xxx[, ...])` of such alternatives.
The `file` field is only allowed on the first (artifact) level.

## Usage

### CLI

```
$ specbook init     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook lint     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook export   [-v] [-c <yaml-file>] [-b <basedir>] [-o <output-file>] [-f json|json5|yaml|toon|html|pdf|md]
                    [--max-table-columns <count>]
$ specbook describe [-v] [-c <yaml-file>] [-o <markdown-file>]
$ specbook import   [-v] [-c <yaml-file>] [-b <basedir>] <input-files...>
$ specbook edit     [-v] [-c <yaml-file>] [-b <basedir>] <query>
$ specbook mcp      [-v]
```

The base directory `-b`/`--basedir` (default: `.`) is scanned
recursively for the specification Markdown files, and generated
specification Markdown files are placed inside it, too.

The default value of every CLI option `--xxx` can be overridden by a
corresponding `SPECBOOK_XXX` environment variable (e.g.
`SPECBOOK_BASEDIR`, `SPECBOOK_CONFIG`, `SPECBOOK_FORMAT`,
`SPECBOOK_VERBOSE`), while an explicitly supplied option always wins.

### API

```ts
import { SpecBook } from "specbook"

const specbook = new SpecBook({ verbose: (msg) => console.error(msg) })
const result   = await specbook.lint({ config: "smp/ase.specbook.yaml", basedir: "smp/broadcast" })
```

### MCP

Run `specbook mcp` to serve the tools `specbook_init`,
`specbook_lint`, `specbook_export`, `specbook_describe`,
`specbook_import`, and `specbook_edit` over stdio.

### AI Configuration

The commands `import` and `edit` use an LLM. The environment variables
`SPECBOOK_AI_PROVIDER` (`anthropic`, `openai`, `openrouter`, or
`ollama`) and
`SPECBOOK_AI_MODEL` provide the defaults, which the CLI options
`--provider`/`--model` (respectively the MCP/API parameters `provider`/
`model`) override. The provider API keys come from the standard
environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`OPENROUTER_API_KEY`), while `ollama` needs no key and uses the local
Ollama service.

## License

Copyright &copy; 2026 Dr. Ralf S. Engelschall (http://engelschall.com/)<br/>
Licensed under Apache 2.0 (https://spdx.org/licenses/Apache-2.0)

