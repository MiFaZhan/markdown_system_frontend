<template>
  <div class="projects-page">
    <header class="projects-header">
      <div class="header-left">
        <span class="logo">My Notes</span>
      </div>
      <div class="header-right">
        <el-button type="danger" link @click="userStore.logout">退出登录</el-button>
      </div>
    </header>

    <main class="projects-main">
      <div class="section-header">
        <h2 class="section-title">我的项目</h2>
        <el-button type="primary" :icon="Plus" class="create-btn" @click="showCreateDialog" />
        <div class="section-controls">
          <el-select
            v-model="sortField"
            placeholder="排序字段"
            style="width: 120px"
            @change="handleSortChange"
          >
            <el-option label="创建时间" value="creation_time" />
            <el-option label="更新时间" value="update_time" />
            <el-option label="项目名称" value="project_name" />
          </el-select>
          <el-select
            v-model="sortOrder"
            placeholder="排序方向"
            style="width: 100px"
            @change="handleSortChange"
          >
            <el-option label="升序" value="asc" />
            <el-option label="降序" value="desc" />
          </el-select>
        </div>
        <div class="search-input">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索项目名称"
            :prefix-icon="Search"
            clearable
            style="width: 200px"
            @input="handleSearch"
          />
        </div>
        <div class="view-controls">
          <el-button-group>
            <el-button
              :type="viewMode === 'card' ? 'primary' : ''"
              :icon="Grid"
              size="small"
              @click="viewMode = 'card'"
            >
              卡片
            </el-button>
            <el-button
              :type="viewMode === 'list' ? 'primary' : ''"
              :icon="List"
              size="small"
              @click="viewMode = 'list'"
            >
              列表
            </el-button>
          </el-button-group>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="projectsStore.loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>

      <!-- 项目展示区域 -->
      <div v-else>
        <!-- 卡片视图 -->
        <div v-if="viewMode === 'card'" class="projects-grid">
          <div
            v-for="project in projectsStore.projectList"
            :key="project.id"
            class="project-card"
            @click="enterProject(project)"
          >
            <div class="project-actions">
              <el-dropdown trigger="click" @command="handleCommand($event, project)">
                <button class="more-btn" @click.stop>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
                    <path
                      fill="currentColor"
                      d="M176 416a112 112 0 1 1 0 224 112 112 0 0 1 0-224m336 0a112 112 0 1 1 0 224 112 112 0 0 1 0-224m336 0a112 112 0 1 1 0 224 112 112 0 0 1 0-224"
                    ></path>
                  </svg>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑项目</el-dropdown-item>
                    <el-dropdown-item command="delete">删除项目</el-dropdown-item>
                    <el-dropdown-item command="view" divided>属性</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="project-content">
              <div class="project-icon">{{ project.icon }}</div>
              <h3 class="project-name">{{ project.name }}</h3>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="projects-list">
          <!-- 表头 -->
          <div class="projects-list-header">
            <div class="header-icon"></div>
            <div class="header-name sortable-header" @click="handleListSort('project_name')">
              名称
              <el-icon v-if="isUserSorted && sortField === 'project_name'" class="sort-icon">
                <ArrowUp v-if="sortOrder === 'asc'" />
                <ArrowDown v-else />
              </el-icon>
            </div>
            <div class="header-date sortable-header" @click="handleListSort('creation_time')">
              创建时间
              <el-icon v-if="isUserSorted && sortField === 'creation_time'" class="sort-icon">
                <ArrowUp v-if="sortOrder === 'asc'" />
                <ArrowDown v-else />
              </el-icon>
            </div>
            <div class="header-update sortable-header" @click="handleListSort('update_time')">
              更新时间
              <el-icon v-if="isUserSorted && sortField === 'update_time'" class="sort-icon">
                <ArrowUp v-if="sortOrder === 'asc'" />
                <ArrowDown v-else />
              </el-icon>
            </div>
            <div class="header-desc">项目描述</div>
            <div class="header-actions"></div>
          </div>

          <!-- 项目列表 -->
          <div
            v-for="project in projectsStore.projectList"
            :key="project.id"
            class="project-list-item"
            @click="enterProject(project)"
          >
            <div class="list-icon">{{ project.icon }}</div>
            <div class="list-name">{{ project.name }}</div>
            <div class="list-date">{{ formatDate(project.creationTime) }}</div>
            <div class="list-update">{{ formatDate(project.updateTime) }}</div>
            <div class="list-desc">{{ project.description || '' }}</div>
            <div class="list-actions">
              <el-dropdown trigger="click" @command="handleCommand($event, project)">
                <el-button type="text" :icon="MoreFilled" @click.stop />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">编辑项目</el-dropdown-item>
                    <el-dropdown-item command="delete">删除项目</el-dropdown-item>
                    <el-dropdown-item command="view" divided>属性</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-if="projectsStore.projectList.length === 0 && !projectsStore.loading"
          class="empty-state"
        >
          <el-icon :size="64" :color="'var(--el-text-color-placeholder)'"><FolderOpened /></el-icon>
          <p>还没有项目，点击上方按钮创建</p>
        </div>
      </div>

      <!-- 分页组件 -->
      <!-- <div v-if="projectsStore.pagination.total > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[5, 10, 20, 50]"
            :total="projectsStore.pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div> -->
    </main>

    <!-- 新建/编辑项目对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingProject ? '编辑项目' : '新建项目'"
      width="400px"
    >
      <el-form ref="formRef" :model="projectForm" :rules="formRules" label-width="80px">
        <el-form-item label="项目名称" prop="name">
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
        <el-button type="primary" :loading="submitLoading" @click="saveProject">确定</el-button>
      </template>
    </el-dialog>

    <!-- 项目属性对话框 -->
    <el-dialog v-model="propertyDialogVisible" title="项目属性" width="500px">
      <div v-if="propertyLoading" class="property-loading">
        <el-skeleton :rows="6" animated />
      </div>
      <div v-else-if="projectProperty" class="project-property">
        <div class="property-item">
          <label class="property-label">项目图标：</label>
          <span class="property-value">{{ projectProperty.icon }}</span>
        </div>
        <div class="property-item">
          <label class="property-label">项目名称：</label>
          <span class="property-value">{{ projectProperty.projectName }}</span>
        </div>
        <div class="property-item">
          <label class="property-label">创建时间：</label>
          <span class="property-value">{{ formatTime(projectProperty.creationTime) }}</span>
        </div>
        <div class="property-item">
          <label class="property-label">更新时间：</label>
          <span class="property-value">{{ formatTime(projectProperty.updateTime) }}</span>
        </div>
        <div class="property-item">
          <label class="property-label">项目描述：</label>
          <span class="property-value">{{ projectProperty.description || '暂无描述' }}</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="propertyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  FolderAdd,
  MoreFilled,
  FolderOpened,
  Grid,
  List,
  ArrowUp,
  ArrowDown,
  Search
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useProjectsStore } from '../stores/projects'

