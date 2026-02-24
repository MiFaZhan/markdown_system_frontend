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
    },
    {
      path: '/share/:shareCode',
      name: 'Share',
      component: () => import('../views/Share.vue')
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  if (to.meta.guestOnly && userStore.token) {
    next('/index')
    return
  }

  if (to.meta.requiresAuth && !userStore.token) {
    next('/login')
    return
  }

  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      userStore.logout()
      next('/login')
      return
    }
  }

  next()
})

router.afterEach((to) => {
  const baseTitle = 'Markdown 文档管理系统'
  let pageTitle = baseTitle

  if (to.name === 'Login') {
    pageTitle = `登录 | ${baseTitle}`
  } else if (to.name === 'Projects') {
    pageTitle = `项目列表 | ${baseTitle}`
  } else if (to.name === 'Workspace') {
    const projectName = to.params.projectName
    if (typeof projectName === 'string' && projectName) {
      pageTitle = `${decodeURIComponent(projectName)} - 工作区 | ${baseTitle}`
    } else {
      pageTitle = `工作区 | ${baseTitle}`
    }
  } else if (to.name === 'Share') {
    pageTitle = `文档分享 | ${baseTitle}`
  }

  document.title = pageTitle
})

export default router
