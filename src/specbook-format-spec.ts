/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v from "valibot"

/*  ==== Types ====  */

/*  the whole specification: the artifacts the corpus consists of  */
export type Spec = {
    artifacts:         SpecArtifact[]
}

/*  a single artifact: one level 1 heading plus its file timestamps  */
export type SpecArtifact = {
    created:           Date
    modified:          Date
    objects:           SpecObject[]
}

/*  an object of the artifact tree (the atom of a specification), with
    the explicit "{{xxx}}" anchor, the parenthesized "(xxx)" token, and
    the "(*)" primary marker optionally taken from its heading  */
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

/*  the description of an object: statement, rationale, and the
    contents of its embedded image files (one entry per file)  */
export type SpecDescription = {
    description:       string
    rationale?:        string
    embedding?:        string[]
}

/*  a key/value property of an object, with the contents of the
    image files embedded into its value (one entry per file)  */
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

