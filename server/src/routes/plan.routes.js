/** 采购计划接口（FR-06-02，附件4） */
import { Router } from 'express'
import { purPlan } from '../db/dao/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { genPlanNo } from '../utils/noGen.js'
import { nowStr } from '../db/util.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

/** 明细 items 归一化：数组→JSON 字符串；并按 amount 累加计算总金额 */
function normItems(v) {
  if (v === undefined || v === null || v === '') return { json: undefined, total: undefined }
  let arr = v
  if (!Array.isArray(arr)) {
    try {
      arr = JSON.parse(String(arr))
    } catch (ignore) {
      throw new ApiError('items 必须是明细数组', 400)
    }
  }
  if (!Array.isArray(arr)) throw new ApiError('items 必须是明细数组', 400)
  let total = 0
  for (const it of arr) {
    total += Number(it.amount !== undefined ? it.amount : it.total_amount) || 0
  }
  return { json: JSON.stringify(arr), total }
}

// GET /api/plans — 分页列表（kw/status/year）
router.get('/', requirePerm('plan:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { _kw: req.query.kw }
  if (req.query.status) f.status = toInt(req.query.status)
  if (req.query.year) f.year = String(req.query.year)
  const [list, total] = await Promise.all([
    purPlan.list(f, { page, pageSize }),
    purPlan.count(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/plans/:id — 详情（items 解析为数组）
router.get('/:id', requirePerm('plan:view'), asyncH(async (req, res) => {
  const p = await oneOf(purPlan, toInt(req.params.id))
  if (!p) throw new ApiError('采购计划不存在', 404)
  let items = []
  try {
    items = JSON.parse(p.items || '[]')
  } catch (ignore) {
    items = []
  }
  ok(res, { ...p, items })
}))

// POST /api/plans — 新增（计划编号自动生成，总金额按明细累加）
router.post('/', requirePerm('plan:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['title', 'year'])
  const { json, total } = normItems(req.body.items)
  const planNo = await genPlanNo()
  const ret = await purPlan.insert({
    plan_no: planNo,
    title: req.body.title,
    year: String(req.body.year),
    dept_id: req.user.dept_id || 0,
    applicant_id: req.user.id || 0,
    items: json,
    total_amount: total || 0,
    status: 0,
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId, plan_no: planNo }, '新增成功')
}))

// PUT /api/plans/:id — 修改（items 更新时重算总金额；仅草稿/驳回可改）
router.put('/:id', requirePerm('plan:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const p = await oneOf(purPlan, id)
  if (!p) throw new ApiError('采购计划不存在', 404)
  if (Number(p.status) !== 0 && Number(p.status) !== 3) {
    throw new ApiError('仅草稿或驳回状态的计划可修改', 400)
  }
  const data = {}
  if (req.body.title !== undefined) data.title = req.body.title
  if (req.body.year !== undefined) data.year = String(req.body.year)
  if (req.body.remark !== undefined) data.remark = req.body.remark
  if (req.body.items !== undefined) {
    const { json, total } = normItems(req.body.items)
    data.items = json
    data.total_amount = total || 0
  } else if (req.body.total_amount !== undefined) {
    data.total_amount = req.body.total_amount
  }
  // 状态流转：仅允许 草稿(0)/提交审核(1)；驳回件改后可重新提交
  if (req.body.status !== undefined) {
    const st = toInt(req.body.status)
    if (st !== 0 && st !== 1) throw new ApiError('状态只允许改为草稿(0)或提交审核(1)', 400)
    data.status = st
  }
  await purPlan.update(id, data, req.user)
  ok(res, null, '修改成功')
}))

// PUT /api/plans/:id/audit — 审核（待审核1→通过2/驳回3，FR-06-02）
router.put('/:id/audit', requirePerm('plan:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const p = await oneOf(purPlan, id)
  if (!p) throw new ApiError('采购计划不存在', 404)
  if (Number(p.status) !== 1) throw new ApiError('仅待审核状态的计划可审核', 400)
  const status = toInt(req.body.status)
  if (status !== 2 && status !== 3) throw new ApiError('审核结果只能为通过(2)或驳回(3)', 400)
  await purPlan.update(id, {
    status,
    audit_opinion: req.body.audit_opinion,
    audit_by: req.user.id || 0,
    audit_time: nowStr()
  }, req.user)
  ok(res, null, status === 2 ? '审核通过' : '已驳回')
}))

// DELETE /api/plans/:id — 逻辑删除（仅草稿/驳回可删）
router.delete('/:id', requirePerm('plan:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const p = await oneOf(purPlan, id)
  if (!p) throw new ApiError('采购计划不存在', 404)
  if (Number(p.status) !== 0 && Number(p.status) !== 3) {
    throw new ApiError('仅草稿或驳回状态的计划可删除', 400)
  }
  await purPlan.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
