<template>
  <div class="projects-page">
    <header class="projects-header">
      <div class="header-left">
        <span class="logo">My Notes</span>
      </div>
      <div class="header-right">
        <el-button type="primary" :icon="Plus" @click="showCreateDialog">新建项目</el-button>
        <el-button type="danger" link @click="userStore.logout">退出登录</el-button>
      </div>
    </header>

    <main class="projects-main">
      <h2 class="section-title">我的项目</h2>

      <div class="projects-grid">
        <div
          v-for="project in projectsStore.projectList"
          :key="project.id"
          class="project-card"
          @click="enterProject(project)"
        >
          <div class="project-icon">{{ project.icon }}</div>
          <div class="project-info">
            <h3 class="project-name">{{ project.name }}</h3>
            <p class="project-desc">{{ project.description || '暂无描述' }}</p>
            <span class="project-time">{{ project.updateTime }}</span>
          </div>
          <el-dropdown trigger="click" @click.stop @command="handleCommand($event, project)">
            <el-icon class="project-more"><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">编辑</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- 空状态 -->
        <div v-if="projectsStore.projectList.length === 0" class="empty-state">
          <el-icon :size="64" color="#ddd"><FolderOpened /></el-icon>
          <p>还没有项目，点击上方按钮创建</p>
        </div>
      </div>
    </main>

    <!-- 新建/编辑项目对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingProject ? '编辑项目' : '新建项目'"
      width="400px"
    >
      <el-form :model="projectForm" label-width="80px">
        <el-form-item label="项目名称">
          <el-input v-model="projectForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目图标">
          <div class="icon-selector">
            <div
              v-for="icon in iconList"
              :key="icon"
              class="icon-option"
              :class="{ active: projectForm.icon === icon }"
              @click="projectForm.icon = icon"
            >
              {{ icon }}
            </div>
          </div>
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input
            v-model="projectForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入项目描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProject">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, MoreFilled, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useProjectsStore } from '../stores/projects'

const router = useRouter()
const userStore = useUserStore()
const projectsStore = useProjectsStore()

const dialogVisible = ref(false)
const editingProject = ref(null)
const projectForm = ref({
  name: '',
  icon: '📁',
  description: ''
})

// 可选图标列表
const iconList = [
  '📁',
  '📂',
  '📚',
  '📖',
  '📝',
  '✏️',
  '📋',
  '📄',
  '💼',
  '🎯',
  '🚀',
  '💡',
  '🔧',
  '⚙️',
  '🎨',
  '🎬',
  '🎵',
  '🎮',
  '📷',
  '🌟',
  '❤️',
  '🔥',
  '✨',
  '🌈',
  '🏠',
  '🌍',
  '🎁',
  '📦',
  '🔒',
  '🔑',
  '💰',
  '📊'
]

const showCreateDialog = () => {
  editingProject.value = null
  projectForm.value = { name: '', icon: '📁', description: '' }
  dialogVisible.value = true
}

const enterProject = (project) => {
  projectsStore.setCurrentProject(project.id)
  router.push(`/project/${project.id}`)
}

const handleCommand = (command, project) => {
  if (command === 'edit') {
    editingProject.value = project
    projectForm.value = {
      name: project.name,
      icon: project.icon,
      description: project.description
    }
    dialogVisible.value = true
  } else if (command === 'delete') {
    ElMessageBox.confirm('确定要删除该项目吗？项目内的所有文件都将被删除。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        projectsStore.deleteProject(project.id)
        ElMessage.success('删除成功')
      })
      .catch(() => {})
  }
}

const saveProject = () => {
  if (!projectForm.value.name) {
    ElMessage.warning('请输入项目名称')
    return
  }

  if (editingProject.value) {
    projectsStore.updateProject(editingProject.value.id, {
      ...projectForm.value,
      updateTime: new Date().toLocaleString()
    })
    ElMessage.success('更新成功')
  } else {
    projectsStore.addProject({
      id: Date.now(),
      ...projectForm.value,
      updateTime: new Date().toLocaleString(),
      files: []
    })
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
}
</script>

<style scoped>
.projects-page {
  min-height: 100vh;
  background: var(--color-background-mute);
}

.projects-header {
  height: 60px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.projects-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: var(--color-text);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.project-card {
  background: var(--color-background);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.project-icon {
  font-size: 40px;
  line-height: 1;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-text);
}

.project-desc {
  font-size: 13px;
  color: #909399;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-time {
  font-size: 12px;
  color: #c0c4cc;
}

.project-more {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 18px;
  color: #909399;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.project-card:hover .project-more {
  opacity: 1;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #999;
}

.empty-state p {
  margin-top: 16px;
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.icon-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.icon-option:hover {
  background: var(--color-background-mute);
}

.icon-option.active {
  border-color: #409eff;
  background: #ecf5ff;
}

/* Dark Reader 风格深色模式 */
@media (prefers-color-scheme: dark) {
  .project-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .project-desc {
    color: var(--dr-text-secondary, #b8b5b2);
  }

  .project-time {
    color: var(--dr-text-muted, #8a8785);
  }

  .project-more {
    color: var(--dr-text-muted, #8a8785);
  }

  .empty-state {
    color: var(--dr-text-muted, #8a8785);
  }

  .icon-option:hover {
    background: var(--dr-bg-hover, #303234);
  }

  .icon-option.active {
    border-color: var(--dr-accent, #5c9aff);
    background: rgba(92, 154, 255, 0.15);
  }
}
</style>
