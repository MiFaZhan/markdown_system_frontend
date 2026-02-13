// Markdown 内容相关 API
import { get, post, put } from './request'

/**
 * 获取节点的 Markdown 内容
 * @param {number} nodeId - 节点ID
 */
export function getMarkdownContent(nodeId) {
  return get(`/markdown-content/${nodeId}`)
}

/**
 * 更新节点的 Markdown 内容
 * @param {number} nodeId - 节点ID
 * @param {string} content - Markdown 内容
 * @param {number} version - 版本号
 */
export function updateMarkdownContent(nodeId, content, version) {
  return put(`/markdown-content/${nodeId}`, {
    nodeId,
    content,
    version
  })
}

/**
 * 在文件中搜索内容
 * @param {number} nodeId - 节点ID
 * @param {string} keyword - 搜索关键词
 */
export function searchContentInFile(nodeId, keyword) {
  console.log('[contentService] searchContentInFile called, nodeId:', nodeId, 'keyword:', keyword)
  const result = post('/markdown-content/search', {
    nodeId,
    keyword
  })
  console.log('[contentService] post request created')
  return result
}
