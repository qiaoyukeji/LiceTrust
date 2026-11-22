// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'
import { currentTenant } from '../tenantContext.js'

const TABLE = 'pur_plan'
export const TABLE_NAME = TABLE
const DEFAULTS = {"total_amount":0,"status":0,"audit_by":0}
const KW_COLS = ["plan_no","title","audit_opinion"]

const LIST_SQL = "SELECT * FROM pur_plan WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR plan_no LIKE ? OR title LIKE ? OR audit_opinion LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR plan_no = ? ) AND ( ? IS NULL OR title = ? ) AND ( ? IS NULL OR year = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR applicant_id = ? ) AND ( ? IS NULL OR total_amount = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR audit_opinion = ? ) AND ( ? IS NULL OR audit_by = ? ) AND ( ? IS NULL OR audit_time = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR audit_time >= ? ) AND ( ? IS NULL OR audit_time <= ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM pur_plan WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR plan_no LIKE ? OR title LIKE ? OR audit_opinion LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR plan_no = ? ) AND ( ? IS NULL OR title = ? ) AND ( ? IS NULL OR year = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR applicant_id = ? ) AND ( ? IS NULL OR total_amount = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR audit_opinion = ? ) AND ( ? IS NULL OR audit_by = ? ) AND ( ? IS NULL OR audit_time = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR audit_time >= ? ) AND ( ? IS NULL OR audit_time <= ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM pur_plan WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR plan_no LIKE ? OR title LIKE ? OR audit_opinion LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR plan_no = ? ) AND ( ? IS NULL OR title = ? ) AND ( ? IS NULL OR year = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR applicant_id = ? ) AND ( ? IS NULL OR total_amount = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR audit_opinion = ? ) AND ( ? IS NULL OR audit_by = ? ) AND ( ? IS NULL OR audit_time = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR audit_time >= ? ) AND ( ? IS NULL OR audit_time <= ? )"
const GET_SQL = "SELECT * FROM pur_plan WHERE id = ? AND is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? )"
const INSERT_SQL = "INSERT INTO pur_plan (tenant_id, plan_no, title, year, dept_id, applicant_id, items, total_amount, status, audit_opinion, audit_by, audit_time, remark, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE pur_plan SET tenant_id = COALESCE(?, tenant_id), plan_no = COALESCE(?, plan_no), title = COALESCE(?, title), year = COALESCE(?, year), dept_id = COALESCE(?, dept_id), applicant_id = COALESCE(?, applicant_id), items = COALESCE(?, items), total_amount = COALESCE(?, total_amount), status = COALESCE(?, status), audit_opinion = COALESCE(?, audit_opinion), audit_by = COALESCE(?, audit_by), audit_time = COALESCE(?, audit_time), remark = COALESCE(?, remark), update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const DELETE_SQL = "UPDATE pur_plan SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const PURGE_SQL = "DELETE FROM pur_plan WHERE tenant_id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.plan_no ?? null, f.plan_no ?? null)
  params.push(f.title ?? null, f.title ?? null)
  params.push(f.year ?? null, f.year ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.applicant_id ?? null, f.applicant_id ?? null)
  params.push(f.total_amount ?? null, f.total_amount ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.audit_opinion ?? null, f.audit_opinion ?? null)
  params.push(f.audit_by ?? null, f.audit_by ?? null)
  params.push(f.audit_time ?? null, f.audit_time ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.audit_time_from ?? null, f.audit_time_from ?? null)
  params.push(f.audit_time_to ?? null, f.audit_time_to ?? null)
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
  params.push(f.plan_no ?? null, f.plan_no ?? null)
  params.push(f.title ?? null, f.title ?? null)
  params.push(f.year ?? null, f.year ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.applicant_id ?? null, f.applicant_id ?? null)
  params.push(f.total_amount ?? null, f.total_amount ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.audit_opinion ?? null, f.audit_opinion ?? null)
  params.push(f.audit_by ?? null, f.audit_by ?? null)
  params.push(f.audit_time ?? null, f.audit_time ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.audit_time_from ?? null, f.audit_time_from ?? null)
  params.push(f.audit_time_to ?? null, f.audit_time_to ?? null)
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
  params.push(f.plan_no ?? null, f.plan_no ?? null)
  params.push(f.title ?? null, f.title ?? null)
  params.push(f.year ?? null, f.year ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.applicant_id ?? null, f.applicant_id ?? null)
  params.push(f.total_amount ?? null, f.total_amount ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.audit_opinion ?? null, f.audit_opinion ?? null)
  params.push(f.audit_by ?? null, f.audit_by ?? null)
  params.push(f.audit_time ?? null, f.audit_time ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.audit_time_from ?? null, f.audit_time_from ?? null)
  params.push(f.audit_time_to ?? null, f.audit_time_to ?? null)
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
    row.plan_no ?? null,
    row.title ?? null,
    row.year ?? null,
    row.dept_id ?? null,
    row.applicant_id ?? null,
    row.items ?? null,
    row.total_amount ?? null,
    row.status ?? null,
    row.audit_opinion ?? null,
    row.audit_by ?? null,
    row.audit_time ?? null,
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
  const __t = currentTenant()
  const params = [
    data.tenant_id ?? null,
    data.plan_no ?? null,
    data.title ?? null,
    data.year ?? null,
    data.dept_id ?? null,
    data.applicant_id ?? null,
    data.items ?? null,
    data.total_amount ?? null,
    data.status ?? null,
    data.audit_opinion ?? null,
    data.audit_by ?? null,
    data.audit_time ?? null,
    data.remark ?? null,
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

