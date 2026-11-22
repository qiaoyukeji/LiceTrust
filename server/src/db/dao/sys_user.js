// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'

const TABLE = 'sys_user'
export const TABLE_NAME = TABLE
const DEFAULTS = {"org_id":0,"dept_id":0,"use_computer":1,"status":1}
const KW_COLS = ["username","password_hash","real_name"]

const LIST_SQL = "SELECT * FROM sys_user WHERE is_deleted = 0 AND ( ? IS NULL OR username LIKE ? OR password_hash LIKE ? OR real_name LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR username = ? ) AND ( ? IS NULL OR password_hash = ? ) AND ( ? IS NULL OR real_name = ? ) AND ( ? IS NULL OR emp_no = ? ) AND ( ? IS NULL OR org_id = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR position = ? ) AND ( ? IS NULL OR phone = ? ) AND ( ? IS NULL OR use_computer = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR last_login_time = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR last_login_time >= ? ) AND ( ? IS NULL OR last_login_time <= ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM sys_user WHERE is_deleted = 0 AND ( ? IS NULL OR username LIKE ? OR password_hash LIKE ? OR real_name LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR username = ? ) AND ( ? IS NULL OR password_hash = ? ) AND ( ? IS NULL OR real_name = ? ) AND ( ? IS NULL OR emp_no = ? ) AND ( ? IS NULL OR org_id = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR position = ? ) AND ( ? IS NULL OR phone = ? ) AND ( ? IS NULL OR use_computer = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR last_login_time = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR last_login_time >= ? ) AND ( ? IS NULL OR last_login_time <= ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM sys_user WHERE is_deleted = 0 AND ( ? IS NULL OR username LIKE ? OR password_hash LIKE ? OR real_name LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR username = ? ) AND ( ? IS NULL OR password_hash = ? ) AND ( ? IS NULL OR real_name = ? ) AND ( ? IS NULL OR emp_no = ? ) AND ( ? IS NULL OR org_id = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR position = ? ) AND ( ? IS NULL OR phone = ? ) AND ( ? IS NULL OR use_computer = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR last_login_time = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR last_login_time >= ? ) AND ( ? IS NULL OR last_login_time <= ? )"
const GET_SQL = "SELECT * FROM sys_user WHERE id = ? AND is_deleted = 0"
const INSERT_SQL = "INSERT INTO sys_user (tenant_id, username, password_hash, real_name, emp_no, org_id, dept_id, position, phone, use_computer, status, last_login_time, remark, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE sys_user SET tenant_id = COALESCE(?, tenant_id), username = COALESCE(?, username), password_hash = COALESCE(?, password_hash), real_name = COALESCE(?, real_name), emp_no = COALESCE(?, emp_no), org_id = COALESCE(?, org_id), dept_id = COALESCE(?, dept_id), position = COALESCE(?, position), phone = COALESCE(?, phone), use_computer = COALESCE(?, use_computer), status = COALESCE(?, status), last_login_time = COALESCE(?, last_login_time), remark = COALESCE(?, remark), update_time = ?, update_by = ? WHERE id = ?"
const DELETE_SQL = "UPDATE sys_user SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.username ?? null, f.username ?? null)
  params.push(f.password_hash ?? null, f.password_hash ?? null)
  params.push(f.real_name ?? null, f.real_name ?? null)
  params.push(f.emp_no ?? null, f.emp_no ?? null)
  params.push(f.org_id ?? null, f.org_id ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.position ?? null, f.position ?? null)
  params.push(f.phone ?? null, f.phone ?? null)
  params.push(f.use_computer ?? null, f.use_computer ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.last_login_time ?? null, f.last_login_time ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.last_login_time_from ?? null, f.last_login_time_from ?? null)
  params.push(f.last_login_time_to ?? null, f.last_login_time_to ?? null)
  const limit = Number(paging.pageSize) > 0 ? Number(paging.pageSize) : 10
  const page = Number(paging.page) > 0 ? Number(paging.page) : 1
  params.push(limit, (page - 1) * limit)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    return c.prepare(LIST_SQL).all(...params)
  }
  return (await c.query(LIST_SQL, params))[0]
}

