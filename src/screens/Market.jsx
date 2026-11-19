import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Star, RefreshCw, ChevronRight, X, Radio, Plus } from 'lucide-react'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { Sheet, Button } from '../components/ui'
import { AssetLogo } from '../components/Logos'
import FuelCard from '../components/FuelCard'
import { useSyncedPref, unionBySymbol } from '../lib/prefs'
import { loadCatalog, sortsFor, sortItems, matchLocal, searchInCat, PAGE } from '../lib/catalog'
import { CATS, CAT_BY_ID, catOf, WATCH_MAX, bitkubPremium, loadBitkubList, coinCode, isCoin, itemFor, itemCcy, useMarket, loadSpark, loadChart, searchMarket, streamMarketCrypto, stopMarketStream, loadOil } from '../lib/market'
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

function Row({ it, q, starred, held, onStar, onOpen, premium }) {
  const up = (q?.changePct ?? 0) >= 0
  const named = ['index', 'gold', 'commodity'].includes(it.kind) && KNOWN_NAME(it)
  const label = named ? it.name : it.kind === 'crypto' ? it.symbol.replace('-USD', '').replace('BKUB:', '') : it.kind === 'fund' ? it.code || it.name : it.kind === 'fx' ? `${it.ccy}/THB` : it.symbol.replace(/\.BK$/, '')
  const prem = it.symbol.startsWith('BKUB:') ? premium?.(it.code) : null
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
        <div className="text-[11px] text-slate-500 truncate">{sub}{prem != null && <span className={`ml-1.5 font-semibold ${prem > 0.5 ? 'text-amber-600' : prem < -0.5 ? 'text-emerald-600' : 'text-slate-400'}`} title="ส่วนต่างเทียบ Binance">{prem > 0 ? '+' : ''}{prem.toFixed(1)}% vs Binance</span>}</div>
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
  // crypto: one row per coin, priced in USD (Binance) or THB (Bitkub)
  const coinCcy = useStore((s) => s.ui.cryptoCcy) || 'USD'
  const setUi = useStore((s) => s.setUi)
  const [bkCodes, setBkCodes] = useState(null)
  useEffect(() => { if (coinCcy === 'THB' && !bkCodes) loadBitkubList().then((l) => setBkCodes(new Set(l.map((x) => x.code)))).catch(() => {}) }, [coinCcy]) // eslint-disable-line
  const usdCodes = useMemo(() => new Set(CAT_BY_ID.crypto.items.map((i) => coinCode(i.symbol))), [])
  const asMode = (it) => {
    if (!isCoin(it.symbol)) return it
    const c = coinCode(it.symbol)
    if (coinCcy === 'THB') return it.symbol.startsWith('BKUB:') || !bkCodes?.has(c) ? it : itemFor(`BKUB:${c}`)
    return it.symbol.endsWith('-USD') || !(usdCodes.has(c) || c.length <= 5 && c !== 'KUB') ? it : itemFor(`${c}-USD`, { name: it.name !== `${c}/THB` ? it.name : c })
  }
  const dedupe = (list) => { const seen = new Set(); return list.filter((x) => { const k = isCoin(x.symbol) ? `c:${coinCode(x.symbol)}` : x.symbol; if (seen.has(k)) return false; seen.add(k); return true }) }
  const watchItems = dedupe(watch.map((w) => asMode(itemFor(w.symbol, w))))
  const sameAs = (a, b) => a === b || (isCoin(a) && isCoin(b) && coinCode(a) === coinCode(b))
  const isWatched = (s) => watch.some((w) => sameAs(w.symbol, s))
  const toggleWatch = (it) => {
    sfx('click')
    setWatch(isWatched(it.symbol) ? watch.filter((w) => !sameAs(w.symbol, it.symbol)) : [...watch, { symbol: it.symbol, name: it.name, code: it.code }])
  }
  const watchIn = (id) => watchItems.filter((w) => catOf(w) === id)
  const ccyToggle = (
    <span className="inline-flex ml-2 align-middle rounded-lg overflow-hidden border border-slate-200 text-[10px] font-semibold" onClick={(e) => e.stopPropagation()} data-testid="coin-ccy">
      {['USD', 'THB'].map((c) => <button key={c} onClick={() => setUi({ cryptoCcy: c })} className={`px-2 py-0.5 ${coinCcy === c ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>{c === 'USD' ? '$ Binance' : '฿ Bitkub'}</button>)}
    </span>
  )
  // ---------- a category tab: the whole market, watched first, paged 30 at a time ----------
  const inCat = !['all', 'watch', 'fuel'].includes(cat)
  const [catList, setCatList] = useState(null)
  const [sort, setSort] = useState(null)
  const [sector, setSector] = useState('')
  const [shown, setShown] = useState(PAGE)
  useEffect(() => { setSort(null); setSector(''); setShown(PAGE) }, [cat, coinCcy])
  useEffect(() => {
    if (!inCat) return
    let alive = true
    setCatList(null)
    const run = () => loadCatalog(cat, coinCcy).then((l) => alive && setCatList(l)).catch(() => alive && setCatList(CAT_BY_ID[cat]?.items || []))
    run()
    const iv = cat === 'crypto' ? setInterval(() => document.visibilityState === 'visible' && loadCatalog(cat, coinCcy), 30_000) : null
    return () => { alive = false; if (iv) clearInterval(iv) }
  }, [cat, coinCcy]) // eslint-disable-line
  const sorts = sortsFor(cat)
  const sortNow = sort || sorts?.[0]?.[0] || 'default'
  const sectors = useMemo(() => {
    if (!catList) return []
    const n = {}
    for (const it of catList) if (it.sector) n[it.sector] = (n[it.sector] || 0) + 1
    return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([k]) => k)
  }, [catList])
  const tabView = useMemo(() => {
    if (!inCat) return null
    const base = cat === 'fund' ? heldFunds : (catList || CAT_BY_ID[cat]?.items || []).map(asMode)
    const pinned = dedupe(watchIn(cat).map(asMode))
    const pinKeys = new Set(pinned.map((x) => (isCoin(x.symbol) ? coinCode(x.symbol) : x.symbol)))
    let rest = dedupe(base).filter((x) => !pinKeys.has(isCoin(x.symbol) ? coinCode(x.symbol) : x.symbol))
    if (sector) rest = rest.filter((x) => x.sector === sector)
    const qs = query.trim()
    if (qs) { const all = matchLocal(dedupe([...pinned, ...rest]), qs); return { pinned: [], rows: all.slice(0, shown), total: all.length, searching: true } }
    rest = sortItems(rest, sortNow, q)
    return { pinned, rows: rest.slice(0, shown), total: rest.length, searching: false }
    // q only matters for the price sorts
  }, [inCat, cat, catList, coinCcy, sector, query, shown, sortNow, watch.map((w) => w.symbol).join(','), heldFunds.length, ['up', 'down', 'vol'].includes(sortNow) ? q : null]) // eslint-disable-line
  // online search inside the tab, for symbols the built-in list doesn't have
  const [catRemote, setCatRemote] = useState([])
  useEffect(() => {
    setCatRemote([])
    if (!inCat || query.trim().length < 2 || !['th', 'us', 'cn', 'fund'].includes(cat)) return
    let alive = true
    const t = setTimeout(async () => { const r = await searchInCat(cat, query); if (alive) setCatRemote(r) }, 400)
    return () => { alive = false; clearTimeout(t) }
  }, [cat, query, inCat])
  const moreRef = useRef(null)
  useEffect(() => {
    const el = moreRef.current
    if (!el || !tabView || tabView.rows.length >= tabView.total) return
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) setShown((n) => n + PAGE) }, { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [tabView?.rows.length, tabView?.total]) // eslint-disable-line
  // overview card: your stars in this category (max 6); none starred → catalog defaults (3)
  const overviewItems = (id) => {
    const w = watchIn(id)
    if (w.length) return { list: w.slice(0, WATCH_MAX), extra: Math.max(0, w.length - WATCH_MAX), mine: true }
    if (id === 'fund') return { list: heldFunds.slice(0, WATCH_MAX), extra: Math.max(0, heldFunds.length - WATCH_MAX), mine: false }
    return { list: (CAT_BY_ID[id]?.items || []).slice(0, 3).map(asMode), extra: 0, mine: false }
  }
  const overviewCats = [...CATS, ...(watchIn('other').length ? [{ id: 'other', label: 'ตลาดอื่น', emoji: '🌐' }] : [])]

  // which symbols are on screen → load them, refresh every minute, stream crypto live
  const visible = useMemo(() => {
    if (cat === 'fuel') return []
    if (cat === 'all') return overviewCats.flatMap((c) => overviewItems(c.id).list).map((i) => i.symbol)
    if (cat === 'watch') return watchItems.map((i) => i.symbol)
    return tabView ? [...tabView.pinned, ...tabView.rows].map((i) => i.symbol) : []
  }, [cat, watch.map((w) => w.symbol).join(','), heldFunds.length, coinCcy, !!bkCodes, tabView?.rows.map((r) => r.symbol).join(','), tabView?.pinned.length]) // eslint-disable-line
  // Bitkub premium needs the Binance leg + USD/THB
  const pollSyms = useMemo(() => {
    // the crypto tab already has every price from one ticker call: only the top rows also fetch a sparkline
    const vis = cat === 'crypto' ? [...visible.filter((s) => !isCoin(s)), ...visible.filter(isCoin).slice(0, 12)] : visible
    const bk = vis.filter((s) => s.startsWith('BKUB:')).slice(0, 12).map((s) => `${s.slice(5)}-USD`)
    return bk.length ? [...new Set([...vis, ...bk, 'THB=X'])] : vis
  }, [visible.join(',')]) // eslint-disable-line
  useEffect(() => {
    if (!pollSyms.length) return
    loadSpark(pollSyms)
    const iv = setInterval(() => document.visibilityState === 'visible' && loadSpark(pollSyms), cat === 'crypto' && coinCcy === 'THB' ? 30_000 : 60_000)
    return () => clearInterval(iv)
  }, [pollSyms.join(',')]) // eslint-disable-line
  useEffect(() => {
    const page = cat === 'crypto' && coinCcy === 'USD' ? visible.filter((s) => s.endsWith('-USD')).slice(0, 40) : []
    streamMarketCrypto([...CAT_BY_ID.crypto.items.map((i) => i.symbol), ...watch.map((w) => w.symbol), ...page])
  }, [watch.length, cat === 'crypto' ? visible.join(',') : '']) // eslint-disable-line
  useEffect(() => () => stopMarketStream(), [])
  useEffect(() => { loadOil() }, [])

  // search
  useEffect(() => {
    const s = query.trim()
    if (s.length < 2 || inCat) { setResults(null); return }
    let alive = true
    const t = setTimeout(async () => { const r = await searchMarket(s); if (alive) setResults(r) }, 350)
    return () => { alive = false; clearTimeout(t) }
  }, [query, inCat])

  const open = (it) => { sfx('click'); setDetail(it) }
  const premium = (code) => bitkubPremium(code, q)
  const rowProps = (it) => ({ it, q: q[it.symbol], starred: isWatched(it.symbol), held: heldSyms.has(it.symbol), onStar: () => toggleWatch(it), onOpen: () => open(it), premium })
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
        <input className="field !pl-10 !pr-10" placeholder={inCat ? `ค้นหาใน${CAT_BY_ID[cat]?.label || ''}… ${{ crypto: 'เช่น BTC, SOL', th: 'เช่น PTT, ธนาคาร', us: 'เช่น NVDA, Apple', cn: 'เช่น Tencent, 0700', fund: 'เช่น K-USA, SCBSET', gold: 'เช่น เงิน', oil: 'เช่น Brent', fx: 'เช่น เยน, KRW' }[cat] || ''}` : 'ค้นหาทุกตลาด หุ้น คริปโต กองทุน ETF… เช่น BABA, SCB, PTTEP'} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="ค้นหาสินทรัพย์" />
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
              const head = <>{c.emoji} {c.label}{mine && <span className="ml-1.5 text-[10px] font-medium text-amber-500 align-middle">⭐ {watchIn(c.id).length}</span>}{c.id === 'crypto' && ccyToggle}</>
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
          {cat === 'crypto' && <div className="px-2 pb-2 flex items-center justify-between text-[11px] text-slate-500"><span>{coinCcy === 'THB' ? 'ราคาบาทจาก Bitkub · % เทียบ Binance' : 'ราคา USD สดจาก Binance'}</span>{ccyToggle}</div>}
          <CatTools cat={cat} sorts={sorts} sortNow={sortNow} setSort={(v) => { setSort(v); setShown(PAGE) }} sectors={sectors} sector={sector} setSector={(v) => { setSector(v); setShown(PAGE) }} total={tabView?.total} loading={!catList && cat !== 'fund'} searching={tabView?.searching} />
          {tabView?.pinned.length > 0 && <div className="px-2 pt-1 text-[10px] font-semibold text-amber-500">⭐ ที่ติดตาม</div>}
          {tabView?.pinned.map((it) => <Row key={it.symbol} {...rowProps(it)} />)}
          {tabView?.pinned.length > 0 && tabView.rows.length > 0 && <div className="px-2 pt-2 text-[10px] font-semibold text-slate-400">ทั้งหมดใน{CAT_BY_ID[cat]?.label}</div>}
          {tabView?.rows.map((it) => <Row key={it.symbol} {...rowProps(it)} />)}
          {tabView && tabView.rows.length < tabView.total && (
            <button ref={moreRef} onClick={() => setShown((n) => n + PAGE)} className="w-full py-2.5 text-xs ui-link" data-testid="mkt-more">แสดงเพิ่ม (เหลืออีก {(tabView.total - tabView.rows.length).toLocaleString()} รายการ)</button>
          )}
          {catRemote.filter((r) => !tabView?.rows.some((x) => x.symbol === r.symbol)).length > 0 && (
            <div data-testid="cat-remote">
              <div className="px-2 pt-2 text-[10px] font-semibold text-slate-400">เจอเพิ่มจากการค้นหาออนไลน์</div>
              {catRemote.filter((r) => !tabView?.rows.some((x) => x.symbol === r.symbol)).map((r) => <Row key={r.symbol} {...rowProps(itemFor(r.symbol, { name: r.name, code: r.code, exchange: r.exchange }))} />)}
            </div>
          )}
          {tabView?.searching && !tabView.total && !catRemote.length && (
            <div className="px-2 py-4 text-sm text-slate-500 text-center" data-testid="cat-empty">ไม่พบ “{query.trim()}” ใน{CAT_BY_ID[cat]?.label}
              <div><button className="ui-link text-xs mt-2" onClick={() => setCat('all')}>ค้นหาในทุกตลาด</button></div>
            </div>
          )}
          {cat === 'fund' && !query && <div className="px-2 py-3 text-xs text-slate-500">กองทุนไทยมีหลายพันกอง พิมพ์ชื่อหรือรหัสกองทุนในช่องค้นหาด้านบน แล้วกด ⭐ เพื่อติดตาม · กองทุนที่คุณถือจะขึ้นที่นี่อัตโนมัติ</div>}
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

function CatTools({ cat, sorts, sortNow, setSort, sectors, sector, setSector, total, loading, searching }) {
  if (cat === 'fund') return null
  return (
    <div className="px-2 pb-2 flex flex-wrap items-center gap-1.5 text-[11px]" data-testid="cat-tools">
      <span className="text-slate-500 mr-auto">{loading ? 'กำลังโหลดรายชื่อ…' : `${searching ? 'พบ' : 'ทั้งหมด'} ${(total || 0).toLocaleString()} รายการ`}</span>
      {sectors.length > 1 && !searching && (
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="border border-slate-200 rounded-lg px-1.5 py-1 bg-white max-w-[120px] sm:max-w-[180px]" aria-label="หมวด" data-testid="cat-sector">
          <option value="">ทุกหมวด</option>
          {sectors.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      )}
      {sorts && !searching && sorts.map(([k, l]) => (
        <button key={k} onClick={() => setSort(k)} className={`px-2 py-1 rounded-lg border ${sortNow === k ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'}`} data-testid={`cat-sort-${k}`}>{l}</button>
      ))}
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
  if (it.symbol.startsWith('BKUB:')) return { type: 'crypto', symbol: it.symbol, name: `${it.code} (Bitkub)`, source: 'yahoo', currency: 'THB', unit: it.code, exchange: 'Bitkub' }
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
  const title = it.kind === 'crypto' ? it.symbol.replace('-USD', '').replace('BKUB:', '') : it.kind === 'fx' ? `${it.ccy}/THB` : ['index', 'gold', 'commodity'].includes(it.kind) && KNOWN_NAME(it) ? it.name : it.code || it.symbol
  return (
    <Sheet open={!!it} onClose={onClose} title={title} wide
      footer={canBuy ? <div className="flex gap-2"><Button variant="ghost" onClick={onStar}><Star size={16} className={starred ? 'fill-amber-400 text-amber-400' : ''} /> {starred ? 'ติดตามอยู่' : 'ติดตาม'}</Button><Button className="flex-1" onClick={buy}><Plus size={16} /> บันทึกซื้อ{existing ? ' (เพิ่มไม้)' : ''}</Button></div>
        : <Button variant="ghost" className="w-full" onClick={onStar}><Star size={16} className={starred ? 'fill-amber-400 text-amber-400' : ''} /> {starred ? 'ติดตามอยู่' : 'ติดตาม'}</Button>}>
      <div className="flex items-center gap-3">
        <Badge it={it} size={44} />
        <div className="min-w-0">
          <div className="font-semibold truncate">{q.name && it.kind !== 'fx' && !KNOWN_TH(it) ? q.name : it.name}</div>
          <div className="text-xs text-slate-500 truncate">{it.symbol.startsWith('FUND:') ? 'กองทุนรวมไทย · NAV' : it.symbol.startsWith('BKUB:') ? `${it.code}/THB · Bitkub · ราคาบาทจริง` : `${it.symbol} · ${q.exchange || ''}`}{c && it.kind !== 'index' ? ` · ${c}` : ''}</div>
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

