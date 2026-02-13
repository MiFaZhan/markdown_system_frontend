<template>
  <div class="workspace-layout" :class="{ 'is-mobile': isMobile }">
    <div
      v-if="isMobile && (showSidebar || showOutline)"
      class="mobile-overlay"
      @click="closeMobilePanels"
    ></div>

    <FileTreePanel
      ref="fileTreePanelRef"
      :show="showSidebar"
      :is-mobile="isMobile"
      :width="sidebarWidth"
      :project-name="currentProjectName"
      :file-tree="fileTree"
      :search-keyword="searchKeyword"
      :filtered-file-tree="filteredFileTree"
      :search-result-count="searchResultCount"
      :selected-node-id="currentSelectedNodeId"
      :allow-drop="allowDrop"
      :allow-drag="allowDrag"
      @update:search-keyword="searchKeyword = $event"
      @back="goBack"
      @create="(cmd) => handleCreate(cmd, currentProjectId)"
      @select-file="selectFile"
      @node-command="handleNodeCommand"
      @drop="handleDrop"
      @start-resize="startResize"
    />

    <EditorPanel
      :tabs="openTabs"
      :active-index="activeTabIndex"
      :show-sidebar="showSidebar"
      :show-outline="showOutline"
      @switch-tab="handleSwitchTab"
      @close-tab="handleCloseTab"
      @close-others="handleCloseOthers"
      @close-all="handleCloseAllTabs"
      @toggle-sidebar="toggleSidebar"
      @toggle-outline="toggleOutline"
      @reorder-tabs="reorderTabs"
    />

    <SidePanel
      :show="showOutline"
      :is-mobile="isMobile"
      :width="outlineWidth"
      :side-panel-mode="sidePanelMode"
      :outline="outline"
      :current-file="currentFile"
      :current-file-content="currentTabContent"
      @set-mode="setSidePanelMode"
      @jump-to-heading="scrollToHeading"
      @start-resize="startResize"
      @export-markdown="handleExportMarkdown"
      @export-pdf="handleExportPdf"
      @export-html="handleExportHtml"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import FileTreePanel from '../components/workspace/FileTreePanel.vue'
import EditorPanel from '../components/workspace/EditorPanel.vue'
import SidePanel from '../components/workspace/SidePanel.vue'
import { useResponsive } from '../composables/useResponsive'
import { useFileTree } from '../composables/useFileTree'
import { useTabs } from '../composables/useTabs'
import { useEditor } from '../composables/useEditor'
import { useFileOperations } from '../composables/useFileOperations'
// import { useContentSearch } from '../composables/useContentSearch'

const route = useRoute()
const router = useRouter()

const fileTreePanelRef = ref(null)

const showSidebar = ref(true)
const showOutline = ref(true)
const sidebarWidth = ref(260)
const outlineWidth = ref(400)
const currentFileId = ref(null)

const { isMobile } = useResponsive({ sidebar: showSidebar, outline: showOutline })

const {
  fileTree,
  searchKeyword,
  currentProjectName,
  currentSelectedNodeId,
  currentProjectId,
  filteredFileTree,
  searchResultCount,
  loadNodeTree,
  findFileById
} = useFileTree(route)

const { handleCreate, handleDelete, handleRename, allowDrop, allowDrag, handleDrop } =
  useFileOperations({
    onRefresh: loadNodeTree
  })

const currentFile = computed(() => {
  if (!currentFileId.value) return null
  return findFileById(fileTree.value, currentFileId.value)
})

const sidePanelMode = ref('none')
const outline = ref([])

const currentTabContent = computed(() => {
  const currentTab = getTabByFileId(currentFileId.value)
  return currentTab?.content || ''
})

const parseOutline = (content) => {
  if (!content) {
    outline.value = []
    return
  }

  const headings = []
  const lines = content.split('\n')
  let inCodeBlock = false

  for (const line of lines) {
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      continue
    }

    const match = line.match(/^\s*(#{1,6})\s+(.+)$/)
    if (match) {
      let text = match[2].trim()

      text = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/!\[(.*?)\]\(.*?\)/g, '')
        .replace(/~~(.*?)~~/g, '$1')

      headings.push({
        level: match[1].length,
        text: text
      })
    }
  }
  outline.value = headings
}

const closeMobilePanels = () => {
  showSidebar.value = false
  showOutline.value = false
}

const goBack = () => {
  router.push('/')
}

