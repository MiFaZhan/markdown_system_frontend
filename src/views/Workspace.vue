<template>
  <div class="workspace-layout">
    <!-- 左侧文件列表 -->
    <aside class="sidebar" v-if="showSidebar" :style="{ width: sidebarWidth + 'px' }">
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
              <span class="node-label">{{ node.label }}</span>
              <el-dropdown trigger="click" @command="(cmd) => cmd === 'delete' && handleDelete(data)" @click.stop>
                <el-icon class="node-more"><Setting /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
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
      <template v-if="currentFile">
        <EditorPanel 
          :file="currentFile" 
          :show-outline="showOutline"
          :show-sidebar="showSidebar"
          @update-outline="updateOutline"
          @toggle-outline="toggleOutline"
          @toggle-sidebar="toggleSidebar"
        />
      </template>
      <template v-else>
        <div class="empty-state">
          <el-icon :size="64" color="#ddd"><Document /></el-icon>
          <p>选择一个文件开始编辑</p>
        </div>
      </template>
    </main>
    
    <!-- 右侧大纲 -->
    <aside class="outline-panel" v-if="currentFile && showOutline" :style="{ width: outlineWidth + 'px' }">
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
import { ref, computed, onMounted } from 'vue'
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

// 初始化项目
onMounted(() => {
  const projectId = Number(route.params.projectId)
  if (projectId) {
    projectsStore.setCurrentProject(projectId)
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
}

// 切换侧边栏显示
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
}

// 搜索
const searchKeyword = ref('')

// 面板宽度
const sidebarWidth = ref(260)
const outlineWidth = ref(200)

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

// 更新大纲
const updateOutline = (headings) => {
  outline.value = headings
}

// 跳转到标题
const scrollToHeading = (heading) => {
  window.dispatchEvent(new CustomEvent('scroll-to-heading', { detail: heading }))
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

/* 中间编辑区 */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-background);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.empty-state p {
  margin-top: 16px;
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
