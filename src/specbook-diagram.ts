/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { Gradia }
    from "@rse/gradia"

import type { Spec, SpecObject, SpecProperty }
    from "./specbook-format-spec.js"
import type { Schema, SchemaDiagram, SchemaDiagramCenterEdges, SchemaDiagramNest }
    from "./specbook-format-schema.js"
import { referenceRegex, buildLinkIndex, resolveUnique, resolveSet, anchorPaths,
    expandReferences, plainText, type LinkIndex }
    from "./specbook-link.js"
import type { ParseContext }
    from "./specbook-parse-common.js"
import { collectSchemas, collectParenProps }
    from "./specbook-parse-semantic.js"
import { literal, type Verbose }
    from "./specbook-verbose.js"

/*  the single Wiki-style reference match (the non-global sibling of
    the imported, global "referenceRegex")  */
const referenceOnce = new RegExp(referenceRegex.source)

/*  a single invalid diagram situation: the reason plus the optionally
    offending object, to whose location the diagnostic is attributed  */
export interface DiagramError {
    reason:  string
    object?: SpecObject
}

/*  the result of a per-object Gradia spec derivation: either the spec
    text with the Gradia rendering options (which a rendering has to
    receive explicitly, as Gradia drops the trust-sensitive font options
    from the "#config" directives) and, for a "hub" diagram, its number
    of occupied columns (the center plus the non-empty input and output
    columns of the three-column layout), or the reasons for omitting
    the diagram  */
export interface DiagramResult {
    spec?:    string
    config?:  SchemaDiagram["config"]
    columns?: number
    errors:   DiagramError[]
}

/*  the diagram shape, i.e., the "type" of a diagram configuration
    with its default applied  */
type DiagramType = NonNullable<SchemaDiagram["type"]>

/*  render a text as a Gradia atom: a bareword where possible
    (no whitespace, no special characters, no "--"), a quoted
    string otherwise  */
const quoted = (text: string): string =>
    `"${text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`
