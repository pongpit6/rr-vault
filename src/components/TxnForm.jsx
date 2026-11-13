import { useEffect, useMemo, useRef, useState } from 'react'
import { Trash2, Check, ShieldCheck, Sparkles, CalendarDays, ArrowDown } from 'lucide-react'
import { Sheet, Button, Segmented, Icon, IconBadge, Label, Money } from './ui'
import { useStore, selectList } from '../store'
import { budgetStatus } from '../lib/plan'
import { monthKey } from '../lib/format'
import { useVault } from '../lib/useVault'
import { evalAmount, todayISO, round2, money } from '../lib/format'
import { allocate, computeBalances, summarize, rebalance } from '../lib/ledger'
import { isDebt } from '../lib/defaults'

const KINDS = [
  { value: 'expense', label: 'รายจ่าย', color: '#fb7185' },
  { value: 'income', label: 'รายรับ', color: '#34d399' },
  { value: 'transfer', label: 'โอน', color: '#38bdf8' },
  { value: 'payment', label: 'ชำระหนี้', color: '#a78bfa' },
]
const BUCKETS = [
  { key: 'reserve', label: 'กันชำระหนี้', icon: 'shield', color: '#a78bfa', order: '1' },
  { key: 'cash', label: 'เงินใช้ได้', icon: 'wallet', color: '#10b981', order: '2' },
  { key: 'invest', label: 'ลงทุน', icon: 'trending', color: '#38bdf8', order: '3' },
]

export function AccountChips({ accounts, value, onChange, balances, filter }) {
  const list = accounts.filter((a) => !a.archived && (!filter || filter(a)))
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
      {list.map((a) => (
        <button key={a.id} onClick={() => onChange(a.id)}
          className={`shrink-0 flex items-center gap-2 pl-2 pr-3 py-2 rounded-2xl border transition ${value === a.id ? 'bg-slate-900/[.06] border-slate-300' : 'bg-slate-900/[.025] border-slate-200/70 hover:bg-slate-900/[.04]'}`}>
          <IconBadge name={a.icon} color={a.color} size={30} icon={15} />
          <div className="text-left leading-tight">
            <div className="text-sm font-medium">{a.name}</div>
            <div className="text-[11px] text-slate-500"><Money value={balances[a.id] || 0} /></div>
          </div>
        </button>
      ))}
    </div>
  )
}

