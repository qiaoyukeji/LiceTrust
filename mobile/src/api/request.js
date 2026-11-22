import axios from 'axios'
import { showFailToast } from 'vant'

/** 与 PC 端同规范的 axios 实例：共享 token（licetrust_token），code!==0 弹 toast，401 跳登录 */
const service = axios.create({ baseURL: '/api', timeout: 30000 })

service.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('licetrust_token')
  if (t) cfg.headers.Authorization = 'Bearer ' + t
  return cfg
})

service.interceptors.response.use(
  (resp) => {
    const body = resp.data || {}
    const { code, message, data } = body
    if (code !== 0) {
      showFailToast(message || '操作失败')
      return Promise.reject(new Error(message || '操作失败'))
    }
    return data
  },
  (err) => {
    const status = err.response && err.response.status
    if (status === 401) {
      localStorage.removeItem('licetrust_token')
      if (location.pathname !== '/login') location.href = '/login'
      return Promise.reject(err)
    }
    const msg =
      (err.response && err.response.data && err.response.data.message) ||
      (status === 403 ? '无操作权限' : '') ||
      err.message ||
      '网络异常，请稍后重试'
    showFailToast(msg)
    return Promise.reject(err)
  }
)

export const get = (url, params) => service.get(url, { params })
export const post = (url, data) => service.post(url, data)
export const put = (url, data) => service.put(url, data)
export const del = (url) => service.delete(url)
export default service
