// 思维导图节点数据类型
export interface MindMapNode {
    data: {
        text: string
        image?: string
        hyperlink?: string
        note?: string
        generalization?: {
            text: string
        }[]
    }
    children?: MindMapNode[]
}

// 导出格式类型
export type ExportFormat = 'json' | 'xml' | 'png' | 'svg'

// 思维导图配置
export interface MindMapConfig {
    theme: string
    layout: string
    scaleRatio: number
}

// 导出选项
export interface ExportOptions {
    fileName?: string
    padding?: number
}
