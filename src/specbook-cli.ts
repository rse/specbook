#!/usr/bin/env node
/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs             from "node:fs"
import { Command }         from "commander"
import chalk               from "chalk"

import { SpecBook, renderDiagnostic, renderDiagnosticVerbose, renderVerbose, literal,
    parseOutputSpec, describeFormats, describeParts, parseDescribeFormat, parseDescribePart,
    version, type VerboseSink, type VerboseLevel } from "./specbook-api.js"
import { serveMcp }        from "./specbook-mcp.js"

/*  route verbose messages to stderr, keeping stdout reserved for the
    command outputs and the MCP protocol, and qualify every message with
    the tool name plus the scope path of the emitting command, where
    Chalk styles the output only if the terminal supports colors; the
    "notice" messages pass regardless of the verbose option, as they
    report environment problems the user has to see  */
const verboseOf = (opts: { verbose: boolean }, ...scope: string[]): VerboseSink =>
    (cmd: string, msg: string, level: VerboseLevel): void => {
        if (opts.verbose || level === "notice") {
            const scopePath = [ ...scope, cmd ].map((segment) => chalk.bold(segment)).join(": ")
            process.stderr.write(`specbook: ${scopePath}: ${renderVerbose(msg, chalk.blue)}\n`)
        }
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
const writeOutput = async (output: string, data: Buffer | string,
    cmd: string, verbose: VerboseSink): Promise<void> => {
    if (output === "-")
        await writeStdout(data)
    else {
        await fs.promises.writeFile(output, data)
        verbose(cmd, `wrote "${literal(output)}" (${literal(Buffer.byteLength(data))} bytes)`, "debug")
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

/*  provide the verbose option of all sub-commands  */
const withVerboseOption = (command: Command): Command => command
    .option("-v, --verbose", "print verbose processing information to stderr", envDefaultFlag("verbose", false))

/*  provide the common options of the specification processing sub-commands,
    for which the YAML schema configuration falls back onto the standard one  */
const withCommonOptions = (command: Command): Command => withVerboseOption(command)
    .option("-c, --config <yaml-file>", "YAML schema configuration file " +
        "(default: the bundled standard schema configuration)", envDefault("config"))
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir", "."))

/*  parse the command line  */
const program = new Command()
program.name("specbook")
    .description("Markdown-based Specification Format")
    .version(version)
    .action(() => {
        program.help()
    })

/*  the mcp command runs all other commands as MCP tools over stdio  */
withVerboseOption(program.command("mcp"))
    .description("run as MCP stdio server")
    .action(async (opts: { verbose: boolean }) => {
        verboseOf(opts)("mcp", "starting MCP server on stdio", "debug")
        await serveMcp(verboseOf(opts, "mcp"))
    })

/*  the init command creates the configured artifact files  */
withCommonOptions(program.command("init"))
    .description("initialize the configured specification artifact files below the base directory")
    .action(async (opts: { verbose: boolean, config?: string, basedir: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const created = await specbook.init({ config: opts.config, basedir: opts.basedir })
        await writeStdout(created.length > 0 ?
            `initialized artifact file(s): ${created.join(", ")}\n` :
            "no artifact files were created\n")
    })

/*  the lint command reports all diagnostics and fails on any of them  */
withCommonOptions(program.command("lint"))
    .description("lint the specification Markdown files below the base directory")
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
            verboseOf(opts)("lint", "specification valid", "debug")
    })

/*  the export command parses the input once and writes every output  */
withCommonOptions(program.command("export"))
    .description("export the specification Markdown files below the base directory " +
        "as JSON, JSON5, YAML, TOON, HTML, PDF, or normalized Markdown")
    .option("-w, --watch", "keep the outputs in sync by re-exporting on every source change",
        envDefaultFlag("watch", false))
    .option("-o, --output [<format>:]<output-file>",
        "output file (\"-\" for stdout, repeatable), with the format inferred " +
        "from the filename extension unless explicitly prefixed",
        (value: string, previous: string[]) => previous.concat(value), new Array<string>())
    .action(async (opts: { verbose: boolean, config?: string, basedir: string,
        output: string[], watch: boolean }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const outputs = (opts.output.length > 0 ? opts.output : [ envDefault("output") ?? "-" ])
            .map(parseOutputSpec)

        /*  a re-export has to land somewhere it can be picked up again,
            which a one-shot stdout stream cannot provide  */
        if (opts.watch && outputs.some(({ output }) => output === "-"))
            throw new Error("the watch mode requires regular output files " +
                "(\"-\" for stdout is not supported)")

        /*  parse the input once and export each distinct format once  */
        const distinct = Array.from(new Set(outputs.map(({ format }) => format)))
        const write = async (buffers: Buffer[]) => {
            for (const { format, output } of outputs)
                await writeOutput(output, buffers[distinct.indexOf(format)], "export", verboseOf(opts))
        }
        if (opts.watch)
            await specbook.watch({ config: opts.config, basedir: opts.basedir,
                formats: distinct, onExport: write })
        else
            await write(await specbook.export({ config: opts.config, basedir: opts.basedir,
                formats: distinct }))
    })

/*  the describe command also describes the generic SpecBook models and
    formats alone, so its YAML schema configuration stays optional  */
withVerboseOption(program.command("describe"))
    .description("describe the SpecBook models and formats as Markdown")
    .option("-c, --config <yaml-file>", "YAML schema configuration file " +
        "(default: the bundled standard schema configuration, embedded verbatim)", envDefault("config"))
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir"))
    .option("-e, --embed", "embed the given YAML schema configuration instead of just referencing it",
        envDefaultFlag("embed", false))
    .option("-f, --format <format>", `output format (${describeFormats.join(", ")})`,
        envDefault("format", "md"))
    .option("-p, --part <part>", `document part (${describeParts.join(", ")})`,
        envDefault("part", "all"))
    .option("-o, --output <markdown-file>", "output file (\"-\" for stdout)", envDefault("output", "-"))
    .action(async (opts: { verbose: boolean, config?: string, basedir?: string,
        embed: boolean, format: string, part: string, output: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const text = await specbook.describe({ config: opts.config, basedir: opts.basedir,
            embed: opts.embed, format: parseDescribeFormat(opts.format), part: parseDescribePart(opts.part) })
        await writeOutput(opts.output, text, "describe", verboseOf(opts))
    })

/*  run the command line program  */
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
    process.stderr.write(`specbook: ${chalk.red("ERROR:")} ${renderVerbose(msg, chalk.blue)}\n`,
        () => process.exit(1))
}
