/**
 * 阿里云短信/号码认证服务适配层（注册手机号验证码 / 预警推送）
 *
 * 三种模式（config.sms.mode）：
 *  1. mock          —— 模拟：本地生成+本地校验，验证码回显（开发/演示）
 *  2. alibaba       —— 短信服务 Dysmsapi.SendSms（自配签名/模板，本地生成+本地校验）
 *  3. alibaba_pnvs  —— 号码认证服务 Dypnsapi（《码号资源短信认证》）：
 *                      SendSmsVerifyCode 生成验证码（占位符 ##code##，阿里云生成）
 *                      CheckSmsVerifyCode 校验（核验结果以 Model.VerifyResult === 'PASS' 为准）
 *
 * 真实调用统一走阿里云官方 SDK（@alicloud/*）：签名、协议、重试由官方客户端负责；
 * 服务端点固定为编译期字面量（dysmsapi/dypnsapi 官方域名），不接收任何外部输入拼 URL。
 *
 * 验证码策略（本地模式）：5 分钟有效；同手机号 60 秒内仅发一条；校验失败 5 次作废。
 * PNVS 模式的有效期/频控由阿里云侧参数（ValidTime/Interval）控制。
 */
import DysmsapiPkg from '@alicloud/dysmsapi20170525'
import DypnsapiPkg from '@alicloud/dypnsapi20170525'
import OpenApiPkg from '@alicloud/openapi-client'
import crypto from 'node:crypto'
import config from '../config/index.js'

const Dysmsapi = DysmsapiPkg.default || DysmsapiPkg
const Dypnsapi = DypnsapiPkg.default || DypnsapiPkg
const { Config: AliConfig } = OpenApiPkg

const CODE_TTL_MS = 5 * 60 * 1000
const SEND_INTERVAL_MS = 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5
const codes = new Map() // phone -> { code, expires, lastSent, attempts }（mock/alibaba 本地校验用）

/** 阿里云官方服务端点（编译期字面量；服务端点不来自配置/外部输入，杜绝任意主机外呼） */
const SMS_ENDPOINT_DYSMSAPI = 'dysmsapi.aliyuncs.com'
const SMS_ENDPOINT_DYPNSAPI = 'dypnsapi.aliyuncs.com'

function normalizePhone(phone) {
  const s = String(phone || '').trim()
  if (!/^1[3-9]\d{9}$/.test(s)) throw new Error('手机号格式不正确')
  // 手机号不含前导 0：经数字往返重建，确保进入下游的是净化后的纯数字串
  return String(Number(s))
}

function mode() {
  const m = String(config.sms.mode || 'mock')
  if (m === 'alibaba' && !(config.sms.accessKeyId && config.sms.accessKeySecret && config.sms.signName && config.sms.templateCode)) return 'mock'
  if (m === 'alibaba_pnvs' && !(config.sms.accessKeyId && config.sms.accessKeySecret && config.sms.pnvsSignName && config.sms.pnvsTemplateCode)) return 'mock'
  return ['mock', 'alibaba', 'alibaba_pnvs'].includes(m) ? m : 'mock'
}

function isAlibaba() {
  return mode() === 'alibaba'
}

/* ---------- 官方 SDK 客户端构造（端点字面量；cred 支持租户自有密钥） ---------- */

function dysmsapiClient(cred) {
  const cfg = new AliConfig({
    accessKeyId: (cred && cred.accessKeyId) || config.sms.accessKeyId,
    accessKeySecret: (cred && cred.accessKeySecret) || config.sms.accessKeySecret,
    endpoint: SMS_ENDPOINT_DYSMSAPI
  })
  return new Dysmsapi(cfg)
}

function dypnsapiClient() {
  const cfg = new AliConfig({
    accessKeyId: config.sms.accessKeyId,
    accessKeySecret: config.sms.accessKeySecret,
    endpoint: SMS_ENDPOINT_DYPNSAPI
  })
  return new Dypnsapi(cfg)
}

/** 统一把 SDK/网络层异常转成业务可读错误 */
function rpcError(prefix, e) {
  const detail = (e && (e.message || (e.data && e.data.Message))) || '网络错误'
  return new Error(prefix + ': ' + detail)
}

