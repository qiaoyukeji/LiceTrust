// 用户/权限全局状态（token + 用户信息 + perms 权限点）
import { defineStore } from 'pinia'
import { get } from '../api/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('licetrust_token') || '',
    user: safeParse(localStorage.getItem('licetrust_user'))
  }),
  getters: {
    /** 是否已登录 */
    isLogin: (s) => !!s.token,
    /** 权限点数组 */
    perms: (s) => (s.user && s.user.perms) || [],
    /** 权限判断：包含 * 全通过 */
    can() {
      const list = this.perms
      return (p) => {
        if (!p) return true
        if (!list.length) return false
        return list.includes('*') || list.includes(p)
      }
    },
    /** 任一权限通过即可（数组） */
    canAny() {
      const has = this.can
      return (arr) => !arr || !arr.length || arr.some((p) => has(p))
    }
  },
  actions: {
    /** 登录成功写入 token 与用户信息 */
    setLogin(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem('licetrust_token', token)
      localStorage.setItem('licetrust_user', JSON.stringify(user))
    },
    /** 刷新当前用户信息（GET /auth/me） */
    async refreshMe() {
      const user = await get('/auth/me')
      this.user = user
      localStorage.setItem('licetrust_user', JSON.stringify(user))
      return user
    },
    /** 退出登录清理 */
    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('licetrust_token')
      localStorage.removeItem('licetrust_user')
    }
  }
})

function safeParse(str) {
  try {
    return str ? JSON.parse(str) : null
  } catch (e) {
    return null
  }
}
