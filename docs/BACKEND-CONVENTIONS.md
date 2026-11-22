# 后端编码规范（代理开发手册）

本项目数据访问层为 schema 驱动的代码生成（DAO + 查询模块），路由层**禁止手写 SQL**。
本手册是所有路由开发的唯一规范，先读 `server/src/routes/user.routes.js` 与 `computer.routes.js` 两个示范文件。

## 1. 数据访问（只准用这两类函数）

### DAO（单表 CRUD，`server/src/db/dao/index.js`）
导入方式：`import { sysOrg, sysDept, sysUser, ... } from '../db/dao/index.js'`
表名到 camelCase 导出名的映射：`sys_org`→`sysOrg`、`asset_computer`→`assetComputer`、`flow_maint_apply`→`flowMaintApply`、`pur_entitlement`→`purEntitlement`、`asset_install_record`→`assetInstallRecord`、`asset_maint_log`→`assetMantLog`（注意 asset_maint_log 的导出名是 `assetMaintLog`）、`biz_alert`→`bizAlert`、`pur_contract`→`purContract`、`pur_admin_account`→`purAdminAccount`、`pur_license_alloc`→`purLicenseAlloc`、`ins_task`→`insTask`、`ins_check`→`insCheck`、`sys_dict`→`sysDict`、`sys_config`→`sysConfig`、`sys_notice`→`sysNotice`、`sys_audit_log`→`sysAuditLog`、`pur_require_apply`→`purRequireApply`、`pur_plan`→`purPlan`、`base_software`→`baseSoftware`、`base_free_software`→`baseFreeSoftware`、`base_leader`→`baseLeader`、`flow_approval`→`flowApproval`、`flow_confirm`→`flowConfirm`、`sys_user_role`→`sysUserRole`、`sys_role`→`sysRole`

每表方法：`list(f, paging)` / `listAll(f)` / `count(f)` / `get(Number(id))` / `insert(data, ctx)` / `update(id, data, ctx)` / `remove(id, ctx)`（逻辑删除）
- `list` 过滤对象：键=列名（eq）、`_kw` 模糊（LIKE 该表 KW_COLS）、日期列支持 `xxx_from/xxx_to`
- `get()` 必须传 `Number(...)`：`await sysUser.get(Number(id))` —— 红线，不要用其他形态
- 单行获取也可用示范文件的 `oneOf(dao, Number(id))` 模式
- `insert` 返回 `{ insertId, changes }`；`update` 未传字段保持原值（字符串清空传 `''`）

### 查询模块（多表 JOIN，`server/src/db/queries/index.js`）
导出：`system`（userRows/userCount）、`asset`（computerRows/computerCount/computerInstalled/computerMaintLogs/softwareRows/softwareCount/installRows/installCount）、`pur`（entitlementRows/entitlementCount/alertRows/alertCount/statsCategory/statsTypeDist/statsOrgInstall/statsMonthlyTrend/statsOverview/flowStatusCounts/todoCounts）、`flow`（applyRows/applyCount）

需要新查询时：在 `server/scripts/query-defs/<module>.js` 追加声明式定义（name/sql/params），然后运行 `node scripts/gen-queries.js` 重新生成。**def 文件是纯数据（无执行），SQL 用反引号多行字面量，值一律 `?` 参数化，可选条件用 `(? IS NULL OR col = ?)`**

## 2. 安全红线（违反会被安全扫描拦截，务必遵守）

1. **路由/服务代码零 SQL**：不出现 SELECT/INSERT/UPDATE 等关键字；SQL 只存在于 query-defs 与生成文件
2. **`.get()` 只传 `Number(...)`**：`dao.get(Number(id))`
3. **不传字符串参数给 `.get()`**（SSRF 误报）
4. 文件名/路径：不接受用户输入拼路径；上传文件名随机化（见 upload.routes.js）
5. 密码/激活码等敏感字段：响应中脱敏或删除（`delete row.password_hash`；激活码 AES 加密存储，`utils/crypto.js` 的 aesEncrypt/aesDecrypt/maskSecret）

