<template>
  <el-container class="layout-container">
    <el-header class="header">
      <div class="logo">My Notes</div>
      <el-button type="danger" link @click="userStore.logout">退出登录</el-button>
    </el-header>
    
    <el-main>
      <div class="toolbar">
        <h3>文件列表</h3>
        <el-button type="primary" :icon="Plus" @click="createNew">新建文档</el-button>
      </div>

      <el-card shadow="never">
        <el-table :data="fileList" style="width: 100%">
          <el-table-column prop="name" label="文件名" width="300">
            <template #default="scope">
              <el-icon style="vertical-align: middle; margin-right: 5px"><Document /></el-icon>
              <span>{{ scope.row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="updateTime" label="最后修改时间" />
          <el-table-column prop="author" label="作者" />
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button size="small" @click="editFile(scope.row.id)">编辑</el-button>
              <el-button size="small" type="danger" @click="deleteFile(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Plus, Document } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 模拟数据
const fileList = ref([
  { id: 1, name: 'Vue3 学习笔记.md', updateTime: '2023-10-24 10:00', author: 'Admin' },
  { id: 2, name: '项目需求文档.md', updateTime: '2023-10-23 15:30', author: 'Admin' },
  { id: 3, name: '会议记录_2023.md', updateTime: '2023-10-22 09:20', author: 'Admin' },
])

const createNew = () => {
  router.push('/editor/new')
}

const editFile = (id) => {
  router.push(`/editor/${id}`)
}

const deleteFile = (id) => {
  ElMessageBox.confirm('确定要删除该文件吗?', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    fileList.value = fileList.value.filter(f => f.id !== id)
    ElMessage.success('删除成功')
  })
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
</style>