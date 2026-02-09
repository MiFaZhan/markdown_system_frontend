<template>
  <div class="workspace-layout" :class="{ 'is-mobile': isMobile }">
    <!-- 移动端遮罩层 -->
    <div
      v-if="isMobile && (showSidebar || showOutline)"
      class="mobile-overlay"
      @click="closeMobilePanels"
    ></div>

    <!-- 左侧文件列表 -->
    <aside
      v-if="showSidebar"
      class="sidebar"
      :class="{ 'mobile-sidebar': isMobile }"
      :style="{ width: sidebarWidth + 'px' }"
    >
      <div class="sidebar-header">
        <el-button :icon="Back" link @click="goBack">返回</el-button>
        <span class="project-name">{{ currentProjectName || currentProject?.name || '加载中...' }}</span>
        <el-dropdown trigger="click" @command="handleCreate">
          <el-button :icon="Plus" circle size="small" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="file" :icon="Document">新建文件</el-dropdown-item>
              <el-dropdown-item command="folder" :icon="Folder">新建文件夹</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="sidebar-search">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索..."
          :prefix-icon="Search"
          size="small"
          clearable
        />
        <div v-if="searchKeyword && filteredFileTree.length > 0" class="search-result-count">
          找到 {{ searchResultCount }} 个文件
        </div>
        <div v-else-if="searchKeyword && filteredFileTree.length === 0" class="search-result-count">
          未找到匹配的文件
        </div>
      </div>

      <div class="file-tree">
        <div v-if="fileTree.length === 0" class="empty-files">
          <el-icon :size="48" :color="'var(--el-text-color-placeholder)'"><FolderOpened /></el-icon>
          <p>暂无文件</p>
          <p class="empty-tip">点击上方 + 按钮创建文件</p>
        </div>
        <el-tree
          v-else
          ref="treeRef"
          :data="filteredFileTree"
          node-key="id"
          default-expand-all
          :props="{ label: 'name', children: 'children' }"
          highlight-current
          :current-node-key="currentSelectedNodeId"
          draggable
          :allow-drop="allowDrop"
          :allow-drag="allowDrag"
          :expand-on-click-node="false"
          @node-click="selectFile"
          @node-drop="handleDrop"
        >
          <template #default="{ node, data }">
            <div class="tree-node" :class="{ active: currentSelectedNodeId === data.id }">
              <el-icon class="node-icon">
                <Folder v-if="data.type === 'folder'" />
                <Document v-else />
              </el-icon>
              <span class="node-label">{{
                data.type === 'file' ? node.label.replace(/\.md$/, '') : node.label
              }}</span>
              <el-dropdown
                trigger="click"
                @command="(cmd) => handleNodeCommand(cmd, data)"
                @click.stop
              >
                <el-icon class="node-more"><Setting /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename">修改</el-dropdown-item>
                    <el-dropdown-item command="delete">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-tree>
      </div>

      <!-- 拖拽条 -->
      <div
        class="resize-handle resize-handle-right"
        @mousedown="startResize('sidebar', $event)"
      ></div>
    </aside>

    <!-- 中间编辑区 -->
    <main class="editor-area">
      <TabsBar
        :tabs="openTabs"
        :active-index="activeTabIndex"
        :show-sidebar="showSidebar"
        :show-outline="showOutline"
        @switch-tab="switchTab"
        @close-tab="closeTab"
        @close-others="closeOthers"
        @close-all="closeAllTabs"
        @toggle-sidebar="toggleSidebar"
        @toggle-outline="toggleOutline"
        @reorder-tabs="reorderTabs"
      />
      
      <div id="editor-container" class="editor-container">
        <div v-if="openTabs.length === 0" class="empty-state">
          <el-icon :size="64" :color="'var(--el-text-color-placeholder)'">
            <Document />
          </el-icon>
          <p>选择一个文件开始编辑</p>
        </div>
      </div>
    </main>

    <!-- 右侧大纲 -->
    <aside
      v-if="currentFile && showOutline"
      class="outline-panel"
      :class="{ 'mobile-outline': isMobile }"
      :style="{ width: outlineWidth + 'px' }"
    >
      <!-- 拖拽条 -->
      <div
        class="resize-handle resize-handle-left"
        @mousedown="startResize('outline', $event)"
      ></div>
      <div class="outline-header">大纲</div>
      <div class="outline-content">
        <OutlineTree :outline="outline" @click-heading="scrollToHeading" />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Document, Folder, Setting, Search, Back, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFilesStore } from '../stores/files'
import { useProjectsStore } from '../stores/projects'
import TabsBar from '../components/TabsBar.vue'
import OutlineTree from '../components/OutlineTree.vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { getNodeTree, createNode, updateNode, deleteNode } from '../api/nodeService'
import { getMarkdownContent, updateMarkdownContent } from '../api/contentService'
// import { contentCache } from '../utils/contentCache'

const route = useRoute()
const router = useRouter()
const filesStore = useFilesStore()
const projectsStore = useProjectsStore()

let lastWidth = window.innerWidth
let resizeTimer = null
const isMobile = ref(false)

