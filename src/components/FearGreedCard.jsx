import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useFng, loadFng, FNG_ZONES, fngZone } from '../lib/market'
import { useStore } from '../store'

const SOURCES = [
  { id: 'cmc', label: 'CoinMarketCap', sub: 'อัปเดตระหว่างวัน' },
  { id: 'alt', label: 'Alternative.me', sub: 'อัปเดตวันละครั้ง' },
]
const RANGES = [[30, '30 วัน'], [90, '90 วัน']]
const DAY = 86400_000

const thTime = (t) => new Date(t).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
const thDate = (t) => new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'เมื่อสักครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} ชม. ที่แล้ว` : thDate(t)
}

/** value at (or just before) `t` in a time-sorted series */
const at = (series, t) => { let v = null; for (const p of series) { if (p.t <= t + 3600_000) v = p; else break } return v }

export default function FearGreedCard() {
  const data = useFng((s) => s.data)
  const status = useFng((s) => s.status)
  const src0 = useStore((s) => s.ui.fngSrc) || 'cmc'
  const setUi = useStore((s) => s.setUi)
  const [range, setRange] = useState(30)

  useEffect(() => {
    loadFng()
    const id = setInterval(() => document.visibilityState === 'visible' && loadFng(), 5 * 60_000)
    const vis = () => document.visibilityState === 'visible' && loadFng()
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [])

  const src = data?.[src0] ? src0 : data?.cmc ? 'cmc' : 'alt'
  const d = data?.[src]
  const view = useMemo(() => {
    if (!d?.now) return null
    const series = (d.series || []).slice().sort((a, b) => a.t - b.t)
    const now = d.now
    const cmp = (label, days, given) => {
      const p = given || at(series, now.t - days * DAY)
      return p ? { label, score: p.score ?? p.v, t: p.t } : null
    }
    return {
      now, series,
      zone: fngZone(now.score, now.name),
      compare: [cmp('เมื่อวาน', 1, d.yesterday), cmp('7 วันก่อน', 7, d.lastWeek), cmp('30 วันก่อน', 30, d.lastMonth)].filter(Boolean),
      yearHigh: d.yearHigh, yearLow: d.yearLow,
    }
  }, [d])

  const fresh = view && Date.now() - view.now.t < 45 * 60_000

  return (
    <section className="card p-4 md:p-5 space-y-4" data-testid="fng-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <span>Fear &amp; Greed Index</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-600">BTC</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
            {view ? (
              <>
                {fresh && <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" /><span className="relative w-2 h-2 rounded-full bg-emerald-500" /></span>}
                อัปเดต {thTime(view.now.t)} · {ago(view.now.t)}
                {src === 'alt' && d.now.nextIn ? ` · ค่าใหม่ในอีก ${Math.max(1, Math.round(d.now.nextIn / 3600))} ชม.` : ''}
              </>
            ) : status === 'error' ? 'โหลดไม่สำเร็จ ลองใหม่อีกครั้ง' : 'กำลังโหลด…'}
          </div>
        </div>
        <button onClick={() => loadFng(true)} className="p-2 -m-1 rounded-xl hover:bg-slate-900/5 text-slate-500" aria-label="รีเฟรช Fear & Greed">
          <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="ui-seg flex p-1 rounded-2xl bg-slate-900/[.04] gap-1">
        {SOURCES.map((s) => (
          <button key={s.id} disabled={!data?.[s.id]} onClick={() => setUi({ fngSrc: s.id })}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs transition disabled:opacity-40 ${src === s.id ? 'ui-seg-on bg-white shadow-sm font-semibold' : 'text-slate-500'}`}>
            {s.label}<span className="block text-[10px] font-normal opacity-70">{s.sub}</span>
          </button>
        ))}
      </div>

      {view && (
        <div className="grid md:grid-cols-[minmax(240px,300px)_1fr] gap-5 items-center">
          <div className="flex flex-col items-center">
            <Gauge value={view.now.score} />
            <div className="mt-1 text-center">
              <div className="num text-4xl font-bold leading-none" style={{ color: view.zone.color }} data-testid="fng-score">{view.now.score}</div>
              <div className="font-semibold mt-1" style={{ color: view.zone.color }}>{view.zone.th}</div>
              <div className="text-[11px] text-slate-500">{view.zone.en}</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {view.compare.map((c) => {
                const z = fngZone(c.score), diff = view.now.score - c.score
                const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
                return (
                  <div key={c.label} className="rounded-2xl border border-slate-200 p-2.5">
                    <div className="text-[11px] text-slate-500">{c.label}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="num text-lg font-bold" style={{ color: z.color }}>{c.score}</span>
                      <span className="text-[10px] text-slate-500 truncate">{z.th}</span>
                    </div>
                    <div className={`text-[10px] flex items-center gap-0.5 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      <Icon size={11} /> {diff > 0 ? '+' : ''}{diff} จุด
                    </div>
                  </div>
                )
              })}
            </div>
            {(view.yearHigh || view.yearLow) && (
              <div className="flex gap-2 text-[11px]">
                {view.yearHigh && <span className="flex-1 rounded-xl bg-slate-900/[.04] px-2.5 py-1.5">สูงสุดรอบปี <b className="num" style={{ color: fngZone(view.yearHigh.score).color }}>{view.yearHigh.score}</b> <span className="text-slate-500">{thDate(view.yearHigh.t)}</span></span>}
                {view.yearLow && <span className="flex-1 rounded-xl bg-slate-900/[.04] px-2.5 py-1.5">ต่ำสุดรอบปี <b className="num" style={{ color: fngZone(view.yearLow.score).color }}>{view.yearLow.score}</b> <span className="text-slate-500">{thDate(view.yearLow.t)}</span></span>}
              </div>
            )}
            <ZoneBar value={view.now.score} />
          </div>
        </div>
      )}

      {view && view.series.length > 2 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium">ย้อนหลัง {range} วัน{src === 'cmc' && <span className="text-slate-500 font-normal"> · เส้นจาง = ราคา BTC</span>}</div>
            <div className="flex gap-1">
              {RANGES.map(([r, l]) => (
                <button key={r} onClick={() => setRange(r)} className={`text-[11px] px-2.5 py-1 rounded-lg border ${range === r ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`}>{l}</button>
              ))}
            </div>
          </div>
          <History series={view.series.filter((p) => p.t >= view.now.t - range * DAY)} />
        </div>
      )}

      <div className="text-[10px] text-slate-500 leading-relaxed">
        0 = กลัวสุดขีด · 100 = โลภสุดขีด · วัดอารมณ์ตลาดคริปโตจากความผันผวน โวลุ่ม โซเชียล และอื่นๆ เป็นข้อมูลประกอบ ไม่ใช่สัญญาณซื้อขาย
      </div>
    </section>
  )
}

