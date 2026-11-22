// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'
import { currentTenant } from '../tenantContext.js'

const TABLE = 'base_free_software'
export const TABLE_NAME = TABLE
const DEFAULTS = {}
const KW_COLS = ["vendor","source","use_dept"]

const LIST_SQL = "SELECT * FROM base_free_software WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR vendor LIKE ? OR source LIKE ? OR use_dept LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR vendor = ? ) AND ( ? IS NULL OR source = ? ) AND ( ? IS NULL OR use_dept = ? ) AND ( ? IS NULL OR use_reason = ? ) AND ( ? IS NULL OR service_contact = ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM base_free_software WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR vendor LIKE ? OR source LIKE ? OR use_dept LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR vendor = ? ) AND ( ? IS NULL OR source = ? ) AND ( ? IS NULL OR use_dept = ? ) AND ( ? IS NULL OR use_reason = ? ) AND ( ? IS NULL OR service_contact = ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM base_free_software WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR vendor LIKE ? OR source LIKE ? OR use_dept LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR vendor = ? ) AND ( ? IS NULL OR source = ? ) AND ( ? IS NULL OR use_dept = ? ) AND ( ? IS NULL OR use_reason = ? ) AND ( ? IS NULL OR service_contact = ? )"
const GET_SQL = "SELECT * FROM base_free_software WHERE id = ? AND is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? )"
const INSERT_SQL = "INSERT INTO base_free_software (tenant_id, software_id, vendor, source, use_dept, use_reason, service_contact, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE base_free_software SET tenant_id = COALESCE(?, tenant_id), software_id = COALESCE(?, software_id), vendor = COALESCE(?, vendor), source = COALESCE(?, source), use_dept = COALESCE(?, use_dept), use_reason = COALESCE(?, use_reason), service_contact = COALESCE(?, service_contact), update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const DELETE_SQL = "UPDATE base_free_software SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const PURGE_SQL = "DELETE FROM base_free_software WHERE tenant_id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.software_id ?? null, f.software_id ?? null)
  params.push(f.vendor ?? null, f.vendor ?? null)
  params.push(f.source ?? null, f.source ?? null)
  params.push(f.use_dept ?? null, f.use_dept ?? null)
  params.push(f.use_reason ?? null, f.use_reason ?? null)
  params.push(f.service_contact ?? null, f.service_contact ?? null)
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
  params.push(f.software_id ?? null, f.software_id ?? null)
  params.push(f.vendor ?? null, f.vendor ?? null)
  params.push(f.source ?? null, f.source ?? null)
  params.push(f.use_dept ?? null, f.use_dept ?? null)
  params.push(f.use_reason ?? null, f.use_reason ?? null)
  params.push(f.service_contact ?? null, f.service_contact ?? null)
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
  params.push(f.software_id ?? null, f.software_id ?? null)
  params.push(f.vendor ?? null, f.vendor ?? null)
  params.push(f.source ?? null, f.source ?? null)
  params.push(f.use_dept ?? null, f.use_dept ?? null)
  params.push(f.use_reason ?? null, f.use_reason ?? null)
  params.push(f.service_contact ?? null, f.service_contact ?? null)
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
    row.software_id ?? null,
    row.vendor ?? null,
    row.source ?? null,
    row.use_dept ?? null,
    row.use_reason ?? null,
    row.service_contact ?? null,
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
    data.software_id ?? null,
    data.vendor ?? null,
    data.source ?? null,
    data.use_dept ?? null,
    data.use_reason ?? null,
    data.service_contact ?? null,
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

