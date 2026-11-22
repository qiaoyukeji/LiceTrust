/** 工作台接口（FR-01：概览/我的待办/预警提醒） */
import { Router } from 'express'
import { pur, flow } from '../db/queries/index.js'
import { ok, asyncH } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { daysLaterStr } from '../db/util.js'

const router = Router()

const hasPerm = (user, p) => (user.perms || []).includes('*') || (user.perms || []).includes(p)

// GET /api/workbench/summary — 工作台概览（全局统计 + 个人待办计数 + 流程状态分布）
router.get('/summary', requirePerm('dashboard'), asyncH(async (req, res) => {
  const [ovRows, todoRows, flowStatus] = await Promise.all([
    pur.statsOverview({ expireBefore: daysLaterStr(90) }),
    pur.todoCounts({
      deptId: req.user.dataScope === 3 ? req.user.dept_id : null,
      userId: req.user.id
    }),
    pur.flowStatusCounts()
  ])
  ok(res, { overview: ovRows[0] || {}, todos: todoRows[0] || {}, flowStatus })
}))

// GET /api/workbench/todos — 我的待办（按权限组合，各取前10条）
router.get('/todos', requirePerm('dashboard'), asyncH(async (req, res) => {
  const me = req.user
  const out = { dept_approve: [], it_approve: [], to_execute: [], to_confirm: [] }
  const jobs = []
  if (hasPerm(me, 'apply:approve1')) {
    jobs.push(flow.applyRows({ status: 10, deptId: me.dept_id }, { pageSize: 10 }).then((l) => { out.dept_approve = l }))
  }
  if (hasPerm(me, 'apply:approve2')) {
    jobs.push(flow.applyRows({ status: 20 }, { pageSize: 10 }).then((l) => { out.it_approve = l }))
  }
  if (hasPerm(me, 'apply:execute')) {
    jobs.push(flow.applyRows({ status: 30 }, { pageSize: 10 }).then((l) => { out.to_execute = l }))
  }
  if (hasPerm(me, 'apply:confirm')) {
    jobs.push(flow.applyRows({ status: 40, computerUserId: me.id }, { pageSize: 10 }).then((l) => { out.to_confirm = l }))
  }
  await Promise.all(jobs)
  ok(res, out)
}))

// GET /api/workbench/alerts — 未处理预警前10条
router.get('/alerts', requirePerm('dashboard'), asyncH(async (req, res) => {
  ok(res, await pur.alertRows({ status: 0 }, { pageSize: 10 }))
}))

export default router
