<template>
  <div class="workspace-layout" :class="{ 'is-mobile': isMobile }">
    <!-- 移动端遮罩层 -->
    <div 
      class="mobile-overlay" 
      v-if="isMobile && (showSidebar || showOutline)"
      @click="closeMobilePanels"
    ></div>

    <!-- 左侧文件列表 -->
    <aside 
      class="sidebar" 
      :class="{ 'mobile-sidebar': isMobile }"
      v-if="showSidebar" 
      :style="{ width: sidebarWidth + 'px' }"
    >
      <div class="sidebar-header">
        <el-button :icon="Back" link @click="goBack">返回</el-button>
        <span class="project-name">{{ currentProject?.name }}</span>
        <el-dropdown @command="handleCreate" trigger="click">
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
        <el-input v-model="searchKeyword" placeholder="搜索..." :prefix-icon="Search" size="small" />
      </div>
      
      <div class="file-tree">
        <el-tree
          :data="fileTree"
          node-key="id"
          default-expand-all
          :props="{ label: 'name', children: 'children' }"
          highlight-current
          @node-click="selectFile"
        >
          <template #default="{ node, data }">
            <div class="tree-node" :class="{ active: currentFileId === data.id }">
              <el-icon class="node-icon">
                <Folder v-if="data.type === 'folder'" />
                <Document v-else />
              </el-icon>
              <span class="node-label">{{ data.type === 'file' ? node.label.replace(/\.md$/, '') : node.label }}</span>
              <el-dropdown trigger="click" @command="(cmd) => handleNodeCommand(cmd, data)" @click.stop>
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
      <div class="resize-handle resize-handle-right" @mousedown="startResize('sidebar', $event)"></div>
    </aside>
    
    <!-- 中间编辑区 -->
    <main class="editor-area">
      <EditorPanel 
        :file="currentFile" 
        :show-outline="showOutline"
        :show-sidebar="showSidebar"
        @update-outline="updateOutline"
        @toggle-outline="toggleOutline"
        @toggle-sidebar="toggleSidebar"
      />
    </main>
    
    <!-- 右侧大纲 -->
    <aside 
      class="outline-panel" 
      :class="{ 'mobile-outline': isMobile }"
      v-if="currentFile && showOutline" 
      :style="{ width: outlineWidth + 'px' }"
    >
      <!-- 拖拽条 -->
      <div class="resize-handle resize-handle-left" @mousedown="startResize('outline', $event)"></div>
      <div class="outline-header">大纲</div>
      <div class="outline-content">
        <OutlineTree :outline="outline" @click-heading="scrollToHeading" />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Document, Folder, Setting, Search, Back } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFilesStore } from '../stores/files'
import { useProjectsStore } from '../stores/projects'
import EditorPanel from '../components/EditorPanel.vue'
import OutlineTree from '../components/OutlineTree.vue'

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
  const projectId = Number(route.params.projectId)
  if (projectId) {
    projectsStore.setCurrentProject(projectId)
  }
  
  checkResponsive(true)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) {
    cancelAnimationFrame(resizeTimer)
  }
})

const currentProject = computed(() => projectsStore.currentProject())

// 当前选中的文件ID
const currentFileId = ref(null)
const currentFile = computed(() => filesStore.getFile(currentFileId.value))

// 文件树数据
const fileTree = computed(() => filesStore.fileList)

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
    const delta = panel === 'sidebar' 
      ? moveEvent.clientX - startX 
      : startX - moveEvent.clientX
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
  if (file.type !== 'folder') {
    currentFileId.value = file.id
    if (isMobile.value) {
      showSidebar.value = false
    }
  }
}

// 新建文件
const handleCreate = (command) => {
  if (command === 'file') {
    ElMessageBox.prompt('请输入文件名', '新建文件', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '文件名不能为空'
    }).then(({ value }) => {
      const fileName = value.endsWith('.md') ? value : `${value}.md`
      const newFile = {
        id: Date.now(),
        name: fileName,
        type: 'file',
        updateTime: new Date().toLocaleString(),
        content: `# ${value}\n\n开始写作...`
      }
      filesStore.addFile(newFile)
      currentFileId.value = newFile.id
      ElMessage.success('文件创建成功')
    }).catch(() => {})
  } else if (command === 'folder') {
    ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '文件夹名称不能为空'
    }).then(({ value }) => {
      filesStore.addFile({
        id: Date.now(),
        name: value,
        type: 'folder',
        updateTime: new Date().toLocaleString(),
        children: []
      })
      ElMessage.success('文件夹创建成功')
    }).catch(() => {})
  }
}

// 删除文件
const handleDelete = (file) => {
  const msg = file.type === 'folder' ? '确定要删除该文件夹及其所有内容吗?' : '确定要删除该文件吗?'
  ElMessageBox.confirm(msg, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    if (currentFileId.value === file.id) {
      currentFileId.value = null
    }
    filesStore.deleteFile(file.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

// 重命名
const handleRename = (file) => {
  const title = '重命名'
  const placeholder = file.type === 'folder' ? '新的文件夹名称' : '新的文件名'
  ElMessageBox.prompt('', title, {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPlaceholder: placeholder,
    inputValue: file.type === 'file' ? file.name.replace(/\.md$/, '') : file.name,
    inputPattern: /\S+/,
    inputErrorMessage: '名称不能为空'
  }).then(({ value }) => {
    let newName = value.trim()
    if (file.type === 'file') {
      newName = `${newName.replace(/\.md$/i, '')}.md`
    }
    filesStore.updateFile(file.id, { 
      name: newName, 
      updateTime: new Date().toLocaleString() 
    })
    if (currentFileId.value === file.id) {
      currentFileId.value = file.id
    }
    ElMessage.success('重命名成功')
  }).catch(() => {})
}

const handleNodeCommand = (cmd, data) => {
  if (cmd === 'rename') return handleRename(data)
  if (cmd === 'delete') return handleDelete(data)
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
</script>

<style scoped>
.workspace-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
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
  background: #409eff;
}

.resize-handle-right {
  right: -2px;
}

.resize-handle-left {
  left: -2px;
}

.sidebar-header {
  height: 50px;
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

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 8px;
  border-radius: 4px;
}

.tree-node:hover {
  background: var(--color-background-mute);
}

.tree-node.active {
  background: #ecf5ff;
}

/* Dark Reader 风格深色模式 */
@media (prefers-color-scheme: dark) {
  .tree-node.active {
    background: rgba(92, 154, 255, 0.15);
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
  color: #909399;
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
  color: #909399;
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
  height: 50px;
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
