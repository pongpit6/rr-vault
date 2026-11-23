import { HomeInsightCard } from '../components/Insights'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings as Cog, Eye, EyeOff, ChevronRight, ChevronDown, Landmark, Cloud, CloudOff, RefreshCw, Plus, ScanLine, Check } from 'lucide-react'
import { Avatar, Money, IconBadge, Empty, Button } from '../components/ui'
import TxnRow from '../components/TxnRow'
import { SubLogo, AssetLogo } from '../components/Logos'
import { useRpg } from '../lib/rpg'
import { sfx } from '../lib/sfx'
import { TownHomeCard } from '../components/TownTab'
import { HabitsToday } from '../components/HabitKit'
import { useSubs } from './Subscriptions'
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
  // real money in accounts (cash + reserve + saving + invest-cash); credit/loan and the market value of holdings stay out
  const liquid = round2(Math.max(0, (summary.byType.cash || 0) + (summary.byType.reserve || 0) + (summary.byType.saving || 0) + (summary.byType.invest || 0)))
  const split = [
    { key: 'cash', label: 'ใช้ได้เลย', v: Math.max(0, cash), color: '#ffffff', onClick: () => go('money') },
    { key: 'reserve', label: 'กันจ่ายหนี้', v: Math.max(0, summary.byType.reserve || 0), color: '#c4b5fd', onClick: () => go('money', 'plan') },
    { key: 'saving', label: 'ออมไว้', v: Math.max(0, summary.byType.saving || 0), color: '#99f6e4', onClick: () => go('money', 'plan') },
    { key: 'invest', label: 'รอลงทุน', v: Math.max(0, summary.byType.invest || 0), color: '#7dd3fc', onClick: () => go('portfolio') },
  ].filter((x) => x.v > 0)
  const budgetTotal = budgets.reduce((a, b) => a + b.limit, 0)
  const budgetLeft = round2(budgets.reduce((a, b) => a + b.left, 0))
  const recent = txns.slice(0, 5)
  const slipToday = useMemo(() => txns.filter((t) => t.fromSlip && t.date === todayISO()), [txns])
  const warnBudgets = budgets.filter((b) => b.status === 'over' || b.status === 'warn')

  const todos = []
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
  // payday: from the payday until the salary is logged (up to 5 days after)
  {
    const pd = settings.payday
    const d = new Date(), day = d.getDate(), dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const pday = Math.min(pd?.day || 0, dim)
    if (pd?.day && day >= pday && day <= pday + 5) {
      const since = `${month}-${String(pday).padStart(2, '0')}`
      const logged = txns.some((t) => t.kind === 'income' && t.category === 'cat-salary' && t.date >= since)
      if (!logged) todos.unshift({ key: 'payday', icon: <IconBadge name="briefcase" color="#10b981" size={36} icon={17} />, title: day === pday ? 'วันนี้เงินเดือนออก 🎉' : 'เงินเดือนออกแล้ว ยังไม่ได้บันทึก', sub: `บันทึก ${pd.amount ? money(pd.amount, { decimals: false }) : 'รายรับ'} แล้วแบ่งตามแผนในครั้งเดียว`, onClick: () => onAdd({ kind: 'income', amount: pd.amount || undefined, category: 'cat-salary', note: 'เงินเดือน' }) })
    }
  }
  if (summary.target > 0 && summary.gap > 0) todos.push({ key: 'gap', icon: <IconBadge name="shield" color="#a78bfa" size={36} icon={17} />, title: 'เงินใช้ได้ไม่พอกันจ่ายหนี้', sub: `ระบบกันเงินทั้งหมดที่มีให้หนี้แล้ว ยังขาดอีก ${money(summary.gap, { decimals: false })} · เงินเข้าครั้งหน้าจะเติมส่วนนี้ก่อน`, onClick: () => go('money', 'plan') })

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-2">
        <button onClick={() => go('settings')}><Avatar size={44} /></button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500">{greeting()} 👋</div>
          <div className="font-semibold truncate">{profile.name}</div>
        </div>
        <SyncDot />
        <button onClick={() => setUi({ privacy: !privacy })} className="p-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" title="ซ่อน/แสดงตัวเลข">{privacy ? <EyeOff size={20} /> : <Eye size={20} />}</button>
        <button onClick={() => go('settings')} className="p-2 -mr-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" title="ตั้งค่า"><Cog size={20} /></button>
      </header>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <div className="space-y-4">
          {/* money now: everything you have, then what's free to spend, then where the rest is parked */}
          <section className="hero p-4 md:p-5 anim-pop relative overflow-hidden" data-testid="hero">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full border border-white/20" />
            <button onClick={() => go('money')} className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white" data-testid="hero-total">
              <Landmark size={13} /> เงินทั้งหมดในบัญชี <b className="num text-white">{privacy ? '••••' : money(liquid, { decimals: false })}</b> <ChevronRight size={13} />
            </button>
            <div className="mt-1.5">
              <div className="text-sm text-white/75">ใช้ได้เลย</div>
              <Money value={cash} className="text-4xl font-bold tracking-tight" decimals={false} />
            </div>
            {liquid > 0 && (
              <div className="mt-3" data-testid="hero-split">
                <div className="flex h-2.5 rounded-full overflow-hidden bg-white/15">
                  {split.map((x) => <span key={x.key} style={{ width: `${(x.v / liquid) * 100}%`, background: x.color }} title={x.label} />)}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
                  {split.map((x) => (
                    <button key={x.key} onClick={x.onClick} className="flex items-center gap-1 text-white/85 hover:text-white">
                      <span className="w-2 h-2 rounded-sm" style={{ background: x.color }} />{x.label} <b className="num">{privacy ? '••' : money(x.v, { decimals: false })}</b>
                    </button>
                  ))}
                  {summary.receivable > 0 && <button onClick={() => go('money')} className="flex items-center gap-1 text-white/70 hover:text-white" data-testid="hero-recv"><span className="w-2 h-2 rounded-sm border border-white/70 border-dashed" />รอรับคืน <b className="num">{privacy ? '••' : money(summary.receivable, { decimals: false })}</b></button>}
                  {summary.portfolio > 0 && <button onClick={() => go('portfolio')} className="flex items-center gap-1 text-white/60 hover:text-white"><span className="w-2 h-2 rounded-sm border border-white/60" />ลงทุน (ราคาตลาด) <b className="num">{privacy ? '••' : money(summary.portfolio, { decimals: false })}</b></button>}
                </div>
              </div>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">วันนี้ใช้ไป</div><Money value={stats.today} decimals={false} className="font-semibold text-sm" /></div>
              {budgetTotal ? (
                <button onClick={() => go('money', 'plan')} className="rounded-2xl bg-white/15 px-3 py-2 text-left"><div className="text-white/70">เดือนนี้เหลือตามงบ</div><span className={`font-semibold text-sm num ${budgetLeft < 0 ? 'text-rose-200' : ''}`}>{privacy ? '••••' : money(budgetLeft, { decimals: false })}</span></button>
              ) : (
                <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">เดือนนี้ใช้ไป</div><Money value={stats.exp} decimals={false} className="font-semibold text-sm" /></div>
              )}
              <button onClick={() => go('money', 'plan')} className="rounded-2xl bg-white/15 px-3 py-2 text-left"><div className="text-white/70">มูลค่าสุทธิ</div><span className="font-semibold text-sm num">{privacy ? '••••' : money(net, { decimals: false })}</span></button>
            </div>
          </section>

          {/* the main action: import today's K PLUS slips */}
          <button onClick={() => setUi({ slipOpen: true })} data-testid="import-slips"
            className="w-full card px-4 py-3 flex items-center gap-3 text-left active:scale-[.99] transition">
            <div className="w-10 h-10 rounded-xl grad-bg text-white grid place-items-center shrink-0"><ScanLine size={20} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm leading-tight">นำเข้าสลิปวันนี้</div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                {slipToday.length ? <span className="text-emerald-700 inline-flex items-center gap-1"><Check size={14} /> วันนี้นำเข้าแล้ว {slipToday.length} สลิป · เพิ่มได้อีก</span> : 'เลือกรูปจากอัลบั้ม K PLUS แล้วบันทึกรวดเดียว'}
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-300 shrink-0" />
          </button>

          <TownHomeCard rpg={rpg} onOpen={() => go('vault')} />
          <HabitsToday compact />
        </div>

        <div className="space-y-4">
          {todos.length > 0 && (
            <section className="card p-2">
              <div className="px-3 pt-2 pb-1 text-sm font-semibold">วันนี้ต้องทำ</div>
              {todos.map((t) => <Todo key={t.key} {...t} />)}
            </section>
          )}

          <HomeInsightCard />
          {/* recent */}
          <section className="card p-2">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <div className="font-semibold">รายการล่าสุด</div>
              <button onClick={() => go('txns')} className="ui-link text-xs flex items-center">ทั้งหมด <ChevronRight size={14} /></button>
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

