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
      name: 'FileList',
      component: () => import('../views/FileList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/editor/:id?', // id是可选的，新建或编辑
      name: 'Editor',
      component: () => import('../views/Editor.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫：未登录跳转到登录页
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
  } else {
    next()
  }
})

export default router