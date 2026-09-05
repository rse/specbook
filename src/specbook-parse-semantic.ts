/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { type Spec, type SpecArtifact, type SpecObject, type SpecProperty }
    from "./specbook-format-spec.js"
import { type Schema, type SchemaObject, type SchemaProperty }
    from "./specbook-format-schema.js"
import { referenceRegex, resolveUnique, resolveSet, chainOf, plainText, assignId }
    from "./specbook-link.js"
import { compileValueExpr, splitItems, anchored, type ValueExpr }
    from "./specbook-parse-value.js"
import { ParseContext, type ObjectMeta }
    from "./specbook-parse-common.js"
import { referencedCoverage }
    from "./specbook-coverage.js"

/*  the syntax of a value consisting of exactly one Wiki-style reference  */
const singleReferenceRegex = /^\[\[([^[\]]+)\]\]$/

/*  match a full property value directly against a value expression
    (defined for the regex and enum kinds only)  */
const directMatches = (expr: ValueExpr, text: string): boolean =>
    (expr.kind === "regex" && expr.regex.test(text))
    || (expr.kind === "enum" && expr.members.includes(text))

/*  a text resolved as exactly one Wiki-style reference: the reference
    itself and its (leniently resolved) target object  */
interface SingleTarget {
    ref:     string
    target?: SpecObject
}

/*  resolve a text consisting of exactly one Wiki-style reference from
    its carrying object (leniently, as unresolvable and ambiguous
    references are already reported by the reference pass)  */
const singleTarget = (ctx: ParseContext, object: SpecObject,
    text: string): SingleTarget | undefined => {
    const rm = text.match(singleReferenceRegex)
    if (rm === null)
        return undefined
    const ref = rm[1].trim()
    return { ref, target: resolveUnique(ctx.linkIndex, ref, object).target }
}

/*  match a single list item against the alternatives of a list constraint  */
const matchAlternatives = (ctx: ParseContext, object: SpecObject,
    alternatives: ValueExpr[], item: string): boolean => {
    const single = singleTarget(ctx, object, item)
    for (const alternative of alternatives) {
        if (alternative.kind === "reference") {
            if (single === undefined)
                continue
            if (single.target === undefined
                || resolveSet(ctx.linkIndex, alternative.pattern).includes(single.target))
                return true
        }
        else if (alternative.kind === "tags") {
            if (alternative.members.includes(item))
                return true
        }
        else if (directMatches(alternative, item))
            return true
    }
    return false
}

/*  find a property of an object by its key (case-sensitive), including
    the synthetic one supplied by a consumed parenthesized name token  */
const findProp = (ctx: ParseContext, object: SpecObject, name: string): SpecProperty | undefined => {
    const synthetic = ctx.parenProps.get(object)
    return object.properties.find((p) => p.key === name) ??
        (synthetic?.key === name ? synthetic : undefined)
}

/*  split a multi-valued property value into its items, reporting an
    empty one -- stemming from an empty value or a stray comma -- once,
    as such an item can never satisfy any constraint  */
const splitPropItems = (ctx: ParseContext, prop: SchemaProperty,
    property: SpecProperty, meta: ObjectMeta): string[] => {
    const items = splitItems(plainText(property.value))
    if (items.some((item) => item === ""))
        ctx.diagnose(meta.file, meta.line,
            `property "${prop.name}" value "${property.value}" contains an empty item`)
    return items.filter((item) => item !== "")
}

/*  check a resolved reference of a property flagged "local": the
    referenced object has to lie below the parent object of the
    referencing object (a top-level object has no parent, and hence
    no locality to keep)  */
