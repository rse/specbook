/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { type SpecObject }
    from "./specbook-format-spec.js"
import { type SchemaObject }
    from "./specbook-format-schema.js"
import { type LinkIndex, referenceRegex, resolveUnique, resolveSet, chainOf, plainText }
    from "./specbook-link.js"
import { compileValueExpr }
    from "./specbook-parse-value.js"

/*  the referencing objects of every referenced object, resolved from
    the names, property values, descriptions, and rationales of all
    objects, where the references from within the subtree of the
    referenced object itself do not count (an object cannot cover
    itself), leniently skipping the unresolvable references, as those
    are already reported by the reference pass  */
const referrerIndex = (index: LinkIndex): Map<SpecObject, Set<SpecObject>> => {
    const referrers = new Map<SpecObject, Set<SpecObject>>()
    for (const { object } of index) {
        const chain = chainOf(index, object)
        const texts = [ object.name, ...object.properties.map((p) => p.value) ]
        if (object.description !== undefined)
            texts.push(object.description.description, object.description.rationale ?? "")
        for (const text of texts)
            for (const m of plainText(text).matchAll(referenceRegex)) {
                const target = resolveUnique(index, m[1].trim(), object).target
                if (target !== undefined && !chain.includes(target))
                    referrers.set(target, (referrers.get(target) ?? new Set<SpecObject>()).add(object))
            }
    }
    return referrers
}

/*  whether an object is covered by a set of source objects: it is
    referenced from an object lying below one of the sources (itself
    or through an ancestor) or, when lifting, so is one of its
    descendants  */
const isCovered = (index: LinkIndex, referrers: Map<SpecObject, Set<SpecObject>>,
    sources: Set<SpecObject>, object: SpecObject, lifting: boolean): boolean => {
    for (const referrer of referrers.get(object) ?? [])
        if (chainOf(index, referrer).some((o) => sources.has(o)))
            return true
    return lifting && object.children.some((child) => isCovered(index, referrers, sources, child, true))
}

/*  the objects matching the reference patterns of a schema field  */
const matchingObjects = (index: LinkIndex, patterns: string[]): SpecObject[] => {
    const objects = new Array<SpecObject>()
    for (const pattern of patterns) {
        const expr = compileValueExpr(pattern)
        if (expr.kind === "reference")
            for (const object of resolveSet(index, expr.pattern))
                if (!objects.includes(object))
                    objects.push(object)
    }
    return objects
}

/*  the coverage the objects of a "referenced"-flagged kind receive:
    the objects (in document order) referenced from an object matching
    one of the flag's patterns, and the ones not  */
export interface ReferencedCoverage {
    schema:    SchemaObject
    covered:   SpecObject[]
    uncovered: SpecObject[]
}

/*  determine the coverage the objects of every "referenced"-flagged
    kind receive, one entry per flagged schema node (in the order of
    the first objects of the nodes), as the semantic validation
    reports every uncovered object and the verbose output the ratio  */
export const referencedCoverage = (index: LinkIndex,
    schemas: Map<SpecObject, SchemaObject>): ReferencedCoverage[] => {
    const referrers = referrerIndex(index)
    const results   = new Map<SchemaObject, ReferencedCoverage & { sources: Set<SpecObject> }>()
    for (const [ object, schema ] of schemas) {
        if (schema.referenced === undefined)
            continue
        let result = results.get(schema)
        if (result === undefined) {
            result = { schema, sources: new Set(matchingObjects(index, schema.referenced)),
                covered: [], uncovered: [] }
            results.set(schema, result)
        }
        const bucket = isCovered(index, referrers, result.sources, object, false) ?
            result.covered : result.uncovered
        bucket.push(object)
    }
    return Array.from(results.values()).map(({ schema, covered, uncovered }) => ({ schema, covered, uncovered }))
}

/*  the coverage an object of a "coverage"-configured kind reports for
    one of its patterns: the distinct kinds of the objects matching the
    pattern, and those objects (in document order) referenced from the
    reporting object or its descendants, and the ones not  */
export interface Coverage {
    pattern:   string
    kinds:     string[]
    covered:   SpecObject[]
    uncovered: SpecObject[]
}

/*  determine the coverage the objects of every "coverage"-configured
    kind report, one entry per configured pattern: the objects matching
    the pattern (those below the reporting object itself excluded) count
    as covered once referenced -- themselves or through one of their
    descendants, so a use case is covered through its scenarios -- from
    the reporting object or one of its descendants  */
export const specCoverage = (index: LinkIndex,
    schemas: Map<SpecObject, SchemaObject>): Map<SpecObject, Coverage[]> => {
    const referrers = referrerIndex(index)
    const results   = new Map<SpecObject, Coverage[]>()
    for (const [ object, schema ] of schemas) {
        if (schema.coverage === undefined)
            continue
        const sources = new Set<SpecObject>([ object ])
        const entries = new Array<Coverage>()
        for (const pattern of schema.coverage) {
            const targets = matchingObjects(index, [ pattern ])
                .filter((target) => !chainOf(index, target).includes(object))
            const entry: Coverage = { pattern, kinds: [], covered: [], uncovered: [] }
            for (const target of targets) {
                if (!entry.kinds.includes(target.kind))
                    entry.kinds.push(target.kind)
                const bucket = isCovered(index, referrers, sources, target, true) ?
                    entry.covered : entry.uncovered
                bucket.push(target)
            }
            entries.push(entry)
        }
        results.set(object, entries)
    }
    return results
}

/*  the percentage of a coverage, rounded to the integer  */
export const coverageRatio = (covered: number, total: number): number =>
    total > 0 ? Math.round(covered * 100 / total) : 0