export default function TxnForm({ open, onClose, initial }) {
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const showToast = useStore((s) => s.showToast)
  const { accounts, txns, settings, categories, balances, accById, cycles } = useVault()
  const editing = !!initial?.id

  const firstOf = (type) => accounts.find((a) => a.type === type && !a.archived)?.id
  const [f, setF] = useState(null)
  const amountRef = useRef(null)

  useEffect(() => {
    if (!open) { setF(null); return }
    const kind = initial?.kind || 'expense'
    setF({
      kind,
      amountStr: initial?.amount ? String(initial.amount) : '',
      category: initial?.category || (kind === 'income' ? 'cat-salary' : 'cat-food'),
      account: initial?.account || (kind === 'payment' ? settings.allocation.targets.reserve : settings.allocation.targets.cash || firstOf('cash')),
      to: initial?.to || (kind === 'payment' ? firstOf('credit') : firstOf('invest')),
      date: initial?.date || todayISO(),
      note: initial?.note || '',
      earmark: initial?.earmark !== false,
      autoSplit: kind === 'income' ? (initial?.id ? !!initial.split : true) : true,
      pct: initial?.alloc?.pct || settings.allocation.pct,
      cap: initial?.alloc ? initial.alloc.cap : settings.allocation.capReserveAtGap,
    })
    setTimeout(() => amountRef.current?.focus(), 250)
  }, [open]) // eslint-disable-line

  // Summary without the transaction being edited, so the reserve gap is computed fairly.
  const baseSummary = useMemo(() => {
    if (!editing) return summarize(accounts, balances)
    const bal = computeBalances(accounts, txns.filter((t) => t.id !== initial.id), settings)
    return summarize(accounts, bal)
  }, [open, editing, balances]) // eslint-disable-line

  if (!open || !f) return <Sheet open={open} onClose={onClose} title="" />
  const set = (patch) => setF((s) => ({ ...s, ...patch }))
  const amount = evalAmount(f.amountStr)
  const valid = amount > 0
  const isExpr = /[+\-*/x×÷]/.test(f.amountStr.replace(/^-/, ''))
  const kindMeta = KINDS.find((k) => k.value === f.kind)
  const cats = categories.filter((c) => c.kind === (f.kind === 'income' ? 'income' : 'expense'))
  const T = settings.allocation.targets
  const split = f.kind === 'income' && f.autoSplit && valid ? allocate(amount, { pct: f.pct, capReserveAtGap: f.cap }, baseSummary.gap) : null
  const selAcc = accById[f.account]
  const debtTo = accById[f.to]

  const changeKind = (kind) => {
    const patch = { kind }
    if (kind === 'payment') { patch.account = T.reserve; patch.to = firstOf('credit') || firstOf('loan') }
    else if (kind === 'transfer') { patch.account = T.cash; patch.to = T.invest }
    else { patch.account = T.cash }
    if (kind === 'income' && !cats.find((c) => c.kind === 'income' && c.id === f.category)) patch.category = 'cat-salary'
    if (kind === 'expense' && categories.find((c) => c.id === f.category)?.kind !== 'expense') patch.category = 'cat-food'
    set(patch)
  }

  const save = () => {
    if (!valid) return
    const base = { id: initial?.id, kind: f.kind, amount, date: f.date, note: f.note.trim(), createdAt: initial?.createdAt || new Date().toISOString() }
    let t
    if (f.kind === 'expense') t = { ...base, category: f.category, account: f.account, earmark: isDebt(selAcc) && selAcc.type === 'credit' ? f.earmark : undefined }
    else if (f.kind === 'income') {
      t = { ...base, category: f.category }
      if (f.autoSplit) {
        const sp = allocate(amount, { pct: f.pct, capReserveAtGap: f.cap }, baseSummary.gap)
        t.split = { [T.reserve]: sp.reserve, [T.cash]: sp.cash, [T.invest]: sp.invest }
        // merge if two buckets point at the same account
        const merged = {}
        ;[[T.reserve, sp.reserve], [T.cash, sp.cash], [T.invest, sp.invest]].forEach(([k, v]) => { merged[k] = round2((merged[k] || 0) + v) })
        t.split = merged
        t.alloc = { pct: f.pct, cap: f.cap }
        t.account = T.cash
      } else t.account = f.account
    } else {
      if (!f.to || f.to === f.account) return
      t = { ...base, account: f.account, to: f.to, category: f.kind === 'payment' ? 'cat-payment' : 'cat-transfer' }
    }
    Object.keys(t).forEach((k) => t[k] === undefined && delete t[k])
    put('txn', t)
    let msg = editing ? 'แก้ไขรายการแล้ว' : `บันทึก${kindMeta.label} ${money(amount)} แล้ว`
    if (t.kind === 'expense') {
      const st = useStore.getState()
      const b = selectList(st.items, 'budget').find((x) => x.category === t.category)
      if (b && monthKey(t.date) === monthKey(todayISO())) {
        const [bs] = budgetStatus([b], selectList(st.items, 'txn'))
        const cname = categories.find((c) => c.id === t.category)?.name
        if (bs.status === 'over') msg = `⚠️ หมวด${cname}เกินงบแล้ว ${money(-bs.left, { decimals: false })}`
        else if (bs.status === 'warn') msg = `⚠️ หมวด${cname}ใช้ไป ${Math.round(bs.ratio * 100)}% ของงบ เหลือ ${money(bs.left, { decimals: false })}`
      }
    }
    showToast(msg)
    onClose()
  }

  const del = () => { remove(initial.id); onClose() }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'แก้ไขรายการ' : 'บันทึกรายการ'}
      footer={
        <div className="flex gap-2">
          {editing && <Button variant="danger" onClick={del} className="px-4"><Trash2 size={18} /> ลบ</Button>}
          <Button onClick={save} disabled={!valid} className="flex-1"><Check size={18} /> {editing ? 'บันทึกการแก้ไข' : 'บันทึก'}</Button>
        </div>
      }>
      <Segmented options={KINDS} value={f.kind} onChange={changeKind} />

      {/* amount */}
      <div className="mt-5 text-center">
        <div className="flex items-baseline justify-center gap-1" style={{ color: kindMeta.color }}>
          <span className="text-2xl font-semibold opacity-70">฿</span>
          <input
            ref={amountRef}
            value={f.amountStr}
            onChange={(e) => set({ amountStr: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            inputMode="decimal"
            placeholder="0"
            className="num bg-transparent outline-none text-5xl font-bold text-center w-full max-w-[280px] placeholder:text-slate-300"
          />
        </div>
        <div className="h-5 text-xs text-slate-500 num">
          {isExpr && valid ? `= ${money(amount)}` : 'พิมพ์สูตรได้ เช่น 120+45'}
        </div>
      </div>

      {/* category */}
      {(f.kind === 'expense' || f.kind === 'income') && (
        <div className="mt-4">
          <Label>หมวดหมู่</Label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {cats.map((c) => (
              <button key={c.id} onClick={() => set({ category: c.id })}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl border transition ${f.category === c.id ? 'bg-slate-900/[.06] border-slate-300' : 'border-transparent hover:bg-slate-900/[.04]'}`}>
                <IconBadge name={c.icon} color={c.color} size={36} icon={17} />
                <span className="text-[11px] leading-tight text-center line-clamp-2 text-slate-600">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* accounts */}
      {f.kind === 'expense' && (
        <div className="mt-4">
          <Label>จ่ายจาก</Label>
          <AccountChips accounts={accounts} balances={balances} value={f.account} onChange={(v) => set({ account: v })} filter={(a) => a.type !== 'loan'} />
          {selAcc?.type === 'credit' && (
            <button onClick={() => set({ earmark: !f.earmark })}
              className={`mt-3 w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition ${f.earmark ? 'bg-violet-400/10 border-violet-400/30' : 'bg-slate-900/[.025] border-slate-200/70'}`}>
              <ShieldCheck size={20} className={f.earmark ? 'text-violet-600' : 'text-slate-500'} />
              <div className="flex-1 text-sm">
                <div className="font-medium">กันเงินชำระบัตรอัตโนมัติ</div>
                <div className="text-xs text-slate-500">ย้ายยอดนี้จาก “{accById[settings.earmarkFrom]?.name || 'เงินใช้ได้'}” ไป “{accById[T.reserve]?.name}” ทันที</div>
              </div>
              <div className={`w-11 h-6 rounded-full p-0.5 transition ${f.earmark ? 'bg-violet-400' : 'bg-slate-900/10'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition ${f.earmark ? 'translate-x-5' : ''}`} />
              </div>
            </button>
          )}
        </div>
      )}

      {f.kind === 'income' && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="!mb-0">แบ่งเงินเข้ากระเป๋า</Label>
            <Segmented className="w-56 text-xs" value={f.autoSplit ? 'auto' : 'one'} onChange={(v) => set({ autoSplit: v === 'auto' })}
              options={[{ value: 'auto', label: 'แบ่งอัตโนมัติ' }, { value: 'one', label: 'เข้าที่เดียว' }]} />
          </div>
          {f.autoSplit ? (
            <AllocationEditor pct={f.pct} cap={f.cap} onPct={(pct) => set({ pct })} onCap={(cap) => set({ cap })} split={split} gap={baseSummary.gap} compact />
          ) : (
            <AccountChips accounts={accounts} balances={balances} value={f.account} onChange={(v) => set({ account: v })} filter={(a) => !isDebt(a)} />
          )}
        </div>
      )}

      {(f.kind === 'transfer' || f.kind === 'payment') && (
        <div className="mt-4 space-y-2">
          <Label>จาก</Label>
          <AccountChips accounts={accounts} balances={balances} value={f.account} onChange={(v) => set({ account: v })} filter={(a) => f.kind === 'transfer' || !isDebt(a)} />
          <div className="flex justify-center text-slate-500"><ArrowDown size={18} /></div>
          <Label>{f.kind === 'payment' ? 'ชำระให้' : 'ไปที่'}</Label>
          <AccountChips accounts={accounts} balances={balances} value={f.to} onChange={(v) => set({ to: v })}
            filter={(a) => a.id !== f.account && (f.kind === 'transfer' || isDebt(a))} />
          {f.kind === 'payment' && debtTo && (
            <div className="flex flex-wrap gap-2 pt-1">
              {cycles[debtTo.id]?.billDue > 0 && (
                <button onClick={() => set({ amountStr: String(cycles[debtTo.id].billDue) })} className="px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 font-semibold hover:bg-violet-100 text-xs">
                  ยอดบิลรอบนี้ {money(cycles[debtTo.id].billDue)}
                </button>
              )}
              {(balances[debtTo.id] || 0) < 0 && (
                <button onClick={() => set({ amountStr: String(-balances[debtTo.id]) })} className="px-3 py-1.5 rounded-xl bg-slate-900/[.04] hover:bg-slate-900/[.06] text-xs">
                  จ่ายเต็ม {money(-balances[debtTo.id])}
                </button>
              )}
              {debtTo.type === 'loan' && debtTo.installment > 0 && (
                <button onClick={() => set({ amountStr: String(debtTo.installment) })} className="px-3 py-1.5 rounded-xl bg-slate-900/[.04] hover:bg-slate-900/[.06] text-xs">
                  ค่างวด {money(debtTo.installment)}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* date + note */}
      <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-2">
        <div>
          <Label>วันที่</Label>
          <div className="relative">
            <input type="date" className="field pr-2" value={f.date} onChange={(e) => set({ date: e.target.value || todayISO() })} />
          </div>
        </div>
        <div>
          <Label>บันทึกช่วยจำ</Label>
          <input className="field" placeholder="เช่น ข้าวมันไก่" value={f.note} onChange={(e) => set({ note: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
      </div>
    </Sheet>
  )
}

export function AllocationEditor({ pct, cap, onPct, onCap, split, gap, compact = false }) {
  return (
    <div className={`rounded-2xl bg-slate-900/[.025] border border-slate-200/70 ${compact ? 'p-3' : 'p-4'}`}>
      {/* stacked bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-4">
        {BUCKETS.map((b) => <div key={b.key} style={{ width: `${pct[b.key]}%`, background: b.color }} className="transition-all" />)}
      </div>
      <div className="space-y-4">
        {BUCKETS.map((b) => (
          <div key={b.key}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold w-4 h-4 grid place-items-center rounded-full bg-slate-900/[.06] text-slate-600">{b.order}</span>
              <Icon name={b.icon} size={15} className="opacity-90" />
              <span className="text-sm flex-1" style={{ color: b.color }}>{b.label}</span>
              {split && <span className="text-sm font-semibold num">{money(split[b.key])}</span>}
              <span className="text-xs text-slate-500 w-10 text-right num">{pct[b.key]}%</span>
            </div>
            <input type="range" min="0" max="100" value={pct[b.key]} className="slider" style={{ '--thumb': b.color }}
              onChange={(e) => onPct(rebalance(pct, b.key, Number(e.target.value)))} />
          </div>
        ))}
      </div>
      <button onClick={() => onCap(!cap)} className="mt-4 w-full flex items-center gap-3 text-left">
        <Sparkles size={16} className={cap ? 'text-emerald-600' : 'text-slate-500'} />
        <div className="flex-1 text-xs text-slate-600">
          กันหนี้เท่าที่ยังขาด {gap !== undefined && <>(ตอนนี้ขาด <span className="num text-slate-900">{money(gap)}</span>)</>} ส่วนเกินแบ่งไปกระเป๋าอื่นอัตโนมัติ
        </div>
        <div className={`w-10 h-[22px] rounded-full p-0.5 transition shrink-0 ${cap ? 'bg-mint' : 'bg-slate-900/10'}`}>
          <div className={`w-[18px] h-[18px] rounded-full bg-white transition ${cap ? 'translate-x-[18px]' : ''}`} />
        </div>
      </button>
    </div>
  )
}
