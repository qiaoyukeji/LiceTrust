/** 系统参数接口（FR-15-06：参数查询与批量保存） */
import { Router } from 'express'
import { sysConfig } from '../db/dao/index.js'
import { ok, ApiError, asyncH, requireFields, toInt } from '../utils/response.js'
import { requirePerm, requirePlatform } from '../middleware/rbac.js'

const router = Router()

// GET /api/configs — 全量参数列表（支持关键字过滤）
router.get('/', requirePerm('config:view'), asyncH(async (req, res) => {
  const rows = await sysConfig.listAll({ _kw: req.query.kw })
  ok(res, rows)
}))

// PUT /api/configs — 批量保存参数（平台级全局设置：仅平台运营管理员）
router.put('/', requirePerm('config:edit'), requirePlatform, asyncH(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : []
  if (!items.length) throw new ApiError('缺少待保存的参数项 items', 400)
  let saved = 0
  for (const item of items) {
    requireFields(item, ['config_key'])
    const key = String(item.config_key)
    const value = item.config_value === undefined || item.config_value === null
      ? ''
      : String(item.config_value)
    // 先按 config_key 查已有记录 id，再逐条更新（不存在则新增）
    const rows = await sysConfig.list({ config_key: key }, { pageSize: 1 })
    const row = rows && rows[0]
    if (row) {
      await sysConfig.update(toInt(row.id), { config_value: value }, req.user)
    } else {
      await sysConfig.insert({ config_key: key, config_value: value }, req.user)
    }
    saved++
  }
  ok(res, { saved }, '保存成功')
}))

export default router
