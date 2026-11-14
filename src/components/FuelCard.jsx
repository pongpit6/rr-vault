import { useEffect, useMemo, useState } from 'react'
import { Fuel, Star, RefreshCw, ArrowLeftRight, Settings2 } from 'lucide-react'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { useOil, loadOil, FUEL_TYPES } from '../lib/market'
import { Segmented, Sheet, Button, Label } from './ui'
import { todayISO } from '../lib/format'
import { sfx } from '../lib/sfx'

const f2 = (n) => (n == null ? '—' : Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const BRANDS = [{ value: 'bangchak', label: 'บางจาก' }, { value: 'ptt', label: 'ปตท. (PTT OR)' }]

/** Normalise one brand's list into rows tagged with a fuel type. */
function rowsOf(data, brand) {
  const src = data?.[brand]
  if (!src?.items?.length) return []
  return src.items.map((o) => {
    const type = FUEL_TYPES.find((t) => (brand === 'ptt' ? t.ptt : t.bc).test(o.name))
    const tomorrowDiff = o.tomorrow && o.today ? Math.round((o.tomorrow - o.today) * 100) / 100 : 0
    const lastDiff = o.yesterday && o.today ? Math.round((o.today - o.yesterday) * 100) / 100 : 0
    return { ...o, type: type?.id || null, color: type?.color || '#94a3b8', tomorrowDiff, lastDiff }
  })
}
const thDate = (iso) => { try { return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) } catch { return iso } }

/** Liters bought in the last 30 days, estimated from expenses in the "น้ำมัน" category. */
function useFuelSpend() {
  const { txns, categories } = useVault()
  return useMemo(() => {
    const ids = new Set(categories.filter((c) => c.id === 'cat-fuel' || /น้ำมัน|เติมน้ำมัน|fuel/i.test(c.name)).map((c) => c.id))
    const from = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
    let sum = 0, n = 0
    for (const t of txns) if (t.kind === 'expense' && ids.has(t.category) && t.date >= from && t.date <= todayISO()) { sum += Number(t.amount) || 0; n++ }
    return { sum, n }
  }, [txns, categories])
}

