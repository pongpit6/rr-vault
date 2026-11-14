import { create } from 'zustand'
import { SUPABASE_URL } from './supabase'

// Public anon JWT (safe to ship; the function only proxies public market data).
const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxaW9rd2VlZGFxYW91eHFidW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMzkxMjQsImV4cCI6MjEwMzgxNTEyNH0.6S3lRXgY1zAPfYkJ20uX_aFTOya1MEqb84U4Gkxa3Sk'
const FN = `${SUPABASE_URL}/functions/v1/vault-prices`
const LS = 'vault:prices'
const BAHT_GRAMS = 15.244, OZ_GRAMS = 31.1035, THAI_PURITY = 0.965

const load = () => { try { return JSON.parse(localStorage.getItem(LS)) || {} } catch { return {} } }
const save = (q) => { try { localStorage.setItem(LS, JSON.stringify(q)) } catch { /* ignore */ } }

export const usePrices = create((set, get) => ({
  quotes: load(), // { SYMBOL: { price, changePct, currency, name, time, live } }
  status: 'idle', at: null, live: {},
  setQuote(sym, patch) {
    const quotes = { ...get().quotes, [sym]: { ...(get().quotes[sym] || {}), ...patch } }
    set({ quotes }); save(quotes)
  },
}))

export async function fetchQuotes(symbols) {
  const syms = [...new Set(symbols.filter(Boolean))]
  if (!syms.length) return
  usePrices.setState({ status: 'loading' })
  try {
    const out = {}
    for (let i = 0; i < syms.length; i += 30) {
      const r = await fetch(`${FN}?symbols=${encodeURIComponent(syms.slice(i, i + 30).join(','))}`, { headers: { Authorization: `Bearer ${ANON_JWT}`, apikey: ANON_JWT } })
      const j = await r.json()
      for (const q of j.quotes || []) if (!q.error) out[q.symbol] = { price: q.price, changePct: q.changePct, currency: q.currency, name: q.name, time: q.time || Date.now() }
    }
    const quotes = { ...usePrices.getState().quotes }
    for (const [k, v] of Object.entries(out)) quotes[k] = { ...(quotes[k] || {}), ...v, live: quotes[k]?.live && Date.now() - (quotes[k].liveAt || 0) < 15000 }
    usePrices.setState({ quotes, status: 'ok', at: Date.now() }); save(quotes)
  } catch (e) {
    console.warn('price fetch failed', e)
    usePrices.setState({ status: 'error' })
  }
}

export async function searchSymbols(q) {
  const r = await fetch(`${FN}?search=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${ANON_JWT}`, apikey: ANON_JWT } })
  const j = await r.json()
  return j.results || []
}

const histCache = {}
/** Close price of a Yahoo symbol on a past date (cached). */
export async function histPrice(symbol, date) {
  const k = `${symbol}@${date}`
  if (histCache[k] !== undefined) return histCache[k]
  try {
    const r = await fetch(`${FN}?hist=${encodeURIComponent(symbol)}&date=${date}`, { headers: { Authorization: `Bearer ${ANON_JWT}`, apikey: ANON_JWT } })
    const j = await r.json()
    histCache[k] = j.price ?? null
  } catch { histCache[k] = null }
  return histCache[k]
}

export async function searchFunds(q) {
  const r = await fetch(`${FN}?funds=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${ANON_JWT}`, apikey: ANON_JWT } })
  const j = await r.json()
  return j.results || []
}

export const fxUSDTHB = (quotes) => quotes['THB=X']?.price || 34
/** Yahoo symbol for THB per 1 unit of a currency (null for THB). */
export const fxSym = (c) => (!c || c === 'THB' ? null : c === 'USD' ? 'THB=X' : `${c}THB=X`)
/** THB per 1 unit of a currency (null when the rate isn't loaded yet). */
export const fxOf = (c, quotes) => (!c || c === 'THB' ? 1 : c === 'USD' ? fxUSDTHB(quotes) : quotes[`${c}THB=X`]?.price || null)
/** Quote currency guessed from a Yahoo ticker suffix. */
export const ccyOfSymbol = (s = '') => (/\.BK$/.test(s) ? 'THB' : /\.HK$/.test(s) ? 'HKD' : /\.(SS|SZ)$/.test(s) ? 'CNY' : /\.T$/.test(s) ? 'JPY' : /\.SI$/.test(s) ? 'SGD' : /\.L$/.test(s) ? 'GBP' : 'USD')
/** Short currency mark for prices. */
export const ccyMark = (c) => ({ THB: '฿', USD: '$', HKD: 'HK$', CNY: '¥', JPY: '¥', EUR: '€', GBP: '£', SGD: 'S$' }[c] ?? (c ? c + ' ' : '฿'))

/** Current unit price of an asset in its quote currency. */
export function assetPrice(asset, quotes) {
  if (!asset) return null
  if (asset.source === 'manual') return Number(asset.manualPrice) || null
  if (asset.source === 'thaigold') {
    const xau = quotes['GC=F']?.price
    if (!xau) return Number(asset.manualPrice) || null
    return Math.round(xau * fxUSDTHB(quotes) * (BAHT_GRAMS / OZ_GRAMS) * THAI_PURITY / 10) * 10
  }
  return quotes[asset.symbol]?.price ?? (Number(asset.manualPrice) || null)
}
export function assetChange(asset, quotes) {
  if (asset.source === 'manual') return null
  if (asset.source === 'thaigold') return quotes['GC=F']?.changePct ?? null
  return quotes[asset.symbol]?.changePct ?? null
}

/* ---------- realtime crypto via Binance websocket (runs in the browser) ---------- */
let ws = null, wsSyms = '', retry = 0, retryTimer = null
export function streamCrypto(assets) {
  const pairs = assets.filter((a) => a.type === 'crypto' && a.symbol?.endsWith('-USD')).map((a) => a.symbol.replace('-USD', '').toLowerCase() + 'usdt')
  const key = [...new Set(pairs)].sort().join('/')
  if (key === wsSyms && ws && ws.readyState <= 1) return
  stopStream()
  wsSyms = key
  if (!key) return
  try {
    ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${key.split('/').map((p) => `${p}@miniTicker`).join('/')}`)
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data)?.data
      if (!d?.s) return
      const sym = d.s.replace(/USDT$/, '') + '-USD'
      const price = Number(d.c), open = Number(d.o)
      usePrices.getState().setQuote(sym, { price, changePct: open ? ((price - open) / open) * 100 : null, currency: 'USD', live: true, liveAt: Date.now(), time: Date.now() })
    }
    ws.onopen = () => { retry = 0 }
    ws.onclose = () => {
      if (!wsSyms) return
      clearTimeout(retryTimer)
      retryTimer = setTimeout(() => { const k = wsSyms; wsSyms = ''; if (k) streamCrypto(assets) }, Math.min(30000, 2000 * 2 ** retry++))
    }
  } catch { /* websocket unavailable */ }
}
export function stopStream() {
  const k = wsSyms; wsSyms = ''
  clearTimeout(retryTimer)
  if (ws) { try { ws.close() } catch { /* */ } ws = null }
  return k
}

export const GOLD = { BAHT_GRAMS, OZ_GRAMS, THAI_PURITY }
