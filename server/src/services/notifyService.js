/**
 * 消息通知服务（多租户）：短信 / 邮件 双通道统一出口
 *
 * 通道解析优先级（resolveChannel）：
 *   1. 租户自有配置（tenant_msg_config：sms_enabled / smtp_enabled 且密钥完整）
 *   2. 平台通道（platform_msg_config 已启用，且该租户被平台分配了额度 use_platform_sms/email=1，
 *      已用量 < 配额）——发送后扣减 sys_tenant 的 sms_used / email_used
 *   3. 均不可用 → 返回 null（调用方决定降级行为）
 *
 * 所有发送写 msg_send_log（通道/来源/接收方/状态），额度扣减依据与审计依据。
 */
import nodemailer from 'nodemailer'
import { tenantMsgConfig, platformMsgConfig, sysTenant, msgSendLog, sysUser, sysUserRole, sysRole } from '../db/dao/index.js'
import { sendContentSms } from './smsService.js'
import { aesDecrypt } from '../utils/crypto.js'

/* ---------- 通道解析 ---------- */

function smsKeysComplete(c) {
  if (!c) return false
  // mock 模式无需密钥，仅要求启用
  if (c.sms_mode === 'mock') return true
  return !!(c.sms_access_key_id && c.sms_access_key_secret && c.sms_sign_name && c.sms_template_code)
}

async function resolveSmsChannel(tenantId) {
  const tRows = await tenantMsgConfig.list({ tenant_id: Number(tenantId) }, { pageSize: 1 })
  const tc = tRows[0]
  if (tc && Number(tc.sms_enabled) === 1 && smsKeysComplete(tc)) {
    return {
      source: 'tenant',
      cfg: {
        mode: tc.sms_mode,
        accessKeyId: tc.sms_access_key_id,
        accessKeySecret: aesDecrypt(tc.sms_access_key_secret),
        signName: tc.sms_sign_name,
        templateCode: tc.sms_template_code,
        endpoint: undefined
      }
    }
  }
  const tRows2 = await sysTenant.list({ id: Number(tenantId) }, { pageSize: 1 })
  const tenant = tRows2[0]
  const pRows = await platformMsgConfig.list({ id: 1 }, { pageSize: 1 })
  const pc = pRows[0]
  if (
    tenant && Number(tenant.use_platform_sms) === 1 &&
    pc && Number(pc.sms_enabled) === 1 && smsKeysComplete(pc) &&
    Number(tenant.sms_used) < Number(tenant.sms_quota)
  ) {
    return {
      source: 'platform',
      cfg: {
        mode: pc.sms_mode,
        accessKeyId: pc.sms_access_key_id,
        accessKeySecret: aesDecrypt(pc.sms_access_key_secret),
        signName: pc.sms_sign_name,
        templateCode: pc.sms_template_code,
        endpoint: undefined
      }
    }
  }
  return null
}

async function resolveEmailChannel(tenantId) {
  const tRows = await tenantMsgConfig.list({ tenant_id: Number(tenantId) }, { pageSize: 1 })
  const tc = tRows[0]
  if (tc && Number(tc.smtp_enabled) === 1 && tc.smtp_host && tc.smtp_user && tc.smtp_pass) {
    return {
      source: 'tenant',
      cfg: {
        host: tc.smtp_host, port: Number(tc.smtp_port) || 465,
        secure: Number(tc.smtp_secure) === 1,
        user: tc.smtp_user, pass: aesDecrypt(tc.smtp_pass), from: tc.smtp_from || tc.smtp_user
      }
    }
  }
  const tRows2 = await sysTenant.list({ id: Number(tenantId) }, { pageSize: 1 })
  const tenant = tRows2[0]
  const pRows = await platformMsgConfig.list({ id: 1 }, { pageSize: 1 })
  const pc = pRows[0]
  if (
    tenant && Number(tenant.use_platform_email) === 1 &&
    pc && Number(pc.smtp_enabled) === 1 && pc.smtp_host && pc.smtp_user && pc.smtp_pass &&
    Number(tenant.email_used) < Number(tenant.email_quota)
  ) {
    return {
      source: 'platform',
      cfg: {
        host: pc.smtp_host, port: Number(pc.smtp_port) || 465,
        secure: Number(pc.smtp_secure) === 1,
        user: pc.smtp_user, pass: aesDecrypt(pc.smtp_pass), from: pc.smtp_from || pc.smtp_user
      }
    }
  }
  return null
}

/* ---------- 发送与记录 ---------- */

async function logSend(tenantId, channel, source, target, content, okFlag, error) {
  await msgSendLog.insert({
    tenant_id: Number(tenantId) || 0,
    channel, source, target,
    content: String(content || '').slice(0, 500),
    status: okFlag ? 1 : 0,
    error: error || ''
  })
}

