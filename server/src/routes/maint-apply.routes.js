/** 安装维护流程接口（附件10/11，FR-08：申请→审核→执行→确认→台账写回闭环） */
import { Router } from 'express'
import {
  flowMaintApply, flowApproval, flowConfirm, assetComputer,
  assetInstallRecord, assetMaintLog, baseSoftware, purEntitlement, sysUser
} from '../db/dao/index.js'
import { flow, asset } from '../db/queries/index.js'
import { tx } from '../db/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm, scopeFilters } from '../middleware/rbac.js'
import { genApplyNo } from '../utils/noGen.js'
import { nowStr, todayStr } from '../db/util.js'
import { oneOf } from '../utils/one.js'

const router = Router()

/** 状态机（FR-08）：0草稿 10待部门审核 20待信息化审核 30待执行 40待使用人确认 50已完成 60已驳回 */
const NODE_TEXT = { 0: '草稿', 10: '部门负责人审核', 20: '信息化部门审核', 30: '信息化部门执行', 40: '使用人确认', 50: '已完成', 60: '已驳回' }

function countOf(rows) { return Number((rows && rows[0] && rows[0].n) || 0) }

async function loadApply(id) {
  const rows = await flowMaintApply.list({ id }, { pageSize: 1 })
  const a = rows && rows[0]
  if (!a) throw new ApiError('申请单不存在', 404)
  return a
}

/** 数据权限：scope=1/2 全局不过滤；3 本部门；4 仅本人申请 */
const applyScope = (user) => scopeFilters(user, { dept: 'deptId', user: 'applicantId' })
const isAdmin = (user) => (user.perms || []).includes('*')

// GET / — 分页列表（apply:view + 数据权限；kw/status/applyType/deptId）
router.get('/', requirePerm('apply:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { ...applyScope(req.user), kw: req.query.kw }
  if (req.query.status !== undefined && req.query.status !== '') f.status = toInt(req.query.status)
  if (req.query.applyType) f.applyType = toInt(req.query.applyType)
  if (req.query.deptId) f.deptId = toInt(req.query.deptId)
  if (req.query.computerId) f.computerId = toInt(req.query.computerId)
  const [list, cnt] = await Promise.all([flow.applyRows(f, { page, pageSize }), flow.applyCount(f)])
  paged(res, list, countOf(cnt), page, pageSize)
}))

// GET /my — 我的相关（本人申请）
router.get('/my', requirePerm('apply:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { applicantId: req.user.id, kw: req.query.kw }
  if (req.query.status !== undefined && req.query.status !== '') f.status = toInt(req.query.status)
  const [list, cnt] = await Promise.all([flow.applyRows(f, { page, pageSize }), flow.applyCount(f)])
  paged(res, list, countOf(cnt), page, pageSize)
}))

// GET /pending/role1 — 部门负责人待审（本部门，FR-08-02）；/role2 信息化待审
router.get('/pending/role1', requirePerm('apply:approve1'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req, 100)
  const f = { status: 10 }
  if (!isAdmin(req.user)) f.deptId = req.user.dept_id
  ok(res, await flow.applyRows(f, { page, pageSize }))
}))
router.get('/pending/role2', requirePerm('apply:approve2'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req, 100)
  ok(res, await flow.applyRows({ status: 20 }, { page, pageSize }))
}))

// GET /pending/execute — 待执行；/pending/confirm — 待我确认（本人为计算机使用人，FR-08-04）
router.get('/pending/execute', requirePerm('apply:execute'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req, 100)
  ok(res, await flow.applyRows({ status: 30 }, { page, pageSize }))
}))
router.get('/pending/confirm', requirePerm('apply:confirm'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req, 100)
  const f = { status: 40 }
  if (!isAdmin(req.user)) f.computerUserId = req.user.id
  ok(res, await flow.applyRows(f, { page, pageSize }))
}))

// POST / — 新建申请（saveDraft=true 存草稿，否则直接提交，FR-08-01）
router.post('/', requirePerm('apply:create'), asyncH(async (req, res) => {
  requireFields(req.body, ['computer_id', 'apply_type', 'software_name'])
  const computer = await oneOf(assetComputer, Number(req.body.computer_id))
  if (!computer) throw new ApiError('计算机不存在', 400)
  const saveDraft = !!req.body.saveDraft
  const applyNo = await genApplyNo()
  const ret = await flowMaintApply.insert({
    apply_no: applyNo, dept_id: req.user.dept_id, applicant_id: req.user.id,
    apply_time: saveDraft ? null : nowStr(),
    computer_id: toInt(req.body.computer_id), apply_type: toInt(req.body.apply_type),
    software_id: toInt(req.body.software_id || 0), software_name: String(req.body.software_name),
    version: req.body.version, upgrade_from: req.body.upgrade_from,
    upgrade_to: req.body.upgrade_to, reason: req.body.reason,
    status: saveDraft ? 0 : 10, current_node: saveDraft ? NODE_TEXT[0] : NODE_TEXT[10]
  }, req.user)
  ok(res, { id: ret.insertId, apply_no: applyNo }, saveDraft ? '草稿已保存' : '提交成功')
}))

