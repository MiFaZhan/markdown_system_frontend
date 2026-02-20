<template>
  <div class="share-container" :data-share-theme="isDark ? 'dark' : 'light'">
    <div v-if="needPassword" class="password-container">
      <div class="password-box">
        <h2>{{ shareInfo.targetName || '访问受限' }}</h2>
        <div class="input-group">
          <el-input
            v-model="password"
            placeholder="请输入提取码"
            type="password"
            show-password
            @keyup.enter="handleAccess"
          >
            <template #append>
              <el-button @click="handleAccess">提取</el-button>
            </template>
          </el-input>
        </div>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      </div>
    </div>

    <div
      v-else-if="content || shareInfo.targetType === 2 || shareInfo.targetType === 0"
      v-loading="loading"
      class="content-wrapper"
    >
      <div v-if="shareInfo.targetType === 1" class="single-file-view">
        <header class="view-header">
          <div>
            <h2>{{ shareInfo.targetName }}</h2>
            <div class="meta-info">
              <span>浏览次数: {{ shareInfo.viewCount }}</span>
              <span>分享时间: {{ formatTime(shareInfo.creationTime) }}</span>
            </div>
          </div>
          <el-tooltip :content="themeTooltip" placement="bottom">
            <button class="theme-toggle-btn" aria-label="切换主题" @click="toggleTheme">
              <component :is="themeIcon" class="theme-icon" />
            </button>
          </el-tooltip>
        </header>
        <div class="markdown-body">
          <div id="vditor-preview"></div>
        </div>
      </div>

      <div
        v-else-if="shareInfo.targetType === 0 || shareInfo.targetType === 2"
        class="workspace-layout"
      >
        <div class="workspace-body">
          <div class="sidebar-container">
            <ShareFileTree
              v-model:search-keyword="searchKeyword"
              :show="showSidebar"
              :width="sidebarWidth"
              :project-name="shareInfo.targetName"
              :share-type="shareInfo.targetType"
              :file-tree="treeData"
              :filtered-file-tree="filteredTreeData"
              :selected-node-id="activeFileId"
              :search-result-count="searchResultCount"
              @select-file="handleFileSelect"
              @start-resize="startResize"
            >
              <template #footer>
                <el-tooltip :content="themeTooltip" placement="top">
                  <button class="theme-toggle-btn" aria-label="切换主题" @click="toggleTheme">
                    <component :is="themeIcon" class="theme-icon" />
                  </button>
                </el-tooltip>
              </template>
            </ShareFileTree>
          </div>

          <main class="editor-area">
            <div v-if="openTabs.length > 0" class="tabs-bar">
              <el-scrollbar>
                <div class="tabs-wrapper">
                  <div
                    v-for="tab in openTabs"
                    :key="tab.fileId"
                    class="tab-item"
                    :class="{ active: activeFileId === tab.fileId }"
                    @click="activateTab(tab.fileId)"
                  >
                    <el-icon class="tab-icon"><Document /></el-icon>
                    <span class="tab-title">{{ tab.fileName }}</span>
                    <el-icon class="close-icon" @click.stop="closeTab(tab.fileId)"
                      ><Close
                    /></el-icon>
                  </div>
                </div>
              </el-scrollbar>
            </div>

            <div v-if="activeFileId" class="editor-content">
              <div
                :id="'vditor-' + activeFileId"
                class="vditor-container"
                :class="{ 'vditor--dark': isDark }"
              ></div>
            </div>
            <div v-else class="empty-editor">
              <el-empty description="请选择文件查看" />
            </div>
          </main>

          <SidePanel
            :show="showRightPanel"
            :width="rightPanelWidth"
            :side-panel-mode="sidePanelMode"
            :outline="outline"
            :current-file="activeFileId ? { id: activeFileId } : null"
            @set-mode="(mode) => (sidePanelMode = mode)"
            @jump-to-heading="jumpToHeading"
            @start-resize="startResize"
            @export-markdown="handleExportMarkdown"
            @export-pdf="handleExportPdf"
            @export-html="handleExportHtml"
          />
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="empty-state-full">
      <el-empty :description="errorMsg || '暂无内容'" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { accessShare, getShareContent, getShareNodeContent } from '../api/shareService'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { Moon, Sunny, Document, Close, Monitor } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ShareFileTree from '../components/share/ShareFileTree.vue'