const checkLocal = (ctx: ParseContext, object: SpecObject, prop: SchemaProperty,
    single: SingleTarget | undefined, meta: ObjectMeta) => {
    if (prop.local !== true || single?.target === undefined)
        return
    const chain  = chainOf(ctx.linkIndex, object)
    const parent = chain.length >= 2 ? chain[chain.length - 2] : undefined
    if (parent !== undefined && !chainOf(ctx.linkIndex, single.target).includes(parent))
        ctx.diagnose(meta.file, meta.line,
            `link reference "[[${single.ref}]]" of local property "${prop.name}" ` +
            `leaves the enclosing ${parent.kind} "${parent.name}"`)
}

/*  check a property value of an object against the compiled value
    expression of its configured schema property  */
const checkPropValue = (ctx: ParseContext, object: SpecObject, prop: SchemaProperty,
    expr: ValueExpr, property: SpecProperty, meta: ObjectMeta) => {
    if (expr.kind === "reference") {
        /*  a reference constraint: the value has to be exactly one
            reference resolving into the constraint's wildcard match set  */
        const single = singleTarget(ctx, object, plainText(property.value).trim())
        if (single === undefined)
            ctx.diagnose(meta.file, meta.line,
                `property "${prop.name}" value "${property.value}" is not a single link reference`)
        else {
            if (single.target !== undefined && !resolveSet(ctx.linkIndex, expr.pattern).includes(single.target))
                ctx.diagnose(meta.file, meta.line,
                    `link reference "[[${single.ref}]]" does not match constraint "${prop.value}"`)
            checkLocal(ctx, object, prop, single, meta)
        }
    }
    else if (expr.kind === "tags") {
        /*  a tags constraint: the value is a comma-separated set of
            configured tags, each occurring at most once  */
        const seen = new Set<string>()
        for (const item of splitPropItems(ctx, prop, property, meta)) {
            if (!expr.members.includes(item))
                ctx.diagnose(meta.file, meta.line,
                    `tag "${item}" of property "${prop.name}" not allowed by constraint "${prop.value}"`)
            else if (seen.has(item))
                ctx.diagnose(meta.file, meta.line,
                    `duplicate tag "${item}" on property "${prop.name}"`)
            seen.add(item)
        }
    }
    else if (expr.kind === "list") {
        /*  a list constraint: the value is a comma-separated list
            of items, each matching at least one alternative  */
        for (const item of splitPropItems(ctx, prop, property, meta)) {
            if (!matchAlternatives(ctx, object, expr.alternatives, item))
                ctx.diagnose(meta.file, meta.line,
                    `list item "${item}" of property "${prop.name}" does not match constraint "${prop.value}"`)
            else
                checkLocal(ctx, object, prop, singleTarget(ctx, object, item), meta)
        }
    }
    else if (!directMatches(expr, plainText(property.value)))
        ctx.diagnose(meta.file, meta.line, expr.kind === "enum" ?
            `property "${prop.name}" value "${property.value}" is not a member of "${prop.value}"` :
            `property "${prop.name}" value "${property.value}" does not match pattern "${prop.value}"`)
}

/*  derive the synthetic property the trailing parenthesized name token
    of an object is consumed as: the first still missing configured
    property whose pattern the token matches  */
const parenProp = (object: SpecObject, props: SchemaProperty[]): SpecProperty | undefined => {
    const paren = object.paren
    if (paren === undefined)
        return undefined
    const prop = props.find((p) => p.value !== undefined && !object.properties.some((q) => q.key === p.name)
        && directMatches(compileValueExpr(p.value), paren))
    return prop !== undefined ? { key: prop.name, value: paren } : undefined
}

/*  check the property values flagged unique for distinctness among
    the sibling objects of the same kind and the ones flagged present
    for occurring on at least one sibling (all values, or only the
    values matching the regexp or enum expression of the flag), where
    a kind without any sibling fails a present flag, too, but only for
    an optional kind, as the missing-kind check reports a required one  */
