/**
 * Spending-style insights: learn from the last 30 days of real transactions, compare with the 30 before,
 * describe the style (as an RPG "class"), and suggest an allocation split that fits how money is really used.
 * Everything runs on the device. Pure statistics, no outside AI.
 */
import { postingsOf } from './ledger'
import { round2, todayISO } from './format'
import { monthlyOf } from './subs'

const DAY = 86400000
const iso = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const shift = (isoDate, n) => iso(new Date(isoDate + 'T12:00:00').getTime() + n * DAY)
const r5 = (x) => Math.round(x / 5) * 5

const CLASSES = [
  { id: 'foodie', name: 'นักชิมผู้ภักดี', icon: '🍜', test: (m) => m.foodShare >= 0.4, good: 'รู้ว่าความสุขของตัวเองอยู่ที่ไหน', watch: 'ค่ากิน/กาแฟเล็ก ๆ รวมกันเป็นก้อนใหญ่ ลองตั้งงบรายวันให้หมวดนี้' },
  { id: 'shopper', name: 'นักช้อปสุดสัปดาห์', icon: '🛍️', test: (m) => m.shopShare >= 0.3 || (m.weekendRatio >= 1.6 && m.shopShare >= 0.15), good: 'ซื้อของที่อยากได้จริง ๆ', watch: 'ใช้เงินวันหยุดมากกว่าวันธรรมดา ลองพักของในตะกร้าไว้ 1 วันก่อนจ่าย' },
  { id: 'mage', name: 'จอมเวทลงทุน', icon: '🔮', test: (m) => m.investRate >= 0.2, good: `ส่งเงินเข้าลงทุนสม่ำเสมอ`, watch: 'อย่าลืมกันเงินสำรองฉุกเฉินก่อนลงทุนเพิ่ม' },
  { id: 'card', name: 'อัศวินบัตรทอง', icon: '💳', test: (m) => m.cardShare >= 0.5, good: 'ได้แต้มและเลื่อนจ่ายได้', watch: 'ยอดบัตรคือบอสที่ฟื้นพลังได้ กันเงินจ่ายบัตรให้พอทุกเดือน' },
  { id: 'saver', name: 'นักวางแผนสายเก็บ', icon: '🛡️', test: (m) => m.saveRate >= 0.3, good: 'เหลือเงินเก็บได้เยอะ', watch: 'ระวังเก็บจนตึงเกินไป ให้รางวัลตัวเองบ้าง' },
  { id: 'steady', name: 'นักผจญภัยสายสมดุล', icon: '⚖️', test: () => true, good: 'ใช้เงินกระจายหลายหมวด ไม่หนักไปทางใด', watch: 'ลองตั้งเป้าออมให้ชัดขึ้นอีกนิด' },
]

/** One 30-day window of numbers. */
function windowStats({ txns, accById, catById, from, to }) {
  const inRange = txns.filter((t) => t.date >= from && t.date <= to)
  let income = 0, expense = 0, card = 0, invest = 0, wkday = 0, wkend = 0, nWkday = 0, nWkend = 0
  const byCat = {}
  const expenses = []
  for (let d = from; d <= to; d = shift(d, 1)) { const wd = new Date(d + 'T12:00:00').getDay(); if (wd === 0 || wd === 6) nWkend++; else nWkday++ }
  for (const t of inRange) {
    if (t.kind === 'income') income += t.amount
    if (t.kind === 'expense') {
      expense += t.amount
      byCat[t.category || 'cat-uncat'] = (byCat[t.category || 'cat-uncat'] || 0) + t.amount
      if (accById[t.account]?.type === 'credit') card += t.amount
      const wd = new Date(t.date + 'T12:00:00').getDay()
      if (wd === 0 || wd === 6) wkend += t.amount; else wkday += t.amount
      expenses.push(t)
    }
    if (t.kind === 'transfer' && accById[t.to]?.type === 'invest' && accById[t.account]?.type !== 'invest') invest += t.amount
    if (t.kind === 'income' && t.split) for (const [k, v] of Object.entries(t.split)) if (accById[k]?.type === 'invest') invest += v
  }
  const cats = Object.entries(byCat).map(([id, v]) => ({ id, name: catById[id]?.name || 'อื่น ๆ', color: catById[id]?.color || '#94a3b8', amount: round2(v), share: expense ? v / expense : 0 })).sort((a, b) => b.amount - a.amount)
  const sorted = expenses.map((t) => t.amount).sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
  const big = expenses.filter((t) => t.amount >= Math.max(1500, median * 5)).sort((a, b) => b.amount - a.amount).slice(0, 3)
  const share = (ids) => ids.reduce((s, id) => s + (byCat[id] || 0), 0) / (expense || 1)
  return {
    from, to, days: inRange.length ? Math.round((new Date(to) - new Date(from)) / DAY) + 1 : 0, count: inRange.length,
    income: round2(income), expense: round2(expense), card: round2(card), invest: round2(invest),
    perDay: expense / 30, weekendRatio: nWkend && nWkday && wkday ? (wkend / nWkend) / (wkday / nWkday) : 1,
    cats, big: big.map((t) => ({ note: t.note || catById[t.category]?.name || 'ค่าใช้จ่าย', amount: t.amount, date: t.date })),
    foodShare: share(['cat-food', 'cat-coffee']), shopShare: share(['cat-shop']),
    cardShare: expense ? card / expense : 0,
    saveRate: income ? (income - expense) / income : 0, investRate: income ? invest / income : 0,
  }
}

