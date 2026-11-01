/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v from "valibot"
import { Gradia, type Config as GradiaConfig } from "@rse/gradia"

/*  ==== Types ====  */

/*  the whole schema: the object kinds the corpus consists of  */
export type Schema = SchemaObject[]

/*  an object kind: an artifact (level 1, with its "file" and exact
    "name") or an object nested below it (with a "name" regex), the
    reference coverage every object of the kind has to receive, the
    reference coverage every object of the kind reports, the finite
    state machine its child objects optionally form, and the badge
    icon and the multiplicity of its objects in the diagrams  */
export type SchemaObject = {
    kind:              string
    name?:             string
    id?:               string
    file?:             string
    desc?:             string
    refs?:             string
    optional?:         boolean
    referenced?:       string[]
    coverage?:         string[]
    automaton?:        SchemaAutomaton
    badge?:            SchemaBadge
    multiple?:         SchemaMultiple
    diagram?:          SchemaDiagram | SchemaDiagram[]
    format?:           SchemaFormat
    props?:            SchemaProperty[]
    children?:         SchemaObject[]
}

/*  the badge icons Gradia draws inside a node box (mirroring its
    unexported list, as Gradia silently ignores an unknown icon)  */
export const badgeIcons = [ "person", "team", "bot", "device", "mobile", "browser", "service",
    "function", "api", "code", "package", "database", "cache", "queue", "document", "mail",
    "communication", "clock", "security", "cloud", "network" ] as const
export type BadgeIcon = typeof badgeIcons[number]

/*  the several instances an object of an object kind stands for in
    every diagram (drawn as a stack of node boxes): the property telling
    the number of instances and the (unanchored) regular expression its
    value has to match for several of them  */
export type SchemaMultiple = {
    property:          string
    pattern:           string
}

/*  the node attribute keys Gradia consumes instead of displaying them
    (generally, or for one of its diagram types), which hence cannot
    name a displayed diagram property  */
export const reservedAttributes = [ "url", "type", "primary", "group", "cluster", "parent",
    "container", "order", "badge", "multiple", "mark", "layer", "slice", "state", "region",
    "petri", "tokens", "capacity", "duration", "start" ] as const

/*  the badge icon of the objects of an object kind in every diagram:
    a fixed icon, or the icon the value of a property maps onto
    (else the default icon, else none)  */
export type SchemaBadge = BadgeIcon | {
    property:          string
    map:               Record<string, BadgeIcon>
    default?:          BadgeIcon
}

/*  the finite state machine the child objects of an object kind form:
    the child kinds acting as nodes and edges, the edge properties
    referencing the source and target nodes, and the node properties
    flagging (with the value "true") the initial and final nodes  */
export type SchemaAutomaton = {
    nodes:             string
    edges:             string
    source:            string
    target:            string
    initial:           string
    final:             string
}

/*  a synthetic center node of a "hub" diagram: its label comes from a
    referenced source object (or one of its properties) or a literal
    text, and its displayed type from "kind" (under "qualified")  */
export type SchemaDiagramCenter = {
    source?:           string
    property?:         string
    label?:            string
    kind?:             string
}

/*  the synthesized center edges of a "hub" diagram: the direction
    property of the node objects, the values mapping onto a
    node-to-center, center-to-node, or two-fold edge, and the
    property naming the edges  */
export type SchemaDiagramCenterEdges = {
    property:          string
    inbound?:          string
    outbound?:         string
    both?:             string
    labeled?:          string
    via?:              string
}

/*  the nesting of the nodes of a diagram into container nodes: the
    properties whose referenced object becomes the container (the first
    resolvable one wins), the parent object as the container, a
    synthetic container per object kind, the layout of the members, and
    the ends of the boundary-crossing edges lifted onto the containers  */
export type SchemaDiagramNest = {
    properties?:       string[]
    parent?:           boolean
    kind?:             boolean
    layout?:           "graph" | "hub" | "grid"
    crossing?:         "nodes" | "target" | "both"
}

/*  the diagram derived for every object of an object kind: its shape,
    its node/edge selection (optionally restricted to the object itself
    and its descendants), the edge property roles, the derivation
    switches, the node nesting, and the node annotations  */
