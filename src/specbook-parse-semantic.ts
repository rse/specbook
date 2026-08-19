/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { type Specification, type Artifact, type Object as SpecObject }
    from "./specbook-struct-spec.js"
import { type SchemaSpecification, type SchemaObject }
    from "./specbook-struct-schema.js"
import { referenceRegex, resolveUnique, resolveSet }
    from "./specbook-link.js"
import { compileValueExpr, splitItems, type ValueExpr }
    from "./specbook-parse-value.js"
import { ParseContext }
    from "./specbook-parse-common.js"

/*  strip a trailing parenthesized annotation from a
    property key (e.g. "WHEN (Context)")  */
const plainKey = (key: string): string =>
    key.replace(/\s*\([^)]*\)\s*$/, "").trim()

/*  strip the inline code markup of a name or property value
    (preserved in the AST for rendering) for matching purposes  */
const plainText = (text: string): string =>
    text.replace(/`/g, "")

/*  compile a configured pattern into an anchored regular expression  */
const anchored = (pattern: string, flags = ""): RegExp =>
    new RegExp(`^(?:${pattern})$`, flags)

/*  match a single inline token against a value expression
    (case-insensitively, as inline tokens are decorations)  */
const tokenMatches = (expr: ValueExpr, token: string): boolean =>
    expr.kind === "regex" ?
        anchored(expr.source, "i").test(token) :
        expr.kind === "enum" ?
            expr.members.some((member) => member.toLowerCase() === token.toLowerCase()) :
            false

/*  match a full property value directly against a value expression
    (defined for the regex and enum kinds only)  */
const directMatches = (expr: ValueExpr, text: string): boolean =>
    expr.kind === "regex" ?
        expr.regex.test(text) :
        expr.kind === "enum" ?
            expr.members.includes(text) :
            false

/*  match a single list item against the alternatives of a list
    constraint (a reference item resolves leniently, as unresolvable
    and ambiguous ones are already reported by the reference pass)  */
const matchAlternatives = (ctx: ParseContext, alternatives: ValueExpr[], item: string): boolean => {
    const rm = item.match(/^\[\[([^[\]]+)\]\]$/)
    for (const alternative of alternatives) {
        if (alternative.kind === "reference") {
            if (rm === null)
                continue
            const target = resolveUnique(ctx.linkIndex, rm[1].trim()).target
            if (target === undefined
                || resolveSet(ctx.linkIndex, alternative.pattern).includes(target))
                return true
        }
        else if (alternative.kind === "tags") {
            if (alternative.members.includes(plainText(item)))
                return true
        }
        else if (directMatches(alternative, plainText(item)))
            return true
    }
    return false
}

/*  validate a single object (and recursively its childs) against its schema  */
const validateObject = (ctx: ParseContext, object: SpecObject, schema: SchemaObject, level: number) => {
    const meta  = ctx.objectMeta.get(object) ?? { file: "", line: 1 }
    const props = schema.props ?? []

    /*  check the name convention (the configured name of non-artifact
        objects is a regular expression pattern)  */
    if (level > 1 && schema.name !== undefined && !anchored(schema.name).test(plainText(object.name)))
        ctx.diagnose(meta.file, meta.line,
            `${object.kind} name "${object.name}" does not match pattern "${schema.name}"`)

    /*  a configured id has to be explicitly specified 1:1 in the
        input, via either "{{<id>}}" or "(<id>)"  */
    if (schema.id !== undefined && (object.anchor ?? object.paren) !== schema.id)
        ctx.diagnose(meta.file, meta.line,
            `configured id "${schema.id}" not explicitly specified on ${object.kind} "${object.name}"`)

    /*  find a property by its key (case-sensitive)  */
    const findProp = (name: string) =>
        object.properties.find((p) => plainKey(p.key) === name)

    /*  the tokens split off multi-token property values below, assigned
        to the still unset configured properties by matching their patterns  */
    const tokens        = new Array<string>()
    const tokenAssigned = new Set<string>()

    /*  explode a multi-token property value whose direct pattern check
        fails: keep the token matching the own pattern and distribute
        the remaining tokens across the sibling properties  */
    for (const prop of props) {
        if (prop.value === undefined)
            continue
        const expr = compileValueExpr(prop.value)
        if (expr.kind !== "regex" && expr.kind !== "enum")
            continue
        const match = findProp(prop.name)
        if (match === undefined || directMatches(expr, plainText(match.value)))
            continue
        const parts = plainText(match.value).split(/\s+/)
        if (parts.length < 2)
            continue
        const idx = parts.findIndex((part) => tokenMatches(expr, part))
        if (idx < 0)
            continue
        match.value = parts[idx]
        tokenAssigned.add(prop.name)
        parts.splice(idx, 1)
        tokens.push(...parts)
    }

    /*  assign the collected tokens to the still unset configured
        properties whose pattern they match  */
    for (const prop of props) {
        if (prop.value === undefined || findProp(prop.name) !== undefined)
            continue
        const expr = compileValueExpr(prop.value)
        if (expr.kind !== "regex" && expr.kind !== "enum")
            continue
        const idx = tokens.findIndex((token) => tokenMatches(expr, token))
        if (idx >= 0) {
            object.properties.push({ key: prop.name, value: tokens[idx] })
            tokenAssigned.add(prop.name)
            tokens.splice(idx, 1)
        }
    }

    /*  report the tokens which no configured property accepts  */
    for (const token of tokens)
        ctx.diagnose(meta.file, meta.line,
            `unassignable inline token "${token}" on ${object.kind} "${object.name}"`)

    /*  check the configured properties  */
    let parenConsumed = false
    for (const prop of props) {
        const expr  = prop.value !== undefined ? compileValueExpr(prop.value) : undefined
        const match = findProp(prop.name)
        if (match === undefined) {
            /*  accept a trailing parenthesized name token as the value of a
                still missing property when it matches the property pattern  */
            if (object.paren !== undefined && expr !== undefined
                && directMatches(expr, object.paren)) {
                parenConsumed = true
                continue
            }
            if (prop.optional !== true)
                ctx.diagnose(meta.file, meta.line,
                    `required property "${prop.name}" missing on ${object.kind} "${object.name}"`)
        }
        else if (expr !== undefined) {
            const line = ctx.propMeta.get(match)?.line ?? meta.line
            if (expr.kind === "reference") {
                /*  a reference constraint: the value has to be exactly one
                    reference resolving into the constraint's wildcard match set  */
                if (!/^\[\[[^[\]]+\]\]$/.test(match.value.trim()))
                    ctx.diagnose(meta.file, line,
                        `property "${prop.name}" value "${match.value}" is not a single link reference`)
                else {
                    const ref    = match.value.trim().slice(2, -2).trim()
                    const target = resolveUnique(ctx.linkIndex, ref).target
                    if (target !== undefined && !resolveSet(ctx.linkIndex, expr.pattern).includes(target))
                        ctx.diagnose(meta.file, line,
                            `link reference "[[${ref}]]" does not match constraint "${prop.value}"`)
                }
            }
            else if (expr.kind === "tags") {
                /*  a tags constraint: the value is a comma-separated set of
                    configured tags, each occurring at most once  */
                const seen = new Set<string>()
                for (const item of splitItems(plainText(match.value))) {
                    if (!expr.members.includes(item))
                        ctx.diagnose(meta.file, line,
                            `tag "${item}" of property "${prop.name}" not allowed by constraint "${prop.value}"`)
                    else if (seen.has(item))
                        ctx.diagnose(meta.file, line,
                            `duplicate tag "${item}" on property "${prop.name}"`)
                    seen.add(item)
                }
            }
            else if (expr.kind === "list") {
                /*  a list constraint: the value is a comma-separated list
                    of items, each matching at least one alternative  */
                for (const item of splitItems(match.value))
                    if (!matchAlternatives(ctx, expr.alternatives, item))
                        ctx.diagnose(meta.file, line,
                            `list item "${item}" of property "${prop.name}" does not match constraint "${prop.value}"`)
            }
            else if (!tokenAssigned.has(prop.name) && !directMatches(expr, plainText(match.value)))
                ctx.diagnose(meta.file, line, expr.kind === "enum" ?
                    `property "${prop.name}" value "${match.value}" is not a member of "${prop.value}"` :
                    `property "${prop.name}" value "${match.value}" does not match pattern "${prop.value}"`)
        }
    }
    for (const property of object.properties)
        if (!props.some((p) => p.name === plainKey(property.key)))
            ctx.diagnose(meta.file, ctx.propMeta.get(property)?.line ?? meta.line,
                `unknown property "${property.key}" on ${object.kind} "${object.name}"`)

    /*  a parenthesized token not consumed as a property value acts as
        the implicit anchor (an explicit "{{...}}" anchor takes precedence)  */
    if (object.paren !== undefined && !parenConsumed && object.anchor === undefined)
        object.id = object.paren

    /*  check the configured child objects  */
    const childs = schema.childs ?? []
    for (const child of object.childs) {
        const childMeta   = ctx.objectMeta.get(child) ?? { file: "", line: 1 }
        const childSchema = childs.find((c) => c.kind === child.kind)
        if (childSchema === undefined) {
            ctx.diagnose(childMeta.file, childMeta.line,
                `unknown object kind "${child.kind}" below ${object.kind} "${object.name}"`)
            continue
        }
        validateObject(ctx, child, childSchema, level + 1)
    }
    for (const child of childs)
        if (child.optional !== true
            && !object.childs.some((c) => c.kind === child.kind))
            ctx.diagnose(meta.file, meta.line,
                `required object kind "${child.kind}" missing below ${object.kind} "${object.name}"`)

    /*  order the childs and properties exactly along the schema
        definition (the sort is stable, so objects of the same kind
        and unknown items keep their document order)  */
    const kindPos = (kind: string) => {
        const i = childs.findIndex((c) => c.kind === kind)
        return i >= 0 ? i : childs.length
    }
    object.childs.sort((a, b) => kindPos(a.kind) - kindPos(b.kind))
    const propPos = (key: string) => {
        const i = props.findIndex((p) => p.name === plainKey(key))
        return i >= 0 ? i : props.length
    }
    object.properties.sort((a, b) => propPos(a.key) - propPos(b.key))
}

/*  validate the parsed specification against the configuration  */
export const validate = (ctx: ParseContext, specification: Specification, config: SchemaSpecification) => {
    const position = new Map<Artifact, number>()
    for (const artifact of specification.artifacts) {
        for (const object of artifact.objects) {
            const meta   = ctx.objectMeta.get(object) ?? { file: "", line: 1 }
            const schema = config.find((s) =>
                (s.kind === object.kind && s.id === object.id) || `${s.kind}-${s.id}` === object.id) ??
                config.find((s) => s.name !== undefined
                    && s.name.toUpperCase() === plainText(object.name).toUpperCase())
            if (schema === undefined) {
                ctx.diagnose(meta.file, meta.line,
                    `unknown artifact "${object.kind}: ${object.name}" (id "${object.id}")`)
                continue
            }

            /*  the artifact heading must carry the configured kind and
                name verbatim (the resolution above is deliberately
                lenient, so deviations are still precisely reported)  */
            if (object.kind !== schema.kind)
                ctx.diagnose(meta.file, meta.line,
                    `artifact kind "${object.kind}" does not match configured kind "${schema.kind}"`)
            if (schema.name !== undefined && plainText(object.name) !== schema.name)
                ctx.diagnose(meta.file, meta.line,
                    `artifact name "${object.name}" does not match configured name "${schema.name}"`)
            if (!position.has(artifact))
                position.set(artifact, config.indexOf(schema))
            validateObject(ctx, object, schema, 1)
        }
    }

    /*  order the artifacts exactly along the schema definition  */
    specification.artifacts.sort((a, b) =>
        (position.get(a) ?? config.length) - (position.get(b) ?? config.length))
}

/*  validate every Wiki-style reference for unique resolvability,
    independent of any configuration  */
export const validateReferences = (ctx: ParseContext, specification: Specification) => {
    const check = (text: string, file: string, line: number) => {
        for (const m of text.matchAll(referenceRegex)) {
            const ref        = m[1].trim()
            const resolution = resolveUnique(ctx.linkIndex, ref)
            if (resolution.ambiguous)
                ctx.diagnose(file, line, `ambiguous link reference "[[${ref}]]"`)
            else if (resolution.target === undefined)
                ctx.diagnose(file, line, `unresolvable link reference "[[${ref}]]"`)
        }
    }
    const walk = (object: SpecObject) => {
        const meta = ctx.objectMeta.get(object) ?? { file: "", line: 1 }
        check(object.name, meta.file, meta.line)
        for (const property of object.properties)
            check(property.value, meta.file, ctx.propMeta.get(property)?.line ?? meta.line)
        if (object.description !== undefined) {
            check(object.description.description, meta.file, meta.line)
            if (object.description.rationale !== undefined)
                check(object.description.rationale, meta.file, meta.line)
        }
        object.childs.forEach(walk)
    }
    for (const artifact of specification.artifacts)
        artifact.objects.forEach(walk)
}
