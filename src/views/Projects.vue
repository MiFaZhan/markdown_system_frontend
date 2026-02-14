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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectsStore } from '../stores/projects'

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
}

.loading-container {
  padding: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
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
