import { Emo } from './px'
import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from './px'
import { useCycle, cycleZone, gauges, levels, verdictTh, loadCycleHistory, loadChecklist, ZONE_COLOR, ZONE_TH } from '../lib/btcCycle'

/** tile inside "BITCOIN วันนี้" */
export function CycleTile({ onClick }) {
  const { d, err } = useCycle()
  const z = d && cycleZone(d)
  return (
    <button onClick={onClick} className="col-span-2 lg:col-span-4 text-left rounded-2xl bg-white/[.06] hover:bg-white/[.1] border border-white/10 p-3 transition" data-testid="tile-cycle">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">สัญญาณวัฏจักร BTC</span>
        <ChevronRight size={14} className="text-slate-500" />
      </div>
      {!d ? <div className="text-sm text-slate-500 mt-1">{err ? 'โหลดไม่ได้ตอนนี้' : 'กำลังโหลด…'}</div> : (
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-lg font-extrabold" style={{ color: z.color }} data-testid="cycle-zone"><Emo e={z.emoji} size={18} /> {z.name}</span>
          <span className="text-[11px] text-slate-300 ml-auto">ก้นรอบ <b className="text-emerald-400">{d.bottom?.hitCount}/{d.bottom?.total}</b> · ยอดรอบ <b className="text-rose-400">{d.peak?.hitCount}/{d.peak?.total}</b></span>
        </div>
      )}
      {d && <div className="flex gap-1 mt-2">{gauges(d).map((g) => <span key={g.id} className="flex-1 h-1.5 rounded-full" style={{ background: ZONE_COLOR[g.zone] }} title={`${g.name}: ${ZONE_TH[g.zone]}`} />)}</div>}
    </button>
  )
}

