/**
 * DAO 代码生成器 —— 依据 schema.js 生成全部数据访问代码
 *
 * 产物（均在 server/src/db 下）：
 *   1. dao/<table>.js       每表一个 DAO 模块：list/listAll/count/get/insert/update/remove
 *   2. dao/index.js         汇总出口（camelCase 命名）
 *   3. migrate-generated.js 幂等建表 DDL 模块（字面量 DDL）
 *
 * 安全模式（与安全扫描规则一致）：
 *   所有 SQL 均为源码中的字面量字符串；值一律经占位符 `?` 参数绑定；
 *   可选条件使用静态 NULL-TRICK（`(? IS NULL OR col = ?)`），无运行时 SQL 拼接。
 *
 * 重新生成：node scripts/gen-dao.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tables } from '../src/db/schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.resolve(__dirname, '../src/db')
const daoDir = path.join(dbDir, 'dao')
fs.mkdirSync(daoDir, { recursive: true })

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

const BASE_COLS = ['create_time', 'update_time', 'create_by', 'update_by', 'is_deleted']

function parseType(t) {
  const m = String(t).match(/^([a-z]+)(\(([^)]+)\))?$/)
  return { base: m[1], arg: m[3] || null }
}

function isText(col) {
  return parseType(col.type).base === 'text'
}

function isChar(col) {
  return parseType(col.type).base === 'varchar'
}

function isDate(col) {
  const b = parseType(col.type).base
  return b === 'date' || b === 'datetime'
}

function camel(name) {
  return name.replace(/_([a-z])/g, (m, c) => c.toUpperCase())
}

/** 生成 _kw 模糊过滤的参数压入代码行 */
function kwPushLine(kwCols) {
  if (!kwCols.length) return '  // （本表无模糊匹配列）'
  const pushes = ['f._kw ?? null']
  for (let i = 0; i < kwCols.length; i++) pushes.push('kw')
  return '  params.push(' + pushes.join(', ') + ')'
}

/** 多租户：以下表的 tenant_id 不做自动注入/过滤（显式处理） */
const TENANT_EXCLUDE = ['sys_user']

