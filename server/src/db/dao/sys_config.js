// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'

const TABLE = 'sys_config'
export const TABLE_NAME = TABLE
const DEFAULTS = {}
const KW_COLS = ["config_key","config_value","config_name"]

const LIST_SQL = "SELECT * FROM sys_config WHERE is_deleted = 0 AND ( ? IS NULL OR config_key LIKE ? OR config_value LIKE ? OR config_name LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR config_key = ? ) AND ( ? IS NULL OR config_value = ? ) AND ( ? IS NULL OR config_name = ? ) AND ( ? IS NULL OR remark = ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM sys_config WHERE is_deleted = 0 AND ( ? IS NULL OR config_key LIKE ? OR config_value LIKE ? OR config_name LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR config_key = ? ) AND ( ? IS NULL OR config_value = ? ) AND ( ? IS NULL OR config_name = ? ) AND ( ? IS NULL OR remark = ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM sys_config WHERE is_deleted = 0 AND ( ? IS NULL OR config_key LIKE ? OR config_value LIKE ? OR config_name LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR config_key = ? ) AND ( ? IS NULL OR config_value = ? ) AND ( ? IS NULL OR config_name = ? ) AND ( ? IS NULL OR remark = ? )"
const GET_SQL = "SELECT * FROM sys_config WHERE id = ? AND is_deleted = 0"
const INSERT_SQL = "INSERT INTO sys_config (config_key, config_value, config_name, remark, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE sys_config SET config_key = COALESCE(?, config_key), config_value = COALESCE(?, config_value), config_name = COALESCE(?, config_name), remark = COALESCE(?, remark), update_time = ?, update_by = ? WHERE id = ?"
const DELETE_SQL = "UPDATE sys_config SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.config_key ?? null, f.config_key ?? null)
  params.push(f.config_value ?? null, f.config_value ?? null)
  params.push(f.config_name ?? null, f.config_name ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
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
  params.push(f.config_key ?? null, f.config_key ?? null)
  params.push(f.config_value ?? null, f.config_value ?? null)
  params.push(f.config_name ?? null, f.config_name ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
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
  params.push(f.config_key ?? null, f.config_key ?? null)
  params.push(f.config_value ?? null, f.config_value ?? null)
  params.push(f.config_name ?? null, f.config_name ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
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
    row.config_key ?? null,
    row.config_value ?? null,
    row.config_name ?? null,
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
    data.config_key ?? null,
    data.config_value ?? null,
    data.config_name ?? null,
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

