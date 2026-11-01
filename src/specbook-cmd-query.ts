/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import ASTQ                                     from "astq"
import { Marked, type Token, type MarkedToken } from "marked"
import JSON5                                    from "json5"
import { stringify as stringifyYaml }           from "yaml"
import { encode as encodeToon }                 from "@toon-format/toon"

import type { Spec, SpecArtifact, SpecObject }
    from "./specbook-format-spec.js"
import type { Schema }
    from "./specbook-format-schema.js"
import type { Diagnostic }
    from "./specbook-diagnostic.js"
import { buildLinkIndex, referenceTargets, resolveUnique, expandReferences, type LinkIndex }
    from "./specbook-link.js"
import { parseOutputSpec }
    from "./specbook-cmd-export.js"

/*  a node of the queryable tree: the specification root,
    one of its artifacts, or an object of an artifact tree  */
export type SpecNode = Spec | SpecArtifact | SpecObject

/*  the tree access a custom query function receives  */
export type SpecQueryAdapter = ASTQ.Adapter<SpecNode>

/*  a custom query function, receiving the tree access,
    the current node, and the arguments of its call  */
export type SpecQueryFunc = (adapter: SpecQueryAdapter, node: SpecNode, ...args: unknown[]) => unknown

/*  the fixed attributes of an object node, which win over
    the same-named property keys  */
const objectFields = [ "kind", "id", "anchor", "paren", "name", "primary",
    "description", "rationale", "elaboration" ]

/*  the private Markdown renderer of the text helpers, as the
    "marked" singleton is shared with the application  */
const marked = new Marked()

/*  render Markdown tokens into plain text: the blocks joined by the
    separator, the inline markup dropped, and the code kept verbatim  */
const plainOf = (tokens: Token[], separator: string): string =>
    tokens.map((generic) => {
        const token = generic as MarkedToken
        if (token.type === "space" || token.type === "hr" || token.type === "html" || token.type === "def")
            return ""
        else if (token.type === "code" || token.type === "codespan")
            return token.text
        else if (token.type === "br")
            return "\n"
        else if (token.type === "blockquote")
            return plainOf(token.tokens, "\n\n")
        else if (token.type === "list")
            return token.items.map((item) => plainOf(item.tokens, "\n")).join("\n")
        else if (token.type === "table")
            return [ token.header, ...token.rows ].map((row) =>
                row.map((cell) => plainOf(cell.tokens, "")).join(" | ")).join("\n")
        else if ("tokens" in token && token.tokens !== undefined)
            return plainOf(token.tokens, "")
        else
            return "text" in token ? token.text : ""
    }).filter((part) => part !== "").join(separator)

/*  the serialization formats of the query results (the AST export ones)  */
export const queryFormats = [ "json", "json5", "yaml", "toon" ] as const
export type QueryFormat = typeof queryFormats[number]

/*  determine the format and file of a query output: an explicit format
    wins, else it is inferred exactly like the one of an export output
    (a "<format>:" prefix, else the filename extension, "-" being JSON),
    where only the serialization formats apply  */
export const parseQueryOutput = (output: string, format?: string): { format: QueryFormat, output: string } => {
    const spec = format !== undefined ? { format, output } : parseOutputSpec(output)
    if (!(queryFormats as readonly string[]).includes(spec.format))
        throw new Error(`unsupported query format "${spec.format}" (supported: ${queryFormats.join(", ")})`)
    return { format: spec.format as QueryFormat, output: spec.output }
}

/*  render query result nodes in a serialization format: their subtrees
    included, the embedded file contents dropped (the bulk no consumer
    can use), and the dates as ISO strings  */
export const renderNodes = (nodes: SpecNode[], format: QueryFormat = "json"): string => {
    const plain = JSON.parse(JSON.stringify(nodes, (key: string, value: unknown) =>
        key === "embedding" ? undefined : value)) as unknown
    if (format === "json")
        return JSON.stringify(plain, null, 4) + "\n"
    else if (format === "json5")
        return JSON5.stringify(plain, null, 4) + "\n"
    else if (format === "yaml")
        return stringifyYaml(plain)
    else
        return encodeToon(plain) + "\n"
}

/*  a loaded specification, queryable through the XPath-like ASTq
    selectors: the root node (type "specification") holds the artifacts
    (type "artifact"), which hold the object trees (typed by their kind,
    whitespace dashed), and the pre-registered function "refs()" yields
    the objects the references of the current object resolve to  */
