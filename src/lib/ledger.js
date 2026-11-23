import { round2 } from './format'
import { isDebt, ACCOUNT_TYPES } from './defaults'

/**
 * Every transaction is turned into postings: [{acc, amt}] — money moving in/out of accounts.
 * Balances are always derived from opening balance + postings, so editing or deleting
 * any record keeps every wallet consistent.
 */
export function postingsOf(t, accById, settings) {
  const a = round2(t.amount)
  const r = t.kind === 'expense' ? round2(t.reimb?.amount || 0) : 0
  if (!a && !r && t.kind !== 'adjust') return []
  switch (t.kind) {
    case 'expense': {
      // `amount` is your own share; `reimb.amount` is paid back later by someone else. The account pays both.
      const p = [{ acc: t.account, amt: -round2(a + r) }]
      const acc = accById[t.account]
      // Credit-card spending: move the same amount from spendable cash into the debt reserve,
      // so "available" always shows money that is truly free to spend.
      if (acc?.type === 'credit' && t.earmark !== false) {
        const from = t.earmarkFrom || settings?.earmarkFrom
        const reserve = settings?.allocation?.targets?.reserve
        // only your own share is set aside from cash; the shared part is funded by the repayment
        if (a && from && reserve && accById[from] && accById[reserve] && from !== reserve) {
          p.push({ acc: from, amt: -a }, { acc: reserve, amt: a })
        }
      }
      return p
    }
    case 'repay': // someone pays you back → into the chosen account (the reserve when it was card spending)
      return [{ acc: t.account, amt: a }]
    case 'lend': // you lend cash to someone
      return [{ acc: t.account, amt: -a }]
    case 'income': {
      if (t.split && Object.keys(t.split).length) {
        return Object.entries(t.split).filter(([, v]) => Number(v)).map(([acc, v]) => ({ acc, amt: round2(v) }))
      }
      return [{ acc: t.account, amt: a }]
    }
    case 'transfer': {
      const p = [{ acc: t.account, amt: -a }, { acc: t.to, amt: a }]
      // an installment billed onto a credit card is new card debt: set the same amount aside, like card spending
      if (t.earmark && accById[t.account]?.type === 'credit') {
        const from = settings?.earmarkFrom, reserve = settings?.allocation?.targets?.reserve
        if (from && reserve && accById[from] && accById[reserve] && from !== reserve) p.push({ acc: from, amt: -a }, { acc: reserve, amt: a })
      }
      return p
    }
    case 'payment':
      return [{ acc: t.account, amt: -a }, { acc: t.to, amt: a }]
    case 'adjust':
      return [{ acc: t.account, amt: round2(t.amount) }]
    case 'trade':
      return t.account ? [{ acc: t.account, amt: t.side === 'sell' ? a : -a }] : []
    default:
      return []
  }
}

export function computeBalances(accounts, txns, settings) {
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const bal = Object.fromEntries(accounts.map((a) => [a.id, round2(a.opening || 0)]))
  for (const t of txns) {
    for (const p of postingsOf(t, accById, settings)) {
      if (p.acc in bal) bal[p.acc] = round2(bal[p.acc] + p.amt)
    }
  }
  return bal
}

/** Amount that should be sitting in the debt reserve right now. */
export function debtTarget(accounts, bal) {
  let target = 0
  for (const a of accounts) {
    if (a.archived) continue
    const owed = Math.max(0, -(bal[a.id] || 0))
    if (a.type === 'credit') target += owed
    // a loan billed through a credit card is reserved when each installment lands on the card
    if (a.type === 'loan' && !a.viaCard) target += Math.min(owed, Number(a.installment) || owed)
  }
  return round2(target)
}

/**
 * Money other people owe you: shared card/cash spending they'll pay back (expense.reimb) and cash you lent (lend),
 * minus what came back (repay). Per person, with the open items oldest first.
 */
