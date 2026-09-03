#!/usr/bin/env node
/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import * as fs                     from "node:fs"
import * as path                   from "node:path"
import { Command, CommanderError } from "commander"
import chalk                       from "chalk"

import { SpecBook, renderDiagnostic, renderDiagnosticVerbose, renderVerbose, literal,
    parseOutputSpec, previewAddr, previewPort, describeFormats, describeParts,
    parseDescribeFormat, parseDescribePart, parseCompressLevel,
    version, type VerboseSink, type VerboseLevel } from "./specbook-api.js"
import { serveMcp }                from "./specbook-mcp.js"

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

/*  write a buffer to a standard stream, awaiting the write callback
    which only fires once the data has been flushed to the underlying
    pipe, so a subsequent "process.exit" cannot truncate the output  */
const writeStream = (stream: NodeJS.WriteStream, data: Buffer | string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        stream.write(data, (err) => {
            if (err)
                reject(err)
            else
                resolve()
        })
    })
}
const writeStdout = (data: Buffer | string): Promise<void> => writeStream(process.stdout, data)
const writeStderr = (data: Buffer | string): Promise<void> => writeStream(process.stderr, data)

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
const envDefault = (name: string, fallback?: string): string | undefined => {
    const value = process.env[`SPECBOOK_${name.toUpperCase().replace(/-/g, "_")}`]
    return value !== undefined && value !== "" ? value : fallback
}

/*  determine a flag option default value, overridable via a
    corresponding SPECBOOK_<OPTION> environment variable  */
const envDefaultFlag = (name: string, fallback: boolean): boolean => {
    const value = process.env[`SPECBOOK_${name.toUpperCase().replace(/-/g, "_")}`]
    return value !== undefined ? !(/^(?:|0|false|no|off)$/i).test(value) : fallback
}

/*  provide the verbose option of all sub-commands  */
const withVerboseOption = (command: Command): Command => command
    .option("-v, --verbose", "print verbose processing information to stderr", envDefaultFlag("verbose", false))

/*  provide the repeatable schema configuration option, whose files or
    glob patterns are merged in order (with "std" naming the bundled
    standard one), and determine its value, where the environment default
    carries a path-delimiter-separated list of patterns  */
const withConfigOption = (command: Command, fallback: string): Command => command
    .option("-c, --config <yaml-file>", "YAML schema configuration file or glob pattern " +
        "(repeatable, merged in order, \"std\" for the bundled standard schema configuration; " +
        `default: ${fallback})`,
    (value: string, previous: string[]) => previous.concat(value), new Array<string>())
const configOf = (opts: { config: string[] }): string[] | undefined =>
    opts.config.length > 0 ? opts.config : envDefault("config")?.split(path.delimiter)

/*  provide the common options of the specification processing sub-commands,
    for which the YAML schema configuration falls back onto the standard one  */
const withCommonOptions = (command: Command): Command =>
    withConfigOption(withVerboseOption(command), "the bundled standard schema configuration")
        .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir", "."))

/*  the help, version, and usage-error output Commander produces, which
    is collected instead of written directly, as Commander writes it
    synchronously and then terminates the process, truncating a piped
    stream; the settings are established before the sub-commands are
    created, so they are inherited by all of them  */
let commanderOut = ""
let commanderErr = ""

