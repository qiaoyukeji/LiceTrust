/**
 * 数据模型定义 —— 依据《正版软件管理平台 需求分析与设计文档》第 6 章数据库设计
 *
 * 所有业务表自动附加公共字段（文档 6.2 说明）：
 *   create_time / update_time / create_by / update_by / is_deleted
 *
 * 类型为方言无关的抽象类型，由 db/migrate.js 按方言（sqlite / mysql）生成 DDL：
 *   bigint / int / tinyint / varchar(n) / text / date / datetime / decimal(14,2)
 */

/** 公共尾部字段（文档 6.2：所有表含公共字段） */
const tail = [
  { name: 'create_time', type: 'datetime', comment: '创建时间' },
  { name: 'update_time', type: 'datetime', comment: '更新时间' },
  { name: 'create_by', type: 'bigint', comment: '创建人' },
  { name: 'update_by', type: 'bigint', comment: '更新人' },
  { name: 'is_deleted', type: 'tinyint', def: 0, comment: '逻辑删除标志' }
]

/** 业务列 + 主键 + 公共字段 */
const cols = (list) => [
  { name: 'id', type: 'bigint', pk: true, auto: true, comment: '主键' },
  ...list,
  ...tail
]

export const tables = [
  // ============ 多租户：租户（公司）表 ============
  {
    name: 'sys_tenant',
    comment: '租户（公司）表：注册企业，数据隔离边界',
    columns: cols([
      { name: 'tenant_name', type: 'varchar(150)', notNull: true, comment: '公司名称' },
      { name: 'contact_person', type: 'varchar(50)', comment: '联系人' },
      { name: 'contact_phone', type: 'varchar(30)', comment: '联系电话' },
      { name: 'address', type: 'varchar(200)', comment: '公司地址' },
      { name: 'industry', type: 'varchar(50)', comment: '所属行业' },
      { name: 'use_platform_sms', type: 'tinyint', def: 0, comment: '是否允许使用平台短信通道（平台分配）' },
      { name: 'sms_quota', type: 'int', def: 0, comment: '平台短信配额总数' },
      { name: 'sms_used', type: 'int', def: 0, comment: '平台短信已用条数' },
      { name: 'use_platform_email', type: 'tinyint', def: 0, comment: '是否允许使用平台邮箱SMTP通道（平台分配）' },
      { name: 'email_quota', type: 'int', def: 0, comment: '平台邮箱配额总数' },
      { name: 'email_used', type: 'int', def: 0, comment: '平台邮箱已用封数' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1正常 0停用' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ])
  },

  // ============ 消息通道配置（租户自有短信/SMTP）============
  {
    name: 'tenant_msg_config',
    comment: '租户消息通道配置表（短信接口与SMTP邮箱，租户自助维护）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', notNull: true, unique: true, comment: '租户ID' },
      { name: 'sms_enabled', type: 'tinyint', def: 0, comment: '启用自有短信通道' },
      { name: 'sms_mode', type: 'varchar(20)', def: 'mock', comment: 'mock/alibaba/alibaba_pnvs' },
      { name: 'sms_access_key_id', type: 'varchar(100)', comment: 'AccessKey ID' },
      { name: 'sms_access_key_secret', type: 'varchar(200)', comment: 'AccessKey Secret（AES加密存储）' },
      { name: 'sms_sign_name', type: 'varchar(60)', comment: '短信签名' },
      { name: 'sms_template_code', type: 'varchar(60)', comment: '模板Code' },
      { name: 'smtp_enabled', type: 'tinyint', def: 0, comment: '启用自有SMTP邮箱通道' },
      { name: 'smtp_host', type: 'varchar(120)', comment: 'SMTP服务器' },
      { name: 'smtp_port', type: 'int', def: 465, comment: 'SMTP端口' },
      { name: 'smtp_secure', type: 'tinyint', def: 1, comment: 'SSL/TLS' },
      { name: 'smtp_user', type: 'varchar(120)', comment: '发件邮箱账号' },
      { name: 'smtp_pass', type: 'varchar(200)', comment: '发件邮箱密码/授权码（AES加密存储）' },
      { name: 'smtp_from', type: 'varchar(120)', comment: '发件人显示地址' },
      { name: 'expire_sms_days', type: 'int', def: 7, comment: '到期短信提前天数' },
      { name: 'expire_email_days', type: 'int', def: 7, comment: '到期邮件提前天数' }
    ]),
    indexes: [['tenant_id']]
  },

  // ============ 消息通道配置（平台运营方全局短信/SMTP）============
  {
    name: 'platform_msg_config',
    comment: '平台消息通道配置表（单行，平台运营方维护，供未配置自有通道的租户分配使用）',
    columns: cols([
      { name: 'sms_enabled', type: 'tinyint', def: 0, comment: '平台短信通道启用' },
      { name: 'sms_mode', type: 'varchar(20)', def: 'mock', comment: 'mock/alibaba/alibaba_pnvs' },
      { name: 'sms_access_key_id', type: 'varchar(100)', comment: 'AccessKey ID' },
      { name: 'sms_access_key_secret', type: 'varchar(200)', comment: 'AccessKey Secret（AES加密存储）' },
      { name: 'sms_sign_name', type: 'varchar(60)', comment: '短信签名' },
      { name: 'sms_template_code', type: 'varchar(60)', comment: '模板Code' },
      { name: 'smtp_enabled', type: 'tinyint', def: 0, comment: '平台SMTP通道启用' },
      { name: 'smtp_host', type: 'varchar(120)', comment: 'SMTP服务器' },
      { name: 'smtp_port', type: 'int', def: 465, comment: 'SMTP端口' },
      { name: 'smtp_secure', type: 'tinyint', def: 1, comment: 'SSL/TLS' },
      { name: 'smtp_user', type: 'varchar(120)', comment: '发件邮箱账号' },
      { name: 'smtp_pass', type: 'varchar(200)', comment: '发件邮箱密码/授权码（AES加密存储）' },
      { name: 'smtp_from', type: 'varchar(120)', comment: '发件人显示地址' }
    ])
  },

  // ============ 消息发送记录（额度扣减依据与审计）============
  {
    name: 'msg_send_log',
    comment: '消息发送记录表（短信/邮件，通道与额度审计）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID' },
      { name: 'channel', type: 'varchar(10)', notNull: true, comment: 'sms/email' },
      { name: 'source', type: 'varchar(10)', notNull: true, comment: '通道来源：tenant自有/platform平台' },
      { name: 'target', type: 'varchar(150)', notNull: true, comment: '接收方（手机号/邮箱）' },
      { name: 'content', type: 'varchar(500)', comment: '内容摘要' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1成功 0失败' },
      { name: 'error', type: 'varchar(300)', comment: '失败原因' }
    ]),
    indexes: [['tenant_id'], ['channel'], ['create_time']]
  },

  // ============ 6.2.1 组织表 ============
  {
    name: 'sys_org',
    comment: '组织单位表（集团-二级单位-三级单位）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'parent_id', type: 'bigint', def: 0, comment: '父级ID，0为根' },
      { name: 'org_name', type: 'varchar(100)', notNull: true, comment: '单位名称' },
      { name: 'org_code', type: 'varchar(50)', comment: '单位编码' },
      { name: 'org_level', type: 'tinyint', def: 1, comment: '层级：1集团 2二级 3三级' },
      { name: 'sort_no', type: 'int', def: 0, comment: '排序' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1启用 0停用' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ]),
    indexes: [['org_code'], ['parent_id']]
  },

  // ============ 6.2.2 部门表 ============
  {
    name: 'sys_dept',
    comment: '部门表',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'org_id', type: 'bigint', notNull: true, comment: '所属单位' },
      { name: 'parent_id', type: 'bigint', def: 0, comment: '父部门ID，0为根' },
      { name: 'dept_name', type: 'varchar(100)', notNull: true, comment: '部门名称' },
      { name: 'dept_code', type: 'varchar(50)', comment: '部门编码' },
      { name: 'sort_no', type: 'int', def: 0, comment: '排序' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1启用 0停用' }
    ]),
    indexes: [['org_id'], ['parent_id']]
  },

  // ============ 6.2.3 人员/账号表（一期：人员与登录账号合一，见 README 差异说明）============
  {
    name: 'sys_user',
    comment: '用户/人员表（含登录账号）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台运营账号）' },
      { name: 'username', type: 'varchar(50)', notNull: true, unique: true, comment: '登录账号' },
      { name: 'password_hash', type: 'varchar(200)', notNull: true, comment: '密码散列(bcrypt)' },
      { name: 'real_name', type: 'varchar(50)', notNull: true, comment: '姓名' },
      { name: 'emp_no', type: 'varchar(50)', comment: '工号' },
      { name: 'org_id', type: 'bigint', def: 0, comment: '所属单位' },
      { name: 'dept_id', type: 'bigint', def: 0, comment: '部门' },
      { name: 'position', type: 'varchar(50)', comment: '岗位' },
      { name: 'phone', type: 'varchar(30)', comment: '联系电话' },
      { name: 'use_computer', type: 'tinyint', def: 1, comment: '是否使用计算机' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1启用 0停用' },
      { name: 'last_login_time', type: 'datetime', comment: '最后登录时间' },
      { name: 'remark', type: 'varchar(200)', comment: '备注' }
    ]),
    indexes: [['emp_no'], ['org_id'], ['dept_id']]
  },

  {
    name: 'sys_role',
    comment: '角色表（RBAC：功能权限 + 数据权限分离，文档 FR-15-02；tenant_id=0 平台预置角色）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台预置角色，各企业共用）' },
      { name: 'role_code', type: 'varchar(50)', notNull: true, unique: true, comment: '角色编码' },
      { name: 'role_name', type: 'varchar(50)', notNull: true, comment: '角色名称' },
      { name: 'data_scope', type: 'tinyint', def: 4, comment: '数据权限：1全部 2本单位 3本部门 4仅本人' },
      { name: 'perms', type: 'text', comment: '功能权限点集合(JSON数组)' },
      { name: 'remark', type: 'varchar(200)', comment: '备注' }
    ])
  },

  {
    name: 'sys_user_role',
    comment: '用户角色关联表',
    columns: cols([
      { name: 'user_id', type: 'bigint', notNull: true, comment: '用户ID' },
      { name: 'role_id', type: 'bigint', notNull: true, comment: '角色ID' }
    ]),
    indexes: [['user_id'], ['role_id']]
  },

  {
    name: 'sys_dict',
    comment: '数据字典表（FR-15-04；tenant_id=0 平台通用项，企业可添加自有项）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台通用项）' },
      { name: 'dict_type', type: 'varchar(50)', notNull: true, comment: '字典类型' },
      { name: 'dict_label', type: 'varchar(50)', notNull: true, comment: '显示名' },
      { name: 'dict_value', type: 'varchar(50)', notNull: true, comment: '值' },
      { name: 'sort_no', type: 'int', def: 0, comment: '排序' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1启用 0停用' },
      { name: 'remark', type: 'varchar(200)', comment: '备注' }
    ]),
    indexes: [['dict_type']]
  },

  {
    name: 'sys_config',
    comment: '系统参数配置表（FR-15-06）',
    columns: cols([
      { name: 'config_key', type: 'varchar(100)', notNull: true, unique: true, comment: '参数键' },
      { name: 'config_value', type: 'varchar(500)', comment: '参数值' },
      { name: 'config_name', type: 'varchar(100)', comment: '参数名称' },
      { name: 'remark', type: 'varchar(200)', comment: '备注' }
    ])
  },

  {
    name: 'sys_audit_log',
    comment: '审计日志表（FR-15-05，只增不改不删）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'user_id', type: 'bigint', def: 0, comment: '操作人ID' },
      { name: 'username', type: 'varchar(50)', comment: '操作人账号' },
      { name: 'module', type: 'varchar(50)', comment: '模块' },
      { name: 'operation', type: 'varchar(100)', comment: '操作' },
      { name: 'method', type: 'varchar(10)', comment: 'HTTP方法' },
      { name: 'path', type: 'varchar(200)', comment: '请求路径' },
      { name: 'detail', type: 'text', comment: '操作详情(JSON，敏感字段已脱敏)' },
      { name: 'ip', type: 'varchar(50)', comment: 'IP地址' },
      { name: 'op_time', type: 'datetime', comment: '操作时间' }
    ]),
    indexes: [['user_id'], ['op_time'], ['module']]
  },

  // ============ 6.2.5 软件资产表 ============
  {
    name: 'base_software',
    comment: '软件资产库（软件主数据）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'software_no', type: 'varchar(50)', notNull: true, unique: true, comment: '软件编号（按指南规则生成）' },
      { name: 'software_name', type: 'varchar(100)', notNull: true, comment: '软件名称' },
      { name: 'version', type: 'varchar(50)', comment: '软件版本' },
      { name: 'usable_version', type: 'varchar(100)', comment: '可使用版本' },
      { name: 'category', type: 'tinyint', notNull: true, comment: '用途分类：1操作系统 2办公软件 3杀毒软件 4工业软件' },
      { name: 'software_type', type: 'tinyint', notNull: true, comment: '类型：1商业软件 2OEM软件 3免费软件' },
      { name: 'is_domestic', type: 'tinyint', def: 0, comment: '国产化标记：1国产软件 0国外/未知（二期信创统计）' },
      { name: 'vendor', type: 'varchar(100)', comment: '厂商' },
      { name: 'source', type: 'varchar(100)', comment: '来源' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1在用 0停用' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ]),
    indexes: [['software_name'], ['category'], ['software_type']]
  },

  {
    name: 'base_free_software',
    comment: '免费软件清单表（附件6，FR-05-04）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'software_id', type: 'bigint', notNull: true, comment: '软件ID' },
      { name: 'vendor', type: 'varchar(100)', comment: '软件厂商' },
      { name: 'source', type: 'varchar(100)', comment: '软件来源' },
      { name: 'use_dept', type: 'varchar(100)', comment: '使用部门' },
      { name: 'use_reason', type: 'varchar(200)', comment: '使用原因' },
      { name: 'service_contact', type: 'varchar(100)', comment: '厂商客服联系方式' }
    ]),
    indexes: [['software_id']]
  },

  {
    name: 'base_leader',
    comment: '软件正版化领导小组成员表（附件1，FR-02-03）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'division', type: 'varchar(50)', comment: '分工（组长/副组长/成员）' },
      { name: 'dept', type: 'varchar(100)', comment: '部门' },
      { name: 'position', type: 'varchar(50)', comment: '职务' },
      { name: 'name', type: 'varchar(50)', notNull: true, comment: '姓名' },
      { name: 'phone', type: 'varchar(30)', comment: '联系电话' },
      { name: 'fax', type: 'varchar(30)', comment: '传真' },
      { name: 'sort_no', type: 'int', def: 0, comment: '排序' },
      { name: 'remark', type: 'varchar(200)', comment: '备注' }
    ])
  },

  // ============ 6.2.4 计算机台账表（一机一档主表）============
  {
    name: 'asset_computer',
    comment: '计算机台账表（一机一档主表，FR-03）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'computer_no', type: 'varchar(50)', notNull: true, unique: true, comment: '计算机编号（全局唯一）' },
      { name: 'asset_no', type: 'varchar(100)', comment: '固定资产编号（手填或扫码录入）' },
      { name: 'brand', type: 'varchar(50)', comment: '计算机品牌' },
      { name: 'model', type: 'varchar(100)', comment: '型号' },
      { name: 'sn', type: 'varchar(100)', comment: '序列号' },
      { name: 'computer_type', type: 'tinyint', notNull: true, comment: '类型：1服务器 2台式机 3便携机' },
      { name: 'org_id', type: 'bigint', notNull: true, comment: '所属单位' },
      { name: 'dept_id', type: 'bigint', notNull: true, comment: '使用部门' },
      { name: 'user_id', type: 'bigint', def: 0, comment: '使用人ID' },
      { name: 'location', type: 'varchar(100)', comment: '物理位置' },
      { name: 'enable_date', type: 'date', comment: '启用日期' },
      { name: 'purchase_date', type: 'date', comment: '电脑采购时间' },
      { name: 'report_time', type: 'datetime', comment: '数据填报时间（默认当前时间）' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1在用 2闲置 3报废' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ]),
    indexes: [['org_id'], ['dept_id'], ['user_id'], ['computer_type'], ['status']]
  },

  // ============ 6.2.6 安装明细表 ============
  {
    name: 'asset_install_record',
    comment: '软件安装明细表（FR-04，安装数量由本表实时聚合保证账实相符）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'computer_id', type: 'bigint', notNull: true, comment: '计算机ID' },
      { name: 'software_id', type: 'bigint', notNull: true, comment: '软件ID' },
      { name: 'dept_id', type: 'bigint', comment: '使用部门（冗余便于统计）' },
      { name: 'user_id', type: 'bigint', comment: '使用人（冗余）' },
      { name: 'version', type: 'varchar(50)', comment: '安装版本' },
      { name: 'license_term', type: 'varchar(100)', comment: '许可期限' },
      { name: 'install_date', type: 'date', comment: '安装日期' },
      { name: 'install_source', type: 'varchar(50)', comment: '安装来源：统一部署/个人申请/补录' },
      { name: 'inspect_status', type: 'tinyint', def: 0, comment: '现场核查情况：0未核查 1相符 2不符 3未安装 4未登记' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ]),
    indexes: [['computer_id'], ['software_id'], ['dept_id'], ['user_id'], ['install_date']]
  },

  // ============ 6.2.7 安装维护日志表 ============
  {
    name: 'asset_maint_log',
    comment: '安装维护日志表（FR-04-06，升级分别记录升级前/后两条）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'computer_id', type: 'bigint', notNull: true, comment: '计算机ID' },
      { name: 'software_id', type: 'bigint', def: 0, comment: '软件ID' },
      { name: 'op_type', type: 'tinyint', notNull: true, comment: '1安装 2卸载 3升级前卸载 4升级后安装' },
      { name: 'op_date', type: 'datetime', notNull: true, comment: '操作时间' },
      { name: 'operator_id', type: 'bigint', comment: '操作人' },
      { name: 'reason', type: 'varchar(500)', comment: '原因/说明' },
      { name: 'apply_id', type: 'bigint', def: 0, comment: '关联申请单' },
      { name: 'confirm_id', type: 'bigint', def: 0, comment: '关联确认单' }
    ]),
    indexes: [['computer_id'], ['software_id'], ['apply_id']]
  },

  // ============ 领用/归还记录表（生命周期，借鉴 Snipe-IT check-out/in）============
  {
    name: 'asset_checkout_log',
    comment: '领用/归还记录表（资产生命周期：1领用 2归还）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'computer_id', type: 'bigint', notNull: true, comment: '计算机ID' },
      { name: 'user_id', type: 'bigint', notNull: true, comment: '领用人/归还人' },
      { name: 'action', type: 'tinyint', notNull: true, comment: '1领用(checkout) 2归还(checkin)' },
      { name: 'action_time', type: 'datetime', notNull: true, comment: '操作时间' },
      { name: 'operator_id', type: 'bigint', def: 0, comment: '经办人' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ]),
    indexes: [['computer_id'], ['user_id'], ['action_time']]
  },

  // ============ 6.2.x 需求申请表（附件3）============
  {
    name: 'pur_require_apply',
    comment: '软件使用需求申请表（附件3，FR-06-01）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'apply_no', type: 'varchar(50)', notNull: true, comment: '申请编号' },
      { name: 'dept_id', type: 'bigint', notNull: true, comment: '申请部门' },
      { name: 'applicant_id', type: 'bigint', notNull: true, comment: '经手人' },
      { name: 'apply_time', type: 'datetime', comment: '申请时间' },
      { name: 'software_category', type: 'tinyint', notNull: true, comment: '软件类型：1操作系统 2办公 3杀毒 4其他' },
      { name: 'software_name', type: 'varchar(100)', comment: '软件名称' },
      { name: 'software_use', type: 'varchar(200)', comment: '软件用途' },
      { name: 'function_req', type: 'text', comment: '功能需求' },
      { name: 'apply_qty', type: 'int', def: 1, comment: '申请许可数' },
      { name: 'status', type: 'tinyint', def: 0, comment: '0草稿 1待审核 2通过 3驳回' },
      { name: 'audit_opinion', type: 'varchar(500)', comment: '审核意见' },
      { name: 'audit_by', type: 'bigint', def: 0, comment: '审核人' },
      { name: 'audit_time', type: 'datetime', comment: '审核时间' },
      { name: 'remark', type: 'varchar(200)', comment: '备注' }
    ]),
    indexes: [['dept_id'], ['status']]
  },

  // ============ 采购计划表（附件4）============
  {
    name: 'pur_plan',
    comment: '软件采购计划表（附件4，FR-06-02）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'plan_no', type: 'varchar(50)', notNull: true, comment: '计划编号' },
      { name: 'title', type: 'varchar(200)', comment: '计划标题' },
      { name: 'year', type: 'int', comment: '年度' },
      { name: 'dept_id', type: 'bigint', comment: '编制部门' },
      { name: 'applicant_id', type: 'bigint', comment: '编制人' },
      { name: 'items', type: 'text', comment: '计划明细(JSON数组：软件名称/版本/单价/许可数/合计/备注)' },
      { name: 'total_amount', type: 'decimal(14,2)', def: 0, comment: '合计金额' },
      { name: 'status', type: 'tinyint', def: 0, comment: '0草稿 1待审批 2通过 3驳回' },
      { name: 'audit_opinion', type: 'varchar(500)', comment: '审批意见' },
      { name: 'audit_by', type: 'bigint', def: 0, comment: '审批人' },
      { name: 'audit_time', type: 'datetime', comment: '审批时间' },
      { name: 'remark', type: 'varchar(200)', comment: '备注' }
    ]),
    indexes: [['status']]
  },

  // ============ 6.2.8 合同表 ============
  {
    name: 'pur_contract',
    comment: '采购合同表（FR-06-03）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'contract_no', type: 'varchar(50)', notNull: true, unique: true, comment: '合同编号' },
      { name: 'contract_name', type: 'varchar(200)', notNull: true, comment: '合同名称' },
      { name: 'supplier', type: 'varchar(100)', comment: '供应商' },
      { name: 'sign_date', type: 'date', comment: '签订日期' },
      { name: 'effective_date', type: 'date', comment: '生效日期' },
      { name: 'expire_date', type: 'date', comment: '到期日期' },
      { name: 'amount', type: 'decimal(14,2)', def: 0, comment: '合同金额' },
      { name: 'file_url', type: 'varchar(500)', comment: '合同扫描件' },
      { name: 'software_ids', type: 'varchar(500)', comment: '关联软件ID(JSON数组)' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ]),
    indexes: [['expire_date'], ['supplier']]
  },

  // ============ 6.2.9 授权表 ============
  {
    name: 'pur_entitlement',
    comment: '授权表（FR-07；serial_no/activation_code 加密存储）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'software_id', type: 'bigint', notNull: true, comment: '软件ID' },
      { name: 'contract_id', type: 'bigint', def: 0, comment: '关联合同ID' },
      { name: 'auth_type', type: 'varchar(50)', comment: '授权类型（场地/数量/订阅/永久/并发）' },
      { name: 'license_type', type: 'varchar(50)', comment: '许可类型' },
      { name: 'license_qty', type: 'int', def: 0, comment: '许可数量（场地授权按安装数统计）' },
      { name: 'purchase_date', type: 'date', comment: '采购时间' },
      { name: 'purchase_amount', type: 'decimal(14,2)', def: 0, comment: '采购金额' },
      { name: 'purchase_method', type: 'tinyint', def: 1, comment: '1采购 2受赠 3调剂' },
      { name: 'usable_version', type: 'varchar(100)', comment: '可使用版本' },
      { name: 'license_term', type: 'varchar(100)', comment: '许可期限' },
      { name: 'expire_date', type: 'date', comment: '到期日期（用于预警）' },
      { name: 'serial_no', type: 'varchar(500)', comment: '序列号（AES加密存储）' },
      { name: 'activation_code', type: 'varchar(500)', comment: '授权激活码（AES加密存储）' },
      { name: 'auth_file_url', type: 'varchar(500)', comment: '授权书文件' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ]),
    indexes: [['software_id'], ['contract_id'], ['expire_date']]
  },

  // ============ 6.2.10 管理员账号表 ============
  {
    name: 'pur_admin_account',
    comment: '管理员账号表（FR-07-03，密码AES加密存储）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'software_id', type: 'bigint', notNull: true, comment: '归属软件' },
      { name: 'account_name', type: 'varchar(100)', notNull: true, comment: '账号' },
      { name: 'account_pwd', type: 'varchar(500)', comment: '密码/密钥（AES加密）' },
      { name: 'holder_id', type: 'bigint', def: 0, comment: '保管人' },
      { name: 'holder_phone', type: 'varchar(30)', comment: '联系方式' },
      { name: 'permission_desc', type: 'varchar(200)', comment: '权限说明' },
      { name: 'change_date', type: 'date', comment: '变更日期' }
    ]),
    indexes: [['software_id']]
  },

  // ============ 6.2.11 许可分配表 ============
  {
    name: 'pur_license_alloc',
    comment: '许可分配表（FR-07-04）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'entitlement_id', type: 'bigint', notNull: true, comment: '授权ID' },
      { name: 'target_type', type: 'tinyint', notNull: true, comment: '1单位 2部门 3计算机 4人员' },
      { name: 'target_id', type: 'bigint', notNull: true, comment: '目标ID' },
      { name: 'target_name', type: 'varchar(100)', comment: '目标名称（冗余）' },
      { name: 'qty', type: 'int', def: 0, comment: '分配数量' },
      { name: 'downgrade_flag', type: 'tinyint', def: 0, comment: '是否降级使用' }
    ]),
    indexes: [['entitlement_id']]
  },

  // ============ 6.2.12 安装维护申请表 ============
  {
    name: 'flow_maint_apply',
    comment: '安装维护申请表（附件10，FR-08-01，核心闭环流程）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'apply_no', type: 'varchar(50)', notNull: true, comment: '申请单号' },
      { name: 'dept_id', type: 'bigint', notNull: true, comment: '申请部门' },
      { name: 'applicant_id', type: 'bigint', notNull: true, comment: '申请人' },
      { name: 'apply_time', type: 'datetime', comment: '申请时间' },
      { name: 'computer_id', type: 'bigint', notNull: true, comment: '计算机ID' },
      { name: 'apply_type', type: 'tinyint', notNull: true, comment: '1安装 2卸载 3升级' },
      { name: 'software_id', type: 'bigint', def: 0, comment: '软件ID（选填，来自软件资产库）' },
      { name: 'software_name', type: 'varchar(100)', notNull: true, comment: '软件名称' },
      { name: 'version', type: 'varchar(50)', comment: '软件版本' },
      { name: 'upgrade_from', type: 'varchar(200)', comment: '升级前软件/版本' },
      { name: 'upgrade_to', type: 'varchar(200)', comment: '升级后软件/版本' },
      { name: 'reason', type: 'varchar(500)', comment: '申请原因' },
      { name: 'status', type: 'tinyint', def: 0, comment: '0草稿 10待部门审核 20待信息化审核 30待执行 40待使用人确认 50已完成 60已驳回' },
      { name: 'current_node', type: 'varchar(50)', comment: '当前节点' },
      { name: 'finish_time', type: 'datetime', comment: '完成时间' }
    ]),
    indexes: [['apply_no'], ['applicant_id'], ['computer_id'], ['status'], ['dept_id']]
  },

  // ============ 6.2.13 审批表 ============
  {
    name: 'flow_approval',
    comment: '审批记录表（FR-08-02，全程留痕）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'apply_id', type: 'bigint', notNull: true, comment: '申请ID' },
      { name: 'node', type: 'varchar(50)', notNull: true, comment: '审批节点（部门负责人/信息化部门）' },
      { name: 'approver_id', type: 'bigint', notNull: true, comment: '审批人' },
      { name: 'result', type: 'tinyint', notNull: true, comment: '1通过 2驳回 3退回' },
      { name: 'opinion', type: 'varchar(500)', comment: '审批意见' },
      { name: 'approve_time', type: 'datetime', comment: '审批时间' }
    ]),
    indexes: [['apply_id']]
  },

  // ============ 6.2.14 安装确认单表 ============
  {
    name: 'flow_confirm',
    comment: '安装维护确认单表（附件11，FR-08-04）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'apply_id', type: 'bigint', notNull: true, comment: '申请ID' },
      { name: 'computer_id', type: 'bigint', notNull: true, comment: '计算机ID' },
      { name: 'op_type', type: 'tinyint', notNull: true, comment: '安装/卸载/升级' },
      { name: 'result', type: 'tinyint', def: 1, comment: '1完成 2未完成' },
      { name: 'user_sign', type: 'varchar(200)', comment: '使用人签名（电子签名文本）' },
      { name: 'user_sign_time', type: 'datetime', comment: '使用人确认时间' },
      { name: 'operator_sign', type: 'varchar(200)', comment: '安装维护人签名' },
      { name: 'operator_sign_time', type: 'datetime', comment: '维护人确认时间' }
    ]),
    indexes: [['apply_id'], ['computer_id']]
  },

  // ============ 6.2.15 督查核查 ============
  {
    name: 'ins_task',
    comment: '督查/自查任务表（FR-10-01）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'title', type: 'varchar(200)', notNull: true, comment: '任务标题' },
      { name: 'check_type', type: 'tinyint', def: 1, comment: '1自查 2现场督查' },
      { name: 'year', type: 'int', comment: '年度' },
      { name: 'org_id', type: 'bigint', def: 0, comment: '范围单位，0全部' },
      { name: 'start_date', type: 'date', comment: '开始日期' },
      { name: 'end_date', type: 'date', comment: '结束日期' },
      { name: 'status', type: 'tinyint', def: 1, comment: '1进行中 2已完成' },
      { name: 'remark', type: 'varchar(500)', comment: '备注' }
    ])
  },

  {
    name: 'ins_check',
    comment: '现场核查记录表（FR-10-02/03）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'task_id', type: 'bigint', notNull: true, comment: '督查任务ID' },
      { name: 'computer_id', type: 'bigint', notNull: true, comment: '计算机ID' },
      { name: 'checker_id', type: 'bigint', comment: '检查人' },
      { name: 'check_date', type: 'date', comment: '核查日期' },
      { name: 'result', type: 'tinyint', notNull: true, comment: '1相符 2不符 3未安装 4未登记' },
      { name: 'problem_desc', type: 'varchar(500)', comment: '问题描述' },
      { name: 'evidence_url', type: 'varchar(500)', comment: '照片证据' },
      { name: 'rectify_status', type: 'tinyint', def: 0, comment: '0无需整改 1待整改 2已整改' },
      { name: 'rectify_remark', type: 'varchar(500)', comment: '整改说明' }
    ]),
    indexes: [['task_id'], ['computer_id']]
  },

  // ============ 6.2.16 预警表 ============
  {
    name: 'biz_alert',
    comment: '预警表（FR-12：1到期 2超授权 3未登记 4未核查）',
    columns: cols([
      { name: 'tenant_id', type: 'bigint', def: 0, comment: '租户ID（0=平台）' },
      { name: 'alert_type', type: 'tinyint', notNull: true, comment: '1到期 2超授权 3未登记 4未核查' },
      { name: 'biz_type', type: 'varchar(30)', comment: '关联业务类型（entitlement/computer/software）' },
      { name: 'biz_id', type: 'bigint', def: 0, comment: '关联业务ID' },
      { name: 'level', type: 'tinyint', def: 2, comment: '预警级别：1高 2中 3低' },
      { name: 'content', type: 'varchar(500)', notNull: true, comment: '预警内容' },
      { name: 'org_id', type: 'bigint', def: 0, comment: '归属单位' },
      { name: 'status', type: 'tinyint', def: 0, comment: '0未处理 1处理中 2已处理' },
      { name: 'handler_id', type: 'bigint', def: 0, comment: '处理人' },
      { name: 'handle_time', type: 'datetime', comment: '处理时间' },
      { name: 'handle_remark', type: 'varchar(500)', comment: '处理说明' }
    ]),
    indexes: [['alert_type'], ['status'], ['org_id'], ['biz_type', 'biz_id']]
  }
]

export default tables
