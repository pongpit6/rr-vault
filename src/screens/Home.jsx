import { useEffect, useMemo, useRef, useState } from 'react'
import { Settings as Cog, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, ShieldCheck, ChevronRight, Cloud, CloudOff, RefreshCw, Plus } from 'lucide-react'
import { Avatar, Money, IconBadge, Progress, Empty, Button } from '../components/ui'
import TxnRow from '../components/TxnRow'
import { SubLogo, AssetLogo } from '../components/Logos'
import { useSubs } from './Subscriptions'
import { upcoming } from '../lib/subs'
import { budgetStatus, goalStatus } from '../lib/plan'
import { selectList } from '../store'
import { RpgHomeCard } from '../components/RpgBits'
import { useRpg } from '../lib/rpg'
import { useStore, useProfile } from '../store'
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
  if (!session) return <span title="ใช้งานแบบออฟไลน์" className="p-2 text-slate-500"><CloudOff size={18} /></span>
  const spinning = sync.state === 'syncing'
  const color = sync.state === 'error' ? 'text-rose' : dirty ? 'text-amber' : 'text-emerald-600'
  return (
    <button onClick={syncNow} title={sync.error || (dirty ? `รอซิงก์ ${dirty} รายการ` : 'ซิงก์แล้ว')} className={`p-2 rounded-full hover:bg-slate-900/[.04] ${color}`}>
      {spinning ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
    </button>
  )
}

