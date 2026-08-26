
<img src="https://raw.githubusercontent.com/rse/specbook/master/etc/specbook-logo-blue-light.svg" width="400" align="right" alt=""/>

SpecBook
========

**Markdown-based Specification Format**

About
-----

**SpecBook** defines a generic, Markdown-based *specification
format* which can be configured for the specifications of particular
contexts through a YAML-based *schema configuration*. SpecBook allows
specifications to be *initialized*, *linted*, *exported* (JSON, JSON5,
YAML, TOON, HTML, PDF, and normalized Markdown), and *described* to
LLMs.

**SpecBook** ships with an API class with methods `<xxx>()`, a
CLI with commands `specbook <xxx>`, and an MCP service with tools
`specbook_<xxx>()`.

**SpecBook** provides the following distinct features:

- **Hierarchical Object Model**:
  A specification is a tree of typed objects, each with a kind and
  name, an optional id, optional properties, optional description, and
  optional child objects. The allowed object hierarchy is defined per
  context by the YAML schema configuration.

- **Versatile Object to Markdown Mapping**:
  Objects are authored as plain Markdown headings, property lists,
  and description prose. The objects can be mapped to nested sections
  ("complex" format) or compact bullet point lists ("concise" and
  "group" format).

- **Wiki-Style Object Linking**:
  Objects can hierarchically reference each other through Wiki-style
  `[[xxx]]` references, which are resolved against the locally-unique
  ids and names of all objects. In the HTML and PDF exports they become
  navigable links onto precise anchors.

- **Strict Validation with Custom Schema**:
  The YAML schema configuration strictly defines the allowed object
  kinds, hierarchies, and properties, whose values are constrained by an
  expression language (regex, enum, tags, list, and reference). Violations
  are reported as file- and line-precise diagnostics. A bundled standard
  schema configuration applies if no particular one is given.

- **Object Model Diagram Visualisation**:
  Object kinds can declare "graph", "hub", or "grid" diagrams in the
  schema, whose nodes and edges are automatically derived from the
  object model and its references. The diagrams are rendered with the
  sibling project [Gradia](https://github.com/rse/gradia), which is
  specialized in rendering object models.

- **CLI, MCP, and API Interface**:
  All commands are implemented once in the API class `SpecBook`, on
  which both the CLI and the MCP service are just thin wrappers.
  This way, humans, scripts, and AI agents use exactly the same
  functionality.

- **AST Exports for AI/LLMs**:
  The parsed specification Abstract Syntax Tree (AST) can be exported in
  JSON, JSON5, YAML, or TOON format for machine consumption. Together
  with the `describe` command, which explains the models and formats,
  this enables LLMs to both read and write specifications.

- **HTML Export for Developers**:
  The HTML export is a self-contained single document with a
  table-of-contents, full-text search, embedded images, and a light/dark
  theme toggle. It is intended for the day-to-day online reading during
  development. The HTML export can map all object kinds to nested
  sections or compact tables, or an automatic mixture which collapses
  only the deepest level into tables.

- **PDF Export for Customers**:
  The PDF export prints the HTML rendering via Chromium and post-processes
  it with page numbers, headers/footers, and a hierarchical PDF outline.
  It is intended as a polished, paginated offline document for handing
  over to customers.

Overview
--------

[![poster-1](etc/poster-1.png)](etc/poster-1.pdf)

[![poster-2](etc/poster-2.png)](etc/poster-2.pdf)

Installation
------------

```bash
$ npm install -g @rse/specbook
```

Usage
-----

### CLI

```bash
$ specbook init     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook lint     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook export   [-v] [-c <yaml-file>] [-b <basedir>] [-o [<format>:]<output-file>] [...]
$ specbook describe [-v] [-c <yaml-file>] [-b <basedir>] [-e] [-o <markdown-file>]
$ specbook mcp      [-v]
```

The YAML schema configuration `-c`/`--config` (default: the bundled
standard schema configuration `specbook-format.yaml`) determines the
specification: exactly the artifact files its `file` fields reference
are loaded and parsed; all other Markdown files below the base
directory are ignored. A referenced
file which is absent is reported, unless all of its artifacts are
`optional`, and so is an artifact absent from its present file, unless
it is `optional` itself. Both `lint` and `export` report all
diagnostics and fail on any of them, so a partial or invalid
specification is never exported.

The base directory `-b`/`--basedir` (default: `.`) is the directory the
referenced artifact files are resolved against, and generated
specification Markdown files are placed inside it, too.

The export output option `-o`/`--output` (default: `-` for stdout) can
occur multiple times. The format (`json`, `json5`, `yaml`, `toon`,
`html`, `pdf`, or `md`) is inferred from the filename extension, unless
it is explicitly given as a `<format>:` prefix, and plain `-` (stdout)
defaults to JSON.

The `md` format normalizes the entire corpus into a *single* Markdown
document, whose single frontmatter block carries the earliest `Created:`
and the latest `Modified:` timestamp of all artifacts, so the
per-artifact timestamps do not survive this round-trip.

The `describe` command outputs the description of the SpecBook models
and formats. If the configuration file `-c`/`--config` or the base
directory `-b`/`--basedir` is given, it additionally appends a *SpecBook
Project Instantiation* section which points to these artifacts of the
particular project. With `-e`/`--embed` the YAML schema configuration
is embedded verbatim instead of just being referenced -- falling back
onto the bundled standard schema configuration if none is given -- so
the resulting document describes the specification format entirely on
its own.

The default value of every CLI option `--xxx` can be overridden by a
corresponding `SPECBOOK_XXX` environment variable (e.g.
`SPECBOOK_BASEDIR`, `SPECBOOK_CONFIG`, `SPECBOOK_OUTPUT`,
`SPECBOOK_VERBOSE`), while an explicitly supplied option always wins.

### API

```ts
import { SpecBook, renderVerbose } from "@rse/specbook"

const specbook = new SpecBook({
    verbose: (cmd, msg) => console.error(`specbook: ${cmd}: ${renderVerbose(msg)}`)
})
const result = await specbook.lint({
    basedir: "smp/broadcast"
})
```

### MCP

Run `specbook mcp` to serve the tools `specbook_init`, `specbook_lint`,
`specbook_export`, and `specbook_describe` over stdio.

Rendering Examples
------------------

### HTML Rendering (Light Theme)

![screenshot-light](etc/screenshot-light.png)

### HTML Rendering (Dark Theme)

![screenshot-dark](etc/screenshot-dark.png)

### PDF Rendering

![screenshot-print](etc/screenshot-print.png)

License
-------

Copyright &copy; 2026 [Dr. Ralf S. Engelschall](http://engelschall.com/)<br/>
Licensed under [Apache 2.0](https://spdx.org/licenses/Apache-2.0)

