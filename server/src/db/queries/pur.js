// 本文件由 scripts/gen-queries.js 依据 scripts/query-defs/pur.js 自动生成，请勿手工修改
// 安全模式：字面量 SQL + 占位符参数绑定 + 同函数执行
import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'
import { currentTenant } from '../tenantContext.js'

// 全部申请单号（含逻辑删除，供编号生成器避让唯一索引）
const APPLYNOS_SQL = `SELECT apply_no AS no FROM flow_maint_apply
WHERE ( ? IS NULL OR apply_no LIKE CONCAT(?, '%') )`

const applyNos_params = function params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }

/** 全部申请单号（含逻辑删除，供编号生成器避让唯一索引） */
export async function applyNos(f = {}, paging = {}) {
  const params = applyNos_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(APPLYNOS_SQL)
    return st.all(...params)
  }
  return (await c.query(APPLYNOS_SQL, params))[0]
}

// 全部需求申请编号（含逻辑删除）
const REQUIRENOS_SQL = `SELECT apply_no AS no FROM pur_require_apply
WHERE ( ? IS NULL OR apply_no LIKE CONCAT(?, '%') )`

const requireNos_params = function params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }

/** 全部需求申请编号（含逻辑删除） */
export async function requireNos(f = {}, paging = {}) {
  const params = requireNos_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(REQUIRENOS_SQL)
    return st.all(...params)
  }
  return (await c.query(REQUIRENOS_SQL, params))[0]
}

// 全部采购计划编号（含逻辑删除）
const PLANNOS_SQL = `SELECT plan_no AS no FROM pur_plan
WHERE ( ? IS NULL OR plan_no LIKE CONCAT(?, '%') )`

const planNos_params = function params(f = {}) {
      return [f.prefix ?? null, f.prefix ?? null]
    }

/** 全部采购计划编号（含逻辑删除） */
export async function planNos(f = {}, paging = {}) {
  const params = planNos_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(PLANNOS_SQL)
    return st.all(...params)
  }
  return (await c.query(PLANNOS_SQL, params))[0]
}

// 授权分页列表（含软件名/合同名/安装数对账）
const ENTITLEMENTROWS_SQL = `SELECT e.*, s.software_no, s.software_name, s.category, s.software_type, s.vendor,
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
LIMIT ? OFFSET ?`

const entitlementRows_params = function params(f = {}, paging = {}) {
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

/** 授权分页列表（含软件名/合同名/安装数对账） */
export async function entitlementRows(f = {}, paging = {}) {
  const params = entitlementRows_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(ENTITLEMENTROWS_SQL)
    return st.all(...params)
  }
  return (await c.query(ENTITLEMENTROWS_SQL, params))[0]
}

// 授权计数
const ENTITLEMENTCOUNT_SQL = `SELECT COUNT(*) AS n
FROM pur_entitlement e
LEFT JOIN base_software s ON s.id = e.software_id
WHERE e.is_deleted = 0
AND ( ? IS NULL OR e.tenant_id = ? )
AND ( ? IS NULL OR s.software_name LIKE CONCAT('%', ?, '%') OR s.software_no LIKE CONCAT('%', ?, '%') )
AND ( ? IS NULL OR e.software_id = ? )
AND ( ? IS NULL OR e.auth_type = ? )
AND ( ? IS NULL OR ( e.expire_date IS NOT NULL AND e.expire_date <= ? ) )`

const entitlementCount_params = function params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t,
        f.kw ?? null, f.kw ?? null, f.kw ?? null,
        f.softwareId ?? null, f.softwareId ?? null,
        f.authType ?? null, f.authType ?? null,
        f.expireBefore ?? null, f.expireBefore ?? null
      ]
    }

/** 授权计数 */
export async function entitlementCount(f = {}, paging = {}) {
  const params = entitlementCount_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(ENTITLEMENTCOUNT_SQL)
    const rows = st.all(...params)
    return Number(rows[0] ? rows[0].n : 0)
  }
  const rows = (await c.query(ENTITLEMENTCOUNT_SQL, params))[0]
  return Number(rows[0] ? rows[0].n : 0)
}

// 预警分页列表
const ALERTROWS_SQL = `SELECT b.*, u.real_name AS handler_name
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
LIMIT ? OFFSET ?`

const alertRows_params = function params(f = {}, paging = {}) {
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

/** 预警分页列表 */
export async function alertRows(f = {}, paging = {}) {
  const params = alertRows_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(ALERTROWS_SQL)
    return st.all(...params)
  }
  return (await c.query(ALERTROWS_SQL, params))[0]
}

