/**
 * Reads OCR text of Thai bank slips and LINE/app notification screenshots.
 * One image can hold several transactions (a screenshot of a LINE chat), so the text is
 * split into blocks around each date line.
 */
const TH_M = [/ม\.?\s?ค/, /ก\.?\s?พ/, /มี\.?\s?ค/, /เม\.?\s?ย/, /พ\.?\s?ค/, /มิ\.?\s?ย/, /ก\.?\s?ค/, /ส\.?\s?ค/, /ก\.?\s?ย/, /ต\.?\s?ค/, /พ\.?\s?ย/, /ธ\.?\s?ค/]
const TH_MONTH_RE = /(\d{1,2})\s*(ม\.?\s?ค|ก\.?\s?พ|มี\.?\s?ค|เม\.?\s?ย|พ\.?\s?ค|มิ\.?\s?ย|ก\.?\s?ค|ส\.?\s?ค|ก\.?\s?ย|ต\.?\s?ค|พ\.?\s?ย|ธ\.?\s?ค)\.?\s*(\d{2,4})(?:\D{0,6}?(\d{1,2})[:.](\d{2}))?/
const EN_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const EN_RE = /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*(\d{2,4})(?:\D{0,6}?(\d{1,2})[:.](\d{2}))?/i
const NUM_RE = /(\d{1,3}(?:,\d{3})+(?:\.\d{2})|\d+\.\d{2})/g
const AMOUNT_LABEL = /จ\s?[ำํ]\s?า?\s?น\s?ว\s?น|amount|ยอดโอน|ยอดชำระ|ยอดเงิน(?!คงเหลือ)/i
const SKIP_LABEL = /ค่าธรรมเนียม|fee|คงเหลือ|balance|วงเงิน|available/i
const PREFIX = /^(นาย|นาง(?:สาว)?|น\.ส\.|ด\.ช\.|ด\.ญ\.|บจก\.?|บริษัท|หจก\.?|ร้าน|mr\.?|mrs\.?|ms\.?|miss)\s*/i

const pad = (n) => String(n).padStart(2, '0')
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

const num = (s) => Number(s.replace(/,/g, ''))
const clean = (s) => s.replace(/[|_~`'"“”]+/g, ' ').replace(/\s+/g, ' ').trim()

function parseBlock(lines, ownerWords) {
  const text = lines.join('\n')
  let amount = null, sign = null
  // 1) number on an "amount" line
  for (const l of lines) {
    if (!AMOUNT_LABEL.test(l) || SKIP_LABEL.test(l)) continue
    const m = [...l.matchAll(NUM_RE)]
    if (m.length) { amount = num(m[0][1]); const pre = l.slice(0, m[0].index); if (/[-−]\s*$/.test(pre)) sign = 'out'; if (/\+\s*$/.test(pre)) sign = 'in'; break }
  }
  // 2) largest "xx.xx บาท" that isn't a fee/balance
  if (amount == null) {
    let best = null
    for (const l of lines) {
      if (SKIP_LABEL.test(l)) continue
      for (const m of l.matchAll(NUM_RE)) if (/^\s*(บาท|thb|฿)/i.test(l.slice(m.index + m[0].length)) || /฿\s*$/.test(l.slice(0, m.index))) { const v = num(m[1]); if (!best || v > best) best = v }
    }
    amount = best
  }
  const feeLine = lines.find((l) => /ค่าธรรมเนียม|fee/i.test(l))
  const fee = feeLine ? num((feeLine.match(NUM_RE) || ['0'])[0]) : 0
  const ref = (text.match(/(?:เลขที่รายการ|รหัสอ้างอิง|เลขที่อ้างอิง|ref(?:erence)?(?:\s*no)?\.?)\s*[:：]?\s*([A-Za-z0-9]{8,})/i) || text.match(/\b([0-9]{6,}[A-Z]{2,}[0-9A-Z]{4,})\b/) || [])[1] || null

  // people / shops: lines starting with a name prefix
  const names = lines.map(clean).filter((l) => PREFIX.test(l) && l.length < 60 && !/\d{3,}/.test(l))
  const isOwner = (l) => ownerWords.length && ownerWords.some((w) => w.length > 2 && l.includes(w))
  let direction = sign
  const title = lines.slice(0, 3).join(' ')
  if (!direction) {
    if (/เงินเข้า|รับเงิน|รับโอน|ได้รับ|เข้าบัญชี|received|deposit/i.test(title)) direction = 'in'
    else if (/โอน|ถอน|ชำระ|จ่าย|สำเร็จ|transfer|paid|payment|withdraw/i.test(text)) direction = 'out'
  }
  let counterparty = null
  if (names.length >= 2) {
    const [a, b] = [names[0], names[names.length - 1]]
    if (isOwner(b) && !isOwner(a)) { counterparty = a; direction = direction === 'out' && !sign ? 'in' : direction || 'in' }
    else counterparty = isOwner(b) ? null : b
  } else if (names.length === 1 && !isOwner(names[0])) counterparty = names[0]
  if (counterparty) counterparty = counterparty.replace(PREFIX, '').trim()
  const bank = /กสิกร|kbank|k plus/i.test(text) ? 'KBank' : /ไทยพาณิชย์|scb/i.test(text) ? 'SCB' : /กรุงไทย|krungthai|ktb/i.test(text) ? 'Krungthai' : /กรุงศรี|krungsri/i.test(text) ? 'Krungsri' : /กรุงเทพ|bangkok bank|bbl/i.test(text) ? 'Bangkok Bank' : /ttb|ทหารไทย/i.test(text) ? 'ttb' : /พร้อมเพย์|promptpay/i.test(text) ? 'PromptPay' : null
  return { amount, fee, ref, direction: direction || 'out', counterparty, bank }
}

/** Returns one entry per transaction found in the OCR text. */
export function parseSlipText(raw, ownerName = '') {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const ownerWords = ownerName.split(/\s+/).filter(Boolean)
  const dateIdx = []
  lines.forEach((l, i) => { if (findDate(l)) dateIdx.push(i) })
  const blocks = []
  if (dateIdx.length <= 1) blocks.push({ lines, d: dateIdx.length ? findDate(lines[dateIdx[0]]) : null })
  else dateIdx.forEach((di, k) => {
    const start = Math.max(0, di - 1), end = k + 1 < dateIdx.length ? dateIdx[k + 1] - 1 : lines.length
    blocks.push({ lines: lines.slice(start, end), d: findDate(lines[di]) })
  })
  return blocks.map(({ lines: ls, d }) => ({ ...parseBlock(ls, ownerWords), date: d?.date || null, time: d?.time || null, text: ls.join('\n') }))
    .filter((x) => x.amount && x.amount > 0)
}
