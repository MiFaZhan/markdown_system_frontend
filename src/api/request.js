// HTTP请求封装
const BASE_URL = 'http://localhost:8080/api'

// 通用请求函数
async function request(url, options = {}) {
  const token = localStorage.getItem('token')
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  }

  const fullUrl = `${BASE_URL}${url}`
  console.log('发送API请求:', fullUrl, config)

  try {
    const response = await fetch(fullUrl, config)
    console.log('API响应状态:', response.status, response.statusText)

    const data = await response.json()
    console.log('API响应数据:', data)

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`)
    }

    // 后端统一返回格式: { code, message, data }
    if (data.code !== 200) {
      throw new Error(data.message || '请求失败')
    }

    return data.data
  } catch (error) {
    console.error('API请求失败:', error)
    throw error
  }
}

// GET请求
export function get(url, params = {}) {
  const queryString = new URLSearchParams(params).toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url
  return request(fullUrl)
}

// POST请求
export function post(url, data = {}) {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// PUT请求
export function put(url, data = {}) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

// DELETE请求
export function del(url, params = {}) {
  const queryString = new URLSearchParams(params).toString()
  const fullUrl = queryString ? `${url}?${queryString}` : url
  return request(fullUrl, {
    method: 'DELETE'
  })
}
