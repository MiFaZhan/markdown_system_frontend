<template>
  <aside
    v-if="show"
    class="sidebar"
    :class="{ 'mobile-sidebar': isMobile }"
    :style="{ width: width + 'px' }"
  >
    <div class="sidebar-header">
      <el-button :icon="Back" link @click="emit('back')">返回</el-button>
      <span class="project-name">{{ projectName || '加载中...' }}</span>
      <el-dropdown trigger="click" @command="emit('create', $event)">
        <el-button :icon="Plus" circle size="small" />
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="file" :icon="Document">新建文件</el-dropdown-item>
            <el-dropdown-item command="folder" :icon="Folder">新建文件夹</el-dropdown-item>
            <el-dropdown-item command="upload" :icon="Upload">上传Markdown文件</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="sidebar-search">
      <el-input
        :model-value="searchKeyword"
        placeholder="搜索..."
        :prefix-icon="Search"
        size="small"
        clearable
        @input="emit('update:searchKeyword', $event)"
      />
      <div v-if="searchKeyword && searchResultCount > 0" class="search-result-count">
        找到 {{ searchResultCount }} 个文件
      </div>
      <div v-else-if="searchKeyword && searchResultCount === 0" class="search-result-count">
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
        :current-node-key="selectedNodeId"
        draggable
        :allow-drop="allowDrop"
        :allow-drag="allowDrag"
        :expand-on-click-node="false"
        @node-click="selectFile"
        @node-drag-start="handleDragStart"
        @node-drop="handleNodeDrop"
      >
        <template #default="{ node, data }">
          <div
            class="tree-node"
            :class="{ active: selectedNodeId === data.id, 'is-mobile': isMobile }"
          >
            <el-icon class="node-icon">
              <Folder v-if="data.type === 'folder'" />
              <Document v-else />
            </el-icon>
            <span class="node-label">{{
              data.type === 'file' ? node.label.replace(/\.md$/, '') : node.label
            }}</span>
            <el-dropdown
              trigger="click"
              @command="(cmd) => emit('node-command', cmd, data)"
              @click.stop
            >
              <el-icon class="node-more" @click.stop @mousedown.stop @touchstart.stop>
                <Setting />
              </el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="share">分享</el-dropdown-item>
                  <el-dropdown-item command="rename">修改</el-dropdown-item>
                  <el-dropdown-item command="delete">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-tree>
    </div>

    <div class="bottom-actions">
      <el-tooltip content="节点分享管理" placement="top">
        <div class="action-btn share-btn" @click="openShareManage">
          <el-icon><Share /></el-icon>
        </div>
      </el-tooltip>
      <el-tooltip content="回收站" placement="top">
        <div class="action-btn recycle-btn" @click="showRecycleBin = true">
          <el-icon><Delete /></el-icon>
        </div>
      </el-tooltip>
    </div>

    <div
      class="resize-handle resize-handle-right"
      @mousedown="emit('start-resize', 'sidebar', $event)"
    ></div>

    <RecycleBinDialog
      v-model:visible="showRecycleBin"
      :project-id="projectId"
      @restore="emit('refresh')"
    />

    <ShareLinkManageDialog
      v-model:visible="showShareManage"
      title="节点分享链接管理"
      :target-type="[0, 1]"
      :project-id="projectId"
      :target-id="shareTargetId"
      :target-name="shareTargetName"
      @create="openShareCreate"
    />

    <ShareCreateDialog
      v-model:visible="showShareCreate"
      :target-type="shareTargetType"
      :target-id="shareTargetId"
      :target-name="shareTargetName"
      @success="handleShareSuccess"
    />
  </aside>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { polyfill } from 'mobile-drag-drop'
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour'
import 'mobile-drag-drop/default.css'
import {
  Plus,
  Back,
  Document,
  Folder,
  Upload,
  Search,
  FolderOpened,
  Setting,
  Delete,
  Share
} from '@element-plus/icons-vue'
import RecycleBinDialog from './RecycleBinDialog.vue'
import ShareLinkManageDialog from '../share/ShareLinkManageDialog.vue'
import ShareCreateDialog from '../share/ShareCreateDialog.vue'
import { getShareList } from '../../api/shareService'
import { ElMessage } from 'element-plus'

const showRecycleBin = ref(false)
const showShareManage = ref(false)
const showShareCreate = ref(false)
const shareTargetType = ref(1)
const shareTargetId = ref(null)
const shareTargetName = ref('')

const openShareCreate = () => {
  shareTargetType.value = 1
  shareTargetId.value = null
  shareTargetName.value = ''
  showShareCreate.value = true
}

const openShareManage = () => {
  shareTargetId.value = null
  shareTargetName.value = ''
  showShareManage.value = true
}