const checkSiblingFlags = (ctx: ParseContext, object: SpecObject, children: SchemaObject[], meta: ObjectMeta) => {
    const marker = (flag: boolean | string | undefined) =>
        flag === undefined || flag === false ? undefined :
            { filter: typeof flag === "string" ? compileValueExpr(flag) : undefined }
    for (const child of children) {
        const siblings = object.children.filter((c) => c.kind === child.kind)
        for (const prop of child.props ?? []) {
            const unique  = marker(prop.unique)
            const present = marker(prop.present)
            if (unique === undefined && present === undefined)
                continue
            const seen  = new Map<string, SpecObject>()
            let   found = false
            for (const sibling of siblings) {
                const property = findProp(ctx, sibling, prop.name)
                if (property === undefined)
                    continue
                const value = plainText(property.value).trim()
                if (present !== undefined && (present.filter === undefined || directMatches(present.filter, value)))
                    found = true
                if (unique === undefined || (unique.filter !== undefined && !directMatches(unique.filter, value)))
                    continue
                const first = seen.get(value)
                if (first === undefined)
                    seen.set(value, sibling)
                else {
                    const siblingMeta = ctx.metaOf(sibling)
                    ctx.diagnose(siblingMeta.file, ctx.propMeta.get(property)?.line ?? siblingMeta.line,
                        `value "${value}" of unique property "${prop.name}" on ${sibling.kind} "${sibling.name}" ` +
                        `already used by preceding ${sibling.kind} "${first.name}"`)
                }
            }
            if (present !== undefined && (siblings.length > 0 || child.optional === true) && !found)
                ctx.diagnose(meta.file, meta.line,
                    `no ${child.kind} below ${object.kind} "${object.name}" carries property "${prop.name}"` +
                    (typeof prop.present === "string" ? ` with a value matching "${prop.present}"` : ""))
        }
    }
}

/*  validate a single object (and recursively its children) against its schema  */
const validateObject = (ctx: ParseContext, object: SpecObject, schema: SchemaObject, level: number) => {
    const meta  = ctx.metaOf(object)
    const props = schema.props ?? []

    /*  check the name convention (the configured name of non-artifact
        objects is a regular expression pattern)  */
    if (level > 1 && schema.name !== undefined && !anchored(schema.name).test(plainText(object.name)))
        ctx.diagnose(meta.file, meta.line,
            `${object.kind} name "${object.name}" does not match pattern "${schema.name}"`)

    /*  a configured id has to be explicitly specified 1:1 in the
        input, via either "{{<id>}}" or "(<id>)"  */
    if (schema.id !== undefined && (object.anchor ?? object.paren) !== schema.id)
        ctx.diagnose(meta.file, meta.line,
            `configured id "${schema.id}" not explicitly specified on ${object.kind} "${object.name}"`)

    /*  check every occurrence of the configured properties (a trailing
        parenthesized name token is accepted as the value of a still
        missing property, and a repeated key is reported as duplicate)  */
    const consumed = ctx.parenProps.get(object)
    for (const prop of props) {
        const expr    = prop.value !== undefined ? compileValueExpr(prop.value) : undefined
        const matches = object.properties.filter((p) => p.key === prop.name)
        if (matches.length === 0 && prop.name !== consumed?.key && prop.optional !== true)
            ctx.diagnose(meta.file, meta.line,
                `required property "${prop.name}" missing on ${object.kind} "${object.name}"`)
        for (const [ i, match ] of matches.entries()) {
            const line = ctx.propMeta.get(match)?.line ?? meta.line
            if (i > 0)
                ctx.diagnose(meta.file, line,
                    `duplicate property "${prop.name}" on ${object.kind} "${object.name}"`)
            if (expr !== undefined)
                checkPropValue(ctx, object, prop, expr, match, { file: meta.file, line })
        }
    }

    /*  report the properties not configured by the schema  */
    for (const property of object.properties)
        if (!props.some((p) => p.name === property.key))
            ctx.diagnose(meta.file, ctx.propMeta.get(property)?.line ?? meta.line,
                `unknown property "${property.key}" on ${object.kind} "${object.name}"`)

    /*  check the configured child objects  */
    const children = schema.children ?? []
    for (const child of object.children) {
        const childMeta   = ctx.metaOf(child)
        const childSchema = children.find((c) => c.kind === child.kind)
        if (childSchema === undefined) {
            ctx.diagnose(childMeta.file, childMeta.line,
                `unknown object kind "${child.kind}" below ${object.kind} "${object.name}"`)
            continue
        }
        validateObject(ctx, child, childSchema, level + 1)
    }

    /*  check the sibling-scoped property flags of the child kinds  */
    checkSiblingFlags(ctx, object, children, meta)

    /*  report the configured child object kinds which are missing  */
    for (const child of children)
        if (child.optional !== true
            && !object.children.some((c) => c.kind === child.kind))
            ctx.diagnose(meta.file, meta.line,
                `required object kind "${child.kind}" missing below ${object.kind} "${object.name}"`)

    /*  order the children and properties exactly along the schema
        definition (the sort is stable, so objects of the same kind
        and unknown items keep their document order)  */
    const kindPos = (kind: string) => {
        const i = children.findIndex((c) => c.kind === kind)
        return i >= 0 ? i : children.length
    }
    object.children.sort((a, b) => kindPos(a.kind) - kindPos(b.kind))
    const propPos = (key: string) => {
        const i = props.findIndex((p) => p.name === key)
        return i >= 0 ? i : props.length
    }
    object.properties.sort((a, b) => propPos(a.key) - propPos(b.key))
}

