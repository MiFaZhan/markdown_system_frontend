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
          @share-project="handleShareProject"
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
          @share-project="handleShareProject"
          @delete-project="handleDeleteProject"
          @view-property="showProjectProperty"
          @handle-list-sort="handleListSort"
        />

        <EmptyState v-if="projectsStore.projectList.length === 0" />
      </div>

      <div class="recycle-entry">
        <el-tooltip content="项目分享管理" placement="top">
          <el-button
            type="primary"
            :icon="Share"
            size="small"
            class="share-btn"
            @click="showShareManageDialog"
          />
        </el-tooltip>
        <el-tooltip content="项目回收站" placement="top">
          <el-button
            type="danger"
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
          <el-option label="删除时间" value="update_time" />
          <el-option label="项目名称" value="project_name" />
        </el-select>
        <el-select v-model="rbSortOrder" style="width: 120px" @change="fetchRecycleBin">
          <el-option label="升序" value="asc" />
          <el-option label="降序" value="desc" />
        </el-select>
      </div>

      <div v-loading="projectsStore.recycleLoading" class="recycle-list">
        <div v-if="projectsStore.recycleBinList.length === 0" class="empty-recycle">
          <el-empty description="回收站暂无项目" :image-size="100" />
        </div>
        <div v-else>
          <div class="recycle-header">
            <div class="rh-name">项目名</div>
            <div class="rh-time">删除时间</div>
            <div class="rh-actions">操作</div>
          </div>
          <div class="recycle-simple-list">
            <div v-for="item in projectsStore.recycleBinList" :key="item.id" class="recycle-item">
              <div class="ri-content">
                <div class="ri-name">{{ item.name }}</div>
                <div class="ri-time">{{ formatTime(item.updateTime) }}</div>
              </div>
              <div class="ri-actions">
                <el-button
                  type="primary"
                  link
                  size="small"
                  class="action-btn"
                  @click="handleRestoreProject(item.id)"
                >
                  恢复
                </el-button>
                <el-popconfirm
                  title="确定要彻底删除该项目吗？"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  width="220"
                  @confirm="handlePhysicalDeleteProject(item.id)"
                >
                  <template #reference>
                    <el-button type="danger" link size="small" class="action-btn">
                      彻底删除
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <ShareLinkManageDialog
      v-model:visible="shareManageVisible"
      :target-type="2"
      :target-id="sharingProject?.id"
      :title="sharingProject ? `分享链接管理 - ${sharingProject.name}` : '项目分享链接管理'"
      @create="shareCreateVisible = true"
    />

    <ShareCreateDialog
      v-model:visible="shareCreateVisible"
      :target-type="2"
      :target-id="sharingProject?.id"
      :target-name="sharingProject?.name"
      @success="handleShareCreateSuccess"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProjectsStore } from '../stores/projects'
import { getShareList } from '../api/shareService'
import { Search, Delete, Share } from '@element-plus/icons-vue'

import ProjectsHeader from '../components/projects/ProjectsHeader.vue'
import ProjectsSectionHeader from '../components/projects/ProjectsSectionHeader.vue'
import ProjectGrid from '../components/projects/ProjectGrid.vue'
import ProjectList from '../components/projects/ProjectList.vue'
import EmptyState from '../components/projects/EmptyState.vue'
import ProjectFormDialog from '../components/projects/ProjectFormDialog.vue'
import ProjectPropertyDialog from '../components/projects/ProjectPropertyDialog.vue'
import ShareLinkManageDialog from '../components/share/ShareLinkManageDialog.vue'
import ShareCreateDialog from '../components/share/ShareCreateDialog.vue'

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
  ElMessageBox.confirm(
    `确定要删除项目"${project.name}"吗？项目将移动到回收站，可在回收站恢复。`,
    '删除项目',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    projectsStore.deleteProject(project.id)
  })
}

const shareManageVisible = ref(false)
const shareCreateVisible = ref(false)
const sharingProject = ref(null)

function showShareManageDialog() {
  sharingProject.value = null
  shareManageVisible.value = true
}

async function handleShareProject(project) {
  sharingProject.value = project
  try {
    const res = await getShareList(2, project.id)
    const list = res.data || res || []
    if (list.length > 0) {
      shareManageVisible.value = true
    } else {
      shareCreateVisible.value = true
    }
  } catch (error) {
    console.error('Check share list error:', error)
    // 如果查询失败，保守起见还是打开创建对话框，或者提示错误
    // 这里选择打开创建对话框，让用户重试或新建
    shareCreateVisible.value = true
  }
}

function handleShareCreateSuccess() {
  shareManageVisible.value = true
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
  } catch (error) {
    ElMessage.error(error?.message || '保存失败')
  }
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
  left: 50%;
  transform: translateX(-50%);
  bottom: 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
}

.share-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 18px;
}

.recycle-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 18px;
}

.recycle-btn:hover {
  background-color: var(--el-color-danger) !important;
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

.recycle-simple-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recycle-header {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  align-items: center;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rh-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rh-time {
  min-width: 140px;
}

.rh-actions {
  display: flex;
  gap: 12px;
  padding-left: 12px;
  min-width: 120px;
  justify-content: flex-end;
}

.recycle-item {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.ri-content {
  display: contents;
}

.ri-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ri-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  min-width: 140px;
}

.ri-actions {
  display: flex;
  gap: 12px;
  padding-left: 12px;
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

/* 移动端适配 */
@media (max-width: 768px) {
  .projects-main {
    padding: 20px;
  }

  .recycle-entry {
    left: 50%;
    transform: translateX(-50%);
    bottom: 12px;
    gap: 8px;
  }

  .recycle-controls {
    flex-wrap: wrap;
  }

  .recycle-controls .el-input,
  .recycle-controls .el-select {
    width: 100% !important;
    margin-bottom: 8px;
  }

  .ri-time {
    display: none;
  }
  .rh-time {
    display: none;
  }
  .recycle-header {
    grid-template-columns: 1fr auto;
  }
  .recycle-item {
    grid-template-columns: 1fr auto;
  }
}

@media (max-width: 480px) {
  .projects-main {
    padding: 12px;
  }

  .recycle-entry {
    left: 50%;
    transform: translateX(-50%);
    bottom: 12px;
    gap: 8px;
  }

  .share-btn,
  .recycle-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .recycle-item {
    padding: 10px 10px;
  }
}
</style>