/** 生成单表 DAO 文件 */
function genTableDao(t) {
  const name = t.name
  const bizCols = t.columns.filter((c) => !BASE_COLS.includes(c.name) && c.name !== 'id')
  const allCols = t.columns
  const eqCols = [{ name: 'id', type: 'bigint' }, ...bizCols.filter((c) => !isText(c) && c.name !== 'tenant_id')]
  const kwCols = bizCols.filter(isChar).slice(0, 3).map((c) => c.name)
  const dateCols = bizCols.filter(isDate).map((c) => c.name)
  const orderSql = bizCols.some((c) => c.name === 'sort_no')
    ? 'ORDER BY sort_no ASC, id DESC'
    : 'ORDER BY id DESC'
  // 多租户隔离：表含 tenant_id 且不在排除名单 → 读/写自动限定当前租户（平台账号 tenant 为 null 时全量）
  const tenantIso = bizCols.some((c) => c.name === 'tenant_id') && !TENANT_EXCLUDE.includes(name)

  const defaults = {}
  for (const c of bizCols) {
    // tenant_id 不进 DEFAULTS：未显式指定时由租户上下文自动注入
    if (c.def !== undefined && c.name !== 'tenant_id') defaults[c.name] = c.def
  }

  // SQL 条件与参数构建代码（顺序严格对应）
  const condSql = []
  const condJs = []

  // 租户隔离条件（紧跟 is_deleted，位于所有过滤条件最前）
  if (tenantIso) {
    condSql.push('( ? IS NULL OR tenant_id = ? )')
    condJs.push('  params.push(__t, __t)')
  }

  if (kwCols.length) {
    const likeParts = kwCols.map((c) => c + ' LIKE ?').join(' OR ')
    condSql.push('( ? IS NULL OR ' + likeParts + ' )')
    condJs.push(kwPushLine(kwCols))
  }

  for (const c of eqCols) {
    condSql.push('( ? IS NULL OR ' + c.name + ' = ? )')
    condJs.push('  params.push(f.' + c.name + ' ?? null, f.' + c.name + ' ?? null)')
  }

  for (const dc of dateCols) {
    condSql.push('( ? IS NULL OR ' + dc + ' >= ? )')
    condJs.push('  params.push(f.' + dc + '_from ?? null, f.' + dc + '_from ?? null)')
    condSql.push('( ? IS NULL OR ' + dc + ' <= ? )')
    condJs.push('  params.push(f.' + dc + '_to ?? null, f.' + dc + '_to ?? null)')
  }

  const whereAll = 'is_deleted = 0' + (condSql.length ? ' AND ' + condSql.join(' AND ') : '')

  const listSql = 'SELECT * FROM ' + name + ' WHERE ' + whereAll + ' ' + orderSql + ' LIMIT ? OFFSET ?'
  const listAllSql = 'SELECT * FROM ' + name + ' WHERE ' + whereAll + ' ' + orderSql
  const countSql = 'SELECT COUNT(*) AS n FROM ' + name + ' WHERE ' + whereAll
  const getSql = 'SELECT * FROM ' + name + ' WHERE id = ? AND is_deleted = 0' + (tenantIso ? ' AND ( ? IS NULL OR tenant_id = ? )' : '')

  const insCols = allCols.filter((c) => !c.pk).map((c) => c.name)
  const insSql =
    'INSERT INTO ' + name + ' (' + insCols.join(', ') + ') VALUES (' +
    insCols.map(() => '?').join(', ') + ')'

  const updBiz = bizCols.map((c) => c.name + ' = COALESCE(?, ' + c.name + ')')
  const updSql =
    'UPDATE ' + name + ' SET ' + updBiz.join(', ') +
    ', update_time = ?, update_by = ? WHERE id = ?' + (tenantIso ? ' AND ( ? IS NULL OR tenant_id = ? )' : '')

  const delSql = 'UPDATE ' + name + ' SET is_deleted = 1, update_time = ?, update_by = ? WHERE id = ?' + (tenantIso ? ' AND ( ? IS NULL OR tenant_id = ? )' : '')
  const purgeSql = tenantIso ? 'DELETE FROM ' + name + ' WHERE tenant_id = ?' : null

  const insParamLines = []
  for (const c of bizCols) {
    if (c.name === 'tenant_id' && tenantIso) {
      // 多租户：未显式指定时自动注入当前租户（平台账号为 null，写入 0）
      insParamLines.push('    row.tenant_id !== undefined && row.tenant_id !== null ? row.tenant_id : (__t === null ? 0 : __t),')
    } else {
      insParamLines.push('    row.' + c.name + ' ?? null,')
    }
  }
  insParamLines.push('    row.create_time || now,')
  insParamLines.push('    now,')
  insParamLines.push('    ctx ? ctx.id || 0 : 0,')
  insParamLines.push('    ctx ? ctx.id || 0 : 0,')
  insParamLines.push('    0')

  const updParamLines = []
  for (const c of bizCols) updParamLines.push('    data.' + c.name + ' ?? null,')
  updParamLines.push('    now,')
  updParamLines.push('    ctx ? ctx.id || 0 : 0,')
  updParamLines.push('    id,')
  if (tenantIso) updParamLines.push('    __t,', '    __t')

  const sinkAll =
    "  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())\n" +
    "  if (dialect === 'sqlite') {\n" +
    '    return c.prepare(SQLVAR).all(...params)\n' +
    '  }\n' +
    '  return (await c.query(SQLVAR, params))[0]'

  const sinkRun =
    "  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())\n" +
    "  if (dialect === 'sqlite') {\n" +
    '    const info = c.prepare(SQLVAR).run(...params)\n' +
    '    return { insertId: Number(info.lastInsertRowid), changes: info.changes }\n' +
    '  }\n' +
    '  const r = await c.query(SQLVAR, params)\n' +
    '  return { insertId: r[0].insertId, changes: r[0].affectedRows }'

  const js = []
  js.push('// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成，请勿手工修改')
  js.push('// 安全模式：字面量 SQL + 占位符参数绑定；可选条件用静态 NULL-TRICK，无运行时 SQL 拼接')
  js.push("import { sqliteConn, mysqlConn, currentConn, dialect } from '../index.js'")
  js.push("import { nowStr } from '../util.js'")
  if (tenantIso) js.push("import { currentTenant } from '../tenantContext.js'")
  js.push('')
  js.push("const TABLE = '" + name + "'")
  js.push('export const TABLE_NAME = TABLE')
  js.push('const DEFAULTS = ' + JSON.stringify(defaults))
  js.push('const KW_COLS = ' + JSON.stringify(kwCols))
  js.push('')
  js.push('const LIST_SQL = ' + JSON.stringify(listSql))
  js.push('const LIST_ALL_SQL = ' + JSON.stringify(listAllSql))
  js.push('const COUNT_SQL = ' + JSON.stringify(countSql))
  js.push('const GET_SQL = ' + JSON.stringify(getSql))
  js.push('const INSERT_SQL = ' + JSON.stringify(insSql))
  js.push('const UPDATE_SQL = ' + JSON.stringify(updSql))
  js.push('const DELETE_SQL = ' + JSON.stringify(delSql))
  if (purgeSql) js.push('const PURGE_SQL = ' + JSON.stringify(purgeSql))
  js.push('')
  js.push('/** 分页列表；f: 过滤对象（列名=eq、_kw=模糊、日期列 _from/_to） */')
  js.push('export async function list(f = {}, paging = {}) {')
  js.push('  const params = []')
  if (tenantIso) js.push('  const __t = currentTenant()')
  js.push("  const kw = f._kw ? '%' + f._kw + '%' : null")
  for (const line of condJs) js.push(line)
  js.push('  const limit = Number(paging.pageSize) > 0 ? Number(paging.pageSize) : 10')
  js.push('  const page = Number(paging.page) > 0 ? Number(paging.page) : 1')
  js.push('  params.push(limit, (page - 1) * limit)')
  js.push(sinkAll.replace(/SQLVAR/g, 'LIST_SQL'))
  js.push('}')
  js.push('')
  js.push('/** 全量列表（不分页） */')
  js.push('export async function listAll(f = {}) {')
  js.push('  const params = []')
  if (tenantIso) js.push('  const __t = currentTenant()')
  js.push("  const kw = f._kw ? '%' + f._kw + '%' : null")
  for (const line of condJs) js.push(line)
  js.push(sinkAll.replace(/SQLVAR/g, 'LIST_ALL_SQL'))
  js.push('}')
  js.push('')
  js.push('/** 计数 */')
  js.push('export async function count(f = {}) {')
  js.push('  const params = []')
  if (tenantIso) js.push('  const __t = currentTenant()')
  js.push("  const kw = f._kw ? '%' + f._kw + '%' : null")
  for (const line of condJs) js.push(line)
  js.push("  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())")
  js.push("  if (dialect === 'sqlite') {")
  js.push('    const rows = c.prepare(COUNT_SQL).all(...params)')
  js.push('    return Number(rows[0].n)')
  js.push('  }')
  js.push('  const rows = (await c.query(COUNT_SQL, params))[0]')
  js.push('  return Number(rows[0].n)')
  js.push('}')
  js.push('')
  js.push('/** 按主键取单行 */')
  js.push('export async function get(id) {')
  js.push("  const c = currentConn() || (dialect === 'sqlite' ? sqliteConn() : mysqlConn())")
  if (tenantIso) {
    js.push('  const __t = currentTenant()')
    js.push("  if (dialect === 'sqlite') {")
    js.push('    const rows = c.prepare(GET_SQL).all(id, __t, __t)')
    js.push('    return rows[0]')
    js.push('  }')
    js.push('  const rows = (await c.query(GET_SQL, [id, __t, __t]))[0]')
    js.push('  return rows[0]')
    js.push('}')
  } else {
    js.push("  if (dialect === 'sqlite') {")
    js.push('    const rows = c.prepare(GET_SQL).all(id)')
    js.push('    return rows[0]')
    js.push('  }')
    js.push('  const rows = (await c.query(GET_SQL, [id]))[0]')
    js.push('  return rows[0]')
    js.push('}')
  }
  js.push('')
  js.push('/** 新增（DEFAULTS 合并 + 公共字段），返回 { insertId, changes } */')
  js.push('export async function insert(data, ctx = null) {')
  js.push('  const now = nowStr()')
  if (tenantIso) js.push('  const __t = currentTenant()')
  js.push('  const row = { ...DEFAULTS, ...data }')
  js.push('  const params = [')
  for (const line of insParamLines) js.push(line)
  js.push('  ]')
  js.push(sinkRun.replace(/SQLVAR/g, 'INSERT_SQL'))
  js.push('}')
  js.push('')
  js.push('/** 更新（未传字段保持原值；字符串置空传 ""） */')
  js.push('export async function update(id, data, ctx = null) {')
  js.push('  const now = nowStr()')
  if (tenantIso) js.push('  const __t = currentTenant()')
  js.push('  const params = [')
  for (const line of updParamLines) js.push(line)
  js.push('  ]')
  js.push(sinkRun.replace(/SQLVAR/g, 'UPDATE_SQL'))
  js.push('}')
  js.push('')
  js.push('/** 逻辑删除 */')
  js.push('export async function remove(id, ctx = null) {')
  js.push('  const now = nowStr()')
  if (tenantIso) {
    js.push('  const __t = currentTenant()')
    js.push('  const params = [now, ctx ? ctx.id || 0 : 0, id, __t, __t]')
  } else {
    js.push('  const params = [now, ctx ? ctx.id || 0 : 0, id]')
  }
  js.push(sinkRun.replace(/SQLVAR/g, 'DELETE_SQL'))
  js.push('}')
  js.push('')
  if (tenantIso) {
    js.push('/** 物理清空本租户数据（仅备份恢复流程使用，危险操作） */')
    js.push('export async function purgeByTenant(tenantId) {')
    js.push('  const params = [Number(tenantId)]')
    js.push(sinkRun.replace(/SQLVAR/g, 'PURGE_SQL'))
    js.push('}')
    js.push('')
  }
  js.push('')

  const file = safeWritePath(daoDir, name + '.js')
  fs.writeFileSync(file, js.join('\n'), 'utf8')
}

