// HTTP请求封装
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

// 通用请求函数
async function request(url, options = {}) {
  const token = localStorage.getItem('token')

  const headers = {}
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    headers: {
      ...headers,
      ...options.headers
    },
    ...options
  }

  const fullUrl = `${BASE_URL}${url}`

  try {
    const response = await fetch(fullUrl, config)

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`)
    }

    if (data.code !== 200) {
      throw new Error(data.message || '请求失败')
    }

    return data.data
  } catch (error) {
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
