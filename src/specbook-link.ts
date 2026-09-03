/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Spec, SpecObject } from "./specbook-format-spec.js"

/*  the Wiki-style reference syntax ("[[xxx]]")  */
export const referenceRegex = /\[\[([^[\]]+)\]\]/g

/*  strip the inline code markup of a name or property value
    (preserved in the AST for rendering) for matching and labeling  */
export const plainText = (text: string): string =>
    text.replace(/`/g, "")

/*  a single indexed object with its direct parent (undefined for
    the top-level objects of an artifact), its index position, and
    its plain name (the inline code markup stripped once for matching)  */
interface LinkNode {
    object:  SpecObject
    parent?: LinkNode
    pos:     number
    name:    string
}

/*  the pre-built resolution index over a specification  */
export type LinkIndex = LinkNode[]

/*  the per-index lookup structures: the nodes by object, by id/anchor,
    by plain name, and by kind (each in index order), plus the memoized
    resolutions, as the very same references are resolved over and over
    again (per property check, reference check, and diagram). They are
    built lazily on the first use, as the implicit ids of the objects
    are assigned after the index build (the index itself stays a plain
    list and has to be complete and final by then)  */
interface LinkLookup {
    nodes:   Map<SpecObject, LinkNode>
    byKey:   Map<string, LinkNode[]>
    byName:  Map<string, LinkNode[]>
    byKind:  Map<string, LinkNode[]>
    sets:    Map<string, SpecObject[]>
    uniques: Map<string, SpecObject[]>
}

/*  provide the lookup structures of an index, built once on first use  */
const lookups = new WeakMap<LinkIndex, LinkLookup>()
const lookup = (index: LinkIndex): LinkLookup => {
    let result = lookups.get(index)
    if (result === undefined) {
        result = { nodes: new Map(), byKey: new Map(), byName: new Map(), byKind: new Map(),
            sets: new Map(), uniques: new Map() }
        const add = (map: Map<string, LinkNode[]>, key: string, node: LinkNode) => {
            const nodes = map.get(key)
            if (nodes === undefined)
                map.set(key, [ node ])
            else
                nodes.push(node)
        }
        for (const node of index) {
            result.nodes.set(node.object, node)
            add(result.byKey, node.object.id, node)
            if (node.object.anchor !== undefined && node.object.anchor !== node.object.id)
                add(result.byKey, node.object.anchor, node)
            add(result.byName, node.name, node)
            add(result.byKind, node.object.kind, node)
        }
        lookups.set(index, result)
    }
    return result
}

/*  the ancestor-or-self chain of an object, root first
    (empty for an object unknown to the index)  */
export const chainOf = (index: LinkIndex, object: SpecObject): SpecObject[] => {
    const chain = new Array<SpecObject>()
    for (let node = lookup(index).nodes.get(object); node !== undefined; node = node.parent)
        chain.unshift(node.object)
    return chain
}

/*  the result of a unique reference resolution  */
export interface LinkTarget {
    target?:   SpecObject
    ambiguous: boolean
}

/*  build the resolution index over all objects of a specification  */
export const buildLinkIndex = (specification: Spec): LinkIndex => {
    const index: LinkIndex = []
    const walk = (object: SpecObject, parent?: LinkNode) => {
        const node: LinkNode = { object, parent, pos: index.length, name: plainText(object.name) }
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

/*  a parsed reference segment ("id", "name", "KIND:name-or-id",
    "KIND:*", or "*", each part optionally double-quoted to allow
    spaces, dots, and colons): the optional kind plus the name-or-id
    part, parsed once per reference instead of once per candidate  */
interface Segment {
    kind?: string
    part:  string
}
const parseSegment = (segment: string): Segment => {
    const parts = splitQuoted(segment, ":")
    if (parts.length >= 2)
        return { kind: unquote(parts[0].trim()), part: unquote(parts.slice(1).join(":").trim()) }
    return { part: unquote(segment.trim()) }
}

/*  match a parsed segment against a single node (with "*" wildcard)  */
const matchesSegment = (node: LinkNode, segment: Segment): boolean =>
    (segment.kind === undefined || node.object.kind === segment.kind)
    && (segment.part === "*"
        || node.object.id     === segment.part
        || node.object.anchor === segment.part
        || node.name          === segment.part)

/*  the candidate nodes matching a parsed segment, in index order,
    found through the lookup structures instead of an index scan  */
const candidates = (index: LinkIndex, segment: Segment): LinkNode[] => {
    const { byKey, byName, byKind } = lookup(index)
    if (segment.part === "*")
        return segment.kind !== undefined ? (byKind.get(segment.kind) ?? []) : index
    const nodes = Array.from(new Set([ ...(byKey.get(segment.part) ?? []), ...(byName.get(segment.part) ?? []) ]))
        .sort((a, b) => a.pos - b.pos)
    return segment.kind !== undefined ? nodes.filter((node) => node.object.kind === segment.kind) : nodes
}

/*  split a reference into its hierarchical path segments,
    honoring double-quoted parts  */
const segmentsOf = (reference: string): string[] =>
    splitQuoted(reference, ".").map((segment) => segment.trim()).filter((segment) => segment !== "")

/*  resolve a reference into the set of all matching objects: a path
    matches object chains connected by direct parent-to-child steps,
    with the leading segments up to the root freely omittable (the
    candidates of the last segment are walked up along the parents)  */
export const resolveSet = (index: LinkIndex, reference: string): SpecObject[] => {
    const { sets } = lookup(index)
    let matches = sets.get(reference)
    if (matches === undefined) {
        const segments = segmentsOf(reference).map(parseSegment)
        matches = segments.length === 0 ? [] :
            candidates(index, segments[segments.length - 1]).filter((node) => {
                let current = node.parent
                for (let i = segments.length - 2; i >= 0; i--) {
                    if (current === undefined || !matchesSegment(current, segments[i]))
                        return false
                    current = current.parent
                }
                return true
            }).map((node) => node.object)
        sets.set(reference, matches)
    }
    return matches
}

/*  narrow several matches down to the ones nearest to the referencing
    object, i.e. sharing the longest ancestor chain with it (the lexical
    scoping rule: a match within the same parent beats one in a sibling
    subtree, which beats one in another artifact)  */
const nearest = (index: LinkIndex, matches: SpecObject[], from: SpecObject): SpecObject[] => {
    const chain    = chainOf(index, from)
    const distance = (object: SpecObject): number => {
        const other = chainOf(index, object)
        let i = 0
        while (i < chain.length && i < other.length && chain[i] === other[i])
            i++
        return i
    }
    const distances = matches.map((object) => distance(object))
    const best      = Math.max(...distances)
    return matches.filter((_, i) => distances[i] === best)
}

/*  resolve a reference into a unique target: a single segment tries the
    ordered variants (1) id/anchor, (2) name, (3) "KIND:name-or-id", where
    the first variant yielding matches decides, while a hierarchical path
    resolves via its full match set; several matches are narrowed down to
    the ones nearest to the referencing object (if known) and remain an
    ambiguity only if still more than one remains (the scope-independent
    match set is memoized per reference)  */
export const resolveUnique = (index: LinkIndex, reference: string, from?: SpecObject): LinkTarget => {
    const { byKey, byName, uniques } = lookup(index)
    let matches = uniques.get(reference)
    if (matches === undefined) {
        const segments = segmentsOf(reference)
        if (segments.length === 1) {
            const segment  = segments[0]
            const unquoted = unquote(segment)
            matches = (byKey.get(unquoted) ?? byName.get(unquoted) ?? candidates(index, parseSegment(segment)))
                .map((node) => node.object)
        }
        else
            matches = resolveSet(index, reference)
        uniques.set(reference, matches)
    }
    if (matches.length > 1 && from !== undefined)
        matches = nearest(index, matches, from)
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
