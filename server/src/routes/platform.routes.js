/**
 * 平台运营管理员接口（总体管理员）：管理全部企业租户与通用设置
 * 全部接口经 requirePlatform 校验（tenant_id=0 平台运营账号专属）
 */
import { Router } from 'express'
import {
  sysTenant, sysOrg, sysDept, sysUser, sysRole, sysUserRole,
  assetComputer, baseSoftware, assetInstallRecord, purEntitlement
} from '../db/dao/index.js'
import { ok, ApiError, asyncH, requireFields, toInt } from '../utils/response.js'
import { requirePlatform } from '../middleware/rbac.js'

const router = Router()

/* ==================== 租户（企业）管理 ==================== */

// GET /api/platform/tenants — 全部企业列表（含每租户统计）
router.get('/tenants', requirePlatform, asyncH(async (req, res) => {
  const tenants = await sysTenant.listAll({})
  const orgs = await sysOrg.listAll({})
  const depts = await sysDept.listAll({})
  const users = await sysUser.listAll({})
  const computers = await assetComputer.listAll({})
  const softwares = await baseSoftware.listAll({})
  const installs = await assetInstallRecord.listAll({})

  const statOf = (tid) => {
    const t = Number(tid)
    const orgIds = orgs.filter((o) => Number(o.tenant_id) === t).map((o) => o.id)
    const deptIds = depts.filter((d) => Number(d.tenant_id) === t).map((d) => d.id)
    return {
      users: users.filter((u) => Number(u.tenant_id) === t && u.username !== 'platform').length,
      orgs: orgIds.length,
      depts: depts.length,
      computers: computers.filter((c) => Number(c.tenant_id) === t).length,
      softwares: softwares.filter((s) => Number(s.tenant_id) === t).length,
      installs: installs.filter((i) => Number(i.tenant_id) === t && orgIds.includes(Number(i.computer_id) || 0)).length
    }
  }

  ok(res, tenants.map((t) => ({
    ...t,
    stats: statOf(t.id),
    admins: users
      .filter((u) => Number(u.tenant_id) === Number(t.id))
      .slice(0, 3)
      .map((u) => u.real_name + '（' + u.username + '）')
  })))
}))

// GET /api/platform/tenants/:id — 企业详情（资料 + 组织架构树 + 管理员）
router.get('/tenants/:id', requirePlatform, asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const rows = await sysTenant.list({ id }, { pageSize: 1 })
  const t = rows[0]
  if (!t) throw new ApiError('企业不存在', 404)
  const orgs = await sysOrg.listAll({})
  const depts = await sysDept.listAll({})
  const users = await sysUser.listAll({})
  const tOrgs = orgs.filter((o) => Number(o.tenant_id) === id)
  const orgIds = tOrgs.map((o) => o.id)
  const tDepts = depts.filter((d) => orgIds.includes(Number(d.org_id)))
  const tUsers = users.filter((u) => Number(u.tenant_id) === id)
  ok(res, {
    tenant: t,
    orgs: tOrgs,
    depts: tDepts,
    users: tUsers.map((u) => ({ ...u, password_hash: undefined }))
  })
}))

// PUT /api/platform/tenants/:id — 平台代管企业资料
router.put('/tenants/:id', requirePlatform, asyncH(async (req, res) => {
  requireFields(req.body, ['tenant_name'])
  const id = toInt(req.params.id)
  const rows = await sysTenant.list({ id }, { pageSize: 1 })
  if (!rows[0]) throw new ApiError('企业不存在', 404)
  await sysTenant.update(id, {
    tenant_name: req.body.tenant_name,
    contact_person: req.body.contact_person,
    contact_phone: req.body.contact_phone,
    address: req.body.address,
    industry: req.body.industry,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '企业信息已更新')
}))

// PUT /api/platform/tenants/:id/status — 启用/停用企业（停用后其用户无法登录）
router.put('/tenants/:id/status', requirePlatform, asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const status = toInt(req.body.status)
  if (![0, 1].includes(status)) throw new ApiError('状态参数不正确', 400)
  const rows = await sysTenant.list({ id }, { pageSize: 1 })
  const t = rows[0]
  if (!t) throw new ApiError('企业不存在', 404)
  if (status === 0 && id === Number(req.user.tenant_id)) throw new ApiError('不能停用平台运营方', 400)
  await sysTenant.update(id, { status }, req.user)
  ok(res, null, status === 1 ? '企业已启用' : '企业已停用（其用户将无法登录）')
}))

