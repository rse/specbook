/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import pluginYAML from "eslint-plugin-yml"

export default [
    ...pluginYAML.configs["flat/standard"],
    {
        files: [ "**/*.yaml" ],
        rules: {
            "yml/indent":         [ "error", 4 ],
            "yml/key-spacing":    [ "error", { mode: "minimum" } ],
            "yml/spaced-comment": [ "error", "always", { markers: [ "#" ] } ]
        }
    }
]

