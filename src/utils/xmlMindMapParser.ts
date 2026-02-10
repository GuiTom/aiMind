/**
 * XML 脑图解析工具
 * 支持从 AI 回复中提取和解析 XML 格式的思维导图
 */

import type { MindMapNode } from '@/types'

/**
 * 从文本中提取 XML 内容
 */
export function extractXMLFromText(text: string): string | null {
    // 匹配 XML 代码块
    const xmlBlockRegex = /```xml\s*([\s\S]*?)```/i
    const match = text.match(xmlBlockRegex)
    if (match) {
        const content = match[1].trim()
        // 检查是否为空或只有空白字符
        if (!content || content.length === 0) {
            console.warn('XML 代码块为空')
            return null
        }
        return content
    }

    // 匹配原始 XML（以 <map 或 <?xml 开头）
    const xmlRegex = /<(?:\?xml|map)[^>]*>[\s\S]*<\/map>/i
    const xmlMatch = text.match(xmlRegex)
    if (xmlMatch) {
        return xmlMatch[0]
    }

    return null
}

/**
 * 检测文本中是否包含 XML 格式的脑图
 */
export function containsXMLMindMap(text: string): boolean {
    return extractXMLFromText(text) !== null
}

/**
 * 解析 XML 字符串为 DOM
 */
function parseXMLString(xmlString: string): Document | null {
    try {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

        // 检查是否有解析错误
        const parserError = xmlDoc.querySelector('parsererror')
        if (parserError) {
            console.error('XML 解析错误:', parserError.textContent)
            return null
        }

        return xmlDoc
    } catch (error) {
        console.error('XML 解析失败:', error)
        return null
    }
}

/**
 * 解析 FreeMind/XMind 格式的节点
 */
function parseXMLNode(element: Element): MindMapNode {
    const text = element.getAttribute('TEXT') || element.getAttribute('text') || '节点'

    // 解析子节点
    const children: MindMapNode[] = []
    const childNodes = element.querySelectorAll(':scope > node')

    childNodes.forEach(child => {
        children.push(parseXMLNode(child))
    })

    return {
        data: {
            text: text.length > 15 ? text.substring(0, 15) : text,
            note: text.length > 15 ? text : undefined
        },
        children: children.length > 0 ? children : undefined
    }
}

/**
 * 将 XML 格式的思维导图转换为 MindMapNode
 */
export function parseXMLMindMap(xmlString: string): MindMapNode | null {
    const xmlDoc = parseXMLString(xmlString)
    if (!xmlDoc) {
        return null
    }

    // 查找根节点
    const rootNode = xmlDoc.querySelector('map > node') || xmlDoc.querySelector('node')
    if (!rootNode) {
        console.error('未找到根节点')
        return null
    }

    return parseXMLNode(rootNode)
}

/**
 * 从 AI 回复中检测并解析思维导图
 * @param response AI 的回复内容
 * @returns 解析后的思维导图数据，如果没有检测到则返回 null
 */
export function detectAndParseMindMap(response: string): MindMapNode | null {
    // 先尝试提取 XML
    const xmlContent = extractXMLFromText(response)
    if (xmlContent) {
        const mindMap = parseXMLMindMap(xmlContent)
        if (mindMap) {
            console.log('成功从 XML 解析思维导图')
            return mindMap
        }
    }

    return null
}
