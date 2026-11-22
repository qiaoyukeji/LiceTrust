import { createRouter, createWebHistory } from 'vue-router'
import { useUser, fetchMe } from '../composables/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/home/Home.vue'),
    meta: { title: '首页', tab: true }
  },
  {
    path: '/computers',
    name: 'MyComputers',
    component: () => import('../views/computer/MyComputers.vue'),
    meta: { title: '信息查找', tab: true }
  },
  {
    path: '/computers/:id',
    name: 'ComputerDetail',
    component: () => import('../views/computer/ComputerDetail.vue'),
    meta: { title: '电脑档案' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/register/Register.vue'),
    meta: { title: '信息录入', tab: true }
  },
  {
    path: '/mine',
    name: 'Mine',
    component: () => import('../views/mine/Mine.vue'),
    meta: { title: '我的', tab: true }
  },
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach(async (to) => {
  const token = localStorage.getItem('licetrust_token')
  if (to.path === '/login') {
    return token ? { path: '/home' } : true
  }
  if (!token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  const user = useUser()
  if (!user.loaded) {
    try {
      await fetchMe()
    } catch (e) {
      // 401 时拦截器已跳登录；其余失败也回登录页
      return { path: '/login' }
    }
  }
  return true
})

router.afterEach((to) => {
  const title = (to.meta && to.meta.title) || ''
  document.title = title ? title + ' - 正版软件管理平台' : '正版软件管理平台'
})

export default router
