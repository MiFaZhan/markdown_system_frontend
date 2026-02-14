import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as userService from '../api/userService'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)

  async function login(username, password) {
    const data = await userService.login({ username, password })
    token.value = data.token
    userInfo.value = data
    localStorage.setItem('token', data.token)
  }

  async function fetchUserInfo() {
    if (!token.value) return
    const data = await userService.getUserInfo()
    userInfo.value = data
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return { token, userInfo, login, fetchUserInfo, logout }
})
