import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as projectService from '../api/projectService'

export const useProjectsStore = defineStore('projects', () => {
  const projectList = ref([])
  const loading = ref(false)
  const recycleBinList = ref([])
  const recycleLoading = ref(false)
  const sortConfig = ref({
    field: 'creation_time',
    order: 'asc'
  })

  // 获取项目列表（全量）
  async function fetchProjects(params = {}) {
    loading.value = true
    try {
      const queryParams = {
        keyword: params.keyword || '',
        sortField: params.sortField || sortConfig.value.field,
        sortOrder: params.sortOrder || sortConfig.value.order
      }

      const result = await projectService.getAllProjects(queryParams)

      // 转换后端数据格式到前端格式
      const newProjectList = result.map((project) => ({
        id: project.projectId,
        name: project.projectName,
        description: project.description,
        icon: project.icon || '📁',
        updateTime: project.updateTime,
        creationTime: project.creationTime,
        files: []
      }))

      // 保持现有项目的文件数据（如果有的话）
      newProjectList.forEach((newProject) => {
        const existingProject = projectList.value.find((p) => p.id === newProject.id)
        if (existingProject && existingProject.files) {
          newProject.files = existingProject.files
        }
      })

      projectList.value = newProjectList

      return result
    } catch (error) {
      ElMessage.error('获取项目列表失败')
    } finally {
      loading.value = false
    }
  }

  // 创建项目
  async function createProject(projectData) {
    const result = await projectService.createProject(projectData)
    ElMessage.success('项目创建成功')

    await fetchProjects()
    return result
  }

  async function updateProject(projectData) {
    const result = await projectService.updateProject(projectData)
    ElMessage.success('项目更新成功')

    await fetchProjects()
    return result
  }

  async function deleteProject(projectId) {
    await projectService.deleteProject(projectId)
    ElMessage.success('项目删除成功')

    await fetchProjects()
  }

  // 回收站：获取已删除项目列表
  async function fetchRecycleBinProjects(params = {}) {
    recycleLoading.value = true
    try {
      const queryParams = {
        keyword: params.keyword || '',
        sortField: params.sortField || sortConfig.value.field,
        sortOrder: params.sortOrder || sortConfig.value.order
      }
      const result = await projectService.getRecycleBinProjects(queryParams)
      recycleBinList.value = result.map((project) => ({
        id: project.projectId,
        name: project.projectName,
        description: project.description,
        icon: project.icon || '📁',
        updateTime: project.updateTime,
        creationTime: project.creationTime
      }))
      return result
    } catch (error) {
      ElMessage.error('获取回收站项目失败')
    } finally {
      recycleLoading.value = false
    }
  }

  async function restoreProject(projectId) {
    await projectService.restoreProject(projectId)
    await fetchRecycleBinProjects()
    await fetchProjects()
  }

  async function physicalDeleteProject(projectId) {
    await projectService.physicalDeleteProject(projectId)
    await fetchRecycleBinProjects()
  }

  // 设置排序
  function setSortConfig(field, order, keyword = '') {
    sortConfig.value = { field, order }
    fetchProjects({ sortField: field, sortOrder: order, keyword })
  }

  // 当前项目ID
  const currentProjectId = ref(null)

  // 设置当前项目
  function setCurrentProject(projectId) {
    currentProjectId.value = projectId
  }

  // 根据项目名称查找项目
  function findProjectByName(projectName) {
    return projectList.value.find((p) => p.name === decodeURIComponent(projectName)) || null
  }

  // 根据ID获取项目（用于工作区）
  function currentProject() {
    if (!currentProjectId.value) return null
    return projectList.value.find((p) => p.id === currentProjectId.value) || null
  }

  async function getProjectDetail(projectId) {
    return await projectService.getProject(projectId)
  }

  return {
    projectList,
    loading,
    recycleBinList,
    recycleLoading,
    sortConfig,
    currentProjectId,
    fetchProjects,
    fetchRecycleBinProjects,
    createProject,
    updateProject,
    deleteProject,
    restoreProject,
    physicalDeleteProject,
    setSortConfig,
    setCurrentProject,
    findProjectByName,
    currentProject,
    getProjectDetail
  }
})
