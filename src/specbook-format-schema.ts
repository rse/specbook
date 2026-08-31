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
    reference coverage every object of the kind has to receive, and the
    finite state machine its child objects optionally form  */
export type SchemaObject = {
    kind:              string
    name?:             string
    id?:               string
    file?:             string
    desc?:             string
    refs?:             string
    optional?:         boolean
    referenced?:       string[]
    automaton?:        SchemaAutomaton
    diagram?:          SchemaDiagram
    format?:           SchemaFormat
    props?:            SchemaProperty[]
    childs?:           SchemaObject[]
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
}

/*  the diagram derived for every object of an object kind: its shape,
    its node/edge selection, the edge property roles, the derivation
    switches, and the node annotations  */
export type SchemaDiagram = {
    type?:             "graph" | "hub" | "grid"
    nodes?:            string
    edges?:            string
    center?:           string | SchemaDiagramCenter
    centerEdges?:      SchemaDiagramCenterEdges
    links?:            "props" | "all"
    labeled?:          boolean
    edgeSource?:       string
    edgeTarget?:       string
    edgeArity?:        string
    hierarchy?:        boolean
    deep?:             boolean
    onlyConnected?:    boolean
    collapse?:         boolean
    qualified?:        boolean
    properties?:       string[]
    config?:           Partial<GradiaConfig>
}

/*  the HTML/PDF rendering of the objects of an object kind among their
    siblings: "complex" (sections), "concise" (tables), or "auto"  */
export type SchemaFormat = {
    type?:             "auto" | "complex" | "concise"
    maxTableColumns?:  number
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
    labeled:           v.optional(v.string())
})
const SchemaDiagram: v.GenericSchema<SchemaDiagram> = v.strictObject({
    type:              v.optional(v.picklist([ "graph", "hub", "grid" ])),
    nodes:             v.optional(v.string()),
    edges:             v.optional(v.string()),
    center:            v.optional(v.union([ v.string(), SchemaDiagramCenter ])),
    centerEdges:       v.optional(SchemaDiagramCenterEdges),
    links:             v.optional(v.picklist([ "props", "all" ])),
    labeled:           v.optional(v.boolean()),
    edgeSource:        v.optional(v.string()),
    edgeTarget:        v.optional(v.string()),
    edgeArity:         v.optional(v.string()),
    hierarchy:         v.optional(v.boolean()),
    deep:              v.optional(v.boolean()),
    onlyConnected:     v.optional(v.boolean()),
    collapse:          v.optional(v.boolean()),
    qualified:         v.optional(v.boolean()),
    properties:        v.optional(v.array(v.string())),
    config:            v.optional(SchemaDiagramConfig)
})
const SchemaFormat: v.GenericSchema<SchemaFormat> = v.strictObject({
    type:              v.optional(v.picklist([ "auto", "complex", "concise" ])),
    maxTableColumns:   v.optional(v.pipe(v.number(), v.integer(), v.minValue(2))),
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
    automaton:         v.optional(SchemaAutomaton),
    diagram:           v.optional(SchemaDiagram),
    format:            v.optional(SchemaFormat),
    props:             v.optional(v.array(SchemaProperty)),
    childs:            v.optional(v.array(v.lazy(() => SchemaObject)))
})
export const Schema: v.GenericSchema<Schema> =
    v.pipe(v.array(SchemaObject), v.minLength(1))

