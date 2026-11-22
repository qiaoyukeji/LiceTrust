// Axios 统一封装（拦截器规范见 docs/FRONTEND-CONVENTIONS.md §1）
import axios from 'axios'
import { ElMessage } from 'element-plus'

const service = axios.create({ baseURL: '/api', timeout: 30000 })

// 请求拦截：附加 Bearer token
service.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('licetrust_token')
  if (t) cfg.headers.Authorization = 'Bearer ' + t
  return cfg
})

// 响应拦截：code!==0 视为失败；blob 响应直接放行
service.interceptors.response.use(
  (resp) => {
    if (resp.config.responseType === 'blob') return resp
    const { code, message, data } = resp.data || {}
    if (code !== 0) {
      ElMessage.error(message || '操作失败')
      return Promise.reject(new Error(message || '操作失败'))
    }
    return data
  },
  (err) => {
    const status = err.response && err.response.status
    if (status === 401) {
      localStorage.removeItem('licetrust_token')
      localStorage.removeItem('licetrust_user')
      if (location.pathname !== '/login') location.href = '/login'
    }
    const msg =
      (err.response && err.response.data && err.response.data.message) ||
      (status === 403 ? '无操作权限' : '') ||
      err.message ||
      '网络异常'
    if (status !== 401) ElMessage.error(msg)
    return Promise.reject(err)
  }
)

/** GET 快捷方法 */
export const get = (url, params) => service.get(url, { params })
/** POST 快捷方法 */
export const post = (url, data) => service.post(url, data)
/** PUT 快捷方法 */
export const put = (url, data) => service.put(url, data)
/** DELETE 快捷方法 */
export const del = (url) => service.delete(url)

/**
 * 文件下载专用（blob，不走通用拦截器解包）
 * 用法：download('/reports/export/summary', { orgId }) → 浏览器触发下载
 */
export async function download(url, params) {
  const resp = await service.get(url, { params, responseType: 'blob' })
  const blob = new Blob([resp.data])
  const disposition = String(resp.headers['content-disposition'] || '')
  let filename = 'export.xlsx'
  const m = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i)
  if (m && m[1]) {
    try {
      filename = decodeURIComponent(m[1].trim())
    } catch (e) {
      filename = m[1].trim()
    }
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
  return filename
}

export default service
