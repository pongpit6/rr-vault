import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Star, RefreshCw, ChevronRight, X, Radio, Plus } from 'lucide-react'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { Sheet, Button } from '../components/ui'
import { AssetLogo } from '../components/Logos'
import FuelCard from '../components/FuelCard'
import { useSyncedPref, unionBySymbol } from '../lib/prefs'
import { CATS, CAT_BY_ID, catOf, WATCH_MAX, itemFor, itemCcy, useMarket, loadSpark, loadChart, searchMarket, streamMarketCrypto, stopMarketStream, loadOil } from '../lib/market'
import { ccyMark, ccyOfSymbol, fetchQuotes, fxSym } from '../lib/prices'
import { GOLD_PRESETS, COMMODITY_PRESETS } from '../lib/portfolio'
import { sfx } from '../lib/sfx'

/* ---------- formatting ---------- */
export const fmtP = (v) => {
  if (v == null || !isFinite(v)) return '—'
  const a = Math.abs(v)
  return v.toLocaleString('en-US', a >= 1000 ? { maximumFractionDigits: 2, minimumFractionDigits: 2 } : a >= 1 ? { maximumFractionDigits: 2, minimumFractionDigits: 2 } : { maximumSignificantDigits: 4 })
}
const pctTxt = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)
const priceTxt = (it, q) => {
  if (!q?.price) return '—'
  const per = it.per || 1
  const c = itemCcy(it, q)
  return `${it.kind === 'index' ? '' : ccyMark(c)}${fmtP(q.price * per)}`
}

/* ---------- small pieces ---------- */
function Spark({ c, up, w = 72, h = 26 }) {
  if (!c || c.length < 3) return <div style={{ width: w, height: h }} className="grid place-items-center text-[9px] text-slate-300">—</div>
  const lo = Math.min(...c), hi = Math.max(...c), rg = hi - lo || 1
  const pts = c.map((v, i) => `${((i / (c.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - lo) / rg) * (h - 4)).toFixed(1)}`).join(' ')
  const col = up ? '#10b981' : '#f43f5e'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={col} opacity=".1" />
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function Badge({ it, size = 38 }) {
  if (it.kind === 'fx') return <div className="shrink-0 grid place-items-center rounded-2xl bg-white border border-slate-200" style={{ width: size, height: size, fontSize: size * 0.5 }}>{it.flag || '💱'}</div>
  if (it.kind === 'index') {
    const flag = /\.BK$/.test(it.symbol) ? '🇹🇭' : /HSI|\.SS|\.SZ/.test(it.symbol) ? '🇨🇳' : '🇺🇸'
    return <div className="shrink-0 grid place-items-center rounded-2xl bg-slate-900/[.04] border border-slate-200 font-bold text-slate-600" style={{ width: size, height: size, fontSize: size * 0.42 }}>{flag}</div>
  }
  const asset = it.kind === 'fund' ? { type: 'fund', code: it.code || it.name } : { type: it.kind === 'crypto' ? 'crypto' : it.kind === 'stock' ? 'stock' : it.kind === 'gold' ? 'gold' : 'commodity', symbol: it.symbol, item: it.item }
  return <AssetLogo asset={asset} size={size} />
}

function Row({ it, q, starred, held, onStar, onOpen }) {
  const up = (q?.changePct ?? 0) >= 0
  const named = ['index', 'gold', 'commodity'].includes(it.kind) && KNOWN_NAME(it)
  const label = named ? it.name : it.kind === 'crypto' ? it.symbol.replace('-USD', '') : it.kind === 'fund' ? it.code || it.name : it.kind === 'fx' ? `${it.ccy}/THB` : it.symbol.replace(/\.BK$/, '')
  const sub = named ? (it.symbol === 'TH-GOLD' ? 'ต่อบาททองคำ · ประมาณ' : `${it.symbol.replace(/^\^/, '')}${it.unit ? ` · ต่อ${it.unit}` : ''}`) : it.name
  return (
    <div onClick={onOpen} className="mkt-row flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-900/[.025] cursor-pointer">
      <Badge it={it} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm truncate">{label}</span>
          {q?.live && <Radio size={11} className="text-emerald-500 shrink-0" />}
          {held && <span className="text-[9.5px] px-1.5 rounded bg-sky-100 text-sky-700 font-semibold shrink-0">ถืออยู่</span>}
        </div>
        <div className="text-[11px] text-slate-500 truncate">{sub}</div>
      </div>
      <div className="hidden min-[380px]:block"><Spark c={q?.c} up={up} /></div>
      <div className="text-right min-w-[84px]">
        <div className="font-semibold num text-sm">{priceTxt(it, q)}</div>
        <div className={`text-[11px] num font-semibold ${q?.changePct == null ? 'text-slate-400' : up ? 'text-emerald-600' : 'text-rose'}`}>{pctTxt(q?.changePct)}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onStar() }} className="p-1 -mr-1" aria-label={starred ? 'เลิกติดตาม' : 'ติดตาม'}>
        <Star size={16} className={starred ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      </button>
    </div>
  )
}

