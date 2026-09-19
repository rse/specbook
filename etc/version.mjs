/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  bump the version of the project consistently in all files carrying
    it: the NPM package manifest, the Claude Code plugin manifest, and
    the NPM package manifest of the website  */

import fs     from "node:fs"
import json   from "json-asty"
import StdVer from "stdver"

/*  determine version bumping  */
const bump = ({ major: "M", minor: "N", patch: "R" })[process.argv[2] ?? "patch"]
    ?? process.argv[2] ?? "R"
console.log(`++ bumped version part: ${bump}`)

/*  find old version  */
console.log("++ read file: \"package.json\"")
const ast = json.parse(fs.readFileSync("package.json", "utf8"))
const node = ast.query("./ object / member [ / string [ @value == \"version\" ] ] / string [ pos() == 2 ]")[0]
let version = node.get("value")
console.log(`++ old version: ${version}`)

/*  determine new version  */
const stdver = new StdVer()
version = stdver.modify(version, { bump, level: 0 })
console.log(`++ new version: ${version}`)

/*  update configuration files  */
for (const file of [
    "package.json",
    "plugin/.claude-plugin/plugin.json",
    "web/package.json"
]) {
    console.log(`++ update file: "${file}"`)
    const ast = json.parse(fs.readFileSync(file, "utf8"))
    const node = ast.query("./ object / member [ / string [ @value == \"version\" ] ] / string [ pos() == 2 ]")[0]
    node.set("value", version)
    node.set("body", `"${version}"`)
    fs.writeFileSync(file, json.unparse(ast), "utf8")
}

