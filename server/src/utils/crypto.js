/**
 * 敏感信息加密工具（文档 9.2 数据安全）
 * AES-256-GCM（认证加密）：密钥由配置提供，随机 12 字节 IV，输出 base64(iv):base64(tag):base64(cipher)
 * 信创环境可替换为 SM4-GCM 等价实现（接口一致，见 README）
 */
import crypto from 'node:crypto'
import config from '../config/index.js'

const key = crypto.createHash('sha256').update(String(config.aesKey)).digest()

export function aesEncrypt(plain) {
  if (plain === undefined || plain === null || plain === '') return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return iv.toString('base64') + ':' + tag.toString('base64') + ':' + enc.toString('base64')
}

export function aesDecrypt(cipherText) {
  if (!cipherText) return ''
  const segs = String(cipherText).split(':')
  if (segs.length !== 3) return ''
  const iv = Buffer.from(segs[0], 'base64')
  const tag = Buffer.from(segs[1], 'base64')
  const data = Buffer.from(segs[2], 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

/** 脱敏展示：保留首尾少量字符 */
export function maskSecret(s) {
  const str = String(s || '')
  if (!str) return ''
  if (str.length <= 6) return str.slice(0, 1) + '******'
  return str.slice(0, 4) + '******' + str.slice(-2)
}
