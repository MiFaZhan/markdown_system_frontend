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
      <el-button
        :icon="List"
        link
        :class="{ 'is-active': sidePanelMode === 'outline' }"
        @click="emit('set-mode', 'outline')"
      />
      <el-button
        :icon="Download"
        link
        :class="{ 'is-active': sidePanelMode === 'export' }"
        @click="emit('set-mode', 'export')"
      />
      <!-- <el-button
        :icon="DocumentCopy"
        link
        :class="{ 'is-active': sidePanelMode === 'copy' }"
        @click="emit('set-mode', 'copy')"
      /> -->
    </div>
    <div class="outline-content">
      <!-- <div v-if="sidePanelMode === 'search'" class="content-search">
        <el-input
          :model-value="contentSearchKeyword"
          placeholder="搜索内容..."
          :prefix-icon="Search"
          size="small"
          clearable
          @input="handleSearchInput"
        />
        <div v-if="contentSearchResults.length > 0" class="search-results">
          <div
            v-for="(result, index) in contentSearchResults"
            :key="index"
            class="search-result-item"
            @click="emit('jump-to-search', result)"
          >
            <div
              class="result-text"
              v-html="highlightKeyword(result.text, contentSearchKeyword)"
            ></div>
            <div class="result-line">第 {{ result.line }} 行</div>
          </div>
        </div>
        <div v-else-if="contentSearchKeyword" class="search-empty">未找到匹配内容</div>
      </div> -->
      <template v-if="sidePanelMode === 'outline' && currentFile">
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
      <template v-else-if="sidePanelMode === 'export' && currentFile">
        <div class="export-panel">
          <div class="export-title">导出为</div>
          <div class="export-options">
            <button class="export-option" @click="emit('export-markdown')">Markdown</button>
            <button class="export-option" @click="emit('export-pdf')">PDF</button>
            <button class="export-option" @click="emit('export-html')">HTML</button>
          </div>
        </div>
      </template>
      <!-- <template v-else-if="sidePanelMode === 'copy' && currentFile">
        <div class="export-panel">
          <div class="export-title">复制为</div>
          <div class="export-options">
            <button class="export-option" @click="emit('copy-markdown')">Markdown</button>
            <button class="export-option" @click="emit('copy-zhihu')">知乎</button>
            <button class="export-option" @click="emit('copy-wechat')">公众号</button>
          </div>
        </div>
      </template> -->
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
// import { List, Search, Document } from '@element-plus/icons-vue'
import { List, Document, Download, DocumentCopy } from '@element-plus/icons-vue'
import OutlineTree from '../OutlineTree.vue'

const props = defineProps({
  show: Boolean,
  isMobile: Boolean,
  width: Number,
  sidePanelMode: String,
  // contentSearchKeyword: String,
  // contentSearchResults: Array,
  outline: Array,
  currentFile: Object,
  currentFileContent: String
})

const emit = defineEmits([
  'start-resize',
  'set-mode',
  // 'update:content-search-keyword',
  // 'jump-to-search',
  'jump-to-heading',
  'export-markdown',
  'export-pdf',
  'export-html',
  'copy-markdown',
  'copy-zhihu',
  'copy-wechat'
])

// const highlightKeyword = (text, keyword) => {
//   if (!keyword) return text
//   const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
//   const regex = new RegExp(`(${escapedKeyword})`, 'gi')
//   return text.replace(regex, '<mark class="search-highlight">$1</mark>')
// }

// const handleSearchInput = (value) => {
//   console.log('[SidePanel] handleSearchInput called, value:', value)
//   emit('update:content-search-keyword', value)
// }
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
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  transition: all 0.2s;
  border: 1px solid transparent;
  margin-bottom: 8px;
  background: var(--color-background-soft, rgba(0, 0, 0, 0.02));
}

.search-result-item:hover {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.result-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.result-node-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.result-parent-path {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
}

.result-text {
  color: var(--el-text-color-regular);
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}

.result-line {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  text-align: right;
}

.search-highlight {
  background-color: #fde047;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 500;
}

.search-empty {
  padding: 20px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}

.export-panel {
  padding: 20px 12px;
}

.export-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 16px;
  text-align: center;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.export-option {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: var(--color-background-soft, rgba(0, 0, 0, 0.02));
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.export-option:hover {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 700px) {
  .outline-panel.mobile-outline {
    width: 85% !important;
    max-width: 300px;
  }

  .outline-header {
    height: 48px;
  }

  .outline-header .el-button {
    padding: 12px;
    min-width: 44px;
    min-height: 44px;
  }

  .export-option {
    padding: 16px 20px;
    min-height: 48px;
  }
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

  .export-option:hover {
    background-color: rgba(64, 158, 255, 0.12);
  }
}
</style>
