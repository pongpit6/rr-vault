import { useEffect, useMemo, useRef, useState } from 'react'
import { usePrices, fxUSDTHB } from '../lib/prices'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { daysAt, trendAt, floorAt, dateOfDay, dayFloorReaches, loadHistory, bearLows, dearerShare } from '../lib/powerlaw'

const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const dLabel = (d) => { const t = dateOfDay(d); return `${t.getUTCDate()} ${TH_M[t.getUTCMonth()]} ${t.getUTCFullYear()}` }
const short = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : v >= 1 ? String(Math.round(v)) : v.toFixed(2))

/** live BTC price: the app's stream when it has one, else a small Binance stream of our own */
function useLiveBtc() {
  const q = usePrices((s) => s.quotes['BTC-USD'])
  const [own, setOwn] = useState(null)
  useEffect(() => {
    let ws, stop = false, timer
    const open = () => {
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@miniTicker')
        ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d?.c) setOwn({ price: Number(d.c), at: Date.now() }) }
        ws.onclose = () => { if (!stop) timer = setTimeout(open, 5000) }
      } catch { /* offline */ }
    }
    open()
    const vis = () => { if (document.visibilityState === 'hidden') { stop = true; ws?.close() } else if (stop) { stop = false; open() } }
    document.addEventListener('visibilitychange', vis)
    return () => { stop = true; clearTimeout(timer); ws?.close(); document.removeEventListener('visibilitychange', vis) }
  }, [])
  const price = own?.price || q?.price || null
  const fresh = Math.max(own?.at || 0, q?.liveAt || 0)
  return { price, live: Date.now() - fresh < 60000 }
}

