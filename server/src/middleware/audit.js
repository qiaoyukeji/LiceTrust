/**
 * 审计日志中间件（FR-15-05：关键操作全程留痕，只增不删）
 * 对 /api 下所有写操作（POST/PUT/DELETE/PATCH）自动记录
 */
import { sysAuditLog } from '../db/dao/index.js'
import { nowStr } from '../db/util.js'

const SENSITIVE_RE = /password|pwd|activation|serial|code|sign/i

function maskBody(body) {
  if (!body || typeof body !== 'object') return body || undefined
  const out = {}
  for (const k of Object.keys(body)) {
    out[k] = SENSITIVE_RE.test(k) ? '***' : body[k]
  }
  return out
}

export function auditTrail() {
  return (req, res, next) => {
    res.on('finish', () => {
      try {
        if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return
        if (!req.path.startsWith('/api/')) return
        const parts = req.path.split('/').filter(Boolean)
        const row = {
          user_id: (req.user && req.user.id) || 0,
          username: (req.user && req.user.username) || '-',
          module: parts[1] || 'other',
          operation: req.method + ' -> ' + res.statusCode,
          method: req.method,
          path: req.path,
          detail: JSON.stringify({ query: maskBody(req.query), body: maskBody(req.body) }),
          ip: req.ip || '',
          op_time: nowStr()
        }
        sysAuditLog.insert(row).catch(() => {})
      } catch (ignore) {
        // 审计失败不影响主流程
      }
    })
    next()
  }
}
