/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as v from "valibot"

import { Specification, type Artifact }
    from "./specbook-format-spec.js"
import { type SchemaSpecification }
    from "./specbook-format-schema.js"
import { buildLinkIndex }
    from "./specbook-link.js"
import { ParseContext, type SourceFile, type ParseResult }
    from "./specbook-parse-common.js"
import { parseFile }
    from "./specbook-parse-syntax.js"
import { validate, validateReferences }
    from "./specbook-parse-semantic.js"
import { validateDiagrams }
    from "./specbook-diagram.js"

/*  re-export the public parsing types and embedding helpers  */
export { type SourceFile, type ParseResult, embeddingRegex, embeddingMimeType }
    from "./specbook-parse-common.js"

/*  parser for a set of specification Markdown files  */
export class Parser {
    private ctx = new ParseContext()

    /*  parse all source files into the specification AST and
        optionally validate the result against a configuration  */
    parse (sources: SourceFile[], config?: SchemaSpecification): ParseResult {
        /*  reset the parsing context to allow a reuse of the parser  */
        this.ctx = new ParseContext()

        /*  parse all source files into their artifacts  */
        const artifacts = new Array<Artifact>()
        for (const source of sources)
            artifacts.push(...parseFile(this.ctx, source))
        const specification: Specification = { artifacts }

        /*  validate the resulting specification AST  */
        if (artifacts.length > 0) {
            this.ctx.linkIndex = buildLinkIndex(specification)
            if (config !== undefined)
                validate(this.ctx, specification, config)
            validateReferences(this.ctx, specification)
            if (config !== undefined)
                validateDiagrams(this.ctx, specification, config)
            const result = v.safeParse(Specification, specification)
            if (!result.success)
                for (const issue of result.issues) {
                    const path = (issue.path ?? []).map((item) => String(item.key)).join(".")
                    this.ctx.diagnose(sources[0]?.file ?? "", 1, `internal AST invalid at "${path}": ${issue.message}`)
                }
        }
        return { specification, diagnostics: this.ctx.diagnostics }
    }
}

/*  convenience wrapper for one-shot parsing  */
export const parseSpecification = (sources: SourceFile[], config?: SchemaSpecification): ParseResult =>
    new Parser().parse(sources, config)
