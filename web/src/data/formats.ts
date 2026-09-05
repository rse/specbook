/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  the export formats of `specbook export` and the interfaces the very same
    functionality is offered through. Both lists feed the two framed matrices
    of `Section-Export.astro`; `primary` highlights the row a first-time reader
    should look at first.  */

export type Format = {
    id:       string   /*  the `<format>:` prefix / filename extension  */
    name:     string   /*  the format under its established name        */
    audience: string   /*  who the rendering is produced for            */
    primary:  boolean  /*  whether the row is highlighted               */
}

export const formats: Format[] = [
    { id: "html",  name: "HTML",              audience: "developers",  primary: true  },
    { id: "pdf",   name: "PDF",               audience: "customers",   primary: true  },
    { id: "md",    name: "Markdown",          audience: "authors",     primary: false },
    { id: "json",  name: "JSON",              audience: "machines",    primary: false },
    { id: "json5", name: "JSON5",             audience: "machines",    primary: false },
    { id: "yaml",  name: "YAML",              audience: "machines",    primary: false },
    { id: "toon",  name: "TOON",              audience: "AI/LLMs",     primary: true  }
]

export type Interface = {
    id:      string   /*  how the functionality is addressed        */
    name:    string   /*  the interface under its established name  */
    kind:    string   /*  who the interface is meant for            */
    primary: boolean  /*  whether the row is highlighted            */
}

export const interfaces: Interface[] = [
    { id: "SpecBook.<cmd>()",  name: "API", kind: "scripts",  primary: false },
    { id: "specbook <cmd>",    name: "CLI", kind: "humans",   primary: true  },
    { id: "specbook_<cmd>()",  name: "MCP", kind: "AI agents", primary: true  }
]
