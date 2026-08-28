/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                                           from "node:fs"
import { fileURLToPath }                                 from "node:url"

import { loadConfig }                                    from "./specbook-config.js"
import { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic } from "./specbook-diagnostic.js"
import { initSpecification }                             from "./specbook-cmd-init.js"
import { lint, type LintResult }                         from "./specbook-cmd-lint.js"
import { exportSpecification, watchSpecification, parseOutputSpec, formats,
    type ExportFormat }                                  from "./specbook-cmd-export.js"
import { servePreview, previewAddr, previewPort }        from "./specbook-cmd-preview.js"
import { describeFormat, describeFormats, describeParts, parseDescribeFormat, parseDescribePart,
    type DescribeFormat, type DescribePart }             from "./specbook-cmd-describe.js"
import { requireBrowser }                                from "./specbook-export-pdf.js"
import { literal, renderVerbose, type Verbose, type VerboseLevel } from "./specbook-verbose.js"
import { type Schema }                                   from "./specbook-format-schema.js"

/*  re-export the central types for API consumers  */
export { literal, renderVerbose, type Verbose, type VerboseLevel }
export { formats, parseOutputSpec, type ExportFormat }
export { previewAddr, previewPort }
export { describeFormats, describeParts, parseDescribeFormat, parseDescribePart }
export { type DescribeFormat, type DescribePart }
export { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic }
export { type LintResult }
export type { Spec, SpecArtifact, SpecObject, SpecDescription, SpecProperty } from "./specbook-format-spec.js"
export type { Schema, SchemaObject, SchemaProperty }                          from "./specbook-format-schema.js"

/*  our own version, taken from the package manifest, which resides one
    level above both the source and the compiled module directory  */
