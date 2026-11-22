/** 计算机台账接口（一机一档，FR-03） */
import { Router } from 'express'
import { assetComputer, assetCheckoutLog, sysOrg, sysDept, sysUser } from '../db/dao/index.js'
import { asset } from '../db/queries/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm, scopeFilters } from '../middleware/rbac.js'
import { genComputerNo } from '../utils/noGen.js'
import { nowStr } from '../db/util.js'
import { tx } from '../db/index.js'
import QRCode from 'qrcode'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/computers — 分页列表（computer:view + 数据权限）
router.get('/', requirePerm('computer:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const scope = scopeFilters(req.user, { org: 'orgId', dept: 'deptId', user: 'userId' })
  const f = { ...scope, kw: req.query.kw }
  if (req.query.orgId) f.orgId = toInt(req.query.orgId)
  if (req.query.deptId) f.deptId = toInt(req.query.deptId)
  if (req.query.computerType) f.computerType = toInt(req.query.computerType)
  if (req.query.status) f.status = toInt(req.query.status)
  const [list, total] = await Promise.all([
    asset.computerRows(f, { page, pageSize }),
    asset.computerCount(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/computers/options — 下拉选项（编号/名称，数据权限内）
router.get('/options', requirePerm('computer:view'), asyncH(async (req, res) => {
  const scope = scopeFilters(req.user, { org: 'orgId', dept: 'deptId', user: 'userId' })
  const list = await asset.computerRows(scope, { page: 1, pageSize: 200 })
  ok(res, list.map((c) => ({ id: c.id, computer_no: c.computer_no, brand: c.brand })))
}))

// GET /api/computers/:id — 详情（基本信息 + 已装软件 + 维护历史）
router.get('/:id', requirePerm('computer:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const c = await oneOf(assetComputer, id)
  if (!c) throw new ApiError('计算机不存在', 404)
  const [installed, logs] = await Promise.all([
    asset.computerInstalled({ computerId: id }),
    asset.computerMaintLogs({ computerId: id })
  ])
  const orgRow = c.org_id ? await oneOf(sysOrg, Number(c.org_id)) : null
  const deptRow = c.dept_id ? await oneOf(sysDept, Number(c.dept_id)) : null
  const userRow = c.user_id ? await oneOf(sysUser, Number(c.user_id)) : null
  c.org_name = orgRow ? orgRow.org_name : ''
  c.dept_name = deptRow ? deptRow.dept_name : ''
  c.user_name = userRow ? userRow.real_name : ''
  ok(res, { computer: c, installed, logs })
}))

// POST /api/computers — 新增（编号自动生成或手工录入，FR-03-02）
router.post('/', requirePerm('computer:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['computer_type', 'org_id', 'dept_id'])
  let no = String(req.body.computer_no || '').trim()
  if (no) {
    const exist = await assetComputer.list({ computer_no: no }, { pageSize: 1 })
    if (exist.length) throw new ApiError('计算机编号已存在: ' + no, 400)
  } else {
    const orgRow = await oneOf(sysOrg, Number(req.body.org_id))
    no = await genComputerNo(orgRow ? orgRow.org_code : 'HQ')
  }
  const ret = await assetComputer.insert({
    computer_no: no,
    asset_no: req.body.asset_no,
    brand: req.body.brand,
    model: req.body.model,
    sn: req.body.sn,
    computer_type: toInt(req.body.computer_type),
    org_id: toInt(req.body.org_id),
    dept_id: toInt(req.body.dept_id),
    user_id: toInt(req.body.user_id),
    location: req.body.location,
    enable_date: req.body.enable_date,
    purchase_date: req.body.purchase_date,
    report_time: req.body.report_time || nowStr(),
    status: toInt(req.body.status || 1),
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId, computer_no: no }, '新增成功')
}))

// PUT /api/computers/:id — 修改
router.put('/:id', requirePerm('computer:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const c = await oneOf(assetComputer, id)
  if (!c) throw new ApiError('计算机不存在', 404)
  await assetComputer.update(id, {
    asset_no: req.body.asset_no,
    brand: req.body.brand,
    model: req.body.model,
    sn: req.body.sn,
    computer_type: req.body.computer_type !== undefined ? toInt(req.body.computer_type) : undefined,
    org_id: req.body.org_id !== undefined ? toInt(req.body.org_id) : undefined,
    dept_id: req.body.dept_id !== undefined ? toInt(req.body.dept_id) : undefined,
    user_id: req.body.user_id !== undefined ? toInt(req.body.user_id) : undefined,
    location: req.body.location,
    enable_date: req.body.enable_date,
    purchase_date: req.body.purchase_date,
    report_time: req.body.report_time,
    status: req.body.status !== undefined ? toInt(req.body.status) : undefined,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '修改成功')
}))

// PUT /api/computers/:id/status — 状态变更（在用/闲置/报废）
router.put('/:id/status', requirePerm('computer:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  await assetComputer.update(id, { status: toInt(req.body.status) }, req.user)
  ok(res, null, '状态已更新')
}))

// DELETE /api/computers/:id — 逻辑删除
router.delete('/:id', requirePerm('computer:edit'), asyncH(async (req, res) => {
  await assetComputer.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

// GET /api/computers/:id/qrcode — 资产标签二维码（内容为档案页 URL，供打印贴标签）
router.get('/:id/qrcode', requirePerm('computer:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const c = await oneOf(assetComputer, id)
  if (!c) throw new ApiError('计算机不存在', 404)
  const origin = req.protocol + '://' + req.get('host')
  const url = origin + '/computers/' + id
  const dataUrl = await QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: '#1f2d3d' } })
  ok(res, { computer_no: c.computer_no, url, qrcode: dataUrl })
}))

// POST /api/computers/:id/checkout — 领用（分配使用人，资产生命周期）
router.post('/:id/checkout', requirePerm('computer:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  requireFields(req.body, ['user_id'])
  const c = await oneOf(assetComputer, id)
  if (!c) throw new ApiError('计算机不存在', 404)
  if (Number(c.status) === 3) throw new ApiError('报废资产不可领用', 400)
  const userId = toInt(req.body.user_id)
  const user = await oneOf(sysUser, userId)
  if (!user) throw new ApiError('领用人不存在', 404)
  await tx(async () => {
    await assetComputer.update(id, { user_id: userId, status: 1 }, req.user)
    await assetCheckoutLog.insert({
      computer_id: id, user_id: userId, action: 1,
      action_time: nowStr(), operator_id: req.user.id,
      remark: req.body.remark || '领用'
    }, req.user)
  })
  ok(res, null, '已领用给 ' + user.real_name)
}))

