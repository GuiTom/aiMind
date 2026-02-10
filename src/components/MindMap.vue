<template>
  <div class="mind-map-container" ref="containerRef">
    <div id="mindMapContainer"></div>
    
    <!-- 注释浮层 -->
    <div 
      v-if="notePopupVisible" 
      class="note-popup"
      :style="{
        left: notePopupPosition.x + 'px',
        top: notePopupPosition.y + 'px'
      }"
    >
      <div class="note-popup-header">
        <span class="note-popup-title">节点注释</span>
        <button class="note-popup-close" @click="closeNotePopup">×</button>
      </div>
      <div class="note-popup-content" v-html="notePopupContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import MindMap from 'simple-mind-map'
import Export from 'simple-mind-map/src/plugins/Export.js'
import type { MindMapNode } from '@/types'

// 注册导出插件
// @ts-ignore - usePlugin 方法在运行时存在，但类型定义中缺失
MindMap.usePlugin(Export)



const props = defineProps<{
  modelValue?: MindMapNode
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: MindMapNode): void
  (e: 'mindMapReady', mindMap: MindMap): void
  (e: 'openNote', node: any): void
  (e: 'askAboutNode', info: { uid: string, text: string }): void
}>()

const containerRef = ref<HTMLElement>()
let mindMap: MindMap | null = null
let isSettingData = false

// 注释浮层状态
const notePopupVisible = ref(false)
const notePopupContent = ref('')
const notePopupPosition = ref({ x: 0, y: 0 })

// 默认思维导图数据
const defaultData: MindMapNode = {
  data: {
    text: '中心主题'
  },
  children: [
    {
      data: { text: '分支主题 1' },
      children: [
        { data: { text: '子主题 1-1' }, children: [] },
        { data: { text: '子主题 1-2' }, children: [] }
      ]
    },
    {
      data: { text: '分支主题 2' },
      children: [
        { data: { text: '子主题 2-1' }, children: [] }
      ]
    },
    {
      data: { text: '分支主题 3' },
      children: []
    }
  ]
}

onMounted(() => {
  initMindMap()
  // 在组件完全挂载后使用 300ms 延迟调用 fit()，确保 elRect 已更新
  setTimeout(() => {
    if (mindMap) {
      mindMap.view.fit()
    }
  }, 300)
})

// 监听 modelValue 变化，更新脑图数据
watch(() => props.modelValue, (newData) => {
  if (newData && mindMap) {
    console.log('更新脑图数据:', newData)
    isSettingData = true
    mindMap.setData(newData)
    // 延迟居中显示
    setTimeout(() => {
      if (mindMap) {
        mindMap.view.fit()
      }
      isSettingData = false
    }, 300)
  }
}, { deep: true })

onUnmounted(() => {
  if (mindMap) {
    mindMap.destroy()
    mindMap = null
  }
})

function initMindMap() {
  const container = document.getElementById('mindMapContainer')
  if (!container) return

  mindMap = new MindMap({
    el: container,
    data: props.modelValue || defaultData,
    theme: 'freshGreen',
    layout: 'logicalStructure',
    enableFreeDrag: false,
    mousewheelAction: 'zoom',
    mouseScaleCenterUseMousePosition: true,
    scaleRatio: 0.1,
    maxScale: 3,
    minScale: 0.3,
    // 首次渲染时自动适应画布大小并居中
    fit: true,
    // 节点样式配置
    nodeTextEditZIndex: 1000,
    expandBtnSize: 20,
    expandBtnIcon: {
      close: '<svg viewBox="0 0 1024 1024"><path d="M512 0C229.232 0 0 229.232 0 512s229.232 512 512 512 512-229.232 512-512S794.768 0 512 0z m256 576H256V448h512v128z" fill="currentColor"/></svg>',
      open: '<svg viewBox="0 0 1024 1024"><path d="M512 0C229.232 0 0 229.232 0 512s229.232 512 512 512 512-229.232 512-512S794.768 0 512 0z m256 576H576v192H448V576H256V448h192V256h128v192h192v128z" fill="currentColor"/></svg>'
    }
  })

  // 监听数据变化
  mindMap.on('data_change', (data: MindMapNode) => {
    if (isSettingData) return
    emit('update:modelValue', data)
  })

  // 监听节点右键点击事件
  mindMap.on('node_contextmenu', (e: MouseEvent, node: any) => {
    e.preventDefault()
    showContextMenu(node, e)
  })

  // 监听注释图标点击事件
  mindMap.on('node_note_click', (node: any, e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    showNotePopup(node, e)
  })

  // 通知父组件 mindMap 实例已就绪
  emit('mindMapReady', mindMap)
}

// 自定义右键菜单
let contextMenuEl: HTMLElement | null = null

