import type { Conversation } from '@/types'

const STORAGE_KEY = 'ai_mind_conversations'
const ACTIVE_CONVERSATION_KEY = 'ai_mind_active_conversation_id'

export const storageService = {
    // 加载所有会话列表
    getConversations(): Conversation[] {
        const data = localStorage.getItem(STORAGE_KEY)
        if (!data) return []
        try {
            const conversations = JSON.parse(data) as Conversation[]
            // 按时间倒序排列
            return conversations.sort((a, b) => b.timestamp - a.timestamp)
        } catch (e) {
            console.error('Failed to parse conversations', e)
            return []
        }
    },

    // 保存会话
    saveConversation(conversation: Conversation): void {
        const list = this.getConversations()
        const index = list.findIndex(c => c.id === conversation.id)

        // 更新时间戳
        conversation.timestamp = Date.now()

        // 自动更新标题
        // 优先使用思维导图的根节点文字作为标题
        if (conversation.mindMapData && conversation.mindMapData.data && conversation.mindMapData.data.text) {
            conversation.title = conversation.mindMapData.data.text
        }
        // 如果没有脑图，尝试使用第一条用户消息
        else if ((!conversation.title || conversation.title === '新对话') && conversation.messages.length > 0) {
            // 取第一条 User 消息的前15个字符
            const firstUserMsg = conversation.messages.find(m => m.role === 'user')
            if (firstUserMsg) {
                conversation.title = firstUserMsg.content.slice(0, 15)
            }
        }

        if (index > -1) {
            list[index] = conversation
        } else {
            list.unshift(conversation)
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    },

    // 获取单个会话
    getConversation(id: string): Conversation | undefined {
        const list = this.getConversations()
        return list.find(c => c.id === id)
    },

    // 删除会话
    deleteConversation(id: string): void {
        const list = this.getConversations().filter(c => c.id !== id)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list))

        // 如果删除的是当前激活的会话，清除激活ID
        if (this.getActiveId() === id) {
            localStorage.removeItem(ACTIVE_CONVERSATION_KEY)
        }
    },

    // 创建新会话
    createConversation(): Conversation {
        const newConv: Conversation = {
            id: crypto.randomUUID(),
            title: '新对话',
            timestamp: Date.now(),
            messages: [],
            mindMapData: null
        }
        return newConv
    },

    // 获取/设置当前激活的会话 ID
    getActiveId(): string | null {
        return localStorage.getItem(ACTIVE_CONVERSATION_KEY)
    },

    setActiveId(id: string): void {
        localStorage.setItem(ACTIVE_CONVERSATION_KEY, id)
    }
}
