// 项目相关API
import { get, post, put, del } from './request'

/**
 * 分页查询项目列表
 * @param {Object} params - 查询参数
 * @param {number} params.pageNum - 页码，默认1
 * @param {number} params.pageSize - 每页大小，默认10
 * @param {string} params.sortField - 排序字段，默认creation_time
 * @param {string} params.sortOrder - 排序方向，asc/desc，默认asc
 */
export function getProjectList(params = {}) {
  const defaultParams = {
    pageNum: 1,
    pageSize: 10,
    sortField: 'creation_time',
    sortOrder: 'desc'
  }
  return get('/project', { ...defaultParams, ...params })
}

/**
 * 根据ID查询项目详情
 * @param {number} projectId - 项目ID
 */
export function getProject(projectId) {
  return get(`/project/${projectId}`)
}

/**
 * 创建项目
 * @param {Object} projectData - 项目数据
 * @param {string} projectData.projectName - 项目名称
 * @param {string} projectData.description - 项目描述
 * @param {string} projectData.icon - 项目图标
 */
export function createProject(projectData) {
  return post('/project', {
    projectName: projectData.name,
    description: projectData.description,
    icon: projectData.icon,
    userId: 1 // 临时固定用户ID，后续从用户store获取
  })
}

/**
 * 更新项目
 * @param {Object} projectData - 项目数据
 * @param {number} projectData.projectId - 项目ID
 * @param {string} projectData.projectName - 项目名称
 * @param {string} projectData.description - 项目描述
 * @param {string} projectData.icon - 项目图标
 */
export function updateProject(projectData) {
  return put('/project', {
    projectId: projectData.id,
    projectName: projectData.name,
    description: projectData.description,
    icon: projectData.icon
  })
}

/**
 * 删除项目
 * @param {number} projectId - 项目ID
 */
export function deleteProject(projectId) {
  return del('/project', { projectId })
}
