import { round2 } from './format'
import { assetPrice, assetChange, fxUSDTHB } from './prices'

export const ASSET_TYPES = {
  stock: { label: 'หุ้น / ETF', item: 'stock', unit: 'หุ้น', color: '#3b82f6', desc: 'หุ้นไทย หุ้นต่างประเทศ ETF ดัชนี' },
  crypto: { label: 'คริปโต', item: 'crypto', unit: 'เหรียญ', color: '#f59e0b', desc: 'ราคา Realtime จาก Binance' },
  gold: { label: 'ทองคำ', item: 'gold', unit: 'บาท', color: '#eab308', desc: 'ทองไทย 96.5% หรือ Gold Spot' },
  commodity: { label: 'โภคภัณฑ์', item: 'copper', unit: 'หน่วย', color: '#f97316', desc: 'เงิน ทองแดง น้ำมัน แพลทินัม ฯลฯ' },
  bond: { label: 'พันธบัตร / หุ้นกู้', item: 'bond', unit: 'หน่วย', color: '#a855f7', desc: 'ใส่ราคาเอง + ดอกเบี้ยคูปอง' },
  fund: { label: 'กองทุน / อื่น ๆ', item: 'cash', unit: 'หน่วย', color: '#14b8a6', desc: 'กองทุนรวม SSF/RMF หรือสินทรัพย์อื่น' },
  derivative: { label: 'อนุพันธ์', item: 'deriv', unit: 'สัญญา', color: '#ec4899', desc: 'Futures / Options พร้อม Long/Short' },
}

export const POPULAR_CRYPTO = [
  ['BTC', 'Bitcoin'], ['ETH', 'Ethereum'], ['SOL', 'Solana'], ['BNB', 'BNB'], ['XRP', 'XRP'], ['DOGE', 'Dogecoin'],
  ['ADA', 'Cardano'], ['TON', 'Toncoin'], ['AVAX', 'Avalanche'], ['LINK', 'Chainlink'], ['DOT', 'Polkadot'], ['SUI', 'Sui'],
]
export const GOLD_PRESETS = [
  { symbol: 'TH-GOLD', name: 'ทองคำแท่ง 96.5%', source: 'thaigold', currency: 'THB', unit: 'บาท', item: 'gold', note: 'คำนวณจาก Gold Spot × USD/THB (ราคาประมาณ)' },
  { symbol: 'GC=F', name: 'Gold Spot (ต่อออนซ์)', source: 'yahoo', currency: 'USD', unit: 'ออนซ์', item: 'gold' },
]
export const COMMODITY_PRESETS = [
  { symbol: 'SI=F', name: 'Silver (เงิน)', unit: 'ออนซ์', item: 'silver' },
  { symbol: 'HG=F', name: 'Copper (ทองแดง)', unit: 'ปอนด์', item: 'copper' },
  { symbol: 'CL=F', name: 'Crude Oil WTI', unit: 'บาร์เรล', item: 'oil' },
  { symbol: 'BZ=F', name: 'Brent Crude Oil', unit: 'บาร์เรล', item: 'oil' },
  { symbol: 'NG=F', name: 'Natural Gas', unit: 'MMBtu', item: 'oil' },
  { symbol: 'PL=F', name: 'Platinum', unit: 'ออนซ์', item: 'silver' },
  { symbol: 'PA=F', name: 'Palladium', unit: 'ออนซ์', item: 'silver' },
].map((p) => ({ ...p, source: 'yahoo', currency: 'USD' }))

/** Short display label: fund code, ticker without "-USD", or the asset name. */
export const assetLabel = (a) => !a ? '' : a.code || (a.source === 'yahoo' && a.symbol ? a.symbol.replace('-USD', '') : a.name)

const AMC = [['KTAM', 'KT', '#00A6E6'], ['KT-', 'KT', '#00A6E6'], ['KF', 'KS', '#FFC20E', '#3d2b00'], ['KKP', 'KKP', '#594A9E'], ['K-', 'K', '#00A950'],
  ['SCB', 'SCB', '#4E2E7F'], ['ES-', 'ES', '#E4002B'], ['TMB', 'ES', '#E4002B'], ['TTB', 'ES', '#E4002B'], ['BBL', 'BBL', '#1E3C96'], ['B-', 'BBL', '#1E3C96'],
  ['UOB', 'UOB', '#005EB8'], ['PRINCIPAL', 'P', '#0061A0'], ['ONE-', 'ONE', '#E5007E'], ['LH', 'LH', '#7AB800'], ['TISCO', 'TIS', '#1F3B7A'],
  ['MFC', 'MFC', '#00539F'], ['ASP', 'A+', '#F37021'], ['DAOL', 'DL', '#E60012'], ['XSPRING', 'XS', '#111827'], ['MEGA', 'M', '#0F766E']]
/** Fund-house badge (initials + house color) for Thai mutual funds. */
export const fundBadge = (code = '') => { const c = code.toUpperCase(); const m = AMC.find(([p]) => c.startsWith(p)); return m ? { text: m[1], bg: m[2], fg: m[3] || '#fff' } : { text: c.slice(0, 2) || 'F', bg: '#14b8a6', fg: '#fff' } }

export const itemOf = (asset) => asset?.item || ASSET_TYPES[asset?.type]?.item || 'cash'

