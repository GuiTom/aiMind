import type { MindMapNode } from '@/types'

/**
 * 将思维导图数据导出为 JSON 文件
 */
export function exportToJson(data: MindMapNode, fileName: string = 'mindmap') {
    const jsonStr = JSON.stringify(data, null, 2)
    downloadFile(jsonStr, `${fileName}.json`, 'application/json')
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
