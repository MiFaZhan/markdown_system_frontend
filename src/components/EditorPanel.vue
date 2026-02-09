<template>
  <div class="editor-panel">
    <header class="editor-header">
      <el-tooltip
        v-model:visible="sidebarTipVisible"
        :content="showSidebar ? '收起侧边栏' : '展开侧边栏'"
        placement="bottom"
        trigger="hover"
        :enterable="false"
        :show-after="80"
        :hide-after="120"
      >
        <el-button
          :icon="showSidebar ? Fold : Expand"
          link
          class="header-icon-btn"
          @click="
            () => {
              sidebarTipVisible = false
              $emit('toggle-sidebar')
            }
          "
        />
      </el-tooltip>

      <template v-if="file">
        <el-tooltip
          v-model:visible="outlineTipVisible"
          :content="showOutline ? '隐藏大纲' : '显示大纲'"
          placement="bottom"
          trigger="hover"
          :enterable="false"
          :show-after="80"
          :hide-after="120"
        >
          <el-button
            :icon="List"
            link
            class="header-icon-btn"
            :type="showOutline ? 'primary' : ''"
            @click="
              () => {
                outlineTipVisible = false
                $emit('toggle-outline')
              }
            "
          />
        </el-tooltip>
      </template>

      <div class="save-status">
        <el-icon v-if="isEditorLoading" class="is-loading"><Loading /></el-icon>
        <el-icon v-else-if="isSaving" class="is-loading"><Loading /></el-icon>
        <span v-else-if="file">{{ lastSavedContent === content ? '已保存' : '未保存' }}</span>
      </div>
    </header>

    <div ref="editorBodyRef" class="editor-body">
      <div v-if="file" class="editor-container">
        <!-- 加载状态 -->
        <div v-show="isEditorLoading" class="loading-state">
          <el-icon class="is-loading" :size="48"><Loading /></el-icon>
          <p>正在加载编辑器...</p>
        </div>
        <!-- 编辑器 -->
        <div id="vditor" v-show="!isEditorLoading"></div>
      </div>
      <div v-else class="empty-state">
        <el-icon :size="64" :color="'var(--el-text-color-placeholder)'"><Document /></el-icon>
        <p>选择一个文件开始编辑</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { Fold, Expand, List, Document, Loading } from '@element-plus/icons-vue'
import { updateMarkdownContent } from '../api/contentService'
import { ElMessage } from 'element-plus'

const props = defineProps({
  file: {
    type: Object,
    required: false,
    default: null
  },
  content: {
    type: String,
    required: false,
    default: ''
  },
  version: {
    type: Number,
    required: false,
    default: null
  },
  isLoading: {
    type: Boolean,
    required: false,
    default: false
  },
  showOutline: {
    type: Boolean,
    default: true
  },
  showSidebar: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update-outline', 'toggle-outline', 'toggle-sidebar', 'content-change'])

const vditorInstance = ref(null)
const editorBodyRef = ref(null)
let resizeObserver = null
const sidebarTipVisible = ref(false)
const outlineTipVisible = ref(false)

// 本地加载状态
const isEditorLoading = ref(false)

// 自动保存状态
const isSaving = ref(false)
const lastSavedContent = ref('')
const currentVersion = ref(null)
let saveTimer = null

// 防抖函数
const debounce = (fn, delay) => {
  return (...args) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => fn(...args), delay)
  }
}

// 保存内容到后端
const saveContent = async (content) => {
  console.log('saveContent 被调用', {
    hasFileId: !!props.file?.id,
    contentLength: content?.length,
    isSameAsLast: content === lastSavedContent.value,
    lastSavedLength: lastSavedContent.value?.length
  })
  
  if (!props.file?.id || content === lastSavedContent.value) {
    console.log('跳过保存：', !props.file?.id ? '没有文件ID' : '内容未变化')
    return
  }
  
  const nodeId = props.file.id
  
  try {
    isSaving.value = true
    console.log('开始保存到后端，nodeId:', nodeId, 'version:', currentVersion.value)
    const result = await updateMarkdownContent(nodeId, content, currentVersion.value)
    console.log('保存成功，新版本:', result.version)
    
    currentVersion.value = result.version
    lastSavedContent.value = content
    
    emit('content-change', content)
  } catch (error) {
    console.error('保存内容失败:', error)
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

// 防抖后的保存函数（1秒延迟）
const debouncedSave = debounce(saveContent, 1000)

// 检测系统是否为深色模式
const isDarkMode = () => window.matchMedia('(prefers-color-scheme: dark)').matches

// 解析大纲
const parseOutline = (content) => {
  if (!content) {
    emit('update-outline', [])
    return
  }
  
  const headings = []
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim()
      })
    }
  }
  emit('update-outline', headings)
}

