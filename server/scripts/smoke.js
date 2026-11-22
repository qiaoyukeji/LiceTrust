/**
 * 全端点冒烟测试（node scripts/smoke.js）
 * 前置：data/licetrust.db 已重新 seed；服务已在 3000 端口运行（node src/app.js）
 */
const BASE = 'http://localhost:3000/api'
let token = ''
const results = []

function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail })
  console.log((cond ? 'PASS' : 'FAIL') + ' | ' + name + (cond ? '' : ' | ' + detail))
}

async function api(method, path, body, useToken = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (useToken && token) headers.Authorization = 'Bearer ' + token
  const resp = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const ct = resp.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return { status: resp.status, json: await resp.json() }
  }
  return { status: resp.status, buf: await resp.arrayBuffer(), ct }
}

async function login(u, p) {
  const r = await api('POST', '/auth/login', { username: u, password: p }, false)
  return r.json && r.json.data ? r.json.data : null
}

async function main() {
  /* 1 健康检查与登录 */
  const health = await fetch('http://localhost:3000/api/health').then((r) => r.json())
  check('health', health.code === 0)
  const adm = await login('admin', '123456')
  check('login admin', adm && adm.token && adm.user.perms.includes('*'))
  token = adm.token
  const me = await api('GET', '/auth/me')
  check('auth/me', me.json.code === 0 && me.json.data.username === 'admin')

  /* 2 全模块列表可达 */
  const listChecks = [
    '/orgs', '/orgs/tree', '/depts', '/depts/tree', '/users', '/roles', '/roles/all',
    '/dicts?dictType=software_category', '/dicts/software_category', '/configs',
    '/audit-logs', '/computers', '/computers/options', '/softwares', '/softwares/options',
    '/install-records', '/contracts', '/entitlements', '/admin-accounts', '/license-allocs',
    '/free-softwares', '/leaders', '/require-applies', '/plans', '/maint-applies',
    '/maint-applies/my', '/maint-applies/pending/role2', '/alerts', '/inspections',
    '/stats/overview', '/stats/category', '/stats/org-install', '/stats/trend', '/stats/expiring',
    '/workbench/summary', '/workbench/todos', '/workbench/alerts',
    '/reports/templates', '/reports/preview/summary', '/reports/preview/detail', '/reports/send-log'
  ]
  for (const p of listChecks) {
    const r = await api('GET', p)
    check('GET ' + p, r.json && r.json.code === 0, JSON.stringify(r.json).slice(0, 120))
  }

  /* 3 一机一档详情 */
  const pcList = (await api('GET', '/computers?page=1&pageSize=1')).json.data
  const pcId = pcList.list[0].id
  const detail = await api('GET', '/computers/' + pcId)
  check('computers/:id 详情', detail.json.code === 0 && Array.isArray(detail.json.data.installed))

  /* 4 二次认证 reveal（正向/负向） */
  const entList = (await api('GET', '/entitlements?page=1&pageSize=1')).json.data
  const entId = entList.list[0].id
  const revealBad = await api('POST', '/entitlements/' + entId + '/reveal', { password: 'wrong' })
  check('reveal 错误密码 403', revealBad.status === 403)
  const revealOk = await api('POST', '/entitlements/' + entId + '/reveal', { password: '123456' })
  check('reveal 二次认证通过', revealOk.json.code === 0 && revealOk.json.data.serial_no !== undefined)

  /* 5 流程闭环 FR-08 */
  const comps = (await api('GET', '/computers/options')).json.data
  const applies = (await api('POST', '/maint-applies', {
    computer_id: comps[0].id,
    apply_type: 1,
    software_name: '冒烟测试软件XY',
    version: '1.0',
    reason: '端到端闭环验证'
  })).json.data
  check('maint-apply 创建', !!applies.apply_no, JSON.stringify(applies).slice(0, 100))
  const aid = applies.id
  check('approve1', (await api('PUT', '/maint-applies/' + aid + '/approve', { action: 'approve', opinion: '同意' })).json.code === 0)
  check('approve2', (await api('PUT', '/maint-applies/' + aid + '/approve', { action: 'approve', opinion: '信息化同意' })).json.code === 0)
  check('execute', (await api('PUT', '/maint-applies/' + aid + '/execute')).json.code === 0)
  check('confirm', (await api('PUT', '/maint-applies/' + aid + '/confirm', { userSign: '系统管理员' })).json.code === 0)
  const flowDetail = (await api('GET', '/maint-applies/' + aid)).json.data
  check('流程状态 50 已完成', flowDetail.apply.status === 50)
  check('审批轨迹 2 条', flowDetail.approvals.length === 2)
  const logs = flowDetail.maintLogs || flowDetail.logs || []
  check('维护日志 1 条(安装)', logs.length === 1 && logs[0].op_type === 1)

  /* 6 预警扫描 + 处理 */
  const scan = await api('POST', '/alerts/scan')
  check('alerts/scan', scan.json.code === 0 && typeof scan.json.data.created === 'number')
  const alerts = (await api('GET', '/alerts?status=0&page=1&pageSize=5')).json.data
  if (alerts.list.length) {
    const h = await api('PUT', '/alerts/' + alerts.list[0].id + '/handle', { handle_remark: '冒烟处理' })
    check('alert handle', h.json.code === 0)
  }

  /* 7 报表导出（xlsx 二进制） */
  const xlsx = await api('GET', '/reports/export/detail')
  check('report export xlsx', xlsx.status === 200 && (xlsx.ct || '').includes('spreadsheetml') && xlsx.buf.byteLength > 1000)

  /* 8 RBAC 与数据权限（普通员工） */
  const emp = await login('emp1', '123456')
  const empToken = token
  token = emp.token
  const denied = await api('GET', '/users')
  check('RBAC emp1 访问 /users 403', denied.status === 403)
  const myPcs = (await api('GET', '/computers?page=1&pageSize=50')).json.data
  check('数据权限 emp1 仅本人计算机', myPcs.list.every((c) => c.user_id === emp.user.id))
  token = empToken

  /* 9 审计日志写入验证（schema 修复后） */
  const audit = (await api('GET', '/audit-logs?page=1&pageSize=5')).json.data
  check('审计日志有写入记录', audit.total > 0, 'total=' + audit.total)

  /* 10 审计日志不可删（无 DELETE 接口） */
  const delAudit = await api('DELETE', '/audit-logs/1')
  check('审计日志无删除接口', delAudit.status === 404)

  /* 11 dataScope=1（全部）无单位过滤回归（曾因 ds<=2 注入 org_id 导致只见本单位） */
  const allPcs = (await api('GET', '/computers?page=1&pageSize=50')).json.data
  check('admin 数据权限=全部 可见全部单位计算机', allPcs.list.length >= 6, 'rows=' + allPcs.list.length)
  check('count 返回数字', Number.isInteger(allPcs.total), 'total=' + JSON.stringify(allPcs.total))

  /* 12 二期接口：评分引擎 / 国产化统计 / Agent 上报 */
  const score = await api('GET', '/score')
  check('score 评分引擎五维度', score.json.code === 0 && score.json.data.dims.length === 5 && typeof score.json.data.total === 'number')
  const dom = await api('GET', '/stats/domestic')
  check('stats/domestic 国产化统计', dom.json.code === 0 && dom.json.data.total > 0 && typeof dom.json.data.rate === 'number')
  const agOk = await fetch(BASE + '/agent/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Key': 'licetrust-agent-dev-key' },
    body: JSON.stringify({ computer_no: 'PC-HQ-001', softwares: [{ name: 'WPS Office 专业版', version: '2023' }] })
  }).then(r => r.json())
  check('agent/report 正确 AppKey 上报', agOk.code === 0)
  const agBad = await fetch(BASE + '/agent/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Key': 'bad' },
    body: JSON.stringify({ computer_no: 'X', softwares: [] })
  })
  check('agent/report 错误 AppKey 401', agBad.status === 401)
  const noJwtScore = await fetch(BASE + '/score')
  check('score 未认证 401', noJwtScore.status === 401)
}

main()
  .then(() => {
    const fails = results.filter((r) => !r.ok)
    console.log('====== 冒烟结果: ' + (results.length - fails.length) + '/' + results.length + ' 通过 ======')
    if (fails.length) {
      console.log('失败项：')
      for (const f of fails) console.log(' - ' + f.name + ' | ' + f.detail)
      process.exit(1)
    }
    process.exit(0)
  })
  .catch((e) => {
    console.error('[smoke] 异常:', e.message)
    process.exit(1)
  })
