import { useEffect, useMemo, useState } from 'react'
import { Sparkles, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { Sheet, Button, Money } from './ui'
import { useStore, selectList } from '../store'
import { useVault } from '../lib/useVault'
import { usePrices, fxUSDTHB } from '../lib/prices'
import { analyze, toReport } from '../lib/insights'
import { money, shortDate, todayISO } from '../lib/format'

const pctTxt = (x) => `${Math.round(x * 100)}%`

/** Analysis of the last 30 days, or null when the feature is off. */
export function useInsights() {
  const v = useVault()
  const items = useStore((s) => s.items)
  const fx = usePrices((s) => fxUSDTHB(s.quotes))
  const on = !!v.settings.insights?.enabled
  const subs = useMemo(() => selectList(items, 'sub'), [items])
  return useMemo(() => (on ? analyze({ ...v, subs, fx }) : null), // eslint-disable-line
    [on, v.txns.length, v.txns[0]?.id, JSON.stringify(v.settings.allocation), JSON.stringify(v.balances), subs.length, todayISO()])
}

/** Writes a report every 30 days (and right away when switched on with enough history). */
export function InsightsRunner() {
  const a = useInsights()
  const settings = useStore((s) => s.items.settings?.data)
  const put = useStore((s) => s.put)
  const setUi = useStore((s) => s.setUi)
  const showToast = useStore((s) => s.showToast)
  useEffect(() => {
    if (!a?.ready || !settings) return
    const reports = settings.insightReports || []
    const last = reports[reports.length - 1]
    if (last && Date.now() - Date.parse(last.at) < 30 * 86400000) return
    const r = toReport(a)
    put('settings', { ...settings, insightReports: [...reports.slice(-11), r] })
    setUi({ reportUnseen: true })
    showToast('สรุปการใช้เงิน 30 วันพร้อมแล้ว — ดูที่หน้าแรก')
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        navigator.serviceWorker?.ready.then((reg) => reg.showNotification('สรุปการใช้เงิน 30 วัน', { body: `${r.cls.icon} สไตล์ของคุณ: ${r.cls.name} · ใช้ไป ${money(r.expense, { decimals: false })}`, tag: 'insight-report', icon: './icon-192.png', data: { url: './#home' } }))
      }
    } catch { /* notifications unavailable */ }
  }, [a?.ready, a?.to]) // eslint-disable-line
  return null
}

