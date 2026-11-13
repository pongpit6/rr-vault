import { useEffect, useState } from 'react'
import { LayoutDashboard, List, Plus, Wallet, Settings as Cog, Swords } from 'lucide-react'
import { useStore } from './store'
import Home from './screens/Home'
import Transactions from './screens/Transactions'
import Wallets from './screens/Wallets'
import Settings from './screens/Settings'
import VaultRpg from './screens/VaultRpg'
import TxnForm from './components/TxnForm'
import AuthPanel from './components/AuthPanel'
import { Toast, Avatar } from './components/ui'

const NAV = [
  { id: 'home', label: 'หน้าแรก', icon: LayoutDashboard },
  { id: 'txns', label: 'รายการ', icon: List },
  { id: 'wallets', label: 'กระเป๋า', icon: Wallet },
  { id: 'vault', label: 'Vault', icon: Swords },
  { id: 'settings', label: 'ตั้งค่า', icon: Cog },
]

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

export default function App() {
  const ready = useStore((s) => s.ready)
  const session = useStore((s) => s.session)
  const offline = useStore((s) => s.ui.offlineMode)
  const [tab, setTab] = useState(() => (location.hash.slice(1) || 'home'))
  const [form, setForm] = useState(null) // null | {} | txn

  useEffect(() => { useStore.getState().init() }, [])
  useEffect(() => { if (location.hash.slice(1) !== tab) history.pushState(null, '', '#' + tab); window.scrollTo({ top: 0 }) }, [tab])
  useEffect(() => {
    const onHash = () => { const h = location.hash.slice(1); if (NAV.some((n) => n.id === h)) setTab(h) }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input,textarea,select') || e.metaKey || e.ctrlKey) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setForm({}) }
      if (e.key >= '1' && e.key <= '5') setTab(NAV[Number(e.key) - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ready) return <div className="min-h-dvh grid place-items-center"><div className="w-10 h-10 rounded-full grad-bg animate-pulse" /></div>
  if (!session && !offline) return <><Welcome /><Toast /></>

  const onAdd = (init) => setForm(init || {})
  const onEdit = (t) => setForm(t)
  const screen = {
    home: <Home onAdd={onAdd} onEdit={onEdit} go={setTab} />,
    txns: <Transactions onEdit={onEdit} />,
    wallets: <Wallets onEdit={onEdit} />,
    vault: <VaultRpg onAdd={onAdd} />,
    settings: <Settings />,
  }[tab] || null

  return (
    <div className="min-h-dvh md:flex">
      {/* desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 h-dvh sticky top-0 border-r border-slate-200/80 bg-white/60 backdrop-blur p-5 gap-1">
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <img src="./icon-192.png" className="w-9 h-9 rounded-xl" alt="" />
          <div className="leading-tight"><div className="text-sm font-semibold">R.R.</div><div className="text-sm font-semibold grad-text">Vault</div></div>
        </div>
        <button onClick={() => setForm({})} className="mb-4 flex items-center justify-center gap-2 py-3 rounded-2xl grad-bg text-white font-semibold shadow-lg shadow-emerald-500/20 hover:brightness-110">
          <Plus size={18} /> บันทึกรายการ <kbd className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-black/20">N</kbd>
        </button>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${tab === n.id ? 'bg-slate-900/[.05] text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-900/[.025]'}`}>
            <n.icon size={18} className={tab === n.id ? 'text-emerald-600' : ''} /> {n.label}
          </button>
        ))}
        <div className="mt-auto text-[11px] text-slate-400 px-2">คีย์ลัด: N บันทึก · 1-5 สลับหน้า</div>
      </aside>

      <main className="flex-1 min-w-0 px-4 md:px-8 pt-safe pb-28 md:pb-10">
        <div className="max-w-6xl mx-auto pt-3 md:pt-6" key={tab}>{screen}</div>
      </main>

      {/* mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-safe bg-white/85 backdrop-blur-xl border-t border-slate-200">
        <div className="grid grid-cols-5 items-center h-16 px-2">
          {NAV.slice(0, 2).map((n) => <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />)}
          <div className="flex justify-center">
            <button onClick={() => setForm({})} aria-label="บันทึกรายการ" className="w-14 h-14 -mt-7 rounded-2xl grad-bg text-white grid place-items-center shadow-xl shadow-emerald-500/30 active:scale-95 transition">
              <Plus size={26} strokeWidth={2.4} />
            </button>
          </div>
          {NAV.slice(2, 4).map((n) => <NavBtn key={n.id} n={n} active={tab === n.id} onClick={() => setTab(n.id)} />)}
        </div>
      </nav>

      <TxnForm open={!!form} initial={form} onClose={() => setForm(null)} />
      <Toast />
    </div>
  )
}

function NavBtn({ n, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 text-[11px] ${active ? 'text-slate-900' : 'text-slate-500'}`}>
      <n.icon size={21} className={active ? 'text-emerald-600' : ''} strokeWidth={active ? 2.2 : 1.8} />
      {n.label}
    </button>
  )
}
