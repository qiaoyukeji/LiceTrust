/** 台账资产查询定义（计算机/软件/安装明细/维护日志）—— 全部含租户隔离条件 */
import { currentTenant } from '../../src/db/tenantContext.js'

export default [
  {
    module: 'asset',
    name: 'computerNos',
    desc: '全部计算机编号（含逻辑删除，供编号生成器避让唯一索引）',
    sql: `
SELECT computer_no AS no FROM asset_computer
WHERE ( ? IS NULL OR computer_no LIKE CONCAT(?, '%') )`,
    params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }
  },
  {
    module: 'asset',
    name: 'softwareNos',
    desc: '全部软件编号（含逻辑删除，供编号生成器避让唯一索引）',
    sql: `
SELECT software_no AS no FROM base_software
WHERE ( ? IS NULL OR software_no LIKE CONCAT(?, '%') )`,
    params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }
  },
  {
    module: 'asset',
    name: 'softwareRuleCandidates',
    desc: '编号规则匹配候选（全量跨租户：软件编号为全局唯一空间）',
    sql: `
SELECT s.*, e.purchase_date AS ent_purchase_date, e.purchase_amount AS ent_purchase_amount,
e.license_type AS ent_license_type, e.license_qty AS ent_license_qty, e.license_term AS ent_license_term
FROM base_software s
LEFT JOIN pur_entitlement e ON e.software_id = s.id AND e.is_deleted = 0
WHERE s.is_deleted = 0 AND s.software_type = ? AND s.software_name = ?
ORDER BY s.id DESC`,
    params(f = {}) {
      return [f.software_type ?? null, f.software_name ?? null]
    }
  },
  {
    module: 'asset',
    name: 'softwareById',
    desc: '按 id 取软件行（三态：平台通用层 ∨ 查看者自有层）',
    sql: `
SELECT s.*
FROM base_software s
WHERE s.id = ? AND s.is_deleted = 0
AND ( ? IS NULL OR s.tenant_id = 0 OR s.tenant_id = ? )`,
    params(f = {}) {
      const __t = currentTenant()
      return [f.id ?? null, __t, __t]
    }
  },
  {
    module: 'asset',
    name: 'computerRows',
    desc: '计算机分页列表（含单位/部门/使用人/软件数）',
    sql: `
SELECT c.*, o.org_name, d.dept_name, u.real_name AS user_name,
(SELECT COUNT(*) FROM asset_install_record i WHERE i.computer_id = c.id AND i.is_deleted = 0) AS install_count
FROM asset_computer c
LEFT JOIN sys_org o ON o.id = c.org_id
LEFT JOIN sys_dept d ON d.id = c.dept_id
LEFT JOIN sys_user u ON u.id = c.user_id
WHERE c.is_deleted = 0
AND ( ? IS NULL OR c.tenant_id = ? )
AND ( ? IS NULL OR c.computer_no LIKE CONCAT('%', ?, '%') OR c.brand LIKE CONCAT('%', ?, '%') OR c.sn LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR c.org_id = ? )
AND ( ? IS NULL OR c.dept_id = ? )
AND ( ? IS NULL OR c.user_id = ? )
AND ( ? IS NULL OR c.computer_type = ? )
AND ( ? IS NULL OR c.status = ? )
ORDER BY c.id DESC
LIMIT ? OFFSET ?`,
    params(f = {}, paging = {}) {
      const ps = Math.max(1, Number(paging.pageSize) || 10)
      const pg = Math.max(1, Number(paging.page) || 1)
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.userId ?? null, f.userId ?? null,
        f.computerType ?? null, f.computerType ?? null,
        f.status ?? null, f.status ?? null,
        ps, (pg - 1) * ps
      ]
    }
  },
  {
    module: 'asset',
    name: 'computerCount',
    desc: '计算机计数',
    sql: `
SELECT COUNT(*) AS n FROM asset_computer c
WHERE c.is_deleted = 0
AND ( ? IS NULL OR c.tenant_id = ? )
AND ( ? IS NULL OR c.computer_no LIKE CONCAT('%', ?, '%') OR c.brand LIKE CONCAT('%', ?, '%') OR c.sn LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR c.org_id = ? )
AND ( ? IS NULL OR c.dept_id = ? )
AND ( ? IS NULL OR c.user_id = ? )
AND ( ? IS NULL OR c.computer_type = ? )
AND ( ? IS NULL OR c.status = ? )`,
    params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.userId ?? null, f.userId ?? null,
        f.computerType ?? null, f.computerType ?? null,
        f.status ?? null, f.status ?? null
      ]
    }
  },
  {
    module: 'asset',
    name: 'computerInstalled',
    desc: '一机一档：某台计算机已装软件',
    sql: `
SELECT i.*, s.software_no, s.software_name, s.category, s.software_type, s.vendor,
u.real_name AS user_name, d.dept_name
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
LEFT JOIN sys_user u ON u.id = i.user_id
LEFT JOIN sys_dept d ON d.id = i.dept_id
WHERE i.is_deleted = 0 AND i.computer_id = ?
AND ( ? IS NULL OR i.tenant_id = ? )
ORDER BY i.id DESC`,
    params(f = {}) {
      const __t = currentTenant()
      return [f.computerId ?? null, __t, __t]
    }
  },
  {
    module: 'asset',
    name: 'computerMaintLogs',
    desc: '一机一档：某台计算机安装维护历史',
    sql: `
SELECT l.*, s.software_name, u.real_name AS operator_name, a.apply_no AS apply_no_display
FROM asset_maint_log l
LEFT JOIN base_software s ON s.id = l.software_id
LEFT JOIN sys_user u ON u.id = l.operator_id
LEFT JOIN flow_maint_apply a ON a.id = l.apply_id
WHERE l.is_deleted = 0 AND l.computer_id = ?
AND ( ? IS NULL OR l.tenant_id = ? )
ORDER BY l.op_date DESC`,
    params(f = {}) {
      const __t = currentTenant()
      return [f.computerId ?? null, __t, __t]
    }
  },
  {
    module: 'asset',
    name: 'softwareRows',
    desc: '软件资产库分页列表（两层：平台通用 tenant_id=0 ∨ 查看者自有；平台上下文仅通用）',
    sql: `
SELECT s.*,
(SELECT COUNT(*) FROM asset_install_record i WHERE i.software_id = s.id AND i.is_deleted = 0) AS install_count,
(SELECT COALESCE(SUM(e.license_qty), 0) FROM pur_entitlement e WHERE e.software_id = s.id AND e.is_deleted = 0) AS license_qty
FROM base_software s
WHERE s.is_deleted = 0
AND ( ? IS NULL OR s.tenant_id = 0 OR s.tenant_id = ? )
AND ( ? IS NULL OR s.software_no LIKE CONCAT('%', ?, '%') OR s.software_name LIKE CONCAT('%', ?, '%') OR s.vendor LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR s.category = ? )
AND ( ? IS NULL OR s.software_type = ? )
AND ( ? IS NULL OR s.status = ? )
ORDER BY s.id DESC
LIMIT ? OFFSET ?`,
    params(f = {}, paging = {}) {
      const ps = Math.max(1, Number(paging.pageSize) || 10)
      const pg = Math.max(1, Number(paging.page) || 1)
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.category ?? null, f.category ?? null,
        f.softwareType ?? null, f.softwareType ?? null,
        f.status ?? null, f.status ?? null,
        ps, (pg - 1) * ps
      ]
    }
  },
  {
    module: 'asset',
    name: 'softwareCount',
    desc: '软件资产计数（两层可见性同上）',
    sql: `
SELECT COUNT(*) AS n FROM base_software s
WHERE s.is_deleted = 0
AND ( ? IS NULL OR s.tenant_id = 0 OR s.tenant_id = ? )
AND ( ? IS NULL OR s.software_no LIKE CONCAT('%', ?, '%') OR s.software_name LIKE CONCAT('%', ?, '%') OR s.vendor LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR s.category = ? )
AND ( ? IS NULL OR s.software_type = ? )
AND ( ? IS NULL OR s.status = ? )`,
    params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.category ?? null, f.category ?? null,
        f.softwareType ?? null, f.softwareType ?? null,
        f.status ?? null, f.status ?? null
      ]
    }
  },
  {
    module: 'asset',
    name: 'softwareByName',
    desc: '按名称取软件行（三态：平台通用层 ∨ 查看者自有层）',
    sql: `
SELECT s.*
FROM base_software s
WHERE s.is_deleted = 0 AND s.software_name = ?
AND ( ? IS NULL OR s.tenant_id = 0 OR s.tenant_id = ? )
ORDER BY s.tenant_id DESC, s.id DESC`,
    params(f = {}) {
      const __t = currentTenant()
      return [f.name ?? null, __t, __t]
    }
  },
  {
    module: 'asset',
    name: 'softwareOptions',
    desc: '软件下拉选项（两层：平台通用 ∨ 查看者自有，均为在用）',
    sql: `
SELECT id, software_no, software_name, version, category, software_type, status, tenant_id
FROM base_software
WHERE is_deleted = 0 AND status = 1
AND ( ? IS NULL OR tenant_id = 0 OR tenant_id = ? )
ORDER BY id DESC`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'asset',
    name: 'installRows',
    desc: '安装明细分页列表（附件3数据源）',
    sql: `
SELECT i.*, c.computer_no, c.brand, c.computer_type, s.software_no, s.software_name,
s.category, s.software_type, u.real_name AS user_name, d.dept_name, o.org_name
FROM asset_install_record i
JOIN asset_computer c ON c.id = i.computer_id
JOIN base_software s ON s.id = i.software_id
LEFT JOIN sys_user u ON u.id = i.user_id
LEFT JOIN sys_dept d ON d.id = i.dept_id
LEFT JOIN sys_org o ON o.id = c.org_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
AND ( ? IS NULL OR c.computer_no LIKE CONCAT('%', ?, '%') OR s.software_name LIKE CONCAT('%', ?, '%') OR u.real_name LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR c.org_id = ? )
AND ( ? IS NULL OR i.dept_id = ? )
AND ( ? IS NULL OR s.category = ? )
AND ( ? IS NULL OR s.software_type = ? )
AND ( ? IS NULL OR i.install_date >= ? )
AND ( ? IS NULL OR i.install_date <= ? )
ORDER BY i.id DESC
LIMIT ? OFFSET ?`,
    params(f = {}, paging = {}) {
      const ps = Math.max(1, Number(paging.pageSize) || 10)
      const pg = Math.max(1, Number(paging.page) || 1)
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.category ?? null, f.category ?? null,
        f.softwareType ?? null, f.softwareType ?? null,
        f.dateFrom ?? null, f.dateFrom ?? null,
        f.dateTo ?? null, f.dateTo ?? null,
        ps, (pg - 1) * ps
      ]
    }
  },
  {
    module: 'asset',
    name: 'installCount',
    desc: '安装明细计数',
    sql: `
SELECT COUNT(*) AS n FROM asset_install_record i
JOIN asset_computer c ON c.id = i.computer_id
JOIN base_software s ON s.id = i.software_id
LEFT JOIN sys_user u ON u.id = i.user_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
AND ( ? IS NULL OR c.computer_no LIKE CONCAT('%', ?, '%') OR s.software_name LIKE CONCAT('%', ?, '%') OR u.real_name LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR c.org_id = ? )
AND ( ? IS NULL OR i.dept_id = ? )
AND ( ? IS NULL OR s.category = ? )
AND ( ? IS NULL OR s.software_type = ? )
AND ( ? IS NULL OR i.install_date >= ? )
AND ( ? IS NULL OR i.install_date <= ? )`,
    params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.deptId ?? null, f.deptId ?? null,
        f.category ?? null, f.category ?? null,
        f.softwareType ?? null, f.softwareType ?? null,
        f.dateFrom ?? null, f.dateFrom ?? null,
        f.dateTo ?? null, f.dateTo ?? null
      ]
    }
  }
]
