/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v from "valibot"

/*  ==== Types ====  */

export type Specification = {
    artifacts:         Artifact[]
}
export type Artifact = {
    created:           Date
    modified:          Date
    objects:           Object[]
}
export type Object = {
    kind:              string
    id:                string
    anchor?:           string
    paren?:            string
    name:              string
    primary?:          boolean
    description?:      Description
    properties:        Property[]
    childs:            Object[]
}
export type Description = {
    description:       string
    rationale?:        string
    embedding?:        string[]
}
export type Property = {
    key:               string
    value:             string
}

/*  ==== Schema ====  */

const Property: v.GenericSchema<Property> = v.object({
    key:               v.string(),
    value:             v.string()
})
const Description: v.GenericSchema<Description> = v.object({
    description:       v.string(),
    rationale:         v.optional(v.string()),
    embedding:         v.optional(v.array(v.string()))
})
const Object: v.GenericSchema<Object> = v.object({
    kind:              v.string(),
    id:                v.string(),
    anchor:            v.optional(v.string()),
    paren:             v.optional(v.string()),
    name:              v.string(),
    primary:           v.optional(v.boolean()),
    description:       v.optional(Description),
    properties:        v.array(Property),
    childs:            v.array(v.lazy(() => Object))
})
const Artifact: v.GenericSchema<Artifact> = v.object({
    created:           v.date(),
    modified:          v.date(),
    objects:           v.pipe(v.array(Object), v.minLength(1))
})
export const Specification: v.GenericSchema<Specification> = v.object({
    artifacts:         v.pipe(v.array(Artifact), v.minLength(1))
})

