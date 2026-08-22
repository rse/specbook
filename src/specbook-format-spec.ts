/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v from "valibot"

/*  ==== Types ====  */

export type Spec = {
    artifacts:         SpecArtifact[]
}
export type SpecArtifact = {
    created:           Date
    modified:          Date
    objects:           SpecObject[]
}
export type SpecObject = {
    kind:              string
    id:                string
    anchor?:           string
    paren?:            string
    name:              string
    primary?:          boolean
    description?:      SpecDescription
    properties:        SpecProperty[]
    childs:            SpecObject[]
}
export type SpecDescription = {
    description:       string
    rationale?:        string
    embedding?:        string[]
}
export type SpecProperty = {
    key:               string
    value:             string
    embedding?:        string[]
}

/*  ==== Schema ====  */

const SpecProperty: v.GenericSchema<SpecProperty> = v.object({
    key:               v.string(),
    value:             v.string(),
    embedding:         v.optional(v.array(v.string()))
})
const SpecDescription: v.GenericSchema<SpecDescription> = v.object({
    description:       v.string(),
    rationale:         v.optional(v.string()),
    embedding:         v.optional(v.array(v.string()))
})
const SpecObject: v.GenericSchema<SpecObject> = v.object({
    kind:              v.string(),
    id:                v.string(),
    anchor:            v.optional(v.string()),
    paren:             v.optional(v.string()),
    name:              v.string(),
    primary:           v.optional(v.boolean()),
    description:       v.optional(SpecDescription),
    properties:        v.array(SpecProperty),
    childs:            v.array(v.lazy(() => SpecObject))
})
const SpecArtifact: v.GenericSchema<SpecArtifact> = v.object({
    created:           v.date(),
    modified:          v.date(),
    objects:           v.pipe(v.array(SpecObject), v.minLength(1))
})
export const Spec: v.GenericSchema<Spec> = v.object({
    artifacts:         v.pipe(v.array(SpecArtifact), v.minLength(1))
})

