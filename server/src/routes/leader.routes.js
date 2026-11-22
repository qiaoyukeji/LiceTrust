/** 领导小组成员接口（FR-02-03，附件1：正版软件工作领导小组成员名单） */
import { Router } from 'express'
import { baseLeader } from '../db/dao/index.js'
import { ok, ApiError, asyncH, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/leaders — 全量成员列表（按 sort_no 升序展示）
router.get('/', requirePerm('leader:view'), asyncH(async (req, res) => {
  const rows = await baseLeader.listAll({ _kw: req.query.kw })
  rows.sort((a, b) => (Number(a.sort_no) || 0) - (Number(b.sort_no) || 0))
  ok(res, rows)
}))

// POST /api/leaders — 新增成员
router.post('/', requirePerm('leader:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['name'])
  const ret = await baseLeader.insert({
    division: req.body.division,
    dept: req.body.dept,
    position: req.body.position,
    name: String(req.body.name),
    phone: req.body.phone,
    fax: req.body.fax,
    sort_no: toInt(req.body.sort_no || 0),
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/leaders/:id — 修改成员
router.put('/:id', requirePerm('leader:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(baseLeader, id)
  if (!row) throw new ApiError('领导小组成员不存在', 404)
  await baseLeader.update(id, {
    division: req.body.division,
    dept: req.body.dept,
    position: req.body.position,
    name: req.body.name !== undefined ? String(req.body.name) : undefined,
    phone: req.body.phone,
    fax: req.body.fax,
    sort_no: req.body.sort_no !== undefined ? toInt(req.body.sort_no) : undefined,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/leaders/:id — 逻辑删除
router.delete('/:id', requirePerm('leader:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(baseLeader, id)
  if (!row) throw new ApiError('领导小组成员不存在', 404)
  await baseLeader.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
