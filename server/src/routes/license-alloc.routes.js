/** 许可分配接口（FR-07-04：授权许可分配到部门/人员，总量不超许可数） */
import { Router } from 'express'
import { purLicenseAlloc, purEntitlement } from '../db/dao/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

/** 校验分配总数不超许可数量（FR-07-04） */
async function checkQuota(entitlementId, newQty, excludeId) {
  const ent = await oneOf(purEntitlement, entitlementId)
  if (!ent) throw new ApiError('授权记录不存在', 400)
  const allocs = await purLicenseAlloc.listAll({ entitlement_id: entitlementId })
  let sum = 0
  for (const a of allocs) {
    if (excludeId && Number(a.id) === Number(excludeId)) continue
    sum += Number(a.qty) || 0
  }
  if (sum + (Number(newQty) || 0) > (Number(ent.license_qty) || 0)) {
    throw new ApiError('分配总数超过许可数量', 400)
  }
  return ent
}

// GET /api/license-allocs — 分页列表（可按 entitlement_id 过滤）
router.get('/', requirePerm('alloc:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = {}
  if (req.query.entitlementId) f.entitlement_id = toInt(req.query.entitlementId)
  const [list, total] = await Promise.all([
    purLicenseAlloc.list(f, { page, pageSize }),
    purLicenseAlloc.count(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// POST /api/license-allocs — 新增分配（校验总量不超许可数）
router.post('/', requirePerm('alloc:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['entitlement_id', 'target_type', 'target_id', 'qty'])
  const entitlementId = toInt(req.body.entitlement_id)
  const qty = toInt(req.body.qty)
  await checkQuota(entitlementId, qty, null)
  const ret = await purLicenseAlloc.insert({
    entitlement_id: entitlementId,
    target_type: toInt(req.body.target_type),
    target_id: toInt(req.body.target_id),
    target_name: req.body.target_name,
    qty,
    downgrade_flag: req.body.downgrade_flag !== undefined ? toInt(req.body.downgrade_flag) : undefined
  }, req.user)
  ok(res, { id: ret.insertId }, '分配成功')
}))

// PUT /api/license-allocs/:id — 修改（调整数量时重新校验配额，排除本条）
router.put('/:id', requirePerm('alloc:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const alloc = await oneOf(purLicenseAlloc, id)
  if (!alloc) throw new ApiError('分配记录不存在', 404)
  const data = {}
  if (req.body.target_type !== undefined) data.target_type = toInt(req.body.target_type)
  if (req.body.target_id !== undefined) data.target_id = toInt(req.body.target_id)
  if (req.body.target_name !== undefined) data.target_name = req.body.target_name
  if (req.body.downgrade_flag !== undefined) data.downgrade_flag = toInt(req.body.downgrade_flag)
  if (req.body.qty !== undefined) {
    const qty = toInt(req.body.qty)
    await checkQuota(alloc.entitlement_id, qty, id)
    data.qty = qty
  }
  await purLicenseAlloc.update(id, data, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/license-allocs/:id — 逻辑删除
router.delete('/:id', requirePerm('alloc:edit'), asyncH(async (req, res) => {
  await purLicenseAlloc.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

export default router
