/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs   from "node:fs"
import * as path from "node:path"

import { loadConfig, configStatistics }                         from "./specbook-config.js"
import { reportOverlaps }                                       from "./specbook-remote.js"
import { literal, type Verbose }                                from "./specbook-verbose.js"
import { type Diagnostic }                                      from "./specbook-diagnostic.js"
import { parseSpecification, specStatistics, resolveArtifact, isRecurring, collectSchemas, type SourceFile }
    from "./specbook-parse.js"
import { type Spec, type SpecArtifact, type SpecObject }        from "./specbook-format-spec.js"
import { type Schema, type SchemaObject }                       from "./specbook-format-schema.js"
import { buildLinkIndex, chainOf, plainText }                   from "./specbook-link.js"
import { referencedCoverage, specCoverage, coverageRatio }      from "./specbook-coverage.js"
import { excluder }                                             from "./specbook-ignore.js"
import { specFiles }                                            from "./specbook-files.js"

/*  the options of the lint command  */
export interface LintOptions {
    config:    string[]
    basedir:   string
    gitignore: boolean
    verbose:   Verbose
}

/*  the result of the lint command  */
export interface LintResult {
    specification: Spec
    diagnostics:   Diagnostic[]
    config?:       Schema

    /*  the resolved paths of all files the specification is made of --
        the specification Markdown files plus their embedded assets --
        and of the base directory itself, so a watching consumer knows
        what to observe and notices added and removed files, too  */
    files:         string[]

    /*  the source file every artifact of the specification stems from  */
    origins:       Map<SpecArtifact, string>
}

/*  whether a configured artifact is demanded: neither optional nor
    recurring (the latter being optional by definition)  */
const isDemanded = (schema: SchemaObject | undefined): boolean =>
    schema !== undefined && schema.optional !== true && !isRecurring(schema)

/*  report the reference coverage the "referenced"-flagged object kinds
    receive and the "coverage"-configured objects report as additional
    figures, the unreferenced objects of the latter by name as a lengthy
    detail (the ones of the former are already reported as warnings)  */
const reportCoverage = (specification: Spec, config: Schema, verbose: Verbose) => {
    const index   = buildLinkIndex(specification)
    const schemas = collectSchemas(specification, config)
    const label   = (object: SpecObject) => `${object.kind} "${literal(plainText(object.name))}"`
    const ratio   = (covered: SpecObject[], uncovered: SpecObject[]) =>
        `${literal(covered.length)} of ${literal(covered.length + uncovered.length)} ` +
        `(${literal(coverageRatio(covered.length, covered.length + uncovered.length))}%)`
    for (const { schema, covered, uncovered } of referencedCoverage(index, schemas)) {
        const chain = chainOf(index, covered[0] ?? uncovered[0])
        verbose((schema.referenced ?? []).map((entry) => `"${literal(entry)}"`).join(" or ") +
            ` references ${ratio(covered, uncovered)} ${schema.kind} object(s)` +
            (chain.length > 1 ? ` below ${label(chain[0])}` : ""), "detail")
    }
    for (const [ object, entries ] of specCoverage(index, schemas))
        for (const { pattern, covered, uncovered } of entries) {
            verbose(`${label(object)} references ${ratio(covered, uncovered)} ` +
                `"${literal(pattern)}" object(s)`, "detail")
            if (uncovered.length > 0)
                verbose(`${label(object)} leaves ${literal(uncovered.length)} ` +
                    `"${literal(pattern)}" object(s) unreferenced: ` +
                    uncovered.map(label).join(", "), "trace")
        }
}

/*  lint the specification Markdown files below the base directory
    against the configuration  */
