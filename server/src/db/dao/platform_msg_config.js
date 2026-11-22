// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { nowStr } from '../util.js'

const TABLE = 'platform_msg_config'
export const TABLE_NAME = TABLE
const DEFAULTS = {"sms_enabled":0,"sms_mode":"mock","smtp_enabled":0,"smtp_port":465,"smtp_secure":1}
const KW_COLS = ["sms_mode","sms_access_key_id","sms_access_key_secret"]

const LIST_SQL = "SELECT * FROM platform_msg_config WHERE is_deleted = 0 AND ( ? IS NULL OR sms_mode LIKE ? OR sms_access_key_id LIKE ? OR sms_access_key_secret LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR sms_enabled = ? ) AND ( ? IS NULL OR sms_mode = ? ) AND ( ? IS NULL OR sms_access_key_id = ? ) AND ( ? IS NULL OR sms_access_key_secret = ? ) AND ( ? IS NULL OR sms_sign_name = ? ) AND ( ? IS NULL OR sms_template_code = ? ) AND ( ? IS NULL OR smtp_enabled = ? ) AND ( ? IS NULL OR smtp_host = ? ) AND ( ? IS NULL OR smtp_port = ? ) AND ( ? IS NULL OR smtp_secure = ? ) AND ( ? IS NULL OR smtp_user = ? ) AND ( ? IS NULL OR smtp_pass = ? ) AND ( ? IS NULL OR smtp_from = ? ) ORDER BY id DESC LIMIT ? OFFSET ?"
const LIST_ALL_SQL = "SELECT * FROM platform_msg_config WHERE is_deleted = 0 AND ( ? IS NULL OR sms_mode LIKE ? OR sms_access_key_id LIKE ? OR sms_access_key_secret LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR sms_enabled = ? ) AND ( ? IS NULL OR sms_mode = ? ) AND ( ? IS NULL OR sms_access_key_id = ? ) AND ( ? IS NULL OR sms_access_key_secret = ? ) AND ( ? IS NULL OR sms_sign_name = ? ) AND ( ? IS NULL OR sms_template_code = ? ) AND ( ? IS NULL OR smtp_enabled = ? ) AND ( ? IS NULL OR smtp_host = ? ) AND ( ? IS NULL OR smtp_port = ? ) AND ( ? IS NULL OR smtp_secure = ? ) AND ( ? IS NULL OR smtp_user = ? ) AND ( ? IS NULL OR smtp_pass = ? ) AND ( ? IS NULL OR smtp_from = ? ) ORDER BY id DESC"
const COUNT_SQL = "SELECT COUNT(*) AS n FROM platform_msg_config WHERE is_deleted = 0 AND ( ? IS NULL OR sms_mode LIKE ? OR sms_access_key_id LIKE ? OR sms_access_key_secret LIKE ? ) AND ( ? IS NULL OR id = ? ) AND ( ? IS NULL OR sms_enabled = ? ) AND ( ? IS NULL OR sms_mode = ? ) AND ( ? IS NULL OR sms_access_key_id = ? ) AND ( ? IS NULL OR sms_access_key_secret = ? ) AND ( ? IS NULL OR sms_sign_name = ? ) AND ( ? IS NULL OR sms_template_code = ? ) AND ( ? IS NULL OR smtp_enabled = ? ) AND ( ? IS NULL OR smtp_host = ? ) AND ( ? IS NULL OR smtp_port = ? ) AND ( ? IS NULL OR smtp_secure = ? ) AND ( ? IS NULL OR smtp_user = ? ) AND ( ? IS NULL OR smtp_pass = ? ) AND ( ? IS NULL OR smtp_from = ? )"
const GET_SQL = "SELECT * FROM platform_msg_config WHERE id = ? AND is_deleted = 0"
const INSERT_SQL = "INSERT INTO platform_msg_config (sms_enabled, sms_mode, sms_access_key_id, sms_access_key_secret, sms_sign_name, sms_template_code, smtp_enabled, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, smtp_from, create_time, update_time, create_by, update_by, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
const UPDATE_SQL = "UPDATE platform_msg_config SET sms_enabled = COALESCE(?, sms_enabled), sms_mode = COALESCE(?, sms_mode), sms_access_key_id = COALESCE(?, sms_access_key_id), sms_access_key_secret = COALESCE(?, sms_access_key_secret), sms_sign_name = COALESCE(?, sms_sign_name), sms_template_code = COALESCE(?, sms_template_code), smtp_enabled = COALESCE(?, smtp_enabled), smtp_host = COALESCE(?, smtp_host), smtp_port = COALESCE(?, smtp_port), smtp_secure = COALESCE(?, smtp_secure), smtp_user = COALESCE(?, smtp_user), smtp_pass = COALESCE(?, smtp_pass), smtp_from = COALESCE(?, smtp_from), update_time = ?, update_by = ? WHERE id = ?"
const DELETE_SQL = "UPDATE platform_msg_config SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ?"

