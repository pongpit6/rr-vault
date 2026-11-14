/**
 * Bitcoin power law (as on btcpowerlaw.nl):
 *   trend(d) = 10^-16.493 × d^5.688, d = days since the genesis block (3 Jan 2009)
 *   floor(d) = 0.42 × trend(d)
 */
export const GENESIS = Date.UTC(2009, 0, 3)
export const FLOOR_K = 0.42
export const daysAt = (ms = Date.now()) => (ms - GENESIS) / 86400000
export const trendAt = (d) => Math.pow(10, -16.493) * Math.pow(d, 5.688)
export const floorAt = (d) => FLOOR_K * trendAt(d)
export const dateOfDay = (d) => new Date(GENESIS + d * 86400000)
/** day on which the floor reaches `price` */
export const dayFloorReaches = (price) => Math.pow(price / FLOOR_K / Math.pow(10, -16.493), 1 / 5.688)

let cache = null
/** Daily closes [[day, usd], …]: bundled 2010-07 → 2022-06 plus Binance daily candles after that. */
export async function loadHistory() {
  if (cache) return cache
  const raw = (await import('./btcHistory.json')).default
  const out = []
  let day = raw.start
  raw.p.forEach((p, i) => { if (i) day += raw.d[i - 1]; out.push([day, p]) })
  let recent = []
  try {
    const saved = JSON.parse(localStorage.getItem('vault:btcDaily') || 'null')
    if (saved && saved.at > Date.now() - 6 * 3600_000) recent = saved.rows
  } catch { /* no cache */ }
  if (!recent.length) {
    let start = GENESIS + (out[out.length - 1][0] + 1) * 86400000
    for (let guard = 0; guard < 6 && start < Date.now(); guard++) {
      let rows = null
      for (const host of ['https://data-api.binance.vision', 'https://api.binance.com']) {
        try {
          const r = await fetch(`${host}/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=1000&startTime=${start}`)
          if (r.ok) { rows = await r.json(); break }
        } catch { /* try next host */ }
      }
      if (!rows?.length) break
      for (const k of rows) recent.push([Math.round((k[0] - GENESIS) / 86400000), Number(k[4])])
      start = rows[rows.length - 1][0] + 86400000
      if (rows.length < 1000) break
    }
    try { if (recent.length) localStorage.setItem('vault:btcDaily', JSON.stringify({ at: Date.now(), rows: recent })) } catch { /* storage full */ }
  }
  const last = out[out.length - 1][0]
  cache = out.concat(recent.filter((r) => r[0] > last))
  return cache
}

/** Bear-market lows: the lowest price/floor ratio inside each cycle window. */
const WINDOWS = [['2011-06-01', '2012-12-31'], ['2014-06-01', '2016-03-01'], ['2018-06-01', '2019-06-30'], ['2022-01-01', '2023-03-01'], ['2026-01-01', '2027-12-31']]
export function bearLows(hist) {
  return WINDOWS.map(([a, b]) => {
    const da = daysAt(Date.parse(a)), db = daysAt(Date.parse(b))
    let best = null
    for (const [d, p] of hist) if (d >= da && d <= db) { const r = p / floorAt(d); if (!best || r < best.r) best = { d, p, r } }
    return best
  }).filter(Boolean)
}

/** Share of days since 2014 whose price sat further above the floor than `ratio` ("dearer" relative to the floor). */
export function dearerShare(hist, ratio) {
  const from = daysAt(Date.UTC(2014, 0, 1))
  let n = 0, k = 0
  for (const [d, p] of hist) if (d >= from) { n++; if (p / floorAt(d) > ratio) k++ }
  return n ? k / n : null
}

/* ---------- statistics from all daily closes ---------- */
const quant = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))]

/** Price ÷ trend quantiles and below-floor history, computed from the data (not hard-coded). */
export function computeStats(hist) {
  const xs = hist.map(([d, p]) => p / trendAt(d)).sort((a, b) => a - b)
  const below = []
  let run = null
  for (const [d, p] of hist) {
    if (p < floorAt(d)) { if (!run) run = { from: d, to: d, n: 0 }; run.to = d; run.n++ } else if (run) { below.push(run); run = null }
  }
  if (run) below.push(run)
  const n2016 = hist.filter((h) => h[0] >= daysAt(Date.UTC(2016, 0, 1)))
  const runs2016 = below.filter((r) => r.from >= daysAt(Date.UTC(2016, 0, 1)))
  return {
    total: hist.length,
    q10: quant(xs, 0.1), q50: quant(xs, 0.5), q90: quant(xs, 0.9),
    belowDays: below.reduce((s, r) => s + r.n, 0), belowVisits: below.length, longest: below.reduce((m, r) => Math.max(m, r.n), 0),
    below2016Pct: n2016.length ? runs2016.reduce((s, r) => s + r.n, 0) / n2016.length : 0,
    longest2016: runs2016.reduce((m, r) => Math.max(m, r.n), 0),
    shareCheaper: (x) => { let lo = 0, hi = xs.length; while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m] < x) lo = m + 1; else hi = m } return lo / xs.length },
    sortedX: xs,
  }
}

/** Zones on the price ÷ trend scale (floor = 0.42×). Colours follow the reference bar. */
export function zonesOf(st) {
  return [
    { id: 'below', name: 'ต่ำกว่า Floor', from: 0, to: FLOOR_K, color: '#9f1239' },
    { id: 'cheap10', name: 'ถูกมาก (10% ล่างสุด)', from: FLOOR_K, to: Math.max(FLOOR_K + 0.01, st.q10), color: '#4ade80' },
    { id: 'cheap', name: 'ถูก (ต่ำกว่าค่ากลาง)', from: Math.max(FLOOR_K + 0.01, st.q10), to: st.q50, color: '#16a34a' },
    { id: 'fair', name: 'ใกล้ Trend', from: st.q50, to: 1.25, color: '#2563eb' },
    { id: 'rich', name: 'แพง', from: 1.25, to: st.q90, color: '#b45309' },
    { id: 'hot', name: 'แพงมาก (10% บนสุด)', from: st.q90, to: Infinity, color: '#f97316' },
  ]
}

/** Ladder rungs on a log scale of price ÷ trend. */
export function ladderOf(hist, rungs = 18, lo = 0.25, hi = 6) {
  const a = Math.log(lo), b = Math.log(hi), step = (b - a) / rungs
  const bins = Array.from({ length: rungs }, (_, i) => ({ from: Math.exp(a + i * step), to: Math.exp(a + (i + 1) * step), n: 0 }))
  for (const [d, p] of hist) {
    const x = Math.log(p / trendAt(d))
    const i = Math.min(rungs - 1, Math.max(0, Math.floor((x - a) / step)))
    bins[i].n++
  }
  return bins
}
