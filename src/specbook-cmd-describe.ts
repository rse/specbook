/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import textframe from "textframe"

import { type SchemaSpecification, type SchemaObject } from "./specbook-struct-schema.js"

/*  collapse folded YAML prose into a single line  */
const collapse = (text?: string): string =>
    (text ?? "").replace(/\s+/g, " ").trim()

/*  the static description of the generic Markdown syntax  */
const syntax = textframe`
    #   SpecBook Specification Format

    A specification consists of Markdown *artifact* files, each carrying a
    frontmatter with \`Created:\` and \`Modified:\` timestamps (format
    \`yyyy-LL-dd HH:mm\`) and a tree of *objects*. Every object has a *kind*,
    a *name*, a unique anchor *id*, optional *properties* (key/value pairs),
    an optional *description* statement with an optional rationale, and
    optional *child* objects. Two concrete syntaxes exist:

    ##  Complex Format (used on levels 1-3)

    \`\`\`
    #   <kind>: <name> (<id>)

    -   <key>: <value>
    -   [...]

    <statement>, BECAUSE <rationale>.
    \`\`\`

    Level 1 (\`#\`) carries the artifact id in parentheses. Levels 2 (\`##\`)
    and 3 (\`###\`) instead carry an HTML anchor \`<a id="<id>"></a>\` after
    the name, where the id uses the artifact id as its prefix.

    ##  Concise Format (used on level 4 and deeper)

    \`\`\`
    -   <kind>: <name>; <key>: <value>; [...]; <statement>, BECAUSE <rationale>.
    \`\`\`

    Child objects nest as indented list items below their parent item.

    ##  Configured Artifacts

    The following artifacts, object kinds, and properties are configured.
    Object kinds and property names are *case-sensitive* and must be
    written exactly as configured. Properties marked \`required\` must be
    present, and property values must match their given constraint (if
    any, else any value is allowed): \`/xxx/\` requires a match of the
    regular expression, \`[[xxx]]\` requires exactly one Wiki-style link
    reference resolving into the (usually wildcard) reference pattern,
    \`enum(xxx,yyy)\` requires one of the listed members, \`tags(xxx,yyy)\`
    requires a comma-separated set of the listed members (each at most
    once), and \`list(xxx[, ...])\` requires a comma-separated list of
    items, each matching one of the alternative constraints.
`

/*  describe a single configured property  */
const describeProperty = (prop: { name: string, desc?: string, value?: string, optional?: boolean }, indent: string): string => {
    let line = `${indent}-   property \`${prop.name}\` (${prop.optional === true ? "optional" : "required"}`
    if (prop.value !== undefined)
        line += `, constraint \`${prop.value}\``
    line += `): ${collapse(prop.desc)}`
    return line
}

/*  describe a single configured object kind (and recursively its childs)  */
const describeObject = (object: SchemaObject, level: number, indent: string): string => {
    const lines = new Array<string>()
    lines.push(`${indent}-   object kind \`${object.kind}\` on level ${level}` +
        `${object.optional === true ? " (optional)" : ""}: ${collapse(object.desc)}`)
    for (const prop of object.props ?? [])
        lines.push(describeProperty(prop, `${indent}    `))
    for (const child of object.childs ?? [])
        lines.push(describeObject(child, level + 1, `${indent}    `))
    return lines.join("\n")
}

/*  describe the configured specification format as Markdown  */
export const describeConfiguration = (config: SchemaSpecification): string => {
    const sections = new Array<string>()
    for (const artifact of config) {
        const lines = new Array<string>()
        lines.push(`### ${artifact.kind}: ${artifact.name} (${artifact.kind}-${artifact.id})`)
        lines.push("")
        if (artifact.file !== undefined)
            lines.push(`-   file: \`${artifact.file}\``)
        lines.push(`-   description: ${collapse(artifact.desc)}`)
        for (const child of artifact.childs ?? [])
            lines.push(describeObject(child, 2, ""))
        sections.push(lines.join("\n"))
    }
    return `${syntax}\n${sections.join("\n\n")}\n`
}
