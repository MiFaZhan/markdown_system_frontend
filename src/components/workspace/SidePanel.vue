<template>
  <aside
    v-if="show"
    class="outline-panel"
    :class="{ 'mobile-outline': isMobile }"
    :style="{ width: width + 'px' }"
  >
    <div
      class="resize-handle resize-handle-left"
      @mousedown="emit('start-resize', 'outline', $event)"
    ></div>
    <div class="outline-header">
      <el-button :icon="List" link :class="{ 'is-active': sidePanelMode === 'outline' }" @click="emit('set-mode', 'outline')" />
      <el-button :icon="Search" link :class="{ 'is-active': sidePanelMode === 'search' }" @click="emit('set-mode', 'search')" />
    </div>
    <div class="outline-content">
      <div v-if="sidePanelMode === 'search'" class="content-search">
        <el-input
          :model-value="contentSearchKeyword"
          @input="handleSearchInput"
          placeholder="搜索内容..."
          :prefix-icon="Search"
          size="small"
          clearable
        />
        <div v-if="contentSearchResults.length > 0" class="search-results">
          <div
            v-for="(result, index) in contentSearchResults"
            :key="index"
            class="search-result-item"
            @click="emit('jump-to-search', result)"
            v-html="highlightKeyword(result.text, contentSearchKeyword)"
          ></div>
        </div>
        <div v-else-if="contentSearchKeyword" class="search-empty">
          未找到匹配内容
        </div>
      </div>
      <template v-else-if="sidePanelMode === 'outline' && currentFile">
        <OutlineTree :outline="outline" @click-heading="emit('jump-to-heading', $event)" />
      </template>
      <template v-else-if="sidePanelMode === 'outline' && !currentFile">
        <div class="empty-outline">
          <el-icon :size="48" :color="'var(--el-text-color-placeholder)'">
            <Document />
          </el-icon>
          <p>暂无</p>
        </div>
      </template>
      <template v-else>
        <div class="blank-panel">
          <el-icon :size="64" :color="'var(--el-text-color-placeholder)'">
            <Document />
          </el-icon>
          <p>暂无内容</p>
        </div>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { List, Search, Document } from '@element-plus/icons-vue'
import OutlineTree from '../OutlineTree.vue'

const props = defineProps({
  show: Boolean,
  isMobile: Boolean,
  width: Number,
  sidePanelMode: String,
  contentSearchKeyword: String,
  contentSearchResults: Array,
  outline: Array,
  currentFile: Object
})

const emit = defineEmits(['start-resize', 'set-mode', 'update:contentSearchKeyword', 'search-content', 'jump-to-search', 'jump-to-heading'])

const highlightKeyword = (text, keyword) => {
  if (!keyword) return text
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, 'gi')
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

const handleSearchInput = (value) => {
  emit('update:contentSearchKeyword', value)
  emit('search-content')
}
</script>

<style scoped>
.outline-panel {
  position: relative;
  background: var(--color-background);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

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

.resize-handle-left {
  left: -2px;
}

.outline-header {
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-bottom: 1px solid var(--color-border);
}

.outline-header .el-button {
  padding: 8px;
  color: var(--el-text-color-regular);
}

.outline-header .el-button:hover {
  color: var(--el-color-primary);
}

.outline-header .el-button.is-active {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-outline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--el-text-color-placeholder);
}

.empty-outline p {
  margin-top: 16px;
  font-size: 14px;
}

.blank-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--el-text-color-placeholder);
}

.blank-panel p {
  margin-top: 12px;
  font-size: 13px;
}

.content-search {
  padding: 12px;
}

.content-search .el-input {
  margin-bottom: 12px;
}

.search-results {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.search-result-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background-color: var(--el-color-primary-light-9);
}

.search-highlight {
  background-color: #fde047;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
}

.search-empty {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  .search-result-item:hover {
    background-color: rgba(64, 158, 255, 0.12);
  }

  .search-highlight {
    background-color: #fde047;
    color: #854d0e;
  }

  .outline-header .el-button.is-active {
    background-color: rgba(64, 158, 255, 0.12);
  }
}
</style>