/*  resolve a level 1 object onto its configured artifact, deliberately
    leniently by kind and id first and by case-insensitive name second,
    so deviations of the heading can still be precisely reported  */
export const resolveArtifact = (config: Schema, object: SpecObject): SchemaObject | undefined =>
    config.find((s) =>
        (s.kind === object.kind && s.id === object.id) || (s.id !== undefined && `${s.kind}-${s.id}` === object.id)) ??
    config.find((s) => s.name !== undefined
        && s.name.toUpperCase() === plainText(object.name).toUpperCase())

/*  map the specification objects onto their schema configuration
    nodes (the artifact resolution is shared with the validation)  */
export const collectSchemas = (specification: Spec,
    config: Schema): Map<SpecObject, SchemaObject> => {
    const schemas = new Map<SpecObject, SchemaObject>()
    const walk = (object: SpecObject, schema: SchemaObject) => {
        schemas.set(object, schema)
        for (const child of object.children) {
            const childSchema = (schema.children ?? []).find((c) => c.kind === child.kind)
            if (childSchema !== undefined)
                walk(child, childSchema)
        }
    }
    for (const artifact of specification.artifacts) {
        for (const object of artifact.objects) {
            const schema = resolveArtifact(config, object)
            if (schema !== undefined)
                walk(object, schema)
        }
    }
    return schemas
}

/*  derive the synthetic properties supplied by the consumed parenthesized
    name tokens of a schema mapping, so a consumer without a parsing
    context -- the diagram derivation of an export -- sees exactly the
    properties the validation sees  */
export const collectParenProps = (schemas: Map<SpecObject, SchemaObject>): Map<SpecObject, SpecProperty> => {
    const parenProps = new Map<SpecObject, SpecProperty>()
    for (const [ object, schema ] of schemas) {
        const property = parenProp(object, schema.props ?? [])
        if (property !== undefined)
            parenProps.set(object, property)
    }
    return parenProps
}

/*  report the objects colliding on kind and id among their siblings
    (recursively from the artifacts down), as such objects derive
    identical anchor paths and hence cannot be addressed distinctly  */
const checkIds = (ctx: ParseContext, objects: SpecObject[]) => {
    const seen = new Map<string, SpecObject>()
    for (const object of objects) {
        const key   = `${object.kind}:${object.id}`
        const first = seen.get(key)
        if (first === undefined)
            seen.set(key, object)
        else {
            const meta = ctx.metaOf(object)
            ctx.diagnose(meta.file, meta.line,
                `id "${object.id}" of ${object.kind} "${object.name}" collides with preceding ${object.kind} "${first.name}"`)
        }
        checkIds(ctx, object.children)
    }
}