// 初始化编辑器
const initEditor = () => {
  if (vditorInstance.value) {
    try {
      // 检查实例是否完全初始化
      if (vditorInstance.value.element) {
        vditorInstance.value.destroy()
      }
    } catch (error) {
      console.warn('销毁旧编辑器失败:', error)
    }
    vditorInstance.value = null
  }

  if (!props.file) return

  // 开始加载
  isEditorLoading.value = true
  console.log('开始初始化 vditor，文件ID:', props.file.id)

  const dark = isDarkMode()

  try {
    vditorInstance.value = new Vditor('vditor', {
      height: '100%',
      width: '100%',
      mode: 'ir',
      placeholder: '开始写作...',
      theme: dark ? 'dark' : 'classic',
      preview: {
        theme: {
          current: dark ? 'dark' : 'light',
          path: 'https://unpkg.com/vditor/dist/css/content-theme'
        },
        hljs: {
          style: dark ? 'native' : 'github'
        }
      },
      cache: {
        enable: false
      },
      typewriterMode: false,
      toolbarConfig: {
        pin: true
      },
      toolbar: [
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        '|',
        'upload',
        'table',
        '|',
        'undo',
        'redo',
        '|',
        'preview',
        'fullscreen'
      ],
      input: (value) => {
        parseOutline(value)
        debouncedSave(value)
      },
      after: () => {
        console.log('vditor after 回调触发')
        // 确保vditor完全初始化后再设置内容
        nextTick(() => {
          if (vditorInstance.value) {
            console.log('vditor 初始化完成，准备加载内容')
            loadContent()
            // 加载完成，隐藏加载状态
            console.log('设置 isEditorLoading = false')
            isEditorLoading.value = false
            console.log('isEditorLoading 当前值:', isEditorLoading.value)
          } else {
            console.error('vditor 实例不存在')
            isEditorLoading.value = false
          }
        })
      }
    })
  } catch (error) {
    console.error('vditor 初始化失败:', error)
    isEditorLoading.value = false
    ElMessage.error('编辑器初始化失败')
  }
}

// 加载内容
const loadContent = () => {
  console.log('loadContent 被调用', {
    hasFile: !!props.file,
    hasInstance: !!vditorInstance.value,
    contentLength: props.content?.length || 0,
    propsVersion: props.version
  })
  
  if (props.file && vditorInstance.value) {
    const content = props.content || ''
    
    try {
      console.log('准备设置内容，长度:', content.length)
      vditorInstance.value.setValue(content)
      console.log('内容设置成功')
      parseOutline(content)
      lastSavedContent.value = content
      currentVersion.value = props.version
      console.log('loadContent 完成，currentVersion 设置为:', currentVersion.value)
    } catch (error) {
      console.error('设置内容失败:', error)
    }
  } else {
    console.warn('loadContent 条件不满足')
  }
}

// 监听文件变化
watch(
  () => props.file?.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      if (newId) {
        nextTick(() => {
          // 销毁旧编辑器并初始化新编辑器
          initEditor()
        })
      } else {
        // 如果变成了没有文件，清空内容但不销毁编辑器
        if (vditorInstance.value) {
          vditorInstance.value.setValue('')
          lastSavedContent.value = ''
          currentVersion.value = null
        }
      }
    }
  },
  { immediate: false }
)

// 监听外部内容变化
watch(
  () => props.content,
  (newContent) => {
    if (!vditorInstance.value || newContent === undefined || newContent === null) return
    
    try {
      const currentContent = vditorInstance.value.getValue()
      if (currentContent !== newContent) {
        vditorInstance.value.setValue(newContent)
        parseOutline(newContent)
        lastSavedContent.value = newContent
      }
    } catch (error) {
      // vditor 实例未完全初始化，忽略错误
    }
  }
)

