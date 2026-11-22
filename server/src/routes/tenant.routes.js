/**
 * 多租户管理接口：企业资料 / 数据备份与恢复 / 附件3 Excel 导入导出
 * 全部接口在 JWT 保护下，数据读写由租户上下文自动隔离
 */
import { Router } from 'express'
import multer from 'multer'
import Excel from 'exceljs'
import * as SheetJS from 'xlsx'
import { requirePerm } from '../middleware/rbac.js'
import { ok, ApiError, asyncH, requireFields, toInt } from '../utils/response.js'
import { tx } from '../db/index.js'
import { nowStr, todayStr } from '../db/util.js'
import {
  sysOrg, sysDept, sysUser, sysUserRole,
  assetComputer, assetInstallRecord, assetMaintLog,
  baseSoftware, baseFreeSoftware, baseLeader,
  purRequireApply, purPlan, purContract, purEntitlement, purAdminAccount, purLicenseAlloc,
  flowMaintApply, flowApproval, flowConfirm,
  insTask, insCheck, bizAlert
} from '../db/dao/index.js'

const router = Router()
const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

/* ==================== 数据备份：JSON 全量导出/恢复 ==================== */

// 备份表清单（导出/恢复顺序，依赖在前）
const BACKUP_ORDER = [
  ['orgs', sysOrg],
  ['depts', sysDept],
  ['users', sysUser],
  ['softwares', baseSoftware],
  ['computers', assetComputer],
  ['freeSoftwares', baseFreeSoftware],
  ['leaders', baseLeader],
  ['requireApplies', purRequireApply],
  ['plans', purPlan],
  ['contracts', purContract],
  ['entitlements', purEntitlement],
  ['adminAccounts', purAdminAccount],
  ['licenseAllocs', purLicenseAlloc],
  ['maintApplies', flowMaintApply],
  ['approvals', flowApproval],
  ['confirms', flowConfirm],
  ['installRecords', assetInstallRecord],
  ['maintLogs', assetMaintLog],
  ['insTasks', insTask],
  ['insChecks', insCheck],
  ['alerts', bizAlert],
  ['userRoles', sysUserRole]
]

/* ==================== 企业资料（租户信息） ==================== */

// GET /api/tenant/profile
router.get('/profile', asyncH(async (req, res) => {
  const { sysTenant } = await import('../db/dao/index.js')
  if (!req.user.tenant_id) throw new ApiError('平台运营账号无企业资料', 400)
  const rows = await sysTenant.list({ id: Number(req.user.tenant_id) }, { pageSize: 1 })
  ok(res, rows[0] || null)
}))

// PUT /api/tenant/profile
router.put('/profile', requirePerm('config:edit'), asyncH(async (req, res) => {
  const { sysTenant } = await import('../db/dao/index.js')
  if (!req.user.tenant_id) throw new ApiError('平台运营账号无企业资料', 400)
  await sysTenant.update(Number(req.user.tenant_id), {
    tenant_name: req.body.tenant_name,
    contact_person: req.body.contact_person,
    contact_phone: req.body.contact_phone,
    address: req.body.address,
    industry: req.body.industry,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '企业信息已更新')
}))

/* ==================== 数据备份导出（JSON 全量） ==================== */

// GET /api/tenant/backup/export — 本租户全部业务数据打包下载
router.get('/backup/export', requirePerm('config:edit'), asyncH(async (req, res) => {
  const { system } = await import('../db/queries/index.js')
  const data = { version: 2, exported_at: nowStr(), tenant_id: req.user.tenant_id, tables: {} }
  for (const [key, dao] of BACKUP_ORDER) {
    // sys_user 为租户排除表（登录需跨租户查询），备份时显式按租户过滤
    if (key === 'users') {
      data.tables[key] = await system.userRows({}, { page: 1, pageSize: 5000 })
    } else {
      data.tables[key] = await dao.listAll({})
    }
  }
  // 用户角色关联仅保留本租户用户的
  const myUserIds = new Set(data.tables.users.map((u) => u.id))
  data.tables.userRoles = data.tables.userRoles.filter((r) => myUserIds.has(r.user_id))
  const body = JSON.stringify(data, null, 2)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent('软件台账备份-' + todayStr() + '.json') + '"')
  res.send(body)
}))

