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
      :project-id="currentProjectId"
      @update:search-keyword="searchKeyword = $event"
      @back="goBack"
      @create="(cmd) => handleCreate(cmd, currentProjectId)"
      @select-file="selectFile"
      @node-command="handleNodeCommand"
      @drop="handleDropWrapper"
      @start-resize="startResize"
      @refresh="loadNodeTree"
    />

    <EditorPanel
      :tabs="openTabs"
      :active-index="activeTabIndex"
      :show-sidebar="showSidebar"
      :show-outline="showOutline"
      :is-mobile="isMobile"
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
      @copy-markdown="handleCopyMarkdown"
      @copy-zhihu="handleCopyZhihu"
      @copy-wechat="handleCopyWechat"
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
import { useExportAndCopy } from '../composables/useExportAndCopy'
import { usePanelResize } from '../composables/usePanelResize'
// import { useContentSearch } from '../composables/useContentSearch'

const route = useRoute()
const router = useRouter()

const fileTreePanelRef = ref(null)

const showSidebar = ref(true)
const showOutline = ref(true)
const { width: sidebarWidth, startResize: startSidebarResize } = usePanelResize({
  defaultWidth: 260,
  direction: 'left'
})
const { width: outlineWidth, startResize: startOutlineResize } = usePanelResize({
  defaultWidth: 400,
  direction: 'right'
})
const currentFileId = ref(null)

const { isMobile } = useResponsive({
  sidebar: showSidebar,
  outline: showOutline,
  sidebarWidth,
  outlineWidth
})

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

let initVditor = null

const handleTabSwitch = (result) => {
  console.log('[Outline] handleTabSwitch 被调用:', result)
  if (!result || !result.tab) {
    console.log('[Outline] handleTabSwitch 无效结果:', result)
    return
  }

  if (result.needInit && initVditor) {
    console.log('[Outline] 开始初始化 Vditor 编辑器:', result.tab.fileId)
    nextTick(() => {
      const tab = result.tab
      const vditorInstance = initVditor(tab, handleEditorInput)
      if (vditorInstance) {
        tab.vditorInstance = vditorInstance
        console.log('[Outline] Vditor 编辑器初始化完成:', result.tab.fileId)
      }
    })
  }

  currentFileId.value = result.tab.fileId
  if (result.tab.content) {
    console.log(
      '[Outline] 开始解析大纲:',
      result.tab.fileId,
      '内容长度:',
      result.tab.content?.length || 0
    )
    nextTick(() => {
      parseOutline(result.tab.content)
    })
  } else {
    console.log('[Outline] 标签页内容为空，跳过大纲解析:', result.tab.fileId)
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

const openFile = async (file) => {
  try {
    console.log('[Outline] 开始打开文件:', file.id, file.name)
    const contentData = await loadFileContent(file.id)
    console.log(
      '[Outline] 文件内容加载完成:',
      file.id,
      '内容长度:',
      contentData?.content?.length || 0
    )
    const tab = await openTab(file, contentData, currentProjectId.value)
    console.log('[Outline] 标签页已打开:', file.id, 'tab:', tab)
    currentFileId.value = file.id
  } catch (error) {
    console.error('[Outline] 打开文件失败:', file.id, error)
  }
}

const closeTabByFileId = async (fileId) => {
  const tabIndex = openTabs.value.findIndex((tab) => tab.fileId === fileId)
  if (tabIndex !== -1) {
    const result = await closeTab(tabIndex)
    if (result && result.newActiveIndex !== undefined) {
      if (result.needSwitch && result.newActiveIndex >= 0) {
        handleTabSwitch(switchTab(result.newActiveIndex))
      }
      if (result.newActiveIndex === -1) {
        currentFileId.value = null
      }
    }
  }
}

const {
  handleCreate: handleCreateFile,
  handleDelete,
  handleRename,
  allowDrop,
  allowDrag,
  handleDrop,
  handleUploadMarkdown
} = useFileOperations({
  onRefresh: loadNodeTree,
  onCloseTab: closeTabByFileId,
  onOpenFile: openFile
})

const currentFile = computed(() => {
  if (!currentFileId.value) return null
  return findFileById(fileTree.value, currentFileId.value)
})

const sidePanelMode = ref('outline')
const outline = ref([])

const currentTabContent = computed(() => {
  const currentTab = getTabByFileId(currentFileId.value)
  return currentTab?.content || ''
})

const parseOutline = (content) => {
  console.log('[Outline] parseOutline 开始解析, 内容长度:', content?.length || 0)
  if (!content) {
    console.log('[Outline] 内容为空，清空大纲')
    outline.value = []
    return
  }

  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  console.log('[Outline] 换行符标准化完成')

  const headings = []
  const lines = normalizedContent.split('\n')
  let inCodeBlock = false
  let headingCount = 0
  const failedMatches = []
  const sampleLines = lines.slice(0, 20)

  console.log('[Outline] 开始遍历内容行，总行数:', lines.length)
  console.log('[Outline] 前20行内容预览:', sampleLines)
  console.log('[Outline] 换行符检测:', JSON.stringify(content.substring(0, 100)))

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
      headingCount++
    } else if (/^\s*#+/.test(line)) {
      failedMatches.push({
        line: line,
        reason: '包含 # 但未匹配到标题格式',
        trimmed: line.trim()
      })
    }
  }

  console.log('[Outline] 大纲解析完成，找到', headingCount, '个标题')
  console.log('[Outline] 包含 # 但未匹配到的行:', failedMatches.length)
  if (failedMatches.length > 0) {
    console.log('[Outline] 未匹配到的标题行详情:', failedMatches)
  }
  console.log('[Outline] 大纲数据:', headings)
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
  console.log('[Outline] handleEditorInit 被调用, fileId:', tab?.fileId)
  nextTick(() => {
    if (tab.content) {
      console.log(
        '[Outline] 编辑器初始化完成后开始解析大纲, fileId:',
        tab.fileId,
        '内容长度:',
        tab.content?.length || 0
      )
      parseOutline(tab.content)
    } else {
      console.log('[Outline] 编辑器初始化完成但内容为空, fileId:', tab.fileId)
    }
  })
}

