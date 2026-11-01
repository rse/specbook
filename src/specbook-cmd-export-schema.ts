/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs from "node:fs"

import { loadConfig, configStatistics, originKey, type ConfigOrigins } from "./specbook-config.js"
import { metaConfig, version, reportOverlaps }                         from "./specbook-remote.js"
import { literal, type Verbose }                                       from "./specbook-verbose.js"
import { renderDiagnostic, type Diagnostic }                           from "./specbook-diagnostic.js"
import { parseSpecification, specStatistics, type SourceFile }         from "./specbook-parse.js"
import { type Spec, type SpecObject }                                  from "./specbook-format-spec.js"
import { type Schema, type SchemaObject, type SchemaProperty }         from "./specbook-format-schema.js"
import { compileValueExpr }                                            from "./specbook-parse-value.js"
import { buildLinkIndex, resolveSet, referenceTo, outsideCode }        from "./specbook-link.js"
import { slugify }                                                     from "./specbook-parse-syntax.js"
import { renderObjectMd, formatTimestamp }                             from "./specbook-export-md.js"
import { type LintResult }                                             from "./specbook-cmd-lint.js"

/*  the options of the schema export: the schema configuration files,
    their display labels (the reference or path they were given as),
    and the verbose sink  */
export interface SchemaLintOptions {
    config:  string[]
    labels:  Map<string, string>
    verbose: Verbose
}

/*  escape the Markdown-significant characters of a prose text (a
    configuration file label), with its whitespace collapsed, so it
    renders literally  */
