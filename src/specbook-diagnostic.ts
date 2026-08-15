/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"
import sourceCodeError from "source-code-error"

/*  a single parse/validation diagnostic  */
export interface Diagnostic {
    file:    string
    line:    number
    column:  number
    message: string
}

/*  render a diagnostic as a standard single-line message  */
export const renderDiagnostic = (diagnostic: Diagnostic): string =>
    `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}: ${diagnostic.message}`

/*  render a diagnostic as a multi-line message with the affected
    source snippet, falling back to the single-line message when the
    source file is unreadable (e.g. the file is a directory)  */
export const renderDiagnosticVerbose = (diagnostic: Diagnostic, colors = false): string => {
    let code
    try {
        code = fs.readFileSync(diagnostic.file, "utf8")
    }
    catch {
        return `${renderDiagnostic(diagnostic)}\n`
    }
    return sourceCodeError({ message: diagnostic.message, filename: diagnostic.file,
        code, line: diagnostic.line, column: diagnostic.column, colors })
}
