import { useMemo } from 'react'
import { useAccounts, useTxns, useSettings, useCategories, useStore, selectList } from '../store'
import { computeBalances, summarize, cardCycle } from './ledger'
import { computePortfolio } from './portfolio'
import { usePrices } from './prices'
import { round2, todayISO } from './format'

export function useVault() {
  const accounts = useAccounts()
  const txns = useTxns()
  const settings = useSettings()
  const categories = useCategories()
  const items = useStore((s) => s.items)
  const quotes = usePrices((s) => s.quotes)
  const assets = useMemo(() => selectList(items, 'asset'), [items])
  const accKey = JSON.stringify(accounts)
  const txKey = txns.length + ':' + txns.map((t) => t.id + t.amount + t.kind + t.account + (t.to || '') + JSON.stringify(t.split || '') + (t.earmark === false ? 0 : 1) + (t.qty || '') + (t.side || '')).join('|')
  const setKey = JSON.stringify(settings)
  const balances = useMemo(() => computeBalances(accounts, txns, settings), [accKey, txKey, setKey]) // eslint-disable-line
  const portfolio = useMemo(() => computePortfolio(assets, txns, quotes), [assets, txKey, quotes]) // eslint-disable-line
  const summary = useMemo(() => {
    const s = summarize(accounts, balances)
    const pv = portfolio.value
    return { ...s, cashAssets: s.assets, portfolio: pv, assets: round2(s.assets + pv), net: round2(s.net + pv), byType: { ...s.byType, portfolio: pv } }
  }, [accKey, balances, portfolio.value]) // eslint-disable-line
  const cycles = useMemo(() => {
    const byId = Object.fromEntries(accounts.map((a) => [a.id, a]))
    const out = {}
    for (const a of accounts) { const c = cardCycle(a, txns, byId, settings, todayISO()); if (c) out[a.id] = c }
    return out
  }, [accKey, txKey, setKey, todayISO()]) // eslint-disable-line
  const accById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accKey]) // eslint-disable-line
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [JSON.stringify(categories)]) // eslint-disable-line
  const assetById = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets])
  return { accounts, txns, settings, categories, balances, summary, cycles, accById, catById, assets, assetById, portfolio, quotes }
}
