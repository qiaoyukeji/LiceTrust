# 前端编码规范（PC web / 移动 mobile / 小程序 miniapp）

## 0. 全局约定

- API 基础地址：`/api`（Vite dev proxy → http://localhost:3000；生产由 Nginx 反代）
- 认证：登录后 token 存 `localStorage.gspm_token`，Axios 请求头 `Authorization: Bearer <token>`
- 响应格式：`{ code: 0, message, data }`；code!==0 视为失败（message 为中文提示，ElMessage/Vant Toast 展示）
- 分页响应 data：`{ list, total, page, pageSize }`
- 401 → 清 token 跳登录页；403 → 提示"无操作权限"
- 用户信息（含 perms 权限点数组、roles、dataScope）存 Pinia store，登录后调 GET /auth/me 刷新

## 1. PC 管理端（web/）

技术栈：Vue 3.4+ / Vite 5 / Vue Router 4 / Pinia 2 / Element Plus 2.x / @element-plus/icons-vue / Axios / ECharts 5
目录：
```
web/
  package.json  vite.config.js  index.html
  src/main.js  src/App.vue
  src/api/request.js        # axios 实例（拦截器见下）
  src/api/<module>.js       # 每模块一个 api 文件
  src/stores/user.js        # 用户/权限 store
  src/router/index.js       # 路由 + 登录守卫 + 按 perms 过滤
  src/layout/AdminLayout.vue  # 左侧深色菜单 + 顶栏 + 主内容
  src/views/login/Login.vue
  src/views/dashboard/Workbench.vue
  src/views/<module>/*.vue
```

### 页面清单与路由（路径 / 权限点）
- /login 登录
- / 工作台 Workbench（dashboard）：指标卡片(GET /workbench/summary)、待办(GT /workbench/todos 四类)、预警(GET /workbench/alerts)、公告(GET /workbench/notices)、快捷入口
- /orgs 组织单位（org:view）树表页
- /depts 部门管理（dept:view）
- /users 用户管理（user:view）：列表/新增/编辑/重置密码/分配角色（GET /roles/all 下拉）
- /roles 角色管理（role:view）：权限点用 el-tree 多选（权限点清单见 §4）
- /dicts 数据字典（dict:view）/ /configs 系统参数（config:view）/ /notices 通知公告（notice:view）/ /audit-logs 审计日志（audit:view，只读）
- /computers 计算机台账（computer:view）列表页：kw/orgId/computerType/status 筛选；/computers/:id 一机一档详情页（Tabs：基本信息 / 已装软件（GET /computers/:id 的 installed）/ 维护时间轴（logs）el-timeline）
- /softwares 软件资产库（software:view）：列表含 install_count/license_qty 对账列与合规 Tag（超授权红/闲置灰/正常绿）
- /install-records 安装明细（install:view）
- /contracts 合同管理（contract:view）/ /entitlements 授权管理（entitlement:view）：行操作"查看激活码"→密码二次认证对话框→POST /entitlements/:id/reveal（adminaccount 同款）
- /license-allocs 许可分配（alloc:view）/ /free-softwares 免费软件清单（free:view）/ /leaders 领导小组（leader:view）
- /require-applies 需求申请（require:view）/ /plans 采购计划（plan:view，items 子表编辑）
- /maint-applies 流程中心（apply:view）：Tabs=我的申请/待部门审核(/pending/role1)/待信息化审核(/pending/role2)/待执行(/pending/execute)/待我确认(/pending/confirm)；详情抽屉显示审批轨迹（GET /maint-applies/:id）；操作按钮按 perms（apply:create 发起新申请对话框、approve1/2 审批、execute 执行、confirm 确认签名）
- /reports 报表中心（report:view）：GET /reports/templates 选模板 → GET /reports/preview/:type 表格预览 + topStats 统计区 → GET /reports/export/:type 下载（axios blob）
- /alerts 预警中心（alert:view）：列表 + "手动扫描"按钮(POST /alerts/scan) + 处理对话框(PUT /alerts/:id/handle)
- /inspections 督查管理（ins:view）：任务列表 + 核查记录（GET /inspections/by-task/:taskId）
- /stats 统计驾驶舱（stats:view）：ECharts 饼图(GET /stats/category 四类软件分布)、柱图(GET /stats/org-install)、折线(GET /stats/trend)、到期授权表(GET /stats/expiring)
- /profile 个人中心：改密（PUT /auth/password）