// 预警计数
const ALERTCOUNT_SQL = `SELECT COUNT(*) AS n FROM biz_alert b
WHERE b.is_deleted = 0
AND ( ? IS NULL OR b.tenant_id = ? )
AND ( ? IS NULL OR b.alert_type = ? )
AND ( ? IS NULL OR b.status = ? )
AND ( ? IS NULL OR b.org_id = ? )
AND ( ? IS NULL OR b.level = ? )
AND ( ? IS NULL OR b.content LIKE CONCAT('%', ?, '%') )`

const alertCount_params = function params(f = {}) {
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

/** 预警计数 */
export async function alertCount(f = {}, paging = {}) {
  const params = alertCount_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(ALERTCOUNT_SQL)
    const rows = st.all(...params)
    return Number(rows[0] ? rows[0].n : 0)
  }
  const rows = (await c.query(ALERTCOUNT_SQL, params))[0]
  return Number(rows[0] ? rows[0].n : 0)
}

// 四类软件安装分布（GROUP BY 用途分类）
const STATSCATEGORY_SQL = `SELECT s.category, COUNT(*) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
JOIN asset_computer c ON c.id = i.computer_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
AND ( ? IS NULL OR c.org_id = ? )
GROUP BY s.category`

const statsCategory_params = function params(f = {}) {
      const __t = currentTenant()
      return [__t, __t, f.orgId ?? null, f.orgId ?? null]
    }

/** 四类软件安装分布（GROUP BY 用途分类） */
export async function statsCategory(f = {}, paging = {}) {
  const params = statsCategory_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(STATSCATEGORY_SQL)
    return st.all(...params)
  }
  return (await c.query(STATSCATEGORY_SQL, params))[0]
}

// 软件类型分布（商业/OEM/免费 安装数）
const STATSTYPEDIST_SQL = `SELECT s.software_type, COUNT(*) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY s.software_type`

const statsTypeDist_params = function params() {
      const __t = currentTenant()
      return [__t, __t]
    }

/** 软件类型分布（商业/OEM/免费 安装数） */
export async function statsTypeDist(f = {}, paging = {}) {
  const params = statsTypeDist_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(STATSTYPEDIST_SQL)
    return st.all(...params)
  }
  return (await c.query(STATSTYPEDIST_SQL, params))[0]
}

// 各单位安装数排名
const STATSORGINSTALL_SQL = `SELECT o.id AS org_id, o.org_name, COUNT(i.id) AS n
FROM asset_install_record i
JOIN asset_computer c ON c.id = i.computer_id
JOIN sys_org o ON o.id = c.org_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY o.id, o.org_name
ORDER BY n DESC`

const statsOrgInstall_params = function params() {
      const __t = currentTenant()
      return [__t, __t]
    }

/** 各单位安装数排名 */
export async function statsOrgInstall(f = {}, paging = {}) {
  const params = statsOrgInstall_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(STATSORGINSTALL_SQL)
    return st.all(...params)
  }
  return (await c.query(STATSORGINSTALL_SQL, params))[0]
}

// 近12个月安装趋势
const STATSMONTHLYTREND_SQL = `SELECT SUBSTR(i.install_date, 1, 7) AS ym, COUNT(*) AS n
FROM asset_install_record i
WHERE i.is_deleted = 0 AND i.install_date IS NOT NULL
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY SUBSTR(i.install_date, 1, 7)
ORDER BY ym DESC
LIMIT 12`

const statsMonthlyTrend_params = function params() {
      const __t = currentTenant()
      return [__t, __t]
    }

/** 近12个月安装趋势 */
export async function statsMonthlyTrend(f = {}, paging = {}) {
  const params = statsMonthlyTrend_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(STATSMONTHLYTREND_SQL)
    return st.all(...params)
  }
  return (await c.query(STATSMONTHLYTREND_SQL, params))[0]
}

// 租户概览计数（单行多列，各子查询按租户过滤）
const STATSOVERVIEW_SQL = `SELECT
(SELECT COUNT(*) FROM asset_computer x WHERE x.is_deleted = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS computer_total,
(SELECT COUNT(*) FROM asset_computer x WHERE x.is_deleted = 0 AND x.status = 1 AND ( ? IS NULL OR x.tenant_id = ? )) AS computer_active,
(SELECT COUNT(*) FROM base_software x WHERE x.is_deleted = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS software_total,
(SELECT COUNT(*) FROM asset_install_record x WHERE x.is_deleted = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS install_total,
(SELECT COUNT(*) FROM sys_user x WHERE x.is_deleted = 0 AND x.use_computer = 1 AND ( ? IS NULL OR x.tenant_id = ? )) AS person_total,
(SELECT COUNT(*) FROM flow_maint_apply x WHERE x.is_deleted = 0 AND x.status IN (10, 20, 30, 40) AND ( ? IS NULL OR x.tenant_id = ? )) AS flow_pending,
(SELECT COUNT(*) FROM biz_alert x WHERE x.is_deleted = 0 AND x.status = 0 AND ( ? IS NULL OR x.tenant_id = ? )) AS alert_unhandled,
(SELECT COUNT(*) FROM pur_entitlement x WHERE x.is_deleted = 0 AND x.expire_date IS NOT NULL AND x.expire_date <= ? AND ( ? IS NULL OR x.tenant_id = ? )) AS expiring_90`

