/**
 * Bitcoin cycle indicators (public API, read through our vault-rank function). Latest values are cached for an hour
 * on this device; history per indicator for a day. Futures data (open interest, funding) is left out on purpose.
 */
import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { FN, H } from './market'

// fetched through our own Supabase function: the data source only ever sees our server, never this device
const PROXY = FN.replace('vault-prices', 'vault-rank')
const apiGet = (path, from) => fetch(`${PROXY}?cycle=${encodeURIComponent(path)}${from ? `&from=${from}` : ''}`, H)
const HOUR = 3600_000
const K_NOW = 'vault:btccycle'

const readCache = (k, ttl) => { try { const c = JSON.parse(localStorage.getItem(k)); return c && Date.now() - c.at < ttl ? c.v : null } catch { return null } }
const writeCache = (k, v) => { try { localStorage.setItem(k, JSON.stringify({ at: Date.now(), v })) } catch { /* full */ } }

let inflight = null
export async function loadCycle(force = false) {
  const hit = !force && readCache(K_NOW, HOUR)
  if (hit) return hit
  if (inflight) return inflight
  inflight = (async () => {
    const r = await apiGet('indicators')
    if (!r.ok) throw new Error('cycle ' + r.status)
    const j = await r.json()
    const ind = j.indicators || j.data || j
    const get = (id) => ind?.[id]?.data || null
    const v = {
      at: Date.now(), price: j.price ?? get('mvrv')?.price ?? null,
      asOf: ind?.mvrv?.asOf || null,
      mvrv: get('mvrv'), nupl: get('nupl'), cvdd: get('cvdd'), loss: get('supply-in-loss'), lth: get('lth-realized-price'),
      cost: get('production-cost'), puell: get('puell'), mayer: get('mayer'), pi: get('pi-cycle'), ma2y: get('2y-ma'), ma4y: get('4y-ma'),
      ahr: get('ahr999'), rsi: get('rsi'), risk: get('risk'), peak: get('peak-signals'), bottom: get('bottom-signals'),
    }
    writeCache(K_NOW, v)
    return v
  })().finally(() => { inflight = null })
  return inflight
}

/** daily history of one field: [[time, value], …] */
export async function loadCycleHistory(id, field, from) {
  const k = `vault:btccycle:h:${id}:${field}:${from || 'all'}`
  const hit = readCache(k, 12 * HOUR)
  if (hit) return hit
  const r = await apiGet(`indicators/${id}/history`, from)
  if (!r.ok) throw new Error('history ' + r.status)
  const j = await r.json()
  const dates = j.dates || j.data?.dates || []
  const [fa, fb] = field.split('/')
  const A = (j.data || {})[fa] || [], B = fb ? (j.data || {})[fb] || [] : null
  const vals = B ? A.map((x, i) => (x != null && B[i] ? x / B[i] : null)) : A
  const out = dates.map((d, i) => [Date.parse(d + 'T00:00:00Z'), vals[i]]).filter((x) => x[1] != null)
  // keep it light: at most ~800 points
  const step = Math.max(1, Math.ceil(out.length / 800))
  const thin = out.filter((_, i) => i % step === 0 || i === out.length - 1)
  writeCache(k, thin)
  return thin
}

/** the checklist behind a verdict (peak-signals / bottom-signals) */
export async function loadChecklist(id) {
  const k = `vault:btccycle:c:${id}`
  const hit = readCache(k, HOUR)
  if (hit) return hit
  const r = await apiGet(`indicators/${id}`)
  if (!r.ok) throw new Error('checklist ' + r.status)
  const d = (await r.json()).data || {}
  writeCache(k, d)
  return d
}

/** hook: latest cycle data, refreshed hourly; also tells the town (ui.btcCycle) */
export function useCycle() {
  const [d, setD] = useState(() => readCache(K_NOW, 24 * HOUR))
  const [err, setErr] = useState(null)
  useEffect(() => {
    let alive = true
    const run = () => loadCycle().then((v) => { if (!alive) return; setD(v); setErr(null); shareWithTown(v) }).catch((e) => alive && setErr(String(e)))
    run()
    const iv = setInterval(run, HOUR)
    return () => { alive = false; clearInterval(iv) }
  }, [])
  return { d, err }
}