export function computeReceivables(txns, accById = {}) {
  const by = {}
  const P = (who) => (by[who] ||= { who, owed: 0, viaCard: 0, items: [], repaid: 0 })
  const sorted = [...txns].sort((x, y) => (x.date + (x.createdAt || '')).localeCompare(y.date + (y.createdAt || '')))
  for (const t of sorted) {
    if (t.kind === 'expense' && t.reimb?.who && t.reimb.amount > 0) {
      const p = P(t.reimb.who); p.owed = round2(p.owed + t.reimb.amount)
      const card = accById[t.account]?.type === 'credit'
      if (card) p.viaCard = round2(p.viaCard + t.reimb.amount)
      p.items.push({ id: t.id, date: t.date, amount: t.reimb.amount, note: t.note, category: t.category, card, account: t.account })
    }
    if (t.kind === 'lend' && t.who) { const p = P(t.who); p.owed = round2(p.owed + t.amount); p.items.push({ id: t.id, date: t.date, amount: t.amount, note: t.note || 'ให้ยืมเงิน', lend: true }) }
    if (t.kind === 'repay' && t.who) { const p = P(t.who); p.owed = round2(p.owed - t.amount); p.repaid = round2(p.repaid + t.amount); p.viaCard = round2(Math.max(0, p.viaCard - t.amount)) }
  }
  // mark which items are still open (repayments settle the oldest first)
  for (const p of Object.values(by)) {
    let left = p.repaid
    for (const it of p.items) { const used = Math.min(left, it.amount); it.open = round2(it.amount - used); left = round2(left - used) }
    p.owed = round2(Math.max(0, p.owed)); p.open = p.items.filter((i) => i.open > 0)
  }
  const list = Object.values(by).filter((p) => p.owed > 0 || p.items.length)
  return { by, list, total: round2(list.reduce((s, p) => s + p.owed, 0)), viaCard: round2(list.reduce((s, p) => s + p.viaCard, 0)) }
}

/**
 * Debt first, always: the reserve bucket is kept equal to what the debts need, automatically.
 * Spendable cash and the reserve are one pool of money; the reserve takes what the debts need
 * (minus repayments people will make for shared card spending) and the rest is spendable.
 * New card spending moves money from spendable at once, paying a bill releases it, investments are never touched.
 * Returns the balances as shown (pool re-split) plus the summary.
 */
export function rebalanceReserve(accounts, bal, settings, recv = null) {
  const T = settings?.allocation?.targets || {}
  const byId = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const cash = byId[T.cash], res = byId[T.reserve]
  const target = debtTarget(accounts, bal)
  const incoming = recv ? Math.min(recv.viaCard, target) : 0
  const need = Math.max(0, round2(target - incoming))
  if (!cash || !res || cash.id === res.id || cash.archived || res.archived || !ACCOUNT_TYPES[cash.type]?.asset || !ACCOUNT_TYPES[res.type]?.asset) return { bal, moved: 0, need }
  const pool = round2((bal[cash.id] || 0) + (bal[res.id] || 0))
  const earmark = round2(Math.min(need, Math.max(0, pool)))
  const out = { ...bal, [res.id]: earmark, [cash.id]: round2(pool - earmark) }
  return { bal: out, moved: round2(earmark - (bal[res.id] || 0)), need }
}

export function summarize(accounts, bal, recv = null) {
  let assets = 0, debts = 0
  const byType = {}
  for (const a of accounts) {
    if (a.archived) continue
    const b = bal[a.id] || 0
    byType[a.type] = round2((byType[a.type] || 0) + b)
    if (ACCOUNT_TYPES[a.type]?.asset) assets += b
    else debts += -b
  }
  const reserve = byType.reserve || 0
  const target = debtTarget(accounts, bal)
  // card spending someone will pay back counts toward the reserve: that repayment is earmarked for the bill
  const incoming = recv ? Math.min(recv.viaCard, Math.max(0, target - reserve)) : 0
  const receivable = recv ? recv.total : 0
  return {
    assets: round2(assets + receivable), debts: round2(debts), net: round2(assets + receivable - debts), byType: { ...byType, receivable },
    reserve, target, incoming: round2(incoming), receivable, gap: round2(Math.max(0, target - reserve - incoming)),
    coverage: target > 0 ? Math.min(1, (reserve + incoming) / target) : 1,
  }
}

