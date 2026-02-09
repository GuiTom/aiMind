/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module 'simple-mind-map' {
    export default class MindMap {
        constructor(options: any)
        on(event: string, callback: (...args: any[]) => void): void
        off(event: string, callback: (...args: any[]) => void): void
        execCommand(command: string, ...args: any[]): void
        getData(withConfig?: boolean): any
        setData(data: any): void
        export(type: string, isDownload?: boolean, fileName?: string): Promise<any>
        destroy(): void
        view: {
            fit(): void
        }
        renderer: {
            activeNodeList: any[]
        }
    }
}

declare module 'simple-mind-map/src/plugins/Export.js' {
    const Export: any
    export default Export
}
