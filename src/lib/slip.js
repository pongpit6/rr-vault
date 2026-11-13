/**
 * Reads Thai bank transfer slips, tuned for K PLUS.
 *
 * Two sources are combined:
 *  1. The slip-verification QR (bottom right). It holds the bank code and the transaction
 *     reference. For K PLUS the reference also encodes the date and time
 *     (016 317 120300 BQR02977 → year …6, day 317, 12:03:00), so date/time/ref never depend on OCR.
 *  2. OCR text of the slip for the amount and the receiver's name.
 */
const TH_M = [/ม\.?\s?ค/, /ก\.?\s?พ/, /มี\.?\s?ค/, /เม\.?\s?ย/, /พ\.?\s?ค/, /มิ\.?\s?ย/, /ก\.?\s?ค/, /ส\.?\s?ค/, /ก\.?\s?ย/, /ต\.?\s?ค/, /พ\.?\s?ย/, /ธ\.?\s?ค/]
const TH_MONTH_RE = /(\d{1,2})\s*(ม\.?\s?ค|ก\.?\s?พ|มี\.?\s?ค|เม\.?\s?ย|พ\.?\s?ค|มิ\.?\s?ย|ก\.?\s?ค|ส\.?\s?ค|ก\.?\s?ย|ต\.?\s?ค|พ\.?\s?ย|ธ\.?\s?ค)\.?\s*(\d{2,4})(?:\D{0,6}?(\d{1,2})[:.](\d{2}))?/
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const EN_RE = /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*(\d{2,4})(?:\D{0,6}?(\d{1,2})[:.](\d{2}))?/i
const NUM_RE = /(\d{1,3}(?:,\d{3})+(?:\.\d{2})|\d+\.\d{2})/g
const AMOUNT_LABEL = /จ\s?[ำํ]\s?า?\s?น\s?ว\s?น|amount|ยอดโอน|ยอดชำระ|ยอดเงิน(?!คงเหลือ)/i
const SKIP_LABEL = /ค่?า?ธ\s?ร\s?ร\s?ม\s?เ?\s?น|fee|คงเหลือ|balance|วงเงิน|available/i
const ACCOUNT_LINE = /[xX×]{2,}[-\s]?[xX×\d][-\s]?[xX×\d]{2,}|\d{3}-\d-\d{5}-\d/
const BANK_LINE = /^\W*ธ\.|ธนาคาร|พร้อมเพย์|promptpay|e-?wallet/i
const PREFIX = /^(นาย|นาง(?:สาว)?|น\.ส\.|ด\.ช\.|ด\.ญ\.|บจก\.?|บริษัท|หจก\.?|ร้าน|mr\.?|mrs\.?|ms\.?|miss)\s*/i
const BANK_CODES = { '002': 'Bangkok Bank', '004': 'KBank', '006': 'Krungthai', '011': 'ttb', '014': 'SCB', '025': 'Krungsri', '030': 'GSB', '069': 'KKP', '073': 'LH Bank' }

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function toYear(y) {
  y = Number(y)
  if (y < 100) y += y > 40 ? 2500 : 2000 // 69 → 2569 (BE), 26 → 2026
  if (y > 2400) y -= 543
  return y
}
export function findDate(line) {
  let m = line.match(TH_MONTH_RE)
  if (m) {
    const mi = TH_M.findIndex((re) => re.test(m[2]))
    return { date: `${toYear(m[3])}-${pad(mi + 1)}-${pad(m[1])}`, time: m[4] ? `${pad(m[4])}:${m[5]}` : null }
  }
  m = line.match(EN_RE)
  if (m) return { date: `${toYear(m[3])}-${pad(EN_MONTHS.indexOf(m[2].toLowerCase().slice(0, 3)) + 1)}-${pad(m[1])}`, time: m[4] ? `${pad(m[4])}:${m[5]}` : null }
  m = line.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\D{0,6}?(\d{1,2})[:.](\d{2}))?/)
  if (m && Number(m[2]) <= 12) return { date: `${toYear(m[3])}-${pad(m[2])}-${pad(m[1])}`, time: m[4] ? `${pad(m[4])}:${m[5]}` : null }
  return null
}

