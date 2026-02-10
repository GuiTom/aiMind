<template>
  <div class="app-container">
    <!-- 工具栏 -->
    <Toolbar ref="toolbarRef" :mindMap="mindMap" />
    
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
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed } from 'vue'
import Toolbar from './components/Toolbar.vue'
import MindMap from './components/MindMap.vue'
import ChatPanel from './components/ChatPanel.vue'
import type MindMapInstance from 'simple-mind-map'
import type { MindMapNode } from '@/types'

const mapData = ref<MindMapNode>()
const mindMap = shallowRef<MindMapInstance | null>(null)
const toolbarRef = ref<InstanceType<typeof Toolbar>>()
const mindMapRef = ref<InstanceType<typeof MindMap>>()
const targetNode = ref<{ uid: string, text: string } | null>(null)

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
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 12px;
}
</style>

