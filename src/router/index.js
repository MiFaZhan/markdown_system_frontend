import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { guestOnly: true }
    },
    {
      path: '/index',
      name: 'Projects',
      component: () => import('../views/Projects.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/project/:projectId-:projectName',
      name: 'Workspace',
      component: () => import('../views/Workspace.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫：未登录跳转到登录页
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 已登录用户访问登录页，重定向到项目列表页
  if (to.meta.guestOnly && userStore.token) {
    next('/index')
    return
  }

  // 未登录用户访问需要认证的页面，跳转到登录页
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
    return
  }

  // 如果有token但没有用户信息，尝试获取用户信息
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      // 获取用户信息失败，清除token并跳转到登录页
      userStore.logout()
      next('/login')
      return
    }
  }

  next()
})

export default router
