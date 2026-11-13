/**
 * Reads Thai bank notification text (LINE / SMS / app) into { direction, amount, counterparty, bank, isCard }.
 * Heuristic on purpose: every captured item is confirmed by the user before it becomes a transaction.
 */
const NUM = /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g
const IN_RE = /เงินเข้า|รับโอน|รับเงิน|ฝากเงิน|โอนเข้า|เข้าบัญชี|ได้รับเงิน|คืนเงิน|refund|deposit|received|incoming|credited|money in/i
const OUT_RE = /เงินออก|โอนออก|โอนเงิน|โอนไป|ถอน|ชำระ|จ่าย|ใช้จ่าย|ซื้อ|หักบัญชี|ตัดบัญชี|ตัดเงิน|รูด|withdraw|paid|payment|purchase|spent|debited|transfer to|money out/i
const CARD_RE = /บัตรเครดิต|credit\s*card|บัตร\s*[x*•]*\s*\d{4}|card\s*(?:no\.?)?\s*[x*•]*\d{4}/i
const BAL_RE = /(คงเหลือ|ยอดคงเหลือ|ยอดเงินคงเหลือ|balance|avail|วงเงิน|available|ยอดใช้ได้)\s*[:：]?\s*$/i
const BANKS = [
  [/kbank|กสิกร|k\s?plus|kasikorn/i, 'KBank'], [/scb|ไทยพาณิชย์|scb\s?easy/i, 'SCB'], [/krungthai|กรุงไทย|ktb|next/i, 'Krungthai'],
  [/krungsri|กรุงศรี|kma|\bbay\b/i, 'Krungsri'], [/bangkok\s?bank|ธนาคารกรุงเทพ|bualuang|\bbbl\b/i, 'Bangkok Bank'], [/\bttb\b|ทีทีบี|ทหารไทย/i, 'ttb'],
  [/ออมสิน|\bgsb\b|mymo/i, 'GSB'], [/\buob\b/i, 'UOB'], [/\bkkp\b|เกียรตินาคิน/i, 'KKP'], [/ktc/i, 'KTC'], [/truemoney|ทรูมันนี่/i, 'TrueMoney'],
  [/make by kbank|make/i, 'MAKE'], [/line\s?bk/i, 'LINE BK'], [/shopee\s?pay/i, 'ShopeePay'],
]

const n = (x) => Number(String(x).replace(/,/g, ''))

/** Crypto exchange messages (Bitkub Connect): trades and THB deposits/withdrawals. */
function parseExchange(text) {
  const exch = /bitkub/i.test(text) ? 'Bitkub' : /binance\s*th/i.test(text) ? 'Binance TH' : /orbix|upbit|gulf\s*binance/i.test(text) ? 'Exchange' : null
  const time = text.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[+-]\d{2}:?\d{2}|Z)?)/)?.[1] || null
  const tr = text.match(/You\s+(Spent|Sold)\s*:?\s*([\d.,]+)\s*([A-Z]{2,10})[\s\S]*?(?:Price\s*:?\s*([\d.,]+)\s*([A-Z]{2,10})\s*\/\s*([A-Z]{2,10}))?[\s\S]*?You\s+Received\s*:?\s*([\d.,]+)\s*([A-Z]{2,10})/i)
  if (tr) {
    const [, , outAmt, outCcy, price, , , inAmt, inCcy] = tr
    const buy = /^(THB|USDT|USD)$/i.test(outCcy)
    const coin = (buy ? inCcy : outCcy).toUpperCase()
    const fiat = (buy ? outCcy : inCcy).toUpperCase()
    const qty = n(buy ? inAmt : outAmt), total = n(buy ? outAmt : inAmt)
    const pm = text.match(/Price\s*:?\s*([\d.,]+)\s*[A-Z]{2,10}\s*\/\s*[A-Z]{2,10}/i)
    const px = pm ? n(pm[1]) : price ? n(price) : null
    const fee = px ? Math.max(0, Math.round((buy ? total - px * qty : px * qty - total) * 100) / 100) : 0
    return { kind: 'trade', side: buy ? 'buy' : 'sell', coin, fiat, qty, total, price: px, fee, exchange: exch || 'Exchange', time, amount: total, direction: buy ? 'out' : 'in' }
  }
  const dep = text.match(/(ฝากเงิน(?:บาท)?|deposit)[^\d]{0,30}?([\d.,]+)\s*(THB|บาท)/i)
  if (dep && exch) return { kind: 'exchange-in', exchange: exch, amount: n(dep[2]), time, direction: 'transfer' }
  const wd = text.match(/(ถอนเงิน(?:บาท)?|withdraw(?:al)?)[^\d]{0,30}?([\d.,]+)\s*(THB|บาท)/i)
  if (wd && exch) return { kind: 'exchange-out', exchange: exch, amount: n(wd[2]), time, direction: 'transfer' }
  return null
}

