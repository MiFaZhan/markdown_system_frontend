// 节点相关API
import { get, post, put, del } from './request'

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