/* ==================== 数据备份恢复（JSON 导入，映射重建） ==================== */

// 各表外键 → 旧ID映射表的对应关系（恢复时重写为新ID）
const FK_MAP = {
  orgs: { sysOrg: { parent_id: 'orgs' } },
  depts: { sysDept: { org_id: 'orgs', parent_id: 'orgs' } },
  users: { sysUser: { org_id: 'orgs', dept_id: 'depts' } },
  softwares: {},
  computers: { assetComputer: { org_id: 'orgs', dept_id: 'depts', user_id: 'users' } },
  freeSoftwares: { baseFreeSoftware: { software_id: 'softwares' } },
  leaders: {},
  requireApplies: { purRequireApply: { dept_id: 'depts', applicant_id: 'users' } },
  plans: { purPlan: { dept_id: 'depts', applicant_id: 'users' } },
  contracts: { purContract: { _json: [['software_ids', 'softwares']] } },
  entitlements: { purEntitlement: { software_id: 'softwares', contract_id: 'contracts' } },
  adminAccounts: { purAdminAccount: { software_id: 'softwares', holder_id: 'users' } },
  licenseAllocs: { purLicenseAlloc: { entitlement_id: 'entitlements', _mixed: { target_id: { 1: 'orgs', 2: 'depts', 3: 'computers', 4: 'users' }, by: 'target_type' } } },
  maintApplies: { flowMaintApply: { dept_id: 'depts', applicant_id: 'users', computer_id: 'computers', software_id: 'softwares' } },
  approvals: { flowApproval: { apply_id: 'maintApplies', approver_id: 'users' } },
  confirms: { flowConfirm: { apply_id: 'maintApplies', computer_id: 'computers' } },
  installRecords: { assetInstallRecord: { computer_id: 'computers', software_id: 'softwares', dept_id: 'depts', user_id: 'users' } },
  maintLogs: { assetMaintLog: { computer_id: 'computers', software_id: 'softwares', operator_id: 'users', apply_id: 'maintApplies', confirm_id: 'confirms' } },
  insTasks: { insTask: { org_id: 'orgs' } },
  insChecks: { insCheck: { task_id: 'insTasks', computer_id: 'computers', checker_id: 'users' } },
  alerts: { bizAlert: { biz_id: 'alerts_mixed' } },
  userRoles: { sysUserRole: { user_id: 'users' } }
}

function mapFk(row, fkDef, maps, tenantId) {
  const out = { ...row, tenant_id: tenantId }
  for (const [field, mapKey] of Object.entries(fkDef)) {
    if (field.startsWith('_')) continue
    const m = maps[mapKey]
    if (!m) continue
    const old = row[field]
    out[field] = old && m.get(Number(old)) !== undefined ? Number(m.get(Number(old))) : 0
  }
  return out
}

