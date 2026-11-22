// 本文件由 scripts/gen-queries.js 依据 scripts/query-defs/system.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定 + 同函数执行
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { currentTenant } from '../tenantContext.js'

// 字典项（平台通用 ∨ 查看者自有；平台上下文返回全量）
const DICTITEMS_SQL = `SELECT d.*
FROM sys_dict d
WHERE d.is_deleted = 0
AND d.dict_type = ?
AND ( ? IS NULL OR d.tenant_id = 0 OR d.tenant_id = ? )
ORDER BY d.tenant_id ASC, d.sort_no ASC, d.id ASC`

const dictItems_params = function params(f = {}) {
      const __t = currentTenant()
      return [f.type ?? null, __t, __t]
    }

/** 字典项（平台通用 ∨ 查看者自有；平台上下文返回全量） */
export async function dictItems(f = {}, paging = {}) {
  const params = dictItems_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(DICTITEMS_SQL)
    return st.all(...params)
  }
  return (await c.query(DICTITEMS_SQL, params))[0]
}

// 角色列表（平台预置 ∨ 查看者自有；平台上下文返回全量）
const ROLEROWS_SQL = `SELECT r.*
FROM sys_role r
WHERE r.is_deleted = 0
AND ( ? IS NULL OR r.tenant_id = 0 OR r.tenant_id = ? )
ORDER BY r.id ASC`

const roleRows_params = function params() {
      const __t = currentTenant()
      return [__t, __t]
    }

/** 角色列表（平台预置 ∨ 查看者自有；平台上下文返回全量） */
export async function roleRows(f = {}, paging = {}) {
  const params = roleRows_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(ROLEROWS_SQL)
    return st.all(...params)
  }
  return (await c.query(ROLEROWS_SQL, params))[0]
}

// 用户分页列表（含单位/部门名）
const USERROWS_SQL = `SELECT u.*, o.org_name, d.dept_name
FROM sys_user u
LEFT JOIN sys_org o ON o.id = u.org_id
LEFT JOIN sys_dept d ON d.id = u.dept_id
WHERE u.is_deleted = 0
AND ( ? IS NULL OR u.tenant_id = ? )
AND ( ? IS NULL OR u.username = ? )
AND ( ? IS NULL OR u.real_name LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR u.org_id = ? )
AND ( ? IS NULL OR u.dept_id = ? )
AND ( ? IS NULL OR u.status = ? )
ORDER BY u.id DESC
LIMIT ? OFFSET ?`

const userRows_params = function params(f = {}, paging = {}) {
      const ps = Math.max(1, Number(paging.pageSize) || 10)
      const pg = Math.max(1, Number(paging.page) || 1)
      const __t = currentTenant()
      return [
        __t, __t,
        f.username ?? null, f.username ?? null,
        f.kw ?? null, f.kw ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.status ?? null, f.status ?? null,
        ps, (pg - 1) * ps
      ]
    }

/** 用户分页列表（含单位/部门名） */
export async function userRows(f = {}, paging = {}) {
  const params = userRows_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(USERROWS_SQL)
    return st.all(...params)
  }
  return (await c.query(USERROWS_SQL, params))[0]
}

// 用户计数
const USERCOUNT_SQL = `SELECT COUNT(*) AS n FROM sys_user u
WHERE u.is_deleted = 0
AND ( ? IS NULL OR u.tenant_id = ? )
AND ( ? IS NULL OR u.username = ? )
AND ( ? IS NULL OR u.real_name LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR u.org_id = ? )
AND ( ? IS NULL OR u.dept_id = ? )
AND ( ? IS NULL OR u.status = ? )`

const userCount_params = function params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.username ?? null, f.username ?? null,
        f.kw ?? null, f.kw ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.status ?? null, f.status ?? null
      ]
    }

/** 用户计数 */
export async function userCount(f = {}, paging = {}) {
  const params = userCount_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(USERCOUNT_SQL)
    const rows = st.all(...params)
    return Number(rows[0] ? rows[0].n : 0)
  }
  const rows = (await c.query(USERCOUNT_SQL, params))[0]
  return Number(rows[0] ? rows[0].n : 0)
}
