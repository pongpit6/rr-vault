import { useLayoutEffect, useRef, useState } from 'react'

// Inventory grid in the style of classic MMO bags: square slots, item icon, stack count in the corner,
// empty slots filling the rows. Hover (mouse) shows a name tooltip; tap/click selects the slot and the
// parent renders the detail panel for `selected`.
const SLOT = 50

export default function BagGrid({ items, icon, tip, selected, onSelect, minRows = 3, testid }) {
  const ref = useRef(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return
    const set = () => setW(el.getBoundingClientRect().width || 320)
    set()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null
    ro?.observe(el); return () => ro?.disconnect()
  }, [])
  const cols = Math.max(4, Math.floor((w + 4) / (SLOT + 4)))
  const total = Math.max(minRows * cols, Math.ceil(items.length / cols) * cols)
  const cell = (w - (cols - 1) * 4) / cols
  const hv = hover != null && items[hover]
  return (
    <div ref={ref} className="relative" data-testid={testid} onPointerLeave={() => setHover(null)}>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: total }, (_, i) => {
          const it = items[i]
          if (!it) return <div key={`e${i}`} className="aspect-square rounded-[3px] border border-amber-200 bg-amber-50/60" style={{ boxShadow: 'inset 1px 1px 0 rgba(0,0,0,.08)' }} />
          const on = selected === it.k
          return (
            <button key={it.k} onClick={() => onSelect(on ? null : it.k)} data-testid={testid && `${testid}-${it.k.replace(':', '_')}`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
              className={`relative aspect-square rounded-[3px] border grid place-items-center ${on ? 'border-sky-500 bg-sky-50' : 'border-amber-300 bg-amber-50 hover:bg-amber-100'}`}
              style={{ boxShadow: on ? '0 0 0 2px #0ea5e9' : 'inset 1px 1px 0 rgba(255,255,255,.7), inset -1px -1px 0 rgba(0,0,0,.08)' }}
              aria-label={`${it.name} ×${it.n}`}>
              {icon(it.k, Math.round(cell * 0.68))}
              <span className="absolute right-0.5 bottom-0 text-[10px] font-bold text-white leading-none tabular-nums" style={{ textShadow: '1px 0 0 #000,-1px 0 0 #000,0 1px 0 #000,0 -1px 0 #000' }}>{it.n > 999 ? '999+' : it.n}</span>
              {it.badge && <span className="absolute left-0.5 top-0.5">{it.badge}</span>}
            </button>
          )
        })}
      </div>
      {hv && (() => {
        const r = Math.floor(hover / cols), c = hover % cols
        const left = Math.min(Math.max(c * (cell + 4) + cell / 2 - 110, 0), w - 220)
        return (
          <div className="absolute z-20 pointer-events-none w-[220px] rounded-md border-2 border-slate-800 bg-white dark:bg-slate-900 p-2 text-[11px] leading-snug shadow-lg" style={{ left, top: (r + 1) * (cell + 4) + 2 }} data-testid="bag-tip">
            {tip(hv)}
          </div>
        )
      })()}
    </div>
  )
}
