#!/usr/bin/env node
/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs             from "node:fs"
import { Command }         from "commander"

import { SpecBook, renderDiagnostic, renderDiagnosticVerbose, parseOutputSpec, version } from "./specbook-api.js"
import { serveMcp }        from "./specbook-mcp.js"

/*  route verbose messages to stderr, keeping stdout reserved
    for the command outputs and the MCP protocol  */
const verboseOf = (opts: { verbose: boolean }) => (msg: string): void => {
    if (opts.verbose)
        process.stderr.write(`specbook: ${msg}\n`)
}

/*  write a buffer to stdout, awaiting the write callback which only
    fires once the data has been flushed to the underlying pipe, so a
    subsequent "process.exit" cannot truncate the output  */
const writeStdout = (data: Buffer | string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        process.stdout.write(data, (err) => {
            if (err)
                reject(err)
            else
                resolve()
        })
    })
}

/*  write a command result to the output file or stdout  */
const writeOutput = async (output: string, data: Buffer | string, verbose: (msg: string) => void) => {
    if (output === "-")
        await writeStdout(data)
    else {
        await fs.promises.writeFile(output, data)
        verbose(`wrote "${output}" (${Buffer.byteLength(data)} bytes)`)
    }
}

/*  determine an option default value, overridable via a
    corresponding SPECBOOK_<OPTION> environment variable  */
const envDefault = (name: string, fallback?: string): string | undefined =>
    process.env[`SPECBOOK_${name.toUpperCase().replace(/-/g, "_")}`] ?? fallback

/*  determine a flag option default value, overridable via a
    corresponding SPECBOOK_<OPTION> environment variable  */
const envDefaultFlag = (name: string, fallback: boolean): boolean => {
    const value = process.env[`SPECBOOK_${name.toUpperCase().replace(/-/g, "_")}`]
    return value !== undefined ? !(/^(?:|0|false|no|off)$/i).test(value) : fallback
}

/*  provide the common options of all sub-commands  */
const withCommonOptions = (command: Command): Command => command
    .option("-v, --verbose", "print verbose processing information to stderr", envDefaultFlag("verbose", false))
    .option("-c, --config <yaml-file>", "YAML schema configuration file", envDefault("config"))

/*  parse the command line  */
const program = new Command()
program.name("specbook")
    .description("Markdown-based Specification Format")
    .version(version)
    .action(() => {
        program.help()
    })

program.command("mcp")
    .description("run as MCP stdio server")
    .option("-v, --verbose", "print verbose processing information to stderr", envDefaultFlag("verbose", false))
    .action(async (opts: { verbose: boolean }) => {
        verboseOf(opts)("starting MCP server on stdio")
        await serveMcp(verboseOf(opts))
    })

withCommonOptions(program.command("init"))
    .description("initialize the configured specification artifact files below the base directory")
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir", "."))
    .action(async (opts: { verbose: boolean, config?: string, basedir: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const created = await specbook.init({ config: opts.config, basedir: opts.basedir })
        await writeStdout(created.length > 0 ?
            `initialized artifact file(s): ${created.join(", ")}\n` :
            "no artifact files were created\n")
    })

withCommonOptions(program.command("lint"))
    .description("lint the specification Markdown files below the base directory")
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir", "."))
    .action(async (opts: { verbose: boolean, config?: string, basedir: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const result = await specbook.lint({ config: opts.config, basedir: opts.basedir })
        for (const diagnostic of result.diagnostics)
            await writeStdout(opts.verbose ?
                renderDiagnosticVerbose(diagnostic, process.stdout.isTTY === true) :
                `${renderDiagnostic(diagnostic)}\n`)
        if (result.diagnostics.length > 0)
            process.exitCode = 1
        else
            verboseOf(opts)("specification valid")
    })

withCommonOptions(program.command("export"))
    .description("export the specification Markdown files below the base directory " +
        "as JSON, JSON5, YAML, TOON, HTML, PDF, or normalized Markdown")
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir", "."))
    .option("-o, --output [<format>:]<output-file>",
        "output file (\"-\" for stdout, repeatable), with the format inferred " +
        "from the filename extension unless explicitly prefixed",
        (value: string, previous: string[]) => previous.concat(value), [] as string[])
    .action(async (opts: { verbose: boolean, config?: string, basedir: string,
        output: string[] }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const outputs = (opts.output.length > 0 ? opts.output : [ envDefault("output") ?? "-" ])
            .map((spec) => parseOutputSpec(spec))

        /*  parse the input once and export each distinct format once  */
        const distinct = Array.from(new Set(outputs.map(({ format }) => format)))
        const buffers  = await specbook.export({ config: opts.config, basedir: opts.basedir,
            formats: distinct })
        for (const { format, output } of outputs)
            await writeOutput(output, buffers[distinct.indexOf(format)], verboseOf(opts))
    })

withCommonOptions(program.command("describe"))
    .description("describe the configured specification format as Markdown")
    .option("-o, --output <markdown-file>", "output file (\"-\" for stdout)", envDefault("output", "-"))
    .action(async (opts: { verbose: boolean, config?: string, output: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const text = await specbook.describe({ config: opts.config })
        await writeOutput(opts.output, text, verboseOf(opts))
    })

withCommonOptions(program.command("import"))
    .description("import foreign sources into the specification artifact files below the base directory")
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir", "."))
    .option("--provider <provider>", "AI provider (\"anthropic\", \"openai\", \"openrouter\" or \"ollama\")", envDefault("provider"))
    .option("--model <model>", "AI model", envDefault("model"))
    .argument("<input-files...>", "foreign source files to import")
    .action(async (inputs: string[], opts: { verbose: boolean, config?: string,
        basedir: string, provider?: string, model?: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const written = await specbook.import({ config: opts.config, basedir: opts.basedir,
            inputs, provider: opts.provider, model: opts.model })
        await writeStdout(written.length > 0 ?
            `imported into artifact file(s): ${written.join(", ")}\n` :
            "no artifact files were changed\n")
    })

withCommonOptions(program.command("edit"))
    .description("apply a free-text edit request to the specification artifact files below the base directory")
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir", "."))
    .option("--provider <provider>", "AI provider (\"anthropic\", \"openai\", \"openrouter\" or \"ollama\")", envDefault("provider"))
    .option("--model <model>", "AI model", envDefault("model"))
    .argument("<query>", "free-text edit request")
    .action(async (query: string, opts: { verbose: boolean, config?: string,
        basedir: string, provider?: string, model?: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const written = await specbook.edit({ config: opts.config, basedir: opts.basedir,
            query, provider: opts.provider, model: opts.model })
        await writeStdout(written.length > 0 ?
            `edited artifact file(s): ${written.join(", ")}\n` :
            "no artifact files were changed\n")
    })

try {
    await program.parseAsync()
}
catch (err) {
    /*  include the cause chain, as e.g. fetch failures
        carry the underlying error only in the cause  */
    let msg = err instanceof Error ? err.message : String(err)
    for (let cause = err instanceof Error ? err.cause : undefined;
        cause instanceof Error;
        cause = cause.cause)
        msg += `: ${cause.message}`
    process.stderr.write(`specbook: ERROR: ${msg}\n`, () => process.exit(1))
}
