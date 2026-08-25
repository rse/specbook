/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"

import textframe from "textframe"

/*  provide the build-time bundled description of the generic
    SpecBook models and formats  */
const description = (): string =>
    fs.readFileSync(new URL("specbook-format.md", import.meta.url), "utf8")

/*  describe the generic SpecBook models and formats as Markdown,
    optionally extended by the references to (or the embeddings of) the
    artifacts of the particular project instantiation  */
export const describeFormat = (options: { config?: string, basedir?: string, embed?: boolean }): string => {
    const sections = [ description() ]
    if (options.config !== undefined || options.basedir !== undefined) {
        sections.push(
            "SpecBook Project Instantiation\n" +
            "==============================\n")
        if (options.config !== undefined && options.embed === true)
            sections.push(textframe(`
                The **SpecBook SCHEMA Model** of this particular project is the following
                YAML schema configuration of the file \`${options.config}\`:
            `) + "\n```yaml\n" +
                fs.readFileSync(options.config, "utf8").replace(/\n*$/, "\n") +
                "```\n")
        else if (options.config !== undefined)
            sections.push(textframe(`
                The **SpecBook SCHEMA Model** of this particular project is the YAML
                schema configuration in the file \`${options.config}\`.
            `))
        if (options.basedir !== undefined)
            sections.push(textframe(`
                The **SpecBook SPEC Model** of this particular project is the set of
                specification Markdown files in the directory \`${options.basedir}\`.
            `))
    }
    return sections.join("\n")
}
