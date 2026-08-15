/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import JSON5                                      from "json5"
import { stringify as stringifyYaml }             from "yaml"
import { encode as encodeToon, type JsonValue }   from "@toon-format/toon"

import type { Specification }
    from "./specbook-struct-spec.js"

/*  the Abstract Syntax Tree (AST) export formats  */
export type AstFormat = "json" | "json5" | "yaml" | "toon"

/*  render the specification AST into a serialization format  */
export const renderAst = (specification: Specification, format: AstFormat): Buffer => {
    /*  reduce the specification to plain JSON values (ISO date strings)  */
    const plain = (): JsonValue => JSON.parse(JSON.stringify(specification))
    if (format === "json")
        return Buffer.from(JSON.stringify(specification, null, 4) + "\n", "utf8")
    else if (format === "json5")
        return Buffer.from(JSON5.stringify(plain(), null, 4) + "\n", "utf8")
    else if (format === "yaml")
        return Buffer.from(stringifyYaml(plain()), "utf8")
    else
        return Buffer.from(encodeToon(plain()) + "\n", "utf8")
}
