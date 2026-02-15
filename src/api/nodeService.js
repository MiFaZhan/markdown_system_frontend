// 节点相关API
import { get, post, put, del } from './request'

export function getNodeTree(projectId) {
  return get(`/node/tree/${projectId}`)
}

export function getNodeList() {
  return get('/node')
}

export function createNode(nodeData) {
  return post('/node', nodeData)
}

export function updateNode(nodeData) {
  return put('/node', nodeData)
}

export function deleteNode(nodeId) {
  return del(`/node/${nodeId}`)
}

export function uploadMarkdownFile(file, projectId, parentId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)
  if (parentId !== undefined && parentId !== null) {
    formData.append('parentId', parentId)
  }

  return post('/node/upload', formData)
}

export function getRecycleBinTree(projectId) {
  return get(`/node/recycle-bin/${projectId}`)
}

export function restoreNode(nodeId) {
  return put(`/node/restore/${nodeId}`)
}

export function physicalDeleteNode(nodeId) {
  return del(`/node/physical/${nodeId}`)
}
