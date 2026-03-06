import type { MindMapNode } from '@/types'

/**
 * 将思维导图数据导出为 JSON 文件
 */
export function exportToJson(data: MindMapNode, fileName: string = 'mindmap') {
    const jsonStr = JSON.stringify(data, null, 2)
    downloadFile(jsonStr, `${fileName}.json`, 'application/json')
}

/**
 * 将思维导图数据导出为 Markdown 文件
 */
export function exportToMarkdown(data: MindMapNode, fileName: string = 'mindmap') {
    const mdStr = nodeToMarkdown(data)
    downloadFile(mdStr, `${fileName}.md`, 'text/markdown')
}

/**
 * 递归将节点转换为 Markdown 格式
 */
function nodeToMarkdown(node: MindMapNode, level: number = 0): string {
    const indent = '  '.repeat(Math.max(0, level - 2))
    let md = ''

    // 根节点使用 # 标题，一级节点使用 ## 标题，其他使用 - 列表
    if (level === 0) {
        md += `# ${node.data.text || '主题'}\n`
    } else if (level === 1) {
        md += `\n## ${node.data.text || '主题'}\n`
    } else {
        md += `${indent}- ${node.data.text || ''}\n`
    }

    // 处理子节点
    if (node.children && node.children.length > 0) {
        for (const child of node.children) {
            md += nodeToMarkdown(child, level + 1)
        }
    }

    return md
}

/**
 * 解析 Markdown 字符串为思维导图数据
 */
export function parseMarkdown(mdStr: string): MindMapNode | null {
    const lines = mdStr.split('\n').filter(line => line.trim())
    if (lines.length === 0) return null

    // 创建根节点
    const root: MindMapNode = {
        data: { text: '思维导图' },
        children: []
    }

    let currentLevel1: MindMapNode | null = null
    const levelStack: MindMapNode[] = []

    for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue

        // 解析标题 ## 标题
        const headingMatch = trimmedLine.match(/^(#{2,6})\s+(.+)$/)
        if (headingMatch) {
            const level = headingMatch[1].length // 2-6
            const text = headingMatch[2].trim()

            const newNode: MindMapNode = {
                data: { text },
                children: []
            }

            if (level === 2) {
                // 二级标题作为一级子节点
                root.children!.push(newNode)
                currentLevel1 = newNode
                levelStack.length = 0
                levelStack.push(newNode)
            } else {
                // 更深级别的标题作为列表项处理
                if (currentLevel1) {
                    currentLevel1.children!.push(newNode)
                } else {
                    root.children!.push(newNode)
                }
            }
            continue
        }

        // 解析列表项 - 内容 或 - 内容
        const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/)
        if (listMatch) {
            const indent = listMatch[1].length
            const text = listMatch[2].trim()
            const level = Math.floor(indent / 2) + 1 // 根据缩进计算层级

            const newNode: MindMapNode = {
                data: { text },
                children: []
            }

            // 找到正确的父节点
            while (levelStack.length > level) {
                levelStack.pop()
            }

            if (levelStack.length === 0) {
                // 作为一级子节点
                if (!currentLevel1) {
                    root.children!.push(newNode)
                    currentLevel1 = newNode
                } else {
                    currentLevel1.children!.push(newNode)
                }
                levelStack.push(newNode)
            } else {
                // 添加到当前栈顶节点的子节点
                const parent = levelStack[levelStack.length - 1]
                parent.children!.push(newNode)
                levelStack.push(newNode)
            }
        }
    }

    // 如果只有一个一级子节点，将其内容提升为根节点
    if (root.children!.length === 1 && root.data.text === '思维导图') {
        const singleChild = root.children![0]
        return {
            data: { text: singleChild.data.text },
            children: singleChild.children
        }
    }

    return root
}

/**
 * 将思维导图数据导出为 XML 文件
 */
export function exportToXml(data: MindMapNode, fileName: string = 'mindmap') {
    const xmlStr = nodeToXml(data)
    const fullXml = `<?xml version="1.0" encoding="UTF-8"?>\n<mindmap>\n${xmlStr}</mindmap>`
    downloadFile(fullXml, `${fileName}.xml`, 'application/xml')
}

/**
 * 递归将节点转换为 XML 格式
 */
function nodeToXml(node: MindMapNode, indent: string = '  '): string {
    const text = escapeXml(node.data.text || '')
    let xml = `${indent}<node text="${text}">\n`

    if (node.data.hyperlink) {
        xml += `${indent}  <hyperlink>${escapeXml(node.data.hyperlink)}</hyperlink>\n`
    }

    if (node.data.note) {
        xml += `${indent}  <note>${escapeXml(node.data.note)}</note>\n`
    }

    if (node.children && node.children.length > 0) {
        xml += `${indent}  <children>\n`
        for (const child of node.children) {
            xml += nodeToXml(child, indent + '    ')
        }
        xml += `${indent}  </children>\n`
    }

    xml += `${indent}</node>\n`
    return xml
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * 下载文件
 */
function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * 下载 Base64 图片
 */
export function downloadImage(base64Data: string, fileName: string = 'mindmap.png') {
    const link = document.createElement('a')
    link.href = base64Data
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
