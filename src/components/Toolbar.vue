<template>
  <div class="toolbar">
    <!-- Logo -->
    <div class="toolbar-logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <line x1="12" y1="3" x2="12" y2="6"/>
        <line x1="12" y1="18" x2="12" y2="21"/>
        <line x1="3" y1="12" x2="6" y2="12"/>
        <line x1="18" y1="12" x2="21" y2="12"/>
        <line x1="5.64" y1="5.64" x2="7.76" y2="7.76"/>
        <line x1="16.24" y1="16.24" x2="18.36" y2="18.36"/>
        <line x1="5.64" y1="18.36" x2="7.76" y2="16.24"/>
        <line x1="16.24" y1="7.76" x2="18.36" y2="5.64"/>
      </svg>
      <span>AI 思维导图</span>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 新对话和历史记录 -->
    <div class="toolbar-group">
      <el-tooltip content="新对话" placement="bottom">
        <el-button @click="createNewChat" :icon="Plus" circle />
      </el-tooltip>
      <el-tooltip content="历史对话" placement="bottom">
        <el-button @click="toggleHistory" :icon="Clock" circle />
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 撤销/重做 -->
    <div class="toolbar-group">
      <el-tooltip content="撤销 (Ctrl+Z)" placement="bottom">
        <el-button @click="undo" :icon="RefreshLeft" circle />
      </el-tooltip>
      <el-tooltip content="重做 (Ctrl+Y)" placement="bottom">
        <el-button @click="redo" :icon="RefreshRight" circle />
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 节点操作 -->
    <div class="toolbar-group">
      <el-tooltip content="添加子节点 (Tab)" placement="bottom">
        <el-button @click="addChild" :icon="Plus">子节点</el-button>
      </el-tooltip>
      <el-tooltip content="添加同级节点 (Enter)" placement="bottom">
        <el-button @click="addSibling" :icon="CirclePlus">同级</el-button>
      </el-tooltip>
      <el-tooltip content="删除节点 (Delete)" placement="bottom">
        <el-button @click="removeNode" :icon="Delete">删除</el-button>
      </el-tooltip>
      <el-tooltip content="添加/编辑注释" placement="bottom">
        <el-button @click="openNoteDialog" :icon="ChatLineSquare">注释</el-button>
      </el-tooltip>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 缩放显示 -->
    <div class="zoom-controls">
      <span class="zoom-text">{{ Math.round(zoom * 100) }}%</span>
    </div>

    <div class="toolbar-divider"></div>

    <!-- 导出菜单 -->
    <el-dropdown trigger="click" @command="handleExport" popper-class="export-dropdown">
      <el-button type="primary">
        <el-icon><Download /></el-icon>
        导出
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="json">
            <el-icon><Document /></el-icon>
            导出为 JSON
          </el-dropdown-item>
          <el-dropdown-item command="aim">
            <el-icon><Files /></el-icon>
            导出为 AIM 文件
          </el-dropdown-item>
          <el-dropdown-item command="xml">
            <el-icon><Files /></el-icon>
            导出为 XML
          </el-dropdown-item>
          <el-dropdown-item command="markdown">
            <el-icon><Document /></el-icon>
            导出为 Markdown
          </el-dropdown-item>
          <el-dropdown-item command="png" divided>
            <el-icon><Picture /></el-icon>
            导出为图片 (PNG)
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    
    <el-dropdown trigger="click" @command="handleImportCommand">
      <el-button>
        <el-icon><Upload /></el-icon>
        导入
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="aim">
            <el-icon><Files /></el-icon>
            导入 AIM/JSON 文件
          </el-dropdown-item>
          <el-dropdown-item command="markdown">
            <el-icon><Document /></el-icon>
            导入 Markdown 文件
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <input 
      ref="fileInputRef" 
      type="file" 
      accept=".aim,.json,.md" 
      @change="handleImport" 
      style="display: none"
    />

    <!-- 注释编辑对话框 -->
    <el-dialog 
      v-model="noteDialogVisible" 
      title="编辑节点注释" 
      width="500px"
    >
      <el-input
        v-model="noteText"
        type="textarea"
        :rows="6"
        placeholder="请输入注释内容..."
        maxlength="500"
        show-word-limit
      />
      <template #footer>
        <el-button @click="noteDialogVisible = false">取消</el-button>
        <el-button @click="clearNote" type="warning">清除注释</el-button>
        <el-button @click="saveNote" type="primary">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'
