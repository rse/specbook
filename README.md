
<img src="https://raw.githubusercontent.com/rse/specbook/master/etc/specbook-logo.svg" width="400" align="right" alt=""/>

SpecBook
========

**Markdown-based Specification Format**

About
-----

**SpecBook** defines a generic, Markdown-based *specification
format* which can be configured for the specifications of particular
contexts through a YAML-based *schema configuration*. SpecBook allows
specifications to be *initialized*, *linted*, *exported* (JSON, JSON5,
YAML, TOON, HTML, PDF, and normalized Markdown), *described* to LLMs,
and LLM-assisted *imported* and *edited* -- through an API class with
methods `<cmd>()`, a CLI with commands `specbook <cmd>`, and an MCP
service with tools `specbook_<cmd>()`.

**SpecBook** provides the following distinct features:

- hierarchical object structure
- strict Markdown-based input format
- complex and concise object to Markdown mappings
- Wiki-style hierarchy-aware object hyperlinks
- canonical Markdown output format
- AST-based JSON, JSON5, YAML, and TOON output formats
- HTML output format for online reading
- PDF output format for printing and archiving
- CLI, MCP, and API interfaces

Specification Format
--------------------

A specification consists of Markdown *artifact* files, each carrying a
frontmatter with `Created:` and `Modified:` timestamps and a tree of
*objects*. Every object has a mandatory *kind*, a mandatory *name*, an
optional unique anchor *id*, optional *properties* (key/value pairs),
an optional *description* statement with an optional rationale, and
optional *child* objects.

Three concrete syntaxes exist:

### Complex Format

Usually used on object hierarchy levels 1-3 (`#`, `##`, `###`).

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
-   <kind/>: <name/>; <key/>: <value/>; [...];
    <statement/>, BECAUSE <rationale/>.
```

### Grouped Format

A heading carrying just a *kind* and no `<kind/>: <name/>` pair opens a
*grouping container* instead of an object. The list items below it are
Concise Format items whose kind comes from that heading, so they start
with the (optionally backquoted) name directly:

```
### <kinds/>

-   `<name/>`; <key/>: <value/>; [...];
    <statement/>, BECAUSE <rationale/>.
```

The heading kind is singularized by stripping one trailing `S`, so both
`### STATES` and `### STATE` group objects of kind `STATE`. The grouped
objects become childs of the object the heading is nested under.

When **SpecBook** itself generates specification Markdown, it emits
the Complex Format on levels 1-3 and the Concise Format from level 4
upwards. When **SpecBook** edits existing files, it mirrors the format
each existing object already uses.

Schema Configuration
--------------------

The YAML schema configuration (see
[`ase.specbook.yaml`](smp/ase.specbook.yaml) for a comprehensive
example) defines which domain-specific objects are allowed: the artifact
kinds with their `file` mapping on the first level, the object kinds of
the deeper levels, and their properties with optional value constraints:
regular expressions `/xxx/`, object references `[[xxx]]`, enumerations
`enum(xxx,yyy)`, tag sets `tags(xxx,yyy)`, and lists `list(xxx[, ...])`
of such alternatives. The `file` field is only allowed on the first
(artifact) level.

An object kind can additionally carry a `diagram` field, which derives a
[Gradia](https://github.com/rse/gradia) diagram for every object of that
kind. Its `type` selects the diagram shape (`graph`, `hub`, or `grid`),
`nodes` and `edges` select the participating objects through
comma-separated `[[xxx]]` reference patterns (`nodes` defaults to the
object itself plus all objects below it), `center` names the object a
`hub` is projected onto (default: `self`), `onlyConnected` drops the
edge-less nodes of a `graph`, `collapse` (default: `true`) omits a
degenerated diagram consisting of a single node only, `qualified` labels
every node with its object kind, and `config` passes arbitrary Gradia
rendering options (e.g. `grid-columns-max: 5`) through to the diagram.

The edges are derived from the `[[xxx]]` references of the node objects
-- from their property values only, or, with `links: all`, from their
descriptions as well. As the *nesting* of the objects carries no such
reference, `hierarchy: true` additionally derives a containment edge
from every node object to each of its child objects which is part of the
node set. This is what turns a parent object into the hub of its own
childs, as the `TIER` objects of the sample schema configuration
demonstrate:

```yaml
-   kind: TIER
    diagram:
        type: hub
        center: self
        hierarchy: true
```

A `grid` is edge-less by definition and hence accepts neither `edges`
nor `hierarchy`.

Usage
-----

### CLI

```
$ specbook init     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook lint     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook export   [-v] [-c <yaml-file>] [-b <basedir>] [-o [<format>:]<output-file>] [...]
                    [--max-table-columns <count>]
$ specbook describe [-v] [-c <yaml-file>] [-o <markdown-file>]
$ specbook import   [-v] [-c <yaml-file>] [-b <basedir>] <input-files...>
$ specbook edit     [-v] [-c <yaml-file>] [-b <basedir>] <query>
$ specbook mcp      [-v]
```

The base directory `-b`/`--basedir` (default: `.`) is scanned
recursively for the specification Markdown files, and generated
specification Markdown files are placed inside it, too.

The export output option `-o`/`--output` (default: `-` for stdout) can
occur multiple times. The format (`json`, `json5`, `yaml`, `toon`,
`html`, `pdf`, or `md`) is inferred from the filename extension, unless
it is explicitly given as a `<format>:` prefix, and plain `-` (stdout)
defaults to JSON.

The default value of every CLI option `--xxx` can be overridden by a
corresponding `SPECBOOK_XXX` environment variable (e.g.
`SPECBOOK_BASEDIR`, `SPECBOOK_CONFIG`, `SPECBOOK_OUTPUT`,
`SPECBOOK_VERBOSE`), while an explicitly supplied option always wins.

### API

```ts
import { SpecBook } from "@rse/specbook"

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

License
-------

Copyright &copy; 2026 Dr. Ralf S. Engelschall (http://engelschall.com/)<br/>
Licensed under Apache 2.0 (https://spdx.org/licenses/Apache-2.0)

