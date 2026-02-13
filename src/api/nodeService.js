// 节点相关API
import { get, post, put, del } from './request'

const BASE_URL = 'http://localhost:8080/api'

/**
 * 获取项目的节点树形结构
 * @param {number} projectId - 项目ID
 */
export function getNodeTree(projectId) {
  return get(`/node/tree/${projectId}`)
}

/**
 * 获取所有节点列表（扁平结构）
 */
export function getNodeList() {
  return get('/node')
}

/**
 * 创建节点
 * @param {Object} nodeData - 节点数据
 * @param {number} nodeData.projectId - 项目ID
 * @param {number} nodeData.parentId - 父节点ID（可选）
 * @param {number} nodeData.nodeType - 节点类型（0文件夹，1文件）
 * @param {string} nodeData.nodeName - 节点名称
 */
export function createNode(nodeData) {
  return post('/node', nodeData)
}

/**
 * 更新节点
 * @param {Object} nodeData - 节点数据
 * @param {number} nodeData.nodeId - 节点ID
 * @param {number} nodeData.parentId - 父节点ID（可选）
 * @param {string} nodeData.nodeName - 节点名称
 */
export function updateNode(nodeData) {
  return put('/node', nodeData)
}

/**
 * 删除节点
 * @param {number} nodeId - 节点ID
 */
export function deleteNode(nodeId) {
  return del(`/node/${nodeId}`)
}

/**
 * 上传Markdown文件
 * @param {File} file - 上传的文件
 * @param {number} projectId - 项目ID
 * @param {number} parentId - 父节点ID（可选）
 */
export function uploadMarkdownFile(file, projectId, parentId) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', projectId)
    if (parentId !== undefined && parentId !== null) {
      formData.append('parentId', parentId)
    }

    const fullUrl = `${BASE_URL}/node/upload`
    console.log('上传Markdown文件:', fullUrl, 'projectId:', projectId)

    fetch(fullUrl, {
      method: 'POST',
      body: formData
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('上传响应:', data)
        if (data.code === 200) {
          resolve(data.data)
        } else {
          reject(new Error(data.message || '上传失败'))
        }
      })
      .catch((error) => {
        console.error('上传失败:', error)
        reject(error)
      })
  })
}
