import { post } from './request'

export function uploadImage(file, projectId, nodeId) {
  const formData = new FormData()
  formData.append('file[]', file)
  formData.append('projectId', projectId)
  formData.append('nodeId', nodeId)

  return post('/image/upload', formData)
}
