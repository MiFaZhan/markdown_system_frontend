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

const route = useRoute()
const router = useRouter()

const title = ref('')
const vditorInstance = ref(null) // 保存 Vditor 实例

onMounted(() => {
  // 1. 初始化 Vditor
  vditorInstance.value = new Vditor('vditor', {
    height: '100%',
    width: '100%',
    mode: 'sv', // 模式: sv(分屏), ir(即时渲染), wysiwyg(所见即所得)
    placeholder: '开始您的创作...',
    cache: {
      enable: false, // 禁用本地缓存，防止干扰模拟数据
    },
    toolbarConfig: {
      pin: true,
    },
    // Vditor 加载完成后的回调
    after: () => {
      loadContent()
    },
  })
})

// 组件销毁前销毁编辑器实例，清理内存
onBeforeUnmount(() => {
  if (vditorInstance.value) {
    vditorInstance.value.destroy()
    vditorInstance.value = null
  }
})

// 模拟加载数据
const loadContent = () => {
  if (route.params.id && route.params.id !== 'new') {
    title.value = 'Vue3 学习笔记.md'
    // 使用 setValue 设置内容
    vditorInstance.value.setValue('## 这是基于 Vditor 的内容\n\n- 功能强大\n- 支持所见即所得\n- 原生 JS 编写')
  } else {
    // 新建时的默认内容
    vditorInstance.value.setValue('# 新建文档\n开始写作...')
  }
}

const save = () => {
  if (!title.value) return ElMessage.warning('请输入标题')
  
  // 使用 getValue 获取 Markdown 内容
  const content = vditorInstance.value.getValue()
  
  console.log('Save:', { title: title.value, content: content })
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
  background: #fff;
  border-bottom: 1px solid #ddd;
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
  background-color: #f5f7fa;
}

/* 确保 Vditor 容器撑满父元素 */
#vditor {
  height: 100%;
}
</style>