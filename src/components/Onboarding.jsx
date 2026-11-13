import { useMemo, useState } from 'react'
import { ChevronRight, ChevronLeft, Check, Plus, Trash2, Sparkles } from 'lucide-react'
import { Button, Label, Segmented, IconBadge, Avatar } from './ui'
import { AllocationEditor } from './TxnForm'
import { useStore, useProfile } from '../store'
import { useVault } from '../lib/useVault'
import { evalAmount, money, todayISO, shiftMonth, round2 } from '../lib/format'

const STEPS = ['เริ่ม', 'เงินสด', 'บัตรเครดิต', 'ผ่อนผ่านบัตร', 'แบ่งเงิน', 'เสร็จ']

/** First-run wizard: asks the few numbers the app needs, then writes them as adjustments. */
export default function Onboarding() {
  const ready = useStore((s) => s.ready)
  const session = useStore((s) => s.session)
  const offline = useStore((s) => s.ui.offlineMode)
  const force = useStore((s) => s.ui.onboardingOpen)
  const { settings, txns, accounts, balances } = useVault()
  const real = useMemo(() => txns.filter((t) => t.kind !== 'adjust').length, [txns])
  const show = ready && (session || offline) && (force || (!settings.onboarded && real === 0 && !settings.onboardingSkipped))
  if (!show) return null
  return <Wizard settings={settings} accounts={accounts} balances={balances} />
}