// POST /api/tenant/backup/import — 上传备份 JSON，清空本租户数据后映射恢复
router.post('/backup/import', requirePerm('config:edit'), asyncH(async (req, res) => {
  if (!req.body || !req.body.version || !req.body.tables) throw new ApiError('备份文件格式不正确', 400)
  const tenantId = Number(req.user.tenant_id)
  if (!tenantId) throw new ApiError('平台运营账号不支持恢复', 400)
  const tables = req.body.tables
  const maps = {}
  let total = 0
  await tx(async () => {
    // 1) 物理清空本租户现有数据（恢复要求干净环境；唯一索引才不会冲突）
    for (const [key, dao] of BACKUP_ORDER) {
      if (typeof dao.purgeByTenant === 'function') await dao.purgeByTenant(tenantId)
    }
    // 2) 按依赖顺序映射重建
    for (const [key, dao] of BACKUP_ORDER) {
      const rows = tables[key] || []
      const fkDef = FK_MAP[key] && Object.values(FK_MAP[key])[0]
      const m = new Map()
      maps[key] = m
      for (const row of rows) {
        const newRow = fkDef ? mapFk(row, fkDef, maps, tenantId) : { ...row, tenant_id: tenantId }
        // biz_alert 的 biz_id 按 biz_type 混合映射
        if (key === 'alerts' && row.biz_id) {
          const src = { entitlement: 'entitlements', computer: 'computers', software: 'softwares', user: 'users', org: 'orgs' }[row.biz_type]
          if (src && maps[src]) {
            const v = maps[src].get(Number(row.biz_id))
            newRow.biz_id = v !== undefined ? Number(v) : 0
          } else {
            newRow.biz_id = 0
          }
        }
        // 用户表特殊处理：按 username upsert（保留现有登录账号与密码，防止恢复把管理员锁掉）
        if (key === 'users') {
          const exist = await sysUser.list({ username: newRow.username }, { pageSize: 1 })
          if (exist.length) {
            await sysUser.update(Number(exist[0].id), {
              real_name: newRow.real_name,
              org_id: newRow.org_id,
              dept_id: newRow.dept_id,
              position: newRow.position,
              phone: newRow.phone
            }, req.user)
            m.set(Number(row.id), Number(exist[0].id))
            total += 1
            continue
          }
        }
        const ins = await dao.insert(newRow)
        if (row.id !== undefined && row.id !== null) m.set(Number(row.id), Number(ins.insertId))
        total += 1
      }
    }
  })
  ok(res, { restored: total }, '数据恢复完成（' + total + ' 条记录）')
}))

/* ==================== 附件3：软件使用情况明细表 Excel 导出/导入 ==================== */

// GET /api/tenant/attachment3/export — 按附件3 模板格式导出明细表（xlsx）
router.get('/attachment3/export', requirePerm('report:export'), asyncH(async (req, res) => {
  const { asset } = await import('../db/queries/index.js')
  const { sysTenant } = await import('../db/dao/index.js')
  const rows = await asset.installRows({}, { page: 1, pageSize: 5000 })
  const tRows = req.user.tenant_id ? await sysTenant.list({ id: Number(req.user.tenant_id) }, { pageSize: 1 }) : []
  const tenantName = tRows[0] ? tRows[0].tenant_name : ''

  const wb = new Excel.Workbook()
  const ws = wb.addWorksheet('软件使用情况明细表')
  ws.mergeCells('A1:N1')
  ws.getCell('A1').value = '软件使用情况明细表'
  ws.getCell('A1').font = { size: 16, bold: true }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 30
  ws.mergeCells('A2:N2')
  ws.getCell('A2').value = '单位名称（盖章）：' + tenantName + '    填表人：' + (req.user.real_name || '') + '    联系电话：      填表日期：' + todayStr()
  ws.getRow(2).height = 20

  const header = ['序号', '部门', '姓名', '计算机编号', '计算机品牌', '软件编号', '软件名称', '软件版本', '许可期限', '商业软件', 'OEM软件', '免费软件', '安装日期', '现场核查情况']
  const headerRow = ws.getRow(3)
  header.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
    headerRow.getCell(i + 1).font = { bold: true }
    headerRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  ws.getRow(3).height = 22

  const INS = { 1: '相符', 2: '不符', 3: '未安装', 4: '未登记' }
  rows.forEach((r, i) => {
    const row = ws.getRow(4 + i)
    row.getCell(1).value = i + 1
    row.getCell(2).value = r.dept_name || ''
    row.getCell(3).value = r.user_name || ''
    row.getCell(4).value = r.computer_no || ''
    row.getCell(5).value = r.brand || ''
    row.getCell(6).value = r.software_no || ''
    row.getCell(7).value = r.software_name || ''
    row.getCell(8).value = r.version || ''
    row.getCell(9).value = r.license_term || ''
    row.getCell(10).value = Number(r.software_type) === 1 ? '√' : ''
    row.getCell(11).value = Number(r.software_type) === 2 ? '√' : ''
    row.getCell(12).value = Number(r.software_type) === 3 ? '√' : ''
    row.getCell(13).value = r.install_date || ''
    row.getCell(14).value = INS[Number(r.inspect_status)] || ''
    row.alignment = { vertical: 'middle' }
  })
  const widths = [6, 14, 10, 14, 12, 14, 20, 12, 10, 9, 9, 9, 12, 12]
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent('附件3-软件使用情况明细表-' + todayStr() + '.xlsx') + '"')
  await wb.xlsx.write(res)
  res.end()
}))