/** 发送短信（按租户通道解析 + 平台额度扣减）；返回 null 表示无可用通道 */
export async function sendTenantSms(tenantId, phone, content) {
  const ch = await resolveSmsChannel(Number(tenantId))
  if (!ch) return null
  try {
    const r = await sendContentSms(ch.cfg, phone, content)
    await logSend(tenantId, 'sms', ch.source, phone, content, true)
    if (ch.source === 'platform') {
      const t = (await sysTenant.list({ id: Number(tenantId) }, { pageSize: 1 }))[0]
      if (t) await sysTenant.update(t.id, { sms_used: Number(t.sms_used || 0) + 1 })
    }
    return { source: ch.source, provider: r }
  } catch (e) {
    await logSend(tenantId, 'sms', ch.source, phone, content, false, e.message)
    throw e
  }
}

/** 发送邮件（按租户通道解析 + 平台额度扣减）；返回 null 表示无可用通道 */
export async function sendTenantEmail(tenantId, to, subject, html) {
  const ch = await resolveEmailChannel(Number(tenantId))
  if (!ch) return null
  try {
    const transporter = nodemailer.createTransport({
      host: ch.cfg.host,
      port: ch.cfg.port,
      secure: ch.cfg.secure,
      auth: { user: ch.cfg.user, pass: ch.cfg.pass }
    })
    await transporter.sendMail({ from: '"' + (ch.cfg.from || '正版软件管理平台') + '" <' + ch.cfg.user + '>', to, subject, html })
    await logSend(tenantId, 'email', ch.source, to, subject, true)
    if (ch.source === 'platform') {
      const t = (await sysTenant.list({ id: Number(tenantId) }, { pageSize: 1 }))[0]
      if (t) await sysTenant.update(t.id, { email_used: Number(t.email_used || 0) + 1 })
    }
    return { source: ch.source }
  } catch (e) {
    await logSend(tenantId, 'email', ch.source, to, subject, false, e.message)
    throw e
  }
}

/* ---------- 到期提醒（租户管理员短信/邮件） ---------- */

/** 租户管理员（ADMIN 角色用户）中配置了手机/邮箱的人员 */
async function tenantAdmins(tenantId) {
  const roles = await sysRole.list({ role_code: 'ADMIN' }, { pageSize: 1 })
  const adminRole = roles[0]
  const links = adminRole ? await sysUserRole.listAll({ role_id: adminRole.id }) : []
  const users = await sysUser.listAll({})
  return links
    .map((l) => users.find((u) => u.id === l.user_id))
    .filter((u) => u && Number(u.tenant_id) === Number(tenantId))
}

/**
 * 到期提醒：向租户管理员发送短信（手机号）与邮件（邮箱）
 * contents: [{text, days}] 到期预警内容
 */
export async function notifyExpiring(tenantId, contents) {
  const admins = await tenantAdmins(tenantId)
  const results = { sms: 0, email: 0, skipped: 0 }
  const text = contents.map((c) => c.text).join('；')
  for (const a of admins) {
    if (a.phone && /^1[3-9]\d{9}$/.test(a.phone)) {
      try {
        const r = await sendTenantSms(tenantId, a.phone, '软件到期提醒：' + text)
        if (r === null) { results.skipped += 1 } else { results.sms += 1 }
      } catch (e) { results.skipped += 1 }
    }
    if (a.email) {
      try {
        const r = await sendTenantEmail(
          tenantId, a.email,
          '软件正版化到期提醒',
          '<p>以下授权即将到期，请及时处理：</p><p>' + contents.map((c) => c.text).join('<br/>') + '</p>'
        )
        if (r === null) { results.skipped += 1 } else { results.email += 1 }
      } catch (e) { results.skipped += 1 }
    }
  }
  return results
}

/** 平台通道测试发送（平台消息配置页联调用，走 platform 租户上下文，不占租户额度） */
export async function platformTestSend(channel, target) {
  const pRows = await platformMsgConfig.list({ id: 1 }, { pageSize: 1 })
  const pc = pRows[0]
  if (!pc) throw new Error('平台消息配置不存在')
  if (channel === 'sms') {
    if (!pc.sms_enabled || !smsKeysComplete(pc)) throw new Error('平台短信通道未启用或配置不完整')
    const { sendContentSms: scs } = await import('./smsService.js')
    await scs({
      mode: pc.sms_mode,
      accessKeyId: pc.sms_access_key_id,
      accessKeySecret: aesDecrypt(pc.sms_access_key_secret),
      signName: pc.sms_sign_name,
      templateCode: pc.sms_template_code
    }, target, '平台短信通道测试')
    return
  }
  if (!pc.smtp_enabled || !pc.smtp_host || !pc.smtp_user || !pc.smtp_pass) throw new Error('平台SMTP通道未启用或配置不完整')
  const transporter = nodemailer.createTransport({
    host: pc.smtp_host,
    port: Number(pc.smtp_port) || 465,
    secure: Number(pc.smtp_secure) === 1,
    auth: { user: pc.smtp_user, pass: aesDecrypt(pc.smtp_pass) }
  })
  await transporter.sendMail({
    from: '"' + (pc.smtp_from || '正版软件管理平台') + '" <' + pc.smtp_user + '>',
    to: target,
    subject: '平台邮箱通道测试',
    text: '这是一封平台SMTP通道测试邮件。'
  })
}
