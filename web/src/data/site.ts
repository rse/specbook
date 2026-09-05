/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

/*  central site configuration for the SpecBook website.
    Trimmed to the handful of values a single static landing page actually
    needs. The `url` is also the Astro `site` of `etc/astro.config.mjs`, which
    can be overridden there through the `SITE_URL` environment variable.  */
export const site = {
    name:        "SpecBook",
    title:       "Specification Book (SpecBook)",
    tagline:     "Markdown-based Specification Format",
    description: "The opinionated tooling of Dr. Ralf S. Engelschall for a generic, Markdown-based " +
                 "specification format, configured for particular contexts through a YAML schema configuration.",
    url:         "https://specbook.tools",
    author:      "Dr. Ralf S. Engelschall",
    email:       "rse@engelschall.com",
    repo:        "https://github.com/rse/specbook",
    npm:         "https://www.npmjs.com/package/@rse/specbook",

    /*  steel-blue signal color, used for the browser toolbar tint on mobile.
        It is the very theme color tone SpecBook itself defaults to and out of
        which the `--brand-*` scale in `styles/theme.css` is spread.  */
    themeColor:  "#336699"
} as const
