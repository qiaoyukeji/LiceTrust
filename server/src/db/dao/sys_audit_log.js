// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'
import { currentTenant } from '../tenantContext.js'

const TABLE = 'sys_audit_log'
export const TABLE_NAME = TABLE
const DEFAULTS = {"user_id":0}
const KW_COLS = ["username","module","operation"]

const LIST_SQL = "SELECT * FROM sys_audit_log WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR username LIKE ? OR module LIKE ? OR operation LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR username = ? ) AND ( ? IS NULL OR module = ? ) AND ( ? IS NULL OR operation = ? ) AND ( ? IS NULL OR method = ? ) AND ( ? IS NULL OR path = ? ) AND ( ? IS NULL OR ip = ? ) AND ( ? IS NULL OR op_time = ? ) AND ( ? IS NULL OR op_time >= ? ) AND ( ? IS NULL OR op_time <= ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM sys_audit_log WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR username LIKE ? OR module LIKE ? OR operation LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR username = ? ) AND ( ? IS NULL OR module = ? ) AND ( ? IS NULL OR operation = ? ) AND ( ? IS NULL OR method = ? ) AND ( ? IS NULL OR path = ? ) AND ( ? IS NULL OR ip = ? ) AND ( ? IS NULL OR op_time = ? ) AND ( ? IS NULL OR op_time >= ? ) AND ( ? IS NULL OR op_time <= ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM sys_audit_log WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR username LIKE ? OR module LIKE ? OR operation LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR username = ? ) AND ( ? IS NULL OR module = ? ) AND ( ? IS NULL OR operation = ? ) AND ( ? IS NULL OR method = ? ) AND ( ? IS NULL OR path = ? ) AND ( ? IS NULL OR ip = ? ) AND ( ? IS NULL OR op_time = ? ) AND ( ? IS NULL OR op_time >= ? ) AND ( ? IS NULL OR op_time <= ? )"
const GET_SQL = "SELECT * FROM sys_audit_log WHERE id = ? AND is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? )"
const INSERT_SQL = "INSERT INTO sys_audit_log (tenant_id, user_id, username, module, operation, method, path, detail, ip, op_time, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE sys_audit_log SET tenant_id = COALESCE(?, tenant_id), user_id = COALESCE(?, user_id), username = COALESCE(?, username), module = COALESCE(?, module), operation = COALESCE(?, operation), method = COALESCE(?, method), path = COALESCE(?, path), detail = COALESCE(?, detail), ip = COALESCE(?, ip), op_time = COALESCE(?, op_time), update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const DELETE_SQL = "UPDATE sys_audit_log SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const PURGE_SQL = "DELETE FROM sys_audit_log WHERE tenant_id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.username ?? null, f.username ?? null)
  params.push(f.module ?? null, f.module ?? null)
  params.push(f.operation ?? null, f.operation ?? null)
  params.push(f.method ?? null, f.method ?? null)
  params.push(f.path ?? null, f.path ?? null)
  params.push(f.ip ?? null, f.ip ?? null)
  params.push(f.op_time ?? null, f.op_time ?? null)
  params.push(f.op_time_from ?? null, f.op_time_from ?? null)
  params.push(f.op_time_to ?? null, f.op_time_to ?? null)
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
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.username ?? null, f.username ?? null)
  params.push(f.module ?? null, f.module ?? null)
  params.push(f.operation ?? null, f.operation ?? null)
  params.push(f.method ?? null, f.method ?? null)
  params.push(f.path ?? null, f.path ?? null)
  params.push(f.ip ?? null, f.ip ?? null)
  params.push(f.op_time ?? null, f.op_time ?? null)
  params.push(f.op_time_from ?? null, f.op_time_from ?? null)
  params.push(f.op_time_to ?? null, f.op_time_to ?? null)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    return c.prepare(LIST_ALL_SQL).all(...params)
  }
  return (await c.query(LIST_ALL_SQL, params))[0]
}

/** 计数 */
export async function count(f = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.username ?? null, f.username ?? null)
  params.push(f.module ?? null, f.module ?? null)
  params.push(f.operation ?? null, f.operation ?? null)
  params.push(f.method ?? null, f.method ?? null)
  params.push(f.path ?? null, f.path ?? null)
  params.push(f.ip ?? null, f.ip ?? null)
  params.push(f.op_time ?? null, f.op_time ?? null)
  params.push(f.op_time_from ?? null, f.op_time_from ?? null)
  params.push(f.op_time_to ?? null, f.op_time_to ?? null)
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
  const __t = currentTenant()
  if (dialect === 'sqlite') {
    const rows = c.prepare(GET_SQL).all(id, __t, __t)
    return rows[0]
  }
  const rows = (await c.query(GET_SQL, [id, __t, __t]))[0]
  return rows[0]
}

/** 新增（DEFAULTS 合并 + 公共字段），返回 { insertId, changes } */
export async function insert(data, ctx = null) {
  const now = nowStr()
  const __t = currentTenant()
  const row = { ...DEFAULTS, ...data }
  const params = [
    row.tenant_id !== undefined && row.tenant_id !== null ? row.tenant_id : (__t === null ? 0 : __t),
    row.user_id ?? null,
    row.username ?? null,
    row.module ?? null,
    row.operation ?? null,
    row.method ?? null,
    row.path ?? null,
    row.detail ?? null,
    row.ip ?? null,
    row.op_time ?? null,
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
  const __t = currentTenant()
  const params = [
    data.tenant_id ?? null,
    data.user_id ?? null,
    data.username ?? null,
    data.module ?? null,
    data.operation ?? null,
    data.method ?? null,
    data.path ?? null,
    data.detail ?? null,
    data.ip ?? null,
    data.op_time ?? null,
    now,
    ctx ? ctx.id || 0 : 0,
    id,
    __t,
    __t
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
  const __t = currentTenant()
  const params = [now, ctx ? ctx.id || 0 : 0, id, __t, __t]
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const info = c.prepare(DELETE_SQL).run(...params)
    return { insertId: Number(info.lastInsertRowid), changes: info.changes }
  }
  const r = await c.query(DELETE_SQL, params)
  return { insertId: r[0].insertId, changes: r[0].affectedRows }
}

/** 物理清空本租户数据（仅备份恢复流程使用，危险操作） */
export async function purgeByTenant(tenantId) {
  const params = [Number(tenantId)]
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const info = c.prepare(PURGE_SQL).run(...params)
    return { insertId: Number(info.lastInsertRowid), changes: info.changes }
  }
  const r = await c.query(PURGE_SQL, params)
  return { insertId: r[0].insertId, changes: r[0].affectedRows }
}