import SidePanel from '../components/workspace/SidePanel.vue'
import { usePanelResize } from '../composables/usePanelResize'
import { useVditorPreview } from '../composables/useVditorPreview'
import { useFileDownload } from '../composables/useFileDownload'

const route = useRoute()
const shareCode = route.params.shareCode

const shareTheme = ref('auto')
const isDark = computed(() => {
  if (shareTheme.value === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return shareTheme.value === 'dark'
})

const themeIcon = computed(() => {
  switch (shareTheme.value) {
    case 'light':
      return Sunny
    case 'dark':
      return Moon
    case 'auto':
    default:
      return Monitor
  }
})

const themeTooltip = computed(() => {
  switch (shareTheme.value) {
    case 'light':
      return '浅色模式'
    case 'dark':
      return '深色模式'
    case 'auto':
    default:
      return '跟随浏览器'
  }
})

const { renderPreview, jumpToHeading } = useVditorPreview(
  computed(() => isDark.value),
  (newOutline) => {
    outline.value = newOutline
  }
)
const { downloadMarkdown, downloadHtml } = useFileDownload()

const loading = ref(true)
const needPassword = ref(false)
const password = ref('')
const errorMsg = ref('')
const shareInfo = ref({})
const content = ref(null)

const treeData = ref([])
const searchKeyword = ref('')
const showSidebar = ref(true)
const { width: sidebarWidth, startResize: startSidebarResize } = usePanelResize({
  defaultWidth: 250,
  direction: 'left'
})

const showRightPanel = ref(true)
const { width: rightPanelWidth, startResize: startOutlineResize } = usePanelResize({
  defaultWidth: 250,
  direction: 'right'
})
const outline = ref([])
const sidePanelMode = ref('outline')

const openTabs = ref([])
const activeFileId = ref(null)
const fileContentMap = ref({})

onMounted(async () => {
  if (!shareCode) {
    errorMsg.value = '无效的分享链接'
    loading.value = false
    return
  }
  await checkAccess()
})

watch(activeFileId, async (newId) => {
  if (!newId) return
  await nextTick()
  const fileContent = fileContentMap.value[newId]
  if (fileContent) {
    initVditor(newId, fileContent)
  } else {
    await loadFileContent(newId)
  }
})

const toggleTheme = () => {
  const themeOrder = ['light', 'dark', 'auto']
  const currentIndex = themeOrder.indexOf(shareTheme.value)
  shareTheme.value = themeOrder[(currentIndex + 1) % themeOrder.length]

  if (activeFileId.value) {
    const fileContent = fileContentMap.value[activeFileId.value]
    if (fileContent) {
      const elId = `vditor-${activeFileId.value}`
      const el = document.getElementById(elId)
      if (el) {
        el.innerHTML = ''
        initVditor(activeFileId.value, fileContent)
      }
    }
  }

  const previewEl = document.getElementById('vditor-preview')
  if (previewEl && content.value && shareInfo.value.targetType === 1) {
    previewEl.innerHTML = ''
    renderMarkdown(content.value)
  }
}

const checkAccess = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await accessShare(shareCode, password.value)
    shareInfo.value = res
    needPassword.value = false
    await fetchContent()
  } catch (error) {
    if (error.response?.data?.message === '访问密码错误' || error.message.includes('密码')) {
      needPassword.value = true
      if (password.value) {
        errorMsg.value = '提取码错误'
      }
    } else {
      errorMsg.value = error.message || '访问失败'
    }
  } finally {
    loading.value = false
  }
}