/* ---------- screen ---------- */
export default function Market({ onTrade }) {
  const { assets } = useVault()
  const q = useMarket((s) => s.q)
  const at = useMarket((s) => s.at)
  const loading = useMarket((s) => s.loading.spark)
  const [watchPref, setWatch] = useSyncedPref('pref-market-watch', 'marketWatch', { merge: unionBySymbol })
  const watch = watchPref || []
  const [cat, setCat] = useState(() => { try { return sessionStorage.getItem('vault:mktCat') || 'all' } catch { return 'all' } })
  const [detail, setDetail] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => { try { sessionStorage.setItem('vault:mktCat', cat) } catch { /* */ } }, [cat])

  const heldFunds = useMemo(() => assets.filter((a) => a.symbol?.startsWith('FUND:')).map((a) => itemFor(a.symbol, { name: a.name, code: a.code })), [assets])
  const heldSyms = useMemo(() => new Set(assets.map((a) => (a.source === 'thaigold' ? 'TH-GOLD' : a.symbol)).filter(Boolean)), [assets])
  const watchItems = watch.map((w) => itemFor(w.symbol, w))
  const isWatched = (s) => watch.some((w) => w.symbol === s)
  const toggleWatch = (it) => {
    sfx('click')
    setWatch(isWatched(it.symbol) ? watch.filter((w) => w.symbol !== it.symbol) : [...watch, { symbol: it.symbol, name: it.name, code: it.code }])
  }
  const watchIn = (id) => watchItems.filter((w) => catOf(w) === id)
  // full list for a category tab: watched first, then the rest of the catalog
  const catItems = (id) => {
    if (id === 'watch') return watchItems
    if (id === 'other') return watchIn('other')
    const w = watchIn(id)
    const base = id === 'fund' ? heldFunds : CAT_BY_ID[id]?.items || []
    return [...w, ...base.filter((b) => !w.some((x) => x.symbol === b.symbol))]
  }
  // overview card: your stars in this category (max 6); none starred → catalog defaults (3)
  const overviewItems = (id) => {
    const w = watchIn(id)
    if (w.length) return { list: w.slice(0, WATCH_MAX), extra: Math.max(0, w.length - WATCH_MAX), mine: true }
    if (id === 'fund') return { list: heldFunds.slice(0, WATCH_MAX), extra: Math.max(0, heldFunds.length - WATCH_MAX), mine: false }
    return { list: (CAT_BY_ID[id]?.items || []).slice(0, 3), extra: 0, mine: false }
  }
  const overviewCats = [...CATS, ...(watchIn('other').length ? [{ id: 'other', label: 'ตลาดอื่น', emoji: '🌐' }] : [])]

  // which symbols are on screen → load them, refresh every minute, stream crypto live
  const visible = useMemo(() => {
    if (cat === 'fuel') return []
    if (cat === 'all') return overviewCats.flatMap((c) => overviewItems(c.id).list).map((i) => i.symbol)
    return catItems(cat).map((i) => i.symbol)
  }, [cat, watch.map((w) => w.symbol).join(','), heldFunds.length]) // eslint-disable-line
  useEffect(() => {
    if (!visible.length) return
    loadSpark(visible)
    const iv = setInterval(() => document.visibilityState === 'visible' && loadSpark(visible), 60_000)
    return () => clearInterval(iv)
  }, [visible.join(',')]) // eslint-disable-line
  useEffect(() => {
    streamMarketCrypto([...CAT_BY_ID.crypto.items.map((i) => i.symbol), ...watch.map((w) => w.symbol)])
    return () => stopMarketStream()
  }, [watch.length])
  useEffect(() => { loadOil() }, [])

  // search
  useEffect(() => {
    const s = query.trim()
    if (s.length < 2) { setResults(null); return }
    let alive = true
    const t = setTimeout(async () => { const r = await searchMarket(s); if (alive) setResults(r) }, 350)
    return () => { alive = false; clearTimeout(t) }
  }, [query])

  const open = (it) => { sfx('click'); setDetail(it) }
  const rowProps = (it) => ({ it, q: q[it.symbol], starred: isWatched(it.symbol), held: heldSyms.has(it.symbol), onStar: () => toggleWatch(it), onOpen: () => open(it) })
  const tabs = [{ id: 'all', label: 'ภาพรวม', emoji: '🗺️' }, ...(watch.length ? [{ id: 'watch', label: `ติดตาม ${watch.length}`, emoji: '⭐' }] : []), { id: 'fuel', label: 'น้ำมันไทย', emoji: '⛽' }, ...CATS]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">ตลาด</h1>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {at && <span className="hidden sm:inline">อัปเดต {new Date(at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>}
          <button onClick={() => { loadSpark(visible); if (cat === 'fuel' || cat === 'all') loadOil(true) }} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label="อัปเดตราคา">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* search */}
      <div className="relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="field !pl-10 !pr-10" placeholder="ค้นหา หุ้น คริปโต กองทุน ETF… เช่น BABA, SCB, PTTEP" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="ค้นหาสินทรัพย์" />
        {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400" aria-label="ล้าง"><X size={16} /></button>}
      </div>
      {results && (
        <section className="card p-2">
          {results.length === 0 && <div className="p-4 text-sm text-slate-500 text-center">ไม่พบ “{query}”</div>}
          {results.map((r) => {
            const it = itemFor(r.symbol, { name: r.name, code: r.code, exchange: r.exchange })
            return (
              <div key={r.symbol} onClick={() => open(it)} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-900/[.03] cursor-pointer">
                <Badge it={it} size={34} />
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{r.code || r.symbol}</div><div className="text-[11px] text-slate-500 truncate">{r.name} · {r.exchange}</div></div>
                <button onClick={(e) => { e.stopPropagation(); toggleWatch(it) }} className="p-1" aria-label="ติดตาม"><Star size={16} className={isWatched(it.symbol) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} /></button>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            )
          })}
        </section>
      )}

      {/* category chips */}
      <div className="mkt-chips -mx-4 px-4 md:mx-0 md:px-0 flex gap-1.5 overflow-x-auto no-scrollbar pb-1 md:flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setCat(t.id)} className={`ui-chip shrink-0 px-3 py-1.5 rounded-xl text-sm border transition ${cat === t.id ? 'ui-on bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <span className="mr-1">{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      {cat === 'fuel' ? <FuelCard /> : cat === 'all' ? (
        <div className="space-y-4">
          <FuelCard compact onOpen={() => setCat('fuel')} />
          <div className="mkt-masonry">
            {overviewCats.map((c) => {
              const { list, extra, mine } = overviewItems(c.id)
              const head = <>{c.emoji} {c.label}{mine && <span className="ml-1.5 text-[10px] font-medium text-amber-500 align-middle">⭐ {watchIn(c.id).length}</span>}</>
              if (c.id === 'fund' && !list.length) return (
                <Section key={c.id} title={head}>
                  <div className="px-2 py-3 text-xs text-slate-500">ค้นหาชื่อกองทุนด้านบน (เช่น K-USA, SCBSET) แล้วกด ⭐ เพื่อติดตาม · กองทุนที่คุณถือจะขึ้นที่นี่อัตโนมัติ</div>
                </Section>
              )
              return (
                <Section key={c.id} title={head} onMore={() => setCat(c.id === 'other' ? 'watch' : c.id)} more moreLabel={extra ? `ดูทั้งหมด (+${extra})` : 'ดูทั้งหมด'}>
                  {list.map((it) => <Row key={it.symbol} {...rowProps(it)} />)}
                  {!mine && c.id !== 'fund' && <div className="px-2 pt-1 pb-0.5 text-[10px] text-slate-400">กด ☆ เพื่อเลือกตัวที่อยากเห็นในกรอบนี้ (สูงสุด {WATCH_MAX})</div>}
                </Section>
              )
            })}
          </div>
        </div>
      ) : (
        cat === 'watch' ? (
          <div className="mkt-masonry">
            {overviewCats.filter((c) => watchIn(c.id).length).map((c) => (
              <Section key={c.id} title={<>{c.emoji} {c.label} <span className="text-[10px] text-slate-400 font-normal">{watchIn(c.id).length}</span></>}>
                {watchIn(c.id).map((it) => <Row key={it.symbol} {...rowProps(it)} />)}
              </Section>
            ))}
          </div>
        ) : <section className="card p-2 md:p-3">
          {catItems(cat).map((it) => <Row key={it.symbol} {...rowProps(it)} />)}
          {cat === 'fund' && <div className="px-2 py-3 text-xs text-slate-500">ค้นหากองทุนอื่นได้จากช่องค้นหาด้านบน แล้วกด ⭐ เพื่อเพิ่มเข้ามาที่นี่</div>}
          {cat === 'gold' && <div className="px-2 pt-2 pb-1 text-[11px] text-slate-500">ทองไทยคำนวณจาก Gold Spot × USD/THB × 96.5% (ใกล้เคียงราคาสมาคมฯ แต่ไม่ใช่ราคาประกาศ)</div>}
          {cat === 'cn' && <div className="px-2 pt-2 pb-1 text-[11px] text-slate-500">หุ้นฮ่องกงเป็น HKD · หุ้นจีนแผ่นดินใหญ่ (.SS/.SZ) เป็น CNY · ราคาอาจดีเลย์ ~15 นาที</div>}
        </section>
      )}

      <div className="text-[11px] text-slate-500 px-1 flex items-center gap-1.5">
        <Radio size={12} className="text-emerald-500" /> คริปโต Realtime จาก Binance · หุ้น/ดัชนี/ค่าเงินจาก Yahoo Finance (อาจดีเลย์ ~15 นาที) · น้ำมันจากบางจาก/PTT OR
      </div>

      <DetailSheet it={detail} onClose={() => setDetail(null)} starred={detail && isWatched(detail.symbol)} onStar={() => detail && toggleWatch(detail)} assets={assets} onTrade={onTrade} />
    </div>
  )
}

