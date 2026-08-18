/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import JSON5                                      from "json5"
import { stringify as stringifyYaml }             from "yaml"
import { encode as encodeToon, type JsonValue }   from "@toon-format/toon"

import type { Specification, Object as SpecObject }
    from "./specbook-struct-spec.js"
import type { SchemaSpecification }
    from "./specbook-struct-schema.js"
import { specDiagrams }
    from "./specbook-diagram.js"

/*  the Abstract Syntax Tree (AST) export formats  */
export type AstFormat = "json" | "json5" | "yaml" | "toon"

/*  the plain JSON shape of the specification (as far as the
    diagram attachment below has to navigate it)  */
interface PlainObject        { diagram?: string, childs: PlainObject[] }
interface PlainSpecification { artifacts: { objects: PlainObject[] }[] }

/*  render the specification AST into a serialization format  */
export const renderAst = async (specification: Specification, format: AstFormat,
    config?: SchemaSpecification): Promise<Buffer> => {
    /*  reduce the specification to plain JSON values (ISO date strings)  */
    const plain = JSON.parse(JSON.stringify(specification)) as PlainSpecification

    /*  attach the Gradia specs of the diagram-configured objects as
        "diagram" fields onto the corresponding plain object nodes
        (an invalid diagram situation omits the diagram, as it is
        already reported as a lint diagnostic)  */
    if (config !== undefined) {
        const diagrams = specDiagrams(specification, config)
        const walk = (object: SpecObject, node: PlainObject) => {
            const result = diagrams.get(object)
            if (result?.spec !== undefined)
                node.diagram = result.spec
            object.childs.forEach((child, i) => walk(child, node.childs[i]))
        }
        specification.artifacts.forEach((artifact, i) =>
            artifact.objects.forEach((object, j) =>
                walk(object, plain.artifacts[i].objects[j])))
    }
    if (format === "json")
        return Buffer.from(JSON.stringify(plain, null, 4) + "\n", "utf8")
    else if (format === "json5")
        return Buffer.from(JSON5.stringify(plain, null, 4) + "\n", "utf8")
    else if (format === "yaml")
        return Buffer.from(stringifyYaml(plain), "utf8")
    else
        return Buffer.from(encodeToon(plain as unknown as JsonValue) + "\n", "utf8")
}