/*  the objects a property of an object references (resolved and
    distinct, in document order), leniently skipping the unresolvable
    ones, as those are already reported by the reference pass  */
const referencedObjects = (ctx: ParseContext, object: SpecObject, name: string): SpecObject[] => {
    const property = findProp(ctx, object, name)
    if (property === undefined)
        return []
    const targets = new Array<SpecObject>()
    for (const m of plainText(property.value).matchAll(referenceRegex)) {
        const target = resolveUnique(ctx.linkIndex, m[1].trim(), object).target
        if (target !== undefined && !targets.includes(target))
            targets.push(target)
    }
    return targets
}

/*  check the object kinds configured with an "automaton": the child
    objects of the node kind form a finite state machine through the
    child objects of the edge kind (each connecting the nodes its source
    and target properties reference), in which every node has to be
    reachable from an initial node, every node without outgoing edge has
    to be a final node (else it is a dead-end), and a final node has to
    be reachable from every node (else it is a livelock), where the
    initial and final nodes carry the value "true" in the respective flag
    property (a machine lacking initial or final nodes altogether skips
    the reachability checks, as the "present" flag reports the lack)  */
const checkAutomata = (ctx: ParseContext, schemas: Map<SpecObject, SchemaObject>) => {
    for (const [ object, schema ] of schemas) {
        const automaton = schema.automaton
        if (automaton === undefined)
            continue
        const nodes   = object.children.filter((child) => child.kind === automaton.nodes)
        const nodeSet = new Set<SpecObject>(nodes)
        const flagged = (node: SpecObject, name: string) => {
            const property = findProp(ctx, node, name)
            return property !== undefined && plainText(property.value).trim() === "true"
        }
        const initials = nodes.filter((node) => flagged(node, automaton.initial))
        const finals   = nodes.filter((node) => flagged(node, automaton.final))

        /*  the successors and predecessors of every node (an edge leaving
            the node set is skipped, as the property checks report it)  */
        const succs = new Map<SpecObject, Set<SpecObject>>(nodes.map((node) => [ node, new Set<SpecObject>() ]))
        const preds = new Map<SpecObject, Set<SpecObject>>(nodes.map((node) => [ node, new Set<SpecObject>() ]))
        for (const edge of object.children.filter((child) => child.kind === automaton.edges)) {
            const source = referencedObjects(ctx, edge, automaton.source)[0]
            const target = referencedObjects(ctx, edge, automaton.target)[0]
            if (source !== undefined && target !== undefined && nodeSet.has(source) && nodeSet.has(target)) {
                succs.get(source)?.add(target)
                preds.get(target)?.add(source)
            }
        }

        /*  the transitive closure of a node set along a neighbor map  */
        const closure = (starts: SpecObject[], next: Map<SpecObject, Set<SpecObject>>) => {
            const seen  = new Set<SpecObject>(starts)
            const queue = [ ...starts ]
            for (const node of queue)
                for (const other of next.get(node) ?? [])
                    if (!seen.has(other)) {
                        seen.add(other)
                        queue.push(other)
                    }
            return seen
        }
        const reachable   = closure(initials, succs)
        const coreachable = closure(finals, preds)
        for (const node of nodes) {
            const meta = ctx.metaOf(node)
            const name = `${node.kind} "${node.name}" of ${object.kind} "${object.name}"`
            if (initials.length > 0 && !reachable.has(node))
                ctx.diagnose(meta.file, meta.line,
                    `${name} is not reachable from the initial ${node.kind} through any ${automaton.edges}`)
            if ((succs.get(node)?.size ?? 0) === 0 && !finals.includes(node))
                ctx.diagnose(meta.file, meta.line,
                    `${name} has no outgoing ${automaton.edges} but is not flagged "${automaton.final}" (dead-end)`)
            else if (finals.length > 0 && !coreachable.has(node))
                ctx.diagnose(meta.file, meta.line,
                    `${name} reaches no final ${node.kind} through any ${automaton.edges} (livelock)`)
        }
    }
}

