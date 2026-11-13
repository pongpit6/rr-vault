import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings as Cog, Eye, EyeOff, ChevronRight, ChevronDown, Cloud, CloudOff, RefreshCw, Plus, ScanLine } from 'lucide-react'
import { Avatar, Money, IconBadge, Empty, Button } from '../components/ui'
import TxnRow from '../components/TxnRow'
import { SubLogo, AssetLogo } from '../components/Logos'
import { RpgHomeCard } from '../components/RpgBits'
import { useRpg } from '../lib/rpg'
import { useSubs } from './Subscriptions'
import { useInbox } from './Inbox'
import { upcoming } from '../lib/subs'
import { budgetStatus } from '../lib/plan'
import { assetLabel } from '../lib/portfolio'
import { useStore, useProfile, selectList } from '../store'
import { useVault } from '../lib/useVault'
import { greeting, money, todayISO, monthKey, round2, shortDate } from '../lib/format'

function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now(), a = from.current, b = target
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      setV(a + (b - a) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = b
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target]) // eslint-disable-line
  return v
}

export function SyncDot() {
  const session = useStore((s) => s.session)
  const sync = useStore((s) => s.sync)
  const dirty = useStore((s) => Object.keys(s.dirty).length)
  const syncNow = useStore((s) => s.syncNow)
  if (!session) return <span title="ใช้งานแบบออฟไลน์" className="p-2 text-slate-400"><CloudOff size={18} /></span>
  const spinning = sync.state === 'syncing'
  const color = sync.state === 'error' ? 'text-rose' : dirty ? 'text-amber' : 'text-emerald-600'
  return (
    <button onClick={syncNow} title={sync.error || (dirty ? `รอซิงก์ ${dirty} รายการ` : 'ซิงก์แล้ว')} className={`p-2 rounded-full hover:bg-slate-900/[.04] ${color}`}>
      {spinning ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
    </button>
  )
}

/** One line of "things to do" on the home screen. */
function Todo({ icon, title, sub, right, onClick, urgent }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition hover:bg-slate-900/[.03] ${urgent ? 'bg-amber-50' : ''}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        {sub && <div className={`text-xs truncate ${urgent ? 'text-amber-700' : 'text-slate-500'}`}>{sub}</div>}
      </div>
      {right}
      <ChevronRight size={16} className="text-slate-300 shrink-0" />
    </button>
  )
}

