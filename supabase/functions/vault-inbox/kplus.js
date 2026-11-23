// Reads a K PLUS (KBank) result email into a transaction. Pure function, shared by the edge
// function and the tests. Returns null when the email is not a K PLUS transaction result.
const pad = (n) => String(n).padStart(2, '0')
const num = (s) => (s == null ? null : Number(String(s).replace(/,/g, '')))

export function parseKplus(subject = '', body = '') {
  const all = String(body || '').replace(/\r/g, '').replace(/ /g, ' ')
  const th = all.split(/Dear Customer/i)[0]
  const f = (re) => { const m = th.match(re); return m ? m[1].trim() : null }
  const dm = th.match(/วันที่ทำรายการ\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/)
  const amount = num(f(/จำนวนเงิน\s*\(บาท\)\s*:\s*([\d,]+(?:\.\d+)?)/))
  if (!dm || !(amount > 0)) return null
  let y = +dm[3]
  if (y > 2400) y -= 543
  const fee = num(f(/ค่าธรรมเนียม\s*\(บาท\)\s*:\s*([\d,]+(?:\.\d+)?)/)) || 0
  const bal = num(f(/ยอด(?:ถอนได้|คงเหลือ|เงินคงเหลือ)[^:\n]*:\s*([\d,]+(?:\.\d+)?)/))
  const from = f(/จากบัญชี\s*:\s*([^\n]+)/) || ''
  const clean = (s) => (s || '').replace(/\s*\(ชื่อบัญชี.*$/, '').replace(/\s+/g, ' ').trim() || null
  const payee = clean(
    f(/ชื่อผู้รับเงิน\s*:\s*([^\n]+)/) || f(/เพื่อเข้าบัญชีบริษัท\s*:\s*([^\n]+)/) || f(/ชื่อบัญชีผู้รับ(?:เงิน)?\s*:\s*([^\n]+)/) ||
    f(/ชื่อบริการ\s*:\s*([^\n]+)/) || f(/ชื่อร้านค้า\s*:\s*([^\n]+)/) || f(/(?:ไปยัง|เข้า)บัญชี[^:\n]*:\s*([^\n]+)/),
  )
  const sub = String(subject || '')
  const type = /promptpay/i.test(sub) || /พร้อมเพย์/.test(th) ? 'promptpay'
    : /bill\s*payment/i.test(sub) || /ชำระค่าสินค้า/.test(th) ? 'bill'
      : /top\s*-?up|เติมเงิน/i.test(sub + th) ? 'topup'
        : /transfer|โอนเงิน/i.test(sub + th) ? 'transfer' : 'other'
  const income = /รับเงิน|เงินเข้า|received|incoming/i.test(sub)
  return {
    date: `${y}-${pad(dm[2])}-${pad(dm[1])}`, time: `${pad(dm[4])}:${dm[5]}`,
    ref: f(/เลขที่รายการ\s*:\s*([A-Za-z0-9]+)/), amount, fee, bal,
    last4: from.replace(/[^0-9]/g, '').slice(-4) || null, payee, type, income,
  }
}

export const learnKey = (s) => (s ? String(s).toLowerCase().replace(/[0-9x*•.\-_/]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30) : null)

/** Category remembered for this payee: exact key first, then the same first word (4+ letters). */
export function guessCategory(map = {}, payee) {
  const k = learnKey(payee)
  if (!k) return null
  if (map[k]?.category) return map[k].category
  const w = k.split(' ')[0]
  if (w.length < 4) return null
  const hit = Object.entries(map).find(([key]) => key.split(' ')[0] === w)
  return hit?.[1]?.category || null
}
