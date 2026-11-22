/**
 * JWT 认证中间件（文档 9.1 身份认证）
 */
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { sysUser, sysUserRole, sysRole, sysTenant } from '../db/dao/index.js'
import { runWithTenant } from '../db/tenantContext.js'
import { ApiError } from '../utils/response.js'

export async function authGuard(req, res, next) {
  try {
    const h = req.headers.authorization || ''
    if (!h.startsWith('Bearer ')) throw new ApiError('未登录或会话已过期', 401)
    let payload
    try {
      payload = jwt.verify(h.slice(7), config.jwtSecret)
    } catch (e) {
      throw new ApiError('登录凭证无效或已过期', 401)
    }
    const rows = await sysUser.list({ id: payload.uid }, { pageSize: 1 })
    const u = rows && rows[0]
    if (!u || u.status !== 1) throw new ApiError('账号不存在或已停用', 401)

    // 角色 → 功能权限并集 + 数据权限取最小（权限最大）
    const links = await sysUserRole.listAll({ user_id: u.id })
    const roles = []
    let perms = []
    let dataScope = 4
    for (const link of links) {
      const rr = await sysRole.list({ id: link.role_id }, { pageSize: 1 })
      const role = rr && rr[0]
      if (!role) continue
      roles.push({ id: role.id, code: role.role_code, name: role.role_name })
      try {
        perms = perms.concat(JSON.parse(role.perms || '[]'))
      } catch (ignore) {
        perms = perms.concat([])
      }
      dataScope = Math.min(dataScope, Number(role.data_scope) || 4)
    }
    if (roles.some((r) => r.code === 'ADMIN')) perms.push('*')

    // 停用租户拦截（平台运营方 tenant_id=0 不受影响）
    if (u.tenant_id && Number(u.tenant_id) > 0) {
      const trows = await sysTenant.list({ id: Number(u.tenant_id) }, { pageSize: 1 })
      const tenant = trows && trows[0]
      if (!tenant || Number(tenant.status) !== 1) {
        throw new ApiError('所属企业已被停用，请联系平台运营方', 403)
      }
    }

    req.user = {
      id: u.id,
      tenant_id: u.tenant_id,
      username: u.username,
      real_name: u.real_name,
      org_id: u.org_id,
      dept_id: u.dept_id,
      roles,
      perms,
      dataScope
    }

    // 多租户数据隔离：以 AsyncLocalStorage 包装请求处理链（并发请求互不污染，
    // 本请求内所有 DAO 读写自动限定在该租户；tenant_id=0 平台账号为全量）
    runWithTenant(u.tenant_id, () => next())
  } catch (e) {
    next(e)
  }
}
