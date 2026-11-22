/** 组织单位管理接口（FR-02-01：组织单位维护） */
import { Router } from 'express'
import { sysOrg, sysDept } from '../db/dao/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/orgs — 分页列表（树形展示数据源，支持关键字/层级/状态过滤）
router.get('/', requirePerm('org:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { _kw: req.query.kw }
  if (req.query.orgLevel) f.org_level = toInt(req.query.orgLevel)
  if (req.query.status) f.status = toInt(req.query.status)
  const [list, total] = await Promise.all([
    sysOrg.list(f, { page, pageSize }),
    sysOrg.count(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/orgs/tree — 全量单位树（listAll 后按 parent_id 组装）
router.get('/tree', requirePerm('org:view'), asyncH(async (req, res) => {
  const rows = await sysOrg.listAll({})
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

// POST /api/orgs — 新增单位（名称/编码/层级必填）
router.post('/', requirePerm('org:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['org_name', 'org_code', 'org_level'])
  const dup = await sysOrg.list({ org_code: String(req.body.org_code) }, { pageSize: 1 })
  if (dup && dup.length) throw new ApiError('单位编码已存在', 400)
  const ret = await sysOrg.insert({
    parent_id: toInt(req.body.parent_id || 0),
    org_name: String(req.body.org_name),
    org_code: String(req.body.org_code),
    org_level: toInt(req.body.org_level),
    sort_no: toInt(req.body.sort_no || 0),
    status: req.body.status !== undefined ? toInt(req.body.status) : 1,
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/orgs/:id — 修改单位
router.put('/:id', requirePerm('org:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(sysOrg, id)
  if (!row) throw new ApiError('组织单位不存在', 404)
  if (req.body.parent_id !== undefined && toInt(req.body.parent_id) === id) {
    throw new ApiError('上级单位不能是自身', 400)
  }
  await sysOrg.update(id, {
    parent_id: req.body.parent_id !== undefined ? toInt(req.body.parent_id) : undefined,
    org_name: req.body.org_name,
    org_code: req.body.org_code,
    org_level: req.body.org_level !== undefined ? toInt(req.body.org_level) : undefined,
    sort_no: req.body.sort_no !== undefined ? toInt(req.body.sort_no) : undefined,
    status: req.body.status !== undefined ? toInt(req.body.status) : undefined,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/orgs/:id — 逻辑删除（存在下级单位或下属部门时拒绝）
router.delete('/:id', requirePerm('org:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(sysOrg, id)
  if (!row) throw new ApiError('组织单位不存在', 404)
  const childOrgs = await sysOrg.count({ parent_id: id })
  if (childOrgs > 0) throw new ApiError('存在下级单位，不允许删除', 400)
  const deptCnt = await sysDept.count({ org_id: id })
  if (deptCnt > 0) throw new ApiError('单位下存在部门，不允许删除', 400)
  await sysOrg.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
