/** 部门管理接口（FR-02-02：部门维护） */
import { Router } from 'express'
import { sysDept } from '../db/dao/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/depts — 分页列表（关键字/单位过滤）
router.get('/', requirePerm('dept:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { _kw: req.query.kw }
  if (req.query.orgId) f.org_id = toInt(req.query.orgId)
  const [list, total] = await Promise.all([
    sysDept.list(f, { page, pageSize }),
    sysDept.count(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/depts/tree?orgId= — 部门树（按 parent_id 组装，可限定单位）
router.get('/tree', requirePerm('dept:view'), asyncH(async (req, res) => {
  const f = {}
  if (req.query.orgId) f.org_id = toInt(req.query.orgId)
  const rows = await sysDept.listAll(f)
  const nodes = rows.map((r) => ({ ...r, children: [] }))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const roots = []
  for (const n of nodes) {
    const p = byId.get(n.parent_id)
    if (p && p !== n) p.children.push(n)
    else roots.push(n)
  }
  ok(res, roots)
}))

// POST /api/depts — 新增部门（单位/名称必填）
router.post('/', requirePerm('dept:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['org_id', 'dept_name'])
  const ret = await sysDept.insert({
    org_id: toInt(req.body.org_id),
    parent_id: toInt(req.body.parent_id || 0),
    dept_name: String(req.body.dept_name),
    dept_code: req.body.dept_code,
    sort_no: toInt(req.body.sort_no || 0),
    status: req.body.status !== undefined ? toInt(req.body.status) : 1
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/depts/:id — 修改部门
router.put('/:id', requirePerm('dept:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(sysDept, id)
  if (!row) throw new ApiError('部门不存在', 404)
  if (req.body.parent_id !== undefined && toInt(req.body.parent_id) === id) {
    throw new ApiError('上级部门不能是自身', 400)
  }
  await sysDept.update(id, {
    org_id: req.body.org_id !== undefined ? toInt(req.body.org_id) : undefined,
    parent_id: req.body.parent_id !== undefined ? toInt(req.body.parent_id) : undefined,
    dept_name: req.body.dept_name,
    dept_code: req.body.dept_code,
    sort_no: req.body.sort_no !== undefined ? toInt(req.body.sort_no) : undefined,
    status: req.body.status !== undefined ? toInt(req.body.status) : undefined
  }, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/depts/:id — 逻辑删除（存在下级部门时拒绝）
router.delete('/:id', requirePerm('dept:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(sysDept, id)
  if (!row) throw new ApiError('部门不存在', 404)
  const children = await sysDept.count({ parent_id: id })
  if (children > 0) throw new ApiError('存在下级部门，不允许删除', 400)
  await sysDept.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