// 高亮标题元素
const highlightHeading = (el) => {
  // 移除之前的高亮
  document.querySelectorAll('.heading-highlight').forEach((e) => {
    e.classList.remove('heading-highlight')
  })

  // 添加高亮
  el.classList.add('heading-highlight')

  // 2秒后移除高亮
  setTimeout(() => {
    el.classList.remove('heading-highlight')
  }, 2000)
}

// 监听滚动到标题事件
const handleScrollToHeading = (e) => {
  const heading = e.detail
  if (!heading) return

  // 在 IR 模式下查找标题元素
  const vditorElement = document.getElementById('vditor')
  if (!vditorElement) return

  // 查找所有标题元素
  const headingTag = `h${heading.level}`
  const headings = vditorElement.querySelectorAll(`.vditor-ir .vditor-reset ${headingTag}`)

  // 找到匹配的标题
  for (const el of headings) {
    // 获取标题文本（去除 marker 等额外元素）
    const textContent = el.textContent.replace(/^#+\s*/, '').trim()
    if (textContent === heading.text) {
      // 滚动到该元素
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      highlightHeading(el)
      return
    }
  }

  // 备用方案：通过内容查找
  const allHeadings = vditorElement.querySelectorAll(
    '.vditor-ir .vditor-reset h1, .vditor-ir .vditor-reset h2, .vditor-ir .vditor-reset h3, .vditor-ir .vditor-reset h4, .vditor-ir .vditor-reset h5, .vditor-ir .vditor-reset h6'
  )
  for (const el of allHeadings) {
    const textContent = el.textContent.replace(/^#+\s*/, '').trim()
    if (textContent === heading.text) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      highlightHeading(el)
      return
    }
  }
}

onMounted(() => {
  // 监听滚动到标题事件
  window.addEventListener('scroll-to-heading', handleScrollToHeading)
  
  // 监听窗口大小变化
  if (editorBodyRef.value) {
    resizeObserver = new ResizeObserver(() => {
      // 延迟执行，确保 vditor 实例完全初始化
      setTimeout(() => {
        if (vditorInstance.value && typeof vditorInstance.value.resize === 'function') {
          vditorInstance.value.resize()
        }
      }, 100)
    })
    resizeObserver.observe(editorBodyRef.value)
  }
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (vditorInstance.value) {
      vditorInstance.value.setTheme(
        e.matches ? 'dark' : 'classic',
        e.matches ? 'dark' : 'light',
        e.matches ? 'native' : 'github'
      )
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll-to-heading', handleScrollToHeading)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (vditorInstance.value) {
    try {
      // 检查实例是否完全初始化
      if (vditorInstance.value.element) {
        vditorInstance.value.destroy()
      }
    } catch (error) {
      console.warn('vditor 销毁失败:', error)
    }
    vditorInstance.value = null
  }
})

// 任何外部导致显示状态变化时，强制关闭提示
watch(
  () => props.showSidebar,
  () => {
    sidebarTipVisible.value = false
  }
)
watch(
  () => props.showOutline,
  () => {
    outlineTipVisible.value = false
  }
)
</script>

<style scoped>
.editor-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  height: 50px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}

.header-icon-btn {
  font-size: 18px;
  color: var(--color-text-secondary);
  padding: 8px;
}

.header-icon-btn:hover {
  color: var(--color-primary);
  background: var(--color-background-mute);
}

.title-input {
  flex: 1;
  max-width: 400px;
}

.title-input :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
}

.title-input :deep(.el-input__inner) {
    font-size: 16px;
    font-weight: 500;
  }

.save-status {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.save-status .is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.editor-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-container {
  height: 100%;
  position: relative;
}

#vditor {
  height: 100% !important;
}

.loading-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
}

.loading-state .is-loading {
  animation: rotating 2s linear infinite;
  margin-bottom: 16px;
}

.loading-state p {
  margin: 0;
  font-size: 14px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-placeholder);
}

.empty-state p {
  margin-top: 16px;
}

/* Dark Reader 风格深色模式 */
@media (prefers-color-scheme: dark) {
  .empty-state {
    color: var(--dr-text-muted, #8a8785);
  }
}
</style>

<style>
/* Vditor 工具栏居中 */
.vditor-toolbar {
  display: flex !important;
  justify-content: center !important;
  flex-wrap: wrap !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
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
  background-color: var(--el-color-warning-light-8) !important;
  border-radius: 4px;
  transition: background-color 0.3s ease;
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
