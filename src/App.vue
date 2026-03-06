<template>
  <div class="app-container">
    <!-- 工具栏 -->
    <Toolbar ref="toolbarRef" :mindMap="mindMap" @toggleHistory="historyVisible = true" @createNewChat="createNewChat" />
    
    <!-- 主内容区：脑图、聊天框、快捷键提示 -->
    <div class="main-content">
      <!-- 脑图区域 -->
      <div class="mind-map-section">
        <MindMap 
          ref="mindMapRef"
          v-model="mapData" 
          @mindMapReady="onMindMapReady"
          @openNote="onOpenNote"
          @askAboutNode="onAskAboutNode"
        />
      </div>
      
      <!-- AI 聊天面板 -->
      <ChatPanel 
        :hasExistingMap="hasExistingMap"
        :targetNode="targetNode"
        @updateMindMap="onUpdateMindMap"
        @expandNode="onExpandNode"
        @clearTargetNode="onClearTargetNode"
        @messagesUpdated="onMessagesUpdated"
      />
      
      <!-- 快捷键提示 -->
      <div class="tips-section">
        <span>💡 双击节点编辑文字</span>
        <span>|</span>
        <span><kbd>Tab</kbd> 添加子节点</span>
        <span>|</span>
        <span><kbd>Enter</kbd> 添加同级</span>
        <span>|</span>
        <span><kbd>Delete</kbd> 删除节点</span>
      </div>
    </div>
    <!-- 历史记录侧边栏 -->
    <el-drawer
      v-model="historyVisible"
      title="对话历史"
      direction="ltr"
      size="300px"
    >
      <div class="history-container">
        <el-button type="primary" class="new-chat-btn" @click="createNewChat">
          <el-icon><Plus /></el-icon> 新对话
        </el-button>
        
        <div class="history-list">
          <div 
            v-for="item in conversations" 
            :key="item.id"
            class="history-item"
            :class="{ active: item.id === currentConversationId }"
            @click="switchChat(item.id)"
          >
            <div class="history-info">
              <div class="history-title">{{ item.title || '新对话' }}</div>
              <div class="history-time">{{ new Date(item.timestamp).toLocaleString() }}</div>
            </div>
            <el-button 
              class="delete-btn" 
              type="danger" 
              link 
              @click.stop="deleteChat(item.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, watch } from 'vue'
import Toolbar from './components/Toolbar.vue'
import MindMap from './components/MindMap.vue'
import ChatPanel from './components/ChatPanel.vue'
import type MindMapInstance from 'simple-mind-map'
import type { MindMapNode, Conversation } from '@/types'
import { storageService } from '@/services/storage'
import { Plus, Delete } from '@element-plus/icons-vue'

const mapData = ref<MindMapNode>()
const mindMap = shallowRef<MindMapInstance | null>(null)
const toolbarRef = ref<InstanceType<typeof Toolbar>>()
const mindMapRef = ref<InstanceType<typeof MindMap>>()
const chatPanelRef = ref<InstanceType<typeof ChatPanel>>()
const targetNode = ref<{ uid: string, text: string } | null>(null)

// 历史会话状态
const historyVisible = ref(false)
const conversations = ref<Conversation[]>([])
const currentConversationId = ref<string>('')
const isRestoring = ref(false) // 标记正在恢复数据，避免触发自动保存

onMounted(() => {
  loadHistory()
  // 加载当前会话或新建
  const activeId = storageService.getActiveId()
  if (activeId && storageService.getConversation(activeId)) {
    switchChat(activeId)
  } else {
    createNewChat()
  }
})

// 加载历史列表
function loadHistory() {
  conversations.value = storageService.getConversations()
}

// 切换会话
function switchChat(id: string) {
  const conv = storageService.getConversation(id)
  if (!conv) return

  isRestoring.value = true
  currentConversationId.value = id
  storageService.setActiveId(id)
  
  // 恢复数据
  mapData.value = conv.mindMapData || undefined // undefined 会触发 MindMap 重置为 default
  
  // 恢复聊天记录
  if (chatPanelRef.value) {
    (chatPanelRef.value as any).setMessages(conv.messages || [])
  }
  
  setTimeout(() => {
    isRestoring.value = false
  }, 500)
}

// 新建会话
function createNewChat() {
  const newConv = storageService.createConversation()
  storageService.saveConversation(newConv)
  loadHistory()
  switchChat(newConv.id)
  historyVisible.value = false // 移动端可能需要关闭，这里可选
}

// 删除会话
function deleteChat(id: string) {
  storageService.deleteConversation(id)
  loadHistory()
  if (currentConversationId.value === id) {
    // 如果删除了当前会话，切到第一个或新建
    if (conversations.value.length > 0) {
      switchChat(conversations.value[0].id)
    } else {
      createNewChat()
    }
  }
}

// 保存当前会话状态
function saveCurrentSession() {
  if (isRestoring.value || !currentConversationId.value) return
  
  const conv = storageService.getConversation(currentConversationId.value)
  if (!conv) return

  // 更新内容
  if (chatPanelRef.value) {
    conv.messages = (chatPanelRef.value as any).getMessages()
  }
  conv.mindMapData = mapData.value || null
  
  storageService.saveConversation(conv)
  loadHistory() // 刷新列表（因为时间戳和排序可能变了）
}

// 防抖保存
let saveTimer: any = null
function debounceSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveCurrentSession, 500)
}

// 监听脑图数据变化 -> 自动保存
watch(mapData, () => {
  debounceSave()
}, { deep: true })

// 监听聊天消息变化 -> 自动保存
function onMessagesUpdated() {
  debounceSave()
}

// 判断是否已有脑图数据
const hasExistingMap = computed(() => {
  return !!mapData.value && !!mapData.value.data?.text
})

function onMindMapReady(instance: MindMapInstance) {
  mindMap.value = instance
}

function onOpenNote(node: any) {
  // 调用 Toolbar 的注释功能
  if (toolbarRef.value) {
    // @ts-ignore - 访问 Toolbar 内部方法
    toolbarRef.value.openNoteDialogWithNode(node)
  }
}

// AI 更新脑图
function onUpdateMindMap(data: MindMapNode) {
  mapData.value = data
}

// 针对节点提问
function onAskAboutNode(info: { uid: string, text: string }) {
  targetNode.value = info
}

// 扩展节点子节点
function onExpandNode(payload: { nodeUid: string, children: MindMapNode[] }) {
  if (mindMapRef.value) {
    mindMapRef.value.expandNodeChildren(payload.nodeUid, payload.children)
  }
}

// 清除目标节点
function onClearTargetNode() {
  targetNode.value = null
}
</script>

<style>
/* 全局样式 */
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 主内容区 - 包含脑图、聊天框、提示三个同级元素 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* 脑图区域 - 占据剩余空间 */
.mind-map-section {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

/* 快捷键提示 - 固定高度 */
.tips-section {
  flex-shrink: 0;
  padding: 8px 16px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #666;
  height: 36px;
}

.tips-section kbd {
  font-family: monospace;
  font-size: 12px;
}

/* 历史记录侧边栏样式 */
.history-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.new-chat-btn {
  margin-bottom: 20px;
  width: 100%;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  transition: background 0.2s;
}

.history-item:hover {
  background: #f5f5f5;
}

.history-item.active {
  background: #e6f7ff;
  border-left: 3px solid #1890ff;
}

.history-info {
  flex: 1;
  overflow: hidden;
}

.history-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  font-size: 12px;
  color: #999;
}

</style>

