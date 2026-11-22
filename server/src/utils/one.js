/** 按主键取单行（统一 list 模式；路由/服务中禁用 dao.get 直查形态） */
import { asset } from '../db/queries/index.js'

export async function oneOf(dao, id) {
  const rows = await dao.list({ id: Number(id) }, { pageSize: 1 })
  return (rows && rows[0]) || null
}

/**
 * 按主键取软件行（三态：平台通用层 ∨ 查看者自有层）——
 * 软件编号为全局唯一空间，平台通用清单（tenant_id=0）对全部租户可读。
 * 查询定义：queries/asset.js#softwareById（字面量 SQL + 参数绑定，三态租户条件）
 */
export async function oneOfSoftware(id) {
  const rows = await asset.softwareById({ id: Number(id) })
  return (rows && rows[0]) || null
}
