/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

/*  collect the specification Markdown files below the base directory:
    every ".md" file, recursively, as all of them are taken for SpecBook
    ones, except below the "."-prefixed entries (like ".git"), sorted by
    path for a deterministic parse order (the artifacts are ordered
    along the schema configuration afterwards anyway)  */
export const specFiles = (basedir: string): string[] => {
    const files = new Array<string>()
    const scan = (dir: string) => {
        let entries: fs.Dirent[]
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true })
        }
        catch {
            /*  an unreadable directory contributes no files  */
            return
        }
        for (const entry of entries) {
            if (entry.name.startsWith("."))
                continue
            const file = path.join(dir, entry.name)
            if (entry.isDirectory())
                scan(file)
            else if (entry.isFile() && path.extname(entry.name) === ".md")
                files.push(file)
        }
    }
    scan(basedir)
    return files.sort()
}

/*  whether a file or directory resides at or below a directory  */
export const isBelow = (file: string, dir: string): boolean => {
    const rel = path.relative(path.resolve(dir), path.resolve(file))
    return rel === "" || (!path.isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${path.sep}`))
}

