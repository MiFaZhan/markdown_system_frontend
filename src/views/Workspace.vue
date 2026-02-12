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
      @create="handleCreate"
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
      :content-search-keyword="contentSearchKeyword"
      :content-search-results="contentSearchResults"
      :outline="outline"
      :current-file="currentFile"
      @update:content-search-keyword="contentSearchKeyword = $event"
      @set-mode="setSidePanelMode"
      @search-content="searchInContent"
      @jump-to-search="jumpToSearchResult"
      @jump-to-heading="scrollToHeading"
      @start-resize="startResize"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useFilesStore } from '../stores/files'
import { useProjectsStore } from '../stores/projects'
import FileTreePanel from '../components/workspace/FileTreePanel.vue'
import EditorPanel from '../components/workspace/EditorPanel.vue'
import SidePanel from '../components/workspace/SidePanel.vue'
import { useResponsive } from '../composables/useResponsive'
import { useFileTree } from '../composables/useFileTree'
import { useTabs } from '../composables/useTabs'
import { useEditor } from '../composables/useEditor'
import { useFileOperations } from '../composables/useFileOperations'

const route = useRoute()
const router = useRouter()
const filesStore = useFilesStore()
const projectsStore = useProjectsStore()

const fileTreePanelRef = ref(null)

const showSidebar = ref(true)
const showOutline = ref(true)
const sidebarWidth = ref(260)
const outlineWidth = ref(400)
const currentFileId = ref(null)

const { isMobile } = useResponsive({ sidebar: showSidebar, outline: showOutline })

const {
  treeRef,
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

const { handleCreate, handleDelete, handleRename, allowDrop, allowDrag, handleDrop } = useFileOperations({
  onRefresh: loadNodeTree
})

const currentFile = computed(() => {
  if (!currentFileId.value) return null
  return findFileById(fileTree.value, currentFileId.value)
})

const sidePanelMode = ref('none')
const contentSearchKeyword = ref('')
const contentSearchResults = ref([])
const outline = ref([])

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

const { openTabs, activeTabIndex, openTab, switchTab, reorderTabs, closeTab, closeOthers, closeAllTabs, getTabByFileId } = useTabs({
  onSwitch: handleTabSwitch,
  onSave: null
})

const { initVditor, updateSaveStatus, loadFileContent, debouncedSave } = useEditor({
  onContentChange: handleContentChange,
  onAfterInit: handleEditorInit,
  onOutlineUpdate: parseOutline
})

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
      
      const targetScrollTop = currentScrollTop + (elRect.top - containerRect.top) - (scrollContainer.clientHeight / 2) + (elRect.height / 2)
      
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

const searchInContent = () => {
  const keyword = contentSearchKeyword.value.trim()
  if (!keyword) {
    contentSearchResults.value = []
    return
  }

  const currentTab = getTabByFileId(currentFileId.value)
  if (!currentTab || !currentTab.content) {
    contentSearchResults.value = []
    return
  }

  const lines = currentTab.content.split('\n')
  const results = []
  const lowerKeyword = keyword.toLowerCase()
  let matchCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().includes(lowerKeyword)) {
      results.push({
        line: i + 1,
        text: line.trim() || '(空行)',
        matchIndex: matchCount
      })
      matchCount++
    }
  }

  contentSearchResults.value = results
}

const jumpToSearchResult = (result) => {
  const currentTab = getTabByFileId(currentFileId.value)
  if (!currentTab) return

  const container = document.getElementById(currentTab.containerId)
  if (!container) return

  const irPreview = container.querySelector('.vditor-ir')
  if (!irPreview) return

  const previewContent = irPreview.querySelector('.vditor-reset')
  if (!previewContent) return

  const keyword = contentSearchKeyword.value.trim()
  if (!keyword) return

  const targetLine = result.line
  const lowerKeyword = keyword.toLowerCase()

  const allParagraphs = previewContent.querySelectorAll('p, li, td, th, h1, h2, h3, h4, h5, h6, pre, code')
  let targetElement = null
  let currentLineNumber = 1

  for (const para of allParagraphs) {
    const textContent = para.textContent
    const lineCount = textContent ? textContent.split('\n').length : 1

    if (currentLineNumber <= targetLine && currentLineNumber + lineCount - 1 >= targetLine) {
      targetElement = para
      break
    }

    currentLineNumber += lineCount
  }

  if (!targetElement) {
    const allElements = previewContent.querySelectorAll('*')
    for (const el of allElements) {
      if (el.textContent.trim() === result.text.trim() || el.textContent.includes(result.text)) {
        targetElement = el
        break
      }
    }
  }

  if (!targetElement) {
    return
  }

  const walker = document.createTreeWalker(
    targetElement,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )

  let foundNode = null
  let foundStart = 0
  let foundEnd = 0

  while (walker.nextNode()) {
    const node = walker.currentNode
    const text = node.textContent
    const lowerText = text.toLowerCase()

    if (lowerText.includes(lowerKeyword)) {
      foundNode = node
      foundStart = lowerText.indexOf(lowerKeyword)
      foundEnd = foundStart + keyword.length
      break
    }
  }

  if (!foundNode) {
    const allTextNodes = []
    const textWalker = document.createTreeWalker(
      previewContent,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    while (textWalker.nextNode()) {
      const node = textWalker.currentNode
      if (node.textContent.toLowerCase().includes(lowerKeyword)) {
        allTextNodes.push(node)
      }
    }

    if (allTextNodes.length > 0) {
      const resultIndex = contentSearchResults.value.findIndex(r => r.line === result.line)
      if (resultIndex >= 0 && resultIndex < allTextNodes.length) {
        foundNode = allTextNodes[resultIndex]
        const text = foundNode.textContent
        const lowerText = text.toLowerCase()
        foundStart = lowerText.indexOf(lowerKeyword)
        foundEnd = foundStart + keyword.length
      }
    }
  }

  if (foundNode) {
    const range = document.createRange()
    range.setStart(foundNode, foundStart)
    range.setEnd(foundNode, foundEnd)

    const selection = window.getSelection()
    selection.removeAllRanges()
    selection.addRange(range)

    const parentElement = foundNode.parentElement
    if (parentElement) {
      parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const mark = document.createElement('mark')
    mark.className = 'search-match-highlight'
    mark.style.backgroundColor = '#fde047'
    mark.style.color = '#854d0e'
    mark.style.padding = '0 2px'
    mark.style.borderRadius = '2px'

    range.surroundContents(mark)

    setTimeout(() => {
      selection.removeAllRanges()
    }, 100)

    setTimeout(() => {
      if (mark.parentElement) {
        const parent = mark.parentElement
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark)
        }
        parent.removeChild(mark)
      }
    }, 3000)
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