export const lint = (options: LintOptions): LintResult => {
    const diagnostics = new Array<Diagnostic>()

    /*  load the mandatory YAML schema configuration, merged out of its files  */
    options.verbose("loading schema configuration " +
        options.config.map((file) => `"${literal(file)}"`).join(", "))
    const loaded = loadConfig(options.config)
    diagnostics.push(...loaded.diagnostics)
    reportOverlaps(loaded.overlaps, options.verbose)
    const config = loaded.config
    if (config !== undefined) {
        const stats = configStatistics(config)
        options.verbose(`loaded schema configuration specifying ${literal(stats.objects)} object kind(s) ` +
            `and ${literal(stats.links)} link relationship(s)`)
    }

    /*  read the specification Markdown files below the base directory
        (every one of them is taken for a SpecBook one, the "file"
        fields of the configuration drive "init" only), where the base
        directory itself heads the observed paths, so a watching
        consumer notices added and removed files, too  */
    const files = specFiles(options.basedir)
    if (files.length === 0)
        diagnostics.push({ file: options.basedir, line: 1, column: 1, severity: "error",
            message: "no specification files found" })

    /*  a file Git excludes from its project is no part of the project
        and hence no part of its specification, so it is set aside  */
    const excluded = options.gitignore ? excluder(options.basedir) : () => false
    const sources  = new Array<SourceFile>()
    const pruned   = new Array<SourceFile>()
    const watched  = [ path.resolve(options.basedir) ]
    for (const file of files) {
        watched.push(path.resolve(file))
        try {
            (excluded(file) ? pruned : sources).push({ file, text: fs.readFileSync(file, "utf8") })
        }
        catch (err) {
            diagnostics.push({ file, line: 1, column: 1, severity: "error",
                message: `unreadable file: ${err instanceof Error ? err.message : String(err)}` })
        }
    }

    /*  an excluded file is an error unless all of its artifacts are
        optional, which only its own (separate, as it is dropped) parsing
        tells, whose diagnostics are irrelevant for the very same reason  */
    if (pruned.length > 0) {
        const demanded = new Set<string>()
        if (config !== undefined) {
            const dropped = parseSpecification(pruned, config)
            for (const artifact of dropped.specification.artifacts)
                if (artifact.objects.some((object) => isDemanded(resolveArtifact(config, object))))
                    demanded.add(dropped.origins.get(artifact) ?? "")
        }
        for (const { file } of pruned) {
            if (demanded.has(file))
                diagnostics.push({ file, line: 1, column: 1, severity: "error",
                    message: "artifact file excluded by Git" })
            else
                options.verbose(`skipping specification file "${literal(file)}" excluded by Git`)
        }
    }

    /*  parse and validate the artifact files against the configuration  */
    options.verbose(`parsing ${literal(sources.length)} specification file(s) ` +
        `below "${literal(options.basedir)}"`)
    const result = parseSpecification(sources, config)
    diagnostics.push(...result.diagnostics)
    watched.push(...result.assets)
    const stats = specStatistics(result.specification)
    options.verbose(`parsed specification defining ${literal(stats.objects)} object(s) ` +
        `and ${literal(stats.links)} link relationship(s)`)

    /*  report the reference coverage as additional figures  */
    if (config !== undefined && result.specification.artifacts.length > 0)
        reportCoverage(result.specification, config, options.verbose)

    /*  report the demanded artifacts absent from the specification,
        against the artifact file configured for them below the base
        directory (where "init" would create them, present or not) or
        else against the configuration  */
    if (config !== undefined) {
        const found = new Set<SchemaObject>()
        for (const artifact of result.specification.artifacts)
            for (const object of artifact.objects) {
                const schema = resolveArtifact(config, object)
                if (schema !== undefined)
                    found.add(schema)
            }
        for (const schema of config) {
            if (!isDemanded(schema) || found.has(schema))
                continue
            const file  = schema.file !== undefined ? path.join(options.basedir, schema.file) : options.config[0]
            const paren = schema.id !== undefined ? ` (${schema.id})` : ""
            diagnostics.push({ file, line: 1, column: 1, severity: "error",
                message: `missing artifact "${schema.kind}: ${schema.name ?? ""}${paren}"` })
        }
    }
    return { specification: result.specification, diagnostics, config, files: watched,
        origins: result.origins }
}