export default function Home({ onAdd, onEdit, go }) {
  const profile = useProfile()
  const privacy = useStore((s) => s.ui.privacy)
  const setUi = useStore((s) => s.setUi)
  const { accounts, txns, balances, summary, catById, accById, portfolio, cycles } = useVault()
  const subs = useSubs()
  const items = useStore((s) => s.items)
  const budgets = useMemo(() => budgetStatus(selectList(items, 'budget'), txns).slice(0, 3), [items, txns])
  const goals = useMemo(() => selectList(items, 'goal').slice(0, 2), [items])
  const soon = useMemo(() => upcoming(subs, accounts, balances, 10, cycles), [subs, accounts, balances, cycles])
  const net = useCountUp(summary.net)
  const rpg = useRpg()

  const month = monthKey(todayISO())
  const stats = useMemo(() => {
    let inc = 0, exp = 0
    const byCat = {}
    for (const t of txns) {
      if (monthKey(t.date) !== month) continue
      if (t.kind === 'income') inc += t.amount
      if (t.kind === 'expense') { exp += t.amount; byCat[t.category] = (byCat[t.category] || 0) + t.amount }
    }
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4)
    return { inc: round2(inc), exp: round2(exp), top, rate: inc > 0 ? (inc - exp) / inc : null }
  }, [txns, month])

  const tiles = [
    { type: 'cash', label: 'เงินใช้ได้', icon: 'wallet', color: '#10b981' },
    { type: 'invest', label: 'ลงทุน (พอร์ต + เงินสด)', icon: 'trending', color: '#38bdf8', go: 'portfolio' },
    { type: 'reserve', label: 'กันชำระหนี้', icon: 'shield', color: '#a78bfa' },
    { type: 'debt', label: 'หนี้คงค้าง', icon: 'card', color: '#fb7185' },
  ]
  const tileValue = (type) => type === 'debt' ? -summary.debts : type === 'invest' ? (summary.byType.invest || 0) + portfolio.value : (summary.byType[type] || 0)
  const recent = txns.slice(0, 6)

  return (
    <div className="space-y-5">
      {/* header */}
      <header className="flex items-center gap-3 pt-2">
        <button onClick={() => go('settings')}><Avatar size={46} /></button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500">{greeting()} 👋</div>
          <div className="font-semibold truncate">{profile.name} <span className="grad-text">Vault</span></div>
        </div>
        <SyncDot />
        <button onClick={() => setUi({ privacy: !privacy })} className="p-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" title="ซ่อน/แสดงตัวเลข">
          {privacy ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
        <button onClick={() => go('settings')} className="md:hidden p-2 -mr-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" title="ตั้งค่า"><Cog size={20} /></button>
      </header>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-5">
        <div className="space-y-5">
          {/* hero */}
          <section onClick={() => go('plan')} className="hero p-5 md:p-6 anim-pop relative overflow-hidden cursor-pointer">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full border border-white/20" />
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full border border-white/20" />
            <div className="text-sm text-white/70">มูลค่าสุทธิ (Net Worth)</div>
            <div className="mt-1 text-4xl md:text-5xl font-bold tracking-tight">
              {privacy ? <span className="num">฿ ••••••</span> : <span className="num">{money(net)}</span>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/15 px-3.5 py-3">
                <div className="text-xs text-white/60 flex items-center gap-1"><ArrowUpRight size={13} /> สินทรัพย์</div>
                <Money value={summary.assets} className="font-semibold" />
              </div>
              <div className="rounded-2xl bg-white/15 px-3.5 py-3">
                <div className="text-xs text-white/60 flex items-center gap-1"><ArrowDownLeft size={13} /> หนี้สิน</div>
                <Money value={summary.debts} className="font-semibold" />
              </div>
            </div>
          </section>

          <RpgHomeCard rpg={rpg} onOpen={() => go('vault')} />

          {/* wallet tiles */}
          <section className="grid grid-cols-2 gap-3">
            {tiles.map((t, i) => (
              <button key={t.type} onClick={() => go(t.go || 'wallets')} className="card p-4 text-left hover:bg-slate-900/[.05] transition anim-pop" style={{ animationDelay: `${60 * i}ms` }}>
                <div className="flex items-center justify-between">
                  <IconBadge name={t.icon} color={t.color} size={36} icon={17} />
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
                <div className="mt-3 text-xs text-slate-500">{t.label}</div>
                <Money value={tileValue(t.type)} className="text-lg font-semibold" />
              </button>
            ))}
          </section>

          {/* debt reserve coverage */}
          <section className="card p-4">
            <div className="flex items-center gap-3">
              <IconBadge name="shield" color="#a78bfa" size={36} icon={17} />
              <div className="flex-1">
                <div className="text-sm font-medium">เงินกันชำระหนี้รอบนี้</div>
                <div className="text-xs text-slate-500">
                  {summary.target > 0
                    ? summary.gap > 0 ? <>ยังขาดอีก <Money value={summary.gap} className="text-amber" /></> : 'ครอบคลุมหนี้รอบนี้ครบแล้ว ✨'
                    : 'ไม่มีหนี้ต้องจ่ายรอบนี้'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold num">{Math.round(summary.coverage * 100)}%</div>
              </div>
            </div>
            <Progress value={summary.coverage} className="mt-3" color={summary.coverage >= 1 ? 'bg-mint' : 'grad-bg'} />
            <div className="mt-2 flex justify-between text-[11px] text-slate-500 num">
              <span>กันไว้ <Money value={summary.reserve} /></span>
              <span>{Object.keys(cycles).length ? 'ยอดที่ต้องกันทั้งหมด' : 'ต้องจ่าย'} <Money value={summary.target} /></span>
            </div>
            {Object.entries(cycles).filter(([, c]) => c.owed > 0).map(([id, c]) => (
              <div key={id} className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5">
                <div className="font-semibold text-slate-700 text-[13px]">{accById[id]?.name}</div>
                <div className="flex justify-between"><span className={c.overdue ? 'text-rose font-semibold' : 'text-slate-600'}>บิลรอบนี้ · ครบกำหนด {shortDate(c.dueDate)}{c.overdue ? ' (เลยกำหนด)' : ''}</span><Money value={c.billDue} className={`font-semibold ${c.billDue > 0 ? '' : 'text-emerald-600'}`} /></div>
                {c.billDue <= 0 && c.billed > 0 && <div className="text-emerald-600">จ่ายบิลรอบนี้ครบแล้ว ✓</div>}
                <div className="flex justify-between text-slate-500"><span>รอบใหม่ (รูดหลัง {shortDate(c.stmtDate)}) · จ่าย {shortDate(c.nextDueDate)}</span><Money value={c.newCycle} /></div>
              </div>
            ))}
            {summary.target > 0 && summary.reserve > 0 && (
              <button onClick={() => onAdd({ kind: 'payment' })} className="mt-3 w-full py-2.5 rounded-xl bg-violet-400/10 hover:bg-violet-400/15 text-violet-600 text-sm font-medium flex items-center justify-center gap-2">
                <ShieldCheck size={16} /> บันทึกชำระหนี้
              </button>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {/* upcoming dues */}
          {soon.length > 0 && (
            <section className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">ใกล้ครบกำหนด</div>
                <button onClick={() => go('subs')} className="text-xs text-sky-600 flex items-center">Subscription <ChevronRight size={14} /></button>
              </div>
              <div className="space-y-1">
                {soon.slice(0, 5).map((u, i) => (
                  <button key={i} onClick={() => u.kind === 'debt' ? onAdd({ kind: 'payment', to: u.account.id }) : go('subs')} className="w-full flex items-center gap-3 py-2 text-left">
                    {u.kind === 'sub' ? <SubLogo sub={u.sub} size={36} /> : <IconBadge name={u.account.icon} color={u.account.color} size={36} icon={17} />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{u.kind === 'sub' ? u.sub.name : u.bill ? `จ่ายบิล ${u.account.name}` : `ครบกำหนด ${u.account.name}`}</div>
                      <div className={`text-xs ${u.days <= 2 ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>{u.days < 0 ? `เลยกำหนด ${-u.days} วัน` : u.days === 0 ? 'วันนี้' : u.days === 1 ? 'พรุ่งนี้' : `อีก ${u.days} วัน`}{u.bill ? ` · ภายใน ${shortDate(u.date)}` : ''}{u.kind === 'sub' && u.sub.auto ? ' · ตัดอัตโนมัติ' : ''}</div>
                    </div>
                    {u.kind === 'sub'
                      ? <span className="text-sm font-semibold num">{u.sub.currency === 'USD' ? `$${u.sub.amount}` : <Money value={u.sub.amount} decimals={false} />}</span>
                      : <Money value={u.amount} decimals={false} className="text-sm font-semibold" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* plan */}
          <section className="card p-4">
            <button onClick={() => go('plan')} className="w-full flex items-center justify-between text-left">
              <div className="font-semibold">งบประมาณ & เป้าหมาย</div>
              <span className="text-xs text-sky-600 flex items-center">วางแผน <ChevronRight size={14} /></span>
            </button>
            {budgets.length === 0 && goals.length === 0 ? (
              <button onClick={() => go('plan')} className="mt-2 w-full text-left text-sm text-slate-500">ตั้งงบรายหมวด เป้าหมายการออม และดูแผนปลดหนี้ได้ในหน้า “วางแผน” →</button>
            ) : (
              <div className="mt-3 space-y-3">
                {budgets.map((b) => {
                  const c = catById[b.category]
                  return (
                    <div key={b.id}>
                      <div className="flex justify-between text-xs"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: c?.color }} />{c?.name}</span><span className={`num ${b.status === 'over' ? 'text-rose font-semibold' : b.status === 'warn' ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>{Math.round(b.ratio * 100)}%</span></div>
                      <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className={`h-full rounded-full ${b.status === 'over' ? 'bg-rose-500' : b.status === 'warn' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, b.ratio * 100)}%` }} /></div>
                    </div>
                  )
                })}
                {goals.map((g) => {
                  const st = goalStatus(g, balances)
                  return (
                    <div key={g.id} className="flex items-center gap-2.5">
                      <IconBadge name={g.icon} color={g.color} size={30} icon={14} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs"><span>{g.name}</span><span className="num text-slate-500">{Math.round(st.ratio * 100)}%</span></div>
                        <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${st.ratio * 100}%`, background: g.color }} /></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* portfolio */}
          {portfolio.open.length > 0 && (
            <section className="card p-4">
              <button onClick={() => go('portfolio')} className="w-full flex items-center justify-between mb-2 text-left">
                <div>
                  <div className="font-semibold">พอร์ตลงทุน</div>
                  <div className="text-xs text-slate-500">มูลค่า <Money value={portfolio.value} decimals={false} /> · <span className={portfolio.pnl >= 0 ? 'text-emerald-600' : 'text-rose'}>{portfolio.pnl >= 0 ? '+' : ''}{(portfolio.pnlPct * 100).toFixed(2)}%</span></div>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </button>
              {portfolio.open.slice(0, 4).map((h) => (
                <button key={h.asset.id} onClick={() => go('portfolio')} className="w-full flex items-center gap-3 py-1.5 text-left">
                  <AssetLogo asset={h.asset} size={34} />
                  <span className="flex-1 text-sm font-medium truncate">{h.asset.source === 'yahoo' ? h.asset.symbol.replace('-USD', '') : h.asset.name}{h.live && <span className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse align-middle" />}</span>
                  <Money value={h.value} decimals={false} className="text-sm" />
                  <span className={`text-xs num w-14 text-right ${h.pnlPct >= 0 ? 'text-emerald-600' : 'text-rose'}`}>{h.pnlPct >= 0 ? '+' : ''}{(h.pnlPct * 100).toFixed(1)}%</span>
                </button>
              ))}
            </section>
          )}

          {/* this month */}
          <section className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">เดือนนี้</div>
              {stats.rate !== null && (
                <div className={`text-xs px-2 py-1 rounded-lg ${stats.rate >= 0 ? 'bg-mint/10 text-emerald-600' : 'bg-rose/10 text-rose'}`}>
                  ออมได้ {Math.round(stats.rate * 100)}%
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-500">รายรับ</div>
                <Money value={stats.inc} className="text-emerald-600 font-semibold" />
              </div>
              <div>
                <div className="text-xs text-slate-500">รายจ่าย</div>
                <Money value={stats.exp} className="text-rose font-semibold" />
              </div>
            </div>
            {stats.top.length > 0 && (
              <div className="mt-4 space-y-2.5">
                {stats.top.map(([cid, v]) => {
                  const c = catById[cid]
                  return (
                    <div key={cid} className="flex items-center gap-3">
                      <IconBadge name={c?.icon} color={c?.color} size={30} icon={14} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1"><span>{c?.name || 'อื่น ๆ'}</span><Money value={v} /></div>
                        <div className="h-1.5 rounded-full bg-slate-900/[.04] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(v / stats.exp) * 100}%`, background: c?.color }} /></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* recent */}
          <section className="card p-2">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <div className="font-semibold">รายการล่าสุด</div>
              <button onClick={() => go('txns')} className="text-xs text-sky flex items-center">ดูทั้งหมด <ChevronRight size={14} /></button>
            </div>
            {recent.length ? recent.map((t) => <TxnRow key={t.id} t={t} catById={catById} accById={accById} onClick={() => onEdit(t)} />) : (
              <Empty icon="sparkles" title="ยังไม่มีรายการ" text="เริ่มบันทึกรายการแรก แล้ว Vault จะเริ่มเติบโต"
                action={<Button onClick={() => onAdd()}><Plus size={18} /> บันทึกรายการแรก</Button>} />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
