/** 数据字典接口（FR-15-04：两层字典——平台通用项 + 企业自有项） */
import { Router } from 'express'
import { sysDict } from '../db/dao/index.js'
import { system } from '../db/queries/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/dicts?dictType= — 管理列表：平台上下文返回全部（含企业自有，可标注来源）；企业上下文返回 通用∨自有
router.get('/', requirePerm('dict:view'), asyncH(async (req, res) => {
  if (!req.query.dictType) throw new ApiError('缺少 dictType 参数', 400)
  const { page, pageSize } = pageInfo(req)
  const items = await system.dictItems({ type: String(req.query.dictType) })
  let list = items
  const kw = String(req.query.kw || '').trim()
  if (kw) list = list.filter((d) => (d.dict_label || '').includes(kw) || (d.dict_value || '').includes(kw))
  if (req.query.status !== undefined && req.query.status !== '') {
    list = list.filter((d) => Number(d.status) === toInt(req.query.status))
  }
  const total = list.length
  const start = (page - 1) * pageSize
  const rows = list.slice(start, start + pageSize).map((d) => ({
    ...d,
    scope: Number(d.tenant_id) === 0 ? '平台通用' : '企业自有'
  }))
  paged(res, rows, total, page, pageSize)
}))

// POST /api/dicts — 新增字典项（平台账号→平台通用项；企业账号→本企业自有项）
router.post('/', requirePerm('dict:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['dict_type', 'dict_label', 'dict_value'])
  const ret = await sysDict.insert({
    dict_type: String(req.body.dict_type),
    dict_label: String(req.body.dict_label),
    dict_value: String(req.body.dict_value),
    sort_no: toInt(req.body.sort_no || 0),
    status: req.body.status !== undefined ? toInt(req.body.status) : 1,
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/dicts/:id — 修改字典项（企业上下文仅能改本企业自有项；平台通用项由平台运营方维护）
router.put('/:id', requirePerm('dict:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(sysDict, id)
  if (!row) throw new ApiError('字典项不存在', 404)
  const ret = await sysDict.update(id, {
    dict_type: req.body.dict_type !== undefined ? String(req.body.dict_type) : undefined,
    dict_label: req.body.dict_label !== undefined ? String(req.body.dict_label) : undefined,
    dict_value: req.body.dict_value !== undefined ? String(req.body.dict_value) : undefined,
    sort_no: req.body.sort_no !== undefined ? toInt(req.body.sort_no) : undefined,
    status: req.body.status !== undefined ? toInt(req.body.status) : undefined,
    remark: req.body.remark
  }, req.user)
  if (!ret.changes) throw new ApiError('平台通用字典项请联系平台运营方修改', 403)
  ok(res, null, '修改成功')
}))

// DELETE /api/dicts/:id — 逻辑删除（企业上下文仅能删除本企业自有项）
router.delete('/:id', requirePerm('dict:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const ret = await sysDict.remove(id, req.user)
  if (!ret.changes) throw new ApiError('平台通用字典项请联系平台运营方删除', 403)
  ok(res, null, '删除成功')
}))

// GET /api/dicts/:type — 按 type 取启用项（下拉合并：平台通用 ∨ 本企业自有；放在具体路由之后避免路径冲突）
router.get('/:type', requirePerm('dict:view'), asyncH(async (req, res) => {
  const rows = await system.dictItems({ type: String(req.params.type) })
  ok(res, rows.filter((d) => Number(d.status) === 1))
}))

export default router