/** 全量列表（不分页） */
export async function listAll(f = {}) {
  const params = []
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.username ?? null, f.username ?? null)
  params.push(f.password_hash ?? null, f.password_hash ?? null)
  params.push(f.real_name ?? null, f.real_name ?? null)
  params.push(f.emp_no ?? null, f.emp_no ?? null)
  params.push(f.org_id ?? null, f.org_id ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.position ?? null, f.position ?? null)
  params.push(f.phone ?? null, f.phone ?? null)
  params.push(f.use_computer ?? null, f.use_computer ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.last_login_time ?? null, f.last_login_time ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.last_login_time_from ?? null, f.last_login_time_from ?? null)
  params.push(f.last_login_time_to ?? null, f.last_login_time_to ?? null)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    return c.prepare(LIST_ALL_SQL).all(...params)
  }
  return (await c.query(LIST_ALL_SQL, params))[0]
}

/** 计数 */
export async function count(f = {}) {
  const params = []
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.username ?? null, f.username ?? null)
  params.push(f.password_hash ?? null, f.password_hash ?? null)
  params.push(f.real_name ?? null, f.real_name ?? null)
  params.push(f.emp_no ?? null, f.emp_no ?? null)
  params.push(f.org_id ?? null, f.org_id ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.position ?? null, f.position ?? null)
  params.push(f.phone ?? null, f.phone ?? null)
  params.push(f.use_computer ?? null, f.use_computer ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.last_login_time ?? null, f.last_login_time ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.last_login_time_from ?? null, f.last_login_time_from ?? null)
  params.push(f.last_login_time_to ?? null, f.last_login_time_to ?? null)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const rows = c.prepare(COUNT_SQL).all(...params)
    return Number(rows[0].n)
  }
  const rows = (await c.query(COUNT_SQL, params))[0]
  return Number(rows[0].n)
}

/** 按主键取单行 */
export async function get(id) {
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const rows = c.prepare(GET_SQL).all(id)
    return rows[0]
  }
  const rows = (await c.query(GET_SQL, [id]))[0]
  return rows[0]
}

/** 新增（DEFAULTS 合并 + 公共字段），返回 { insertId, changes } */
export async function insert(data, ctx = null) {
  const now = nowStr()
  const row = { ...DEFAULTS, ...data }
  const params = [
    row.tenant_id ?? null,
    row.username ?? null,
    row.password_hash ?? null,
    row.real_name ?? null,
    row.emp_no ?? null,
    row.org_id ?? null,
    row.dept_id ?? null,
    row.position ?? null,
    row.phone ?? null,
    row.use_computer ?? null,
    row.status ?? null,
    row.last_login_time ?? null,
    row.remark ?? null,
    row.create_time || now,
    now,
    ctx ? ctx.id || 0 : 0,
    ctx ? ctx.id || 0 : 0,
    0
  ]
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const info = c.prepare(INSERT_SQL).run(...params)
    return { insertId: Number(info.lastInsertRowid), changes: info.changes }
  }
  const r = await c.query(INSERT_SQL, params)
  return { insertId: r[0].insertId, changes: r[0].affectedRows }
}

/** 更新（未传字段保持原值；字符串置空传 ""） */
export async function update(id, data, ctx = null) {
  const now = nowStr()
  const params = [
    data.tenant_id ?? null,
    data.username ?? null,
    data.password_hash ?? null,
    data.real_name ?? null,
    data.emp_no ?? null,
    data.org_id ?? null,
    data.dept_id ?? null,
    data.position ?? null,
    data.phone ?? null,
    data.use_computer ?? null,
    data.status ?? null,
    data.last_login_time ?? null,
    data.remark ?? null,
    now,
    ctx ? ctx.id || 0 : 0,
    id,
  ]
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const info = c.prepare(UPDATE_SQL).run(...params)
    return { insertId: Number(info.lastInsertRowid), changes: info.changes }
  }
  const r = await c.query(UPDATE_SQL, params)
  return { insertId: r[0].insertId, changes: r[0].affectedRows }
}

/** 逻辑删除 */
export async function remove(id, ctx = null) {
  const now = nowStr()
  const params = [now, ctx ? ctx.id || 0 : 0, id]
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const info = c.prepare(DELETE_SQL).run(...params)
    return { insertId: Number(info.lastInsertRowid), changes: info.changes }
  }
  const r = await c.query(DELETE_SQL, params)
  return { insertId: r[0].insertId, changes: r[0].affectedRows }
}

