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
import { exportSpecification, parseOutputSpec, formats, type ExportFormat } from "./specbook-cmd-export.js"
import { describeFormat, describeFormats, describeParts, parseDescribeFormat, parseDescribePart,
    type DescribeFormat, type DescribePart }             from "./specbook-cmd-describe.js"
import { literal, renderVerbose }                        from "./specbook-verbose.js"
import { type Schema }                                   from "./specbook-format-schema.js"

/*  re-export the central types for API consumers  */
export { literal, renderVerbose }
export { formats, parseOutputSpec, type ExportFormat }
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

/*  the sink of the verbose messages, receiving the emitting command
    and the message, so consumers can qualify the message themselves  */
export type VerboseSink = (cmd: string, msg: string) => void

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
    private verboseOf (cmd: string): (msg: string) => void {
        return (msg: string) => this.verbose(cmd, msg)
    }

    /*  determine the file of the YAML schema configuration, falling
        back onto the bundled standard schema configuration  */
    private configFile (file?: string): string {
        return file ?? standardConfig
    }

    /*  load a YAML schema configuration, failing on any problem  */
    private requireConfig (file: string | undefined, verbose: (msg: string) => void): Schema {
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

    /*  export the specification Markdown files below the base directory
        as JSON, JSON5, YAML, TOON, HTML, PDF, or normalized Markdown,
        parsing the input just once and returning one buffer per
        requested format (strict: any diagnostic prevents the export,
        as a partial or invalid specification must never be emitted)  */
    async export (options: { config?: string, basedir?: string, formats?: ExportFormat[] }): Promise<Buffer[]> {
        const verbose = this.verboseOf("export")
        const result  = lint({ config: this.configFile(options.config),
            basedir: options.basedir ?? ".", verbose })
        if (result.diagnostics.length > 0)
            throw new Error("invalid specification:\n" +
                result.diagnostics.map(renderDiagnostic).join("\n"))
        if (result.specification.artifacts.length === 0)
            throw new Error("unexportable specification: no artifacts found")
        const buffers = new Array<Buffer>()
        for (const format of options.formats ?? [ "json" ])
            buffers.push(await exportSpecification(result.specification, format,
                verbose, result.config))
        return buffers
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