function Wizard({ settings, accounts, balances }) {
  const put = useStore((s) => s.put)
  const setUi = useStore((s) => s.setUi)
  const showToast = useStore((s) => s.showToast)
  const profile = useProfile()
  const cash = accounts.find((a) => a.type === 'cash' && !a.archived)
  const invest = accounts.find((a) => a.type === 'invest' && !a.archived)
  const card = accounts.find((a) => a.type === 'credit' && !a.archived)
  const existingLoans = accounts.filter((a) => a.type === 'loan' && !a.archived)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({
    name: profile.name, cash: balances[cash?.id] ? String(balances[cash.id]) : '', invest: balances[invest?.id] ? String(balances[invest.id]) : '',
    hasCard: !!card, limit: card?.limit ? String(card.limit) : '', statementDay: String(card?.statementDay || 5), dueDay: String(card?.dueDay || 20),
    billed: '', newCycle: '', loans: [], pct: settings.allocation.pct, cap: settings.allocation.capReserveAtGap,
  })
  const set = (p) => setF((s) => ({ ...s, ...p }))
  const nextMonth = shiftMonth(todayISO().slice(0, 7), 1)
  const addLoan = () => set({ loans: [...f.loans, { name: `ผ่อนบัตร ก้อนที่ ${f.loans.length + 1}`, left: '', principal: '', interest: '', count: '', start: nextMonth }] })
  const setLoan = (i, p) => set({ loans: f.loans.map((l, k) => (k === i ? { ...l, ...p } : l)) })

  const finish = () => {
    const today = todayISO(), now = new Date().toISOString()
    const adjust = (acc, target) => {
      if (!acc) return
      const diff = round2(target - (balances[acc.id] || 0))
      if (Math.abs(diff) >= 0.01) put('txn', { kind: 'adjust', amount: diff, account: acc.id, date: today, note: 'ยอดเริ่มต้น', createdAt: now })
    }
    if (f.name.trim() && f.name.trim() !== profile.name) put('profile', { ...profile, name: f.name.trim() })
    adjust(cash, evalAmount(f.cash) || 0)
    adjust(invest, evalAmount(f.invest) || 0)
    if (card) {
      if (f.hasCard) {
        put('account', { ...card, limit: evalAmount(f.limit) || 0, statementDay: Number(f.statementDay) || 5, dueDay: Number(f.dueDay) || 20, archived: false })
        const billed = evalAmount(f.billed) || 0, nc = evalAmount(f.newCycle) || 0
        adjust(card, -billed)
        if (nc > 0) put('txn', { kind: 'expense', amount: nc, account: card.id, category: 'cat-uncat', date: today, note: 'ยอดรูดหลังตัดรอบ (ยกมา)', earmark: false, createdAt: now })
      } else put('account', { ...card, archived: true })
    }
    f.loans.forEach((l, i) => {
      const p = evalAmount(l.principal) || 0, it = evalAmount(l.interest) || 0, left = evalAmount(l.left) || 0
      if (!(left > 0)) return
      const base = existingLoans[i]
      put('account', {
        ...(base || { icon: 'bank', color: '#f97316', order: 10 + i }), id: base?.id, name: l.name.trim() || `ผ่อนบัตร ${i + 1}`, type: 'loan', opening: -left,
        viaCard: card?.id, instPrincipal: p, instInterest: it, instCount: Number(l.count) || 0, instStart: l.start, installment: p + it, dueDay: card?.dueDay, archived: false,
      })
    })
    existingLoans.slice(f.loans.length).forEach((a) => { if (!(balances[a.id] < 0)) put('account', { ...a, archived: true }) })
    put('settings', { ...settings, onboarded: true, allocation: { ...settings.allocation, pct: f.pct, capReserveAtGap: f.cap } })
    setUi({ onboardingOpen: false })
    showToast('ตั้งค่าเริ่มต้นเรียบร้อย 🎉')
  }
  const skip = () => { put('settings', { ...settings, onboardingSkipped: true }); setUi({ onboardingOpen: false }) }

  const Num = ({ k, placeholder, label }) => (
    <div><Label>{label}</Label><input className="field num text-lg" inputMode="decimal" placeholder={placeholder} value={f[k]} onChange={(e) => set({ [k]: e.target.value })} /></div>
  )

  return (
    <div className="fixed inset-0 z-[90] bg-[#f5f7fa] overflow-y-auto">
      <div className="max-w-lg mx-auto px-5 pt-safe pb-safe min-h-dvh flex flex-col">
        <div className="flex items-center gap-2 pt-5">
          {STEPS.map((s, i) => <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'grad-bg' : 'bg-slate-200'}`} />)}
        </div>
        <div className="text-xs text-slate-500 mt-2">ขั้น {step + 1}/{STEPS.length} · {STEPS[step]}</div>

        <div className="flex-1 py-6 space-y-4">
          {step === 0 && (
            <div className="text-center pt-6">
              <Avatar size={96} className="mx-auto" />
              <h1 className="text-2xl font-bold mt-5">ตั้งค่า Vault ใน 2 นาที</h1>
              <p className="text-slate-500 mt-2 text-sm">ตอบแค่ไม่กี่ข้อ แอปจะจัดกระเป๋า บัตร และหนี้ให้ตรงกับความจริง ข้ามได้ทุกข้อ และแก้ทีหลังได้ในหน้า “เงิน”</p>
              <div className="mt-6 text-left"><Label>ชื่อที่แสดง</Label><input className="field" value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
            </div>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold">ตอนนี้มีเงินสดอยู่เท่าไร</h2>
              <p className="text-sm text-slate-500">ดูยอดจากแอปธนาคาร ใส่เป็นยอดรวมได้เลย</p>
              <Num k="cash" label="เงินในบัญชีใช้จ่าย (บาท)" placeholder="เช่น 12500" />
              <Num k="invest" label="เงินสดในบัญชีลงทุน เช่น Bitkub / โบรกเกอร์ (บาท)" placeholder="0 ถ้าไม่มี" />
              <div className="text-xs text-slate-400">สินทรัพย์ที่ถืออยู่ (BTC, กองทุน ฯลฯ) ไปใส่ทีหลังในหน้า “ลงทุน” โดยเปิดโหมดบันทึกย้อนหลัง</div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold">บัตรเครดิต</h2>
              <Segmented value={f.hasCard ? 'y' : 'n'} onChange={(v) => set({ hasCard: v === 'y' })} options={[{ value: 'y', label: 'มีบัตร' }, { value: 'n', label: 'ไม่มี' }]} />
              {f.hasCard && (
                <>
                  <Num k="limit" label="วงเงินบัตร" placeholder="เช่น 50000" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>วันตัดรอบ (สรุปยอดออกบิล)</Label><input className="field num" inputMode="numeric" value={f.statementDay} onChange={(e) => set({ statementDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></div>
                    <div><Label>วันครบกำหนดจ่าย</Label><input className="field num" inputMode="numeric" value={f.dueDay} onChange={(e) => set({ dueDay: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></div>
                  </div>
                  <Num k="billed" label="ยอดบิลล่าสุดที่ยังไม่ได้จ่าย (บาท)" placeholder="0 ถ้าจ่ายแล้ว" />
                  <Num k="newCycle" label="ยอดที่รูดหลังวันตัดรอบ ยังไม่ขึ้นบิล (บาท)" placeholder="0 ถ้าไม่มี" />
                </>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="text-xl font-bold">เงินสดผ่อนผ่านบัตร</h2>
              <p className="text-sm text-slate-500">กู้เงินสดจากบัตรแล้วผ่อนเป็นงวดในบิลบัตร ใส่ได้หลายก้อน ถ้าไม่มีข้ามได้</p>
              {!f.hasCard && <div className="text-sm text-amber-700 bg-amber-50 rounded-xl p-3">ต้องมีบัตรเครดิตก่อน (ย้อนกลับไปเลือก “มีบัตร”)</div>}
              {f.loans.map((l, i) => (
                <div key={i} className="card p-3 space-y-2">
                  <div className="flex gap-2"><input className="field" value={l.name} onChange={(e) => setLoan(i, { name: e.target.value })} /><button onClick={() => set({ loans: f.loans.filter((_, k) => k !== i) })} className="p-2 text-rose"><Trash2 size={18} /></button></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>เงินต้นคงเหลือ</Label><input className="field num" inputMode="decimal" placeholder="เช่น 12000" value={l.left} onChange={(e) => setLoan(i, { left: e.target.value })} /></div>
                    <div><Label>งวดที่เหลือ</Label><input className="field num" inputMode="numeric" placeholder="เช่น 4" value={l.count} onChange={(e) => setLoan(i, { count: e.target.value.replace(/\D/g, '') })} /></div>
                    <div><Label>เงินต้นต่องวด</Label><input className="field num" inputMode="decimal" placeholder="เช่น 3000" value={l.principal} onChange={(e) => setLoan(i, { principal: e.target.value })} /></div>
                    <div><Label>ดอกเบี้ยต่องวด</Label><input className="field num" inputMode="decimal" placeholder="เช่น 129.6" value={l.interest} onChange={(e) => setLoan(i, { interest: e.target.value })} /></div>
                    <div className="col-span-2"><Label>งวดถัดไปขึ้นบิลเดือน</Label><input type="month" className="field" value={l.start} onChange={(e) => setLoan(i, { start: e.target.value })} /></div>
                  </div>
                  {evalAmount(l.principal) > 0 && <div className="text-xs text-slate-500">ค่างวด {money((evalAmount(l.principal) || 0) + (evalAmount(l.interest) || 0))}/เดือน</div>}
                </div>
              ))}
              {f.hasCard && <Button variant="ghost" className="w-full" onClick={addLoan}><Plus size={16} /> เพิ่มก้อนผ่อน</Button>}
            </>
          )}
          {step === 4 && (
            <>
              <h2 className="text-xl font-bold">ได้เงินมาแบ่งยังไง</h2>
              <p className="text-sm text-slate-500">ทุกครั้งที่บันทึกรายรับ แอปจะแบ่งตามนี้ให้ก่อน (ปรับเฉพาะครั้งได้) ลำดับคือ หนี้ → ใช้ได้ → ลงทุน</p>
              <AllocationEditor pct={f.pct} cap={f.cap} onPct={(pct) => set({ pct })} onCap={(cap) => set({ cap })} split={null} />
            </>
          )}
          {step === 5 && (
            <div className="text-center pt-8">
              <IconBadge name="sparkles" color="#10b981" size={72} icon={34} className="mx-auto" />
              <h2 className="text-2xl font-bold mt-5">พร้อมแล้ว</h2>
              <div className="mt-4 text-left card p-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">เงินใช้จ่าย</span><b className="num">{money(evalAmount(f.cash) || 0)}</b></div>
                <div className="flex justify-between"><span className="text-slate-500">เงินสดลงทุน</span><b className="num">{money(evalAmount(f.invest) || 0)}</b></div>
                {f.hasCard && <div className="flex justify-between"><span className="text-slate-500">หนี้บัตร</span><b className="num">{money((evalAmount(f.billed) || 0) + (evalAmount(f.newCycle) || 0))}</b></div>}
                {f.loans.map((l, i) => <div key={i} className="flex justify-between"><span className="text-slate-500">{l.name}</span><b className="num">{money(evalAmount(l.left) || 0)}</b></div>)}
              </div>
              <p className="text-xs text-slate-400 mt-3">ขั้นต่อไป: ตั้งค่า “บันทึกอัตโนมัติจากแจ้งเตือนธนาคาร” ในหน้าตั้งค่า แล้วแทบไม่ต้องพิมพ์อะไรอีก</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pb-5">
          {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}><ChevronLeft size={18} /></Button> : <Button variant="subtle" onClick={skip}>ข้ามทั้งหมด</Button>}
          {step < STEPS.length - 1
            ? <Button className="flex-1" onClick={() => setStep(step + 1)}>{step === 0 ? 'เริ่มเลย' : 'ถัดไป'} <ChevronRight size={18} /></Button>
            : <Button className="flex-1" onClick={finish}><Check size={18} /> เริ่มใช้งาน</Button>}
        </div>
      </div>
    </div>
  )
}

export { Sparkles }
