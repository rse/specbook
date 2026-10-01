/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  download the prebuilt PDF.js viewer distribution and place it, trimmed down
    to what the website needs, into the (git-ignored) "public/pdfjs/"  */

import fs                from "node:fs"
import path              from "node:path"
import { unzipSync }     from "fflate"

const version = "6.3.289"
const url     = `https://github.com/mozilla/pdf.js/releases/download/v${version}/pdfjs-${version}-dist.zip`
const target  = path.join(import.meta.dirname, "..", "public", "pdfjs")
const stamp   = path.join(target, ".version")

/*  the patched viewer option defaults: a read-only preview (no stored
    preferences, no scripting, no annotation editing) in the light theme  */
const options = {
    disablePreferences:   true,
    enableScripting:      false,
    annotationEditorMode: -1,
    viewerCssTheme:       1
}

/*  the appended viewer styles: no secondary toolbar ("Tools" menu) and its separator  */
const styles = "#secondaryToolbarToggle, .verticalToolbarSeparator:has(+ #secondaryToolbarToggle)"
    + " { display: none !important; }\n"
const revision = `${version} ${JSON.stringify(options)} ${JSON.stringify(styles)}`

/*  skip the download if this version is already in place  */
if (fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8").trim() === revision)
    process.exit(0)

/*  drop the source maps, the sample document, the debugger, the
    scripting sandbox (scripting is disabled), and all non-English locales  */
const skip = (file) =>
    /\.map$/.test(file)
    || file === "build/pdf.sandbox.mjs"
    || file === "web/compressed.tracemonkey-pldi-09.pdf"
    || /^web\/debugger\./.test(file)
    || (/^web\/locale\//.test(file) && !/^web\/locale\/(en-US\/|locale\.json$)/.test(file))

process.stdout.write(`pdfjs: downloading PDF.js ${version} viewer\n`)
const res = await fetch(url)
if (!res.ok)
    throw new Error(`pdfjs: failed to download ${url}: ${res.status} ${res.statusText}`)
const files = unzipSync(new Uint8Array(await res.arrayBuffer()), {
    filter: (file) => !file.name.endsWith("/") && !skip(file.name)
})

/*  patch the option defaults of the viewer, failing loudly if a new version
    changed their declaration form  */
let viewer = new TextDecoder().decode(files["web/viewer.mjs"])
for (const [ name, value ] of Object.entries(options)) {
    const re = new RegExp(`(\\["${name}", \\{\\n  value: )[^,\\n]+,`)
    if (!re.test(viewer))
        throw new Error(`pdfjs: cannot find default of viewer option "${name}"`)
    viewer = viewer.replace(re, `$1${JSON.stringify(value)},`)
}
files["web/viewer.mjs"] = new TextEncoder().encode(viewer)
files["web/viewer.css"] = new TextEncoder().encode(new TextDecoder().decode(files["web/viewer.css"]) + styles)

/*  replace the previous viewer  */
fs.rmSync(target, { recursive: true, force: true })
for (const [ file, data ] of Object.entries(files)) {
    const p = path.join(target, file)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, data)
}

/*  map the English locale only, as the viewer silently falls back onto it  */
fs.writeFileSync(path.join(target, "web", "locale", "locale.json"), "{\"en-us\":\"en-US/viewer.ftl\"}\n")
fs.writeFileSync(stamp, `${revision}\n`)
process.stdout.write(`pdfjs: placed ${Object.keys(files).length} files into public/pdfjs/\n`)

