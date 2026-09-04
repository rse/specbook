/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v from "valibot"

import { Spec, type SpecArtifact, type SpecObject }
    from "./specbook-format-spec.js"
import { type Schema }
    from "./specbook-format-schema.js"
import { buildLinkIndex, referenceRegex, plainText }
    from "./specbook-link.js"
import { ParseContext, type SourceFile, type ParseResult }
    from "./specbook-parse-common.js"
import { parseFile }
    from "./specbook-parse-syntax.js"
import { validate, validateReferences }
    from "./specbook-parse-semantic.js"
import { validateDiagrams }
    from "./specbook-diagram.js"

/*  re-export the public parsing types and helpers  */
export { type SourceFile, type ParseResult }
    from "./specbook-parse-common.js"
export { resolveArtifact }
    from "./specbook-parse-semantic.js"

/*  parse a set of specification Markdown files into the specification
    AST and optionally validate the result against a configuration  */
export const parseSpecification = (sources: SourceFile[], config?: Schema): ParseResult => {
    /*  create a fresh parsing context for this parsing run  */
    const ctx = new ParseContext()

    /*  parse all source files into their artifacts  */
    const artifacts = new Array<SpecArtifact>()
    for (const source of sources)
        artifacts.push(...parseFile(ctx, source))
    const specification: Spec = { artifacts }

    /*  validate the resulting specification AST  */
    if (artifacts.length > 0) {
        ctx.linkIndex = buildLinkIndex(specification)
        if (config !== undefined)
            validate(ctx, specification, config)
        validateReferences(ctx, specification)
        if (config !== undefined)
            validateDiagrams(ctx, specification, config)
        const result = v.safeParse(Spec, specification)
        if (!result.success)
            for (const issue of result.issues) {
                const path = v.getDotPath(issue) ?? ""
                ctx.diagnose(sources[0].file, 1, `internal AST invalid at "${path}": ${issue.message}`)
            }
    }
    return { specification, diagnostics: ctx.diagnostics, assets: Array.from(ctx.assets) }
}

/*  the statistics of a specification: the number of defined objects
    (recursively) and of relationships, i.e. the Wiki-style references
    in the names, property values, descriptions, and rationales  */
export const specStatistics = (specification: Spec): { objects: number, links: number } => {
    let objects = 0
    let links   = 0
    const walk = (object: SpecObject) => {
        objects++
        const texts = [ object.name, ...object.properties.map((p) => p.value) ]
        if (object.description !== undefined)
            texts.push(object.description.description, object.description.rationale ?? "")
        for (const text of texts)
            links += (plainText(text).match(referenceRegex) ?? []).length
        object.childs.forEach(walk)
    }
    for (const artifact of specification.artifacts)
        artifact.objects.forEach(walk)
    return { objects, links }
}
