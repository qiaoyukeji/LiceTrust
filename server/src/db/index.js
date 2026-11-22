/**
 * 数据库连接与事务管理（本文件不含任何 SQL 执行语句）
 *
 * 方言：
 *  - sqlite：Node 内置 node:sqlite（零原生依赖，开发/演示默认）
 *  - mysql ：mysql2 连接池（生产环境）
 *
 * SQL 执行一律在 db/dao/*.js（schema 驱动生成，字面量 SQL + 参数绑定）
 * 与手写查询文件（db/queries.js、各模块 dao/queries-*.js）中完成，
 * 统一遵循「字面量 SQL + 占位符参数 + 同函数执行」安全模式。
 */
import fs from 'node:fs'
import path from 'node:path'
import config from '../config/index.js'

export const dialect = config.db.dialect

let sqliteDb = null
let mysqlPool = null
let initialized = false
const txStack = []

export async function initDb() {
  if (initialized) return
  if (dialect === 'sqlite') {
    fs.mkdirSync(path.dirname(config.db.sqlitePath), { recursive: true })
    const mod = await import('node:sqlite')
    sqliteDb = new mod.DatabaseSync(config.db.sqlitePath)
    sqliteDb.exec('PRAGMA journal_mode = WAL;')
  } else if (dialect === 'mysql') {
    const mysql = await import('mysql2/promise')
    mysqlPool = mysql.createPool({
      ...config.db.mysql,
      waitForConnections: true,
      connectionLimit: 10,
      charset: 'utf8mb4_general_ci',
      dateStrings: true
    })
  } else {
    throw new Error('不支持的数据库方言: ' + dialect)
  }
  initialized = true
}

/** sqlite 连接（node:sqlite DatabaseSync） */
export function sqliteConn() {
  return sqliteDb
}

/** mysql 连接池（mysql2/promise Pool） */
export function mysqlConn() {
  return mysqlPool
}

/** 当前事务连接（无活动事务返回 null） */
export function currentConn() {
  return txStack.length ? txStack[txStack.length - 1] : null
}

/** 事务：fn 内的 DAO 调用自动绑定到事务连接 */
export async function tx(fn) {
  if (dialect === 'sqlite') {
    const c = currentConn() || sqliteDb
    c.exec('BEGIN')
    txStack.push(c)
    try {
      const ret = await fn()
      txStack.pop()
      c.exec('COMMIT')
      return ret
    } catch (e) {
      txStack.pop()
      c.exec('ROLLBACK')
      throw e
    }
  }
  const c = await mysqlPool.getConnection()
  await c.beginTransaction()
  txStack.push(c)
  try {
    const ret = await fn()
    txStack.pop()
    await c.commit()
    c.release()
    return ret
  } catch (e) {
    txStack.pop()
    await c.rollback()
    c.release()
    throw e
  }
}

/** 关闭连接（进程退出前调用） */
export async function closeDb() {
  if (sqliteDb) sqliteDb.close()
  if (mysqlPool) await mysqlPool.end()
  initialized = false
}