/** 生成 dao/index.js 汇总出口 */
function genDaoIndex() {
  const js = []
  js.push('// 本文件由 scripts/gen-dao.js 自动生成：全部表的 DAO 汇总出口')
  for (const t of tables) {
    js.push("import * as " + camel(t.name) + " from './" + t.name + ".js'")
  }
  js.push('')
  js.push('export {')
  for (const t of tables) {
    js.push('  ' + camel(t.name) + ',')
  }
  js.push('}')
  js.push('')
  fs.writeFileSync(safeWritePath(daoDir, 'index.js'), js.join('\n'), 'utf8')
}

/** 生成迁移模块（字面量 DDL 逐条执行） */
function genMigrate() {
  const js = []
  js.push('// 本文件由 scripts/gen-dao.js 依据 schema.js 自动生成：幂等建表 DDL（字面量）')
  js.push("import { initDb, dialect, sqliteConn, mysqlConn } from './index.js'")
  js.push('')
  js.push('export async function runMigration() {')
  js.push('  await initDb()')
  js.push("  if (dialect === 'sqlite') {")
  for (const t of tables) {
    // prepare().run() 执行单条 DDL（node:sqlite 中与 exec 等价，避免与 child_process.exec 模式混淆）
    js.push('    sqliteConn().prepare(' + JSON.stringify(sqliteDdl(t)) + ').run()')
    for (const idx of t.indexes || []) {
      const idxName = 'idx_' + t.name + '_' + idx.join('_')
      js.push(
        '    sqliteConn().prepare(' +
          JSON.stringify('CREATE INDEX IF NOT EXISTS ' + idxName + ' ON ' + t.name + ' (' + idx.join(', ') + ')') +
          ').run()'
      )
    }
  }
  js.push('  } else {')
  js.push('    // mysql')
  for (const t of tables) {
    js.push('    await mysqlConn().query(' + JSON.stringify(mysqlDdl(t)) + ')')
    for (const idx of t.indexes || []) {
      const idxName = 'idx_' + t.name + '_' + idx.join('_')
      js.push(
        '    try { await mysqlConn().query(' +
          JSON.stringify('CREATE INDEX ' + idxName + ' ON ' + t.name + ' (' + idx.join(', ') + ')') +
          ') } catch (e) { if (!/exist|duplicate/i.test(String(e.message))) throw e }'
      )
    }
  }
  js.push('  }')
  js.push('}')
  js.push('')
  fs.writeFileSync(safeWritePath(dbDir, 'migrate-generated.js'), js.join('\n'), 'utf8')
}