export class SpecBookDocument {
    readonly specification: Spec
    readonly config:        Schema
    readonly diagnostics:   Diagnostic[]
    private  astq           = new ASTQ()
    private  parents        = new WeakMap<SpecNode, SpecNode>()
    private  attrs          = new WeakMap<SpecNode, Map<string, unknown>>()
    private  index:         LinkIndex
    constructor (specification: Spec, config: Schema, diagnostics: Diagnostic[],
        origins: Map<SpecArtifact, string>) {
        this.specification = specification
        this.config        = config
        this.diagnostics   = diagnostics
        this.index         = buildLinkIndex(specification)

        /*  index the parents once, as the objects carry no parent reference  */
        const walk = (object: SpecObject, parent: SpecNode) => {
            this.parents.set(object, parent)
            for (const child of object.children)
                walk(child, object)
        }
        for (const artifact of specification.artifacts) {
            this.parents.set(artifact, specification)
            for (const object of artifact.objects)
                walk(object, artifact)
        }

        /*  determine the attributes of a node once: the timestamps and
            source file of an artifact, and the fixed fields of an object
            followed by its properties (the first of duplicate keys winning)  */
        const attributesOf = (node: SpecNode): Map<string, unknown> => {
            let attrs = this.attrs.get(node)
            if (attrs === undefined) {
                attrs = new Map<string, unknown>()
                if ("objects" in node) {
                    attrs.set("created",  node.created.toISOString())
                    attrs.set("modified", node.modified.toISOString())
                    attrs.set("file",     origins.get(node))
                }
                else if ("kind" in node) {
                    const fields = [ node.kind, node.id, node.anchor, node.paren, node.name, node.primary,
                        node.description?.description, node.description?.rationale, node.description?.elaboration ]
                    for (const [ i, value ] of fields.entries())
                        if (value !== undefined)
                            attrs.set(objectFields[i], value)
                    for (const property of node.properties)
                        if (!objectFields.includes(property.key) && !attrs.has(property.key))
                            attrs.set(property.key, property.value)
                }
                this.attrs.set(node, attrs)
            }
            return attrs
        }

        /*  access the specification tree exclusively, as the plain AST
            objects would otherwise be tasted by the built-in JSON adapter  */
        const adapter: SpecQueryAdapter = {
            taste:            (node) => node === specification || this.parents.has(node as SpecNode),
            getParentNode:    (node) => this.parents.get(node) ?? null,
            getChildNodes:    (node) => "artifacts" in node ? node.artifacts :
                "objects" in node ? node.objects : node.children,
            getNodeType:      (node) => "artifacts" in node ? "specification" :
                "objects" in node ? "artifact" : node.kind.replace(/\s+/g, "-"),
            getNodeAttrNames: (node) => Array.from(attributesOf(node).keys()),
            getNodeAttrValue: (node, attr) => attributesOf(node).get(attr)
        }
        this.astq.adapter(adapter, true)
        this.astq.func("refs", (_adapter: SpecQueryAdapter, node: SpecNode) =>
            "kind" in node ? referenceTargets(this.index, node) : [])
    }

    /*  query the nodes an ASTq selector matches, starting at the root,
        with the values of the "{name}" parameters of the selector  */
    query (selector: string, params?: Record<string, unknown>): SpecNode[] {
        return this.astq.query<SpecNode>(this.specification, selector, params)
    }

    /*  the parent of a node (undefined for the root)  */
    parent (node: SpecNode): SpecNode | undefined {
        return this.parents.get(node)
    }

    /*  register a custom query function (or replace a registered one)  */
    func (name: string, fn: SpecQueryFunc): this {
        this.astq.func(name, fn)
        return this
    }

    /*  replace the references of a Markdown text (outside its code) by
        the names of their targets, resolved nearest to the referencing
        object (if given), an unresolvable one keeping its reference text  */
    private expand (text: string, from?: SpecObject): string {
        return expandReferences(text, (reference) =>
            resolveUnique(this.index, reference, from).target?.name ?? reference)
    }

    /*  render a Markdown text (a description part or property value) into plain text  */
    plain (text: string, from?: SpecObject): string {
        return plainOf(marked.lexer(this.expand(text, from)), "\n\n")
    }

    /*  render a Markdown text (a description part or property value) into an HTML fragment  */
    html (text: string, from?: SpecObject): string {
        return marked.parse(this.expand(text, from), { async: false })
    }
}