const atom = (text: string): string => {
    const plain = text.replace(/\s+/g, " ").trim()
    return /^[^\s[\]():,">#]+$/.test(plain) && !plain.includes("--") ? plain : quoted(plain)
}

/*  render a text as a Gradia edge name or edge arity token
    (each with its own, more lenient character set)  */
const nameToken = (text: string): string =>
    /^[^\s()"]+$/.test(text) ? text : quoted(text)
const arityToken = (text: string): string =>
    /^[^\s[\]"]+$/.test(text) ? text : quoted(text)

/*  render a value as a Gradia "#config" directive value: a bareword
    where possible, a quoted string otherwise (with the whitespace
    collapsed, as a directive is a single line)  */
const configValue = (value: string | number | boolean): string => {
    const text = String(value).replace(/\s+/g, " ").trim()
    return /^[^\s"]+$/.test(text) ? text : quoted(text)
}

/*  a derived diagram edge between two specification objects  */
interface DiagramEdge {
    source: SpecObject
    target: SpecObject
    name?:  string
    arity?: string
}

/*  the synthetic properties supplied by the parenthesized name tokens
    consumed as property values, which the AST does not carry, as the
    tokens stay plain heading markers on export  */
type ParenProps = Map<SpecObject, SpecProperty>

/*  the properties of an object, the synthetic one included  */
const propsOf = (parenProps: ParenProps, object: SpecObject): SpecProperty[] => {
    const synthetic = parenProps.get(object)
    return synthetic !== undefined ? [ ...object.properties, synthetic ] : object.properties
}

/*  the value of a single property of an object, by its key  */
const propValue = (parenProps: ParenProps, object: SpecObject, key: string): string | undefined =>
    propsOf(parenProps, object).find((property) => property.key === key)?.value

/*  the derived nesting of the nodes of a diagram: the container node
    of every nested node, plus the set of all container nodes  */
interface DiagramNesting {
    parentOf:   Map<SpecObject, SpecObject>
    containers: Set<SpecObject>
}

/*  generate the Gradia spec text of a derived diagram, opened by a
    "#type" directive and the configured "#config" directives so every
    embedded spec is self-contained: one node statement per object (the
    unique anchor path as the node id, the object name as the displayed
    label, the container node as the parent) and one edge statement per
    derived edge  */
const renderSpec = (diagram: SchemaDiagram, type: DiagramType, center: SpecObject,
    centerUrl: string | undefined, nodes: SpecObject[], edges: DiagramEdge[], nesting: DiagramNesting,
    index: LinkIndex, anchors: Map<SpecObject, string>, positions: Map<SpecObject, number>,
    parenProps: ParenProps): string => {
    const lines  = [ `#type ${type}` ]
    const config = diagram.config ?? {}
    for (const [ key, value ] of Object.entries(config))
        if (value !== undefined)
            lines.push(`#config ${key} ${configValue(value)}`)
    lines.push("")

    /*  the explicit top-down order of an "ordered" diagram: the members
        of a container share one row (which Gradia wraps), while the
        top-level nodes stack in document order, a synthetic container
        taking the position of its first member  */
    const orderOf = (node: SpecObject): number => {
        if (nesting.parentOf.has(node))
            return 0
        let order = positions.get(node) ?? Number.MAX_SAFE_INTEGER
        for (const [ member, container ] of nesting.parentOf)
            if (container === node)
                order = Math.min(order, positions.get(member) ?? order)
        return order
    }
    for (const node of nodes) {
        const anchor = anchors.get(node)
        const attrs  = new Array<string>()

        /*  a synthetic center or container node (the only nodes without
            an anchor path) links to its source object, or nowhere at all  */
        const url = anchor !== undefined ? `#${anchor}` : (node === center ? centerUrl : undefined)
        if (url !== undefined)
            attrs.push(`url: ${atom(url)}`)
        if (diagram.qualified === true && node.kind !== "")
            attrs.push(`type: ${atom(node.kind)}`)
        if (type === "hub" ? node === center : node.primary === true)
            attrs.push("primary: true")
        const container = nesting.parentOf.get(node)
        if (container !== undefined)
            attrs.push(`parent: ${atom(anchors.get(container) ?? container.id)}`)
        if (diagram.nest?.layout !== undefined && nesting.containers.has(node))
            attrs.push(`container: ${diagram.nest.layout}`)
        if (diagram.ordered === true)
            attrs.push(`order: ${orderOf(node)}`)

        /*  attach the values of the configured properties as Gradia
            key/value attributes (a node lacking a property is fine, as
            the node set can mix objects of different kinds), with every
            "[[...]]" reference stripped to its target object name  */
        for (const key of diagram.properties ?? []) {
            const value = propValue(parenProps, node, key)
            if (value !== undefined) {
                const text = expandReferences(value, (reference) =>
                    resolveUnique(index, reference, node).target?.name ?? reference)
                attrs.push(`${atom(key)}: ${atom(plainText(text))}`)
            }
        }
        lines.push(`${atom(anchor ?? node.id)}: ${atom(plainText(node.name))}` +
            (attrs.length > 0 ? ` [ ${attrs.join(", ")} ]` : ""))
    }
    if (edges.length > 0) {
        lines.push("")
        for (const edge of edges) {
            const op = "--" +
                (edge.name  !== undefined && edge.name  !== "" ? `(${nameToken(edge.name)})--` : "") + ">" +
                (edge.arity !== undefined && edge.arity !== "" ? `[${arityToken(edge.arity)}]` : "")
            lines.push(`${atom(anchors.get(edge.source) ?? edge.source.id)} ${op} ` +
                atom(anchors.get(edge.target) ?? edge.target.id))
        }
    }
    return lines.join("\n") + "\n"
}

/*  derive the reference edges of a diagram from the "[[...]]" references
    of the node objects (per the "links" selection, named with the
    property key when "labeled", and for a "deep" diagram also of their
    descendants, with the reference count as the arity), with every
    target lifted to its nearest node  */
const deriveReferenceEdges = (diagram: SchemaDiagram, nodes: SpecObject[], nodeSet: Set<SpecObject>,
    index: LinkIndex, anchors: Map<SpecObject, string>,
    parents: Map<SpecObject, SpecObject | undefined>, parenProps: ParenProps): DiagramEdge[] => {
    const edges = new Array<DiagramEdge>()

    /*  lift an object to its nearest ancestor-or-self within the
        node set, as a reference onto a descendant of a node object
        (like the scenario of a use case) is a reference onto the node  */
    const lift = (object: SpecObject | undefined): SpecObject | undefined => {
        while (object !== undefined && !nodeSet.has(object))
            object = parents.get(object)
        return object
    }
    for (const node of nodes) {
        /*  the reference-carrying objects of the node: the node itself
            and, for a "deep" diagram, its descendants (halting at
            the descendants which are nodes on their own)  */
        const objects = new Array<SpecObject>()
        const walk = (object: SpecObject) => {
            objects.push(object)
            if (diagram.deep === true)
                for (const child of object.children)
                    if (!nodeSet.has(child))
                        walk(child)
        }
        walk(node)
        const counts = new Map<string, { target: SpecObject, name?: string, count: number }>()
        for (const object of objects) {
            const texts: { text: string, name?: string }[] = propsOf(parenProps, object).map((property) => ({
                text: property.value,
                name: diagram.labeled === true ? property.key.toLowerCase() : undefined
            }))
            if (diagram.links === "all" && object.description !== undefined) {
                texts.push({ text: object.description.description })
                if (object.description.rationale !== undefined)
                    texts.push({ text: object.description.rationale })
            }
            for (const { text, name } of texts)
                for (const m of text.matchAll(referenceRegex)) {
                    const target = lift(resolveUnique(index, m[1].trim(), object).target)
                    if (target !== undefined && target !== node && nodeSet.has(target)) {
                        const key   = `${anchors.get(target) ?? target.id}\u0000${name ?? ""}`
                        const entry = counts.get(key) ?? { target, name, count: 0 }
                        entry.count++
                        counts.set(key, entry)
                    }
                }
        }
        for (const { target, name, count } of counts.values())
            edges.push({ source: node, target, name,
                arity: diagram.deep === true ? String(count) : undefined })
    }
    return edges
}

/*  derive the object edges of a diagram from the edge objects by
    convention (source: parent object, target: first reference in the
    property values, name: object name, arity: "ARITY" property),
    overridable via "edgeSource"/"edgeTarget"/"edgeArity"  */
const deriveObjectEdges = (diagram: SchemaDiagram, nodeSet: Set<SpecObject>, edgeObjects: SpecObject[],
    index: LinkIndex, parents: Map<SpecObject, SpecObject | undefined>,
    parenProps: ParenProps, errors: DiagramError[]): DiagramEdge[] => {
    const edges = new Array<DiagramEdge>()

    /*  resolve the node an edge object references through a named
        property, or through its first single-reference property when
        no name is configured (skipping the source property)  */
    const edgeNode = (edgeObject: SpecObject, key: string | undefined) => {
        const value = key !== undefined ?
            propValue(parenProps, edgeObject, key) :
            propsOf(parenProps, edgeObject).filter((property) => property.key !== diagram.edgeSource)
                .map((property) => property.value).find((v) => referenceOnce.test(v))
        const reference = value?.match(referenceOnce)?.[1].trim()
        return reference !== undefined ? resolveUnique(index, reference, edgeObject).target : undefined
    }
    for (const edgeObject of edgeObjects) {
        const source = diagram.edgeSource !== undefined ?
            edgeNode(edgeObject, diagram.edgeSource) : parents.get(edgeObject)
        const target = edgeNode(edgeObject, diagram.edgeTarget)
        if (source === undefined) {
            errors.push({ object: edgeObject, reason: diagram.edgeSource !== undefined ?
                "carries no resolvable source reference" :
                "has no parent object as source" })
            continue
        }
        if (target === undefined) {
            errors.push({ object: edgeObject, reason: "carries no resolvable target reference" })
            continue
        }
        if (!nodeSet.has(source) || !nodeSet.has(target))
            continue
        const arity = propValue(parenProps, edgeObject, diagram.edgeArity ?? "ARITY")
        edges.push({ source, target, name: plainText(edgeObject.name),
            arity: arity !== undefined ? plainText(arity) : undefined })
    }
    return edges
}

/*  derive the edges of a diagram: the reference edges of the node
    objects, the object edges of the edge objects, and the containment
    edges of the object hierarchy (a "grid" diagram is edge-less by
    definition, so no edges are derived at all)  */
const deriveEdges = (diagram: SchemaDiagram, type: DiagramType,
    nodes: SpecObject[], nodeSet: Set<SpecObject>, edgeObjects: SpecObject[],
    index: LinkIndex, anchors: Map<SpecObject, string>,
    parents: Map<SpecObject, SpecObject | undefined>, parenProps: ParenProps,
    errors: DiagramError[]): DiagramEdge[] => {
    const edges = new Array<DiagramEdge>()
    if (type !== "grid") {
        edges.push(...deriveReferenceEdges(diagram, nodes, nodeSet, index, anchors, parents, parenProps))
        edges.push(...deriveObjectEdges(diagram, nodeSet, edgeObjects, index, parents, parenProps, errors))

        /*  derive the containment edges from the object hierarchy, as
            the nesting of the objects carries no "[[...]]" reference  */
        if (diagram.hierarchy === true)
            for (const node of nodes) {
                const parent = parents.get(node)
                if (parent !== undefined && nodeSet.has(parent))
                    edges.push({ source: parent, target: node })
            }
    }
    else {
        if (diagram.edges !== undefined)
            errors.push({ reason: "\"grid\" diagram cannot carry an \"edges\" configuration" })
        if (diagram.hierarchy === true)
            errors.push({ reason: "\"grid\" diagram cannot carry a \"hierarchy\" configuration" })
        if (diagram.deep === true)
            errors.push({ reason: "\"grid\" diagram cannot carry a \"deep\" configuration" })
        if (diagram.labeled === true)
            errors.push({ reason: "\"grid\" diagram cannot carry a \"labeled\" configuration" })
        if (diagram.onlyConnected === true)
            errors.push({ reason: "\"grid\" diagram cannot carry an \"onlyConnected\" configuration" })
    }

    return edges
}

/*  deduplicate the edges (a containment, object, or center edge can
    coincide with a reference edge, and several edge objects can
    describe the very same edge)  */
const dedupEdges = (edges: DiagramEdge[], anchors: Map<SpecObject, string>): DiagramEdge[] => {
    const seenEdges = new Set<string>()
    return edges.filter((edge) => {
        const key = `${anchors.get(edge.source) ?? edge.source.id}` +
            `\u0000${anchors.get(edge.target) ?? edge.target.id}` +
            `\u0000${edge.name ?? ""}\u0000${edge.arity ?? ""}`
        if (seenEdges.has(key))
            return false
        seenEdges.add(key)
        return true
    })
}

/*  resolve a comma-separated "[[...]]" reference pattern string into
    its (deduplicated, order-preserving) object match set, reporting
    every unresolvable non-wildcard pattern as an error (a wildcard
    pattern legitimately matches nothing when an optional kind is absent)  */
const resolvePatterns = (index: LinkIndex, errors: DiagramError[],
    value: string, field: string): SpecObject[] => {
    const matches = new Array<SpecObject>()
    const seen    = new Set<SpecObject>()
    let   found   = false
    for (const m of value.matchAll(referenceRegex)) {
        found = true
        const pattern = m[1].trim()
        const set     = resolveSet(index, pattern)
        if (set.length === 0 && !pattern.includes("*"))
            errors.push({ reason: `unresolvable diagram "${field}" pattern "[[${pattern}]]"` })
        for (const match of set)
            if (!seen.has(match)) {
                seen.add(match)
                matches.push(match)
            }
    }
    if (!found)
        errors.push({ reason: `diagram "${field}" carries no "[[...]]" reference pattern` })
    return matches
}

/*  the center of a "hub" diagram: the center object plus, for a
    synthetic center, the URL of its source object  */
interface DiagramCenter {
    center:     SpecObject
    centerUrl?: string
}

/*  determine the center object of a "hub" diagram: the current
    object for the default "self" configuration, the uniquely
    resolved object of an explicit "[[...]]" reference, or a fresh
    synthetic node for the object configuration, labeled from a
    referenced source object (or one of its properties) or a
    literal text and linked to the source object (the solution
    itself, e.g., is no specification object, yet a context
    diagram places it in the middle) and injected into the node
    set (the center is absent whenever the configuration is invalid)  */
const deriveCenter = (object: SpecObject, diagram: SchemaDiagram,
    nodes: SpecObject[], nodeSet: Set<SpecObject>, index: LinkIndex,
    anchors: Map<SpecObject, string>, parenProps: ParenProps,
    errors: DiagramError[]): DiagramCenter | undefined => {
    if (typeof diagram.center === "string" && diagram.center !== "self") {
        const reference = diagram.center.match(referenceOnce)?.[1].trim()
        const resolved  = reference !== undefined ? resolveUnique(index, reference, object) : undefined
        if (resolved?.target === undefined) {
            errors.push({ reason: (resolved?.ambiguous === true ? "ambiguous" : "unresolvable") +
                ` diagram "center" reference "${diagram.center}"` })
            return undefined
        }
        return { center: resolved.target }
    }
    else if (typeof diagram.center === "object") {
        const centerCfg = diagram.center
        let   label     = centerCfg.label
        let   centerUrl: string | undefined
        if (centerCfg.property !== undefined && centerCfg.source === undefined) {
            errors.push({ reason: "diagram \"center\" property requires a \"source\" reference" })
            return undefined
        }
        if (centerCfg.source !== undefined) {
            const reference = centerCfg.source.match(referenceOnce)?.[1].trim()
            const resolved  = reference !== undefined ? resolveUnique(index, reference, object) : undefined
            const source    = resolved?.target
            if (source === undefined) {
                errors.push({ reason: (resolved?.ambiguous === true ? "ambiguous" : "unresolvable") +
                    ` diagram "center" source reference "${centerCfg.source}"` })
                return undefined
            }
            centerUrl = `#${anchors.get(source) ?? source.id}`
            if (centerCfg.property !== undefined) {
                const value = propValue(parenProps, source, centerCfg.property)
                if (value === undefined) {
                    errors.push({ reason:
                        `diagram "center" source lacks the property "${centerCfg.property}"` })
                    return undefined
                }
                label = plainText(expandReferences(value, (ref) =>
                    resolveUnique(index, ref, source).target?.name ?? ref))
            }
            else if (label === undefined)
                label = plainText(source.name)
        }
        if (label === undefined) {
            errors.push({ reason: "diagram \"center\" configuration yields no label" })
            return undefined
        }

        /*  inject the synthetic center node into the node set, with a
            collision-free id ("@" never occurs in an anchor path)  */
        const center: SpecObject = { kind: centerCfg.kind ?? "",
            id: `${anchors.get(object) ?? object.id}-@center`, name: label, properties: [], children: [] }
        nodes.unshift(center)
        nodeSet.add(center)
        return { center, centerUrl }
    }
    return { center: object }
}

/*  synthesize the center edges of a "hub" diagram from the
    direction property of the node objects: the "inbound" value
    maps onto a node-to-center edge, the "outbound" value onto a
    center-to-node edge, and the "both" value onto both (which
    Gradia renders as an input node plus an output "ghost" node),
    named by the "labeled" property and/or by the mediating object
    the "via" property references (as "via <name>")  */
const deriveCenterEdges = (cfg: SchemaDiagramCenterEdges, nodes: SpecObject[],
    center: SpecObject, index: LinkIndex, parenProps: ParenProps,
    errors: DiagramError[]): DiagramEdge[] => {
    const edges = new Array<DiagramEdge>()
    for (const node of nodes) {
        if (node === center)
            continue
        const value    = propValue(parenProps, node, cfg.property)
        const inbound  = cfg.inbound  !== undefined && value === cfg.inbound
        const outbound = cfg.outbound !== undefined && value === cfg.outbound
        const both     = cfg.both     !== undefined && value === cfg.both
        if (!inbound && !outbound && !both) {
            errors.push({ object: node, reason: value === undefined ?
                `lacks the diagram "centerEdges" property "${cfg.property}"` :
                `carries the unmapped diagram "centerEdges" value "${value}"` })
            continue
        }
        const expand = (text: string) => plainText(expandReferences(text, (reference) =>
            resolveUnique(index, reference, node).target?.name ?? reference))
        const label  = cfg.labeled !== undefined ?
            propValue(parenProps, node, cfg.labeled) : undefined
        const via    = cfg.via !== undefined ?
            propValue(parenProps, node, cfg.via) : undefined
        const names  = new Array<string>()
        if (label !== undefined)
            names.push(expand(label))
        if (via !== undefined)
            names.push(`via ${expand(via)}`)
        const name   = names.length > 0 ? names.join(" ") : undefined
        if (inbound || both)
            edges.push({ source: node, target: center, name })
        if (outbound || both)
            edges.push({ source: center, target: node, name })
    }
    return edges
}

/*  derive the nesting of the nodes into container nodes: per node the
    first configured property carrying exactly one resolvable reference
    names its container (added to the node set when absent, and nested
    on its own in turn), else its parent object when part of the node
    set, else a synthetic container per object kind; a node nested into
    itself or into a cycle stays un-nested and is reported  */
const deriveNesting = (nest: SchemaDiagramNest, nodes: SpecObject[], nodeSet: Set<SpecObject>,
    index: LinkIndex, parents: Map<SpecObject, SpecObject | undefined>,
    parenProps: ParenProps, errors: DiagramError[]): DiagramNesting => {
    const parentOf = new Map<SpecObject, SpecObject>()
    const byKind   = new Map<string, SpecObject>()

    /*  the iteration also visits the containers appended underway  */
    for (const node of nodes) {
        let container: SpecObject | undefined
        for (const key of nest.properties ?? []) {
            const value = propValue(parenProps, node, key)
            const refs  = value !== undefined ? Array.from(value.matchAll(referenceRegex)) : []
            if (refs.length !== 1)
                continue
            container = resolveUnique(index, refs[0][1].trim(), node).target
            if (container !== undefined)
                break
        }
        if (container === undefined && nest.parent === true) {
            const parent = parents.get(node)
            if (parent !== undefined && nodeSet.has(parent))
                container = parent
        }
        if (container === undefined && nest.kind === true && node.kind !== "") {
            container = byKind.get(node.kind)
            if (container === undefined) {
                container = { kind: "", id: `@kind-${node.kind}`, name: node.kind, properties: [], children: [] }
                byKind.set(node.kind, container)
            }
        }
        if (container === undefined)
            continue

        /*  a container chain leading back to the node would close a
            cycle, which Gradia rejects exactly like a self-nesting  */
        let ancestor: SpecObject | undefined = container
        while (ancestor !== undefined && ancestor !== node)
            ancestor = parentOf.get(ancestor)
        if (ancestor === node) {
            errors.push({ reason: `node "${plainText(node.name)}" is nested into itself` })
            continue
        }
        parentOf.set(node, container)
        if (!nodeSet.has(container)) {
            nodes.push(container)
            nodeSet.add(container)
        }
    }
    return { parentOf, containers: new Set(parentOf.values()) }
}

/*  lift the edges crossing a container boundary onto the containers:
    an end is replaced by its outermost ancestor container not enclosing
    the other end as well (the target end only, or both ends), and the
    edges coinciding afterwards merge into one, with their arities summed
    where numeric, so a bundle of references into a container becomes a
    single edge onto it  */
const liftEdges = (edges: DiagramEdge[], parentOf: Map<SpecObject, SpecObject>,
    mode: "target" | "both", anchors: Map<SpecObject, string>): DiagramEdge[] => {
    const ancestors = (object: SpecObject): SpecObject[] => {
        const chain = new Array<SpecObject>()
        for (let p = parentOf.get(object); p !== undefined; p = parentOf.get(p))
            chain.push(p)
        return chain
    }
    const lift = (end: SpecObject, other: SpecObject): SpecObject => {
        const enclosing = new Set<SpecObject>([ other, ...ancestors(other) ])
        let lifted = end
        for (const ancestor of ancestors(end)) {
            if (enclosing.has(ancestor))
                break
            lifted = ancestor
        }
        return lifted
    }
    const merged = new Map<string, DiagramEdge>()
    for (const edge of edges) {
        const target = lift(edge.target, edge.source)
        const source = mode === "both" ? lift(edge.source, edge.target) : edge.source
        if (source === target)
            continue
        const key   = `${anchors.get(source) ?? source.id} ${anchors.get(target) ?? target.id}` +
            ` ${edge.name ?? ""}`
        const known = merged.get(key)
        if (known === undefined)
            merged.set(key, { source, target, name: edge.name, arity: edge.arity })
        else if (known.arity !== undefined && edge.arity !== undefined
            && /^\d+$/.test(known.arity) && /^\d+$/.test(edge.arity))
            known.arity = String(Number(known.arity) + Number(edge.arity))
        else if (known.arity !== edge.arity)
            known.arity = undefined
    }
    return Array.from(merged.values())
}

/*  derive the Gradia spec of a single object from its "diagram:"
    schema configuration (the returned spec is absent whenever the
    configured diagram situation is invalid)  */
const deriveDiagram = (object: SpecObject, diagram: SchemaDiagram,
    index: LinkIndex, anchors: Map<SpecObject, string>, positions: Map<SpecObject, number>,
    parents: Map<SpecObject, SpecObject | undefined>, parenProps: ParenProps): DiagramResult => {
    const type   = diagram.type ?? "graph"
    const errors = new Array<DiagramError>()

    /*  determine the node objects (default: the current object plus
        all objects below it) and the edge objects (default: none),
        with the edge objects never acting as nodes themselves  */
    let nodes: SpecObject[]
    if (diagram.nodes !== undefined)
        nodes = resolvePatterns(index, errors, diagram.nodes, "nodes")
    else {
        nodes = new Array<SpecObject>()
        const walk = (o: SpecObject) => {
            nodes.push(o)
            o.children.forEach(walk)
        }
        walk(object)
    }
    const edgeObjects = diagram.edges !== undefined ? resolvePatterns(index, errors, diagram.edges, "edges") : []
    const edgeSet     = new Set<SpecObject>(edgeObjects)
    nodes = nodes.filter((node) => !edgeSet.has(node))
    const nodeSet = new Set<SpecObject>(nodes)

    /*  derive the edges of the diagram  */
    let edges = deriveEdges(diagram, type, nodes, nodeSet, edgeObjects, index, anchors, parents,
        parenProps, errors)

    /*  determine the center of a "hub" diagram (the only shape
        carrying a center at all)  */
    if (type !== "hub") {
        if (diagram.center !== undefined)
            errors.push({ reason: `"${type}" diagram cannot carry a "center" configuration` })
        if (diagram.centerEdges !== undefined)
            errors.push({ reason: `"${type}" diagram cannot carry a "centerEdges" configuration` })
    }
    const derived: DiagramCenter | undefined = type === "hub" ?
        deriveCenter(object, diagram, nodes, nodeSet, index, anchors, parenProps, errors) : { center: object }
    if (derived === undefined)
        return { errors }
    const { center, centerUrl } = derived

    /*  synthesize the center edges of a "hub" diagram, as the nodes
        carry no "[[...]]" reference to a synthetic center, and only
        then deduplicate all edges, as a center edge of a real center
        can coincide with a reference edge of a node onto it  */
    if (type === "hub" && diagram.centerEdges !== undefined)
        edges.push(...deriveCenterEdges(diagram.centerEdges, nodes, center, index, parenProps, errors))
    edges = dedupEdges(edges, anchors)

    /*  a "hub" diagram is the hub-projection onto its center object:
        only the edges incident to the center and only the nodes
        connected through them remain, with self-loops dropped, as
        Gradia requires exactly this constrained topology (and the
        occupied columns are the center plus the input column, when
        an edge targets the center, plus the output column, when an
        edge originates from the center)  */
    let columns: number | undefined
    if (type === "hub") {
        if (!nodeSet.has(center))
            errors.push({ reason: `"hub" diagram center "${center.name}" is not part of the node set` })
        else {
            edges = edges.filter((edge) => (edge.source === center || edge.target === center)
                && edge.source !== edge.target)
            const connected = new Set<SpecObject>([ center ])
            for (const edge of edges) {
                connected.add(edge.source)
                connected.add(edge.target)
            }
            nodes = nodes.filter((node) => connected.has(node))
            columns = 1 +
                (edges.some((edge) => edge.target === center) ? 1 : 0) +
                (edges.some((edge) => edge.source === center) ? 1 : 0)
        }
    }

    /*  nest the nodes into container nodes (except in a "hub" diagram,
        where every container would need a primary node of its own),
        dropping the edges between a container and its own members,
        which Gradia rejects, as the nesting already shows them  */
    let nesting: DiagramNesting = { parentOf: new Map(), containers: new Set() }
    if (diagram.nest !== undefined) {
        if (type === "hub")
            errors.push({ reason: "\"hub\" diagram cannot carry a \"nest\" configuration" })
        else {
            nesting = deriveNesting(diagram.nest, nodes, nodeSet, index, parents, parenProps, errors)
            if (diagram.nest.crossing !== undefined && diagram.nest.crossing !== "nodes")
                edges = liftEdges(edges, nesting.parentOf, diagram.nest.crossing, anchors)
            edges = edges.filter((edge) => nesting.parentOf.get(edge.source) !== edge.target
                && nesting.parentOf.get(edge.target) !== edge.source)
        }
    }

    /*  the "onlyConnected" filtering keeps only the nodes with at
        least one incident edge (sensible for "graph" diagrams only),
        and the container nodes, whose members connect them  */
    if (diagram.onlyConnected === true && type === "graph") {
        const connected = new Set<SpecObject>()
        for (const edge of edges) {
            connected.add(edge.source)
            connected.add(edge.target)
        }
        nodes = nodes.filter((node) => connected.has(node) || nesting.containers.has(node))
    }
    if (errors.length > 0)
        return { errors }

    /*  an empty node set silently omits the diagram, as a wildcard
        "nodes" pattern legitimately matches nothing when an optional
        kind is absent, and the "collapse" handling (enabled by default)
        does the same for the degenerate diagram of a single node, as
        such a diagram carries no information beyond the object itself  */
    if (nodes.length === 0
        || (diagram.collapse !== false && nodes.length === 1 && edges.length === 0))
        return { errors }

    return { spec: renderSpec(diagram, type, center, centerUrl, nodes, edges, nesting, index, anchors,
        positions, parenProps), config: diagram.config, columns, errors }
}

/*  the memoized diagram derivations, keyed by specification, as the
    lint validation and every renderer of an export derive the very
    same diagrams of the very same parsed specification again  */
const derivations = new WeakMap<Spec, { config: Schema, results: Map<SpecObject, DiagramResult> }>()

/*  derive the Gradia specs of all diagram-configured objects
    of a specification (memoized per specification and schema)  */
export const specDiagrams = (specification: Spec,
    config: Schema): Map<SpecObject, DiagramResult> => {
    const derived = derivations.get(specification)
    if (derived !== undefined && derived.config === config)
        return derived.results
    const index     = buildLinkIndex(specification)
    const anchors   = anchorPaths(index)
    const parents   = new Map<SpecObject, SpecObject | undefined>()
    const positions = new Map<SpecObject, number>()
    index.forEach((node, position) => {
        parents.set(node.object, node.parent?.object)
        positions.set(node.object, position)
    })
    const schemas = collectSchemas(specification, config)

    /*  re-derive the synthetic properties of the consumed parenthesized
        name tokens, as the derivation sees the AST alone, while the
        parsing context holding them is long gone by export time  */
    const parenProps = collectParenProps(schemas)
    const results = new Map<SpecObject, DiagramResult>()
    for (const [ object, schema ] of schemas)
        if (schema.diagram !== undefined)
            results.set(object, deriveDiagram(object, schema.diagram, index, anchors, positions, parents,
                parenProps))
    derivations.set(specification, { config, results })
    return results
}

/*  the in-memory cache of the rendered diagram SVGs, keyed by Gradia
    spec text plus rendering options, as a long-running process (the
    live preview, the export watch, the MCP service) and the multiple
    passes and formats of a single export render the very same diagrams
    over and over again  */
let svgCache = new Map<string, string>()

/*  render the Gradia specs of all diagram-configured objects of a
    specification into embeddable SVGs (a runtime rendering failure omits
    the diagram and is surfaced as a notice only, as the statically
    detectable invalid situations are already reported as lint
    diagnostics), served from the cache where possible, which is
    afterwards swept to the diagrams of this very rendering, so it never
    grows beyond a single document  */
export const renderDiagrams = async (specification: Spec, config: Schema,
    verbose?: Verbose): Promise<Map<SpecObject, DiagramResult & { svg: string }>> => {
    const cache    = new Map<string, string>()
    const rendered = new Map<SpecObject, DiagramResult & { svg: string }>()
    let   cached   = 0
    for (const [ object, result ] of specDiagrams(specification, config)) {
        if (result.spec === undefined)
            continue
        const key = result.spec + JSON.stringify(result.config ?? {})
        let svg = svgCache.get(key) ?? cache.get(key)
        if (svg !== undefined)
            cached++
        else {
            try {
                svg = await Gradia.render(result.spec,
                    { format: "svg:embedded", config: result.config })
            }
            catch (err) {
                verbose?.(`rendering diagram of ${object.kind} "${object.name}" failed: ` +
                    (err instanceof Error ? err.message : String(err)), "notice")
                continue
            }
        }
        cache.set(key, svg)
        rendered.set(object, { ...result, svg })
    }
    svgCache = cache
    verbose?.(`rendering ${literal(rendered.size)} diagram(s) (${literal(cached)} cached)`)
    return rendered
}

/*  validate all configured diagrams of a specification, reporting
    every invalid diagram situation as a file/line-precise diagnostic  */
export const validateDiagrams = (ctx: ParseContext, specification: Spec,
    config: Schema) => {
    const seen = new Set<string>()
    for (const [ object, result ] of specDiagrams(specification, config))
        for (const error of result.errors) {
            /*  attribute an edge object situation to the offending edge
                object itself and report it just once, as a wildcard
                "edges" pattern lets every diagram walk the very same
                edge objects again  */
            const meta    = ctx.metaOf(error.object ?? object)
            const message = error.object !== undefined ?
                `invalid diagram edge on ${error.object.kind} "${error.object.name}": ${error.reason}` :
                `invalid diagram on ${object.kind} "${object.name}": ${error.reason}`
            const key     = `${meta.file}\u0000${meta.line}\u0000${message}`
            if (seen.has(key))
                continue
            seen.add(key)
            ctx.diagnose(meta.file, meta.line, message)
        }
}

