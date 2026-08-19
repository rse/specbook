/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { loadConfig }                                    from "./specbook-config.js"
import { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic } from "./specbook-diagnostic.js"
import { initSpecification }                             from "./specbook-cmd-init.js"
import { lint, type LintResult }                         from "./specbook-cmd-lint.js"
import { exportSpecification, parseOutputSpec, formats, type ExportFormat } from "./specbook-cmd-export.js"
import { describeConfiguration }                         from "./specbook-cmd-describe.js"
import { importSpecification }                           from "./specbook-cmd-import.js"
import { editSpecification }                             from "./specbook-cmd-edit.js"
import { type SchemaSpecification }                      from "./specbook-struct-schema.js"

/*  re-export the central types for API consumers  */
export { formats, parseOutputSpec, type ExportFormat }
export { renderDiagnostic, renderDiagnosticVerbose, type Diagnostic }
export { type LintResult }
export type { Specification, Artifact, Object, Description, Property } from "./specbook-struct-spec.js"
export type { SchemaSpecification, SchemaObject, SchemaProperty }      from "./specbook-struct-schema.js"

/*  the constructor options of the SpecBook API  */
export interface SpecBookOptions {
    verbose?: (msg: string) => void
}

/*  the SpecBook API  */
export class SpecBook {
    private verbose: (msg: string) => void
    constructor (options: SpecBookOptions = {}) {
        this.verbose = options.verbose ?? (() => { /*  no operation  */ })
    }

    /*  load a mandatory YAML schema configuration, failing on any problem  */
    private requireConfig (file?: string): SchemaSpecification {
        if (file === undefined)
            throw new Error("YAML schema configuration required")
        this.verbose(`loading configuration "${file}"`)
        const { config, diagnostics } = loadConfig(file)
        if (config === null)
            throw new Error("invalid configuration:\n" +
                diagnostics.map(renderDiagnostic).join("\n"))
        return config
    }

    /*  initialize the configured specification artifact files
        below the base directory  */
    async init (options: { config?: string, basedir?: string }): Promise<string[]> {
        return initSpecification({ ...options,
            config: this.requireConfig(options.config), verbose: this.verbose })
    }

    /*  lint the specification Markdown files below the base directory  */
    async lint (options: { config?: string, basedir?: string }): Promise<LintResult> {
        return lint({ config: options.config, basedir: options.basedir ?? ".", verbose: this.verbose })
    }

    /*  export the specification Markdown files below the base directory
        as JSON, JSON5, YAML, TOON, HTML, PDF, or normalized Markdown,
        parsing the input just once and returning one buffer per
        requested format (best-effort: diagnostics do not prevent the
        export, as validation is the concern of lint)  */
    async export (options: { config?: string, basedir?: string, formats?: ExportFormat[] }): Promise<Buffer[]> {
        const result = lint({ config: options.config, basedir: options.basedir ?? ".", verbose: this.verbose })
        for (const diagnostic of result.diagnostics)
            this.verbose(`diagnostic: ${renderDiagnostic(diagnostic)}`)
        if (result.specification.artifacts.length === 0)
            throw new Error("unexportable specification:\n" +
                result.diagnostics.map(renderDiagnostic).join("\n"))
        const buffers = [] as Buffer[]
        for (const format of options.formats ?? [ "json" ])
            buffers.push(await exportSpecification(result.specification, format,
                this.verbose, result.config))
        return buffers
    }

    /*  describe the configured specification format as Markdown  */
    async describe (options: { config?: string }): Promise<string> {
        return describeConfiguration(this.requireConfig(options.config))
    }

    /*  import foreign sources into the specification artifact files
        below the base directory  */
    async import (options: { config?: string, basedir?: string, inputs: string[],
        provider?: string, model?: string }): Promise<string[]> {
        return importSpecification({ ...options,
            config: this.requireConfig(options.config), verbose: this.verbose })
    }

    /*  apply an edit request to the specification artifact files
        below the base directory  */
    async edit (options: { config?: string, basedir?: string, query: string,
        provider?: string, model?: string }): Promise<string[]> {
        return editSpecification({ ...options,
            config: this.requireConfig(options.config), verbose: this.verbose })
    }
}
