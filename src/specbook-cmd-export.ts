/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import type { Specification }
    from "./specbook-struct-spec.js"
import { documentTitle }
    from "./specbook-export-common.js"
import { renderAst, type AstFormat }
    from "./specbook-export-ast.js"
import { renderMarkdown }
    from "./specbook-export-md.js"
import { renderHtml }
    from "./specbook-export-html.js"
import { htmlToPdf }
    from "./specbook-export-pdf.js"

/*  the supported export formats  */
export const formats = [ "json", "json5", "yaml", "toon", "html", "pdf", "md" ] as const
export type ExportFormat = typeof formats[number]

/*  export a specification into the requested format  */
export const exportSpecification = async (
    specification:   Specification,
    format:          ExportFormat,
    verbose:         (msg: string) => void,
    maxTableColumns = 4
): Promise<Buffer> => {
    if (!(formats as readonly string[]).includes(format))
        throw new Error(`unknown export format "${format}"`)
    verbose(`exporting specification as "${format}"`)
    if (format === "json" || format === "json5" || format === "yaml" || format === "toon")
        return renderAst(specification, format satisfies AstFormat)
    else if (format === "md")
        return Buffer.from(renderMarkdown(specification), "utf8")
    else if (format === "html")
        return Buffer.from(renderHtml(specification, maxTableColumns), "utf8")
    else
        return htmlToPdf((tocPages) => renderHtml(specification, maxTableColumns, tocPages),
            documentTitle(specification), verbose)
}