### 菜单渲染
路由 meta: { perms: ['computer:view'] }；AdminLayout 按 store.user.perms 过滤（含 '*' 全通过）。

### 列表页统一模式（重要：保持代码一致性）
```
el-card > 查询栏(el-form inline: kw输入 + 下拉 + 查询/重置按钮)
       > 工具栏(新增/导出等按 perms 显隐)
       > el-table(:data="list" v-loading border stripe)
       > el-pagination(total/page-size/current-page @current-change)
操作列：编辑/删除(el-popconfirm)/更多
表单统一用 el-dialog + el-form(label-width 100px, rules 必填校验)
日期显示用字符串截取（后端返回 'YYYY-MM-DD HH:mm:ss'）
枚举显示用映射常量（见 §4），Tag 类型：成功/警告/危险
```

### api/request.js 要点
```js
const service = axios.create({ baseURL: '/api', timeout: 30000 })
service.interceptors.request.use(cfg => { const t = localStorage.getItem('gspm_token'); if (t) cfg.headers.Authorization = 'Bearer ' + t; return cfg })
service.interceptors.response.use(resp => {
  const { code, message, data } = resp.data
  if (code !== 0) { ElMessage.error(message); return Promise.reject(new Error(message)) }
  return data
}, err => { if (err.response?.status === 401) { localStorage.removeItem('gspm_token'); location.href = '/login' } ElMessage.error(...); return Promise.reject(err) })
// 导出 get/post/put/del 快捷方法
```
导出下载专用：`service.get(url, { responseType: 'blob' })` 后用 URL.createObjectURL 触发下载（不要走通用拦截器，单独函数）。

## 2. 移动端 H5（mobile/）

技术栈：Vue 3 / Vite 5 / Vant 4 / Axios（无 Pinia，用简单 composable）
页面（路由 + Tabbar）：
- /login 登录（van-form）
- Tabbar 5 页：/home 工作台（指标简化卡片+待办列表+预警）、/computers 我的电脑（GET /computers?userId=我 → 由数据权限自动过滤，员工只看自己）、/applies 我的申请（GET /maint-applies/my + 发起申请 van-form：选电脑(GET /computers/options)/类型/软件名/原因）、/todos 待办（按 perms 呈现待审/待执行/待确认，调用对应接口 + 操作按钮）、/mine 我的（用户信息/修改密码/退出）
- /computers/:id 电脑详情（已装软件列表 van-list + 维护记录）
- /alerts 预警消息列表
交互要点：所有列表用 van-list 分页加载（total 判断 finished）；操作后 van-toast.success 刷新；确认签名=输入姓名文本（PUT /maint-applies/:id/confirm）。

## 3. 小程序（miniapp/，预留骨架）

uni-app 目录骨架（可在 HBuilderX 直接打开或配 CLI）：pages.json（login/index/computers/apply/todo/mine 六页注册）、manifest.json（appid 占位 "appid":""，vue 版本 3）、App.vue、uni.scss、pages/ 各页 stub（说明复用 mobile 同款 API）。README 说明：小程序版复用同一后端 API 与移动端业务逻辑，二期接入微信登录（wx.login → 后端换取 token）与扫码核查（uni.scanCode → GET /computers?kw=编号）。

## 4. 枚举映射（前后端共用，写进 src/constants.js）

