/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { watch }                     from "chokidar"
import { minify }                    from "@swc/html"

import type { Spec }                 from "./specbook-format-spec.js"
import type { Schema }               from "./specbook-format-schema.js"
import { documentTitle, documentLogo, documentCharset, documentThemeTone, subsetStylesheet,
    documentPaperSize, paperStylesheet, charsetCodepoints }
    from "./specbook-export-common.js"
import { themeColors, themeStylesheet, themeMapping }
    from "./specbook-theme.js"
import { renderAst, type AstFormat } from "./specbook-export-ast.js"
import { renderMarkdown }            from "./specbook-export-md.js"
import { renderHtml, htmlOutline, titlePageObject }
    from "./specbook-export-html.js"
import { htmlToPdf }                 from "./specbook-export-pdf.js"
import { literal }                   from "./specbook-verbose.js"
import type { Verbose }              from "./specbook-verbose.js"

/*  the supported export formats  */
export const formats = [ "json", "json5", "yaml", "toon", "html", "pdf", "md" ] as const
export type ExportFormat = typeof formats[number]

/*  the format names and filename extensions mapping onto the export formats  */
const extensions = new Map<string, ExportFormat>([
    [ "json",  "json"  ],
    [ "json5", "json5" ],
    [ "yaml",  "yaml"  ], [ "yml",      "yaml" ],
    [ "toon",  "toon"  ],
    [ "html",  "html"  ], [ "htm",      "html" ],
    [ "pdf",   "pdf"   ],
    [ "md",    "md"    ], [ "markdown", "md"   ]
])

/*  parse an output specification "[<format>:]<filename>", inferring the
    format from the filename extension when not explicitly given
    (plain "-" for stdout defaults to JSON)  */
export const parseOutputSpec = (spec: string): { format: ExportFormat, output: string } => {
    /*  a single-character prefix is never a format name, so a Windows
        drive letter still falls through to the extension inference  */
    const prefixed = spec.match(/^([a-zA-Z0-9]{2,}):(.+)$/)
    if (prefixed !== null) {
        const explicit = extensions.get(prefixed[1].toLowerCase())
        if (explicit === undefined)
            throw new Error(`unknown export format "${prefixed[1]}" in output "${spec}" ` +
                `(supported: ${Array.from(extensions.keys()).join(", ")})`)
        return { format: explicit, output: prefixed[2] }
    }
    if (spec === "-")
        return { format: "json", output: spec }
    const ext    = spec.match(/\.([a-zA-Z0-9]+)$/)
    const format = ext !== null ? extensions.get(ext[1].toLowerCase()) : undefined
    if (format !== undefined)
        return { format, output: spec }
    throw new Error(`unable to infer export format from output "${spec}" ` +
        "(use an explicit \"<format>:<filename>\" specification)")
}

/*  the quiet period the observed files have to stay silent for before a
    burst of changes is coalesced into a single re-export  */
const watchDelay = 1000

/*  keep a specification export in sync with its sources, where "run"
    performs one export and returns the files to observe: the initial
    export is performed up-front and every observed change triggers a
    re-export once the sources fell silent again. The observed set is
    re-synchronized after every run, as an edit can add or drop an
    embedded asset. The returned promise settles once the initial export
    is done, while the active watcher keeps the process alive afterwards  */
