/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs         from "node:fs"
import sourceCodeError from "source-code-error"

/*  the severity of a diagnostic: an "error" invalidates the specification,
    while a "warning" just flags a lapse the specification still tolerates  */
export type DiagnosticSeverity = "error" | "warning"

/*  a single parse/validation diagnostic  */
export interface Diagnostic {
    file:     string
    line:     number
    column:   number
    severity: DiagnosticSeverity
    message:  string
}

/*  render the message of a diagnostic, qualifying a warning as such  */
const renderMessage = (diagnostic: Diagnostic): string =>
    diagnostic.severity === "warning" ? `warning: ${diagnostic.message}` : diagnostic.message

/*  render a diagnostic as a standard single-line message  */
export const renderDiagnostic = (diagnostic: Diagnostic): string =>
    `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}: ${renderMessage(diagnostic)}`

/*  render a diagnostic as a multi-line message with the affected
    source snippet, falling back to the single-line message when the
    source file is unreadable (e.g. the file is a directory) or empty
    (as there is no snippet to show and sourceCodeError rejects it)  */
export const renderDiagnosticVerbose = (diagnostic: Diagnostic, colors = false): string => {
    let code: string
    try {
        code = fs.readFileSync(diagnostic.file, "utf8")
    }
    catch {
        return `${renderDiagnostic(diagnostic)}\n`
    }
    if (code === "")
        return `${renderDiagnostic(diagnostic)}\n`
    return sourceCodeError({ type: diagnostic.severity === "warning" ? "WARNING" : "ERROR",
        message: diagnostic.message, filename: diagnostic.file,
        code, line: diagnostic.line, column: diagnostic.column, colors })
}
