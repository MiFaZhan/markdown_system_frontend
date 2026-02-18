import { get, post, put, del } from './request'

export function createShare(data) {
  return post('/share', data)
}

export function updateShare(data) {
  return put('/share', data)
}

export function getShareList(targetType = null, targetId = null) {
  const params = {}
  if (targetType !== null) {
    if (Array.isArray(targetType)) {
      params.targetTypes = targetType.join(',')
    } else {
      params.targetTypes = targetType
    }
  }
  if (targetId !== null) {
    params.targetId = targetId
  }
  return get('/share/list', params)
}

export function deleteShare(shareId) {
  return del(`/share/${shareId}`)
}

export function accessShare(shareCode, password = null) {
  const data = password ? { password } : {}
  return post(`/share/public/${shareCode}`, data)
}

export function getShareContent(shareCode) {
  return get(`/share/public/${shareCode}/content`)
}

export function getShareNodeContent(shareCode, nodeId) {
  return get(`/share/public/${shareCode}/file/${nodeId}`)
}
