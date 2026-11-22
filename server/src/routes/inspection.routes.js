/** 检查督查接口（FR-10：督查任务 + 现场核查/整改） */
import { Router } from 'express'
import { insTask, insCheck, assetComputer, assetInstallRecord } from '../db/dao/index.js'
import { tx } from '../db/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { todayStr } from '../db/util.js'

const router = Router()

async function oneOf(dao, id, msg) {
  const rows = await dao.list({ id }, { pageSize: 1 })
  const row = rows && rows[0]
  if (!row) throw new ApiError(msg, 404)
  return row
}

/* ===== 督查/自查任务 ===== */

// GET /api/inspections — 任务分页（kw/status/year/checkType）
router.get('/', requirePerm('ins:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { _kw: req.query.kw }
  if (req.query.status !== undefined && req.query.status !== '') f.status = toInt(req.query.status)
  if (req.query.year) f.year = toInt(req.query.year)
  if (req.query.checkType) f.check_type = toInt(req.query.checkType)
  const [list, total] = await Promise.all([insTask.list(f, { page, pageSize }), insTask.count(f)])
  paged(res, list, total, page, pageSize)
}))

// POST /api/inspections — 新建任务（FR-10-01）
router.post('/', requirePerm('ins:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['title', 'check_type'])
  const ret = await insTask.insert({
    title: req.body.title,
    check_type: toInt(req.body.check_type),
    year: req.body.year !== undefined ? toInt(req.body.year) : new Date().getFullYear(),
    org_id: toInt(req.body.org_id || 0),
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    status: 1,
    remark: req.body.remark
  }, req.user)
  ok(res, { id: ret.insertId }, '创建成功')
}))

// PUT /api/inspections/:id — 修改任务
router.put('/:id', requirePerm('ins:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  await oneOf(insTask, id, '任务不存在')
  await insTask.update(id, {
    title: req.body.title,
    check_type: req.body.check_type !== undefined ? toInt(req.body.check_type) : undefined,
    year: req.body.year !== undefined ? toInt(req.body.year) : undefined,
    org_id: req.body.org_id !== undefined ? toInt(req.body.org_id) : undefined,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    status: req.body.status !== undefined ? toInt(req.body.status) : undefined,
    remark: req.body.remark
  }, req.user)
  ok(res, null, '修改成功')
}))

// PUT /api/inspections/:id/finish — 完成任务（status=2）
router.put('/:id/finish', requirePerm('ins:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  await oneOf(insTask, id, '任务不存在')
  await insTask.update(id, { status: 2 }, req.user)
  ok(res, null, '任务已完成')
}))

// DELETE /api/inspections/:id — 逻辑删除任务
router.delete('/:id', requirePerm('ins:edit'), asyncH(async (req, res) => {
  await insTask.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

/* ===== 现场核查记录 ===== */

// GET /api/inspections/checks/by-task/:taskId — 某任务下核查记录（含计算机编号）
router.get('/checks/by-task/:taskId', requirePerm('ins:view'), asyncH(async (req, res) => {
  const taskId = toInt(req.params.taskId)
  const list = await insCheck.listAll({ task_id: taskId })
  const comps = await Promise.all(list.map((r) => (r.computer_id ? oneOf(assetComputer, Number(r.computer_id)) : null)))
  ok(res, list.map((r, i) => ({ ...r, computer_no: comps[i] ? comps[i].computer_no : '' })))
}))

// POST /api/inspections/checks — 新增核查（FR-10-02/03），tx 内回写安装明细核查状态
router.post('/checks', requirePerm('ins:edit'), asyncH(async (req, res) => {
  requireFields(req.body, ['task_id', 'computer_id', 'result'])
  const computerId = toInt(req.body.computer_id)
  const result = toInt(req.body.result)
  const ret = await tx(async () => {
    const r = await insCheck.insert({
      task_id: toInt(req.body.task_id),
      computer_id: computerId,
      checker_id: req.user.id,
      check_date: todayStr(),
      result,
      problem_desc: req.body.problem_desc,
      evidence_url: req.body.evidence_url,
      rectify_status: result === 2 ? 1 : 0,
      rectify_remark: ''
    }, req.user)
    // 回写核查状态：整机核查结果应用到该机全部安装明细（简化实现）
    const recs = await assetInstallRecord.listAll({ computer_id: computerId })
    for (const rec of recs) {
      await assetInstallRecord.update(Number(rec.id), { inspect_status: result }, req.user)
    }
    return r
  })
  ok(res, { id: ret.insertId }, '核查记录已保存')
}))

// PUT /api/inspections/checks/:id/rectify — 整改登记（rectify_status=2）
router.put('/checks/:id/rectify', requirePerm('ins:edit'), asyncH(async (req, res) => {
  const id = toInt(req.params.id)
  await oneOf(insCheck, id, '核查记录不存在')
  await insCheck.update(id, { rectify_status: 2, rectify_remark: req.body.rectify_remark || '' }, req.user)
  ok(res, null, '整改已登记')
}))

// DELETE /api/inspections/checks/:id — 逻辑删除核查记录
router.delete('/checks/:id', requirePerm('ins:edit'), asyncH(async (req, res) => {
  await insCheck.remove(toInt(req.params.id), req.user)
  ok(res, null, '删除成功')
}))

export default router