const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
  if (isMobile.value && showSidebar.value) {
    showOutline.value = false
  }
}

const toggleOutline = () => {
  showOutline.value = !showOutline.value
  if (isMobile.value && showOutline.value) {
    showSidebar.value = false
  }
}

const selectFile = async (file) => {
  currentSelectedNodeId.value = file.id

  if (isMobile.value) {
    showSidebar.value = false
  }

  await openFile(file)
}

const handleEditorInit = (tab) => {
  parseOutline(tab.content)
}

const handleEditorInput = (tab) => {
  debouncedSave(tab)
  updateSaveStatus(tab)
}

const handleContentChange = (tab) => {
  parseOutline(tab.content)
}

const handleTabSwitch = (result) => {
  console.log('[Workspace] handleTabSwitch 收到结果:', result)
  if (!result || !result.tab) {
    console.log('[Workspace] result 或 result.tab 为空，返回')
    return
  }

  if (result.needInit) {
    console.log('[Workspace] 需要初始化编辑器')
    nextTick(() => {
      const tab = result.tab
      console.log('[Workspace] nextTick 内，准备初始化 Vditor，tab:', tab)
      const vditorInstance = initVditor(tab, handleEditorInput)
      console.log('[Workspace] initVditor 返回:', vditorInstance)
      if (vditorInstance) {
        tab.vditorInstance = vditorInstance
      }
    })
  }

  currentFileId.value = result.tab.fileId
  console.log('[Workspace] currentFileId 设置为:', result.tab.fileId)
  if (result.tab.content) {
    parseOutline(result.tab.content)
  }
}

const {
  openTabs,
  activeTabIndex,
  openTab,
  switchTab,
  reorderTabs,
  closeTab,
  closeOthers,
  closeAllTabs,
  getTabByFileId
} = useTabs({
  onSwitch: handleTabSwitch,
  onSave: null
})

const { initVditor, updateSaveStatus, loadFileContent, debouncedSave } = useEditor({
  onContentChange: handleContentChange,
  onAfterInit: handleEditorInit,
  onOutlineUpdate: parseOutline
})

// const { contentSearchKeyword, contentSearchResults, jumpToSearchResult } = useContentSearch({
//   getCurrentFileId: () => currentFileId.value,
//   getVditorInstance: () => {
//     const currentTab = getTabByFileId(currentFileId.value)
//     return currentTab?.vditorInstance
//   },
//   onSelectFile: selectFile
// })
// const contentSearchKeyword = ref('')
// const contentSearchResults = ref([])
// const jumpToSearchResult = () => {}

const openFile = async (file) => {
  console.log('[Workspace] openFile 开始:', file)
  try {
    const contentData = await loadFileContent(file.id)
    console.log('[Workspace] 加载内容成功:', contentData)
    const tab = await openTab(file, contentData)
    console.log('[Workspace] 创建标签返回:', tab)
    currentFileId.value = file.id
    console.log('[Workspace] currentFileId 设置为:', file.id)
  } catch (error) {
    console.error('加载文件失败:', error)
  }
}

const handleSwitchTab = (index) => {
  console.log('[Workspace] handleSwitchTab 被调用，索引:', index)
  const result = switchTab(index)
  console.log('[Workspace] switchTab 返回:', result)
  handleTabSwitch(result)
}

const handleCloseTab = async (index) => {
  const result = await closeTab(index)
  if (result && result.newActiveIndex !== undefined) {
    if (result.needSwitch && result.newActiveIndex >= 0) {
      handleTabSwitch(switchTab(result.newActiveIndex))
    }
    if (result.newActiveIndex === -1) {
      currentFileId.value = null
    }
  }
}

const handleCloseOthers = async (index) => {
  await closeOthers(index)
  activeTabIndex.value = 0
  const tab = getTabByFileId(currentFileId.value)
  if (tab) {
    currentFileId.value = tab.fileId
  } else {
    currentFileId.value = null
  }
}

const handleCloseAllTabs = async () => {
  await closeAllTabs()
  currentFileId.value = null
}

const handleNodeCommand = (cmd, data) => {
  if (cmd === 'rename') return handleRename(data)
  if (cmd === 'delete') return handleDelete(data, currentFileId, currentSelectedNodeId)
}

const setSidePanelMode = (mode) => {
  sidePanelMode.value = mode
}

