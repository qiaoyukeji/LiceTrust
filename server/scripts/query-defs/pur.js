/** 采购授权/预警/统计/工作台查询定义（全部含租户隔离条件） */
import { currentTenant } from '../../src/db/tenantContext.js'

export default [
  {
    module: 'pur',
    name: 'applyNos',
    desc: '全部申请单号（含逻辑删除，供编号生成器避让唯一索引）',
    sql: `
SELECT apply_no AS no FROM flow_maint_apply
WHERE ( ? IS NULL OR apply_no LIKE CONCAT(?, '%') )`,
    params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }
  },
  {
    module: 'pur',
    name: 'requireNos',
    desc: '全部需求申请编号（含逻辑删除）',
    sql: `
SELECT apply_no AS no FROM pur_require_apply
WHERE ( ? IS NULL OR apply_no LIKE CONCAT(?, '%') )`,
    params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }
  },
  {
    module: 'pur',
    name: 'planNos',
    desc: '全部采购计划编号（含逻辑删除）',
    sql: `
SELECT plan_no AS no FROM pur_plan
WHERE ( ? IS NULL OR plan_no LIKE CONCAT(?, '%') )`,
    params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }
  },
  {
    module: 'pur',
    name: 'entitlementRows',
    desc: '授权分页列表（含软件名/合同名/安装数对账）',
    sql: `
SELECT e.*, s.software_no, s.software_name, s.category, s.software_type, s.vendor,
ct.contract_no, ct.contract_name,
(SELECT COUNT(*) FROM asset_install_record i WHERE i.software_id = e.software_id AND i.is_deleted = 0) AS install_count
FROM pur_entitlement e
LEFT JOIN base_software s ON s.id = e.software_id
LEFT JOIN pur_contract ct ON ct.id = e.contract_id
WHERE e.is_deleted = 0
AND ( ? IS NULL OR e.tenant_id = ? )
AND ( ? IS NULL OR s.software_name LIKE CONCAT('%', ?, '%') OR s.software_no LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR e.software_id = ? )
AND ( ? IS NULL OR e.auth_type = ? )
AND ( ? IS NULL OR ( e.expire_date IS NOT NULL AND e.expire_date <= ? ) )
ORDER BY e.id DESC
LIMIT ? OFFSET ?`,
    params(f = {}, paging = {}) {
      const ps = Math.max(1, Number(paging.pageSize) || 10)
      const pg = Math.max(1, Number(paging.page) || 1)
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.softwareId ?? null, f.softwareId ?? null,
        f.authType ?? null, f.authType ?? null,
        f.expireBefore ?? null, f.expireBefore ?? null,
        ps, (pg - 1) * ps
      ]
    }
  },
  {
    module: 'pur',
    name: 'entitlementCount',
    desc: '授权计数',
    sql: `
SELECT COUNT(*) AS n
FROM pur_entitlement e
LEFT JOIN base_software s ON s.id = e.software_id
WHERE e.is_deleted = 0
AND ( ? IS NULL OR e.tenant_id = ? )
AND ( ? IS NULL OR s.software_name LIKE CONCAT('%', ?, '%') OR s.software_no LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR e.software_id = ? )
AND ( ? IS NULL OR e.auth_type = ? )
AND ( ? IS NULL OR ( e.expire_date IS NOT NULL AND e.expire_date <= ? ) )`,
    params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.softwareId ?? null, f.softwareId ?? null,
        f.authType ?? null, f.authType ?? null,
        f.expireBefore ?? null, f.expireBefore ?? null
      ]
    }
  },
  {
    module: 'pur',
    name: 'alertRows',
    desc: '预警分页列表',
    sql: `
SELECT b.*, u.real_name AS handler_name
FROM biz_alert b
LEFT JOIN sys_user u ON u.id = b.handler_id
WHERE b.is_deleted = 0
AND ( ? IS NULL OR b.tenant_id = ? )
AND ( ? IS NULL OR b.alert_type = ? )
AND ( ? IS NULL OR b.status = ? )
AND ( ? IS NULL OR b.org_id = ? )
AND ( ? IS NULL OR b.level = ? )
AND ( ? IS NULL OR b.content LIKE CONCAT('%', ?, '%') )
ORDER BY b.id DESC
LIMIT ? OFFSET ?`,
    params(f = {}, paging = {}) {
      const ps = Math.max(1, Number(paging.pageSize) || 10)
      const pg = Math.max(1, Number(paging.page) || 1)
      const __t = currentTenant()
      return [
        __t, __t,
        f.alertType ?? null, f.alertType ?? null,
        f.status ?? null, f.status ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.level ?? null, f.level ?? null,
        f.kw ?? null, f.kw ?? null,
        ps, (pg - 1) * ps
      ]
    }
  },
  {
    module: 'pur',
    name: 'alertCount',
    desc: '预警计数',
    sql: `
SELECT COUNT(*) AS n FROM biz_alert b
WHERE b.is_deleted = 0
AND ( ? IS NULL OR b.tenant_id = ? )
AND ( ? IS NULL OR b.alert_type = ? )
AND ( ? IS NULL OR b.status = ? )
AND ( ? IS NULL OR b.org_id = ? )
AND ( ? IS NULL OR b.level = ? )
AND ( ? IS NULL OR b.content LIKE CONCAT('%', ?, '%') )`,
    params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.alertType ?? null, f.alertType ?? null,
        f.status ?? null, f.status ?? null,
        f.orgId ?? null, f.orgId ?? null,
        f.level ?? null, f.level ?? null,
        f.kw ?? null, f.kw ?? null
      ]
    }
  },
  {
    module: 'pur',
    name: 'statsCategory',
    desc: '四类软件安装分布（GROUP BY 用途分类）',
    sql: `
SELECT s.category, COUNT(*) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
JOIN asset_computer c ON c.id = i.computer_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
AND ( ? IS NULL OR c.org_id = ? )
GROUP BY s.category`,
    params(f = {}) {
      const __t = currentTenant()
      return [__t, __t, f.orgId ?? null, f.orgId ?? null]
    }
  },
  {
    module: 'pur',
    name: 'statsTypeDist',
    desc: '软件类型分布（商业/OEM/免费 安装数）',
    sql: `
SELECT s.software_type, COUNT(*) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY s.software_type`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'pur',
    name: 'statsOrgInstall',
    desc: '各单位安装数排名',
    sql: `
SELECT o.id AS org_id, o.org_name, COUNT(i.id) AS n
FROM asset_install_record i
JOIN asset_computer c ON c.id = i.computer_id
JOIN sys_org o ON o.id = c.org_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY o.id, o.org_name
ORDER BY n DESC`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'pur',
    name: 'statsMonthlyTrend',
    desc: '近12个月安装趋势',
    sql: `
SELECT SUBSTR(i.install_date, 1, 7) AS ym, COUNT(*) AS n
FROM asset_install_record i
WHERE i.is_deleted = 0 AND i.install_date IS NOT NULL
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY SUBSTR(i.install_date, 1, 7)
ORDER BY ym DESC
LIMIT 12`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'pur',
    name: 'statsOverview',
    desc: '租户概览计数（单行多列，各子查询按租户过滤）',
    sql: `
SELECT
(SELECT COUNT(*) FROM asset_computer x WHERE x.is_deleted = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS computer_total,
(SELECT COUNT(*) FROM asset_computer x WHERE x.is_deleted = 0 AND x.status = 1 AND ( ? IS NULL OR x.tenant_id = ? )) AS computer_active,
(SELECT COUNT(*) FROM base_software x WHERE x.is_deleted = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS software_total,
(SELECT COUNT(*) FROM asset_install_record x WHERE x.is_deleted = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS install_total,
(SELECT COUNT(*) FROM sys_user x WHERE x.is_deleted = 0 AND x.use_computer = 1 AND ( ? IS NULL OR x.tenant_id = ? )) AS person_total,
(SELECT COUNT(*) FROM flow_maint_apply x WHERE x.is_deleted = 0 AND x.status IN (10, 20, 30, 40) AND ( ? IS NULL OR x.tenant_id = ? )) AS flow_pending,
(SELECT COUNT(*) FROM biz_alert x WHERE x.is_deleted = 0 AND x.status = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS alert_unhandled,
(SELECT COUNT(*) FROM pur_entitlement x WHERE x.is_deleted = 0 AND x.expire_date IS NOT NULL AND x.expire_date <= ? AND ( ? IS NULL OR x.tenant_id = ? )) AS expiring_90`,
    params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t, __t, __t, __t, __t, __t, __t,
        __t, __t, __t, __t, __t, __t,
        f.expireBefore ?? null, __t, __t
      ]
    }
  },
  {
    module: 'pur',
    name: 'flowStatusCounts',
    desc: '流程各状态计数',
    sql: `
SELECT status, COUNT(*) AS n
FROM flow_maint_apply
WHERE is_deleted = 0
AND ( ? IS NULL OR tenant_id = ? )
GROUP BY status`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'pur',
    name: 'statsDomestic',
    desc: '国产化替代统计（按标记分组安装数）',
    sql: `
SELECT s.is_domestic, COUNT(i.id) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY s.is_domestic`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'pur',
    name: 'statsDomesticVendors',
    desc: '国产化分厂商安装统计',
    sql: `
SELECT s.vendor, s.is_domestic, COUNT(i.id) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY s.vendor, s.is_domestic
ORDER BY n DESC
LIMIT 20`,
    params() {
      const __t = currentTenant()
      return [__t, __t]
    }
  },
  {
    module: 'pur',
    name: 'todoCounts',
    desc: '个人待办计数（部门审核/信息化审核/执行/本人确认，按租户隔离）',
    sql: `
SELECT
(SELECT COUNT(*) FROM flow_maint_apply a WHERE a.is_deleted = 0 AND a.status = 10 AND ( ? IS NULL OR a.tenant_id = ? ) AND ( ? IS NULL OR a.dept_id = ? )) AS dept_approve,
(SELECT COUNT(*) FROM flow_maint_apply a WHERE a.is_deleted = 0 AND a.status = 20 AND ( ? IS NULL OR a.tenant_id = ? )) AS it_approve,
(SELECT COUNT(*) FROM flow_maint_apply a WHERE a.is_deleted = 0 AND a.status = 30 AND ( ? IS NULL OR a.tenant_id = ? )) AS to_execute,
(SELECT COUNT(*) FROM flow_maint_apply a JOIN asset_computer c ON c.id = a.computer_id WHERE a.is_deleted = 0 AND a.status = 40 AND ( ? IS NULL OR a.tenant_id = ? ) AND ( ? IS NULL OR c.user_id = ? )) AS to_confirm`,
    params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.deptId ?? null, f.deptId ?? null,
        __t, __t,
        __t, __t,
        __t, __t,
        f.userId ?? null, f.userId ?? null
      ]
    }
  }
]
