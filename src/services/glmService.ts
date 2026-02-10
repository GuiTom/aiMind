/**
 * 智谱 AI GLM 4 API 服务
 */

export interface GLMMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface GLMChatRequest {
    model: string
    messages: GLMMessage[]
    stream?: boolean
    temperature?: number
    top_p?: number
    max_tokens?: number
}

export interface GLMChatResponse {
    id: string
    created: number
    model: string
    choices: Array<{
        index: number
        message: GLMMessage
        finish_reason: string
    }>
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

/**
 * GLM API 服务类
 */
export class GLMService {
    private apiKey: string
    private baseURL = 'https://open.bigmodel.cn/api/paas/v4'

    constructor(apiKey: string) {
        this.apiKey = apiKey
    }

    /**
     * 发送聊天请求（非流式）
     */
    async chat(messages: GLMMessage[], options?: {
        temperature?: number
        maxTokens?: number
    }): Promise<GLMChatResponse> {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 2000,
                stream: false
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
        }

        return response.json()
    }

    /**
     * 发送聊天请求（流式）
     */
    async *chatStream(messages: GLMMessage[], options?: {
        temperature?: number
        maxTokens?: number
    }): AsyncGenerator<string, void, unknown> {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages,
                temperature: options?.temperature || 0.7,
                max_tokens: options?.maxTokens || 2000,
                stream: true
            })
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({}))
            throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
            throw new Error('无法读取响应流')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    const trimmedLine = line.trim()
                    if (!trimmedLine || trimmedLine === 'data: [DONE]') continue

                    if (trimmedLine.startsWith('data: ')) {
                        try {
                            const jsonStr = trimmedLine.substring(6)
                            const data = JSON.parse(jsonStr)
                            const content = data.choices?.[0]?.delta?.content

                            if (content) {
                                yield content
                            }
                        } catch (e) {
                            console.error('解析流式响应失败:', e)
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock()
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

        const messages: GLMMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ]

        const response = await this.chat(messages, { temperature: 0.8 })
        return response.choices[0].message.content
    }
}

/**
 * 创建 GLM 服务实例
 */
export function createGLMService(apiKey?: string): GLMService | null {
    const key = apiKey || import.meta.env.VITE_GLM_API_KEY

    if (!key) {
        console.warn('未配置 GLM API Key')
        return null
    }

    return new GLMService(key)
}
