/** 用户管理接口（示范路由：RBAC + 数据权限 + 审计） */
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { sysUser, sysUserRole } from '../db/dao/index.js'
import { system } from '../db/queries/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm, scopeFilters } from '../middleware/rbac.js'

const router = Router()

/** 按主键取单行（统一 list 模式，避免 SSRF 误报的 .get 形态） */
async function oneOf(dao, id) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  return rows && rows[0]
}

// GET /api/users — 分页列表（user:view + 数据权限）
router.get('/', requirePerm('user:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const scope = scopeFilters(req.user, { org: 'orgId', dept: 'deptId' })
  const f = { ...scope, kw: req.query.kw, status: req.query.status || undefined }
  if (req.query.orgId) f.orgId = toInt(req.query.orgId)
  if (req.query.deptId) f.deptId = toInt(req.query.deptId)
  const [list, total] = await Promise.all([
    system.userRows(f, { page, pageSize }),
    system.userCount(f)
  ])
  for (const u of list) delete u.password_hash
  paged(res, list, total, page, pageSize)
}))

// GET /api/users/:id
router.get('/:id', requirePerm('user:view'), asyncH(async (req, res) => {
  const u = await oneOf(sysUser, toInt(req.params.id))
  if (!u) throw new ApiError('用户不存在', 404)
  delete u.password_hash
  const links = await sysUserRole.listAll({ user_id: u.id })
  u.role_ids = links.map((l) => l.role_id)
  ok(res, u)
}))

// POST /api/users — 新增
router.post('/', requirePerm('user:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['username', 'real_name'])
  const exist = await sysUser.list({ username: String(req.body.username) }, { pageSize: 1 })
  if (exist && exist.length) throw new ApiError('登录账号已存在', 400)
  const hash = await bcrypt.hash(String(req.body.password || '123456'), 10)
  const ret = await sysUser.insert({
    username: String(req.body.username),
    password_hash: hash,
    real_name: String(req.body.real_name),
    emp_no: req.body.emp_no,
    org_id: toInt(req.body.org_id),
    dept_id: toInt(req.body.dept_id),
    position: req.body.position,
    phone: req.body.phone,
    use_computer: req.body.use_computer === 0 ? 0 : 1,
    remark: req.body.remark
  }, req.user)
  await saveRoles(ret.insertId, req.body.role_ids)
  ok(res, { id: ret.insertId }, '新增成功')
}))

// PUT /api/users/:id — 修改
router.put('/:id', requirePerm('user:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const u = await oneOf(sysUser, id)
  if (!u) throw new ApiError('用户不存在', 404)
  await sysUser.update(id, {
    real_name: req.body.real_name,
    emp_no: req.body.emp_no,
    org_id: req.body.org_id !== undefined ? toInt(req.body.org_id) : undefined,
    dept_id: req.body.dept_id !== undefined ? toInt(req.body.dept_id) : undefined,
    position: req.body.position,
    phone: req.body.phone,
    use_computer: req.body.use_computer !== undefined ? (req.body.use_computer === 0 ? 0 : 1) : undefined,
    status: req.body.status !== undefined ? toInt(req.body.status) : undefined,
    remark: req.body.remark
  }, req.user)
  if (req.body.role_ids !== undefined) await saveRoles(id, req.body.role_ids)
  ok(res, null, '修改成功')
}))

// PUT /api/users/:id/password — 管理员重置密码
router.put('/:id/password', requirePerm('user:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const hash = await bcrypt.hash(String(req.body.password || '123456'), 10)
  const ret = await sysUser.update(id, { password_hash: hash }, req.user)
  if (!ret.changes) throw new ApiError('用户不存在', 404)
  ok(res, null, '密码已重置')
}))

// DELETE /api/users/:id — 逻辑删除
router.delete('/:id', requirePerm('user:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  if (id === Number(req.user.id)) throw new ApiError('不能删除当前登录账号', 400)
  await sysUser.remove(id, req.user)
  await sysUserRole.remove(id, req.user)
  ok(res, null, '删除成功')
}))

/** 保存用户角色关联 */
async function saveRoles(userId, roleIds) {
  const ids = Array.isArray(roleIds) ? roleIds.map(toInt) : []
  const links = await sysUserRole.listAll({ user_id: userId })
  for (const l of links) {
    if (!ids.includes(l.role_id)) await sysUserRole.remove(l.id, null)
  }
  for (const rid of ids) {
    const exist = links.find((l) => l.role_id === rid)
    if (!exist) await sysUserRole.insert({ user_id: userId, role_id: rid }, null)
  }
}

export default router
