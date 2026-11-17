import { useState } from 'react'
import { HandCoins, Plus } from 'lucide-react'
import { Sheet, Button } from './ui'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { money, todayISO, round2 } from '../lib/format'
import { sfx } from '../lib/sfx'

const tDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
const daysAgo = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso + 'T12:00:00')) / 86400000))

/** "รอรับคืน": money other people owe you, per person, with a one-tap "got it back". */
export default function Receivables() {
  const { receivables, people, accById, settings, catById } = useVault()
  const privacy = useStore((s) => s.ui.privacy)
  const [repay, setRepay] = useState(null) // person id
  const [lend, setLend] = useState(false)
  const nameOf = (id) => people.find((p) => p.id === id)?.name || 'ไม่ระบุ'
  const open = receivables.list.filter((p) => p.owed > 0)
  const M = (n) => (privacy ? '••••' : money(n))
  return (
    <section className="card p-4 space-y-3" data-testid="receivables">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-amber-400/15 text-amber-600"><HandCoins size={18} /></span>
          <div><div className="font-semibold text-sm">รอรับคืน</div><div className="text-[11px] text-slate-500">เงินที่คนอื่นจะจ่ายคืนคุณ</div></div>
        </div>
        <div className="text-right"><div className="num font-semibold" data-testid="recv-total">{M(receivables.total)}</div>{receivables.viaCard > 0 && <div className="text-[10px] text-slate-500">ใช้จ่ายบัตร {M(receivables.viaCard)}</div>}</div>
      </div>
      {open.length === 0 && <div className="text-xs text-slate-500">ไม่มียอดค้าง · ตอนบันทึกรายจ่าย เปิด "มีคนจะจ่ายคืน" ได้ เช่น รูดบัตรเติมน้ำมันให้ภรรยา</div>}
      {open.map((p) => (
        <div key={p.who} className="rounded-2xl border border-slate-200 p-3" data-testid="recv-person">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">{nameOf(p.who)}</div>
            <div className="num font-semibold text-amber-700">{M(p.owed)}</div>
          </div>
          <div className="mt-1.5 space-y-0.5">
            {p.open.map((it) => (
              <div key={it.id} className="flex justify-between text-[11px] text-slate-500">
                <span className="truncate">{tDate(it.date)} · {it.lend ? 'ให้ยืม' : catById[it.category]?.name || ''}{it.note ? ` · ${it.note}` : ''}{it.card ? ' · 💳' : ''}</span>
                <span className="num shrink-0 ml-2">{M(it.open)}{daysAgo(it.date) >= 7 ? ` · ${daysAgo(it.date)} วัน` : ''}</span>
              </div>
            ))}
          </div>
          <Button className="w-full mt-2.5 !py-2 text-sm" onClick={() => setRepay(p.who)} data-testid="recv-repay">ได้รับคืนแล้ว</Button>
        </div>
      ))}
      <button onClick={() => setLend(true)} className="ui-link text-xs font-semibold flex items-center gap-1"><Plus size={14} /> ให้ยืมเงินสด</button>
      <RepaySheet who={repay} onClose={() => setRepay(null)} person={receivables.by[repay]} name={repay ? nameOf(repay) : ''} />
      <LendSheet open={lend} onClose={() => setLend(false)} />
    </section>
  )
}

