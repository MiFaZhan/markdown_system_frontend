import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue')
    },
    {
      path: '/',
      name: 'Projects',
      component: () => import('../views/Projects.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/project/:projectId',
      name: 'Workspace',
      component: () => import('../views/Workspace.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫：未登录跳转到登录页
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 检查登录状态
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
    return
  }

  next()
})

export default router
