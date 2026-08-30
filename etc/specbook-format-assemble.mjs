/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  assemble the bundled standard YAML schema configuration out of
    its per-kind parts: the first part is taken in full, the others
    contribute their bodies (without the repeated copyright header)  */

import fs   from "node:fs"
import path from "node:path"

const [ srcDir, dstFile ] = process.argv.slice(2)
if (!srcDir || !dstFile) {
    process.stderr.write("usage: specbook-format-assemble <src-dir> <dst-file>\n")
    process.exit(1)
}

const parts = fs.readdirSync(srcDir)
    .filter((name) => /^std-\d+-[a-z]+\.yaml$/.test(name))
    .sort()
    .map((name, i) => {
        let content = fs.readFileSync(path.join(srcDir, name), "utf8")
        if (i > 0)
            content = content.replace(/^(##.*\n)+\n*/, "")
        return content
    })
fs.writeFileSync(dstFile, parts.join(""), "utf8")

