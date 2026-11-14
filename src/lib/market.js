import { create } from 'zustand'
import { SUPABASE_URL } from './supabase'
import { usePrices, GOLD, ccyOfSymbol } from './prices'

const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaW9rd2VlZGFxYW91eHFidW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMzkxMjQsImV4cCI6MjEwMzgxNTEyNH0.6S3lRXgY1zAPfYkJ20uX_aFTOya1MEqb84U4Gkxa3Sk'
const FN = `${SUPABASE_URL}/functions/v1/vault-prices`
const H = { headers: { Authorization: `Bearer ${ANON_JWT}`, apikey: ANON_JWT } }
const LS = 'vault:market'

/* ---------- catalog ---------- */
// kind: crypto | stock | index | gold | commodity | fx | fund
const C = (symbol, name, kind, extra = {}) => ({ symbol, name, kind, ...extra })
export const CATS = [
  { id: 'crypto', label: 'คริปโต', emoji: '🪙', items: [
    C('BTC-USD', 'Bitcoin', 'crypto'), C('ETH-USD', 'Ethereum', 'crypto'), C('SOL-USD', 'Solana', 'crypto'),
    C('BNB-USD', 'BNB', 'crypto'), C('XRP-USD', 'XRP', 'crypto'), C('DOGE-USD', 'Dogecoin', 'crypto'),
  ] },
  { id: 'th', label: 'หุ้นไทย', emoji: '🇹🇭', items: [
    C('^SET.BK', 'ดัชนี SET', 'index'), C('^SET50.BK', 'SET50', 'index'), C('PTT.BK', 'ปตท.', 'stock'), C('AOT.BK', 'ท่าอากาศยานไทย', 'stock'),
    C('CPALL.BK', 'ซีพี ออลล์', 'stock'), C('KBANK.BK', 'ธนาคารกสิกรไทย', 'stock'), C('DELTA.BK', 'เดลต้า อีเลคโทรนิคส์', 'stock'), C('ADVANC.BK', 'แอดวานซ์ อินโฟร์', 'stock'),
  ] },
  { id: 'us', label: 'หุ้นสหรัฐ', emoji: '🇺🇸', items: [
    C('^GSPC', 'S&P 500', 'index'), C('^IXIC', 'Nasdaq', 'index'), C('AAPL', 'Apple', 'stock'), C('NVDA', 'NVIDIA', 'stock'),
    C('MSFT', 'Microsoft', 'stock'), C('GOOGL', 'Alphabet (Google)', 'stock'), C('AMZN', 'Amazon', 'stock'), C('TSLA', 'Tesla', 'stock'),
  ] },
  { id: 'cn', label: 'หุ้นจีน', emoji: '🇨🇳', items: [
    C('^HSI', 'ดัชนีฮั่งเส็ง (HK)', 'index'), C('000001.SS', 'ดัชนีเซี่ยงไฮ้', 'index'), C('0700.HK', 'Tencent', 'stock'), C('9988.HK', 'Alibaba', 'stock'),
    C('1211.HK', 'BYD', 'stock'), C('1810.HK', 'Xiaomi', 'stock'), C('3690.HK', 'Meituan', 'stock'), C('600519.SS', 'Kweichow Moutai', 'stock'), C('300750.SZ', 'CATL', 'stock'),
  ] },
  { id: 'gold', label: 'ทอง/โลหะ', emoji: '🥇', items: [
    C('TH-GOLD', 'ทองคำแท่ง 96.5%', 'gold', { unit: 'บาททองคำ', note: 'ประมาณจาก Gold Spot × ค่าเงิน' }), C('GC=F', 'ทองคำ (Gold Spot)', 'gold', { unit: 'ออนซ์' }),
    C('SI=F', 'เงิน (Silver)', 'commodity', { unit: 'ออนซ์', item: 'silver' }), C('PL=F', 'แพลทินัม', 'commodity', { unit: 'ออนซ์', item: 'silver' }), C('HG=F', 'ทองแดง', 'commodity', { unit: 'ปอนด์', item: 'copper' }),
  ] },
  { id: 'oil', label: 'น้ำมันโลก', emoji: '🛢️', items: [
    C('BZ=F', 'น้ำมันดิบ Brent', 'commodity', { unit: 'บาร์เรล', item: 'oil' }), C('CL=F', 'น้ำมันดิบ WTI', 'commodity', { unit: 'บาร์เรล', item: 'oil' }), C('NG=F', 'ก๊าซธรรมชาติ', 'commodity', { unit: 'MMBtu', item: 'oil' }),
  ] },
  { id: 'fx', label: 'ค่าเงิน', emoji: '💱', items: [
    C('THB=X', 'ดอลลาร์สหรัฐ', 'fx', { ccy: 'USD', flag: '🇺🇸' }), C('EURTHB=X', 'ยูโร', 'fx', { ccy: 'EUR', flag: '🇪🇺' }), C('JPYTHB=X', 'เยน (ต่อ 100)', 'fx', { ccy: 'JPY', flag: '🇯🇵', per: 100 }),
    C('CNYTHB=X', 'หยวน', 'fx', { ccy: 'CNY', flag: '🇨🇳' }), C('GBPTHB=X', 'ปอนด์', 'fx', { ccy: 'GBP', flag: '🇬🇧' }), C('SGDTHB=X', 'ดอลลาร์สิงคโปร์', 'fx', { ccy: 'SGD', flag: '🇸🇬' }),
  ] },
  { id: 'fund', label: 'กองทุนไทย', emoji: '🏦', items: [] },
]
export const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]))
const KNOWN = Object.fromEntries(CATS.flatMap((c) => c.items.map((i) => [i.symbol, { ...i, cat: c.id }])))

