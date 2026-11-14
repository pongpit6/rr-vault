import { useEffect, useMemo, useRef, useState } from 'react'
import { daysAt, trendAt, floorAt, dateOfDay, HALVINGS } from '../lib/powerlaw'

const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
export const dLabel = (d) => { const t = dateOfDay(d); return `${t.getUTCDate()} ${TH_M[t.getUTCMonth()]} ${t.getUTCFullYear()}` }
const mLabel = (d) => { const t = dateOfDay(d); return `${TH_M[t.getUTCMonth()]} ${String(t.getUTCFullYear()).slice(2)}` }
const short = (v) => (v >= 1e6 ? `${+(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : v >= 1 ? String(Math.round(v)) : v.toFixed(2))

export const RANGES = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: '4y', label: '4 ปี', days: 4 * 365 },
  { id: '1y', label: '1 ปี', days: 365 },
  { id: '3m', label: '3 เดือน', days: 92 },
  { id: 'mine', label: 'ช่วงที่ฉันซื้อ' },
]

/**
 * Bitcoin vs the power-law floor/trend.
 * Mouse: hover for details, wheel to zoom, drag to pan. Touch: slide one finger for details, two fingers to zoom/pan.
 */
export default function PowerLawChart({ hist, now, price, k, sym, lows, lots, avg, range, setRange, privacy, nextHalving = null }) {
  const boxRef = useRef(null)
  const [W, setW] = useState(640)
  const [hover, setHover] = useState(null)
  const [custom, setCustom] = useState(null) // {d0, d1} after zooming/panning
  const [drawKey, setDrawKey] = useState(0)
  const ptrs = useRef(new Map())
  const gesture = useRef(null)
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))))
    ro.observe(el); return () => ro.disconnect()
  }, [])
  useEffect(() => { setCustom(null); setDrawKey((n) => n + 1) }, [range])

  const H = W < 560 ? 310 : 430
  const X0 = 50, X1 = W - (W < 560 ? 14 : 24), Y0 = 16, Y1 = H - 30
  const fmt = (v) => `${sym}${(v * k).toLocaleString('en-US', { maximumFractionDigits: v * k < 10 ? 2 : 0 })}`

  /* ---- domain ---- */
  const firstLot = lots.length ? Math.min(...lots.map((l) => l.d)) : null
  const halvings = useMemo(() => (nextHalving ? [...HALVINGS, { n: 5, d: nextHalving, from: 3.125, to: 1.5625, est: true }] : HALVINGS), [nextHalving && Math.round(nextHalving)])
  const dom = useMemo(() => {
    if (custom) return { log: false, ...custom }
    if (range === 'all') return { log: true, d0: 560, d1: now + 5 * 365.25 }
    if (range === 'mine' && firstLot) { const span = Math.max(20, now - firstLot); return { log: false, d0: firstLot - span * 0.35, d1: now + span * 0.12 } }
    const r = RANGES.find((x) => x.id === range) || RANGES[2]
    return { log: false, d0: now - (r.days || 365), d1: now + (r.days || 365) * 0.06 }
  }, [range, custom, now, firstLot])

  const geo = useMemo(() => {
    if (!hist?.length) return null
    const { log, d0, d1 } = dom
    const sx = log
      ? (d) => X0 + ((Math.log10(d) - Math.log10(d0)) / (Math.log10(d1) - Math.log10(d0))) * (X1 - X0)
      : (d) => X0 + ((d - d0) / (d1 - d0)) * (X1 - X0)
    const inv = log
      ? (x) => Math.pow(10, Math.log10(d0) + ((x - X0) / (X1 - X0)) * (Math.log10(d1) - Math.log10(d0)))
      : (x) => d0 + ((x - X0) / (X1 - X0)) * (d1 - d0)
    const pts = hist.filter((h) => h[0] >= d0 - 2 && h[0] <= Math.min(d1, now) + 1)
    let lo, hi
    if (log) { lo = 0.03; hi = 2e6 } else {
      const vals = pts.map((h) => h[1]).concat([floorAt(d0), floorAt(Math.min(d1, now + 400))])
      lots.filter((l) => l.d >= d0 && l.d <= d1).forEach((l) => vals.push(l.p))
      if (avg) vals.push(avg)
      if (price) vals.push(price)
      lo = Math.min(...vals) / 1.12; hi = Math.max(...vals) * 1.12
      const tr = trendAt(Math.min(d1, now)); if (tr < hi * 1.6) hi = Math.max(hi, tr * 1.08)
    }
    const ly0 = Math.log10(lo), ly1 = Math.log10(hi)
    const sy = (v) => Y1 - ((Math.log10(Math.max(v, 1e-9)) - ly0) / (ly1 - ly0)) * (Y1 - Y0)
    const line = (fn, a, b, n = 140) => {
      if (b <= a) return ''
      let s = ''
      for (let i = 0; i <= n; i++) {
        const d = log ? Math.pow(10, Math.log10(a) + (Math.log10(b) - Math.log10(a)) * (i / n)) : a + (b - a) * (i / n)
        s += `${i ? 'L' : 'M'}${sx(d).toFixed(1)} ${sy(fn(d)).toFixed(1)}`
      }
      return s
    }
    const step = Math.max(1, Math.floor(pts.length / 1600))
    let pricePath = ''
    pts.forEach((h, i) => { if (i % step === 0 || i === pts.length - 1) pricePath += `${pricePath ? 'L' : 'M'}${sx(h[0]).toFixed(1)} ${sy(h[1]).toFixed(1)}` })
    if (price && now <= d1) pricePath += `L${sx(now).toFixed(1)} ${sy(price).toFixed(1)}`
    // closes below the floor, drawn again in red
    let belowPath = '', open = false
    for (const h of pts) {
      const under = h[1] < floorAt(h[0])
      if (under) { belowPath += `${open ? 'L' : 'M'}${sx(h[0]).toFixed(1)} ${sy(h[1]).toFixed(1)}`; open = true } else open = false
    }
    const nowC = Math.min(now, d1)
    const floorPast = line(floorAt, d0, nowC), floorFuture = now < d1 ? line(floorAt, now, d1, 60) : ''
    const trendPast = line(trendAt, d0, nowC), trendFuture = now < d1 ? line(trendAt, now, d1, 60) : ''
    const area = floorPast + floorFuture.replace(/^M/, 'L') + `L${sx(d1).toFixed(1)} ${Y1}L${sx(d0).toFixed(1)} ${Y1}Z`
    // ticks
    const yT = []
    for (let e = Math.floor(ly0); e <= Math.ceil(ly1); e++) {
      const base = Math.pow(10, e)
      for (const m of ly1 - ly0 > 3 ? [1] : ly1 - ly0 > 1.2 ? [1, 3] : [1, 1.5, 2, 3, 5, 7]) { const v = base * m; if (v >= lo && v <= hi) yT.push(v) }
    }
    const yTicks = (log ? yT.filter((v, i) => i % 1 === 0 && Math.log10(v) % 1 === 0) : yT).filter((v, i, a) => i === 0 || sy(a[i - 1]) - sy(v) > 22)
    let xTicks = []
    if (log) xTicks = [2011, 2012, 2013, 2014, 2016, 2018, 2020, 2022, 2024, 2026, 2028, 2030].map((y) => ({ x: sx(daysAt(Date.UTC(y, 0, 1))), label: String(y) }))
    else {
      const span = d1 - d0
      const stepM = span > 1500 ? 12 : span > 700 ? 6 : span > 300 ? 2 : span > 120 ? 1 : 0.5
      const s = dateOfDay(d0)
      for (let m = 0; m < 400; m++) {
        const t = stepM >= 12 ? Date.UTC(s.getUTCFullYear() + 1 + m, 0, 1) // 1 Jan of each year
          : stepM >= 1 ? Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1 + m * stepM, 1)
          : Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1 + (m + 1) * 14)
        const d = daysAt(t); if (d > d1) break
        if (d >= d0) xTicks.push({ x: sx(d), label: stepM >= 12 ? String(dateOfDay(d).getUTCFullYear()) : stepM >= 1 ? mLabel(d) : `${dateOfDay(d).getUTCDate()} ${TH_M[dateOfDay(d).getUTCMonth()]}` })
      }
    }
    xTicks = xTicks.filter((t) => t.x >= X0 + 8 && t.x <= X1 - 8).reduceRight((acc, t) => (acc.length && acc[0].x - t.x < 42 ? acc : [t, ...acc]), [])
    return { log, d0, d1, sx, sy, inv, pts, pricePath, belowPath, floorPast, floorFuture, trendPast, trendFuture, area, yTicks, xTicks }
  }, [hist, dom, W, H, price, now, lots, avg]) // eslint-disable-line

  /* ---- interaction ---- */
  const toLocal = (e) => { const r = boxRef.current.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H } }
  const inspect = (x, y) => {
    if (!geo || x < X0 || x > X1) { setHover(null); return }
    const d = geo.inv(x)
    // a lot close to the pointer wins
    let lot = null, best = 16
    for (const l of lots) { if (l.d < geo.d0 || l.d > geo.d1) continue; const dx = Math.abs(geo.sx(l.d) - x), dy = Math.abs(geo.sy(l.p) - y); if (dx < best && dy < 60) { best = dx; lot = l } }
    if (lot) { setHover({ x: geo.sx(lot.d), y: geo.sy(lot.p), d: lot.d, p: lot.p, lot }); return }
    const hv = halvings.find((h) => h.d >= geo.d0 && h.d <= geo.d1 && Math.abs(geo.sx(h.d) - x) < 7)
    if (hv) {
      const hp = geo.pts.find((h) => h[0] >= hv.d)
      setHover({ x: geo.sx(hv.d), y: hp ? geo.sy(hp[1]) : geo.sy(floorAt(hv.d)), d: hv.d, p: hp && !hv.est ? hp[1] : null, halving: hv })
      return
    }
    let pt = null
    if (d <= now + 0.5 && geo.pts.length) {
      let lo = 0, hi = geo.pts.length - 1
      while (lo < hi) { const m = (lo + hi) >> 1; if (geo.pts[m][0] < d) lo = m + 1; else hi = m }
      pt = geo.pts[lo]
      if (lo > 0 && Math.abs(geo.pts[lo - 1][0] - d) < Math.abs(pt[0] - d)) pt = geo.pts[lo - 1]
      if (d > geo.pts[geo.pts.length - 1][0] + 0.5 && price) pt = [now, price]
    }
    const dd = pt ? pt[0] : d
    const pp = pt ? (pt[0] >= Math.floor(now) && price ? price : pt[1]) : null
    setHover({ x: geo.sx(dd), y: pp ? geo.sy(pp) : geo.sy(floorAt(dd)), d: dd, p: pp, future: !pt })
  }
  const zoomAt = (x, factor) => {
    if (!geo) return
    const center = geo.inv(x)
    let { d0, d1 } = dom
    if (dom.log) { d0 = Math.max(560, center - (center - 560) * 0.6); d1 = Math.min(now + 5 * 365.25, center + (now + 365 - center) * 0.6) }
    else { d0 = center - (center - d0) * factor; d1 = center + (d1 - center) * factor }
    if (d1 - d0 < 20) return
    d0 = Math.max(560, d0); d1 = Math.min(now + 5 * 365.25, d1)
    setCustom({ d0, d1 })
  }
  const panBy = (dxPx) => {
    if (!geo || dom.log) return
    const per = (dom.d1 - dom.d0) / (X1 - X0)
    let d0 = dom.d0 - dxPx * per, d1 = dom.d1 - dxPx * per
    if (d0 < 560) { d1 += 560 - d0; d0 = 560 }
    if (d1 > now + 5 * 365.25) { d0 -= d1 - (now + 5 * 365.25); d1 = now + 5 * 365.25 }
    setCustom({ d0, d1 })
  }
  const onWheel = (e) => { if (!geo) return; e.preventDefault(); const { x } = toLocal(e); zoomAt(x, e.deltaY > 0 ? 1.25 : 0.8) }
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })
  const onDown = (e) => {
    ptrs.current.set(e.pointerId, toLocal(e))
    e.currentTarget.setPointerCapture?.(e.pointerId)
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: (a.x + b.x) / 2 }; setHover(null) }
    else if (e.pointerType === 'mouse' && e.button === 0) gesture.current = { drag: toLocal(e).x, moved: false }
    else { const p = toLocal(e); inspect(p.x, p.y) }
  }
  const onMove = (e) => {
    const p = toLocal(e)
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, p)
    const g = gesture.current
    if (ptrs.current.size === 2 && g?.dist) {
      const [a, b] = [...ptrs.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y), mid = (a.x + b.x) / 2
      if (Math.abs(dist - g.dist) > 6) { zoomAt(mid, g.dist / dist); g.dist = dist }
      if (Math.abs(mid - g.mid) > 2) { panBy(mid - g.mid); g.mid = mid }
      return
    }
    if (g?.drag !== undefined && e.buttons === 1) {
      if (Math.abs(p.x - g.drag) > 3) { g.moved = true; if (dom.log) setCustom({ d0: dom.d0 === 560 ? 2000 : dom.d0, d1: now + 120 }); else panBy(p.x - g.drag); g.drag = p.x; setHover(null) }
      return
    }
    inspect(p.x, p.y)
  }
  const onUp = (e) => { ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) gesture.current = null; if (e.pointerType !== 'mouse') setTimeout(() => setHover(null), 2500) }

  /* ---- tooltip content ---- */
  const tip = hover && (() => {
    const fl = floorAt(hover.d), tr = trendAt(hover.d)
    if (hover.lot) {
      const l = hover.lot
      const atBuy = (l.usd / fl - 1) * 100
      return { title: `ไม้ที่คุณซื้อ · ${dLabel(hover.d)}`, lines: [
        `${fmt(l.p)} · ${privacy ? '••••' : `${l.qty} BTC (฿${Math.round(l.costTHB).toLocaleString()})`}`,
        `ตอนซื้อ${atBuy >= 0 ? 'เหนือ' : 'ต่ำกว่า'} Floor ${Math.abs(atBuy).toFixed(1)}% · ${(l.usd / tr).toFixed(2)}× Trend`,
      ], pnl: l.pnl, lot: true }
    }
    if (hover.halving) {
      const h = hover.halving
      return { title: `Halving ครั้งที่ ${h.n}${h.est ? ' (คาดการณ์)' : ''} · ${dLabel(h.d)}`, lines: [
        `รางวัลขุดต่อบล็อก ${h.from} → ${h.to} BTC`,
        hover.p ? `ราคาวันนั้น ${fmt(hover.p)} · ${hover.p >= fl ? 'เหนือ' : 'ต่ำกว่า'} Floor ${Math.abs((hover.p / fl - 1) * 100).toFixed(0)}%` : `Floor วันนั้น ${fmt(fl)} · Trend ${fmt(tr)}`,
      ], halving: true }
    }
    if (!hover.p) return { title: dLabel(hover.d), lines: [`Floor ${fmt(fl)} · Trend ${fmt(tr)}`, 'คาดการณ์ตามสูตร'] }
    const r = hover.p / fl
    return { title: dLabel(hover.d), lines: [`${fmt(hover.p)}, ${r >= 1 ? `เหนือ Floor ${((r - 1) * 100).toFixed(0)}%` : `ต่ำกว่า Floor ${((1 - r) * 100).toFixed(0)}%`}`, `${(hover.p / tr).toFixed(2)}× Trend`] }
  })()
  const tipLeft = hover ? (hover.x / W) * 100 : 0
  const tipRight = hover && hover.x > W * 0.62

  const livePt = geo && price && now <= geo.d1 && now >= geo.d0 ? { x: geo.sx(now), y: geo.sy(price) } : null
  const futureLabel = geo && geo.d1 > now + 400 ? { x: geo.sx(geo.d1), y: geo.sy(floorAt(geo.d1)), v: floorAt(geo.d1), d: geo.d1 } : null
  const avgY = geo && avg ? geo.sy(avg) : null

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="pl-seg" role="tablist" aria-label="ช่วงเวลา">
          {RANGES.filter((r) => r.id !== 'mine' || lots.length).map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)} className={!custom && range === r.id ? 'on' : ''} data-testid={`pl-range-${r.id}`}>{r.label}</button>
          ))}
        </div>
        {custom && <button onClick={() => { setCustom(null); setDrawKey((n) => n + 1) }} className="text-xs font-semibold text-sky-600">รีเซ็ตซูม</button>}
      </div>
      <div ref={boxRef} className="pl-chart relative select-none" style={{ height: H }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover(null) }}>
        {!geo ? <div className="h-full grid place-items-center text-sm text-slate-400">กำลังโหลดราคาย้อนหลัง…</div> : (
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" role="img" aria-label="กราฟราคา Bitcoin เทียบเส้น Floor และ Trend">
            <defs>
              <linearGradient id="plArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22c55e" stopOpacity=".16" /><stop offset="1" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
              <filter id="plGlow" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <clipPath id="plClip"><rect x={X0} y={Y0 - 6} width={X1 - X0} height={Y1 - Y0 + 6} /></clipPath>
            </defs>
            {geo.yTicks.map((v) => (
              <g key={v}>
                <line x1={X0} x2={X1} y1={geo.sy(v)} y2={geo.sy(v)} stroke="#1e293b" strokeWidth="1" />
                <text x={X0 - 8} y={geo.sy(v) + 4} fill="#64748b" fontSize="11" textAnchor="end">{sym}{short(v * k)}</text>
              </g>
            ))}
            {geo.xTicks.map((t) => <text key={t.x} x={t.x} y={H - 9} fill="#64748b" fontSize="11" textAnchor="middle">{t.label}</text>)}
            {/* halving epochs: alternate shading, dashed line + label at each halving */}
            <g clipPath="url(#plClip)">
              {halvings.map((h, i) => {
                const a = Math.max(geo.d0, h.d), b = Math.min(geo.d1, halvings[i + 1]?.d ?? geo.d1)
                return i % 2 === 0 && b > a ? <rect key={`e${h.n}`} x={geo.sx(a)} y={Y0} width={Math.max(0, geo.sx(b) - geo.sx(a))} height={Y1 - Y0} fill="#a78bfa" fillOpacity=".05" /> : null
              })}
              {halvings.filter((h) => h.d >= geo.d0 && h.d <= geo.d1).map((h) => (
                <line key={`h${h.n}`} x1={geo.sx(h.d)} x2={geo.sx(h.d)} y1={Y0 + 18} y2={Y1} stroke="#a78bfa" strokeOpacity={h.est ? 0.55 : 0.75} strokeWidth="1.3" strokeDasharray={h.est ? '2 4' : '5 4'} />
              ))}
            </g>
            {halvings.filter((h) => h.d >= geo.d0 && h.d <= geo.d1).map((h) => (
              <g key={`hl${h.n}`}>
                <rect x={geo.sx(h.d) - (W < 560 ? 15 : 34)} y={Y0} width={W < 560 ? 30 : 68} height="17" rx="8.5" fill={h.est ? '#2e1065' : '#4c1d95'} stroke="#a78bfa" strokeOpacity=".7" />
                <text x={geo.sx(h.d)} y={Y0 + 12} fill="#ede9fe" fontSize="10" fontWeight="700" textAnchor="middle">{W < 560 ? `H${h.n}` : `Halving ${h.n}${h.est ? '?' : ''}`}</text>
              </g>
            ))}
            <g clipPath="url(#plClip)" key={drawKey}>
              <path d={geo.area} fill="url(#plArea)" />
              <path d={geo.trendPast} fill="none" stroke="#94a3b8" strokeOpacity=".55" strokeWidth="1.4" />
              <path d={geo.trendFuture} fill="none" stroke="#94a3b8" strokeOpacity=".5" strokeWidth="1.4" strokeDasharray="3 4" />
              <path d={geo.floorPast} fill="none" stroke="#22c55e" strokeWidth="3" filter="url(#plGlow)" className="pl-draw" pathLength="1" />
              <path d={geo.floorFuture} fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="1 6" strokeLinecap="round" />
              <path d={geo.pricePath} fill="none" stroke="#e5e7eb" strokeWidth={geo.log ? 1.1 : 1.6} strokeLinejoin="round" className="pl-draw slow" pathLength="1" />
              {geo.belowPath && <path d={geo.belowPath} fill="none" stroke="#fb7185" strokeWidth={geo.log ? 2 : 2.4} strokeLinejoin="round" />}
              {avgY != null && avgY > Y0 && avgY < Y1 && <line x1={X0} x2={X1} y1={avgY} y2={avgY} stroke="#f59e0b" strokeWidth="1.4" strokeDasharray="4 4" />}
              {lows.filter((l) => l.d >= geo.d0 && l.d <= geo.d1).map((l) => (
                <g key={l.d}>
                  <circle cx={geo.sx(l.d)} cy={geo.sy(l.p)} r="6.5" fill="#0b1220" stroke="#fff" strokeWidth="2.4" />
                  <text x={geo.sx(l.d) + 8} y={geo.sy(l.p) + 22} fill="#f8fafc" fontSize="12" fontWeight="700">{dateOfDay(l.d).getUTCFullYear()}</text>
                  <text x={geo.sx(l.d) + 8} y={geo.sy(l.p) + 36} fill={l.r >= 1 ? '#4ade80' : '#4ade80'} fontSize="11" fontWeight="600">{l.r >= 1 ? '+' : '−'}{Math.abs((l.r - 1) * 100).toFixed(0)}%</text>
                </g>
              ))}
              {lots.filter((l) => l.d >= geo.d0 && l.d <= geo.d1).map((l, i) => (
                <g key={i}>
                  <circle cx={geo.sx(l.d)} cy={geo.sy(l.p)} r={geo.log ? 7 : 10} fill="#f59e0b" fillOpacity=".22" />
                  <circle cx={geo.sx(l.d)} cy={geo.sy(l.p)} r={geo.log ? 3.6 : 5.2} fill="#f59e0b" stroke="#0b1220" strokeWidth="1.5" />
                </g>
              ))}
            </g>
            {avgY != null && avgY > Y0 + 8 && avgY < Y1 - 8 && (
              <g>
                <rect x={X0 + 150} y={avgY - 10} width="126" height="19" rx="9.5" fill="#f59e0b" />
                <text x={X0 + 213} y={avgY + 3.5} fill="#1f1300" fontSize="10.5" fontWeight="700" textAnchor="middle">ต้นทุนเฉลี่ย {privacy ? '••••' : fmt(avg)}</text>
              </g>
            )}
            {futureLabel && (
              <g>
                <text x={futureLabel.x - 4} y={futureLabel.y - 12} fill="#4ade80" fontSize={W < 560 ? 13 : 16} fontWeight="800" textAnchor="end">{sym}{short(futureLabel.v * k)}</text>
                <text x={futureLabel.x - 4} y={futureLabel.y + 4} fill="#94a3b8" fontSize="10.5" textAnchor="end">Floor, {mLabel(futureLabel.d)}</text>
              </g>
            )}
            {livePt && (
              <g>
                <line x1={livePt.x} x2={livePt.x} y1={livePt.y - 10} y2={livePt.y - 34} stroke="#fb923c" strokeWidth="1.2" />
                <text x={livePt.x} y={livePt.y - 40} fill="#fb923c" fontSize="12" fontWeight="700" textAnchor="middle">ล่าสุด</text>
                <circle cx={livePt.x} cy={livePt.y} r="9" fill="#fb923c" className="pl-pulse" />
                <circle cx={livePt.x} cy={livePt.y} r="5.2" fill="#fb923c" stroke="#fff" strokeWidth="1.6" />
              </g>
            )}
            {hover && (
              <g pointerEvents="none">
                <line x1={hover.x} x2={hover.x} y1={Y0} y2={Y1} stroke="#e2e8f0" strokeOpacity=".4" />
                <circle cx={hover.x} cy={hover.y} r="5" fill={hover.lot ? '#f59e0b' : hover.halving ? '#a78bfa' : '#f8fafc'} stroke="#0b1220" strokeWidth="2" />
              </g>
            )}
            <text x={X0 + 8} y={Y0 + 34} fill="#cbd5e1" fontSize="11"><tspan fill="#94a3b8">━ </tspan>Trend</text>
            <text x={X0 + 8} y={Y0 + 50} fill="#4ade80" fontSize="11" fontWeight="700">━ Floor: 0.42× Trend</text>
            <text x={X0 + 8} y={Y0 + 66} fill="#c4b5fd" fontSize="11">┆ Halving (รางวัลขุดลดครึ่ง)</text>
            {geo.belowPath && <text x={X0 + 8} y={Y0 + 82} fill="#fb7185" fontSize="11">━ ช่วงที่ราคาหลุด Floor</text>}
          </svg>
        )}
        {tip && (
          <div className="pl-tip" style={{ left: `${tipLeft}%`, top: Math.max(6, Math.min(H - 110, (hover.y || 60) - 90)), transform: `translateX(${tipRight ? 'calc(-100% - 14px)' : '14px'})` }} data-testid="pl-tip">
            <div className="font-bold text-[13px]">{tip.title}</div>
            {tip.lines.map((l, i) => <div key={i} className={i ? 'text-slate-500' : ''}>{l}</div>)}
            {tip.lot && tip.pnl != null && <div className={tip.pnl >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>ตอนนี้ {tip.pnl >= 0 ? '+' : ''}{(tip.pnl * 100).toFixed(1)}%</div>}
          </div>
        )}
      </div>
      <div className="text-[11px] text-slate-400 mt-1.5">ชี้หรือแตะเพื่อดูราคาแต่ละวัน · {geo?.log ? 'แกนแบบ log–log' : 'แกนราคาแบบ log'} · PC: หมุนล้อเพื่อซูม ลากเพื่อเลื่อน · มือถือ: ใช้ 2 นิ้วซูม</div>
    </div>
  )
}
