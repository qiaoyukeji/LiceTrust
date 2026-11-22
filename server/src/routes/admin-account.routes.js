/** 管理员账号接口（FR-07-03，账号密码 AES 加密存储） */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { purAdminAccount, baseSoftware, sysUser } from '../db/dao/index.js'
import { oneOfSoftware } from '../utils/one.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { aesEncrypt, aesDecrypt } from '../utils/crypto.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/admin-accounts — 分页列表（补软件名；密码不出库，固定掩码）
router.get('/', requirePerm('adminaccount:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = {}
  if (req.query.softwareId) f.software_id = toInt(req.query.softwareId)
  if (req.query.kw) f._kw = req.query.kw
  const [list, total] = await Promise.all([
    purAdminAccount.list(f, { page, pageSize }),
    purAdminAccount.count(f)
  ])
  const rows = []
  for (const a of list) {
    const s = a.software_id ? await oneOfSoftware(a.software_id) : null
    rows.push({ ...a, account_pwd: '******', software_name: s ? s.software_name : '' })
  }
  paged(res, rows, total, page, pageSize)
}))

// GET /api/admin-accounts/:id — 详情（密码掩码）
router.get('/:id', requirePerm('adminaccount:view'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const a = await oneOf(purAdminAccount, id)
  if (!a) throw new ApiError('管理员账号不存在', 404)
  const s = a.software_id ? await oneOfSoftware(a.software_id) : null
  ok(res, { ...a, account_pwd: '******', software_name: s ? s.software_name : '' })
}))

// POST /api/admin-accounts — 新增（密码 AES 加密入库）
router.post('/', requirePerm('adminaccount:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['software_id', 'account_name'])
  const sw = await oneOfSoftware(toInt(req.body.software_id))
  if (!sw) throw new ApiError('软件不存在', 400)
  const ret = await purAdminAccount.insert({
    software_id: toInt(req.body.software_id),
    account_name: req.body.account_name,
    account_pwd: aesEncrypt(req.body.account_pwd),
    holder_id: toInt(req.body.holder_id),
    holder_phone: req.body.holder_phone,
    permission_desc: req.body.permission_desc,
    change_date: req.body.change_date
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/admin-accounts/:id — 修改（明文密码则重新加密，空串跳过）
router.put('/:id', requirePerm('adminaccount:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const a = await oneOf(purAdminAccount, id)
  if (!a) throw new ApiError('管理员账号不存在', 404)
  const data = {}
  if (req.body.software_id !== undefined) data.software_id = toInt(req.body.software_id)
  if (req.body.account_name !== undefined) data.account_name = req.body.account_name
  if (req.body.account_pwd !== undefined && String(req.body.account_pwd) !== '') data.account_pwd = aesEncrypt(req.body.account_pwd)
  if (req.body.holder_id !== undefined) data.holder_id = toInt(req.body.holder_id)
  if (req.body.holder_phone !== undefined) data.holder_phone = req.body.holder_phone
  if (req.body.permission_desc !== undefined) data.permission_desc = req.body.permission_desc
  if (req.body.change_date !== undefined) data.change_date = req.body.change_date
  await purAdminAccount.update(id, data, req.user)
  ok(res, null, '修改成功')
}))

// POST /api/admin-accounts/:id/reveal — 二次认证查看明文密码（同 FR-07-07 模式）
router.post('/:id/reveal', requirePerm('adminaccount:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['password'])
  const users = await sysUser.list({ id: Number(req.user.id) }, { pageSize: 1 })
  const u = users && users[0]
  if (!u) throw new ApiError('用户不存在', 404)
  const match = await bcrypt.compare(String(req.body.password), u.password_hash)
  if (!match) throw new ApiError('二次认证失败', 403)
  const id = toInt(req.params.id)
  const a = await oneOf(purAdminAccount, id)
  if (!a) throw new ApiError('管理员账号不存在', 404)
  ok(res, { account_name: a.account_name, account_pwd: aesDecrypt(a.account_pwd) }, '查看成功，操作已记录审计日志')
}))

// DELETE /api/admin-accounts/:id — 逻辑删除
router.delete('/:id', requirePerm('adminaccount:edit'), asyncH(async (req, res) => {
  await purAdminAccount.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

export default router
