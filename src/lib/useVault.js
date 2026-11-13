import { useMemo } from 'react'
import { useAccounts, useTxns, useSettings, useCategories } from '../store'
import { computeBalances, summarize } from './ledger'

export function useVault() {
  const accounts = useAccounts()
  const txns = useTxns()
  const settings = useSettings()
  const categories = useCategories()
  const accKey = JSON.stringify(accounts)
  const txKey = txns.length + ':' + txns.map((t) => t.id + t.amount + t.kind + t.account + (t.to || '') + JSON.stringify(t.split || '') + (t.earmark === false ? 0 : 1)).join('|')
  const setKey = JSON.stringify(settings)
  const balances = useMemo(() => computeBalances(accounts, txns, settings), [accKey, txKey, setKey]) // eslint-disable-line
  const summary = useMemo(() => summarize(accounts, balances), [accKey, balances]) // eslint-disable-line
  const accById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accKey]) // eslint-disable-line
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [JSON.stringify(categories)]) // eslint-disable-line
  return { accounts, txns, settings, categories, balances, summary, accById, catById }
}