const scrollToHeading = (heading) => {
  const currentTab = getTabByFileId(currentFileId.value)
  if (!currentTab) return

  const container = document.getElementById(currentTab.containerId)
  if (!container) return

  const getScrollParent = (node) => {
    if (!node || node === document.body || node === document.documentElement) {
      return null
    }

    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden'

    if (isScrollable && node.scrollHeight >= node.clientHeight) {
      return node
    }

    return getScrollParent(node.parentNode)
  }

  const scrollToElement = (el) => {
    const scrollContainer = getScrollParent(el)

    if (scrollContainer) {
      const elRect = el.getBoundingClientRect()
      const containerRect = scrollContainer.getBoundingClientRect()
      const currentScrollTop = scrollContainer.scrollTop

      const targetScrollTop =
        currentScrollTop +
        (elRect.top - containerRect.top) -
        scrollContainer.clientHeight / 2 +
        elRect.height / 2

      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    document.querySelectorAll('.heading-highlight').forEach((e) => {
      e.classList.remove('heading-highlight')
    })
    el.classList.add('heading-highlight')
    setTimeout(() => {
      el.classList.remove('heading-highlight')
    }, 2000)
  }

  const headingTag = `h${heading.level}`
  const headings = container.querySelectorAll(`.vditor-ir .vditor-reset ${headingTag}`)

  for (const el of headings) {
    const textContent = el.textContent.replace(/^#+\s*/, '').trim()
    if (textContent === heading.text) {
      scrollToElement(el)
      return
    }
  }

  const allHeadings = container.querySelectorAll(
    '.vditor-ir .vditor-reset h1, .vditor-ir .vditor-reset h2, .vditor-ir .vditor-reset h3, .vditor-ir .vditor-reset h4, .vditor-ir .vditor-reset h5, .vditor-ir .vditor-reset h6'
  )
  for (const el of allHeadings) {
    const textContent = el.textContent.replace(/^#+\s*/, '').trim()
    if (textContent === heading.text) {
      scrollToElement(el)
      return
    }
  }
}

const startResize = (panel, e) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = panel === 'sidebar' ? sidebarWidth.value : outlineWidth.value

  const onMouseMove = (moveEvent) => {
    const delta = panel === 'sidebar' ? moveEvent.clientX - startX : startX - moveEvent.clientX
    const newWidth = Math.max(150, Math.min(400, startWidth + delta))
    if (panel === 'sidebar') {
      sidebarWidth.value = newWidth
    } else {
      outlineWidth.value = newWidth
    }
  }

  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const handleExportMarkdown = () => {
  const currentTab = getTabByFileId(currentFileId.value)
  if (!currentTab || !currentTab.vditorInstance) return

  const content = currentTab.vditorInstance.getValue()
  const fileName = currentTab.name || 'document'
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const handleExportPdf = () => {
  const currentTab = getTabByFileId(currentFileId.value)
  if (!currentTab || !currentTab.vditorInstance) return

  const previewElement = currentTab.vditorInstance.vditor.element.querySelector('.vditor-preview')
  if (!previewElement) return

  const originalDisplay = previewElement.style.display
  const originalVisibility = previewElement.style.visibility

  previewElement.style.display = 'block'
  previewElement.style.visibility = 'visible'

  window.print()

  setTimeout(() => {
    previewElement.style.display = originalDisplay
    previewElement.style.visibility = originalVisibility
  }, 100)
}

const handleExportHtml = () => {
  const currentTab = getTabByFileId(currentFileId.value)
  if (!currentTab || !currentTab.vditorInstance) return

  const content = currentTab.vditorInstance.getHTML()
  const fileName = currentTab.name || 'document'
  
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
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a;
        color: #e0e0e0;
      }
    }
  </style>
</head>
<body>
  <div class="vditor-reset">
    ${content}
  </div>
</body>
</html>`

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  const lockScroll = (e) => {
    if (e.target.scrollTop !== 0 || e.target.scrollLeft !== 0) {
      e.target.scrollTop = 0
      e.target.scrollLeft = 0
    }
  }

  const editorContainer = document.getElementById('editor-container')
  if (editorContainer) {
    editorContainer.addEventListener('scroll', lockScroll)
  }

  const editorArea = document.querySelector('.editor-area')
  if (editorArea) {
    editorArea.addEventListener('scroll', lockScroll)
  }
})
</script>

<style scoped>
.workspace-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.mobile-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99;
  backdrop-filter: blur(2px);
}
</style>
