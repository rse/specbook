/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v  from "valibot"
import { Gradia, type Config as GradiaConfig } from "@rse/gradia"

/*  ==== Types ====  */

export type SchemaSpecification = SchemaObject[]
export type SchemaObject = {
    kind:              string
    name?:             string
    id?:               string
    file?:             string
    desc?:             string
    optional?:         boolean
    diagram?:          SchemaDiagram
    props?:            SchemaProperty[]
    childs?:           SchemaObject[]
}
export type SchemaDiagram = {
    type?:             "graph" | "hub" | "grid"
    nodes?:            string
    edges?:            string
    center?:           string
    links?:            "props" | "all"
    edgeTarget?:       string
    edgeArity?:        string
    hierarchy?:        boolean
    onlyConnected?:    boolean
    qualified?:        boolean
    config?:           Partial<GradiaConfig>
}
export type SchemaProperty = {
    name:              string
    desc?:             string
    value?:            string
    optional?:         boolean
}

/*  ==== Schema ====  */

/*  the Gradia rendering options, derived from the configuration
    defaults of Gradia: the option names constrain the allowed keys and
    the types of the default values constrain the allowed value types  */
const GradiaConfigSchemas = Object.fromEntries(
    Object.entries(Gradia.config).map(([ key, value ]) => [ key,
        typeof value === "boolean" ? v.boolean() : typeof value === "number" ? v.number() : v.string() ])
) as unknown as { [ K in keyof GradiaConfig ]: v.GenericSchema<GradiaConfig[K]> }
const SchemaDiagramConfig: v.GenericSchema<Partial<GradiaConfig>> =
    v.partial(v.strictObject(GradiaConfigSchemas, (issue) =>
        issue.expected === "never" ? "unknown Gradia rendering option" :
            "expected a map of Gradia rendering options"))

const SchemaProperty: v.GenericSchema<SchemaProperty> = v.object({
    name:              v.string(),
    desc:              v.optional(v.string()),
    value:             v.optional(v.string()),
    optional:          v.optional(v.boolean())
})
const SchemaDiagram: v.GenericSchema<SchemaDiagram> = v.object({
    type:              v.optional(v.picklist([ "graph", "hub", "grid" ])),
    nodes:             v.optional(v.string()),
    edges:             v.optional(v.string()),
    center:            v.optional(v.string()),
    links:             v.optional(v.picklist([ "props", "all" ])),
    edgeTarget:        v.optional(v.string()),
    edgeArity:         v.optional(v.string()),
    hierarchy:         v.optional(v.boolean()),
    onlyConnected:     v.optional(v.boolean()),
    qualified:         v.optional(v.boolean()),
    config:            v.optional(SchemaDiagramConfig)
})
const SchemaObject: v.GenericSchema<SchemaObject> = v.object({
    kind:              v.string(),
    name:              v.optional(v.string()),
    id:                v.optional(v.string()),
    file:              v.optional(v.string()),
    desc:              v.optional(v.string()),
    optional:          v.optional(v.boolean()),
    diagram:           v.optional(SchemaDiagram),
    props:             v.optional(v.array(SchemaProperty)),
    childs:            v.optional(v.array(v.lazy(() => SchemaObject)))
})
export const SchemaSpecification: v.GenericSchema<SchemaSpecification> =
    v.pipe(v.array(SchemaObject), v.minLength(1))

