import { useStore, selectList } from '../store'
import { parseNotification, learnKey } from './notify'
import { allocate, computeBalances, summarize } from './ledger'
import { DEFAULT_SETTINGS } from './defaults'
import { round2 } from './format'
import { usePrices, fxUSDTHB } from './prices'

const localDate = (iso) => { const d = iso ? new Date(iso) : new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** User rules: first rule whose text is found in the message wins. */
function matchRule(rules = [], raw = '') {
  const t = raw.toLowerCase()
  return rules.find((r) => r.text && t.includes(r.text.toLowerCase()) && (!r.dir || r.dir === 'any' || r.dir === r._dir))
}

/**
 * Turns inbox items into real transactions right away ("บันทึกทันที").
 * Unknown merchants get the "ยังไม่ใส่หมวด" category, to be tagged later in bulk.
 * Ids derive from the inbox id, so two devices never record the same notification twice.
 */
export function processInbox() {
  const st = useStore.getState()
  const settings = { ...DEFAULT_SETTINGS, ...(st.items.settings?.data || {}) }
  if (!settings.autoRecord) return 0
  const T = settings.allocation.targets
  const accounts = selectList(st.items, 'account')
  const assets = selectList(st.items, 'asset')
  const txns = selectList(st.items, 'txn')
  const card = accounts.find((a) => a.type === 'credit' && !a.archived)
  const inbox = selectList(st.items, 'inbox').sort((a, b) => (a.at || '').localeCompare(b.at || ''))
  const recent = txns.filter((t) => t.fromInbox && t.createdAt && Date.now() - Date.parse(t.createdAt) < 15 * 60_000)
  let n = 0
  for (const it of inbox) {
    const p = parseNotification(it.raw)
    if (!p.amount || !p.direction) continue // needs a human
    const id = `auto-${it.id}`
    if (st.items[id]) { st.remove(it.id, { undo: false }); continue }
    const at = it.at || new Date().toISOString()
    // same amount & direction from another source (e.g. LINE + K PLUS) within 5 minutes = duplicate
    const dupe = recent.find((t) => Math.abs(t.amount - p.amount) < 0.01 && t.inDir === p.direction && Math.abs(Date.parse(t.createdAt) - Date.parse(at)) < 5 * 60_000)
    if (dupe) { st.remove(it.id, { undo: false }); continue }
    const date = localDate(p.time || at)
    const base = { id, date, createdAt: at, fromInbox: true, inDir: p.direction, raw: it.raw.slice(0, 300) }
    let t = null
    if (p.kind === 'trade') {
      const symbol = `${p.coin}-USD`
      let asset = assets.find((a) => a.symbol === symbol)
      const assetId = asset ? asset.id : st.put('asset', { type: 'crypto', symbol, name: p.coin, source: 'yahoo', currency: 'USD', unit: p.coin })
      const fx = fxUSDTHB(usePrices.getState().quotes)
      const thbPx = p.fiat === 'THB' ? (p.side === 'buy' ? (p.total - (p.fee || 0)) / p.qty : (p.total + (p.fee || 0)) / p.qty) : null
      t = { ...base, kind: 'trade', side: p.side, assetId, qty: p.qty, price: thbPx ? thbPx / fx : p.total / p.qty, fee: (p.fee || 0) / fx, fx, amount: p.fiat === 'THB' ? p.total : round2(p.total * fx), account: T.invest, mode: 'total', total: p.total, totalCcy: p.fiat === 'THB' ? 'THB' : 'USD', feeIn: p.fee || 0, note: p.exchange }
    } else if (p.kind === 'exchange-in' || p.kind === 'exchange-out') {
      const into = p.kind === 'exchange-in'
      t = { ...base, kind: 'transfer', amount: p.amount, account: into ? T.cash : T.invest, to: into ? T.invest : T.cash, note: `${into ? 'ฝากเงินเข้า' : 'ถอนเงินจาก'} ${p.exchange}` }
    } else {
      const key = learnKey(p)
      const learned = key ? settings.merchantMap?.[key] : null
      const rule = matchRule(settings.rules, it.raw)
      const bankAcc = p.bank && settings.bankMap?.[p.bank]
      const account = rule?.account || learned?.account || (p.isCard && card ? card.id : bankAcc || T.cash)
      const kind = rule?.kind || (p.direction === 'in' ? 'income' : 'expense')
      if (kind === 'transfer' && rule?.to) {
        t = { ...base, kind: 'transfer', amount: p.amount, account, to: rule.to, note: rule.note || p.counterparty || '' }
      } else {
        const category = rule?.category || learned?.category || 'cat-uncat'
        t = { ...base, kind, amount: p.amount, account, category, note: p.counterparty || `${p.direction === 'in' ? 'เงินเข้า' : p.isCard ? 'รูดบัตร' : 'เงินออก'}${p.bank ? ` · ${p.bank}` : ''}`, counterparty: p.counterparty || undefined }
        if (kind === 'income' && settings.autoSplitIncome !== false) {
          const bal = computeBalances(accounts, txns, settings)
          const gap = summarize(accounts, bal).gap
          const sp = allocate(p.amount, settings.allocation, gap)
          const split = {}
          ;[[T.reserve, sp.reserve], [T.cash, sp.cash], [T.invest, sp.invest]].forEach(([k, v]) => { split[k] = round2((split[k] || 0) + v) })
          t.split = split; t.alloc = { pct: settings.allocation.pct, cap: settings.allocation.capReserveAtGap }; t.account = T.cash
        }
      }
    }
    Object.keys(t).forEach((k) => t[k] === undefined && delete t[k])
    st.put('txn', t)
    st.remove(it.id, { undo: false })
    recent.push(t)
    n++
  }
  if (n) st.showToast(`บันทึกจากแจ้งเตือนธนาคารอัตโนมัติ ${n} รายการ`)
  return n
}
