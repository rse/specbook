/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { generateText, type LanguageModel } from "ai"

/*  the AI provider/model selection options, with the environment
    variables SPECBOOK_AI_PROVIDER/SPECBOOK_AI_MODEL as the defaults  */
export interface AiOptions {
    provider?: string
    model?:    string
}

/*  the default model per supported provider  */
const defaults: Record<string, string> = {
    anthropic:  "claude-sonnet-5",
    openai:     "gpt-5.6-luna",
    openrouter: "anthropic/claude-sonnet-5",
    ollama:     "qwen3"
}

/*  resolve the AI provider and model into a language model handle  */
export const resolveModel = async (options: AiOptions): Promise<LanguageModel> => {
    const provider = options.provider ?? process.env.SPECBOOK_AI_PROVIDER ?? "anthropic"
    const model    = options.model    ?? process.env.SPECBOOK_AI_MODEL    ?? defaults[provider]
    if (provider === "anthropic") {
        const { createAnthropic } = await import("@ai-sdk/anthropic")
        return createAnthropic()(model)
    }
    else if (provider === "openai") {
        const { createOpenAI } = await import("@ai-sdk/openai")
        return createOpenAI()(model)
    }
    else if (provider === "openrouter") {
        const { createOpenRouter } = await import("@openrouter/ai-sdk-provider")
        return createOpenRouter()(model)
    }
    else if (provider === "ollama") {
        const { createOllama } = await import("ollama-ai-provider-v2")
        return createOllama()(model)
    }
    else
        throw new Error(`unknown AI provider "${provider}" ` +
            "(expected \"anthropic\", \"openai\", \"openrouter\" or \"ollama\")")
}

/*  perform a single LLM completion  */
export const complete = async (options: AiOptions, system: string, prompt: string): Promise<string> => {
    const model  = await resolveModel(options)
    const result = await generateText({ model, system, prompt })
    return result.text
}

/*  the current time in the frontmatter timestamp format  */
export const timestamp = (): string => {
    const d   = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/*  render a named file as a block of the LLM file exchange protocol  */
export const renderFileBlock = (name: string, content: string): string =>
    `<<<FILE: ${name}>>>\n${content.replace(/\n$/, "")}\n<<<END-FILE>>>`

/*  parse all file blocks of the LLM file exchange protocol  */
export const parseFileBlocks = (text: string): { name: string, content: string }[] => {
    const blocks = new Array<{ name: string, content: string }>()
    const re = /<<<FILE:\s*([^>]+?)\s*>>>\r?\n([\s\S]*?)<<<END-FILE>>>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null)
        blocks.push({ name: m[1], content: m[2].replace(/\n*$/, "\n") })
    return blocks
}

