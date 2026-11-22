// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'
import { currentTenant } from '../tenantContext.js'

const TABLE = 'pur_entitlement'
export const TABLE_NAME = TABLE
const DEFAULTS = {"contract_id":0,"license_qty":0,"purchase_amount":0,"purchase_method":1}
const KW_COLS = ["auth_type","license_type","usable_version"]

const LIST_SQL = "SELECT * FROM pur_entitlement WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR auth_type LIKE ? OR license_type LIKE ? OR usable_version LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR contract_id = ? ) AND ( ? IS NULL OR auth_type = ? ) AND ( ? IS NULL OR license_type = ? ) AND ( ? IS NULL OR license_qty = ? ) AND ( ? IS NULL OR purchase_date = ? ) AND ( ? IS NULL OR purchase_amount = ? ) AND ( ? IS NULL OR purchase_method = ? ) AND ( ? IS NULL OR usable_version = ? ) AND ( ? IS NULL OR license_term = ? ) AND ( ? IS NULL OR expire_date = ? ) AND ( ? IS NULL OR serial_no = ? ) AND ( ? IS NULL OR activation_code = ? ) AND ( ? IS NULL OR auth_file_url = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR purchase_date >= ? ) AND ( ? IS NULL OR purchase_date <= ? ) AND ( ? IS NULL OR expire_date >= ? ) AND ( ? IS NULL OR expire_date <= ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM pur_entitlement WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR auth_type LIKE ? OR license_type LIKE ? OR usable_version LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR contract_id = ? ) AND ( ? IS NULL OR auth_type = ? ) AND ( ? IS NULL OR license_type = ? ) AND ( ? IS NULL OR license_qty = ? ) AND ( ? IS NULL OR purchase_date = ? ) AND ( ? IS NULL OR purchase_amount = ? ) AND ( ? IS NULL OR purchase_method = ? ) AND ( ? IS NULL OR usable_version = ? ) AND ( ? IS NULL OR license_term = ? ) AND ( ? IS NULL OR expire_date = ? ) AND ( ? IS NULL OR serial_no = ? ) AND ( ? IS NULL OR activation_code = ? ) AND ( ? IS NULL OR auth_file_url = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR purchase_date >= ? ) AND ( ? IS NULL OR purchase_date <= ? ) AND ( ? IS NULL OR expire_date >= ? ) AND ( ? IS NULL OR expire_date <= ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM pur_entitlement WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR auth_type LIKE ? OR license_type LIKE ? OR usable_version LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR software_id = ? ) AND ( ? IS NULL OR contract_id = ? ) AND ( ? IS NULL OR auth_type = ? ) AND ( ? IS NULL OR license_type = ? ) AND ( ? IS NULL OR license_qty = ? ) AND ( ? IS NULL OR purchase_date = ? ) AND ( ? IS NULL OR purchase_amount = ? ) AND ( ? IS NULL OR purchase_method = ? ) AND ( ? IS NULL OR usable_version = ? ) AND ( ? IS NULL OR license_term = ? ) AND ( ? IS NULL OR expire_date = ? ) AND ( ? IS NULL OR serial_no = ? ) AND ( ? IS NULL OR activation_code = ? ) AND ( ? IS NULL OR auth_file_url = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR purchase_date >= ? ) AND ( ? IS NULL OR purchase_date <= ? ) AND ( ? IS NULL OR expire_date >= ? ) AND ( ? IS NULL OR expire_date <= ? )"
const GET_SQL = "SELECT * FROM pur_entitlement WHERE id = ? AND is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? )"
const INSERT_SQL = "INSERT INTO pur_entitlement (tenant_id, software_id, contract_id, auth_type, license_type, license_qty, purchase_date, purchase_amount, purchase_method, usable_version, license_term, expire_date, serial_no, activation_code, auth_file_url, remark, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE pur_entitlement SET tenant_id = COALESCE(?, tenant_id), software_id = COALESCE(?, software_id), contract_id = COALESCE(?, contract_id), auth_type = COALESCE(?, auth_type), license_type = COALESCE(?, license_type), license_qty = COALESCE(?, license_qty), purchase_date = COALESCE(?, purchase_date), purchase_amount = COALESCE(?, purchase_amount), purchase_method = COALESCE(?, purchase_method), usable_version = COALESCE(?, usable_version), license_term = COALESCE(?, license_term), expire_date = COALESCE(?, expire_date), serial_no = COALESCE(?, serial_no), activation_code = COALESCE(?, activation_code), auth_file_url = COALESCE(?, auth_file_url), remark = COALESCE(?, remark), update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const DELETE_SQL = "UPDATE pur_entitlement SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const PURGE_SQL = "DELETE FROM pur_entitlement WHERE tenant_id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.software_id ?? null, f.software_id ?? null)
  params.push(f.contract_id ?? null, f.contract_id ?? null)
  params.push(f.auth_type ?? null, f.auth_type ?? null)
  params.push(f.license_type ?? null, f.license_type ?? null)
  params.push(f.license_qty ?? null, f.license_qty ?? null)
  params.push(f.purchase_date ?? null, f.purchase_date ?? null)
  params.push(f.purchase_amount ?? null, f.purchase_amount ?? null)
  params.push(f.purchase_method ?? null, f.purchase_method ?? null)
  params.push(f.usable_version ?? null, f.usable_version ?? null)
  params.push(f.license_term ?? null, f.license_term ?? null)
  params.push(f.expire_date ?? null, f.expire_date ?? null)
  params.push(f.serial_no ?? null, f.serial_no ?? null)
  params.push(f.activation_code ?? null, f.activation_code ?? null)
  params.push(f.auth_file_url ?? null, f.auth_file_url ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.purchase_date_from ?? null, f.purchase_date_from ?? null)
  params.push(f.purchase_date_to ?? null, f.purchase_date_to ?? null)
  params.push(f.expire_date_from ?? null, f.expire_date_from ?? null)
  params.push(f.expire_date_to ?? null, f.expire_date_to ?? null)
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
  params.push(f.contract_id ?? null, f.contract_id ?? null)
  params.push(f.auth_type ?? null, f.auth_type ?? null)
  params.push(f.license_type ?? null, f.license_type ?? null)
  params.push(f.license_qty ?? null, f.license_qty ?? null)
  params.push(f.purchase_date ?? null, f.purchase_date ?? null)
  params.push(f.purchase_amount ?? null, f.purchase_amount ?? null)
  params.push(f.purchase_method ?? null, f.purchase_method ?? null)
  params.push(f.usable_version ?? null, f.usable_version ?? null)
  params.push(f.license_term ?? null, f.license_term ?? null)
  params.push(f.expire_date ?? null, f.expire_date ?? null)
  params.push(f.serial_no ?? null, f.serial_no ?? null)
  params.push(f.activation_code ?? null, f.activation_code ?? null)
  params.push(f.auth_file_url ?? null, f.auth_file_url ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.purchase_date_from ?? null, f.purchase_date_from ?? null)
  params.push(f.purchase_date_to ?? null, f.purchase_date_to ?? null)
  params.push(f.expire_date_from ?? null, f.expire_date_from ?? null)
  params.push(f.expire_date_to ?? null, f.expire_date_to ?? null)
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
  params.push(f.contract_id ?? null, f.contract_id ?? null)
  params.push(f.auth_type ?? null, f.auth_type ?? null)
  params.push(f.license_type ?? null, f.license_type ?? null)
  params.push(f.license_qty ?? null, f.license_qty ?? null)
  params.push(f.purchase_date ?? null, f.purchase_date ?? null)
  params.push(f.purchase_amount ?? null, f.purchase_amount ?? null)
  params.push(f.purchase_method ?? null, f.purchase_method ?? null)
  params.push(f.usable_version ?? null, f.usable_version ?? null)
  params.push(f.license_term ?? null, f.license_term ?? null)
  params.push(f.expire_date ?? null, f.expire_date ?? null)
  params.push(f.serial_no ?? null, f.serial_no ?? null)
  params.push(f.activation_code ?? null, f.activation_code ?? null)
  params.push(f.auth_file_url ?? null, f.auth_file_url ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.purchase_date_from ?? null, f.purchase_date_from ?? null)
  params.push(f.purchase_date_to ?? null, f.purchase_date_to ?? null)
  params.push(f.expire_date_from ?? null, f.expire_date_from ?? null)
  params.push(f.expire_date_to ?? null, f.expire_date_to ?? null)
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
    row.contract_id ?? null,
    row.auth_type ?? null,
    row.license_type ?? null,
    row.license_qty ?? null,
    row.purchase_date ?? null,
    row.purchase_amount ?? null,
    row.purchase_method ?? null,
    row.usable_version ?? null,
    row.license_term ?? null,
    row.expire_date ?? null,
    row.serial_no ?? null,
    row.activation_code ?? null,
    row.auth_file_url ?? null,
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
    data.software_id ?? null,
    data.contract_id ?? null,
    data.auth_type ?? null,
    data.license_type ?? null,
    data.license_qty ?? null,
    data.purchase_date ?? null,
    data.purchase_amount ?? null,
    data.purchase_method ?? null,
    data.usable_version ?? null,
    data.license_term ?? null,
    data.expire_date ?? null,
    data.serial_no ?? null,
    data.activation_code ?? null,
    data.auth_file_url ?? null,
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

