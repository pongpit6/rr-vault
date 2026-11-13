import { useMemo, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Segmented, Money, Empty } from '../components/ui'
import TxnRow, { txnVisual } from '../components/TxnRow'
import { useVault } from '../lib/useVault'
import { dateLabel, monthKey, monthLabel, shiftMonth, todayISO, round2 } from '../lib/format'

export default function Transactions({ onEdit, initialAccount }) {
  const { txns, catById, accById, accounts } = useVault()
  const [month, setMonth] = useState(monthKey(todayISO()))
  const [kind, setKind] = useState('all')
  const [q, setQ] = useState('')
  const [acc, setAcc] = useState(initialAccount || 'all')

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return txns.filter((t) => {
      if (!s && monthKey(t.date) !== month) return false
      if (kind !== 'all' && t.kind !== kind) return false
      if (acc !== 'all' && t.account !== acc && t.to !== acc && !(t.split && t.split[acc])) return false
      if (s) {
        const v = txnVisual(t, catById, accById)
        const hay = `${t.note} ${v.title} ${v.sub} ${t.amount}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [txns, month, kind, q, acc, catById, accById])

  const groups = useMemo(() => {
    const g = []
    for (const t of list) {
      let last = g[g.length - 1]
      if (!last || last.date !== t.date) { last = { date: t.date, items: [], net: 0 }; g.push(last) }
      last.items.push(t)
      if (t.kind === 'income') last.net += t.amount
      if (t.kind === 'expense') last.net -= t.amount
    }
    return g
  }, [list])

  const totals = useMemo(() => {
    let inc = 0, exp = 0
    list.forEach((t) => { if (t.kind === 'income') inc += t.amount; if (t.kind === 'expense') exp += t.amount })
    return { inc: round2(inc), exp: round2(exp) }
  }, [list])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold pt-2">รายการ</h1>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input className="field !pl-10" placeholder="ค้นหาทุกเดือน: บันทึก, หมวด, จำนวน" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"><X size={16} /></button>}
        </div>
        <select className="field !w-auto max-w-[40%]" value={acc} onChange={(e) => setAcc(e.target.value)}>
          <option value="all">ทุกกระเป๋า</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <Segmented value={kind} onChange={setKind} options={[
        { value: 'all', label: 'ทั้งหมด' }, { value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' },
        { value: 'transfer', label: 'โอน' }, { value: 'payment', label: 'ชำระหนี้' },
      ]} className="overflow-x-auto no-scrollbar" />

      {!q && (
        <div className="card flex items-center justify-between p-2">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-xl hover:bg-white/5"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <div className="font-semibold">{monthLabel(month)}</div>
            <div className="text-xs flex gap-3 justify-center">
              <span className="text-mint-soft"><Money value={totals.inc} sign /></span>
              <span className="text-rose"><Money value={-totals.exp} /></span>
            </div>
          </div>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 rounded-xl hover:bg-white/5"><ChevronRight size={20} /></button>
        </div>
      )}

      {groups.length === 0 ? (
        <Empty icon="receipt" title="ไม่มีรายการ" text={q ? 'ลองค้นหาด้วยคำอื่น' : 'เดือนนี้ยังไม่มีรายการที่ตรงกับตัวกรอง'} />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.date} className="card p-2">
              <div className="flex justify-between items-center px-3 pt-1.5 pb-1 text-xs text-ink-400">
                <span>{dateLabel(g.date)}</span>
                {g.net !== 0 && <Money value={g.net} sign />}
              </div>
              {g.items.map((t) => <TxnRow key={t.id} t={t} catById={catById} accById={accById} onClick={() => onEdit(t)} />)}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
