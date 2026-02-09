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
    </div>

    <div class="toolbar-divider"></div>

    <!-- 缩放控制 -->
    <div class="zoom-controls">
      <el-button circle size="small" @click="zoomOut" :icon="ZoomOut" />
      <span class="zoom-text">{{ Math.round(zoom * 100) }}%</span>
      <el-button circle size="small" @click="zoomIn" :icon="ZoomIn" />
      <el-button circle size="small" @click="fitView" :icon="FullScreen" />
    </div>

    <div class="toolbar-divider"></div>

    <!-- 导出菜单 -->
    <el-dropdown @command="handleExport" trigger="click" popper-class="export-dropdown">
      <el-button type="primary" :icon="Download">
        导出
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="json">
            <el-icon><Document /></el-icon>
            导出为 JSON
          </el-dropdown-item>
          <el-dropdown-item command="xml">
            <el-icon><Files /></el-icon>
            导出为 XML
          </el-dropdown-item>
          <el-dropdown-item command="png" divided>
            <el-icon><Picture /></el-icon>
            导出为图片 (PNG)
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  Plus, CirclePlus, Delete, 
  ZoomIn, ZoomOut, FullScreen,
  Download, ArrowDown,
  Document, Files, Picture
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { exportToJson, exportToXml } from '@/utils/export'
import type MindMap from 'simple-mind-map'

const props = defineProps<{
  mindMap: MindMap | null
}>()

const zoom = ref(1)

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

// 缩放控制
function zoomIn() {
  if (!props.mindMap) return
  zoom.value = Math.min(zoom.value + 0.1, 3)
  props.mindMap.execCommand('SET_SCALE', zoom.value)
}

function zoomOut() {
  if (!props.mindMap) return
  zoom.value = Math.max(zoom.value - 0.1, 0.3)
  props.mindMap.execCommand('SET_SCALE', zoom.value)
}

function fitView() {
  if (!props.mindMap) return
  props.mindMap.view.fit()
  zoom.value = 1
}

// 导出处理
async function handleExport(command: string) {
  if (!props.mindMap) return

  const data = props.mindMap.getData(false)
  const fileName = 'mindmap-' + new Date().toISOString().slice(0, 10)

  try {
    switch (command) {
      case 'json':
        exportToJson(data, fileName)
        ElMessage.success('JSON 文件已导出')
        break
      case 'xml':
        exportToXml(data, fileName)
        ElMessage.success('XML 文件已导出')
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
</script>
