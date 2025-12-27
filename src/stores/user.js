import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')

  function login(username, password) {
    // 模拟登录验证
    return new Promise((resolve, reject) => {
      if (username === 'admin' && password === '123456') {
        token.value = 'mock-token-123456'
        localStorage.setItem('token', token.value)
        resolve()
      } else {
        reject('用户名或密码错误 (admin/123456)')
      }
    })
  }

  function logout() {
    token.value = ''
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return { token, login, logout }
})