const handleAccess = () => {
  if (!password.value) {
    errorMsg.value = '请输入提取码'
    return
  }
  checkAccess()
}

const fetchContent = async () => {
  loading.value = true
  try {
    const res = await getShareContent(shareCode)

    if (res.targetType === 1) {
      content.value = res.content
      nextTick(() => {
        renderMarkdown(res.content)
      })
    } else if (res.targetType === 0 || res.targetType === 2) {
      content.value = res.content
      if (res.content && res.content.rootNodes) {
        treeData.value = transformTreeData(res.content.rootNodes)
      } else {
        treeData.value = []
      }
    }
  } catch (error) {
    console.error(error)
    ElMessage.error(error.message || '获取内容失败')
  } finally {
    loading.value = false
  }
}

const transformTreeData = (nodes) => {
  return nodes.map((node) => ({
    id: node.nodeId,
    label: node.nodeName,
    name: node.nodeName,
    type: node.nodeType === 0 ? 'folder' : 'file',
    children: node.children ? transformTreeData(node.children) : [],
    creationTime: node.creationTime
  }))
}

const filteredTreeData = computed(() => {
  if (!searchKeyword.value) return treeData.value
  const keyword = searchKeyword.value.toLowerCase()

  const filterNode = (nodes) => {
    const result = []
    for (const node of nodes) {
      const match = node.name.toLowerCase().includes(keyword)
      const filteredChildren = node.children ? filterNode(node.children) : []

      if (match || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren
        })
      }
    }
    return result
  }

  return filterNode(treeData.value)
})

const searchResultCount = computed(() => {
  const countFiles = (nodes) => {
    let count = 0
    for (const node of nodes) {
      if (node.type === 'file') count++
      if (node.children) count += countFiles(node.children)
    }
    return count
  }
  return countFiles(filteredTreeData.value)
})

const renderMarkdown = (markdown) => {
  const el = document.getElementById('vditor-preview')
  renderPreview(el, markdown)
}

const handleFileSelect = async (node) => {
  if (node.type === 'folder') return

  const existingTab = openTabs.value.find((t) => t.fileId === node.id)
  if (existingTab) {
    activeFileId.value = node.id
    return
  }

  openTabs.value.push({
    fileId: node.id,
    fileName: node.name
  })
  activeFileId.value = node.id

  await loadFileContent(node.id)
}

const loadFileContent = async (fileId) => {
  try {
    if (fileContentMap.value[fileId]) {
      nextTick(() => {
        initVditor(fileId, fileContentMap.value[fileId])
      })
      return
    }

    const fileContent = await getShareNodeContent(shareCode, fileId)
    const displayContent = fileContent ?? ''
    fileContentMap.value[fileId] = displayContent

    nextTick(() => {
      initVditor(fileId, displayContent)
    })
  } catch (error) {
    ElMessage.error(error.message || '加载文件失败')
    closeTab(fileId)
  }
}

const initVditor = (fileId, fileContent) => {
  const elId = `vditor-${fileId}`
  const el = document.getElementById(elId)
  if (!el) return
  renderPreview(el, fileContent)
}

const activateTab = (fileId) => {
  activeFileId.value = fileId
}

