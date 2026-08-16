/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { minify }                    from "@swc/html"

import type { Specification }        from "./specbook-struct-spec.js"
import type { SchemaSpecification }  from "./specbook-struct-schema.js"
import { documentTitle }             from "./specbook-export-common.js"
import { renderAst, type AstFormat } from "./specbook-export-ast.js"
import { renderMarkdown }            from "./specbook-export-md.js"
import { renderHtml }                from "./specbook-export-html.js"
import { htmlToPdf }                 from "./specbook-export-pdf.js"

/*  the supported export formats  */
export const formats = [ "json", "json5", "yaml", "toon", "html", "pdf", "md" ] as const
export type ExportFormat = typeof formats[number]

/*  the filename extensions mapping onto the export formats  */
const extensions: Record<string, ExportFormat> = {
    json:     "json",
    json5:    "json5",
    yaml:     "yaml",   yml: "yaml",
    toon:     "toon",
    html:     "html",   htm: "html",
    pdf:      "pdf",
    md:       "md",     markdown: "md"
}

/*  parse an output specification "[<format>:]<filename>", inferring the
    format from the filename extension when not explicitly given
    (plain "-" for stdout defaults to JSON)  */
export const parseOutputSpec = (spec: string): { format: ExportFormat, output: string } => {
    const prefixed = spec.match(/^([a-zA-Z0-9]+):(.+)$/)
    if (prefixed !== null && (formats as readonly string[]).includes(prefixed[1]))
        return { format: prefixed[1] as ExportFormat, output: prefixed[2] }
    if (spec === "-")
        return { format: "json", output: spec }
    const ext = spec.match(/\.([a-zA-Z0-9]+)$/)
    if (ext !== null && extensions[ext[1].toLowerCase()] !== undefined)
        return { format: extensions[ext[1].toLowerCase()], output: spec }
    throw new Error(`unable to infer export format from output "${spec}" ` +
        "(use an explicit \"<format>:<filename>\" specification)")
}

/*  export a specification into the requested format  */
export const exportSpecification = async (
    specification:   Specification,
    format:          ExportFormat,
    verbose:         (msg: string) => void,
    maxTableColumns = 4,
    config?:         SchemaSpecification
): Promise<Buffer> => {
    if (!(formats as readonly string[]).includes(format))
        throw new Error(`unknown export format "${format}"`)
    verbose(`exporting specification as "${format}"`)
    if (format === "json" || format === "json5" || format === "yaml" || format === "toon")
        return renderAst(specification, format satisfies AstFormat)
    else if (format === "md")
        return Buffer.from(renderMarkdown(specification), "utf8")
    else if (format === "html") {
        /*  compress the rendered HTML (whitespace, comments, and inline CSS)  */
        const html     = renderHtml(specification, maxTableColumns, config)
        const minified = await minify(Buffer.from(html, "utf8"), {
            collapseWhitespaces: "smart",
            removeComments:      true,
            minifyCss:           true
        })
        return Buffer.from(minified.code, "utf8")
    }
    else
        return htmlToPdf((tocPages) => renderHtml(specification, maxTableColumns, config, tocPages),
            documentTitle(specification), verbose)
}

