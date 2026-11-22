// 本文件由 scripts/gen-queries.js 依据 scripts/query-defs/flow.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定 + 同函数执行
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { currentTenant } from '../tenantContext.js'

// 安装维护申请分页列表（含计算机/申请人/部门名）
const APPLYROWS_SQL = `SELECT a.*, c.computer_no, c.brand, u.real_name AS applicant_name, d.dept_name, c.user_id AS computer_user_id
FROM flow_maint_apply a
LEFT JOIN asset_computer c ON c.id = a.computer_id
LEFT JOIN sys_user u ON u.id = a.applicant_id
LEFT JOIN sys_dept d ON d.id = a.dept_id
WHERE a.is_deleted = 0
AND ( ? IS NULL OR a.tenant_id = ? )
AND ( ? IS NULL OR a.apply_no LIKE CONCAT('%', ?, '%') OR a.software_name LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR a.status = ? )
AND ( ? IS NULL OR a.apply_type = ? )
AND ( ? IS NULL OR a.applicant_id = ? )
AND ( ? IS NULL OR a.dept_id = ? )
AND ( ? IS NULL OR a.computer_id = ? )
AND ( ? IS NULL OR c.user_id = ? )
ORDER BY a.id DESC
LIMIT ? OFFSET ?`

const applyRows_params = function params(f = {}, paging = {}) {
      const ps = Math.max(1, Number(paging.pageSize) || 10)
      const pg = Math.max(1, Number(paging.page) || 1)
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.status ?? null, f.status ?? null,
        f.applyType ?? null, f.applyType ?? null,
        f.applicantId ?? null, f.applicantId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.computerId ?? null, f.computerId ?? null,
        f.computerUserId ?? null, f.computerUserId ?? null,
        ps, (pg - 1) * ps
      ]
    }

/** 安装维护申请分页列表（含计算机/申请人/部门名） */
export async function applyRows(f = {}, paging = {}) {
  const params = applyRows_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(APPLYROWS_SQL)
    return st.all(...params)
  }
  return (await c.query(APPLYROWS_SQL, params))[0]
}

// 安装维护申请计数
const APPLYCOUNT_SQL = `SELECT COUNT(*) AS n
FROM flow_maint_apply a
LEFT JOIN asset_computer c ON c.id = a.computer_id
WHERE a.is_deleted = 0
AND ( ? IS NULL OR a.tenant_id = ? )
AND ( ? IS NULL OR a.apply_no LIKE CONCAT('%', ?, '%') OR a.software_name LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR a.status = ? )
AND ( ? IS NULL OR a.apply_type = ? )
AND ( ? IS NULL OR a.applicant_id = ? )
AND ( ? IS NULL OR a.dept_id = ? )
AND ( ? IS NULL OR a.computer_id = ? )
AND ( ? IS NULL OR c.user_id = ? )`

const applyCount_params = function params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.status ?? null, f.status ?? null,
        f.applyType ?? null, f.applyType ?? null,
        f.applicantId ?? null, f.applicantId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.computerId ?? null, f.computerId ?? null,
        f.computerUserId ?? null, f.computerUserId ?? null
      ]
    }

/** 安装维护申请计数 */
export async function applyCount(f = {}, paging = {}) {
  const params = applyCount_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(APPLYCOUNT_SQL)
    const rows = st.all(...params)
    return Number(rows[0] ? rows[0].n : 0)
  }
  const rows = (await c.query(APPLYCOUNT_SQL, params))[0]
  return Number(rows[0] ? rows[0].n : 0)
}
