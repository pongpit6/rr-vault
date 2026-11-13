const fmt2 = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt0 = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 })

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export function money(n, { decimals = true, sign = false } = {}) {
  const v = round2(n)
  const s = (decimals ? fmt2 : fmt0).format(Math.abs(v))
  const pre = v < 0 ? '-' : sign && v > 0 ? '+' : ''
  return `${pre}฿${s}`
}

export function compact(n) {
  const v = Math.abs(n)
  const sgn = n < 0 ? '-' : ''
  if (v >= 1e6) return `${sgn}฿${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M`
  if (v >= 1e4) return `${sgn}฿${(v / 1e3).toFixed(1)}K`
  return money(n, { decimals: false })
}

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const monthKey = (iso) => iso.slice(0, 7)

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TH_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const TH_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export function dateLabel(iso) {
  const t = todayISO()
  const y = new Date(); y.setDate(y.getDate() - 1)
  const yIso = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
  const [Y, M, D] = iso.split('-').map(Number)
  const d = new Date(Y, M - 1, D)
  const base = `${TH_DAYS[d.getDay()]} ${D} ${TH_MONTHS[M - 1]}`
  if (iso === t) return `วันนี้ · ${base}`
  if (iso === yIso) return `เมื่อวาน · ${base}`
  return Y === new Date().getFullYear() ? base : `${base} ${Y + 543}`
}
export function shortDate(iso) {
  const [, M, D] = iso.split('-').map(Number)
  return `${D} ${TH_MONTHS[M - 1]}`
}
export function monthLabel(key) {
  const [Y, M] = key.split('-').map(Number)
  return `${TH_MONTHS_FULL[M - 1]} ${Y + 543}`
}
export function shiftMonth(key, delta) {
  const [Y, M] = key.split('-').map(Number)
  const d = new Date(Y, M - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'ราตรีสวัสดิ์'
  if (h < 12) return 'สวัสดีตอนเช้า'
  if (h < 17) return 'สวัสดีตอนบ่าย'
  return 'สวัสดีตอนเย็น'
}

/** Evaluate a simple calculator expression like "120+35*2". Returns NaN if invalid. */
export function evalAmount(str, dp = 2) {
  const s = String(str ?? '').replace(/,/g, '').replace(/[x×]/g, '*').replace(/÷/g, '/').trim()
  if (!s) return NaN
  if (!/^[0-9+\-*/.() ]+$/.test(s)) return NaN
  try {
    // eslint-disable-next-line no-new-func
    const v = Function(`"use strict";return (${s})`)()
    return Number.isFinite(v) ? (dp === 2 ? round2(v) : Math.round(v * 10 ** dp) / 10 ** dp) : NaN
  } catch { return NaN }
}

export const uid = (p = '') => p + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