// 响应式布局检查
const checkResponsive = (isInit = false) => {
  const width = window.innerWidth
  isMobile.value = width < 700

  // 大纲自动隐藏阈值 (1000px)
  if (width < 1000) {
    if (isInit || (lastWidth >= 1000 && showOutline.value)) {
      showOutline.value = false
    }
  }

  // 侧边栏自动隐藏阈值 (700px)
  if (width < 700) {
    if (isInit || (lastWidth >= 700 && showSidebar.value)) {
      showSidebar.value = false
    }
  }

  lastWidth = width
}

const handleResize = () => {
  // 使用 requestAnimationFrame 简单的节流
  if (resizeTimer) return
  resizeTimer = requestAnimationFrame(() => {
    checkResponsive(false)
    resizeTimer = null
  })
}

// 初始化项目
onMounted(() => {
  // 响应式布局初始化
  checkResponsive(true)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll-to-heading', handleScrollToHeading)

  // 防止编辑器容器被意外滚动
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

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll-to-heading', handleScrollToHeading)
  if (resizeTimer) {
    cancelAnimationFrame(resizeTimer)
  }
})

const currentProject = computed(() => projectsStore.currentProject())

const treeRef = ref(null)

const openTabs = ref([])
const activeTabIndex = ref(-1)

let saveTimers = {}

// 当前选中的文件ID
const currentFileId = ref(null)

// 从文件树中查找文件对象
const findFileById = (fileList, id) => {
  for (const file of fileList) {
    if (file.id === id) return file
    if (file.children) {
      const found = findFileById(file.children, id)
      if (found) return found
    }
  }
  return null
}

const currentFile = computed(() => {
  if (!currentFileId.value) return null
  return findFileById(fileTree.value, currentFileId.value)
})

const currentSelectedNodeId = ref(null)

// 文件树数据
const fileTree = ref([])
const loading = ref(false)

// 过滤后的文件树
const filteredFileTree = computed(() => {
  return filterFileTree(fileTree.value, searchKeyword.value)
})

// 搜索结果统计
const searchResultCount = computed(() => {
  if (!searchKeyword.value) return 0

  const countNodes = (nodes) => {
    let count = 0
    for (const node of nodes) {
      if (node.type === 'file' && node.name.toLowerCase().includes(searchKeyword.value.toLowerCase())) {
        count++
      }
      if (node.children) {
        count += countNodes(node.children)
      }
    }
    return count
  }

  return countNodes(filteredFileTree.value)
})

// 当前项目名称（从节点树API获取）
const currentProjectName = ref('')

// 当前项目ID（从store获取）
const currentProjectId = computed(() => projectsStore.currentProjectId)

// 转换后端节点树格式为前端文件树格式
const convertNodeTreeToFileTree = (nodeTreeResponse) => {
  if (!nodeTreeResponse || !nodeTreeResponse.rootNodes) return []
  
  const convertNodeItem = (nodeItem) => ({
    id: nodeItem.nodeId,
    parentId: nodeItem.parentId,
    name: nodeItem.nodeName,
    type: nodeItem.nodeType === 0 ? 'folder' : 'file',
    updateTime: nodeItem.updateTime,
    creationTime: nodeItem.creationTime,
    children: nodeItem.children?.map(convertNodeItem) || []
  })
  
  return nodeTreeResponse.rootNodes.map(convertNodeItem)
}

// 加载项目节点树
const loadNodeTree = async () => {
  console.log('开始加载节点树，当前项目ID:', currentProjectId.value)
  
  if (!currentProjectId.value) {
    console.warn('项目ID为空，无法加载节点树')
    return
  }
  
  try {
    loading.value = true
    console.log('调用 getNodeTree API，项目ID:', currentProjectId.value)
    const treeResponse = await getNodeTree(currentProjectId.value)
    console.log('获取到的节点树响应:', treeResponse)
    
    // 提取项目名称
    if (treeResponse.projectName) {
      currentProjectName.value = treeResponse.projectName
      console.log('设置项目名称:', treeResponse.projectName)
    }
    
    // 转换数据格式以适配前端组件
    fileTree.value = convertNodeTreeToFileTree(treeResponse)
    console.log('转换后的文件树:', fileTree.value)
    
    // 显示统计信息
    if (treeResponse.totalNodes > 0) {
      console.log(`项目统计: 总节点${treeResponse.totalNodes}个, 文件${treeResponse.fileCount}个, 文件夹${treeResponse.folderCount}个`)
    } else {
      console.log('项目为空，没有节点')
    }
  } catch (error) {
    console.error('加载节点树失败:', error)
    ElMessage.error('加载文件树失败')
  } finally {
    loading.value = false
  }
}

// 监听路由变化，处理项目切换
watch(() => route.params.projectId, async (newProjectId) => {
  if (newProjectId) {
    console.log('路由项目ID:', newProjectId)
    
    currentFileId.value = null
    currentSelectedNodeId.value = null
    currentProjectName.value = ''
    
    const projectId = parseInt(newProjectId)
    projectsStore.setCurrentProject(projectId)
    console.log('设置当前项目ID:', projectId)
    
    await nextTick()
    
    await loadNodeTree()
  }
}, { immediate: true })

