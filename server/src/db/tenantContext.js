/**
 * 租户上下文（多租户数据隔离）—— 基于 AsyncLocalStorage 的请求级隔离
 *
 * authGuard 在请求开始时以 als.run(tenantId, next) 包装请求处理链：
 *  - 同一请求内的所有 DAO 读写（含 await 挂起后的延续）都能取到正确的租户
 *  - 并发请求之间互不污染（模块级变量在并行请求下存在竞态，禁止使用）
 *
 * currentTenant() 语义：
 *  - 返回 null（平台运营账号 tenant_id=0，或无登录上下文）→ DAO 不过滤，可见/可写全量
 *  - 返回 N（租户管理员/成员）→ 该租户所有数据的读/写自动限定在自己公司范围内
 */
import { AsyncLocalStorage } from 'node:async_hooks'

const als = new AsyncLocalStorage()

/** 以指定租户上下文运行处理链（中间件用） */
export function runWithTenant(tenantId, fn) {
  const id = tenantId === null || tenantId === undefined || Number(tenantId) === 0 ? null : Number(tenantId)
  return als.run(id, fn)
}

/** 读取当前请求的租户ID（无上下文返回 null） */
export function currentTenant() {
  const v = als.getStore()
  return v === undefined || v === null ? null : Number(v)
}
