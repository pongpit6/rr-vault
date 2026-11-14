import { useEffect, useMemo, useState } from 'react'
import { usePrices, fxUSDTHB } from '../lib/prices'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { daysAt, trendAt, floorAt, dateOfDay, dayFloorReaches, loadHistory, bearLows, dearerShare, computeStats, zonesOf, ladderOf, floorEpisodes, FLOOR_K } from '../lib/powerlaw'
import PowerLawChart, { dLabel } from './PowerLawChart'

/** live BTC price: our own small Binance stream, falling back to the app's quotes */
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

const TABS = [['chart', 'กราฟ'], ['stats', 'หลุด Floor กี่ครั้ง'], ['ladder', 'ถูกหรือแพง?']]

export default function PowerLawCard() {
  const { price, live } = useLiveBtc()
  const fx = usePrices((s) => fxUSDTHB(s.quotes))
  const ccy = useStore((s) => s.ui.plCcy) || 'USD'
  const range = useStore((s) => s.ui.plRange) || 'all'
  const setUi = useStore((s) => s.setUi)
  const privacy = useStore((s) => s.ui.privacy)
  const { portfolio } = useVault()
  const [tab, setTab] = useState('chart')
  const [hist, setHist] = useState(null)
  const [now, setNow] = useState(() => daysAt())
  useEffect(() => { loadHistory().then(setHist).catch(() => setHist([])) }, [])
  useEffect(() => { const iv = setInterval(() => setNow(daysAt()), 1000); return () => clearInterval(iv) }, [])

  const k = ccy === 'THB' ? fx : 1
  const sym = ccy === 'THB' ? '฿' : '$'
  const M = (v, dec = 0) => `${sym}${(v * k).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
  const floor = floorAt(now), trend = trendAt(now)
  const p = price || (hist?.length ? hist[hist.length - 1][1] : null)
  const ratio = p ? p / floor : null
  const xTrend = p ? p / trend : null
  const pct = ratio ? (ratio - 1) * 100 : null

  const stats = useMemo(() => (hist?.length ? computeStats(hist) : null), [hist])
  const zones = useMemo(() => (stats ? zonesOf(stats) : []), [stats])
  const lows = useMemo(() => (hist ? bearLows(hist) : []), [hist])
  const dearer = useMemo(() => (hist && ratio ? dearerShare(hist, ratio) : null), [hist, ratio && Math.round(ratio * 400)])
  const zone = xTrend && zones.find((z) => xTrend >= z.from && xTrend < z.to)
  const daysToCatch = p && ratio > 1 ? dayFloorReaches(p) - now : 0

  // the bar: log scale of price ÷ trend from 0.3× to 4×
  const LO = Math.log(0.3), HI = Math.log(4)
  const pos = (x) => Math.max(0, Math.min(1, (Math.log(x) - LO) / (HI - LO)))

  // your BTC lots (plotted in the chosen currency: THB uses the baht you actually paid)
  const btc = portfolio.holdings.find((h) => h.asset.symbol === 'BTC-USD')
  const lots = (btc?.lots || []).filter((l) => l.price > 0 && l.qty > 0).map((l) => {
    const d = daysAt(Date.parse(`${l.txn.date}T12:00:00Z`))
    const paidPer = l.costTHB / l.qty
    return {
      d, usd: l.price, qty: l.qty, costTHB: l.costTHB,
      p: ccy === 'THB' ? paidPer / fx : l.price,
      atFloor: l.price / floorAt(d),
      pnl: p ? (p * fx * l.qty - l.costTHB) / l.costTHB : null,
    }
  }).sort((a, b) => a.d - b.d)
  const avg = btc?.qty > 0 && btc.avgPrice ? (ccy === 'THB' ? btc.cost / btc.qty / fx : btc.avgPrice) : null

  return (
    <section className="space-y-4" data-testid="powerlaw">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold tracking-[.14em] text-teal-700">BITCOIN POWER LAW</div>
          <h2 className="text-xl font-bold">Floor อยู่ตรงไหนวันนี้?</h2>
        </div>
        <div className="pl-seg" role="group" aria-label="สกุลเงิน">
          {['USD', 'THB'].map((c) => <button key={c} onClick={() => setUi({ plCcy: c })} className={ccy === c ? 'on' : ''}>{c}</button>)}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4">
        {/* floor headline */}
        <div className="pl-dark p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[.14em] text-slate-400">POWER-LAW FLOOR · LIVE</div>
            <div className="mt-1 flex items-start gap-1">
              <span className="text-[34px] md:text-[44px] leading-none font-extrabold tracking-tight text-white tabular-nums" data-testid="pl-floor">{M(floor, 2)}</span>
              <span className="text-sm font-bold text-emerald-400 tabular-nums" title="วินาที">{String(Math.floor((now % 1) * 86400) % 60).padStart(2, '0')}</span>
            </div>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">Floor = <b className="text-white">0.42×</b> ของเส้น Trend ({M(trend)}) ขยับขึ้นเองตลอดเวลา เฉลี่ยราว <b className="text-white">36% ต่อปี</b> หรือวันละ {M(floorAt(now + 1) - floor, 2)}</p>
          </div>
          {stats && (
            <div className="flex items-start gap-2 text-xs text-slate-300">
              <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
              <span>ตั้งแต่ปี 2016 ราคาปิดต่ำกว่า Floor แค่ <b className="text-white">{(stats.below2016Pct * 100).toFixed(1)}%</b> ของวัน นานสุด {stats.longest2016} วัน · ทั้งหมดตั้งแต่ 2010: {stats.belowDays} จาก {stats.total.toLocaleString()} วัน</span>
            </div>
          )}
        </div>

        {/* price card */}
        <div className="pl-dark p-5" data-testid="pl-price-card">
          <div className="text-[11px] font-semibold tracking-[.14em] text-slate-400 flex items-center gap-2">BITCOIN PRICE
            <span className={`flex items-center gap-1 ${live ? 'text-emerald-400' : 'text-slate-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />{live ? 'LIVE' : 'ล่าสุด'}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1 flex-wrap">
            <span className="text-3xl font-extrabold text-white tabular-nums">{p ? M(p) : '—'}</span>
            <span className="text-base font-bold tabular-nums" style={{ color: pct == null ? '#94a3b8' : pct >= 0 ? (zone?.id === 'hot' ? '#fb923c' : '#4ade80') : '#fb7185' }} data-testid="pl-pct">
              {pct == null ? '' : `${Math.abs(pct).toFixed(pct > -10 && pct < 10 ? 1 : 0)}% ${pct >= 0 ? 'เหนือ Floor' : 'ต่ำกว่า Floor'}`}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">ราคาสดจาก Binance{xTrend ? ` · ${xTrend.toFixed(2)}× Trend` : ''}</div>

          <div className="mt-5 relative">
            <div className="flex h-2.5 rounded-full overflow-hidden">
              {zones.map((z) => <span key={z.id} style={{ width: `${(pos(Math.min(4, z.to)) - pos(Math.max(0.3, z.from))) * 100}%`, background: z.color }} />)}
            </div>
            {xTrend && <span className="pl-knob" style={{ left: `${pos(xTrend) * 100}%`, '--ring': zone?.color || '#fff' }} role="img" aria-label={`ราคาอยู่โซน ${zone?.name || ''}`} />}
            <div className="relative h-5 mt-1.5 text-[11px] text-slate-400">
              <span className="absolute -translate-x-1/2" style={{ left: `${pos(FLOOR_K) * 100}%` }}>Floor</span>
              <span className="absolute -translate-x-1/2" style={{ left: `${pos(1) * 100}%` }}>Trend</span>
            </div>
          </div>
          {zone && <div className="text-xs mt-1" data-testid="pl-zone"><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ background: zone.color }} /><span className="text-slate-300">โซนตอนนี้: <b className="text-white">{zone.name}</b></span></div>}
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            {dearer != null && <><b className="text-white">{Math.round(dearer * 100)}%</b> ของวันตั้งแต่ปี 2014 แพงกว่าวันนี้ (เทียบกับ Floor) </>}
            {ratio == null ? '' : ratio >= 1
              ? <>· Floor จะขึ้นมาถึงราคาวันนี้ใน <b className="text-white">{daysToCatch < 60 ? `${Math.max(1, Math.round(daysToCatch))} วัน` : `${(daysToCatch / 30.44).toFixed(daysToCatch < 300 ? 1 : 0)} เดือน`}</b></>
              : <>· ราคาอยู่ใต้ Floor — เกิดขึ้นแค่ราว {stats ? ((stats.belowDays / stats.total) * 100).toFixed(1) : '4'}% ของวันในประวัติศาสตร์</>}
          </p>
        </div>
      </div>

      <div className="card p-3 md:p-5">
        <div className="pl-seg mb-3" role="tablist">
          {TABS.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={tab === id ? 'on' : ''} data-testid={`pl-tab-${id}`}>{label}</button>)}
        </div>
        {tab === 'chart' && (
          <div className="pl-dark p-2.5 md:p-4">
            <PowerLawChart hist={hist} now={now} price={p} k={k} sym={sym} lows={lows} lots={lots} avg={avg} range={range} setRange={(r) => setUi({ plRange: r })} privacy={privacy} />
          </div>
        )}
        {tab === 'ladder' && <Ladder hist={hist} now={now} xTrend={xTrend} p={p} M={M} stats={stats} zones={zones} />}
        {tab === 'stats' && <FloorStats now={now} p={p} M={M} k={k} sym={sym} stats={stats} hist={hist} />}

        {lots.length > 0 && tab === 'chart' && (
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">ไม้ของฉันเทียบ Floor</div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[420px]">
                <thead><tr className="text-[11px] text-slate-500 text-left"><th className="font-medium px-1 pb-1.5">วันที่ซื้อ</th><th className="font-medium px-1 pb-1.5 text-right">ราคา</th><th className="font-medium px-1 pb-1.5 text-right">ตอนซื้อเทียบ Floor</th><th className="font-medium px-1 pb-1.5 text-right">ตอนนี้</th></tr></thead>
                <tbody>
                  {lots.map((l, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-1 py-2">{dLabel(l.d)}</td>
                      <td className="px-1 py-2 text-right tabular-nums">{M(l.p)}</td>
                      <td className="px-1 py-2 text-right"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${l.atFloor < 1.15 ? 'bg-emerald-50 text-emerald-700' : l.atFloor < 1.6 ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>{l.atFloor >= 1 ? '+' : '−'}{Math.abs((l.atFloor - 1) * 100).toFixed(0)}%</span></td>
                      <td className={`px-1 py-2 text-right tabular-nums font-semibold ${l.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{l.pnl == null ? '—' : `${l.pnl >= 0 ? '+' : ''}${(l.pnl * 100).toFixed(1)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5">ยิ่ง % ตอนซื้อใกล้ 0 = ซื้อใกล้ Floor (ถูกตามโมเดล) · กด “ช่วงที่ฉันซื้อ” เพื่อซูมไปดูไม้บนกราฟ</div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-snug px-1">
        สูตรตาม btcpowerlaw.nl: Trend = 10<sup>−16.493</sup> × (วันนับจาก 3 ม.ค. 2009)<sup>5.688</sup>, Floor = 0.42 × Trend · ราคาย้อนหลัง MtGox/Bitstamp/Coinbase ถึง มิ.ย. 2022 และ Binance หลังจากนั้น
        {ccy === 'THB' && <> · แปลงเป็นบาทด้วยเรทวันนี้ {fx.toFixed(2)}</>} · เป็นโมเดลสถิติจากอดีต ไม่ได้รับประกันอนาคต และไม่ใช่คำแนะนำการลงทุน
      </p>
    </section>
  )
}

/* ---------- ladder: is today cheap or expensive compared with every day in history? ---------- */
function Ladder({ hist, now, xTrend, p, M, stats, zones }) {
  const bins = useMemo(() => (hist ? ladderOf(hist) : []), [hist])
  if (!hist || !stats || !xTrend) return <div className="text-sm text-slate-500 py-6 text-center">กำลังโหลด…</div>
  const total = bins.reduce((s, b) => s + b.n, 0)
  const max = Math.max(...bins.map((b) => b.n))
  const tr = trendAt(now)
  const cheaper = stats.shareCheaper(xTrend)
  const zoneOf = (x) => zones.find((z) => x >= z.from && x < z.to) || zones[zones.length - 1]
  const K = (v) => { const x = v * (M(1).startsWith('฿') ? Number(M(1e6).replace(/[^0-9.]/g, '')) / 1e6 : 1); return x >= 1e6 ? `${+(x / 1e6).toFixed(2)}M` : `${Math.round(x / 1e3)}k` }
  const sym = M(0).replace(/[0-9.,]/g, '')
  const range = (b) => (b.from === 0 ? `ต่ำกว่า ${sym}${K(b.to * tr)}` : b.to === Infinity ? `${sym}${K(b.from * tr)} ขึ้นไป` : `${sym}${K(b.from * tr)} – ${K(b.to * tr)}`)
  return (
    <div className="space-y-3" data-testid="pl-ladder">
      <div className="pl-dark p-4">
        <div className="text-[11px] font-semibold tracking-[.14em] text-slate-400">ราคาวันนี้ถูกหรือแพง?</div>
        <div className="text-white text-lg font-bold mt-1 leading-snug">
          มีแค่ <span className="text-emerald-400">{Math.round(cheaper * 100)}%</span> ของวันในประวัติศาสตร์ ที่ BTC ถูกกว่าวันนี้
        </div>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          เทียบทุกวันตั้งแต่ปี 2010 ({stats.total.toLocaleString()} วัน) แบบยุติธรรม: ไม่ได้ดูราคาดิบ แต่ดูว่าวันนั้นราคาอยู่ห่างเส้น Trend ของตัวเองแค่ไหน แล้วแปลงเป็น “ราคาที่เทียบเท่าในวันนี้”
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_52px] gap-2 px-3 py-2 bg-slate-50 text-[11px] font-semibold text-slate-500">
          <span>ถ้าวันนี้ราคาอยู่ช่วง…</span><span>เคยแพงระดับนี้กี่วัน</span><span className="text-right">% วัน</span>
        </div>
        {[...bins].reverse().map((b, i) => {
          const here = xTrend >= b.from && xTrend < b.to
          const z = zoneOf(b.from === 0 ? b.to * 0.9 : b.to === Infinity ? b.from * 1.1 : Math.sqrt(b.from * b.to))
          const floorRow = Math.abs(b.from - FLOOR_K) < 1e-3
          const trendRow = Math.abs(b.from - 1) < 1e-3
          return (
            <div key={i} className={`grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_52px] gap-2 items-center px-3 py-1.5 border-t border-slate-100 text-xs ${here ? 'bg-amber-50' : ''}`}>
              <div className="min-w-0">
                <div className="tabular-nums font-medium truncate">{range(b)}</div>
                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: z.color }} />{floorRow ? 'เริ่มที่ Floor' : trendRow ? 'เริ่มที่ Trend' : z.name}</div>
              </div>
              <div className="relative h-5 flex items-center">
                <div className="h-3.5 rounded-sm" style={{ width: `${Math.max(2, (b.n / max) * 100)}%`, background: z.color, opacity: here ? 1 : 0.45 }} />
                {here && <span className="ml-2 shrink-0 text-[11px] font-bold text-amber-700 whitespace-nowrap">◀ วันนี้ {M(p)}</span>}
              </div>
              <div className="text-right tabular-nums text-slate-600">{((b.n / total) * 100).toFixed(1)}%<div className="text-[10px] text-slate-400">{b.n} วัน</div></div>
            </div>
          )
        })}
      </div>
      <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-3">
        <b>อ่านยังไง:</b> แต่ละแถวคือช่วงราคา “ถ้าเป็นวันนี้” แท่งยิ่งยาว = ในอดีตราคาอยู่ระดับนี้บ่อย
        เช่น ครึ่งหนึ่งของทุกวันอยู่ต่ำกว่า {M(stats.q50 * tr)} ({stats.q50.toFixed(2)}× Trend) และมีแค่ 10% ที่ต่ำกว่า {M(stats.q10 * tr)}
        ส่วน 10% ที่แพงที่สุดสูงกว่า {M(stats.q90 * tr)} · ช่วงราคาจะขยับขึ้นทุกวันตามเส้น Trend
      </div>
    </div>
  )
}

/* ---------- floor stats + "when does the floor reach my number" ---------- */
function FloorStats({ now, p, M, k, sym, stats, hist }) {
  const [target, setTarget] = useState('')
  const eps = useMemo(() => (hist && stats ? floorEpisodes(hist, stats.runs) : []), [hist, stats])
  const firstYear = hist?.length ? dateOfDay(hist[0][0]).getUTCFullYear() : 2010
  const lastYear = dateOfDay(now).getUTCFullYear()
  const t = Number(String(target).replace(/[^0-9.]/g, '')) / k
  const when = t > floorAt(now) ? dayFloorReaches(t) : null
  const rows = [1, 2, 5, 10, 20].map((y) => { const d = now + y * 365.25; return { y, v: floorAt(d), g: Math.pow(floorAt(d) / floorAt(now), 1 / y) - 1 } })
  return (
    <div className="space-y-3" data-testid="pl-stats">
      {stats && (
        <div className="pl-dark p-4" data-testid="pl-below">
          <div className="text-[11px] font-semibold tracking-[.14em] text-slate-400">BTC เคยต่ำกว่า FLOOR กี่ครั้ง?</div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2 mt-2">
            <div><div className="text-4xl font-extrabold text-white tabular-nums">{eps.length}</div><div className="text-xs text-slate-400">ช่วงที่หลุด Floor</div></div>
            <div><div className="text-2xl font-bold text-white tabular-nums">{stats.belowVisits}</div><div className="text-xs text-slate-400">ครั้ง (นับทุกครั้งที่ปิดใต้แล้วกลับขึ้น)</div></div>
            <div><div className="text-2xl font-bold text-white tabular-nums">{stats.belowDays}</div><div className="text-xs text-slate-400">วัน จาก {stats.total.toLocaleString()} ({((stats.belowDays / stats.total) * 100).toFixed(1)}%)</div></div>
          </div>
          {/* timeline */}
          <div className="relative h-8 mt-4">
            <div className="absolute inset-x-0 top-3.5 h-1 rounded-full bg-slate-700" />
            {eps.map((e, i) => (
              <span key={i} className="absolute top-1.5 w-2.5 h-5 rounded-sm bg-rose-500 shadow-[0_0_8px_#f43f5e] -translate-x-1/2"
                style={{ left: `${((e.from - hist[0][0]) / (now - hist[0][0])) * 100}%` }} title={dLabel(e.from)} />
            ))}
            <span className="absolute right-0 top-0.5 w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_8px_#fb923c] translate-x-1/2 mt-1.5" title="วันนี้" />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500"><span>{firstYear}</span><span>{Math.round((firstYear + lastYear) / 2)}</span><span>วันนี้</span></div>
          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            ส่วนใหญ่เกิดช่วงปีแรก ๆ ที่ตลาดยังเล็ก · ตั้งแต่ปี 2016 ปิดใต้ Floor แค่ <b className="text-white">{(stats.below2016Pct * 100).toFixed(1)}%</b> ของวัน นานสุด {stats.longest2016} วัน
            {stats.deepest && <> · ลึกสุดคือ {dLabel(stats.deepest.lowD)} ต่ำกว่า Floor {Math.round((1 - stats.deepest.low) * 100)}%</>} · ทุกครั้งราคากลับขึ้นมาเหนือ Floor ได้
          </p>
        </div>
      )}
      {eps.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-slate-500 text-left bg-slate-50"><th className="font-medium px-3 py-2">ช่วงที่หลุด</th><th className="font-medium px-2 py-2 text-right">ปิดใต้ (วัน)</th><th className="font-medium px-2 py-2 text-right">ลึกสุด</th><th className="font-medium px-2 py-2 text-right hidden sm:table-cell">ราคาต่ำสุด</th><th className="font-medium px-3 py-2 text-right">ราคา 1 ปีหลังจุดต่ำสุด</th></tr></thead>
            <tbody>
              {[...eps].reverse().map((e, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2 leading-tight">{dLabel(e.from)}{e.to > e.from ? <div className="text-[11px] text-slate-400">ถึง {dLabel(e.to)}</div> : ''}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{e.days}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-rose-600 font-semibold">−{Math.max(1, Math.round((1 - e.low) * 100))}%</td>
                  <td className="px-2 py-2 text-right tabular-nums hidden sm:table-cell">{M(e.lowP, e.lowP * k < 10 ? 2 : 0)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${e.after1y == null ? 'text-slate-400' : e.after1y >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{e.after1y == null ? 'ยังไม่ครบปี' : `${e.after1y >= 0 ? '+' : ''}${Math.round(e.after1y * 100).toLocaleString()}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="pl-stat light"><div>{p ? (p / floorAt(now)).toFixed(2) : '—'}×</div><span>ราคา ÷ Floor</span></div>
        <div className="pl-stat light"><div>+{M(floorAt(now + 1) - floorAt(now), 2)}</div><span>Floor ขึ้นต่อวัน</span></div>
        <div className="pl-stat light"><div>{stats ? `${((stats.belowDays / stats.total) * 100).toFixed(1)}%` : '—'}</div><span>วันที่ปิดใต้ Floor (ตั้งแต่ 2010)</span></div>
        <div className="pl-stat light"><div>{stats ? `${stats.longest} วัน` : '—'}</div><span>อยู่ใต้ Floor นานสุด ({stats?.belowVisits || 0} ครั้ง)</span></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-[11px] text-slate-500 text-left"><th className="font-medium pb-1.5">อีก</th><th className="font-medium pb-1.5 text-right">Floor</th><th className="font-medium pb-1.5 text-right">โตเฉลี่ยต่อปี</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.y} className="border-t border-slate-100"><td className="py-2">{r.y} ปี ({dateOfDay(now + r.y * 365.25).getUTCFullYear()})</td><td className="py-2 text-right font-semibold tabular-nums">{M(r.v)}</td><td className="py-2 text-right tabular-nums text-emerald-600">{(r.g * 100).toFixed(1)}%</td></tr>)}</tbody>
        </table>
      </div>
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
        <label htmlFor="pl-target" className="text-sm font-semibold">Floor จะขึ้นไปถึงราคาที่ฉันตั้งเมื่อไหร่?</label>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-slate-500">{sym}</span>
          <input id="pl-target" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={sym === '$' ? 'เช่น 150000' : 'เช่น 5000000'} className="field !py-2" data-testid="pl-target" />
        </div>
        <div className="text-sm mt-2" data-testid="pl-when">
          {!target ? <span className="text-slate-500">ใส่ราคาที่สูงกว่า Floor ตอนนี้ ({M(floorAt(now))})</span>
            : when ? <>ประมาณ <b>{dLabel(when)}</b> (อีก {((when - now) / 365.25).toFixed(1)} ปี) — หลังจากนั้นตามโมเดล ราคาไม่ควรต่ำกว่านี้อีก</>
            : <span className="text-slate-500">ราคานี้ต่ำกว่า Floor ตอนนี้แล้ว</span>}
        </div>
      </div>
    </div>
  )
}
