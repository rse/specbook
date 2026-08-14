/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v from "valibot"

/*  ==== Types ====  */

export type SchemaSpecification = SchemaObject[]
export type SchemaObject = {
    kind:              string
    name?:             string
    id?:               string
    file?:             string
    desc?:             string
    optional?:         boolean
    props?:            SchemaProperty[]
    childs?:           SchemaObject[]
}
export type SchemaProperty = {
    name:              string
    desc?:             string
    value?:            string
    optional?:         boolean
}

/*  ==== Schema ====  */

const SchemaProperty: v.GenericSchema<SchemaProperty> = v.object({
    name:              v.string(),
    desc:              v.optional(v.string()),
    value:             v.optional(v.string()),
    optional:          v.optional(v.boolean())
})
const SchemaObject: v.GenericSchema<SchemaObject> = v.object({
    kind:              v.string(),
    name:              v.optional(v.string()),
    id:                v.optional(v.string()),
    file:              v.optional(v.string()),
    desc:              v.optional(v.string()),
    optional:          v.optional(v.boolean()),
    props:             v.optional(v.array(SchemaProperty)),
    childs:            v.optional(v.array(v.lazy(() => SchemaObject)))
})
export const SchemaSpecification: v.GenericSchema<SchemaSpecification> =
    v.pipe(v.array(SchemaObject), v.minLength(1))

