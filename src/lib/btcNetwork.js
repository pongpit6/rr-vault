import { useEffect, useState } from 'react'
import { NEXT_HALVING_HEIGHT, rewardAt } from './powerlaw'

/**
 * Live Bitcoin network numbers from mempool.space (fallback: blockchain.info for the height).
 * Refreshes every minute while the page is open.
 */
async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json() }
async function getText(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.text() }

export async function fetchNetwork() {
  const out = { at: Date.now() }
  try { out.height = Number(await getText('https://mempool.space/api/blocks/tip/height')) } catch {
    try { out.height = Number(await getText('https://blockchain.info/q/getblockcount?cors=true')) } catch { /* offline */ }
  }
  try {
    const d = await getJSON('https://mempool.space/api/v1/difficulty-adjustment')
    out.blockTimeMs = d.timeAvg || null
    out.retargetPct = d.progressPercent ?? null
    out.diffChange = d.difficultyChange ?? null
  } catch { /* keep going */ }
  try {
    const p = await getJSON('https://mempool.space/api/v1/mining/pools/24h')
    out.blocks24h = p.blockCount ?? (p.pools || []).reduce((s, x) => s + (x.blockCount || 0), 0)
  } catch { /* keep going */ }
  if (!out.height) throw new Error('no data')
  const avg = out.blockTimeMs || (out.blocks24h ? 86400000 / out.blocks24h : 600000)
  out.reward = rewardAt(out.height)
  out.remaining = NEXT_HALVING_HEIGHT - out.height
  out.nextHalvingAt = Date.now() + out.remaining * avg
  out.epochPct = 1 - out.remaining / 210000
  out.avgMin = avg / 60000
  try { localStorage.setItem('vault:btcNet', JSON.stringify(out)) } catch { /* storage full */ }
  return out
}

export function useBtcNetwork() {
  const [net, setNet] = useState(() => { try { return JSON.parse(localStorage.getItem('vault:btcNet') || 'null') } catch { return null } })
  const [err, setErr] = useState(false)
  useEffect(() => {
    let alive = true
    const run = () => fetchNetwork().then((n) => { if (alive) { setNet(n); setErr(false) } }).catch(() => alive && setErr(true))
    run()
    const iv = setInterval(() => { if (document.visibilityState === 'visible') run() }, 60000)
    return () => { alive = false; clearInterval(iv) }
  }, [])
  return { net, err }
}