export type SchemaDiagram = {
    type?:             "graph" | "hub" | "grid" | "state" | "layer" | "slice" | "tree" | "matrix"
    nodes?:            string
    edges?:            string
    local?:            boolean
    center?:           string | SchemaDiagramCenter
    centerEdges?:      SchemaDiagramCenterEdges
    links?:            "props" | "all" | string[]
    labeled?:          boolean
    edgeSource?:       string
    edgeTarget?:       string
    edgeArity?:        string
    edgeGuard?:        string
    hierarchy?:        boolean
    deep?:             boolean
    onlyConnected?:    boolean
    collapse?:         boolean
    qualified?:        boolean
    ordered?:          boolean
    markUncovered?:    "none" | "referenced" | "coverage" | "all"
    nest?:             SchemaDiagramNest
    properties?:       string[]
    config?:           Partial<GradiaConfig>
}

/*  the HTML/PDF rendering of the objects of an object kind among their
    siblings: "complex" (sections), "concise" (tables), "compact" (tables
    with complex-like cells), or "auto"  */
export type SchemaFormat = {
    type?:             "auto" | "complex" | "compact" | "concise"
    maxTableColumns?:  number
    maxCellHeight?:    number
    withUnusedProps?:  boolean
}

/*  a property allowed on the objects of an object kind, with its
    value constraint (regexp, link, enum, tags, or list expression),
    its uniqueness and presence among the sibling objects (all values,
    or only the values matching a regexp or enum expression), and the
    locality and relation shape of a reference-valued property
    (local, symmetric, and/or acyclic)  */
export type SchemaProperty = {
    name:              string
    desc?:             string
    value?:            string
    optional?:         boolean
    unique?:           boolean | string
    present?:          boolean | string
    local?:            boolean
    symmetric?:        boolean
    acyclic?:          boolean
}

/*  ==== Schema ====  */

/*  the Gradia rendering options, derived from the configuration
    defaults of Gradia: the option names constrain the allowed keys and
    the types of the default values constrain the allowed value types
    (with the numbers restricted to the finite, non-negative values
    Gradia honors, as it silently drops all others)  */
const GradiaConfigSchemas = Object.fromEntries(
    Object.entries(Gradia.config).map(([ key, value ]) => [ key,
        typeof value === "boolean" ? v.boolean() :
            typeof value === "number" ? v.pipe(v.number(), v.finite(), v.minValue(0)) : v.string() ])
) as unknown as { [ K in keyof GradiaConfig ]: v.GenericSchema<GradiaConfig[K]> }
const SchemaDiagramConfig: v.GenericSchema<Partial<GradiaConfig>> =
    v.partial(v.strictObject(GradiaConfigSchemas, (issue) =>
        issue.expected === "never" ? "unknown Gradia rendering option" :
            "expected a map of Gradia rendering options"))

/*  the Valibot schemas mirroring the types above, with the object
    kind schema referencing itself lazily for the nested children  */
