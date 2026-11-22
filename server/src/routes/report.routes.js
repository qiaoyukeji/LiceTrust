/** 台账报表接口（附件1/2/3/6/9，FR-09：目录/预览/导出/报送记录） */
import Excel from 'exceljs'
import { Router } from 'express'
import {
  sysConfig, sysUser, baseSoftware, baseFreeSoftware, baseLeader,
  assetComputer, assetMaintLog, flowMaintApply
} from '../db/dao/index.js'
import { asset, pur } from '../db/queries/index.js'
import { ok, ApiError, asyncH, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { daysLaterStr } from '../db/util.js'
import { oneOf, oneOfSoftware } from '../utils/one.js'

const router = Router()

const TEMPLATES = [
  { type: 'summary', name: '附件2 软件使用情况汇总表' },
  { type: 'detail', name: '附件3 软件使用情况明细表' },
  { type: 'maint', name: '附件9 软件安装维护情况明细表' },
  { type: 'free', name: '附件6 可使用免费软件清单' },
  { type: 'leader', name: '附件1 领导小组成员表' }
]
const TITLE = Object.fromEntries(TEMPLATES.map((t) => [t.type, t.name]))
const TYPE_TEXT = { 1: '商业软件', 2: 'OEM软件', 3: '免费软件' }
const CHECK_TEXT = { 0: '未核查', 1: '相符', 2: '不符', 3: '未安装', 4: '未登记' }
const OP_TEXT = { 1: '安装', 2: '卸载', 3: '升级前卸载', 4: '升级后安装' }

const cols = (def) => def.map(([key, label, width]) => ({ key, label, width }))
const SUMMARY_COLS = cols([
  ['idx', '序号', 6], ['software_no', '软件编号', 16], ['software_name', '软件名称', 22], ['version', '软件版本', 12],
  ['type_text', '软件类型', 10], ['purchase_date', '采购时间', 12], ['purchase_amount', '采购金额', 12],
  ['license_type', '许可类型', 12], ['license_qty', '许可数量', 10], ['usable_version', '可使用版本', 16],
  ['license_term', '许可期限', 12], ['install_count', '安装数量', 10]
])
const DETAIL_COLS = cols([
  ['idx', '序号', 6], ['dept_name', '部门', 16], ['user_name', '姓名', 10], ['computer_no', '计算机编号', 18],
  ['brand', '计算机品牌', 12], ['software_no', '软件编号', 16], ['software_name', '软件名称', 22],
  ['version', '软件版本', 12], ['license_term', '许可期限', 12], ['type_text', '软件类型', 10],
  ['install_date', '安装日期', 12], ['check_text', '现场核查情况', 12]
])
const MAINT_COLS = cols([
  ['idx', '序号', 6], ['computer_no', '计算机编号', 18], ['software_name', '软件名称', 22],
  ['op_text', '操作类型', 12], ['op_date', '操作时间', 20], ['operator_name', '操作人', 10],
  ['reason', '原因', 30], ['apply_no', '关联申请单号', 20]
])
const FREE_COLS = cols([
  ['idx', '序号', 6], ['software_name', '软件名称', 22], ['version', '软件版本', 12], ['vendor', '软件厂商', 16],
  ['source', '软件来源', 16], ['use_dept', '使用部门', 16], ['use_reason', '使用原因', 24], ['service_contact', '厂商客服联系方式', 20]
])
const LEADER_COLS = cols([
  ['idx', '序号', 6], ['division', '分工', 10], ['dept', '部门', 20], ['position', '职务', 14],
  ['name', '姓名', 10], ['phone', '联系电话', 16], ['fax', '传真', 16]
])

/** 附件2 汇总表：软件库 + 授权信息 + 概览统计 */
async function buildSummary() {
  const [sws, ents, ovRows, comps] = await Promise.all([
    asset.softwareRows({}, { pageSize: 200 }),
    pur.entitlementRows({}, { pageSize: 200 }),
    pur.statsOverview({ expireBefore: daysLaterStr(90) }),
    asset.computerRows({}, { pageSize: 200 })
  ])
  const entMap = new Map()
  for (const e of ents) if (!entMap.has(Number(e.software_id))) entMap.set(Number(e.software_id), e)
  const rows = sws.map((s, i) => {
    const e = entMap.get(Number(s.id))
    return {
      idx: i + 1, software_no: s.software_no, software_name: s.software_name, version: s.version || '',
      type_text: TYPE_TEXT[s.software_type] || '', purchase_date: e ? (e.purchase_date || '') : '',
      purchase_amount: e ? (e.purchase_amount || 0) : 0, license_type: e ? (e.license_type || '') : '',
      license_qty: s.license_qty || 0, usable_version: s.usable_version || '',
      license_term: e ? (e.license_term || '') : '', install_count: s.install_count || 0
    }
  })
  const cnt = { 1: 0, 2: 0, 3: 0 }
  for (const c of comps) cnt[Number(c.computer_type)] = (cnt[Number(c.computer_type)] || 0) + 1
  const ov = ovRows[0] || {}
  return {
    title: TITLE.summary, columns: SUMMARY_COLS, rows,
    topStats: {
      person_total: ov.person_total || 0, computer_total: ov.computer_total || 0,
      server_total: cnt[1] || 0, desktop_total: cnt[2] || 0, laptop_total: cnt[3] || 0
    }
  }
}

/** 附件3 明细表：安装明细（可按单位过滤） */
async function buildDetail(orgId) {
  const f = orgId ? { orgId: toInt(orgId) } : {}
  const list = await asset.installRows(f, { pageSize: 500 })
  const rows = list.map((r, i) => ({
    idx: i + 1, dept_name: r.dept_name || '', user_name: r.user_name || '',
    computer_no: r.computer_no || '', brand: r.brand || '',
    software_no: r.software_no || '', software_name: r.software_name || '',
    version: r.version || '', license_term: r.license_term || '',
    type_text: TYPE_TEXT[r.software_type] || '', install_date: r.install_date || '',
    check_text: CHECK_TEXT[Number(r.inspect_status) || 0] || '未核查'
  }))
  return { title: TITLE.detail, columns: DETAIL_COLS, rows }
}

/** 附件9 维护明细表：维护日志 + 计算机/软件/操作人/申请单补全 */
async function buildMaint() {
  const logs = await assetMaintLog.listAll({})
  const uniq = (arr) => [...new Set(arr.filter(Boolean).map(Number))]
  const [comps, sws, users, applies] = await Promise.all([
    Promise.all(uniq(logs.map((l) => l.computer_id)).map((id) => oneOf(assetComputer, id))),
    Promise.all(uniq(logs.map((l) => l.software_id)).map((id) => oneOfSoftware(id))),
    Promise.all(uniq(logs.map((l) => l.operator_id)).map((id) => oneOf(sysUser, id))),
    Promise.all(uniq(logs.map((l) => l.apply_id)).map((id) => oneOf(flowMaintApply, id)))
  ])
  const mapOf = (arr) => new Map(arr.filter(Boolean).map((r) => [Number(r.id), r]))
  const cMap = mapOf(comps)
  const sMap = mapOf(sws)
  const uMap = mapOf(users)
  const aMap = mapOf(applies)
  const rows = logs.map((l, i) => {
    const c = cMap.get(Number(l.computer_id))
    const s = sMap.get(Number(l.software_id))
    const u = uMap.get(Number(l.operator_id))
    const ap = aMap.get(Number(l.apply_id))
    return {
      idx: i + 1, computer_no: c ? c.computer_no : '', software_name: s ? s.software_name : '',
      op_text: OP_TEXT[Number(l.op_type)] || '', op_date: l.op_date || '',
      operator_name: u ? u.real_name : '', reason: l.reason || '', apply_no: ap ? ap.apply_no : ''
    }
  })
  return { title: TITLE.maint, columns: MAINT_COLS, rows }
}

/** 附件6 免费软件清单 */
async function buildFree() {
  const frees = await baseFreeSoftware.listAll({})
  const sws = await Promise.all(frees.map((f) => (f.software_id ? oneOfSoftware(f.software_id) : null)))
  const rows = frees.map((f, i) => ({
    idx: i + 1, software_name: sws[i] ? sws[i].software_name : '', version: sws[i] ? (sws[i].version || '') : '',
    vendor: f.vendor || '', source: f.source || '', use_dept: f.use_dept || '',
    use_reason: f.use_reason || '', service_contact: f.service_contact || ''
  }))
  return { title: TITLE.free, columns: FREE_COLS, rows }
}

/** 附件1 领导小组成员表 */
async function buildLeader() {
  const list = await baseLeader.listAll({})
  list.sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0))
  const rows = list.map((r, i) => ({
    idx: i + 1, division: r.division || '', dept: r.dept || '', position: r.position || '',
    name: r.name || '', phone: r.phone || '', fax: r.fax || ''
  }))
  return { title: TITLE.leader, columns: LEADER_COLS, rows }
}