function RepaySheet({ who, onClose, person, name }) {
  const { accounts, settings, accById } = useVault()
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const T = settings.allocation.targets
  const owed = person?.owed || 0
  // card spending → the repayment goes to the debt reserve (it pays that bill); otherwise to spendable cash
  const def = person?.viaCard > 0 && T.reserve ? T.reserve : T.cash
  const [amt, setAmt] = useState('')
  const [acc, setAcc] = useState(null)
  const [date, setDate] = useState(todayISO())
  if (!who) return null
  const a = round2(Number(amt || owed) || 0)
  const to = acc || def
  const save = () => {
    if (!(a > 0)) return
    put('txn', { kind: 'repay', who, amount: a, account: to, date, note: `${name} คืนเงิน`, category: 'cat-repay', createdAt: new Date().toISOString() })
    sfx('coin'); showToast(`🤝 รับคืนจาก${name} ${money(a)} เข้า ${accById[to]?.name}`); setAmt(''); setAcc(null); onClose()
  }
  const pickable = accounts.filter((x) => !x.archived && ['cash', 'reserve', 'saving', 'invest'].includes(x.type))
  return (
    <Sheet open={!!who} onClose={onClose} title={`รับคืนจาก ${name}`}
      footer={<Button className="w-full" onClick={save} disabled={!(a > 0)} data-testid="repay-save">บันทึกรับคืน {money(a)}</Button>}>
      <div className="space-y-3">
        <div className="text-sm">ค้างอยู่ <b className="num">{money(owed)}</b></div>
        <label className="text-[11px] text-slate-500 block">จำนวนที่ได้รับ
          <input className="field num mt-0.5" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder={String(owed)} data-testid="repay-amt" />
        </label>
        <div>
          <div className="text-[11px] text-slate-500 mb-1">เงินเข้า</div>
          <div className="flex flex-wrap gap-1.5">
            {pickable.map((x) => <button key={x.id} onClick={() => setAcc(x.id)} className={`text-xs px-3 py-1.5 rounded-xl border ${to === x.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200'}`}>{x.name}</button>)}
          </div>
          {person?.viaCard > 0 && to === T.reserve && <div className="text-[11px] text-slate-500 mt-1.5">เข้า "กันชำระหนี้" เพราะเป็นยอดที่รูดบัตรไว้ จะได้พอจ่ายบัตรตอนครบรอบ</div>}
        </div>
        <label className="text-[11px] text-slate-500 block">วันที่<input type="date" className="field mt-0.5" value={date} onChange={(e) => setDate(e.target.value || todayISO())} /></label>
        <div className="text-[11px] text-slate-500">ไม่นับเป็นรายได้ และไม่เข้าการคำนวณภาษี</div>
      </div>
    </Sheet>
  )
}

function LendSheet({ open, onClose }) {
  const { accounts, settings, people } = useVault()
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const [who, setWho] = useState('')
  const [name, setName] = useState('')
  const [amt, setAmt] = useState('')
  const [acc, setAcc] = useState(settings.allocation.targets.cash)
  const [note, setNote] = useState('')
  const save = () => {
    let id = who
    if (!id && name.trim()) { id = `person-${Date.now().toString(36)}`; put('person', { id, name: name.trim() }) }
    if (!id || !(+amt > 0)) return
    put('txn', { kind: 'lend', who: id, amount: round2(+amt), account: acc, date: todayISO(), note: note.trim() || 'ให้ยืมเงิน', category: 'cat-lend', createdAt: new Date().toISOString() })
    sfx('save'); showToast('บันทึกให้ยืมแล้ว'); setAmt(''); setNote(''); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="ให้ยืมเงินสด" footer={<Button className="w-full" onClick={save} disabled={!(+amt > 0) || (!who && !name.trim())}>บันทึก</Button>}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {people.map((p) => <button key={p.id} onClick={() => { setWho(p.id); setName('') }} className={`text-xs px-3 py-1.5 rounded-xl border ${who === p.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200'}`}>{p.name}</button>)}
          <input className="field !py-1 !w-36 text-xs" placeholder="หรือพิมพ์ชื่อใหม่" value={name} onChange={(e) => { setName(e.target.value); setWho('') }} />
        </div>
        <input className="field num" inputMode="decimal" placeholder="จำนวนเงิน" value={amt} onChange={(e) => setAmt(e.target.value)} />
        <div className="flex flex-wrap gap-1.5">{accounts.filter((x) => !x.archived && ['cash', 'saving'].includes(x.type)).map((x) => <button key={x.id} onClick={() => setAcc(x.id)} className={`text-xs px-3 py-1.5 rounded-xl border ${acc === x.id ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200'}`}>จาก {x.name}</button>)}</div>
        <input className="field" placeholder="บันทึก (ไม่ใส่ก็ได้)" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Sheet>
  )
}
