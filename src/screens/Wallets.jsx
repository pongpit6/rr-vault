import { useEffect, useState } from 'react'
import { Plus, Pencil, Scale, Archive, Trash2, Check, Info, ListFilter } from 'lucide-react'
import { Sheet, Button, Money, IconBadge, Label, IconPicker, ColorPicker, Segmented, Progress } from '../components/ui'
import { AllocationEditor } from '../components/TxnForm'
import TxnRow from '../components/TxnRow'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { ACCOUNT_TYPES, isDebt } from '../lib/defaults'
import { ICON_KEYS, COLORS } from '../lib/icons'
import { evalAmount, money, round2, todayISO, shortDate, monthLabel, shiftMonth } from '../lib/format'
import { postingsOf } from '../lib/ledger'

export default function Wallets({ onEdit, go }) {
  const { accounts, balances, summary, settings, txns, catById, accById, cycles } = useVault()
  const put = useStore((s) => s.put)
  const [editAcc, setEditAcc] = useState(null)
  const [detail, setDetail] = useState(null)

  const groups = [
    { title: 'สินทรัพย์', items: accounts.filter((a) => !a.archived && !isDebt(a)) },
    { title: 'หนี้สิน', items: accounts.filter((a) => !a.archived && isDebt(a)) },
  ]
  const archived = accounts.filter((a) => a.archived)
  // card installment loans still use the card's credit line until each installment is billed
  const linkedOwed = (card) => accounts.filter((l) => l.viaCard === card.id && !l.archived).reduce((t, l) => t + Math.max(0, -(balances[l.id] || 0)), 0)
  const instLeft = (l) => { const owed = Math.max(0, -(balances[l.id] || 0)); return l.instPrincipal > 0 ? Math.ceil(owed / l.instPrincipal - 1e-9) : '-' }
  const alloc = settings.allocation
  const saveAlloc = (patch) => put('settings', { ...settings, allocation: { ...alloc, ...patch } })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">กระเป๋า</h1>
        <div className="flex gap-2">
          <Button variant="ghost" className="!py-2 text-sm md:hidden" onClick={() => go?.('subs')}>Subscription</Button>
          <Button variant="ghost" className="!py-2 text-sm" onClick={() => setEditAcc({})}><Plus size={16} /> เพิ่มกระเป๋า</Button>
        </div>
      </div>

      {/* total tree */}
      <section className="hero p-5">
        <div className="flex items-center gap-3">
          <IconBadge name="vault" color="#ffffff" size={44} icon={22} />
          <div>
            <div className="text-sm text-white/70">กระเป๋ารวม · มูลค่าสุทธิ</div>
            <Money value={summary.net} className="text-3xl font-bold" />
          </div>
        </div>
        <div className="mt-4 flex h-2.5 rounded-full overflow-hidden bg-white/25">
          {accounts.filter((a) => !a.archived && !isDebt(a) && balances[a.id] > 0).map((a) => (
            <div key={a.id} style={{ width: `${(balances[a.id] / Math.max(1, summary.assets)) * 100}%`, background: a.color }} title={a.name} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
          {accounts.filter((a) => !a.archived && !isDebt(a)).map((a) => (
            <span key={a.id} className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: a.color }} />{a.name}</span>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.title}>
              <div className="flex justify-between items-center px-1 mb-2 text-sm">
                <span className="text-slate-500">{g.title}</span>
                <Money value={g.title === 'หนี้สิน' ? -summary.debts : summary.assets} className="text-slate-600" />
              </div>
              <div className="card divide-y divide-slate-100">
                {g.items.map((a) => {
                  const b = balances[a.id] || 0
                  const owed = Math.max(0, -b)
                  return (
                    <button key={a.id} onClick={() => setDetail(a.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-900/[.025] transition first:rounded-t-[20px] last:rounded-b-[20px]">
                      <IconBadge name={a.icon} color={a.color} size={42} icon={19} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{a.name}</div>
                        <div className="text-xs text-slate-500 truncate">
                          {cycles[a.id] ? <>บิลรอบนี้ <Money value={cycles[a.id].billDue} decimals={false} /> · จ่ายภายใน {shortDate(cycles[a.id].dueDate)}{a.limit > 0 && <> · วงเงินเหลือ <Money value={a.limit - owed - linkedOwed(a)} decimals={false} /></>}</> :
                          a.type === 'credit' && a.limit > 0 ? <>วงเงินเหลือ <Money value={a.limit - owed - linkedOwed(a)} /></> :
                            a.type === 'loan' && a.viaCard ? (instLeft(a) === 0 ? <>ผ่อนครบแล้ว 🎉 · เก็บถาวรได้</> : <>ผ่อนผ่าน {accById[a.viaCard]?.name} · <Money value={a.installment} decimals={false} />/เดือน · เหลือ {instLeft(a)} งวด</>) :
                          a.type === 'loan' && a.installment > 0 ? <>ค่างวด <Money value={a.installment} /> · ทุกวันที่ {a.dueDay}</> :
                              ACCOUNT_TYPES[a.type]?.desc}
                        </div>
                        {a.type === 'credit' && a.limit > 0 && <Progress value={owed / a.limit} className="mt-2 !h-1.5" color="bg-rose" />}
                      </div>
                      <Money value={b} className={`font-semibold ${b < 0 ? 'text-rose' : ''}`} />
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
          {archived.length > 0 && (
            <div className="text-xs text-slate-500 px-1">เก็บถาวร: {archived.map((a) => <button key={a.id} className="underline mr-2" onClick={() => setDetail(a.id)}>{a.name}</button>)}</div>
          )}
        </div>

        <section>
          <div className="px-1 mb-2 text-sm text-slate-500">ระบบแบ่งเงินอัตโนมัติ (ค่าเริ่มต้นทุกครั้งที่มีรายรับ)</div>
          <AllocationEditor pct={alloc.pct} cap={alloc.capReserveAtGap} gap={summary.gap}
            onPct={(pct) => saveAlloc({ pct })} onCap={(capReserveAtGap) => saveAlloc({ capReserveAtGap })}
            split={null} confirm />
          <div className="card mt-3 p-4 space-y-3">
            <div className="text-sm font-medium">ปลายทางของแต่ละส่วน</div>
            {[['reserve', '① กันชำระหนี้'], ['cash', '② เงินใช้ได้'], ['invest', '③ ลงทุน']].map(([k, label]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-28 shrink-0">{label}</span>
                <select className="field !py-2" value={alloc.targets[k]} onChange={(e) => saveAlloc({ targets: { ...alloc.targets, [k]: e.target.value } })}>
                  {accounts.filter((a) => !isDebt(a) && !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-28 shrink-0">รูดบัตรแล้วกันเงินจาก</span>
              <select className="field !py-2" value={settings.earmarkFrom} onChange={(e) => put('settings', { ...settings, earmarkFrom: e.target.value })}>
                {accounts.filter((a) => !isDebt(a) && !a.archived).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 text-xs text-slate-500 pt-1"><Info size={14} className="shrink-0 mt-0.5" />
              ลำดับการแบ่งคือ ① หนี้ ② ใช้ได้ ③ ลงทุน และปรับเฉพาะครั้งได้ในหน้าบันทึกรายรับ</div>
          </div>
        </section>
      </div>

      <AccountForm open={!!editAcc} initial={editAcc} onClose={() => setEditAcc(null)} />
      <AccountDetail id={detail} onClose={() => setDetail(null)} onEditAcc={(a) => { setDetail(null); setEditAcc(a) }} onEditTxn={onEdit} />
    </div>
  )
}

function AccountDetail({ id, onClose, onEditAcc, onEditTxn }) {
  const { accounts, balances, txns, catById, accById, settings } = useVault()
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const [adj, setAdj] = useState('')
  const a = accById[id]
  useEffect(() => setAdj(''), [id])
  if (!a) return null
  const b = balances[a.id] || 0
  const related = txns.filter((t) => postingsOf(t, accById, settings).some((p) => p.acc === a.id)).slice(0, 30)
  const debt = isDebt(a)
  const doAdjust = () => {
    let target = evalAmount(adj)
    if (!Number.isFinite(target)) return
    if (debt) target = -Math.abs(target)
    const diff = round2(target - b)
    if (!diff) return
    put('txn', { kind: 'adjust', amount: diff, account: a.id, date: todayISO(), note: '', createdAt: new Date().toISOString() })
    showToast(`ปรับยอด ${a.name} เป็น ${money(target)} แล้ว`)
    setAdj('')
  }
  return (
    <Sheet open={!!a} onClose={onClose} title={a.name} wide>
      <div className="flex items-center gap-4">
        <IconBadge name={a.icon} color={a.color} size={56} icon={26} />
        <div className="flex-1">
          <div className="text-xs text-slate-500">{debt ? 'ยอดค้างชำระ' : 'ยอดคงเหลือ'}</div>
          <Money value={debt ? -b : b} className={`text-3xl font-bold ${debt && b < 0 ? 'text-rose' : ''}`} />
        </div>
        <Button variant="ghost" className="!py-2 text-sm" onClick={() => onEditAcc(a)}><Pencil size={15} /> แก้ไข</Button>
      </div>

      {a.type === 'credit' && (() => {
        const loans = accounts.filter((l) => l.viaCard === a.id && !l.archived)
        const owedCard = Math.max(0, -b)
        const owedLoans = loans.reduce((t, l) => t + Math.max(0, -(balances[l.id] || 0)), 0)
        const avail = (a.limit || 0) - owedCard - owedLoans
        return (
          <div className="mt-5 card p-4">
            <div className="text-sm font-semibold mb-2">วงเงินบัตร</div>
            {a.limit > 0 ? (
              <>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  <div className="bg-rose-400" style={{ width: `${Math.min(100, (owedCard / a.limit) * 100)}%` }} />
                  <div className="bg-orange-300" style={{ width: `${Math.min(100, (owedLoans / a.limit) * 100)}%` }} />
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" />ยอดใช้บัตร (ขึ้นบิลแล้ว + รอบใหม่)</span><Money value={owedCard} decimals={false} /></div>
                  <div className="flex justify-between"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-300" />เงินสดผ่อนที่ยังไม่ขึ้นบิล</span><Money value={owedLoans} decimals={false} /></div>
                  <div className="flex justify-between font-semibold text-sm pt-1"><span>วงเงินคงเหลือ</span><Money value={avail} decimals={false} className={avail < 0 ? 'text-rose' : 'text-emerald-600'} /></div>
                  <div className="text-[11px] text-slate-500">วงเงินจะคืนกลับเมื่อบันทึกชำระบิลบัตร (รวมค่างวดผ่อนที่อยู่ในบิล)</div>
                </div>
              </>
            ) : <div className="text-xs text-slate-500">ยังไม่ได้ใส่วงเงินบัตร กด “แก้ไข” เพื่อใส่</div>}
            <div className="mt-4 text-sm font-semibold">เงินสดผ่อนผ่านบัตรนี้ ({loans.length})</div>
            <div className="mt-1 space-y-1">
              {loans.map((l) => (
                <button key={l.id} onClick={() => onEditAcc(l)} className="w-full flex items-center gap-2 py-1.5 text-left text-sm">
                  <IconBadge name={l.icon} color={l.color} size={28} icon={14} />
                  <span className="flex-1 truncate">{l.name}</span>
                  <span className="text-xs text-slate-500"><Money value={l.installment} decimals={false} />/งวด</span>
                  <Money value={Math.max(0, -(balances[l.id] || 0))} decimals={false} className="w-20 text-right" />
                </button>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-2 !py-2 text-sm" onClick={() => onEditAcc({ type: 'loan', name: `ผ่อนบัตร ก้อนที่ ${loans.length + 1}`, icon: 'bank', color: '#f97316', viaCard: a.id, instStart: shiftMonth(todayISO().slice(0, 7), 1) })}>
              <Plus size={15} /> เพิ่มเงินสดผ่อนอีกก้อน
            </Button>
          </div>
        )
      })()}

      <div className="mt-5 card p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Scale size={16} className="text-sky" /> ปรับยอดให้ตรงความจริง</div>
        <div className="text-xs text-slate-500 mt-1">ใส่{debt ? 'ยอดหนี้คงค้าง' : 'ยอดเงิน'}จริงตอนนี้ ระบบจะสร้างรายการ “ปรับยอด” ให้อัตโนมัติ</div>
        <div className="flex gap-2 mt-3">
          <input className="field num" inputMode="decimal" placeholder={String(Math.abs(b))} value={adj} onChange={(e) => setAdj(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doAdjust()} />
          <Button onClick={doAdjust} disabled={!adj}><Check size={18} /></Button>
        </div>
      </div>

      <div className="mt-5 text-sm text-slate-500 px-1">รายการที่เกี่ยวข้อง</div>
      <div className="mt-1 -mx-2">
        {related.length ? related.map((t) => <TxnRow key={t.id} t={t} catById={catById} accById={accById} onClick={() => { onClose(); onEditTxn(t) }} />)
          : <div className="text-sm text-slate-500 px-3 py-6 text-center">ยังไม่มีรายการ</div>}
      </div>
    </Sheet>
  )
}

export function AccountForm({ open, initial, onClose }) {
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const { accounts, txns, accById, settings } = useVault()
  const [f, setF] = useState(null)
  useEffect(() => {
    if (!open) return setF(null)
    const type = initial?.type || 'cash'
    const t = ACCOUNT_TYPES[type]
    setF({
      name: '', type, icon: t.icon, color: t.color, limit: '', dueDay: '', installment: '', ...initial,
      openingStr: initial?.opening ? String(isDebt(initial) ? -initial.opening : initial.opening) : '',
    })
  }, [open]) // eslint-disable-line
  if (!open || !f) return null
  const set = (p) => setF((s) => ({ ...s, ...p }))
  const editing = !!initial?.id
  const debt = f.type === 'credit' || f.type === 'loan'
  const cards = accounts.filter((a) => a.type === 'credit' && !a.archived)
  const used = editing && txns.some((t) => postingsOf(t, accById, settings).some((p) => p.acc === initial.id))
  const isTarget = editing && (Object.values(settings.allocation.targets).includes(initial.id) || settings.earmarkFrom === initial.id)

  const save = () => {
    if (!f.name.trim()) return
    const op = evalAmount(f.openingStr) || 0
    const data = {
      id: initial?.id, name: f.name.trim(), type: f.type, icon: f.icon, color: f.color,
      opening: debt ? -Math.abs(op) : op,
      order: initial?.order ?? (Math.max(0, ...accounts.map((a) => a.order || 0)) + 1),
      archived: !!f.archived,
    }
    if (f.type === 'credit') { data.limit = evalAmount(f.limit) || 0; data.dueDay = Number(f.dueDay) || undefined; data.statementDay = Number(f.statementDay) || undefined }
    if (f.type === 'loan') {
      data.installment = evalAmount(f.installment) || 0; data.dueDay = Number(f.dueDay) || undefined
      if (f.viaCard) {
        Object.assign(data, { viaCard: f.viaCard, instPrincipal: evalAmount(f.instPrincipal) || 0, instInterest: evalAmount(f.instInterest) || 0, instCount: Number(f.instCount) || 0, instStart: f.instStart || undefined })
        data.installment = data.instPrincipal + data.instInterest
        const card = accounts.find((c) => c.id === f.viaCard); data.dueDay = card?.dueDay
      }
    }
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k])
    put('account', data)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'แก้ไขกระเป๋า' : 'เพิ่มกระเป๋า'}
      footer={
        <div className="flex gap-2">
          {editing && !isTarget && (used
            ? <Button variant="ghost" onClick={() => { put('account', { ...initial, archived: !initial.archived }); onClose() }}><Archive size={17} /> {initial.archived ? 'เลิกเก็บ' : 'เก็บถาวร'}</Button>
            : <Button variant="danger" onClick={() => { remove(initial.id, { label: 'ลบกระเป๋าแล้ว' }); onClose() }}><Trash2 size={17} /> ลบ</Button>)}
          <Button className="flex-1" onClick={save} disabled={!f.name.trim()}><Check size={18} /> บันทึก</Button>
        </div>
      }>
      <div className="flex items-center gap-3 mb-4">
        <IconBadge name={f.icon} color={f.color} size={52} icon={24} />
        <input className="field text-lg font-semibold" placeholder="ชื่อกระเป๋า เช่น KBank ออมทรัพย์" value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus={!editing} />
      </div>

      <Label>ประเภท</Label>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(ACCOUNT_TYPES).map(([k, t]) => (
          <button key={k} disabled={editing && used} onClick={() => set({ type: k, icon: t.icon, color: t.color })}
            className={`p-2.5 rounded-2xl border text-left transition disabled:opacity-40 ${f.type === k ? 'bg-slate-900/[.06] border-slate-300' : 'border-slate-200/70 hover:bg-slate-900/[.04]'}`}>
            <div style={{ color: t.color }}><IconBadge name={t.icon} color={t.color} size={28} icon={14} /></div>
            <div className="text-xs mt-1.5 font-medium">{t.label}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className={debt ? '' : 'col-span-2'}>
          <Label>{f.viaCard ? 'เงินต้นคงเหลือ (ที่ยังไม่ขึ้นบิล)' : debt ? 'ยอดหนี้เริ่มต้น' : 'ยอดเงินเริ่มต้น'}</Label>
          <input className="field num" inputMode="decimal" placeholder="0" value={f.openingStr} onChange={(e) => set({ openingStr: e.target.value })} />
        </div>
        {debt && !f.viaCard && (
          <div>
            <Label>{f.type === 'credit' ? 'ครบกำหนดชำระทุกวันที่' : 'ครบกำหนดทุกวันที่'}</Label>
            <input className="field num" inputMode="numeric" placeholder="25" value={f.dueDay || ''} onChange={(e) => set({ dueDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
          </div>
        )}
        {f.type === 'credit' && (
          <div className="col-span-2">
            <Label>วันตัดรอบบัญชี (วันที่ธนาคารสรุปยอดออกบิล)</Label>
            <input className="field num" inputMode="numeric" placeholder="เช่น 5" value={f.statementDay || ''} onChange={(e) => set({ statementDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} />
            {f.statementDay && f.dueDay && <div className="text-[11px] text-slate-500 mt-1">รูดวันที่ {(Number(f.statementDay) % 31) + 1} ถึงวันที่ {f.statementDay} เดือนถัดไป = บิลเดียวกัน · จ่ายภายในวันที่ {f.dueDay}</div>}
          </div>
        )}
        {f.type === 'credit' && (
          <div className="col-span-2">
            <Label>วงเงินบัตร</Label>
            <input className="field num" inputMode="decimal" placeholder="เช่น 50000" value={f.limit || ''} onChange={(e) => set({ limit: e.target.value })} />
          </div>
        )}
        {f.type === 'loan' && (
          <div className="col-span-2">
            <Label>รูปแบบการผ่อน</Label>
            <Segmented value={f.viaCard ? 'card' : 'direct'} onChange={(v) => set({ viaCard: v === 'card' ? (cards[0]?.id || '') : '' })}
              options={[{ value: 'card', label: 'ผ่อนผ่านบิลบัตรเครดิต' }, { value: 'direct', label: 'จ่ายค่างวดแยก' }]} />
          </div>
        )}
        {f.type === 'loan' && !f.viaCard && (
          <div className="col-span-2">
            <Label>ค่างวดต่อเดือน (ใช้คำนวณเงินที่ต้องกันไว้)</Label>
            <input className="field num" inputMode="decimal" placeholder="เช่น 3500" value={f.installment || ''} onChange={(e) => set({ installment: e.target.value })} />
          </div>
        )}
        {f.type === 'loan' && f.viaCard !== undefined && f.viaCard !== '' && (
          <div className="col-span-2 rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-2.5">
            <div>
              <Label>เรียกเก็บผ่านบัตร</Label>
              <select className="field" value={f.viaCard} onChange={(e) => set({ viaCard: e.target.value })}>
                {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>เงินต้นต่องวด</Label><input className="field num" inputMode="decimal" placeholder="เช่น 1000" value={f.instPrincipal || ''} onChange={(e) => set({ instPrincipal: e.target.value })} /></div>
              <div><Label>ดอกเบี้ยต่องวด</Label><input className="field num" inputMode="decimal" placeholder="เช่น 72" value={f.instInterest || ''} onChange={(e) => set({ instInterest: e.target.value })} /></div>
              <div><Label>จำนวนงวดที่เหลือ</Label><input className="field num" inputMode="numeric" placeholder="เช่น 10" value={f.instCount || ''} onChange={(e) => set({ instCount: e.target.value.replace(/\D/g, '').slice(0, 3) })} /></div>
              <div><Label>งวดถัดไปขึ้นบิลเดือน</Label><input type="month" className="field" value={f.instStart || ''} onChange={(e) => set({ instStart: e.target.value })} /></div>
            </div>
            {(() => {
              const card = cards.find((c) => c.id === f.viaCard)
              const p = evalAmount(f.instPrincipal) || 0, i = evalAmount(f.instInterest) || 0, n = Number(f.instCount) || 0
              if (!p || !n || !f.instStart) return <div className="text-[11px] text-slate-500">กรอกให้ครบ แล้วระบบจะลงค่างวดเข้าบิลบัตรให้เองทุกเดือน</div>
              return (
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  ค่างวด <b>{money(p + i)}</b>/เดือน (ต้น {money(p, { decimals: false })} + ดอก {money(i, { decimals: false })}) ลงบิล “{card?.name}” วันที่ {card?.statementDay || card?.dueDay || 1} ของทุกเดือน
                  · งวดสุดท้าย {monthLabel(shiftMonth(f.instStart, n - 1))} · ดอกเบี้ยรวม {money(i * n, { decimals: false })}
                  {!card?.statementDay && <div className="text-amber-700 mt-1">แนะนำให้ตั้ง “วันตัดรอบบัญชี” ของบัตรนี้ด้วย</div>}
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <Label className="mt-4">สี</Label>
      <ColorPicker value={f.color} onChange={(color) => set({ color })} colors={COLORS} />
      <Label className="mt-4">ไอคอน</Label>
      <IconPicker value={f.icon} onChange={(icon) => set({ icon })} color={f.color} keys={ICON_KEYS} />
    </Sheet>
  )
}