export default function PowerLawCard() {
  const { price, live } = useLiveBtc()
  const fx = usePrices((s) => fxUSDTHB(s.quotes))
  const ccy = useStore((s) => s.ui.plCcy) || 'USD'
  const setUi = useStore((s) => s.setUi)
  const privacy = useStore((s) => s.ui.privacy)
  const { portfolio } = useVault()
  const [tab, setTab] = useState('log')
  const [hist, setHist] = useState(null)
  const [now, setNow] = useState(() => daysAt())
  const [hover, setHover] = useState(null)
  const svgRef = useRef(null)
  const boxRef = useRef(null)
  const [boxW, setBoxW] = useState(640)
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    const ro = new ResizeObserver(([e]) => setBoxW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { loadHistory().then(setHist).catch(() => setHist([])) }, [])
  useEffect(() => { const iv = setInterval(() => setNow(daysAt()), 1000); return () => clearInterval(iv) }, [])

  const k = ccy === 'THB' ? fx : 1
  const sym = ccy === 'THB' ? '฿' : '$'
  const M = (v, dec = 0) => `${sym}${(v * k).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
  const floor = floorAt(now), trend = trendAt(now)
  const p = price || (hist?.length ? hist[hist.length - 1][1] : null)
  const ratio = p ? p / floor : null
  const pct = ratio ? (ratio - 1) * 100 : null
  const lows = useMemo(() => (hist ? bearLows(hist) : []), [hist])
  const dearer = useMemo(() => (hist && ratio ? dearerShare(hist, ratio) : null), [hist, ratio && Math.round(ratio * 200)])
  const months = p && ratio > 1 ? (dayFloorReaches(p) - now) / 30.44 : 0

  // the user's own BTC: lots and average cost
  const btc = portfolio.holdings.find((h) => h.asset.symbol === 'BTC-USD' && h.qty > 0)
  const lots = btc ? btc.lots.filter((l) => l.open && l.price > 0).map((l) => ({ d: daysAt(Date.parse(l.txn.date + 'T12:00:00Z')), p: l.price })) : []
  // in THB the line sits at the baht actually paid per BTC, not the USD average at today's rate
  const avg = btc?.avgPrice ? (ccy === 'THB' && btc.qty > 0 ? btc.cost / btc.qty / fx : btc.avgPrice) : null

  // bar: price/floor on a log scale, from 0.6× to 3.6× the floor (trend = 2.38×)
  const barPos = ratio ? Math.max(0, Math.min(1, (Math.log(ratio) - Math.log(0.6)) / (Math.log(3.6) - Math.log(0.6)))) : 0
  const segAt = (r) => (Math.log(r) - Math.log(0.6)) / (Math.log(3.6) - Math.log(0.6))

  /* ---------- chart geometry ---------- */
  const W = Math.max(300, boxW || 640), H = W < 500 ? 280 : 360, X0 = 46, X1 = W - 12, Y0 = 12, Y1 = H - 26
  const chart = useMemo(() => {
    if (!hist) return null
    const log = tab === 'log'
    const today = now
    let sx, sy, ticksX, ticksY, d0, d1, inv
    if (log) {
      d0 = 560; d1 = today + 120
      const a = Math.log10(d0), b = Math.log10(d1)
      sx = (d) => X0 + ((Math.log10(d) - a) / (b - a)) * (X1 - X0)
      inv = (x) => Math.pow(10, a + ((x - X0) / (X1 - X0)) * (b - a))
      const lo = Math.log10(0.03 * k), hi = Math.log10(5e5 * k)
      sy = (v) => Y1 - ((Math.log10(v * k) - lo) / (hi - lo)) * (Y1 - Y0)
      ticksY = [0.1, 10, 1000, 1e5].map((v) => v / (k >= 10 ? 1 : 1))
      ticksX = [2011, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026]
    } else {
      d0 = today - 90; d1 = today + 5 * 365.25
      sx = (d) => X0 + ((d - d0) / (d1 - d0)) * (X1 - X0)
      inv = (x) => d0 + ((x - X0) / (X1 - X0)) * (d1 - d0)
      const top = trendAt(d1) * 1.06
      sy = (v) => Y1 - (v / top) * (Y1 - Y0)
      ticksY = [0.25, 0.5, 0.75, 1].map((f) => f * top)
      const y0 = dateOfDay(today).getUTCFullYear()
      ticksX = [1, 2, 3, 4, 5].map((i) => y0 + i)
    }
    const pathOf = (fn, from, to, n = 160) => {
      let s = ''
      for (let i = 0; i <= n; i++) {
        const d = log ? Math.pow(10, Math.log10(from) + (Math.log10(to) - Math.log10(from)) * (i / n)) : from + (to - from) * (i / n)
        s += `${i ? 'L' : 'M'}${sx(d).toFixed(1)} ${sy(fn(d)).toFixed(1)}`
      }
      return s
    }
    const pts = hist.filter((h) => h[0] >= d0 && h[0] <= today)
    const step = Math.max(1, Math.floor(pts.length / 1400))
    let price = ''
    pts.forEach((h, i) => { if (i % step === 0 || i === pts.length - 1) price += `${price ? 'L' : 'M'}${sx(h[0]).toFixed(1)} ${sy(h[1]).toFixed(1)}` })
    return {
      log, sx, sy, inv, d0, d1, pts,
      price,
      floor: pathOf(floorAt, d0, d1), trend: pathOf(trendAt, d0, d1),
      ticksX: ticksX.map((y) => ({ y, x: sx(daysAt(Date.UTC(y, 0, 1))) })).filter((t) => t.x >= X0 && t.x <= X1)
        .reduceRight((acc, t) => (acc.length && acc[0].x - t.x < 34 ? acc : [t, ...acc]), []),
      ticksY: ticksY.map((v) => ({ v, y: sy(v) })),
    }
  }, [hist, tab, k, Math.floor(now), W]) // eslint-disable-line

  const onMove = (e) => {
    if (!chart) return
    const r = svgRef.current.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    if (x < X0 || x > X1) { setHover(null); return }
    const d = chart.inv(x)
    let pt = null
    if (d <= now) {
      let lo = 0, hi = chart.pts.length - 1
      while (lo < hi) { const m = (lo + hi) >> 1; if (chart.pts[m][0] < d) lo = m + 1; else hi = m }
      pt = chart.pts[lo]
    }
    setHover({ x: chart.sx(pt ? pt[0] : d), d: pt ? pt[0] : d, p: pt ? (pt[0] >= Math.floor(now) && p ? p : pt[1]) : null })
  }

  const live5yFloor = floorAt(now + 5 * 365.25)
  const cardPct = pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`

  return (
    <section className="card p-4 md:p-5 space-y-4" data-testid="powerlaw">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-teal-700 flex items-center gap-1.5 px-font">BITCOIN POWER LAW
            <span className={`inline-flex items-center gap-1 ${live ? 'text-emerald-600' : 'text-slate-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />{live ? 'LIVE' : p ? 'ล่าสุด' : 'รอราคา'}</span>
          </div>
          <div className="text-lg font-bold">Floor ของวันนี้</div>
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold shrink-0" role="group" aria-label="สกุลเงิน">
          {['USD', 'THB'].map((c) => <button key={c} onClick={() => setUi({ plCcy: c })} className={`px-3 py-1.5 ${ccy === c ? 'bg-slate-900 text-white' : 'bg-white'}`}>{c}</button>)}
        </div>
      </div>

      <div className="grid md:grid-cols-[1.1fr_1fr] gap-4">
        <div>
          <div className="text-3xl md:text-4xl font-bold num tracking-tight" data-testid="pl-floor">{M(floor, 2)}</div>
          <div className="text-xs text-slate-500 mt-1">Floor = 0.42 × เส้น Trend ({M(trend)}) · ขยับขึ้นทุกวินาที เฉลี่ยราว 36% ต่อปี</div>
          <div className="text-xs text-slate-500 mt-1">อีก 5 ปี Floor จะอยู่ที่ประมาณ <b className="text-slate-700">{M(live5yFloor)}</b></div>
        </div>
        <div className="rounded-2xl bg-slate-900 text-slate-100 p-3.5">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-[11px] text-slate-400">ราคา BTC ตอนนี้</div>
              <div className="text-xl font-bold num">{p ? M(p) : '—'}</div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold num ${pct == null ? '' : pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} data-testid="pl-pct">{cardPct}</div>
              <div className="text-[11px] text-slate-400">{pct == null ? '' : pct >= 0 ? 'เหนือ Floor' : 'ต่ำกว่า Floor'}</div>
            </div>
          </div>
          <div className="relative mt-3 h-2.5 flex rounded-sm overflow-visible" aria-hidden="true">
            <span style={{ width: `${segAt(1) * 100}%` }} className="bg-rose-900" />
            <span style={{ width: `${(segAt(1.6) - segAt(1)) * 100}%` }} className="bg-emerald-500" />
            <span style={{ width: `${(segAt(2.38) - segAt(1.6)) * 100}%` }} className="bg-blue-600" />
            <span style={{ width: `${(segAt(2.8) - segAt(2.38)) * 100}%` }} className="bg-amber-600" />
            <span className="flex-1 bg-orange-500" />
            {ratio && <span className="absolute -top-1 w-4 h-4 rounded-full bg-white border-[3px] border-slate-900 -translate-x-1/2 transition-all" style={{ left: `${barPos * 100}%` }} />}
          </div>
          <div className="relative h-4 text-[10px] text-slate-400 mt-1">
            <span className="absolute -translate-x-1/2" style={{ left: `${segAt(1) * 100}%` }}>Floor</span>
            <span className="absolute -translate-x-1/2" style={{ left: `${segAt(2.38) * 100}%` }}>Trend</span>
          </div>
          <div className="text-xs mt-1 leading-snug">
            {ratio == null ? 'กำลังโหลดราคา…' : ratio >= 1
              ? <>Floor จะไล่ขึ้นมาถึงราคาวันนี้ในอีก <b>{months < 1 ? `${Math.max(1, Math.round(months * 4.35))} สัปดาห์` : `${months.toFixed(months < 10 ? 1 : 0)} เดือน`}</b></>
              : <>ราคาหลุด Floor อยู่ {Math.abs(pct).toFixed(1)}% — เกิดขึ้นได้น้อยครั้งในประวัติศาสตร์</>}
            {dearer != null && <> · <b>{Math.round(dearer * 100)}%</b> ของวันตั้งแต่ปี 2014 ราคาอยู่ห่าง Floor มากกว่าวันนี้</>}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold" role="tablist">
            <button onClick={() => setTab('log')} className={`px-3 py-1.5 ${tab === 'log' ? 'bg-slate-900 text-white' : 'bg-white'}`} data-testid="pl-tab-log">16 ปี (log)</button>
            <button onClick={() => setTab('future')} className={`px-3 py-1.5 ${tab === 'future' ? 'bg-slate-900 text-white' : 'bg-white'}`} data-testid="pl-tab-future">5 ปีข้างหน้า</button>
          </div>
          {hover && (
            <div className="text-[11px] text-right leading-tight num">
              <div className="font-semibold">{dLabel(hover.d)}</div>
              <div className="text-slate-500">{hover.p ? `ราคา ${M(hover.p)} · ` : ''}Floor {M(floorAt(hover.d))}{hover.p ? ` · ${((hover.p / floorAt(hover.d) - 1) * 100).toFixed(0)}%` : ''}</div>
            </div>
          )}
        </div>
        <div className="rounded-2xl overflow-hidden bg-[#0b1220]" ref={boxRef}>
          {!chart ? (
            <div className="h-56 grid place-items-center text-sm text-slate-400">กำลังโหลดราคาย้อนหลัง…</div>
          ) : (
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="กราฟราคา Bitcoin เทียบเส้น Floor และ Trend">
              {chart.ticksY.map((t) => (
                <g key={t.v}>
                  <line x1={X0} x2={X1} y1={t.y} y2={t.y} stroke="#1e293b" />
                  <text x={X0 - 6} y={t.y + 3} fill="#64748b" fontSize="10" textAnchor="end">{sym}{short(t.v * k)}</text>
                </g>
              ))}
              {chart.ticksX.map((t) => <text key={t.y} x={t.x} y={H - 8} fill="#64748b" fontSize="10" textAnchor="middle">{t.y}</text>)}
              {!chart.log && <line x1={chart.sx(now)} x2={chart.sx(now)} y1={Y0} y2={Y1} stroke="#334155" strokeDasharray="3 3" />}
              <path d={chart.trend} fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="5 4" />
              <path d={chart.floor} fill="none" stroke="#22c55e" strokeWidth="2.6" />
              <path d={chart.price} fill="none" stroke="#e2e8f0" strokeWidth="1.1" />
              {avg && <line x1={chart.log ? chart.sx(Math.max(chart.d0, (lots[0]?.d || now) - 500)) : X0} x2={X1} y1={chart.sy(avg)} y2={chart.sy(avg)} stroke="#f59e0b" strokeWidth="1.3" strokeDasharray="2 3" />}
              {chart.log && lows.map((l) => (
                <g key={l.d}>
                  <circle cx={chart.sx(l.d)} cy={chart.sy(l.p)} r="6" fill="none" stroke="#fff" strokeWidth="2" />
                  <text x={chart.sx(l.d)} y={chart.sy(l.p) + 20} fill="#e2e8f0" fontSize="10" textAnchor="middle" fontWeight="700">{dateOfDay(l.d).getUTCFullYear()}</text>
                  <text x={chart.sx(l.d)} y={chart.sy(l.p) + 31} fill={l.r >= 1 ? '#4ade80' : '#fb7185'} fontSize="9" textAnchor="middle">{l.r >= 1 ? '+' : ''}{((l.r - 1) * 100).toFixed(0)}%</text>
                </g>
              ))}
              {lots.filter((l) => l.d >= chart.d0).map((l, i) => <rect key={i} x={chart.sx(l.d) - 3} y={chart.sy(l.p) - 3} width="6" height="6" fill="#f59e0b" stroke="#0b1220" />)}
              {p && <><circle cx={chart.sx(now)} cy={chart.sy(p)} r="5" fill="#fb923c" stroke="#fff" strokeWidth="1.5" /><text x={chart.sx(now) - 8} y={chart.sy(p) - 10} fill="#fb923c" fontSize="10" textAnchor="end" fontWeight="700">ล่าสุด</text></>}
              {!chart.log && <text x={X1 - 4} y={chart.sy(floorAt(chart.d1)) - 8} fill="#4ade80" fontSize="11" textAnchor="end" fontWeight="700">Floor {M(floorAt(chart.d1))} · {dateOfDay(chart.d1).getUTCFullYear()}</text>}
              {hover && <line x1={hover.x} x2={hover.x} y1={Y0} y2={Y1} stroke="#f8fafc" strokeOpacity=".35" />}
            </svg>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] bg-emerald-500" />Floor</span>
          <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-slate-400" />Trend</span>
          {chart?.log && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border-2 border-slate-500" />จุดต่ำสุดตลาดหมี (เทียบ Floor)</span>}
          {lots.length > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-amber-500" />ไม้ที่คุณซื้อ</span>}
          {avg && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dotted border-amber-500" />ต้นทุนเฉลี่ยของคุณ {privacy ? '' : M(avg)}</span>}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 leading-snug">
        สูตร: Trend = 10<sup>−16.493</sup> × (วันนับจาก 3 ม.ค. 2009)<sup>5.688</sup>, Floor = 0.42 × Trend ตาม btcpowerlaw.nl · ราคาย้อนหลัง: MtGox/Bitstamp/Coinbase ถึง มิ.ย. 2022 และ Binance หลังจากนั้น · ราคาสด: Binance
        {ccy === 'THB' && <> · แปลงเป็นบาทด้วยเรทวันนี้ {fx.toFixed(2)}</>} · เป็นโมเดลสถิติจากอดีต ไม่ได้รับประกันอนาคต และไม่ใช่คำแนะนำการลงทุน
      </p>
    </section>
  )
}
