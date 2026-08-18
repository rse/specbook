/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { converter, clampChroma, formatHex } from "culori"

/*  ==== Color Spread Generation (based on SCS, Simple Color Scheme) ====  */

/*  color spread specification (with all defaults resolved)  */
export type ThemeSpec = {
    rgb:     string,
    floor:   number,
    ceiling: number,
    count:   number
}

/*  generation constants  */
const greyChroma    = 0.01  /*  OKLCH chroma below which a color counts as plain grey  */
const greyFloor     = 0     /*  lightness floor   of a plain grey color (in percent)   */
const greyCeiling   = 0     /*  lightness ceiling of a plain grey color (in percent)   */
const colorFloor    = 20    /*  lightness floor   of a chromatic color (in percent)    */
const colorCeiling  = 10    /*  lightness ceiling of a chromatic color (in percent)    */
const defaultCount  = 9     /*  number of colors in a spread                           */

/*  color space converter  */
const toOKLCH = converter("oklch")

/*  parse a color spread specification "<rgb>[^][+<floor>][-<ceiling>][/<count>]"  */
export function parseSpec (spec: string): ThemeSpec {
    const m = spec.match(/^(.+?)(\^)?(?:\+(\d+(?:\.\d+)?))?(?:-(\d+(?:\.\d+)?))?(?:\/(\d+))?$/)
    if (m === null)
        throw new Error(`invalid color spread specification "${spec}"`)
    const [ , rgb, complement, floor, ceiling, count ] = m
    const oklch = toOKLCH(rgb)
    if (oklch === undefined)
        throw new Error(`invalid color "${rgb}"`)

    /*  a plain grey color spans the entire lightness range,
        while a chromatic color stays off both of its ends  */
    const grey = oklch.c < greyChroma

    /*  optionally transpose the base color into its complement,
        i.e. rotate its hue by 180 degrees on the color wheel  */
    const base = complement ?
        formatHex(clampChroma({ ...oklch, h: ((oklch.h ?? 0) + 180) % 360 }, "oklch")) :
        rgb

    const result: ThemeSpec = {
        rgb: base,
        floor:   floor   ? parseFloat(floor)   : (grey ? greyFloor   : colorFloor),
        ceiling: ceiling ? parseFloat(ceiling) : (grey ? greyCeiling : colorCeiling),
        count:   count   ? parseInt(count)     : defaultCount
    }
    if (result.floor < 0 || result.ceiling < 0 || (result.floor + result.ceiling) >= 100)
        throw new Error(`invalid lightness range in specification "${spec}"`)
    if (result.count < 1)
        throw new Error(`invalid number of colors in specification "${spec}"`)
    return result
}

/*  generate the color spread of a color spread specification  */
export function generate (spec: ThemeSpec): string[] {
    const oklch = toOKLCH(spec.rgb)
    if (oklch === undefined)
        throw new Error(`invalid color "${spec.rgb}"`)

    /*  sweep the lightness between the floor and the ceiling bound,
        while keeping chroma and hue fixed as the "tone" of the spread  */
    const from = spec.floor / 100
    const to   = (100 - spec.ceiling) / 100
    const colors = [] as string[]
    for (let i = 0; i < spec.count; i++) {
        const l = spec.count > 1 ? from + ((to - from) * (i / (spec.count - 1))) : from

        /*  reduce the chroma just enough to re-enter the sRGB gamut,
            which leaves the lightness and the hue untouched  */
        colors.push(formatHex(clampChroma({ ...oklch, l }, "oklch")))
    }
    return colors
}

/*  ==== Theme Colors (layer 1) ====  */

/*  the theme styles and theme color spreads  */
export type ThemeStyle  = "light" | "dark"
export type ThemeColors = {
    base:   string[],
    accent: string[],
    search: string[]
}

/*  generate the theme color spreads from the theme color tone:
    a grey base spread, a tone-derived accent spread, and a search
    spread derived from the complement-transposed tone  */
export const themeColors = (tone: string): ThemeColors => {
    const transposed = tone.endsWith("^") ? tone.slice(0, -1) : `${tone}^`
    return {
        base:   generate(parseSpec("#000000/32")),
        accent: generate(parseSpec(`${tone}+40-5/32`)),
        search: generate(parseSpec(`${transposed}+40-5/32`))
    }
}

/*  render the theme colors into the layer-1 ":root" CSS variable
    block "--theme-color-{base,accent,search}-{1..32}"  */
export const themeStylesheet = (colors: ThemeColors): string =>
    ":root {\n" +
    colors.base.map((color, i)   => `    --theme-color-base-${i + 1}: ${color};\n`).join("") +
    colors.accent.map((color, i) => `    --theme-color-accent-${i + 1}: ${color};\n`).join("") +
    colors.search.map((color, i) => `    --theme-color-search-${i + 1}: ${color};\n`).join("") +
    "}\n"

/*  ==== Theme Mapping (layer 2, code-side subset) ====  */

/*  the semantic theme colors needed outside of CSS (PDF decoration)  */
export type ThemeMapping = {
    text:   string,
    muted:  string,
    symbol: string,
    border: string,
    accent: string
}

/*  map the theme color spreads onto the semantic theme colors,
    aligned with the layer-2 CSS mapping of the HTML rendering  */
export const themeMapping = (colors: ThemeColors, style: ThemeStyle): ThemeMapping => {
    const idx = style === "dark" ?
        { text: 28, muted: 22, symbol: 20, border: 16, accent: 24 } :
        { text: 5,  muted: 22, symbol: 24, border: 28, accent: 12 }
    return {
        text:   colors.base[idx.text     - 1],
        muted:  colors.base[idx.muted    - 1],
        symbol: colors.base[idx.symbol   - 1],
        border: colors.base[idx.border   - 1],
        accent: colors.accent[idx.accent - 1]
    }
}
