// 枚举映射常量（前后端共用，见 docs/FRONTEND-CONVENTIONS.md §4）

/** 软件分类 category */
export const CATEGORY = { 1: '操作系统', 2: '办公软件', 3: '杀毒软件', 4: '工业软件' }
/** 软件类型 software_type */
export const SOFTWARE_TYPE = { 1: '商业软件', 2: 'OEM软件', 3: '免费软件' }
/** 计算机类型 computer_type（1服务器 2台式机 3笔记本 4一体机 5组装机） */
export const COMPUTER_TYPE = { 1: '服务器', 2: '台式机', 3: '笔记本', 4: '一体机', 5: '组装机' }
/** 计算机状态 status */
export const COMPUTER_STATUS = { 1: '在用', 2: '闲置', 3: '报废' }
/** 采购方式 purchase_method */
export const PURCHASE_METHOD = { 1: '采购', 2: '受赠', 3: '调剂' }
/** 申请类型 apply_type */
export const APPLY_TYPE = { 1: '安装', 2: '卸载', 3: '升级' }
/** 流程状态 status */
export const FLOW_STATUS = {
  0: '草稿', 10: '待部门审核', 20: '待信息化审核', 30: '待执行', 40: '待使用人确认', 50: '已完成', 60: '已驳回'
}
/** 维护操作 op_type */
export const OP_TYPE = { 1: '安装', 2: '卸载', 3: '升级前卸载', 4: '升级后安装' }
/** 核查结果 ins result */
export const INS_RESULT = { 1: '相符', 2: '不符', 3: '未安装', 4: '未登记' }
/** 预警类型 alert_type */
export const ALERT_TYPE = { 1: '到期预警', 2: '超授权预警', 3: '未登记预警', 4: '未核查预警' }
/** 预警状态 */
export const ALERT_STATUS = { 0: '未处理', 1: '处理中', 2: '已处理' }
/** 预警级别 level */
export const ALERT_LEVEL = { 1: '高', 2: '中', 3: '低' }
/** 需求/计划 status */
export const REQ_STATUS = { 0: '草稿', 1: '待审核', 2: '通过', 3: '驳回' }
/** 数据权限 dataScope */
export const DATA_SCOPE = { 1: '全部数据', 2: '本单位', 3: '本部门', 4: '仅本人' }
/** 授权/许可类型（字符串字典） */
export const AUTH_TYPE_LIST = ['场地授权', '数量授权', '订阅授权', '永久授权', '并发授权']
/** 单位层级 */
export const ORG_LEVEL = { 1: '集团本部', 2: '二级单位', 3: '三级单位' }
/** 督查任务类型 */
export const CHECK_TYPE = { 1: '督查', 2: '自查' }
/** 督查任务状态 */
export const TASK_STATUS = { 1: '进行中', 2: '已完成' }
/** 通用启用状态 */
export const ENABLE_STATUS = { 1: '启用', 0: '停用' }
/** 审批结果 */
export const APPROVE_RESULT = { 1: '通过', 2: '驳回' }
/** 软件合规状态（install_count 与 license_qty 对账） */
export const COMPLIANCE_TEXT = { ok: '正常', over: '超授权', idle: '闲置' }

/** 通用枚举取文本 */
export function enumText(map, val) {
  if (val === undefined || val === null || val === '') return '-'
  const v = typeof val === 'string' && isNaN(Number(val)) ? val : Number(val)
  return map[v] !== undefined ? map[v] : String(val)
}

/** Element Tag 类型映射：成功/警告/危险/信息 */
export const STATUS_TAG = {
  1: 'success', 2: 'warning', 3: 'danger', 0: 'info'
}

/** 计算机状态 → tag */
export function computerStatusTag(s) {
  return { 1: 'success', 2: 'info', 3: 'danger' }[Number(s)] || 'info'
}

/** 流程状态 → tag */
export function flowStatusTag(s) {
  return { 0: 'info', 10: 'warning', 20: 'warning', 30: 'primary', 40: 'primary', 50: 'success', 60: 'danger' }[Number(s)] || 'info'
}

/** 需求/计划状态 → tag */
export function reqStatusTag(s) {
  return { 0: 'info', 1: 'warning', 2: 'success', 3: 'danger' }[Number(s)] || 'info'
}

/** 预警级别 → tag */
export function alertLevelTag(l) {
  return { 1: 'danger', 2: 'warning', 3: 'info' }[Number(l)] || 'info'
}

/** 预警状态 → tag */
export function alertStatusTag(s) {
  return { 0: 'danger', 1: 'warning', 2: 'success' }[Number(s)] || 'info'
}

/** 软件合规 → tag */
export function complianceTag(c) {
  return { ok: 'success', over: 'danger', idle: 'info' }[c] || 'info'
}

/** 数据字典 tab 类型清单（与种子数据一致） */
export const DICT_TYPES = [
  { type: 'software_category', label: '软件分类' },
  { type: 'software_type', label: '软件类型' },
  { type: 'computer_type', label: '计算机类型' },
  { type: 'computer_status', label: '计算机状态' },
  { type: 'auth_type', label: '授权类型' },
  { type: 'purchase_method', label: '采购方式' },
  { type: 'apply_type', label: '申请类型' },
  { type: 'install_source', label: '安装来源' },
  { type: 'inspect_result', label: '核查结果' }
]