/** Item metadata for any symbol (catalog entry or a guess for searched symbols). */
export function itemFor(symbol, extra = {}) {
  if (KNOWN[symbol]) return { ...KNOWN[symbol], ...extra, name: KNOWN[symbol].name }
  if (symbol.startsWith('FUND:')) return { symbol, kind: 'fund', cat: 'fund', ...extra }
  const kind = symbol.endsWith('-USD') ? 'crypto' : symbol.startsWith('^') ? 'index' : /=X$/.test(symbol) ? 'fx' : /=F$/.test(symbol) ? 'commodity' : 'stock'
  return { symbol, kind, name: extra.name || symbol, ...extra }
}

/** Which market category an item belongs to (for per-category watchlists). Unknown markets → 'other'. */
export function catOf(it) {
  if (!it) return 'other'
  if (it.cat) return it.cat
  const s = it.symbol || ''
  if (KNOWN[s]) return KNOWN[s].cat
  if (s.startsWith('FUND:') || it.kind === 'fund') return 'fund'
  if (s.endsWith('-USD') || it.kind === 'crypto') return 'crypto'
  if (/=X$/.test(s)) return 'fx'
  if (/^(GC|SI|PL|PA|HG|MGC|SIL)=F$/.test(s)) return 'gold'
  if (/=F$/.test(s)) return 'oil'
  if (/\.BK$/.test(s)) return 'th'
  if (/\.(HK|SS|SZ)$/.test(s)) return 'cn'
  if (!/\./.test(s) || s.startsWith('^')) return 'us'
  return 'other'
}
export const WATCH_MAX = 6

/** Display currency of an item's price. */
export const itemCcy = (it, q) => (it.kind === 'fx' || it.symbol === 'TH-GOLD' || it.kind === 'fund' ? 'THB' : q?.currency || ccyOfSymbol(it.symbol))