const SchemaProperty: v.GenericSchema<SchemaProperty> = v.strictObject({
    name:              v.string(),
    desc:              v.optional(v.string()),
    value:             v.optional(v.string()),
    optional:          v.optional(v.boolean()),
    unique:            v.optional(v.union([ v.boolean(), v.string() ])),
    present:           v.optional(v.union([ v.boolean(), v.string() ])),
    local:             v.optional(v.boolean()),
    symmetric:         v.optional(v.boolean()),
    acyclic:           v.optional(v.boolean())
})
const SchemaAutomaton: v.GenericSchema<SchemaAutomaton> = v.strictObject({
    nodes:             v.string(),
    edges:             v.string(),
    source:            v.string(),
    target:            v.string(),
    initial:           v.string(),
    final:             v.string()
})
const SchemaBadgeIcon = v.picklist(badgeIcons)
const SchemaBadge: v.GenericSchema<SchemaBadge> = v.union([
    SchemaBadgeIcon,
    v.strictObject({
        property:      v.string(),
        map:           v.record(v.string(), SchemaBadgeIcon),
        default:       v.optional(SchemaBadgeIcon)
    })
])
const SchemaMultiple: v.GenericSchema<SchemaMultiple> = v.strictObject({
    property:          v.string(),
    pattern:           v.string()
})
const SchemaDiagramCenter: v.GenericSchema<SchemaDiagramCenter> = v.strictObject({
    source:            v.optional(v.string()),
    property:          v.optional(v.string()),
    label:             v.optional(v.string()),
    kind:              v.optional(v.string())
})
const SchemaDiagramCenterEdges: v.GenericSchema<SchemaDiagramCenterEdges> = v.strictObject({
    property:          v.string(),
    inbound:           v.optional(v.string()),
    outbound:          v.optional(v.string()),
    both:              v.optional(v.string()),
    labeled:           v.optional(v.string()),
    via:               v.optional(v.string())
})
const SchemaDiagramNest: v.GenericSchema<SchemaDiagramNest> = v.strictObject({
    properties:        v.optional(v.array(v.string())),
    parent:            v.optional(v.boolean()),
    kind:              v.optional(v.boolean()),
    layout:            v.optional(v.picklist([ "graph", "hub", "grid" ])),
    crossing:          v.optional(v.picklist([ "nodes", "target", "both" ]))
})
const SchemaDiagram: v.GenericSchema<SchemaDiagram> = v.strictObject({
    type:              v.optional(v.picklist([ "graph", "hub", "grid", "state", "layer", "slice", "tree",
        "matrix" ])),
    nodes:             v.optional(v.string()),
    edges:             v.optional(v.string()),
    local:             v.optional(v.boolean()),
    center:            v.optional(v.union([ v.string(), SchemaDiagramCenter ])),
    centerEdges:       v.optional(SchemaDiagramCenterEdges),
    links:             v.optional(v.union([ v.picklist([ "props", "all" ]), v.array(v.string()) ])),
    labeled:           v.optional(v.boolean()),
    edgeSource:        v.optional(v.string()),
    edgeTarget:        v.optional(v.string()),
    edgeArity:         v.optional(v.string()),
    edgeGuard:         v.optional(v.string()),
    hierarchy:         v.optional(v.boolean()),
    deep:              v.optional(v.boolean()),
    onlyConnected:     v.optional(v.boolean()),
    collapse:          v.optional(v.boolean()),
    qualified:         v.optional(v.boolean()),
    ordered:           v.optional(v.boolean()),
    markUncovered:     v.optional(v.picklist([ "none", "referenced", "coverage", "all" ])),
    nest:              v.optional(SchemaDiagramNest),
    properties:        v.optional(v.array(v.string())),
    config:            v.optional(SchemaDiagramConfig)
})
const SchemaFormat: v.GenericSchema<SchemaFormat> = v.strictObject({
    type:              v.optional(v.picklist([ "auto", "complex", "compact", "concise" ])),
    maxTableColumns:   v.optional(v.pipe(v.number(), v.integer(), v.minValue(2))),
    maxCellHeight:     v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
    withUnusedProps:   v.optional(v.boolean())
})
const SchemaObject: v.GenericSchema<SchemaObject> = v.strictObject({
    kind:              v.string(),
    name:              v.optional(v.string()),
    id:                v.optional(v.string()),
    file:              v.optional(v.string()),
    desc:              v.optional(v.string()),
    refs:              v.optional(v.string()),
    optional:          v.optional(v.boolean()),
    referenced:        v.optional(v.pipe(v.array(v.string()), v.minLength(1))),
    coverage:          v.optional(v.pipe(v.array(v.string()), v.minLength(1))),
    automaton:         v.optional(SchemaAutomaton),
    badge:             v.optional(SchemaBadge),
    multiple:          v.optional(SchemaMultiple),
    diagram:           v.optional(v.union([ SchemaDiagram, v.pipe(v.array(SchemaDiagram), v.minLength(1)) ])),
    format:            v.optional(SchemaFormat),
    props:             v.optional(v.array(SchemaProperty)),
    children:          v.optional(v.array(v.lazy(() => SchemaObject)))
})
export const Schema: v.GenericSchema<Schema> =
    v.pipe(v.array(SchemaObject), v.minLength(1))

/*  ==== Helpers ====  */

/*  the diagrams configured on an object kind: none, a single one,
    or a list of them, normalized into a list  */
export const diagramsOf = (schema: SchemaObject | undefined): SchemaDiagram[] =>
    schema?.diagram === undefined ? [] : Array.isArray(schema.diagram) ? schema.diagram : [ schema.diagram ]