// PUT /:id — 修改（仅草稿/已驳回可改）
router.put('/:id', requirePerm('apply:create'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const a = await loadApply(id)
  const st = Number(a.status)
  if (st !== 0 && st !== 60) throw new ApiError('仅草稿或已驳回的申请可修改', 400)
  const b = req.body
  await flowMaintApply.update(id, {
    computer_id: b.computer_id !== undefined ? toInt(b.computer_id) : undefined,
    apply_type: b.apply_type !== undefined ? toInt(b.apply_type) : undefined,
    software_id: b.software_id !== undefined ? toInt(b.software_id) : undefined,
    software_name: b.software_name, version: b.version,
    upgrade_from: b.upgrade_from, upgrade_to: b.upgrade_to, reason: b.reason
  }, req.user)
  ok(res, null, '修改成功')
}))

// PUT /:id/submit — 草稿/驳回单提交（0或60 → 10）
router.put('/:id/submit', requirePerm('apply:create'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const a = await loadApply(id)
  const st = Number(a.status)
  if (st !== 0 && st !== 60) throw new ApiError('仅草稿或已驳回的申请可提交', 400)
  await flowMaintApply.update(id, { status: 10, current_node: NODE_TEXT[10], apply_time: nowStr() }, req.user)
  ok(res, null, '提交成功，待部门负责人审核')
}))

// PUT /:id/approve — 审批（FR-08-02）：10 部门负责人审本部门 / 20 信息化审批，任一节点可驳回
router.put('/:id/approve', asyncH(async (req, res) => {
  requireFields(req.body, ['action'])
  const id = toInt(req.params.id)
  const a = await loadApply(id)
  const st = Number(a.status)
  const approve = req.body.action === 'approve'
  if (!approve && req.body.action !== 'reject') throw new ApiError('action 必须为 approve 或 reject', 400)
  const perms = req.user.perms || []
  if (st === 10) {
    if (!isAdmin(req.user) && !(perms.includes('apply:approve1') && Number(req.user.dept_id) === Number(a.dept_id))) {
      throw new ApiError('仅申请部门负责人可审批', 403)
    }
  } else if (st === 20) {
    if (!isAdmin(req.user) && !perms.includes('apply:approve2')) throw new ApiError('无信息化审批权限', 403)
  } else {
    throw new ApiError('当前状态不允许审批', 400)
  }
  await tx(async () => {
    await flowApproval.insert({
      apply_id: id, node: st === 10 ? NODE_TEXT[10] : NODE_TEXT[20], approver_id: req.user.id,
      result: approve ? 1 : 2, opinion: req.body.opinion, approve_time: nowStr()
    }, req.user)
    const next = approve ? (st === 10 ? 20 : 30) : 60
    await flowMaintApply.update(id, { status: next, current_node: NODE_TEXT[next] }, req.user)
  })
  ok(res, null, approve ? '审批通过' : '已驳回')
}))

// PUT /:id/execute — 执行安装维护（30 → 40，FR-08-03），生成确认单
router.put('/:id/execute', requirePerm('apply:execute'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const a = await loadApply(id)
  if (Number(a.status) !== 30) throw new ApiError('当前状态不允许执行', 400)
  await tx(async () => {
    await flowConfirm.insert({
      apply_id: id, computer_id: a.computer_id, op_type: a.apply_type, result: 1,
      operator_sign: req.user.real_name, operator_sign_time: nowStr()
    }, req.user)
    await flowMaintApply.update(id, { status: 40, current_node: NODE_TEXT[40] }, req.user)
  })
  ok(res, null, '执行完成，待使用人确认')
}))

/** 软件ID 解析：software_id=0 时按名称匹配软件资产库（FR-08-05） */
async function resolveSoftwareId(a) {
  if (Number(a.software_id) > 0) return Number(a.software_id)
  // 软件名称匹配为三态查询（平台通用层 ∨ 查看者自有层）
  const rows = await asset.softwareByName({ name: a.software_name })
  return rows.length ? Number(rows[0].id) : 0
}

