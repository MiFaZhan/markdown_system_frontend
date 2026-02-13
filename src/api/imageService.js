const BASE_URL = 'http://localhost:8080/api'

export function uploadImage(file, projectId, nodeId) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file[]', file)
    formData.append('projectId', projectId)
    formData.append('nodeId', nodeId)

    const fullUrl = `${BASE_URL}/image/upload`
    console.log('上传图片:', fullUrl, 'projectId:', projectId, 'nodeId:', nodeId)

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
