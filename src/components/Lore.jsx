import { useState } from 'react'
import { Sheet } from './ui'
import { loreOf } from '../lib/worldLore'

/** Compact optional reading inside existing details. */
export function LoreBlock({ category, id, title = 'เรื่องราว', defaultOpen = false }) {
  const text = loreOf(category, id)
  if (!text) return null
  return (
    <details key={category + ':' + id} open={defaultOpen || undefined} className="px-inner mt-2 p-3 text-left min-w-0" data-testid={'lore-' + category + '-' + id}>
      <summary className="cursor-pointer text-xs font-semibold text-teal-700 py-1">{title}</summary>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 break-words whitespace-pre-line">{text}</p>
    </details>
  )
}

/** A reading action never changes selection, purchases or skill ranks. */
export function LoreButton({ category, id, title, art, description, label = 'อ่านเรื่องราว' }) {
  const [open, setOpen] = useState(false)
  if (!loreOf(category, id)) return null
  return (
    <>
      <button type="button" className="ui-link inline-flex items-center min-h-8 py-1 text-[11px] text-teal-700" aria-label={'อ่านเรื่องราว: ' + title}
        onClick={(event) => { event.stopPropagation(); setOpen(true) }} data-testid={'lore-open-' + category + '-' + id}>{label}</button>
      {open && <Sheet open onClose={() => setOpen(false)} title={title}>
        <div data-testid="lore-reader">{art && <div className="mx-auto mb-3 w-fit px-inner p-3">{art}</div>}{description && <p className="text-xs leading-relaxed text-slate-600 mb-3">{description}</p>}<LoreBlock category={category} id={id} defaultOpen /></div>
      </Sheet>}
    </>
  )
}
