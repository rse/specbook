/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  the level of a verbose message, named after the least verbosity
    surfacing it: "none" for the few environment-related messages, the
    warning diagnostics, and the preview server events, which a consumer
    has to surface unconditionally, "notice" for the regular processing
    information, which a consumer usually surfaces on demand only,
    "detail" for the additional figures (the coverage ratios), and
    "trace" for the lengthy details (the unreferenced objects)  */
export type VerboseLevel = "none" | "notice" | "detail" | "trace"

/*  the sink of the verbose messages of a single command  */
export type Verbose = (msg: string, level?: VerboseLevel) => void

/*  the verbosity a consumer runs at, as the least one surfacing the
    messages of each level: a message passes a consumer whose verbosity
    is at least the one of its level  */
export const verbosities = [ 0, 1, 2, 3 ] as const
export type Verbosity   = typeof verbosities[number]
export const verbosityOf: Record<VerboseLevel, Verbosity> = { none: 0, notice: 1, detail: 2, trace: 3 }

/*  parse and validate a verbosity specification, where a bare flag (or
    a boolean word) selects the regular processing information  */
export const parseVerbosity = (value: string | number | boolean): Verbosity => {
    const text  = String(value)
    const level = (/^(?:true|yes|on)$/i).test(text) ? 1 :
        (/^(?:false|no|off)$/i).test(text) ? 0 :
            (/^\d+$/).test(text) ? Number(text) : NaN
    const verbosity = verbosities.find((n) => n === level)
    if (verbosity === undefined)
        throw new Error(`unknown verbosity "${value}" ` +
            `(supported: ${verbosities.join(", ")})`)
    return verbosity
}

/*  the sentinel characters delimiting a marked literal value, taken
    from the Unicode private use area, so they never clash with the
    regular content of a verbose message  */
const begin  = "\uE000"
const end    = "\uE001"
const marker = new RegExp(`${begin}([^${end}]*)${end}`, "g")

/*  mark a literal value (path, number, format, ...) inside a verbose
    message, so the output sink can style it without having to guess  */
export const literal = (value: string | number): string =>
    `${begin}${value}${end}`

/*  render a verbose message by either styling its marked literal values
    with the given styler or just stripping their markers away  */
export const renderVerbose = (msg: string, style?: (value: string) => string): string =>
    msg.replace(marker, (_, value: string) =>
        style !== undefined ? style(value) : value)
