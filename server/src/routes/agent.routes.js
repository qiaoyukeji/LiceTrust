/**
 * 终端数据上报接口（二期 A：终端自动发现，对应文档 4.6 终端管理/杀毒系统集成）
 * 鉴权：X-App-Key（AppKey 独立于 JWT，供终端 Agent 服务端调用；文档 7.3 接口安全）
 * 说明：本接口挂在 /api/agent（不经 JWT authGuard，见 app.js）
 */
import { Router } from 'express'
import { assetComputer, assetInstallRecord, assetMaintLog, baseSoftware, sysOrg, sysDept, bizAlert } from '../db/dao/index.js'
import { ok, ApiError, asyncH, requireFields, toInt } from '../utils/response.js'
import { tx } from '../db/index.js'
import { nowStr, todayStr } from '../db/util.js'
import config from '../config/index.js'

const router = Router()

function checkAppKey(req) {
  const key = req.headers['x-app-key'] || ''
  if (!config.agentKey || key !== config.agentKey) {
    throw new ApiError('AppKey 无效', 401)
  }
}

// POST /api/agent/report — 终端上报计算机信息与已安装软件清单
router.post('/report', asyncH(async (req, res) => {
  checkAppKey(req)
  requireFields(req.body, ['computer_no', 'softwares'])
  const items = Array.isArray(req.body.softwares) ? req.body.softwares.slice(0, 500) : []
  const cno = String(req.body.computer_no)

  const existRows = await assetComputer.list({ computer_no: cno }, { pageSize: 1 })
  let computer = existRows[0]

  await tx(async () => {
    if (!computer) {
      // 自动建档（一机一档）：单位按 org_code 解析（缺省 HQ），部门取该单位首个部门
      const orgCode = String(req.body.org_code || 'HQ')
      const orgRows = await sysOrg.list({ org_code: orgCode }, { pageSize: 1 })
      const org = orgRows[0]
      if (!org) throw new ApiError('单位编码不存在: ' + orgCode, 400)
      const deptRows = await sysDept.list({ org_id: org.id }, { pageSize: 1 })
      if (!deptRows[0]) throw new ApiError('该单位尚无部门，无法自动建档', 400)
      const ins = await assetComputer.insert({
        computer_no: cno,
        brand: req.body.brand,
        model: req.body.model,
        sn: req.body.sn,
        computer_type: toInt(req.body.computer_type || 2),
        org_id: org.id,
        dept_id: deptRows[0].id,
        user_id: 0,
        location: req.body.location || '终端自动上报',
        enable_date: todayStr(),
        status: 1,
        remark: '终端 Agent 自动建档'
      })
      computer = { id: ins.insertId }
    } else {
      // 补全一机一档硬件信息
      await assetComputer.update(Number(computer.id), {
        brand: req.body.brand || undefined,
        model: req.body.model || undefined,
        sn: req.body.sn || undefined
      })
    }

    const cid = Number(computer.id)
    let matched = 0
    let installed = 0
    const unknown = []
    for (const sw of items) {
      const name = String(sw.name || '').trim()
      if (!name) continue
      const swRows = await baseSoftware.list({ software_name: name }, { pageSize: 1 })
      if (!swRows.length) {
        // 未登记软件 → 未登记预警（FR-12-03），去重
        unknown.push({ name, version: sw.version || '' })
        const dup = await bizAlert.list({ alert_type: 3, biz_type: 'software_name', status: 0, content: '终端上报未登记软件：' + name }, { pageSize: 1 })
        if (!dup.length) {
          await bizAlert.insert({
            alert_type: 3, biz_type: 'software_name', biz_id: 0, level: 2,
            content: '终端上报未登记软件：' + name + (sw.version ? '（' + sw.version + '）' : '') + '，来源 ' + cno,
            org_id: 0, status: 0
          })
        }
        continue
      }
      matched += 1
      const sid = Number(swRows[0].id)
      const has = await assetInstallRecord.list({ computer_id: cid, software_id: sid }, { pageSize: 1 })
      if (!has.length) {
        await assetInstallRecord.insert({
          computer_id: cid, software_id: sid,
          dept_id: Number(computer.dept_id || 0), user_id: Number(computer.user_id || 0),
          version: String(sw.version || swRows[0].version || ''),
          license_term: '', install_date: todayStr(), install_source: '自动发现'
        })
        await assetMaintLog.insert({
          computer_id: cid, software_id: sid, op_type: 1,
          op_date: nowStr(), operator_id: 0, reason: '终端 Agent 自动发现上报', apply_id: 0, confirm_id: 0
        })
        installed += 1
      }
    }
    ok(res, { computer_no: cno, computer_id: cid, reported: items.length, matched, new_installed: installed, unknown }, '上报成功')
  })
}))

export default router