```
软件分类 category: 1操作系统 2办公软件 3杀毒软件 4工业软件
软件类型 software_type: 1商业软件 2OEM软件 3免费软件
计算机类型 computer_type: 1服务器 2台式机 3便携机
计算机状态 status: 1在用 2闲置 3报废
许可/授权类型 auth_type: 场地授权/数量授权/订阅授权/永久授权/并发授权（字符串）
采购方式 purchase_method: 1采购 2受赠 3调剂
申请类型 apply_type: 1安装 2卸载 3升级
流程状态 status: 0草稿 10待部门审核 20待信息化审核 30待执行 40待使用人确认 50已完成 60已驳回
维护操作 op_type: 1安装 2卸载 3升级前卸载 4升级后安装
核查结果 ins result: 1相符 2不符 3未安装 4未登记
预警 alert_type: 1到期 2超授权 3未登记 4未核查；status: 0未处理 1处理中 2已处理；level: 1高 2中 3低
需求/计划 status: 0草稿 1待审核 2通过 3驳回
数据权限 dataScope: 1全部 2本单位 3本部门 4仅本人
租户 tenant_id: 0=平台运营方（可访问 /platform/* 与全局设置写操作），>0=企业租户
```

## 5. 构建验证

- web/ 与 mobile/ 各自 `npm install && npm run build` 必须零错误通过（vite build 严格校验 .vue 语法）
- 写完每个 .vue 文件后建议先 `npx vite build` 快速失败定位；注意 SFC 中 template 只能有一个根节点、中文引号不要出现在 JS 字符串外
- dev server：web 5173 / mobile 5174（vite.config server.port + proxy '/api' 与 '/uploads' → http://localhost:3000）

## 6. 关键 API 速查（全部在 /api 下，均需 Bearer token 除登录外）

