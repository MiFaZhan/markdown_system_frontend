const BASE_URL = 'http://localhost:8080/api'

export function uploadImage(file, projectId) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file[]', file)
    formData.append('projectId', projectId)

    const fullUrl = `${BASE_URL}/image/upload`
    console.log('上传图片:', fullUrl, 'projectId:', projectId)

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
