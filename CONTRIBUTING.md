# 贡献指南（Contributing）

感谢关注 LiceTrust！欢迎以 Issue 反馈问题、以 Pull Request 提交改进。

提交即表示您同意按照项目的 [Apache License 2.0](LICENSE) 授权您的贡献。

## 开发环境

```bash
git clone <仓库地址>
cd <项目目录>

# 后端
cd server && npm install && npm run seed && npm start

# PC 管理端（新终端）
cd ../web && npm install && npm run dev

# 移动端（新终端）
cd ../mobile && npm install && npm run dev
```

## 提交前检查

1. **回归测试**：`cd server && npm run smoke && npm run test-suite` 全部通过
2. **构建检查**：`npm run build --prefix web && npm run build --prefix mobile` 零错误
3. **代码规范**：遵循 `docs/BACKEND-CONVENTIONS.md`（后端）与 `docs/FRONTEND-CONVENTIONS.md`（前端）
4. **SQL 安全**：业务代码禁止手写 SQL；新查询一律在 `scripts/query-defs/` 声明并由生成器产出
5. **多租户**：涉及新表的查询需验证租户隔离（平台通用层 tenant_id=0 与企业自有层的可见性规则）

## 分支与提交

- 分支命名：`feature/xxx`、`fix/xxx`、`docs/xxx`
- 提交信息遵循 Conventional Commits（如 `feat: 新增xx`、`fix: 修复xx`、`docs: 更新xx`）
- 一个 PR 聚焦一个主题

## 报告问题（Issue）

请包含：复现步骤、期望行为、实际行为、环境信息（OS/Node 版本/浏览器）、相关日志。
安全类漏洞请勿公开提交 Issue，见 README 安全说明。
