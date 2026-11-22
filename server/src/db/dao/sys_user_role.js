// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'

const TABLE = 'sys_user_role'
export const TABLE_NAME = TABLE
const DEFAULTS = {}
const KW_COLS = []

const LIST_SQL = "SELECT * FROM sys_user_role WHERE is_deleted = 0 AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR role_id = ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM sys_user_role WHERE is_deleted = 0 AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR role_id = ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM sys_user_role WHERE is_deleted = 0 AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR role_id = ? )"
const GET_SQL = "SELECT * FROM sys_user_role WHERE id = ? AND is_deleted = 0"
const INSERT_SQL = "INSERT INTO sys_user_role (user_id, role_id, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE sys_user_role SET user_id = COALESCE(?, user_id), role_id = COALESCE(?, role_id), update_time = ?, update_by = ? WHERE id = ?"
const DELETE_SQL = "UPDATE sys_user_role SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.role_id ?? null, f.role_id ?? null)
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
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.role_id ?? null, f.role_id ?? null)
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
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.role_id ?? null, f.role_id ?? null)
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
    row.user_id ?? null,
    row.role_id ?? null,
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
    data.user_id ?? null,
    data.role_id ?? null,
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

