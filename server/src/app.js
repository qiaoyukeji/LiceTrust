/**
 * 正版软件管理平台后端服务入口
 * 模块化单体（文档 5.2 技术架构的 Node 实现）
 */
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import config from './config/index.js'
import { runMigration } from './db/migrate-generated.js'
import { authGuard } from './middleware/auth.js'
import { auditTrail } from './middleware/audit.js'
import { notFound, errorHandler } from './middleware/error.js'

import authRoutes from './routes/auth.routes.js'
import uploadRoutes from './routes/upload.routes.js'
import agentRoutes from './routes/agent.routes.js'
import scoreRoutes from './routes/score.routes.js'
import tenantRoutes from './routes/tenant.routes.js'
import platformRoutes from './routes/platform.routes.js'
import userRoutes from './routes/user.routes.js'
import orgRoutes from './routes/org.routes.js'
import deptRoutes from './routes/dept.routes.js'
import roleRoutes from './routes/role.routes.js'
import dictRoutes from './routes/dict.routes.js'
import configRoutes from './routes/config.routes.js'
import auditRoutes from './routes/audit.routes.js'
import computerRoutes from './routes/computer.routes.js'
import softwareRoutes from './routes/software.routes.js'
import installRecordRoutes from './routes/install-record.routes.js'
import contractRoutes from './routes/contract.routes.js'
import entitlementRoutes from './routes/entitlement.routes.js'
import adminAccountRoutes from './routes/admin-account.routes.js'
import licenseAllocRoutes from './routes/license-alloc.routes.js'
import freeSoftwareRoutes from './routes/free-software.routes.js'
import leaderRoutes from './routes/leader.routes.js'
import requireApplyRoutes from './routes/require-apply.routes.js'
import planRoutes from './routes/plan.routes.js'
import maintApplyRoutes from './routes/maint-apply.routes.js'
import reportRoutes from './routes/report.routes.js'
import alertRoutes from './routes/alert.routes.js'
import inspectionRoutes from './routes/inspection.routes.js'
import statsRoutes from './routes/stats.routes.js'
import workbenchRoutes from './routes/workbench.routes.js'

async function main() {
  await runMigration()
  fs.mkdirSync(config.uploadDir, { recursive: true })

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(auditTrail())

  app.get('/api/health', (req, res) => {
    res.json({ code: 0, message: 'ok', data: { name: 'licetrust-server', version: config.version, time: new Date().toISOString() } })
  })

  // 登录接口（公开）
  app.use('/api/auth', authRoutes)
  // 终端 Agent 上报（公开路由，内部 X-App-Key 鉴权，见 agent.routes.js）
  app.use('/api/agent', agentRoutes)
  // 上传文件静态访问
  app.use('/uploads', express.static(config.uploadDir))

  // 业务接口（统一 JWT 认证）
  const api = express.Router()
  api.use(authGuard)
  api.use('/uploads', uploadRoutes)
  api.use('/users', userRoutes)
  api.use('/orgs', orgRoutes)
  api.use('/depts', deptRoutes)
  api.use('/roles', roleRoutes)
  api.use('/dicts', dictRoutes)
  api.use('/configs', configRoutes)
  api.use('/audit-logs', auditRoutes)
  api.use('/computers', computerRoutes)
  api.use('/softwares', softwareRoutes)
  api.use('/install-records', installRecordRoutes)
  api.use('/contracts', contractRoutes)
  api.use('/entitlements', entitlementRoutes)
  api.use('/admin-accounts', adminAccountRoutes)
  api.use('/license-allocs', licenseAllocRoutes)
  api.use('/free-softwares', freeSoftwareRoutes)
  api.use('/leaders', leaderRoutes)
  api.use('/require-applies', requireApplyRoutes)
  api.use('/plans', planRoutes)
  api.use('/maint-applies', maintApplyRoutes)
  api.use('/reports', reportRoutes)
  api.use('/alerts', alertRoutes)
  api.use('/inspections', inspectionRoutes)
  api.use('/score', scoreRoutes)
  api.use('/tenant', tenantRoutes)
  api.use('/platform', platformRoutes)
  api.use('/stats', statsRoutes)
  api.use('/workbench', workbenchRoutes)
  app.use('/api', api)

  app.use('/api', notFound)
  app.use(errorHandler)

  app.listen(config.port, () => {
    console.log('[licetrust-server] listening on http://localhost:' + config.port + '  dialect=' + config.db.dialect)
  })
}

main().catch((e) => {
  console.error('[licetrust-server] 启动失败:', e)
  process.exit(1)
})