function showContextMenu(node: any, e: MouseEvent) {
  // 移除旧菜单
  if (contextMenuEl) {
    contextMenuEl.remove()
    contextMenuEl = null
  }

  // 创建菜单
  const menu = document.createElement('div')
  menu.className = 'custom-context-menu'
  menu.style.cssText = `
    position: fixed;
    left: ${e.clientX}px;
    top: ${e.clientY}px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    padding: 4px 0;
    z-index: 10000;
    min-width: 140px;
  `

  const menuItems = [
    {
      label: '添加子节点',
      action: () => {
        mindMap?.execCommand('INSERT_CHILD_NODE')
      }
    },
    {
      label: '添加同级节点',
      action: () => {
        mindMap?.execCommand('INSERT_NODE')
      }
    },
    {
      label: '删除节点',
      disabled: node.isRoot,
      action: () => {
        if (!node.isRoot) {
          mindMap?.execCommand('REMOVE_NODE')
        }
      }
    },
    {
      label: '添加/编辑注释',
      action: () => {
        emit('openNote', node)
      }
    },
    {
      label: '💬 针对此节点提问',
      action: () => {
        const text = node.getData('text') || '节点'
        const uid = node.getData('uid') || node.uid || ''
        emit('askAboutNode', { uid, text })
      }
    }
  ]

  menuItems.forEach(item => {
    const menuItem = document.createElement('div')
    menuItem.textContent = item.label
    menuItem.style.cssText = `
      padding: 8px 16px;
      cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
      color: ${item.disabled ? '#ccc' : '#333'};
      font-size: 14px;
      transition: background 0.2s;
    `
    if (!item.disabled) {
      menuItem.onmouseenter = () => menuItem.style.background = '#f5f5f5'
      menuItem.onmouseleave = () => menuItem.style.background = 'transparent'
      menuItem.onclick = (e) => {
        e.stopPropagation() // 阻止事件冒泡
        removeMenu() // 先移除菜单
        // 使用 setTimeout 延迟执行 action，确保菜单已完全移除
        setTimeout(() => item.action(), 10)
      }
    }
    menu.appendChild(menuItem)
  })

  document.body.appendChild(menu)
  contextMenuEl = menu

  // 点击其他地方关闭菜单
  setTimeout(() => document.addEventListener('click', removeMenu), 0)
}

function removeMenu() {
  if (contextMenuEl) {
    contextMenuEl.remove()
    contextMenuEl = null
    document.removeEventListener('click', removeMenu)
  }
}

// 将文本中的 URL 转换为可点击的链接
function convertUrlsToLinks(text: string): string {
  // URL 正则表达式
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
}

// 显示注释浮层
function showNotePopup(node: any, e: MouseEvent) {
  const noteContent = node.getData('note')
  if (!noteContent) return

  // 关闭右键菜单（如果打开）
  removeMenu()

  // 转换 URL 为链接，同时转换换行符为 <br>
  const contentWithLinks = convertUrlsToLinks(noteContent)
    .replace(/\n/g, '<br>')
  
  notePopupContent.value = contentWithLinks
  
  // 计算浮层位置（根据鼠标点击位置）
  notePopupPosition.value = {
    x: e.clientX + 10,
    y: e.clientY + 10
  }
  
  notePopupVisible.value = true

  // 点击其他地方关闭浮层
  setTimeout(() => {
    document.addEventListener('click', closeNotePopup)
  }, 0)
}

// 关闭注释浮层
function closeNotePopup(e?: Event) {
  if (e) {
    const target = e.target as HTMLElement
    
    // 如果点击的是浮层内的链接，不关闭（让链接正常打开）
    if (target.tagName === 'A') {
      return
    }
    
    // 如果点击的是浮层内部（除了关闭按钮），不关闭
    const popup = target.closest('.note-popup')
    const closeBtn = target.closest('.note-popup-close')
    
    if (popup && !closeBtn) {
      return
    }
  }
  
  notePopupVisible.value = false
  notePopupContent.value = ''
  document.removeEventListener('click', closeNotePopup)
}

// 在数据树中递归查找节点并追加子节点
function findAndExpandNode(node: any, targetUid: string, newChildren: MindMapNode[]): boolean {
  if (node.data?.uid === targetUid) {
    if (!node.children) node.children = []
    node.children.push(...newChildren)
    return true
  }
  if (node.children) {
    for (const child of node.children) {
      if (findAndExpandNode(child, targetUid, newChildren)) return true
    }
  }
  return false
}

// 扩展指定节点的子节点
function expandNodeChildren(nodeUid: string, newChildren: MindMapNode[]) {
  if (!mindMap) return

  const data = mindMap.getData()
  console.log('扩展节点:', nodeUid, '添加子节点:', newChildren)

  if (findAndExpandNode(data, nodeUid, newChildren)) {
    isSettingData = true
    mindMap.setData(data)
    setTimeout(() => {
      if (mindMap) {
        mindMap.view.fit()
      }
      isSettingData = false
    }, 300)
  } else {
    console.warn('未找到目标节点 uid:', nodeUid)
  }
}

// 暴露方法给父组件
defineExpose({
  getMindMap: () => mindMap,
  expandNodeChildren
})
</script>

<style scoped>
.mind-map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

#mindMapContainer {
  width: 100%;
  height: 100%;
}

/* simple-mind-map 主题覆盖 */
:deep(.smm-node) {
  transition: all 0.2s ease;
}

:deep(.smm-node:hover) {
  filter: brightness(1.1);
}

:deep(.smm-node-text) {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 注释浮层样式 */
.note-popup {
  position: fixed;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  max-width: 400px;
  z-index: 10001;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.note-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}

.note-popup-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.note-popup-close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.note-popup-close:hover {
  background: #e0e0e0;
  color: #333;
}

.note-popup-content {
  padding: 16px;
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  max-height: 300px;
  overflow-y: auto;
  word-wrap: break-word;
}

/* 注释中的链接样式 */
.note-popup-content :deep(a) {
  color: #1890ff;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.note-popup-content :deep(a:hover) {
  border-bottom-color: #1890ff;
}
</style>