/** semicircle gauge: five coloured bands + needle */
function Gauge({ value }) {
  const W = 240, R = 96, cx = W / 2, cy = 112, sw = 18
  const pt = (v, r = R) => { const a = Math.PI * (1 - v / 100); return [cx + r * Math.cos(a), cy - r * Math.sin(a)] }
  const arc = (a, b) => { const [x1, y1] = pt(a), [x2, y2] = pt(b); return `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}` }
  const [shown, setShown] = useState(50)
  useEffect(() => { const id = requestAnimationFrame(() => setShown(value)); return () => cancelAnimationFrame(id) }, [value])
  const ang = -90 + (shown / 100) * 180
  let lo = 0
  return (
    <svg viewBox={`0 0 ${W} 128`} className="w-full max-w-[260px]" role="img" aria-label={`Fear and Greed ${value}`}>
      {FNG_ZONES.map((z) => { const p = arc(lo + 0.8, z.max - 0.8); lo = z.max; return <path key={z.en} d={p} stroke={z.color} strokeWidth={sw} fill="none" strokeLinecap="butt" opacity={0.9} /> })}
      {[0, 25, 50, 75, 100].map((v) => { const [x, y] = pt(v, R - sw - 6); return <text key={v} x={x} y={y + 3} textAnchor="middle" fontSize="9" fill="currentColor" opacity=".45">{v}</text> })}
      <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'transform 900ms cubic-bezier(.2,.9,.25,1.15)' }}>
        <path d={`M${cx - 5},${cy} L${cx},${cy - R + 4} L${cx + 5},${cy} Z`} fill="currentColor" className="text-slate-800" />
      </g>
      <circle cx={cx} cy={cy} r="9" fill="currentColor" className="text-slate-800" />
      <circle cx={cx} cy={cy} r="3.5" fill="#fff" />
    </svg>
  )
}