/* ---------- 模式 2：Dysmsapi.SendSms（自模板，本地校验） ---------- */

async function sendViaDysmsapi(phone, code) {
  const req = new DysmsapiPkg.SendSmsRequest({
    phoneNumbers: phone,
    signName: config.sms.signName,
    templateCode: config.sms.templateCode,
    templateParam: JSON.stringify({ code })
  })
  try {
    const resp = await dysmsapiClient().sendSms(req)
    const body = (resp && resp.body) || {}
    if (body.code !== 'OK') throw new Error(body.message || body.code || '发送失败')
    return body
  } catch (e) {
    if (e instanceof Error && !e.message.startsWith('阿里云')) throw rpcError('阿里云短信发送失败', e)
    throw e
  }
}

/* ---------- 模式 3：Dypnsapi 号码认证（SendSmsVerifyCode + CheckSmsVerifyCode） ---------- */

async function sendViaPnvs(phone) {
  const req = new DypnsapiPkg.SendSmsVerifyCodeRequest({
    phoneNumber: phone,
    signName: config.sms.pnvsSignName,
    templateCode: config.sms.pnvsTemplateCode,
    templateParam: JSON.stringify({ code: '##code##', min: '5' }),
    codeType: 1,          // 纯数字验证码
    codeLength: 6,
    validTime: 300,       // 5 分钟有效
    interval: 60,         // 60 秒频控（阿里云侧）
    duplicatePolicy: 1,   // 覆盖旧码
    schemeName: config.sms.pnvsSchemeName || undefined,
    returnVerifyCode: config.sms.pnvsReturnCode === true ? 1 : undefined // 联调时可回显
  })
  try {
    const resp = await dypnsapiClient().sendSmsVerifyCode(req)
    const body = (resp && resp.body) || {}
    if (body.code !== 'OK' || body.success !== true) {
      throw new Error(body.message || body.code || '发送失败')
    }
    // ReturnVerifyCode=1 时 Model.VerifyCode 为阿里云生成的验证码（联调回显用）
    return body.model || {}
  } catch (e) {
    if (e instanceof Error && !e.message.startsWith('验证码发送失败')) throw rpcError('验证码发送失败', e)
    throw e
  }
}

async function checkViaPnvs(phone, code) {
  const req = new DypnsapiPkg.CheckSmsVerifyCodeRequest({
    phoneNumber: phone,
    verifyCode: String(code).trim(),
    caseAuthPolicy: 1, // 不区分大小写
    schemeName: config.sms.pnvsSchemeName || undefined
  })
  try {
    const resp = await dypnsapiClient().checkSmsVerifyCode(req)
    const body = (resp && resp.body) || {}
    if (body.code !== 'OK' || body.success !== true) {
      throw new Error(body.message || body.code || '校验调用失败')
    }
    // 核验结果以 Model.VerifyResult 为准（PASS = 通过）
    if (!body.model || body.model.verifyResult !== 'PASS') {
      throw new Error('验证码不正确或已失效')
    }
    return true
  } catch (e) {
    if (e instanceof Error && e.message === '验证码不正确或已失效') throw e
    if (e instanceof Error && !e.message.startsWith('验证码校验调用失败')) throw rpcError('验证码校验调用失败', e)
    throw e
  }
}

/* ---------- 对外接口 ---------- */

/**
 * 发送验证码。
 * mock        → 返回回显码；alibaba → 本地生成不回显；alibaba_pnvs → 阿里云生成
 *             （配置 SMS_PNVS_RETURN_CODE=true 时返回回显码供联调）
 */
