// HTTP请求封装
import router from '@/router'
import { ElMessage } from 'element-plus'

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

  const fullUrl = `${BASE_URL}${url}`

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        ElMessage.error('登录已过期，请重新登录')
        router.push('/login')
      } else if (response.status === 403) {
        if (data.message === '账号被禁用请联系管理员') {
          ElMessage.error('账号被禁用请联系管理员')
          router.push('/login')
        } else {
          ElMessage.error(data.message || '没有权限执行此操作')
        }
      } else {
        ElMessage.error(data.message || '服务器错误')
      }
      throw new Error(data.message || `HTTP ${response.status}`)
    }

    if (data.code !== 200) {
      if (data.code === 401) {
        ElMessage.error('登录已过期，请重新登录')
        router.push('/login')
      } else if (data.code === 403) {
        if (data.message === '账号被禁用请联系管理员') {
          ElMessage.error('账号被禁用请联系管理员')
          router.push('/login')
        } else {
          ElMessage.error(data.message || '没有权限执行此操作')
        }
      } else {
        throw new Error(data.message || '请求失败')
      }
      // 对于 401 和 403，我们已经处理了跳转或提示，但也需要抛出错误以中断调用链
      throw new Error(data.message || '请求失败')
    }

    return data.data
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      ElMessage.error('网络错误，请稍后重试')
    }
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
    body: data instanceof FormData ? data : JSON.stringify(data)
  })
}

// PUT请求
export function put(url, data = {}) {
  return request(url, {
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data)
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
