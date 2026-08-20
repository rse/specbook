/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Specification, Object as SpecObject } from "./specbook-struct-spec.js"

/*  the Wiki-style reference syntax ("[[xxx]]")  */
export const referenceRegex = /\[\[([^[\]]+)\]\]/g

/*  a single indexed object with its direct parent (undefined for
    the top-level objects of an artifact)  */
interface LinkNode {
    object:  SpecObject
    parent?: LinkNode
}

/*  the pre-built resolution index over a specification  */
export type LinkIndex = LinkNode[]

/*  the result of a unique reference resolution  */
export interface LinkTarget {
    target?:   SpecObject
    ambiguous: boolean
}

/*  build the resolution index over all objects of a specification  */
export const buildLinkIndex = (specification: Specification): LinkIndex => {
    const index: LinkIndex = []
    const walk = (object: SpecObject, parent?: LinkNode) => {
        const node: LinkNode = { object, parent }
        index.push(node)
        for (const child of object.childs)
            walk(child, node)
    }
    for (const artifact of specification.artifacts)
        for (const object of artifact.objects)
            walk(object)
    return index
}

/*  split a text at a separator character, honoring double-quoted
    sections (the quotes are retained for a later unquote())  */
const splitQuoted = (text: string, separator: string): string[] => {
    const parts  = [ "" ]
    let   quoted = false
    for (const char of text) {
        if (char === "\"")
            quoted = !quoted
        if (!quoted && char === separator)
            parts.push("")
        else
            parts[parts.length - 1] += char
    }
    return parts
}

/*  strip the optional surrounding double quotes of a part  */
const unquote = (part: string): string =>
    part.replace(/^"(.*)"$/s, "$1")

/*  match a name-or-id part against an object (with "*" wildcard)  */
const matchesPart = (object: SpecObject, part: string): boolean =>
    part === "*"
    || object.id === part
    || object.anchor === part
    || object.name.replace(/`/g, "") === part

/*  match a single reference segment ("id", "name", "KIND:name-or-id",
    "KIND:*", or "*", each part optionally double-quoted to allow
    spaces, dots, and colons) against a single object  */
const matchesSegment = (object: SpecObject, segment: string): boolean => {
    const parts = splitQuoted(segment, ":")
    if (parts.length >= 2)
        return object.kind === unquote(parts[0].trim())
            && matchesPart(object, unquote(parts.slice(1).join(":").trim()))
    return matchesPart(object, unquote(segment.trim()))
}

/*  split a reference into its hierarchical path segments,
    honoring double-quoted parts  */
const segmentsOf = (reference: string): string[] =>
    splitQuoted(reference, ".").map((segment) => segment.trim()).filter((segment) => segment !== "")

/*  resolve a reference into the set of all matching objects: a path
    matches object chains connected by direct parent-to-child steps,
    with the leading segments up to the root freely omittable  */
export const resolveSet = (index: LinkIndex, reference: string): SpecObject[] => {
    const segments = segmentsOf(reference)
    if (segments.length === 0)
        return []
    return index.filter((node) => {
        let current: LinkNode | undefined = node
        for (let i = segments.length - 1; i >= 0; i--) {
            if (current === undefined || !matchesSegment(current.object, segments[i]))
                return false
            current = current.parent
        }
        return true
    }).map((node) => node.object)
}

/*  resolve a reference into a unique target: a single segment tries the
    ordered variants (1) id/anchor, (2) name, (3) "KIND:name-or-id", where
    the first variant yielding matches decides (several matches are an
    ambiguity), while a hierarchical path resolves via its full match set  */
export const resolveUnique = (index: LinkIndex, reference: string): LinkTarget => {
    const segments = segmentsOf(reference)
    let   matches: SpecObject[] = []
    if (segments.length === 1) {
        const segment  = segments[0]
        const plain    = unquote(segment)
        const variants = [
            (object: SpecObject) => object.id === plain || object.anchor === plain,
            (object: SpecObject) => object.name.replace(/`/g, "") === plain,
            (object: SpecObject) => matchesSegment(object, segment)
        ]
        for (const variant of variants) {
            matches = index.filter((node) => variant(node.object)).map((node) => node.object)
            if (matches.length > 0)
                break
        }
    }
    else
        matches = resolveSet(index, reference)
    return { target: matches.length === 1 ? matches[0] : undefined, ambiguous: matches.length > 1 }
}

/*  derive the fully-qualified anchor path of every object: the
    "<kind>-<id>" segments (whitespace in kinds dashed) of the ancestor
    chain joined with "." (the index lists parents before childs)  */
export const anchorPaths = (index: LinkIndex): Map<SpecObject, string> => {
    const paths = new Map<SpecObject, string>()
    for (const node of index) {
        const kind    = node.object.kind.replace(/\s+/g, "-")
        const segment = kind !== "" ? `${kind}-${node.object.id}` : node.object.id
        const parent  = node.parent !== undefined ? paths.get(node.parent.object) : undefined
        paths.set(node.object, parent !== undefined ? `${parent}.${segment}` : segment)
    }
    return paths
}

/*  expand all references of a text via a per-reference replacer  */
export const expandReferences = (text: string, replace: (reference: string) => string): string =>
    text.replace(referenceRegex, (_, reference: string) => replace(reference.trim()))
