<template>
  <div class="chat-panel" :class="{ collapsed: isCollapsed }">
    <!-- 折叠/展开按钮 -->
    <div class="chat-header" @click="toggleCollapse">
      <div class="header-left">
        <span class="header-icon">🤖</span>
        <span class="header-title">AI 助手</span>
        <span v-if="!apiKeyConfigured" class="warning-badge">未配置</span>
      </div>
      <button class="collapse-btn">
        {{ isCollapsed ? '▲' : '▼' }}
      </button>
    </div>

    <!-- 聊天内容 -->
    <div v-show="!isCollapsed" class="chat-content">
      <!-- API Key 配置区域 -->
      <div v-if="!apiKeyConfigured" class="api-key-setup">
        <p class="setup-hint">请配置 OpenRouter API Key 以使用 AI 功能</p>
        <div class="setup-input-group">
          <input
            v-model="apiKeyInput"
            type="password"
            placeholder="输入您的 API Key"
            class="api-key-input"
            @keyup.enter="saveApiKey"
          />
          <button @click="saveApiKey" class="save-btn">保存</button>
        </div>
        <a
          href="https://openrouter.ai/"
          target="_blank"
          class="get-key-link"
        >
          如何获取 API Key？
        </a>
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages-container" ref="messagesContainer">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message"
          :class="'message-' + msg.role"
        >
          <div class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(msg.content)"></div>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="isLoading" class="message message-assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div v-if="apiKeyConfigured" class="chat-input-area">
        <!-- 目标节点指示器 -->
        <div v-if="targetNode" class="target-node-indicator">
          <span class="target-node-tag">
            📌 针对节点「{{ targetNode.text }}」提问
          </span>
          <button class="target-node-cancel" @click="clearTarget">×</button>
        </div>
        <div class="input-row">
          <textarea
            ref="chatInputRef"
            v-model="userInput"
            :placeholder="targetNode ? `针对「${targetNode.text}」提问，AI 将扩展子节点...` : (hasExistingMap ? '右键点击导图的任意节点，可针对选中节点提问' : '输入问题 AI将生成思维导图')"
            class="chat-input"
            rows="2"
            @keydown.enter.prevent="handleSend"
          ></textarea>
          <button
            @click="handleSend"
            :disabled="!userInput.trim() || isLoading"
            class="send-btn"
          >
            {{ isLoading ? '生成中...' : '发送' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createAIService, type ChatMessage } from '@/services/aiService'
import { parseAIMindMap, createSimpleMindMap } from '@/utils/mindMapGenerator'
import { detectAndParseMindMap } from '@/utils/xmlMindMapParser'
import type { MindMapNode } from '@/types'

const props = defineProps<{
  hasExistingMap: boolean
  targetNode: { uid: string, text: string } | null
  isMapEdited: boolean
}>()

const emit = defineEmits<{
  (e: 'updateMindMap', data: MindMapNode): void
  (e: 'expandNode', payload: { nodeUid: string, children: MindMapNode[] }): void
  (e: 'clearTargetNode'): void
  (e: 'messagesUpdated', messages: ChatMessage[]): void
}>()

// 状态
const isCollapsed = ref(true)
const apiKeyInput = ref('')
const apiKeyConfigured = ref(false)
const userInput = ref('')
const isLoading = ref(false)
const messages = ref<ChatMessage[]>([])
const messagesContainer = ref<HTMLElement>()
const chatInputRef = ref<HTMLTextAreaElement>()

// 检查 API Key 配置
const storedApiKey = localStorage.getItem('openrouter_api_key')
if (storedApiKey) {
  apiKeyConfigured.value = true
}

// 折叠/展开
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// 清除目标节点
function clearTarget() {
  emit('clearTargetNode')
}

// 监听 targetNode 变化 → 自动展开面板并聚焦输入
watch(() => props.targetNode, (newTarget) => {
  if (newTarget) {
    isCollapsed.value = false
    nextTick(() => {
      chatInputRef.value?.focus()
    })
  }
})

// 保存 API Key
function saveApiKey() {
  const key = apiKeyInput.value.trim()
  if (!key) {
    ElMessage.warning('请输入 API Key')
    return
  }

  localStorage.setItem('openrouter_api_key', key)
  apiKeyConfigured.value = true
  apiKeyInput.value = ''
  ElMessage.success('API Key 已保存')
}

// 格式化消息（转换换行等，正确处理 XML 标签）
function formatMessage(content: string): string {
  let result = content
  const codeBlocks: string[] = []

  // 1. 提取代码块，用占位符替代
  result = result.replace(/```(\w*)\s*([\s\S]*?)```/g, (_match, _lang, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const index = codeBlocks.length
    codeBlocks.push(`<pre style="background:#f5f5f5;padding:8px;border-radius:4px;overflow-x:auto;font-size:13px;"><code>${escaped}</code></pre>`)
    return `__CODE_BLOCK_${index}__`
  })

  // 2. 对普通内容中的 < > 做转义，防止 XML 标签被浏览器吞掉
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 3. 换行和链接处理
  result = result
    .replace(/\n/g, '<br>')
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')

  // 4. 还原代码块
  codeBlocks.forEach((block, i) => {
    result = result.replace(`__CODE_BLOCK_${i}__`, block)
  })

  return result
}

// 滚动到底部
async function scrollToBottom() {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 发送消息
async function handleSend() {
  const input = userInput.value.trim()
  if (!input || isLoading.value) return

  // 保存当前目标节点（发送后可能被清除）
  const currentTarget = props.targetNode

  // 添加用户消息（显示原始消息，含目标节点标记）
  const displayContent = currentTarget
    ? `@「${currentTarget.text}」 ${input}`
    : input
  messages.value.push({
    role: 'user',
    content: displayContent
  })
  emit('messagesUpdated', messages.value)
  userInput.value = ''
  await scrollToBottom()

  // 开始加载
  isLoading.value = true

  try {
    const apiKey = localStorage.getItem('openrouter_api_key')
    if (!apiKey) {
      throw new Error('API Key 未配置')
    }

    const aiService = createAIService(apiKey)
    if (!aiService) {
      throw new Error('无法创建 AI 服务')
    }

    let aiResponse = ''

    if (currentTarget) {
      // ========== 针对节点提问模式 ==========
      const nodeExpandPrompt = `你正在帮助用户扩展思维导图中的节点「${currentTarget.text}」。
用户的问题是：${input}

请根据问题，为节点「${currentTarget.text}」生成子节点内容。
要求：
1. 返回 FreeMind XML 格式的思维导图
2. 根节点的 TEXT 为「${currentTarget.text}」，其下的 node 就是要添加的子节点
3. 每个节点的 TEXT 控制在15个汉字或10个英文单词以内
4. 可以有多级子节点
5. 只返回 XML，不要额外解释

返回格式示例：
\`\`\`xml
<map>
  <node TEXT="${currentTarget.text}">
    <node TEXT="子主题1">
      <node TEXT="细节A"/>
      <node TEXT="细节B"/>
    </node>
    <node TEXT="子主题2"/>
    <node TEXT="子主题3"/>
  </node>
</map>
\`\`\``

      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: '你是一个思维导图扩展助手。用户会针对思维导图中的某个节点提问，你需要生成该节点的子节点内容，以 FreeMind XML 格式返回。'
        },
        {
          role: 'user',
          content: nodeExpandPrompt
        }
      ]

      const response = await aiService.chat(chatMessages)
      aiResponse = response.content
      console.log('节点扩展 AI 回复:', aiResponse)

      // 解析 XML，提取子节点
      const xmlMindMap = detectAndParseMindMap(aiResponse)
      console.log('节点扩展解析结果:', xmlMindMap)

      if (xmlMindMap && xmlMindMap.children && xmlMindMap.children.length > 0) {
        // 成功解析出子节点，emit expandNode
        emit('expandNode', {
          nodeUid: currentTarget.uid,
          children: xmlMindMap.children
        })
        messages.value.push({
          role: 'assistant',
          content: `已为节点「${currentTarget.text}」扩展 ${xmlMindMap.children.length} 个子节点 ✓`
        })
        emit('messagesUpdated', messages.value)
        // 清除目标节点
        emit('clearTargetNode')
      } else {
        // 解析失败，显示原始回复
        messages.value.push({
          role: 'assistant',
          content: `未能解析子节点，AI 原始回复：\n\n${aiResponse}`
        })
        emit('messagesUpdated', messages.value)
      }
    } else if (!props.hasExistingMap && !props.isMapEdited) {
      // ========== 生成新思维导图模式（仅在未编辑默认脑图时）==========
      aiResponse = await aiService.generateMindMap(input)

      const mindMapData = parseAIMindMap(aiResponse)
      if (mindMapData) {
        emit('updateMindMap', mindMapData)
        messages.value.push({
          role: 'assistant',
          content: '已为您生成思维导图 ✓'
        })
        emit('messagesUpdated', messages.value)
      } else {
        const simpleMindMap = createSimpleMindMap(aiResponse)
        emit('updateMindMap', simpleMindMap)
        messages.value.push({
          role: 'assistant',
          content: aiResponse.substring(0, 500) + '...'
        })
        emit('messagesUpdated', messages.value)
      }
    } else if (props.isMapEdited) {
      // ========== 脑图已编辑模式 - 只在聊天框显示回复 ==========
      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: '你是一个专业的助手，简洁准确地回答用户问题。'
        },
        ...messages.value.slice(0, -1),
        {
          role: 'user',
          content: input
        }
      ]

      const response = await aiService.chat(chatMessages)
      aiResponse = response.content

      messages.value.push({
        role: 'assistant',
        content: aiResponse
      })
      emit('messagesUpdated', messages.value)
    } else {
      // ========== 普通对话模式 ==========
      const enhancedInput = input + '\n\n[如果回答有多个分支，请用XML格式。示例: ```xml\n<map><node TEXT="主题"><node TEXT="分支1"/></node></map>\n```]'

      const chatMessages: ChatMessage[] = [
        {
          role: 'system',
          content: '你是一个专业的助手，简洁准确地回答用户问题。当需要展示多个分支或层级结构时，优先使用XML格式的思维导图。'
        },
        ...messages.value.slice(0, -1),
        {
          role: 'user',
          content: enhancedInput
        }
      ]

      const response = await aiService.chat(chatMessages)
      aiResponse = response.content
      console.log('AI 回复内容:', aiResponse)

      const xmlMindMap = detectAndParseMindMap(aiResponse)
      console.log('XML 解析结果:', xmlMindMap)

      if (xmlMindMap) {
        console.log('触发脑图更新')
        emit('updateMindMap', xmlMindMap)
        messages.value.push({
          role: 'assistant',
          content: '已为您生成思维导图 ✓\n\n' + aiResponse
        })
        emit('messagesUpdated', messages.value)
      } else {
        messages.value.push({
          role: 'assistant',
          content: aiResponse
        })
        emit('messagesUpdated', messages.value)
      }
    }

    await scrollToBottom()
  } catch (error: any) {
    console.error('AI 请求失败:', error)
    ElMessage.error(error.message || 'AI 请求失败，请重试')

    messages.value = messages.value.filter(m => m.role !== 'assistant' || m.content !== '')
  } finally {
    isLoading.value = false
  }
}