/* ==================== 通用设置（全局资源） ==================== */

// GET /api/platform/overview — 平台总览（全部租户聚合指标）
router.get('/overview', requirePlatform, asyncH(async (req, res) => {
  const tenants = await sysTenant.listAll({})
  const users = await sysUser.listAll({})
  const computers = await assetComputer.listAll({})
  const softwares = await baseSoftware.listAll({})
  const installs = await assetInstallRecord.listAll({})
  const ents = await purEntitlement.listAll({})
  const enabled = tenants.filter((t) => Number(t.status) === 1).length
  ok(res, {
    tenant_total: tenants.length,
    tenant_enabled: enabled,
    user_total: users.filter((u) => Number(u.tenant_id) > 0).length,
    computer_total: computers.filter((c) => Number(c.tenant_id) > 0).length,
    software_total: softwares.filter((s) => Number(s.tenant_id) > 0).length,
    install_total: installs.filter((i) => Number(i.tenant_id) > 0).length,
    license_total: ents.reduce((s, e) => s + Number(e.license_qty || 0), 0)
  })
}))

/* ==================== 平台消息通道配置（短信/SMTP）与租户配额 ==================== */

const MSG_MASK = (v) => (v ? '已配置（****）' : '')

// GET /api/platform/msg-config — 平台短信/SMTP 通道配置（密钥脱敏）
router.get('/msg-config', requirePlatform, asyncH(async (req, res) => {
  const { platformMsgConfig } = await import('../db/dao/index.js')
  const rows = await platformMsgConfig.list({ id: 1 }, { pageSize: 1 })
  const c = rows[0] || {}
  ok(res, {
    sms_enabled: Number(c.sms_enabled) === 1,
    sms_mode: c.sms_mode || 'mock',
    sms_access_key_id: c.sms_access_key_id || '',
    sms_sign_name: c.sms_sign_name || '',
    sms_template_code: c.sms_template_code || '',
    has_sms_secret: !!c.sms_access_key_secret,
    smtp_enabled: Number(c.smtp_enabled) === 1,
    smtp_host: c.smtp_host || '',
    smtp_port: Number(c.smtp_port) || 465,
    smtp_secure: Number(c.smtp_secure) === 1,
    smtp_user: c.smtp_user || '',
    smtp_from: c.smtp_from || '',
    has_smtp_pass: !!c.smtp_pass
  })
}))

// PUT /api/platform/msg-config — 保存平台短信/SMTP 通道配置（密钥传空保留原值）
router.put('/msg-config', requirePlatform, asyncH(async (req, res) => {
  const { platformMsgConfig } = await import('../db/dao/index.js')
  const { aesEncrypt } = await import('../utils/crypto.js')
  const b = req.body
  const rows = await platformMsgConfig.list({ id: 1 }, { pageSize: 1 })
  const prev = rows[0]
  const data = {
    id: 1,
    sms_enabled: b.sms_enabled ? 1 : 0,
    sms_mode: b.sms_mode || 'mock',
    sms_access_key_id: b.sms_access_key_id,
    sms_sign_name: b.sms_sign_name,
    sms_template_code: b.sms_template_code,
    smtp_enabled: b.smtp_enabled ? 1 : 0,
    smtp_host: b.smtp_host,
    smtp_port: toInt(b.smtp_port || 465),
    smtp_secure: b.smtp_secure ? 1 : 0,
    smtp_user: b.smtp_user,
    smtp_from: b.smtp_from
  }
  if (b.sms_access_key_secret) data.sms_access_key_secret = aesEncrypt(String(b.sms_access_key_secret))
  if (b.smtp_pass) data.smtp_pass = aesEncrypt(String(b.smtp_pass))
  if (prev) {
    await platformMsgConfig.update(1, data, req.user)
  } else {
    await platformMsgConfig.insert(data, req.user)
  }
  ok(res, null, '平台消息通道配置已保存')
}))

