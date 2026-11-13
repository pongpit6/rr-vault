import { round2 } from './format'
import { isDebt, ACCOUNT_TYPES } from './defaults'

/**
 * Every transaction is turned into postings: [{acc, amt}] — money moving in/out of accounts.
 * Balances are always derived from opening balance + postings, so editing or deleting
 * any record keeps every wallet consistent.
 */
export function postingsOf(t, accById, settings) {
  const a = round2(t.amount)
  if (!a && t.kind !== 'adjust') return []
  switch (t.kind) {
    case 'expense': {
      const p = [{ acc: t.account, amt: -a }]
      const acc = accById[t.account]
      // Credit-card spending: move the same amount from spendable cash into the debt reserve,
      // so "available" always shows money that is truly free to spend.
      if (acc?.type === 'credit' && t.earmark !== false) {
        const from = t.earmarkFrom || settings?.earmarkFrom
        const reserve = settings?.allocation?.targets?.reserve
        if (from && reserve && accById[from] && accById[reserve] && from !== reserve) {
          p.push({ acc: from, amt: -a }, { acc: reserve, amt: a })
        }
      }
      return p
    }
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

export function summarize(accounts, bal) {
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
  return {
    assets: round2(assets), debts: round2(debts), net: round2(assets - debts), byType,
    reserve, target, gap: round2(Math.max(0, target - reserve)),
    coverage: target > 0 ? Math.min(1, reserve / target) : 1,
  }
}

/**
 * Waterfall allocation for incoming money: reserve (debt) first, then spendable, then investing.
 * If capReserveAtGap is on, the reserve only takes what is still missing for debts and the
 * remainder spills over to the other buckets in proportion to their sliders.
 */
export function allocate(amount, alloc, gap) {
  const amt = round2(amount)
  const pct = alloc.pct
  let r = (amt * pct.reserve) / 100
  let c = (amt * pct.cash) / 100
  let i = (amt * pct.invest) / 100
  if (alloc.capReserveAtGap && r > gap) {
    const spill = r - Math.max(0, gap)
    r = Math.max(0, gap)
    const w = pct.cash + pct.invest
    if (w > 0) { c += (spill * pct.cash) / w; i += (spill * pct.invest) / w } else c += spill
  }
  r = round2(r); i = round2(i)
  c = round2(amt - r - i) // remainder absorbs rounding
  return { reserve: r, cash: c, invest: i }
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
  if (t.kind === 'income') return 1
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