/**
 * 权限点清单树（角色管理 el-tree 数据源）
 * 分组节点 key 以 group: 开头，叶子节点 perm 为真实权限点
 */
export const PERM_TREE = [
  {
    label: '工作台', key: 'group:dashboard', children: [
      { label: '工作台查看', perm: 'dashboard', key: 'p:dashboard' }
    ]
  },
  {
    label: '基础管理', key: 'group:base', children: [
      { label: '组织单位', perm: 'org:view', key: 'p:org:view' },
      { label: '组织维护', perm: 'org:edit', key: 'p:org:edit' },
      { label: '部门管理', perm: 'dept:view', key: 'p:dept:view' },
      { label: '部门维护', perm: 'dept:edit', key: 'p:dept:edit' },
      { label: '用户管理', perm: 'user:view', key: 'p:user:view' },
      { label: '用户维护', perm: 'user:edit', key: 'p:user:edit' },
      { label: '角色管理', perm: 'role:view', key: 'p:role:view' },
      { label: '角色维护', perm: 'role:edit', key: 'p:role:edit' },
      { label: '数据字典', perm: 'dict:view', key: 'p:dict:view' },
      { label: '字典维护', perm: 'dict:edit', key: 'p:dict:edit' },
      { label: '系统参数', perm: 'config:view', key: 'p:config:view' },
      { label: '参数维护', perm: 'config:edit', key: 'p:config:edit' },
      { label: '审计日志', perm: 'audit:view', key: 'p:audit:view' }
    ]
  },
  {
    label: '台账管理', key: 'group:asset', children: [
      { label: '计算机台账', perm: 'computer:view', key: 'p:computer:view' },
      { label: '计算机维护', perm: 'computer:edit', key: 'p:computer:edit' },
      { label: '软件资产库', perm: 'software:view', key: 'p:software:view' },
      { label: '软件维护', perm: 'software:edit', key: 'p:software:edit' },
      { label: '安装明细', perm: 'install:view', key: 'p:install:view' },
      { label: '安装登记', perm: 'install:edit', key: 'p:install:edit' },
      { label: '免费软件清单', perm: 'free:view', key: 'p:free:view' },
      { label: '免费软件维护', perm: 'free:edit', key: 'p:free:edit' },
      { label: '领导小组', perm: 'leader:view', key: 'p:leader:view' },
      { label: '领导小组维护', perm: 'leader:edit', key: 'p:leader:edit' }
    ]
  },
  {
    label: '采购与授权', key: 'group:purchase', children: [
      { label: '合同管理', perm: 'contract:view', key: 'p:contract:view' },
      { label: '合同维护', perm: 'contract:edit', key: 'p:contract:edit' },
      { label: '授权管理', perm: 'entitlement:view', key: 'p:entitlement:view' },
      { label: '授权维护', perm: 'entitlement:edit', key: 'p:entitlement:edit' },
      { label: '查看激活码', perm: 'entitlement:secret', key: 'p:entitlement:secret' },
      { label: '管理员账号', perm: 'adminaccount:view', key: 'p:adminaccount:view' },
      { label: '管理员账号维护', perm: 'adminaccount:edit', key: 'p:adminaccount:edit' },
      { label: '许可分配', perm: 'alloc:view', key: 'p:alloc:view' },
      { label: '许可分配维护', perm: 'alloc:edit', key: 'p:alloc:edit' },
      { label: '需求申请', perm: 'require:view', key: 'p:require:view' },
      { label: '需求申请维护', perm: 'require:edit', key: 'p:require:edit' },
      { label: '采购计划', perm: 'plan:view', key: 'p:plan:view' },
      { label: '采购计划维护', perm: 'plan:edit', key: 'p:plan:edit' }
    ]
  },
  {
    label: '流程中心', key: 'group:flow', children: [
      { label: '流程查看', perm: 'apply:view', key: 'p:apply:view' },
      { label: '发起申请', perm: 'apply:create', key: 'p:apply:create' },
      { label: '部门审核', perm: 'apply:approve1', key: 'p:apply:approve1' },
      { label: '信息化审核', perm: 'apply:approve2', key: 'p:apply:approve2' },
      { label: '流程执行', perm: 'apply:execute', key: 'p:apply:execute' },
      { label: '使用确认', perm: 'apply:confirm', key: 'p:apply:confirm' }
    ]
  },
  {
    label: '监管分析', key: 'group:supervise', children: [
      { label: '报表中心', perm: 'report:view', key: 'p:report:view' },
      { label: '预警中心', perm: 'alert:view', key: 'p:alert:view' },
      { label: '预警处理', perm: 'alert:handle', key: 'p:alert:handle' },
      { label: '督查管理', perm: 'ins:view', key: 'p:ins:view' },
      { label: '督查维护', perm: 'ins:edit', key: 'p:ins:edit' },
      { label: '统计驾驶舱', perm: 'stats:view', key: 'p:stats:view' }
    ]
  }
]

/** 全部叶子权限点集合 */
export const PERM_KEYS = PERM_TREE.flatMap((g) => g.children.map((c) => c.perm))