// 监听消息变化，自动滚动
watch(messages, scrollToBottom, { deep: true })

// 暴露方法给父组件
defineExpose({
  setMessages: (msgs: ChatMessage[]) => {
    messages.value = msgs
    scrollToBottom()
  },
  getMessages: () => messages.value
})
</script>

<style scoped>
.chat-panel {
  position: relative;
  background: white;
  border-top: 1px solid #e0e0e0;
  border-bottom: 1px solid #e0e0e0;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.chat-panel.collapsed {
  height: 48px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 20px;
}

.header-title {
  font-weight: 600;
  color: #333;
}

.warning-badge {
  background: #ff4d4f;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.collapse-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.collapse-btn:hover {
  background: #e0e0e0;
}

.chat-content {
  display: flex;
  flex-direction: column;
  height: 200px;
}

.api-key-setup {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.setup-hint {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.setup-input-group {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 400px;
}

.api-key-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

.api-key-input:focus {
  outline: none;
  border-color: #1890ff;
}

.save-btn {
  padding: 8px 24px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.save-btn:hover {
  background: #40a9ff;
}

.get-key-link {
  color: #1890ff;
  font-size: 13px;
  text-decoration: none;
}

.get-key-link:hover {
  text-decoration: underline;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  gap: 12px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: #f0f0f0;
}

.message-user .message-avatar {
  background: #e6f7ff;
}

.message-assistant .message-avatar {
  background: #f6ffed;
}

.message-content {
  flex: 1;
  max-width: 80%;
}

.message-text {
  background: #f5f5f5;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
}

.message-user .message-text {
  background: #e6f7ff;
}

.message-assistant .message-text {
  background: #f6ffed;
}

.message-text :deep(a) {
  color: #1890ff;
  text-decoration: underline;
}

.loading-dots {
  display: flex;
  gap: 4px;
  padding: 10px 14px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1890ff;
  animation: bounce 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.chat-input-area {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
}

.target-node-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0faf0;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  padding: 6px 12px;
  animation: slideIn 0.2s ease;
}

.target-node-tag {
  font-size: 13px;
  color: #389e0d;
  font-weight: 500;
}

.target-node-cancel {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  border-radius: 4px;
  transition: all 0.2s;
}

.target-node-cancel:hover {
  background: #e0e0e0;
  color: #333;
}

.input-row {
  display: flex;
  gap: 12px;
}

.chat-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
}

.chat-input:focus {
  outline: none;
  border-color: #1890ff;
}

.send-btn {
  padding: 8px 24px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  align-self: flex-end;
}

.send-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.send-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}
</style>
