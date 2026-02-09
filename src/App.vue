<template>
  <div class="app-container">
    <Toolbar ref="toolbarRef" :mindMap="mindMap" />
    <div class="mind-map-wrapper">
      <MindMap 
        v-model="mapData" 
        @mindMapReady="onMindMapReady"
        @openNote="onOpenNote"
      />
      <div class="tips">
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
import { ref, shallowRef } from 'vue'
import Toolbar from './components/Toolbar.vue'
import MindMap from './components/MindMap.vue'
import type MindMapInstance from 'simple-mind-map'
import type { MindMapNode } from '@/types'

const mapData = ref<MindMapNode>()
const mindMap = shallowRef<MindMapInstance | null>(null)
const toolbarRef = ref<InstanceType<typeof Toolbar>>()

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
</script>
