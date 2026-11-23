/**
 * Full market lists for each Market tab:
 *  - crypto: every coin on Binance (USDT pairs, by 24h volume) or every THB pair on Bitkub — prices come with the list
 *  - Thai / US / China stocks: bundled lists (src/data/markets.json, rebuilt by scripts/build-market-lists.mjs),
 *    prices are loaded only for the rows on screen
 *  - gold / oil / fx: the fixed lists in CATS
 * plus a search that stays inside the open tab.
 */
import { CAT_BY_ID, useMarket, loadBitkubList, itemFor, FN, H } from './market'

// big names first (SET50 / US mega caps); the rest follow A–Z
const SET50 = 'PTT ADVANC AOT CPALL GULF DELTA PTTEP KBANK SCB BDMS BBL KTB SCC TRUE CPN CPF OR BH MINT TTB IVL TOP PTTGC BEM HMPRO CRC GPSC BJC TISCO KTC LH WHA TIDLOR MTC OSP CBG COM7 BTS EGCO RATCH TU SCGP KKP TLI BCP BANPU CCET AWC TCAP VGI GLOBAL'.split(' ')
const USBIG = 'AAPL MSFT NVDA GOOGL AMZN META AVGO TSLA BRK-B LLY JPM V WMT XOM MA UNH ORCL COST NFLX HD PG JNJ BAC ABBV KO AMD CRM PLTR CVX MRK ADBE PEP TMO CSCO MCD LIN ACN WFC ABT IBM GE INTU QCOM TXN DIS AMGN CAT ISRG NOW'.split(' ')
const rank = (list) => { const m = new Map(list.map((s, i) => [s, i])); return (s) => (m.has(s) ? m.get(s) : 1e6) }

let data = null
const loadData = async () => data || (data = (await import('../data/markets.json')).default)

// GICS sectors in Thai for the US filter
const US_SECTOR = { 'Information Technology': 'เทคโนโลยี', Technology: 'เทคโนโลยี', Telecommunications: 'สื่อสาร', 'Communication Services': 'สื่อสาร', Financials: 'การเงิน', 'Health Care': 'สุขภาพ', 'Consumer Discretionary': 'สินค้าฟุ่มเฟือย', 'Consumer Staples': 'สินค้าจำเป็น', Industrials: 'อุตสาหกรรม', Energy: 'พลังงาน', Utilities: 'สาธารณูปโภค', 'Real Estate': 'อสังหาฯ', Materials: 'วัตถุดิบ' }

/* ---------- crypto tickers (one call gives every price) ---------- */
const STABLE = /^(USDC|FDUSD|TUSD|BUSD|USDP|DAI|AEUR|EUR|EURI|USD1|USDE|PAXG|XUSD|BFUSD|RLUSD)$/
let bnCache = null, bnAt = 0
async function binanceAll() {
  if (bnCache && Date.now() - bnAt < 25_000) return bnCache
  const r = await fetch('https://api.binance.com/api/v3/ticker/24hr?type=MINI')
  if (!r.ok) throw new Error('binance ' + r.status)
  const rows = (await r.json())
    .filter((x) => x.symbol.endsWith('USDT') && +x.quoteVolume > 0)
    .map((x) => ({ code: x.symbol.slice(0, -4), price: +x.lastPrice, open: +x.openPrice, vol: +x.quoteVolume, hi: +x.highPrice, lo: +x.lowPrice }))
    .filter((x) => !/(UP|DOWN|BULL|BEAR)$/.test(x.code) && !STABLE.test(x.code))
    .sort((a, b) => b.vol - a.vol)
  bnCache = rows; bnAt = Date.now()
  // every price lands in the market store right away
  const q = { ...useMarket.getState().q }, now = Date.now()
  for (const x of rows) {
    const s = `${x.code}-USD`, cur = q[s]
    if (cur?.live && now - (cur.liveAt || 0) < 15_000) { q[s] = { ...cur, vol: x.vol }; continue }
    q[s] = { ...(cur || {}), symbol: s, price: x.price, changePct: x.open ? ((x.price - x.open) / x.open) * 100 : null, currency: 'USD', vol: x.vol, dayHi: x.hi, dayLo: x.lo, time: now, src: 'bn' }
  }
  useMarket.setState({ q })
  return rows
}
async function bitkubAll() {
  const l = (await loadBitkubList(true)).filter((x) => !x.frozen)
  const q = { ...useMarket.getState().q }, now = Date.now()
  for (const x of l) { const s = `BKUB:${x.code}`; q[s] = { ...(q[s] || {}), symbol: s, price: x.price, changePct: x.changePct, currency: 'THB', name: `${x.code}/THB`, exchange: 'Bitkub', vol: x.volTHB, dayHi: x.hi, dayLo: x.lo, time: now } }
  useMarket.setState({ q })
  return l
}

