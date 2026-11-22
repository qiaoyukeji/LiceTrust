/** 系统管理查询定义（用户/字典/角色）—— 三态租户可见性：平台全量、企业=平台通用∨自有 */
import { currentTenant } from '../../src/db/tenantContext.js'

export default [
  {
    module: 'system',
    name: 'dictItems',
    desc: '字典项（平台通用 ∨ 查看者自有；平台上下文返回全量）',
    sql: `
SELECT d.*
FROM sys_dict d
WHERE d.is_deleted = 0
AND d.dict_type = ?
AND ( ? IS NULL OR d.tenant_id = 0 OR d.tenant_id = ? )
ORDER BY d.tenant_id ASC, d.sort_no ASC, d.id ASC`,
    params(f = {}) {
      const __t = currentTenant()
      return [f.type ?? null, __t, __t]
    }
  },
  {
    module: 'system',
    name: 'roleRows',
    desc: '角色列表（平台预置 ∨ 查看者自有；平台上下文返回全量）',
    sql: `
SELECT r.*
FROM sys_role r
WHERE r.is_deleted = 0
AND ( ? IS NULL OR r.tenant_id = 0 OR r.tenant_id = ? )
ORDER BY r.id ASC`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'system',
    name: 'userRows',
    desc: '用户分页列表（含单位/部门名）',
    sql: `
SELECT u.*, o.org_name, d.dept_name
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
LIMIT ? OFFSET ?`,
    params(f = {}, paging = {}) {
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
  },
  {
    module: 'system',
    name: 'userCount',
    desc: '用户计数',
    sql: `
SELECT COUNT(*) AS n FROM sys_user u
WHERE u.is_deleted = 0
AND ( ? IS NULL OR u.tenant_id = ? )
AND ( ? IS NULL OR u.username = ? )
AND ( ? IS NULL OR u.real_name LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR u.org_id = ? )
AND ( ? IS NULL OR u.dept_id = ? )
AND ( ? IS NULL OR u.status = ? )`,
    params(f = {}) {
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
  }
]