function ZoneBar({ value }) {
  let lo = 0
  return (
    <div>
      <div className="relative flex h-2.5 rounded-full overflow-hidden">
        {FNG_ZONES.map((z) => { const w = z.max - lo; lo = z.max; return <div key={z.en} style={{ width: `${w}%`, background: z.color }} className="opacity-80" /> })}
        <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-800 shadow" style={{ left: `calc(${value}% - 7px)` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">{FNG_ZONES.map((z) => <span key={z.en}>{z.th}</span>)}</div>
    </div>
  )
}

/** score history with zone bands; BTC price as a faint second line when the source has it */
function History({ series }) {
  const ref = useRef(null)
  const wrap = useRef(null)
  const [hover, setHover] = useState(null)
  const [W, setW] = useState(600)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(260, Math.round(el.clientWidth))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = W < 500 ? 150 : 180, P = { l: 26, r: 8, t: 8, b: 18 }
  if (series.length < 2) return null
  const t0 = series[0].t, t1 = series[series.length - 1].t
  const x = (t) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - v / 100) * (H - P.t - P.b)
  const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const btc = series.filter((p) => p.btc)
  let btcLine = ''
  if (btc.length > 1) {
    const lo = Math.min(...btc.map((p) => p.btc)), hi = Math.max(...btc.map((p) => p.btc))
    const yb = (v) => P.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - P.t - P.b)
    btcLine = btc.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${yb(p.btc).toFixed(1)}`).join('')
  }
  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    const cx = (((e.touches?.[0]?.clientX ?? e.clientX) - r.left) / r.width) * W
    let best = series[0]
    for (const p of series) if (Math.abs(x(p.t) - cx) < Math.abs(x(best.t) - cx)) best = p
    setHover(best)
  }
  let lo = 0
  return (
    <div className="relative" ref={wrap}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full h-auto touch-pan-y" onMouseMove={move} onTouchStart={move} onTouchMove={move} onMouseLeave={() => setHover(null)} onTouchEnd={() => setHover(null)}>
        {FNG_ZONES.map((z) => { const r = <rect key={z.en} x={P.l} width={W - P.l - P.r} y={y(z.max)} height={y(lo) - y(z.max)} fill={z.color} opacity=".09" />; lo = z.max; return r })}
        {[0, 20, 40, 60, 80, 100].map((v) => <text key={v} x={P.l - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor" opacity=".45">{v}</text>)}
        {btcLine && <path d={btcLine} fill="none" stroke="#f7931a" strokeWidth="1.5" opacity=".35" />}
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" className="text-slate-800" />
        {[series[0], series[Math.floor(series.length / 2)], series[series.length - 1]].map((p, i) => (
          <text key={i} x={x(p.t)} y={H - 4} textAnchor={['start', 'middle', 'end'][i]} fontSize="9" fill="currentColor" opacity=".45">{thDate(p.t)}</text>
        ))}
        {hover && <>
          <line x1={x(hover.t)} x2={x(hover.t)} y1={P.t} y2={H - P.b} stroke="currentColor" opacity=".25" />
          <circle cx={x(hover.t)} cy={y(hover.v)} r="4.5" fill={fngZone(hover.v).color} stroke="#fff" strokeWidth="1.5" />
        </>}
      </svg>
      {hover && (
        <div className="absolute top-0 pointer-events-none text-[11px] rounded-lg px-2 py-1 shadow-lg" style={{ background: '#0f172a', color: '#fff', left: `clamp(0px, calc(${(x(hover.t) / W) * 100}% - 60px), calc(100% - 130px))` }}>
          {thDate(hover.t)} · <b style={{ color: fngZone(hover.v).color }}>{hover.v}</b> {fngZone(hover.v).th}
          {hover.btc ? <div className="opacity-75">BTC ${Math.round(hover.btc).toLocaleString()}</div> : null}
        </div>
      )}
    </div>
  )
}
