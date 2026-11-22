/**
 * 终端采集 Agent（二期 A：自动发现方向，文档 4.6 / 10.1 二期第 1 项）
 *
 * 用法：
 *   node scripts/agent-client.js                          # 演示模式：上报内置样例清单（含未登记软件触发预警）
 *   node scripts/agent-client.js --real                   # 真实模式：读取本机 Windows 已安装软件（注册表卸载列表）
 *   node scripts/agent-client.js --computer-no PC-HQ-001 --url http://localhost:3000 --key licetrust-agent-dev-key
 *
 * 采集到的软件按名称与平台软件资产库匹配：
 *   - 命中：自动补登安装明细（install_source=自动发现）+ 维护日志
 *   - 未命中：生成"未登记软件"预警（FR-12-03），由资产管理员在预警中心认领处理
 */
const args = process.argv.slice(2)
function argOf(name, def) {
  const i = args.indexOf('--' + name)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const URL = argOf('url', 'http://localhost:3000')
const KEY = argOf('key', 'licetrust-agent-dev-key')
const COMPUTER_NO = argOf('computer-no', 'PC-HQ-001')
const ORG_CODE = argOf('org-code', 'HQ')
const REAL = args.includes('--real')

/** 真实采集：Windows 注册表卸载列表（reg 命令以参数数组执行，无 shell 拼接） */
async function collectReal() {
  const { execFileSync } = await import('node:child_process')
  const paths = [
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
  ]
  const out = []
  for (const p of paths) {
    try {
      const text = execFileSync('reg', ['query', p, '/s', '/v', 'DisplayName'], {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        timeout: 60000
      })
      const lines = text.split(/\r?\n/)
      let name = ''
      for (const line of lines) {
        const m = line.match(/DisplayName\s+REG_SZ\s+(.+)$/)
        if (m) { name = m[1].trim(); continue }
        const v = line.match(/DisplayVersion\s+REG_SZ\s+(.+)$/)
        if (v && name) { out.push({ name, version: v[1].trim() }); name = '' }
      }
    } catch (e) { /* 分支无权限或非 Windows 环境时忽略该分支 */ }
  }
  return out
}

function demoList() {
  return [
    { name: 'WPS Office 专业版', version: '2023' },
    { name: '奇安信天擎', version: 'V10' },
    { name: '7-Zip', version: '24.08' },
    { name: '某未登记工具软件', version: '1.2.3' } // 触发"未登记软件"预警（FR-12-03）
  ]
}

async function main() {
  const softwares = REAL ? await collectReal() : demoList()
  if (!softwares.length) {
    console.log('[agent] 未采集到软件清单（--real 需要 Windows + 注册表读取权限）')
    process.exit(1)
  }
  const payload = {
    computer_no: COMPUTER_NO,
    org_code: ORG_CODE,
    brand: '采集自本机',
    computer_type: 2,
    softwares
  }
  const resp = await fetch(URL + '/api/agent/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Key': KEY },
    body: JSON.stringify(payload)
  })
  const j = await resp.json().catch(() => null)
  console.log('[agent] HTTP', resp.status)
  console.log('[agent] 响应:', JSON.stringify(j, null, 2))
  if (!j || j.code !== 0) process.exit(1)
}

main().catch((e) => {
  console.error('[agent] 上报失败:', e.message)
  process.exit(1)
})