export default function Home({ onAdd, onEdit, go }) {
  const profile = useProfile()
  const privacy = useStore((s) => s.ui.privacy)
  const setUi = useStore((s) => s.setUi)
  const homeMore = useStore((s) => s.ui.homeMore)
  const { accounts, txns, balances, summary, catById, accById, portfolio, cycles, settings } = useVault()
  const subs = useSubs()
  const items = useStore((s) => s.items)
  const inbox = useInbox()
  const rpg = useRpg()
  const net = useCountUp(summary.net)
  const uncat = useMemo(() => txns.filter((t) => t.category === 'cat-uncat'), [txns])
  const budgets = useMemo(() => budgetStatus(selectList(items, 'budget'), txns), [items, txns])
  const soon = useMemo(() => upcoming(subs, accounts, balances, 7, cycles), [subs, accounts, balances, cycles])
  const month = monthKey(todayISO())
  const stats = useMemo(() => {
    let inc = 0, exp = 0, today = 0
    const byCat = {}
    for (const t of txns) {
      if (t.kind === 'expense' && t.date === todayISO()) today += t.amount
      if (monthKey(t.date) !== month) continue
      if (t.kind === 'income') inc += t.amount
      if (t.kind === 'expense') { exp += t.amount; byCat[t.category] = (byCat[t.category] || 0) + t.amount }
    }
    return { inc: round2(inc), exp: round2(exp), today: round2(today), top: Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3), rate: inc > 0 ? (inc - exp) / inc : null }
  }, [txns, month])
  const cash = summary.byType.cash || 0
  const recent = txns.slice(0, 5)
  const warnBudgets = budgets.filter((b) => b.status === 'over' || b.status === 'warn')

  const todos = []
  if (inbox.length) todos.push({ key: 'inbox', urgent: true, icon: <div className="w-9 h-9 rounded-2xl bg-amber-400 text-white grid place-items-center font-bold">{inbox.length}</div>, title: 'รายการจากธนาคารรอยืนยัน', sub: inbox.slice(0, 3).map((x) => x.p.kind === 'trade' ? `${x.p.side === 'buy' ? 'ซื้อ' : 'ขาย'} ${x.p.coin}` : `${x.p.direction === 'in' ? '+' : x.p.direction === 'transfer' ? '' : '-'}${x.p.amount ? money(x.p.amount, { decimals: false }) : '?'}`).join(' · '), onClick: () => go('txns', 'inbox') })
  if (uncat.length) todos.push({ key: 'uncat', icon: <IconBadge name="tag" color="#f59e0b" size={36} icon={17} />, title: `${uncat.length} รายการยังไม่ใส่หมวด`, sub: 'แตะเพื่อใส่หมวดรวดเดียว', onClick: () => go('txns', 'uncat') })
  for (const u of soon.slice(0, 3)) {
    todos.push(u.kind === 'sub'
      ? { key: u.sub.id, icon: <SubLogo sub={u.sub} size={36} />, title: u.sub.name, sub: `${u.days <= 0 ? 'ตัดวันนี้' : u.days === 1 ? 'ตัดพรุ่งนี้' : `อีก ${u.days} วัน`}${u.sub.auto ? ' · บันทึกให้อัตโนมัติ' : ''}`, right: <span className="text-sm font-semibold num">{u.sub.currency === 'USD' ? `$${u.sub.amount}` : money(u.sub.amount, { decimals: false })}</span>, onClick: () => go('money', 'subs') }
      : { key: u.account.id, urgent: u.days <= 2, icon: <IconBadge name={u.account.icon} color={u.account.color} size={36} icon={17} />, title: `${u.bill ? 'จ่ายบิล' : 'จ่ายหนี้'} ${u.account.name}`, sub: u.days < 0 ? `เลยกำหนด ${-u.days} วัน` : u.days === 0 ? 'ครบกำหนดวันนี้' : `ภายใน ${shortDate(u.date)} · อีก ${u.days} วัน`, right: <Money value={u.amount} decimals={false} className="text-sm font-semibold" />, onClick: () => onAdd({ kind: 'payment', to: u.account.id }) })
  }
  for (const b of warnBudgets.slice(0, 2)) {
    const c = catById[b.category]
    todos.push({ key: b.id, urgent: b.status === 'over', icon: <IconBadge name={c?.icon} color={c?.color} size={36} icon={17} />, title: `${c?.name}: ${b.status === 'over' ? 'เกินงบแล้ว' : `ใช้ไป ${Math.round(b.ratio * 100)}%`}`, sub: b.status === 'over' ? `เกิน ${money(-b.left, { decimals: false })}` : `เหลือ ${money(b.left, { decimals: false })} · วันละ ${money(b.perDayLeft, { decimals: false })}`, onClick: () => go('money', 'plan') })
  }
  if (summary.target > 0 && summary.gap > 0) todos.push({ key: 'gap', icon: <IconBadge name="shield" color="#a78bfa" size={36} icon={17} />, title: 'เงินกันจ่ายหนี้ยังไม่ครบ', sub: `ขาดอีก ${money(summary.gap, { decimals: false })} · แตะเพื่อย้ายเงินไปกันไว้`, onClick: () => onAdd({ kind: 'transfer', amount: Math.min(summary.gap, Math.max(0, cash)) || summary.gap, to: settings.allocation.targets.reserve, note: 'กันเงินจ่ายหนี้' }) })

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={() => go('settings')}><Avatar size={44} /></button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500">{greeting()} 👋</div>
          <div className="font-semibold truncate">{profile.name}</div>
        </div>
        <SyncDot />
        <button onClick={() => setUi({ slipOpen: true })} className="p-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" title="สแกนสลิป"><ScanLine size={20} /></button>
        <button onClick={() => setUi({ privacy: !privacy })} className="p-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" title="ซ่อน/แสดงตัวเลข">{privacy ? <EyeOff size={20} /> : <Eye size={20} />}</button>
        <button onClick={() => go('settings')} className="p-2 -mr-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" title="ตั้งค่า"><Cog size={20} /></button>
      </header>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="space-y-4">
          {/* money now */}
          <section className="hero p-5 md:p-6 anim-pop relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full border border-white/20" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-white/75">เงินที่ใช้ได้ตอนนี้</div>
                <Money value={cash} className="text-4xl md:text-5xl font-bold tracking-tight" decimals={false} />
              </div>
              <button onClick={() => go('money')} className="text-xs bg-white/20 hover:bg-white/30 rounded-xl px-2.5 py-1.5 flex items-center gap-1 mt-1">กระเป๋า <ChevronRight size={13} /></button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">วันนี้ใช้ไป</div><Money value={stats.today} decimals={false} className="font-semibold text-sm" /></div>
              <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">กันจ่ายหนี้</div><Money value={summary.reserve} decimals={false} className="font-semibold text-sm" /></div>
              <button onClick={() => go('money', 'plan')} className="rounded-2xl bg-white/15 px-3 py-2 text-left"><div className="text-white/70">มูลค่าสุทธิ</div><span className="font-semibold text-sm num">{privacy ? '••••' : money(net, { decimals: false })}</span></button>
            </div>
          </section>

          {/* to-do */}
          {todos.length > 0 && (
            <section className="card p-2">
              <div className="px-3 pt-2 pb-1 text-sm font-semibold">วันนี้ต้องทำ</div>
              {todos.map((t) => <Todo key={t.key} {...t} />)}
            </section>
          )}

          <RpgHomeCard rpg={rpg} onOpen={() => go('vault')} />
        </div>

        <div className="space-y-4">
          {/* recent */}
          <section className="card p-2">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <div className="font-semibold">รายการล่าสุด</div>
              <button onClick={() => go('txns')} className="text-xs text-sky-600 flex items-center">ทั้งหมด <ChevronRight size={14} /></button>
            </div>
            {recent.length ? recent.map((t) => <TxnRow key={t.id} t={t} catById={catById} accById={accById} onClick={() => onEdit(t)} />) : (
              <Empty icon="sparkles" title="ยังไม่มีรายการ" text="กด + เพื่อบันทึกรายการแรก" action={<Button onClick={() => onAdd()}><Plus size={18} /> บันทึกรายการ</Button>} />
            )}
          </section>

          {/* more (collapsible) */}
          <button onClick={() => setUi({ homeMore: !homeMore })} className="w-full flex items-center justify-between px-2 text-sm text-slate-500">
            <span>ภาพรวมเพิ่มเติม</span><ChevronDown size={16} className={`transition ${homeMore ? 'rotate-180' : ''}`} />
          </button>
          {homeMore && (
            <>
              <section className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold">เดือนนี้</div>
                  {stats.rate !== null && <span className={`text-xs px-2 py-1 rounded-lg ${stats.rate >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose'}`}>ออมได้ {Math.round(stats.rate * 100)}%</span>}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-xs text-slate-500">รายรับ</div><Money value={stats.inc} className="text-emerald-600 font-semibold" /></div>
                  <div><div className="text-xs text-slate-500">รายจ่าย</div><Money value={stats.exp} className="text-rose font-semibold" /></div>
                </div>
                {stats.top.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {stats.top.map(([cid, v]) => { const c = catById[cid]; return (
                      <div key={cid} className="flex items-center gap-2">
                        <IconBadge name={c?.icon} color={c?.color} size={26} icon={13} />
                        <div className="flex-1"><div className="flex justify-between text-xs"><span>{c?.name || 'อื่น ๆ'}</span><Money value={v} decimals={false} /></div>
                          <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(v / stats.exp) * 100}%`, background: c?.color }} /></div></div>
                      </div>) })}
                  </div>
                )}
              </section>
              <section className="grid grid-cols-2 gap-3">
                {[['ลงทุน', (summary.byType.invest || 0) + portfolio.value, 'trending', '#38bdf8', () => go('portfolio')], ['หนี้คงค้าง', -summary.debts, 'card', '#fb7185', () => go('money')]].map(([l, v, ic, col, fn]) => (
                  <button key={l} onClick={fn} className="card p-3.5 text-left hover:bg-slate-50">
                    <div className="flex items-center gap-2 text-xs text-slate-500"><IconBadge name={ic} color={col} size={26} icon={13} />{l}</div>
                    <Money value={v} decimals={false} className="text-lg font-semibold mt-1 block" />
                  </button>
                ))}
              </section>
              {portfolio.open.length > 0 && (
                <section className="card p-3">
                  <button onClick={() => go('portfolio')} className="w-full flex items-center justify-between text-left mb-1">
                    <span className="font-semibold">พอร์ต <span className="text-xs text-slate-500 font-normal">· <Money value={portfolio.value} decimals={false} /></span></span>
                    <span className={`text-xs num ${portfolio.pnl >= 0 ? 'text-emerald-600' : 'text-rose'}`}>{portfolio.pnl >= 0 ? '+' : ''}{(portfolio.pnlPct * 100).toFixed(2)}%</span>
                  </button>
                  {portfolio.open.slice(0, 4).map((h) => (
                    <div key={h.asset.id} className="flex items-center gap-2 py-1 text-sm">
                      <AssetLogo asset={h.asset} size={26} /><span className="flex-1 truncate">{assetLabel(h.asset)}</span>
                      <span className={`text-xs num ${h.pnlPct >= 0 ? 'text-emerald-600' : 'text-rose'}`}>{h.pnlPct >= 0 ? '+' : ''}{(h.pnlPct * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
