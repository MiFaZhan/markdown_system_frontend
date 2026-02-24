<template>
  <aside
    v-if="show"
    class="sidebar"
    :class="{ 'mobile-sidebar': isMobile }"
    :style="{ width: width + 'px' }"
  >
    <div class="sidebar-header">
      <div class="sidebar-title">
        {{ projectName || '加载中...' }}
        <el-tag size="small" effect="plain" class="share-tag">
          {{ shareType === 2 ? '项目分享' : '文件夹分享' }}
        </el-tag>
      </div>
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
        :expand-on-click-node="false"
        @node-click="selectFile"
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
          </div>
        </template>
      </el-tree>
    </div>

    <slot name="footer"></slot>

    <div
      v-if="!isMobile"
      class="resize-handle resize-handle-right"
      @mousedown="emit('start-resize', 'sidebar', $event)"
    ></div>
  </aside>
</template>

<script setup>
import { Document, Folder, Search, FolderOpened } from '@element-plus/icons-vue'

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
  shareType: {
    type: Number,
    default: 2
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
  }
})

const emit = defineEmits(['update:searchKeyword', 'select-file', 'start-resize'])

const selectFile = (data) => {
  emit('select-file', data)
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.sidebar-footer {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 1;
}

.mobile-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.sidebar-header {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}

.share-tag {
  flex-shrink: 0;
}

.sidebar-search {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.search-result-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 5px;
  margin-left: 2px;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 0;
}

.tree-node {
  display: flex;
  align-items: center;
  font-size: 14px;
  padding-right: 8px;
  width: 100%;
  height: 36px;
  color: var(--el-text-color-primary);
}

.tree-node.active {
  color: var(--el-color-primary);
  font-weight: 500;
}

.node-icon {
  margin-right: 8px;
  font-size: 18px;
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: var(--el-color-primary);
}

.resize-handle-right {
  right: -2px;
}

.empty-files {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
  padding: 20px;
  text-align: center;
}

.empty-files .el-icon {
  margin-bottom: 10px;
}

.empty-files p {
  margin: 5px 0;
  font-size: 14px;
}

/* 适配 Element Plus Tree 样式 */
:deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 4px;
  margin: 0 4px;
}

:deep(.el-tree-node__content:hover) {
  background-color: var(--el-fill-color-light);
}

:deep(.el-tree--highlight-current .el-tree-node.is-current > .el-tree-node__content) {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

@media (max-width: 700px) {
  .mobile-sidebar {
    width: 85% !important;
    max-width: 300px;
  }

  .sidebar-header {
    height: 48px;
  }

  :deep(.el-tree-node__content) {
    height: 40px; /* 移动端增加点击区域 */
  }

  .tree-node {
    height: 40px;
    font-size: 15px;
  }

  .sidebar-search {
    padding: 12px 15px;
  }
}
</style>