const closeTab = (fileId) => {
  const index = openTabs.value.findIndex((t) => t.fileId === fileId)
  if (index === -1) return

  openTabs.value.splice(index, 1)
  delete fileContentMap.value[fileId]

  if (activeFileId.value === fileId) {
    if (openTabs.value.length > 0) {
      activeFileId.value = openTabs.value[openTabs.value.length - 1].fileId
    } else {
      activeFileId.value = null
      outline.value = []
    }
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  return new Date(timeStr).toLocaleString()
}

const startResize = (panel, e) => {
  if (panel === 'sidebar') {
    startSidebarResize(e)
  } else {
    startOutlineResize(e)
  }
}

const handleExportMarkdown = () => {
  const fileId = activeFileId.value
  if (!fileId || !fileContentMap.value[fileId]) {
    ElMessage.warning('请先选择一个文件')
    return
  }

  const currentTab = openTabs.value.find((t) => t.fileId === fileId)
  downloadMarkdown(fileContentMap.value[fileId], currentTab?.fileName || 'document')
}

const handleExportHtml = async () => {
  const fileId = activeFileId.value
  if (!fileId || !fileContentMap.value[fileId]) {
    ElMessage.warning('请先选择一个文件')
    return
  }

  const currentTab = openTabs.value.find((t) => t.fileId === fileId)
  const fileContent = fileContentMap.value[fileId]
  const fileName = currentTab?.fileName || 'document'

  const html = await Vditor.md2html(fileContent, {
    cdn: '/vditor/',
    preview: {
      theme: {
        path: '/vditor/dist/css/content-theme'
      }
    }
  })

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <link rel="stylesheet" href="/vditor/dist/index.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
    }
    .vditor-reset {
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="vditor-reset">
    ${html}
  </div>
</body>
</html>`

  downloadHtml(fullHtml, fileName)
}

const handleExportPdf = async () => {
  const fileId = activeFileId.value
  if (!fileId || !fileContentMap.value[fileId]) {
    ElMessage.warning('请先选择一个文件')
    return
  }

  const currentTab = openTabs.value.find((t) => t.fileId === fileId)
  const fileContent = fileContentMap.value[fileId]
  const fileName = currentTab?.fileName || 'document'

  const html = await Vditor.md2html(fileContent, {
    cdn: '/vditor/',
    preview: {
      theme: {
        path: '/vditor/dist/css/content-theme'
      }
    }
  })

  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName}</title>
  <link rel="stylesheet" href="/vditor/dist/index.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
      background-color: #fff !important;
    }
    .vditor-reset {
      font-size: 14px;
    }
    @media print {
      @page {
        margin: 1cm;
      }
      body {
        padding: 0;
        margin: 0;
        max-width: none;
      }
      .vditor-reset {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="vditor-reset">
    ${html}
  </div>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(fullHtml)
  doc.close()

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      document.body.removeChild(iframe)
    }, 500)
  }

  ElMessage.success('已打开打印对话框')
}
</script>

<style scoped>
.share-container {
  width: 100vw;
  height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

.password-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    var(--color-background) 0%,
    var(--el-color-primary-light-9) 100%
  );
}

.password-box {
  background: var(--color-background);
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 400px;
}

.password-box h2 {
  margin: 0 0 20px;
  text-align: center;
  color: var(--color-text);
}

.input-group {
  margin-bottom: 16px;
}

.error-msg {
  color: var(--el-color-danger);
  text-align: center;
  margin: 0;
}

.content-wrapper {
  flex: 1;
  overflow: hidden;
}

.single-file-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--color-background);
}

.view-header h2 {
  margin: 0;
  font-size: 18px;
}

.meta-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.markdown-body {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

#vditor-preview {
  max-width: 900px;
  margin: 0 auto;
}

.workspace-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.workspace-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar-container {
  position: relative;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-background);
}

.tabs-bar {
  height: 40px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
}

.tabs-wrapper {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 32px;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
}

.tab-item:hover {
  background: var(--el-fill-color-light);
}

.tab-item.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.tab-icon {
  font-size: 14px;
}

.tab-title {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-icon {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.tab-item:hover .close-icon {
  opacity: 1;
}

.close-icon:hover {
  color: var(--el-color-danger);
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

.vditor-container {
  height: 100%;
  overflow: auto;
  padding: 20px;
}

.empty-editor {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state-full {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  flex-shrink: 0;
}

.theme-toggle-btn:hover {
  background: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  transform: translateY(-1px);
}

.theme-toggle-btn:active {
  transform: translateY(0);
}

.theme-icon {
  width: 20px;
  height: 20px;
}

:deep(.vditor-reset) {
  color: var(--color-text);
}

:deep(.vditor--dark) {
  background-color: var(--color-background);
}
</style>
