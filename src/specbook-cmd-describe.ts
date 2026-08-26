/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"

import textframe from "textframe"

/*  the supported description output formats and document parts  */
export const describeFormats = [ "md", "raw" ] as const
export const describeParts   = [ "all", "meta", "schema", "spec" ] as const
export type DescribeFormat   = typeof describeFormats[number]
export type DescribePart     = typeof describeParts[number]

/*  parse and validate an output format or document part specification  */
const parseChoice = <T extends string>(choices: readonly T[], kind: string, value: string): T => {
    if (!(choices as readonly string[]).includes(value))
        throw new Error(`unknown describe ${kind} "${value}" ` +
            `(supported: ${choices.join(", ")})`)
    return value as T
}
export const parseDescribeFormat = (value: string): DescribeFormat =>
    parseChoice(describeFormats, "format", value)
export const parseDescribePart = (value: string): DescribePart =>
    parseChoice(describeParts, "part", value)

/*  provide the build-time bundled description of the generic
    SpecBook models and formats  */
const description = (): string =>
    fs.readFileSync(new URL("specbook-format.md", import.meta.url), "utf8")

/*  render the reference to (or the embedding of) the YAML schema configuration,
    where the bundled standard one is embedded without its leading comment block  */
const schemaSection = (config: string, embed: boolean, standard: boolean): string => {
    if (!embed)
        return textframe(`
            The **SpecBook SCHEMA Model** is the YAML schema configuration in file:
            @${config}
        `)
    let yaml = fs.readFileSync(config, "utf8")
    if (standard)
        yaml = yaml.replace(/^(?:[ \t]*##.*\n)+\s*/, "")
    return textframe(`
        The **SpecBook SCHEMA Model** is the following YAML schema configuration:
    `) + "\n```yaml\n" + yaml.replace(/\n*$/, "\n") + "```\n\n"
}

/*  render the reference to the specification Markdown files  */
const specSection = (basedir: string): string =>
    textframe(`
        The **SpecBook SPEC Model** is the set of Markdown specification files in directory:
        @${basedir}
    `) + "\n"

/*  describe the generic SpecBook models and formats as Markdown,
    optionally extended by the references to (or the embeddings of) the
    artifacts of the particular project instantiation, and optionally
    reduced to a single part or to the raw original file content, where
    "standard" marks the configuration as the bundled standard one,
    which still belongs to the generic description  */
export const describeFormat = (options: { config?: string, basedir?: string, embed?: boolean,
    standard?: boolean, format?: DescribeFormat, part?: DescribePart }): string => {
    const format = options.format ?? "md"
    const part   = options.part   ?? "all"
    if (!describeFormats.includes(format))
        throw new Error(`unknown describe format "${format}"`)
    if (!describeParts.includes(part))
        throw new Error(`unknown describe part "${part}"`)

    /*  the raw format emits the original file content of a single part,
        so it is available for the file-backed parts only  */
    if (format === "raw") {
        if (part === "all" || part === "spec")
            throw new Error(`format "raw" is not available for part "${part}", ` +
                "as this part is not backed by a single original file")
        else if (part === "meta")
            return description()
        else if (options.config === undefined)
            throw new Error("format \"raw\" for part \"schema\" requires a YAML schema configuration")
        else
            return fs.readFileSync(options.config, "utf8")
    }

    /*  the md format renders a single part standalone  */
    if (part === "meta")
        return description()
    else if (part === "schema") {
        if (options.config === undefined)
            throw new Error("part \"schema\" requires a YAML schema configuration")
        return schemaSection(options.config, options.embed === true, options.standard === true)
    }
    else if (part === "spec") {
        if (options.basedir === undefined)
            throw new Error("part \"spec\" requires a base directory")
        return specSection(options.basedir)
    }

    /*  the md format renders all parts as a single coherent document,
        where the schema configuration and the base directory are the
        artifacts of the project instantiation and hence are always
        placed under their own section  */
    const sections = [ description() ]
    const schema   = options.config !== undefined ?
        schemaSection(options.config, options.embed === true, options.standard === true) : undefined
    if (schema !== undefined || options.basedir !== undefined) {
        sections.push(
            "SpecBook Project Instantiation\n" +
            "==============================\n")
        if (schema !== undefined)
            sections.push(schema)
        if (options.basedir !== undefined)
            sections.push(specSection(options.basedir))
    }
    return sections.join("\n")
}
