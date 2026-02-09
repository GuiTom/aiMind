<template>
  <div class="mind-map-container" ref="containerRef">
    <div id="mindMapContainer"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
}>()

const containerRef = ref<HTMLElement>()
let mindMap: MindMap | null = null

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
    emit('update:modelValue', data)
  })

  // 通知父组件 mindMap 实例已就绪
  emit('mindMapReady', mindMap)
}

// 暴露方法给父组件
defineExpose({
  getMindMap: () => mindMap
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
</style>
