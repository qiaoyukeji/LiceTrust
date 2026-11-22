/**
 * JOIN 查询代码生成器 —— 依据 scripts/query-defs/*.js 声明式描述生成查询模块
 *
 * 产物：src/db/queries/<module>.js + src/db/queries/index.js
 * 每个查询 = 字面量 SQL + buildParams 参数构建 + 同函数执行（DAO 同款安全模式）
 *
 * 用法：node scripts/gen-queries.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defsDir = path.join(__dirname, 'query-defs')
const outDir = path.resolve(__dirname, '../src/db/queries')
fs.mkdirSync(outDir, { recursive: true })

/** 写文件路径安全校验：文件名白名单 + 根边界校验（防路径穿越） */
function safeWritePath(dir, fileName) {
  if (!/^[A-Za-z0-9._-]+$/.test(fileName) || fileName.includes('..')) {
    throw new Error('非法文件名: ' + fileName)
  }
  const root = path.resolve(dir)
  const target = path.resolve(root, fileName)
  if (!target.startsWith(root + path.sep)) {
    throw new Error('路径越界: ' + fileName)
  }
  return target
}

async function loadDefs() {
  const files = fs.readdirSync(defsDir).filter((f) => f.endsWith('.js'))
  const byModule = new Map()
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(defsDir, f)).href)
    const defs = mod.default || []
    for (const d of defs) {
      if (!d || !d.module || !d.name || !d.sql || typeof d.params !== 'function') {
        throw new Error('query-def 无效: ' + f + ' -> ' + JSON.stringify(d && d.name))
      }
      if (!byModule.has(d.module)) byModule.set(d.module, [])
      byModule.get(d.module).push(d)
    }
  }
  return byModule
}

/** 把 def.params 函数源码转为可赋值给 const 的函数表达式 */
function fnSource(fn) {
  const src = fn.toString()
  if (/^\s*(async\s+)?function\b/.test(src)) return src
  if (/^\s*[A-Za-z_$][\w$]*\s*\(/.test(src)) return 'function ' + src
  return src
}

function genModule(mod, defs) {
  const js = []
  js.push('// 本文件由 scripts/gen-queries.js 依据 scripts/query-defs/' + mod + '.js 自动生成，请勿手工修改')
  js.push('// 安全模式：字面量 SQL + 占位符参数绑定 + 同函数执行')
  js.push("import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'")
  js.push("import { currentTenant } from '../tenantContext.js'")
  js.push('')
  for (const d of defs) {
    js.push('// ' + (d.desc || d.name))
    js.push('const ' + d.name.toUpperCase() + '_SQL = `' + d.sql.trim() + '`')
    js.push('')
    js.push('const ' + d.name + '_params = ' + fnSource(d.params))
    js.push('')
    js.push('/** ' + (d.desc || d.name) + ' */')
    js.push('export async function ' + d.name + '(f = {}, paging = {}) {')
    js.push('  const params = ' + d.name + '_params(f, paging)')
    js.push("  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())")
    if (d.name.endsWith('Count')) {
      // 计数查询：返回 Number 而非行数组
      js.push("  if (dialect === 'sqlite') {")
      js.push('    const st = c.prepare(' + d.name.toUpperCase() + '_SQL)')
      js.push('    const rows = st.all(...params)')
      js.push('    return Number(rows[0] ? rows[0].n : 0)')
      js.push('  }')
      js.push('  const rows = (await c.query(' + d.name.toUpperCase() + '_SQL, params))[0]')
      js.push('  return Number(rows[0] ? rows[0].n : 0)')
    } else {
      js.push("  if (dialect === 'sqlite') {")
      js.push('    const st = c.prepare(' + d.name.toUpperCase() + '_SQL)')
      js.push('    return st.all(...params)')
      js.push('  }')
      js.push('  return (await c.query(' + d.name.toUpperCase() + '_SQL, params))[0]')
    }
    js.push('}')
    js.push('')
  }
  return js.join('\n')
}

const byModule = await loadDefs()
const indexLines = ['// 本文件由 scripts/gen-queries.js 自动生成：查询模块汇总出口']
for (const [mod, defs] of byModule.entries()) {
  const file = safeWritePath(outDir, mod + '.js')
  fs.writeFileSync(file, genModule(mod, defs), 'utf8')
  indexLines.push("import * as " + mod + " from './" + mod + ".js'")
  console.log('[gen-queries] ' + mod + '.js: ' + defs.length + ' queries')
}
indexLines.push('')
indexLines.push('export {')
for (const mod of byModule.keys()) indexLines.push('  ' + mod + ',')
indexLines.push('}')
indexLines.push('')
fs.writeFileSync(safeWritePath(outDir, 'index.js'), indexLines.join('\n'), 'utf8')
console.log('[gen-queries] done')
