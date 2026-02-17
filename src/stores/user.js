import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as userService from '../api/userService'
import * as roleService from '../api/roleService'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const roleList = ref(null)

  async function login(account, password) {
    const data = await userService.login({ account, password })
    token.value = data.token
    userInfo.value = data
    localStorage.setItem('token', data.token)
    await fetchRoleList()
  }

  async function fetchUserInfo() {
    if (!token.value) return
    const data = await userService.getUserInfo()
    userInfo.value = data
    if (!roleList.value) {
      await fetchRoleList()
    }
  }

  async function fetchRoleList() {
    if (!token.value) return
    const data = await roleService.getRoleList()
    roleList.value = data
  }

  function getRoleById(roleId) {
    if (!roleList.value) return null
    return roleList.value.find((role) => role.roleId === roleId)
  }

  function getRoleName(roleId) {
    const role = getRoleById(roleId)
    return role ? role.roleName : '未知'
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    roleList.value = null
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return {
    token,
    userInfo,
    roleList,
    login,
    fetchUserInfo,
    fetchRoleList,
    getRoleById,
    getRoleName,
    logout
  }
})