// POST /api/platform/msg-config/test-sms — 平台短信通道测试
router.post('/msg-config/test-sms', requirePlatform, asyncH(async (req, res) => {
  const { platformTestSend } = await import('../services/notifyService.js')
  requireFields(req.body, ['phone'])
  await platformTestSend('sms', String(req.body.phone))
  ok(res, null, '平台短信通道测试发送成功')
}))

// POST /api/platform/msg-config/test-email — 平台SMTP通道测试
router.post('/msg-config/test-email', requirePlatform, asyncH(async (req, res) => {
  const { platformTestSend } = await import('../services/notifyService.js')
  requireFields(req.body, ['email'])
  await platformTestSend('email', String(req.body.email))
  ok(res, null, '平台邮箱通道测试发送成功')
}))

// PUT /api/platform/tenants/:id/quota — 向租户分配平台消息通道额度
router.put('/tenants/:id/quota', requirePlatform, asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const rows = await sysTenant.list({ id }, { pageSize: 1 })
  if (!rows[0]) throw new ApiError('企业不存在', 404)
  const b = req.body
  await sysTenant.update(id, {
    use_platform_sms: b.use_platform_sms !== undefined ? (b.use_platform_sms ? 1 : 0) : undefined,
    sms_quota: b.sms_quota !== undefined ? Math.max(0, toInt(b.sms_quota)) : undefined,
    use_platform_email: b.use_platform_email !== undefined ? (b.use_platform_email ? 1 : 0) : undefined,
    email_quota: b.email_quota !== undefined ? Math.max(0, toInt(b.email_quota)) : undefined
  }, req.user)
  const t = (await sysTenant.list({ id }, { pageSize: 1 }))[0]
  ok(res, {
    use_platform_sms: Number(t.use_platform_sms) === 1,
    sms_quota: Number(t.sms_quota || 0),
    sms_used: Number(t.sms_used || 0),
    use_platform_email: Number(t.use_platform_email) === 1,
    email_quota: Number(t.email_quota || 0),
    email_used: Number(t.email_used || 0)
  }, '消息通道分配已更新')
}))

// GET /api/platform/roles — 全部角色（含权限点解析，通用设置维护用）
router.get('/roles', requirePlatform, asyncH(async (req, res) => {
  const roles = await sysRole.listAll({})
  ok(res, roles.map((r) => ({ ...r, perms: (() => {
    try { return JSON.parse(r.perms || '[]') } catch (ignore) { return [] }
  })() })))
}))

// GET /api/platform/users — 全部用户（跨租户，平台视角）
router.get('/users', requirePlatform, asyncH(async (req, res) => {
  const users = await sysUser.listAll({})
  const tenants = await sysTenant.listAll({})
  const tName = (tid) => {
    const t = tenants.find((x) => x.id === Number(tid))
    return t ? t.tenant_name : (Number(tid) === 0 ? '平台运营方' : '-')
  }
  const links = await sysUserRole.listAll({})
  ok(res, users
    .filter((u) => u.username !== 'platform')
    .map((u) => ({
      ...u,
      password_hash: undefined,
      tenant_name: tName(u.tenant_id),
      role_ids: links.filter((l) => l.user_id === u.id).map((l) => l.role_id)
    })))
}))

export default router
