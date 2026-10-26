/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import RandExpModule from "randexp"
import wrapAnsi      from "wrap-ansi"

import { type SchemaObject, type SchemaProperty }
    from "./specbook-format-schema.js"
import { type Spec, type SpecObject }
    from "./specbook-format-spec.js"
import { compileValueExpr, anchored, type ValueExpr }
    from "./specbook-parse-value.js"
import { slugify }
    from "./specbook-parse-syntax.js"
import { buildLinkIndex, resolveSet, resolveUnique, chainOf, type LinkIndex }
    from "./specbook-link.js"
import { titleProperties, isTitleObject }
    from "./specbook-export-common.js"
import { referencedCoverage }
    from "./specbook-coverage.js"

/*  the RandExp class: the CommonJS module is the class itself at runtime,
    while its typings declare the class as the default export only, so
    the part of the class we use is typed structurally  */
type RandExpClass = new (regex: RegExp) => {
    randInt:      (a: number, b: number) => number
    defaultRange: { subtract: (a: number, b: number) => unknown }
    gen:          () => string
}
const RandExp = RandExpModule as unknown as RandExpClass

/*  the fixed rationale of every sample description, which explains the
    statement/rationale split of a description by example  */
const rationale = "the sample shows that a description states what holds and, behind the keyword, why it holds."

/*  a sample object with its schema node, its ordinal among the sample
    objects of its kind below the same parent, and their count  */
interface Sample {
    object:  SpecObject
    schema:  SchemaObject
    ordinal: number
    count:   number
    parent?: Sample
}

/*  the capitalized words of a kind or property name
    ("USE-CASE" yields "Use" and "Case")  */
const wordsOf = (name: string): string[] =>
    name.split(/[^A-Za-z0-9]+/).filter((word) => word !== "")
        .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())

/*  the leading word of a sample object or value: the first object of a
    kind is the "Sample ..." one, its partner the "Other ..." one  */
const ordinalWord = (ordinal: number): string =>
    ordinal === 0 ? "Sample" : "Other"

/*  the casing variants of a word list, the title case first  */
const casings = (words: string[]): string[] => {
    const lower = words.map((word) => word.toLowerCase())
    const upper = words.map((word) => word.toUpperCase())
    return [ words.join(" "), words.join(""), lower[0] + words.slice(1).join(""),
        lower.join("-"), lower.join("_"), upper.join("-"), upper.join("_"),
        lower.join(" "), upper.join(" "), lower.join(""), upper.join("") ]
}

/*  generate a text matching a regular expression deterministically (the
    random choices of RandExp replaced by the lowest option, shifted by
    the ordinal, so a partner object receives a distinct text, and its
    free characters restricted to letters and digits, as the Markdown
    parsing would strip a leading or trailing whitespace), or none if
    the expression is beyond RandExp  */
const generate = (regex: RegExp, ordinal: number): string | undefined => {
    try {
        const randexp = new RandExp(regex)
        randexp.randInt = (a: number, b: number) => Math.min(a + ordinal, b)
        for (const [ a, b ] of [ [ 0, 47 ], [ 58, 64 ], [ 91, 96 ], [ 123, 126 ] ])
            randexp.defaultRange.subtract(a, b)
        const text = randexp.gen()
        return regex.test(text) && text.trim() === text ? text : undefined
    }
    catch {
        return undefined
    }
}

/*  derive the name of a sample object: the first casing variant of
    "Sample <Kind>", else of the single word "Sample", matching the
    configured name pattern, else a generated match, else the plain
    title case (which the check reports)  */
const sampleName = (schema: SchemaObject, ordinal: number): string => {
    const words = [ ordinalWord(ordinal), ...wordsOf(schema.kind) ]
    if (schema.name === undefined)
        return words.join(" ")
    const regex = anchored(schema.name)
    const name  = [ ...casings(words), ...casings([ ordinalWord(ordinal) ]) ].find((text) => regex.test(text))
    return name ?? generate(regex, ordinal) ?? words.join(" ")
}

/*  the first sentence of a text (its first paragraph up to the first
    sentence-ending punctuation not closing an abbreviation), without
    its trailing punctuation  */
const firstSentence = (text: string): string => {
    const paragraph = text.trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ")
    const sentence  = paragraph.match(/^.*?(?<!\b(?:e\.g|i\.e|etc|vs|cf|resp))[.!?](?=\s|$)/)?.[0] ?? paragraph
    return sentence.replace(/[.!?]$/, "")
}

/*  the number of sample objects of a child kind: two where a relation
    needs a partner -- the node kind of the automaton of the parent and
    a kind carrying a symmetric or acyclic property -- and one otherwise  */
