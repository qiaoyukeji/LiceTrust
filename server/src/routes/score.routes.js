/**
 * 正版化工作评分引擎（二期，FR-10-05，借鉴重庆市系统量化评价体系）
 * 五个维度：责任落实 / 台账完整 / 授权合规 / 流程闭环 / 检查整改
 */
import { Router } from 'express'
import { baseLeader, insCheck } from '../db/dao/index.js'
import { pur } from '../db/queries/index.js'
import { asset } from '../db/queries/index.js'
import { ok, asyncH } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

/** 正版化工作评分（GET /api/score） */
router.get('/', requirePerm('stats:view', 'ins:view'), asyncH(async (req, res) => {
  // 维度一：责任落实（20 分）——领导小组成员已登记
  const leaderCount = await baseLeader.count({})
  const d1 = Math.round(20 * Math.min(1, leaderCount / 3))

  // 维度二：台账完整（25 分）——有安装记录的在用计算机占比（一机一档覆盖）
  const activeTotal = await asset.computerCount({ status: 1 })
  const installs = await asset.installRows({}, { page: 1, pageSize: 2000 })
  const covered = new Set(installs.map((r) => r.computer_id)).size
  const d2 = activeTotal ? Math.round(25 * Math.min(1, covered / activeTotal)) : 25

  // 维度三：授权合规（25 分）——1 - 超授权软件数 / 持有许可软件数
  const ents = await pur.entitlementRows({}, { page: 1, pageSize: 500 })
  const licensed = ents.filter((e) => Number(e.license_qty) > 0)
  const over = licensed.filter((e) => e.compliance === 'over')
  const d3 = licensed.length ? Math.round(25 * (1 - over.length / licensed.length)) : 25

  // 维度四：流程闭环（15 分）——已办结申请占比（0 申请按 50% 计，避免空库满分）
  const flowCounts = await pur.flowStatusCounts()
  const done = Number((flowCounts.find((f) => Number(f.status) === 50) || {}).n || 0)
  const allApplies = flowCounts.reduce((sum, f) => sum + Number(f.n || 0), 0)
  const d4 = allApplies ? Math.round(15 * done / allApplies) : Math.round(15 * 0.5)

  // 维度五：检查整改（15 分）——整改完成率（无待整改项视为满分）
  const checks = await insCheck.listAll({})
  const rectify = checks.filter((c) => Number(c.rectify_status) > 0)
  const doneRect = rectify.filter((c) => Number(c.rectify_status) === 2)
  const d5 = rectify.length ? Math.round(15 * doneRect.length / rectify.length) : 15

  const dims = [
    { key: 'leader', name: '责任落实', max: 20, score: d1, detail: '领导小组成员 ' + leaderCount + ' 人' },
    { key: 'ledger', name: '台账完整', max: 25, score: d2, detail: '在用计算机 ' + activeTotal + ' 台，已登记安装 ' + covered + ' 台' },
    { key: 'compliance', name: '授权合规', max: 25, score: d3, detail: '持许可软件 ' + licensed.length + ' 款，超授权 ' + over.length + ' 款' },
    { key: 'flow', name: '流程闭环', max: 15, score: d4, detail: '申请 ' + allApplies + ' 单，办结 ' + done + ' 单' },
    { key: 'rectify', name: '检查整改', max: 15, score: d5, detail: '整改项 ' + rectify.length + ' 个，已销号 ' + doneRect.length + ' 个' }
  ]
  const total = dims.reduce((s, d) => s + d.score, 0)
  const grade = total >= 90 ? '优秀' : total >= 75 ? '良好' : total >= 60 ? '合格' : '需整改'
  ok(res, { total, grade, dims })
}))

export default router