```
POST /auth/login {username,password} → {token,user}    GET /auth/me    PUT /auth/password
GET  /workbench/summary | /workbench/todos | /workbench/alerts | /workbench/notices
GET  /orgs?kw&orgLevel&status&page&pageSize   GET /orgs/tree   POST /orgs  PUT/DELETE /orgs/:id
GET  /depts?kw&orgId   GET /depts/tree?orgId=   POST/PUT/DELETE /depts
GET  /users?kw&orgId&deptId&status   GET /users/:id   POST /users  PUT /users/:id  PUT /users/:id/password  DELETE /users/:id
GET  /roles /roles/all /roles/:id   POST /roles  PUT /roles/:id  DELETE /roles/:id
GET  /dicts?dictType=   GET /dicts/:type   POST/PUT/DELETE /dicts
GET  /configs   PUT /configs {items:[{config_key,config_value}]}
GET  /notices?kw&noticeType&status  GET /notices/:id  POST/PUT/DELETE /notices
GET  /audit-logs?kw&module&dateFrom&dateTo&page&pageSize （只读）
GET  /computers?kw&orgId&deptId&computerType&status  GET /computers/options  GET /computers/:id→{computer,installed,logs}
POST /computers  PUT /computers/:id  PUT /computers/:id/status  DELETE /computers/:id
GET  /softwares?kw&category&softwareType&status → 行含 install_count/license_qty  GET /softwares/options  GET /softwares/:id
POST/PUT/DELETE /softwares
GET  /install-records?kw&orgId&deptId&category&softwareType&dateFrom&dateTo
GET  /install-records/:computerId/installed  POST /install-records  POST /install-records/import  PUT/DELETE /install-records/:id
GET  /contracts?kw   GET /contracts/:id   POST/PUT/DELETE /contracts
GET  /entitlements?kw&softwareId&authType&expireBefore → 行含 install_count/compliance(ok|over|idle)
GET  /entitlements/:id   POST /entitlements  PUT /entitlements/:id  POST /entitlements/:id/reveal {password}  DELETE
GET  /admin-accounts   POST /admin-accounts   PUT /admin-accounts/:id   POST /admin-accounts/:id/reveal {password}   DELETE
GET  /license-allocs?entitlement_id=   POST   PUT/DELETE /license-allocs/:id
GET  /free-softwares   POST/PUT/DELETE   GET /leaders POST/PUT/DELETE /leaders
GET  /require-applies?kw&status   GET /:id   POST   PUT /:id   PUT /:id/audit {action,opinion}   DELETE /:id
GET  /plans?kw&status   GET /:id   POST   PUT /:id   PUT /:id/audit   DELETE /:id
GET  /maint-applies?kw&status&applyType&deptId   GET /maint-applies/my
GET  /maint-applies/pending/role1 | /pending/role2 | /pending/execute | /pending/confirm
GET  /maint-applies/:id → {apply, approvals, confirm, logs}
POST /maint-applies  PUT /:id  PUT /:id/submit  PUT /:id/approve {action:approve|reject,opinion}
PUT  /:id/execute   PUT /:id/confirm {userSign}   DELETE /:id(草稿)
GET  /reports/templates   GET /reports/preview/:type → {title,columns,rows,topStats?}   GET /reports/export/:type (blob)
GET  /alerts?alertType&status&level&kw   PUT /alerts/:id/handle {handle_remark}   POST /alerts/scan
GET  /inspections   POST /inspections   PUT /inspections/:id   PUT /inspections/:id/finish   DELETE
GET  /inspections/checks/by-task/:taskId   POST /inspections/checks {task_id,computer_id,result,...}  PUT /inspections/checks/:id/rectify  DELETE /inspections/checks/:id
GET  /stats/overview | /stats/category?orgId | /stats/org-install | /stats/trend | /stats/expiring | /stats/domestic
GET  /score → {total, grade, dims:[{key,name,max,score,detail}]}   GET /score 权限 stats:view
【平台管理（仅 tenant_id=0 调用）】
GET  /platform/tenants → 行含 stats{users,orgs,depts,computers,softwares,installs}
GET  /platform/tenants/:id → {tenant,orgs,depts,users}   PUT /platform/tenants/:id（资料代管）
PUT  /platform/tenants/:id/status {status:0|1}（停用后该企业用户登录与请求均被拒）
GET  /platform/overview | /platform/roles | /platform/users（平台视角跨租户）
POST /auth/sms/send {phone} → {mode, mock_code?}（mock/alibaba 模式回显验证码）
POST /auth/register {company_name, username, password, real_name, phone, sms_code}
POST /computers/:id/checkout {user_id,remark} | /:id/checkin {remark} | GET /:id/checkout-logs | GET /:id/qrcode → {qrcode(dataURL), url, computer_no}
GET  /tenant/profile | PUT /tenant/profile | GET /tenant/backup/export | POST /tenant/backup/import
GET  /tenant/attachment3/export | POST /tenant/attachment3/import (multipart file, xls/xlsx)
POST /uploads (multipart 'file') → {file_url}
GET  /platform/tenants → 行含 stats{users,orgs,depts,computers,softwares,installs}（仅 platform tenant_id=0）
GET  /platform/tenants/:id → {tenant,orgs,depts,users}   PUT /platform/tenants/:id（资料代管）
PUT  /platform/tenants/:id/status {status:0|1}（停用后该企业用户无法登录/请求）
GET  /platform/overview → {tenant_total,tenant_enabled,user_total,computer_total,software_total,install_total,license_total}
GET  /platform/roles | /platform/users（平台视角跨租户）
POST /auth/sms/send {phone} → {mode, mock_code?}（mock/alibaba 模式回显验证码）
POST /auth/register {company_name, username, password, real_name, phone, sms_code}
POST /computers/:id/checkout {user_id,remark} | /:id/checkin {remark} | GET /:id/checkout-logs | GET /:id/qrcode → {qrcode(dataURL), url, computer_no}
POST /uploads (multipart 'file') → {file_url}
```

字段命名：后端 snake_case（computer_no/real_name/license_qty），前端表格 prop 直接使用同名；请求体也用 snake_case。