const countOf = (parent: SchemaObject, child: SchemaObject): number =>
    (parent.automaton?.nodes === child.kind
        || (child.props ?? []).some((prop) => prop.symmetric === true || prop.acyclic === true)) ? 2 : 1

/*  instantiate the sample objects of a schema node (recursively) with
    their names and ids only, as the property values need the whole corpus  */
const instantiate = (schema: SchemaObject, ordinal: number, count: number,
    samples: Sample[], parent?: Sample): SpecObject => {
    const name   = parent === undefined ? (schema.name ?? "") : sampleName(schema, ordinal)
    const object: SpecObject = { kind: schema.kind, id: schema.id ?? slugify(name), name, properties: [], children: [] }
    if (schema.id !== undefined)
        object.paren = schema.id
    const sample: Sample = { object, schema, ordinal, count, parent }
    samples.push(sample)
    for (const child of schema.children ?? []) {
        const n = countOf(schema, child)
        for (let i = 0; i < n; i++)
            object.children.push(instantiate(child, i, n, samples, sample))
    }
    return object
}

/*  match a text directly against a regex or enum expression  */
const matches = (expr: ValueExpr, text: string): boolean =>
    (expr.kind === "regex" && expr.regex.test(text))
    || (expr.kind === "enum" && expr.members.includes(text))

/*  the shortest reference uniquely resolving onto a target from a
    referencing object: the kind-qualified name of the target, prefixed
    by as many of its ancestors (their configured id, else their
    kind-qualified name) as the resolution needs  */
const referenceTo = (index: LinkIndex, target: SpecObject, from: SpecObject): string => {
    const chain    = chainOf(index, target)
    const segments = chain.map((object, i) =>
        object.paren !== undefined && i < chain.length - 1 ? object.paren :
            `${object.kind}:${/[.:]/.test(object.name) ? `"${object.name}"` : object.name}`)
    for (let i = segments.length - 1; i >= 0; i--) {
        const reference = segments.slice(i).join(".")
        if (resolveUnique(index, reference, from).target === target)
            return reference
    }
    return segments.join(".")
}

/*  the objects a reference pattern matches, the ones nearest to the
    referencing object (sharing the longest ancestor chain with it)
    first and the referencing object itself last, as a self-reference
    is the last resort only  */
const targetsOf = (index: LinkIndex, pattern: string, from: SpecObject): SpecObject[] => {
    const chain     = chainOf(index, from)
    const proximity = (object: SpecObject): number => {
        if (object === from)
            return -1
        const other = chainOf(index, object)
        let i = 0
        while (i < chain.length && i < other.length && chain[i] === other[i])
            i++
        return i
    }
    return resolveSet(index, pattern)
        .map((object, pos) => ({ object, pos, proximity: proximity(object) }))
        .sort((a, b) => b.proximity - a.proximity || a.pos - b.pos)
        .map((entry) => entry.object)
}

/*  the candidate values of a property, in order of preference: the
    members of an enum/tags, the references onto the nearest objects of
    a reference pattern, the alternatives of a list in order, and the
    placeholders matching a regex -- "Sample <Name>" first, then the
    common literals, then a generated match -- or, without a value
    constraint, the placeholder alone  */
const candidates = (prop: SchemaProperty, expr: ValueExpr | undefined,
    index: LinkIndex, from: SpecObject, ordinal: number): string[] => {
    const placeholder = `${ordinalWord(ordinal)} ${wordsOf(prop.name).join(" ")}`
    if (expr === undefined)
        return [ placeholder ]
    else if (expr.kind === "enum" || expr.kind === "tags")
        return [ ...expr.members ]
    else if (expr.kind === "reference")
        return targetsOf(index, expr.pattern, from).map((target) => `[[${referenceTo(index, target, from)}]]`)
    else if (expr.kind === "list")
        return expr.alternatives.flatMap((alternative) => candidates(prop, alternative, index, from, ordinal))
    const literals = [ placeholder, "true", "false", "1", "2", "0" ].filter((text) => expr.regex.test(text))
    if (literals.length > 0)
        return literals
    const generated = generate(expr.regex, ordinal)
    return generated !== undefined ? [ generated ] : []
}

/*  the value of a property on a sample object: the first candidate,
    where a "present" expression prefers a candidate matching it on the
    first object of the kind and a "unique" flag skips the candidates
    the sibling objects of the kind already carry (all of them, or the
    ones matching its expression), or none if no candidate exists  */
