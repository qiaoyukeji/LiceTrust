# 同类软件功能对比与落地清单（Feature Comparison）

对比对象为 GitHub 主流开源 IT/软件资产管理系统（调研时间 2026-11-21）：
[Snipe-IT](https://github.com/snipe/snipe-it)、[GLPI](https://github.com/glpi-project/glpi)、
[Ralph（allegro）](https://github.com/allegro/ralph)、[OCS Inventory](https://github.com/OCSInventory-NG/OCSInventory-ocsreports)。
参考：[GitHub itam 主题](https://github.com/topics/itam)、[Top 8 Open Source ITAM](https://nocobase.com/blog/it-asset-management-software)、
[Snipe-IT 官网](https://snipeitapp.com)、[Snipe-IT 通知文档](https://snipe-it.readme.io/docs/notifications)。

## 1. 功能对比矩阵

| 功能 | Snipe-IT | GLPI | OCS | 本平台（改造前） | 本轮落地 |
|---|---|---|---|---|---|
| 资产台账（一物一档） | ✅ | ✅ | ✅ | ✅ 一机一档 | — |
| 软件安装明细与许可对账 | ✅ seat 跟踪 | ✅ 合规 | 部分 | ✅ 许可/安装对账+超授权预警 | — |
| **资产生命周期 领用/归还（check-out/in）** | ✅ 核心 | ✅ | 部分 | ❌ user_id 变更无留痕 | ✅ **新增**（领用/归还操作+历史） |
| **资产二维码标签 + 扫码查询** | ✅ 标签打印 | ✅ | ❌ | ❌ | ✅ **新增**（档案二维码+打印+移动端扫码） |
| 到期/低库存提醒 | ✅ 邮件 | ✅ 邮件 | ❌ | ✅ 站内预警 | ✅ **增强**（高等级预警短信推送，阿里云短信通道） |
| 审计轨迹（audit trail） | ✅ | ✅ | ❌ | ✅ 审计日志+督查核查 | — |
| CSV/Excel 导入导出 | ✅ CSV | ✅ | ✅ | ✅ 附件3 模板导出导入 | — |
| 自动资产清点（Agent） | ❌（需配合） | ✅ GLPI Agent | ✅ | ✅ 终端上报接口+采集脚本 | — |
| ITSM 工单 | ❌ | ✅ 核心 | ❌ | 流程闭环（安装审批）部分覆盖 | 二期评估 |
| 自定义字段 | ✅ | ✅ | ❌ | ❌（固定字段） | 二期评估（schema 演进成本较高） |
| 财务折旧核算 | 部分 | ✅ | ❌ | ❌（对接财务系统，设计文档 1.2 划归财务） | 不落地 |
| REST API | ✅ | ✅ | ✅ | ✅ 全 REST | — |
| 多租户 SaaS | ❌（单租户多站点） | 多实体/多租户有限 | ❌ | ✅ 企业自助注册+数据层强制隔离 | —（本平台强项） |
| 移动端录入/查询 | 第三方 App | ❌ | ❌ | ✅ 移动 H5（录入+查找） | — |

## 2. 本轮落地的 4 项功能

1. **领用/归还（生命周期）**：`asset_checkout_log` 表；档案页"领用/归还"操作自动变更使用人并留痕，维护时间轴合并展示（借鉴 Snipe-IT check-out/in）
2. **资产二维码标签**：档案详情页生成"资产标签"二维码（内容为档案 URL），支持打印贴标签；移动端"信息查找"页新增扫码直达档案（复用 BarcodeDetector 扫码组件，Snipe-IT 式移动查询）
3. **预警短信推送**：预警扫描产生的"高"等级预警自动向租户管理员手机发送短信（阿里云短信通道；无凭据环境为模拟记录），并预留 `alert_sms_enabled` 配置开关
4. **注册手机号绑定**：注册需填写手机号并完成短信验证码校验（阿里云 `Dysmsapi.SendSms`，V3 签名 `ACS3-HMAC-SHA256`；手机号唯一；开发环境无凭据时为模拟模式，验证码回显便于测试）

## 3. 暂不落地与理由

- ITSM 工单（GLPI 强项）：超出正版化台账范围，现流程闭环已覆盖安装场景；二期评估
- 自定义字段：需要 schema 动态化，改造收益/成本比低；二期评估
- 财务折旧：设计文档明确划归财务系统，通过接口对接

## 4. 阿里云短信对接说明

- 接口：`POST https://dysmsapi.aliyuncs.com`（Action=SendSms，Version=2017-05-25）
- 签名：V3 `ACS3-HMAC-SHA256`（Header：x-acs-action / x-acs-version / x-acs-date / x-acs-signature-nonce / x-acs-content-sha256；Authorization 组装见服务端实现）
- 必填：PhoneNumbers / SignName / TemplateCode / TemplateParam（JSON，含 `code` 变量）
- 成功判定：响应 `Code === 'OK'`；BizId 用于回执查询
- 环境变量：`SMS_MODE=alibaba|mock`、`SMS_ACCESS_KEY_ID`、`SMS_ACCESS_KEY_SECRET`、`SMS_SIGN_NAME`、`SMS_TEMPLATE_CODE`、`SMS_ENDPOINT`（默认 dysmsapi.aliyuncs.com）
- 限频策略：同手机号 60 秒内仅发一条；验证码 5 分钟有效、校验失败 5 次作废
