/**
 * AI 服务 - 使用 LangChain + OpenRouter
 */

import { ChatOpenAI } from '@langchain/openai'
import { HumanMessage, SystemMessage, AIMessage as LangChainAIMessage } from '@langchain/core/messages'

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface AIChatResponse {
    content: string
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
}

/**
 * AI 服务类 - 使用 OpenRouter
 */
export class AIService {
    private model: ChatOpenAI

    constructor(apiKey: string, modelName: string = 'openai/gpt-3.5-turbo') {
        // 初始化 ChatOpenAI，配置 OpenRouter
        // 注意：OpenRouter 使用 OpenAI 兼容接口
        this.model = new ChatOpenAI({
            configuration: {
                baseURL: 'https://openrouter.ai/api/v1',
                apiKey: apiKey,
                defaultHeaders: {
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'AI Mind Map',
                },
                timeout: 30000,
            },
            modelName: modelName,
            temperature: 0.7,
            maxRetries: 1,
        })
    }

    /**
     * 转换消息格式
     */
    private convertMessages(messages: ChatMessage[]) {
        return messages.map(msg => {
            switch (msg.role) {
                case 'system':
                    return new SystemMessage(msg.content)
                case 'user':
                    return new HumanMessage(msg.content)
                case 'assistant':
                    return new LangChainAIMessage(msg.content)
                default:
                    return new HumanMessage(msg.content)
            }
        })
    }

    /**
     * 发送聊天请求
     */
    async chat(messages: ChatMessage[]): Promise<AIChatResponse> {
        const langchainMessages = this.convertMessages(messages)
        const response = await this.model.invoke(langchainMessages)

        return {
            content: response.content as string,
            usage: response.usage_metadata ? {
                promptTokens: response.usage_metadata.input_tokens,
                completionTokens: response.usage_metadata.output_tokens,
                totalTokens: response.usage_metadata.total_tokens
            } : undefined
        }
    }

    /**
     * 流式聊天
     */
    async *chatStream(messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
        const langchainMessages = this.convertMessages(messages)

        // LangChain 的流式 API
        const stream = await this.model.stream(langchainMessages)

        for await (const chunk of stream) {
            if (chunk.content) {
                yield chunk.content as string
            }
        }
    }

    /**
     * 生成思维导图
     */
    async generateMindMap(userPrompt: string): Promise<string> {
        const systemPrompt = `你是一个思维导图生成助手。用户会向你提问，你需要：
1. 分析问题并组织知识点
2. 生成 JSON 格式的思维导图数据
3. 每个节点的 text 字段控制在 15 个汉字或 10 个英文单词以内
4. 超出的内容放到节点的 note 字段中

返回格式示例：
\`\`\`json
{
  "data": {
    "text": "中心主题",
    "note": "详细说明..."
  },
  "children": [
    {
      "data": {
        "text": "子主题1",
        "note": "更多内容..."
      },
      "children": []
    }
  ]
}
\`\`\`

请直接返回 JSON，不要额外解释。`

        const messages: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]

        const response = await this.chat(messages)
        return response.content
    }
}

/**
 * 创建 AI 服务实例
 */
export function createAIService(
    apiKey?: string,
    modelName?: string
): AIService | null {
    const key = apiKey || import.meta.env.VITE_OPENROUTER_API_KEY
    const model = modelName || import.meta.env.VITE_AI_MODEL || 'openai/gpt-3.5-turbo'

    if (!key) {
        console.warn('未配置 OpenRouter API Key')
        return null
    }

    return new AIService(key, model)
}
