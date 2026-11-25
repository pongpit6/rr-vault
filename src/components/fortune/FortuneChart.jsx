import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PxIcon } from '../px'

// Shared fortune charts. Hover (mouse) shows a tooltip; click/tap selects and fills the detail box under the chart,
// whose "อ่านเต็ม" button opens the full reading. On phones, dragging a finger across the chart scrubs through it.
//  · TimeChart (A): step line over level bands, for periods of unequal length (มหาทักษา).
//  · BlockChart (B): one coloured block per item with score and labels (BaZi years, luck pillars, hours).

/** levels: [{ th, color, min }] from worst to best; a value belongs to the last level whose min ≤ v */
export const levelOf = (levels, v) => levels.reduce((a, l) => (v >= l.min ? l : a), levels[0])
export const TAKSA_LEVELS = [{ th: 'หนัก', color: '#dc2626', min: -99 }, { th: 'ระวัง', color: '#f97316', min: -1.5 }, { th: 'กลาง ๆ', color: '#94a3b8', min: -0.49 }, { th: 'ดี', color: '#0ea5e9', min: 1 }, { th: 'ดีมาก', color: '#16a34a', min: 2 }]
const sgn = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 10) / 10}`

function useWidth() {
  const ref = useRef(null), [w, setW] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return
    const set = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width)))
    set()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null
    ro?.observe(el); return () => ro?.disconnect()
  }, [])
  return [ref, w]
}

const Chip = ({ l }) => <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: l.color }}>{l.th}</span>

function Tip({ tip, w }) {
  if (!tip) return null
  const left = Math.min(Math.max(tip.x - 90, 0), w - 180)
  return (
    <div className="absolute z-10 pointer-events-none w-[180px] rounded-md border-2 border-slate-800 bg-white px-2 py-1 text-[11px] leading-snug shadow" style={{ left, top: tip.y }} data-testid="chart-tip">
      <div className="font-bold">{tip.it.title}</div>
      {tip.it.sub && <div className="text-slate-500">{tip.it.sub}</div>}
      <div style={{ color: tip.l.color }} className="font-semibold">{tip.l.th}{tip.it.v != null ? ` · ${sgn(tip.it.v)}` : ''}</div>
    </div>
  )
}

function Detail({ it, l, onPrev, onNext, testid }) {
  if (!it) return null
  return (
    <div className="px-inner p-2 text-xs space-y-1" data-testid={testid}>
      <div className="flex items-center gap-1.5">
        <button className="px-btn shrink-0 !px-2.5 !py-1 text-xs" onClick={onPrev} aria-label="ก่อนหน้า" data-testid={testid && `${testid}-prev`}>◀</button>
        {it.icon && <PxIcon name={it.icon} size={18} />}
        <b className="flex-1 min-w-0 truncate">{it.title}</b>
        <Chip l={l} />
        <button className="px-btn shrink-0 !px-2.5 !py-1 text-xs" onClick={onNext} aria-label="ถัดไป" data-testid={testid && `${testid}-next`}>▶</button>
      </div>
      {it.sub && <div className="text-slate-500">{it.sub}{it.now ? ' · ตอนนี้' : ''}</div>}
      {it.text && <div className="line-clamp-3">{it.text}</div>}
      {it.onOpen && <button className="ui-link text-[11px]" onClick={it.onOpen} data-testid={`${testid}-open`}>อ่านเต็ม ›</button>}
    </div>
  )
}

function useSelection(items) {
  const cur = Math.max(0, items.findIndex((x) => x.now))
  const [sel, setSel] = useState(cur)
  const key = items.length + ':' + (items[0]?.title || '')
  useEffect(() => { setSel(cur) }, [key]) // eslint-disable-line
  const i = Math.min(sel, items.length - 1)
  return [i, setSel, () => setSel(Math.max(0, i - 1)), () => setSel(Math.min(items.length - 1, i + 1))]
}

export function Legend({ levels }) {
  return <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">{[...levels].reverse().map((l) => <span key={l.th} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />{l.th}</span>)}</div>
}

/**
 * A: items [{ from, to, v, title, sub, text, icon, now, onOpen }] on a numeric x axis (ages or ms).
 * ticks [{ x, label }]; nowX draws the "วันนี้" line; yMin/yMax bound the value axis.
 */
export function TimeChart({ items, levels = TAKSA_LEVELS, x0, x1, ticks = [], nowX, yMin = -3, yMax = 3, testid, xTitle }) {
  const [ref, w] = useWidth()
  const h = Math.round(Math.min(260, Math.max(190, w * 0.4)))
  const [sel, setSel, prev, next] = useSelection(items)
  const [tip, setTip] = useState(null)
  const L = 44, R = 8, T = 10, B = 34, iw = w - L - R, ih = h - T - B
  const X = (v) => L + ((v - x0) / (x1 - x0)) * iw, Yv = (v) => T + ((yMax - Math.max(yMin, Math.min(yMax, v))) / (yMax - yMin)) * ih
  const bands = levels.map((l, i) => ({ l, top: Yv(Math.min(yMax, levels[i + 1]?.min ?? yMax)), bot: Yv(Math.max(yMin, l.min)) }))
  const path = items.map((s, i) => `${i ? 'L' : 'M'}${X(Math.max(s.from, x0))},${Yv(s.v)}L${X(Math.min(s.to, x1))},${Yv(s.v)}`).join('')
  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left, xv = x0 + ((px - L) / iw) * (x1 - x0)
    let k = items.findIndex((s) => xv >= s.from && xv < s.to)
    if (k < 0) k = xv < x0 ? 0 : items.length - 1
    return { k, px }
  }
  const s = items[sel]
  return (
    <div data-testid={testid} className="space-y-1.5">
      <div ref={ref} className="relative select-none">
        <svg width={w} height={h} className="block" style={{ touchAction: 'pan-y' }}
          onPointerMove={(e) => { const { k, px } = pick(e); if (e.pointerType === 'mouse') setTip({ it: items[k], l: levelOf(levels, items[k].v), x: px, y: Math.max(0, Yv(items[k].v) - 70) }); else if (e.buttons) setSel(k) }}
          onPointerLeave={() => setTip(null)}
          onPointerDown={(e) => { const { k } = pick(e); setSel(k); if (e.pointerType !== 'mouse') setTip(null) }}>
          {bands.map(({ l, top, bot }) => bot > top && <g key={l.th}><rect x={L} y={top} width={iw} height={bot - top} fill={l.color} opacity={0.1} /><text x={L - 5} y={(top + bot) / 2 + 3} textAnchor="end" fontSize="10" fill={l.color} fontWeight="700">{l.th}</text></g>)}
          <line x1={L} x2={L + iw} y1={Yv(0)} y2={Yv(0)} stroke="#94a3b8" strokeDasharray="2 3" />
          {s && <rect x={X(Math.max(s.from, x0))} y={T} width={Math.max(2, X(Math.min(s.to, x1)) - X(Math.max(s.from, x0)))} height={ih} fill="#64748b" opacity={0.14} />}
          <path d={path} fill="none" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
          {items.map((it, i) => { const a = X(Math.max(it.from, x0)), b = X(Math.min(it.to, x1)); return <rect key={i} x={a + 0.5} y={Yv(it.v) - 3} width={Math.max(1.5, b - a - 1)} height={6} rx={2} fill={levelOf(levels, it.v).color} stroke={i === sel ? '#0f172a' : 'none'} strokeWidth="1.5" /> })}
          {nowX != null && nowX >= x0 && nowX <= x1 && <g><line x1={X(nowX)} x2={X(nowX)} y1={T} y2={T + ih} stroke="#db2777" strokeWidth="1.5" strokeDasharray="4 3" /><text x={Math.min(X(nowX) + 3, L + iw - 30)} y={T + 9} fontSize="10" fill="#db2777" fontWeight="700">วันนี้</text></g>}
          <line x1={L} x2={L + iw} y1={T + ih} y2={T + ih} stroke="#64748b" />
          {ticks.map((t) => X(t.x) >= L - 1 && X(t.x) <= L + iw + 1 && <g key={t.x}><line x1={X(t.x)} x2={X(t.x)} y1={T + ih} y2={T + ih + 4} stroke="#64748b" /><text x={X(t.x)} y={T + ih + 15} textAnchor="middle" fontSize="10" fill="#475569">{t.label}</text></g>)}
          {xTitle && <text x={L + iw} y={h - 3} textAnchor="end" fontSize="9" fill="#64748b">{xTitle}</text>}
        </svg>
        <Tip tip={tip} w={w} />
      </div>
      <Detail it={s} l={s && levelOf(levels, s.v)} onPrev={prev} onNext={next} testid={testid && `${testid}-detail`} />
    </div>
  )
}

/**
 * B: items [{ v, lvl?, title, sub, text, top, bottom, icon, now, onOpen }] — one block each, equal width.
 * compact = thin strip without score text (hours of a day).
 */
export function BlockChart({ items, levels, compact = false, testid }) {
  const [ref, w] = useWidth()
  const [sel, setSel, prev, next] = useSelection(items)
  const [tip, setTip] = useState(null)
  const n = items.length, cw = w / n, bh = compact ? 22 : 46
  const lv = (it) => (it.lvl != null ? levels[it.lvl] : levelOf(levels, it.v))
  const pickK = (e) => { const r = e.currentTarget.getBoundingClientRect(); return Math.max(0, Math.min(n - 1, Math.floor(((e.clientX - r.left) / r.width) * n))) }
  return (
    <div data-testid={testid} className="space-y-1.5">
      <div ref={ref} className="relative select-none" style={{ touchAction: 'pan-y' }}
        onPointerMove={(e) => { const k = pickK(e); if (e.pointerType === 'mouse') setTip({ it: items[k], l: lv(items[k]), x: (k + 0.5) * cw, y: bh + (compact ? 22 : 40) }); else if (e.buttons) setSel(k) }}
        onPointerLeave={() => setTip(null)}
        onPointerDown={(e) => { setSel(pickK(e)); if (e.pointerType !== 'mouse') setTip(null) }}>
        <div className="flex">
          {items.map((it, i) => { const l = lv(it); return (
            <div key={i} className="flex flex-col items-center" style={{ width: cw }} data-testid={testid && `${testid}-${i}`}>
              <div className="text-[9px] h-3 leading-3 font-bold text-pink-600">{it.now ? (compact ? '▼' : 'ตอนนี้') : ''}</div>
              <div className="grid place-items-center rounded-md text-white font-bold" style={{ width: Math.max(8, cw - (compact ? 2 : 4)), height: bh, background: l.color, outline: i === sel ? '2px solid #0f172a' : it.now ? '2px solid #db2777' : undefined, outlineOffset: 1, fontSize: cw < 30 ? 10 : 12 }}>
                {!compact && (it.top ?? sgn(it.v))}
              </div>
              {it.icon && !compact && <PxIcon name={it.icon} size={Math.min(16, cw - 6)} className="mt-0.5" />}
              <div className="text-[9px] text-slate-600 leading-tight text-center whitespace-nowrap overflow-hidden" style={{ maxWidth: cw }}>{it.bottom}</div>
            </div>) })}
        </div>
        <Tip tip={tip} w={w} />
      </div>
      <Detail it={items[sel]} l={items[sel] && lv(items[sel])} onPrev={prev} onNext={next} testid={testid && `${testid}-detail`} />
    </div>
  )
}
