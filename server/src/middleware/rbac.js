/**
 * RBAC 授权中间件（FR-15-02：功能权限与数据权限分离）
 */
import { ApiError } from '../utils/response.js'

/** 功能权限点校验（任一命中即可，ADMIN 持有 * 全量权限） */
export function requirePerm(...needed) {
  return (req, res, next) => {
    const perms = (req.user && req.user.perms) || []
    if (perms.includes('*')) return next()
    if (needed.some((p) => perms.includes(p))) return next()
    next(new ApiError('无操作权限', 403))
  }
}

/**
 * 平台运营管理员校验（tenant_id=0）：可管理全部企业租户与通用设置
 */
export function requirePlatform(req, res, next) {
  if (req.user && Number(req.user.tenant_id) === 0) return next()
  next(new ApiError('仅平台运营管理员可执行此操作', 403))
}

/**
 * 数据权限过滤（1全部 2本单位 3本部门 4仅本人）
 * fields: { org:'org_id', dept:'dept_id', user:'user_id' } 按表实际字段挑选
 * 返回可直接传给生成 DAO list 的 eq 过滤对象
 */
export function scopeFilters(user, fields) {
  const ds = (user && user.dataScope) || 4
  const f = {}
  if (ds === 2 && fields.org) f[fields.org] = user.org_id
  if (ds === 3 && fields.dept) f[fields.dept] = user.dept_id
  if (ds === 4 && fields.user) f[fields.user] = user.id
  return f
}
