// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'
import { currentTenant } from '../tenantContext.js'

const TABLE = 'pur_contract'
export const TABLE_NAME = TABLE
const DEFAULTS = {"amount":0}
const KW_COLS = ["contract_no","contract_name","supplier"]

const LIST_SQL = "SELECT * FROM pur_contract WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR contract_no LIKE ? OR contract_name LIKE ? OR supplier LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR contract_no = ? ) AND ( ? IS NULL OR contract_name = ? ) AND ( ? IS NULL OR supplier = ? ) AND ( ? IS NULL OR sign_date = ? ) AND ( ? IS NULL OR effective_date = ? ) AND ( ? IS NULL OR expire_date = ? ) AND ( ? IS NULL OR amount = ? ) AND ( ? IS NULL OR file_url = ? ) AND ( ? IS NULL OR software_ids = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR sign_date >= ? ) AND ( ? IS NULL OR sign_date <= ? ) AND ( ? IS NULL OR effective_date >= ? ) AND ( ? IS NULL OR effective_date <= ? ) AND ( ? IS NULL OR expire_date >= ? ) AND ( ? IS NULL OR expire_date <= ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM pur_contract WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR contract_no LIKE ? OR contract_name LIKE ? OR supplier LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR contract_no = ? ) AND ( ? IS NULL OR contract_name = ? ) AND ( ? IS NULL OR supplier = ? ) AND ( ? IS NULL OR sign_date = ? ) AND ( ? IS NULL OR effective_date = ? ) AND ( ? IS NULL OR expire_date = ? ) AND ( ? IS NULL OR amount = ? ) AND ( ? IS NULL OR file_url = ? ) AND ( ? IS NULL OR software_ids = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR sign_date >= ? ) AND ( ? IS NULL OR sign_date <= ? ) AND ( ? IS NULL OR effective_date >= ? ) AND ( ? IS NULL OR effective_date <= ? ) AND ( ? IS NULL OR expire_date >= ? ) AND ( ? IS NULL OR expire_date <= ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM pur_contract WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? ) AND ( ? IS NULL OR contract_no LIKE ? OR contract_name LIKE ? OR supplier LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR contract_no = ? ) AND ( ? IS NULL OR contract_name = ? ) AND ( ? IS NULL OR supplier = ? ) AND ( ? IS NULL OR sign_date = ? ) AND ( ? IS NULL OR effective_date = ? ) AND ( ? IS NULL OR expire_date = ? ) AND ( ? IS NULL OR amount = ? ) AND ( ? IS NULL OR file_url = ? ) AND ( ? IS NULL OR software_ids = ? ) AND ( ? IS NULL OR remark = ? ) AND ( ? IS NULL OR sign_date >= ? ) AND ( ? IS NULL OR sign_date <= ? ) AND ( ? IS NULL OR effective_date >= ? ) AND ( ? IS NULL OR effective_date <= ? ) AND ( ? IS NULL OR expire_date >= ? ) AND ( ? IS NULL OR expire_date <= ? )"
const GET_SQL = "SELECT * FROM pur_contract WHERE id = ? AND is_deleted = 0 AND ( ? IS NULL OR tenant_id = ? )"
const INSERT_SQL = "INSERT INTO pur_contract (tenant_id, contract_no, contract_name, supplier, sign_date, effective_date, expire_date, amount, file_url, software_ids, remark, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE pur_contract SET tenant_id = COALESCE(?, tenant_id), contract_no = COALESCE(?, contract_no), contract_name = COALESCE(?, contract_name), supplier = COALESCE(?, supplier), sign_date = COALESCE(?, sign_date), effective_date = COALESCE(?, effective_date), expire_date = COALESCE(?, expire_date), amount = COALESCE(?, amount), file_url = COALESCE(?, file_url), software_ids = COALESCE(?, software_ids), remark = COALESCE(?, remark), update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const DELETE_SQL = "UPDATE pur_contract SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ? AND ( ? IS NULL OR tenant_id = ? )"
const PURGE_SQL = "DELETE FROM pur_contract WHERE tenant_id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const __t = currentTenant()
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(__t, __t)
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.contract_no ?? null, f.contract_no ?? null)
  params.push(f.contract_name ?? null, f.contract_name ?? null)
  params.push(f.supplier ?? null, f.supplier ?? null)
  params.push(f.sign_date ?? null, f.sign_date ?? null)
  params.push(f.effective_date ?? null, f.effective_date ?? null)
  params.push(f.expire_date ?? null, f.expire_date ?? null)
  params.push(f.amount ?? null, f.amount ?? null)
  params.push(f.file_url ?? null, f.file_url ?? null)
  params.push(f.software_ids ?? null, f.software_ids ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.sign_date_from ?? null, f.sign_date_from ?? null)
  params.push(f.sign_date_to ?? null, f.sign_date_to ?? null)
  params.push(f.effective_date_from ?? null, f.effective_date_from ?? null)
  params.push(f.effective_date_to ?? null, f.effective_date_to ?? null)
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
  params.push(f.contract_no ?? null, f.contract_no ?? null)
  params.push(f.contract_name ?? null, f.contract_name ?? null)
  params.push(f.supplier ?? null, f.supplier ?? null)
  params.push(f.sign_date ?? null, f.sign_date ?? null)
  params.push(f.effective_date ?? null, f.effective_date ?? null)
  params.push(f.expire_date ?? null, f.expire_date ?? null)
  params.push(f.amount ?? null, f.amount ?? null)
  params.push(f.file_url ?? null, f.file_url ?? null)
  params.push(f.software_ids ?? null, f.software_ids ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.sign_date_from ?? null, f.sign_date_from ?? null)
  params.push(f.sign_date_to ?? null, f.sign_date_to ?? null)
  params.push(f.effective_date_from ?? null, f.effective_date_from ?? null)
  params.push(f.effective_date_to ?? null, f.effective_date_to ?? null)
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
  params.push(f.contract_no ?? null, f.contract_no ?? null)
  params.push(f.contract_name ?? null, f.contract_name ?? null)
  params.push(f.supplier ?? null, f.supplier ?? null)
  params.push(f.sign_date ?? null, f.sign_date ?? null)
  params.push(f.effective_date ?? null, f.effective_date ?? null)
  params.push(f.expire_date ?? null, f.expire_date ?? null)
  params.push(f.amount ?? null, f.amount ?? null)
  params.push(f.file_url ?? null, f.file_url ?? null)
  params.push(f.software_ids ?? null, f.software_ids ?? null)
  params.push(f.remark ?? null, f.remark ?? null)
  params.push(f.sign_date_from ?? null, f.sign_date_from ?? null)
  params.push(f.sign_date_to ?? null, f.sign_date_to ?? null)
  params.push(f.effective_date_from ?? null, f.effective_date_from ?? null)
  params.push(f.effective_date_to ?? null, f.effective_date_to ?? null)
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
    row.contract_no ?? null,
    row.contract_name ?? null,
    row.supplier ?? null,
    row.sign_date ?? null,
    row.effective_date ?? null,
    row.expire_date ?? null,
    row.amount ?? null,
    row.file_url ?? null,
    row.software_ids ?? null,
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
    data.contract_no ?? null,
    data.contract_name ?? null,
    data.supplier ?? null,
    data.sign_date ?? null,
    data.effective_date ?? null,
    data.expire_date ?? null,
    data.amount ?? null,
    data.file_url ?? null,
    data.software_ids ?? null,
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