// 大纲数据
const outline = ref([])
const showOutline = ref(true)
const showSidebar = ref(true)

// 切换大纲显示
const toggleOutline = () => {
  showOutline.value = !showOutline.value
  if (isMobile.value && showOutline.value) {
    showSidebar.value = false // 移动端互斥显示
  }
}

// 切换侧边栏显示
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
  if (isMobile.value && showSidebar.value) {
    showOutline.value = false // 移动端互斥显示
  }
}

// 搜索
const searchKeyword = ref('')

// 递归过滤文件树
const filterFileTree = (nodes, keyword) => {
  if (!keyword) return nodes

  const lowerKeyword = keyword.toLowerCase()

  const filterNode = (node) => {
    const nodeName = node.name.toLowerCase()
    const nameMatches = nodeName.includes(lowerKeyword)

    // 递归过滤子节点
    const filteredChildren = node.children
      ? node.children.map(filterNode).filter(Boolean)
      : []

    // 如果当前节点匹配，或者有匹配的子节点，则保留
    if (nameMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren
      }
    }

    return null
  }

  return nodes.map(filterNode).filter(Boolean)
}

// 面板宽度
const sidebarWidth = ref(260)
const outlineWidth = ref(200)

// 关闭移动端面板
const closeMobilePanels = () => {
  showSidebar.value = false
  showOutline.value = false
}

// 返回项目列表
const goBack = () => {
  router.push('/')
}

// 拖拽调节宽度
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

// 选择文件
const selectFile = (file) => {
  currentSelectedNodeId.value = file.id
  
  if (file.type !== 'folder') {
    openFile(file)
    if (isMobile.value) {
      showSidebar.value = false
    }
  }
}

const openFile = async (file) => {
  console.log('打开文件:', file.name, 'ID:', file.id)
  
  const existingIndex = openTabs.value.findIndex(tab => tab.fileId === file.id)
  if (existingIndex !== -1) {
    console.log('文件已打开，切换到标签:', existingIndex)
    switchTab(existingIndex)
    return
  }
  
  if (openTabs.value.length >= 10) {
    ElMessage.warning('最多同时打开 10 个标签')
    return
  }
  
  const loadingMessage = ElMessage({
    message: '正在加载文件...',
    type: 'info',
    duration: 0
  })
  
  try {
    const contentData = await getMarkdownContent(file.id)
    console.log('文件内容加载成功，version:', contentData.version)
    
    const newTab = {
      fileId: file.id,
      fileName: file.name,
      content: contentData.content || '',
      version: contentData.version,
      vditorInstance: null,
      containerId: `vditor-${file.id}`,
      isInitialized: false,
      isDirty: false,
      lastSavedContent: contentData.content || '',
      isSaving: false,
      saveStatusElement: null
    }
    
    openTabs.value.push(newTab)
    console.log('创建新标签，当前标签数:', openTabs.value.length)
    
    await nextTick()
    switchTab(openTabs.value.length - 1)
    
    loadingMessage.close()
    
  } catch (error) {
    loadingMessage.close()
    console.error('加载文件失败:', error)
    ElMessage.error('加载文件失败: ' + error.message)
  }
}

const switchTab = (index) => {
  if (index < 0 || index >= openTabs.value.length) {
    console.warn('无效的标签索引:', index)
    return
  }
  if (index === activeTabIndex.value) {
    console.log('已经是当前标签')
    return
  }
  
  console.log('切换标签:', activeTabIndex.value, '->', index)
  
  if (activeTabIndex.value >= 0) {
    const currentTab = openTabs.value[activeTabIndex.value]
    if (currentTab?.vditorInstance) {
      const currentContainer = document.getElementById(currentTab.containerId)
      if (currentContainer) {
        currentContainer.style.display = 'none'
        console.log('隐藏标签:', activeTabIndex.value)
      }
    }
  }
  
  activeTabIndex.value = index
  const targetTab = openTabs.value[index]
  console.log('目标标签:', targetTab.fileName, '已初始化:', targetTab.isInitialized)
  
  if (!targetTab.isInitialized) {
    nextTick(() => {
      initVditorForTab(index)
    })
  } else {
    const targetContainer = document.getElementById(targetTab.containerId)
    if (targetContainer) {
      targetContainer.style.display = 'block'
      console.log('显示标签:', index)
    }
    
    parseOutline(targetTab.content)
  }
  
  currentFileId.value = targetTab.fileId
}

const reorderTabs = ({ fromIndex, toIndex }) => {
  console.log('重新排序标签:', fromIndex, '->', toIndex)
  
  if (fromIndex === toIndex) return
  
  const movedTab = openTabs.value.splice(fromIndex, 1)[0]
  openTabs.value.splice(toIndex, 0, movedTab)
  
  if (activeTabIndex.value === fromIndex) {
    activeTabIndex.value = toIndex
  } else if (fromIndex < activeTabIndex.value && toIndex >= activeTabIndex.value) {
    activeTabIndex.value--
  } else if (fromIndex > activeTabIndex.value && toIndex <= activeTabIndex.value) {
    activeTabIndex.value++
  }
  
  console.log('排序完成，新 activeIndex:', activeTabIndex.value)
}