// POST /api/tenant/attachment3/import — 上传附件3 格式 Excel（xls/xlsx），解析导入安装明细
router.post('/attachment3/import', requirePerm('install:edit'), uploadMem.single('file'), asyncH(async (req, res) => {
  const { assetComputer, baseSoftware, assetInstallRecord, sysOrg, sysDept } = await import('../db/dao/index.js')
  const { genSoftwareNo } = await import('../utils/noGen.js')
  if (!req.file) throw new ApiError('未接收到文件', 400)
  const wb = SheetJS.read(req.file.buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const grid = SheetJS.utils.sheet_to_json(ws, { header: 1 })
  let headIdx = -1
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    if ((grid[i] || []).some((c) => String(c || '').includes('计算机编号'))) { headIdx = i; break }
  }
  if (headIdx < 0) throw new ApiError('未识别到附件3 表头（需包含"计算机编号"列）', 400)
  const head = grid[headIdx]
  const colOf = (label) => head.findIndex((c) => String(c || '').includes(label))
  const col = { dept: colOf('部门'), name: colOf('姓名'), pcNo: colOf('计算机编号'), brand: colOf('计算机品牌'), swNo: colOf('软件编号'), swName: colOf('软件名称'), ver: colOf('软件版本'), term: colOf('许可期限'), date: colOf('安装日期') }
  const colComm = head.findIndex((c) => String(c || '').includes('商业'))
  const colOem = head.findIndex((c) => String(c || '').includes('OEM'))
  const colFree = head.findIndex((c) => String(c || '').includes('免费'))

  const CHECK_RE = /√|☑|■|x|X|Y|y|1/
  let success = 0
  const failed = []
  const computerMap = {}
  for (let i = headIdx + 1; i < grid.length; i++) {
    const row = grid[i] || []
    const pcNo = String(row[col.pcNo] || '').trim()
    const swName = String(row[col.swName] || '').trim()
    if (!pcNo && !swName) continue
    try {
      if (!pcNo || !swName) throw new Error('缺少计算机编号或软件名称')
      // 计算机：按编号匹配，不存在则自动建档
      let pc = computerMap[pcNo]
      if (!pc) {
        const exist = await assetComputer.list({ computer_no: pcNo }, { pageSize: 1 })
        if (exist.length) {
          pc = exist[0]
        } else {
          const orgRows = await sysOrg.list({}, { pageSize: 1 })
          const pcOrg = orgRows[0]
          if (!pcOrg) throw new Error('请先建立单位组织')
          const deptRows = await sysDept.list({ org_id: pcOrg.id }, { pageSize: 1 })
          const created = await assetComputer.insert({
            computer_no: pcNo,
            brand: String(row[col.brand] || '').trim(),
            computer_type: 2,
            org_id: pcOrg.id,
            dept_id: deptRows[0].id,
            user_id: 0,
            location: '附件3 导入自动建档',
            status: 1
          })
          pc = { id: created.insertId, dept_id: deptRows[0].id, user_id: 0 }
        }
        computerMap[pcNo] = pc
      }
      // 软件：按名称匹配软件资产库；不存在则自动建档（类型按勾选列判定）
      let sw = (await baseSoftware.list({ software_name: swName }, { pageSize: 1 }))[0]
      if (!sw) {
        const swType = colOem >= 0 && CHECK_RE.test(String(row[colOem] || '')) ? 2 : (colFree >= 0 && CHECK_RE.test(String(row[colFree] || '')) ? 3 : 1)
        const no = await genSoftwareNo({ software_type: swType, software_name: swName, version: String(row[col.ver] || '').trim() })
        const ins = await baseSoftware.insert({
          software_no: no,
          software_name: swName,
          version: String(row[col.ver] || '').trim(),
          category: 2,
          software_type: swType,
          vendor: '',
          source: '附件3 导入'
        })
        sw = { id: ins.insertId, version: String(row[col.ver] || '').trim() }
      }
      const dup = await assetInstallRecord.list({ computer_id: pc.id, software_id: sw.id }, { pageSize: 1 })
      if (dup.length) throw new Error('该机已登记此软件（重复行）')
      const dateRaw = row[col.date]
      const dateStr = dateRaw instanceof Date ? dateRaw.toISOString().slice(0, 10) : String(dateRaw || '').slice(0, 10)
      await assetInstallRecord.insert({
        computer_id: pc.id,
        software_id: sw.id,
        dept_id: Number(pc.dept_id || 0),
        user_id: Number(pc.user_id || 0),
        version: String(row[col.ver] || '').trim() || sw.version || '',
        license_term: String(row[col.term] || '').trim(),
        install_date: dateStr && /^\d{4}-\d{2}-\d{2}/.test(dateStr) ? dateStr.slice(0, 10) : todayStr(),
        install_source: '附件3 导入'
      })
      success += 1
    } catch (e) {
      failed.push({ row: i + 1, reason: e.message })
    }
  }
  ok(res, { success, failed }, '导入完成：成功 ' + success + ' 条，失败 ' + failed.length + ' 条')
}))

