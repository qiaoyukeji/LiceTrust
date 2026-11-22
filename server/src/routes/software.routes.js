/** 软件资产库接口（FR-05） */
import { Router } from 'express'
import { baseSoftware, purEntitlement, assetInstallRecord } from '../db/dao/index.js'
import { oneOfSoftware } from '../utils/one.js'
import { currentTenant } from '../db/tenantContext.js'
import { asset } from '../db/queries/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { genSoftwareNo } from '../utils/noGen.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/softwares — 分页列表（kw/category/softwareType/status，含 install_count/license_qty 对账列）
router.get('/', requirePerm('software:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { kw: req.query.kw }
  if (req.query.category) f.category = toInt(req.query.category)
  if (req.query.softwareType) f.softwareType = toInt(req.query.softwareType)
  if (req.query.status) f.status = toInt(req.query.status)
  const [list, total] = await Promise.all([
    asset.softwareRows(f, { page, pageSize }),
    asset.softwareCount(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/softwares/options — 下拉选项（两层：平台通用清单 ∨ 查看者自有软件，均为在用）
router.get('/options', requirePerm('software:view'), asyncH(async (req, res) => {
  const all = await asset.softwareOptions({})
  const list = all
    .filter((s) => Number(s.status) === 1)
    .map((s) => ({
      id: s.id,
      software_no: s.software_no,
      software_name: s.software_name,
      version: s.version,
      category: s.category,
      software_type: s.software_type
    }))
  ok(res, list)
}))

// GET /api/softwares/:id — 详情（三态：平台通用层 ∨ 查看者自有层）
router.get('/:id', requirePerm('software:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const s = await oneOfSoftware(id)
  if (!s) throw new ApiError('软件不存在', 404)
  const [entitlements, installCount] = await Promise.all([
    purEntitlement.listAll({ software_id: id }),
    assetInstallRecord.count({ software_id: id })
  ])
  ok(res, { software: s, entitlements, install_count: installCount })
}))

// POST /api/softwares — 新增（编号按附录A.3规则自动生成，FR-05-02）
router.post('/', requirePerm('software:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['software_name', 'category', 'software_type'])
  // 编号生成载荷：body 同名字段合并（商业软件采购要素任一不同则编号不同）
  const payload = {
    software_type: toInt(req.body.software_type),
    software_name: req.body.software_name,
    version: req.body.version,
    usable_version: req.body.usable_version,
    purchase_date: req.body.purchase_date,
    purchase_amount: req.body.purchase_amount,
    license_type: req.body.license_type,
    license_qty: req.body.license_qty,
    license_term: req.body.license_term
  }
  const no = await genSoftwareNo(payload)
  const ret = await baseSoftware.insert({
    software_no: no,
    software_name: req.body.software_name,
    version: req.body.version,
    usable_version: req.body.usable_version,
    category: toInt(req.body.category),
    software_type: toInt(req.body.software_type),
    vendor: req.body.vendor,
    source: req.body.source,
    status: toInt(req.body.status || 1),
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId, software_no: no }, '新增成功')
}))

// PUT /api/softwares/:id — 修改（三层可见性下，企业仅能改自有软件；平台通用软件由平台运营方维护）
router.put('/:id', requirePerm('software:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const s = await oneOfSoftware(id)
  if (!s) throw new ApiError('软件不存在', 404)
  await baseSoftware.update(id, {
    software_name: req.body.software_name,
    version: req.body.version,
    usable_version: req.body.usable_version,
    category: req.body.category !== undefined ? toInt(req.body.category) : undefined,
    software_type: req.body.software_type !== undefined ? toInt(req.body.software_type) : undefined,
    vendor: req.body.vendor,
    source: req.body.source,
    status: req.body.status !== undefined ? toInt(req.body.status) : undefined,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/softwares/:id — 逻辑删除
router.delete('/:id', requirePerm('software:edit'), asyncH(async (req, res) => {
  await baseSoftware.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

export default router
