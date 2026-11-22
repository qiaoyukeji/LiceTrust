import { reactive } from 'vue'
import { get, put } from '../api/request'

/** 简单登录态 store（无 Pinia，composable 共享响应式对象） */
const state = reactive({
  user: null,
  loaded: false
})

export function useUser() {
  return state
}

export function hasPerm(p) {
  if (!state.user) return false
  const perms = state.user.perms || []
  return perms.includes('*') || perms.includes(p)
}

/** GET /auth/me 刷新用户信息（登录后或路由守卫调用） */
export async function fetchMe() {
  const user = await get('/auth/me')
  state.user = user
  state.loaded = true
  return user
}

/** 登录成功写入 token 与用户信息 */
export function setAuth(token, user) {
  localStorage.setItem('licetrust_token', token)
  state.user = user
  state.loaded = true
}

/** PUT /auth/password 修改密码 */
export function changePassword(oldPassword, newPassword) {
  return put('/auth/password', { oldPassword, newPassword })
}

/** 退出登录：清 token 与本地登录态 */
export function clearAuth() {
  localStorage.removeItem('licetrust_token')
  state.user = null
  state.loaded = false
}
