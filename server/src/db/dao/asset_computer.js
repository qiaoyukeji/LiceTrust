// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'
import { currentTenant } from '../tenantContext.js'

const TABLE = 'asset_computer'
export const TABLE_NAME = TABLE
const DEFAULTS = {"user_id":0,"status":1}
const KW_COLS = ["computer_no","asset_no","brand"]

const LIST_SQL = "SELECT * FROM asset_computer WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR computer_no LIKE ? OR asset_no LIKE ? OR brand LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR computer_no = ? ) AND ( ? IS NULL OR asset_no = ? ) AND ( ? IS NULL OR brand = ? ) AND ( ? IS NULL OR model = ? ) AND ( ? IS NULL OR sn = ? ) AND ( ? IS NULL OR computer_type = ? ) AND ( ? IS NULL OR org_id = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR location = ? ) AND ( ? IS NULL OR enable_date = ? ) AND ( ? IS NULL OR purchase_date = ? ) AND ( ? IS NULL OR report_time = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR enable_date >= ? ) AND ( ? IS NULL OR enable_date <= ? ) AND ( ? IS NULL OR purchase_date >= ? ) AND ( ? IS NULL OR purchase_date <= ? ) AND ( ? IS NULL OR report_time >= ? ) AND ( ? IS NULL OR report_time <= ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM asset_computer WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR computer_no LIKE ? OR asset_no LIKE ? OR brand LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR computer_no = ? ) AND ( ? IS NULL OR asset_no = ? ) AND ( ? IS NULL OR brand = ? ) AND ( ? IS NULL OR model = ? ) AND ( ? IS NULL OR sn = ? ) AND ( ? IS NULL OR computer_type = ? ) AND ( ? IS NULL OR org_id = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR location = ? ) AND ( ? IS NULL OR enable_date = ? ) AND ( ? IS NULL OR purchase_date = ? ) AND ( ? IS NULL OR report_time = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR enable_date >= ? ) AND ( ? IS NULL OR enable_date <= ? ) AND ( ? IS NULL OR purchase_date >= ? ) AND ( ? IS NULL OR purchase_date <= ? ) AND ( ? IS NULL OR report_time >= ? ) AND ( ? IS NULL OR report_time <= ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM asset_computer WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR computer_no LIKE ? OR asset_no LIKE ? OR brand LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR computer_no = ? ) AND ( ? IS NULL OR asset_no = ? ) AND ( ? IS NULL OR brand = ? ) AND ( ? IS NULL OR model = ? ) AND ( ? IS NULL OR sn = ? ) AND ( ? IS NULL OR computer_type = ? ) AND ( ? IS NULL OR org_id = ? ) AND ( ? IS NULL OR dept_id = ? ) AND ( ? IS NULL OR user_id = ? ) AND ( ? IS NULL OR location = ? ) AND ( ? IS NULL OR enable_date = ? ) AND ( ? IS NULL OR purchase_date = ? ) AND ( ? IS NULL OR report_time = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR enable_date >= ? ) AND ( ? IS NULL OR enable_date <= ? ) AND ( ? IS NULL OR purchase_date >= ? ) AND ( ? IS NULL OR purchase_date <= ? ) AND ( ? IS NULL OR report_time >= ? ) AND ( ? IS NULL OR report_time <= ? )"
const GET_SQL = "SELECT * FROM asset_computer WHERE id = ? AND is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? )"
const INSERT_SQL = "INSERT INTO asset_computer (tenant_id, computer_no, asset_no, brand, model, sn, computer_type, org_id, dept_id, user_id, location, enable_date, purchase_date, report_time, status, remark, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE asset_computer SET tenant_id = COALESCE(?, tenant_id), computer_no = COALESCE(?, computer_no), asset_no = COALESCE(?, asset_no), brand = COALESCE(?, brand), model = COALESCE(?, model), sn = COALESCE(?, sn), computer_type = COALESCE(?, computer_type), org_id = COALESCE(?, org_id), dept_id = COALESCE(?, dept_id), user_id = COALESCE(?, user_id), location = COALESCE(?, location), enable_date = COALESCE(?, enable_date), purchase_date = COALESCE(?, purchase_date), report_time = COALESCE(?, report_time), status = COALESCE(?, status), remark = COALESCE(?, remark), update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const DELETE_SQL = "UPDATE asset_computer SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const PURGE_SQL = "DELETE FROM asset_computer WHERE tenant_id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.computer_no ?? null, f.computer_no ?? null)
  params.push(f.asset_no ?? null, f.asset_no ?? null)
  params.push(f.brand ?? null, f.brand ?? null)
  params.push(f.model ?? null, f.model ?? null)
  params.push(f.sn ?? null, f.sn ?? null)
  params.push(f.computer_type ?? null, f.computer_type ?? null)
  params.push(f.org_id ?? null, f.org_id ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.location ?? null, f.location ?? null)
  params.push(f.enable_date ?? null, f.enable_date ?? null)
  params.push(f.purchase_date ?? null, f.purchase_date ?? null)
  params.push(f.report_time ?? null, f.report_time ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.enable_date_from ?? null, f.enable_date_from ?? null)
  params.push(f.enable_date_to ?? null, f.enable_date_to ?? null)
  params.push(f.purchase_date_from ?? null, f.purchase_date_from ?? null)
  params.push(f.purchase_date_to ?? null, f.purchase_date_to ?? null)
  params.push(f.report_time_from ?? null, f.report_time_from ?? null)
  params.push(f.report_time_to ?? null, f.report_time_to ?? null)
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
  params.push(f.computer_no ?? null, f.computer_no ?? null)
  params.push(f.asset_no ?? null, f.asset_no ?? null)
  params.push(f.brand ?? null, f.brand ?? null)
  params.push(f.model ?? null, f.model ?? null)
  params.push(f.sn ?? null, f.sn ?? null)
  params.push(f.computer_type ?? null, f.computer_type ?? null)
  params.push(f.org_id ?? null, f.org_id ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.location ?? null, f.location ?? null)
  params.push(f.enable_date ?? null, f.enable_date ?? null)
  params.push(f.purchase_date ?? null, f.purchase_date ?? null)
  params.push(f.report_time ?? null, f.report_time ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.enable_date_from ?? null, f.enable_date_from ?? null)
  params.push(f.enable_date_to ?? null, f.enable_date_to ?? null)
  params.push(f.purchase_date_from ?? null, f.purchase_date_from ?? null)
  params.push(f.purchase_date_to ?? null, f.purchase_date_to ?? null)
  params.push(f.report_time_from ?? null, f.report_time_from ?? null)
  params.push(f.report_time_to ?? null, f.report_time_to ?? null)
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
  params.push(f.computer_no ?? null, f.computer_no ?? null)
  params.push(f.asset_no ?? null, f.asset_no ?? null)
  params.push(f.brand ?? null, f.brand ?? null)
  params.push(f.model ?? null, f.model ?? null)
  params.push(f.sn ?? null, f.sn ?? null)
  params.push(f.computer_type ?? null, f.computer_type ?? null)
  params.push(f.org_id ?? null, f.org_id ?? null)
  params.push(f.dept_id ?? null, f.dept_id ?? null)
  params.push(f.user_id ?? null, f.user_id ?? null)
  params.push(f.location ?? null, f.location ?? null)
  params.push(f.enable_date ?? null, f.enable_date ?? null)
  params.push(f.purchase_date ?? null, f.purchase_date ?? null)
  params.push(f.report_time ?? null, f.report_time ?? null)
  params.push(f.status ?? null, f.status ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.enable_date_from ?? null, f.enable_date_from ?? null)
  params.push(f.enable_date_to ?? null, f.enable_date_to ?? null)
  params.push(f.purchase_date_from ?? null, f.purchase_date_from ?? null)
  params.push(f.purchase_date_to ?? null, f.purchase_date_to ?? null)
  params.push(f.report_time_from ?? null, f.report_time_from ?? null)
  params.push(f.report_time_to ?? null, f.report_time_to ?? null)
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
    row.computer_no ?? null,
    row.asset_no ?? null,
    row.brand ?? null,
    row.model ?? null,
    row.sn ?? null,
    row.computer_type ?? null,
    row.org_id ?? null,
    row.dept_id ?? null,
    row.user_id ?? null,
    row.location ?? null,
    row.enable_date ?? null,
    row.purchase_date ?? null,
    row.report_time ?? null,
    row.status ?? null,
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
    data.computer_no ?? null,
    data.asset_no ?? null,
    data.brand ?? null,
    data.model ?? null,
    data.sn ?? null,
    data.computer_type ?? null,
    data.org_id ?? null,
    data.dept_id ?? null,
    data.user_id ?? null,
    data.location ?? null,
    data.enable_date ?? null,
    data.purchase_date ?? null,
    data.report_time ?? null,
    data.status ?? null,
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