/** the full view (opened in a sheet) */
export function CycleDetail({ M, myAvg }) {
  const { d, err } = useCycle()
  const [open, setOpen] = useState(null) // gauge id or 'bottom-signals' / 'peak-signals'
  if (!d) return <div className="text-sm text-slate-500 py-6 text-center">{err ? 'โหลดข้อมูลไม่ได้ ลองใหม่ภายหลัง' : 'กำลังโหลด…'}</div>
  const z = cycleZone(d)
  const G = gauges(d)
  return (
    <div className="space-y-4" data-testid="cycle-detail">
      <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${z.color}, #0f172a)` }}>
        <div className="text-[11px] opacity-80">ภาพรวมตอนนี้ · ข้อมูล ณ {d.asOf ? new Date(d.asOf + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '—'}</div>
        <div className="text-2xl font-extrabold mt-0.5"><Emo e={z.emoji} size={18} /> {z.name}</div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Verdict title="สัญญาณก้นรอบ" v={d.bottom} color="#4ade80" onClick={() => setOpen(open === 'bottom-signals' ? null : 'bottom-signals')} />
          <Verdict title="สัญญาณยอดรอบ" v={d.peak} color="#fb7185" onClick={() => setOpen(open === 'peak-signals' ? null : 'peak-signals')} />
        </div>
      </div>
      {(open === 'bottom-signals' || open === 'peak-signals') && <Checklist id={open} />}

      <section>
        <div className="text-sm font-semibold mb-1.5">ตัวชี้วัดหลัก</div>
        <div className="grid grid-cols-2 gap-2">
          {G.map((g) => (
            <button key={g.id} onClick={() => setOpen(open === g.id ? null : g.id)} className={`text-left rounded-xl border-2 p-2.5 ${open === g.id ? 'border-slate-800' : 'border-slate-200'}`} data-testid={`gauge-${g.id}`}>
              <div className="flex items-baseline justify-between gap-1"><span className="text-[11px] text-slate-500 truncate">{g.name}</span><span className="text-[10px] font-semibold" style={{ color: ZONE_COLOR[g.zone] }}>{ZONE_TH[g.zone]}</span></div>
              <div className="text-xl font-extrabold tabular-nums">{g.val}</div>
              <div className="relative h-1.5 rounded-full mt-1" style={{ background: 'linear-gradient(90deg,#22c55e,#38bdf8 35%,#f59e0b 70%,#ef4444)' }}>
                <span className="absolute -top-[3px] w-3 h-3 rounded-full bg-white border-2 border-slate-800 -translate-x-1/2" style={{ left: `${g.pos * 100}%` }} />
              </div>
            </button>
          ))}
        </div>
        {G.find((g) => g.id === open) && <GaugeHistory g={G.find((g) => g.id === open)} />}
      </section>

      <Ladder d={d} M={M} myAvg={myAvg} />
      <p className="text-[11px] text-slate-400">ตัวชี้วัดออนเชนอัปเดตวันละครั้ง · ใช้ประกอบการตัดสินใจ ไม่ใช่คำแนะนำการลงทุน</p>
    </div>
  )
}

function Verdict({ title, v, color, onClick }) {
  if (!v) return null
  return (
    <button onClick={onClick} className="text-left rounded-xl bg-black/25 p-2.5" data-testid="cycle-verdict">
      <div className="text-[10px] opacity-80">{title}</div>
      <div className="font-bold">{verdictTh(v.verdict)}</div>
      <div className="text-[11px] opacity-90">ถึงเกณฑ์ {v.hitCount}/{v.total} ข้อ · ใกล้เกณฑ์เฉลี่ย {Math.round(v.avgProgress)}%</div>
      <div className="h-1 rounded-full bg-white/20 mt-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${v.avgProgress}%`, background: color }} /></div>
      <div className="text-[10px] opacity-70 mt-1">แตะเพื่อดูทีละข้อ</div>
    </button>
  )
}

function Checklist({ id }) {
  const [c, setC] = useState(null)
  useEffect(() => { let a = true; setC(null); loadChecklist(id).then((x) => a && setC(x)).catch(() => a && setC({ signals: [] })); return () => { a = false } }, [id])
  if (!c) return <div className="text-xs text-slate-500">กำลังโหลด…</div>
  const fmt = (s, x) => (x == null ? '—' : s.format === 'pct' ? `${(x * 100).toFixed(1)}%` : s.format === 'usd' ? `$${Math.round(x).toLocaleString()}` : Number(x).toLocaleString('en-US', { maximumFractionDigits: 2 }))
  return (
    <div className="card p-3 space-y-2" data-testid="cycle-checklist">
      <div className="text-sm font-semibold">{id === 'bottom-signals' ? 'เช็กลิสต์ก้นรอบ' : 'เช็กลิสต์ยอดรอบ'}</div>
      {(c.signals || []).filter((s) => !/open.?interest|funding|long.?short|taker/i.test(`${s.id} ${s.name}`)).map((s) => (
        <div key={s.id} className="text-xs">
          <div className="flex justify-between gap-2"><span className="font-medium">{s.hit ? <Emo e="✅" size={13} /> : '⬜'} {s.name}</span><span className="tabular-nums text-slate-500">{s.currentLabel || fmt(s, s.current)} {s.refOp} {fmt(s, s.reference)}</span></div>
          {s.note && <div className="text-[10px] text-slate-500">{s.note}</div>}
          <div className="h-1 rounded-full bg-slate-100 mt-0.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, s.progress || 0))}%`, background: s.hit ? '#16a34a' : '#94a3b8' }} /></div>
        </div>
      ))}
    </div>
  )
}

const RANGES = [['1y', '1 ปี', 365], ['4y', '4 ปี', 1461], ['all', 'ทั้งหมด', null]]
function GaugeHistory({ g }) {
  const [range, setRange] = useState('4y')
  const [pts, setPts] = useState(null)
  useEffect(() => {
    let a = true; setPts(null)
    const days = RANGES.find((r) => r[0] === range)[2]
    const from = days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : null
    loadCycleHistory(g.id, g.field, from).then((p) => a && setPts(p)).catch(() => a && setPts([]))
    return () => { a = false }
  }, [g.id, g.field, range])
  const W = 600, Hh = 180, P = 6
  const view = useMemo(() => {
    if (!pts?.length) return null
    const ys = pts.map((p) => p[1]).concat(g.refs.map((r) => r[0]))
    const lo = Math.min(...ys), hi = Math.max(...ys), t0 = pts[0][0], t1 = pts[pts.length - 1][0]
    const x = (t) => P + ((t - t0) / Math.max(1, t1 - t0)) * (W - 2 * P), y = (v) => Hh - P - ((v - lo) / Math.max(1e-9, hi - lo)) * (Hh - 2 * P)
    return { path: pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(''), refs: g.refs.map(([v, l]) => ({ y: y(v), l, v })), t0, t1, last: pts[pts.length - 1] }
  }, [pts, g])
  return (
    <div className="card p-3 mt-2" data-testid="gauge-history">
      <div className="text-sm font-semibold">{g.histName || g.name}</div>
      <div className="text-[11px] text-slate-500">{g.about}</div>
      <div className="flex gap-1 mt-2">{RANGES.map(([k, l]) => <button key={k} onClick={() => setRange(k)} className={`px-2 py-0.5 rounded-lg text-xs ${range === k ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>)}</div>
      {!view ? <div className="h-[180px] grid place-items-center text-xs text-slate-400">{pts ? 'ไม่มีข้อมูลย้อนหลัง' : 'กำลังโหลด…'}</div> : (
        <svg viewBox={`0 0 ${W} ${Hh}`} className="w-full h-[180px] mt-1">
          {view.refs.map((r, i) => <g key={i}><line x1={0} x2={W} y1={r.y} y2={r.y} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1" /><text x={W - 4} y={r.y - 3} textAnchor="end" fontSize="11" fill="#64748b">{r.l} {r.v}</text></g>)}
          <path d={view.path} fill="none" stroke="#0f766e" strokeWidth="2" />
        </svg>
      )}
      {view && <div className="flex justify-between text-[10px] text-slate-400"><span>{new Date(view.t0).getFullYear()}</span><span>ล่าสุด {Number(view.last[1]).toFixed(2)}</span><span>{new Date(view.t1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })}</span></div>}
    </div>
  )
}

/** price ladder: key cost levels, today's price and your own average cost on one log scale */
function Ladder({ d, M, myAvg }) {
  const price = d.price
  const rows = [...levels(d), { p: price, name: 'ราคาตอนนี้', now: true }, ...(myAvg > 0 ? [{ p: myAvg, name: 'ต้นทุนเฉลี่ยของคุณ', mine: true }] : [])].sort((a, b) => b.p - a.p)
  const lo = Math.log(Math.min(...rows.map((r) => r.p)) * 0.95), hi = Math.log(Math.max(...rows.map((r) => r.p)) * 1.05)
  const pos = (p) => (Math.log(p) - lo) / (hi - lo)
  return (
    <section data-testid="cycle-ladder">
      <div className="text-sm font-semibold mb-1.5">บันไดราคา (ต้นทุนสำคัญของตลาด)</div>
      <div className="card p-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.name} className={`flex items-center gap-2 text-xs ${r.now ? 'font-bold' : ''}`}>
            <div className="w-28 shrink-0 truncate" style={{ color: r.now ? '#0f766e' : r.mine ? '#d97706' : undefined }}>{r.now ? '▶ ' : r.mine ? '★ ' : ''}{r.name}</div>
            <div className="flex-1 h-2 rounded-full bg-slate-100 relative"><span className="absolute top-0 h-2 rounded-full" style={{ width: `${pos(r.p) * 100}%`, background: r.now ? '#0f766e' : r.mine ? '#f59e0b' : r.p > price ? '#fca5a5' : '#86efac' }} /></div>
            <div className="w-20 text-right tabular-nums shrink-0">{M(r.p)}</div>
            <div className={`w-12 text-right tabular-nums shrink-0 ${r.now ? 'text-slate-400' : r.p > price ? 'text-rose-600' : 'text-emerald-600'}`}>{r.now ? '' : `${r.p > price ? '+' : ''}${(((r.p - price) / price) * 100).toFixed(0)}%`}</div>
          </div>
        ))}
        <div className="text-[10px] text-slate-500 pt-1">เขียว = ราคาตอนนี้สูงกว่าระดับนั้น (ยืนเหนือแนวรับ) · แดง = ยังต่ำกว่า · % คือระยะห่างจากราคาตอนนี้</div>
        {myAvg > 0 && <div className="text-[11px] text-amber-700">ต้นทุนของคุณ{myAvg < d.mvrv?.realizedPrice ? 'ต่ำกว่าต้นทุนเฉลี่ยทั้งตลาด 👍' : myAvg < price ? 'ต่ำกว่าราคาตอนนี้ (กำไรอยู่)' : `สูงกว่าราคาตอนนี้ ${(((myAvg - price) / price) * 100).toFixed(0)}%`}</div>}
      </div>
    </section>
  )
}