/** 台账写回（FR-08-05）：安装/卸载/升级 → 安装明细变更 + 维护日志留痕（须在 tx 内调用） */
async function writeBackLedger(a, user) {
  const sid = await resolveSoftwareId(a)
  const baseLog = { computer_id: a.computer_id, software_id: sid, apply_id: a.id, operator_id: user.id, op_date: nowStr() }
  const applyType = Number(a.apply_type)
  if (applyType === 1) {
    let licenseTerm = ''
    if (sid) {
      const ents = await purEntitlement.listAll({ software_id: sid })
      licenseTerm = (ents[0] && ents[0].license_term) || ''
    }
    const computer = await oneOf(assetComputer, Number(a.computer_id))
    await assetInstallRecord.insert({
      computer_id: a.computer_id, software_id: sid, dept_id: a.dept_id, user_id: computer ? computer.user_id : 0,
      version: a.version, license_term: licenseTerm, install_date: todayStr(), install_source: '个人申请'
    }, user)
    await assetMaintLog.insert({ ...baseLog, op_type: 1, reason: '安装申请 ' + a.apply_no }, user)
  } else if (applyType === 2) {
    const recs = sid ? await assetInstallRecord.listAll({ computer_id: a.computer_id, software_id: sid }) : []
    if (recs.length) await assetInstallRecord.remove(Number(recs[0].id), user)
    await assetMaintLog.insert({ ...baseLog, op_type: 2, reason: '卸载申请 ' + a.apply_no + (recs.length ? '' : '（未找到原安装记录）') }, user)
  } else if (applyType === 3) {
    const recs = sid ? await assetInstallRecord.listAll({ computer_id: a.computer_id, software_id: sid }) : []
    if (recs.length) await assetInstallRecord.update(Number(recs[0].id), { version: a.upgrade_to || recs[0].version }, user)
    await assetMaintLog.insert({ ...baseLog, op_type: 3, reason: '升级前卸载旧版本：' + (a.upgrade_from || (recs[0] && recs[0].version) || '') }, user)
    await assetMaintLog.insert({ ...baseLog, op_type: 4, reason: '升级后安装新版本：' + (a.upgrade_to || a.version || '') }, user)
  }
}

// PUT /:id/confirm — 使用人电子签名确认（40 → 50，FR-08-04/05），tx 内写回台账
router.put('/:id/confirm', requirePerm('apply:confirm'), asyncH(async (req, res) => {
  requireFields(req.body, ['userSign'])
  const id = toInt(req.params.id)
  const a = await loadApply(id)
  if (Number(a.status) !== 40) throw new ApiError('当前状态不允许确认', 400)
  const computer = await oneOf(assetComputer, Number(a.computer_id))
  if (!isAdmin(req.user) && (!computer || Number(computer.user_id) !== Number(req.user.id))) {
    throw new ApiError('仅该计算机使用人可确认', 403)
  }
  await tx(async () => {
    const crows = await flowConfirm.list({ apply_id: id }, { pageSize: 1 })
    if (crows.length) {
      await flowConfirm.update(Number(crows[0].id), { user_sign: req.body.userSign, user_sign_time: nowStr() }, req.user)
    }
    await writeBackLedger(a, req.user)
    await flowMaintApply.update(id, { status: 50, current_node: NODE_TEXT[50], finish_time: nowStr() }, req.user)
  })
  ok(res, null, '确认完成，流程已办结并写回台账')
}))

// GET /:id — 详情（主记录 + 审批轨迹 + 确认单 + 维护日志）
router.get('/:id', requirePerm('apply:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const a = await loadApply(id)
  const [approvals, confirms, logs, computer, applicant] = await Promise.all([
    flowApproval.listAll({ apply_id: id }), flowConfirm.list({ apply_id: id }, { pageSize: 1 }),
    assetMaintLog.listAll({ apply_id: id }), oneOf(assetComputer, a.computer_id),
    oneOf(sysUser, a.applicant_id)
  ])
  a.computer_no = computer ? computer.computer_no : ''
  a.applicant_name = applicant ? applicant.real_name : ''
  ok(res, { apply: a, approvals, confirm: confirms[0] || null, maintLogs: logs })
}))

// DELETE /:id — 删除（仅草稿）
router.delete('/:id', requirePerm('apply:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const a = await loadApply(id)
  if (Number(a.status) !== 0) throw new ApiError('仅草稿可删除', 400)
  await flowMaintApply.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
