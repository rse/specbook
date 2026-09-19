/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                                           from "node:fs"
import * as path                                         from "node:path"
import { fileURLToPath }                                 from "node:url"
import { glob }                                          from "glob"

import { loadConfig, configStatistics }                  from "./specbook-config.js"
import { loadProject, projectFile }                      from "./specbook-project.js"
import { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic, type DiagnosticSeverity }
    from "./specbook-diagnostic.js"
import { initSpecification }                             from "./specbook-cmd-init.js"
import { lint, type LintResult }                         from "./specbook-cmd-lint.js"
import { exportSpecification, watchSpecification, parseOutputSpec, formats,
    requireBrowser, type ExportFormat }                  from "./specbook-cmd-export.js"
import { servePreview, previewAddr, previewPort }        from "./specbook-cmd-preview.js"
import { describeFormat, describeFormats, describeParts, parseDescribeFormat, parseDescribePart,
    compressLevels, parseCompressLevel, type DescribeFormat, type DescribePart, type CompressLevel }
    from "./specbook-cmd-describe.js"
import { literal, renderVerbose, verbosities, verbosityOf, parseVerbosity,
    type Verbose, type VerboseLevel, type Verbosity }    from "./specbook-verbose.js"
import { type Schema }                                   from "./specbook-format-schema.js"

/*  re-export the central types for API consumers  */
export { literal, renderVerbose, verbosities, verbosityOf, parseVerbosity }
export { type Verbose, type VerboseLevel, type Verbosity }
export { formats, parseOutputSpec, type ExportFormat }
export { previewAddr, previewPort }
export { projectFile }
export { describeFormats, describeParts, parseDescribeFormat, parseDescribePart }
export { compressLevels, parseCompressLevel }
export { type DescribeFormat, type DescribePart, type CompressLevel }
export { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic, type DiagnosticSeverity }
export { type LintResult }
export type { Spec, SpecArtifact, SpecObject, SpecDescription, SpecProperty } from "./specbook-format-spec.js"
export type { Schema, SchemaObject, SchemaProperty }                          from "./specbook-format-schema.js"

/*  our own version, taken from the package manifest, which resides one
    level above both the source and the compiled module directory  */
