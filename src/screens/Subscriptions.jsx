import { useEffect, useMemo, useState } from 'react'
import { Plus, Check, Trash2, Search, Pause, Play, CalendarClock, Repeat } from 'lucide-react'
import { Sheet, Button, Segmented, Label, Money, Empty } from '../components/ui'
import { SubLogo } from '../components/Logos'
import { AccountChips } from '../components/TxnForm'
import { useStore, selectList } from '../store'
import { useVault } from '../lib/useVault'
import { SUB_PRESETS, monthlyOf, thbOf, processDueSubs, addCycle } from '../lib/subs'
import { fxUSDTHB } from '../lib/prices'
import { evalAmount, shortDate, todayISO, money, round2 } from '../lib/format'
import { isDebt } from '../lib/defaults'

const CYCLES = { monthly: 'รายเดือน', yearly: 'รายปี', weekly: 'รายสัปดาห์' }
const daysUntil = (iso) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d) - t) / 864e5) }

export function useSubs() {
  const items = useStore((s) => s.items)
  return useMemo(() => selectList(items, 'sub').sort((a, b) => (a.nextDate || '').localeCompare(b.nextDate || '')), [items])
}

export default function Subscriptions() {
  const subs = useSubs()
  const { quotes, accById } = useVault()
  const fx = fxUSDTHB(quotes)
  const [edit, setEdit] = useState(null)
  const active = subs.filter((s) => s.active)
  const monthly = round2(active.reduce((t, s) => t + monthlyOf(s, fx), 0))

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">Subscription</h1>
        <Button className="!py-2 text-sm" onClick={() => setEdit({})}><Plus size={16} /> เพิ่ม</Button>
      </div>

      <section className="hero p-5">
        <div className="text-sm text-white/75">ค่าใช้จ่ายรายเดือน (เฉลี่ย)</div>
        <Money value={monthly} className="text-3xl font-bold" />
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/15 px-3 py-2.5"><div className="text-xs text-white/70">ต่อปี</div><Money value={monthly * 12} className="font-semibold" /></div>
          <div className="rounded-2xl bg-white/15 px-3 py-2.5"><div className="text-xs text-white/70">กำลังใช้งาน</div><span className="font-semibold">{active.length} รายการ</span></div>
        </div>
      </section>

      {subs.length === 0 ? (
        <Empty icon="repeat" title="ยังไม่มี Subscription" text="เพิ่ม Netflix, Spotify, YouTube ฯลฯ แล้วระบบจะตัดเงินให้อัตโนมัติเมื่อถึงรอบ"
          action={<Button onClick={() => setEdit({})}><Plus size={18} /> เพิ่ม Subscription</Button>} />
      ) : (
        <section className="card divide-y divide-slate-100">
          {subs.map((s) => {
            const d = s.nextDate ? daysUntil(s.nextDate) : null
            return (
              <button key={s.id} onClick={() => setEdit(s)} className={`w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition first:rounded-t-[20px] last:rounded-b-[20px] ${s.active ? '' : 'opacity-50'}`}>
                <SubLogo sub={s} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {CYCLES[s.cycle]} · {accById[s.account]?.name || '—'}{!s.active && ' · หยุดชั่วคราว'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold num">{s.currency === 'USD' ? `$${s.amount}` : <Money value={s.amount} decimals={false} />}</div>
                  {s.active && d !== null && (
                    <div className={`text-[11px] ${d <= 3 ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                      {d === 0 ? 'ตัดวันนี้' : d === 1 ? 'ตัดพรุ่งนี้' : d < 0 ? 'เลยกำหนด' : `อีก ${d} วัน · ${shortDate(s.nextDate)}`}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </section>
      )}
      <SubForm open={!!edit} initial={edit} onClose={() => setEdit(null)} />
    </div>
  )
}

export function SubForm({ open, initial, onClose }) {
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const { accounts, balances, settings, quotes } = useVault()
  const [f, setF] = useState(null)
  const [q, setQ] = useState('')
  const editing = !!initial?.id

  useEffect(() => {
    if (!open) { setF(null); setQ(''); return }
    const card = accounts.find((a) => a.type === 'credit' && !a.archived)
    setF({
      name: '', domain: '', amountStr: '', currency: 'THB', cycle: 'monthly', nextDate: todayISO(), account: card?.id || settings.allocation.targets.cash,
      auto: true, active: true, ...initial, ...(initial?.amount ? { amountStr: String(initial.amount) } : {}),
      step: initial?.id ? 'form' : 'pick',
    })
  }, [open]) // eslint-disable-line
  if (!open || !f) return null
  const set = (p) => setF((s) => ({ ...s, ...p }))
  const amount = evalAmount(f.amountStr)
  const presets = SUB_PRESETS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  const fx = fxUSDTHB(quotes)

  const save = () => {
    if (!f.name.trim() || !(amount > 0)) return
    const data = { id: initial?.id, name: f.name.trim(), domain: f.domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''), amount, currency: f.currency, cycle: f.cycle, nextDate: f.nextDate, account: f.account, auto: f.auto, active: f.active, category: 'cat-sub' }
    if (!data.id) delete data.id
    put('sub', data)
    setTimeout(processDueSubs, 50)
    onClose()
  }

  if (f.step === 'pick') {
    return (
      <Sheet open onClose={onClose} title="เพิ่ม Subscription" wide>
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="field !pl-10" placeholder="ค้นหาบริการ เช่น Netflix" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {presets.map((p) => (
            <button key={p.name} onClick={() => set({ name: p.name, domain: p.domain, step: 'form' })} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition">
              <SubLogo sub={p} size={40} />
              <span className="text-xs text-center leading-tight">{p.name}</span>
            </button>
          ))}
          <button onClick={() => set({ name: q, step: 'form' })} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-slate-300 hover:bg-slate-50">
            <Plus size={22} className="text-slate-400" /><span className="text-xs text-slate-500">กำหนดเอง</span>
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet open onClose={onClose} title={editing ? 'แก้ไข Subscription' : 'รายละเอียด Subscription'}
      footer={<div className="flex gap-2">
        {editing && <Button variant="danger" onClick={() => { remove(initial.id, { label: 'ลบ Subscription แล้ว' }); onClose() }}><Trash2 size={17} /></Button>}
        {editing && <Button variant="ghost" onClick={() => { put('sub', { ...initial, active: !initial.active }); onClose() }}>{initial.active ? <><Pause size={16} /> หยุด</> : <><Play size={16} /> ใช้ต่อ</>}</Button>}
        <Button className="flex-1" onClick={save} disabled={!f.name.trim() || !(amount > 0)}><Check size={18} /> บันทึก</Button>
      </div>}>
      <div className="flex items-center gap-3">
        <SubLogo sub={{ name: f.name, domain: f.domain }} size={52} />
        <input className="field text-lg font-semibold" placeholder="ชื่อบริการ" value={f.name} onChange={(e) => set({ name: e.target.value })} />
      </div>
      <Label className="mt-3">เว็บไซต์ของบริการ (ใช้แสดงโลโก้จริง)</Label>
      <input className="field" placeholder="เช่น netflix.com" value={f.domain} onChange={(e) => set({ domain: e.target.value })} />

      <div className="grid grid-cols-[1fr_auto] gap-2 mt-4">
        <div>
          <Label>ราคาต่อรอบ</Label>
          <input className="field num text-lg" inputMode="decimal" placeholder="0" value={f.amountStr} onChange={(e) => set({ amountStr: e.target.value })} />
        </div>
        <div>
          <Label>สกุลเงิน</Label>
          <Segmented className="h-[50px]" value={f.currency} onChange={(currency) => set({ currency })} options={[{ value: 'THB', label: '฿ THB' }, { value: 'USD', label: '$ USD' }]} />
        </div>
      </div>
      {f.currency === 'USD' && amount > 0 && <div className="text-xs text-slate-500 mt-1">≈ {money(amount * fx)} (เรต {fx.toFixed(2)})</div>}

      <Label className="mt-4">รอบการชำระ</Label>
      <Segmented value={f.cycle} onChange={(cycle) => set({ cycle })} options={Object.entries(CYCLES).map(([value, label]) => ({ value, label }))} />

      <Label className="mt-4">ตัดเงินครั้งถัดไป</Label>
      <input type="date" className="field" value={f.nextDate} onChange={(e) => set({ nextDate: e.target.value || todayISO() })} />
      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><CalendarClock size={13} /> รอบถัดจากนั้น {shortDate(addCycle(f.nextDate, f.cycle))}</div>

      <Label className="mt-4">ตัดจาก</Label>
      <AccountChips accounts={accounts} balances={balances} value={f.account} onChange={(account) => set({ account })} filter={(a) => a.type !== 'loan' && a.type !== 'invest'} />

      <button onClick={() => set({ auto: !f.auto })} className="mt-4 w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 text-left">
        <Repeat size={18} className={f.auto ? 'text-emerald-600' : 'text-slate-400'} />
        <div className="flex-1 text-sm"><div className="font-medium">บันทึกรายจ่ายอัตโนมัติเมื่อถึงรอบ</div><div className="text-xs text-slate-500">ถ้าตัดผ่านบัตรเครดิต ระบบจะกันเงินชำระบัตรให้ด้วย</div></div>
        <div className={`w-11 h-6 rounded-full p-0.5 transition ${f.auto ? 'bg-ac' : 'bg-slate-900/10'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transition ${f.auto ? 'translate-x-5' : ''}`} /></div>
      </button>
    </Sheet>
  )
}

export { thbOf, isDebt }
