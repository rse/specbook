/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

import { literal, type Verbose }           from "./specbook-verbose.js"
import { type Schema, type SchemaObject }  from "./specbook-format-schema.js"
import { renderDiagnostic }                from "./specbook-diagnostic.js"
import { parseSpecification, specStatistics, type SourceFile }
    from "./specbook-parse.js"
import { formatTimestamp, renderObjectMd } from "./specbook-export-md.js"
import { titleProperties }                 from "./specbook-export-common.js"
import { sampleArtifacts, wrapSample }     from "./specbook-cmd-init-sample.js"

/*  the options of the init command  */
export interface InitOptions {
    config:  Schema
    basedir: string
    sample:  boolean
    verbose: Verbose
}

/*  render the property list of the title artifact, seeding the properties
    the exports interpret themselves with their rendering defaults (as far
    as the schema configures them, as any other is reported as unknown)  */
const titleList = (artifact: SchemaObject): string => {
    if (artifact.kind !== "META" || artifact.name?.toUpperCase() !== "TITLE")
        return ""
    const props = titleProperties.filter((prop) =>
        artifact.props?.some((p) => p.name === prop.name) === true)
    if (props.length === 0)
        return ""
    const width = Math.max(...props.map((prop) => prop.name.length)) + 2
    return props.map((prop) =>
        `-   ${`${prop.name}:`.padEnd(width)}${prop.init}`.trimEnd() + "\n").join("") + "\n"
}

/*  initialize the configured specification artifact files below the
    base directory with their frontmatter and artifact headings (plus
    the title properties), or, under "sample", with a sample object per
    allowed object kind, where
    all artifacts configured onto the same file reside in it side by
    side, following each other on level 1  */
export const initSpecification = (options: InitOptions): string[] => {
    fs.mkdirSync(options.basedir, { recursive: true })
    const now     = formatTimestamp(new Date())
    const created = new Array<string>()

    /*  group the configured artifacts by their file, preserving the
        schema order both of the files and of the artifacts within,
        and skipping the already existing files  */
    const groups = new Map<string, SchemaObject[]>()
    for (const artifact of options.config) {
        if (artifact.file === undefined)
            continue
        const group = groups.get(artifact.file)
        if (group === undefined)
            groups.set(artifact.file, [ artifact ])
        else
            group.push(artifact)
    }
    for (const file of groups.keys())
        if (fs.existsSync(path.join(options.basedir, file))) {
            options.verbose(`skipping existing artifact file "${literal(file)}"`)
            groups.delete(file)
        }

    /*  generate the sample objects over the artifacts of all files to
        be created at once, as the references of the sample reach
        across the files  */
    const samples = options.sample ?
        sampleArtifacts(Array.from(groups.values()).flat()) : undefined

    /*  create each absent artifact file with its frontmatter and
        the level 1 headings of its artifacts (or their sample objects)  */
    const sources = new Array<SourceFile>()
    for (const [ file, artifacts ] of groups) {
        const target   = path.join(options.basedir, file)
        const headings = artifacts.map((artifact) => {
            const sample = samples?.get(artifact)
            if (sample !== undefined)
                return `${wrapSample(renderObjectMd(sample, 1))}\n\n`
            const name  = artifact.name ?? ""
            const paren = artifact.id !== undefined ? ` (${artifact.id})` : ""
            return `#   ${artifact.kind}: ${name}${paren}\n\n` + titleList(artifact)
        }).join("")
        const text =
            "---\n" +
            `Created:  ${now}\n` +
            `Modified: ${now}\n` +
            "---\n" +
            "\n" +
            headings
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, text, "utf8")
        options.verbose(`created artifact file "${literal(file)}" ` +
            `with ${literal(artifacts.length)} artifact(s)`)
        sources.push({ file: target, text })
        created.push(file)
    }

    /*  check the generated sample, as the generation satisfies the
        constraints of the schema configuration on a best-effort basis
        only, reporting the errors unconditionally (the files stay, as
        they are the starting point to fix) and the warnings (like the
        coverage lapses) as regular notices  */
    if (samples !== undefined && sources.length > 0) {
        const result = parseSpecification(sources, options.config)
        const stats  = specStatistics(result.specification)
        options.verbose(`generated sample defining ${literal(stats.objects)} object(s) ` +
            `and ${literal(stats.links)} link relationship(s)`)
        for (const diagnostic of result.diagnostics)
            options.verbose(renderDiagnostic(diagnostic), diagnostic.severity === "error" ? "none" : "notice")
    }
    return created
}
