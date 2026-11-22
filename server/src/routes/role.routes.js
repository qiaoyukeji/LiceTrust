/** 角色管理接口（FR-15-02：角色与权限配置） */
import { Router } from 'express'
import { sysRole, sysUserRole } from '../db/dao/index.js'
import { system } from '../db/queries/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm, requirePlatform } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

/** perms JSON 串安全解析为数组 */
function parsePerms(perms) {
  try {
    const arr = JSON.parse(perms || '[]')
    return Array.isArray(arr) ? arr : []
  } catch (ignore) {
    return []
  }
}

/** 组装角色数据（perms 数组转 JSON 串入库） */
function roleData(body) {
  return {
    role_code: body.role_code !== undefined ? String(body.role_code) : undefined,
    role_name: body.role_name !== undefined ? String(body.role_name) : undefined,
    data_scope: body.data_scope !== undefined ? toInt(body.data_scope) : undefined,
    perms: Array.isArray(body.perms) ? JSON.stringify(body.perms) : undefined,
    remark: body.remark
  }
}

// GET /api/roles — 分页列表（三层可见性：平台上下文全量；企业上下文 平台预置 ∨ 本企业自有）
router.get('/', requirePerm('role:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const list = await system.roleRows({ kw: req.query.kw })
  const filtered = req.query.kw
    ? list.filter((r) => (r.role_name || '').includes(String(req.query.kw)) || (r.role_code || '').includes(String(req.query.kw)))
    : list
  const total = filtered.length
  const start = (page - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize).map((r) => ({ ...r, perms: parsePerms(r.perms), scope: Number(r.tenant_id) === 0 ? '平台预置' : '企业自有' }))
  paged(res, rows, total, page, pageSize)
}))

// GET /api/roles/all — 全量角色（下拉选择用；三层可见性：平台预置 ∨ 查看者自有）
router.get('/all', requirePerm('role:view'), asyncH(async (req, res) => {
  const rows = await system.roleRows({})
  ok(res, rows.map((r) => ({ id: r.id, role_code: r.role_code, role_name: r.role_name, scope: Number(r.tenant_id) === 0 ? '平台预置' : '企业自有' })))
}))

// GET /api/roles/:id — 角色详情（含权限点数组）
router.get('/:id', requirePerm('role:view'), asyncH(async (req, res) => {
  const r = await oneOf(sysRole, toInt(req.params.id))
  if (!r) throw new ApiError('角色不存在', 404)
  r.perms = parsePerms(r.perms)
  ok(res, r)
}))

// POST /api/roles — 新增角色
// 角色为平台级全局资源（含全部企业共用的权限模板）：写操作仅平台运营管理员
router.post('/', requirePerm('role:edit'), requirePlatform, asyncH(async (req, res) => {
  requireFields(req.body, ['role_code', 'role_name'])
  const dup = await sysRole.list({ role_code: String(req.body.role_code) }, { pageSize: 1 })
  if (dup && dup.length) throw new ApiError('角色编码已存在', 400)
  const ret = await sysRole.insert({
    ...roleData(req.body),
    data_scope: req.body.data_scope !== undefined ? toInt(req.body.data_scope) : 4,
    perms: Array.isArray(req.body.perms) ? JSON.stringify(req.body.perms) : '[]'
  }, req.user)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/roles/:id — 修改角色
router.put('/:id', requirePerm('role:edit'), requirePlatform, asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(sysRole, id)
  if (!row) throw new ApiError('角色不存在', 404)
  if (req.body.role_code !== undefined && String(req.body.role_code) !== row.role_code) {
    const dup = await sysRole.list({ role_code: String(req.body.role_code) }, { pageSize: 1 })
    if (dup && dup.length && dup[0].id !== id) throw new ApiError('角色编码已存在', 400)
  }
  await sysRole.update(id, roleData(req.body), req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/roles/:id — 逻辑删除（有用户关联时拒绝）
router.delete('/:id', requirePerm('role:edit'), requirePlatform, asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const row = await oneOf(sysRole, id)
  if (!row) throw new ApiError('角色不存在', 404)
  const users = await sysUserRole.count({ role_id: id })
  if (users > 0) throw new ApiError('该角色已关联用户，不允许删除', 400)
  await sysRole.remove(id, req.user)
  ok(res, null, '删除成功')
}))

export default router