/*  check the reference properties flagged symmetric or acyclic across
    all objects of their kind: a symmetric property has to be referenced
    back by every referenced object through the same property, while an
    acyclic property must never lead from an object back to itself  */
const checkRelations = (ctx: ParseContext, schemas: Map<SpecObject, SchemaObject>) => {
    /*  group the objects by their flagged schema properties (a schema
        property is shared by all objects of its kind)  */
    const groups = new Map<SchemaProperty, SpecObject[]>()
    for (const [ object, schema ] of schemas)
        for (const prop of schema.props ?? [])
            if (prop.symmetric === true || prop.acyclic === true) {
                const group = groups.get(prop)
                if (group === undefined)
                    groups.set(prop, [ object ])
                else
                    group.push(object)
            }
    for (const [ prop, objects ] of groups) {
        const members = new Set<SpecObject>(objects)
        const locate  = (object: SpecObject) => {
            const meta     = ctx.metaOf(object)
            const property = findProp(ctx, object, prop.name)
            const line     = property !== undefined ? ctx.propMeta.get(property)?.line : undefined
            return { file: meta.file, line: line ?? meta.line }
        }
        if (prop.symmetric === true)
            for (const object of objects)
                for (const target of referencedObjects(ctx, object, prop.name)) {
                    const { file, line } = locate(object)
                    if (target === object)
                        ctx.diagnose(file, line,
                            `symmetric property "${prop.name}" on ${object.kind} "${object.name}" references itself`)
                    else if (!referencedObjects(ctx, target, prop.name).includes(object))
                        ctx.diagnose(file, line,
                            `symmetric property "${prop.name}" on ${object.kind} "${object.name}" references ` +
                            `${target.kind} "${target.name}", which does not reference it back`)
                }
        if (prop.acyclic === true) {
            /*  depth-first search along the references: an edge onto an
                object still on the current path closes a cycle, which is
                reported once, at the object closing it, with its path
                (objects outside the group act as leaves)  */
            const done = new Set<SpecObject>()
            const path = new Array<SpecObject>()
            const walk = (object: SpecObject) => {
                path.push(object)
                for (const target of referencedObjects(ctx, object, prop.name)) {
                    const at = path.indexOf(target)
                    if (at >= 0) {
                        const { file, line } = locate(object)
                        const cycle = [ ...path.slice(at), target ].map((o) => plainText(o.name)).join(" -> ")
                        ctx.diagnose(file, line,
                            `acyclic property "${prop.name}" on ${object.kind} "${object.name}" forms a cycle: ${cycle}`)
                    }
                    else if (members.has(target) && !done.has(target))
                        walk(target)
                }
                path.pop()
                done.add(object)
            }
            for (const object of objects)
                if (!done.has(object))
                    walk(object)
        }
    }
}

/*  check the object kinds flagged "referenced": every object of such a
    kind has to be referenced from at least one object which matches one
    of the flag's reference patterns, itself or through an ancestor, while
    the references from within the subtree of the object itself do not
    count (a lapse is a warning only, as the specification stays valid)  */
const checkReferenced = (ctx: ParseContext, schemas: Map<SpecObject, SchemaObject>) => {
    for (const { schema, uncovered } of referencedCoverage(ctx.linkIndex, schemas))
        for (const object of uncovered) {
            const meta = ctx.metaOf(object)
            ctx.diagnose(meta.file, meta.line,
                `${object.kind} "${object.name}" is not referenced from any object matching ` +
                (schema.referenced ?? []).map((entry) => `"${entry}"`).join(" or "), "warning")
        }
}