import { 
  Plus, CirclePlus, Delete, 
  Download, ArrowDown, Upload,
  Document, Files, Picture, ChatLineSquare,
  Clock, RefreshLeft, RefreshRight
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { exportToJson, exportToXml, exportToMarkdown, parseMarkdown } from '@/utils/export'
import type MindMap from 'simple-mind-map'

const props = defineProps<{
  mindMap: MindMap | null
}>()

const emit = defineEmits<{
  (e: 'toggleHistory'): void
  (e: 'createNewChat'): void
}>()

// 新建会话
function createNewChat() {
  emit('createNewChat')
}

const zoom = ref(1)
const fileInputRef = ref<HTMLInputElement>()
const noteDialogVisible = ref(false)
const noteText = ref('')
const currentNode = ref<any>(null)
const importType = ref<'aim' | 'markdown'>('aim')

// 监听思维导图缩放变化
let scaleListenerAttached = false

function attachScaleListener() {
  if (props.mindMap && !scaleListenerAttached) {
    props.mindMap.on('scale', onScaleChange)
    // @ts-ignore - view.scale exists at runtime
    zoom.value = props.mindMap.view.scale
    scaleListenerAttached = true
  }
}

function detachScaleListener() {
  if (props.mindMap && scaleListenerAttached) {
    props.mindMap.off('scale', onScaleChange)
    scaleListenerAttached = false
  }
}

function onScaleChange() {
  if (props.mindMap) {
    // @ts-ignore - view.scale exists at runtime
    zoom.value = props.mindMap.view.scale
  }
}

// 监听 mindMap 变化
watch(() => props.mindMap, (newMindMap) => {
  if (newMindMap) {
    attachScaleListener()
  } else {
    detachScaleListener()
  }
}, { immediate: true })

onUnmounted(() => {
  detachScaleListener()
})

// 节点操作
function addChild() {
  if (!props.mindMap) return
  const activeNodes = props.mindMap.renderer.activeNodeList
  if (activeNodes.length === 0) {
    ElMessage.warning('请先选择一个节点')
    return
  }
  props.mindMap.execCommand('INSERT_CHILD_NODE')
}

function addSibling() {
  if (!props.mindMap) return
  const activeNodes = props.mindMap.renderer.activeNodeList
  if (activeNodes.length === 0) {
    ElMessage.warning('请先选择一个节点')
    return
  }
  props.mindMap.execCommand('INSERT_NODE')
}

function removeNode() {
  if (!props.mindMap) return
  const activeNodes = props.mindMap.renderer.activeNodeList
  if (activeNodes.length === 0) {
    ElMessage.warning('请先选择一个节点')
    return
  }
  props.mindMap.execCommand('REMOVE_NODE')
  ElMessage.success('节点已删除')
}

// 注释功能
function openNoteDialog() {
  if (!props.mindMap) return
  const activeNodes = props.mindMap.renderer.activeNodeList
  if (activeNodes.length === 0) {
    ElMessage.warning('请先选择一个节点')
    return
  }
  currentNode.value = activeNodes[0]
  noteText.value = currentNode.value.getData('note') || ''
  noteDialogVisible.value = true
}

function saveNote() {
  if (!currentNode.value) return
  props.mindMap?.execCommand('SET_NODE_NOTE', currentNode.value, noteText.value)
  noteDialogVisible.value = false
  ElMessage.success('注释已保存')
}

function clearNote() {
  if (!currentNode.value) return
  props.mindMap?.execCommand('SET_NODE_NOTE', currentNode.value, '')
  noteText.value = ''
  noteDialogVisible.value = false
  ElMessage.success('注释已清除')
}

// 从外部打开注释对话框（用于右键菜单）
function openNoteDialogWithNode(node: any) {
  currentNode.value = node
  noteText.value = node.getData('note') || ''
  noteDialogVisible.value = true
}

// 导入功能
function handleImportCommand(command: string) {
  importType.value = command as 'aim' | 'markdown'
  fileInputRef.value?.click()
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !props.mindMap) return

  try {
    const text = await file.text()
    
    if (importType.value === 'markdown') {
      // 导入 Markdown 文件
      const data = parseMarkdown(text)
      if (data) {
        props.mindMap.setData(data)
        ElMessage.success('Markdown 文件导入成功')
      } else {
        ElMessage.error('Markdown 文件解析失败')
      }
    } else {
      // 导入 AIM/JSON 文件
      const data = JSON.parse(text)
      props.mindMap.setData(data)
      ElMessage.success('文件导入成功')
    }
    
    // 清空文件输入
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
  } catch (error) {
    ElMessage.error('导入失败，文件格式错误')
    console.error('Import error:', error)
  }
}

// 导出处理
async function handleExport(command: string) {
  if (!props.mindMap) return

  const data = props.mindMap.getData(false)
  // 使用中心主题的文本作为文件名，去除特殊字符
  const rootText = data?.data?.text || '思维导图'
  const fileName = rootText.replace(/[\\/:*?"<>|]/g, '_').trim()

  try {
    switch (command) {
      case 'json':
        exportToJson(data, fileName)
        ElMessage.success('JSON 文件已导出')
        break
      case 'aim':
        // AIM 格式与 JSON 相同，只是扩展名不同
        const aimBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const aimUrl = URL.createObjectURL(aimBlob)
        const aimLink = document.createElement('a')
        aimLink.href = aimUrl
        aimLink.download = `${fileName}.aim`
        aimLink.click()
        URL.revokeObjectURL(aimUrl)
        ElMessage.success('AIM 文件已导出')
        break
      case 'xml':
        exportToXml(data, fileName)
        ElMessage.success('XML 文件已导出')
        break
      case 'markdown':
        exportToMarkdown(data, fileName)
        ElMessage.success('Markdown 文件已导出')
        break
      case 'png':
        // 直接使用 simple-mind-map 的导出功能，第二个参数 true 表示直接下载
        props.mindMap.export('png', true, fileName)
        ElMessage.success('图片已导出')
        break
    }
  } catch (error) {
    ElMessage.error('导出失败，请重试')
    console.error('Export error:', error)
  }
}

// 历史记录
function toggleHistory() {
  emit('toggleHistory')
}

// 撤销/重做
function undo() {
  if (!props.mindMap) return
  props.mindMap.execCommand('BACK')
}

function redo() {
  if (!props.mindMap) return
  props.mindMap.execCommand('FORWARD')
}

// 暴露方法给父组件
defineExpose({
  openNoteDialogWithNode
})
</script>
