/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                   from "node:fs"
import * as os                   from "node:os"
import * as path                 from "node:path"
import { createHash }            from "node:crypto"
import { Readable }              from "node:stream"
import { pipeline }              from "node:stream/promises"
import { type ReadableStream as WebReadableStream } from "node:stream/web"
import { fileURLToPath }         from "node:url"

import { glob }                  from "glob"
import { parse as parseIni }     from "ini"
import pacote                    from "pacote"
import npmFetch                  from "npm-registry-fetch"
import { satisfies, valid }      from "semver"
import { extract as extractTar } from "tar"

import { loadProjectFile, isRemote, projectFile, type Project } from "./specbook-project.js"
import { type ConfigOverlap }                                    from "./specbook-config.js"
import { literal, type Verbose }                                 from "./specbook-verbose.js"

export { isRemote }

/*  our own version, taken from the package manifest, which resides one
    level above both the source and the compiled module directory  */
export const version = (JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version

/*  the bundled standard YAML schema configuration, which resides
    alongside the compiled module and is used whenever no particular
    schema configuration is given  */
export const standardConfig =
    fileURLToPath(new URL("specbook-format.yaml", import.meta.url))

/*  the directory of the download cache: SPECBOOK_CACHE, else the native
    cache location of the platform  */
export const cacheDir = (() => {
    const env = process.env.SPECBOOK_CACHE
    if (env !== undefined && env !== "")
        return path.resolve(env)
    const home = os.homedir()
    if (process.platform === "darwin")
        return path.join(home, "Library", "Caches", "specbook")
    else if (process.platform === "win32")
        return path.join(process.env.LOCALAPPDATA || path.join(home, "AppData", "Local"), "specbook", "Cache")
    else
        return path.join(process.env.XDG_CACHE_HOME || path.join(home, ".cache"), "specbook")
})()

/*  whether a file resides in the download cache (and hence never changes)  */
export const isCached = (file: string): boolean =>
    path.resolve(file).startsWith(cacheDir + path.sep)

/*  report the artifacts several schema configuration files define (and
    hence merge): as a detail, or unconditionally if two remote files
    collide, as such a merge is hardly intended  */
export const reportOverlaps = (overlaps: ConfigOverlap[], verbose: Verbose): void => {
    for (const { artifact, files } of overlaps)
        verbose(`artifact "${literal(artifact)}" defined by ` +
            files.map((file) => `"${literal(file)}"`).join(", ") + " (merged in order)",
        files.filter(isCached).length > 1 ? "none" : "detail")
}

/*  the time a floating reference (a range, a branch, a tag, or a URL)
    stays fresh in the cache before it is fetched again,
    mirroring the five minutes the npm registry grants its packuments  */
const floatingTtl = 5 * 60 * 1000

/*  the fetch modes of the remote resolution: never fetch, i.e., the
    download cache only ("never"), fetch whenever the download cache
    lacks the entry or it is no longer fresh ("auto", the default), and
    always fetch, ignoring the download cache ("always")  */
export const fetchModes = [ "never", "auto", "always" ] as const
export type FetchMode   = typeof fetchModes[number]

/*  parse and validate a fetch mode specification  */
export const parseFetchMode = (value: string): FetchMode => {
    const mode = fetchModes.find((known) => known === value)
    if (mode === undefined)
        throw new Error(`unknown fetch mode "${value}" ` +
            `(supported: ${fetchModes.join(", ")})`)
    return mode
}

/*  the options of the remote resolution: the fetch mode, the working
    directory (anchoring the project ".npmrc"), and the verbose sink  */
export interface RemoteOptions {
    fetch:   FetchMode
    cwd:     string
    verbose: Verbose
}

/*  the parsed forms of the remote references  */
type Ref =
    | { kind: "npm",    name: string, range?: string, path?: string }
    | { kind: "github", user: string, repo: string, ref: string, path?: string }
    | { kind: "url",    url: string }

/*  parse a remote reference: "npm:<pkg>[@<range>][/<path>]" (the package
    perhaps scoped), "github:<user>/<repo>[/<path>][#<ref>]" (the ref a
    branch, tag, or commit, default "HEAD"), or an "http:" or "https:"
    URL, where a path never leaves its package  */
const parseRef = (ref: string): Ref => {
    let m: RegExpExecArray | null
    if ((m = (/^npm:((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(?:\/(.+))?$/).exec(ref)) !== null)
        return { kind: "npm", name: m[1], range: m[2], path: safePath(ref, m[3]) }
    else if ((m = (/^github:([^/#]+)\/([^/#]+)(?:\/([^#]+))?(?:#(.+))?$/).exec(ref)) !== null)
        return { kind: "github", user: m[1], repo: m[2], path: safePath(ref, m[3]), ref: m[4] ?? "HEAD" }
    else if ((/^https?:\/\/[^/]/).test(ref) && URL.canParse(ref))
        return { kind: "url", url: ref }
    throw new Error(`invalid remote reference "${ref}"`)
}

/*  validate a path inside a package, which has to stay inside it (no
    absolute path, no parent directory segments), as its segments  */
const safeSegments = (ref: string, p: string): string[] => {
    const segments = p.replace(/\/+$/, "").split("/")
    if (segments.some((segment) => segment === "" || segment === ".."))
        throw new Error(`invalid path in remote reference "${ref}"`)
    return segments
}
const safePath = (ref: string, p: string | undefined): string | undefined =>
    p !== undefined ? safeSegments(ref, p).join("/") : undefined

/*  materialize a cache entry through "fill" into a temporary sibling,
    which then replaces the entry atomically (a stale one dropped), so an
    aborted download never leaves a half-written entry behind  */
const materialize = async (target: string, fill: (tmp: string) => Promise<void>): Promise<void> => {
    const tmp = `${target}.tmp-${process.pid}`
    fs.rmSync(tmp, { recursive: true, force: true })
    fs.mkdirSync(tmp, { recursive: true })
    try {
        await fill(tmp)
        fs.rmSync(target, { recursive: true, force: true })
        fs.renameSync(tmp, target)
        const now = new Date()
        fs.utimesSync(target, now, now)
    }
    catch (err) {
        fs.rmSync(tmp, { recursive: true, force: true })
        throw err
    }
}

/*  provide a cache entry: an existing one is taken as long as it is
    fresh (an immutable one always, a floating one within its TTL) or the
    fetch mode is "never", but never under "always", else it is fetched
    (again), which under "never" is an error  */
const ensure = async (target: string, floating: boolean, label: string,
    options: RemoteOptions, fill: (tmp: string) => Promise<void>): Promise<void> => {
    const stat  = fs.statSync(target, { throwIfNoEntry: false })
    const fresh = !floating || Date.now() - (stat?.mtimeMs ?? 0) < floatingTtl
    if (stat !== undefined && (options.fetch === "never" || (options.fetch === "auto" && fresh)))
        return
    if (options.fetch === "never")
        throw new Error(`"${label}" is not cached (fetch mode "never")`)
    options.verbose(`fetching "${literal(label)}"`)
    await materialize(target, fill)
}

/*  download a URL, failing on any HTTP error (with the message of a
    JSON error body, like the rate limit notice of GitHub)  */
const download = async (url: string, headers: Record<string, string> = {}): Promise<Response> => {
    const response = await fetch(url, { headers, redirect: "follow" })
    if (!response.ok || response.body === null) {
        let detail = ""
        try {
            const body = JSON.parse(await response.text()) as { message?: unknown }
            if (typeof body.message === "string")
                detail = `: ${body.message}`
        }
        catch {
            /*  no JSON error body  */
        }
        throw new Error(`cannot download "${url}": HTTP ${response.status} ${response.statusText}${detail}`)
    }
    return response
}

/*  the npm configuration the registry client honors ("registry", the
    scoped "@scope:registry", and the "//host/:_authToken"-style
    credentials): the user file (NPM_CONFIG_USERCONFIG, else "~/.npmrc"),
    overridden by the project file in the working directory and by the
    "npm_config_*" environment variables, with the "${VAR}" references
    of the values expanded like npm does  */
const npmConfig = (cwd: string): Record<string, string | boolean> => {
    const config = {} as Record<string, string | boolean>
    const files  = [ process.env.NPM_CONFIG_USERCONFIG || path.join(os.homedir(), ".npmrc"), path.join(cwd, ".npmrc") ]
    for (const file of files) {
        let text: string
        try {
            text = fs.readFileSync(file, "utf8")
        }
        catch {
            continue
        }
        for (const [ key, value ] of Object.entries(parseIni(text)) as [ string, unknown ][])
            if (typeof value === "string")
                config[key] = value.replace(/\$\{([^}]+)\}/g, (_, name: string) => process.env[name] ?? "")
            else if (typeof value === "boolean")
                config[key] = value
    }
    for (const [ name, value ] of Object.entries(process.env))
        if (name.startsWith("npm_config_") && value !== undefined)
            config[name.slice("npm_config_".length).replace(/_/g, "-")] = value
    return config
}

/*  the options of the npm registry client: the npm configuration, our
    own cache (never the one of npm), the fetch mode (the cache only,
    resp. always revalidated), and a packument cache spanning the
    process, as a packument hardly changes within it  */
const packumentCache = new Map<string, pacote.Packument>()
const npmOptions = (options: RemoteOptions): pacote.Options => ({
    ...npmConfig(options.cwd),
    cache:        path.join(cacheDir, "npm", "_cacache"),
    offline:      options.fetch === "never",
    preferOnline: options.fetch === "always",
    packumentCache
})

/*  a fetched package: the directory of its extracted content and its
    resolved (exact) reference  */
interface Package {
    root:     string
    resolved: string
}

/*  fetch an npm package: its version resolved out of the range (default:
    the "latest" tag) through the registry, its tarball extracted (never
    running any of its scripts) into the cache, where an exact version is
    immutable and hence stays forever (an already extracted one not even
    consulting the registry again, unless the fetch mode is "always")  */
const fetchNpm = async (ref: Ref & { kind: "npm" }, options: RemoteOptions): Promise<Package> => {
    const opts    = npmOptions(options)
    const dirOf   = (version: string) => path.join(cacheDir, "npm", ref.name, version)
    let   version = ref.range !== undefined && valid(ref.range) !== null ? ref.range : undefined
    if (version === undefined || !fs.existsSync(dirOf(version)) || options.fetch === "always")
        version = (await pacote.manifest(`${ref.name}@${ref.range ?? "latest"}`, opts)).version
    const spec = `${ref.name}@${version}`
    const root = dirOf(version)
    await ensure(root, false, `npm:${spec}`, options, async (tmp) => {
        await pacote.extract(spec, tmp, opts)
    })
    return { root, resolved: `npm:${spec}` }
}

/*  the request headers of the GitHub requests (which GitHub refuses
    without a user agent), authenticated through GITHUB_TOKEN (for the
    private repositories and a higher rate limit)  */
const githubHeaders = (): Record<string, string> => {
    const token = process.env.SPECBOOK_GITHUB_TOKEN || process.env.GITHUB_TOKEN
    return { "User-Agent": `specbook/${version}`,
        ...(token !== undefined && token !== "" ? { Authorization: `Bearer ${token}` } : {}) }
}

/*  fetch a GitHub repository at a ref: its tarball (whose single top-level
    directory is stripped) extracted into the cache, where a commit hash
    is immutable and every other ref floats  */
const fetchGithub = async (ref: Ref & { kind: "github" }, options: RemoteOptions): Promise<Package> => {
    const floating = !(/^[0-9a-f]{40}$/).test(ref.ref)
    const spec     = `${ref.user}/${ref.repo}#${ref.ref}`
    const root     = path.join(cacheDir, "github", ref.user, ref.repo, encodeURIComponent(ref.ref))
    await ensure(root, floating, `github:${spec}`, options, async (tmp) => {
        const url      = `https://codeload.github.com/${ref.user}/${ref.repo}/tar.gz/${ref.ref}`
        const response = await download(url, githubHeaders())
        await pipeline(Readable.fromWeb(response.body as unknown as WebReadableStream),
            extractTar({ cwd: tmp, strip: 1 }))
    })
    return { root, resolved: `github:${spec}` }
}

/*  fetch a single file by URL into the cache, which always floats  */
const fetchUrl = async (ref: Ref & { kind: "url" }, options: RemoteOptions): Promise<string> => {
    const url  = new URL(ref.url)
    const name = path.posix.basename(url.pathname) || "index.yaml"
    const root = path.join(cacheDir, "url", createHash("sha256").update(ref.url).digest("hex").slice(0, 32))
    await ensure(root, true, ref.url, options, async (tmp) => {
        const response = await download(ref.url)
        fs.writeFileSync(path.join(tmp, name), Buffer.from(await response.arrayBuffer()))
    })
    return path.join(root, name)
}

/*  the SpecBook-related metadata of a package manifest: the schema
    configuration file (or the map of the named building blocks) it
    offers and the SpecBook versions it supports  */
interface Manifest {
    specbook?: { schema?: string | Record<string, string> }
    engines?:  Record<string, string>
}

/*  read the manifest of a package directory, if any, checking the
    SpecBook versions it supports ("engines.specbook")  */
const manifestOf = (dir: string, label: string): Manifest | undefined => {
    const file = path.join(dir, "package.json")
    if (!fs.existsSync(file))
        return undefined
    let manifest: Manifest
    try {
        manifest = JSON.parse(fs.readFileSync(file, "utf8")) as Manifest
    }
    catch (err) {
        throw new Error(`invalid "package.json" in "${label}"`, { cause: err })
    }
    const range = manifest.engines?.specbook
    if (range !== undefined && !satisfies(version, range, { includePrerelease: true }))
        throw new Error(`"${label}" requires SpecBook ${range}, but this is version ${version}`)
    return manifest
}

/*  read the project configuration file of a package directory, if any  */
const projectOf = (dir: string): Project | undefined => {
    const file = path.join(dir, projectFile)
    return fs.existsSync(file) ? loadProjectFile(file) : undefined
}

/*  fetch the package of an npm or GitHub reference, whose manifest has
    to support this SpecBook version  */
const fetchPackage = async (ref: Ref & { kind: "npm" | "github" }, label: string,
    options: RemoteOptions): Promise<Package & { manifest?: Manifest }> => {
    const pkg = await (ref.kind === "npm" ? fetchNpm(ref, options) : fetchGithub(ref, options))
    return { ...pkg, manifest: manifestOf(pkg.root, label) }
}

/*  the directory (or file) inside a fetched package a reference names,
    which has to exist, where a nested directory carrying a manifest of
    its own has to support this SpecBook version, too  */
const packageDir = (pkg: Package, ref: Ref & { kind: "npm" | "github" }, label: string): string => {
    if (ref.path === undefined)
        return pkg.root
    const dir = path.join(pkg.root, ...ref.path.split("/"))
    if (!fs.existsSync(dir))
        throw new Error(`"${ref.path}" does not exist in "${pkg.resolved}"`)
    if (fs.statSync(dir).isDirectory())
        manifestOf(dir, label)
    return dir
}

/*  expand a local schema configuration pattern into its files, in
    alphabetical order, where a pattern matching no file is an error  */
export const expandPattern = async (pattern: string): Promise<string[]> => {
    const matches = await glob(pattern, { nodir: true,
        windowsPathsNoEscape: process.platform === "win32" })
    if (matches.length === 0)
        throw new Error(`no configuration file matches "${pattern}"`)
    return matches.sort()
}

/*  resolve a remote reference of a schema configuration into its local
    files: the bundled standard one for "std", the single file of a URL,
    and for a package the file or
    glob pattern its path names inside the package (or the named building
    block of the "specbook.schema" map of its manifest), while a
    directory (the package itself, or a nested one) offers its schema
    configuration through the "specbook.schema" file of its manifest, the
    "config" entries of its own project configuration file (its remote
    ones resolved recursively, a cycle being an error), or its "index.yaml"  */
export const resolveConfig = async (ref: string, options: RemoteOptions, chain: string[] = []): Promise<string[]> => {
    if (ref === "std")
        return [ standardConfig ]
    const parsed = parseRef(ref)
    if (parsed.kind === "url")
        return [ await fetchUrl(parsed, options) ]
    const pkg = await fetchPackage(parsed, ref, options)
    if (chain.includes(pkg.resolved))
        throw new Error(`cyclic schema configuration reference "${ref}"`)

    /*  the path names a building block of the manifest, or a glob pattern inside the package  */
    const blocks = pkg.manifest?.specbook?.schema
    const block  = typeof blocks === "object" && parsed.path !== undefined ? blocks[parsed.path] : undefined
    if (block !== undefined)
        return [ path.join(pkg.root, ...safeSegments(ref, block)) ]
    else if (parsed.path !== undefined && (/[*?[{]/).test(parsed.path))
        return expandPattern(path.join(pkg.root, ...parsed.path.split("/")))

    /*  the path names a file inside the package  */
    const dir = packageDir(pkg, parsed, ref)
    if (!fs.statSync(dir).isDirectory())
        return [ dir ]

    /*  the manifest names the schema configuration (or offers the named building blocks)  */
    const schema = (dir === pkg.root ? pkg.manifest : manifestOf(dir, ref))?.specbook?.schema
    if (typeof schema === "string")
        return [ path.join(dir, ...safeSegments(ref, schema)) ]
    else if (typeof schema === "object")
        throw new Error(`"${ref}" offers the named schema configurations ` +
            `${Object.keys(schema).map((name) => `"${name}"`).join(", ")} (append one as its path)`)

    /*  the project configuration file names the schema configuration  */
    const project = projectOf(dir)
    if (project?.config !== undefined) {
        const files = new Array<string>()
        for (const pattern of project.config)
            files.push(...(isRemote(pattern) ?
                await resolveConfig(pattern, options, [ ...chain, pkg.resolved ]) :
                await expandPattern(pattern)))
        return files
    }

    /*  the conventional index file  */
    const index = path.join(dir, "index.yaml")
    if (fs.existsSync(index))
        return [ index ]
    throw new Error(`no schema configuration found in "${ref}" (neither a "specbook.schema" ` +
        `entry in "package.json", nor a "${projectFile}", nor an "index.yaml")`)
}

/*  the hits of the search  */
export interface SearchHit {
    ref:          string
    name:         string
    version?:     string
    description?: string
    source:       "builtin" | "npm" | "github"
}

/*  the result shapes of the npm registry and GitHub search APIs  */
interface NpmSearch    { objects: { package: { name: string, version: string, description?: string, keywords?: string[] } }[] }
interface GithubSearch { items: { full_name: string, description: string | null, topics?: string[] }[] }

/*  the search hit of the bundled standard schema configuration  */
const standardHit: SearchHit = {
    ref:         "std",
    name:        "standard",
    version,
    description: "SpecBook Standard Schema",
    source:      "builtin"
}

/*  search the bundled standard schema configuration (matched locally by
    all words of the term), the npm registry (the packages carrying the
    keyword "specbook-schema"), and GitHub (the repositories carrying the
    same topic) for the shareable schema configurations matching a term,
    where a failing source is reported but does not fail the search, and
    the fetch mode "never" searches the bundled one only  */
export const search = async (term: string, options: RemoteOptions): Promise<SearchHit[]> => {
    const words = term.toLowerCase().split(/\s+/).filter((word) => word !== "")
    const text  = `${standardHit.ref} ${standardHit.name} ${standardHit.description}`.toLowerCase()
    const hits  = words.every((word) => text.includes(word)) ? [ standardHit ] : new Array<SearchHit>()
    if (options.fetch === "never") {
        options.verbose("searching the bundled standard schema configuration only (fetch mode \"never\")")
        return hits
    }
    const guard = async (source: string, action: () => Promise<void>) => {
        try {
            await action()
        }
        catch (err) {
            options.verbose(`search of ${source} failed: ` +
                (err instanceof Error ? err.message : String(err)), "none")
        }
    }

    /*  the npm registry, searched by keyword  */
    await guard("the npm registry", async () => {
        const result = await npmFetch.json("/-/v1/search", { ...npmOptions(options),
            query: { text: `keywords:specbook-schema ${term}`.trim(), size: 50 } }) as unknown as NpmSearch
        for (const { package: pkg } of result.objects)
            hits.push({ ref: `npm:${pkg.name}`, name: pkg.name, version: pkg.version,
                description: pkg.description, source: "npm" })
    })

    /*  GitHub, searched by topic  */
    await guard("GitHub", async () => {
        const query    = encodeURIComponent(`topic:specbook-schema ${term}`.trim())
        const response = await download(`https://api.github.com/search/repositories?q=${query}&per_page=50`,
            { ...githubHeaders(), Accept: "application/vnd.github+json" })
        const result   = await response.json() as GithubSearch
        for (const item of result.items)
            hits.push({ ref: `github:${item.full_name}`, name: item.full_name,
                description: item.description ?? undefined, source: "github" })
    })
    return hits.filter((hit, i) => hits.findIndex((other) => other.ref === hit.ref) === i)
}