// POST /api/computers/:id/checkin — 归还（清空使用人，资产生命周期）
router.post('/:id/checkin', requirePerm('computer:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const c = await oneOf(assetComputer, id)
  if (!c) throw new ApiError('计算机不存在', 404)
  if (!c.user_id) throw new ApiError('该资产当前未分配使用人', 400)
  await tx(async () => {
    await assetComputer.update(id, { user_id: 0 }, req.user)
    await assetCheckoutLog.insert({
      computer_id: id, user_id: toInt(c.user_id), action: 2,
      action_time: nowStr(), operator_id: req.user.id,
      remark: req.body.remark || '归还入库'
    }, req.user)
  })
  ok(res, null, '已归还入库')
}))

// GET /api/computers/:id/checkout-logs — 领用/归还历史
router.get('/:id/checkout-logs', requirePerm('computer:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const list = await assetCheckoutLog.listAll({ computer_id: id })
  const enriched = []
  for (const l of list) {
    const u = l.user_id ? await oneOf(sysUser, Number(l.user_id)) : null
    const op = l.operator_id ? await oneOf(sysUser, Number(l.operator_id)) : null
    enriched.push({ ...l, user_name: u ? u.real_name : '-', operator_name: op ? op.real_name : '-' })
  }
  ok(res, enriched)
}))

export default router
