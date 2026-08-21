/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import pluginJs        from "@eslint/js"
import * as pluginStd  from "neostandard"
import pluginTS        from "typescript-eslint"
import globals         from "globals"

export default [
    { ignores: [ "etc/eslint.mjs", "dst" ] },
    pluginJs.configs.recommended,
    ...pluginTS.configs.strict,
    ...pluginTS.configs.stylistic,
    ...pluginStd.neostandard({
        ts:      true,
        ignores: pluginStd.resolveIgnoresFromGitignore()
    }),
    {
        files: [ "**/*.ts" ],
        languageOptions: {
            ecmaVersion: 2024,
            sourceType:  "module",
            parser:      pluginTS.parser,
            globals: {
                ...globals.node
            }
        },
        rules: {
            "curly":                                              "off",
            "require-atomic-updates":                             "off",
            "no-redeclare":                                       "off",
            "@typescript-eslint/no-redeclare":                    "off",
            "@typescript-eslint/consistent-type-definitions":     "off",
            "@typescript-eslint/consistent-indexed-object-style": "off",
            "@typescript-eslint/no-unused-vars":                  [ "error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" } ],
            "dot-notation":                                       "off",
            "no-labels":                                          "off",
            "no-useless-constructor":                             "off",
            "no-dupe-class-members":                              "off",

            "@stylistic/indent":                                  [ "error", 4, { SwitchCase: 1 } ],
            "@stylistic/linebreak-style":                         [ "error", "unix" ],
            "@stylistic/semi":                                    [ "error", "never" ],
            "@stylistic/operator-linebreak":                      [ "error", "after", { overrides: { "&&": "before", "||": "before", "|": "before", ":": "after" } } ],
            "@stylistic/brace-style":                             [ "error", "stroustrup", { allowSingleLine: true } ],
            "@stylistic/quotes":                                  [ "error", "double" ],

            "@stylistic/no-multi-spaces":                         "off",
            "@stylistic/no-multiple-empty-lines":                 "off",
            "@stylistic/key-spacing":                             "off",
            "@stylistic/object-property-newline":                 "off",
            "@stylistic/object-curly-newline":                    "off",
            "@stylistic/space-in-parens":                         "off",
            "@stylistic/array-bracket-spacing":                   "off",
            "@stylistic/lines-between-class-members":             "off",
            "@stylistic/multiline-ternary":                       "off",
            "@stylistic/quote-props":                             "off"
        }
    }
]
