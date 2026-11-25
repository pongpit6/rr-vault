import { useEffect, useState } from 'react'
import { Sheet } from './ui'

/**
 * Compact paged grid: small tiles (art + short name + one badge line), tap a tile for the details sheet.
 * items: [{ id, art, name, badge?, on?, owned?, dim?, testid? }]
 * detail(item) → JSX for the sheet body (title = item.name). perPage tiles per page with ◀ ▶.
 */
export default function ItemGrid({ items, detail, perPage = 12, cols = 4, testid, page: pageIn }) {
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const [page, setPage] = useState(pageIn || 0)
  const [sel, setSel] = useState(null)
  useEffect(() => { if (page >= pages) setPage(pages - 1) }, [pages]) // eslint-disable-line
  const shown = items.slice(page * perPage, page * perPage + perPage)
  const cur = sel && items.find((x) => x.id === sel)
  return (
    <div data-testid={testid}>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {shown.map((it) => (
          <button key={it.id} onClick={() => setSel(it.id)} data-testid={it.testid}
            className={`relative px-inner p-1.5 flex flex-col items-center text-center min-w-0 ${it.on ? 'ring-2 ring-teal-500' : ''} ${it.dim ? 'opacity-60' : ''}`}>
            {it.owned && <span className="absolute top-0.5 right-1 text-[10px] font-bold text-teal-600">✓</span>}
            <div className="h-10 grid place-items-center">{it.art}</div>
            <div className="text-[10px] font-semibold leading-tight mt-0.5 w-full truncate">{it.name}</div>
            {it.badge != null && <div className="text-[10px] leading-tight w-full truncate">{it.badge}</div>}
          </button>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-2 text-xs" data-testid={testid ? `${testid}-pager` : undefined}>
          <button className="px-btn !py-0.5 !px-2.5" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="หน้าก่อน">◀</button>
          <span className="num text-slate-600">{page + 1}/{pages}</span>
          <button className="px-btn !py-0.5 !px-2.5" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="หน้าถัดไป">▶</button>
        </div>
      )}
      {cur && (
        <Sheet open onClose={() => setSel(null)} title={cur.name}>
          <div data-testid={testid ? `${testid}-sheet` : undefined}>{detail(cur, () => setSel(null))}</div>
        </Sheet>
      )}
    </div>
  )
}

/** the big art + lines block used at the top of most detail sheets */
export function DetailHead({ art, lines }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-20 h-20 grid place-items-center px-inner shrink-0">{art}</div>
      <div className="text-xs space-y-0.5 min-w-0">{lines.filter(Boolean).map((l, i) => <div key={i}>{l}</div>)}</div>
    </div>
  )
}
