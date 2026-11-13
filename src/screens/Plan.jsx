import { useEffect, useMemo, useState } from 'react'
import { Plus, Check, Trash2, Target, PiggyBank, Bell, BellRing, LineChart, BarChart3, Shield, Pencil, ArrowRightLeft } from 'lucide-react'
import { Sheet, Button, Segmented, Label, Money, IconBadge, IconPicker, ColorPicker, Empty } from '../components/ui'
import { AreaChart, MonthBars } from '../components/Charts'
import { AssetLogo } from '../components/Logos'
import { useStore, selectList } from '../store'
import { useVault } from '../lib/useVault'
import { netWorthSeries, monthlyStats, budgetStatus, goalStatus, debtPlan } from '../lib/plan'
import { assetPrice } from '../lib/prices'
import { assetLabel } from '../lib/portfolio'
import { evalAmount, money, monthLabel, round2, todayISO } from '../lib/format'
import { ICON_KEYS, COLORS } from '../lib/icons'

function Card({ icon: I, title, right, children, id }) {
  return (
    <section id={id} className="card p-4 md:p-5 scroll-mt-4">
      <div className="flex items-center gap-2 mb-3">
        <I size={18} className="text-emerald-600" />
        <h2 className="font-semibold flex-1">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}
const useList = (kind) => { const items = useStore((s) => s.items); return useMemo(() => selectList(items, kind), [items, kind]) }

export default function Plan({ onAdd }) {
  const v = useVault()
  const { accounts, txns, settings, balances, summary, catById } = v
  const snaps = useList('snap')
  const [range, setRange] = useState('3M')
  const series = useMemo(() => netWorthSeries(accounts, txns, settings, snaps), [accounts, txns, settings, snaps])
  const view = useMemo(() => {
    const n = { '1M': 31, '3M': 92, '1Y': 366, ALL: 99999 }[range]
    const s = series.slice(-n)
    if (s.length) s[s.length - 1] = { ...s[s.length - 1], value: summary.net, real: true }
    return s
  }, [series, range, summary.net])
  const change = view.length > 1 ? view[view.length - 1].value - view[0].value : 0
  const months = useMemo(() => monthlyStats(txns, 6), [txns])
  const cur = months[months.length - 1], prev = months[months.length - 2]

  return (
    <div className="space-y-5">
      <div className="pt-2">
        <h1 className="text-2xl font-bold">วางแผนการเงิน</h1>
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {[['nw', 'มูลค่าสุทธิ'], ['month', 'สรุปรายเดือน'], ['budget', 'งบประมาณ'], ['goal', 'เป้าหมาย'], ['debt', 'แผนปลดหนี้'], ['alert', 'แจ้งเตือนราคา']].map(([id, l]) => (
            <a key={id} href={`#plan`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">{l}</a>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card id="nw" icon={LineChart} title="มูลค่าสุทธิย้อนหลัง" right={<Segmented className="text-xs w-48" value={range} onChange={setRange} options={['1M', '3M', '1Y', 'ALL'].map((x) => ({ value: x, label: x }))} />}>
          <div className="flex items-baseline gap-3 mb-2">
            <Money value={summary.net} className="text-2xl font-bold" />
            {view.length > 1 && <span className={`text-sm font-semibold num ${change >= 0 ? 'text-emerald-600' : 'text-rose'}`}>{change >= 0 ? '▲' : '▼'} <Money value={Math.abs(change)} decimals={false} /> ใน {range === 'ALL' ? 'ทั้งหมด' : range}</span>}
          </div>
          <AreaChart data={view} />
          <div className="text-[11px] text-slate-400 mt-1">ระบบบันทึกมูลค่าจริงทุกวันที่เปิดแอป วันก่อนหน้านั้นประมาณจากรายการ (สินทรัพย์ลงทุนคิดตามต้นทุน)</div>
        </Card>

        <Card id="month" icon={BarChart3} title="สรุปรายเดือน">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[['รายรับ', cur.inc, prev.inc, true], ['รายจ่าย', cur.exp, prev.exp, false], ['เหลือเก็บ', cur.net, prev.net, true]].map(([l, a, b, goodUp]) => {
              const d = a - b, good = goodUp ? d >= 0 : d <= 0
              return (
                <div key={l} className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[11px] text-slate-500">{l}</div>
                  <Money value={a} decimals={false} className="font-semibold text-sm" />
                  {b !== 0 && <div className={`text-[10px] num ${good ? 'text-emerald-600' : 'text-rose'}`}>{d >= 0 ? '▲' : '▼'} {Math.abs(Math.round((d / Math.abs(b || 1)) * 100))}% จากเดือนก่อน</div>}
                </div>
              )
            })}
          </div>
          <MonthBars months={months} />
          <CategoryDiff cur={cur} prev={prev} catById={catById} />
        </Card>

        <Budgets />
        <Goals onAdd={onAdd} />
        <DebtPlanCard />
        <Alerts />
      </div>
    </div>
  )
}

function CategoryDiff({ cur, prev, catById }) {
  const rows = Object.keys({ ...cur.cats, ...prev.cats }).map((c) => ({ c, a: cur.cats[c] || 0, b: prev.cats[c] || 0 })).sort((x, y) => y.a - x.a).slice(0, 5)
  if (!rows.length) return null
  return (
    <div className="mt-4">
      <div className="text-xs text-slate-500 mb-2">{monthLabel(cur.key)} เทียบกับ {monthLabel(prev.key)}</div>
      {rows.map(({ c, a, b }) => {
        const cat = catById[c]
        return (
          <div key={c} className="flex items-center gap-2 py-1.5 text-sm">
            <IconBadge name={cat?.icon} color={cat?.color} size={28} icon={14} />
            <span className="flex-1 truncate">{cat?.name || 'อื่น ๆ'}</span>
            <Money value={a} decimals={false} className="w-20 text-right" />
            <span className={`w-16 text-right text-xs num ${a > b ? 'text-rose' : 'text-emerald-600'}`}>{b ? `${a > b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : a ? 'ใหม่' : ''}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- budgets ---------------- */
function Budgets() {
  const { categories, txns, catById } = useVault()
  const budgets = useList('budget')
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const [edit, setEdit] = useState(null)
  const status = useMemo(() => budgetStatus(budgets, txns), [budgets, txns])
  const total = status.reduce((s, b) => s + b.limit, 0), spent = status.reduce((s, b) => s + b.spent, 0)
  const free = categories.filter((c) => c.kind === 'expense' && !budgets.some((b) => b.category === c.id))

  return (
    <Card id="budget" icon={PiggyBank} title="งบประมาณรายหมวด (เดือนนี้)" right={<Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => setEdit({ category: free[0]?.id, limitStr: '' })}><Plus size={14} /> เพิ่ม</Button>}>
      {status.length === 0 ? <Empty icon="target" title="ยังไม่ได้ตั้งงบ" text="ตั้งงบรายเดือนให้หมวดที่ใช้บ่อย ระบบจะเตือนเมื่อใช้ไปเกิน 80%" /> : (
        <>
          <div className="text-xs text-slate-500 mb-3">ใช้ไป <Money value={spent} decimals={false} /> จากงบรวม <Money value={total} decimals={false} /></div>
          <div className="space-y-3">
            {status.map((b) => {
              const c = catById[b.category]
              const col = b.status === 'over' ? 'bg-rose-500' : b.status === 'warn' ? 'bg-amber-400' : b.status === 'fast' ? 'bg-sky-400' : 'bg-emerald-500'
              return (
                <button key={b.id} onClick={() => setEdit({ ...b, limitStr: String(b.limit) })} className="w-full text-left">
                  <div className="flex items-center gap-2 text-sm">
                    <IconBadge name={c?.icon} color={c?.color} size={30} icon={15} />
                    <span className="flex-1 font-medium truncate">{c?.name || 'หมวดที่ถูกลบ'}</span>
                    <span className="text-xs num"><Money value={b.spent} decimals={false} /> / <Money value={b.limit} decimals={false} /></span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 mt-1.5 overflow-hidden"><div className={`h-full rounded-full ${col}`} style={{ width: `${Math.min(100, b.ratio * 100)}%` }} /></div>
                  <div className={`text-[11px] mt-1 ${b.status === 'over' ? 'text-rose' : b.status === 'warn' ? 'text-amber-600' : 'text-slate-500'}`}>
                    {b.status === 'over' ? `เกินงบ ${money(-b.left, { decimals: false })}` : b.status === 'warn' ? `ใกล้เต็มงบ เหลือ ${money(b.left, { decimals: false })}` : b.status === 'fast' ? `ใช้เร็วกว่าที่ควร · ใช้ได้วันละ ${money(b.perDayLeft, { decimals: false })}` : `เหลือ ${money(b.left, { decimals: false })} · ใช้ได้วันละ ${money(b.perDayLeft, { decimals: false })}`}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title={edit.id ? 'แก้ไขงบประมาณ' : 'ตั้งงบประมาณ'}
          footer={<div className="flex gap-2">
            {edit.id && <Button variant="danger" onClick={() => { remove(edit.id, { label: 'ลบงบแล้ว' }); setEdit(null) }}><Trash2 size={17} /></Button>}
            <Button className="flex-1" disabled={!(evalAmount(edit.limitStr) > 0) || !edit.category} onClick={() => { put('budget', { id: edit.id || `bud-${edit.category}`, category: edit.category, limit: evalAmount(edit.limitStr) }); setEdit(null) }}><Check size={18} /> บันทึก</Button>
          </div>}>
          <Label>หมวด</Label>
          <div className="grid grid-cols-4 gap-2">
            {categories.filter((c) => c.kind === 'expense' && (c.id === edit.category || !budgets.some((b) => b.category === c.id))).map((c) => (
              <button key={c.id} disabled={!!edit.id} onClick={() => setEdit({ ...edit, category: c.id })} className={`flex flex-col items-center gap-1 py-2 rounded-2xl border ${edit.category === c.id ? 'bg-slate-100 border-slate-300' : 'border-transparent'}`}>
                <IconBadge name={c.icon} color={c.color} size={34} icon={16} /><span className="text-[11px] text-center leading-tight">{c.name}</span>
              </button>
            ))}
          </div>
          <Label className="mt-4">งบต่อเดือน (บาท)</Label>
          <input className="field num text-lg" inputMode="decimal" placeholder="เช่น 6000" value={edit.limitStr} onChange={(e) => setEdit({ ...edit, limitStr: e.target.value })} />
        </Sheet>
      )}
    </Card>
  )
}

/* ---------------- goals ---------------- */
function Goals({ onAdd }) {
  const { balances, accounts, settings } = useVault()
  const goals = useList('goal')
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const [edit, setEdit] = useState(null)

  const save = () => {
    const target = evalAmount(edit.targetStr)
    if (!edit.name.trim() || !(target > 0)) return
    let account = edit.account
    if (!account || account === '__new') {
      account = put('account', { name: `ออม: ${edit.name.trim()}`, type: 'saving', icon: edit.icon, color: edit.color, opening: 0, order: 50 + goals.length })
    }
    put('goal', { id: edit.id, name: edit.name.trim(), target, deadline: edit.deadline || null, icon: edit.icon, color: edit.color, account })
    setEdit(null)
  }

  return (
    <Card id="goal" icon={Target} title="เป้าหมายการออม" right={<Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => setEdit({ name: '', targetStr: '', deadline: '', icon: 'target', color: '#14b8a6', account: '__new' })}><Plus size={14} /> เพิ่ม</Button>}>
      {goals.length === 0 ? <Empty icon="piggy" title="ยังไม่มีเป้าหมาย" text="เช่น เงินสำรองฉุกเฉิน 6 เดือน, ทริปญี่ปุ่น, ดาวน์รถ ระบบจะบอกว่าต้องเก็บเดือนละเท่าไร" /> : (
        <div className="space-y-3">
          {goals.map((g) => {
            const st = goalStatus(g, balances)
            return (
              <div key={g.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                  <IconBadge name={g.icon} color={g.color} size={40} icon={19} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{g.name} {st.done && '🎉'}</div>
                    <div className="text-xs text-slate-500"><Money value={st.saved} decimals={false} /> / <Money value={g.target} decimals={false} />{g.deadline && ` · ภายใน ${monthLabel(g.deadline.slice(0, 7))}`}</div>
                  </div>
                  <button onClick={() => setEdit({ ...g, targetStr: String(g.target), deadline: g.deadline || '' })} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><Pencil size={15} /></button>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 mt-3 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${st.ratio * 100}%`, background: g.color }} /></div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-slate-500">{st.done ? 'บรรลุเป้าหมายแล้ว!' : st.perMonth != null ? `ต้องเก็บเดือนละ ${money(st.perMonth, { decimals: false })} (${st.monthsLeft} เดือน)` : `ขาดอีก ${money(st.left, { decimals: false })}`}</span>
                  {!st.done && <button onClick={() => onAdd({ kind: 'transfer', account: settings.allocation.targets.cash, to: g.account })} className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1"><ArrowRightLeft size={12} /> เติมเงิน</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title={edit.id ? 'แก้ไขเป้าหมาย' : 'เป้าหมายใหม่'}
          footer={<div className="flex gap-2">
            {edit.id && <Button variant="danger" onClick={() => { remove(edit.id, { label: 'ลบเป้าหมายแล้ว (กระเป๋าออมยังอยู่)' }); setEdit(null) }}><Trash2 size={17} /></Button>}
            <Button className="flex-1" onClick={save} disabled={!edit.name.trim() || !(evalAmount(edit.targetStr) > 0)}><Check size={18} /> บันทึก</Button>
          </div>}>
          <div className="flex items-center gap-3">
            <IconBadge name={edit.icon} color={edit.color} size={52} icon={24} />
            <input className="field text-lg font-semibold" placeholder="ชื่อเป้าหมาย เช่น ทริปญี่ปุ่น" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div><Label>จำนวนเงินเป้าหมาย</Label><input className="field num" inputMode="decimal" placeholder="0" value={edit.targetStr} onChange={(e) => setEdit({ ...edit, targetStr: e.target.value })} /></div>
            <div><Label>ภายในวันที่ (ไม่บังคับ)</Label><input type="date" className="field" value={edit.deadline} onChange={(e) => setEdit({ ...edit, deadline: e.target.value })} /></div>
          </div>
          {!edit.id && (
            <>
              <Label className="mt-4">เก็บเงินไว้ที่</Label>
              <select className="field" value={edit.account} onChange={(e) => setEdit({ ...edit, account: e.target.value })}>
                <option value="__new">สร้างกระเป๋าออมใหม่สำหรับเป้าหมายนี้ (แนะนำ)</option>
                {accounts.filter((a) => (a.type === 'saving' || a.type === 'cash' || a.type === 'invest') && !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </>
          )}
          <Label className="mt-4">สี</Label>
          <ColorPicker value={edit.color} onChange={(color) => setEdit({ ...edit, color })} colors={COLORS} />
          <Label className="mt-4">ไอคอน</Label>
          <IconPicker value={edit.icon} onChange={(icon) => setEdit({ ...edit, icon })} color={edit.color} keys={ICON_KEYS} />
        </Sheet>
      )}
    </Card>
  )
}

/* ---------------- debt payoff ---------------- */
function DebtPlanCard() {
  const { accounts, balances, settings } = useVault()
  const put = useStore((s) => s.put)
  const debts = accounts.filter((a) => (a.type === 'credit' || a.type === 'loan') && !a.archived && (balances[a.id] || 0) < 0)
  const rows = debts.map((a) => ({
    id: a.id, name: a.name, color: a.color, icon: a.icon, balance: -(balances[a.id] || 0),
    apr: a.apr ?? (a.type === 'credit' ? 16 : 25), minPct: a.type === 'credit' ? (a.minPct ?? 8) : 0, minFixed: a.type === 'loan' ? (a.installment || 0) : 0, isLoan: a.type === 'loan',
  }))
  const minTotal = rows.reduce((s, d) => s + Math.min(d.balance, Math.max(d.minFixed, (d.balance * d.minPct) / 100)), 0)
  const [budgetStr, setBudgetStr] = useState(settings.debtBudget ? String(settings.debtBudget) : '')
  const [strategy, setStrategy] = useState(settings.debtStrategy || 'avalanche')
  const budget = evalAmount(budgetStr) || Math.ceil(minTotal)
  const plan = useMemo(() => debtPlan(rows, budget, strategy), [JSON.stringify(rows), budget, strategy]) // eslint-disable-line
  const other = useMemo(() => debtPlan(rows, budget, strategy === 'avalanche' ? 'snowball' : 'avalanche'), [JSON.stringify(rows), budget, strategy]) // eslint-disable-line
  useEffect(() => {
    const t = setTimeout(() => { if (evalAmount(budgetStr) !== settings.debtBudget || strategy !== settings.debtStrategy) put('settings', { ...settings, debtBudget: evalAmount(budgetStr) || null, debtStrategy: strategy }) }, 800)
    return () => clearTimeout(t)
  }, [budgetStr, strategy]) // eslint-disable-line
  const setAcc = (id, patch) => { const a = accounts.find((x) => x.id === id); put('account', { ...a, ...patch }) }

  return (
    <Card id="debt" icon={Shield} title="แผนปลดหนี้">
      {rows.length === 0 ? <Empty icon="shield" title="ไม่มีหนี้คงค้าง 🎉" text="ยอดเยี่ยม! ไม่มีบอสหนี้ให้ต้องปราบ" /> : (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <Label>งบจ่ายหนี้ต่อเดือน (ขั้นต่ำรวม {money(minTotal, { decimals: false })})</Label>
              <input className="field num" inputMode="decimal" placeholder={String(Math.ceil(minTotal))} value={budgetStr} onChange={(e) => setBudgetStr(e.target.value)} />
            </div>
            <Segmented className="w-52 text-xs h-[50px]" value={strategy} onChange={setStrategy} options={[{ value: 'avalanche', label: 'ดอกสูงก่อน' }, { value: 'snowball', label: 'ก้อนเล็กก่อน' }]} />
          </div>
          {rows.some((d) => d.isLoan && !d.minFixed) && <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">ใส่ “ค่างวด” ของเงินกู้ด้านล่าง เพื่อให้คำนวณแผนได้ถูกต้อง</div>}
          {!plan.feasible ? (
            <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">งบต่ำกว่ายอดขั้นต่ำรวม หรือดอกเบี้ยโตเร็วกว่าที่จ่าย ลองเพิ่มงบต่อเดือน</div>
          ) : (
            <div className="mt-4 rounded-2xl grad-bg text-white p-4">
              <div className="text-sm text-white/80">ปลดหนี้หมดภายใน</div>
              <div className="text-2xl font-bold">{plan.months} เดือน <span className="text-base font-medium">· {monthLabel(plan.finish)}</span></div>
              <div className="text-sm text-white/85 mt-1">ดอกเบี้ยรวมประมาณ <b className="num">{money(plan.interest, { decimals: false })}</b></div>
              {other.feasible && other.interest !== plan.interest && (
                <div className="text-xs text-white/75 mt-1">ถ้าใช้วิธี{strategy === 'avalanche' ? 'ก้อนเล็กก่อน' : 'ดอกสูงก่อน'}: {other.months} เดือน · ดอกเบี้ย {money(other.interest, { decimals: false })}</div>
              )}
            </div>
          )}
          <div className="mt-4 space-y-2">
            {rows.map((d) => {
              const p = plan.debts?.find((x) => x.id === d.id)
              return (
                <div key={d.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <IconBadge name={d.icon} color={d.color} size={32} icon={15} />
                    <span className="flex-1 text-sm font-medium truncate">{d.name}</span>
                    <Money value={d.balance} decimals={false} className="text-sm font-semibold" />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 flex-wrap">
                    <label className="flex items-center gap-1">ดอกเบี้ย <input className="field !py-1 !px-2 !w-16 num text-xs" inputMode="decimal" defaultValue={d.apr} onBlur={(e) => setAcc(d.id, { apr: evalAmount(e.target.value) || 0 })} />%/ปี</label>
                    {d.isLoan && <label className="flex items-center gap-1">ค่างวด <input className="field !py-1 !px-2 !w-20 num text-xs" inputMode="decimal" defaultValue={d.minFixed || ''} placeholder="0" onBlur={(e) => setAcc(d.id, { installment: evalAmount(e.target.value) || 0 })} />฿/เดือน</label>}
                    {d.minPct > 0 && <label className="flex items-center gap-1">ขั้นต่ำ <input className="field !py-1 !px-2 !w-14 num text-xs" inputMode="decimal" defaultValue={d.minPct} onBlur={(e) => setAcc(d.id, { minPct: evalAmount(e.target.value) || 0 })} />%</label>}
                    {plan.feasible && p?.paidOff && <span className="ml-auto text-emerald-700 font-semibold">หมดเดือนที่ {p.paidOff}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">ตัวเลขเป็นการประมาณจากดอกเบี้ยและยอดปัจจุบัน ใส่อัตราดอกเบี้ยจริงของแต่ละหนี้เพื่อความแม่นยำ</div>
        </>
      )}
    </Card>
  )
}

/* ---------------- price alerts ---------------- */
function Alerts() {
  const { portfolio, assetById, quotes } = useVault()
  const alerts = useList('alert')
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const [edit, setEdit] = useState(null)
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const held = portfolio.holdings.map((h) => h.asset)
  const ccy = (a) => (a?.currency === 'USD' ? '$' : '฿')

  return (
    <Card id="alert" icon={Bell} title="แจ้งเตือนราคา" right={held.length > 0 && <Button variant="ghost" className="!py-1.5 !px-3 text-xs" onClick={() => setEdit({ assetId: held[0].id, op: '>=', priceStr: '' })}><Plus size={14} /> เพิ่ม</Button>}>
      {perm === 'default' && alerts.length > 0 && (
        <button onClick={async () => setPerm(await Notification.requestPermission())} className="w-full mb-3 rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-800 text-left flex items-center gap-2"><BellRing size={14} /> อนุญาตการแจ้งเตือนของเบราว์เซอร์ เพื่อให้เด้งเตือนแม้อยู่หน้าอื่น</button>
      )}
      {alerts.length === 0 ? <Empty icon="zap" title="ยังไม่มีการแจ้งเตือน" text={held.length ? 'ตั้งราคาเป้าหมาย เช่น BTC ต่ำกว่า $60,000 เพื่อรอซื้อ' : 'ซื้อสินทรัพย์ในหน้าพอร์ตก่อน แล้วตั้งแจ้งเตือนราคาได้'} /> : (
        <div className="space-y-2">
          {alerts.map((al) => {
            const a = assetById[al.assetId]
            const p = assetPrice(a, quotes)
            return (
              <button key={al.id} onClick={() => setEdit({ ...al, priceStr: String(al.price) })} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${al.triggeredAt ? 'bg-amber-50 border-amber-200' : 'border-slate-200'}`}>
                {a && <AssetLogo asset={a} size={36} />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a ? assetLabel(a) : '—'} {al.op === '>=' ? 'ขึ้นถึง' : 'ลงถึง'} {ccy(a)}{al.price.toLocaleString()}</div>
                  <div className="text-xs text-slate-500">ตอนนี้ {p != null ? `${ccy(a)}${p.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '—'}{al.triggeredAt ? ' · แจ้งเตือนแล้ว' : ''}</div>
                </div>
                {al.triggeredAt ? <BellRing size={18} className="text-amber-500" /> : <Bell size={18} className="text-slate-300" />}
              </button>
            )
          })}
        </div>
      )}
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title="แจ้งเตือนราคา"
          footer={<div className="flex gap-2">
            {edit.id && <Button variant="danger" onClick={() => { remove(edit.id); setEdit(null) }}><Trash2 size={17} /></Button>}
            <Button className="flex-1" disabled={!(evalAmount(edit.priceStr) > 0)} onClick={async () => {
              put('alert', { id: edit.id, assetId: edit.assetId, op: edit.op, price: evalAmount(edit.priceStr), triggeredAt: null })
              if (typeof Notification !== 'undefined' && Notification.permission === 'default') setPerm(await Notification.requestPermission())
              setEdit(null)
            }}><Check size={18} /> บันทึก</Button>
          </div>}>
          <Label>สินทรัพย์</Label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
            {held.map((a) => (
              <button key={a.id} onClick={() => setEdit({ ...edit, assetId: a.id })} className={`shrink-0 flex items-center gap-2 pl-2 pr-3 py-2 rounded-2xl border ${edit.assetId === a.id ? 'bg-slate-100 border-slate-300' : 'border-slate-200'}`}>
                <AssetLogo asset={a} size={28} /><span className="text-sm">{assetLabel(a)}</span>
              </button>
            ))}
          </div>
          <Label className="mt-4">เงื่อนไข</Label>
          <Segmented value={edit.op} onChange={(op) => setEdit({ ...edit, op })} options={[{ value: '>=', label: 'ราคาขึ้นถึง ▲' }, { value: '<=', label: 'ราคาลงถึง ▼' }]} />
          <Label className="mt-4">ราคา ({assetById[edit.assetId]?.currency || 'THB'}) · ตอนนี้ {assetPrice(assetById[edit.assetId], quotes)?.toLocaleString() ?? '—'}</Label>
          <input className="field num text-lg" inputMode="decimal" value={edit.priceStr} onChange={(e) => setEdit({ ...edit, priceStr: e.target.value })} />
        </Sheet>
      )}
    </Card>
  )
}

export { round2, todayISO }
