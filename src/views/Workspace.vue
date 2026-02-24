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

    <div class="mobile-actions">
      <el-tooltip content="文件树" placement="left">
        <el-button
          circle
          :icon="Folder"
          size="large"
          type="primary"
          class="mobile-action-btn"
          @click="toggleSidebar"
        />
      </el-tooltip>
      <el-tooltip content="大纲/属性" placement="left">
        <el-button
          circle
          :icon="Operation"
          size="large"
          type="primary"
          class="mobile-action-btn"
          @click="toggleOutline"
        />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Folder, Operation } from '@element-plus/icons-vue'

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
import { useThemeStore } from '../stores/theme'

const route = useRoute()
const router = useRouter()

const themeStore = useThemeStore()

const fileTreePanelRef = ref(null)

const showSidebar = ref(true)
const showOutline = ref(true)
const { width: sidebarWidth, startResize: startSidebarResize } = usePanelResize({
  defaultWidth: 260,
  direction: 'left'
})
const { width: outlineWidth, startResize: startOutlineResize } = usePanelResize({
  defaultWidth: 260,
  direction: 'right'
})
const currentFileId = ref(null)

const { isMobile } = useResponsive({
  sidebar: showSidebar,
  outline: showOutline,
  sidebarWidth,
  outlineWidth,
  defaultSidebarWidth: 260,
  defaultOutlineWidth: 260
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
  if (!result || !result.tab) {
    return
  }

  if (result.needInit && initVditor) {
    nextTick(() => {
      const tab = result.tab
      const vditorInstance = initVditor(tab, handleEditorInput)
      if (vditorInstance) {
        tab.vditorInstance = vditorInstance
      }
    })
  }

  currentFileId.value = result.tab.fileId
  if (result.tab.content) {
    nextTick(() => {
      parseOutline(result.tab.content)
    })
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
    const contentData = await loadFileContent(file.id)
    const tab = await openTab(file, contentData, currentProjectId.value)
    currentFileId.value = file.id
  } catch (error) {
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
  if (!content) {
    outline.value = []
    return
  }

  const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const headings = []
  const lines = normalizedContent.split('\n')
  let inCodeBlock = false
  let headingCount = 0
  const failedMatches = []

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

const openMobileSidebar = () => {
  showSidebar.value = true
  showOutline.value = false
}

const openMobileOutline = () => {
  showOutline.value = true
  showSidebar.value = false
}

const selectFile = async (file) => {
  currentSelectedNodeId.value = file.id

  if (isMobile.value) {
    showSidebar.value = false
  }

  await openFile(file)
}

const handleEditorInit = (tab) => {
  nextTick(() => {
    if (tab.content) {
      parseOutline(tab.content)
    }
  })
}

const handleEditorInput = (tab) => {
  debouncedSave(tab)
  updateSaveStatus(tab)
}

const handleContentChange = (tab) => {
  parseOutline(tab.content)
}

const {
  initVditor: initVditorFn,
  updateSaveStatus,
  loadFileContent,
  debouncedSave,
  updateVditorTheme
} = useEditor({
  onContentChange: handleContentChange,
  onAfterInit: handleEditorInit,
  onOutlineUpdate: parseOutline
})

initVditor = initVditorFn

watch(
  () => themeStore.getEffectiveTheme(),
  (effectiveTheme) => {
    const isDark = effectiveTheme === 'dark'
    openTabs.value.forEach((tab) => {
      if (tab.vditorInstance) {
        updateVditorTheme(tab.vditorInstance, isDark)
      }
    })
  }
)

const {
  handleExportMarkdown,
  handleExportPdf,
  handleExportHtml,
  handleCopyMarkdown,
  handleCopyZhihu,
  handleCopyWechat
} = useExportAndCopy(getTabByFileId, currentFileId)

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

.mobile-actions {
  position: absolute;
  bottom: 48px;
  right: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 80;
}

.mobile-action-btn {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-action-btn,
.mobile-action-btn .el-icon {
  width: 40px;
  height: 40px;
  line-height: 40px;
}

.mobile-action-btn .el-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-action-btn .el-icon svg {
  width: 20px;
  height: 20px;
  vertical-align: middle;
}

@media (max-width: 700px) {
  .workspace-layout.is-mobile .sidebar.mobile-sidebar,
  .workspace-layout.is-mobile .outline-panel.mobile-outline {
    width: 85% !important;
    max-width: 300px;
  }
}
</style>
