
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

- Hierarchical Object Model
- Versatile Object to Markdown Mapping
- Wiki-Style Object Linking
- Strict Validation with Custom Schema
- Object Model Diagram Visualisation
- CLI, MCP, and API Interface
- AST Exports for AI/LLMs
- HTML Export for Developers
- PDF Export for Customers

Overview Poster
---------------

[![poster](etc/poster.png)](etc/poster.pdf)

Rendering Example
-----------------

### HTML Rendering (Light Theme)

![screenshot-light](etc/screenshot-light.png)

### HTML Rendering (Dark Theme)

![screenshot-dark](etc/screenshot-dark.png)

### PDF Rendering

![screenshot-print](etc/screenshot-print.png)

Usage
-----

### CLI

```
$ specbook init     [-v] -c <yaml-file> [-b <basedir>]
$ specbook lint     [-v] -c <yaml-file> [-b <basedir>]
$ specbook export   [-v] -c <yaml-file> [-b <basedir>] [-o [<format>:]<output-file>] [...]
$ specbook describe [-v] [-c <yaml-file>] [-b <basedir>] [-e] [-o <markdown-file>]
$ specbook mcp      [-v]
```

The YAML schema configuration `-c`/`--config` is mandatory for `init`,
`lint`, and `export`, as it determines the specification: exactly the
artifact files its `file` fields reference are loaded and parsed, all
other Markdown files below the base directory are ignored. A referenced
file which is absent is reported, unless all of its artifacts are
`optional`.

The base directory `-b`/`--basedir` (default: `.`) is the directory the
referenced artifact files are resolved against, and generated
specification Markdown files are placed inside it, too.

The export output option `-o`/`--output` (default: `-` for stdout) can
occur multiple times. The format (`json`, `json5`, `yaml`, `toon`,
`html`, `pdf`, or `md`) is inferred from the filename extension, unless
it is explicitly given as a `<format>:` prefix, and plain `-` (stdout)
defaults to JSON.

The `describe` command outputs the description of the SpecBook models
and formats. If the configuration file `-c`/`--config` or the base
directory `-b`/`--basedir` is given, it additionally appends a *SpecBook
Project Instantiation* section which points to these artifacts of the
particular project. With `-e`/`--embed` the YAML schema configuration is
embedded verbatim instead of just being referenced, so the resulting
document describes the specification format of the project entirely on
its own.

The default value of every CLI option `--xxx` can be overridden by a
corresponding `SPECBOOK_XXX` environment variable (e.g.
`SPECBOOK_BASEDIR`, `SPECBOOK_CONFIG`, `SPECBOOK_OUTPUT`,
`SPECBOOK_VERBOSE`), while an explicitly supplied option always wins. A
`SPECBOOK_CONFIG` value also satisfies the otherwise mandatory
`-c`/`--config` option.

### API

```ts
import { SpecBook, renderVerbose } from "@rse/specbook"

const specbook = new SpecBook({
    verbose: (cmd, msg) => console.error(`specbook: ${cmd}: ${renderVerbose(msg)}`)
})
const result = await specbook.lint({
    config:  "smp/ase.specbook.yaml",
    basedir: "smp/broadcast"
})
```

### MCP

Run `specbook mcp` to serve the tools `specbook_init`, `specbook_lint`,
`specbook_export`, and `specbook_describe` over stdio.

License
-------

Copyright &copy; 2026 [Dr. Ralf S. Engelschall](http://engelschall.com/)<br/>
Licensed under [Apache 2.0](https://spdx.org/licenses/Apache-2.0)