function Section({ title, children, onMore, more, moreLabel = 'ดูทั้งหมด' }) {
  return (
    <section className="card p-2 md:p-3 break-inside-avoid">
      <div className="flex items-center justify-between px-2 pt-1 pb-1">
        <div className="font-semibold text-sm">{title}</div>
        {more && onMore && <button onClick={onMore} className="ui-link text-xs flex items-center">{moreLabel} <ChevronRight size={14} /></button>}
      </div>
      {children}
    </section>
  )
}

/* ---------- detail ---------- */
const RANGES = [['1d', '1 วัน'], ['5d', '5 วัน'], ['1mo', '1 เดือน'], ['6mo', '6 เดือน'], ['1y', '1 ปี'], ['5y', '5 ปี']]

function draftAsset(it, q) {
  if (it.symbol === 'TH-GOLD') return { type: 'gold', ...GOLD_PRESETS[0] }
  if (it.symbol === 'GC=F') return { type: 'gold', ...GOLD_PRESETS[1] }
  const com = COMMODITY_PRESETS.find((p) => p.symbol === it.symbol)
  if (com) return { type: 'commodity', ...com }
  if (it.kind === 'fund') return { type: 'fund', symbol: it.symbol, code: it.code, name: it.name, source: 'yahoo', currency: 'THB', unit: 'หน่วย', exchange: 'กองทุนรวมไทย' }
  if (it.kind === 'crypto') return { type: 'crypto', symbol: it.symbol, name: it.name, source: 'yahoo', currency: 'USD', unit: it.symbol.replace('-USD', '') }
  return { type: 'stock', symbol: it.symbol, name: q?.name || it.name, source: 'yahoo', currency: q?.currency || ccyOfSymbol(it.symbol), unit: 'หุ้น', exchange: q?.exchange || it.exchange }
}

