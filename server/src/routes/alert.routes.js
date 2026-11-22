/** 预警中心接口（FR-12：1到期 2超授权 3未登记 4未核查） */
import { Router } from 'express'
import { bizAlert, purEntitlement, baseSoftware, assetComputer, sysUser, sysUserRole, sysRole } from '../db/dao/index.js'
import { pur } from '../db/queries/index.js'
import { tx } from '../db/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, toInt } from '../utils/response.js'
import { oneOf, oneOfSoftware } from '../utils/one.js'
import { requirePerm } from '../middleware/rbac.js'
import { daysLaterStr, daysAgoStr, nowStr } from '../db/util.js'
import { sendNoticeSms } from '../services/smsService.js'

const router = Router()

function countOf(rows) { return Number((rows && rows[0] && rows[0].n) || 0) }

/** 距今天数（负数表示已过期） */
function daysUntil(dateStr) {
  const t = new Date(String(dateStr || '')).getTime()
  return Number.isFinite(t) ? Math.floor((t - Date.now()) / 86400000) : null
}

/** 是否已存在同业务同类型未处理预警（去重） */
async function hasUnhandled(bizType, bizId, alertType) {
  const rows = await bizAlert.list({ biz_type: bizType, biz_id: bizId, alert_type: alertType, status: 0 }, { pageSize: 1 })
  return rows.length > 0
}

// GET /api/alerts — 分页列表（alertType/status/orgId/level/kw）
router.get('/', requirePerm('alert:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { kw: req.query.kw }
  if (req.query.alertType) f.alertType = toInt(req.query.alertType)
  if (req.query.status !== undefined && req.query.status !== '') f.status = toInt(req.query.status)
  if (req.query.orgId) f.orgId = toInt(req.query.orgId)
  if (req.query.level) f.level = toInt(req.query.level)
  const [list, cnt] = await Promise.all([pur.alertRows(f, { page, pageSize }), pur.alertCount(f)])
  paged(res, list, countOf(cnt), page, pageSize)
}))

// PUT /api/alerts/:id/handle — 处理预警（置已处理并记录处理人/时间/说明）
router.put('/:id/handle', requirePerm('alert:handle'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const rows = await bizAlert.list({ id }, { pageSize: 1 })
  if (!rows.length) throw new ApiError('预警不存在', 404)
  await bizAlert.update(id, {
    status: 2,
    handler_id: req.user.id,
    handle_time: nowStr(),
    handle_remark: req.body.handle_remark || ''
  }, req.user)
  ok(res, null, '处理成功')
}))

/** a) 到期预警：授权 90 天内到期且无未处理同类记录 */
async function scanExpiring(limit) {
  const rows = []
  const ents = await purEntitlement.listAll({})
  for (const e of ents) {
    if (!e.expire_date || String(e.expire_date) > limit) continue
    if (await hasUnhandled('entitlement', e.id, 1)) continue
    const sw = e.software_id ? await oneOfSoftware(e.software_id) : null
    const diff = daysUntil(e.expire_date)
    const due = diff < 0 ? '已于 ' + e.expire_date + ' 到期' : '将于 ' + e.expire_date + ' 到期（剩余 ' + diff + ' 天）'
    rows.push({
      alert_type: 1, biz_type: 'entitlement', biz_id: e.id,
      level: diff <= 30 ? 1 : diff <= 60 ? 2 : 3,
      content: '软件「' + (sw ? sw.software_name : e.software_id) + '」授权' + due,
      org_id: 0, status: 0
    })
  }
  return rows
}

/** b) 超授权预警：安装数 > 许可数 > 0 */
async function scanOverLicense() {
  const rows = []
  const ents = await pur.entitlementRows({}, { pageSize: 200 })
  for (const e of ents) {
    const ic = Number(e.install_count) || 0
    const lq = Number(e.license_qty) || 0
    if (!(lq > 0 && ic > lq)) continue
    if (await hasUnhandled('entitlement', e.id, 2)) continue
    rows.push({
      alert_type: 2, biz_type: 'entitlement', biz_id: e.id, level: 1,
      content: '软件「' + (e.software_name || e.software_id) + '」安装数 ' + ic + ' 已超过许可数 ' + lq,
      org_id: 0, status: 0
    })
  }
  return rows
}

/** c) 未核查预警：在用计算机超过 180 天未核查（按 update_time 判断） */
async function scanUninspected(before) {
  const rows = []
  const comps = await assetComputer.listAll({ status: 1 })
  for (const c of comps) {
    if (!c.update_time || String(c.update_time) >= before) continue
    if (await hasUnhandled('computer', c.id, 4)) continue
    rows.push({
      alert_type: 4, biz_type: 'computer', biz_id: c.id, level: 2,
      content: '计算机「' + c.computer_no + '」超过 180 天未现场核查（最后更新 ' + c.update_time + '）',
      org_id: c.org_id, status: 0
    })
  }
  return rows
}

// POST /api/alerts/scan — 手动扫描生成预警（FR-12-01/02/04，JS 内存比对，不写 SQL）
router.post('/scan', requirePerm('alert:handle'), asyncH(async (req, res) => {
  const limit = daysLaterStr(90)
  const before = daysAgoStr(180)
  const [expiring, over, uninspected] = await Promise.all([
    scanExpiring(limit), scanOverLicense(), scanUninspected(before)
  ])
  const toInsert = [...expiring, ...over, ...uninspected]
  let created = 0
  if (toInsert.length) {
    await tx(async () => {
      for (const row of toInsert) {
        await bizAlert.insert(row, req.user)
        created += 1
      }
    })
  }
  // 预警短信推送（B3）：高等级预警通知租户管理员手机（复用阿里云短信通道；mock 模式记录日志）
  let smsSent = 0
  const highs = toInsert.filter((r) => Number(r.level) === 1)
  if (highs.length) {
    try {
      const { sendTenantSms } = await import('../services/notifyService.js')
      const admins = await sysRole.list({ role_code: 'ADMIN' }, { pageSize: 1 })
      const adminRole = admins[0]
      const links = adminRole ? await sysUserRole.listAll({ role_id: adminRole.id }) : []
      const phones = new Set()
      for (const l of links) {
        const u = l.user_id ? await oneOf(sysUser, Number(l.user_id)) : null
        if (u && u.phone && /^1[3-9]\d{9}$/.test(String(u.phone))) phones.add(String(u.phone))
      }
      for (const p of phones) {
        const r = await sendTenantSms(Number(req.user.tenant_id), p, '正版化预警：' + highs.slice(0, 2).map((h) => h.content).join('；') + (highs.length > 2 ? ' 等' + highs.length + '条' : ''))
        if (r !== null) smsSent += 1
      }
    } catch (e) {
      console.log('[alert-sms] 推送失败:', e.message)
    }
  }
  ok(res, { created, sms_sent: smsSent }, '扫描完成，新生成 ' + created + ' 条预警' + (smsSent ? '，短信推送 ' + smsSent + ' 位管理员' : ''))
}))

export default router
