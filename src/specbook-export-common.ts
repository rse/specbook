/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import path              from "node:path"
import fs                from "node:fs"
import { fileURLToPath } from "node:url"

import type { Specification, Object as SpecObject }
    from "./specbook-struct-spec.js"

/*  escape a text for embedding into template HTML  */
export const escapeHtml = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/*  provide the build-time pre-assembled stylesheet (with the
    font faces already inlined as base64 data: URIs)  */
export const stylesheet = (): string =>
    fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-export-html.css"), "utf8")

/*  provide the build-time bundled fallback logo of SpecBook itself
    (as a self-contained data: URL, to keep its styles isolated)  */
export const fallbackLogo = (): string =>
    "data:image/svg+xml;base64," + fs.readFileSync(path.join(
        path.dirname(fileURLToPath(import.meta.url)), "specbook-export-logo.svg")).toString("base64")

/*  check whether an object is the specification title object  */
export const isTitleObject = (object: SpecObject): boolean =>
    object.kind === "META" && object.name.toUpperCase() === "TITLE"

/*  determine the document title and subtitle from the title object  */
export const documentTitle = (specification: Specification): { title: string, subtitle?: string } => {
    const object = specification.artifacts.flatMap((artifact) => artifact.objects).find(isTitleObject)
    const prop = (name: string) =>
        object?.properties.find((property) => property.key === name)?.value
    return { title: prop("TITLE") ?? object?.name ?? "Specification", subtitle: prop("SUBTITLE") }
}
