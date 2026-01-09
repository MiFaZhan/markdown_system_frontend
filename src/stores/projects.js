import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import * as projectService from '../api/projectService'

export const useProjectsStore = defineStore('projects', () => {
  const projectList = ref([])
  const loading = ref(false)
  const pagination = ref({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const sortConfig = ref({
    field: 'creation_time',
    order: 'asc'
  })

  // 获取项目列表（分页）
  async function fetchProjects(params = {}) {
    loading.value = true
    try {
      const queryParams = {
        pageNum: params.pageNum || pagination.value.current,
        pageSize: params.pageSize || pagination.value.pageSize,
        sortField: params.sortField || sortConfig.value.field,
        sortOrder: params.sortOrder || sortConfig.value.order
      }

      const result = await projectService.getProjectList(queryParams)
      
      // 转换后端数据格式到前端格式
      const newProjectList = result.records.map(project => ({
        id: project.projectId,
        name: project.projectName,
        description: project.description,
        icon: project.icon || '📁',
        updateTime: project.updateTime,
        creationTime: project.creationTime,
        files: [] // 初始化文件列表，后续从后端获取
      }))

      // 保持现有项目的文件数据（如果有的话）
      newProjectList.forEach(newProject => {
        const existingProject = projectList.value.find(p => p.id === newProject.id)
        if (existingProject && existingProject.files) {
          newProject.files = existingProject.files
        }
      })

      projectList.value = newProjectList

      // 更新分页信息
      pagination.value = {
        current: result.current,
        pageSize: result.size,
        total: result.total
      }

      return result
    } catch (error) {
      console.error('获取项目列表失败:', error)
      ElMessage.error('获取项目列表失败')
    } finally {
      loading.value = false
    }
  }

  // 创建项目
  async function createProject(projectData) {
    try {
      const result = await projectService.createProject(projectData)
      ElMessage.success('项目创建成功')
      
      // 重新获取第一页数据
      await fetchProjects({ pageNum: 1 })
      return result
    } catch (error) {
      console.error('创建项目失败:', error)
      throw error
    }
  }

  // 更新项目
  async function updateProject(projectData) {
    try {
      const result = await projectService.updateProject(projectData)
      ElMessage.success('项目更新成功')
      
      // 重新获取当前页数据
      await fetchProjects()
      return result
    } catch (error) {
      console.error('更新项目失败:', error)
      throw error
    }
  }

  // 删除项目
  async function deleteProject(projectId) {
    try {
      await projectService.deleteProject(projectId)
      ElMessage.success('项目删除成功')
      
      // 重新获取当前页数据
      await fetchProjects()
    } catch (error) {
      console.error('删除项目失败:', error)
      throw error
    }
  }

  // 设置排序
  function setSortConfig(field, order) {
    sortConfig.value = { field, order }
    fetchProjects({ pageNum: 1, sortField: field, sortOrder: order })
  }

  // 设置分页
  function setPagination(current, pageSize) {
    pagination.value.current = current
    if (pageSize) {
      pagination.value.pageSize = pageSize
    }
    fetchProjects({ pageNum: current, pageSize: pageSize || pagination.value.pageSize })
  }

  // 当前项目ID
  const currentProjectId = ref(null)
  
  // 设置当前项目
  function setCurrentProject(projectId) {
    currentProjectId.value = projectId
  }
  
  // 根据项目名称查找项目
  function findProjectByName(projectName) {
    return projectList.value.find(p => p.name === decodeURIComponent(projectName)) || null
  }
  
  // 根据ID获取项目（用于工作区）
  function currentProject() {
    if (!currentProjectId.value) return null
    return projectList.value.find(p => p.id === currentProjectId.value) || null
  }

  // 获取项目详情
  async function getProjectDetail(projectId) {
    try {
      const result = await projectService.getProject(projectId)
      return result
    } catch (error) {
        console.error('获取项目详情失败:', error)
      throw error
    }
  }

  return {
    projectList,
    loading,
    pagination,
    sortConfig,
    currentProjectId,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    setSortConfig,
    setPagination,
    setCurrentProject,
    findProjectByName,
    currentProject,
    getProjectDetail
  }
})