function DetailSheet({ it, onClose, starred, onStar, assets, onTrade }) {
  const live = useMarket((s) => (it ? s.q[it.symbol] : null))
  const [range, setRange] = useState('1mo')
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (it) setRange(it.kind === 'fund' ? '1y' : '1mo') }, [it?.symbol]) // eslint-disable-line
  useEffect(() => {
    if (!it || it.kind === 'fund') { setD(null); return }
    let alive = true
    setBusy(true)
    loadChart(it.symbol, range).then((r) => { if (alive) { setD(r); setBusy(false) } })
    return () => { alive = false }
  }, [it?.symbol, range]) // eslint-disable-line
  if (!it) return null
  const q = { ...(d || {}), ...(live || {}) }
  if (live?.live) Object.assign(q, { price: live.price, changePct: live.changePct })
  const up = (q.changePct ?? 0) >= 0
  const c = itemCcy(it, q), m = it.kind === 'index' ? '' : ccyMark(c), per = it.per || 1
  const series = d?.c || []
  const rangeChg = series.length > 1 ? (q.price / series[0] - 1) * 100 : null
  const existing = assets.find((a) => (it.symbol === 'TH-GOLD' ? a.source === 'thaigold' : a.symbol === it.symbol))
  const canBuy = !['index', 'fx'].includes(it.kind)
  const buy = async () => {
    const asset = existing || draftAsset(it, q)
    await fetchQuotes([asset.symbol, 'THB=X', fxSym(asset.currency), asset.source === 'thaigold' ? 'GC=F' : null].filter(Boolean))
    onClose()
    onTrade(existing ? { assetId: existing.id } : { asset })
  }
  const title = it.kind === 'crypto' ? it.symbol.replace('-USD', '') : it.kind === 'fx' ? `${it.ccy}/THB` : ['index', 'gold', 'commodity'].includes(it.kind) && KNOWN_NAME(it) ? it.name : it.code || it.symbol
  return (
    <Sheet open={!!it} onClose={onClose} title={title} wide
      footer={canBuy ? <div className="flex gap-2"><Button variant="ghost" onClick={onStar}><Star size={16} className={starred ? 'fill-amber-400 text-amber-400' : ''} /> {starred ? 'ติดตามอยู่' : 'ติดตาม'}</Button><Button className="flex-1" onClick={buy}><Plus size={16} /> บันทึกซื้อ{existing ? ' (เพิ่มไม้)' : ''}</Button></div>
        : <Button variant="ghost" className="w-full" onClick={onStar}><Star size={16} className={starred ? 'fill-amber-400 text-amber-400' : ''} /> {starred ? 'ติดตามอยู่' : 'ติดตาม'}</Button>}>
      <div className="flex items-center gap-3">
        <Badge it={it} size={44} />
        <div className="min-w-0">
          <div className="font-semibold truncate">{q.name && it.kind !== 'fx' && !KNOWN_TH(it) ? q.name : it.name}</div>
          <div className="text-xs text-slate-500 truncate">{it.symbol.startsWith('FUND:') ? 'กองทุนรวมไทย · NAV' : `${it.symbol} · ${q.exchange || ''}`}{c && it.kind !== 'index' ? ` · ${c}` : ''}</div>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-3 flex-wrap">
        <div className="text-3xl font-bold num">{q.price ? `${m}${fmtP(q.price * per)}` : '—'}</div>
        <div className={`pb-1 font-semibold num ${up ? 'text-emerald-600' : 'text-rose'}`}>{pctTxt(q.changePct)} <span className="text-xs text-slate-500 font-normal">วันนี้</span></div>
        {live?.live && <span className="pb-1.5 text-[11px] text-emerald-600 flex items-center gap-1"><Radio size={11} /> Live</span>}
      </div>
      {it.kind === 'fx' && q.price && <div className="text-xs text-slate-500">1 {it.ccy}{per > 1 ? ` × ${per}` : ''} = {fmtP(q.price * per)} บาท · 1,000 บาท = {fmtP(1000 / q.price)} {it.ccy}</div>}
      {it.symbol === 'TH-GOLD' && <div className="text-xs text-slate-500">ต่อ 1 บาททองคำ (15.244 กรัม) · ประมาณจาก Gold Spot × ค่าเงิน</div>}

      {it.kind !== 'fund' ? (
        <>
          <div className="mt-3 flex gap-1 overflow-x-auto no-scrollbar">
            {RANGES.map(([r, l]) => <button key={r} onClick={() => setRange(r)} className={`px-2.5 py-1 rounded-lg text-xs shrink-0 ${range === r ? 'bg-slate-900 text-white' : 'bg-slate-900/[.04] text-slate-600'}`}>{l}</button>)}
            {rangeChg != null && <span className={`ml-auto self-center text-xs num font-semibold shrink-0 ${rangeChg >= 0 ? 'text-emerald-600' : 'text-rose'}`}>{pctTxt(rangeChg)}</span>}
          </div>
          <BigChart t={d?.t} c={series} busy={busy} range={range} fmt={(v) => `${m}${fmtP(v * per)}`} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <Stat l="สูงสุด/ต่ำสุดวันนี้" v={q.dayHi ? `${fmtP(q.dayHi * per)} / ${fmtP(q.dayLo * per)}` : '—'} />
            <Stat l="สูงสุด/ต่ำสุด 52 สัปดาห์" v={q.hi52 ? `${fmtP(q.hi52 * per)} / ${fmtP(q.lo52 * per)}` : '—'} />
            {q.hi52 && q.price ? <div className="col-span-2"><RangeBar lo={q.lo52} hi={q.hi52} v={q.price} /></div> : null}
          </div>
        </>
      ) : <div className="mt-4 text-xs text-slate-500">กองทุนแสดงราคา NAV ล่าสุด (อัปเดตวันละครั้งหลังตลาดปิด)</div>}
      {existing && <div className="mt-3 text-xs rounded-xl bg-sky-50 border border-sky-200 text-sky-800 px-3 py-2">คุณถือ {existing.name} อยู่ในพอร์ตแล้ว — ดูรายละเอียดได้ที่แท็บ “ลงทุน”</div>}
      {it.kind === 'index' && <div className="mt-3 text-[11px] text-slate-500">ดัชนีซื้อขายตรงไม่ได้ — ถ้าลงทุนผ่านกองทุน/ETF ให้ค้นหากองทุนนั้นแล้วบันทึกซื้อ</div>}
    </Sheet>
  )
}
const KNOWN_NAME = (it) => CATS.some((c) => c.items.some((i) => i.symbol === it.symbol))
const KNOWN_TH = (it) => /\.BK$/.test(it.symbol) || it.kind === 'gold'
const Stat = ({ l, v }) => <div className="rounded-xl bg-slate-900/[.03] px-3 py-2"><div className="text-slate-500 text-[11px]">{l}</div><div className="num font-semibold">{v}</div></div>

