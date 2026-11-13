import { postingsOf } from './ledger'
import { ACCOUNT_TYPES } from './defaults'
import { round2, monthKey, shiftMonth, todayISO } from './format'

const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Daily net worth series. Past days are rebuilt from the ledger (cash/debt balances + investments at cost);
 * days with a saved snapshot use the snapshot, which includes real market value.
 */
export function netWorthSeries(accounts, txns, settings, snaps) {
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const sign = (a) => (ACCOUNT_TYPES[a.type] ? 1 : 0)
  const byDate = {}
  // "ปรับยอด" corrects a starting balance, so it is applied from the beginning instead of on its date
  const adjusts = txns.filter((t) => t.kind === 'adjust')
  for (const t of txns) if (t.kind !== 'adjust') (byDate[t.date] ||= []).push(t)
  const dates = Object.keys(byDate).sort()
  const today = todayISO()
  const start = dates[0] && dates[0] < today ? dates[0] : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return isoOf(d) })()
  let cash = accounts.reduce((s, a) => s + (a.archived ? 0 : (a.opening || 0) * sign(a)), 0)
  for (const t of adjusts) for (const p of postingsOf(t, accById, settings)) if (accById[p.acc] && !accById[p.acc].archived) cash += p.amt
  let invested = 0
  const out = []
  const snapBy = Object.fromEntries(snaps.map((s) => [s.date, s]))
  for (let d = new Date(start + 'T00:00:00'); isoOf(d) <= today; d.setDate(d.getDate() + 1)) {
    const k = isoOf(d)
    for (const t of byDate[k] || []) {
      for (const p of postingsOf(t, accById, settings)) if (accById[p.acc] && !accById[p.acc].archived) cash += p.amt
      if (t.kind === 'trade') invested += t.side === 'sell' ? -t.amount : t.amount // cost basis approx.
    }
    const snap = snapBy[k]
    out.push({ date: k, value: round2(snap ? snap.net : cash + Math.max(0, invested)), real: !!snap })
  }
  return out
}

export function monthlyStats(txns, months = 6) {
  const cur = monthKey(todayISO())
  const keys = Array.from({ length: months }, (_, i) => shiftMonth(cur, i - months + 1))
  const m = Object.fromEntries(keys.map((k) => [k, { key: k, inc: 0, exp: 0, cats: {} }]))
  for (const t of txns) {
    const r = m[monthKey(t.date)]; if (!r) continue
    if (t.kind === 'income') r.inc += t.amount
    if (t.kind === 'expense') { r.exp += t.amount; r.cats[t.category] = (r.cats[t.category] || 0) + t.amount }
  }
  return keys.map((k) => ({ ...m[k], inc: round2(m[k].inc), exp: round2(m[k].exp), net: round2(m[k].inc - m[k].exp), rate: m[k].inc > 0 ? (m[k].inc - m[k].exp) / m[k].inc : null }))
}

export function budgetStatus(budgets, txns, month = monthKey(todayISO())) {
  const spent = {}
  for (const t of txns) if (t.kind === 'expense' && monthKey(t.date) === month) spent[t.category] = (spent[t.category] || 0) + t.amount
  const [y, mo] = month.split('-').map(Number)
  const daysIn = new Date(y, mo, 0).getDate()
  const dayNow = month === monthKey(todayISO()) ? new Date().getDate() : daysIn
  return budgets.map((b) => {
    const s = round2(spent[b.category] || 0)
    const ratio = b.limit > 0 ? s / b.limit : 0
    const pace = b.limit * (dayNow / daysIn)
    return { ...b, spent: s, left: round2(b.limit - s), ratio, status: ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : s > pace * 1.1 ? 'fast' : 'ok', perDayLeft: dayNow < daysIn ? round2(Math.max(0, b.limit - s) / (daysIn - dayNow + 1)) : 0 }
  }).sort((a, b) => b.ratio - a.ratio)
}

export function goalStatus(goal, balances) {
  const saved = Math.max(0, balances[goal.account] || 0)
  const left = Math.max(0, goal.target - saved)
  let monthsLeft = null, perMonth = null
  if (goal.deadline) {
    const now = new Date(), [y, m, d] = goal.deadline.split('-').map(Number)
    monthsLeft = Math.max(0, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) + (d >= now.getDate() ? 0 : -1) + 1)
    perMonth = monthsLeft > 0 ? round2(left / monthsLeft) : left
  }
  return { saved: round2(saved), left: round2(left), ratio: goal.target > 0 ? Math.min(1, saved / goal.target) : 0, done: saved >= goal.target && goal.target > 0, monthsLeft, perMonth }
}

/**
 * Month-by-month payoff simulation. Every debt gets its minimum; the remaining budget goes to the
 * target debt (avalanche = highest APR first, snowball = smallest balance first).
 */
export function debtPlan(debts, monthlyBudget, strategy = 'avalanche') {
  let list = debts.filter((d) => d.balance > 0).map((d) => ({ ...d, bal: d.balance, paidOff: null, interest: 0 }))
  const minOf = (d) => Math.min(d.bal, Math.max(d.minFixed || 0, d.bal * (d.minPct || 0) / 100))
  const totalMin = list.reduce((s, d) => s + minOf(d), 0)
  if (!list.length) return { months: 0, interest: 0, debts: [], feasible: true, totalMin: 0 }
  if (monthlyBudget < totalMin - 0.5) return { months: null, interest: null, debts: list, feasible: false, totalMin: round2(totalMin) }
  let month = 0, totalInterest = 0
  while (list.some((d) => d.bal > 0.5) && month < 600) {
    month++
    for (const d of list) if (d.bal > 0) { const i = d.bal * (d.apr || 0) / 100 / 12; d.bal += i; d.interest += i; totalInterest += i }
    let budget = monthlyBudget
    for (const d of list) if (d.bal > 0) { const p = Math.min(d.bal, minOf(d)); d.bal -= p; budget -= p }
    const order = list.filter((d) => d.bal > 0.5).sort((a, b) => strategy === 'avalanche' ? (b.apr || 0) - (a.apr || 0) || a.bal - b.bal : a.bal - b.bal)
    for (const d of order) { if (budget <= 0) break; const p = Math.min(d.bal, budget); d.bal -= p; budget -= p }
    for (const d of list) if (d.bal <= 0.5 && !d.paidOff) { d.bal = 0; d.paidOff = month }
  }
  const finish = new Date(); finish.setMonth(finish.getMonth() + month)
  return {
    months: month, interest: round2(totalInterest), feasible: month < 600, totalMin: round2(totalMin),
    finish: `${finish.getFullYear()}-${String(finish.getMonth() + 1).padStart(2, '0')}`,
    debts: list.map((d) => ({ ...d, interest: round2(d.interest) })).sort((a, b) => (a.paidOff || 999) - (b.paidOff || 999)),
  }
}