/** Logo URL candidates for a real-world icon; the UI falls back to the pixel item sprite. */
export function logoCandidates(asset) {
  if (!asset) return []
  if (asset.logo) return [asset.logo]
  const sym = (asset.symbol || '').toUpperCase()
  if (asset.type === 'crypto') {
    const base = sym.replace('-USD', '').toLowerCase()
    return [`https://assets.coincap.io/assets/icons/${base}@2x.png`]
  }
  if (sym.startsWith('FUND:')) return []
  if (asset.type === 'stock' || (asset.type === 'fund' && sym) || (asset.type === 'derivative' && sym && !sym.includes('='))) {
    return [`https://financialmodelingprep.com/image-stock/${encodeURIComponent(sym)}.png`, `https://assets.parqet.com/logos/symbol/${encodeURIComponent(sym.replace('.BK', ''))}?format=png`]
  }
  return []
}

/**
 * FIFO lots per asset. Trades are txns { kind:'trade', side:'buy'|'sell', assetId, qty, price, fee, fx, amount(THB), date }.
 * price/fee are in the asset's quote currency; fx = THB per 1 unit of quote currency at trade time (1 for THB).
 */
export function computePortfolio(assets, txns, quotes) {
  const fxNow = fxUSDTHB(quotes)
  const trades = txns.filter((t) => t.kind === 'trade').sort((a, b) => (a.date + (a.createdAt || '')).localeCompare(b.date + (b.createdAt || '')))
  const byAsset = {}
  for (const a of assets) byAsset[a.id] = { asset: a, lots: [], realized: 0, sells: [] }

  for (const t of trades) {
    const h = byAsset[t.assetId]; if (!h) continue
    const a = h.asset
    if (t.side === 'buy') {
      h.lots.push({ txn: t, qtyOpen: Number(t.qty), qty: Number(t.qty), costTHB: Number(t.amount), price: Number(t.price), fx: Number(t.fx) || 1, side: t.dir || a.dir || 'long' })
    } else {
      let q = Number(t.qty), costOut = 0
      for (const l of h.lots) {
        if (q <= 0) break
        if (l.qtyOpen <= 0) continue
        const take = Math.min(q, l.qtyOpen)
        costOut += (l.costTHB * take) / l.qty
        l.qtyOpen = Math.round((l.qtyOpen - take) * 1e10) / 1e10; q -= take
      }
      const pnl = round2(Number(t.amount) - costOut)
      h.realized = round2(h.realized + pnl)
      h.sells.push({ txn: t, pnl })
    }
  }

  const holdings = []
  let value = 0, cost = 0, realized = 0, dayPnl = 0
  for (const h of Object.values(byAsset)) {
    const a = h.asset
    const ccyFx = a.currency === 'USD' ? fxNow : 1
    const p = assetPrice(a, quotes)
    const chg = assetChange(a, quotes)
    const mult = a.type === 'derivative' ? Number(a.multiplier) || 1 : 1
    let hv = 0, hc = 0, qty = 0
    const lots = h.lots.map((l) => {
      const frac = l.qtyOpen / l.qty
      const c = l.costTHB * frac
      let v, pricePnl, fxPnl
      if (a.type === 'derivative') {
        // value = margin still posted + unrealized P/L on the open contracts
        const sign = l.side === 'short' ? -1 : 1
        const pnlQ = p != null ? (p - l.price) * l.qtyOpen * mult * sign : 0
        v = c + pnlQ * ccyFx
        pricePnl = pnlQ * l.fx; fxPnl = pnlQ * (ccyFx - l.fx)
      } else {
        v = p != null ? l.qtyOpen * p * ccyFx : c
        pricePnl = p != null ? l.qtyOpen * (p - l.price) * l.fx : 0
        fxPnl = p != null ? l.qtyOpen * p * (ccyFx - l.fx) : 0
      }
      hv += v; hc += c; qty += l.qtyOpen
      return { ...l, open: l.qtyOpen > 0, costOpen: round2(c), value: round2(v), pnl: round2(v - c), pnlPct: c > 0 ? (v - c) / c : 0, pricePnl: round2(pricePnl), fxPnl: round2(fxPnl) }
    })
    if (qty <= 0 && !h.sells.length && !h.lots.length) continue
    const avgPrice = qty > 0 ? lots.filter((l) => l.open).reduce((s, l) => s + l.price * l.qtyOpen, 0) / qty : 0
    const prevValue = chg != null && hv ? hv / (1 + chg / 100) : hv
    holdings.push({
      asset: a, qty: Math.round(qty * 1e8) / 1e8, price: p, changePct: chg, avgPrice,
      value: round2(hv), cost: round2(hc), pnl: round2(hv - hc), pnlPct: hc > 0 ? (hv - hc) / hc : 0,
      realized: h.realized, lots: lots.reverse(), sells: h.sells, live: !!quotes[a.symbol]?.live,
    })
    value += hv; cost += hc; realized += h.realized
    if (qty > 0) dayPnl += hv - prevValue
  }
  holdings.sort((x, y) => y.value - x.value)
  const byType = {}
  for (const h of holdings) byType[h.asset.type] = (byType[h.asset.type] || 0) + h.value
  return {
    holdings, value: round2(value), cost: round2(cost), pnl: round2(value - cost), pnlPct: cost > 0 ? (value - cost) / cost : 0,
    realized: round2(realized), dayPnl: round2(dayPnl), byType, fx: fxNow,
    open: holdings.filter((h) => h.qty > 0),
  }
}

export function symbolsToPoll(assets) {
  const s = new Set(['THB=X'])
  for (const a of assets) {
    if (a.source === 'thaigold') s.add('GC=F')
    else if (a.source !== 'manual' && a.symbol) s.add(a.symbol)
  }
  return [...s]
}