const valueOf = (sample: Sample, prop: SchemaProperty, index: LinkIndex): string | undefined => {
    const expr    = prop.value !== undefined ? compileValueExpr(prop.value) : undefined
    const filter  = (flag: boolean | string | undefined) =>
        typeof flag === "string" ? compileValueExpr(flag) : undefined
    const present = filter(prop.present)
    const unique  = filter(prop.unique)
    const list    = candidates(prop, expr, index, sample.object, sample.ordinal)
    if (sample.ordinal === 0 && present !== undefined)
        list.sort((a, b) => Number(matches(present, b)) - Number(matches(present, a)))
    const taken = (sample.parent?.object.children ?? [])
        .filter((child) => child.kind === sample.object.kind && child !== sample.object)
        .flatMap((child) => child.properties.filter((p) => p.key === prop.name).map((p) => p.value))
    const applies = (value: string) =>
        prop.unique === true || (unique !== undefined && matches(unique, value))
    return list.find((value) => !applies(value) || !taken.includes(value)) ?? list[0]
}

/*  fill in the property values of a sample object: the title object
    keeps the properties the exports interpret at their rendering
    defaults, the automaton of the parent dictates the flags of a node
    (the first node is the initial one, the last node the final one) and
    the ends of an edge (from the first node to the last one), an
    acyclic property is carried by the first object of its kind only,
    and an optional property no candidate satisfies is left out, while
    a required one stays empty (which the check reports)  */
const fill = (sample: Sample, index: LinkIndex) => {
    const automaton = sample.parent?.schema.automaton
    const title     = isTitleObject(sample.object)
    const siblings  = (kind: string) =>
        sample.parent?.object.children.filter((child) => child.kind === kind) ?? []
    for (const prop of sample.schema.props ?? []) {
        let value: string | undefined
        const seeded = title ? titleProperties.find((p) => p.name === prop.name) : undefined
        if (seeded !== undefined)
            value = seeded.init
        else if (automaton !== undefined && sample.object.kind === automaton.nodes
            && (prop.name === automaton.initial || prop.name === automaton.final)) {
            const flagged = prop.name === automaton.initial ?
                sample.ordinal === 0 : sample.ordinal === sample.count - 1
            const expr    = prop.value !== undefined ? compileValueExpr(prop.value) : undefined
            value = flagged ? "true" : candidates(prop, expr, index, sample.object, sample.ordinal)
                .find((candidate) => candidate !== "true")
        }
        else if (automaton !== undefined && sample.object.kind === automaton.edges
            && (prop.name === automaton.source || prop.name === automaton.target)) {
            const nodes = siblings(automaton.nodes)
            const node  = nodes[prop.name === automaton.source ? 0 : nodes.length - 1]
            value = node !== undefined ? `[[${referenceTo(index, node, sample.object)}]]` : undefined
        }
        else if (prop.acyclic === true && sample.ordinal > 0 && prop.optional === true)
            continue
        else
            value = valueOf(sample, prop, index)
        if (value === undefined && prop.optional === true)
            continue
        sample.object.properties.push({ key: prop.name, value: value ?? "" })
    }
}

/*  add the references the "referenced"-flagged kinds demand: an object
    lacking its coverage gets referenced from an object matching one of
    the patterns of its kind (or from below one, but never from within
    its own subtree), preferably by extending a list-valued property
    admitting it -- one without a uniqueness or relation flag, whose
    shape the extension could break, and keeping a "local" one local --
    and else through the elaboration of the description of the first
    such object, as every reference of a description counts, too  */
const cover = (samples: Sample[], index: LinkIndex) => {
    const schemas   = new Map<SpecObject, SchemaObject>(samples.map((sample) => [ sample.object, sample.schema ]))
    const fallbacks = new Map<SpecObject, string[]>()
    for (const { schema, uncovered } of referencedCoverage(index, schemas)) {
        const sources = new Set<SpecObject>((schema.referenced ?? []).flatMap((pattern) => {
            const expr = compileValueExpr(pattern)
            return expr.kind === "reference" ? resolveSet(index, expr.pattern) : []
        }))
        for (const object of uncovered) {
            const referrers = samples.filter((sample) => {
                const chain = chainOf(index, sample.object)
                return chain.some((o) => sources.has(o)) && !chain.includes(object)
            })
            const admits = (sample: Sample, prop: SchemaProperty): boolean => {
                if (prop.value === undefined || (prop.unique ?? false) !== false
                    || prop.symmetric === true || prop.acyclic === true)
                    return false
                const expr = compileValueExpr(prop.value)
                if (expr.kind !== "list" || !expr.alternatives.some((alternative) =>
                    alternative.kind === "reference" && resolveSet(index, alternative.pattern).includes(object)))
                    return false
                const chain = chainOf(index, sample.object)
                return prop.local !== true || chain.length < 2
                    || chainOf(index, object).includes(chain[chain.length - 2])
            }
            const target = referrers.map((sample) =>
                ({ referrer: sample, prop: (sample.schema.props ?? []).find((p) => admits(sample, p)) }))
                .find((entry) => entry.prop !== undefined)
            if (target?.prop !== undefined) {
                /*  extend (or add) the first admitting property, keeping
                    the properties in the order of the schema  */
                const { referrer, prop } = target
                const props     = referrer.schema.props ?? []
                const reference = `[[${referenceTo(index, object, referrer.object)}]]`
                const property  = referrer.object.properties.find((p) => p.key === prop.name)
                if (property === undefined) {
                    referrer.object.properties.push({ key: prop.name, value: reference })
                    referrer.object.properties.sort((a, b) =>
                        props.findIndex((p) => p.name === a.key) - props.findIndex((p) => p.name === b.key))
                }
                else
                    property.value = property.value !== "" ? `${property.value}, ${reference}` : reference
            }
            else if (referrers.length > 0) {
                const from = referrers[0].object
                fallbacks.set(from, [ ...(fallbacks.get(from) ?? []), `[[${referenceTo(index, object, from)}]]` ])
            }
        }
    }
    for (const [ object, references ] of fallbacks)
        if (object.description !== undefined)
            object.description.elaboration = `The sample references ${references.join(", ")}, ` +
                `as the schema configuration demands ${references.length === 1 ? "it" : "them"} ` +
                "to be referenced from here."
}

