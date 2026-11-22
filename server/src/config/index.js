import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')

const config = {
  version: '1.1.0',
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'licetrust-dev-secret-change-in-prod',
  jwtExpires: process.env.JWT_EXPIRES || '12h',
  // 敏感信息加密密钥：激活码、序列号、管理员账号密码（文档 9.2 数据安全）
  aesKey: process.env.AES_KEY || 'licetrust-dev-aes-key-change-in-prod',
  // 终端 Agent 上报 AppKey（二期：X-App-Key 头，生产请替换强随机值）
  agentKey: process.env.AGENT_KEY || 'licetrust-agent-dev-key',
  // 阿里云短信/号码认证（注册手机号验证码 / 预警推送）
  // SMS_MODE=mock（模拟，验证码回显）| alibaba（Dysmsapi.SendSms 自发+本地校验）
  //         | alibaba_pnvs（号码认证 Dypnsapi：SendSmsVerifyCode 生成 + CheckSmsVerifyCode 校验）
  sms: {
    mode: process.env.SMS_MODE || 'mock',
    accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
    signName: process.env.SMS_SIGN_NAME || '',
    templateCode: process.env.SMS_TEMPLATE_CODE || '',
    endpoint: process.env.SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
    // PNVS 号码认证（赠送签名/赠送模板，占位符 ##code## 由阿里云生成与校验）
    pnvsEndpoint: process.env.SMS_PNVS_ENDPOINT || 'dypnsapi.aliyuncs.com',
    pnvsSignName: process.env.SMS_PNVS_SIGN_NAME || '',
    pnvsTemplateCode: process.env.SMS_PNVS_TEMPLATE_CODE || '',
    pnvsSchemeName: process.env.SMS_PNVS_SCHEME_NAME || '',
    pnvsReturnCode: process.env.SMS_PNVS_RETURN_CODE === 'true'
  },
  db: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    sqlitePath: path.resolve(root, process.env.SQLITE_PATH || './data/licetrust.db'),
    mysql: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'licetrust'
    }
  },
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR || './data/uploads'),
  // 系统参数默认值（FR-15-06，可在 sys_config 中覆盖）
  defaults: {
    // 台账更新周期（天），呼应指南"至少每半年"
    ledgerRefreshDays: 180,
    // 授权到期预警提前天数（FR-12-01，逗号分隔分级）
    alertExpireDays: '90,60,30'
  }
}

export default config
