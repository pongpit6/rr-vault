import { useEffect, useRef, useState } from 'react'
import { LayoutDashboard, List, Plus, Wallet, Settings as Cog, Swords, LineChart, Repeat, Target, Inbox as InboxIcon } from 'lucide-react'
import { useStore, selectList } from './store'
import Home from './screens/Home'
import Transactions from './screens/Transactions'
import Wallets from './screens/Wallets'
import Settings from './screens/Settings'
import VaultRpg from './screens/VaultRpg'
import Portfolio from './screens/Portfolio'
import Subscriptions from './screens/Subscriptions'
import Plan from './screens/Plan'
import Inbox from './screens/Inbox'
import { useVault } from './lib/useVault'
import { usePrices, assetPrice } from './lib/prices'
import { todayISO } from './lib/format'
import TxnForm from './components/TxnForm'
import TradeForm from './components/TradeForm'
import AuthPanel from './components/AuthPanel'
import { LockScreen } from './components/Lock'
import { Toast, Avatar } from './components/ui'
import { fetchQuotes, streamCrypto, stopStream } from './lib/prices'
import { symbolsToPoll } from './lib/portfolio'
import { assetLabel } from './lib/portfolio'
import { processDueSubs } from './lib/subs'
import { processInstallments } from './lib/installments'

const NAV = [
  { id: 'home', label: 'หน้าแรก', icon: LayoutDashboard, mobile: true },
  { id: 'txns', label: 'รายการ', icon: List, mobile: true },
  { id: 'inbox', label: 'รอยืนยัน', icon: InboxIcon },
  { id: 'portfolio', label: 'พอร์ต', icon: LineChart, mobile: true },
  { id: 'wallets', label: 'กระเป๋า', icon: Wallet, mobile: true },
  { id: 'subs', label: 'Subscription', icon: Repeat },
  { id: 'plan', label: 'วางแผน', icon: Target },
  { id: 'vault', label: 'Vault', icon: Swords, mobile: true },
  { id: 'settings', label: 'ตั้งค่า', icon: Cog },
]
const MOBILE = NAV.filter((n) => n.mobile)

function Welcome() {
  const setUi = useStore((s) => s.setUi)
  return (
    <div className="min-h-dvh grid place-items-center px-5 py-10">
      <div className="w-full max-w-sm anim-pop">
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar size={96} />
          <h1 className="mt-5 text-2xl font-bold leading-tight">รณกฤต เรืองชินศิริ<br /><span className="grad-text">Vault</span></h1>
          <p className="mt-2 text-sm text-slate-500">รายรับ-รายจ่าย · กระเป๋าเงิน · การลงทุน</p>
        </div>
        <div className="card p-5"><AuthPanel /></div>
        <button onClick={() => setUi({ offlineMode: true })} className="mt-4 w-full text-sm text-slate-500 hover:text-slate-900 py-2">ใช้งานแบบออฟไลน์ก่อน (เข้าสู่ระบบทีหลังได้)</button>
      </div>
    </div>
  )
}

/** Keeps market prices fresh: crypto over a websocket, everything else polled every minute while visible. */
function useMarketData(ready) {
  const items = useStore((s) => s.items)
  const assetsKey = JSON.stringify(selectList(items, 'asset').map((a) => [a.symbol, a.source, a.type]))
  useEffect(() => {
    if (!ready) return
    const assets = selectList(useStore.getState().items, 'asset')
    const poll = () => { if (document.visibilityState === 'visible') fetchQuotes(symbolsToPoll(assets)) }
    poll()
    streamCrypto(assets)
    const iv = setInterval(poll, 60_000)
    const vis = () => { if (document.visibilityState === 'visible') { poll(); streamCrypto(assets) } else stopStream() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis) }
  }, [ready, assetsKey])
}

