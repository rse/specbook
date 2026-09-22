/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs          from "node:fs"
import * as os          from "node:os"
import * as path        from "node:path"
import { execFileSync } from "node:child_process"

import picomatch        from "picomatch"

/*  a single Git exclude rule, pre-compiled into a picomatch matcher  */
type Rule = { matcher: (p: string) => boolean, negated: boolean, dirOnly: boolean }

/*  translate a single Git exclude line into a picomatch-backed rule,
    honoring the anchored-vs-floating, directory-only, and negation
    semantics of the pattern; an anchored pattern resolves relative to
    the "base" directory its rule file governs, given as a POSIX path
    relative to the working tree root, and "nocase" folds the case of
    the pattern like Git does under "core.ignoreCase"  */
const compileRule = (line: string, base: string, nocase: boolean): Rule | null => {
    /*  Git drops the trailing whitespace only (unless a backslash
        escapes it), while a leading one is part of the pattern  */
    let pattern = line.replace(/(?<!\\)\s+$/, "")
    if (pattern === "" || pattern.startsWith("#"))
        return null
    let negated = false
    if (pattern.startsWith("!")) {
        negated = true
        pattern = pattern.slice(1)
    }
    let dirOnly = false
    if (pattern.endsWith("/")) {
        dirOnly = true
        pattern = pattern.slice(0, -1)
    }

    /*  a trailing "/**" matches everything inside the directory but not
        the directory itself (so a later negation can still re-include a
        file below it), whereas picomatch would match the directory, too  */
    if (pattern.endsWith("/**"))
        pattern += "/*"

    /*  a pattern carrying a slash anywhere but at its end is anchored at
        the directory of its rule file, while every other one floats and
        hence matches at any depth below it  */
    const anchored = pattern.includes("/")
    if (pattern.startsWith("/"))
        pattern = pattern.slice(1)

    /*  a negated character class is "[!...]" in the wildmatch of Git,
        while picomatch knows the "[^...]" spelling only  */
    pattern = pattern.replace(/\[!/g, "[^")
    const glob    = anchored ? (base === "" ? pattern : `${base}/${pattern}`) : `**/${pattern}`
    const isMatch = picomatch(glob, { dot: true, nobrace: true, noextglob: true, nonegate: true, nocase })
    return { matcher: isMatch, negated, dirOnly }
}

/*  load the rules of a single exclude file, given as an absolute "file"
    and the working-tree-relative "base" its anchored patterns resolve
    against; an absent or unreadable file contributes no rules  */
const loadRules = (file: string, base: string, nocase: boolean): Rule[] => {
    let text: string
    try {
        text = fs.readFileSync(file, "utf8")
    }
    catch {
        return []
    }
    const rules = new Array<Rule>()
    for (const line of text.split(/\r?\n/)) {
        const rule = compileRule(line, base, nocase)
        if (rule !== null)
            rules.push(rule)
    }
    return rules
}

/*  locate the Git working tree containing a directory, i.e. the nearest
    ancestor-or-self carrying a ".git" directory (a regular working
    tree) or a ".git" file (a linked worktree or a submodule)  */
const workingTree = (dir: string): string | null => {
    let current = path.resolve(dir)
    for (;;) {
        if (fs.existsSync(path.join(current, ".git")))
            return current
        const parent = path.dirname(current)
        if (parent === current)
            return null
        current = parent
    }
}

/*  query a single Git configuration value of a working tree (its "~"
    expanded and its booleans normalized by Git itself through the
    "--type"), where an unset value or no Git at all yields ""  */
const gitConfig = (root: string, type: string, key: string): string => {
    try {
        return execFileSync("git", [ "config", "--get", `--type=${type}`, key ],
            { cwd: root, encoding: "utf8", stdio: [ "ignore", "pipe", "ignore" ] }).trim()
    }
    catch {
        return ""
    }
}

/*  resolve the global Git excludes file: the configured
    "core.excludesFile", or else the XDG location Git falls back onto
    when that configuration value is unset  */
const globalFile = (root: string): string => {
    const file = gitConfig(root, "path", "core.excludesFile")
    if (file === "") {
        const xdg = process.env.XDG_CONFIG_HOME
        return xdg !== undefined && xdg !== "" ?
            path.join(xdg, "git", "ignore") :
            path.join(os.homedir(), ".config", "git", "ignore")
    }
    return file
}

/*  resolve the repository-local exclude file of a working tree, held by
    the Git *common* directory: a regular working tree carries ".git" as
    that very directory, while a linked worktree carries it as a file
    pointing at its own administrative directory, whose "commondir" in
    turn points at the shared one  */
const infoFile = (root: string): string => {
    const dot = path.join(root, ".git")
    let dir   = dot
    if (fs.statSync(dot, { throwIfNoEntry: false })?.isFile() === true) {
        const pointer = (/^gitdir:\s*(.+?)\s*$/m).exec(fs.readFileSync(dot, "utf8"))
        if (pointer === null)
            return ""
        dir = path.resolve(root, pointer[1])
        const common = path.join(dir, "commondir")
        if (fs.existsSync(common))
            dir = path.resolve(dir, fs.readFileSync(common, "utf8").trim())
    }
    return path.join(dir, "info", "exclude")
}

/*  the predicate deciding whether a file is excluded from its project  */
export type Excluder = (file: string) => boolean

/*  create the predicate deciding whether an absolute file path is
    excluded from the Git working tree containing "dir", honoring the
    same three rule sources and the same precedence order as Git itself
    -- the global excludes file, the repository-local "info/exclude",
    and the ".gitignore" files from the working tree root down to the
    file. A path outside any Git working tree is never excluded, as
    there is no project to be excluded from  */
export const excluder = (dir: string): Excluder => {
    const root = workingTree(dir)
    if (root === null)
        return () => false

    /*  Git folds the case of its exclude patterns on a case-insensitive
        file system ("core.ignoreCase", set by Git itself on init/clone)  */
    const nocase = gitConfig(root, "bool", "core.ignoreCase") === "true"

    /*  the rules which no directory of the working tree owns and which
        hence govern it as a whole, in ascending Git precedence  */
    const baseRules = [ ...loadRules(globalFile(root), "", nocase), ...loadRules(infoFile(root), "", nocase) ]

    /*  the per-directory ".gitignore" rules, loaded on first use, as one
        run queries many files sharing the very same directories  */
    const cache = new Map<string, Rule[]>()
    const rulesOf = (relDir: string): Rule[] => {
        let rules = cache.get(relDir)
        if (rules === undefined) {
            rules = loadRules(path.join(root, relDir, ".gitignore"), relDir, nocase)
            cache.set(relDir, rules)
        }
        return rules
    }

    return (file: string): boolean => {
        const rel = path.relative(root, path.resolve(file)).replace(/\\/g, "/")
        if (rel === "" || rel.startsWith("../"))
            return false
        const segments = rel.split("/")

        /*  walk the directory chain from the working tree root down to
            the file, picking up the ".gitignore" rules on the way and
            deciding every segment against the rules known at its level,
            where the last matching rule wins; an excluded ancestor
            directory excludes the file itself, as Git never descends
            into it -- and, for the same reason, a rule below such an
            ancestor can never re-include the file  */
        let rules  = baseRules
        let relDir = ""
        for (let i = 0; i < segments.length; i++) {
            rules = rules.concat(rulesOf(relDir))
            const current = relDir === "" ? segments[i] : `${relDir}/${segments[i]}`

            /*  every segment but the last one is a directory by
                construction, while the last one is whatever the file
                system says it is  */
            const isDir = i < segments.length - 1
                || fs.statSync(path.join(root, current), { throwIfNoEntry: false })?.isDirectory() === true
            let excluded = false
            for (const rule of rules) {
                if (rule.dirOnly && !isDir)
                    continue
                if (rule.matcher(current))
                    excluded = !rule.negated
            }
            if (excluded)
                return true
            relDir = current
        }
        return false
    }
}