/*  the maximum line width of the rendered sample, and the placeholder
    protecting a space from becoming a line break (the ones inside the
    references and code spans, and the ones of the kept line prefix)  */
const lineWidth = 100
const space     = "\u{E000}"

/*  wrap the text parts of the rendered sample -- the descriptions and the
    property values -- onto lines of at most 100 characters through
    wrap-ansi, which breaks just the text part of an overlong line and
    never the Markdown structure in front of it: the line prefix
    (indentation, list marker, property key, or the leading segments of a
    Concise Format item) stays on the first line as an unbreakable word,
    and the continuation lines are indented onto the text column of the
    line, while a line whose wrapping would start a continuation line with
    a block marker stays unwrapped  */
export const wrapSample = (text: string): string =>
    text.split("\n").flatMap((line) => {
        if (line.length <= lineWidth || line.startsWith("#"))
            return [ line ]

        /*  the kept prefix: the indentation of a plain line, else the part
            of a list item up to its description (behind the last segment
            separator of a Concise Format item) or up to its property value  */
        const item   = line.match(/^(\s*)- {3}/)
        const indent = item !== null ? item[1].length + 4 : (line.match(/^\s*/)?.[0].length ?? 0)
        const prefix = item === null ? line.slice(0, indent) :
            line.includes("; ") ? line.slice(0, line.lastIndexOf("; ") + 2) :
                (line.match(/^\s*- {3}[^:]*:\s*/)?.[0] ?? item[0])

        /*  wrap the line behind its continuation indentation, with the
            spaces of the prefix (but its last one) and of the atoms protected  */
        const head   = prefix.slice(indent)
        const input  = head.replace(/ (?=.)/g, space) + line.slice(prefix.length)
            .replace(/\[\[[^\]]*\]\]|`[^`]*`/g, (atom) => atom.replaceAll(" ", space))
        const output = wrapAnsi(input, lineWidth - indent, { hard: false, trim: true })
            .replaceAll(space, " ").split("\n")
        if (output.slice(1).some((cont) => /^(?:[-+*>#]|\d+[.)])(?:\s|$)/.test(cont)))
            return [ line ]
        return [ `${line.slice(0, indent)}${output[0]}`,
            ...output.slice(1).map((cont) => `${" ".repeat(indent)}${cont}`) ]
    }).join("\n")

/*  generate the sample objects of the given artifacts (all at once, as
    the references of the sample reach across the artifacts): one object
    per allowed kind (two where a relation needs a partner), carrying
    every configured property with a placeholder value satisfying its
    constraint and the first sentence of the schema description of its
    kind as its statement, mapped per artifact onto its level 1 object  */
export const sampleArtifacts = (artifacts: SchemaObject[]): Map<SchemaObject, SpecObject> => {
    const samples = new Array<Sample>()
    const roots   = new Map<SchemaObject, SpecObject>()
    for (const artifact of artifacts)
        roots.set(artifact, instantiate(artifact, 0, 1, samples))

    /*  the property values are filled in once all objects exist, as the
        reference-valued ones target the nearest sample object of their
        pattern through the link index of the whole sample  */
    const now   = new Date()
    const spec: Spec = { artifacts: Array.from(roots.values()).map((object) =>
        ({ created: now, modified: now, objects: [ object ] })) }
    const index = buildLinkIndex(spec)
    for (const sample of samples) {
        fill(sample, index)
        sample.object.description = {
            description: sample.schema.desc !== undefined ?
                firstSentence(sample.schema.desc) : `The sample ${sample.schema.kind} object`,
            rationale
        }
    }
    cover(samples, index)
    return roots
}