export function parseNotification(raw = '') {
  const text = String(raw).replace(/\s+/g, ' ').trim()
  const ex = parseExchange(text)
  if (ex) return { ...ex, bank: ex.exchange, isCard: false, counterparty: ex.exchange, balance: null }
  const bank = BANKS.find(([re]) => re.test(text))?.[1] || null

  // pick the transaction amount: prefer a number next to บาท/THB/฿/จำนวน that isn't a balance, account no., date or time
  const cands = []
  let m
  NUM.lastIndex = 0
  while ((m = NUM.exec(text))) {
    const s = m.index, e = s + m[0].length
    const before = text.slice(Math.max(0, s - 18), s), after = text.slice(e, e + 6)
    const prev = text.slice(0, s)
    const signed = /(^|\s)[-−+]$/.test(prev)
    if ((!signed && /[x*•\-/:]$/i.test(prev)) || /^[x*•/:\-]\d/i.test(after) || /^\s*[:.]\d{2}/.test(after)) continue // acct / date / time
    const v = Number(m[0].replace(/,/g, ''))
    if (!(v > 0) || v > 1e9) continue
    const unit = /^\s*(บาท|thb|฿|บ\.)/i.test(after) || /(฿|thb|บาท)\s*$/i.test(before)
    const lead = /(จำนวน(เงิน)?|amount|ยอด(เงิน|ชำระ|โอน)?|โอน|ชำระ|จ่าย|ใช้จ่าย|ซื้อ|รับ|เข้า)\s*[:：]?\s*(฿|thb)?\s*$/i.test(before)
    const isBal = BAL_RE.test(before.replace(/(฿|thb)\s*$/i, ''))
    const hasDecimals = m[0].includes('.')
    cands.push({ v, score: (unit ? 3 : 0) + (lead ? 2 : 0) + (hasDecimals ? 1 : 0) + (signed ? 2 : 0) - (isBal ? 10 : 0), s, sign: signed ? prev.slice(-1) : null })
  }
  cands.sort((a, b) => b.score - a.score || a.s - b.s)
  const amount = cands[0] && cands[0].score > -5 ? cands[0].v : null
  const signHint = cands[0]?.sign ? (cands[0].sign === '+' ? 'in' : 'out') : null
  const balance = (() => { const b = text.match(/(คงเหลือ|balance|ยอดคงเหลือ)\s*[:：]?\s*(฿|thb)?\s*([0-9,]+(?:\.\d{1,2})?)/i); return b ? Number(b[3].replace(/,/g, '')) : null })()

  const inAt = text.search(IN_RE), outAt = text.search(OUT_RE)
  let direction = signHint
  if (!direction && inAt >= 0 && (outAt < 0 || inAt <= outAt)) direction = 'in'
  else if (!direction && outAt >= 0) direction = 'out'
  const isCard = CARD_RE.test(text)
  if (isCard && !direction) direction = 'out'

  // who: after ไปยัง / ให้ / ที่ / จาก / to / at / from
  let counterparty = null
  const cp = text.match(/(?:ไปยัง|ให้แก่|โอนให้|ถึง|ที่ร้าน|ร้าน|ที่|จาก|ผู้โอน|ผู้รับ|merchant|to|at|from)\s*[:：]?\s*([^|,\n]{2,40}?)(?=\s*(?:\||,|จำนวน|ยอด|คงเหลือ|เวลา|วันที่|บาท|thb|฿|\d{2}[/:]\d{2}|$))/i)
  if (cp) counterparty = cp[1].replace(/^(คุณ|นาย|นาง(สาว)?|mr\.?|ms\.?|mrs\.?)\s*/i, '').replace(/\s*(บัญชี|a\/c).*$/i, '').trim() || null
  if (counterparty && /^[x*•\d\s-]+$/i.test(counterparty)) counterparty = null

  return { amount, balance, direction, isCard, bank, counterparty }
}

/** Key used to remember the category/wallet chosen for a counterparty. */
export const learnKey = (p) => (p?.counterparty ? p.counterparty.toLowerCase().replace(/[0-9x*•.\-_/]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30) : null)

export async function makeToken() {
  const b = crypto.getRandomValues(new Uint8Array(24))
  const token = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  const hash = Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join('')
  return { token, hash }
}
