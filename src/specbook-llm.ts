/*
**  Specification Book (SpecBook)
**  Copyright (c) 2026 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under Apache 2.0 <https://spdx.org/licenses/Apache-2.0>
*/

import { type LanguageModel } from "ai"

/*  the AI provider/model selection options, with the environment
    variables SPECBOOK_AI_PROVIDER/SPECBOOK_AI_MODEL as the defaults  */
export interface AiOptions {
    provider?: string
    model?:    string
}

/*  a supported AI provider, with its default model and its lazily
    imported language model factory  */
interface Provider {
    model:  string
    create: (id: string) => Promise<LanguageModel>
}

/*  the supported AI providers  */
const providers: Record<string, Provider | undefined> = {
    anthropic:  { model: "claude-sonnet-5",
        create: async (id) => (await import("@ai-sdk/anthropic")).createAnthropic()(id) },
    openai:     { model: "gpt-5.6-luna",
        create: async (id) => (await import("@ai-sdk/openai")).createOpenAI()(id) },
    openrouter: { model: "anthropic/claude-sonnet-5",
        create: async (id) => (await import("@openrouter/ai-sdk-provider")).createOpenRouter()(id) },
    ollama:     { model: "qwen3",
        create: async (id) => (await import("ollama-ai-provider-v2")).createOllama()(id) }
}

/*  resolve the AI provider and model into a language model handle  */
export const resolveModel = async (options: AiOptions): Promise<LanguageModel> => {
    const name     = options.provider ?? process.env.SPECBOOK_AI_PROVIDER ?? "anthropic"
    const provider = providers[name]
    if (provider === undefined)
        throw new Error(`unknown AI provider "${name}" (expected ` +
            Object.keys(providers).map((n) => `"${n}"`).join(", ") + ")")
    const model = options.model ?? process.env.SPECBOOK_AI_MODEL ?? provider.model
    return provider.create(model)
}

/*  perform a single LLM completion  */
export const complete = async (options: AiOptions, system: string, prompt: string): Promise<string> => {
    const { generateText } = await import("ai")
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
    const re     = /<<<FILE:\s*([^>]+?)\s*>>>\r?\n([\s\S]*?)<<<END-FILE>>>/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null)
        blocks.push({ name: m[1], content: m[2].replace(/\n*$/, "\n") })
    return blocks
}

