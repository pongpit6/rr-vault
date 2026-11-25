import { useState } from 'react'
import { logoUrl } from '../lib/subs'
import { logoCandidates, itemOf, fundKind, FUND_ICON, FUND_KIND_TH } from '../lib/portfolio'
import { PxIcon } from './px'

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
/** themed icon for an asset: the real logo for crypto / stocks when one loads, else pixel art (fund kind, gold, bond, ...) */
export function AssetIcon({ asset, size = 36 }) {
  const cands = asset?.type === 'fund' ? [] : logoCandidates(asset)
  const [i, setI] = useState(0)
  if (asset?.type === 'fund') {
    const ic = FUND_ICON[fundKind(asset)]
    return ic.startsWith('item:') ? <ItemSprite name={ic.slice(5)} size={size} /> : <PxIcon name={ic} size={size} />
  }
  const src = asset?.type === 'gold' || asset?.type === 'commodity' ? null : cands[i]
  return src
    ? <img src={src} alt="" width={size} height={size} className="object-contain" style={{ width: size, height: size }} onError={() => setI(i + 1)} referrerPolicy="no-referrer" />
    : <ItemSprite name={itemOf(asset)} size={size} />
}

export function AssetLogo({ asset, size = 40 }) {
  const cands = logoCandidates(asset)
  const [i, setI] = useState(0)
  if (asset?.type === 'fund') {
    return (
      <div className="shrink-0 grid place-items-center rounded-2xl bg-white border border-slate-200 overflow-hidden" style={{ width: size, height: size }} title={FUND_KIND_TH[fundKind(asset)]}>
        <AssetIcon asset={asset} size={Math.round(size * 0.78)} />
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
