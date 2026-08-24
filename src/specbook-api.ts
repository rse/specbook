/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                                           from "node:fs"
import * as path                                         from "node:path"
import { fileURLToPath }                                 from "node:url"

import { loadConfig }                                    from "./specbook-config.js"
import { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic } from "./specbook-diagnostic.js"
import { initSpecification }                             from "./specbook-cmd-init.js"
import { lint, type LintResult }                         from "./specbook-cmd-lint.js"
import { exportSpecification, parseOutputSpec, formats, type ExportFormat } from "./specbook-cmd-export.js"
import { describeFormat }                                from "./specbook-cmd-describe.js"
import { literal, renderVerbose }                        from "./specbook-verbose.js"
import { type Schema }                                   from "./specbook-format-schema.js"

/*  re-export the central types for API consumers  */
export { literal, renderVerbose }
export { formats, parseOutputSpec, type ExportFormat }
export { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic }
export { type LintResult }
export type { Spec, SpecArtifact, SpecObject, SpecDescription, SpecProperty } from "./specbook-format-spec.js"
export type { Schema, SchemaObject, SchemaProperty }                          from "./specbook-format-schema.js"

/*  our own version, taken from the package manifest, which resides one
    level above both the source and the compiled module directory  */
export const version: string = (() => {
    const manifest = path.join(
        path.dirname(fileURLToPath(import.meta.url)), "..", "package.json")
    return (JSON.parse(fs.readFileSync(manifest, "utf8")) as { version: string }).version
})()

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

    /*  require the file of the mandatory YAML schema configuration  */
    private requireConfigFile (file?: string): string {
        if (file === undefined)
            throw new Error("YAML schema configuration required")
        return file
    }

    /*  load a mandatory YAML schema configuration, failing on any problem  */
    private requireConfig (file: string | undefined, verbose: (msg: string) => void): Schema {
        file = this.requireConfigFile(file)
        verbose(`loading configuration "${literal(file)}"`)
        const { config, diagnostics } = loadConfig(file)
        if (config === undefined)
            throw new Error("invalid configuration:\n" +
                diagnostics.map(renderDiagnostic).join("\n"))
        return config
    }

    /*  initialize the configured specification artifact files
        below the base directory  */
    async init (options: { config: string, basedir?: string }): Promise<string[]> {
        const verbose = this.verboseOf("init")
        return initSpecification({ config: this.requireConfig(options.config, verbose),
            basedir: options.basedir ?? ".", verbose })
    }

    /*  lint the specification Markdown files below the base directory  */
    async lint (options: { config: string, basedir?: string }): Promise<LintResult> {
        return lint({ config: this.requireConfigFile(options.config),
            basedir: options.basedir ?? ".", verbose: this.verboseOf("lint") })
    }

    /*  export the specification Markdown files below the base directory
        as JSON, JSON5, YAML, TOON, HTML, PDF, or normalized Markdown,
        parsing the input just once and returning one buffer per
        requested format (best-effort: diagnostics do not prevent the
        export, as validation is the concern of lint)  */
    async export (options: { config: string, basedir?: string, formats?: ExportFormat[] }): Promise<Buffer[]> {
        const verbose = this.verboseOf("export")
        const result  = lint({ config: this.requireConfigFile(options.config),
            basedir: options.basedir ?? ".", verbose })
        for (const diagnostic of result.diagnostics)
            verbose(`diagnostic: ${renderDiagnostic(diagnostic)}`)
        if (result.specification.artifacts.length === 0)
            throw new Error("unexportable specification:\n" +
                result.diagnostics.map(renderDiagnostic).join("\n"))
        const buffers = new Array<Buffer>()
        for (const format of options.formats ?? [ "json" ])
            buffers.push(await exportSpecification(result.specification, format,
                verbose, result.config))
        return buffers
    }

    /*  describe the generic SpecBook models and formats as Markdown,
        optionally pointing to the artifacts of the particular project  */
    async describe (options: { config?: string, basedir?: string, embed?: boolean }): Promise<string> {
        this.verboseOf("describe")("describing the SpecBook models and formats")
        return describeFormat(options)
    }
}
