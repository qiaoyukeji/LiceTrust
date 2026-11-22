/**
 * 统一错误处理（404 + 错误兜底）
 */
import { ApiError } from '../utils/response.js'

export function notFound(req, res) {
  res.status(404).json({ code: 404, message: '接口不存在: ' + req.method + ' ' + req.path })
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.status || 400).json({ code: err.code || 1, message: err.message })
    return
  }
  const msg = String(err && err.message ? err.message : err)
  if (/UNIQUE|DUP_ENTRY|duplicate/i.test(msg)) {
    res.status(400).json({ code: 1, message: '数据已存在（唯一性校验失败）' })
    return
  }
  console.error('[error]', err)
  res.status(500).json({ code: 1, message: '服务异常，请稍后重试' })
}
