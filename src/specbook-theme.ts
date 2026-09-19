/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { parse, generate } from "@rse/mrcs"

/*  ==== Theme Colors (layer 1) ====  */

/*  the theme styles and theme color spreads  */
export type ThemeStyle  = "light" | "dark"
export type ThemeColors = {
    base:   string[]
    accent: string[]
    signal: string[]
}

/*  generate the theme color spreads from the theme color tone(s):
    a grey base spread, an accent spread derived from the first tone,
    and a signal spread derived from the second tone (if given) or
    else from the complement-transposed first tone  */
export const themeColors = (tone: string): ThemeColors => {
    const [ accent, signal = `${accent}^` ] = tone.trim().split(/\s+/)
    return {
        base:   generate(parse("#000000/32")),
        accent: generate(parse(`${accent}+40-5/32`)),
        signal: generate(parse(`${signal}+40-5/32`))
    }
}

/*  render the theme colors into the layer-1 ":root" CSS variable
    block "--theme-color-{base,accent,signal}-{1..32}"  */
export const themeStylesheet = (colors: ThemeColors): string =>
    ":root {\n" +
    colors.base.map((color, i)   => `    --theme-color-base-${i + 1}: ${color};\n`).join("") +
    colors.accent.map((color, i) => `    --theme-color-accent-${i + 1}: ${color};\n`).join("") +
    colors.signal.map((color, i) => `    --theme-color-signal-${i + 1}: ${color};\n`).join("") +
    "}\n"

/*  ==== Theme Mapping (layer 2, code-side subset) ====  */

/*  the semantic theme colors needed outside of CSS (PDF decoration)  */
export type ThemeMapping = {
    muted:  string
    symbol: string
    border: string
    accent: string
}

/*  map the theme color spreads onto the semantic theme colors,
    aligned with the layer-2 CSS mapping of the HTML rendering  */
export const themeMapping = (colors: ThemeColors, style: ThemeStyle): ThemeMapping => {
    const idx = style === "dark" ?
        { muted: 22, symbol: 20, border: 16, accent: 24 } :
        { muted: 22, symbol: 24, border: 28, accent: 12 }
    return {
        muted:  colors.base[idx.muted    - 1],
        symbol: colors.base[idx.symbol   - 1],
        border: colors.base[idx.border   - 1],
        accent: colors.accent[idx.accent - 1]
    }
}
