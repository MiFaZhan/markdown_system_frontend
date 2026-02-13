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
        @node-drop="emit('drop', ...arguments)"
      >
        <template #default="{ node, data }">
          <div class="tree-node" :class="{ active: selectedNodeId === data.id }">
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

    <div
      class="resize-handle resize-handle-right"
      @mousedown="emit('start-resize', 'sidebar', $event)"
    ></div>
  </aside>
</template>

<script setup>
import {
  Plus,
  Document,
  Folder,
  Setting,
  Search,
  Back,
  FolderOpened
} from '@element-plus/icons-vue'

const props = defineProps({
  show: Boolean,
  isMobile: Boolean,
  width: Number,
  projectName: String,
  fileTree: Array,
  searchKeyword: String,
  filteredFileTree: Array,
  searchResultCount: Number,
  selectedNodeId: Number,
  allowDrop: Function,
  allowDrag: Function,
  treeRef: Object
})

const emit = defineEmits([
  'back',
  'create',
  'select-file',
  'node-command',
  'drop',
  'start-resize',
  'update:searchKeyword'
])

const selectFile = (file) => {
  if (file.type !== 'folder') {
    emit('select-file', file)
  }
}
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

.tree-node:hover:not(.active) {
  background: var(--color-background-mute);
}

.tree-node.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

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

.is-mobile .node-more {
  opacity: 1;
}
</style>
