import { useEffect, useState } from 'react'
import { useStore } from '../store'

/**
 * Auto dark: between `from` and `to` (local time, may wrap past midnight) the app uses Pixel Night;
 * the rest of the day it uses the theme the user picked. Device-local, like the theme itself.
 */
export const AUTO_DARK_DEFAULT = { on: false, from: '18:00', to: '06:00' }
const mins = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0) }

export function isNight(auto, d = new Date()) {
  if (!auto?.on) return false
  const n = d.getHours() * 60 + d.getMinutes(), a = mins(auto.from), b = mins(auto.to)
  return a === b ? true : a < b ? n >= a && n < b : n >= a || n < b
}
export function effectiveTheme(theme, auto, d) {
  const t = theme || 'pixel'
  return isNight(auto, d) ? 'pixel-night' : t
}

/** current theme id, re-evaluated every minute and when the app comes back to the foreground */
export function useActiveTheme() {
  const theme = useStore((s) => s.ui.theme)
  const auto = useStore((s) => s.ui.autoDark)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!auto?.on) return
    const id = setInterval(() => setTick((x) => x + 1), 30_000)
    const vis = () => document.visibilityState === 'visible' && setTick((x) => x + 1)
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
  }, [auto?.on])
  void tick // re-render trigger only
  return effectiveTheme(theme, auto)
}

/** first paint, before the store loads */
export function bootTheme() {
  try {
    const auto = JSON.parse(localStorage.getItem('vault:autoDark') || 'null')
    return effectiveTheme(localStorage.getItem('vault:themePick') || localStorage.getItem('vault:theme') || 'pixel', auto)
  } catch { return 'pixel' }
}
