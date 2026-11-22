/** 采购合同接口（FR-06-03） */
import { Router } from 'express'
import { purContract, baseSoftware } from '../db/dao/index.js'
import { oneOfSoftware } from '../utils/one.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

/** software_ids 归一化：数组→JSON 字符串存储 */
function normSoftwareIds(v) {
  if (v === undefined || v === null || v === '') return undefined
  if (Array.isArray(v)) return JSON.stringify(v.map((x) => toInt(x)))
  const s = String(v).trim()
  try {
    const arr = JSON.parse(s)
    if (Array.isArray(arr)) return JSON.stringify(arr.map((x) => toInt(x)))
  } catch (ignore) {
    // 非数组 JSON 视为非法
  }
  throw new ApiError('software_ids 必须是软件ID数组', 400)
}

// GET /api/contracts — 分页列表（kw 查合同号/名称/供应商，到期日区间）
router.get('/', requirePerm('contract:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { _kw: req.query.kw }
  if (req.query.expireDateFrom) f.expire_date_from = String(req.query.expireDateFrom)
  if (req.query.expireDateTo) f.expire_date_to = String(req.query.expireDateTo)
  const [list, total] = await Promise.all([
    purContract.list(f, { page, pageSize }),
    purContract.count(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/contracts/:id — 详情（含关联软件名列表）
router.get('/:id', requirePerm('contract:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const c = await oneOf(purContract, id)
  if (!c) throw new ApiError('合同不存在', 404)
  let ids = []
  try {
    ids = JSON.parse(c.software_ids || '[]')
  } catch (ignore) {
    ids = []
  }
  const softwares = []
  for (const sid of ids) {
    const s = await oneOfSoftware(sid)
    if (s) {
      softwares.push({ id: s.id, software_no: s.software_no, software_name: s.software_name, version: s.version })
    }
  }
  ok(res, { contract: c, softwares })
}))

// POST /api/contracts — 新增（合同号查重）
router.post('/', requirePerm('contract:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['contract_no', 'contract_name'])
  const no = String(req.body.contract_no).trim()
  const exist = await purContract.list({ contract_no: no }, { pageSize: 1 })
  if (exist.length) throw new ApiError('合同编号已存在: ' + no, 400)
  const ret = await purContract.insert({
    contract_no: no,
    contract_name: req.body.contract_name,
    supplier: req.body.supplier,
    sign_date: req.body.sign_date,
    effective_date: req.body.effective_date,
    expire_date: req.body.expire_date,
    amount: req.body.amount,
    file_url: req.body.file_url,
    software_ids: normSoftwareIds(req.body.software_ids),
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/contracts/:id — 修改（合同号查重排除自身）
router.put('/:id', requirePerm('contract:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const c = await oneOf(purContract, id)
  if (!c) throw new ApiError('合同不存在', 404)
  const data = {}
  if (req.body.contract_no !== undefined) {
    const no = String(req.body.contract_no).trim()
    if (no !== c.contract_no) {
      const exist = await purContract.list({ contract_no: no }, { pageSize: 1 })
      if (exist.length) throw new ApiError('合同编号已存在: ' + no, 400)
    }
    data.contract_no = no
  }
  if (req.body.software_ids !== undefined) data.software_ids = normSoftwareIds(req.body.software_ids)
  if (req.body.contract_name !== undefined) data.contract_name = req.body.contract_name
  if (req.body.supplier !== undefined) data.supplier = req.body.supplier
  if (req.body.sign_date !== undefined) data.sign_date = req.body.sign_date
  if (req.body.effective_date !== undefined) data.effective_date = req.body.effective_date
  if (req.body.expire_date !== undefined) data.expire_date = req.body.expire_date
  if (req.body.amount !== undefined) data.amount = req.body.amount
  if (req.body.file_url !== undefined) data.file_url = req.body.file_url
  if (req.body.remark !== undefined) data.remark = req.body.remark
  await purContract.update(id, data, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/contracts/:id — 逻辑删除
router.delete('/:id', requirePerm('contract:edit'), asyncH(async (req, res) => {
  await purContract.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

export default router
