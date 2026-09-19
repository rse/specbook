/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                  from "node:fs"
import * as path                from "node:path"
import { McpServer }            from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z }                    from "zod"

import { SpecBook, renderDiagnostic, renderVerbose, formats, parseOutputSpec, describeFormats,
    describeParts, compressLevels, projectFile, version, type VerboseSink } from "./specbook-api.js"

/*  render an error with its cause chain into a tool error result  */
const errorResult = (err: unknown) => {
    let msg = err instanceof Error ? err.message : String(err)
    for (let cause = err instanceof Error ? err.cause : undefined;
        cause instanceof Error;
        cause = cause.cause)
        msg += `: ${cause.message}`
    return {
        isError: true as const,
        content: [ { type: "text" as const, text: `ERROR: ${renderVerbose(msg)}` } ]
    }
}

/*  serve the SpecBook functionality as "specbook_<cmd>" MCP tools over stdio  */
export const serveMcp = async (verbose: VerboseSink): Promise<void> => {
    const server   = new McpServer({ name: "specbook", version })
    const specbook = new SpecBook({ verbose })

    /*  the working directory of the client, which this server does not
        necessarily share: it anchors the relative paths and starts the
        upward search for the project configuration file  */
    const cwd = z.string().optional().describe("absolute working directory of the caller, against which " +
        "the relative paths are resolved and from which the project configuration file " +
        `"${projectFile}" is searched upwards (default: the working directory of the server)`)
    const outputOf = (args: { cwd?: string }, output: string) =>
        args.cwd !== undefined ? path.resolve(args.cwd, output) : output

    server.registerTool("specbook_init", {
        title:       "Initialize Specification",
        description: "Initialize the configured specification artifact files below the base directory " +
            "with their frontmatter and artifact heading, skipping already existing files.",
        inputSchema: {
            config:  z.array(z.string()).optional().describe("YAML schema configuration files or glob " +
                "patterns, merged in order (\"std\" for the bundled standard schema configuration; " +
                "default: the SPECBOOK_CONFIG environment variable, else the \"config\" entry " +
                "of the project configuration file, else the bundled standard " +
                "schema configuration)"),
            basedir: z.string().optional().describe("base directory of the specification Markdown files " +
                "(default: the SPECBOOK_BASEDIR environment variable, else the \"basedir\" entry " +
                "of the project configuration file, else \".\")"),
            cwd
        }
    }, async (args) => {
        try {
            const created = await specbook.init(args)
            return { content: [ { type: "text", text: created.length > 0 ?
                `initialized artifact file(s): ${created.join(", ")}` :
                "no artifact files were created" } ] }
        }
        catch (err) {
            return errorResult(err)
        }
    })

    server.registerTool("specbook_lint", {
        title:       "Lint Specification",
        description: "Lint the specification Markdown files the YAML schema configuration references " +
            "below the base directory against this configuration and return all diagnostics.",
        inputSchema: {
            config:  z.array(z.string()).optional().describe("YAML schema configuration files or glob " +
                "patterns, merged in order (\"std\" for the bundled standard schema configuration; " +
                "default: the SPECBOOK_CONFIG environment variable, else the \"config\" entry " +
                "of the project configuration file, else the bundled standard " +
                "schema configuration)"),
            basedir: z.string().optional().describe("base directory of the specification Markdown files " +
                "(default: the SPECBOOK_BASEDIR environment variable, else the \"basedir\" entry " +
                "of the project configuration file, else \".\")"),
            gitignore: z.boolean().optional().describe("skip the artifact files excluded by the Git " +
                "exclude rules (the \".gitignore\" files, \"info/exclude\", and the global excludes " +
                "file), treating such a file exactly like an absent one (default: false)"),
            cwd
        }
    }, async (args) => {
        try {
            const result = await specbook.lint(args)
            const text   = result.diagnostics.length > 0 ?
                result.diagnostics.map(renderDiagnostic).join("\n") :
                "specification valid"
            return { content: [ { type: "text", text } ] }
        }
        catch (err) {
            return errorResult(err)
        }
    })

    server.registerTool("specbook_export", {
        title:       "Export Specification",
        description: "Export the specification Markdown files the YAML schema configuration references " +
            "below the base directory as JSON, JSON5, " +
            "YAML, TOON, HTML, PDF, or normalized Markdown. The result is written to the output file " +
            "if an output path is given, else it is returned directly (PDF as a base64-encoded resource).",
        inputSchema: {
            config:  z.array(z.string()).optional().describe("YAML schema configuration files or glob " +
                "patterns, merged in order (\"std\" for the bundled standard schema configuration; " +
                "default: the SPECBOOK_CONFIG environment variable, else the \"config\" entry " +
                "of the project configuration file, else the bundled standard " +
                "schema configuration)"),
            basedir: z.string().optional().describe("base directory of the specification Markdown files " +
                "(default: the SPECBOOK_BASEDIR environment variable, else the \"basedir\" entry " +
                "of the project configuration file, else \".\")"),
            format:  z.enum(formats).optional().describe("output format (default: inferred from the " +
                "output file extension, else json)"),
            output:  z.string().optional().describe("output file path (\"-\" or omitted returns the result directly)"),
            gitignore: z.boolean().optional().describe("skip the artifact files excluded by the Git " +
                "exclude rules (the \".gitignore\" files, \"info/exclude\", and the global excludes " +
                "file), treating such a file exactly like an absent one (default: false)"),
            slim:    z.boolean().optional().describe("drop the embedded images from the JSON, JSON5, " +
                "YAML, and TOON exports, instead of just optimizing them (default: false)"),
            cwd
        }
    }, async (args) => {
        try {
            /*  an explicit format takes the output as a plain file path, while
                otherwise the output is an "[<format>:]<file>" specification
                (the "-" stdout sentinel returns the result directly)  */
            const spec = args.format !== undefined || args.output === undefined ?
                { format: args.format ?? "json", output: args.output } :
                parseOutputSpec(args.output)
            const [ data ] = await specbook.export({ config: args.config, basedir: args.basedir,
                cwd: args.cwd, formats: [ spec.format ], gitignore: args.gitignore,
                slim: args.slim })
            if (spec.output !== undefined && spec.output !== "-") {
                await fs.promises.writeFile(outputOf(args, spec.output), data)
                return { content: [ { type: "text", text: `exported specification into "${spec.output}" (${data.length} bytes)` } ] }
            }
            else if (spec.format === "pdf")
                return { content: [ {
                    type:     "resource",
                    resource: { uri: "specbook:export.pdf", mimeType: "application/pdf", blob: data.toString("base64") }
                } ] }
            else
                return { content: [ { type: "text", text: data.toString("utf8") } ] }
        }
        catch (err) {
            return errorResult(err)
        }
    })

    server.registerTool("specbook_describe", {
        title:       "Describe Specification Format",
        description: "Describe the SpecBook models and formats as a Markdown document, which embeds the " +
            "bundled standard YAML schema configuration as long as no particular one is given. If the " +
            "YAML schema configuration or the base directory is given, the description additionally " +
            "points to the artifacts of that particular project. The description can be reduced to a " +
            "single part and emitted as the raw original file content instead of Markdown.",
        inputSchema: {
            config:   z.array(z.string()).optional().describe("YAML schema configuration files or glob " +
                "patterns, merged in order (\"std\" for the bundled standard schema configuration; " +
                "default: the SPECBOOK_CONFIG environment variable, else the \"config\" entry " +
                "of the project configuration file, else the bundled standard " +
                "schema configuration, embedded)"),
            basedir:  z.string().optional().describe("base directory of the specification Markdown files " +
                "(default: the SPECBOOK_BASEDIR environment variable, else the \"basedir\" entry " +
                "of the project configuration file)"),
            embed:    z.boolean().optional().describe("embed the given YAML schema configuration instead " +
                "of just referencing it (default: false; the bundled standard one is always embedded)"),
            compress: z.literal(compressLevels).optional().describe("compression level of the emitted " +
                "YAML schema configuration (embedded or raw): 0 for verbatim, 1 for re-emitted with 2-space " +
                "indentation and without comments, 2 for additionally without its \"refs\" and \"diagram\" " +
                "fields, or 3 for additionally without its \"desc\" fields (default: 2)"),
            format:   z.enum(describeFormats).optional().describe("output format: \"md\" for Markdown or " +
                "\"raw\" for the raw original file content of the part (default: \"md\")"),
            part:     z.enum(describeParts).optional().describe("document part: \"all\" for the entire " +
                "description, \"meta\" for the generic models and formats, \"schema\" for the YAML schema " +
                "configuration, or \"spec\" for the specification files (default: \"all\"; \"raw\" is " +
                "available for \"meta\" and \"schema\" only)"),
            output:   z.string().optional().describe("output file path (\"-\" or omitted returns the description directly)"),
            cwd
        }
    }, async (args) => {
        try {
            const text = await specbook.describe({ ...args, compress: args.compress ?? 2 })
            if (args.output !== undefined && args.output !== "-") {
                await fs.promises.writeFile(outputOf(args, args.output), text)
                return { content: [ { type: "text", text: `described specification format into "${args.output}"` } ] }
            }
            return { content: [ { type: "text", text } ] }
        }
        catch (err) {
            return errorResult(err)
        }
    })

    await server.connect(new StdioServerTransport())
}
