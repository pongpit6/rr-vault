import { useMemo, useRef, useState } from 'react'
import { money, compact, shortDate, monthLabel } from '../lib/format'
import { useStore } from '../store'

/** Minimal area chart for net worth. Hover/touch shows the value of a day. */
export function AreaChart({ data, height = 180 }) {
  const ref = useRef(null)
  const [hover, setHover] = useState(null)
  const privacy = useStore((s) => s.ui.privacy)
  const W = 600, H = height, P = { l: 8, r: 8, t: 14, b: 22 }
  const { pts, min, max, path, area, zeroY } = useMemo(() => {
    const vals = data.map((d) => d.value)
    let min = Math.min(...vals), max = Math.max(...vals)
    if (min === max) { min -= 1; max += 1 }
    const pad = (max - min) * 0.12; min -= pad; max += pad
    const x = (i) => P.l + (i / Math.max(1, data.length - 1)) * (W - P.l - P.r)
    const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b)
    const pts = data.map((d, i) => [x(i), y(d.value)])
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
    const area = `${path}L${pts[pts.length - 1][0]},${H - P.b}L${pts[0][0]},${H - P.b}Z`
    return { pts, min, max, path, area, zeroY: min < 0 && max > 0 ? y(0) : null }
  }, [data, H]) // eslint-disable-line
  if (data.length < 2) return <div className="text-sm text-slate-500 py-8 text-center">ข้อมูลยังไม่พอสำหรับกราฟ ใช้งานต่ออีกสักวันแล้วกราฟจะเริ่มแสดง</div>
  const up = data[data.length - 1].value >= data[0].value
  const color = up ? '#10b981' : '#e11d48'
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * W
    const i = Math.round(((cx - P.l) / (W - P.l - P.r)) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }
  const h = hover != null ? data[hover] : null
  const hp = hover != null ? pts[hover] : null
  const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1]
  return (
    <div className="relative select-none">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" style={{ height }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchMove={onMove} onTouchEnd={() => setHover(null)}>
        <defs>
          <linearGradient id="nwfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {zeroY != null && <line x1={P.l} x2={W - P.r} y1={zeroY} y2={zeroY} stroke="#cbd5e1" strokeDasharray="4 4" />}
        <path d={area} fill="url(#nwfill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {ticks.map((i) => <text key={i} x={pts[i][0]} y={H - 5} fontSize="11" fill="#94a3b8" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>{shortDate(data[i].date)}</text>)}
        {hp && <>
          <line x1={hp[0]} x2={hp[0]} y1={P.t} y2={H - P.b} stroke="#94a3b8" strokeDasharray="3 3" />
          <circle cx={hp[0]} cy={hp[1]} r="5" fill="#fff" stroke={color} strokeWidth="2.5" />
        </>}
      </svg>
      {h && (
        <div className="absolute top-0 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs pointer-events-none whitespace-nowrap"
          style={{ left: `${(hp[0] / W) * 100}%`, transform: `translateX(${hp[0] > W * 0.7 ? '-100%' : hp[0] < W * 0.3 ? '0' : '-50%'})` }}>
          <div className="text-white/60">{shortDate(h.date)}{h.real ? '' : ' · ประมาณจากต้นทุน'}</div>
          <div className="font-semibold num">{privacy ? '••••' : money(h.value)}</div>
        </div>
      )}
      <div className="flex justify-between text-[10px] text-slate-400 num -mt-1"><span /><span>{privacy ? '' : `ต่ำสุด ${compact(Math.min(...data.map((d) => d.value)))} · สูงสุด ${compact(Math.max(...data.map((d) => d.value)))}`}</span></div>
    </div>
  )
}

/** Paired bars: income vs expense per month. */
export function MonthBars({ months, height = 160 }) {
  const privacy = useStore((s) => s.ui.privacy)
  const max = Math.max(1, ...months.flatMap((m) => [m.inc, m.exp]))
  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {months.map((m) => (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
            <div className="flex items-end gap-1 w-full justify-center h-full">
              <div className="w-[38%] max-w-[18px] rounded-t-md bg-emerald-400 transition-all" style={{ height: `${(m.inc / max) * 100}%` }} title={privacy ? '' : `รายรับ ${money(m.inc)}`} />
              <div className="w-[38%] max-w-[18px] rounded-t-md bg-rose-400 transition-all" style={{ height: `${(m.exp / max) * 100}%` }} title={privacy ? '' : `รายจ่าย ${money(m.exp)}`} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-1.5">
        {months.map((m) => <div key={m.key} className="flex-1 text-center text-[10px] text-slate-500">{monthLabel(m.key).split(' ')[0].slice(0, 6)}</div>)}
      </div>
      <div className="flex gap-4 justify-center mt-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400" />รายรับ</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-400" />รายจ่าย</span>
      </div>
    </div>
  )
}
