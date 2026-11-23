import { useMemo, useState } from 'react'
import { Info, ChevronDown, ChevronUp, Lightbulb } from '../components/px'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { computeTax, DEDUCTIONS, BRACKETS, TAX_YEAR_NOTE } from '../lib/tax'
import { money } from '../lib/format'

const M = (n) => money(n, { decimals: false })
const pct = (r) => `${Math.round(r * 100)}%`

/** ภาษี: the year's income from real records, projected to December, brackets, deductions found and what's left to use. */
export default function Tax() {
  const { txns, catById, assetById, settings } = useVault()
  const put = useStore((s) => s.put)
  const privacy = useStore((s) => s.ui.privacy)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [open, setOpen] = useState(false)
  const manualAll = settings.tax || {}
  const manual = manualAll[year] || {}
  const setManual = (p) => put('settings', { ...settings, id: 'settings', tax: { ...manualAll, [year]: { ...manual, ...p } } })
  const T = useMemo(() => computeTax({ year, txns, catById, assetById, manual, settings }), [year, txns, manual, settings]) // eslint-disable-line
  const P = T.proj
  const be = (y) => +y + 543
  const hide = (s) => (privacy ? '••••' : s)
  const years = [...new Set([String(new Date().getFullYear()), ...txns.map((t) => t.date?.slice(0, 4)).filter(Boolean)])].sort().reverse().slice(0, 4)

  const verdict = P.tax === 0
    ? (T.mustFile ? { tone: 'ok', title: 'ไม่ต้องเสียภาษี แต่ต้องยื่นแบบ', text: `รายได้ทั้งปีเกิน ${M(120000)} จึงต้องยื่น ภ.ง.ด.91 ภายใน 31 มี.ค. ${be(year) + 1} (ยื่นออนไลน์ได้ถึงต้นเมษายน)` } : { tone: 'ok', title: 'ไม่ต้องเสียภาษี', text: 'รายได้ยังไม่ถึงเกณฑ์ต้องยื่นแบบ' })
    : { tone: 'warn', title: `คาดว่าต้องเสียภาษี ${hide(M(P.tax))}`, text: `อยู่ขั้น ${pct(P.topRate)} · ${T.withheld ? (T.refund >= 0 ? `ถูกหัก ณ ที่จ่ายแล้ว ${M(T.withheld)} คาดว่าได้คืน ${M(T.refund)}` : `ถูกหักแล้ว ${M(T.withheld)} ต้องจ่ายเพิ่ม ${M(-T.refund)}`) : 'ยังไม่ได้กรอกภาษีหัก ณ ที่จ่าย'}` }

  return (
    <div className="space-y-4" data-testid="tax">
      <section className="hero p-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/80">ภาษีเงินได้บุคคลธรรมดา · ปีภาษี {be(year)}</div>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="text-xs bg-white/20 text-white rounded-lg px-2 py-1 border-0">{years.map((y) => <option key={y} value={y} className="text-slate-900">{be(y)}</option>)}</select>
        </div>
        <div className="mt-2 text-sm text-white/80">รายได้ทั้งปี {T.projGross > T.gross ? '(คาดการณ์ถึง ธ.ค.)' : ''}</div>
        <div className="text-4xl font-bold num" data-testid="tax-income">{hide(M(T.projGross))}</div>
        <div className="text-xs text-white/75 mt-1">บันทึกแล้ว {hide(M(T.gross))}{T.projGross > T.gross ? ` · คาดอีก ${hide(M(T.projGross - T.gross))} จากเงินเดือนที่เหลือ` : ''}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">เงินได้สุทธิ</div><b className="num text-sm">{hide(M(P.net))}</b></div>
          <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">ขั้นภาษี</div><b className="num text-sm">{pct(P.topRate)}</b></div>
          <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">ภาษีที่คาด</div><b className="num text-sm">{hide(M(P.tax))}</b></div>
        </div>
      </section>

      <section className={`card p-4 flex gap-3 ${verdict.tone === 'ok' ? '' : ''}`} data-testid="tax-verdict">
        <span className="text-2xl">{verdict.tone === 'ok' ? '✅' : '🧾'}</span>
        <div><div className="font-semibold text-sm">{verdict.title}</div><div className="text-xs text-slate-500 mt-0.5">{verdict.text}</div></div>
      </section>

      {/* how it's computed */}
      <section className="card p-4 space-y-2 text-sm" data-testid="tax-calc">
        <div className="font-semibold">คำนวณอย่างไร</div>
        <Line k="เงินเดือน + โบนัส" v={hide(M(T.projGross - T.income.other))} />
        {T.income.other > 0 && <Line k="รายได้อื่น" v={hide(M(T.income.other))} />}
        <Line k="หักค่าใช้จ่าย 50% (ไม่เกิน 100,000)" v={`−${hide(M(P.expense))}`} />
        <Line k="ลดหย่อนส่วนตัว / ครอบครัว" v={`−${hide(M(P.personal))}`} />
        {DEDUCTIONS.filter((d) => P.used[d.id] > 0).map((d) => <Line key={d.id} k={d.name} v={`−${hide(M(P.used[d.id]))}`} />)}
        <div className="border-t border-slate-900/10 pt-2"><Line k={<b>เงินได้สุทธิ</b>} v={<b>{hide(M(P.net))}</b>} /></div>
        <div className="pt-1">
          <div className="text-[11px] text-slate-500 mb-1">ขั้นบันได</div>
          <div className="space-y-1">
            {BRACKETS.slice(0, 6).map(([hi, r], i) => {
              const lo = i ? BRACKETS[i - 1][0] : 0, part = Math.max(0, Math.min(P.net, hi) - lo), on = part > 0
              return (
                <div key={hi} className={`flex items-center gap-2 text-[11px] ${on ? '' : 'opacity-45'}`}>
                  <span className="w-28 shrink-0 num">{M(lo)}–{hi === Infinity ? '' : M(hi)}</span>
                  <span className="w-8 shrink-0 font-semibold">{pct(r)}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-slate-900/[.06] overflow-hidden"><span className="block h-full bg-ac" style={{ width: `${hi === Infinity ? 0 : (part / (hi - lo)) * 100}%` }} /></span>
                  <span className="w-16 text-right num">{on ? M(part * r) : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* deduction hints */}
      {T.room.length > 0 && (
        <section className="card p-4 space-y-2" data-testid="tax-room">
          <div className="font-semibold text-sm flex items-center gap-1.5"><Lightbulb size={16} className="text-amber-500" /> ลดภาษีได้อีก</div>
          {T.room.map((r) => (
            <div key={r.id} className="px-inner px-3 py-2 text-xs flex justify-between gap-2">
              <span>{r.name}<span className="block text-slate-500">{r.tip}</span></span>
              <span className="text-right shrink-0">ใช้สิทธิ์ได้อีก <b className="num">{M(r.left)}</b><span className="block text-emerald-600">ลดภาษีได้สูงสุด ~{M(r.saves)}</span></span>
            </div>
          ))}
        </section>
      )}
      {T.hits.length > 0 && (
        <section className="card p-4 space-y-1.5" data-testid="tax-found">
          <div className="font-semibold text-sm">รายการที่ลดหย่อนได้ (พบในบันทึกปีนี้)</div>
          {T.hits.slice(-8).reverse().map((h) => <div key={h.id} className="flex justify-between text-xs"><span className="truncate">{DEDUCTIONS.find((d) => d.id === h.ded)?.name} · {h.note}</span><span className="num shrink-0 ml-2">{hide(M(h.amount))}</span></div>)}
          <div className="text-[11px] text-slate-500">แอปดูจากชื่อหมวด/โน้ต เช่น "ประกันชีวิต" "ประกันสังคม" "บริจาค" และกองทุน RMF / ThaiESG ที่ซื้อ · เก็บหลักฐานไว้ยื่นจริงด้วย</div>
        </section>
      )}

      {/* manual entries */}
      <section className="card p-4" data-testid="tax-manual">
        <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between font-semibold text-sm">กรอกเพิ่มเอง (ที่แอปหาไม่เจอ) {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
        {open && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Num label="ภาษีหัก ณ ที่จ่ายทั้งปี" v={manual.withheld} on={(v) => setManual({ withheld: v })} />
            <Num label="รายได้อื่นที่ไม่ได้บันทึก" v={manual.otherIncome} on={(v) => setManual({ otherIncome: v })} />
            {DEDUCTIONS.map((d) => <Num key={d.id} label={`${d.name}${T.found[d.id] ? ` (พบแล้ว ${M(T.found[d.id])})` : ''}`} v={manual[d.id]} on={(v) => setManual({ [d.id]: v })} />)}
            <label className="text-[11px] text-slate-500 col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!manual.spouse} onChange={(e) => setManual({ spouse: e.target.checked })} /> คู่สมรสไม่มีเงินได้ (+60,000)</label>
            <label className="text-[11px] text-slate-500">พ่อแม่อายุ 60+ ที่อุปการะ (คนละ 30,000)<select className="field !py-1.5 mt-0.5" value={manual.parents || 0} onChange={(e) => setManual({ parents: +e.target.value })}>{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} คน</option>)}</select></label>
          </div>
        )}
      </section>
      <div className="text-[11px] text-slate-500 px-1 flex gap-1.5"><Info size={13} className="shrink-0 mt-0.5" />{TAX_YEAR_NOTE}</div>
    </div>
  )
}
function Line({ k, v }) { return <div className="flex justify-between gap-2"><span className="text-slate-600">{k}</span><span className="num">{v}</span></div> }
function Num({ label, v, on }) {
  return <label className="text-[11px] text-slate-500">{label}<input type="number" inputMode="decimal" className="field !py-1.5 mt-0.5 num" value={v || ''} onChange={(e) => on(+e.target.value || 0)} placeholder="0" /></label>
}