/* ==================== 消息通道配置（租户自有短信/SMTP + 额度） ==================== */

// GET /api/tenant/msg-config — 自有通道配置（密钥脱敏）+ 平台分配额度与用量
router.get('/msg-config', requirePerm('config:edit'), asyncH(async (req, res) => {
  const { tenantMsgConfig, sysTenant } = await import('../db/dao/index.js')
  const rows = await tenantMsgConfig.list({ tenant_id: Number(req.user.tenant_id) }, { pageSize: 1 })
  const c = rows[0] || {}
  const tRows = await sysTenant.list({ id: Number(req.user.tenant_id) }, { pageSize: 1 })
  const t = tRows[0] || {}
  const maskKey = (v) => (v ? '已配置（****）' : '')
  ok(res, {
    config: {
      sms_enabled: Number(c.sms_enabled) === 1,
      sms_mode: c.sms_mode || 'mock',
      sms_access_key_id: c.sms_access_key_id || '',
      sms_sign_name: c.sms_sign_name || '',
      sms_template_code: c.sms_template_code || '',
      has_sms_secret: maskKey(c.sms_access_key_secret) !== '',
      smtp_enabled: Number(c.smtp_enabled) === 1,
      smtp_host: c.smtp_host || '',
      smtp_port: Number(c.smtp_port) || 465,
      smtp_secure: Number(c.smtp_secure) === 1,
      smtp_user: c.smtp_user || '',
      smtp_from: c.smtp_from || '',
      has_smtp_pass: !!c.smtp_pass,
      expire_sms_days: Number(c.expire_sms_days) || 7,
      expire_email_days: Number(c.expire_email_days) || 7
    },
    quota: {
      use_platform_sms: Number(t.use_platform_sms) === 1,
      sms_quota: Number(t.sms_quota || 0),
      sms_used: Number(t.sms_used || 0),
      use_platform_email: Number(t.use_platform_email) === 1,
      email_quota: Number(t.email_quota || 0),
      email_used: Number(t.email_used || 0)
    }
  })
}))