export function shareWithTown(v) {
  if (!v) return
  const z = cycleZone(v)
  const cur = useStore.getState().ui.btcCycle
  if (cur?.zone !== z.id || cur?.asOf !== v.asOf) useStore.getState().setUi({ btcCycle: { zone: z.id, asOf: v.asOf, bottomHits: v.bottom?.hitCount ?? null, peakHits: v.peak?.hitCount ?? null } })
}

/* ---------- reading the numbers ---------- */
export const VERDICT_TH = {
  ACCUMULATE: 'สะสม', BUY: 'ซื้อ', STRONG_BUY: 'ซื้อหนัก', WAIT: 'รอดูก่อน', HOLD: 'ถือต่อ', SELL: 'ทยอยขาย', TAKE_PROFIT: 'ทยอยทำกำไร', STRONG_SELL: 'ขาย', NEUTRAL: 'กลาง ๆ',
}
export const verdictTh = (v) => VERDICT_TH[String(v || '').toUpperCase().replace(/\s+/g, '_')] || v || '—'

/** overall zone for the card and the town: bottom → cheap, peak → hot */
export function cycleZone(v) {
  const b = v?.bottom, p = v?.peak
  const bHit = b?.total ? b.hitCount / b.total : 0, pHit = p?.total ? p.hitCount / p.total : 0
  if (pHit >= 0.5 || /SELL|PROFIT/i.test(p?.verdict || '')) return { id: 'top', name: 'ใกล้จุดสูงสุดของรอบ', color: '#ef4444', emoji: '🚩' }
  if (pHit >= 0.25) return { id: 'warm', name: 'เริ่มร้อน', color: '#f59e0b', emoji: '🔥' }
  if (bHit >= 0.25 || /ACCUMULATE|BUY/i.test(b?.verdict || '')) return { id: 'bottom', name: 'โซนสะสม (ใกล้จุดต่ำของรอบ)', color: '#22c55e', emoji: '🛒' }
  return { id: 'mid', name: 'กลางรอบ', color: '#38bdf8', emoji: '⚖️' }
}

/**
 * six gauges: value, where it sits between "cheap" and "hot" (0–1 for the bar), and a plain-Thai reading.
 * Bands follow the usual reading of each metric; refs from the API override where given.
 */
