/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import postcssUrl from "postcss-url"

export default {
    plugins: [
        /*  inline all url() asset references as base64 data: URIs  */
        postcssUrl({ url: "inline" })
    ]
}
