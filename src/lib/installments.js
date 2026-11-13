import { useStore, selectList } from '../store'
import { shiftMonth, todayISO, round2 } from './format'

/** Statement date of a card in a given month (YYYY-MM), clamped to month end. */
export function postDate(month, day) {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${month}-${String(Math.min(Number(day) || 1, last)).padStart(2, '0')}`
}

/** Months of a card-installment loan schedule. */
export function schedule(loan, card) {
  if (!loan?.viaCard || !loan.instStart || !loan.instCount) return []
  const day = card?.statementDay || card?.dueDay || 1
  return Array.from({ length: Number(loan.instCount) }, (_, k) => {
    const month = shiftMonth(loan.instStart, k)
    return { k, month, date: postDate(month, day), id: `inst-${loan.id}-${month}` }
  })
}

/**
 * Bills due installments of "เงินสดผ่อนผ่านบัตร" onto the linked credit card:
 * principal moves from the loan to the card (transfer) and the monthly interest is a card expense.
 * Ids are deterministic per month, so devices never double-post and deleted postings stay deleted.
 */
export function processInstallments() {
  const st = useStore.getState()
  const today = todayISO()
  const accounts = selectList(st.items, 'account')
  let posted = 0
  for (const loan of accounts) {
    if (loan.type !== 'loan' || !loan.viaCard || loan.archived) continue
    const card = accounts.find((a) => a.id === loan.viaCard)
    if (!card) continue
    for (const s of schedule(loan, card)) {
      if (s.date > today) break
      const n = `${s.k + 1}/${loan.instCount}`
      if (!st.items[`${s.id}-p`] && Number(loan.instPrincipal) > 0) {
        st.put('txn', {
          id: `${s.id}-p`, kind: 'transfer', amount: round2(loan.instPrincipal), account: card.id, to: loan.id, date: s.date,
          note: `ค่างวด ${loan.name} ${n}`, earmark: true, instOf: loan.id, createdAt: new Date().toISOString(),
        })
        posted++
      }
      if (!st.items[`${s.id}-i`] && Number(loan.instInterest) > 0) {
        st.put('txn', {
          id: `${s.id}-i`, kind: 'expense', amount: round2(loan.instInterest), account: card.id, category: 'cat-fee', date: s.date,
          note: `ดอกเบี้ย ${loan.name} ${n}`, instOf: loan.id, createdAt: new Date().toISOString(),
        })
      }
    }
  }
  if (posted) st.showToast(`ลงค่างวดผ่อนเข้าบิลบัตรอัตโนมัติ ${posted} งวด`)
}