const escapeMd = (text: string): string =>
    text.replace(/\s+/g, " ").trim().replace(/[\\`*_[\]<>|]/g, "\\$&")

/*  render a verbatim text (a value expression, a name pattern, a file
    name, a configuration) as an inline code span, with its whitespace
    collapsed, which renders it literally and in which its "[[...]]"
    is plain code instead of a reference (the fence outgrows every
    backtick run inside, padded where the text touches a backtick)  */
const codeMd = (text: string): string => {
    const code  = text.replace(/\s+/g, " ").trim()
    const fence = "`".repeat(Math.max(0, ...Array.from(code.matchAll(/`+/g), (m) => m[0].length)) + 1)
    const pad   = code.startsWith("`") || code.endsWith("`") ? " " : ""
    return `${fence}${pad}${code}${pad}${fence}`
}

/*  escape a description text taken from the schema configuration for
    the generated corpus, outside of its fenced code blocks and inline
    code spans (in which a "[[" is plain code): every "[[" and "![" is
    escaped, a line-leading "#" would open a heading, and the unordered
    list items become ordered ones, as the former would be taken for
    properties, while an inline code span carrying an "![" becomes
    escaped plain text, as the parser loads an embedding even there  */
const escapeDesc = (text: string): string =>
    outsideCode(text.trim().replace(/`([^`\n]*!\[[^`\n]*)`/g, (_, code: string) => escapeMd(code)), (part) => {
        let counter = 0
        return part
            .replace(/\[\[/g, "\\[\\[")
            .replace(/!\[/g, "!\\[")
            .split("\n").map((line) => {
                const item = line.match(/^(\s*)[-*+]\s+(.*)$/)
                if (item !== null)
                    return `${item[1]}${++counter}.  ${item[2]}`
                if ((/^\S/).test(line))
                    counter = 0
                return line.replace(/^(\s*)#/, "$1\\#")
            }).join("\n")
    })

/*  flatten a nested configuration value (an automaton, badge, diagram,
    or format) into "key=value" pairs, with the nested keys dotted, the
    lists of scalars bracketed, and the elements of the lists of objects
    (the diagrams) indexed  */
const flatten = (value: unknown, prefix = ""): string[] => {
    if (Array.isArray(value) && value.some((item) => typeof item === "object" && item !== null))
        return (value as unknown[]).flatMap((item, i) => flatten(item, `${prefix}[${i}]`))
    else if (Array.isArray(value))
        return [ `${prefix}=[${(value as unknown[]).map((item) => String(item)).join(", ")}]` ]
    else if (typeof value === "object" && value !== null)
        return Object.entries(value as Record<string, unknown>)
            .filter(([ , val ]) => val !== undefined)
            .flatMap(([ key, val ]) => flatten(val, prefix !== "" ? `${prefix}.${key}` : key))
    else
        return [ `${prefix}=${String(value)}` ]
}

/*  the "[[...]]" reference patterns a property value expression carries  */
const patternsOf = (prop: SchemaProperty): string[] => {
    if (prop.value === undefined)
        return []
    const expr = compileValueExpr(prop.value)
    return (expr.kind === "list" ? expr.alternatives : [ expr ])
        .flatMap((alternative) => alternative.kind === "reference" ? [ alternative.pattern ] : [])
}

/*  the cardinality of a reference-valued property: a single reference
    or a "list" of them, required or optional  */
const arityOf = (prop: SchemaProperty): string => {
    const many = prop.value !== undefined && compileValueExpr(prop.value).kind === "list"
    return `${prop.optional === true ? "0.." : many ? "1.." : ""}${many ? "n" : "1"}`
}

/*  the value of a sibling marker flag: "true", or its expression  */
const markerOf = (flag: boolean | string | undefined): string | undefined =>
    flag === true ? "true" : typeof flag === "string" ? codeMd(flag) : undefined

/*  a count with its noun  */
const plural = (count: number, noun: string): string =>
    `${count} ${noun}${count === 1 ? "" : "s"}`

/*  render a text as a Mermaid class diagram identifier (in the dotted
    notation of the qualified references)  */
const classId = (text: string): string =>
    text.replace(/[^A-Za-z0-9_.-]/g, "_")

/*  render a non-reference property as a class attribute, typed by the
    kind of its value constraint plus its multiplicity  */
const classAttribute = (prop: SchemaProperty): string => {
    const kind = prop.value !== undefined ? compileValueExpr(prop.value).kind : "text"
    return `${kind === "reference" ? "ref" : kind}[${prop.optional === true ? "0..1" : "1"}] ${classId(prop.name)}`
}

/*  generate the Markdown sources of the specification describing a
    schema configuration (against the meta schema configuration): the
    title artifact and one (recurring) ARTIFACT-KIND artifact per
    artifact kind, holding one ARTIFACT object per artifact, the
    OBJECT-KIND objects flat below their artifact (in
    pre-order, named after their kind, qualified by the parent kind on
    a collision), and the PROPERTY/REFERENCE objects below the artifacts
    and object kinds, where the reference patterns of the configuration
    are resolved at the kind level against a skeleton corpus  */
const generateSources = (config: Schema, meta: Schema, files: string[],
    labels: Map<string, string>, origins: ConfigOrigins): SourceFile[] => {
    const now = new Date()

    /*  the skeleton corpus standing in for the configuration: one object
        per schema node, the artifacts carrying their ids and names, so
        the reference patterns resolve onto the kinds through the
        regular resolution  */
    const chains    = new Map<SchemaObject, SchemaObject[]>()
    const skeletons = new Map<SpecObject, SchemaObject>()
    const skeletonOf = (schema: SchemaObject, chain: SchemaObject[]): SpecObject => {
        const artifact = chain.length === 1
        const object: SpecObject = { kind: schema.kind,
            id:   artifact ? (schema.id ?? slugify(schema.name ?? schema.kind)) : "",
            name: artifact ? (schema.name ?? "") : "", properties: [], children: [] }
        if (artifact && schema.id !== undefined)
            object.paren = schema.id
        chains.set(schema, chain)
        skeletons.set(object, schema)
        object.children = (schema.children ?? []).map((child) => skeletonOf(child, [ ...chain, child ]))
        return object
    }
    const skeleton: Spec = { artifacts: config.map((schema) =>
        ({ created: now, modified: now, objects: [ skeletonOf(schema, [ schema ]) ] })) }
    const skeletonIndex = buildLinkIndex(skeleton)

    /*  the schema nodes a reference pattern matches at the kind level:
        every name part is generalized to the wildcard, as the skeleton
        knows the kinds only, and a pattern matching every node (like
        "[[*]]") names no particular target  */
    const targetsOf = (pattern: string): SchemaObject[] => {
        const generalized = pattern.replace(/:("(?:[^"\\]|\\.)*"|[^.":]+)/g, ":*")
        const matches     = resolveSet(skeletonIndex, generalized).flatMap((object) => skeletons.get(object) ?? [])
        return matches.length === skeletons.size ? [] : matches
    }
    const targetsOfAll = (patterns: string[]): SchemaObject[] =>
        Array.from(new Set(patterns.flatMap(targetsOf)))

    /*  the meta objects: the title, the schema, the artifact kinds, the
        artifacts, the object kinds, and the properties, where a property
        whose value constraint references at least one kind is a REFERENCE  */
    const metaObject = (kind: string, name: string, paren?: string): SpecObject => {
        const o: SpecObject = { kind, id: paren ?? slugify(name), name, properties: [], children: [] }
        if (paren !== undefined)
            o.paren = paren
        return o
    }
    const title = metaObject("META", "Title", "TI")
    const kinds = new Map<string, SpecObject>()
    const metas = new Map<SchemaObject, SpecObject>()
    const props = new Map<SpecObject, { chain: SchemaObject[], prop: SchemaProperty, targets: SchemaObject[] }>()
    const propertyObjects = (owner: SpecObject, chain: SchemaObject[]) => {
        for (const prop of chain[chain.length - 1].props ?? []) {
            const targets = targetsOfAll(patternsOf(prop))
            const o = metaObject(targets.length > 0 ? "REFERENCE" : "PROPERTY", prop.name)
            props.set(o, { chain, prop, targets })
            owner.children.push(o)
        }
    }
    for (const schema of config) {
        let kind = kinds.get(schema.kind)
        if (kind === undefined) {
            kind = metaObject("ARTIFACT-KIND", schema.kind)
            kinds.set(schema.kind, kind)
        }
        const artifact = metaObject("ARTIFACT", schema.name ?? schema.id ?? schema.kind, schema.id)
        metas.set(schema, artifact)
        kind.children.push(artifact)
        propertyObjects(artifact, [ schema ])

        /*  the object kinds, flat below their artifact in pre-order  */
        const names = new Set<string>()
        const walk = (parent: SchemaObject) => {
            for (const child of parent.children ?? []) {
                const name = names.has(child.kind) ? `${parent.kind}/${child.kind}` : child.kind
                names.add(name)
                const o = metaObject("OBJECT-KIND", name)
                metas.set(child, o)
                artifact.children.push(o)
                propertyObjects(o, chains.get(child) ?? [ child ])
                walk(child)
            }
        }
        walk(schema)
    }

    /*  the references among the meta objects, shortest unique from
        their referencing object (resolved through the final index)  */
    const spec: Spec = { artifacts: [ title, ...kinds.values() ].map((o) =>
        ({ created: now, modified: now, objects: [ o ] })) }
    const index = buildLinkIndex(spec)
    const ref   = (target: SpecObject, from: SpecObject): string =>
        `[[${referenceTo(index, target, from)}]]`
    const refs  = (targets: SchemaObject[], from: SpecObject): string =>
        targets.flatMap((target) => metas.get(target) ?? []).map((target) => ref(target, from)).join(", ")

    /*  the display labels of the configuration files, and the origin of
        a node (its contributing files, shown when several files are merged)  */
    const labelOf  = (file: string): string => labels.get(file) ?? file
    const labelsMd = files.map((file) => escapeMd(labelOf(file))).join(", ")
    const filesOf  = (chain: SchemaObject[], prop?: SchemaProperty): string[] =>
        origins.get(originKey(chain, prop)) ?? []
    const originOf = (origin: string[]): string | undefined =>
        files.length > 1 && origin.length > 0 ? origin.map((file) => codeMd(labelOf(file))).join(", ") : undefined

    /*  the property values of a meta object (the absent ones left out)  */
    const push = (o: SpecObject, entries: [ string, string | undefined ][]) => {
        for (const [ key, value ] of entries)
            if (value !== undefined)
                o.properties.push({ key, value })
    }
    const patternsMd = (patterns: string[] | undefined): string | undefined =>
        patterns !== undefined ? codeMd(patterns.join(", ")) : undefined
    const configMd = (value: unknown): string | undefined =>
        value !== undefined ? codeMd(flatten(value).join(", ")) : undefined

    /*  the title: the document properties and the abstract  */
    const stats = configStatistics(config)
    push(title, [
        [ "TITLE",    "Schema Configuration" ],
        [ "SUBTITLE", labelsMd ],
        [ "VERSION",  `SpecBook ${version}` ],
        [ "LANG",     "en" ]
    ])
    title.description = {
        description: `The schema configuration ${labelsMd} specifies ${plural(kinds.size, "artifact kind")} ` +
            `with ${plural(config.length, "artifact")}, ${plural(stats.objects - config.length, "object kind")}, ` +
            `and ${plural(stats.links, "reference relationship")}.`,
        elaboration: "Every artifact and object kind lists its properties (`PROPERTY`) and its " +
            "reference-valued properties (`REFERENCE`, the edges of the diagrams, leading to the " +
            "artifacts and object kinds the value constraint references), and every object kind " +
            "names the artifact or object kind it is nested directly below (`PARENT`). The value " +
            "constraints, name patterns, and configurations are quoted verbatim from the schema " +
            "configuration.\n\n" +
            "The UML class diagram of an artifact shows the artifact (stereotyped `artifact`) and " +
            "its object kinds as classes with their properties as attributes (typed by the kind of " +
            "their value constraint and their multiplicity), their nesting as compositions, and " +
            "their reference-valued properties as associations labeled with the property and its " +
            "arity, where a referenced artifact or object kind of another artifact appears as a bare class."
    }

    /*  the UML class diagram of an artifact and its object kinds -- the
        artifact stereotyped, the non-reference properties as typed
        attributes, the nesting as compositions, and the reference-valued
        properties as labeled associations with their arity (none for a
        degenerate diagram without any relationship, exactly like the
        collapsed Gradia diagrams)  */
    const membersOf = (artifacts: SchemaObject[]): SchemaObject[] => {
        const members = new Array<SchemaObject>()
        const collect = (schema: SchemaObject) => {
            members.push(schema)
            for (const child of schema.children ?? [])
                collect(child)
        }
        artifacts.forEach(collect)
        return members
    }
    const classDiagramOf = (artifacts: SchemaObject[]): string | undefined => {
        const members = membersOf(artifacts)

        /*  the class names in the notation of the references: an artifact
            as "<kind>.<id>", an object kind by its kind, qualified by the
            id of its artifact (and then by its parent kind) only where
            the name collides among the classes of the diagram  */
        const shown  = new Set<SchemaObject>([ ...members,
            ...members.flatMap((schema) => (schema.props ?? []).flatMap((prop) => targetsOfAll(patternsOf(prop)))) ])
        const names  = new Map<SchemaObject, string>()
        const unique = (candidate: (schema: SchemaObject) => string, nodes: SchemaObject[]) => {
            const counts = new Map<string, number>()
            for (const schema of nodes)
                counts.set(candidate(schema), (counts.get(candidate(schema)) ?? 0) + 1)
            return nodes.filter((schema) => {
                if (counts.get(candidate(schema)) !== 1)
                    return true
                names.set(schema, classId(candidate(schema)))
                return false
            })
        }
        const artifactLabel = (schema: SchemaObject): string =>
            schema.id ?? slugify(schema.name ?? schema.kind)
        for (const schema of shown) {
            const chain = chains.get(schema) ?? [ schema ]
            if (chain.length === 1)
                names.set(schema, classId(`${schema.kind}.${artifactLabel(schema)}`))
        }
        const qualified = (schema: SchemaObject): string =>
            `${artifactLabel((chains.get(schema) ?? [ schema ])[0])}.${schema.kind}`
        const nested = (schema: SchemaObject): string =>
            `${artifactLabel((chains.get(schema) ?? [ schema ])[0])}.` +
                (metas.get(schema)?.name ?? schema.kind).replace(/\//g, ".")
        let rest = Array.from(shown).filter((schema) => !names.has(schema))
        rest = unique((schema) => schema.kind, rest)
        rest = unique(qualified, rest)
        for (const schema of rest)
            names.set(schema, classId(nested(schema)))
        const classOf = (schema: SchemaObject): string => names.get(schema) ?? classId(schema.kind)
        const relations = new Array<string>()
        for (const schema of members) {
            for (const child of schema.children ?? [])
                relations.push(`    ${classOf(schema)} *-- "${child.optional === true ? "0..n" : "1..n"}" ` +
                    classOf(child))
            for (const prop of schema.props ?? [])
                for (const target of targetsOfAll(patternsOf(prop)))
                    relations.push(`    ${classOf(schema)} --> "${arityOf(prop)}" ${classOf(target)} : ${prop.name}`)
        }
        if (relations.length === 0)
            return undefined
        const lines = [ "classDiagram" ]
        for (const schema of members) {
            lines.push(`    class ${classOf(schema)} {`)
            if ((chains.get(schema) ?? [ schema ]).length === 1)
                lines.push("        <<artifact>>")
            for (const prop of schema.props ?? [])
                if (targetsOfAll(patternsOf(prop)).length === 0)
                    lines.push(`        ${classAttribute(prop)}`)
            lines.push("    }")
        }
        return [ ...lines, ...relations ].join("\n") + "\n"
    }
    /*  the artifact kinds: their artifacts  */
    for (const [ name, o ] of kinds) {
        const artifacts = config.filter((schema) => schema.kind === name)
        push(o, [ [ "ORIGIN", originOf(Array.from(new Set(artifacts.flatMap((schema) => filesOf([ schema ]))))) ] ])
        o.description = {
            description: `The artifact kind **${escapeMd(name)}** comprises ${plural(artifacts.length, "artifact")}: ` +
                `${refs(artifacts, o)}.`
        }
    }

    /*  the class diagram of an artifact, introduced by its figures: its
        object kinds and associations, plus the other artifacts the
        associations reach into  */
    const classDiagramMd = (schema: SchemaObject, o: SpecObject): string | undefined => {
        const uml = classDiagramOf([ schema ])
        if (uml === undefined)
            return undefined
        const members = membersOf([ schema ])
        const targets = members.flatMap((member) =>
            (member.props ?? []).flatMap((prop) => targetsOfAll(patternsOf(prop))))
        const foreign = Array.from(new Set(targets.map((target) => (chains.get(target) ?? [ target ])[0])))
            .filter((artifact) => artifact !== schema)
        return `The class diagram shows ${plural(members.length - 1, "object kind")} of the artifact` +
            (targets.length > 0 ? ` with ${plural(targets.length, "association")}` : "") +
            (foreign.length > 0 ? `, reaching into ${refs(foreign, o)}` : "") +
            ".\n\n```mermaid\n" + uml + "```"
    }

    /*  the artifacts and object kinds: their configuration, their
        description, and the prose of their relationships  */
    const kindsMd = (patterns: string[], o: SpecObject): string => {
        const inner   = patterns.map((pattern) => compileValueExpr(pattern))
            .flatMap((expr) => expr.kind === "reference" ? [ expr.pattern ] : [])
        const targets = targetsOfAll(inner)
        return targets.length > 0 ? `the ${refs(targets, o)} objects` :
            inner.includes("*") ? "any object" : `the objects matching ${codeMd(patterns.join(", "))}`
    }
    for (const [ schema, o ] of metas) {
        const chain  = chains.get(schema) ?? [ schema ]
        const parent = chain.length >= 2 ? metas.get(chain[chain.length - 2]) : undefined
        push(o, [
            [ "ORIGIN",     originOf(filesOf(chain)) ],
            [ "PARENT",     parent !== undefined ? ref(parent, o) : undefined ],
            [ "FILE",       chain.length === 1 && schema.file !== undefined ? codeMd(schema.file) : undefined ],
            [ "NAME",       chain.length > 1  && schema.name !== undefined ? codeMd(schema.name) : undefined ],
            [ "OPTIONAL",   schema.optional === true ? "true" : "false" ],
            [ "REFERENCED", patternsMd(schema.referenced) ],
            [ "COVERAGE",   patternsMd(schema.coverage) ],
            [ "AUTOMATON",  configMd(schema.automaton) ],
            [ "BADGE",      typeof schema.badge === "string" ? codeMd(schema.badge) : configMd(schema.badge) ],
            [ "DIAGRAM",    configMd(schema.diagram) ],
            [ "FORMAT",     configMd(schema.format) ]
        ])
        const parts   = new Array<string>()
        const subject = `Every object of the kind **${escapeMd(schema.kind)}**`
        if (schema.referenced !== undefined)
            parts.push(`${subject} has to be referenced from ${kindsMd(schema.referenced, o)}.`)
        if (schema.coverage !== undefined)
            parts.push(`${subject} reports the reference coverage of ${kindsMd(schema.coverage, o)}.`)
        if (schema.automaton !== undefined) {
            const automaton = schema.automaton
            const childMd   = (kind: string): string => {
                const child  = (schema.children ?? []).find((c) => c.kind === kind)
                const target = child !== undefined ? metas.get(child) : undefined
                return target !== undefined ? ref(target, o) : `\`${kind}\``
            }
            parts.push(`The ${childMd(automaton.nodes)} children form a finite state machine, whose ` +
                `${childMd(automaton.edges)} children lead from the node their \`${automaton.source}\` names ` +
                `to the node their \`${automaton.target}\` names, where \`${automaton.initial}\` flags the ` +
                `initial and \`${automaton.final}\` the final nodes.`)
        }
        if (schema.refs !== undefined)
            parts.push(`References:\n\n${escapeDesc(schema.refs)}`)
        const uml = chain.length === 1 ? classDiagramMd(schema, o) : undefined
        if (uml !== undefined)
            parts.push(uml)
        o.description = { description: escapeDesc(schema.desc ?? `The objects of the kind \`${schema.kind}\`.`),
            elaboration: parts.length > 0 ? parts.join("\n\n") : undefined }
    }

    /*  the properties: their constraint, flags, and targets  */
    for (const [ o, { chain, prop, targets } ] of props) {
        push(o, [
            [ "ORIGIN",    originOf(filesOf(chain, prop)) ],
            [ "OPTIONAL",  prop.optional === true ? "true" : "false" ],
            [ "VALUE",     prop.value !== undefined ? codeMd(prop.value) : undefined ],
            [ "TARGET",    targets.length > 0 ? refs(targets, o) : undefined ],
            [ "ARITY",     targets.length > 0 ? arityOf(prop) : undefined ],
            [ "UNIQUE",    markerOf(prop.unique) ],
            [ "PRESENT",   markerOf(prop.present) ],
            [ "LOCAL",     prop.local     === true ? "true" : undefined ],
            [ "SYMMETRIC", prop.symmetric === true ? "true" : undefined ],
            [ "ACYCLIC",   prop.acyclic   === true ? "true" : undefined ]
        ])
        o.description = { description: escapeDesc(prop.desc ?? `The property \`${prop.name}\`.`) }
    }

    /*  render the title artifact and the (recurring) artifact kind
        artifacts into the Markdown sources of their configured files,
        timestamped with the oldest and the latest configuration file  */
    const times    = files.map((file) => fs.statSync(file).mtime.getTime())
    const created  = formatTimestamp(new Date(Math.min(...times)))
    const modified = formatTimestamp(new Date(Math.max(...times)))
    const source   = (objects: SpecObject[]): SourceFile => ({
        file: meta.find((schema) => schema.kind === objects[0].kind)?.file ?? `${objects[0].kind}.md`,
        text: `---\nCreated:  ${created}\nModified: ${modified}\n---\n\n` +
            objects.map((o) => renderObjectMd(o, 1)).join("\n\n") + "\n"
    })
    return [ source([ title ]), ...(kinds.size > 0 ? [ source(Array.from(kinds.values())) ] : []) ]
}

/*  generate the specification describing the effective schema
    configuration and parse it against the bundled meta schema
    configuration, exactly like "lint" parses the specification files,
    so the result feeds the very same exports (the generated sources
    carry no files to observe beyond the configuration ones)  */
export const lintSchema = (options: SchemaLintOptions): LintResult => {
    const { verbose } = options
    const diagnostics = new Array<Diagnostic>()

    /*  load the schema configuration to describe, merged out of its files  */
    verbose("loading schema configuration " +
        options.config.map((file) => `"${literal(file)}"`).join(", "))
    const loaded = loadConfig(options.config)
    diagnostics.push(...loaded.diagnostics)
    reportOverlaps(loaded.overlaps, verbose)
    const config = loaded.config
    if (config === undefined)
        return { specification: { artifacts: [] }, diagnostics, files: [], origins: new Map() }
    const stats = configStatistics(config)
    verbose(`loaded schema configuration specifying ${literal(stats.objects)} object kind(s) ` +
        `and ${literal(stats.links)} link relationship(s)`)

    /*  load the bundled meta schema configuration the generated specification follows  */
    const meta = loadConfig([ metaConfig ])
    if (meta.config === undefined)
        throw new Error("invalid meta schema configuration:\n" +
            meta.diagnostics.map(renderDiagnostic).join("\n"))

    /*  generate and parse the specification describing the schema configuration  */
    const sources = generateSources(config, meta.config, options.config, options.labels, loaded.origins)
    verbose(`parsing ${literal(sources.length)} generated specification file(s) describing the schema configuration`)
    const result = parseSpecification(sources, meta.config)
    diagnostics.push(...result.diagnostics)
    const specStats = specStatistics(result.specification)
    verbose(`parsed specification defining ${literal(specStats.objects)} object(s) ` +
        `and ${literal(specStats.links)} link relationship(s)`)
    return { specification: result.specification, diagnostics, config: meta.config,
        files: [], origins: result.origins }
}