/** EMV-style tag/length/value reader. */
function tlv(s) {
  const out = {}
  for (let i = 0; i + 4 <= s.length;) {
    const tag = s.slice(i, i + 2), len = Number(s.slice(i + 2, i + 4))
    if (!Number.isFinite(len)) break
    out[tag] = s.slice(i + 4, i + 4 + len); i += 4 + len
  }
  return out
}

/**
 * Thai slip-verification QR → { bank, ref, date, time } (date/time only when the ref encodes them).
 * Payload looks like 0041 0006000001 0103004 0220<ref> 5102TH 9104<crc>.
 */
export function parseSlipQR(qr, now = new Date()) {
  if (!qr || !/^0041000600000101/.test(qr)) return null
  const top = tlv(qr)
  const inner = tlv(top['00'] || '')
  const ref = inner['02']
  if (!ref || ref.length < 10) return null
  const bankCode = inner['01']
  const res = { bank: BANK_CODES[bankCode] || null, bankCode, ref, date: null, time: null }
  // K PLUS: 01 Y DDD HHMMSS AAA NNNNN
  const m = bankCode === '004' && ref.match(/^\d{2}(\d)(\d{3})(\d{2})(\d{2})(\d{2})[A-Z]{3}\d+$/)
  if (m) {
    const [, yd, doy, hh, mm] = m
    if (+doy >= 1 && +doy <= 366 && +hh < 24 && +mm < 60) {
      // the year whose last digit is yd, nearest to today and not in the future
      let y = now.getFullYear() - ((now.getFullYear() - Number(yd) + 10) % 10)
      const d = new Date(y, 0, Number(doy))
      if (d - now > 2 * 86400000) d.setFullYear(y - 10)
      res.date = iso(d); res.time = `${hh}:${mm}`
      res.type = ref.slice(12, 15) // BQR = scan QR, BPM = bill payment, other = transfer
    }
  }
  return res
}

const num = (s) => Number(s.replace(/,/g, ''))
/** OCR lines carry junk from logos ("(I)  BITKUB ONLINE") — keep the longest run of words. */
const nameOf = (l) => l.split(/\s{2,}|\s[|!]\s?/).map((s) => s.replace(/^[^ก-๙A-Za-z0-9]+|[^ก-๙A-Za-z0-9.)]+$/g, '').trim())
  .filter((s) => s.length >= 2).sort((a, b) => b.length - a.length)[0] || ''