// PUT /api/tenant/msg-config — 保存自有通道配置（密钥传空表示保留原值）
router.put('/msg-config', requirePerm('config:edit'), asyncH(async (req, res) => {
  const { tenantMsgConfig } = await import('../db/dao/index.js')
  const { aesEncrypt } = await import('../utils/crypto.js')
  requireFields(req.body, [])
  const tenantId = Number(req.user.tenant_id)
  if (!tenantId) throw new ApiError('平台运营账号无租户消息配置', 400)
  const b = req.body
  const prevRows = await tenantMsgConfig.list({ tenant_id: tenantId }, { pageSize: 1 })
  const prev = prevRows[0]
  const data = {
    tenant_id: tenantId,
    sms_enabled: b.sms_enabled ? 1 : 0,
    sms_mode: b.sms_mode || 'mock',
    sms_access_key_id: b.sms_access_key_id,
    sms_sign_name: b.sms_sign_name,
    sms_template_code: b.sms_template_code,
    smtp_enabled: b.smtp_enabled ? 1 : 0,
    smtp_host: b.smtp_host,
    smtp_port: toInt(b.smtp_port || 465),
    smtp_secure: b.smtp_secure ? 1 : 0,
    smtp_user: b.smtp_user,
    smtp_from: b.smtp_from,
    expire_sms_days: toInt(b.expire_sms_days || 7),
    expire_email_days: toInt(b.expire_email_days || 7)
  }
  // 密钥/密码：传入非空才更新（AES 加密入库），传空保留原值
  if (b.sms_access_key_secret) data.sms_access_key_secret = aesEncrypt(String(b.sms_access_key_secret))
  if (b.smtp_pass) data.smtp_pass = aesEncrypt(String(b.smtp_pass))
  if (prev) {
    await tenantMsgConfig.update(prev.id, data, req.user)
  } else {
    await tenantMsgConfig.insert(data, req.user)
  }
  ok(res, null, '消息配置已保存')
}))

// POST /api/tenant/msg-config/test-sms — 自有短信通道测试发送
router.post('/msg-config/test-sms', requirePerm('config:edit'), asyncH(async (req, res) => {
  const { sendTenantSms } = await import('../services/notifyService.js')
  requireFields(req.body, ['phone'])
  const r = await sendTenantSms(Number(req.user.tenant_id), String(req.body.phone), '租户短信通道测试消息')
  if (r === null) throw new ApiError('无可用短信通道（自有通道未启用或平台未分配额度）', 400)
  ok(res, { source: r.source }, '测试短信已发送（来源：' + (r.source === 'tenant' ? '自有通道' : '平台通道') + '）')
}))

// POST /api/tenant/msg-config/test-email — 自有SMTP邮箱通道测试发送
router.post('/msg-config/test-email', requirePerm('config:edit'), asyncH(async (req, res) => {
  const { sendTenantEmail } = await import('../services/notifyService.js')
  requireFields(req.body, ['email'])
  const r = await sendTenantEmail(Number(req.user.tenant_id), String(req.body.email), '租户邮箱通道测试', '<p>这是一封租户 SMTP 通道测试邮件。</p>')
  if (r === null) throw new ApiError('无可用邮箱通道（自有SMTP未启用或平台未分配额度）', 400)
  ok(res, { source: r.source }, '测试邮件已发送（来源：' + (r.source === 'tenant' ? '自有通道' : '平台通道') + '）')
}))

// GET /api/tenant/msg-send-logs — 发送记录（最近100条）
router.get('/msg-send-logs', requirePerm('config:edit'), asyncH(async (req, res) => {
  const { msgSendLog } = await import('../db/dao/index.js')
  ok(res, (await msgSendLog.list({}, { page: 1, pageSize: 100 })).slice(0, 100))
}))

export default router
