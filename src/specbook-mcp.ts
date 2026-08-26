/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                  from "node:fs"
import { McpServer }            from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z }                    from "zod"

import { SpecBook, renderDiagnostic, formats, parseOutputSpec, version, type VerboseSink } from "./specbook-api.js"

/*  render an error with its cause chain into a tool error result  */
const errorResult = (err: unknown) => {
    let msg = err instanceof Error ? err.message : String(err)
    for (let cause = err instanceof Error ? err.cause : undefined;
        cause instanceof Error;
        cause = cause.cause)
        msg += `: ${cause.message}`
    return {
        isError: true as const,
        content: [ { type: "text" as const, text: `ERROR: ${msg}` } ]
    }
}

/*  serve the SpecBook functionality as "specbook_<cmd>" MCP tools over stdio  */
export const serveMcp = async (verbose: VerboseSink): Promise<void> => {
    const server   = new McpServer({ name: "specbook", version })
    const specbook = new SpecBook({ verbose })

    server.registerTool("specbook_init", {
        title:       "Initialize Specification",
        description: "Initialize the configured specification artifact files below the base directory " +
            "with their frontmatter and artifact heading, skipping already existing files.",
        inputSchema: {
            config:  z.string().optional().describe("YAML schema configuration file " +
                "(default: the bundled standard schema configuration)"),
            basedir: z.string().optional().describe("base directory of the specification Markdown files (default: \".\")")
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
            config:  z.string().optional().describe("YAML schema configuration file " +
                "(default: the bundled standard schema configuration)"),
            basedir: z.string().optional().describe("base directory of the specification Markdown files (default: \".\")")
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
            config:  z.string().optional().describe("YAML schema configuration file " +
                "(default: the bundled standard schema configuration)"),
            basedir: z.string().optional().describe("base directory of the specification Markdown files (default: \".\")"),
            format:  z.enum(formats).optional().describe("output format (default: inferred from the " +
                "output file extension, else json)"),
            output:  z.string().optional().describe("output file path (\"-\" returns the result directly)")
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
                formats: [ spec.format ] })
            if (spec.output !== undefined && spec.output !== "-") {
                await fs.promises.writeFile(spec.output, data)
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
        description: "Describe the SpecBook models and formats as a Markdown document. If the YAML " +
            "schema configuration or the base directory is given, the description additionally points " +
            "to the artifacts of that particular project.",
        inputSchema: {
            config:  z.string().optional().describe("YAML schema configuration file"),
            basedir: z.string().optional().describe("base directory of the specification Markdown files"),
            embed:   z.boolean().optional().describe("embed the YAML schema configuration (the bundled " +
                "standard one if none is given) instead of just referencing it (default: false)"),
            output:  z.string().optional().describe("output file path (\"-\" or omitted returns the description directly)")
        }
    }, async (args) => {
        try {
            const text = await specbook.describe(args)
            if (args.output !== undefined && args.output !== "-") {
                await fs.promises.writeFile(args.output, text, "utf8")
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
