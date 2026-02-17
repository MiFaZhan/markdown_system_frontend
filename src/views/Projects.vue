<template>
  <div class="projects-page">
    <ProjectsHeader />

    <main class="projects-main">
      <ProjectsSectionHeader
        v-model:view-mode="viewMode"
        v-model:sort-field="sortField"
        v-model:sort-order="sortOrder"
        v-model:search-keyword="searchKeyword"
        @handle-sort-change="handleSortChange"
        @create-project="showCreateDialog"
      />

      <div v-if="projectsStore.loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>

      <div v-else>
        <ProjectGrid
          v-if="viewMode === 'card'"
          :projects="projectsStore.projectList"
          @enter-project="enterProject"
          @edit-project="handleEditProject"
          @delete-project="handleDeleteProject"
          @view-property="showProjectProperty"
        />

        <ProjectList
          v-else
          :projects="projectsStore.projectList"
          :sort-field="sortField"
          :sort-order="sortOrder"
          :is-user-sorted="isUserSorted"
          @enter-project="enterProject"
          @edit-project="handleEditProject"
          @delete-project="handleDeleteProject"
          @view-property="showProjectProperty"
          @handle-list-sort="handleListSort"
        />

        <EmptyState v-if="projectsStore.projectList.length === 0" />
      </div>

      <div class="recycle-entry">
        <el-tooltip content="项目回收站" placement="left">
          <el-button
            type="primary"
            :icon="Delete"
            size="small"
            class="recycle-btn"
            @click="showRecycleBinDialog"
          />
        </el-tooltip>
      </div>
    </main>

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

    <ProjectFormDialog
      v-model:visible="dialogVisible"
      :editing-project="editingProject"
      @save="handleSaveProject"
    />

    <ProjectPropertyDialog
      v-model:visible="propertyDialogVisible"
      :project="projectProperty"
      :loading="propertyLoading"
    />

    <el-dialog
      v-model="recycleDialogVisible"
      title="项目回收站"
      width="700px"
      destroy-on-close
      @open="fetchRecycleBin"
    >
      <div class="recycle-controls">
        <el-input
          v-model="rbKeyword"
          placeholder="搜索项目名称"
          :prefix-icon="Search"
          clearable
          style="width: 220px"
          @input="fetchRecycleBin"
        />
        <el-select v-model="rbSortField" style="width: 140px" @change="fetchRecycleBin">
          <el-option label="创建时间" value="creation_time" />
          <el-option label="更新时间" value="update_time" />
          <el-option label="项目名称" value="project_name" />
        </el-select>
        <el-select v-model="rbSortOrder" style="width: 120px" @change="fetchRecycleBin">
          <el-option label="升序" value="asc" />
          <el-option label="降序" value="desc" />
        </el-select>
        <el-button @click="fetchRecycleBin">刷新</el-button>
      </div>

      <div v-loading="projectsStore.recycleLoading" class="recycle-list">
        <div v-if="projectsStore.recycleBinList.length === 0" class="empty-recycle">
          <el-empty description="回收站暂无项目" :image-size="100" />
        </div>
        <el-table
          v-else
          :data="projectsStore.recycleBinList"
          border
          size="small"
          style="width: 100%"
        >
          <el-table-column label="名称" prop="name" min-width="260" />
          <el-table-column label="删除时间" prop="updateTime" width="200">
            <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                size="small"
                class="action-btn"
                @click="handleRestoreProject(row.id)"
              >
                恢复
              </el-button>
              <el-popconfirm
                title="确定要彻底删除该项目吗？"
                confirm-button-text="删除"
                cancel-button-text="取消"
                width="220"
                @confirm="handlePhysicalDeleteProject(row.id)"
              >
                <template #reference>
                  <el-button type="danger" link size="small" class="action-btn">
                    彻底删除
                  </el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectsStore } from '../stores/projects'
import { Search, Delete } from '@element-plus/icons-vue'

