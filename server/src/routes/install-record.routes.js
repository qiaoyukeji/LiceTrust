/** 安装明细接口（FR-04，附件3数据源） */
import { Router } from 'express'
import { assetComputer, baseSoftware, assetInstallRecord } from '../db/dao/index.js'
import { asset } from '../db/queries/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm, scopeFilters } from '../middleware/rbac.js'

const router = Router()

// GET /api/install-records — 分页列表（kw/orgId/deptId/category/softwareType/dateFrom/dateTo）
router.get('/', requirePerm('install:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const scope = scopeFilters(req.user, { org: 'orgId', dept: 'deptId', user: 'userId' })
  const f = { ...scope, kw: req.query.kw }
  if (req.query.orgId) f.orgId = toInt(req.query.orgId)
  if (req.query.deptId) f.deptId = toInt(req.query.deptId)
  if (req.query.category) f.category = toInt(req.query.category)
  if (req.query.softwareType) f.softwareType = toInt(req.query.softwareType)
  if (req.query.dateFrom) f.dateFrom = String(req.query.dateFrom)
  if (req.query.dateTo) f.dateTo = String(req.query.dateTo)
  const [list, total] = await Promise.all([
    asset.installRows(f, { page, pageSize }),
    asset.installCount(f)
  ])
  paged(res, list, total, page, pageSize)
}))

// GET /api/install-records/:computerId/installed — 某机已装软件列表（一机一档，FR-03）
router.get('/:computerId/installed', requirePerm('install:view'), asyncH(async (req, res) => {
  const list = await asset.computerInstalled({ computerId: toInt(req.params.computerId) })
  ok(res, list)
}))

/**
 * 单条登记校验（FR-04-04 自动校验）：
 * 编号存在性 + 同机同软件查重；返回计算机记录（用于冗余字段）
 */
async function validateInstall(body) {
  const computerId = toInt(body.computer_id)
  const softwareId = toInt(body.software_id)
  if (!computerId || !softwareId) throw new ApiError('computer_id 与 software_id 必填', 400)
  const comps = await assetComputer.list({ id: computerId }, { pageSize: 1 })
  const computer = comps && comps[0]
  if (!computer) throw new ApiError('计算机编号不存在: ' + computerId, 400)
  const sws = await baseSoftware.list({ id: softwareId }, { pageSize: 1 })
  if (!sws || !sws.length) throw new ApiError('软件不存在: ' + softwareId, 400)
  const dup = await assetInstallRecord.list({ computer_id: computerId, software_id: softwareId }, { pageSize: 1 })
  if (dup && dup.length) throw new ApiError('该计算机已登记此软件，请勿重复登记', 400)
  return { computerId, softwareId, computer }
}

/** 按校验结果组装插入数据（dept_id/user_id 冗余取计算机记录） */
function buildRow(v, body) {
  return {
    computer_id: v.computerId,
    software_id: v.softwareId,
    dept_id: v.computer.dept_id,
    user_id: v.computer.user_id,
    version: body.version,
    license_term: body.license_term,
    install_date: body.install_date,
    install_source: body.install_source,
    inspect_status: body.inspect_status !== undefined ? toInt(body.inspect_status) : undefined,
    remark: body.remark
  }
}

// POST /api/install-records — 新增登记（自动校验 + 冗余字段自动填）
router.post('/', requirePerm('install:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['computer_id', 'software_id'])
  const v = await validateInstall(req.body)
  const ret = await assetInstallRecord.insert(buildRow(v, req.body), req.user)
  ok(res, { id: ret.insertId }, '登记成功')
}))

// POST /api/install-records/import — 批量导入（逐条校验，失败行不影响其他行）
router.post('/import', requirePerm('install:edit'), asyncH(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : []
  if (!items.length) throw new ApiError('导入数据 items 不能为空', 400)
  let success = 0
  const failed = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      const v = await validateInstall(item)
      await assetInstallRecord.insert(buildRow(v, item), req.user)
      success++
    } catch (e) {
      failed.push({ row: i + 1, reason: e.message })
    }
  }
  ok(res, { success, failed }, '导入完成，成功 ' + success + ' 条，失败 ' + failed.length + ' 条')
}))

// PUT /api/install-records/:id — 修改（版本/许可期限/安装日期/来源/核查状态/备注）
router.put('/:id', requirePerm('install:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  const rows = await assetInstallRecord.list({ id }, { pageSize: 1 })
  if (!rows || !rows[0]) throw new ApiError('安装记录不存在', 404)
  await assetInstallRecord.update(id, {
    version: req.body.version,
    license_term: req.body.license_term,
    install_date: req.body.install_date,
    install_source: req.body.install_source,
    inspect_status: req.body.inspect_status !== undefined ? toInt(req.body.inspect_status) : undefined,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '修改成功')
}))

// DELETE /api/install-records/:id — 逻辑删除
router.delete('/:id', requirePerm('install:edit'), asyncH(async (req, res) => {
  await assetInstallRecord.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

export default router
