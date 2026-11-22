// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'
import { currentTenant } from '../tenantContext.js'

const TABLE = 'flow_maint_apply'
export const TABLE_NAME = TABLE
const DEFAULTS = {"software_id":0,"status":0}
const KW_COLS = ["apply_no","software_name","version"]

const LIST_SQL = "SELECT * FROM flow_maint_apply WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR apply_no LIKE ? OR software_name LIKE ? OR version LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR apply_no = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR applicant_id = ? ) AND ( ? IS NULL OR apply_time = ? ) AND ( ? IS NULL OR computer_id = ? ) AND ( ? IS NULL OR apply_type = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR software_name = ? ) AND ( ? IS NULL OR version = ? ) AND ( ? IS NULL OR upgrade_from = ? ) AND ( ? IS NULL OR upgrade_to = ? ) AND ( ? IS NULL OR reason = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR current_node = ? ) AND ( ? IS NULL OR finish_time = ? ) AND ( ? IS NULL OR apply_time >= ? ) AND ( ? IS NULL OR apply_time <= ? ) AND ( ? IS NULL OR finish_time >= ? ) AND ( ? IS NULL OR finish_time <= ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM flow_maint_apply WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR apply_no LIKE ? OR software_name LIKE ? OR version LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR apply_no = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR applicant_id = ? ) AND ( ? IS NULL OR apply_time = ? ) AND ( ? IS NULL OR computer_id = ? ) AND ( ? IS NULL OR apply_type = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR software_name = ? ) AND ( ? IS NULL OR version = ? ) AND ( ? IS NULL OR upgrade_from = ? ) AND ( ? IS NULL OR upgrade_to = ? ) AND ( ? IS NULL OR reason = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR current_node = ? ) AND ( ? IS NULL OR finish_time = ? ) AND ( ? IS NULL OR apply_time >= ? ) AND ( ? IS NULL OR apply_time <= ? ) AND ( ? IS NULL OR finish_time >= ? ) AND ( ? IS NULL OR finish_time <= ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM flow_maint_apply WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR apply_no LIKE ? OR software_name LIKE ? OR version LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR apply_no = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR applicant_id = ? ) AND ( ? IS NULL OR apply_time = ? ) AND ( ? IS NULL OR computer_id = ? ) AND ( ? IS NULL OR apply_type = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR software_name = ? ) AND ( ? IS NULL OR version = ? ) AND ( ? IS NULL OR upgrade_from = ? ) AND ( ? IS NULL OR upgrade_to = ? ) AND ( ? IS NULL OR reason = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR current_node = ? ) AND ( ? IS NULL OR finish_time = ? ) AND ( ? IS NULL OR apply_time >= ? ) AND ( ? IS NULL OR apply_time <= ? ) AND ( ? IS NULL OR finish_time >= ? ) AND ( ? IS NULL OR finish_time <= ? )"
const GET_SQL = "SELECT * FROM flow_maint_apply WHERE id = ? AND is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? )"
const INSERT_SQL = "INSERT INTO flow_maint_apply (tenant_id, apply_no, dept_id, applicant_id, apply_time, computer_id, apply_type, software_id, software_name, version, upgrade_from, upgrade_to, reason, status, current_node, finish_time, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE flow_maint_apply SET tenant_id = COALESCE(?, tenant_id), apply_no = COALESCE(?, apply_no), dept_id = COALESCE(?, dept_id), applicant_id = COALESCE(?, applicant_id), apply_time = COALESCE(?, apply_time), computer_id = COALESCE(?, computer_id), apply_type = COALESCE(?, apply_type), software_id = COALESCE(?, software_id), software_name = COALESCE(?, software_name), version = COALESCE(?, version), upgrade_from = COALESCE(?, upgrade_from), upgrade_to = COALESCE(?, upgrade_to), reason = COALESCE(?, reason), status = COALESCE(?, status), current_node = COALESCE(?, current_node), finish_time = COALESCE(?, finish_time), update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const DELETE_SQL = "UPDATE flow_maint_apply SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const PURGE_SQL = "DELETE FROM flow_maint_apply WHERE tenant_id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.apply_no ?? null, f.apply_no ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.applicant_id ?? null, f.applicant_id ?? null)
  params.push(f.apply_time ?? null, f.apply_time ?? null)
  params.push(f.computer_id ?? null, f.computer_id ?? null)
  params.push(f.apply_type ?? null, f.apply_type ?? null)
  params.push(f.software_id ?? null, f.software_id ?? null)
  params.push(f.software_name ?? null, f.software_name ?? null)
  params.push(f.version ?? null, f.version ?? null)
  params.push(f.upgrade_from ?? null, f.upgrade_from ?? null)
  params.push(f.upgrade_to ?? null, f.upgrade_to ?? null)
  params.push(f.reason ?? null, f.reason ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.current_node ?? null, f.current_node ?? null)
  params.push(f.finish_time ?? null, f.finish_time ?? null)
  params.push(f.apply_time_from ?? null, f.apply_time_from ?? null)
  params.push(f.apply_time_to ?? null, f.apply_time_to ?? null)
  params.push(f.finish_time_from ?? null, f.finish_time_from ?? null)
  params.push(f.finish_time_to ?? null, f.finish_time_to ?? null)
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
  params.push(f.apply_no ?? null, f.apply_no ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.applicant_id ?? null, f.applicant_id ?? null)
  params.push(f.apply_time ?? null, f.apply_time ?? null)
  params.push(f.computer_id ?? null, f.computer_id ?? null)
  params.push(f.apply_type ?? null, f.apply_type ?? null)
  params.push(f.software_id ?? null, f.software_id ?? null)
  params.push(f.software_name ?? null, f.software_name ?? null)
  params.push(f.version ?? null, f.version ?? null)
  params.push(f.upgrade_from ?? null, f.upgrade_from ?? null)
  params.push(f.upgrade_to ?? null, f.upgrade_to ?? null)
  params.push(f.reason ?? null, f.reason ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.current_node ?? null, f.current_node ?? null)
  params.push(f.finish_time ?? null, f.finish_time ?? null)
  params.push(f.apply_time_from ?? null, f.apply_time_from ?? null)
  params.push(f.apply_time_to ?? null, f.apply_time_to ?? null)
  params.push(f.finish_time_from ?? null, f.finish_time_from ?? null)
  params.push(f.finish_time_to ?? null, f.finish_time_to ?? null)
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
  params.push(f.apply_no ?? null, f.apply_no ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.applicant_id ?? null, f.applicant_id ?? null)
  params.push(f.apply_time ?? null, f.apply_time ?? null)
  params.push(f.computer_id ?? null, f.computer_id ?? null)
  params.push(f.apply_type ?? null, f.apply_type ?? null)
  params.push(f.software_id ?? null, f.software_id ?? null)
  params.push(f.software_name ?? null, f.software_name ?? null)
  params.push(f.version ?? null, f.version ?? null)
  params.push(f.upgrade_from ?? null, f.upgrade_from ?? null)
  params.push(f.upgrade_to ?? null, f.upgrade_to ?? null)
  params.push(f.reason ?? null, f.reason ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.current_node ?? null, f.current_node ?? null)
  params.push(f.finish_time ?? null, f.finish_time ?? null)
  params.push(f.apply_time_from ?? null, f.apply_time_from ?? null)
  params.push(f.apply_time_to ?? null, f.apply_time_to ?? null)
  params.push(f.finish_time_from ?? null, f.finish_time_from ?? null)
  params.push(f.finish_time_to ?? null, f.finish_time_to ?? null)
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
    row.apply_no ?? null,
    row.dept_id ?? null,
    row.applicant_id ?? null,
    row.apply_time ?? null,
    row.computer_id ?? null,
    row.apply_type ?? null,
    row.software_id ?? null,
    row.software_name ?? null,
    row.version ?? null,
    row.upgrade_from ?? null,
    row.upgrade_to ?? null,
    row.reason ?? null,
    row.status ?? null,
    row.current_node ?? null,
    row.finish_time ?? null,
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
    data.apply_no ?? null,
    data.dept_id ?? null,
    data.applicant_id ?? null,
    data.apply_time ?? null,
    data.computer_id ?? null,
    data.apply_type ?? null,
    data.software_id ?? null,
    data.software_name ?? null,
    data.version ?? null,
    data.upgrade_from ?? null,
    data.upgrade_to ?? null,
    data.reason ?? null,
    data.status ?? null,
    data.current_node ?? null,
    data.finish_time ?? null,
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

