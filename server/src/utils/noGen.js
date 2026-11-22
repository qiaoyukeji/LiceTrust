/**
 * 业务编号生成（FR-05-02 / 附录A.3 软件编号规则 / 6.3 编号服务化）
 * 基于"含逻辑删除行"的全量编号扫描，保证编号永不复用（避免撞唯一索引）
 */
import { baseSoftware, assetComputer, flowMaintApply, purRequireApply, purPlan, purEntitlement } from '../db/dao/index.js'
import { asset, pur } from '../db/queries/index.js'

function padSeq(seq) {
  return String(seq).padStart(4, '0')
}

function parseSeq(no) {
  const m = String(no || '').match(/-(\d+)$/)
  return m ? Number(m[1]) : 0
}

/** 生成下一个编号：扫描含已删行的同前缀编号取最大序号+1（编号永不复用） */
async function nextNo(allFn, prefix, pad = 4) {
  const rows = await allFn({ prefix })
  let seq = 0
  for (const r of rows) {
    seq = Math.max(seq, parseSeq(r.no))
  }
  return prefix + String(seq + 1).padStart(pad, '0')
}

/* ---------- 软件编号规则（附录A.3）---------- */

function norm(v) {
  return String(v ?? '')
}

function ruleMatch(s, ent, p) {
  if (norm(s.software_name) !== norm(p.software_name)) return false
  if (p.software_type === 3) return true
  if (norm(s.version) !== norm(p.version)) return false
  if (p.software_type === 2) return true
  return (
    norm(s.usable_version) === norm(p.usable_version) &&
    norm(ent ? ent.purchase_date : null) === norm(p.purchase_date) &&
    norm(ent ? ent.purchase_amount : null) === norm(p.purchase_amount) &&
    norm(ent ? ent.license_type : null) === norm(p.license_type) &&
    norm(ent ? ent.license_qty : null) === norm(p.license_qty) &&
    norm(ent ? ent.license_term : null) === norm(p.license_term)
  )
}

export async function genSoftwareNo(payload) {
  const p = payload || {}
  // 命中规则则复用既有编号（名称/版本/采购要素组合相同）
  const cands = await baseSoftware.listAll({ software_type: p.software_type, software_name: p.software_name })
  for (const s of cands) {
    const ents = await purEntitlementOf(s.id)
    if (ruleMatch(s, ents[0], p)) return s.software_no
  }
  return nextNo(asset.softwareNos, 'RJ-')
}

async function purEntitlementOf(sid) {
  return purEntitlement.listAll({ software_id: sid })
}

export async function genComputerNo(orgCode) {
  return nextNo(asset.computerNos, 'PC-' + String(orgCode || 'HQ') + '-', 3)
}

export async function genApplyNo() {
  const d = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  const ymd = String(d.getFullYear()) + p2(d.getMonth() + 1) + p2(d.getDate())
  return nextNo(pur.applyNos, 'AP-' + ymd + '-')
}

export async function genRequireNo() {
  const d = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  const ymd = String(d.getFullYear()) + p2(d.getMonth() + 1) + p2(d.getDate())
  return nextNo(pur.requireNos, 'XQ-' + ymd + '-')
}

export async function genPlanNo() {
  const d = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  const ymd = String(d.getFullYear()) + p2(d.getMonth() + 1) + p2(d.getDate())
  return nextNo(pur.planNos, 'JH-' + ymd + '-')
}

/** 兼容导出：唯一性检查（含已删行） */
export async function softwareNoExists(no) {
  const rows = await asset.softwareNos({ prefix: no })
  return rows.length > 0
}

export async function computerNoExists(no) {
  const rows = await asset.computerNos({ prefix: no })
  return rows.length > 0
}

export async function applyNoExists(no) {
  const rows = await pur.applyNos({ prefix: no })
  return rows.length > 0
}

export async function requireNoExists(no) {
  const rows = await pur.requireNos({ prefix: no })
  return rows.length > 0
}

export async function planNoExists(no) {
  const rows = await pur.planNos({ prefix: no })
  return rows.length > 0
}
