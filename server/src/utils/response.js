/**
 * 统一响应结构与错误处理工具
 * 响应格式：{ code: 0, message: 'ok', data: ... }（文档 7.1 内部接口约定）
 */
export class ApiError extends Error {
  constructor(message, status = 400, code = 1) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function ok(res, data = null, message = 'ok') {
  res.json({ code: 0, message, data })
}

/** 异步路由包装：统一捕获异常交给错误中间件 */
export function asyncH(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/** 分页参数解析 */
export function pageInfo(req, defaultSize = 10) {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || defaultSize))
  return { page, pageSize }
}

/** 分页响应 */
export function paged(res, list, total, page, pageSize) {
  res.json({ code: 0, message: 'ok', data: { list, total, page, pageSize } })
}

/** 参数校验快捷断言 */
export function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '')
  if (missing.length) {
    throw new ApiError('缺少必填字段: ' + missing.join(', '), 400)
  }
}

export function toInt(v) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}
