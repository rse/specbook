/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"

import textframe                                     from "textframe"
import { parseDocument, stringify, visit, isScalar } from "yaml"

import { type Schema } from "./specbook-format-schema.js"

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

/*  the supported compression levels of the emitted YAML schema
    configuration: verbatim (0), re-emitted with 2-space indentation and
    without comments (1), additionally without its "refs" fields (2), and
    additionally without its "desc" fields of objects and properties (3)  */
export const compressLevels = [ 0, 1, 2, 3 ] as const
export type CompressLevel   = typeof compressLevels[number]

/*  parse and validate a compression level specification,
    where a bare flag selects the plain re-emitting  */
export const parseCompressLevel = (value: string | number | boolean): CompressLevel => {
    const level = typeof value === "boolean" ? (value ? 1 : 0) :
        typeof value === "string" && !(/^\d+$/).test(value) ? NaN : Number(value)
    if (!(compressLevels as readonly number[]).includes(level))
        throw new Error(`unknown compress level "${value}" ` +
            `(supported: ${compressLevels.join(", ")})`)
    return level as CompressLevel
}

/*  provide the build-time bundled description of the generic
    SpecBook models and formats  */
const description = (): string =>
    fs.readFileSync(new URL("specbook-format.md", import.meta.url), "utf8")

/*  compress the YAML schema configuration text by re-emitting the parsed
    document (block scalar styles retained) with 2-space indentation and
    unwrapped lines, dropping all comments and the fields the level demands  */
const compressYaml = (yaml: string, level: CompressLevel): string => {
    if (level === 0)
        return yaml
    const doc  = parseDocument(yaml)
    const drop = [ "refs", "desc" ].slice(0, level - 1)
    doc.commentBefore = null
    doc.comment       = null
    visit(doc, {
        Node: (_, node) => {
            node.commentBefore = null
            node.comment       = null
        },
        Pair: (_, pair) =>
            isScalar(pair.key) && drop.includes(String(pair.key.value)) ? visit.REMOVE : undefined
    })
    return doc.toString({ indent: 2, lineWidth: 0 })
}

/*  provide the YAML text of the schema configuration: the verbatim
    content of its single file, or the merged configuration re-emitted
    for several files (as no single file carries their merge)  */
const schemaYaml = (config: string[], schema?: Schema): string => {
    if (config.length === 1)
        return fs.readFileSync(config[0], "utf8")
    if (schema === undefined)
        throw new Error("re-emitting the merged YAML schema configuration requires its loaded configuration")
    return stringify(schema, { indent: 2, lineWidth: 0 })
}

/*  render the reference to (or the embedding of) the YAML schema configuration,
    where the bundled standard one is embedded without its leading comment block  */
const schemaSection = (config: string[], schema: Schema | undefined,
    embed: boolean, standard: boolean, compress: CompressLevel): string => {
    if (!embed)
        return "The **SpecBook SCHEMA Model** is the YAML schema configuration " +
            `${config.length > 1 ? "merged in order out of the files" : "in file"}:\n` +
            config.map((file) => `@${file}\n`).join("")
    let yaml = schemaYaml(config, schema)
    if (standard)
        yaml = yaml.replace(/^(?:[ \t]*##.*\n)+\s*/, "")
    yaml = compressYaml(yaml, compress)
    return textframe(`
        The **SpecBook SCHEMA Model** is the following YAML schema configuration:
    `) + "\n```yaml\n" + yaml.replace(/\n*$/, "\n") + "```\n"
}

/*  render the reference to the specification Markdown files  */
const specSection = (basedir: string): string =>
    textframe(`
        The **SpecBook SPEC Model** is the set of Markdown specification files in directory:
        @${basedir}
    `)

/*  describe the generic SpecBook models and formats as Markdown,
    optionally extended by the references to (or the embeddings of) the
    artifacts of the particular project instantiation, and optionally
    reduced to a single part or to the raw original file content, where
    "standard" marks the configuration as the bundled standard one,
    which still belongs to the generic description, where "schema" is
    the configuration loaded out of the "config" files (required for
    embedding several files), and where "compress" emits the
    configuration compressed by the given level instead of verbatim  */
export const describeFormat = (options: { config?: string[], schema?: Schema, basedir?: string, embed?: boolean,
    standard?: boolean, compress?: CompressLevel, format?: DescribeFormat, part?: DescribePart }): string => {
    const format   = parseDescribeFormat(options.format ?? "md")
    const part     = parseDescribePart(options.part ?? "all")
    const compress = parseCompressLevel(options.compress ?? 1)

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
        else {
            const yaml = schemaYaml(options.config, options.schema)
            return compressYaml(yaml, compress)
        }
    }

    /*  the md format renders a single part standalone  */
    if (part === "meta")
        return description()
    else if (part === "schema") {
        if (options.config === undefined)
            throw new Error("part \"schema\" requires a YAML schema configuration")
        return schemaSection(options.config, options.schema,
            options.embed === true, options.standard === true, compress)
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
    const sections   = [ description() ]
    const schemaText = options.config !== undefined ?
        schemaSection(options.config, options.schema,
            options.embed === true, options.standard === true, compress) : undefined
    if (schemaText !== undefined || options.basedir !== undefined) {
        sections.push(
            "SpecBook Project Instantiation\n" +
            "==============================\n")
        if (schemaText !== undefined)
            sections.push(schemaText)
        if (options.basedir !== undefined)
            sections.push(specSection(options.basedir))
    }
    return sections.join("\n")
}
