# 终端 Agent 对接协议（Agent Protocol V1）

供终端管理/杀毒系统、自主采集 Agent 向平台上报终端信息与已安装软件清单（二期：自动发现方向，对应需求文档 4.6 接口需求与 10.1 二期第 1 项）。

## 接口定义

**POST** `/api/agent/report`
- 鉴权：请求头 `X-App-Key: <服务端配置的 AppKey>`（服务端环境变量 `AGENT_KEY`，开发默认 `gspm-agent-dev-key`；生产必须替换强随机值）
- 限流建议由网关/Nginx 实施（单 Agent 建议 ≥60s 间隔上报）

### 请求体

```json
{
  "computer_no": "PC-HQ-001",       // 必填，计算机编号（平台侧唯一键；不存在则自动建档）
  "org_code": "HQ",                 // 自动建档时的单位编码（缺省 HQ）
  "brand": "联想",                  // 选填，补全一机一档硬件信息
  "model": "ThinkPad T14",
  "sn": "SN-XXXX",
  "computer_type": 2,               // 1服务器 2台式机 3便携机
  "location": "信息楼201",
  "softwares": [                    // 必填，最多 500 条
    { "name": "WPS Office 专业版", "version": "2023" }
  ]
}
```

### 处理逻辑

1. 计算机编号已存在：补全 brand/model/sn；不存在：自动建档（取该单位首个部门，备注"终端 Agent 自动建档"）
2. 逐款软件按名称匹配软件资产库：
   - 命中且该机无安装记录 → 自动补登安装明细（`install_source=自动发现`）+ 安装维护日志
   - 未命中 → 生成**未登记软件预警**（FR-12-03，预警中心按类型"未登记"过滤查看），同一软件未处理预警去重
3. 事务内执行；返回 `{matched(命中款数), new_installed(新补登款数), unknown(未登记清单)}`

### 响应示例

```json
{ "code": 0, "message": "上报成功", "data": { "computer_no": "PC-HQ-001", "reported": 4, "matched": 3, "new_installed": 0, "unknown": [{ "name": "某未登记工具软件", "version": "1.2.3" }] } }
```

错误：`401 AppKey 无效`；`400 缺少必填字段 / 单位编码不存在`

## 平台自带采集 Agent

`server/scripts/agent-client.js`：

```bash
node scripts/agent-client.js                                # 演示模式（内置样例，含未登记软件触发预警）
node scripts/agent-client.js --real                         # 真实采集本机（Windows 注册表卸载列表）
node scripts/agent-client.js --computer-no PC-HFE-001 --org-code HFE --url http://<平台>:3000 --key <AppKey>
```

- 真实模式以 `reg query` 参数数组执行（无 shell 拼接）；非 Windows 环境请替换 `collectReal()` 为目标平台实现（Linux: dpkg/rpm；macOS: /Applications）
- 上报成功后，在预警中心（alertType=3）可查看"未登记软件"预警并在台账中补登
