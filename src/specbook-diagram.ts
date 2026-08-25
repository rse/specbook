/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Spec, SpecObject }
    from "./specbook-format-spec.js"
import type { Schema, SchemaObject, SchemaDiagram }
    from "./specbook-format-schema.js"
import { referenceRegex, buildLinkIndex, resolveUnique, resolveSet, anchorPaths,
    expandReferences, plainText, type LinkIndex }
    from "./specbook-link.js"
import type { ParseContext }
    from "./specbook-parse-common.js"
import { resolveArtifact }
    from "./specbook-parse-semantic.js"

/*  the single Wiki-style reference match (the non-global sibling of
    the imported, global "referenceRegex")  */
const referenceOnce = new RegExp(referenceRegex.source)

/*  the result of a per-object Gradia spec derivation: either the spec
    text or the reasons why the diagram has to be omitted  */
export interface DiagramResult {
    spec?:  string
    errors: string[]
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

/*  generate the Gradia spec text of a derived diagram, opened by a
    "#type" directive and the configured "#config" directives so every
    embedded spec is self-contained: one node statement per object (the
    unique anchor path as the node id, the object name as the displayed
    label) and one edge statement per derived edge  */
const renderSpec = (diagram: SchemaDiagram, type: DiagramType, center: SpecObject,
    nodes: SpecObject[], edges: DiagramEdge[], index: LinkIndex,
    anchors: Map<SpecObject, string>): string => {
    const lines  = [ `#type ${type}` ]
    const config = diagram.config ?? {}
    for (const [ key, value ] of Object.entries(config))
        if (value !== undefined)
            lines.push(`#config ${key} ${configValue(value)}`)
    lines.push("")
    for (const node of nodes) {
        const anchor = anchors.get(node) ?? node.id
        const attrs  = [ `url: ${atom(`#${anchor}`)}` ]
        if (diagram.qualified === true && node.kind !== "")
            attrs.push(`type: ${atom(node.kind)}`)
        if (type === "hub" ? node === center : node.primary === true)
            attrs.push("primary: true")

        /*  attach the values of the configured properties as Gradia
            key/value attributes (a node lacking a property is fine, as
            the node set can mix objects of different kinds), with every
            "[[...]]" reference stripped to its target object name  */
        for (const key of diagram.properties ?? []) {
            const value = node.properties.find((property) => property.key === key)?.value
            if (value !== undefined) {
                const text = expandReferences(value, (reference) =>
                    resolveUnique(index, reference).target?.name ?? reference)
                attrs.push(`${atom(key)}: ${atom(plainText(text))}`)
            }
        }
        lines.push(`${atom(anchor)}: ${atom(plainText(node.name))} [ ${attrs.join(", ")} ]`)
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

/*  derive the edges of a diagram: from the "[[...]]" references of the
    node objects (per the "links" selection) and from the edge objects by
    convention (source: parent object, target: first reference in the
    property values, name: object name, arity: "ARITY" property),
    overridable via "edgeSource"/"edgeTarget"/"edgeArity" (a "grid"
    diagram is edge-less by definition, so no edges are derived at all)  */
const deriveEdges = (diagram: SchemaDiagram, type: DiagramType,
    nodes: SpecObject[], nodeSet: Set<SpecObject>, edgeObjects: SpecObject[],
    index: LinkIndex, anchors: Map<SpecObject, string>,
    parents: Map<SpecObject, SpecObject | undefined>, errors: string[]): DiagramEdge[] => {
    const edges = new Array<DiagramEdge>()
    if (type !== "grid") {
        for (const node of nodes) {
            const texts = node.properties.map((property) => property.value)
            if (diagram.links === "all" && node.description !== undefined) {
                texts.push(node.description.description)
                if (node.description.rationale !== undefined)
                    texts.push(node.description.rationale)
            }
            for (const text of texts)
                for (const m of text.matchAll(referenceRegex)) {
                    const target = resolveUnique(index, m[1].trim()).target
                    if (target !== undefined && target !== node && nodeSet.has(target))
                        edges.push({ source: node, target })
                }
        }

        /*  resolve the node an edge object references through a named
            property, or through its first single-reference property when
            no name is configured (skipping the source property)  */
        const edgeNode = (edgeObject: SpecObject, key: string | undefined) => {
            const value = key !== undefined ?
                edgeObject.properties.find((property) => property.key === key)?.value :
                edgeObject.properties.filter((property) => property.key !== diagram.edgeSource)
                    .map((property) => property.value).find((v) => referenceOnce.test(v))
            const reference = value?.match(referenceOnce)?.[1].trim()
            return reference !== undefined ? resolveUnique(index, reference).target : undefined
        }
        for (const edgeObject of edgeObjects) {
            const source = diagram.edgeSource !== undefined ?
                edgeNode(edgeObject, diagram.edgeSource) : parents.get(edgeObject)
            const target = edgeNode(edgeObject, diagram.edgeTarget)
            if (source === undefined) {
                errors.push(diagram.edgeSource !== undefined ?
                    `diagram edge object "${edgeObject.name}" carries no resolvable source reference` :
                    `diagram edge object "${edgeObject.name}" has no parent object as source`)
                continue
            }
            if (target === undefined) {
                errors.push(`diagram edge object "${edgeObject.name}" carries no resolvable target reference`)
                continue
            }
            if (!nodeSet.has(source) || !nodeSet.has(target))
                continue
            const arity = edgeObject.properties.find((property) =>
                property.key === (diagram.edgeArity ?? "ARITY"))?.value
            edges.push({ source, target, name: plainText(edgeObject.name),
                arity: arity !== undefined ? plainText(arity) : undefined })
        }

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
            errors.push("\"grid\" diagram cannot carry an \"edges\" configuration")
        if (diagram.hierarchy === true)
            errors.push("\"grid\" diagram cannot carry a \"hierarchy\" configuration")
        if (diagram.onlyConnected === true)
            errors.push("\"grid\" diagram cannot carry an \"onlyConnected\" configuration")
    }

    /*  deduplicate the edges (the same reference can occur in
        multiple texts of the same node object)  */
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
    every unresolvable pattern as an error  */
const resolvePatterns = (index: LinkIndex, errors: string[],
    value: string, field: string): SpecObject[] => {
    const matches = new Array<SpecObject>()
    const seen    = new Set<SpecObject>()
    for (const m of value.matchAll(referenceRegex)) {
        const pattern = m[1].trim()
        const set     = resolveSet(index, pattern)
        if (set.length === 0)
            errors.push(`unresolvable diagram "${field}" pattern "[[${pattern}]]"`)
        for (const match of set) {
            if (!seen.has(match)) {
                seen.add(match)
                matches.push(match)
            }
        }
    }
    return matches
}

/*  derive the Gradia spec of a single object from its "diagram:"
    schema configuration (the returned spec is absent whenever the
    configured diagram situation is invalid)  */
const deriveDiagram = (object: SpecObject, diagram: SchemaDiagram,
    index: LinkIndex, anchors: Map<SpecObject, string>,
    parents: Map<SpecObject, SpecObject | undefined>): DiagramResult => {
    const type   = diagram.type ?? "graph"
    const errors = new Array<string>()

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
            o.childs.forEach(walk)
        }
        walk(object)
    }
    const edgeObjects = diagram.edges !== undefined ? resolvePatterns(index, errors, diagram.edges, "edges") : []
    const edgeSet     = new Set<SpecObject>(edgeObjects)
    nodes = nodes.filter((node) => !edgeSet.has(node))
    const nodeSet = new Set<SpecObject>(nodes)

    /*  derive the (deduplicated) edges of the diagram  */
    let edges = deriveEdges(diagram, type, nodes, nodeSet, edgeObjects, index, anchors, parents, errors)

    /*  determine the center object of a "hub" diagram: the current
        object for the default "self" configuration, the uniquely
        resolved object of an explicit "[[...]]" reference otherwise  */
    let center = object
    if (type !== "hub" && diagram.center !== undefined)
        errors.push(`"${type}" diagram cannot carry a "center" configuration`)
    if (type === "hub" && diagram.center !== undefined && diagram.center !== "self") {
        const reference = diagram.center.match(referenceOnce)?.[1].trim()
        const resolved  = reference !== undefined ? resolveUnique(index, reference) : undefined
        if (resolved?.target === undefined) {
            errors.push((resolved?.ambiguous === true ? "ambiguous" : "unresolvable") +
                ` diagram "center" reference "${diagram.center}"`)
            return { errors }
        }
        center = resolved.target
    }

    /*  a "hub" diagram is the hub-projection onto its center object:
        only the edges incident to the center and only the nodes
        connected through them remain, with self-loops dropped, as
        Gradia requires exactly this constrained topology  */
    if (type === "hub") {
        if (!nodeSet.has(center))
            errors.push(`"hub" diagram center "${center.name}" is not part of the node set`)
        else {
            edges = edges.filter((edge) => (edge.source === center || edge.target === center)
                && edge.source !== edge.target)
            const connected = new Set<SpecObject>([ center ])
            for (const edge of edges) {
                connected.add(edge.source)
                connected.add(edge.target)
            }
            nodes = nodes.filter((node) => connected.has(node))
        }
    }

    /*  the "onlyConnected" filtering keeps only the nodes with at
        least one incident edge (sensible for "graph" diagrams only)  */
    if (diagram.onlyConnected === true && type === "graph") {
        const connected = new Set<SpecObject>()
        for (const edge of edges) {
            connected.add(edge.source)
            connected.add(edge.target)
        }
        nodes = nodes.filter((node) => connected.has(node))
    }
    if (nodes.length === 0)
        errors.push("diagram yields no nodes")
    if (errors.length > 0)
        return { errors }

    /*  the "collapse" handling (enabled by default) silently omits a
        degenerate diagram, consisting of a single node only, as such a
        diagram carries no information beyond the object itself  */
    if (diagram.collapse !== false && nodes.length === 1 && edges.length === 0)
        return { errors }

    return { spec: renderSpec(diagram, type, center, nodes, edges, index, anchors), errors }
}

/*  map the specification objects onto their schema configuration
    nodes (the artifact resolution is shared with the semantic validation)  */
export const collectSchemas = (specification: Spec,
    config: Schema): Map<SpecObject, SchemaObject> => {
    const schemas = new Map<SpecObject, SchemaObject>()
    const walk = (object: SpecObject, schema: SchemaObject) => {
        schemas.set(object, schema)
        for (const child of object.childs) {
            const childSchema = (schema.childs ?? []).find((c) => c.kind === child.kind)
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

/*  derive the Gradia specs of all diagram-configured objects
    of a specification  */
export const specDiagrams = (specification: Spec,
    config: Schema): Map<SpecObject, DiagramResult> => {
    const index   = buildLinkIndex(specification)
    const anchors = anchorPaths(index)
    const parents = new Map<SpecObject, SpecObject | undefined>()
    for (const node of index)
        parents.set(node.object, node.parent?.object)
    const results = new Map<SpecObject, DiagramResult>()
    for (const [ object, schema ] of collectSchemas(specification, config))
        if (schema.diagram !== undefined)
            results.set(object, deriveDiagram(object, schema.diagram, index, anchors, parents))
    return results
}

/*  validate all configured diagrams of a specification, reporting
    every invalid diagram situation as a file/line-precise diagnostic  */
export const validateDiagrams = (ctx: ParseContext, specification: Spec,
    config: Schema) => {
    for (const [ object, result ] of specDiagrams(specification, config)) {
        const meta = ctx.objectMeta.get(object) ?? { file: "", line: 1 }
        for (const error of result.errors)
            ctx.diagnose(meta.file, meta.line,
                `invalid diagram on ${object.kind} "${object.name}": ${error}`)
    }
}

