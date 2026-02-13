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
        :icon="Search"
        link
        :class="{ 'is-active': sidePanelMode === 'search' }"
        @click="emit('set-mode', 'search')"
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
            <button class="export-option" @click="emit('export-markdown')">
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                  <path fill="currentColor" d="M128 192h768v640H128z"></path>
                </svg>
              </div>
              <div class="export-name">Markdown</div>
              <div class="export-desc">.md 文件</div>
            </button>
            <button class="export-option" @click="emit('export-pdf')">
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                  <path fill="currentColor" d="M853.333 725.333v106.667c0 46.933-38.4 85.333-85.333 85.333H256c-46.933 0-85.333-38.4-85.333-85.333V725.333h682.666zM725.333 384h128l-192-192v128c0 35.413 28.587 64 64 64zM170.667 213.333h384l192 192v320c0 46.933-38.4 85.334-85.334 85.334H256c-46.933 0-85.333-38.4-85.333-85.334V298.667c0-46.934 38.4-85.334 85.333-85.334z"></path>
                </svg>
              </div>
              <div class="export-name">PDF</div>
              <div class="export-desc">打印预览</div>
            </button>
            <button class="export-option" @click="emit('export-html')">
              <div class="export-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                  <path fill="currentColor" d="M725.333 384h128l-192-192v128c0 35.413 28.587 64 64 64zM170.667 213.333h384l192 192v405.334c0 46.933-38.4 85.333-85.334 85.333H256c-46.933 0-85.333-38.4-85.333-85.333V298.667c0-46.934 38.4-85.334 85.333-85.334zM341.333 426.667h192v64h-192v-64zm0 128h341.334v64H341.333v-64zm0 128h341.334v64H341.333v-64z"></path>
                </svg>
              </div>
              <div class="export-name">HTML</div>
              <div class="export-desc">.html 文件</div>
            </button>
          </div>
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
// import { List, Search, Document } from '@element-plus/icons-vue'
import { List, Document, Download } from '@element-plus/icons-vue'
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
  'export-html'
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.export-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  background: var(--color-background-soft, rgba(0, 0, 0, 0.02));
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.export-option:hover {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.export-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: var(--el-color-primary);
}

.export-icon svg {
  width: 100%;
  height: 100%;
}

.export-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.export-desc {
  font-size: 11px;
  color: var(--el-text-color-secondary);
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