import ProjectsHeader from '../components/projects/ProjectsHeader.vue'
import ProjectsSectionHeader from '../components/projects/ProjectsSectionHeader.vue'
import ProjectGrid from '../components/projects/ProjectGrid.vue'
import ProjectList from '../components/projects/ProjectList.vue'
import EmptyState from '../components/projects/EmptyState.vue'
import ProjectFormDialog from '../components/projects/ProjectFormDialog.vue'
import ProjectPropertyDialog from '../components/projects/ProjectPropertyDialog.vue'

const router = useRouter()
const projectsStore = useProjectsStore()

const dialogVisible = ref(false)
const editingProject = ref(null)

const searchKeyword = ref('')

const propertyDialogVisible = ref(false)
const projectProperty = ref(null)
const propertyLoading = ref(false)

const sortField = ref('creation_time')
const sortOrder = ref('asc')
const isUserSorted = ref(false)

const viewMode = ref('card')

function handleSortChange() {
  projectsStore.setSortConfig(sortField.value, sortOrder.value, searchKeyword.value)
}

function handleListSort(field) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
  isUserSorted.value = true
  handleSortChange()
}

function showCreateDialog() {
  editingProject.value = null
  dialogVisible.value = true
}

function enterProject(project) {
  projectsStore.setCurrentProject(project.id)
  const targetPath = `/project/${project.id}-${encodeURIComponent(project.name)}`
  router.push(targetPath)
}

function handleEditProject(project) {
  editingProject.value = project
  dialogVisible.value = true
}

function handleDeleteProject(project) {
  ElMessageBox.confirm(`确定要删除项目"${project.name}"吗？此操作不可恢复。`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    projectsStore.deleteProject(project.id)
  })
}

async function handleSaveProject(formData) {
  try {
    if (editingProject.value) {
      await projectsStore.updateProject({
        id: editingProject.value.id,
        name: formData.name,
        icon: formData.icon,
        description: formData.description
      })
    } else {
      await projectsStore.createProject(formData)
    }
    dialogVisible.value = false
  } catch (error) {}
}

async function showProjectProperty(project) {
  propertyLoading.value = true
  propertyDialogVisible.value = true

  try {
    const result = await projectsStore.getProjectDetail(project.id)
    projectProperty.value = result
  } catch (error) {
    ElMessage.error('获取项目详情失败')
    propertyDialogVisible.value = false
  } finally {
    propertyLoading.value = false
  }
}

const recycleDialogVisible = ref(false)
const rbKeyword = ref('')
const rbSortField = ref('creation_time')
const rbSortOrder = ref('asc')

function showRecycleBinDialog() {
  recycleDialogVisible.value = true
}

async function fetchRecycleBin() {
  await projectsStore.fetchRecycleBinProjects({
    keyword: rbKeyword.value,
    sortField: rbSortField.value,
    sortOrder: rbSortOrder.value
  })
}

async function handleRestoreProject(projectId) {
  try {
    await projectsStore.restoreProject(projectId)
    ElMessage.success('恢复成功')
  } catch (error) {
    ElMessage.error(error.message || '恢复失败')
  }
}

async function handlePhysicalDeleteProject(projectId) {
  try {
    await projectsStore.physicalDeleteProject(projectId)
    ElMessage.success('彻底删除成功')
  } catch (error) {
    ElMessage.error(error.message || '删除失败')
  }
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  if (Number.isNaN(date.getTime())) return timeStr
  return date.toLocaleString()
}

onMounted(async () => {
  await projectsStore.fetchProjects()
})
</script>

<style scoped>
.projects-page {
  min-height: 100vh;
  background: var(--color-background);
}

.projects-main {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 600px;
  position: relative;
}

.loading-container {
  padding: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.recycle-entry {
  position: absolute;
  right: 24px;
  bottom: 24px;
}

.recycle-btn {
  width: 40px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 16px;
}

.recycle-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.recycle-list {
  min-height: 200px;
}

.empty-recycle {
  padding: 20px 0;
}

.action-btn {
  padding: 0 4px;
  font-weight: normal;
  background: none !important;
  border: none !important;
}

.action-btn:hover,
.action-btn:focus,
.action-btn:active {
  background: none !important;
  color: inherit !important;
  text-decoration: underline;
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