/* ---------- store ---------- */
const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || {} } catch { return {} } }
export const useMarket = create((set, get) => ({
  q: load(), // symbol -> { price, changePct, currency, name, exchange, time, c:[], t:[], hi52, lo52, dayHi, dayLo, live }
  loading: {}, at: null,
  patch(sym, p) { set({ q: { ...get().q, [sym]: { ...(get().q[sym] || {}), ...p } } }) },
}))
let saveT
const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { const q = useMarket.getState().q; const slim = {}; for (const [k, v] of Object.entries(q)) slim[k] = { ...v, live: false }; localStorage.setItem(LS, JSON.stringify(slim)) } catch { /* quota */ } }, 800) }

function deriveThaiGold(q) {
  const g = q['GC=F'], fx = q['THB=X']
  if (!g?.price || !fx?.price) return null
  const k = fx.price * (GOLD.BAHT_GRAMS / GOLD.OZ_GRAMS) * GOLD.THAI_PURITY
  return { price: Math.round((g.price * k) / 10) * 10, changePct: g.changePct, currency: 'THB', c: (g.c || []).map((x) => Math.round(x * k)), t: g.t, time: g.time, name: 'ทองคำแท่ง 96.5%' }
}

/** Load price + 1-month series for a list of symbols (rows). */
export async function loadSpark(symbols) {
  const want = [...new Set(symbols.flatMap((s) => (s === 'TH-GOLD' ? ['GC=F', 'THB=X'] : [s])))]
  if (!want.length) return
  useMarket.setState({ loading: { ...useMarket.getState().loading, spark: true } })
  try {
    const out = {}
    for (let i = 0; i < want.length; i += 15) {
      const r = await fetch(`${FN}?spark=${encodeURIComponent(want.slice(i, i + 15).join(','))}&range=1mo`, H)
      const j = await r.json()
      for (const x of j.quotes || []) if (!x.error) out[x.symbol] = x
    }
    const q = { ...useMarket.getState().q }
    for (const [k, v] of Object.entries(out)) {
      const keepLive = q[k]?.live && Date.now() - (q[k].liveAt || 0) < 20000
      q[k] = { ...(q[k] || {}), ...v, ...(keepLive ? { price: q[k].price, changePct: q[k].changePct } : {}) }
    }
    if (symbols.includes('TH-GOLD')) { const g = deriveThaiGold(q); if (g) q['TH-GOLD'] = { ...(q['TH-GOLD'] || {}), ...g } }
    useMarket.setState({ q, at: Date.now() })
    // share fresh prices with the portfolio (TradeForm prefills from these)
    const ps = usePrices.getState()
    for (const [k, v] of Object.entries(out)) if (!ps.quotes[k]?.live) ps.setQuote(k, { price: v.price, changePct: v.changePct, currency: v.currency, name: v.name, time: v.time })
    persist()
  } catch (e) { console.warn('market spark failed', e) }
  useMarket.setState({ loading: { ...useMarket.getState().loading, spark: false } })
}

const chartCache = {}
/** Full chart for the detail sheet. */
export async function loadChart(symbol, range) {
  const key = `${symbol}|${range}`
  if (chartCache[key] && Date.now() - chartCache[key].at < 5 * 60_000) return chartCache[key].d
  if (symbol === 'TH-GOLD') {
    const [g, fx] = await Promise.all([loadChart('GC=F', range), loadChart('THB=X', range)])
    if (!g || !fx) return null
    const k = (fx.price || 34) * (GOLD.BAHT_GRAMS / GOLD.OZ_GRAMS) * GOLD.THAI_PURITY
    return { ...g, symbol, currency: 'THB', price: Math.round((g.price * k) / 10) * 10, c: g.c.map((x) => Math.round(x * k)), hi52: null, lo52: null, dayHi: null, dayLo: null }
  }
  try {
    const r = await fetch(`${FN}?chart=${encodeURIComponent(symbol)}&range=${range}`, H)
    const d = await r.json()
    if (d.error) return null
    chartCache[key] = { at: Date.now(), d }
    return d
  } catch { return null }
}

