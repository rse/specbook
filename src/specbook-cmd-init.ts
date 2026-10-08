/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

import { literal, type Verbose }          from "./specbook-verbose.js"
import { type Schema, type SchemaObject } from "./specbook-format-schema.js"
import { formatTimestamp }                from "./specbook-export-md.js"
import { titleProperties }                from "./specbook-export-common.js"

/*  the options of the init command  */
export interface InitOptions {
    config:  Schema
    basedir: string
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
    the title properties), where
    all artifacts configured onto the same file reside in it side by
    side, following each other on level 1  */
export const initSpecification = (options: InitOptions): string[] => {
    fs.mkdirSync(options.basedir, { recursive: true })
    const now     = formatTimestamp(new Date())
    const created = new Array<string>()

    /*  group the configured artifacts by their file, preserving the
        schema order both of the files and of the artifacts within  */
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

    /*  create each absent artifact file with its frontmatter and
        the level 1 headings of its artifacts  */
    for (const [ file, artifacts ] of groups) {
        const target = path.join(options.basedir, file)
        if (fs.existsSync(target)) {
            options.verbose(`skipping existing artifact file "${literal(file)}"`)
            continue
        }
        const headings = artifacts.map((artifact) => {
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
        created.push(file)
    }
    return created
}