export const version = (JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version

/*  the bundled standard YAML schema configuration, which resides
    alongside the compiled module and is used whenever no particular
    schema configuration is given  */
export const standardConfig =
    fileURLToPath(new URL("specbook-format.yaml", import.meta.url))

/*  the sink of the verbose messages, receiving the emitting command,
    the message, and its severity, so consumers can qualify the message
    themselves and gate it by their verbosity (the "none" ones passing
    unconditionally)  */
export type VerboseSink = (cmd: string, msg: string, level: VerboseLevel) => void

/*  the constructor options of the SpecBook API  */
export interface SpecBookOptions {
    verbose?: VerboseSink
}

/*  the project options of all commands: the YAML schema configuration
    patterns, the base directory, and the working directory, from which
    the project configuration file is searched upwards  */
export interface ProjectOptions {
    config?:  string[]
    basedir?: string
    cwd?:     string
}

/*  the SpecBook API  */
export class SpecBook {
    private verbose: VerboseSink
    constructor (options: SpecBookOptions = {}) {
        this.verbose = options.verbose ?? (() => { /*  no operation  */ })
    }

    /*  bind the verbose sink to a particular command  */
    private verboseOf (cmd: string): Verbose {
        return (msg: string, level: VerboseLevel = "notice") => this.verbose(cmd, msg, level)
    }

    /*  determine the effective project options: a given option wins over
        its environment variable (SPECBOOK_CONFIG, a path-delimiter-separated
        list of patterns, and SPECBOOK_BASEDIR), which in turn wins over
        its entry in the project configuration file. A given working
        directory anchors the given relative paths and keeps all paths
        absolute, else the project ones are rendered relative to ours  */
    private project (options: ProjectOptions, verbose: Verbose): { config?: string[], basedir?: string } {
        const cwd     = path.resolve(options.cwd ?? ".")
        const project = loadProject(cwd)
        if (project !== undefined)
            verbose(`using project configuration "${literal(project.file)}"`)
        const env     = (name: string) =>
            process.env[name] !== undefined && process.env[name] !== "" ? process.env[name] : undefined
        const config  = options.config !== undefined && options.config.length > 0 ? options.config :
            env("SPECBOOK_CONFIG")?.split(path.delimiter).filter((pattern) => pattern !== "")
        const basedir = options.basedir ?? env("SPECBOOK_BASEDIR")
        const given   = (value: string) =>
            options.cwd !== undefined ? path.resolve(cwd, value) : value
        const derived = (value: string) =>
            options.cwd !== undefined ? value : path.relative(cwd, value) || "."
        return {
            config: config !== undefined && config.length > 0 ?
                config.map((pattern) => pattern === "std" ? pattern : given(pattern)) :
                project?.config?.map((pattern) => pattern === "std" ? pattern : derived(pattern)),
            basedir: basedir !== undefined ? given(basedir) :
                project?.basedir !== undefined ? derived(project.basedir) :
                    options.cwd !== undefined ? cwd : undefined
        }
    }

    /*  determine the files of the YAML schema configuration out of the
        glob patterns, in the order of the patterns and alphabetically
        within a pattern, where the literal "std" names the bundled
        standard schema configuration, which is also the fallback if no
        pattern is given at all  */
    private async configFiles (patterns?: string[]): Promise<string[]> {
        if (patterns === undefined || patterns.length === 0)
            return [ standardConfig ]
        const files = new Array<string>()
        for (const pattern of patterns) {
            if (pattern === "std") {
                files.push(standardConfig)
                continue
            }
            const matches = await glob(pattern, { nodir: true,
                windowsPathsNoEscape: process.platform === "win32" })
            if (matches.length === 0)
                throw new Error(`no configuration file matches "${pattern}"`)
            files.push(...matches.sort())
        }
        return files
    }

    /*  load the YAML schema configuration out of its files, failing on any problem  */
    private requireConfig (files: string[], verbose: Verbose): Schema {
        verbose("loading schema configuration " +
            files.map((file) => `"${literal(file)}"`).join(", "))
        const { config, diagnostics } = loadConfig(files)
        if (config === undefined)
            throw new Error("invalid configuration:\n" +
                diagnostics.map(renderDiagnostic).join("\n"))
        const stats = configStatistics(config)
        verbose(`loaded schema configuration specifying ${literal(stats.objects)} object kind(s) ` +
            `and ${literal(stats.links)} link relationship(s)`)
        return config
    }

    /*  initialize the configured specification artifact files
        below the base directory  */
    async init (options: ProjectOptions): Promise<string[]> {
        const verbose = this.verboseOf("init")
        const project = this.project(options, verbose)
        return initSpecification({ config: this.requireConfig(await this.configFiles(project.config), verbose),
            basedir: project.basedir ?? ".", verbose })
    }

    /*  lint the specification Markdown files below the base directory,
        where "gitignore" treats an artifact file Git excludes from its
        project exactly like an absent one  */
    async lint (options: ProjectOptions & { gitignore?: boolean }): Promise<LintResult> {
        const verbose = this.verboseOf("lint")
        const project = this.project(options, verbose)
        return lint({ config: await this.configFiles(project.config),
            basedir: project.basedir ?? ".", gitignore: options.gitignore === true, verbose })
    }

    /*  render an already parsed specification into the requested formats
        (strict: any error diagnostic prevents the export, as a partial or
        invalid specification must never be emitted, while the warnings
        are just surfaced as notices), where "realtime" injects the
        client-side script of the live preview into the HTML and "slim"
        drops the embedded images of the AST formats  */
    private async renderFormats (result: LintResult, requested: ExportFormat[],
        verbose: Verbose, realtime: boolean, slim: boolean): Promise<Buffer[]> {
        if (result.diagnostics.some((diagnostic) => diagnostic.severity === "error"))
            throw new Error("invalid specification:\n" +
                result.diagnostics.map(renderDiagnostic).join("\n"))
        for (const diagnostic of result.diagnostics)
            verbose(renderDiagnostic(diagnostic), "none")
        if (result.specification.artifacts.length === 0)
            throw new Error("unexportable specification: no artifacts found")
        const buffers = new Array<Buffer>()
        for (const format of requested)
            buffers.push(await exportSpecification(result.specification, format,
                verbose, result.config, realtime, slim))
        return buffers
    }

    /*  export the specification Markdown files below the base directory
        as JSON, JSON5, YAML, TOON, HTML, PDF, or normalized Markdown,
        parsing the input just once and returning one buffer per
        requested format  */
    async export (options: ProjectOptions & { formats?: ExportFormat[],
        realtime?: boolean, gitignore?: boolean, slim?: boolean }): Promise<Buffer[]> {
        const verbose   = this.verboseOf("export")
        const requested = options.formats ?? [ "json" ]
        const project   = this.project(options, verbose)

        /*  a missing browser is an environment problem, so let the PDF
            export fail before the specification is even parsed  */
        if (requested.includes("pdf"))
            await requireBrowser(verbose)

        const result = lint({ config: await this.configFiles(project.config),
            basedir: project.basedir ?? ".", gitignore: options.gitignore === true, verbose })
        return this.renderFormats(result, requested, verbose, options.realtime === true,
            options.slim === true)
    }

    /*  keep an export in sync with its sources (the shared core of
        "watch" and "preview"): every change of a configuration file, of an
        artifact file, or of one of its embedded assets re-exports the
        specification and hands the buffers to "onExport" once the sources
        fell silent again. A failed re-export is reported and leaves the
        observe loop intact, so a transiently invalid specification (or
        configuration) does not end the watch. The returned promise settles
        once the initial export is done, while the active watcher keeps the
        process alive afterwards  */
    private async observe (options: ProjectOptions & { formats: ExportFormat[],
        realtime: boolean, gitignore?: boolean, slim?: boolean, outputs?: string[],
        onExport: (buffers: Buffer[]) => void | Promise<void> },
    verbose: Verbose): Promise<void> {
        const project = this.project(options, verbose)
        const config  = await this.configFiles(project.config)
        return watchSpecification(async () => {
            /*  the lint result carries the files to observe even for an
                invalid specification, and the configuration files are
                observed, too, so a failing export (even one due to an
                invalid configuration) still keeps the observe loop fed  */
            const result = lint({ config, basedir: project.basedir ?? ".",
                gitignore: options.gitignore === true, verbose })
            const files  = [ ...config.map((file) => path.resolve(file)), ...result.files ]

            /*  an output which is itself an observed source would re-trigger
                the observation with its own write and hence feed an endless
                re-export loop, so refuse it before it is ever written  */
            const collision = options.outputs?.find((output) => files.includes(path.resolve(output)))
            if (collision !== undefined)
                throw new Error(`the output "${collision}" is an observed source file, ` +
                    "which would re-trigger the observation endlessly")

            try {
                await options.onExport(await this.renderFormats(result, options.formats,
                    verbose, options.realtime, options.slim === true))
            }
            catch (err) {
                verbose("export failed: " +
                    (err instanceof Error ? err.message : String(err)), "none")
            }
            return files
        }, verbose)
    }

    /*  export the specification like "export" and then keep the export
        in sync with its sources (see "observe"), where "outputs" names the
        files "onExport" writes, so an output which is itself an observed
        source can be refused  */
    async watch (options: ProjectOptions & { formats?: ExportFormat[],
        realtime?: boolean, gitignore?: boolean, slim?: boolean, outputs?: string[],
        onExport: (buffers: Buffer[]) => void | Promise<void> }): Promise<void> {
        const verbose   = this.verboseOf("export")
        const requested = options.formats ?? [ "json" ]
        if (requested.includes("pdf"))
            await requireBrowser(verbose)
        return this.observe({ ...options, formats: requested,
            realtime: options.realtime === true }, verbose)
    }

    /*  serve the HTML export of the specification as a live preview on
        "http://<addr>:<port>/": the export is kept in sync with its
        sources (see "observe") and every fresh export is pushed to the
        connected browsers as an in-place document update, through the
        client-side script the "realtime" export injects into the HTML  */
    async preview (options: ProjectOptions & { addr?: string,
        port?: number, gitignore?: boolean }): Promise<void> {
        const verbose = this.verboseOf("preview")
        const server  = await servePreview({ addr: options.addr ?? previewAddr,
            port: options.port ?? previewPort, verbose })
        return this.observe({ config: options.config, basedir: options.basedir, cwd: options.cwd,
            formats: [ "html" ], realtime: true, gitignore: options.gitignore,
            onExport: ([ html ]) => server.update(html) }, verbose)
    }

    /*  describe the generic SpecBook models and formats as Markdown (or
        as the raw original file content), either entirely or reduced to
        a single part, optionally pointing to the artifacts of the
        particular project, whose YAML schema configuration is validated
        before use and optionally emitted compressed by level  */
    async describe (options: ProjectOptions & { embed?: boolean, compress?: CompressLevel,
        format?: DescribeFormat, part?: DescribePart }): Promise<string> {
        const verbose = this.verboseOf("describe")
        const format  = options.format ?? "md"
        const part    = options.part   ?? "all"
        const project = this.project(options, verbose)

        /*  the schema-bearing parts require a schema configuration, so
            they fall back onto the bundled standard one, which is always
            embedded, as its bundled file is no meaningful reference  */
        const given    = project.config !== undefined
        const standard = !given && (part === "all" || part === "schema")
        const config   = given || standard ? await this.configFiles(project.config) : undefined
        const embed    = options.embed === true || standard
        const basedir  = project.basedir ?? (part === "spec" ? "." : undefined)
        const schema   = config !== undefined ? this.requireConfig(config, verbose) : undefined
        verbose(`describing the "${literal(part)}" part of the SpecBook models and formats ` +
            `in the "${literal(format)}" format`)
        return describeFormat({ ...options, config, schema, basedir, embed, standard, format, part })
    }
}