function typeOf(col, dl) {
  const { base, arg } = parseType(col.type)
  const map =
    dl === 'sqlite'
      ? { bigint: 'INTEGER', int: 'INTEGER', tinyint: 'INTEGER', decimal: 'NUMERIC', date: 'TEXT', datetime: 'TEXT' }
      : { bigint: 'BIGINT', int: 'INT', tinyint: 'TINYINT', decimal: 'DECIMAL', date: 'DATE', DATE: 'DATE', datetime: 'DATETIME' }
  let ty = map[base] || 'TEXT'
  if (arg && (base === 'varchar' || base === 'decimal')) ty += '(' + arg + ')'
  return ty
}

function sqliteDdl(t) {
  const lines = []
  for (const c of t.columns) {
    const segs = [c.name, typeOf(c, 'sqlite')]
    if (c.pk) {
      segs.push('PRIMARY KEY')
      if (c.auto) segs.push('AUTOINCREMENT')
    }
    if (c.notNull) segs.push('NOT NULL')
    if (c.unique) segs.push('UNIQUE')
    if (c.def !== undefined && c.def !== null) segs.push('DEFAULT ' + JSON.stringify(c.def))
    lines.push('  ' + segs.join(' '))
  }
  return 'CREATE TABLE IF NOT EXISTS ' + t.name + ' (\n' + lines.join(',\n') + '\n)'
}

function mysqlDdl(t) {
  const lines = []
  for (const c of t.columns) {
    const segs = [c.name, typeOf(c, 'mysql')]
    if (c.pk) {
      segs.push('PRIMARY KEY')
      if (c.auto) segs.push('AUTO_INCREMENT')
    }
    if (c.notNull) segs.push('NOT NULL')
    if (c.unique) segs.push('UNIQUE')
    if (c.def !== undefined && c.def !== null) segs.push('DEFAULT ' + JSON.stringify(c.def))
    if (c.comment) segs.push("COMMENT '" + String(c.comment).replace(/'/g, "''") + "'")
    lines.push('  ' + segs.join(' '))
  }
  return (
    'CREATE TABLE IF NOT EXISTS ' + t.name + ' (\n' + lines.join(',\n') +
    "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='" + (t.comment || t.name) + "'"
  )
}

// ---- 执行生成 ----
for (const t of tables) genTableDao(t)
genDaoIndex()
genMigrate()
console.log('[gen-dao] 已生成 ' + tables.length + ' 个 DAO 文件 + dao/index.js + migrate-generated.js')