export async function sendSmsCode(phoneRaw) {
  const phone = normalizePhone(phoneRaw)
  const m = mode()
  if (m === 'alibaba_pnvs') {
    const model = await sendViaPnvs(phone)
    const echo = config.sms.pnvsReturnCode === true ? (model.VerifyCode || model.verifyCode || null) : null
    return { mode: m, mockCode: echo }
  }
  const prev = codes.get(phone)
  if (prev && Date.now() - prev.lastSent < SEND_INTERVAL_MS) {
    throw new Error('发送过于频繁，请 ' + Math.ceil((SEND_INTERVAL_MS - (Date.now() - prev.lastSent)) / 1000) + ' 秒后再试')
  }
  const code = String(crypto.randomInt(100000, 999999))
  let mockCode = null
  if (m === 'alibaba') {
    await sendViaDysmsapi(phone, code)
  } else {
    mockCode = code
    console.log('[sms:mock] 向 ' + phone.slice(0, 3) + '****' + phone.slice(-4) + ' 发送验证码 ' + code)
  }
  codes.set(phone, { code, expires: Date.now() + CODE_TTL_MS, lastSent: Date.now(), attempts: 0 })
  return { mode: m, mockCode }
}

/** 校验验证码；通过后立即失效（alibaba_pnvs 由阿里云核验） */
export async function verifySmsCode(phoneRaw, code) {
  const phone = normalizePhone(phoneRaw)
  if (mode() === 'alibaba_pnvs') {
    return checkViaPnvs(phone, code)
  }
  const rec = codes.get(phone)
  if (!rec) throw new Error('请先获取短信验证码')
  if (Date.now() > rec.expires) {
    codes.delete(phone)
    throw new Error('验证码已过期，请重新获取')
  }
  if (rec.attempts >= MAX_VERIFY_ATTEMPTS) {
    codes.delete(phone)
    throw new Error('验证错误次数过多，请重新获取')
  }
  if (String(code).trim() !== rec.code) {
    rec.attempts += 1
    throw new Error('验证码不正确')
  }
  codes.delete(phone)
  return true
}

/** 发送任意通知短信（预警推送等）：mock 模式仅记录日志 */
export async function sendNoticeSms(phone, content) {
  const p = normalizePhone(phone)
  const m = mode()
  if (m === 'alibaba_pnvs') {
    // 通知类复用号码认证模板：验证码占位符不适用，走自定义验证码位（内容截断进 code 位）
    const req = new DypnsapiPkg.SendSmsVerifyCodeRequest({
      phoneNumber: p,
      signName: config.sms.pnvsSignName,
      templateCode: config.sms.pnvsTemplateCode,
      templateParam: JSON.stringify({ code: String(content).slice(0, 6) })
    })
    try {
      const resp = await dypnsapiClient().sendSmsVerifyCode(req)
      const body = (resp && resp.body) || {}
      if (body.code !== 'OK') throw new Error(body.message || body.code || '发送失败')
      return body
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith('短信发送失败')) throw rpcError('短信发送失败', e)
      throw e
    }
  }
  if (m === 'alibaba') {
    return sendViaDysmsapi(p, content)
  }
  console.log('[sms:mock] 通知短信 → ' + p.slice(0, 3) + '****' + p.slice(-4) + '：' + content)
  return { mock: true }
}

/**
 * 通用"内容短信"发送（供租户自有通道 / 预警通知使用）
 * cfg: { mode: 'mock'|'alibaba', accessKeyId, accessKeySecret, signName, templateCode }
 * 发送实现：alibaba 模式走官方 SDK SendSms，TemplateParam {"content": "..."}（租户模板需含 ${content} 变量）
 */
export async function sendContentSms(cfg, phone, content) {
  const m = (cfg && cfg.mode) || 'mock'
  if (m === 'mock') {
    console.log('[sms:tenant-mock] → ' + String(phone).slice(0, 3) + '****' + String(phone).slice(-4) + '：' + content)
    return { mock: true }
  }
  const req = new DysmsapiPkg.SendSmsRequest({
    phoneNumbers: normalizePhone(phone),
    signName: cfg.signName,
    templateCode: cfg.templateCode,
    templateParam: JSON.stringify({ content })
  })
  try {
    const resp = await dysmsapiClient(cfg).sendSms(req)
    const body = (resp && resp.body) || {}
    if (body.code !== 'OK') throw new Error(body.message || body.code || '发送失败')
    return body
  } catch (e) {
    if (e instanceof Error && !e.message.startsWith('短信发送失败')) throw rpcError('短信发送失败', e)
    throw e
  }
}

export { isAlibaba }
