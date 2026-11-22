/**
 * 种子数据脚本 —— 演示数据初始化（node scripts/seed.js）
 * 幂等：检测到已初始化则跳过（重置请删除 data/licetrust.db 后重新执行）
 */
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import {
  sysOrg, sysDept, sysUser, sysUserRole, sysRole, sysDict, sysConfig, sysTenant,
  baseSoftware, purEntitlement, purContract, purAdminAccount, baseFreeSoftware, baseLeader,
  assetComputer, assetInstallRecord, assetMaintLog, flowMaintApply, flowApproval, flowConfirm,
  bizAlert, purLicenseAlloc
} from '../src/db/dao/index.js'
import { initDb } from '../src/db/index.js'
import { runMigration } from '../src/db/migrate-generated.js'
import { runWithTenant } from '../src/db/tenantContext.js'
import { asset } from '../src/db/queries/index.js'
import { nowStr, todayStr } from '../src/db/util.js'
import { genSoftwareNo, genComputerNo } from '../src/utils/noGen.js'
import { aesEncrypt } from '../src/utils/crypto.js'

const ctx = null // 种子数据不记操作人
let oid = {}

async function seed() {
  await runMigration()
  const exist = await sysUser.list({ username: 'admin' }, { pageSize: 1 })
  if (exist && exist.length) {
    console.log('[seed] 已初始化过（账号 admin 已存在）。如需重置请删除 data/licetrust.db 后重跑。')
    return
  }

  /* ===== 默认演示租户（公司）===== */
  const demoTenant = await sysTenant.insert({
    tenant_name: '演示集团（示例公司）',
    contact_person: '演示管理员',
    contact_phone: '000-00000000',
    address: '演示地址 1 号',
    industry: '软件信息服务',
    status: 1,
    remark: '系统内置演示租户'
  }, ctx)
  // 之后的所有业务数据自动注入 tenant_id = 演示租户
  console.log('[seed] 演示租户:', demoTenant.insertId)

  /* ===== 平台运营账号（tenant_id=0，可见全部租户数据）===== */
  const platformPwd = await bcrypt.hash('123456', 10)
  const platformUser = await sysUser.insert({
    username: 'platform',
    password_hash: platformPwd,
    real_name: '平台运营',
    emp_no: 'P0001',
    tenant_id: 0,
    position: '平台管理员',
    use_computer: 0
  }, ctx)

  // 演示租户的全部业务数据在租户上下文中创建（DAO 自动注入 tenant_id）
  await runWithTenant(demoTenant.insertId, async () => {
  /* ===== 角色 ===== */
  const P = {
    admin: ['*'],
    asset: ['dashboard', 'computer:view', 'computer:edit', 'software:view', 'software:edit', 'install:view', 'install:edit',
      'contract:view', 'contract:edit', 'entitlement:view', 'entitlement:edit', 'entitlement:secret', 'adminaccount:view', 'adminaccount:edit',
      'alloc:view', 'alloc:edit', 'free:view', 'free:edit', 'report:view', 'report:export', 'alert:view', 'alert:handle', 'stats:view',
      'apply:view', 'apply:approve2'],
    finance: ['dashboard', 'contract:view', 'contract:edit', 'plan:view', 'plan:edit', 'require:view', 'require:edit', 'stats:view', 'report:view', 'alert:view'],
    deptLeader: ['dashboard', 'computer:view', 'software:view', 'apply:view', 'apply:approve1', 'stats:view', 'alert:view'],
    employee: ['dashboard', 'computer:view', 'apply:view', 'apply:create', 'apply:confirm', 'report:view'],
    it: ['dashboard', 'computer:view', 'computer:edit', 'install:view', 'install:edit', 'apply:view', 'apply:execute', 'software:view', 'alert:view'],
    inspector: ['dashboard', 'computer:view', 'software:view', 'install:view', 'ins:view', 'ins:edit', 'report:view', 'report:export', 'stats:view', 'alert:view'],
    leader: ['dashboard', 'computer:view', 'software:view', 'stats:view', 'report:view', 'report:export', 'alert:view', 'ins:view', 'apply:view'],
    branchAdmin: ['dashboard', 'computer:view', 'computer:edit', 'software:view', 'software:edit', 'install:view', 'install:edit',
      'apply:view', 'apply:approve2', 'free:view', 'free:edit', 'report:view', 'report:export', 'alert:view', 'alert:handle', 'stats:view', 'org:view', 'dept:view', 'user:view', 'user:edit']
  }
  const roleDefs = [
    { role_code: 'ADMIN', role_name: '总管理员', data_scope: 1, perms: P.admin, remark: '集团总部系统最高业务权限（不含审计日志删除）' },
    { role_code: 'BRANCH_ADMIN', role_name: '分子公司管理员', data_scope: 2, perms: P.branchAdmin, remark: '本单位数据管理（组织/台账/软件/流程）' },
    { role_code: 'ASSET_ADMIN', role_name: '软件资产管理员', data_scope: 1, perms: P.asset },
    { role_code: 'FINANCE', role_name: '财务/资产管理人员', data_scope: 1, perms: P.finance },
    { role_code: 'DEPT_LEADER', role_name: '部门负责人', data_scope: 3, perms: P.deptLeader },
    { role_code: 'EMPLOYEE', role_name: '普通员工', data_scope: 4, perms: P.employee },
    { role_code: 'IT_OPERATOR', role_name: '软件安装维护人员', data_scope: 1, perms: P.it },
    { role_code: 'INSPECTOR', role_name: '督查检查人员', data_scope: 1, perms: P.inspector },
    { role_code: 'LEADER', role_name: '集团领导', data_scope: 1, perms: P.leader, remark: '全局只读' }
  ]
  const roles = {}
  for (const r of roleDefs) {
    // 预置角色为平台通用数据（tenant_id=0，各企业共用）
    const ret = await sysRole.insert({ ...r, tenant_id: 0, perms: JSON.stringify(r.perms) }, ctx)
    roles[r.role_code] = ret.insertId
  }
  // 平台运营账号绑定 ADMIN 角色（角色在上方创建后绑定，可进入全部菜单与平台管理）
  await sysUserRole.insert({ user_id: platformUser.insertId, role_id: roles.ADMIN }, ctx)

  /* ===== 组织 ===== */
  const hq = await sysOrg.insert({ org_name: '演示集团（本部）', org_code: 'HQ', org_level: 1, sort_no: 1 }, ctx)
  const hfe = await sysOrg.insert({ org_name: '第一分公司', org_code: 'HFE', org_level: 2, parent_id: hq.insertId, sort_no: 2 }, ctx)
  const tuo = await sysOrg.insert({ org_name: '第二分公司', org_code: 'TUO', org_level: 2, parent_id: hq.insertId, sort_no: 3 }, ctx)
  oid = { hq: hq.insertId, hfe: hfe.insertId, tuo: tuo.insertId }
  const depts = {}
  const deptDefs = [
    ['hq', '信息化部'], ['hq', '财务部'], ['hq', '运行保障部'], ['hq', '综合办公室'],
    ['hfe', '信息化部'], ['hfe', '运行保障部'],
    ['tuo', '信息化部'], ['tuo', '综合办公室']
  ]
  let deptSort = 1
  for (const [orgKey, name] of deptDefs) {
    const d = await sysDept.insert({ org_id: oid[orgKey], dept_name: name, sort_no: deptSort++ }, ctx)
    depts[orgKey + '-' + name] = d.insertId
  }

  /* ===== 用户 ===== */
  const pwd = await bcrypt.hash('123456', 10)
  // 演示租户的管理员与成员（tenant_id 随 setTenant 上下文自动注入；sys_user 为排除表，显式传值）
  const userDefs = [
    { username: 'admin', real_name: '系统管理员', org: 'hq', dept: '信息化部', position: '系统管理员', roles: ['ADMIN'], tenant: 1 },
    { username: 'branch1', real_name: '刘分公司', org: 'hfe', dept: '信息化部', position: '分公司信息管理员', roles: ['BRANCH_ADMIN'], tenant: 1 },
    { username: 'asset', real_name: '王资产', org: 'hq', dept: '信息化部', position: '软件资产管理员', roles: ['ASSET_ADMIN'], tenant: 1 },
    { username: 'finance', real_name: '李财务', org: 'hq', dept: '财务部', position: '资产管理', roles: ['FINANCE'], tenant: 1 },
    { username: 'leader1', real_name: '张主任', org: 'hq', dept: '信息化部', position: '部门负责人', roles: ['DEPT_LEADER'], tenant: 1 },
    { username: 'emp1', real_name: '陈小明', org: 'hq', dept: '信息化部', position: '信息系统运维', roles: ['EMPLOYEE'], tenant: 1 },
    { username: 'emp2', real_name: '刘工', org: 'hfe', dept: '运行保障部', position: '设备保障', roles: ['EMPLOYEE', 'DEPT_LEADER'], tenant: 1 },
    { username: 'it1', real_name: '赵维', org: 'hq', dept: '信息化部', position: 'IT运维工程师', roles: ['IT_OPERATOR'], tenant: 1 },
    { username: 'inspector', real_name: '周督查', org: 'hq', dept: '综合办公室', position: '督查专员', roles: ['INSPECTOR'], tenant: 1 },
    { username: 'boss', real_name: '集团领导', org: 'hq', dept: '综合办公室', position: '副总经理', roles: ['LEADER'], tenant: 1 }
  ]
  const users = {}
  for (const ud of userDefs) {
    const ret = await sysUser.insert({
      username: ud.username,
      password_hash: pwd,
      real_name: ud.real_name,
      emp_no: 'E' + String(1000 + Object.keys(users).length + 1),
      tenant_id: ud.tenant,
      org_id: oid[ud.org],
      dept_id: depts[ud.org + '-' + ud.dept],
      position: ud.position,
      use_computer: 1
    }, ctx)
    users[ud.username] = ret.insertId
    for (const rc of ud.roles) await sysUserRole.insert({ user_id: ret.insertId, role_id: roles[rc] }, ctx)
  }

  console.log('[seed] 角色/组织/用户 完成')

  /* ===== 数据字典（FR-15-04）===== */
  const dicts = [
    ['software_category', '操作系统', 1], ['software_category', '办公软件', 2],
    ['software_category', '杀毒软件', 3], ['software_category', '工业软件', 4],
    ['software_type', '商业软件', 1], ['software_type', 'OEM软件', 2], ['software_type', '免费软件', 3],
    ['computer_type', '服务器', 1], ['computer_type', '台式机', 2], ['computer_type', '笔记本', 3],
    ['computer_type', '一体机', 4], ['computer_type', '组装机', 5],
    ['computer_status', '在用', 1], ['computer_status', '闲置', 2], ['computer_status', '报废', 3],
    ['auth_type', '场地授权', '场地授权'], ['auth_type', '数量授权', '数量授权'],
    ['auth_type', '订阅授权', '订阅授权'], ['auth_type', '永久授权', '永久授权'], ['auth_type', '并发授权', '并发授权'],
    ['purchase_method', '采购', 1], ['purchase_method', '受赠', 2], ['purchase_method', '调剂', 3],
    ['apply_type', '安装', 1], ['apply_type', '卸载', 2], ['apply_type', '升级', 3],
    ['install_source', '统一部署', '统一部署'], ['install_source', '个人申请', '个人申请'], ['install_source', '补录', '补录'],
    ['inspect_result', '相符', 1], ['inspect_result', '不符', 2], ['inspect_result', '未安装', 3], ['inspect_result', '未登记', 4]
  ]
  let dsort = 0
  for (const [type, label, value] of dicts) {
    // 通用字典项为平台通用数据（tenant_id=0，各企业可见可用）
    await sysDict.insert({ tenant_id: 0, dict_type: type, dict_label: label, dict_value: String(value), sort_no: dsort++ }, ctx)
  }

  /* ===== 系统参数（FR-15-06）===== */
  const cfgs = [
    ['ledger_refresh_days', '180', '台账更新周期（天）'],
    ['alert_expire_days', '90,60,30', '授权到期预警提前天数'],
    ['computer_no_prefix', 'PC', '计算机编号前缀'],
    ['alert_sms_enabled', 'true', '高等级预警短信推送开关'],
    ['expire_email_enabled', 'true', '到期邮件提醒开关']
  ]
  for (const [k, v, n] of cfgs) await sysConfig.insert({ config_key: k, config_value: v, config_name: n }, ctx)

  console.log('[seed] 字典/参数 完成')

  /* ===== 软件资产库（编号规则 FR-05-02）===== */
  const softwares = {}
  const swDefs = [
    // 操作系统类（含预置正版软件类型：win7/win10/win11/UOS/麒麟）
    { key: 'win', name: 'Windows 11 专业版', version: '22H2', usable: 'Win10/11', category: 1, type: 1, vendor: '微软（中国）', source: '集采', dom: 0 },
    { key: 'win10', name: 'Windows 10 专业版', version: '22H2', usable: 'Win10', category: 1, type: 1, vendor: '微软（中国）', source: '集采', dom: 0 },
    { key: 'win7', name: 'Windows 7 旗舰版', version: 'SP1', usable: 'Win7', category: 1, type: 1, vendor: '微软（中国）', source: '存量', dom: 0 },
    { key: 'uos', name: 'UOS 统信桌面操作系统', version: 'V20', usable: 'V20', category: 1, type: 1, vendor: '统信软件', source: '集采', dom: 1 },
    { key: 'kylin', name: '银河麒麟桌面操作系统', version: 'V10', usable: 'V10', category: 1, type: 1, vendor: '麒麟软件', source: '集采', dom: 1 },
    { key: 'oemwin', name: 'Windows 11 专业版（随机预装）', version: 'OEM', usable: '', category: 1, type: 2, vendor: '微软（中国）', source: '随机预装', dom: 0 },
    // 办公软件类（金山WPS、微软MS office）
    { key: 'wps', name: 'WPS Office 专业版', version: '2023', usable: '2023', category: 2, type: 1, vendor: '金山办公', source: '集采', dom: 1 },
    { key: 'msoffice', name: 'Microsoft Office 专业增强版', version: '2019', usable: '2016/2019', category: 2, type: 1, vendor: '微软（中国）', source: '集采', dom: 0 },
    { key: 'zip', name: '7-Zip', version: '', usable: '', category: 2, type: 3, vendor: 'Igor Pavlov', source: '官网下载', dom: 0 },
    // 杀毒软件类（360安全卫士、360杀毒、腾讯电脑管家、金山毒霸、火绒）
    { key: 'kill', name: '奇安信天擎', version: 'V10', usable: 'V10', category: 3, type: 1, vendor: '奇安信', source: '集采', dom: 1 },
    { key: 'freeav', name: '360杀毒', version: '', usable: '', category: 3, type: 3, vendor: '奇虎360', source: '官网下载', dom: 1 },
    { key: 'safe360', name: '360安全卫士', version: '', usable: '', category: 3, type: 3, vendor: '奇虎360', source: '官网下载', dom: 1 },
    { key: 'tav', name: '腾讯电脑管家', version: '', usable: '', category: 3, type: 3, vendor: '腾讯', source: '官网下载', dom: 1 },
    { key: 'kav', name: '金山毒霸', version: '', usable: '', category: 3, type: 3, vendor: '金山软件', source: '官网下载', dom: 1 },
    { key: 'huorong', name: '火绒安全软件', version: '5.0', usable: '5.0', category: 3, type: 3, vendor: '火绒安全', source: '官网下载', dom: 1 },
    // 工业软件类（CAD 等）
    { key: 'cad', name: 'AutoCAD', version: '2024', usable: '2024', category: 4, type: 1, vendor: '欧特克（Autodesk）', source: '集采', dom: 0 },
    { key: 'caxa', name: 'CAXA 电子图板', version: '2024', usable: '2024', category: 4, type: 1, vendor: '数码大方', source: '集采', dom: 1 },
    { key: 'bim', name: '广联达BIM土建计量', version: 'GTJ2025', usable: 'GTJ2025', category: 4, type: 1, vendor: '广联达', source: '集采', dom: 1 },
    { key: 'arcgis', name: 'ArcGIS Desktop', version: '10.8', usable: '10.8', category: 4, type: 1, vendor: 'Esri', source: '集采', dom: 0 }
  ]
  for (const s of swDefs) {
    const no = await genSoftwareNo({
      software_type: s.type,
      software_name: s.name,
      version: s.version,
      usable_version: s.usable
    })
    const ret = await baseSoftware.insert({
      tenant_id: 0,
      software_no: no,
      software_name: s.name,
      version: s.version,
      usable_version: s.usable,
      category: s.category,
      software_type: s.type,
      is_domestic: s.dom,
      vendor: s.vendor,
      source: s.source
    }, ctx)
    softwares[s.key] = ret.insertId
  }

  /* ===== 合同与授权（FR-06/FR-07）===== */
  const c1 = await purContract.insert({
    contract_no: 'HT-2026-001',
    contract_name: '微软Windows/WPS办公软件采购合同',
    supplier: '安徽某某科技有限公司',
    sign_date: '2026-01-10',
    effective_date: '2026-02-01',
    expire_date: '2027-01-31',
    amount: 286000,
    software_ids: JSON.stringify([softwares.win, softwares.wps])
  }, ctx)
  const c2 = await purContract.insert({
    contract_no: 'HT-2026-002',
    contract_name: '工业软件（CAD/GIS）采购合同',
    supplier: '某某数码科技有限责任公司',
    sign_date: '2026-03-15',
    effective_date: '2026-04-01',
    expire_date: '2027-03-31',
    amount: 152000,
    software_ids: JSON.stringify([softwares.cad, softwares.arcgis])
  }, ctx)

  const entDefs = [
    { sw: 'win', qty: 300, expire: '2027-01-31', contract: c1.insertId, license_type: '数量授权', amount: 80000, serial: 'MP-W11-2026-8899-AABB' },
    { sw: 'wps', qty: 320, expire: '2027-01-31', contract: c1.insertId, license_type: '场地授权', amount: 66000 },
    { sw: 'kill', qty: 280, expire: '2026-12-15', contract: 0, license_type: '订阅授权', amount: 42000 },
    { sw: 'cad', qty: 10, expire: '2027-03-31', contract: c2.insertId, license_type: '数量授权', amount: 92000, serial: 'ACD-2024-1122334' },
    { sw: 'arcgis', qty: 6, expire: '2027-03-31', contract: c2.insertId, license_type: '数量授权', amount: 60000, serial: 'AGS-10.8-556677' }
  ]
  for (const e of entDefs) {
    await purEntitlement.insert({
      software_id: softwares[e.sw],
      contract_id: e.contract,
      auth_type: e.license_type,
      license_type: e.license_type,
      license_qty: e.qty,
      purchase_date: '2026-02-01',
      purchase_amount: e.amount,
      purchase_method: 1,
      usable_version: '',
      license_term: '1年',
      expire_date: e.expire,
      serial_no: e.serial ? aesEncrypt(e.serial) : ''
    }, ctx)
  }
  await purAdminAccount.insert({
    software_id: softwares.kill,
    account_name: 'tqadmin',
    account_pwd: aesEncrypt('Tq@2026#Admin'),
    holder_id: users.it1,
    holder_phone: '13800000001',
    permission_desc: '天擎控制台管理员（分组/策略下发）',
    change_date: todayStr()
  }, ctx)
  await purLicenseAlloc.insert({ entitlement_id: 1, target_type: 2, target_id: depts['hq-信息化部'], target_name: '信息化部', qty: 60 }, ctx)

  /* ===== 免费软件清单（附件6）===== */
  const freeDefs = [
    { sw: 'freeav', useDept: '各部门', reason: '终端病毒防护备选' },
    { sw: 'zip', useDept: '各部门', reason: '压缩解压工具' }
  ]
  for (const f of freeDefs) {
    await baseFreeSoftware.insert({
      software_id: softwares[f.sw],
      vendor: f.sw === 'freeav' ? '奇虎360' : 'Igor Pavlov',
      source: '官网下载',
      use_dept: f.useDept,
      use_reason: f.reason,
      service_contact: '-'
    }, ctx)
  }

  /* ===== 领导小组（附件1）===== */
  const leaderDefs = [
    { division: '组长', dept: '集团本部', position: '分管领导', name: '演示领导', phone: '000-0000001', sort: 1 },
    { division: '副组长', dept: '信息化部', position: '主任', name: '演示主任', phone: '000-0000002', sort: 2 },
    { division: '成员', dept: '财务部', position: '部长', name: '演示成员', phone: '000-0000003', sort: 3 }
  ]
  for (const l of leaderDefs) {
    await baseLeader.insert({ division: l.division, dept: l.dept, position: l.position, name: l.name, phone: l.phone, sort_no: l.sort }, ctx)
  }

  console.log('[seed] 软件/合同/授权 完成')

  /* ===== 计算机台账 + 安装明细（一机一档）===== */
  const pcDefs = [
    { no: '', org: 'hq', dept: '信息化部', user: 'emp1', type: 3, brand: '联想', model: 'ThinkPad T14', loc: '信息楼201' },
    { no: '', org: 'hq', dept: '信息化部', user: 'asset', type: 2, brand: '戴尔', model: 'OptiPlex 7010', loc: '信息楼203' },
    { no: '', org: 'hq', dept: '财务部', user: 'finance', type: 2, brand: '联想', model: '启天M455', loc: '办公楼305' },
    { no: '', org: 'hfe', dept: '运行保障部', user: 'emp2', type: 3, brand: '华为', model: 'MateBook B5-430', loc: '航站楼机房' },
    { no: '', org: 'hfe', dept: '信息化部', user: 0, type: 1, brand: '浪潮', model: 'NF5280M6', loc: '中心机房A区', status: 1 },
    { no: '', org: 'tuo', dept: '信息化部', user: 0, type: 2, brand: '惠普', model: 'ProDesk 480', loc: '第二分公司办公楼', status: 2 }
  ]
  const pcs = []
  for (const p of pcDefs) {
    const orgRow = await sysOrg.get(Number(oid[p.org]))
    const no = await genComputerNo(orgRow.org_code)
    const ret = await assetComputer.insert({
      computer_no: no,
      brand: p.brand,
      model: p.model,
      sn: 'SN' + Date.now() + crypto.randomBytes(2).toString('hex').toUpperCase(),
      computer_type: p.type,
      org_id: oid[p.org],
      dept_id: depts[p.org + '-' + p.dept],
      user_id: p.user ? users[p.user] : 0,
      location: p.loc,
      enable_date: '2026-01-05',
      status: p.status || 1
    }, ctx)
    pcs.push({ id: ret.insertId, no, key: p.user || p.org + p.dept })
  }

  const insDefs = [
    { pc: 0, sw: 'oemwin', date: '2026-01-05', src: '统一部署' },
    { pc: 0, sw: 'wps', date: '2026-01-06', src: '统一部署' },
    { pc: 0, sw: 'kill', date: '2026-01-06', src: '统一部署' },
    { pc: 0, sw: 'zip', date: '2026-02-11', src: '个人申请' },
    { pc: 1, sw: 'win', date: '2026-01-07', src: '统一部署' },
    { pc: 1, sw: 'wps', date: '2026-01-07', src: '统一部署' },
    { pc: 1, sw: 'kill', date: '2026-01-08', src: '统一部署' },
    { pc: 1, sw: 'cad', date: '2026-03-02', src: '个人申请' },
    { pc: 2, sw: 'win', date: '2026-01-07', src: '统一部署' },
    { pc: 2, sw: 'wps', date: '2026-01-08', src: '统一部署' },
    { pc: 3, sw: 'oemwin', date: '2026-01-09', src: '统一部署' },
    { pc: 3, sw: 'wps', date: '2026-01-10', src: '统一部署' },
    { pc: 3, sw: 'kill', date: '2026-01-10', src: '统一部署' },
    { pc: 3, sw: 'arcgis', date: '2026-04-14', src: '个人申请' },
    { pc: 4, sw: 'win', date: '2026-01-12', src: '统一部署' },
    { pc: 4, sw: 'kill', date: '2026-01-12', src: '统一部署' },
    { pc: 5, sw: 'oemwin', date: '2026-01-15', src: '统一部署' }
  ]
  const pcUserMap = { 0: users.emp1, 1: users.asset, 2: users.finance, 3: users.emp2 }
  const pcDeptMap = { 0: depts['hq-信息化部'], 1: depts['hq-信息化部'], 2: depts['hq-财务部'], 3: depts['hfe-运行保障部'], 4: depts['hfe-信息化部'], 5: depts['tuo-信息化部'] }
  for (const ins of insDefs) {
    // 预置软件在平台通用层（tenant_id=0），用三态查询读取（跨层可见）
    const swRows = await asset.softwareById({ id: Number(softwares[ins.sw]) })
    const swRow = swRows[0]
    await assetInstallRecord.insert({
      computer_id: pcs[ins.pc].id,
      software_id: softwares[ins.sw],
      dept_id: pcDeptMap[ins.pc],
      user_id: pcUserMap[ins.pc] || 0,
      version: swRow.version || '',
      license_term: swRow.software_type === 1 ? '1年' : '长期',
      install_date: ins.date,
      install_source: ins.src
    }, ctx)
  }

  /* ===== 维护日志 + 流程样例（FR-08 全状态）===== */
  const swWpsRows = await asset.softwareById({ id: Number(softwares.wps) })
  const swWps = swWpsRows[0]
  const a1 = await flowMaintApply.insert({
    apply_no: 'AP-20261118-0001',
    dept_id: depts['hq-信息化部'],
    applicant_id: users.emp1,
    apply_time: '2026-11-18 09:30:00',
    computer_id: pcs[0].id,
    apply_type: 1,
    software_id: softwares.wps,
    software_name: swWps.software_name,
    version: swWps.version,
    reason: '日常办公需要安装WPS表格组件',
    status: 20,
    current_node: '信息化部门审核'
  }, ctx)
  await flowApproval.insert({
    apply_id: a1.insertId,
    node: '部门负责人审核',
    approver_id: users.leader1,
    result: 1,
    opinion: '同意，请信息化部门审核',
    approve_time: '2026-11-18 10:02:00'
  }, ctx)
  const a2 = await flowMaintApply.insert({
    apply_no: 'AP-20261119-0001',
    dept_id: depts['hfe-运行保障部'],
    applicant_id: users.emp2,
    apply_time: '2026-11-19 14:20:00',
    computer_id: pcs[3].id,
    apply_type: 3,
    software_id: softwares.cad,
    software_name: 'AutoCAD',
    version: '2024',
    upgrade_from: 'AutoCAD 2022',
    upgrade_to: 'AutoCAD 2024',
    reason: '工程图纸格式兼容需要',
    status: 10,
    current_node: '部门负责人审核'
  }, ctx)
  const a3 = await flowMaintApply.insert({
    apply_no: 'AP-20261110-0001',
    dept_id: depts['hq-信息化部'],
    applicant_id: users.emp1,
    apply_time: '2026-11-10 15:00:00',
    computer_id: pcs[0].id,
    apply_type: 1,
    software_id: softwares.zip,
    software_name: '7-Zip',
    version: '24.08',
    reason: '压缩解压工具',
    status: 50,
    current_node: '已完成',
    finish_time: '2026-11-12 16:30:00'
  }, ctx)
  await flowApproval.insert({ apply_id: a3.insertId, node: '部门负责人审核', approver_id: users.leader1, result: 1, opinion: '同意', approve_time: '2026-11-11 08:40:00' }, ctx)
  await flowApproval.insert({ apply_id: a3.insertId, node: '信息化部门审核', approver_id: users.asset, result: 1, opinion: '免费软件，同意', approve_time: '2026-11-11 09:15:00' }, ctx)
  const cf3 = await flowConfirm.insert({
    apply_id: a3.insertId,
    computer_id: pcs[0].id,
    op_type: 1,
    result: 1,
    user_sign: '陈小明',
    user_sign_time: '2026-11-12 16:30:00',
    operator_sign: '赵维',
    operator_sign_time: '2026-11-12 16:28:00'
  }, ctx)
  await assetMaintLog.insert({
    computer_id: pcs[0].id,
    software_id: softwares.zip,
    op_type: 1,
    op_date: '2026-11-12 16:28:00',
    operator_id: users.it1,
    reason: '按申请单安装',
    apply_id: a3.insertId,
    confirm_id: cf3.insertId
  }, ctx)

  /* ===== 预警示例 ===== */
  await bizAlert.insert({
    alert_type: 2,
    biz_type: 'software',
    biz_id: softwares.win,
    level: 1,
    content: 'Windows 11 专业版 安装数量超过许可数量（许可300，安装302），请核查',
    org_id: oid.hq,
    status: 0
  }, ctx)
  await bizAlert.insert({
    alert_type: 1,
    biz_type: 'entitlement',
    biz_id: 3,
    level: 2,
    content: '奇安信天擎 授权将于2026-12-15到期，请及时续订',
    org_id: oid.hq,
    status: 0
  }, ctx)

  console.log('[seed] 台账/流程/预警 完成')
  })
}

seed()
  .then(() => {
    console.log('[seed] done')
    process.exit(0)
  })
  .catch((e) => {
    console.error('[seed] 失败:', e)
    process.exit(1)
  })
