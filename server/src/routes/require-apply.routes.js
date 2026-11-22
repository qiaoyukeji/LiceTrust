/** 需求申请接口（FR-06-01，附件3） */
import { Router } from 'express'
import { purRequireApply } from '../db/dao/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm, scopeFilters } from '../middleware/rbac.js'
import { genRequireNo } from '../utils/noGen.js'
import { nowStr } from '../db/util.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/require-applies — 分页列表（kw/status/softwareCategory + 数据权限）
router.get('/', requirePerm('require:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  // 数据权限映射：dept→dept_id，user→applicant_id（FR-15-02）
  const scope = scopeFilters(req.user, { dept: 'dept_id', user: 'applicant_id' })
  const f = { ...scope, _kw: req.query.kw }
  if (req.query.status) f.status = toInt(req.query.status)
  if (req.query.softwareCategory) f.software_category = toInt(req.query.softwareCategory)
  const [list, total] = await Promise.all([
    purRequireApply.list(f, { page, pageSize }),
    purRequireApply.count(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/require-applies/:id — 详情
router.get('/:id', requirePerm('require:view'), asyncH(async (req, res) => {
  const r = await oneOf(purRequireApply, toInt(req.params.id))
  if (!r) throw new ApiError('需求申请不存在', 404)
  ok(res, r)
}))

// POST /api/require-applies — 提交申请（部门/申请人自动取当前用户，编号自动生成）
router.post('/', requirePerm('require:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['software_name', 'software_category'])
  const applyNo = await genRequireNo()
  const ret = await purRequireApply.insert({
    apply_no: applyNo,
    dept_id: req.user.dept_id || 0,
    applicant_id: req.user.id || 0,
    apply_time: nowStr(),
    software_category: toInt(req.body.software_category),
    software_name: req.body.software_name,
    software_use: req.body.software_use,
    function_req: req.body.function_req,
    apply_qty: req.body.apply_qty !== undefined ? toInt(req.body.apply_qty) : undefined,
    status: 0,
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId, apply_no: applyNo }, '申请提交成功')
}))

// PUT /api/require-applies/:id — 修改（仅草稿0/驳回3可改）
router.put('/:id', requirePerm('require:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const r = await oneOf(purRequireApply, id)
  if (!r) throw new ApiError('需求申请不存在', 404)
  if (Number(r.status) !== 0 && Number(r.status) !== 3) {
    throw new ApiError('仅草稿或驳回状态的申请可修改', 400)
  }
  const data = {}
  if (req.body.software_category !== undefined) data.software_category = toInt(req.body.software_category)
  if (req.body.software_name !== undefined) data.software_name = req.body.software_name
  if (req.body.software_use !== undefined) data.software_use = req.body.software_use
  if (req.body.function_req !== undefined) data.function_req = req.body.function_req
  if (req.body.apply_qty !== undefined) data.apply_qty = toInt(req.body.apply_qty)
  if (req.body.remark !== undefined) data.remark = req.body.remark
  // 状态流转：仅允许 草稿(0)/提交审核(1)；驳回件改后可重新提交
  if (req.body.status !== undefined) {
    const st = toInt(req.body.status)
    if (st !== 0 && st !== 1) throw new ApiError('状态只允许改为草稿(0)或提交审核(1)', 400)
    data.status = st
  }
  await purRequireApply.update(id, data, req.user)
  ok(res, null, '修改成功')
}))

// PUT /api/require-applies/:id/audit — 审核（待审核1→通过2/驳回3，FR-06-01）
router.put('/:id/audit', requirePerm('require:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const r = await oneOf(purRequireApply, id)
  if (!r) throw new ApiError('需求申请不存在', 404)
  if (Number(r.status) !== 1) throw new ApiError('仅待审核状态的申请可审核', 400)
  const status = toInt(req.body.status)
  if (status !== 2 && status !== 3) throw new ApiError('审核结果只能为通过(2)或驳回(3)', 400)
  await purRequireApply.update(id, {
    status,
    audit_opinion: req.body.audit_opinion,
    audit_by: req.user.id || 0,
    audit_time: nowStr()
  }, req.user)
  ok(res, null, status === 2 ? '审核通过' : '已驳回')
}))

// DELETE /api/require-applies/:id — 逻辑删除（仅草稿可删）
router.delete('/:id', requirePerm('require:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const r = await oneOf(purRequireApply, id)
  if (!r) throw new ApiError('需求申请不存在', 404)
  if (Number(r.status) !== 0) throw new ApiError('仅草稿状态的申请可删除', 400)
  await purRequireApply.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