/** spendable/invest split only: the debt part is automatic now. Old {reserve, cash, invest} → cash + invest = 100 */
export function normPct(pct = {}) {
  const c = Math.max(0, pct.cash || 0), i = Math.max(0, pct.invest || 0)
  if (c + i <= 0) return { reserve: 0, cash: 100, invest: 0 }
  const cash = Math.round((c / (c + i)) * 100)
  return { reserve: 0, cash, invest: 100 - cash }
}

/**
 * Allocation for incoming money: whatever the debt reserve still misses comes first (all of it),
 * then the rest is split between spendable and investing by the user's percentages.
 */
export function allocate(amount, alloc, gap) {
  const amt = round2(amount)
  // ① the debt reserve takes everything it is still missing, ② the rest is split between spendable and investing
  const r = round2(Math.min(amt, Math.max(0, gap || 0)))
  const p = normPct(alloc.pct)
  const i = round2(((amt - r) * p.invest) / 100)
  return { reserve: r, cash: round2(amt - r - i), invest: i }
}

/** Move one slider; the others rescale proportionally so the total stays 100. */
export function rebalance(pct, key, value) {
  const keys = Object.keys(pct)
  const v = Math.max(0, Math.min(100, Math.round(value)))
  const others = keys.filter((k) => k !== key)
  const rest = 100 - v
  const oldSum = others.reduce((s, k) => s + pct[k], 0)
  const out = { [key]: v }
  let acc = 0
  others.forEach((k, idx) => {
    if (idx === others.length - 1) out[k] = rest - acc
    else {
      const share = oldSum > 0 ? Math.round((pct[k] / oldSum) * rest) : Math.round(rest / others.length)
      out[k] = share; acc += share
    }
  })
  return out
}

export function txnSign(t, accById) {
  if (t.kind === 'income' || t.kind === 'repay') return 1
  if (t.kind === 'lend') return -1
  if (t.kind === 'expense') return -1
  if (t.kind === 'adjust') return Math.sign(t.amount)
  return 0
}

export { isDebt }

/* ---------- credit card billing cycle ---------- */
const isoD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const clampDay = (y, m, d) => new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()))
const dueAfter = (stmt, sd, dd) => (dd > sd ? clampDay(stmt.getFullYear(), stmt.getMonth(), dd) : clampDay(stmt.getFullYear(), stmt.getMonth() + 1, dd))

/**
 * Splits a credit card balance into the bill of the latest statement (due on dueDay) and
 * the new cycle (spending after the statement date, billed next time).
 * "ปรับยอด" entries count as part of the billed balance.
 */
export function cardCycle(a, txns, accById, settings, todayIso) {
  if (a.type !== 'credit' || !a.statementDay) return null
  const sd = Number(a.statementDay), dd = Number(a.dueDay) || sd
  const t = new Date(todayIso + 'T00:00:00')
  let stmt = clampDay(t.getFullYear(), t.getMonth(), sd)
  if (stmt > t) stmt = clampDay(t.getFullYear(), t.getMonth() - 1, sd)
  const due = dueAfter(stmt, sd, dd)
  const nextStmt = clampDay(stmt.getFullYear(), stmt.getMonth() + 1, sd)
  const nextDue = dueAfter(nextStmt, sd, dd)
  const stmtIso = isoD(stmt)
  let balAtStmt = a.opening || 0, paidAfter = 0, chargedAfter = 0
  for (const x of txns) {
    for (const p of postingsOf(x, accById, settings)) {
      if (p.acc !== a.id) continue
      if (x.kind === 'adjust' || x.date <= stmtIso) balAtStmt += p.amt
      else if (p.amt > 0) paidAfter += p.amt
      else chargedAfter += -p.amt
    }
  }
  const billed = round2(Math.max(0, -balAtStmt))
  const billDue = round2(Math.max(0, billed - paidAfter))
  const owed = round2(Math.max(0, -(balAtStmt + paidAfter - chargedAfter)))
  return {
    stmtDate: stmtIso, dueDate: isoD(due), nextStmtDate: isoD(nextStmt), nextDueDate: isoD(nextDue),
    billed, billDue, paidAfter: round2(paidAfter), newCycle: round2(Math.max(0, owed - billDue)), owed,
    overdue: billDue > 0 && todayIso > isoD(due),
  }
}
