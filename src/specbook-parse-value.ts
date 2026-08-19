/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { Tokenizr, type Token } from "tokenizr"

/*  the compiled form of a schema property value expression:
    "/xxx/" (regular expression), "[[xxx]]" (object reference),
    "enum(xxx,yyy)" (one member), "tags(xxx,yyy)" (member set), and
    "list(xxx[, ...])" (items matching one of the alternatives)  */
export type ValueExpr =
    | { kind: "regex",     regex: RegExp, source: string }
    | { kind: "reference", pattern: string }
    | { kind: "enum",      members: string[] }
    | { kind: "tags",      members: string[] }
    | { kind: "list",      alternatives: ValueExpr[] }

/*  the lexer for value expressions (members are either bare words or
    double-quoted strings, mirroring the quoting of reference segments)  */
const lexer = new Tokenizr()
lexer.rule(/\/((?:\\.|[^\\/])*)\//, (ctx, match) => {
    ctx.accept("regex", match[1])
})
lexer.rule(/\[\[([^[\]]+)\]\]/, (ctx, match) => {
    ctx.accept("reference", match[1].trim())
})
lexer.rule(/(enum|tags|list)\(/, (ctx, match) => {
    ctx.accept("opener", match[1])
})
lexer.rule(/"((?:\\"|[^"])*)"/, (ctx, match) => {
    ctx.accept("member", match[1].replace(/\\"/g, "\""))
})
lexer.rule(/[^,()/[\]"\s]+/, (ctx, match) => {
    ctx.accept("member", match[0])
})
lexer.rule(/,/, (ctx) => {
    ctx.accept("comma")
})
lexer.rule(/\)/, (ctx) => {
    ctx.accept("close")
})
lexer.rule(/\s+/, (ctx) => {
    ctx.ignore()
})

/*  describe a token for error messages  */
const tokenName = (token: Token): string =>
    token.type === "EOF" ? "end of expression" : `"${token.text}"`

/*  parse a single expression from the token stream  */
const parseValueExpr = (tokens: Token[], pos: { i: number }, nested: boolean): ValueExpr => {
    const token = tokens[pos.i++]
    if (token.type === "regex") {
        const source = String(token.value)
        try {
            return { kind: "regex", regex: new RegExp(source), source }
        }
        catch (err) {
            throw new Error(`invalid regular expression "/${source}/": ` +
                (err instanceof Error ? err.message : String(err)))
        }
    }
    else if (token.type === "reference")
        return { kind: "reference", pattern: String(token.value) }
    else if (token.type === "opener" && (token.value === "enum" || token.value === "tags")) {
        const members = new Array<string>()
        for (;;) {
            const member = tokens[pos.i++]
            if (member.type !== "member")
                throw new Error(`expected member in "${token.value}(...)", got ${tokenName(member)}`)
            members.push(String(member.value))
            const sep = tokens[pos.i++]
            if (sep.type === "close")
                break
            if (sep.type !== "comma")
                throw new Error(`expected "," or ")" in "${token.value}(...)", got ${tokenName(sep)}`)
        }
        return { kind: token.value === "enum" ? "enum" : "tags", members }
    }
    else if (token.type === "opener" && token.value === "list") {
        if (nested)
            throw new Error("nested \"list(...)\" is not allowed")
        const alternatives = new Array<ValueExpr>()
        for (;;) {
            alternatives.push(parseValueExpr(tokens, pos, true))
            const sep = tokens[pos.i++]
            if (sep.type === "close")
                break
            if (sep.type !== "comma")
                throw new Error(`expected "," or ")" in "list(...)", got ${tokenName(sep)}`)
        }
        return { kind: "list", alternatives }
    }
    else
        throw new Error(`expected value expression, got ${tokenName(token)}`)
}

/*  compile a value expression, memoized per source string  */
const cache = new Map<string, ValueExpr>()
export const compileValueExpr = (source: string): ValueExpr => {
    let expr = cache.get(source)
    if (expr === undefined) {
        const tokens = lexer.reset().input(source).tokens()
        const pos    = { i: 0 }
        expr = parseValueExpr(tokens, pos, false)
        if (tokens[pos.i].type !== "EOF")
            throw new Error(`unexpected trailing ${tokenName(tokens[pos.i])}`)
        cache.set(source, expr)
    }
    return expr
}

/*  split a property value at top-level commas, honoring double-quoted
    sections and "[[...]]" reference bracketing  */
export const splitItems = (text: string): string[] => {
    const parts     = [ "" ]
    let   quoted    = false
    let   bracketed = false
    for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (char === "\"")
            quoted = !quoted
        if (!quoted && !bracketed && char === "[" && text[i + 1] === "[") {
            parts[parts.length - 1] += "[["
            bracketed = true
            i++
        }
        else if (!quoted && bracketed && char === "]" && text[i + 1] === "]") {
            parts[parts.length - 1] += "]]"
            bracketed = false
            i++
        }
        else if (!quoted && !bracketed && char === ",")
            parts.push("")
        else
            parts[parts.length - 1] += char
    }
    return parts.map((part) => part.trim()).filter((part) => part !== "")
}