/*  validate the parsed specification against the configuration  */
export const validate = (ctx: ParseContext, specification: Spec, config: Schema) => {
    /*  map all objects onto their schema nodes and assign the implicit
        ids up-front: a parenthesized token not consumed as a property
        value acts as the id (an explicit "{{...}}" anchor takes
        precedence), which has to happen before any property check, as
        those resolve references by id across all artifacts  */
    const schemas = collectSchemas(specification, config)
    for (const [ object, property ] of collectParenProps(schemas))
        ctx.parenProps.set(object, property)
    const promote = (object: SpecObject) => {
        /*  an object below an unresolved artifact or an unknown kind
            carries no schema and hence no property able to consume the
            token, so the token still acts as the id and a single
            unresolved heading no longer cascades into unresolvable
            references all over the corpus  */
        if (object.paren !== undefined && object.anchor === undefined && !ctx.parenProps.has(object))
            assignId(ctx.linkIndex, object, object.paren)
        object.children.forEach(promote)
    }
    for (const artifact of specification.artifacts)
        artifact.objects.forEach(promote)

    /*  check the ids for local uniqueness, now that all of them are final  */
    checkIds(ctx, specification.artifacts.flatMap((artifact) => artifact.objects))

    /*  validate every level 1 object against its artifact schema  */
    const position = new Map<SpecArtifact, number>()
    for (const artifact of specification.artifacts) {
        for (const object of artifact.objects) {
            const meta   = ctx.metaOf(object)
            const schema = schemas.get(object)
            if (schema === undefined) {
                ctx.diagnose(meta.file, meta.line,
                    `unknown artifact "${object.kind}: ${object.name}" (id "${object.id}")`)
                continue
            }

            /*  the artifact heading must carry the configured kind and
                name verbatim (the resolution is lenient on purpose)  */
            if (object.kind !== schema.kind)
                ctx.diagnose(meta.file, meta.line,
                    `artifact kind "${object.kind}" does not match configured kind "${schema.kind}"`)
            if (schema.name !== undefined && plainText(object.name) !== schema.name)
                ctx.diagnose(meta.file, meta.line,
                    `artifact name "${object.name}" does not match configured name "${schema.name}"`)
            if (!position.has(artifact))
                position.set(artifact, config.indexOf(schema))
            validateObject(ctx, object, schema, 1)
        }
    }

    /*  check the relation shapes of the flagged reference properties, the
        state machines of the configured object kinds, and the reference
        coverage of the flagged object kinds, now that every object has
        been validated on its own  */
    checkRelations(ctx, schemas)
    checkAutomata(ctx, schemas)
    checkReferenced(ctx, schemas)

    /*  order the artifacts exactly along the schema definition  */
    specification.artifacts.sort((a, b) =>
        (position.get(a) ?? config.length) - (position.get(b) ?? config.length))
}

/*  validate every Wiki-style reference for unique resolvability (from
    its carrying object), independent of any configuration  */
export const validateReferences = (ctx: ParseContext, specification: Spec) => {
    const check = (object: SpecObject, text: string, file: string, line: number) => {
        for (const m of plainText(text).matchAll(referenceRegex)) {
            const ref        = m[1].trim()
            const resolution = resolveUnique(ctx.linkIndex, ref, object)
            if (resolution.ambiguous)
                ctx.diagnose(file, line, `ambiguous link reference "[[${ref}]]"`)
            else if (resolution.target === undefined)
                ctx.diagnose(file, line, `unresolvable link reference "[[${ref}]]"`)
        }
    }
    const walk = (object: SpecObject) => {
        const meta = ctx.metaOf(object)
        check(object, object.name, meta.file, meta.line)
        for (const property of object.properties)
            check(object, property.value, meta.file, ctx.propMeta.get(property)?.line ?? meta.line)
        if (object.description !== undefined) {
            check(object, object.description.description, meta.file, meta.line)
            if (object.description.rationale !== undefined)
                check(object, object.description.rationale, meta.file, meta.line)
        }
        object.children.forEach(walk)
    }
    for (const artifact of specification.artifacts)
        artifact.objects.forEach(walk)
}