const handleEditorInput = (tab) => {
  debouncedSave(tab)
  updateSaveStatus(tab)
}

const handleContentChange = (tab) => {
  console.log(
    '[Outline] handleContentChange 被调用, fileId:',
    tab?.fileId,
    '内容长度:',
    tab?.content?.length || 0
  )
  parseOutline(tab.content)
}

const {
  initVditor: initVditorFn,
  updateSaveStatus,
  loadFileContent,
  debouncedSave
} = useEditor({
  onContentChange: handleContentChange,
  onAfterInit: handleEditorInit,
  onOutlineUpdate: parseOutline
})

initVditor = initVditorFn

const {
  handleExportMarkdown,
  handleExportPdf,
  handleExportHtml,
  handleCopyMarkdown,
  handleCopyZhihu,
  handleCopyWechat
} = useExportAndCopy(getTabByFileId, currentFileId)

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

const handleSwitchTab = (index) => {
  const result = switchTab(index)
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
  if (cmd === 'share') {
    fileTreePanelRef.value?.handleNodeShare(data)
  }
}

const handleDropWrapper = async (...args) => {
  const success = await handleDrop(...args)
  return success
}

const handleCreate = (cmd, projectId) => {
  if (cmd === 'upload') {
    handleUploadMarkdown(projectId)
  } else {
    handleCreateFile(cmd, projectId)
  }
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
  if (panel === 'sidebar') {
    startSidebarResize(e)
  } else {
    startOutlineResize(e)
  }
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

@media (max-width: 700px) {
  .workspace-layout.is-mobile .sidebar.mobile-sidebar,
  .workspace-layout.is-mobile .outline-panel.mobile-outline {
    width: 85% !important;
    max-width: 300px;
  }
}
</style>
