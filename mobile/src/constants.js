/** 枚举中文映射与 Tag 类型（与 docs/FRONTEND-CONVENTIONS.md §4 一致） */

export const CATEGORY_MAP = { 1: '操作系统', 2: '办公软件', 3: '杀毒软件', 4: '工业软件' }

export const SOFTWARE_TYPE_MAP = { 1: '商业软件', 2: 'OEM软件', 3: '免费软件' }

export const COMPUTER_TYPE_MAP = { 1: '服务器', 2: '台式机', 3: '笔记本', 4: '一体机', 5: '组装机' }

export const COMPUTER_STATUS_MAP = { 1: '在用', 2: '闲置', 3: '报废' }

export const APPLY_TYPE_MAP = { 1: '安装', 2: '卸载', 3: '升级' }

export const FLOW_STATUS_MAP = {
  0: '草稿',
  10: '待部门审核',
  20: '待信息化审核',
  30: '待执行',
  40: '待使用人确认',
  50: '已完成',
  60: '已驳回'
}

export const OP_TYPE_MAP = { 1: '安装', 2: '卸载', 3: '升级前卸载', 4: '升级后安装' }

export const ALERT_TYPE_MAP = { 1: '到期', 2: '超授权', 3: '未登记', 4: '未核查' }

export const ALERT_STATUS_MAP = { 0: '未处理', 1: '处理中', 2: '已处理' }

export const ALERT_LEVEL_MAP = { 1: '高', 2: '中', 3: '低' }

/** 枚举取文案（key 为数字或字符串均可） */
export function mapText(map, key) {
  if (key === null || key === undefined || key === '') return '-'
  return map[key] || map[Number(key)] || String(key)
}

/** 流程状态 Tag 类型：完成绿 / 驳回红 / 草稿灰 / 待办橙 */
export function flowStatusType(status) {
  const s = Number(status)
  if (s === 50) return 'success'
  if (s === 60) return 'danger'
  if (s === 0) return 'default'
  return 'warning'
}

/** 预警状态 Tag：未处理红 / 处理中橙 / 已处理绿 */
export function alertStatusType(status) {
  const s = Number(status)
  if (s === 0) return 'danger'
  if (s === 1) return 'warning'
  return 'success'
}

/** 预警级别 Tag：高红 / 中橙 / 低灰 */
export function alertLevelType(level) {
  const s = Number(level)
  if (s === 1) return 'danger'
  if (s === 2) return 'warning'
  return 'default'
}

/** 计算机状态 Tag：在用绿 / 闲置灰 / 报废红 */
export function computerStatusType(status) {
  const s = Number(status)
  if (s === 1) return 'success'
  if (s === 2) return 'default'
  return 'danger'
}

/** 申请类型 Tag：安装蓝 / 卸载灰 / 升级橙 */
export function applyTypeTagType(type) {
  const t = Number(type)
  if (t === 1) return 'primary'
  if (t === 3) return 'warning'
  return 'default'
}
