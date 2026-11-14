import { useEffect } from 'react'
import { useStore } from '../store'

/**
 * A preference that syncs across devices: stored as its own vault item (id = `id`, kind 'pref')
 * so it never overwrites other settings. Older builds kept it in device-local `ui[uiKey]`; that
 * value is folded in once — after the first cloud pull, so we don't clobber another device's copy.
 */
export function useSyncedPref(id, uiKey, { merge } = {}) {
  const item = useStore((s) => s.items[id])
  const local = useStore((s) => s.ui[uiKey])
  const ready = useStore((s) => s.ready && (!s.session || !!s.sync.at))
  const put = useStore((s) => s.put)
  const setUi = useStore((s) => s.setUi)
  const synced = item && !item.deleted ? item.data.value : undefined

  useEffect(() => {
    if (!ready || local === undefined) return
    const next = synced === undefined ? local : merge ? merge(synced, local) : synced
    if (JSON.stringify(next) !== JSON.stringify(synced)) put('pref', { id, value: next })
    setUi({ [uiKey]: undefined })
  }, [ready, local === undefined]) // eslint-disable-line

  const value = synced !== undefined ? synced : local
  const set = (v) => put('pref', { id, value: v })
  return [value, set]
}

/** union of two watchlists by symbol, keeping the order of `a` */
export const unionBySymbol = (a = [], b = []) => [...a, ...b.filter((x) => !a.some((y) => y.symbol === x.symbol))]
