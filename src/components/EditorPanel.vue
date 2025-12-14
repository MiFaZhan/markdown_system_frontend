<template>
  <div class="editor-panel">
    <header class="editor-header">
      <el-input 
        v-model="title" 
        placeholder="请输入标题..." 
        class="title-input"
        @blur="saveTitle"
      />
      <el-button type="primary" size="small" @click="save">保存</el-button>
    </header>
    
    <div class="editor-body">
      <div id="vditor"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { ElMessage } from 'element-plus'
import { useFilesStore } from '../stores/files'

const props = defineProps({
  file: {
    type: Object,
    required: true
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

const emit = defineEmits(['update-outline', 'toggle-outline', 'toggle-sidebar'])

const filesStore = useFilesStore()
const title = ref('')
const vditorInstance = ref(null)

// 检测系统是否为深色模式
const isDarkMode = () => window.matchMedia('(prefers-color-scheme: dark)').matches

// 解析大纲
const parseOutline = (content) => {
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
    vditorInstance.value.destroy()
  }
  
  const dark = isDarkMode()
  
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
      enable: false,
    },
    typewriterMode: false,
    toolbarConfig: {
      pin: true,
    },
    toolbar: [
      {
        name: 'custom-sidebar',
        tip: '文件列表',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 3h8v18H3V3zm10 0h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>',
        click: () => {
          emit('toggle-sidebar')
        }
      },
      '|',
      'headings', 'bold', 'italic', 'strike', 'link', '|',
      'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
      'quote', 'line', 'code', 'inline-code', '|',
      'upload', 'table', '|',
      'undo', 'redo', '|',
      'preview', 'fullscreen', '|',
      {
        name: 'custom-outline',
        tip: '大纲',
        icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 4h18v2H3V4zm0 7h12v2H3v-2zm0 7h18v2H3v-2z"/></svg>',
        click: () => {
          emit('toggle-outline')
        }
      }
    ],
    input: (value) => {
      parseOutline(value)
    },
    after: () => {
      loadContent()
    },
  })
}

// 加载内容
const loadContent = () => {
  if (props.file) {
    title.value = props.file.name.replace(/\.md$/, '')
    vditorInstance.value?.setValue(props.file.content || '')
    parseOutline(props.file.content || '')
  }
}

// 保存标题
const saveTitle = () => {
  if (props.file && title.value) {
    const fileName = title.value.endsWith('.md') ? title.value : `${title.value}.md`
    filesStore.updateFile(props.file.id, { name: fileName })
  }
}

// 保存内容
const save = () => {
  if (!title.value) {
    ElMessage.warning('请输入标题')
    return
  }
  
  const content = vditorInstance.value?.getValue() || ''
  const fileName = title.value.endsWith('.md') ? title.value : `${title.value}.md`
  
  filesStore.updateFile(props.file.id, {
    name: fileName,
    content,
    updateTime: new Date().toLocaleString()
  })
  
  ElMessage.success('保存成功')
}

// 监听文件变化
watch(() => props.file?.id, (newId, oldId) => {
  if (newId !== oldId) {
    nextTick(() => {
      loadContent()
    })
  }
}, { immediate: false })

// 高亮标题元素
const highlightHeading = (el) => {
  // 移除之前的高亮
  document.querySelectorAll('.heading-highlight').forEach(e => {
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
  const allHeadings = vditorElement.querySelectorAll('.vditor-ir .vditor-reset h1, .vditor-ir .vditor-reset h2, .vditor-ir .vditor-reset h3, .vditor-ir .vditor-reset h4, .vditor-ir .vditor-reset h5, .vditor-ir .vditor-reset h6')
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
  initEditor()
  window.addEventListener('scroll-to-heading', handleScrollToHeading)
  
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
  if (vditorInstance.value) {
    vditorInstance.value.destroy()
    vditorInstance.value = null
  }
})
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

.editor-body {
  flex: 1;
  overflow: hidden;
}

#vditor {
  height: 100% !important;
}
</style>

<style>
/* Vditor 工具栏靠左 */
.vditor-toolbar.vditor-toolbar--pin {
  display: flex !important;
  justify-content: flex-start !important;
  flex-wrap: wrap !important;
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
  background-color: #fff3cd !important;
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
