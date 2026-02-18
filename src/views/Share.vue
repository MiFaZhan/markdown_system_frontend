<template>
  <div class="share-container">
    <!-- 密码输入界面 -->
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

    <!-- 内容展示界面 -->
    <div
      v-else-if="content || shareInfo.targetType === 2 || shareInfo.targetType === 0"
      v-loading="loading"
      class="content-wrapper"
    >
      <!-- 1. 单个文件分享视图 -->
      <div v-if="shareInfo.targetType === 1" class="single-file-view">
        <header class="view-header">
          <div>
            <h2>{{ shareInfo.targetName }}</h2>
            <div class="meta-info">
              <span>浏览次数: {{ shareInfo.viewCount }}</span>
              <span>分享时间: {{ formatTime(shareInfo.creationTime) }}</span>
            </div>
          </div>
          <el-switch
            :model-value="isDark"
            inline-prompt
            :active-icon="Moon"
            :inactive-icon="Sunny"
            @click="toggleTheme"
          />
        </header>
        <div class="markdown-body">
          <div id="vditor-preview"></div>
        </div>
      </div>

      <!-- 2. 项目/文件夹分享视图 (Workspace 布局) -->
      <div
        v-else-if="shareInfo.targetType === 0 || shareInfo.targetType === 2"
        class="workspace-layout"
      >
        <!-- 主体区域 -->
        <div class="workspace-body">
          <!-- 左侧文件树 -->
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
                <el-switch
                  :model-value="isDark"
                  inline-prompt
                  :active-icon="Moon"
                  :inactive-icon="Sunny"
                  class="theme-switch-in-sidebar"
                  @click="toggleTheme"
                />
              </template>
            </ShareFileTree>
          </div>

          <!-- 中间编辑器区域 -->
          <main class="editor-area">
            <!-- Tabs -->
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

            <!-- 内容区 -->
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

          <!-- 右侧大纲栏 -->
          <SidePanel
            :show="showRightPanel"
            :width="rightPanelWidth"
            :side-panel-mode="sidePanelMode"
            :outline="outline"
            :current-file="activeFileId ? { id: activeFileId } : null"
            @set-mode="(mode) => (sidePanelMode = mode)"
            @jump-to-heading="handleJumpToHeading"
            @start-resize="startResize"
            @export-markdown="handleExportMarkdown"
            @export-pdf="handleExportPdf"
            @export-html="handleExportHtml"
          />
        </div>
      </div>
    </div>

    <!-- 错误/空状态 -->
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
import { Moon, Sunny, Document, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ShareFileTree from '../components/share/ShareFileTree.vue'
import SidePanel from '../components/workspace/SidePanel.vue'
import { useThemeStore } from '../stores/theme'

const route = useRoute()
const shareCode = route.params.shareCode

// 主题 store
const themeStore = useThemeStore()

// 状态
const loading = ref(true)
const needPassword = ref(false)
const password = ref('')
const errorMsg = ref('')
const shareInfo = ref({})
const content = ref(null)
const isDark = computed(() => themeStore.getEffectiveTheme() === 'dark')

// 树相关
const treeData = ref([])
const searchKeyword = ref('')
const showSidebar = ref(true)
const sidebarWidth = ref(250)

// 右侧大纲相关
const showRightPanel = ref(true)
const rightPanelWidth = ref(250)
const outline = ref([])
const sidePanelMode = ref('outline')

// Tabs 相关
const openTabs = ref([])
const activeFileId = ref(null)
const fileContentMap = ref({})

// 初始化
onMounted(async () => {
  if (!shareCode) {
    errorMsg.value = '无效的分享链接'
    loading.value = false
    return
  }
  await checkAccess()
})

// 监听 activeFileId 变化，重新渲染 Vditor
watch(activeFileId, async (newId) => {
  if (!newId) return

  // 确保 DOM 更新后渲染
  await nextTick()

  // 检查是否有缓存内容
  const content = fileContentMap.value[newId]
  if (content) {
    initVditor(newId, content)
  } else {
    // 如果没有缓存（理论上 handleFileSelect 会加载），重新加载
    await loadFileContent(newId)
  }
})

// 切换主题
const toggleTheme = () => {
  themeStore.cycleTheme()

  // 重新渲染当前激活的编辑器
  if (activeFileId.value) {
    const content = fileContentMap.value[activeFileId.value]
    if (content) {
      const elId = `vditor-${activeFileId.value}`
      const el = document.getElementById(elId)
      if (el) {
        el.innerHTML = ''
        initVditor(activeFileId.value, content)
      }
    }
  }

  // 更新单文件预览
  const previewEl = document.getElementById('vditor-preview')
  if (previewEl && content.value && shareInfo.value.targetType === 1) {
    previewEl.innerHTML = ''
    renderMarkdown(content.value)
  }
}

// 检查访问权限
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

// 获取内容
const fetchContent = async () => {
  loading.value = true
  try {
    const res = await getShareContent(shareCode)

    if (res.targetType === 1) {
      // 单文件
      content.value = res.content
      nextTick(() => {
        renderMarkdown(res.content)
      })
    } else if (res.targetType === 0 || res.targetType === 2) {
      // 文件夹或项目
      content.value = res.content
      // 转换树形结构适配组件
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

// 数据转换：后端 NodeItemVO -> 前端 Tree 格式
const transformTreeData = (nodes) => {
  return nodes.map((node) => ({
    id: node.nodeId,
    label: node.nodeName,
    name: node.nodeName,
    type: node.nodeType === 0 ? 'folder' : 'file',
    children: node.children ? transformTreeData(node.children) : [],
    // 保留其他需要的字段
    creationTime: node.creationTime
  }))
}

// 搜索过滤
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
  // 简单计算过滤后的文件数
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

// 单文件渲染
const renderMarkdown = (markdown) => {
  const el = document.getElementById('vditor-preview')
  if (!el) return
  Vditor.preview(el, markdown, {
    mode: isDark.value ? 'dark' : 'light',
    theme: {
      current: isDark.value ? 'dark' : 'light'
    },
    hljs: {
      style: isDark.value ? 'native' : 'github'
    },
    after() {
      updateOutline(el)
      // 添加 vditor--dark 类，确保自定义 CSS 生效
      if (isDark.value) {
        el.classList.add('vditor--dark')
      } else {
        el.classList.remove('vditor--dark')
      }
    }
  })
}

// 树节点点击
const handleFileSelect = async (node) => {
  if (node.type === 'folder') return

  // 检查是否已打开
  const existingTab = openTabs.value.find((t) => t.fileId === node.id)
  if (existingTab) {
    activeFileId.value = node.id
    return
  }

  // 添加新 Tab
  openTabs.value.push({
    fileId: node.id,
    fileName: node.name
  })
  activeFileId.value = node.id

  // 获取内容并渲染
  await loadFileContent(node.id)
}

const loadFileContent = async (fileId) => {
  try {
    // 检查缓存
    if (fileContentMap.value[fileId]) {
      nextTick(() => {
        initVditor(fileId, fileContentMap.value[fileId])
      })
      return
    }

    const content = await getShareNodeContent(shareCode, fileId)
    fileContentMap.value[fileId] = content // 缓存内容

    nextTick(() => {
      initVditor(fileId, content)
    })
  } catch (error) {
    ElMessage.error(error.message || '加载文件失败')
    closeTab(fileId)
  }
}

const initVditor = (fileId, content) => {
  const elId = `vditor-${fileId}`
  const el = document.getElementById(elId)
  if (!el) return

  Vditor.preview(el, content, {
    mode: isDark.value ? 'dark' : 'light',
    theme: {
      current: isDark.value ? 'dark' : 'light'
    },
    hljs: {
      style: isDark.value ? 'native' : 'github'
    },
    after() {
      updateOutline(el)
      // 添加 vditor--dark 类，确保自定义 CSS 生效
      if (isDark.value) {
        el.classList.add('vditor--dark')
      } else {
        el.classList.remove('vditor--dark')
      }
    }
  })
}

// 更新大纲
const updateOutline = (element) => {
  if (!element) return
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const newOutline = []

  headings.forEach((heading, index) => {
    const id = `heading-${index}`
    heading.id = id // 确保标题有 ID
    newOutline.push({
      id: id,
      text: heading.innerText,
      level: parseInt(heading.tagName.substring(1)),
      line: index // 这里的 line 只是索引，实际行号未知，但不影响跳转
    })
  })

  outline.value = newOutline
}

// 跳转到标题
const handleJumpToHeading = (node) => {
  const el = document.getElementById(node.id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

const activateTab = (fileId) => {
  activeFileId.value = fileId
}

const closeTab = (fileId) => {
  const index = openTabs.value.findIndex((t) => t.fileId === fileId)
  if (index === -1) return

  openTabs.value.splice(index, 1)
  delete fileContentMap.value[fileId] // 清除缓存

  if (activeFileId.value === fileId) {
    if (openTabs.value.length > 0) {
      activeFileId.value = openTabs.value[openTabs.value.length - 1].fileId
    } else {
      activeFileId.value = null
      outline.value = [] // 清空大纲
    }
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  return new Date(timeStr).toLocaleString()
}

// 侧边栏调整
const startResize = () => {
  // 简化版，暂不实现拖拽调整
}

const addExtensionIfNeeded = (fileName, extension) => {
  if (!fileName) return extension
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  return fileName.toLowerCase().endsWith(ext.toLowerCase()) ? fileName : `${fileName}${ext}`
}

// 导出为 Markdown
const handleExportMarkdown = () => {
  const fileId = activeFileId.value
  if (!fileId || !fileContentMap.value[fileId]) {
    ElMessage.warning('请先选择一个文件')
    return
  }

  const currentTab = openTabs.value.find((t) => t.fileId === fileId)
  const content = fileContentMap.value[fileId]
  const fileName = addExtensionIfNeeded(currentTab?.fileName || 'document', 'md')

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}

// 导出为 HTML
const handleExportHtml = async () => {
  const fileId = activeFileId.value
  if (!fileId || !fileContentMap.value[fileId]) {
    ElMessage.warning('请先选择一个文件')
    return
  }

  const currentTab = openTabs.value.find((t) => t.fileId === fileId)
  const content = fileContentMap.value[fileId]
  const fileName = addExtensionIfNeeded(currentTab?.fileName || 'document', 'html')

  const html = await Vditor.md2html(content, {
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

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}

// 导出为 PDF（打印方式）
const handleExportPdf = async () => {
  const fileId = activeFileId.value
  if (!fileId || !fileContentMap.value[fileId]) {
    ElMessage.warning('请先选择一个文件')
    return
  }

  const currentTab = openTabs.value.find((t) => t.fileId === fileId)
  const content = fileContentMap.value[fileId]
  const fileName = currentTab?.fileName || 'document'

  const html = await Vditor.md2html(content, {
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

/* 密码页样式 */
.password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: var(--color-background);
}

.password-box {
  background: var(--color-background-soft);
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 400px;
  text-align: center;
  border: 1px solid var(--color-border);
}

.password-box h2 {
  margin-bottom: 30px;
  font-weight: 500;
}

.error-msg {
  color: var(--el-color-danger);
  margin-top: 10px;
  font-size: 14px;
}

/* 单文件视图样式 */
.single-file-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 20px;
}

.meta-info {
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  gap: 15px;
  margin-top: 8px;
}

.workspace-header .meta-info {
  margin-top: 0;
}

.markdown-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 10px;
}

/* Workspace 布局样式 */
.workspace-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.workspace-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  padding: 0;
}

.sidebar-container {
  position: relative;
}

.sidebar-footer {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-background);
  overflow: hidden;
}

.tabs-bar {
  height: 36px;
  background-color: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
}

.tabs-wrapper {
  display: flex;
  height: 36px;
  align-items: flex-end;
}

.tab-item {
  height: 32px;
  padding: 0 15px;
  display: flex;
  align-items: center;
  gap: 6px;
  background-color: var(--color-background);
  border-right: 1px solid var(--color-border);
  border-top: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
  user-select: none;
  max-width: 200px;
}

.tab-item.active {
  background-color: var(--color-background);
  border-top: 2px solid var(--color-primary);
  color: var(--color-primary);
}

.tab-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-icon {
  font-size: 12px;
  border-radius: 50%;
  padding: 2px;
}

.close-icon:hover {
  background-color: var(--color-background-mute);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.vditor-container {
  max-width: 1000px;
  margin: 0 auto;
}

.theme-switch-in-sidebar {
  --el-switch-on-color: var(--el-color-primary);
  --el-switch-off-color: #dcdfe6;
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 100;
}

.theme-switch-in-sidebar :deep(.el-switch__core) {
  transform: scale(1.2);
  transform-origin: right bottom;
}

@media (max-width: 767px) {
  .theme-switch-in-sidebar {
    bottom: 12px;
    right: 12px;
  }
}

@media (max-width: 480px) {
  .theme-switch-in-sidebar {
    bottom: 8px;
    right: 8px;
  }
}

.empty-editor {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.empty-state-full {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
</style>
