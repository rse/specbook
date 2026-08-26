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
import { becauseRegex }
    from "./specbook-parse-common.js"

/*  format a timestamp in the frontmatter format  */
const formatTimestamp = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/*  render the properties as a value-aligned key/value list, wrapping a
    value carrying ";" onto a continuation line, as only a ";"-free first
    line lets the item be recognized as a property again on re-parsing  */
const renderKeyValuesMd = (properties: SpecProperty[], indent = ""): string => {
    const width = Math.max(...properties.map((property) => property.key.length)) + 1
    return properties.map((property) => property.value.includes(";") ?
        `${indent}-   ${property.key}:\n${indent}    ${property.value}` :
        `${indent}-   ${`${property.key}:`.padEnd(width)} ${property.value}`.trimEnd()).join("\n")
}

/*  whether a property can be a Concise Format segment: a value carrying
    a ";" would split the segment, and a value carrying the rationale
    marker would not be taken for a property at all on re-parsing  */
const segmentableMd = (property: SpecProperty): boolean =>
    !property.value.includes(";") && !becauseRegex.test(property.value)

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

/*  whether any descendant of an object carries a description which no
    Concise Format item can carry -- a multi-line one (a fenced code
    block, an ordered list, a blockquote, or multiple paragraphs) or one
    carrying a ";", as only a ";"-free description stays a single segment
    on re-parsing instead of splitting off a spurious property  */
const complexBelowMd = (object: SpecObject): boolean =>
    object.childs.some((child) => (child.description !== undefined
        && /[\n;]/.test(renderDescriptionMd(child.description))) || complexBelowMd(child))

/*  render an object in the Concise Format as a list item of the
    given nesting depth, with its childs as nested list items  */
const renderConciseMd = (object: SpecObject, depth = 0): string => {
    const indent   = " ".repeat(depth * 4)
    const segments = [ `${object.kind}: ${object.name}${nameSuffixMd(object)}` ]

    /*  a property which cannot be a segment has to become a nested
        key/value item below the item instead  */
    const wrapped = object.properties.filter((property) => !segmentableMd(property))
    const inline  = object.properties.filter((property) =>  segmentableMd(property))
    segments.push(...inline.map((property) => `${property.key}: ${property.value}`))
    if (object.description !== undefined)
        segments.push(renderDescriptionMd(object.description))

    /*  a description terminates the item with ".", which on re-parsing
        marks the last segment as the description (even one shaped like
        "<key>: <value>"), while without one the ";" segment terminator
        has to remain, as only it lets the item be recognized as concise  */
    const item = object.description !== undefined ?
        `${indent}-   ${segments.join("; ").replace(/\.?$/, ".")}` :
        `${indent}-   ${segments.join("; ")};`
    return [ item, renderKeyValuesMd(wrapped, `${indent}    `),
        ...object.childs.map((child) => renderConciseMd(child, depth + 1)) ]
        .filter((part) => part !== "").join("\n")
}

/*  render an object in the Complex Format (levels 1-3), with childs from
    level 4 upwards in the Concise Format -- unless a descendant carries
    a description no concise item can carry, so all childs (as siblings
    have to share the format) stay in the Complex Format down to heading
    level 6 -- and the optionally derived Gradia diagram spec embedded
    as a "gradia" fenced code block below the heading  */
const renderObjectMd = (object: SpecObject, level: number, diagrams?: Map<SpecObject, string>): string => {
    const heading = `${"#".repeat(level)}${" ".repeat(Math.max(1, 4 - level))}` +
        `${object.kind}: ${object.name}${nameSuffixMd(object)}`
    const parts = [ heading ]
    const spec  = diagrams?.get(object)
    if (spec !== undefined)
        parts.push(`\`\`\`gradia\n${spec}\`\`\``)
    if (object.properties.length > 0)
        parts.push(renderKeyValuesMd(object.properties))
    if (object.description !== undefined)
        parts.push(renderDescriptionMd(object.description))

    /*  the childs share one format, as a concise item following
        a heading would attach to the heading's object instead  */
    if (level >= 3 && !complexBelowMd(object))
        parts.push(object.childs.map((child) => renderConciseMd(child)).join("\n"))
    else
        parts.push(...object.childs.map((child) => renderObjectMd(child, level + 1, diagrams)))
    return parts.filter((part) => part !== "").join("\n\n")
}

/*  render the entire specification into normalized Markdown  */
export const renderMarkdown = (specification: Spec,
    config?: Schema): string => {
    /*  derive the Gradia specs of the diagram-configured objects
        (an invalid diagram situation omits the diagram, as it is
        already reported as a lint diagnostic)  */
    const diagrams = new Map<SpecObject, string>()
    if (config !== undefined)
        for (const [ object, result ] of specDiagrams(specification, config))
            if (result.spec !== undefined)
                diagrams.set(object, result.spec)

    /*  the single frontmatter block (only recognized at the start of a
        file on re-parse) carries the earliest creation and the latest
        modification timestamp of all artifacts  */
    const created  = new Date(Math.min(
        ...specification.artifacts.map((artifact) => artifact.created.getTime())))
    const modified = new Date(Math.max(
        ...specification.artifacts.map((artifact) => artifact.modified.getTime())))
    return "---\n" +
        `Created:  ${formatTimestamp(created)}\n` +
        `Modified: ${formatTimestamp(modified)}\n` +
        "---\n\n" +
        specification.artifacts.flatMap((artifact) => artifact.objects)
            .map((object) => renderObjectMd(object, 1, diagrams)).join("\n\n") + "\n"
}