export async function searchMarket(q) {
  const [a, b] = await Promise.all([
    fetch(`${FN}?search=${encodeURIComponent(q)}`, H).then((r) => r.json()).catch(() => ({})),
    fetch(`${FN}?funds=${encodeURIComponent(q)}`, H).then((r) => r.json()).catch(() => ({})),
  ])
  return [...(a.results || []), ...(b.results || []).slice(0, 8)]
}

/* ---------- live crypto (Binance miniTicker) while the Market tab is open ---------- */
let ws = null, wsKey = ''
export function streamMarketCrypto(symbols) {
  const pairs = [...new Set(symbols.filter((s) => s.endsWith('-USD')).map((s) => s.replace('-USD', '').toLowerCase() + 'usdt'))].sort()
  const key = pairs.join('/')
  if (key === wsKey && ws && ws.readyState <= 1) return
  stopMarketStream()
  wsKey = key
  if (!key) return
  try {
    ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${pairs.map((p) => `${p}@miniTicker`).join('/')}`)
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data)?.data
      if (!d?.s) return
      const sym = d.s.replace(/USDT$/, '') + '-USD'
      const price = Number(d.c), open = Number(d.o)
      useMarket.getState().patch(sym, { price, changePct: open ? ((price - open) / open) * 100 : null, currency: 'USD', live: true, liveAt: Date.now() })
    }
    ws.onclose = () => { if (wsKey === key) setTimeout(() => { if (wsKey === key) { wsKey = ''; streamMarketCrypto(symbols) } }, 4000) }
  } catch { /* websocket unavailable */ }
}
export function stopMarketStream() { wsKey = ''; if (ws) { try { ws.close() } catch { /* */ } ws = null } }

/* ---------- Thai retail fuel ---------- */
export const useOil = create(() => ({ data: (() => { try { return JSON.parse(localStorage.getItem('vault:oil')) } catch { return null } })(), status: 'idle' }))
export async function loadOil(force = false) {
  const cur = useOil.getState()
  if (!force && cur.data && Date.now() - (cur.data.at || 0) < 10 * 60_000) return
  useOil.setState({ status: 'loading' })
  try {
    const r = await fetch(`${FN}?oil=1`, H)
    const d = await r.json()
    if (d.bangchak?.items?.length || d.ptt?.items?.length) {
      useOil.setState({ data: d, status: 'ok' })
      try { localStorage.setItem('vault:oil', JSON.stringify(d)) } catch { /* */ }
    } else useOil.setState({ status: 'error' })
  } catch { useOil.setState({ status: 'error' }) }
}

/** Groups brand names into one fuel type so a favourite works across Bangchak and PTT. */
export const FUEL_TYPES = [
  { id: 'g95', label: 'แก๊สโซฮอล์ 95', color: '#f97316', bc: /แก๊สโซฮอล์ 95/, ptt: /^เบนซินแก๊สโซฮอล์ 95$/ },
  { id: 'g91', label: 'แก๊สโซฮอล์ 91', color: '#22c55e', bc: /แก๊สโซฮอล์ 91/, ptt: /^เบนซินแก๊สโซฮอล์ 91$/ },
  { id: 'e20', label: 'E20', color: '#16a34a', bc: /E20/, ptt: /E20/ },
  { id: 'e85', label: 'E85', color: '#65a30d', bc: /E85/, ptt: /E85/ },
  { id: 'b7', label: 'ดีเซล (B7)', color: '#2563eb', bc: /^ไฮดีเซล S$|^ดีเซล$/, ptt: /^ดีเซล$/ },
  { id: 'b20', label: 'ดีเซล B20', color: '#0ea5e9', bc: /B20/, ptt: /B20/ },
  { id: 'pd', label: 'ดีเซลพรีเมียม', color: '#7c3aed', bc: /พรีเมียม ดีเซล/, ptt: /Super Power Diesel/ },
  { id: 'p98', label: 'เบนซินพรีเมียม 98', color: '#db2777', bc: /98/, ptt: /^เบนซิน$/ },
]
