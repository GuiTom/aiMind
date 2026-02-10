/**
 * 思维导图生成工具
 * 处理文本长度限制和节点生成
 */

export interface MindMapNodeData {
    text: string
    note?: string
    expand?: boolean
    isActive?: boolean
}

export interface MindMapNode {
    data: MindMapNodeData
    children?: MindMapNode[]
}

/**
 * 检测文本长度（汉字按1计数，英文单词也按1计数）
 */
function getTextLength(text: string): { hanziCount: number; wordCount: number } {
    // 匹配汉字
    const hanziMatches = text.match(/[\u4e00-\u9fa5]/g)
    const hanziCount = hanziMatches ? hanziMatches.length : 0

    // 匹配英文单词（连续的字母数字字符）
    const wordMatches = text.match(/[a-zA-Z0-9]+/g)
    const wordCount = wordMatches ? wordMatches.length : 0

    return { hanziCount, wordCount }
}

/**
 * 判断文本是否超过限制
 * 限制：15个汉字或10个英文单词
 */
function isTextTooLong(text: string): boolean {
    const { hanziCount, wordCount } = getTextLength(text)
    return hanziCount > 15 || wordCount > 10
}

/**
 * 分割文本为节点文本和注释
 * @param text 原始文本
 * @returns { nodeText: 节点显示的文本, note: 注释内容 }
 */
export function splitTextForNode(text: string): { nodeText: string; note?: string } {
    if (!text) return { nodeText: '' }

    const trimmedText = text.trim()

    if (!isTextTooLong(trimmedText)) {
        return { nodeText: trimmedText }
    }

    // 文本太长，需要分割
    const { hanziCount, wordCount } = getTextLength(trimmedText)

    // 优先按句子分割（句号、问号、感叹号）
    const sentences = trimmedText.split(/([。！？.!?])/g)
    let nodeText = ''
    let remaining = ''

    for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i]
        const testText = nodeText + part

        if (isTextTooLong(testText)) {
            // 加上这一部分就超了
            remaining = sentences.slice(i).join('')
            break
        }
        nodeText += part
    }

    // 如果没有找到合适的分割点，按字数/词数强制分割
    if (!nodeText) {
        if (hanziCount > 15) {
            // 主要是汉字，取前15个汉字
            let count = 0
            let index = 0
            for (let i = 0; i < trimmedText.length; i++) {
                if (/[\u4e00-\u9fa5]/.test(trimmedText[i])) {
                    count++
                    if (count > 15) break
                }
                index = i + 1
            }
            nodeText = trimmedText.substring(0, index)
            remaining = trimmedText.substring(index)
        } else {
            // 主要是英文，取前10个单词
            const words = trimmedText.split(/\s+/)
            nodeText = words.slice(0, 10).join(' ')
            remaining = words.slice(10).join(' ')
        }
    }

    return {
        nodeText: nodeText.trim(),
        note: remaining.trim() || undefined
    }
}

/**
 * 解析 AI 返回的 JSON 格式脑图数据
 */
export function parseAIMindMap(aiResponse: string): MindMapNode | null {
    try {
        // 尝试从响应中提取 JSON
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
            aiResponse.match(/\{[\s\S]*\}/)

        if (!jsonMatch) {
            console.error('无法从 AI 响应中提取 JSON')
            return null
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0]
        const data = JSON.parse(jsonStr)

        // 递归处理每个节点，分割过长的文本
        return processNode(data)
    } catch (error) {
        console.error('解析 AI 脑图数据失败:', error)
        return null
    }
}

/**
 * 递归处理节点，应用文本分割规则
 */
function processNode(node: any): MindMapNode {
    const { nodeText, note } = splitTextForNode(node.data?.text || '')

    const processedNode: MindMapNode = {
        data: {
            text: nodeText,
            expand: true,
            isActive: false
        }
    }

    // 如果有注释，添加到 data 中
    if (note) {
        processedNode.data.note = note
    }

    // 如果原节点已有注释，合并
    if (node.data?.note) {
        processedNode.data.note = note
            ? `${note}\n\n${node.data.note}`
            : node.data.note
    }

    // 递归处理子节点
    if (node.children && Array.isArray(node.children)) {
        processedNode.children = node.children.map(processNode)
    }

    return processedNode
}

/**
 * 创建简单的思维导图结构
 * 用于当 AI 返回纯文本时的回退方案
 */
export function createSimpleMindMap(text: string): MindMapNode {
    const { nodeText, note } = splitTextForNode(text)

    return {
        data: {
            text: nodeText || 'AI 回复',
            note: note || text.substring(0, 500), // 限制注释长度
            expand: true,
            isActive: false
        }
    }
}