/** Days the spendable wallet ended below zero, walking balances back from today. */
function tightDays({ txns, accById, settings, cashId, balance, from, to, perDay }) {
  if (!cashId) return { negative: 0, tight: 0 }
  const delta = {}
  for (const t of txns) {
    if (t.date <= from) continue
    for (const p of postingsOf(t, accById, settings)) if (p.acc === cashId) delta[t.date] = (delta[t.date] || 0) + p.amt
  }
  let bal = balance, negative = 0, tight = 0
  for (let d = todayISO(); d >= from; d = shift(d, -1)) {
    if (d <= to) { if (bal < 0) negative++; else if (bal < perDay) tight++ }
    bal -= delta[d] || 0
  }
  return { negative, tight }
}

/** Suggested split that matches how money was really used. */
function suggestSplit(cur, m, fixedMonthly, tight) {
  if (!m.income) return null
  const cardNeed = (m.card + fixedMonthly * 0.0) / m.income
  const cashNeed = ((m.expense - m.card) * (tight.negative + tight.tight > 3 ? 1.2 : 1.1)) / m.income
  let reserve = Math.max(0, r5(cardNeed * 100)), cash = Math.max(20, r5(cashNeed * 100))
  if (m.card > 0 && reserve === 0) reserve = 5
  let invest = 100 - reserve - cash
  if (invest < 0) { // not enough income for everything: keep debt first, then spending
    invest = 0
    if (reserve + cash > 100) cash = Math.max(20, 100 - reserve)
    if (reserve + cash > 100) reserve = 100 - cash
  }
  const pct = { reserve, cash, invest: 100 - reserve - cash }
  const diff = Math.max(...['reserve', 'cash', 'invest'].map((k) => Math.abs((cur?.[k] ?? 0) - pct[k])))
  const reasons = []
  if (pct.cash > (cur?.cash ?? 0)) reasons.push(tight.negative ? `เงินใช้ได้ติดลบ ${tight.negative} วันในช่วงนี้` : `ใช้จ่ายจริงเฉลี่ย ${Math.round(((m.expense - m.card) / m.income) * 100)}% ของรายรับ`)
  if (pct.cash < (cur?.cash ?? 0)) reasons.push(`ใช้จ่ายจริงแค่ ${Math.round(((m.expense - m.card) / m.income) * 100)}% ของรายรับ เหลือเงินไปทำงานได้มากขึ้น`)
  if (pct.reserve !== (cur?.reserve ?? 0)) reasons.push(m.card ? `รูดบัตรรวม ${Math.round((m.card / m.income) * 100)}% ของรายรับ ต้องกันไว้จ่ายบิลให้พอ` : 'ไม่ได้รูดบัตรเลยในช่วงนี้ ลดเงินกันหนี้ลงได้')
  return { pct, diff, worth: diff >= 5, reasons }
}

/** Full analysis of the last 30 days (or of the 30 days ending on `endISO`). */
export function analyze({ txns, accounts, categories, settings, balances, subs = [], fx = 34, endISO = todayISO() }) {
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const first = txns.reduce((m, t) => (t.date && (!m || t.date < m) ? t.date : m), null)
  const historyDays = first ? Math.round((new Date(endISO) - new Date(first)) / DAY) + 1 : 0
  const from = shift(endISO, -29), pfrom = shift(endISO, -59), pto = shift(endISO, -30)
  const cur = windowStats({ txns, accById, catById, from, to: endISO })
  const prev = windowStats({ txns, accById, catById, from: pfrom, to: pto })
  const cashId = settings.allocation?.targets?.cash
  const tight = tightDays({ txns, accById, settings, cashId, balance: balances?.[cashId] ?? 0, from, to: endISO, perDay: cur.perDay })
  const fixedMonthly = subs.filter((s) => !s.paused).reduce((sum, s) => sum + monthlyOf(s, fx), 0)
  const cls = CLASSES.find((c) => c.test(cur))
  const suggestion = suggestSplit(settings.allocation?.pct, cur, fixedMonthly, tight)
  const changes = cur.cats.slice(0, 6).map((c) => {
    const p = prev.cats.find((x) => x.id === c.id)?.amount || 0
    return { ...c, prev: p, delta: c.amount - p }
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3)
  return {
    ready: historyDays >= 30, historyDays: Math.min(historyDays, 30), from, to: endISO,
    cur, prev, tight, fixedMonthly: round2(fixedMonthly), cls, suggestion, changes,
    expenseChange: prev.expense ? (cur.expense - prev.expense) / prev.expense : null,
  }
}

/** A compact copy of an analysis to keep as a monthly report. */
export function toReport(a) {
  return {
    at: new Date().toISOString(), from: a.from, to: a.to,
    expense: a.cur.expense, income: a.cur.income, perDay: round2(a.cur.perDay), saveRate: a.cur.saveRate, cardShare: a.cur.cardShare,
    expenseChange: a.expenseChange, cls: { id: a.cls.id, name: a.cls.name, icon: a.cls.icon, good: a.cls.good, watch: a.cls.watch },
    topCats: a.cur.cats.slice(0, 5).map(({ id, name, color, amount, share }) => ({ id, name, color, amount, share })),
    changes: a.changes.map(({ id, name, amount, prev, delta }) => ({ id, name, amount, prev, delta })),
    big: a.cur.big, tight: a.tight, suggestion: a.suggestion,
  }
}
