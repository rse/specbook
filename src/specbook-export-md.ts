/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Spec, SpecObject, SpecProperty, SpecDescription }
    from "./specbook-format-spec.js"
import type { Schema }
    from "./specbook-format-schema.js"
import { specDiagrams }
    from "./specbook-diagram.js"

/*  format a timestamp in the frontmatter format  */
const formatTimestamp = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/*  render the properties as a value-aligned key/value list  */
const renderKeyValuesMd = (properties: SpecProperty[]): string => {
    const width = Math.max(...properties.map((property) => property.key.length)) + 1
    return properties.map((property) =>
        `-   ${`${property.key}:`.padEnd(width)} ${property.value}`).join("\n")
}

/*  render a description statement with its optional rationale  */
const renderDescriptionMd = (description: SpecDescription): string =>
    description.description + (description.rationale !== undefined ?
        `, BECAUSE ${description.rationale}` : "")

/*  render the "(*)" primary marker plus the implicit "(xxx)"
    and/or explicit "{{xxx}}" anchor suffix  */
const nameSuffixMd = (object: SpecObject): string =>
    (object.primary === true      ? " (*)"                  : "") +
    (object.paren   !== undefined ? ` (${object.paren})`    : "") +
    (object.anchor  !== undefined ? ` {{${object.anchor}}}` : "")

/*  render an object in the Concise Format (level 4 and deeper),
    with its childs as nested list items  */
const renderConciseMd = (object: SpecObject, level: number): string => {
    const indent   = " ".repeat((level - 4) * 4)
    const segments = [ `${object.kind}: ${object.name}${nameSuffixMd(object)}` ]
    segments.push(...object.properties.map((property) => `${property.key}: ${property.value}`))
    if (object.description !== undefined)
        segments.push(renderDescriptionMd(object.description).replace(/\s*\n\s*/g, " "))

    /*  a description terminates the item with ".", while without one the
        ";" segment terminator has to remain, as only it lets the item be
        recognized as a concise object again on re-parsing  */
    const item = object.description !== undefined ?
        `${indent}-   ${segments.join("; ").replace(/\.?$/, ".")}` :
        `${indent}-   ${segments.join("; ")};`
    return [ item, ...object.childs.map((child) => renderConciseMd(child, level + 1)) ].join("\n")
}

/*  render an object in the Complex Format (levels 1-3),
    with childs from level 4 upwards in the Concise Format
    and the optionally derived Gradia diagram spec embedded
    as a "gradia" fenced code block below the heading  */
const renderObjectMd = (object: SpecObject, level: number, diagrams?: Map<SpecObject, string>): string => {
    const heading = `${"#".repeat(level)}${" ".repeat(4 - level)}` +
        `${object.kind}: ${object.name}${nameSuffixMd(object)}`
    const parts = [ heading ]
    const spec  = diagrams?.get(object)
    if (spec !== undefined)
        parts.push(`\`\`\`gradia\n${spec}\`\`\``)
    if (object.properties.length > 0)
        parts.push(renderKeyValuesMd(object.properties))
    if (object.description !== undefined)
        parts.push(renderDescriptionMd(object.description))
    if (level >= 3)
        parts.push(object.childs.map((child) => renderConciseMd(child, level + 1)).join("\n"))
    else
        parts.push(...object.childs.map((child) => renderObjectMd(child, level + 1, diagrams)))
    return parts.filter((part) => part !== "").join("\n\n")
}

/*  render the entire specification into normalized Markdown  */
export const renderMarkdown = async (specification: Spec,
    config?: Schema): Promise<string> => {
    /*  derive the Gradia specs of the diagram-configured objects
        (an invalid diagram situation omits the diagram, as it is
        already reported as a lint diagnostic)  */
    const diagrams = new Map<SpecObject, string>()
    if (config !== undefined)
        for (const [ object, result ] of specDiagrams(specification, config))
            if (result.spec !== undefined)
                diagrams.set(object, result.spec)
    return specification.artifacts.map((artifact) =>
        "---\n" +
        `Created:  ${formatTimestamp(artifact.created)}\n` +
        `Modified: ${formatTimestamp(artifact.modified)}\n` +
        "---\n\n" +
        artifact.objects.map((object) =>
            renderObjectMd(object, 1, diagrams)).join("\n\n")
    ).join("\n\n") + "\n"
}
