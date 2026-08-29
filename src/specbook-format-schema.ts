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
    "name") or an object nested below it (with a "name" regex)  */
export type SchemaObject = {
    kind:              string
    name?:             string
    id?:               string
    file?:             string
    desc?:             string
    optional?:         boolean
    diagram?:          SchemaDiagram
    format?:           SchemaFormat
    props?:            SchemaProperty[]
    childs?:           SchemaObject[]
}

/*  the diagram derived for every object of an object kind: its shape,
    its node/edge selection, the edge property roles, the derivation
    switches, and the node annotations  */
export type SchemaDiagram = {
    type?:             "graph" | "hub" | "grid"
    nodes?:            string
    edges?:            string
    center?:           string
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

/*  the HTML/PDF rendering of the child objects of an object kind:
    "complex" (sections), "concise" (tables), or "auto"  */
export type SchemaFormat = {
    type?:             "auto" | "complex" | "concise"
    maxTableColumns?:  number
    withUnusedProps?:  boolean
}

/*  a property allowed on the objects of an object kind, with its
    value constraint (regexp, link, enum, tags, or list expression) and
    its uniqueness among the sibling objects (all values, or only the
    values matching a regexp or enum expression)  */
export type SchemaProperty = {
    name:              string
    desc?:             string
    value?:            string
    optional?:         boolean
    unique?:           boolean | string
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
    unique:            v.optional(v.union([ v.boolean(), v.string() ]))
})
const SchemaDiagram: v.GenericSchema<SchemaDiagram> = v.strictObject({
    type:              v.optional(v.picklist([ "graph", "hub", "grid" ])),
    nodes:             v.optional(v.string()),
    edges:             v.optional(v.string()),
    center:            v.optional(v.string()),
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
    optional:          v.optional(v.boolean()),
    diagram:           v.optional(SchemaDiagram),
    format:            v.optional(SchemaFormat),
    props:             v.optional(v.array(SchemaProperty)),
    childs:            v.optional(v.array(v.lazy(() => SchemaObject)))
})
export const Schema: v.GenericSchema<Schema> =
    v.pipe(v.array(SchemaObject), v.minLength(1))

