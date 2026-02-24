<template>
  <div class="tabs-bar">
    <!-- <div class="toolbar-buttons">
      <el-tooltip
        :content="showSidebar ? '收起侧边栏' : '展开侧边栏'"
        placement="bottom"
        :disabled="isMobile"
      >
        <el-button
          :icon="showSidebar ? Fold : Expand"
          link
          class="toolbar-btn"
          @click="$emit('toggle-sidebar')"
        />
      </el-tooltip>

      <div class="toolbar-divider"></div>
    </div> -->

    <div class="tabs-container">
      <div
        v-for="(tab, index) in tabs"
        :key="tab.fileId"
        :class="[
          'tab-item',
          {
            active: index === activeIndex,
            dirty: tab.isDirty,
            dragging: index === draggedIndex,
            'drag-over': index === draggedOverIndex && draggedIndex !== draggedOverIndex
          }
        ]"
        draggable="true"
        @click="$emit('switch-tab', index)"
        @mousedown.middle.prevent="$emit('close-tab', index)"
        @contextmenu.prevent="handleContextMenu(index, $event)"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver(index, $event)"
        @dragenter="handleDragEnter(index, $event)"
        @dragleave="handleDragLeave(index)"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd($event)"
      >
        <el-icon class="tab-icon">
          <Document />
        </el-icon>
        <span class="tab-name" :title="tab.fileName">
          {{ getDisplayName(tab.fileName) }}
        </span>
        <span v-if="tab.isDirty" class="dirty-indicator">*</span>
        <button
          class="tab-close"
          :title="'关闭 ' + tab.fileName"
          @click.stop="$emit('close-tab', index)"
        >
          ×
        </button>
      </div>
    </div>

    <div class="toolbar-divider"></div>

    <!-- <div class="right-toolbar">
      <el-tooltip
        :content="showOutline ? '收起右侧边栏' : '展开右侧边栏'"
        placement="bottom"
        :disabled="isMobile"
      >
        <el-button
          link
          class="toolbar-btn"
          :type="showOutline ? 'primary' : ''"
          @click="$emit('toggle-outline')"
        >
          <template #icon>
            <span class="custom-icon">
              <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M824.888889 170.666667H199.111111a56.888889 56.888889 0 0 0-56.888889 56.888889v568.888888a56.888889 56.888889 0 0 0 56.888889 56.888889h625.777778a56.888889 56.888889 0 0 0 56.888889-56.888889V227.555556a56.888889 56.888889 0 0 0-56.888889-56.888889z m0 597.333333a28.444444 28.444444 0 0 1-28.444445 28.444444H227.555556a28.444444 28.444444 0 0 1-28.444445-28.444444V256a28.444444 28.444444 0 0 1 28.444445-28.444444h568.888888a28.444444 28.444444 0 0 1 28.444445 28.444444z"
                ></path>
                <path
                  d="M512 256m28.444444 0l227.555556 0q28.444444 0 28.444444 28.444444l0 455.111112q0 28.444444-28.444444 28.444444l-227.555556 0q-28.444444 0-28.444444-28.444444l0-455.111112q0-28.444444 28.444444-28.444444Z"
                ></path>
              </svg>
            </span>
          </template>
        </el-button>
      </el-tooltip>
    </div> -->

    <teleport to="body">
      <div
        v-if="contextMenuVisible"
        ref="contextMenuRef"
        class="context-menu"
        :style="{
          left: contextMenuPosition.x + 'px',
          top: contextMenuPosition.y + 'px'
        }"
        @click.stop
      >
        <div class="context-menu-item" @click="handleMenuCommand('close')">
          <el-icon><Close /></el-icon>
          关闭
        </div>
        <div
          class="context-menu-item"
          :class="{ disabled: tabs.length <= 1 }"
          @click="tabs.length > 1 && handleMenuCommand('close-others')"
        >
          <el-icon><Remove /></el-icon>
          关闭其他标签
        </div>
        <div class="context-menu-item" @click="handleMenuCommand('close-all')">
          <el-icon><FolderDelete /></el-icon>
          全部关闭
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Document, Fold, Expand, Close, Remove, FolderDelete } from '@element-plus/icons-vue'

defineProps({
  tabs: {
    type: Array,
    required: true,
    default: () => []
  },
  activeIndex: {
    type: Number,
    required: true,
    default: -1
  },
  showSidebar: {
    type: Boolean,
    required: true,
    default: true
  },
  showOutline: {
    type: Boolean,
    required: true,
    default: true
  },
  isMobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'switch-tab',
  'close-tab',
  'close-others',
  'close-all',
  'toggle-sidebar',
  'toggle-outline',
  'reorder-tabs'
])

const getDisplayName = (fileName) => {
  return fileName.replace(/\.md$/, '')
}

const draggedIndex = ref(-1)
const draggedOverIndex = ref(-1)

const contextMenuVisible = ref(false)
const contextMenuRef = ref(null)
const contextMenuIndex = ref(-1)
const contextMenuPosition = ref({ x: 0, y: 0 })

const handleContextMenu = (index, event) => {
  event.preventDefault()
  contextMenuIndex.value = index
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  contextMenuVisible.value = true
  emit('switch-tab', index)
}