export function gauges(v) {
  if (!v) return []
  const band = (x, lo, hi) => Math.max(0, Math.min(1, (x - lo) / (hi - lo)))
  const out = []
  const z = v.mvrv?.zScore
  if (z != null) out.push({ id: 'mvrv', field: 'zScore', name: 'MVRV Z-Score', val: z.toFixed(2), pos: band(z, -1, 7),
    zone: z < 0 ? 'cheap' : z < 3 ? 'mid' : z < 6 ? 'warm' : 'hot',
    about: 'ราคาตลาดเทียบต้นทุนเฉลี่ยของทุกเหรียญ ต่ำกว่า 0 = ถูกกว่าที่ทุกคนซื้อมา, เกิน 6–7 = มักเป็นยอดรอบ', refs: [[0, 'ถูก'], [7, 'ยอด']] })
  const my = v.mayer?.mayer
  if (my != null) { const lo = v.mayer.refs?.bottom ?? 0.8, hi = v.mayer.refs?.top ?? 2.4
    out.push({ id: 'mayer', field: 'mayer', name: 'Mayer Multiple', val: my.toFixed(2), pos: band(my, 0.5, hi + 0.3), zone: my < lo ? 'cheap' : my < 1.3 ? 'mid' : my < hi ? 'warm' : 'hot',
      about: `ราคา ÷ ค่าเฉลี่ย 200 วัน ต่ำกว่า ${lo} = ถูกมาก, เกิน ${hi.toFixed(2)} = ร้อนจัด`, refs: [[lo, 'ถูก'], [hi, 'ร้อน']] }) }
  const pu = v.puell?.puell
  if (pu != null) { const lo = v.puell.refs?.bottom ?? 0.5, hi = v.puell.refs?.top ?? 4
    out.push({ id: 'puell', field: 'puell', name: 'Puell Multiple', val: pu.toFixed(2), pos: band(pu, 0.3, hi + 0.5), zone: pu < lo ? 'cheap' : pu < 1.2 ? 'mid' : pu < hi ? 'warm' : 'hot',
      about: 'รายได้คนขุดวันนี้เทียบค่าเฉลี่ย 1 ปี ต่ำ = คนขุดลำบาก (มักเป็นช่วงก้นรอบ), สูง = คนขุดกำไรหนัก', refs: [[lo, 'ก้นรอบ'], [hi, 'ยอด']] }) }
  const r = v.rsi?.rsiWeekly14 ?? v.rsi?.rsi14
  if (r != null) out.push({ id: 'rsi', field: 'rsi14', histName: 'RSI รายวัน', name: v.rsi?.rsiWeekly14 != null ? 'RSI รายสัปดาห์' : 'RSI รายวัน', val: r.toFixed(0), pos: band(r, 20, 90), zone: r < 35 ? 'cheap' : r < 60 ? 'mid' : r < 75 ? 'warm' : 'hot',
    about: `แรงซื้อขายรายสัปดาห์ ต่ำกว่า 35 = ขายมากเกิน, เกิน 75 = ซื้อมากเกิน${v.rsi?.rsi14 != null ? ` · รายวันตอนนี้ ${v.rsi.rsi14.toFixed(0)}` : ''}`, refs: [[30, 'ขายมากเกิน'], [70, 'ซื้อมากเกิน']] })
  const a = v.ahr?.ahr999
  if (a != null) out.push({ id: 'ahr999', field: 'ahr999', name: 'AHR999', val: a.toFixed(2), pos: band(a, 0.2, 4), zone: a < 0.45 ? 'cheap' : a < 1.2 ? 'mid' : a < 4 ? 'warm' : 'hot',
    about: 'ดัชนีสำหรับคนซื้อสะสม ต่ำกว่า 0.45 = ช้อนได้, 0.45–1.2 = ซื้อสะสมแบบเฉลี่ย, เกิน 1.2 = รอ', refs: [[0.45, 'ช้อน'], [1.2, 'รอ']] })
  const pi = v.pi
  if (pi?.ma111 && pi?.ma350x2) { const gap = pi.ma111 / pi.ma350x2
    out.push({ id: 'pi-cycle', field: 'ma111/ma350x2', histName: 'เส้น 111 วัน ÷ เส้น 350 วัน×2 (ถึง 1 = ยอด)', name: 'Pi Cycle', val: pi.topSignal ? 'ยอด!' : pi.bottomSignal ? 'ก้น!' : `${Math.round(gap * 100)}%`, pos: band(gap, 0.3, 1), zone: pi.topSignal ? 'hot' : pi.bottomSignal ? 'cheap' : gap > 0.85 ? 'warm' : 'mid',
      about: 'เส้น 111 วันวิ่งชนเส้น 350 วัน×2 = สัญญาณยอดรอบ (ตัวเลขคือระยะที่วิ่งมาแล้ว) · มีสัญญาณก้นรอบแยกด้วย', refs: [[1, 'ยอด']] }) }
  return out
}
export const ZONE_COLOR = { cheap: '#22c55e', mid: '#38bdf8', warm: '#f59e0b', hot: '#ef4444' }
export const ZONE_TH = { cheap: 'ถูก', mid: 'กลาง', warm: 'เริ่มร้อน', hot: 'ร้อนจัด' }

/** price levels for the ladder (USD) */
export function levels(v) {
  if (!v) return []
  const L = [
    [v.ma2y?.ma2y, 'ค่าเฉลี่ย 2 ปี', 'เส้นแบ่งตลาดหมี/กระทิงระยะยาว'],
    [v.mayer?.ma200, 'ค่าเฉลี่ย 200 วัน', 'แนวรับ/ต้านหลักของรอบ'],
    [v.ma4y?.ma4y, 'ค่าเฉลี่ย 4 ปี', 'ทั้งรอบ halving ราคาแทบไม่หลุดเส้นนี้นาน'],
    [v.cost?.cost, 'ต้นทุนการขุด', 'ถ้าราคาต่ำกว่านี้ คนขุดขาดทุน'],
    [v.mvrv?.realizedPrice, 'ต้นทุนเฉลี่ยทั้งตลาด', 'ราคาเฉลี่ยที่ทุกเหรียญถูกซื้อครั้งล่าสุด'],
    [v.lth?.lthRealizedPrice, 'ต้นทุนผู้ถือระยะยาว', 'คนถือเกิน 155 วัน ซื้อมาเฉลี่ยราคานี้'],
    [v.cvdd?.cvdd, 'CVDD', 'มักเป็นก้นรอบในตลาดหมี'],
  ]
  return L.filter(([p]) => p > 0).map(([p, name, about]) => ({ p, name, about }))
}
