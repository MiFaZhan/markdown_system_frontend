<template>
  <div class="editor-page">
    <header class="editor-header">
      <div class="left">
        <el-button :icon="Back" circle @click="$router.back()" />
        <el-input v-model="title" placeholder="请输入文章标题..." class="title-input" />
      </div>
      <div class="right">
        <el-button type="primary" @click="save">保存</el-button>
      </div>
    </header>
    
    <div class="editor-main">
      <div id="vditor"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Vditor from 'vditor'
import 'vditor/dist/index.css' // 引入样式
import { Back } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useFilesStore } from '../stores/files'

const route = useRoute()
const router = useRouter()
const filesStore = useFilesStore()

const title = ref('')
const vditorInstance = ref(null) // 保存 Vditor 实例

// 检测系统是否为深色模式
const isDarkMode = () => window.matchMedia('(prefers-color-scheme: dark)').matches

// 设置 Vditor 完整主题（工具栏、内容、代码块）
const setVditorTheme = (dark) => {
  if (vditorInstance.value) {
    vditorInstance.value.setTheme(
      dark ? 'dark' : 'classic',      // 工具栏主题
      dark ? 'dark' : 'light',        // 内容主题
      dark ? 'dracula' : 'github'     // 代码块主题
    )
  }
}

onMounted(() => {
  const dark = isDarkMode()
  
  // 1. 初始化 Vditor
  vditorInstance.value = new Vditor('vditor', {
    height: '100%',
    width: '100%',
    mode: 'ir', // 模式: sv(分屏), ir(即时渲染), wysiwyg(所见即所得)
    placeholder: '开始您的创作...',
    theme: dark ? 'dark' : 'classic',
    preview: {
      theme: {
        current: dark ? 'dark' : 'light',
        path: 'https://unpkg.com/vditor/dist/css/content-theme'
      },
      hljs: {
        style: dark ? 'dracula' : 'github'
      }
    },
    cache: {
      enable: false, // 禁用本地缓存，防止干扰模拟数据
    },
    toolbarConfig: {
      pin: true,
    },
    toolbar: [
      'headings', 'bold', 'italic', 'strike', 'link', '|',
      'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
      'quote', 'line', 'code', 'inline-code', '|',
      'upload', 'table', '|',
      'undo', 'redo', '|',
      'edit-mode', 'both', 'preview', 'outline', 'fullscreen', '|',
      'export', 'help'
    ],
    // Vditor 加载完成后的回调
    after: () => {
      loadContent()
    },
  })

  // 监听系统主题变化，动态切换 Vditor 主题
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    setVditorTheme(e.matches)
  })
})

// 组件销毁前销毁编辑器实例，清理内存
onBeforeUnmount(() => {
  if (vditorInstance.value) {
    vditorInstance.value.destroy()
    vditorInstance.value = null
  }
})

// 加载数据
const loadContent = () => {
  if (route.params.id && route.params.id !== 'new') {
    const file = filesStore.getFile(route.params.id)
    if (file) {
      title.value = file.name
      vditorInstance.value.setValue(file.content || '')
    } else {
      ElMessage.error('文件不存在')
      router.push('/')
    }
  } else {
    // 新建时的默认内容
    vditorInstance.value.setValue('# 新建\n开始写作...')
  }
}

const save = () => {
  if (!title.value) return ElMessage.warning('请输入标题')
  
  const content = vditorInstance.value.getValue()
  const now = new Date().toLocaleString()
  
  if (route.params.id && route.params.id !== 'new') {
    // 更新现有文件
    filesStore.updateFile(route.params.id, {
      name: title.value,
      content,
      updateTime: now
    })
  } else {
    // 新建文件
    filesStore.addFile({
      id: Date.now(),
      name: title.value.endsWith('.md') ? title.value : `${title.value}.md`,
      content,
      updateTime: now,
      author: 'Admin'
    })
  }
  
  ElMessage.success('保存成功')
  setTimeout(() => router.push('/'), 500)
}
</script>

<style scoped>
.editor-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-header {
  height: 60px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0; /* 防止头部被压缩 */
}

.left {
  display: flex;
  align-items: center;
  gap: 15px;
  flex: 1;
}

.title-input {
  max-width: 400px;
}

.editor-main {
  flex: 1;
  overflow: hidden; /* 必须设置，否则 Vditor 可能会撑开页面 */
  padding: 10px;    /* 可选：给编辑器留一点边距 */
  background-color: var(--color-background-mute);
}

/* 确保 Vditor 容器撑满父元素 */
#vditor {
  height: 100%;
}
</style>

<style>
/* 工具栏始终居中 */
.vditor-toolbar.vditor-toolbar--pin {
  display: flex !important;
  justify-content: center !important;
  flex-wrap: wrap !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

/* 隐藏 edit-mode 下拉菜单中的"所见即所得"选项 */
.vditor-toolbar .vditor-panel--arrow button[data-mode="wysiwyg"] {
  display: none !important;
}
</style>