const handleNodeShare = async (node) => {
  const targetType = node.type === 'folder' ? 0 : 1
  shareTargetType.value = targetType
  shareTargetId.value = node.id
  shareTargetName.value = node.name
  try {
    const res = await getShareList(targetType, null, node.id)
    const data = res.data || res
    if (res.code && res.code !== 200) {
      ElMessage.error(res.message || '获取分享列表失败')
      return
    }
    const shareList = Array.isArray(data) ? data : []
    if (shareList.length > 0) {
      showShareManage.value = true
    } else {
      showShareCreate.value = true
    }
  } catch (error) {
    console.error('Check share error:', error)
    ElMessage.error('检查分享状态失败')
  }
}

const handleShareSuccess = () => {
  showShareManage.value = true
}

defineProps({
  show: {
    type: Boolean,
    default: true
  },
  width: {
    type: Number,
    default: 250
  },
  isMobile: {
    type: Boolean,
    default: false
  },
  projectName: {
    type: String,
    default: ''
  },
  searchKeyword: {
    type: String,
    default: ''
  },
  searchResultCount: {
    type: Number,
    default: 0
  },
  fileTree: {
    type: Array,
    default: () => []
  },
  filteredFileTree: {
    type: Array,
    default: () => []
  },
  selectedNodeId: {
    type: [Number, String],
    default: null
  },
  projectId: {
    type: [Number, String],
    default: null
  },
  allowDrop: {
    type: Function,
    default: () => true
  },
  allowDrag: {
    type: Function,
    default: () => true
  },
  treeRef: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits([
  'back',
  'create',
  'select-file',
  'node-command',
  'drop',
  'start-resize',
  'update:searchKeyword',
  'refresh'
])

onMounted(() => {
  // 初始化移动端拖拽支持
  polyfill({
    // 使用滚动行为覆盖，确保拖拽时页面滚动的平滑性
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
    // 长按 500ms 触发拖拽
    holdToDrag: 500,
    // 拖拽图像居中于触摸点
    dragImageCenterOnTouch: true,
    // 仅在触摸事件中应用
    forceApply: false
  })

  // 解决 iOS 上的滚动冲突问题（根据 mobile-drag-drop 文档建议）
  // 注意：这可能会影响全局滚动行为，但在单页应用中通常是可接受的，或者需要更精细的控制
  // 这里暂时注释掉，除非发现滚动有问题
  // document.addEventListener('touchmove', function() {}, {passive: false});
})

const handleDragStart = () => {
  if (navigator.vibrate) {
    navigator.vibrate(50)
  }
}

const handleNodeDrop = async (draggingNode, dropNode, dropType) => {
  const success = await emit('drop', draggingNode, dropNode, dropType)

  if (success === false) {
    event.stopPropagation()
    event.preventDefault()
  }
}

const selectFile = (file) => {
  if (file.type !== 'folder') {
    emit('select-file', file)
  }
}

defineExpose({
  handleNodeShare,
  openShareManage
})
</script>

<style scoped>
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

.recycle-bin-bar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  border-top: 1px solid var(--color-border);
  color: var(--el-text-color-regular);
  transition: all 0.3s;
}

.recycle-bin-bar:hover {
  background-color: var(--color-background-mute);
  color: var(--el-color-primary);
}

.bottom-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  border-top: 1px solid var(--color-border);
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
}

.action-btn:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.share-btn:hover {
  color: var(--el-color-primary);
}

.recycle-btn:hover {
  color: var(--el-color-danger);
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
  box-shadow: inset 2px 0 0 transparent;
}

/* 悬停背景效果在全局 el-tree 行容器上处理，避免与相邻行重合 */

/* 取消 Element Plus el-tree 的选中高亮 */
.el-tree-node.is-current > .el-tree-node__content {
  background: transparent !important;
  color: inherit !important;
}

/* 统一选中样式 */
.tree-node.active .node-label {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.tree-node.active .node-icon {
  color: var(--el-color-primary);
}

@media (prefers-color-scheme: dark) {
  .node-icon {
    color: var(--dr-text-muted, #8a8785);
  }

  .node-more {
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
  position: relative;
  z-index: 3;
}

.tree-node:hover .node-more {
  opacity: 1;
}

.tree-node.is-mobile .node-more {
  opacity: 1;
}

@media (max-width: 700px) {
  .sidebar.mobile-sidebar {
    width: 85% !important;
    max-width: 300px;
  }

  .tree-node {
    padding: 6px 8px;
    min-height: 36px;
  }

  .node-more {
    opacity: 1;
    width: 24px;
    height: 24px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sidebar-header {
    height: 48px;
  }

  .sidebar-header .el-button {
    padding: 8px 12px;
  }
}
</style>
