/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Specification, Object as SpecObject, Property, Description }
    from "./specbook-struct-spec.js"

/*  format a timestamp in the frontmatter format  */
const formatTimestamp = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/*  render the properties as a value-aligned key/value list  */
const renderKeyValuesMd = (properties: Property[]): string => {
    const width = Math.max(...properties.map((property) => property.key.length)) + 1
    return properties.map((property) =>
        `-   ${`${property.key}:`.padEnd(width)} ${property.value}`).join("\n")
}

/*  render a description statement with its optional rationale  */
const renderDescriptionMd = (description: Description): string =>
    description.description + (description.rationale !== undefined ?
        `, BECAUSE ${description.rationale}` : "")

/*  render the implicit "(xxx)" and/or explicit "{{xxx}}" anchor suffix  */
const anchorSuffixMd = (object: SpecObject): string =>
    (object.paren  !== undefined ? ` (${object.paren})`    : "") +
    (object.anchor !== undefined ? ` {{${object.anchor}}}` : "")

/*  render an object in the Concise Format (level 4 and deeper),
    with its childs as nested list items  */
const renderConciseMd = (object: SpecObject, level: number): string => {
    const indent   = " ".repeat((level - 4) * 4)
    const segments = [ `${object.kind}: ${object.name}${anchorSuffixMd(object)}` ]
    segments.push(...object.properties.map((property) => `${property.key}: ${property.value}`))
    if (object.description !== undefined)
        segments.push(renderDescriptionMd(object.description))
    const item = `${indent}-   ${segments.join("; ").replace(/\.?$/, ".")}`
    return [ item, ...object.childs.map((child) => renderConciseMd(child, level + 1)) ].join("\n")
}

/*  render an object in the Complex Format (levels 1-3),
    with childs from level 4 upwards in the Concise Format  */
const renderObjectMd = (object: SpecObject, level: number): string => {
    const heading = level === 1 ?
        `#   ${object.kind}: ${object.name}${anchorSuffixMd(object)}` :
        `${"#".repeat(level)}${" ".repeat(4 - level)}${object.kind}: ${object.name}${anchorSuffixMd(object)}`
    const parts = [ heading ]
    if (object.properties.length > 0)
        parts.push(renderKeyValuesMd(object.properties))
    if (object.description !== undefined)
        parts.push(renderDescriptionMd(object.description))
    if (level >= 3)
        parts.push(object.childs.map((child) => renderConciseMd(child, level + 1)).join("\n"))
    else
        parts.push(...object.childs.map((child) => renderObjectMd(child, level + 1)))
    return parts.filter((part) => part !== "").join("\n\n")
}

/*  render the entire specification into normalized Markdown  */
export const renderMarkdown = (specification: Specification): string =>
    specification.artifacts.map((artifact) =>
        artifact.objects.map((object) =>
            "---\n" +
            `Created:  ${formatTimestamp(artifact.created)}\n` +
            `Modified: ${formatTimestamp(artifact.modified)}\n` +
            "---\n\n" +
            renderObjectMd(object, 1)
        ).join("\n\n")
    ).join("\n\n") + "\n"
