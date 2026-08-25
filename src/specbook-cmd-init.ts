/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

import { literal }                        from "./specbook-verbose.js"
import { type Schema, type SchemaObject } from "./specbook-format-schema.js"

/*  the current time in the frontmatter timestamp format  */
const timestamp = (): string => {
    const d   = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/*  the options of the init command  */
export interface InitOptions {
    config:  Schema
    basedir: string
    verbose: (msg: string) => void
}

/*  initialize the configured specification artifact files below the
    base directory with their frontmatter and artifact headings, where
    all artifacts configured onto the same file reside in it side by
    side, following each other on level 1  */
export const initSpecification = (options: InitOptions): string[] => {
    fs.mkdirSync(options.basedir, { recursive: true })
    const now     = timestamp()
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

    for (const [ file, artifacts ] of groups) {
        const target = path.join(options.basedir, file)
        if (fs.existsSync(target)) {
            options.verbose(`skipping existing artifact file "${literal(file)}"`)
            continue
        }
        const headings = artifacts.map((artifact) => {
            const name  = artifact.name ?? ""
            const paren = artifact.id !== undefined ? ` (${artifact.id})` : ""
            return `#   ${artifact.kind}: ${name}${paren}\n\n`
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
