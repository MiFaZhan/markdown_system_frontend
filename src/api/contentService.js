// Markdown 内容相关 API
import { get, put } from './request'

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