const statsOverview_params = function params(f = {}) {
      const __t = currentTenant()
      return [
        __t, __t, __t, __t, __t, __t, __t, __t,
        __t, __t, __t, __t, __t, __t,
        f.expireBefore ?? null, __t, __t
      ]
    }

/** 租户概览计数（单行多列，各子查询按租户过滤） */
export async function statsOverview(f = {}, paging = {}) {
  const params = statsOverview_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(STATSOVERVIEW_SQL)
    return st.all(...params)
  }
  return (await c.query(STATSOVERVIEW_SQL, params))[0]
}

// 流程各状态计数
const FLOWSTATUSCOUNTS_SQL = `SELECT status, COUNT(*) AS n
FROM flow_maint_apply
WHERE is_deleted = 0
AND ( ? IS NULL OR tenant_id = ? )
GROUP BY status`

const flowStatusCounts_params = function params() {
      const __t = currentTenant()
      return [__t, __t]
    }

/** 流程各状态计数 */
export async function flowStatusCounts(f = {}, paging = {}) {
  const params = flowStatusCounts_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(FLOWSTATUSCOUNTS_SQL)
    return st.all(...params)
  }
  return (await c.query(FLOWSTATUSCOUNTS_SQL, params))[0]
}

// 国产化替代统计（按标记分组安装数）
const STATSDOMESTIC_SQL = `SELECT s.is_domestic, COUNT(i.id) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY s.is_domestic`

const statsDomestic_params = function params() {
      const __t = currentTenant()
      return [__t, __t]
    }

/** 国产化替代统计（按标记分组安装数） */
export async function statsDomestic(f = {}, paging = {}) {
  const params = statsDomestic_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(STATSDOMESTIC_SQL)
    return st.all(...params)
  }
  return (await c.query(STATSDOMESTIC_SQL, params))[0]
}

// 国产化分厂商安装统计
const STATSDOMESTICVENDORS_SQL = `SELECT s.vendor, s.is_domestic, COUNT(i.id) AS n
FROM asset_install_record i
JOIN base_software s ON s.id = i.software_id
WHERE i.is_deleted = 0
AND ( ? IS NULL OR i.tenant_id = ? )
GROUP BY s.vendor, s.is_domestic
ORDER BY n DESC
LIMIT 20`

const statsDomesticVendors_params = function params() {
      const __t = currentTenant()
      return [__t, __t]
    }

/** 国产化分厂商安装统计 */
export async function statsDomesticVendors(f = {}, paging = {}) {
  const params = statsDomesticVendors_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(STATSDOMESTICVENDORS_SQL)
    return st.all(...params)
  }
  return (await c.query(STATSDOMESTICVENDORS_SQL, params))[0]
}

// 个人待办计数（部门审核/信息化审核/执行/本人确认，按租户隔离）
const TODOCOUNTS_SQL = `SELECT
(SELECT COUNT(*) FROM flow_maint_apply a WHERE a.is_deleted = 0 AND a.status = 10 AND ( ? IS NULL OR a.tenant_id = ? ) AND ( ? IS NULL OR a.dept_id = ? )) AS dept_approve,
(SELECT COUNT(*) FROM flow_maint_apply a WHERE a.is_deleted = 0 AND a.status = 20 AND ( ? IS NULL OR a.tenant_id = ? )) AS it_approve,
(SELECT COUNT(*) FROM flow_maint_apply a WHERE a.is_deleted = 0 AND a.status = 30 AND ( ? IS NULL OR a.tenant_id = ? )) AS to_execute,
(SELECT COUNT(*) FROM flow_maint_apply a JOIN asset_computer c ON c.id = a.computer_id WHERE a.is_deleted = 0 AND a.status = 40 AND ( ? IS NULL OR a.tenant_id = ? ) AND ( ? IS NULL OR c.user_id = ? )) AS to_confirm`

const todoCounts_params = function params(f = {}) {
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

/** 个人待办计数（部门审核/信息化审核/执行/本人确认，按租户隔离） */
export async function todoCounts(f = {}, paging = {}) {
  const params = todoCounts_params(f, paging)
  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())
  if (dialect === 'sqlite') {
    const st = c.prepare(TODOCOUNTS_SQL)
    return st.all(...params)
  }
  return (await c.query(TODOCOUNTS_SQL, params))[0]
}
