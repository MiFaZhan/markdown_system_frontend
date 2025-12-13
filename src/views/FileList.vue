<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="logo">My Notes</div>
      <el-button type="danger" link @click="userStore.logout">退出登录</el-button>
    </el-header>
    
    <el-main>
      <div class="toolbar">
        <h3>文件列表</h3>
        <div class="toolbar-actions">
          <el-dropdown @command="handleCreate" trigger="hover">
            <el-button type="primary" :icon="Plus">
              新建<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="folder" :icon="Folder">文件夹</el-dropdown-item>
                <el-dropdown-item command="file" :icon="Document">Markdown文件</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown @command="handleImport">
            <el-button type="success" :icon="Upload">
              导入<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="url">从URL导入</el-dropdown-item>
                <el-dropdown-item command="file">从文件导入</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- URL导入对话框 -->
      <el-dialog v-model="urlDialogVisible" title="从URL导入" width="500">
        <el-form :model="urlForm">
          <el-form-item label="URL地址">
            <el-input v-model="urlForm.url" placeholder="请输入Markdown文件的URL地址" />
          </el-form-item>
          <el-form-item label="文件名">
            <el-input v-model="urlForm.name" placeholder="请输入保存的文件名" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="urlDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="importFromUrl" :loading="importing">导入</el-button>
        </template>
      </el-dialog>

      <!-- 文件导入隐藏input -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".md,.markdown"
        style="display: none"
        @change="handleFileSelect"
      />

      <el-card shadow="never">
        <el-table 
          :data="fileList" 
          style="width: 100%"
          row-key="id"
          :tree-props="{ children: 'children' }"
          default-expand-all
        >
          <el-table-column prop="name" label="文件名">
            <template #default="scope">
              <span 
                :class="['file-name', { 'is-folder': scope.row.type === 'folder' }]"
                @click="handleRowClick(scope.row)"
              >
                <el-icon style="vertical-align: middle; margin-right: 5px">
                  <Folder v-if="scope.row.type === 'folder'" />
                  <Document v-else />
                </el-icon>
                {{ scope.row.name }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="updateTime" label="最后修改时间" width="200" />
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <template v-if="scope.row.type === 'folder'">
                <el-button size="small" @click="createInFolder(scope.row.id)">新建文件</el-button>
              </template>
              <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useFilesStore } from '../stores/files'
import { Plus, Document, Upload, ArrowDown, Folder } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()
const filesStore = useFilesStore()

const fileList = computed(() => filesStore.fileList)

const handleCreate = (command) => {
  if (command === 'file') {
    router.push('/editor/new')
  } else if (command === 'folder') {
    ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '文件夹名称不能为空'
    }).then(({ value }) => {
      filesStore.addFile({
        id: Date.now(),
        name: value,
        type: 'folder',
        updateTime: new Date().toLocaleString(),
        children: []
      })
      ElMessage.success('文件夹创建成功')
    }).catch(() => {})
  }
}

const handleRowClick = (row) => {
  if (row.type !== 'folder') {
    router.push(`/editor/${row.id}`)
  }
}

const createInFolder = (folderId) => {
  ElMessageBox.prompt('请输入文件名', '新建文件', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '文件名不能为空'
  }).then(({ value }) => {
    const fileName = value.endsWith('.md') ? value : `${value}.md`
    filesStore.addFile({
      id: Date.now(),
      name: fileName,
      type: 'file',
      updateTime: new Date().toLocaleString(),
      content: `# ${value}\n\n开始写作...`
    }, folderId)
    ElMessage.success('文件创建成功')
  }).catch(() => {})
}

const handleDelete = (row) => {
  const msg = row.type === 'folder' ? '确定要删除该文件夹及其所有内容吗?' : '确定要删除该文件吗?'
  ElMessageBox.confirm(msg, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    filesStore.deleteFile(row.id)
    ElMessage.success('删除成功')
  })
}

// 导入相关
const urlDialogVisible = ref(false)
const importing = ref(false)
const fileInputRef = ref(null)
const urlForm = ref({
  url: '',
  name: ''
})

const handleImport = (command) => {
  if (command === 'url') {
    urlForm.value = { url: '', name: '' }
    urlDialogVisible.value = true
  } else if (command === 'file') {
    fileInputRef.value?.click()
  }
}

const importFromUrl = async () => {
  if (!urlForm.value.url) {
    ElMessage.warning('请输入URL地址')
    return
  }
  importing.value = true
  try {
    const response = await fetch(urlForm.value.url)
    if (!response.ok) throw new Error('获取文件失败')
    const content = await response.text()
    
    const fileName = urlForm.value.name || urlForm.value.url.split('/').pop() || '导入文档.md'
    const newFile = {
      id: Date.now(),
      name: fileName.endsWith('.md') ? fileName : `${fileName}.md`,
      updateTime: new Date().toLocaleString(),
      author: 'Admin',
      content
    }
    filesStore.addFile(newFile)
    urlDialogVisible.value = false
    ElMessage.success('导入成功')
  } catch (error) {
    ElMessage.error('导入失败: ' + error.message)
  } finally {
    importing.value = false
  }
}

const handleFileSelect = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result
    const newFile = {
      id: Date.now(),
      name: file.name,
      updateTime: new Date().toLocaleString(),
      author: 'Admin',
      content
    }
    filesStore.addFile(newFile)
    ElMessage.success('导入成功')
  }
  reader.onerror = () => {
    ElMessage.error('读取文件失败')
  }
  reader.readAsText(file)
  event.target.value = '' // 清空以便重复选择同一文件
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background-color: var(--color-background-mute);
}
.header {
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}
.logo {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  color: var(--color-text);
}
.toolbar-actions {
  display: flex;
  gap: 10px;
}
.file-name {
  cursor: pointer;
  color: #409eff;
}
.file-name:hover {
  text-decoration: underline;
}
.file-name.is-folder {
  color: #e6a23c;
}
.file-name.is-folder:hover {
  text-decoration: none;
  cursor: default;
}
</style>