const handleMenuCommand = (command) => {
  const index = contextMenuIndex.value
  contextMenuVisible.value = false
  if (command === 'close') {
    emit('close-tab', index)
  } else if (command === 'close-others') {
    emit('close-others', index)
  } else if (command === 'close-all') {
    emit('close-all')
  }
}

const handleClickOutside = (event) => {
  if (
    contextMenuVisible.value &&
    contextMenuRef.value &&
    !contextMenuRef.value.contains(event.target)
  ) {
    contextMenuVisible.value = false
    contextMenuIndex.value = -1
  }
}

const handleScroll = () => {
  if (contextMenuVisible.value) {
    contextMenuVisible.value = false
    contextMenuIndex.value = -1
  }
}

const handleKeydown = (event) => {
  if (contextMenuVisible.value && (event.key === 'Escape' || event.key === 'Esc')) {
    contextMenuVisible.value = false
    contextMenuIndex.value = -1
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('scroll', handleScroll, true)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('scroll', handleScroll, true)
  document.removeEventListener('keydown', handleKeydown)
})

const handleDragStart = (index, event) => {
  draggedIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index.toString())
  event.target.style.opacity = '0.5'
}

const handleDragOver = (index, event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  draggedOverIndex.value = index
}

const handleDragEnter = (index, event) => {
  event.preventDefault()
  if (draggedIndex.value !== index) {
    draggedOverIndex.value = index
  }
}

const handleDragLeave = () => {
  draggedOverIndex.value = -1
}

const handleDrop = (index, event) => {
  event.preventDefault()
  const fromIndex = draggedIndex.value
  const toIndex = index

  if (fromIndex !== -1 && fromIndex !== toIndex) {
    emit('reorder-tabs', { fromIndex, toIndex })
  }

  draggedIndex.value = -1
  draggedOverIndex.value = -1
}

const handleDragEnd = (event) => {
  event.target.style.opacity = '1'
  draggedIndex.value = -1
  draggedOverIndex.value = -1
}
</script>

<style scoped>
.tabs-bar {
  height: 40px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  position: relative;
}

.tabs-bar::-webkit-scrollbar {
  height: 4px;
}

.tabs-bar::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.tabs-bar::-webkit-scrollbar-thumb:hover {
  background: var(--el-color-primary);
}

.toolbar-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  flex-shrink: 0;
}

.toolbar-btn {
  font-size: 18px;
  color: var(--color-text-secondary);
  padding: 8px;
}

.toolbar-btn:hover {
  color: var(--color-primary);
  background: var(--color-background-mute);
}

.custom-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.custom-icon svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  pointer-events: none;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 4px;
  flex-shrink: 0;
}

.right-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.tabs-container {
  display: flex;
  gap: 2px;
  padding: 0 8px;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  min-width: 0;
}

.tabs-container::-webkit-scrollbar {
  height: 4px;
}

.tabs-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-background-mute);
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  max-width: 200px;
  position: relative;
  user-select: none;
  flex-shrink: 0;
}

.tab-item:hover {
  background: var(--color-background-soft);
}

.tab-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.tab-item.drag-over {
  border-left: 2px solid var(--el-color-primary);
  margin-left: -2px;
}

.tab-item.active {
  background: var(--color-background);
  box-shadow: 0 -2px 0 0 var(--el-color-primary) inset;
}

.tab-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.tab-item.active .tab-icon {
  color: var(--el-color-primary);
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.tab-item.active .tab-name {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.dirty-indicator {
  color: var(--el-color-warning);
  font-weight: bold;
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
}

.tab-close {
  width: 18px;
  height: 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  color: var(--el-text-color-secondary);
  opacity: 0;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  flex-shrink: 0;
  padding: 0;
}

.tab-item:hover .tab-close,
.tab-item.active .tab-close {
  opacity: 1;
}

.tab-close:hover {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.context-menu {
  position: fixed;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  min-width: 160px;
  z-index: 9999;
  padding: 4px 0;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
  user-select: none;
}

.context-menu-item:hover:not(.disabled) {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.context-menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.context-menu-item .el-icon {
  font-size: 16px;
}

@media (prefers-color-scheme: dark) {
  .tab-item {
    background: rgba(255, 255, 255, 0.05);
  }

  .tab-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .tab-item.active {
    background: var(--color-background);
  }

  .context-menu {
    background: #1e2021;
    border-color: #3c3f41;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }

  .context-menu-item:hover:not(.disabled) {
    background: #303234;
    color: #5c9aff;
  }
}

@media (max-width: 700px) {
  .tabs-bar {
    display: flex !important;
    padding: 0 4px;
  }

  .toolbar-buttons {
    display: none;
  }

  .right-toolbar {
    display: none;
  }

  .tabs-container {
    overflow-x: auto;
  }

  .tab-item {
    min-width: 80px;
    max-width: 120px;
    padding: 6px 10px;
  }

  .tab-name {
    max-width: 70px;
  }

  .toolbar-btn {
    font-size: 18px;
    padding: 6px;
    min-width: 36px;
    min-height: 36px;
  }

  .toolbar-divider {
    margin: 0 2px;
  }
}
</style>