export default function FuelCard({ compact = false, onOpen }) {
  const data = useOil((s) => s.data)
  const status = useOil((s) => s.status)
  const fuel = useStore((s) => s.ui.fuel) || {}
  const setUi = useStore((s) => s.setUi)
  const setFuel = (p) => setUi({ fuel: { ...fuel, ...p } })
  const brand = fuel.brand || 'bangchak'
  const fav = fuel.fav || 'g95'
  const tank = Number(fuel.tank) || 40
  const [mode, setMode] = useState('money') // money → liters | liters → money
  const [val, setVal] = useState('1000')
  const [pick, setPick] = useState(null) // row name selected for the calculator
  const [tankOpen, setTankOpen] = useState(false)
  const spend = useFuelSpend()

  useEffect(() => { loadOil() }, [])
  const rows = rowsOf(data, brand)
  const alt = rowsOf(data, brand === 'ptt' ? 'bangchak' : 'ptt')
  const list = rows.length ? rows : alt
  const sel = list.find((r) => r.name === pick) || list.find((r) => r.type === fav) || list[0]
  const tomorrowMoves = list.filter((r) => r.tomorrowDiff)
  const remark = brand === 'bangchak' || !rows.length ? data?.bangchak?.remark : data?.ptt?.date ? `ราคามีผล ณ ${thDate(data.ptt.date)} เวลา ${data.ptt.date.slice(11, 16)} น.` : ''

  if (compact) {
    return (
      <button onClick={onOpen} className="card w-full p-4 text-left hover:brightness-[.99]">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-8 h-8 rounded-xl grid place-items-center bg-orange-100 text-orange-600"><Fuel size={17} /></span>
          <div className="flex-1 min-w-0"><div className="font-semibold text-sm">ราคาน้ำมันวันนี้</div><div className="text-[11px] text-slate-500 truncate">{remark || 'กำลังโหลด…'}</div></div>
          {tomorrowMoves.length > 0 && <TomorrowBadge rows={tomorrowMoves} />}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {list.filter((r) => ['g95', 'g91', 'e20', 'b7'].includes(r.type)).slice(0, 4).map((r) => (
            <div key={r.name} className={`rounded-xl px-2.5 py-1.5 border ${r.type === fav ? 'border-orange-300 bg-orange-50/70' : 'border-slate-200'}`}>
              <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1"><i className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />{FUEL_TYPES.find((t) => t.id === r.type)?.label || r.name}</div>
              <div className="font-bold num text-sm">{f2(r.today)}{r.tomorrowDiff ? <span className={`ml-1 text-[10px] ${r.tomorrowDiff > 0 ? 'text-rose' : 'text-emerald-600'}`}>{r.tomorrowDiff > 0 ? '▲' : '▼'}{Math.abs(r.tomorrowDiff).toFixed(2)}</span> : null}</div>
            </div>
          ))}
        </div>
      </button>
    )
  }

  const num = Number(String(val).replace(/,/g, '')) || 0
  const price = sel?.today || 0
  const result = !price ? 0 : mode === 'money' ? num / price : num * price
  const quick = mode === 'money' ? [100, 200, 500, 1000] : [10, 20, 30]

  return (
    <div className="grid md:grid-cols-2 gap-4 items-start">
      <section className="card p-4 md:p-5">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-orange-100 text-orange-600"><Fuel size={19} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">ราคาน้ำมันขายปลีกวันนี้</div>
            <div className="text-[11px] text-slate-500">{remark || (status === 'loading' ? 'กำลังโหลด…' : 'โหลดราคาไม่ได้')}</div>
          </div>
          <button onClick={() => loadOil(true)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label="อัปเดตราคาน้ำมัน"><RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} /></button>
        </div>
        <Segmented className="mt-3" value={brand} onChange={(b) => { setFuel({ brand: b }); setPick(null) }} options={BRANDS} />
        {tomorrowMoves.length > 0 && (
          <div className="mt-3 rounded-xl px-3 py-2 text-xs bg-amber-50 border border-amber-200 text-amber-800">
            📢 พรุ่งนี้ปรับราคา: {tomorrowMoves.map((r) => `${r.name} ${r.tomorrowDiff > 0 ? '+' : ''}${r.tomorrowDiff.toFixed(2)}`).join(' · ')}
          </div>
        )}
        <div className="mt-3 divide-y divide-slate-200/70">
          {list.map((r) => {
            const on = sel?.name === r.name
            return (
              <div key={r.name} className={`flex items-center gap-2.5 py-2 px-1 rounded-lg cursor-pointer ${on ? 'bg-orange-50/70' : ''}`} onClick={() => setPick(r.name)}>
                <i className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  {r.lastDiff !== 0 && <div className={`text-[10.5px] ${r.lastDiff > 0 ? 'text-rose' : 'text-emerald-600'}`}>ปรับล่าสุด {r.lastDiff > 0 ? '+' : ''}{r.lastDiff.toFixed(2)} ฿</div>}
                </div>
                {r.tomorrowDiff !== 0 && <span className={`text-[10.5px] px-1.5 py-0.5 rounded-md font-semibold ${r.tomorrowDiff > 0 ? 'bg-rose/10 text-rose' : 'bg-emerald-50 text-emerald-700'}`}>พรุ่งนี้ {f2(r.tomorrow)}</span>}
                <div className="text-right"><div className="font-bold num">{f2(r.today)}</div><div className="text-[10px] text-slate-400 -mt-0.5">฿/ลิตร</div></div>
                {r.type && (
                  <button onClick={(e) => { e.stopPropagation(); setFuel({ fav: r.type }); setPick(r.name); sfx('click') }} className="p-1.5 -mr-1" aria-label="ตั้งเป็นน้ำมันที่ใช้ประจำ">
                    <Star size={16} className={r.type === fav ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
                  </button>
                )}
              </div>
            )
          })}
          {!list.length && <div className="py-6 text-center text-sm text-slate-500">{status === 'loading' ? 'กำลังโหลดราคา…' : 'ยังโหลดราคาไม่ได้ ลองกดอัปเดต'}</div>}
        </div>
        <div className="mt-2 text-[10.5px] text-slate-400">⭐ = น้ำมันที่ใช้ประจำ · ราคาขายปลีกในกรุงเทพฯ ไม่รวมภาษีบำรุงท้องถิ่น ต่างจังหวัดอาจต่างเล็กน้อย</div>
      </section>

      <section className="card p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2">🧮 เครื่องคิดเลขเติมน้ำมัน</div>
          <button onClick={() => setTankOpen(true)} className="text-xs text-sky-600 flex items-center gap-1"><Settings2 size={13} /> ถัง {tank} ลิตร</button>
        </div>
        <div className="mt-1 text-xs text-slate-500">คิดจาก <b style={{ color: sel?.color }}>{sel?.name || '—'}</b> ราคา <b className="num">{f2(price)}</b> ฿/ลิตร (แตะรายการด้านบนเพื่อเปลี่ยน)</div>
        <Segmented className="mt-3" value={mode} onChange={(m) => { setMode(m); setVal(m === 'money' ? '1000' : '20') }} options={[{ value: 'money', label: '฿ → ได้กี่ลิตร' }, { value: 'liters', label: 'ลิตร → กี่บาท' }]} />
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <Label>{mode === 'money' ? 'จำนวนเงิน (บาท)' : 'จำนวนลิตร'}</Label>
            <input className="field num text-lg" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label={mode === 'money' ? 'จำนวนเงิน' : 'จำนวนลิตร'} />
          </div>
          <button onClick={() => { setMode(mode === 'money' ? 'liters' : 'money'); setVal(result ? String(Math.round(result * 100) / 100) : '') }} className="mt-5 p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="สลับ"><ArrowLeftRight size={16} /></button>
          <div>
            <Label>{mode === 'money' ? 'ได้น้ำมัน' : 'ต้องจ่าย'}</Label>
            <div className="field num text-lg font-bold bg-orange-50/60 !border-orange-200 text-orange-700">{result ? (mode === 'money' ? `${result.toFixed(2)} ลิตร` : `${f2(result)} ฿`) : '—'}</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((v) => <button key={v} onClick={() => setVal(String(v))} className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 hover:bg-slate-50 num">{mode === 'money' ? `฿${v.toLocaleString()}` : `${v} ลิตร`}</button>)}
          <button onClick={() => { setMode('liters'); setVal(String(tank)) }} className="px-3 py-1.5 rounded-xl text-xs border border-orange-300 bg-orange-50 text-orange-700 font-semibold">⛽ เต็มถัง ({tank} ล.)</button>
        </div>
        {mode === 'money' && num > 0 && list.length > 1 && (
          <details className="mt-3">
            <summary className="text-xs text-sky-600 cursor-pointer">เทียบ ฿{num.toLocaleString()} กับน้ำมันทุกชนิด</summary>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {list.map((r) => <div key={r.name} className="flex justify-between text-xs px-2 py-1 rounded-lg bg-slate-900/[.03]"><span className="truncate mr-2">{r.name}</span><b className="num">{(num / r.today).toFixed(2)} ล.</b></div>)}
            </div>
          </details>
        )}
        <div className="mt-4 rounded-xl p-3 bg-slate-900/[.03] text-xs text-slate-600">
          {spend.n > 0
            ? <>⛽ 30 วันที่ผ่านมาคุณจ่ายค่าน้ำมัน <b className="num">฿{spend.sum.toLocaleString()}</b> ({spend.n} ครั้ง) ≈ <b className="num">{price ? (spend.sum / price).toFixed(1) : '—'} ลิตร</b> ถ้าคิดที่ราคา {sel?.name} วันนี้ {price ? <>· ประมาณ <b className="num">{(spend.sum / price / tank).toFixed(1)}</b> ถัง</> : null}</>
            : <>ยังไม่มีรายจ่ายหมวด “น้ำมัน” ใน 30 วันที่ผ่านมา · บันทึกค่าน้ำมันแล้วระบบจะประมาณให้ว่าเติมไปกี่ลิตร</>}
        </div>
      </section>

      <Sheet open={tankOpen} onClose={() => setTankOpen(false)} title="ขนาดถังน้ำมันรถ" footer={<Button className="w-full" onClick={() => setTankOpen(false)}>เสร็จ</Button>}>
        <Label>ความจุถัง (ลิตร)</Label>
        <input className="field num" inputMode="decimal" value={fuel.tank ?? 40} onChange={(e) => setFuel({ tank: e.target.value })} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[[35, 'อีโคคาร์'], [42, 'เก๋งเล็ก'], [55, 'เก๋งกลาง'], [70, 'กระบะ/SUV'], [80, 'รถตู้']].map(([v, l]) => <button key={v} onClick={() => setFuel({ tank: v })} className="px-3 py-1.5 rounded-xl text-xs border border-slate-200 hover:bg-slate-50">{l} {v} ล.</button>)}
        </div>
      </Sheet>
    </div>
  )
}

function TomorrowBadge({ rows }) {
  const up = rows.filter((r) => r.tomorrowDiff > 0).length, down = rows.length - up
  return <span className={`text-[10.5px] px-2 py-1 rounded-lg font-semibold ${up >= down ? 'bg-rose/10 text-rose' : 'bg-emerald-50 text-emerald-700'}`}>พรุ่งนี้{up >= down ? 'ขึ้น' : 'ลง'}</span>
}