const initVditorForTab = (tabIndex) => {
  const tab = openTabs.value[tabIndex]
  console.log('初始化 vditor，标签:', tabIndex, '文件:', tab.fileName)
  
  const editorContainer = document.getElementById('editor-container')
  if (!editorContainer) {
    console.error('找不到编辑器容器 #editor-container')
    ElMessage.error('编辑器容器不存在')
    return
  }
  
  const container = document.createElement('div')
  container.id = tab.containerId
  container.className = 'vditor-wrapper'
  container.style.height = '100%'
  container.style.display = 'block'
  editorContainer.appendChild(container)
  
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  try {
    tab.vditorInstance = new Vditor(tab.containerId, {
      height: '100%',
      width: '100%',
      mode: 'ir',
      placeholder: '开始写作...',
      theme: isDark ? 'dark' : 'classic',
      preview: {
        theme: {
          current: isDark ? 'dark' : 'light',
          path: 'https://unpkg.com/vditor/dist/css/content-theme'
        },
        hljs: {
          style: isDark ? 'native' : 'github'
        }
      },
      cache: {
        enable: false
      },
      typewriterMode: true,
      toolbarConfig: {
        pin: true
      },
      toolbar: [
        'headings', 'bold', 'italic', 'strike', 'link', '|',
        'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
        'quote', 'line', 'code', 'inline-code', '|',
        'upload', 'table', '|',
        'undo', 'redo', '|',
        'preview', 'fullscreen'
      ],
      outline: {
        enable: false
      },
      value: tab.content,
      input: (value) => {
        tab.content = value
        tab.isDirty = value !== tab.lastSavedContent
        
        parseOutline(value)
        
        updateSaveStatus(tab.fileId)
        
        debouncedSave(tab.fileId)
      },
      after: () => {
        console.log('vditor 初始化完成，标签:', tabIndex)
        tab.isInitialized = true
        
        nextTick(() => {
          injectSaveStatus(tab.fileId)
        })
        
        parseOutline(tab.content)
      }
    })
  } catch (error) {
    console.error('vditor 初始化失败:', error)
    ElMessage.error('编辑器初始化失败')
  }
}

const debouncedSave = (fileId) => {
  // 查找 tab 对象
  const tab = openTabs.value.find(t => t.fileId === fileId)
  if (!tab) return
  
  if (saveTimers[fileId]) {
    clearTimeout(saveTimers[fileId])
  }
  
  saveTimers[fileId] = setTimeout(() => {
    saveTab(fileId)
  }, 1000)
}

const saveTab = async (fileId) => {
  const tab = openTabs.value.find(t => t.fileId === fileId)
  if (!tab) return
  
  if (!tab.isDirty || tab.isSaving) {
    console.log('跳过保存，isDirty:', tab.isDirty, 'isSaving:', tab.isSaving)
    return
  }
  
  console.log('保存文件:', tab.fileName, 'ID:', fileId, 'version:', tab.version)
  
  try {
    tab.isSaving = true
    updateSaveStatus(fileId)
    
    const result = await updateMarkdownContent(
      tab.fileId,
      tab.content,
      tab.version
    )
    
    console.log('保存成功，新版本:', result.version)
    
    tab.version = result.version
    tab.lastSavedContent = tab.content
    tab.isDirty = false
    
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    tab.isSaving = false
    updateSaveStatus(fileId)
  }
}

