/** 安装维护流程查询定义（含租户隔离条件） */
import { currentTenant } from '../../src/db/tenantContext.js'

export default [
  {
    module: 'flow',
    name: 'applyRows',
    desc: '安装维护申请分页列表（含计算机/申请人/部门名）',
    sql: `
SELECT a.*, c.computer_no, c.brand, u.real_name AS applicant_name, d.dept_name, c.user_id AS computer_user_id
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
LIMIT ? OFFSET ?`,
    params(f = {}, paging = {}) {
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
  },
  {
    module: 'flow',
    name: 'applyCount',
    desc: '安装维护申请计数',
    sql: `
SELECT COUNT(*) AS n
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
AND ( ? IS NULL OR c.user_id = ? )`,
    params(f = {}) {
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
  }
]
