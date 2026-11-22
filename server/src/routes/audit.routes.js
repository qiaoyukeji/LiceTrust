/** 审计日志查询接口（FR-15-05：操作留痕检索，只读，无任何修改/删除入口） */
import { Router } from 'express'
import { sysAuditLog } from '../db/dao/index.js'
import { paged, asyncH, pageInfo, toInt } from '../utils/response.js'
import { requirePerm } from '../middleware/rbac.js'

const router = Router()

// GET /api/audit-logs — 分页列表（关键字覆盖用户名/模块/操作，模块精确过滤，时间范围过滤）
router.get('/', requirePerm('audit:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const f = { _kw: req.query.kw }
  if (req.query.module) f.module = String(req.query.module)
  if (req.query.username) f.username = String(req.query.username)
  if (req.query.userId) f.user_id = toInt(req.query.userId)
  // 日期范围使用生成 DAO 的日期列过滤参数名 op_time_from / op_time_to
  if (req.query.dateFrom) f.op_time_from = String(req.query.dateFrom)
  if (req.query.dateTo) f.op_time_to = String(req.query.dateTo)
  const [list, total] = await Promise.all([
    sysAuditLog.list(f, { page, pageSize }),
    sysAuditLog.count(f)
  ])
  paged(res, list, total, page, pageSize)
}))

export default router