/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */
export async function list(f = {}, paging = {}) {
  const params = []
  const kw = f._kw ? '%' + f._kw + '%' : null
  params.push(f._kw ?? null, kw, kw, kw)
  params.push(f.id ?? null, f.id ?? null)
  params.push(f.sms_enabled ?? null, f.sms_enabled ?? null)
  params.push(f.sms_mode ?? null, f.sms_mode ?? null)
  params.push(f.sms_access_key_id ?? null, f.sms_access_key_id ?? null)
  params.push(f.sms_access_key_secret ?? null, f.sms_access_key_secret ?? null)
  params.push(f.sms_sign_name ?? null, f.sms_sign_name ?? null)
  params.push(f.sms_template_code ?? null, f.sms_template_code ?? null)
  params.push(f.smtp_enabled ?? null, f.smtp_enabled ?? null)
  params.push(f.smtp_host ?? null, f.smtp_host ?? null)
  params.push(f.smtp_port ?? null, f.smtp_port ?? null)
  params.push(f.smtp_secure ?? null, f.smtp_secure ?? null)
  params.push(f.smtp_user ?? null, f.smtp_user ?? null)
  params.push(f.smtp_pass ?? null, f.smtp_pass ?? null)
  params.push(f.smtp_from ?? null, f.smtp_from ?? null)
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
  params.push(f.sms_enabled ?? null, f.sms_enabled ?? null)
  params.push(f.sms_mode ?? null, f.sms_mode ?? null)
  params.push(f.sms_access_key_id ?? null, f.sms_access_key_id ?? null)
  params.push(f.sms_access_key_secret ?? null, f.sms_access_key_secret ?? null)
  params.push(f.sms_sign_name ?? null, f.sms_sign_name ?? null)
  params.push(f.sms_template_code ?? null, f.sms_template_code ?? null)
  params.push(f.smtp_enabled ?? null, f.smtp_enabled ?? null)
  params.push(f.smtp_host ?? null, f.smtp_host ?? null)
  params.push(f.smtp_port ?? null, f.smtp_port ?? null)
  params.push(f.smtp_secure ?? null, f.smtp_secure ?? null)
  params.push(f.smtp_user ?? null, f.smtp_user ?? null)
  params.push(f.smtp_pass ?? null, f.smtp_pass ?? null)
  params.push(f.smtp_from ?? null, f.smtp_from ?? null)
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
  params.push(f.sms_enabled ?? null, f.sms_enabled ?? null)
  params.push(f.sms_mode ?? null, f.sms_mode ?? null)
  params.push(f.sms_access_key_id ?? null, f.sms_access_key_id ?? null)
  params.push(f.sms_access_key_secret ?? null, f.sms_access_key_secret ?? null)
  params.push(f.sms_sign_name ?? null, f.sms_sign_name ?? null)
  params.push(f.sms_template_code ?? null, f.sms_template_code ?? null)
  params.push(f.smtp_enabled ?? null, f.smtp_enabled ?? null)
  params.push(f.smtp_host ?? null, f.smtp_host ?? null)
  params.push(f.smtp_port ?? null, f.smtp_port ?? null)
  params.push(f.smtp_secure ?? null, f.smtp_secure ?? null)
  params.push(f.smtp_user ?? null, f.smtp_user ?? null)
  params.push(f.smtp_pass ?? null, f.smtp_pass ?? null)
  params.push(f.smtp_from ?? null, f.smtp_from ?? null)
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
    row.sms_enabled ?? null,
    row.sms_mode ?? null,
    row.sms_access_key_id ?? null,
    row.sms_access_key_secret ?? null,
    row.sms_sign_name ?? null,
    row.sms_template_code ?? null,
    row.smtp_enabled ?? null,
    row.smtp_host ?? null,
    row.smtp_port ?? null,
    row.smtp_secure ?? null,
    row.smtp_user ?? null,
    row.smtp_pass ?? null,
    row.smtp_from ?? null,
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
    data.sms_enabled ?? null,
    data.sms_mode ?? null,
    data.sms_access_key_id ?? null,
    data.sms_access_key_secret ?? null,
    data.sms_sign_name ?? null,
    data.sms_template_code ?? null,
    data.smtp_enabled ?? null,
    data.smtp_host ?? null,
    data.smtp_port ?? null,
    data.smtp_secure ?? null,
    data.smtp_user ?? null,
    data.smtp_pass ?? null,
    data.smtp_from ?? null,
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