function RangeBar({ lo, hi, v }) {
  const p = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)))
  return (
    <div className="px-1 pt-1">
      <div className="relative h-2 rounded-full bg-gradient-to-r from-rose-300 via-amber-200 to-emerald-300">
        <div className="absolute -top-1 w-3 h-4 rounded-sm bg-slate-900 border-2 border-white shadow" style={{ left: `calc(${p * 100}% - 6px)` }} />
      </div>
      <div className="mt-1 text-[10.5px] text-slate-500 text-center">ตอนนี้อยู่ {Math.round(p * 100)}% ของช่วง 52 สัปดาห์</div>
    </div>
  )
}

/** Interactive area chart with a crosshair + tooltip (mouse and touch). */
function BigChart({ t, c, busy, range, fmt }) {
  const box = useRef(null)
  const [w, setW] = useState(600)
  const [hov, setHov] = useState(null)
  useEffect(() => {
    if (!box.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])
  const H = 220, P = { l: 6, r: 52, t: 10, b: 22 }
  if (!c?.length || c.length < 2) return <div ref={box} className="mt-2 h-[220px] grid place-items-center text-sm text-slate-400">{busy ? 'กำลังโหลดกราฟ…' : 'ไม่มีข้อมูลกราฟช่วงนี้'}</div>
  const lo = Math.min(...c), hi = Math.max(...c), pad = (hi - lo) * 0.08 || hi * 0.01
  const y0 = lo - pad, y1 = hi + pad
  const X = (i) => P.l + (i / (c.length - 1)) * (w - P.l - P.r)
  const Y = (v) => P.t + (1 - (v - y0) / (y1 - y0)) * (H - P.t - P.b)
  const up = c[c.length - 1] >= c[0]
  const col = up ? '#10b981' : '#f43f5e'
  const path = c.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('')
  const ticks = [0, 0.33, 0.66, 1].map((k) => y0 + (y1 - y0) * (0.08 + k * 0.84))
  const intraday = range === '1d' || range === '5d'
  const dl = (ms) => new Date(ms).toLocaleString('th-TH', intraday ? { day: range === '5d' ? 'numeric' : undefined, month: range === '5d' ? 'short' : undefined, hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: '2-digit' })
  const xl = [0, Math.floor((c.length - 1) / 2), c.length - 1]
  const move = (e) => {
    const r = box.current.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left
    const i = Math.round(((x - P.l) / (w - P.l - P.r)) * (c.length - 1))
    setHov(Math.max(0, Math.min(c.length - 1, i)))
  }
  const hi_ = hov != null ? hov : null
  return (
    <div ref={box} className="relative mt-2 select-none touch-pan-y" onMouseMove={move} onMouseLeave={() => setHov(null)} onTouchStart={move} onTouchMove={move} onTouchEnd={() => setHov(null)}>
      <svg width={w} height={H} className={`block transition-opacity ${busy ? 'opacity-40' : ''}`}>
        <defs><linearGradient id="mktg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".25" /><stop offset="1" stopColor={col} stopOpacity="0" /></linearGradient></defs>
        {ticks.map((v, i) => <g key={i}><line x1={P.l} x2={w - P.r} y1={Y(v)} y2={Y(v)} stroke="currentColor" className="text-slate-200" strokeDasharray="3 4" /><text x={w - P.r + 4} y={Y(v) + 3} fontSize="10" className="fill-slate-400 num">{fmtP(v)}</text></g>)}
        <path d={`${path}L${X(c.length - 1)},${H - P.b}L${X(0)},${H - P.b}Z`} fill="url(#mktg)" />
        <path d={path} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
        <line x1={P.l} x2={w - P.r} y1={Y(c[0])} y2={Y(c[0])} stroke={col} strokeOpacity=".35" strokeDasharray="2 3" />
        {t && xl.map((i, k) => <text key={k} x={X(i)} y={H - 6} fontSize="10" textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} className="fill-slate-400">{dl(t[i])}</text>)}
        <circle cx={X(c.length - 1)} cy={Y(c[c.length - 1])} r="3.5" fill={col} />
        {hi_ != null && <>
          <line x1={X(hi_)} x2={X(hi_)} y1={P.t} y2={H - P.b} stroke="currentColor" className="text-slate-400" />
          <circle cx={X(hi_)} cy={Y(c[hi_])} r="4.5" fill="#fff" stroke={col} strokeWidth="2" />
        </>}
      </svg>
      {hi_ != null && (
        <div className="mkt-tip absolute pointer-events-none px-2.5 py-1.5 rounded-lg text-xs shadow-lg" style={{ left: Math.min(Math.max(0, X(hi_) - 60), w - 130), top: 0, background: '#0f172a', color: '#fff' }}>
          <div className="font-semibold num">{fmt(c[hi_])}</div>
          {t && <div className="text-[10.5px]" style={{ color: '#cbd5e1' }}>{dl(t[hi_])}</div>}
          <div className="text-[10.5px] num" style={{ color: c[hi_] >= c[0] ? '#6ee7b7' : '#fda4af' }}>{pctTxt((c[hi_] / c[0] - 1) * 100)} จากต้นช่วง</div>
        </div>
      )}
    </div>
  )
}

