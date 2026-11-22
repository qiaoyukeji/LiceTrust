/** 免费软件清单接口（FR-05-04，附件6：免费软件使用登记） */
import { Router } from 'express'
import { baseFreeSoftware, baseSoftware } from '../db/dao/index.js'
import { oneOfSoftware } from '../utils/one.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

/** 软件清单 id -> 软件名称映射（用于 JOIN 补名展示） */
async function softwareNameMap() {
  const rows = await baseSoftware.listAll({})
  return new Map(rows.map((s) => [s.id, s.software_name]))
}

// GET /api/free-softwares — 分页列表（关键字/软件过滤，补软件名展示）
router.get('/', requirePerm('free:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { _kw: req.query.kw }
  if (req.query.softwareId) f.software_id = toInt(req.query.softwareId)
  const [list, total, nameMap] = await Promise.all([
    baseFreeSoftware.list(f, { page, pageSize }),
    baseFreeSoftware.count(f),
    softwareNameMap()
  ])
  for (const r of list) r.software_name = nameMap.get(r.software_id) || ''
  paged(res, list, total, page, pageSize)
}))

// POST /api/free-softwares — 新增登记（软件必填且须存在于软件台账）
router.post('/', requirePerm('free:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['software_id'])
  const sw = await oneOfSoftware(Number(req.body.software_id))
  if (!sw) throw new ApiError('所选软件不存在', 400)
  const ret = await baseFreeSoftware.insert({
    software_id: toInt(req.body.software_id),
    vendor: req.body.vendor,
    source: req.body.source,
    use_dept: req.body.use_dept,
    use_reason: req.body.use_reason,
    service_contact: req.body.service_contact
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/free-softwares/:id — 修改登记
router.put('/:id', requirePerm('free:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(baseFreeSoftware, id)
  if (!row) throw new ApiError('免费软件登记不存在', 404)
  if (req.body.software_id !== undefined) {
    const sw = await oneOfSoftware(Number(req.body.software_id))
    if (!sw) throw new ApiError('所选软件不存在', 400)
  }
  await baseFreeSoftware.update(id, {
    software_id: req.body.software_id !== undefined ? toInt(req.body.software_id) : undefined,
    vendor: req.body.vendor,
    source: req.body.source,
    use_dept: req.body.use_dept,
    use_reason: req.body.use_reason,
    service_contact: req.body.service_contact
  }, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/free-softwares/:id — 逻辑删除
router.delete('/:id', requirePerm('free:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(baseFreeSoftware, id)
  if (!row) throw new ApiError('免费软件登记不存在', 404)
  await baseFreeSoftware.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