const BUILDERS = { summary: buildSummary, detail: buildDetail, maint: buildMaint, free: buildFree, leader: buildLeader }

async function buildOf(type, query) {
  const b = BUILDERS[type]
  if (!b) throw new ApiError('未知报表类型: ' + type, 400)
  return b(query && query.orgId)
}

// GET /api/reports/templates — 报表目录
router.get('/templates', requirePerm('report:view'), asyncH(async (req, res) => {
  ok(res, TEMPLATES)
}))

// GET /api/reports/preview/:type — 预览数据（columns/rows/title/topStats）
router.get('/preview/:type', requirePerm('report:view'), asyncH(async (req, res) => {
  ok(res, await buildOf(req.params.type, req.query))
}))

// GET /api/reports/send-log — 报送记录（P1 简化：存于系统参数 report_send_log）
router.get('/send-log', requirePerm('report:view'), asyncH(async (req, res) => {
  const rows = await sysConfig.list({ config_key: 'report_send_log' }, { pageSize: 1 })
  let list = []
  if (rows.length) {
    try { list = JSON.parse(rows[0].config_value || '[]') } catch (e) { list = [] }
  }
  ok(res, { list, remark: '报送记录暂存于系统参数 report_send_log（P1 简化实现）' })
}))

// GET /api/reports/export/:type?orgId= — 导出 xlsx（report:export）
router.get('/export/:type', requirePerm('report:export'), asyncH(async (req, res) => {
  const b = await buildOf(req.params.type, req.query)
  const wb = new Excel.Workbook()
  const ws = wb.addWorksheet('report')
  ws.columns = b.columns.map((c) => ({ header: c.label, key: c.key, width: c.width || 14 }))
  ws.addRows(b.rows)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent('报表.xlsx') + '"')
  await wb.xlsx.write(res)
}))

export default router
