/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  the severity of a verbose message: "debug" for the regular processing
    information, which a consumer usually surfaces on demand only, and
    "notice" for the few environment-related messages and the warning
    diagnostics, which a consumer has to surface unconditionally  */
export type VerboseLevel = "debug" | "notice"

/*  the sink of the verbose messages of a single command  */
export type Verbose = (msg: string, level?: VerboseLevel) => void

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
