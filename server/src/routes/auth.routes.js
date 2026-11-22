/** 认证接口（登录/当前用户/修改密码） */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import { sysUser, sysUserRole, sysRole, sysOrg, sysDept } from '../db/dao/index.js'
import { ok, ApiError, asyncH, requireFields } from '../utils/response.js'
import { nowStr } from '../db/util.js'
import { authGuard } from '../middleware/auth.js'
import { tx } from '../db/index.js'
import { sysTenant } from '../db/dao/index.js'
import { runWithTenant } from '../db/tenantContext.js'
import { sendSmsCode, verifySmsCode, isAlibaba } from '../services/smsService.js'

const router = Router()

/** 组装用户信息（角色/权限/单位部门名） */
async function buildUserInfo(u) {
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
  const orgRows = u.org_id ? await sysOrg.list({ id: Number(u.org_id) }, { pageSize: 1 }) : []
  const deptRows = u.dept_id ? await sysDept.list({ id: Number(u.dept_id) }, { pageSize: 1 }) : []
  const orgRow = orgRows[0] || null
  const deptRow = deptRows[0] || null
  const tenantRows = u.tenant_id ? await sysTenant.list({ id: Number(u.tenant_id) }, { pageSize: 1 }) : []
  const tenantRow = tenantRows[0] || null
  return {
    id: u.id,
    tenant_id: u.tenant_id,
    tenant_name: tenantRow ? tenantRow.tenant_name : (Number(u.tenant_id) === 0 ? '平台运营方' : ''),
    username: u.username,
    real_name: u.real_name,
    org_name: orgRow ? orgRow.org_name : '',
    dept_name: deptRow ? deptRow.dept_name : '',
    roles,
    perms,
    dataScope
  }
}

export { buildUserInfo }

// POST /api/auth/sms/send — 注册/绑定手机号验证码发送（公开，含频控与有效期）
router.post('/sms/send', asyncH(async (req, res) => {
  requireFields(req.body, ['phone'])
  const ret = await sendSmsCode(req.body.phone)
  ok(res, { mode: ret.mode, mock_code: ret.mockCode }, ret.mockCode ? '验证码已生成（模拟模式回显）' : '验证码已发送')
}))

// POST /api/auth/register — 企业注册（公开）：手机号短信校验 + 创建公司 + 顶层组织 + 默认部门 + 总管理员
router.post('/register', asyncH(async (req, res) => {
  requireFields(req.body, ['company_name', 'username', 'password', 'real_name', 'phone', 'sms_code'])
  const companyName = String(req.body.company_name).trim()
  const username = String(req.body.username).trim()
  const phone = String(req.body.phone).trim()
  if (companyName.length < 2) throw new ApiError('公司名称过短', 400)
  if (String(req.body.password).length < 6) throw new ApiError('密码长度不得少于6位', 400)
  try {
    await verifySmsCode(phone, req.body.sms_code)
  } catch (e) {
    throw new ApiError(e.message, 400)
  }
  const dupUser = await sysUser.list({ username }, { pageSize: 1 })
  if (dupUser.length) throw new ApiError('登录账号已被占用', 400)
  const dupPhone = await sysUser.list({ phone }, { pageSize: 1 })
  if (dupPhone.length) throw new ApiError('该手机号已绑定其他账号', 400)
  const dupTenant = await sysTenant.list({ tenant_name: companyName }, { pageSize: 1 })
  if (dupTenant.length) throw new ApiError('该公司名称已注册', 400)

  const hash = await bcrypt.hash(String(req.body.password), 10)
  const result = await tx(async () => {
    const t = await sysTenant.insert({
      tenant_name: companyName,
      contact_person: String(req.body.real_name),
      contact_phone: phone,
      status: 1
    })
    const tenantId = t.insertId
    const org = await sysOrg.insert({
      tenant_id: tenantId,
      org_name: companyName,
      org_code: 'T' + tenantId,
      org_level: 1,
      sort_no: 1
    })
    const dept = await sysDept.insert({
      tenant_id: tenantId,
      org_id: org.insertId,
      dept_name: '信息化部',
      sort_no: 1
    })
    const adminRoleRows = await sysRole.list({ role_code: 'ADMIN' }, { pageSize: 1 })
    const adminRole = adminRoleRows[0]
    const u = await sysUser.insert({
      tenant_id: tenantId,
      username,
      password_hash: hash,
      real_name: String(req.body.real_name),
      phone,
      org_id: org.insertId,
      dept_id: dept.insertId,
      position: '总管理员',
      use_computer: 1
    })
    if (adminRole) await sysUserRole.insert({ user_id: u.insertId, role_id: adminRole.id })
    return { tenantId, orgId: org.insertId, userId: u.insertId }
  })

  // 注册成功直接登录（在新租户上下文中组装用户信息）
  const rows = await sysUser.list({ id: result.userId }, { pageSize: 1 })
  const user = await runWithTenant(result.tenantId, async () => buildUserInfo(rows[0]))
  const token = jwt.sign({ uid: result.userId }, config.jwtSecret, { expiresIn: config.jwtExpires })
  ok(res, { token, user }, '企业注册成功')
}))

// POST /api/auth/login
router.post('/login', asyncH(async (req, res) => {
  requireFields(req.body, ['username', 'password'])
  const username = String(req.body.username || '')
  const rows = await sysUser.list({ username }, { pageSize: 1 })
  const u = rows && rows[0]
  if (!u || u.is_deleted) throw new ApiError('账号或密码错误', 401)
  if (u.status !== 1) throw new ApiError('账号已停用，请联系管理员', 403)
  const match = await bcrypt.compare(String(req.body.password), u.password_hash)
  if (!match) throw new ApiError('账号或密码错误', 401)
  // 停用租户拦截（总体管理员停用企业后，其用户无法登录）
  if (u.tenant_id && Number(u.tenant_id) > 0) {
    const trows = await sysTenant.list({ id: Number(u.tenant_id) }, { pageSize: 1 })
    const tenant = trows && trows[0]
    if (!tenant || Number(tenant.status) !== 1) {
      throw new ApiError('所属企业已被停用，请联系平台运营方', 403)
    }
  }
  await sysUser.update(u.id, { last_login_time: nowStr() })
  const token = jwt.sign({ uid: Number(u.id) }, config.jwtSecret, { expiresIn: config.jwtExpires })
  ok(res, { token, user: await buildUserInfo(u) })
}))

// GET /api/auth/me（需登录）
router.get('/me', authGuard, asyncH(async (req, res) => {
  const rows = await sysUser.list({ id: Number(req.user.id) }, { pageSize: 1 })
  const u = rows && rows[0]
  if (!u) throw new ApiError('用户不存在', 404)
  ok(res, await buildUserInfo(u))
}))

// PUT /api/auth/password（需登录）
router.put('/password', authGuard, asyncH(async (req, res) => {
  requireFields(req.body, ['oldPassword', 'newPassword'])
  const rows = await sysUser.list({ id: Number(req.user.id) }, { pageSize: 1 })
  const u = rows && rows[0]
  if (!u) throw new ApiError('用户不存在', 404)
  const match = await bcrypt.compare(String(req.body.oldPassword), u.password_hash)
  if (!match) throw new ApiError('原密码不正确', 400)
  if (String(req.body.newPassword).length < 6) throw new ApiError('新密码长度不得少于6位', 400)
  const hash = await bcrypt.hash(String(req.body.newPassword), 10)
  await sysUser.update(Number(u.id), { password_hash: hash })
  ok(res, null, '密码修改成功')
}))

export default router