export const watchSpecification = async (
    run:     () => Promise<string[]>,
    verbose: Verbose
): Promise<void> => {
    /*  perform the regular export before entering the observe loop  */
    let observed  = await run()
    const watcher = watch(observed, { ignoreInitial: true })
    verbose(`observing ${literal(observed.length)} specification file(s) for changes`)

    /*  report the failures of the observation itself, as an unhandled
        "error" event would otherwise terminate the process  */
    watcher.on("error", (err: unknown) => {
        verbose("observing failed: " +
            (err instanceof Error ? err.message : String(err)), "notice")
    })

    /*  perform a re-export and re-synchronize the observed files  */
    const cycle = async () => {
        const files = await run()
        watcher.unwatch(observed.filter((file) => !files.includes(file)))
        watcher.add(files.filter((file) => !observed.includes(file)))
        observed = files
    }

    /*  restart the quiet period on every change, so a burst collapses
        into a single re-export, and chain the runs onto each other, so a
        change arriving during a run cannot start a concurrent one (the
        chained catch keeps an unexpected failure from breaking the chain
        and hence silently ending the observe loop)  */
    let chain = Promise.resolve()
    let timer: ReturnType<typeof setTimeout> | undefined
    watcher.on("all", () => {
        if (timer !== undefined)
            clearTimeout(timer)
        timer = setTimeout(() => {
            timer = undefined
            chain = chain.then(cycle).catch((err: unknown) => {
                verbose("re-export failed: " +
                    (err instanceof Error ? err.message : String(err)), "notice")
            })
        }, watchDelay)
    })
}

/*  render a specification into the requested format, where "realtime"
    injects the client-side script of the live preview into the HTML  */
const renderFormat = async (
    specification:   Spec,
    format:          ExportFormat,
    verbose:         Verbose,
    config?:         Schema,
    realtime         = false
): Promise<Buffer> => {
    if (format === "json" || format === "json5" || format === "yaml" || format === "toon")
        return renderAst(specification, format satisfies AstFormat, config)
    else if (format === "md")
        return Buffer.from(renderMarkdown(specification, config), "utf8")

    /*  the HTML-based formats share the stylesheet, with the embedded
        fonts subsetted to the CHARSET of the specification (if any)  */
    const charset = documentCharset(specification)
    if (charset !== undefined && charsetCodepoints(charset) !== undefined)
        verbose(`subsetting embedded fonts to charset "${literal(charset)}"`)

    /*  the theme tone (THEME-TONE) drives the layer-1 color spread
        variables and the PDF decoration colors  */
    const tone = documentThemeTone(specification) ?? "#336699"
    verbose(`generating theme color spreads (tone "${literal(tone)}")`)
    const colors = themeColors(tone)

    /*  the paper size (PAPER-SIZE) drives the PDF page setup and the
        print-time height constraint of the diagrams  */
    const paper  = documentPaperSize(specification)
    const css    = themeStylesheet(colors) + await subsetStylesheet(charset) + paperStylesheet(paper)
    if (format === "html") {
        /*  compress the rendered HTML (whitespace, comments, and inline CSS/JS)  */
        const html     = await renderHtml(specification, config, undefined, css, realtime, verbose)
        const minified = await minify(Buffer.from(html, "utf8"), {
            collapseWhitespaces: "smart",
            removeComments:      true,
            minifyCss:           true,
            minifyJs:            true
        })
        return Buffer.from(minified.code, "utf8")
    }
    else
        /*  the PDF export (like print in general) always uses the light
            theme, so its decoration colors are the light mapping, too  */
        return htmlToPdf((tocPages) => renderHtml(specification, config, tocPages, css, false, verbose),
            { ...documentTitle(specification), logo: documentLogo(specification) },
            htmlOutline(specification, config), titlePageObject(specification) !== undefined,
            verbose, css, themeMapping(colors, "light"), paper)
}

/*  export a specification into the requested format (see "renderFormat"),
    reporting the duration of the rendering in the verbose output  */
export const exportSpecification = async (
    specification:   Spec,
    format:          ExportFormat,
    verbose:         Verbose,
    config?:         Schema,
    realtime         = false
): Promise<Buffer> => {
    if (!formats.includes(format))
        throw new Error(`unknown export format "${format}"`)
    verbose(`exporting specification as "${literal(format)}"`)
    const started = performance.now()
    const buffer  = await renderFormat(specification, format, verbose, config, realtime)
    const seconds = ((performance.now() - started) / 1000).toFixed(3)
    verbose(`exported specification as "${literal(format)}" in ${literal(seconds)}s`)
    return buffer
}