/*  parse the command line  */
const program = new Command()
program.name("specbook")
    .description("Markdown-based Specification Format")
    .version(version)
    .configureOutput({
        writeOut: (str: string) => { commanderOut += str },
        writeErr: (str: string) => { commanderErr += str }
    })
    .exitOverride()
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
    .action(async (opts: { verbose: boolean, config: string[], basedir: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const created = await specbook.init({ config: configOf(opts), basedir: opts.basedir })
        await writeStdout(created.length > 0 ?
            `initialized artifact file(s): ${created.join(", ")}\n` :
            "no artifact files were created\n")
    })

/*  the lint command reports all diagnostics and fails on any error  */
withCommonOptions(program.command("lint"))
    .description("lint the specification Markdown files below the base directory")
    .action(async (opts: { verbose: boolean, config: string[], basedir: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const result = await specbook.lint({ config: configOf(opts), basedir: opts.basedir })
        for (const diagnostic of result.diagnostics)
            await writeStdout(opts.verbose ?
                renderDiagnosticVerbose(diagnostic, process.stdout.isTTY === true) :
                `${renderDiagnostic(diagnostic)}\n`)
        if (result.diagnostics.some((diagnostic) => diagnostic.severity === "error"))
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
    .action(async (opts: { verbose: boolean, config: string[], basedir: string,
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
            await specbook.watch({ config: configOf(opts), basedir: opts.basedir,
                formats: distinct, onExport: write })
        else
            await write(await specbook.export({ config: configOf(opts), basedir: opts.basedir,
                formats: distinct }))
    })

/*  the preview command serves the HTML export live in the browser  */
withCommonOptions(program.command("preview"))
    .description("serve the HTML export of the specification Markdown files below the base " +
        "directory as a live preview, re-exported and reloaded on every source change")
    .option("-a, --addr <ip-addr>",  "IP address to listen on", envDefault("addr", previewAddr))
    .option("-p, --port <tcp-port>", "TCP port to listen on",   envDefault("port", String(previewPort)))
    .action(async (opts: { verbose: boolean, config: string[], basedir: string,
        addr: string, port: string }) => {
        const port = Number(opts.port)
        if (!Number.isInteger(port) || port < 1 || port > 65535)
            throw new Error(`invalid TCP port "${opts.port}"`)
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        await specbook.preview({ config: configOf(opts), basedir: opts.basedir, addr: opts.addr, port })
    })

/*  the describe command also describes the generic SpecBook models and
    formats alone, so its YAML schema configuration stays optional  */
withConfigOption(withVerboseOption(program.command("describe"))
    .description("describe the SpecBook models and formats as Markdown"),
"the bundled standard schema configuration, embedded")
    .option("-b, --basedir <directory>", "base directory of the specification Markdown files", envDefault("basedir"))
    .option("-e, --embed", "embed the given YAML schema configuration instead of just referencing it",
        envDefaultFlag("embed", false))
    .option("-z, --compress [level]", "compression level of the emitted YAML schema configuration " +
        "(0: verbatim, 1: re-emitted with 2-space indentation and without comments, " +
        "2: also without \"refs\" fields, " +
        "3: also without \"desc\" fields; default and bare flag: 1)", envDefault("compress", "1"))
    .option("-f, --format <format>", `output format (${describeFormats.join(", ")})`,
        envDefault("format", "md"))
    .option("-p, --part <part>", `document part (${describeParts.join(", ")})`,
        envDefault("part", "all"))
    .option("-o, --output <markdown-file>", "output file (\"-\" for stdout)", envDefault("output", "-"))
    .action(async (opts: { verbose: boolean, config: string[], basedir?: string,
        embed: boolean, compress: string | boolean, format: string, part: string, output: string }) => {
        const specbook = new SpecBook({ verbose: verboseOf(opts) })
        const text = await specbook.describe({ config: configOf(opts), basedir: opts.basedir,
            embed: opts.embed, compress: parseCompressLevel(opts.compress),
            format: parseDescribeFormat(opts.format), part: parseDescribePart(opts.part) })
        await writeOutput(opts.output, text, "describe", verboseOf(opts))
    })

/*  run the command line program  */
try {
    await program.parseAsync()
}
catch (err) {
    /*  Commander requested the termination (help, version, or a usage
        error), so flush its own already rendered output and adopt its
        exit code instead of reporting the control-flow error  */
    if (err instanceof CommanderError) {
        await writeStdout(commanderOut)
        await writeStderr(commanderErr)
        process.exit(err.exitCode)
    }

    /*  include the cause chain, as e.g. fetch failures
        carry the underlying error only in the cause  */
    let msg = err instanceof Error ? err.message : String(err)
    for (let cause = err instanceof Error ? err.cause : undefined;
        cause instanceof Error;
        cause = cause.cause)
        msg += `: ${cause.message}`
    await writeStderr(`specbook: ${chalk.red("ERROR:")} ${renderVerbose(msg, chalk.blue)}\n`)
    process.exit(1)
}
