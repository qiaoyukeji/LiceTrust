# licetrust-miniapp（小程序版，预留骨架）

正版软件管理平台的小程序版本，当前为**预留骨架**（不含可运行构建），业务一期尚未实现。

## 定位

- 复用与 PC 端（web/）、移动端（mobile/）**同一套后端 API**（`/api` 下，Bearer token 认证）。
- 复用 mobile 的业务逻辑与页面结构，仅将 Vant 组件替换为 uni-app 内置组件（view/button/picker 等）。
- 各 stub 页头部注释标注了对应的 mobile 页面路径与所用接口，二期按注释逐页实现即可。

## 接入方式

方式一：HBuilderX 直接打开本目录（或导入 src/），选择 uni-app(vue3) 工程运行到微信开发者工具。

方式二：uni-app CLI：

```bash
npx degit dcloudio/uni-preset-vue#vite licetrust-miniapp-cli
# 将本目录 src/ 覆盖到 CLI 工程 src/，再安装依赖后 npm run dev:mp-weixin
```

## 二期接入要点

1. **微信单点登录**：`wx.login` 取 code → 后端换取 token（后端需新增如 `POST /api/auth/wx-login` 接口），token 仍存 `licetrust_token`，其余请求头与拦截逻辑与 mobile 的 `src/api/request.js` 保持一致。
2. **扫码核查**：督查场景使用 `uni.scanCode` 扫计算机编号二维码 → `GET /api/computers?kw=编号` 定位台账，再调 `POST /api/inspections/:taskId/checks` 提交核查结果。
3. 枚举映射直接照搬 mobile 的 `src/constants.js`（见 docs/FRONTEND-CONVENTIONS.md §4）。

## 目录

```
miniapp/
  README.md            本说明
  src/
    manifest.json      uni-app 应用配置（appid 占位）
    pages.json         页面注册 + tabBar（五页）
    App.vue            应用入口（onLaunch 占位提示）
    uni.scss           uni-app 全局样式变量
    pages/
      login/login.vue       登录页 stub（对应 mobile Login.vue）
      index/index.vue       工作台 stub（对应 mobile Home.vue）
      computers/computers.vue  我的电脑 stub（对应 mobile MyComputers.vue / ComputerDetail.vue）
      apply/apply.vue       申请 stub（对应 mobile MyApplies.vue）
      todo/todo.vue         待办 stub（对应 mobile TodoList.vue）
      mine/mine.vue         我的 stub（对应 mobile Mine.vue）
```
