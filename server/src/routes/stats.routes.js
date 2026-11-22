/** 统计分析接口（FR-11：概览/分类分布/单位排名/月度趋势/临期授权） */
import { Router } from 'express'
import { pur } from '../db/queries/index.js'
import { ok, asyncH, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'
import { daysLaterStr } from '../db/util.js'

const router = Router()

// GET /api/stats/overview — 综合概览（全局计数 + 四类分布 + 类型分布）
router.get('/overview', requirePerm('stats:view'), asyncH(async (req, res) => {
  const [overview, category, typeDist] = await Promise.all([
    pur.statsOverview({ expireBefore: daysLaterStr(90) }),
    pur.statsCategory({}),
    pur.statsTypeDist({})
  ])
  ok(res, { overview: overview[0] || {}, category, typeDist })
}))

// GET /api/stats/category — 四类软件安装分布（可按单位过滤）
router.get('/category', requirePerm('stats:view'), asyncH(async (req, res) => {
  const f = req.query.orgId ? { orgId: toInt(req.query.orgId) } : {}
  ok(res, await pur.statsCategory(f))
}))

// GET /api/stats/org-install — 各单位安装数排名
router.get('/org-install', requirePerm('stats:view'), asyncH(async (req, res) => {
  ok(res, await pur.statsOrgInstall({}))
}))

// GET /api/stats/trend — 近12个月安装趋势
router.get('/trend', requirePerm('stats:view'), asyncH(async (req, res) => {
  ok(res, await pur.statsMonthlyTrend({}))
}))

// GET /api/stats/expiring — 90 天内到期授权清单
router.get('/expiring', requirePerm('stats:view'), asyncH(async (req, res) => {
  ok(res, await pur.entitlementRows({ expireBefore: daysLaterStr(90) }, { pageSize: 100 }))
}))

// GET /api/stats/domestic — 国产化替代统计（二期信创：按国产标记与厂商分组）
router.get('/domestic', requirePerm('stats:view'), asyncH(async (req, res) => {
  const [byFlag, vendors] = await Promise.all([
    pur.statsDomestic({}),
    pur.statsDomesticVendors({})
  ])
  const dom = Number((byFlag.find((r) => Number(r.is_domestic) === 1) || {}).n || 0)
  const total = byFlag.reduce((s, r) => s + Number(r.n || 0), 0)
  ok(res, {
    domestic: dom,
    foreign: total - dom,
    total,
    rate: total ? Math.round((dom * 10000) / total) / 100 : 0,
    vendors
  })
}))

export default router
