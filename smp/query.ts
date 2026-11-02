/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  sample foreign document generator: the roles of the "broadcast"
    sample specification with the use cases they act in, as Markdown  */
import { SpecBook, isObject } from "../dst/specbook-api.js"

const specbook = new SpecBook()
const document = await specbook.load({ basedir: "smp/broadcast" })

/*  a custom query function telling whether a list contains an item  */
document.func("contains", (_adapter, _node, list, item) =>
    Array.isArray(list) && list.includes(item))

let output = "# Roles and Use Cases\n"
for (const role of document.query("// ROLE", isObject)) {
    output += `\n## ${document.plain(role.name)}\n\n` +
        `${document.plain(role.description?.description ?? "", role)}.\n\n`
    for (const useCase of document.query("// USE-CASE [ contains(refs(), {role}) ]", { role }, isObject)) {
        const parent = document.parent(useCase, isObject)
        output += `-   ${document.plain(useCase.name)}` +
            (parent !== undefined ? ` (in ${document.plain(parent.name)})` : "") + "\n"
    }
}
process.stdout.write(output)