## 3. 路由模板

```js
import { Router } from 'express'
import { xxxDao } from '../db/dao/index.js'
import { ok, paged, ApiError, asyncH, pageInfo, requireFields, toInt } from '../utils/response.js'
import { requirePerm, scopeFilters } from '../middleware/rbac.js'

const router = Router()

// GET /api/xxx — 分页列表
router.get('/', requirePerm('xxx:view'), asyncH(async (req, res) => {
  const { page, pageSize } = pageInfo(req)
  const scope = scopeFilters(req.user, { org: 'orgId', dept: 'deptId', user: 'userId' }) // 按表字段挑选
  const f = { ...scope, kw: req.query.kw }
  // 显式查询参数转 int：if (req.query.orgId) f.orgId = toInt(req.query.orgId)
  const list = await xxxDao.list(f, { page, pageSize })
  const total = await xxxDao.count(f)
  paged(res, list, total, page, pageSize)
}))

// POST/PUT 前必填校验：requireFields(req.body, ['a','b'])
// DELETE 一律逻辑删除：await xxxDao.remove(id, req.user)
```

## 4. 权限点目录（requirePerm 用；ADMIN 拥有 *）

组织 org:view/edit | 部门 dept:view/edit | 用户 user:view/edit | 角色 role:view/edit | 字典 dict:view/edit | 参数 config:view/edit | 公告 notice:view/edit | 审计 audit:view | 计算机 computer:view/edit | 软件 software:view/edit | 安装明细 install:view/edit | 合同 contract:view/edit | 授权 entitlement:view/edit/secret | 管理员账号 adminaccount:view/edit | 许可分配 alloc:view/edit | 免费清单 free:view/edit | 领导小组 leader:view/edit | 需求申请 require:view/edit | 采购计划 plan:view/edit | 流程 apply:view/create/approve1/approve2/execute/confirm | 报表 report:view/export | 鄂警 alert:view/handle | 督查 ins:view/edit | 统计 stats:view

## 5. 状态枚举（前后端共用约定）

- flow_maint_apply.status：0草稿 10待部门审核 20待信息化审核 30待执行 40待使用人确认 50已完成 60已驳回
- flow_approval.result：1通过 2驳回
- asset_computer.status：1在用 2闲置 3报废；computer_type：1服务器 2台式机 3便携机
- base_software.category：1操作系统 2办公软件 3杀毒软件 4工业软件；software_type：1商业 2OEM 3免费
- pur_entitlement.purchase_method：1采购 2受赠 3调剂
- asset_maint_log.op_type：1安装 2卸载 3升级前卸载 4升级后安装
- ins_check.result：1相符 2不符 3未安装 4未登记；rectify_status：0无需整改 1待整改 2已整改
- biz_alert：alert_type 1到期 2超授权 3未登记 4未核查；status 0未处理 1处理中 2已处理；level 1高 2中 3低
- pur_require_apply.status：0草稿 1待审核 2通过 3驳回（pur_plan 同）

## 6. 响应与错误

- 成功：`ok(res, data)` / 分页 `paged(res, list, total, page, pageSize)`；成功提示 `ok(res, null, '提示文案')`
- 业务失败：`throw new ApiError('中文提示', 400)`；未登录 401、无权限 403
- 审计：写操作自动留痕（auditTrail 中间件），无需手工调用

## 7. 代码风格

- 文件保持 <200 行；写完必须 `node --check` 验证
- 注释用中文简体、写明需求编号（如 FR-07-05）
- 不引入新依赖（已有：express/bcryptjs/jsonwebtoken/exceljs/multer/cors/dotenv/mysql2）
- Excel 导出用 exceljs（见 Agent C 报表实现），下载响应头 Content-Type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