/** Saves one net-worth snapshot per day (updated at most every 10 minutes) for the history chart. */
function SnapshotWriter() {
  const { summary } = useVault()
  const last = useRef(0)
  useEffect(() => {
    const now = Date.now()
    if (now - last.current < 10 * 60_000) return
    const t = setTimeout(() => {
      last.current = Date.now()
      const date = todayISO()
      const st = useStore.getState()
      const prev = st.items[`snap-${date}`]?.data
      if (prev && Math.abs(prev.net - summary.net) < 1) return
      st.put('snap', { id: `snap-${date}`, date, net: summary.net, assets: summary.assets, debts: summary.debts, portfolio: summary.portfolio })
    }, 4000)
    return () => clearTimeout(t)
  }, [summary.net]) // eslint-disable-line
  return null
}

/** Fires price alerts when a watched asset crosses its target. */
function AlertWatcher() {
  const quotes = usePrices((s) => s.quotes)
  useEffect(() => {
    const st = useStore.getState()
    const alerts = selectList(st.items, 'alert').filter((a) => !a.triggeredAt)
    for (const al of alerts) {
      const asset = st.items[al.assetId]?.data
      const p = assetPrice(asset, quotes)
      if (p == null) continue
      if ((al.op === '>=' && p >= al.price) || (al.op === '<=' && p <= al.price)) {
        st.put('alert', { ...al, triggeredAt: new Date().toISOString() })
        const name = assetLabel(asset)
        const msg = `${name} ${al.op === '>=' ? 'ขึ้นถึง' : 'ลงถึง'} ${al.price.toLocaleString()} แล้ว (ตอนนี้ ${p.toLocaleString(undefined, { maximumFractionDigits: 4 })})`
        st.showToast('🔔 ' + msg)
        try { if (Notification.permission === 'granted') new Notification('R.R. Vault · แจ้งเตือนราคา', { body: msg, icon: './icon-192.png' }) } catch { /* not supported */ }
      }
    }
  }, [quotes])
  return null
}