const router = useRouter()
const userStore = useUserStore()
const projectsStore = useProjectsStore()

const dialogVisible = ref(false)
const editingProject = ref(null)
const submitLoading = ref(false)
const formRef = ref()

const searchKeyword = ref('')

// 项目属性对话框
const propertyDialogVisible = ref(false)
const projectProperty = ref(null)
const propertyLoading = ref(false)

// 排序控制
const sortField = ref('creation_time')
const sortOrder = ref('asc')
const isUserSorted = ref(false)

// 视图模式控制
const viewMode = ref('card') // 'card' 或 'list'

// 表单数据
const projectForm = ref({
  name: '',
  icon: '📁',
  description: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入项目名称', trigger: 'blur' },
    { min: 1, max: 50, message: '项目名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

// 图标列表
const iconList = ['📁', '📚', '💼', '🎯', '🚀', '⭐', '🔥', '💡', '🎨', '🔧', '📊', '🌟']

// 日期格式化 - 只显示年月日
function formatDate(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date
    .toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    .replace(/\//g, '-')
}

// 时间格式化 - 保留原函数以备其他地方使用
function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 排序变化处理
function handleSortChange() {
  projectsStore.setSortConfig(sortField.value, sortOrder.value, searchKeyword.value)
}

// 搜索处理
function handleSearch() {
  projectsStore.fetchProjects({ keyword: searchKeyword.value })
}

// 列表排序处理
function handleListSort(field) {
  if (sortField.value === field) {
    // 如果点击的是当前排序字段，切换排序方向
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    // 如果点击的是新字段，设置为该字段并默认升序
    sortField.value = field
    sortOrder.value = 'asc'
  }
  isUserSorted.value = true
  handleSortChange()
}

// 显示创建对话框
function showCreateDialog() {
  editingProject.value = null
  projectForm.value = {
    name: '',
    icon: '📁',
    description: ''
  }
  dialogVisible.value = true
}

// 进入项目工作区
function enterProject(project) {
  console.log('点击项目:', project)

  // 设置当前项目ID
  projectsStore.setCurrentProject(project.id)
  console.log('设置当前项目ID:', project.id)

  // 跳转到工作区页面，使用项目ID作为URL参数
  const targetPath = `/project/${project.id}`
  console.log('准备跳转到:', targetPath)

  router.push(targetPath)
}

// 处理项目操作
function handleCommand(command, project) {
  if (command === 'view') {
    showProjectProperty(project)
  } else if (command === 'edit') {
    editingProject.value = project
    projectForm.value = {
      name: project.name,
      icon: project.icon,
      description: project.description
    }
    dialogVisible.value = true
  } else if (command === 'delete') {
    ElMessageBox.confirm(`确定要删除项目"${project.name}"吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      projectsStore.deleteProject(project.id)
    })
  }
}

// 保存项目
async function saveProject() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitLoading.value = true

    if (editingProject.value) {
      // 更新项目
      await projectsStore.updateProject({
        id: editingProject.value.id,
        name: projectForm.value.name,
        icon: projectForm.value.icon,
        description: projectForm.value.description
      })
    } else {
      // 创建项目
      await projectsStore.createProject(projectForm.value)
    }

    dialogVisible.value = false
  } catch (error) {
    console.error('保存项目失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 显示项目属性
async function showProjectProperty(project) {
  propertyLoading.value = true
  propertyDialogVisible.value = true

  try {
    const result = await projectsStore.getProjectDetail(project.id)
    projectProperty.value = result
  } catch (error) {
    console.error('获取项目详情失败:', error)
    ElMessage.error('获取项目详情失败')
    propertyDialogVisible.value = false
  } finally {
    propertyLoading.value = false
  }
}

// 页面加载时获取项目列表
onMounted(async () => {
  console.log('Projects页面加载，开始获取项目列表')
  await projectsStore.fetchProjects()
  console.log('项目列表获取完成:', projectsStore.projectList)
})
</script>

<style scoped>
.projects-page {
  min-height: 100vh;
  background: var(--color-background);
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 40px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.logo {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
}

.projects-main {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 30px;
}

.section-title {
  margin: 0;
  color: var(--color-heading);
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.create-btn {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 6px;
  height: 28px;
}

.view-controls {
  display: flex;
  align-items: center;
}

.loading-container {
  padding: 20px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-bottom: 30px;
  padding: 16px;
  border-radius: 8px;
}

.project-card {
  background: transparent;
  border-radius: 4px;
  padding: 16px 12px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 140px;
  box-sizing: border-box;
  border: 1px solid transparent;
}

.project-card:hover {
  background: var(--el-fill-color);
}

.project-card:hover .more-btn {
  opacity: 1;
}

.project-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.project-icon {
  font-size: 64px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 96px;
  height: 96px;
}

.project-name {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  width: 100%;
  max-width: 120px;
}

.project-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  flex-shrink: 0;
}

.more-btn {
  padding: 4px;
  font-size: 16px;
  border: none;
  background: transparent;
  color: var(--el-text-color-primary);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
  transition: all 0.15s ease;
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .more-btn {
    opacity: 0.3;
  }
}

.more-btn:hover {
  background: var(--el-fill-color-dark);
  opacity: 1;
}

.more-btn svg {
  width: 14px;
  height: 14px;
}

/* 列表视图样式 - Windows资源管理器风格 */
.projects-list {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 30px;
  box-shadow: var(--el-box-shadow-light);
}

.projects-list-header {
  display: grid;
  grid-template-columns: 40px 220px 130px 130px 300px 50px;
  align-items: center;
  padding: 12px 20px;
  background: var(--el-fill-color);
  border-bottom: 1px solid var(--el-border-color);
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  overflow: hidden;
}

.header-icon,
.header-name,
.header-date,
.header-update,
.header-desc,
.header-actions {
  padding: 0 6px;
}

.header-name {
  text-align: left;
}

.header-date {
  text-align: left;
}

.header-update {
  text-align: left;
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border-radius: 4px;
  padding: 4px 6px !important;
  margin: -4px 0;
  position: relative;
  z-index: 1;
}

.sortable-header:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.sort-icon {
  font-size: 12px;
  opacity: 0.8;
}

.project-list-item {
  display: grid;
  grid-template-columns: 40px 220px 130px 130px 300px 50px;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--el-border-color-lighter);
  min-height: 48px;
}

.project-list-item:last-child {
  border-bottom: none;
}

.project-list-item:hover {
  background: var(--el-fill-color-light);
  border-left: 3px solid var(--el-color-primary);
  padding-left: 17px;
}

.project-list-item:active {
  background: var(--el-fill-color);
}

.list-icon {
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.list-name {
  font-size: 14px;
  color: var(--color-heading);
  font-weight: 500;
  padding: 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.list-date {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 0 6px;
  text-align: left;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.list-update {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 0 6px;
  text-align: left;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.list-desc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  padding: 0 6px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.list-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}

.list-actions .el-button {
  padding: 6px;
  font-size: 14px;
  border: none;
  background: transparent;
  color: var(--el-text-color-placeholder);
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: all 0.2s ease;
}

.list-actions .el-button:hover {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  transform: scale(1.1);
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--el-text-color-placeholder);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.icon-selector {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  max-width: 240px;
}

.icon-option {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.3s;
}

.icon-option:hover {
  border-color: var(--el-color-primary);
}

.icon-option.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.property-loading {
  padding: 20px;
}

.project-property {
  padding: 10px 0;
}

.property-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  line-height: 1.5;
}

.property-label {
  font-weight: 600;
  color: var(--el-text-color-secondary);
  width: 100px;
  flex-shrink: 0;
  text-align: right;
  margin-right: 16px;
}

.property-value {
  color: var(--color-text);
  flex: 1;
  word-break: break-word;
}

/* 响应式布局：逐步隐藏列 */
@media (max-width: 1024px) {
  .projects-list-header,
  .project-list-item {
    grid-template-columns: 40px 1fr 130px 130px 50px;
  }

  .header-desc,
  .list-desc {
    display: none;
  }
}

@media (max-width: 768px) {
  .projects-header {
    padding: 15px 20px;
  }

  .projects-main {
    padding: 20px;
  }

  .section-header {
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .section-title {
    font-size: 20px;
  }

  /* 搜索框在移动端独占一行，放在最后 */
  .search-input {
    order: 10;
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }

  .search-input .el-input {
    width: 100% !important;
  }

  /* 调整控件区域 */
  .section-controls {
    flex: 1;
    justify-content: flex-end;
    min-width: auto;
  }

  /* 隐藏部分排序控件以节省空间（可选，视情况而定，这里先保持显示但缩小间距） */
  .section-controls .el-select {
    width: 90px !important;
  }

  .view-controls {
    margin-left: 0;
  }

  /* 移动端视图切换按钮：只保留图标 */
  .view-controls .el-button span {
    display: none;
  }

  .view-controls .el-button {
    padding: 8px !important;
  }

  /* 超窄屏布局适配 (< 495px) */
  @media (max-width: 495px) {
    .section-header {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'title create'
        'controls view'
        'search search';
      gap: 12px;
      align-items: center;
    }

    .section-title {
      grid-area: title;
    }

    .create-btn {
      grid-area: create;
      justify-self: end;
    }

    .section-controls {
      grid-area: controls;
      justify-content: flex-start;
      /* 此时不需要 flex: 1，因为 Grid 已经控制了位置 */
      flex: initial;
    }

    .section-controls .el-select {
      /* 下拉框宽度自适应，避免溢出 */
      width: 85px !important;
    }

    .view-controls {
      grid-area: view;
      justify-self: end;
      margin-left: 0;
    }

    .search-input {
      grid-area: search;
      width: 100%;
      margin-top: 0;
      /* 重置之前 flex 下的 order */
      order: unset;
    }
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  /* 移动端列表视图：只保留核心列 */
  .projects-list-header,
  .project-list-item {
    grid-template-columns: 40px 1fr 50px;
  }

  /* 隐藏时间列 */
  .header-date,
  .list-date,
  .header-update,
  .list-update {
    display: none;
  }
}

/* 深色模式特殊处理 */
@media (prefers-color-scheme: dark) {
  .project-card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .projects-list {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .sortable-header:hover {
    background: rgba(92, 154, 255, 0.15);
  }

  .list-actions .el-button:hover {
    background: rgba(92, 154, 255, 0.15);
  }
}
</style>
