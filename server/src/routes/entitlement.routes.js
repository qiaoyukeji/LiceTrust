/** 授权管理接口（FR-07，含对账与二次认证查看明文 FR-07-05/07） */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { purEntitlement, baseSoftware, sysUser } from '../db/dao/index.js'
import { oneOfSoftware } from '../utils/one.js'
import { pur } from '../db/queries/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { aesEncrypt, aesDecrypt, maskSecret } from '../utils/crypto.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

/** 敏感字段脱敏出库（FR-07-06） */
function maskRow(row) {
  return { ...row, serial_no: maskSecret(row.serial_no), activation_code: maskSecret(row.activation_code) }
}

/** 许可对账状态（FR-07-05）：超装 over / 闲置 idle / 正常 ok */
function complianceOf(row) {
  const qty = Number(row.license_qty) || 0
  const used = Number(row.install_count) || 0
  if (qty > 0 && used > qty) return 'over'
  if (qty > 0 && used < qty * 0.5) return 'idle'
  return 'ok'
}

// GET /api/entitlements — 分页列表（kw/softwareId/authType/expireBefore，含对账数据）
router.get('/', requirePerm('entitlement:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { kw: req.query.kw }
  if (req.query.softwareId) f.softwareId = toInt(req.query.softwareId)
  if (req.query.authType) f.authType = toInt(req.query.authType)
  if (req.query.expireBefore) f.expireBefore = String(req.query.expireBefore)
  const [list, total] = await Promise.all([
    pur.entitlementRows(f, { page, pageSize }),
    pur.entitlementCount(f)
  ])
  paged(res, list.map((r) => ({ ...maskRow(r), compliance: complianceOf(r) })), total, page, pageSize)
}))

// GET /api/entitlements/:id — 详情（敏感字段脱敏）
router.get('/:id', requirePerm('entitlement:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const e = await oneOf(purEntitlement, id)
  if (!e) throw new ApiError('授权记录不存在', 404)
  const s = e.software_id ? await oneOfSoftware(e.software_id) : null
  const row = maskRow(e)
  row.software_name = s ? s.software_name : ''
  ok(res, row)
}))

// POST /api/entitlements — 新增（序列号/激活码 AES 加密入库）
router.post('/', requirePerm('entitlement:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['software_id'])
  const sw = await oneOfSoftware(toInt(req.body.software_id))
  if (!sw) throw new ApiError('软件不存在', 400)
  const ret = await purEntitlement.insert({
    software_id: toInt(req.body.software_id),
    contract_id: toInt(req.body.contract_id),
    auth_type: req.body.auth_type,
    license_type: req.body.license_type,
    license_qty: req.body.license_qty !== undefined ? toInt(req.body.license_qty) : undefined,
    purchase_date: req.body.purchase_date,
    purchase_amount: req.body.purchase_amount,
    purchase_method: toInt(req.body.purchase_method),
    usable_version: req.body.usable_version,
    license_term: req.body.license_term,
    expire_date: req.body.expire_date,
    serial_no: aesEncrypt(req.body.serial_no),
    activation_code: aesEncrypt(req.body.activation_code),
    auth_file_url: req.body.auth_file_url,
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/entitlements/:id — 修改（明文序列号/激活码重新加密；空串跳过）
router.put('/:id', requirePerm('entitlement:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const e = await oneOf(purEntitlement, id)
  if (!e) throw new ApiError('授权记录不存在', 404)
  const data = {}
  if (req.body.software_id !== undefined) data.software_id = toInt(req.body.software_id)
  if (req.body.contract_id !== undefined) data.contract_id = toInt(req.body.contract_id)
  if (req.body.auth_type !== undefined) data.auth_type = req.body.auth_type
  if (req.body.license_type !== undefined) data.license_type = req.body.license_type
  if (req.body.license_qty !== undefined) data.license_qty = toInt(req.body.license_qty)
  if (req.body.purchase_date !== undefined) data.purchase_date = req.body.purchase_date
  if (req.body.purchase_amount !== undefined) data.purchase_amount = req.body.purchase_amount
  if (req.body.purchase_method !== undefined) data.purchase_method = toInt(req.body.purchase_method)
  if (req.body.usable_version !== undefined) data.usable_version = req.body.usable_version
  if (req.body.license_term !== undefined) data.license_term = req.body.license_term
  if (req.body.expire_date !== undefined) data.expire_date = req.body.expire_date
  if (req.body.serial_no !== undefined && String(req.body.serial_no) !== '') data.serial_no = aesEncrypt(req.body.serial_no)
  if (req.body.activation_code !== undefined && String(req.body.activation_code) !== '') data.activation_code = aesEncrypt(req.body.activation_code)
  if (req.body.auth_file_url !== undefined) data.auth_file_url = req.body.auth_file_url
  if (req.body.remark !== undefined) data.remark = req.body.remark
  await purEntitlement.update(id, data, req.user)
  ok(res, null, '修改成功')
}))

// POST /api/entitlements/:id/reveal — 二次认证查看明文（FR-07-07，entitlement:secret）
router.post('/:id/reveal', requirePerm('entitlement:secret'), asyncH(async (req, res) => {
  requireFields(req.body, ['password'])
  const users = await sysUser.list({ id: Number(req.user.id) }, { pageSize: 1 })
  const u = users && users[0]
  if (!u) throw new ApiError('用户不存在', 404)
  const match = await bcrypt.compare(String(req.body.password), u.password_hash)
  if (!match) throw new ApiError('二次认证失败', 403)
  const id = toInt(req.params.id)
  const e = await oneOf(purEntitlement, id)
  if (!e) throw new ApiError('授权记录不存在', 404)
  ok(res, { serial_no: aesDecrypt(e.serial_no), activation_code: aesDecrypt(e.activation_code) }, '查看成功，操作已记录审计日志')
}))

// DELETE /api/entitlements/:id — 逻辑删除
router.delete('/:id', requirePerm('entitlement:edit'), asyncH(async (req, res) => {
  await purEntitlement.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

export default router