export default function App() {
  const ready = useStore((s) => s.ready)
  const session = useStore((s) => s.session)
  const offline = useStore((s) => s.ui.offlineMode)
  const lock = useStore((s) => s.ui.lock)
  const [locked, setLocked] = useState(true)
  const hiddenAt = useRef(0)
  const [tab, setTab] = useState(() => (location.hash.slice(1) || 'home'))
  const [form, setForm] = useState(null) // null | {} | txn
  const [trade, setTrade] = useState(null)
  const [tabOpt, setTabOpt] = useState(null)
  const go = (t, o = null) => { setTabOpt(o); setTab(t) }

  useEffect(() => { useStore.getState().init() }, [])
  useMarketData(ready)
  useEffect(() => {
    if (!ready) return
    const run = () => { processDueSubs(); processInstallments() }
    const t = setTimeout(run, 1500)
    const iv = setInterval(run, 30 * 60_000)
    return () => { clearTimeout(t); clearInterval(iv) }
  }, [ready, session?.user?.id])
  useEffect(() => {
    const vis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now()
      else if (hiddenAt.current && Date.now() - hiddenAt.current > 60_000) setLocked(true)
    }
    document.addEventListener('visibilitychange', vis)
    return () => document.removeEventListener('visibilitychange', vis)
  }, [])
  useEffect(() => { if (location.hash.slice(1) !== tab) history.pushState(null, '', '#' + tab); window.scrollTo({ top: 0 }) }, [tab])
  useEffect(() => {
    const onHash = () => { const h = location.hash.slice(1); if (NAV.some((n) => n.id === h)) setTab(h) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input,textarea,select') || e.metaKey || e.ctrlKey || document.querySelector('.fixed.inset-0.z-50')) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setForm({}) }
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); setTrade({}) }
      if (e.key >= '1' && e.key <= '9') setTab(NAV[Number(e.key) - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ready) return <div className="min-h-dvh grid place-items-center"><div className="w-10 h-10 rounded-full grad-bg animate-pulse" /></div>
  if (!session && !offline) return <><Welcome /><Toast /></>
  if (lock?.enabled && locked) return <LockScreen onUnlock={() => setLocked(false)} />

  const onAdd = (init) => setForm(init || {})
  const onEdit = (t) => (t.kind === 'trade' ? setTrade(t) : setForm(t))
  const screen = {
    home: <Home onAdd={onAdd} onEdit={onEdit} go={go} onTrade={setTrade} />,
    inbox: <Inbox onAdd={onAdd} go={go} />,
    txns: <Transactions onEdit={onEdit} />,
    portfolio: <Portfolio onTrade={setTrade} />,
    wallets: <Wallets onEdit={onEdit} go={setTab} />,
    subs: <Subscriptions />,
    plan: <Plan onAdd={onAdd} />,
    vault: <VaultRpg onAdd={onAdd} go={setTab} />,
    settings: <Settings opt={tabOpt} />,
  }[tab] || null

  return (
    <div className="min-h-dvh md:flex">
      {/* desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 h-dvh sticky top-0 border-r border-slate-200/80 bg-white/60 backdrop-blur p-5 gap-1">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <img src="./icon-192.png" className="w-9 h-9 rounded-xl" alt="" />
          <div className="leading-tight"><div className="text-sm font-semibold">R.R.</div><div className="text-sm font-semibold grad-text">Vault</div></div>
        </div>
        <button onClick={() => setForm({})} className="mb-2 flex items-center justify-center gap-2 py-3 rounded-2xl grad-bg text-white font-semibold shadow-lg shadow-emerald-500/20 hover:brightness-110">
          <Plus size={18} /> บันทึกรายการ <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/20">N</kbd>
        </button>
        <button onClick={() => setTrade({})} className="mb-4 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-white border border-slate-200 font-semibold text-sm hover:bg-slate-50">
          <LineChart size={16} /> ซื้อ/ขายสินทรัพย์ <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100">T</kbd>
        </button>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${tab === n.id ? 'bg-slate-900/[.05] text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/[.025]'}`}>
            <n.icon size={18} className={tab === n.id ? 'text-emerald-600' : ''} /> {n.label}
          </button>
        ))}
        <div className="mt-auto text-[11px] text-slate-400 px-2">คีย์ลัด: N บันทึก · T ซื้อขาย · 1-9 สลับหน้า</div>
      </aside>

      <main className="flex-1 min-w-0 px-4 md:px-8 pt-safe pb-28 md:pb-10">
        <div className="max-w-6xl mx-auto pt-3 md:pt-6" key={tab}>{screen}</div>
      </main>

      {/* mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-safe bg-white/90 backdrop-blur-xl border-t border-slate-200">
        <div className="grid grid-cols-6 items-center h-16 px-1">
          {MOBILE.slice(0, 2).map((n) => <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />)}
          <div className="flex justify-center">
            <button onClick={() => (tab === 'portfolio' ? setTrade({}) : setForm({}))} aria-label="บันทึกรายการ" className="w-14 h-14 -mt-7 rounded-2xl grad-bg text-white grid place-items-center shadow-xl shadow-emerald-500/30 active:scale-95 transition">
              <Plus size={26} strokeWidth={2.4} />
            </button>
          </div>
          {MOBILE.slice(2).map((n) => <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />)}
        </div>
      </nav>

      <SnapshotWriter />
      <AlertWatcher />
      <TxnForm open={!!form} initial={form} onClose={() => setForm(null)} />
      <TradeForm open={!!trade} initial={trade} onClose={() => setTrade(null)} />
      <Toast />
    </div>
  )
}

function NavBtn({ n, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 text-[10.5px] ${active ? 'text-slate-900' : 'text-slate-500'}`}>
      <n.icon size={21} className={active ? 'text-emerald-600' : ''} strokeWidth={active ? 2.2 : 1.8} />
      {n.label}
    </button>
  )
}