/** Home: the newest report (until seen) or the learning progress. */
export function HomeInsightCard() {
  const settings = useStore((s) => s.items.settings?.data) || {}
  const unseen = useStore((s) => s.ui.reportUnseen)
  const setUi = useStore((s) => s.setUi)
  const a = useInsights()
  const [open, setOpen] = useState(false)
  if (!settings.insights?.enabled || !a) return null
  const last = (settings.insightReports || []).slice(-1)[0]
  if (!a.ready) {
    return (
      <div className="card p-4" data-testid="insight-learning">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 grid place-items-center shrink-0"><Sparkles size={20} /></div>
          <div className="flex-1 min-w-0"><div className="font-semibold">กำลังเรียนรู้สไตล์การใช้เงินของคุณ</div><div className="text-xs text-slate-500">เก็บข้อมูลแล้ว {a.historyDays}/30 วัน · ครบแล้วจะสรุปและแนะนำสัดส่วนให้</div></div>
        </div>
        <div className="ui-progress h-2 rounded-full bg-slate-900/[.05] overflow-hidden mt-3"><div className="h-full rounded-full grad-bg" style={{ width: `${(a.historyDays / 30) * 100}%` }} /></div>
      </div>
    )
  }
  if (!last || (!unseen && !open)) return null
  return (
    <>
      <button onClick={() => { setOpen(true); setUi({ reportUnseen: false }) }} className="w-full card p-4 text-left flex items-center gap-3 border-2 border-violet-200" data-testid="insight-report-card">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 grid place-items-center text-2xl shrink-0">{last.cls.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-violet-600">สรุป 30 วันพร้อมแล้ว</div>
          <div className="font-bold leading-tight">สไตล์ของคุณ: {last.cls.name}</div>
          <div className="text-xs text-slate-500 truncate">ใช้ไป {money(last.expense, { decimals: false })}{last.suggestion?.worth ? ' · มีคำแนะนำปรับสัดส่วน' : ''}</div>
        </div>
        <ChevronRight size={18} className="text-slate-400" />
      </button>
      <ReportSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

/** Money page: live style + suggestion (feeds the allocation editor). */
export function StyleCard({ onSuggest }) {
  const a = useInsights()
  const settings = useStore((s) => s.items.settings?.data) || {}
  const [open, setOpen] = useState(false)
  if (!settings.insights?.enabled || !a) return null
  const m = a.cur
  return (
    <section className="card p-4 space-y-3" data-testid="style-card">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 grid place-items-center text-2xl shrink-0">{a.cls.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-violet-600">สไตล์การใช้เงิน 30 วันล่าสุด{a.ready ? '' : ` (ข้อมูล ${a.historyDays}/30 วัน)`}</div>
          <div className="font-bold">{a.cls.name}</div>
          <div className="text-xs text-slate-500">จุดเด่น: {a.cls.good}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2"><div className="text-[10px] text-slate-500">ใช้ต่อวัน</div><Money value={m.perDay} decimals={false} className="font-semibold text-sm" /></div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2"><div className="text-[10px] text-slate-500">ออมได้</div><div className="font-semibold text-sm">{m.income ? pctTxt(m.saveRate) : '—'}</div></div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2"><div className="text-[10px] text-slate-500">รูดบัตร</div><div className="font-semibold text-sm">{pctTxt(m.cardShare)}</div></div>
      </div>
      {m.cats.length > 0 && (
        <div>
          <div className="flex h-2.5 rounded-full overflow-hidden">{m.cats.slice(0, 6).map((c) => <span key={c.id} style={{ width: `${c.share * 100}%`, background: c.color }} />)}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-slate-600">{m.cats.slice(0, 4).map((c) => <span key={c.id} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c.color }} />{c.name} {pctTxt(c.share)}</span>)}</div>
        </div>
      )}
      <div className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2.5">ระวัง: {a.cls.watch}{a.tight.negative ? ` · เงินใช้ได้ติดลบ ${a.tight.negative} วัน` : ''}</div>
      {a.suggestion && (
        <div className={`rounded-xl p-3 border ${a.suggestion.worth ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'}`} data-testid="style-suggestion">
          <div className="text-sm font-semibold">{a.suggestion.worth ? 'แนะนำสัดส่วนที่เหมาะกับคุณ' : 'สัดส่วนตอนนี้เหมาะกับการใช้เงินจริงแล้ว'}</div>
          <div className="text-sm mt-1 tabular-nums">กันหนี้ <b>{a.suggestion.pct.reserve}%</b> · ใช้ได้ <b>{a.suggestion.pct.cash}%</b> · ลงทุน <b>{a.suggestion.pct.invest}%</b></div>
          {a.suggestion.reasons.length > 0 && <ul className="text-[11px] text-slate-600 mt-1 list-disc pl-4">{a.suggestion.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          {a.suggestion.worth && <Button className="w-full mt-2 !py-2 text-sm" onClick={() => onSuggest?.(a.suggestion.pct)} data-testid="use-suggestion">ใช้คำแนะนำนี้ (ยังต้องกดยืนยัน)</Button>}
        </div>
      )}
      {(settings.insightReports || []).length > 0 && <button onClick={() => setOpen(true)} className="text-xs font-semibold text-sky-600">ดูสรุปรายเดือนย้อนหลัง ({settings.insightReports.length})</button>}
      <ReportSheet open={open} onClose={() => setOpen(false)} />
    </section>
  )
}

export function ReportSheet({ open, onClose }) {
  const reports = useStore((s) => s.items.settings?.data?.insightReports) || []
  const [i, setI] = useState(null)
  const idx = i ?? reports.length - 1
  const r = reports[idx]
  if (!open) return null
  return (
    <Sheet open={open} onClose={onClose} title="สรุปการใช้เงิน 30 วัน" wide>
      {!r ? <div className="text-sm text-slate-500">ยังไม่มีสรุป</div> : (
        <div className="space-y-4" data-testid="report-sheet">
          {reports.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">{reports.map((x, j) => <button key={x.at} onClick={() => setI(j)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${j === idx ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>{shortDate(x.to)}</button>)}</div>
          )}
          <div className="text-xs text-slate-500">{shortDate(r.from)} – {shortDate(r.to)}</div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 grid place-items-center text-3xl">{r.cls.icon}</div>
            <div><div className="text-xs text-violet-600 font-semibold">สไตล์ของคุณเดือนนี้</div><div className="text-lg font-bold">{r.cls.name}</div><div className="text-xs text-slate-500">{r.cls.good}</div></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><div className="text-[11px] text-slate-500">ใช้ไปทั้งหมด</div><Money value={r.expense} decimals={false} className="font-bold" />
              {r.expenseChange != null && <div className={`text-[11px] flex items-center gap-0.5 ${r.expenseChange > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{r.expenseChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(Math.round(r.expenseChange * 100))}% จาก 30 วันก่อน</div>}</div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><div className="text-[11px] text-slate-500">เฉลี่ยต่อวัน</div><Money value={r.perDay} decimals={false} className="font-bold" /></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><div className="text-[11px] text-slate-500">รายรับ</div><Money value={r.income} decimals={false} className="font-bold" /></div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5"><div className="text-[11px] text-slate-500">ออมได้</div><div className="font-bold">{r.income ? pctTxt(r.saveRate) : '—'}</div></div>
          </div>
          <div>
            <div className="text-sm font-semibold mb-1.5">ใช้เงินไปกับอะไร</div>
            {r.topCats.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-sm py-1">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} /><span className="flex-1">{c.name}</span>
                <span className="text-xs text-slate-500">{pctTxt(c.share)}</span><Money value={c.amount} decimals={false} className="w-24 text-right font-semibold" />
              </div>
            ))}
          </div>
          {r.changes.length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-1.5">เปลี่ยนไปจาก 30 วันก่อน</div>
              {r.changes.map((c) => <div key={c.id} className="text-sm flex justify-between py-0.5"><span>{c.name}</span><span className={c.delta > 0 ? 'text-rose-600' : 'text-emerald-600'}>{c.delta > 0 ? '+' : '−'}{money(Math.abs(c.delta), { decimals: false })}</span></div>)}
            </div>
          )}
          {r.big.length > 0 && <div className="text-sm"><div className="font-semibold mb-1">รายจ่ายก้อนใหญ่</div>{r.big.map((b) => <div key={b.date + b.note} className="flex justify-between text-slate-600 py-0.5"><span>{b.note} · {shortDate(b.date)}</span><span>{money(b.amount, { decimals: false })}</span></div>)}</div>}
          <div className="text-sm bg-amber-50 text-amber-800 rounded-xl p-3">ข้อควรระวัง: {r.cls.watch}{r.tight?.negative ? ` · เงินใช้ได้ติดลบ ${r.tight.negative} วัน` : ''}</div>
          {r.suggestion && (
            <div className="rounded-xl p-3 border border-emerald-300 bg-emerald-50/60">
              <div className="font-semibold text-sm">{r.suggestion.worth ? 'คำแนะนำสัดส่วนแบ่งเงิน' : 'สัดส่วนที่ใช้อยู่เหมาะแล้ว'}</div>
              <div className="text-sm mt-1">กันหนี้ {r.suggestion.pct.reserve}% · ใช้ได้ {r.suggestion.pct.cash}% · ลงทุน {r.suggestion.pct.invest}%</div>
              {r.suggestion.reasons?.length > 0 && <ul className="text-[11px] text-slate-600 mt-1 list-disc pl-4">{r.suggestion.reasons.map((x) => <li key={x}>{x}</li>)}</ul>}
              <div className="text-[11px] text-slate-500 mt-1">ไปที่แท็บ “เงิน” เพื่อกด “ใช้คำแนะนำนี้” แล้วยืนยัน</div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}

/** Settings switch. Turning it on learns from the last 30 days straight away. */
export function InsightsToggle() {
  const settings = useStore((s) => s.items.settings?.data) || {}
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const on = !!settings.insights?.enabled
  return (
    <button onClick={() => { put('settings', { ...settings, insights: { ...(settings.insights || {}), enabled: !on, since: on ? settings.insights?.since : new Date().toISOString() } }); if (!on) showToast('เปิดแล้ว — วิเคราะห์จากรายการย้อนหลัง 30 วันให้ทันที') }}
      className="w-full flex items-center gap-3 p-4 text-left" data-testid="insights-toggle">
      <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 grid place-items-center shrink-0"><Sparkles size={18} /></div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">แนะนำสัดส่วนอัตโนมัติ</div>
        <div className="text-xs text-slate-500">เรียนรู้สไตล์การใช้เงินจากรายการย้อนหลัง 30 วัน สรุปทุก 30 วัน และแนะนำสัดส่วนแบ่งเงิน (คำนวณในเครื่อง ไม่ส่งข้อมูลออก)</div>
      </div>
      <span className={`w-10 h-[22px] rounded-full p-0.5 shrink-0 ${on ? 'bg-ac' : 'bg-slate-900/10'}`}><span className={`block w-[18px] h-[18px] rounded-full bg-white transition ${on ? 'translate-x-[18px]' : ''}`} /></span>
    </button>
  )
}