/** Every item of a tab. `ccy` picks the crypto source. Each item may carry `sector` (for the filter). */
export async function loadCatalog(cat, ccy = 'USD') {
  const base = (CAT_BY_ID[cat]?.items || [])
  if (cat === 'crypto') {
    try {
      if (ccy === 'THB') return (await bitkubAll()).map((x) => itemFor(`BKUB:${x.code}`))
      const names = Object.fromEntries(base.map((i) => [i.symbol, i.name]))
      return (await binanceAll()).map((x) => itemFor(`${x.code}-USD`, { name: names[`${x.code}-USD`] || x.code }))
    } catch { return base }
  }
  if (cat === 'th' || cat === 'us' || cat === 'cn') {
    const d = await loadData()
    const idx = base.filter((i) => i.kind === 'index')
    if (cat === 'th') {
      const r = rank(SET50)
      const rows = [...d.th].sort((a, b) => r(a[0]) - r(b[0]) || a[0].localeCompare(b[0]))
      return [...idx, ...rows.map(([s, name, mkt, sector]) => ({ symbol: `${s}.BK`, name, kind: 'stock', sector: mkt === 'mai' ? 'ตลาด mai' : sector }))]
    }
    if (cat === 'us') {
      const r = rank(USBIG)
      const rows = [...d.us].sort((a, b) => r(a[0]) - r(b[0]) || a[0].localeCompare(b[0]))
      return [...idx, ...rows.map(([s, name, sector]) => ({ symbol: s, name, kind: 'stock', sector: US_SECTOR[sector] || 'อื่น ๆ' }))]
    }
    return [...idx, ...d.cn.map(([s, name]) => ({ symbol: s, name, kind: 'stock', sector: /\.HK$/.test(s) ? 'ฮ่องกง' : 'จีนแผ่นดินใหญ่' }))]
  }
  return base
}

/** sort options a tab offers (price-based sorts only where every price is known up front) */
const MOVES = [['up1', 'ขึ้นมากสุด 24 ชม.'], ['down1', 'ลงมากสุด 24 ชม.'], ['up7', 'ขึ้นมากสุด 7 วัน'], ['down7', 'ลงมากสุด 7 วัน']]
export const sortsFor = (cat) => (cat === 'crypto'
  ? [['cap', 'มูลค่าตลาด'], ['vol', 'มูลค่าซื้อขาย 24 ชม.'], ['az', 'A–Z'], ['up', 'ขึ้นมากสุด 24 ชม.'], ['down', 'ลงมากสุด 24 ชม.'], ['up7', 'ขึ้นมากสุด 7 วัน'], ['down7', 'ลงมากสุด 7 วัน']]
  : ['th', 'us', 'cn'].includes(cat) ? [['cap', 'มูลค่าตลาด'], ['az', 'A–Z'], ...MOVES]
    : ['gold', 'fx'].includes(cat) ? [['default', 'ค่าเริ่มต้น'], ['az', 'A–Z'], ...MOVES] : null)
export const RANK_SORTS = ['cap', 'up1', 'down1', 'up7', 'down7']

/* ---------- market cap + 24h / 7-day change for a whole tab (cached for the day on this device) ---------- */
const RANK_FN = FN.replace('vault-prices', 'vault-rank')
const rankMem = {}
const coinOf = (s) => s.replace(/^BKUB:/, '').replace(/-USD$/, '')
export async function loadRank(cat, symbols) {
  const key = `vault:rank2:${cat}:${new Date().toISOString().slice(0, 10)}`
  const fromCache = (rows) => (cat === 'crypto' ? Object.fromEntries(symbols.map((s) => [s, rows[coinOf(s)]]).filter(([, v]) => v)) : rows)
  if (rankMem[key]) return fromCache(rankMem[key])
  try { const c = JSON.parse(localStorage.getItem(key)); if (c && Object.keys(c).length) return fromCache(rankMem[key] = c) } catch { /* no cache */ }
  const rows = {}
  if (cat === 'crypto') {
    try { const r = await fetch(`${RANK_FN}?coins=1`, H); if (r.ok) Object.assign(rows, (await r.json()).rows || {}) } catch { /* unranked */ }
  } else {
    const parts = []
    for (let i = 0; i < symbols.length; i += 200) parts.push(symbols.slice(i, i + 200))
    await Promise.all(parts.map(async (p) => {
      try {
        const r = await fetch(`${RANK_FN}?symbols=${encodeURIComponent(p.join(','))}`, H)
        if (r.ok) Object.assign(rows, (await r.json()).rows || {})
      } catch { /* that part stays unranked */ }
    }))
  }
  if (!Object.keys(rows).length) return rows
  try {
    for (const k of Object.keys(localStorage)) if (/^vault:rank2?:/.test(k) && k !== key && k.includes(`:${cat}:`)) localStorage.removeItem(k)
    localStorage.setItem(key, JSON.stringify(rows))
  } catch { /* storage full: memory only */ }
  return fromCache(rankMem[key] = rows)
}

