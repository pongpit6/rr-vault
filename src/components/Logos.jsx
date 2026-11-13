import { useState } from 'react'
import { logoUrl } from '../lib/subs'
import { logoCandidates, itemOf, fundBadge } from '../lib/portfolio'

export function ItemSprite({ name, size = 32, className = '' }) {
  return <img src={`./sprites/item_${name}.png`} alt="" width={size} height={size} className={className} style={{ imageRendering: 'pixelated' }} />
}

/** Brand logo of a subscription service (its own site icon), with a letter fallback. */
export function SubLogo({ sub, size = 40 }) {
  const [bad, setBad] = useState(false)
  const src = sub.logo || logoUrl(sub.domain)
  const letter = (sub.name || '?').trim().charAt(0).toUpperCase()
  return (
    <div className="shrink-0 grid place-items-center rounded-2xl bg-white border border-slate-200 overflow-hidden" style={{ width: size, height: size }}>
      {src && !bad
        ? <img src={src} alt="" className="w-[70%] h-[70%] object-contain" onError={() => setBad(true)} referrerPolicy="no-referrer" />
        : <span className="font-bold text-slate-600" style={{ fontSize: size * 0.42 }}>{letter}</span>}
    </div>
  )
}

/** Real asset logo (coin / company) with the pixel item sprite as fallback. */
export function AssetLogo({ asset, size = 40 }) {
  const cands = logoCandidates(asset)
  const [i, setI] = useState(0)
  if (asset?.type === 'fund' && asset.code) {
    const b = fundBadge(asset.code)
    const tag = /SSF/i.test(asset.code) ? 'SSF' : /RMF/i.test(asset.code) ? 'RMF' : null
    return (
      <div className="shrink-0 relative grid place-items-center rounded-2xl font-bold overflow-hidden" style={{ width: size, height: size, background: b.bg, color: b.fg, fontSize: size * (b.text.length > 2 ? 0.27 : 0.36) }}>
        {b.text}
        {tag && <span className="absolute bottom-0 inset-x-0 text-center bg-black/25 text-white font-semibold" style={{ fontSize: Math.max(7, size * 0.18), lineHeight: 1.3 }}>{tag}</span>}
      </div>
    )
  }
  const src = cands[i]
  return (
    <div className="shrink-0 grid place-items-center rounded-2xl bg-white border border-slate-200 overflow-hidden" style={{ width: size, height: size }}>
      {src
        ? <img src={src} alt="" className="w-[78%] h-[78%] object-contain" onError={() => setI(i + 1)} referrerPolicy="no-referrer" />
        : <ItemSprite name={itemOf(asset)} size={Math.round(size * 0.8)} />}
    </div>
  )
}
