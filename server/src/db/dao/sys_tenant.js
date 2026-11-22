// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'

const TABLE = 'sys_tenant'
export const TABLE_NAME = TABLE
const DEFAULTS = {"use_platform_sms":0,"sms_quota":0,"sms_used":0,"use_platform_email":0,"email_quota":0,"email_used":0,"status":1}
const KW_COLS = ["tenant_name","contact_person","contact_phone"]

const LIST_SQL = "SELECT * FROM sys_tenant WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR tenant_name = ? ) AND ( ? IS NULL OR contact_person = ? ) AND ( ? IS NULL OR contact_phone = ? ) AND ( ? IS NULL OR address = ? ) AND ( ? IS NULL OR industry = ? ) AND ( ? IS NULL OR use_platform_sms = ? ) AND ( ? IS NULL OR sms_quota = ? ) AND ( ? IS NULL OR sms_used = ? ) AND ( ? IS NULL OR use_platform_email = ? ) AND ( ? IS NULL OR email_quota = ? ) AND ( ? IS NULL OR email_used = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR remark = ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM sys_tenant WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR tenant_name = ? ) AND ( ? IS NULL OR contact_person = ? ) AND ( ? IS NULL OR contact_phone = ? ) AND ( ? IS NULL OR address = ? ) AND ( ? IS NULL OR industry = ? ) AND ( ? IS NULL OR use_platform_sms = ? ) AND ( ? IS NULL OR sms_quota = ? ) AND ( ? IS NULL OR sms_used = ? ) AND ( ? IS NULL OR use_platform_email = ? ) AND ( ? IS NULL OR email_quota = ? ) AND ( ? IS NULL OR email_used = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR remark = ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM sys_tenant WHERE is_deleted = 0 AND ( ? IS NULL OR tenant_name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR tenant_name = ? ) AND ( ? IS NULL OR contact_person = ? ) AND ( ? IS NULL OR contact_phone = ? ) AND ( ? IS NULL OR address = ? ) AND ( ? IS NULL OR industry = ? ) AND ( ? IS NULL OR use_platform_sms = ? ) AND ( ? IS NULL OR sms_quota = ? ) AND ( ? IS NULL OR sms_used = ? ) AND ( ? IS NULL OR use_platform_email = ? ) AND ( ? IS NULL OR email_quota = ? ) AND ( ? IS NULL OR email_used = ? ) AND ( ? IS NULL OR status = ? ) AND ( ? IS NULL OR remark = ? )"
const GET_SQL = "SELECT * FROM sys_tenant WHERE id = ? AND is_deleted = 0"
const INSERT_SQL = "INSERT INTO sys_tenant (tenant_name, contact_person, contact_phone, address, industry, use_platform_sms, sms_quota, sms_used, use_platform_email, email_quota, email_used, status, remark, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE sys_tenant SET tenant_name = COALESCE(?, tenant_name), contact_person = COALESCE(?, contact_person), contact_phone = COALESCE(?, contact_phone), address = COALESCE(?, address), industry = COALESCE(?, industry), use_platform_sms = COALESCE(?, use_platform_sms), sms_quota = COALESCE(?, sms_quota), sms_used = COALESCE(?, sms_used), use_platform_email = COALESCE(?, use_platform_email), email_quota = COALESCE(?, email_quota), email_used = COALESCE(?, email_used), status = COALESCE(?, status), remark = COALESCE(?, remark), update_time = ?, update_by = ? WHERE id = ?"
const DELETE_SQL = "UPDATE sys_tenant SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.tenant_name ?? null, f.tenant_name ?? null)
  params.push(f.contact_person ?? null, f.contact_person ?? null)
  params.push(f.contact_phone ?? null, f.contact_phone ?? null)
  params.push(f.address ?? null, f.address ?? null)
  params.push(f.industry ?? null, f.industry ?? null)
  params.push(f.use_platform_sms ?? null, f.use_platform_sms ?? null)
  params.push(f.sms_quota ?? null, f.sms_quota ?? null)
  params.push(f.sms_used ?? null, f.sms_used ?? null)
  params.push(f.use_platform_email ?? null, f.use_platform_email ?? null)
  params.push(f.email_quota ?? null, f.email_quota ?? null)
  params.push(f.email_used ?? null, f.email_used ?? null)
  params.push(f.status ?? null, f.status ?? null)
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
  params.push(f.tenant_name ?? null, f.tenant_name ?? null)
  params.push(f.contact_person ?? null, f.contact_person ?? null)
  params.push(f.contact_phone ?? null, f.contact_phone ?? null)
  params.push(f.address ?? null, f.address ?? null)
  params.push(f.industry ?? null, f.industry ?? null)
  params.push(f.use_platform_sms ?? null, f.use_platform_sms ?? null)
  params.push(f.sms_quota ?? null, f.sms_quota ?? null)
  params.push(f.sms_used ?? null, f.sms_used ?? null)
  params.push(f.use_platform_email ?? null, f.use_platform_email ?? null)
  params.push(f.email_quota ?? null, f.email_quota ?? null)
  params.push(f.email_used ?? null, f.email_used ?? null)
  params.push(f.status ?? null, f.status ?? null)
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
  params.push(f.tenant_name ?? null, f.tenant_name ?? null)
  params.push(f.contact_person ?? null, f.contact_person ?? null)
  params.push(f.contact_phone ?? null, f.contact_phone ?? null)
  params.push(f.address ?? null, f.address ?? null)
  params.push(f.industry ?? null, f.industry ?? null)
  params.push(f.use_platform_sms ?? null, f.use_platform_sms ?? null)
  params.push(f.sms_quota ?? null, f.sms_quota ?? null)
  params.push(f.sms_used ?? null, f.sms_used ?? null)
  params.push(f.use_platform_email ?? null, f.use_platform_email ?? null)
  params.push(f.email_quota ?? null, f.email_quota ?? null)
  params.push(f.email_used ?? null, f.email_used ?? null)
  params.push(f.status ?? null, f.status ?? null)
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
    row.tenant_name ?? null,
    row.contact_person ?? null,
    row.contact_phone ?? null,
    row.address ?? null,
    row.industry ?? null,
    row.use_platform_sms ?? null,
    row.sms_quota ?? null,
    row.sms_used ?? null,
    row.use_platform_email ?? null,
    row.email_quota ?? null,
    row.email_used ?? null,
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
  const params = [
    data.tenant_name ?? null,
    data.contact_person ?? null,
    data.contact_phone ?? null,
    data.address ?? null,
    data.industry ?? null,
    data.use_platform_sms ?? null,
    data.sms_quota ?? null,
    data.sms_used ?? null,
    data.use_platform_email ?? null,
    data.email_quota ?? null,
    data.email_used ?? null,
    data.status ?? null,
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

