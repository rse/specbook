
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
$ specbook init     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook lint     [-v] [-c <yaml-file>] [-b <basedir>]
$ specbook export   [-v] [-c <yaml-file>] [-b <basedir>] [-o [<format>:]<output-file>] [...]
$ specbook describe [-v] [-c <yaml-file>] [-b <basedir>] [-e] [-o <markdown-file>]
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

The `describe` command outputs the description of the SpecBook models
and formats. If the configuration file `-c`/`--config` or the base
directory `-b`/`--basedir` is given, it additionally appends a *SpecBook
Project Instantiation* section which points to these artifacts of the
particular project. With `-e`/`--embed` the YAML schema configuration is
embedded verbatim instead of just being referenced -- which is exactly
the description the commands `import` and `edit` instruct their LLM
with.

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