export function sortItems(list, sort, q, rk = {}) {
  const label = (it) => it.symbol.replace(/^BKUB:|-USD$|\.BK$/g, '')
  if (sort === 'az') return [...list].sort((a, b) => label(a).localeCompare(label(b)))
  if (sort === 'cap') {
    const v = (it) => (it.kind === 'index' ? Infinity : rk[it.symbol]?.cap ?? -1)
    return [...list].sort((a, b) => v(b) - v(a))
  }
  const byNum = (v, desc) => [...list].sort((a, b) => { const x = v(a), y = v(b); if (x == null) return y == null ? 0 : 1; if (y == null) return -1; return desc ? y - x : x - y })
  if (sort === 'up1' || sort === 'down1') return byNum((it) => rk[it.symbol]?.chg1, sort === 'up1')
  if (sort === 'up7' || sort === 'down7') return byNum((it) => rk[it.symbol]?.chg7, sort === 'up7')
  if (sort === 'up' || sort === 'down') {
    const v = (it) => q[it.symbol]?.changePct
    return [...list].sort((a, b) => { const x = v(a), y = v(b); if (x == null) return 1; if (y == null) return -1; return sort === 'up' ? y - x : x - y })
  }
  if (sort === 'vol') return [...list].sort((a, b) => (q[b.symbol]?.vol || 0) - (q[a.symbol]?.vol || 0))
  return list
}

/** local match inside a tab: symbol prefix first, then symbol/name contains */
export function matchLocal(list, query) {
  const s = query.trim().toLowerCase()
  if (!s) return list
  const code = (it) => it.symbol.replace(/^BKUB:|-USD$|\.BK$|\^/g, '').toLowerCase()
  const hit = list.filter((it) => code(it).includes(s) || (it.name || '').toLowerCase().includes(s) || (it.ccy || '').toLowerCase().includes(s))
  return hit.sort((a, b) => (code(a).startsWith(s) ? 0 : 1) - (code(b).startsWith(s) ? 0 : 1) || code(a).length - code(b).length)
}

/** online search, but only answers that belong to the tab (for symbols the bundled list may not have) */
const US_EXCH = /^(NMS|NYQ|NGM|NCM|PCX|ASE|BTS|NAS|NYS|NasdaqGS|NasdaqGM|NasdaqCM|NYSE|NYSEArca|NYSE American|Cboe US)$/i
export async function searchInCat(cat, query) {
  const s = query.trim()
  if (s.length < 2) return []
  if (cat === 'fund') {
    const j = await fetch(`${FN}?funds=${encodeURIComponent(s)}`, H).then((r) => r.json()).catch(() => ({}))
    return (j.results || []).slice(0, 15)
  }
  if (!['th', 'us', 'cn'].includes(cat)) return []
  const ask = (x) => fetch(`${FN}?search=${encodeURIComponent(x)}`, H).then((r) => r.json()).then((j) => j.results || []).catch(() => [])
  const res = cat === 'th' ? [...await ask(s), ...await ask(`${s}.BK`)] : await ask(s)
  const keep = cat === 'th' ? (r) => /\.BK$/.test(r.symbol) && !/^\^/.test(r.symbol)
    : cat === 'cn' ? (r) => /\.(HK|SS|SZ)$/.test(r.symbol)
      : (r) => !/[.=^]/.test(r.symbol) && (US_EXCH.test(r.exchange || '') || ['EQUITY', 'ETF'].includes(r.type))
  const seen = new Set()
  return res.filter((r) => keep(r) && !seen.has(r.symbol) && seen.add(r.symbol))
}

export const PAGE = 30
