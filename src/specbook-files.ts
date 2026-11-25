/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                from "node:fs"
import * as path              from "node:path"
import { globSync, hasMagic } from "glob"

/*  whether a base directory pattern is a glob pattern (instead of a literal path)  */
export const isPattern = (pattern: string): boolean =>
    hasMagic(pattern, { windowsPathsNoEscape: process.platform === "win32" })

/*  expand the base directory patterns into the base directories, in
    pattern order and alphabetically within a pattern, where a literal
    path is taken as-is (even if absent, as "init" creates it), a glob
    pattern matching no directory is an error, and a directory named
    twice is taken once  */
export const specDirs = (patterns: string[]): string[] => {
    const dirs = new Array<string>()
    const seen = new Set<string>()
    for (const pattern of patterns) {
        let matches = [ pattern ]
        if (isPattern(pattern)) {
            /*  a trailing slash restricts the matches onto directories  */
            matches = globSync(pattern.replace(/[\\/]*$/, "/"),
                { windowsPathsNoEscape: process.platform === "win32" }).sort()
            if (matches.length === 0)
                throw new Error(`no base directory matches "${pattern}"`)
        }
        for (const dir of matches) {
            const key = path.resolve(dir)
            if (!seen.has(key)) {
                seen.add(key)
                dirs.push(dir)
            }
        }
    }
    return dirs
}

/*  collect the specification Markdown files below the base directories:
    every ".md" file, recursively, as all of them are taken for SpecBook
    ones, except below the "."-prefixed entries (like ".git"), each file
    once (as the base directories can nest), sorted by path for a
    deterministic parse order (the artifacts are ordered along the
    schema configuration afterwards anyway)  */
export const specFiles = (basedirs: string[]): string[] => {
    const files = new Array<string>()
    const seen  = new Set<string>()
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
            else if (entry.isFile() && path.extname(entry.name) === ".md" && !seen.has(path.resolve(file))) {
                seen.add(path.resolve(file))
                files.push(file)
            }
        }
    }
    for (const basedir of basedirs)
        scan(basedir)
    return files.sort()
}

/*  whether a file or directory resides at or below a directory  */
export const isBelow = (file: string, dir: string): boolean => {
    const rel = path.relative(path.resolve(dir), path.resolve(file))
    return rel === "" || (!path.isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..${path.sep}`))
}