const closeTab = async (index) => {
  const tab = openTabs.value[index]
  console.log('关闭标签:', index, '文件:', tab.fileName, 'isDirty:', tab.isDirty)
  
  if (tab.isDirty) {
    try {
      await ElMessageBox.confirm(
        `文件 "${tab.fileName}" 有未保存的修改，确定要关闭吗？`,
        '提示',
        {
          confirmButtonText: '关闭',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      console.log('用户取消关闭')
      return
    }
  }
  
  if (tab.vditorInstance) {
    try {
      tab.vditorInstance.destroy()
      console.log('vditor 实例已销毁')
    } catch (error) {
      console.warn('销毁 vditor 失败:', error)
    }
  }
  
  const container = document.getElementById(tab.containerId)
  if (container) {
    container.remove()
    console.log('DOM 容器已移除')
  }
  
  if (saveTimers[tab.fileId]) {
    clearTimeout(saveTimers[tab.fileId])
    delete saveTimers[tab.fileId]
    console.log('保存定时器已清除')
  }
  
  openTabs.value.splice(index, 1)
  console.log('标签已移除，剩余标签数:', openTabs.value.length)
  
  if (openTabs.value.length === 0) {
    activeTabIndex.value = -1
    currentFileId.value = null
    console.log('所有标签已关闭')
  } else if (index < activeTabIndex.value) {
    activeTabIndex.value--
    console.log('调整激活索引:', activeTabIndex.value)
  } else if (index === activeTabIndex.value) {
    if (index >= openTabs.value.length) {
      activeTabIndex.value = openTabs.value.length - 1
    }
    console.log('切换到标签:', activeTabIndex.value)
    switchTab(activeTabIndex.value)
  }
}

const closeOthers = async (exceptIndex) => {
  const tabsToClose = openTabs.value
    .map((tab, index) => ({ tab, index }))
    .filter(({ index }) => index !== exceptIndex)
  
  console.log('准备关闭其他标签，数量:', tabsToClose.length)
  
  for (const { tab, index } of tabsToClose) {
    if (tab.isDirty) {
      try {
        await ElMessageBox.confirm(
          `文件 "${tab.fileName}" 有未保存的修改，确定要关闭吗？`,
          '提示',
          {
            confirmButtonText: '关闭',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch {
        console.log('用户取消关闭:', tab.fileName)
        continue
      }
    }
    
    if (tab.vditorInstance) {
      try {
        tab.vditorInstance.destroy()
      } catch (error) {
        console.warn('销毁 vditor 失败:', error)
      }
    }
    
    const container = document.getElementById(tab.containerId)
    if (container) {
      container.remove()
    }
    
    if (saveTimers[tab.fileId]) {
      clearTimeout(saveTimers[tab.fileId])
      delete saveTimers[tab.fileId]
    }
  }
  
  const exceptTab = openTabs.value[exceptIndex]
  openTabs.value = [exceptTab]
  activeTabIndex.value = 0
  currentFileId.value = exceptTab.fileId
  
  console.log('关闭其他标签完成')
}

const closeAllTabs = async () => {
  const tabsToClose = [...openTabs.value]
  console.log('准备关闭所有标签，数量:', tabsToClose.length)
  
  for (const tab of tabsToClose) {
    if (tab.isDirty) {
      try {
        await ElMessageBox.confirm(
          `文件 "${tab.fileName}" 有未保存的修改，确定要关闭吗？`,
          '提示',
          {
            confirmButtonText: '关闭',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch {
        console.log('用户取消关闭:', tab.fileName)
        continue
      }
    }
    
    if (tab.vditorInstance) {
      try {
        tab.vditorInstance.destroy()
      } catch (error) {
        console.warn('销毁 vditor 失败:', error)
      }
    }
    
    const container = document.getElementById(tab.containerId)
    if (container) {
      container.remove()
    }
    
    if (saveTimers[tab.fileId]) {
      clearTimeout(saveTimers[tab.fileId])
      delete saveTimers[tab.fileId]
    }
  }
  
  openTabs.value = []
  activeTabIndex.value = -1
  currentFileId.value = null
  
  console.log('关闭所有标签完成')
}

const injectSaveStatus = (fileId) => {
  const tab = openTabs.value.find(t => t.fileId === fileId)
  if (!tab) return
  
  const container = document.getElementById(tab.containerId)
  if (!container) {
    console.warn('找不到容器:', tab.containerId)
    return
  }
  
  const toolbar = container.querySelector('.vditor-toolbar')
  if (!toolbar) {
    console.warn('找不到工具栏')
    return
  }
  
  if (tab.saveStatusElement) {
    console.log('保存状态已注入')
    return
  }
  
  const saveStatus = document.createElement('div')
  saveStatus.className = 'vditor-toolbar__item vditor-toolbar__save-status'
  saveStatus.innerHTML = `
    <span class="save-status-text saved">
      已保存
    </span>
  `
  
  toolbar.appendChild(saveStatus)
  
  tab.saveStatusElement = saveStatus
  console.log('保存状态已注入到工具栏')
}

const updateSaveStatus = (fileId) => {
  const tab = openTabs.value.find(t => t.fileId === fileId)
  if (!tab || !tab.saveStatusElement) return
  
  const textEl = tab.saveStatusElement.querySelector('.save-status-text')
  if (!textEl) return
  
  if (tab.isSaving) {
    textEl.innerHTML = `
      <svg class="save-status-icon rotating" style="width: 14px; height: 14px;">
        <use xlink:href="#vditor-icon-refresh"></use>
      </svg>
      保存中
    `
    textEl.className = 'save-status-text saving'
  } else if (tab.isDirty) {
    textEl.innerHTML = '未保存'
    textEl.className = 'save-status-text unsaved'
  } else {
    textEl.innerHTML = '已保存'
    textEl.className = 'save-status-text saved'
  }
}

// 拖拽放置限制
const allowDrop = (draggingNode, dropNode, type) => {
  // 不能拖拽到自己
  if (draggingNode.data.id === dropNode.data.id) {
    return false
  }
  
  // 检查是否拖拽到自己的子节点中
  const isDescendant = (parent, child) => {
    if (!parent.childNodes) return false
    for (const node of parent.childNodes) {
      if (node.data.id === child.data.id) {
        return true
      }
      if (isDescendant(node, child)) {
        return true
      }
    }
    return false
  }
  
  if (isDescendant(draggingNode, dropNode)) {
    return false
  }
  
  // type 为 'inner' 时，目标必须是文件夹
  if (type === 'inner') {
    return dropNode.data.type === 'folder'
  }
  
  // before/after 类型允许（可以拖到同级位置）
  return true
}

// 拖拽限制：所有节点都可以被拖拽
const allowDrag = (draggingNode) => {
  return true
}

// 处理拖拽放置
const handleDrop = async (draggingNode, dropNode, dropType) => {
  console.log('拖拽完成:', {
    draggingNodeId: draggingNode.data.id,
    dropNodeId: dropNode.data.id,
    dropType
  })
  
  let parentId
  
  if (dropType === 'inner') {
    // 拖到文件夹内部，目标必须是文件夹
    if (dropNode.data.type !== 'folder') {
      ElMessage.warning('只能拖到文件夹中')
      return
    }
    parentId = dropNode.data.id
  } else if (dropType === 'before' || dropType === 'after') {
    // 拖到同级位置，使用目标节点的 parentId
    parentId = dropNode.data.parentId
    if (parentId === null) {
      parentId = 0 // 根目录使用 0
    }
  } else {
    console.warn('不支持的拖拽类型:', dropType)
    return
  }
  
  try {
    const nodeData = {
      nodeId: draggingNode.data.id,
      parentId: parentId,
      nodeName: draggingNode.data.name
    }
    
    await updateNode(nodeData)
    console.log('更新节点位置成功')
    
    // 重新加载文件树
    await loadNodeTree()
    
    ElMessage.success('移动成功')
  } catch (error) {
    console.error('移动节点失败:', error)
    ElMessage.error('移动失败')
  }
}

// 新建文件
const handleCreate = async (command) => {
  if (!currentProjectId.value) {
    ElMessage.error('项目ID不存在，无法创建文件')
    return
  }

  if (command === 'file') {
    ElMessageBox.prompt('请输入文件名', '新建文件', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '文件名不能为空'
    })
      .then(async ({ value }) => {
        try {
          const fileName = value.endsWith('.md') ? value : `${value}.md`
          const nodeData = {
            projectId: currentProjectId.value,
            parentId: 0, // 0表示根目录
            nodeType: 1, // 文件
            nodeName: fileName
          }
          
          await createNode(nodeData)
          console.log('创建文件成功')
          
          await loadNodeTree()
          ElMessage.success('文件创建成功')
        } catch (error) {
          console.error('创建文件失败:', error)
          ElMessage.error('创建文件失败')
        }
      })
      .catch(() => {})
  } else if (command === 'folder') {
    ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '文件夹名称不能为空'
    })
      .then(async ({ value }) => {
        try {
          const nodeData = {
            projectId: currentProjectId.value,
            parentId: 0, // 0表示根目录
            nodeType: 0, // 文件夹
            nodeName: value
          }
          
          await createNode(nodeData)
          console.log('创建文件夹成功')
          
          await loadNodeTree()
          ElMessage.success('文件夹创建成功')
        } catch (error) {
          console.error('创建文件夹失败:', error)
          ElMessage.error('创建文件夹失败')
        }
      })
      .catch(() => {})
  }
}

// 删除文件
const handleDelete = async (file) => {
  const msg = file.type === 'folder' ? '确定要删除该文件夹及其所有内容吗?' : '确定要删除该文件吗?'
  ElMessageBox.confirm(msg, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
        try {
          if (currentFileId.value === file.id) {
            currentFileId.value = null
          }
          if (currentSelectedNodeId.value === file.id) {
            currentSelectedNodeId.value = null
          }
          
          await deleteNode(file.id)
          console.log('删除成功')
          
          await loadNodeTree()
          ElMessage.success('删除成功')
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

// 重命名
const handleRename = async (file) => {
  const title = '重命名'
  const placeholder = file.type === 'folder' ? '新的文件夹名称' : '新的文件名'
  ElMessageBox.prompt('', title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: placeholder,
    inputValue: file.type === 'file' ? file.name.replace(/\.md$/, '') : file.name,
    inputPattern: /\S+/,
    inputErrorMessage: '名称不能为空'
  })
    .then(async ({ value }) => {
      try {
        let newName = value.trim()
        if (file.type === 'file') {
          newName = `${newName.replace(/\.md$/i, '')}.md`
        }
        
        const nodeData = {
          nodeId: file.id,
          nodeName: newName
        }
        
        await updateNode(nodeData)
        console.log('重命名成功')
        
        await loadNodeTree()
        ElMessage.success('重命名成功')
      } catch (error) {
        console.error('重命名失败:', error)
        ElMessage.error('重命名失败')
      }
    })
    .catch(() => {})
}

const handleNodeCommand = (cmd, data) => {
  if (cmd === 'rename') return handleRename(data)
  if (cmd === 'delete') return handleDelete(data)
}

// 解析大纲
const parseOutline = (content) => {
  if (!content) {
    updateOutline([])
    return
  }
  
  const headings = []
  const lines = content.split('\n')
  let inCodeBlock = false

  for (const line of lines) {
    // 检测代码块标记
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inCodeBlock = !inCodeBlock
      continue
    }

    // 如果在代码块中，跳过解析
    if (inCodeBlock) {
      continue
    }

    // 匹配标题，允许前面有空格
    const match = line.match(/^\s*(#{1,6})\s+(.+)$/)
    if (match) {
      let text = match[2].trim()

      // 清理常见的 Markdown 标记，只保留纯文本
      text = text
        .replace(/\*\*(.*?)\*\*/g, '$1') // 粗体
        .replace(/\*(.*?)\*/g, '$1')     // 斜体
        .replace(/`(.*?)`/g, '$1')       // 行内代码
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 链接
        .replace(/!\[(.*?)\]\(.*?\)/g, '')  // 图片
        .replace(/~~(.*?)~~/g, '$1')     // 删除线

      headings.push({
        level: match[1].length,
        text: text
      })
    }
  }
  updateOutline(headings)
}

// 更新大纲
const updateOutline = (headings) => {
  outline.value = headings
}

// 跳转到标题
const scrollToHeading = (heading) => {
  window.dispatchEvent(new CustomEvent('scroll-to-heading', { detail: heading }))
  if (isMobile.value) {
    showOutline.value = false
  }
}

// 高亮标题元素
const highlightHeading = (el) => {
  document.querySelectorAll('.heading-highlight').forEach((e) => {
    e.classList.remove('heading-highlight')
  })
  el.classList.add('heading-highlight')
  setTimeout(() => {
    el.classList.remove('heading-highlight')
  }, 2000)
}

// 监听滚动到标题事件
const handleScrollToHeading = (e) => {
  const heading = e.detail
  if (!heading) return

  // 获取当前激活的标签
  const currentTab = openTabs.value[activeTabIndex.value]
  if (!currentTab) return
  
  const container = document.getElementById(currentTab.containerId)
  if (!container) return

  // 动态查找最近的可滚动祖先容器
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
  
  // 滚动辅助函数
  const scrollToElement = (el) => {
    // 从目标元素向上查找滚动容器
    const scrollContainer = getScrollParent(el)
    
    if (scrollContainer) {
      // 计算相对位置进行滚动，避免使用 scrollIntoView 导致外层容器(如工具栏)被滚出视口
      const elRect = el.getBoundingClientRect()
      const containerRect = scrollContainer.getBoundingClientRect()
      const currentScrollTop = scrollContainer.scrollTop
      
      // 目标位置 = 当前滚动位置 + (元素相对视口顶部 - 容器相对视口顶部) - (容器高度/2 - 元素高度/2)
      // 这样可以将元素居中显示
      const targetScrollTop = currentScrollTop + (elRect.top - containerRect.top) - (scrollContainer.clientHeight / 2) + (elRect.height / 2)
      
      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
    } else {
      // 回退方案
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    highlightHeading(el)
  }

  // 查找所有标题元素
  // 优先精确查找
  const headingTag = `h${heading.level}`
  const headings = container.querySelectorAll(`.vditor-ir .vditor-reset ${headingTag}`)

  for (const el of headings) {
    // 移除 markdown 标记符号获取纯文本进行比较
    const textContent = el.textContent.replace(/^#+\s*/, '').trim()
    if (textContent === heading.text) {
      scrollToElement(el)
      return
    }
  }
  
  // 备用方案：查找所有标题
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
</script>

<style scoped>
.workspace-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.page-loading {
  flex: 1;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 左侧边栏 */
.sidebar {
  position: relative;
  background: var(--color-background);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
}

.mobile-sidebar {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  height: 100%;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
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

/* 拖拽条 */
.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
}

.resize-handle:hover {
  background: var(--el-color-primary);
}

.resize-handle-right {
  right: -2px;
}

.resize-handle-left {
  left: -2px;
}

.sidebar-header {
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);
}

.project-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-search {
  padding: 12px;
}

.search-result-count {
  margin-top: 8px;
  padding: 4px 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.empty-files {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--el-text-color-placeholder);
}

.empty-files p {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.empty-tip {
  font-size: 12px !important;
  opacity: 0.8;
}

.tree-node {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 8px;
  border-radius: 4px;
}

.tree-node:hover {
  background: var(--el-color-primary-light-9);
}

.tree-node:hover:not(.active) {
  background: var(--color-background-mute);
}

.tree-node.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

/* Dark Reader 风格深色模式 */
@media (prefers-color-scheme: dark) {
  .tree-node.active {
    background: rgba(64, 158, 255, 0.12);
    color: var(--el-color-primary-light-3);
  }

  .tree-node:hover:not(.active) {
    background: rgba(255, 255, 255, 0.05);
  }

  .node-icon {
    color: var(--dr-text-muted, #8a8785);
  }

  .node-more {
    color: var(--dr-text-muted, #8a8785);
  }

  .empty-state {
    color: var(--dr-text-muted, #8a8785);
  }
}

.node-icon {
  margin-right: 6px;
  color: var(--el-text-color-placeholder);
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.node-more {
  opacity: 0;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
}

.tree-node:hover .node-more {
  opacity: 1;
}

/* 移动端始终显示齿轮按钮，避免 hover 不可用 */
.is-mobile .node-more {
  opacity: 1;
}

/* 中间编辑区 */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-background);
}

#editor-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.vditor-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.empty-state p {
  margin-top: 16px;
  font-size: 14px;
}

/* 右侧大纲 */
.outline-panel {
  position: relative;
  background: var(--color-background);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 覆盖样式，确保移动端模式下是 absolute */
.outline-panel.mobile-outline {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  height: 100%;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  border-left: none !important;
}

.outline-header {
  height: 40px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
}

.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
</style>

<style>
.vditor-toolbar__save-status {
  position: absolute !important;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  margin: 0 !important;
  padding: 0 !important;
}

.save-status-text {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.save-status-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.save-status-text.saved {
  color: var(--el-color-success);
}

.save-status-text.unsaved {
  color: var(--el-text-color-secondary);
}

.save-status-text.saving {
  color: var(--el-color-primary);
}

.rotating {
  animation: rotating 1s linear infinite;
}

@keyframes rotating {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Vditor 工具栏居中 */
.vditor-toolbar {
  display: flex !important;
  justify-content: center !important;
  flex-wrap: wrap !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  position: relative !important;
}

/* 强制重置 pre 样式，避免全局样式干扰 Vditor */
.vditor-reset pre {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  font-family: Consolas, "Courier New", monospace !important;
}

.vditor-wrapper .vditor {
  height: 100% !important;
}

/* 确保内容区域撑满并处理滚动 */
.vditor-content {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.vditor-ir {
  flex: 1 !important;
  height: auto !important;
  overflow: auto !important;
}

/* 禁用 Vditor 聚焦时的背景色变化 */
.vditor,
.vditor-reset,
.vditor-ir,
.vditor-ir .vditor-reset,
.vditor .vditor-content,
.vditor-content {
  background-color: var(--color-background) !important;
  transition: none !important;
}

.vditor-ir:focus,
.vditor-ir:focus-within,
.vditor-reset:focus,
.vditor-reset:focus-within {
  background-color: var(--color-background) !important;
}

/* 深色模式 */
.vditor--dark,
.vditor--dark .vditor-reset,
.vditor--dark .vditor-ir,
.vditor--dark .vditor-content {
  background-color: var(--color-background) !important;
}

/* 标题高亮效果 */
.heading-highlight {
  background-color: var(--el-color-primary-light-8) !important;
  border-radius: 4px;
  transition: background-color 0.3s ease;
  padding: 2px 4px;
  margin: 0 -4px;
}

/* 深色模式下的高亮 - Dark Reader 风格 */
@media (prefers-color-scheme: dark) {
  .heading-highlight {
    background-color: rgba(92, 154, 255, 0.25) !important;
  }

  /* Vditor Dark Reader 风格适配 */
  .vditor--dark {
    --panel-background-color: #1e2021 !important;
    --toolbar-background-color: #1e2021 !important;
    --second-color: #b8b5b2 !important;
  }

  .vditor--dark .vditor-toolbar {
    background-color: #1e2021 !important;
    border-bottom-color: #3c3f41 !important;
  }

  .vditor--dark .vditor-toolbar__item button {
    color: #e8e6e3 !important;
  }

  .vditor--dark .vditor-toolbar__item button:hover {
    background-color: #303234 !important;
  }

  .vditor--dark .vditor-reset {
    color: #e8e6e3 !important;
  }

  .vditor--dark .vditor-ir .vditor-reset {
    background-color: #181a1b !important;
  }

  /* 代码块 Dark Reader 风格 */
  .vditor--dark pre.vditor-reset {
    background-color: #242627 !important;
  }

  .vditor--dark code {
    background-color: #2a2c2d !important;
    color: #e8e6e3 !important;
  }

  /* 引用块 Dark Reader 风格 */
  .vditor--dark blockquote {
    border-left-color: #5c9aff !important;
    background-color: rgba(92, 154, 255, 0.08) !important;
    color: #b8b5b2 !important;
  }

  /* 链接 Dark Reader 风格 */
  .vditor--dark a {
    color: #5c9aff !important;
  }

  /* 表格 Dark Reader 风格 */
  .vditor--dark table {
    border-color: #3c3f41 !important;
  }

  .vditor--dark th,
  .vditor--dark td {
    border-color: #3c3f41 !important;
  }

  .vditor--dark th {
    background-color: #242627 !important;
  }

  /* 分割线 Dark Reader 风格 */
  .vditor--dark hr {
    border-color: #3c3f41 !important;
  }

  /* 标题 Dark Reader 风格 */
  .vditor--dark h1,
  .vditor--dark h2,
  .vditor--dark h3,
  .vditor--dark h4,
  .vditor--dark h5,
  .vditor--dark h6 {
    color: #e8e6e3 !important;
    border-bottom-color: #3c3f41 !important;
  }

  /* 列表标记 Dark Reader 风格 */
  .vditor--dark .vditor-ir__marker {
    color: #8a8785 !important;
  }

  /* 面板和弹出框 Dark Reader 风格 */
  .vditor-panel--arrow {
    background-color: #2a2c2d !important;
    border-color: #3c3f41 !important;
  }

  .vditor-panel--arrow button {
    color: #e8e6e3 !important;
  }

  .vditor-panel--arrow button:hover {
    background-color: #303234 !important;
  }

  /* 提示框 Dark Reader 风格 */
  .vditor-tip {
    background-color: #2a2c2d !important;
    color: #e8e6e3 !important;
  }

  /* 大纲 Dark Reader 风格 */
  .vditor-outline {
    background-color: #1e2021 !important;
    border-left-color: #3c3f41 !important;
  }

  .vditor-outline__content span {
    color: #e8e6e3 !important;
  }

  .vditor-outline__content span:hover {
    background-color: #303234 !important;
  }
}
</style>