/** Parses the OCR text of one slip. Returns null when no amount is found. */
export function parseSlipText(raw, ownerName = '', qrInfo = null) {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const text = lines.join('\n')

  // amount: number on the "จำนวน" line or one of the next two lines
  let amount = null
  for (let i = 0; i < lines.length && amount == null; i++) {
    if (!AMOUNT_LABEL.test(lines[i]) || SKIP_LABEL.test(lines[i])) continue
    for (let j = i; j <= i + 2 && j < lines.length; j++) {
      if (j > i && SKIP_LABEL.test(lines[j])) break
      const m = lines[j].match(NUM_RE)
      if (m) { amount = num(m[0]); break }
    }
  }
  if (amount == null) { // fallback: largest x.xx not on a fee/balance line
    for (const l of lines) {
      if (SKIP_LABEL.test(l)) continue
      for (const m of l.matchAll(NUM_RE)) { const v = num(m[1]); if (v > 0 && (!amount || v > amount)) amount = v }
    }
  }
  if (!amount) return null

  // parties: [name] [ธ.bank] [xxx-x-x1234-x] for sender, then the receiver block
  const accIdx = lines.map((l, i) => (ACCOUNT_LINE.test(l) ? i : -1)).filter((i) => i >= 0)
  const bankIdx = lines.findIndex((l) => BANK_LINE.test(l))
  let sender = '', receiver = '', receiverDetail = ''
  if (bankIdx > 0) sender = nameOf(lines[bankIdx - 1])
  const afterSender = accIdx.length ? accIdx[0] + 1 : bankIdx >= 0 ? bankIdx + 1 : -1
  if (afterSender > 0) {
    for (let i = afterSender; i < lines.length; i++) {
      if (AMOUNT_LABEL.test(lines[i])) break
      const n = nameOf(lines[i])
      if (!n || /^\d+$/.test(n.replace(/\s/g, '')) || BANK_LINE.test(lines[i]) || ACCOUNT_LINE.test(lines[i])) { if (receiver) break; continue }
      if (!receiver) receiver = n
      else if (!receiverDetail && PREFIX.test(n)) receiverDetail = n
    }
  }
  if (!receiver) { // other banks: last name-like line before the amount
    const names = lines.map(nameOf).filter((l) => PREFIX.test(l) && l.length < 60 && !/\d{3,}/.test(l))
    receiver = names.length > 1 ? names[names.length - 1] : ''
    if (!sender && names.length) sender = names[0]
  }

  const ownerWords = ownerName.split(/\s+/).filter((w) => w.length > 2)
  const isOwner = (s) => ownerWords.some((w) => s.includes(w))
  let direction = 'out'
  if (receiver && isOwner(receiver) && !isOwner(sender)) direction = 'in'
  else if (/รับเงิน|รับโอน|เงินเข้า|received/i.test(lines.slice(0, 3).join(' '))) direction = 'in'
  const counterparty = (direction === 'in' ? sender : receiver).replace(PREFIX, '').trim() || null

  const d = lines.map(findDate).find(Boolean)
  const refOcr = (text.match(/(?:เลขที่รายการ|รหัสอ้างอิง|เลขที่อ้างอิง|ref(?:erence)?(?:\s*no)?\.?)\s*[:：]?\s*([A-Za-z0-9]{8,})/i) || text.match(/\b(0\d{11}[A-Z0-9]{3}\d{5})\b/) || [])[1] || null
  const bankTxt = /กสิกร|kbank|k plus/i.test(text) ? 'KBank' : /ไทยพาณิชย์|scb/i.test(text) ? 'SCB' : /กรุงไทย|krungthai/i.test(text) ? 'Krungthai' : null
  const title = (lines.find((l) => /สำเร็จ|สําเร็จ|successful/i.test(l)) || '').replace(/^[^ก-๙A-Za-z]+/, '').split(/\s{2,}/)[0]

  return {
    amount,
    direction,
    counterparty,
    detail: receiverDetail ? receiverDetail.replace(PREFIX, '').trim() : null,
    title: title || null,
    bank: qrInfo?.bank || bankTxt,
    ref: qrInfo?.ref || refOcr,
    date: qrInfo?.date || d?.date || null,
    time: qrInfo?.time || d?.time || null,
    text,
  }
}

const EXCH_RE = /bitkub|บิทคับ|binance\s*th|orbix|upbit|THBDP/i
/** Is this OCR text a payment slip (not just any picture with numbers)? */
export const looksLikeSlip = (text) => /สำเร็จ|สําเร็จ|โอนเงิน|ชำระ|ชําระ|เลขที่รายการ|รหัสอ้างอิง|transfer|successful/i.test(text)

/** Top-up to a crypto exchange → money moves to the invest wallet, not an expense. */
export function exchangeOf(sl) {
  if (sl.direction === 'in') return null
  const s = `${sl.counterparty || ''} ${sl.text || ''}`
  if (!EXCH_RE.test(s)) return null
  return /binance/i.test(s) ? 'Binance TH' : /orbix/i.test(s) ? 'Orbix' : /upbit/i.test(s) ? 'Upbit' : 'Bitkub'
}

/** Kept for older inbox items. */
export function slipToP(sl) {
  const exchange = exchangeOf(sl)
  const time = sl.date ? `${sl.date}T${sl.time || '12:00'}:00` : null
  if (exchange) return { kind: 'exchange-in', exchange, amount: sl.amount, direction: 'transfer', bank: sl.bank, counterparty: exchange, time, date: sl.date, fromSlip: true }
  return { amount: sl.amount, direction: sl.direction, counterparty: sl.counterparty || null, bank: sl.bank, isCard: false, time, date: sl.date, ref: sl.ref, fromSlip: true }
}