export const version: string = (JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version

/*  the bundled standard YAML schema configuration, which resides
    alongside the compiled module and is used whenever no particular
    schema configuration is given  */
export const standardConfig: string =
    fileURLToPath(new URL("specbook-format.yaml", import.meta.url))

/*  the sink of the verbose messages, receiving the emitting command,
    the message, and its severity, so consumers can qualify the message
    themselves and surface the "notice" ones unconditionally  */
export type VerboseSink = (cmd: string, msg: string, level: VerboseLevel) => void

/*  the constructor options of the SpecBook API  */
export interface SpecBookOptions {
    verbose?: VerboseSink
}

/*  the SpecBook API  */
export class SpecBook {
    private verbose: VerboseSink
    constructor (options: SpecBookOptions = {}) {
        this.verbose = options.verbose ?? (() => { /*  no operation  */ })
    }

    /*  bind the verbose sink to a particular command  */
    private verboseOf (cmd: string): Verbose {
        return (msg: string, level: VerboseLevel = "debug") => this.verbose(cmd, msg, level)
    }

    /*  determine the file of the YAML schema configuration, falling
        back onto the bundled standard schema configuration  */
    private configFile (file?: string): string {
        return file ?? standardConfig
    }

    /*  load a YAML schema configuration, failing on any problem  */
    private requireConfig (file: string | undefined, verbose: Verbose): Schema {
        file = this.configFile(file)
        verbose(`loading schema configuration "${literal(file)}"`)
        const { config, diagnostics } = loadConfig(file)
        if (config === undefined)
            throw new Error("invalid configuration:\n" +
                diagnostics.map(renderDiagnostic).join("\n"))
        return config
    }

    /*  initialize the configured specification artifact files
        below the base directory  */
    async init (options: { config?: string, basedir?: string }): Promise<string[]> {
        const verbose = this.verboseOf("init")
        return initSpecification({ config: this.requireConfig(options.config, verbose),
            basedir: options.basedir ?? ".", verbose })
    }

    /*  lint the specification Markdown files below the base directory  */
    async lint (options: { config?: string, basedir?: string }): Promise<LintResult> {
        return lint({ config: this.configFile(options.config),
            basedir: options.basedir ?? ".", verbose: this.verboseOf("lint") })
    }

    /*  render an already parsed specification into the requested formats
        (strict: any diagnostic prevents the export, as a partial or
        invalid specification must never be emitted), where "realtime"
        injects the client-side script of the live preview into the HTML  */
    private async renderFormats (result: LintResult, formats: ExportFormat[],
        verbose: Verbose, realtime: boolean): Promise<Buffer[]> {
        if (result.diagnostics.length > 0)
            throw new Error("invalid specification:\n" +
                result.diagnostics.map(renderDiagnostic).join("\n"))
        if (result.specification.artifacts.length === 0)
            throw new Error("unexportable specification: no artifacts found")
        const buffers = new Array<Buffer>()
        for (const format of formats)
            buffers.push(await exportSpecification(result.specification, format,
                verbose, result.config, realtime))
        return buffers
    }

    /*  export the specification Markdown files below the base directory
        as JSON, JSON5, YAML, TOON, HTML, PDF, or normalized Markdown,
        parsing the input just once and returning one buffer per
        requested format  */
    async export (options: { config?: string, basedir?: string, formats?: ExportFormat[],
        realtime?: boolean }): Promise<Buffer[]> {
        const verbose   = this.verboseOf("export")
        const requested = options.formats ?? [ "json" ]

        /*  a missing browser is an environment problem, so let the PDF
            export fail before the specification is even parsed  */
        if (requested.includes("pdf"))
            await requireBrowser(verbose)

        return this.renderFormats(lint({ config: this.configFile(options.config),
            basedir: options.basedir ?? ".", verbose }), requested, verbose,
        options.realtime === true)
    }

    /*  keep an export in sync with its sources (the shared core of
        "watch" and "preview"): every change of an artifact file or of one
        of its embedded assets re-exports the specification and hands the
        buffers to "onExport" once the sources fell silent again. A failed
        re-export is reported and leaves the observe loop intact, so a
        transiently invalid specification does not end the watch. The
        returned promise settles once the initial export is done, while
        the active watcher keeps the process alive afterwards  */
    private async observe (options: { config?: string, basedir?: string, formats: ExportFormat[],
        realtime: boolean, onExport: (buffers: Buffer[]) => void | Promise<void> },
    verbose: Verbose): Promise<void> {
        return watchSpecification(async () => {
            /*  the lint result carries the files to observe even for an
                invalid specification, so a failing export still keeps the
                observe loop fed with an up-to-date file set  */
            const result = lint({ config: this.configFile(options.config),
                basedir: options.basedir ?? ".", verbose })
            try {
                await options.onExport(await this.renderFormats(result, options.formats,
                    verbose, options.realtime))
            }
            catch (err) {
                verbose("export failed: " +
                    (err instanceof Error ? err.message : String(err)), "notice")
            }
            return result.files
        }, verbose)
    }

    /*  export the specification like "export" and then keep the export
        in sync with its sources (see "observe")  */
    async watch (options: { config?: string, basedir?: string, formats?: ExportFormat[],
        realtime?: boolean, onExport: (buffers: Buffer[]) => void | Promise<void> }): Promise<void> {
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
    async preview (options: { config?: string, basedir?: string, addr?: string,
        port?: number }): Promise<void> {
        const verbose = this.verboseOf("preview")
        const server  = await servePreview({ addr: options.addr ?? previewAddr,
            port: options.port ?? previewPort, verbose })
        return this.observe({ config: options.config, basedir: options.basedir,
            formats: [ "html" ], realtime: true,
            onExport: ([ html ]) => server.update(html) }, verbose)
    }

    /*  describe the generic SpecBook models and formats as Markdown (or
        as the raw original file content), either entirely or reduced to
        a single part, optionally pointing to the artifacts of the
        particular project, whose YAML schema configuration is validated
        before use  */
    async describe (options: { config?: string, basedir?: string, embed?: boolean,
        format?: DescribeFormat, part?: DescribePart }): Promise<string> {
        const verbose = this.verboseOf("describe")
        const format  = options.format ?? "md"
        const part    = options.part   ?? "all"

        /*  the schema-bearing parts require a schema configuration, so
            they fall back onto the bundled standard one, which is always
            embedded, as its bundled file is no meaningful reference  */
        const standard = options.config === undefined
            && (part === "all" || part === "schema" || options.embed === true)
        const config   = options.config ?? (standard ? standardConfig : undefined)
        const embed    = options.embed === true || standard
        const basedir  = options.basedir ?? (part === "spec" ? "." : undefined)
        if (config !== undefined)
            this.requireConfig(config, verbose)
        verbose(`describing the "${literal(part)}" part of the SpecBook models and formats ` +
            `in the "${literal(format)}" format`)
        return describeFormat({ ...options, config, basedir, embed, standard, format, part })
    }
}
