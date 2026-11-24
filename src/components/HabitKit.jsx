import { Emo } from './px'
import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Moon, Sun, Play, Pause, RotateCcw, BookOpen, Trash2, Utensils, X } from './px'
import { Sheet, Button } from './ui'
import { useStore } from '../store'
import { useRpg } from '../lib/rpg'
import { HABITS, HABIT_BY_ID, MOVES, SETS, REPS, SLEEP_TARGET, BACKFILL_DAYS, useHabits, fastingOf, addDays, doneOf } from '../lib/habits'
import VocabSheet from './VocabKit'
import { sfx, bell } from '../lib/sfx'
import { todayISO } from '../lib/format'

const tTime = (iso) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
const tDate = (iso) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
const hrs = (h) => { const m = Math.max(0, Math.round(h * 60)); return `${Math.floor(m / 60)} ชม. ${m % 60} นาที` }

/** Opens a habit sheet from anywhere (home grid, habits screen, FAB). */
export const openHabit = (id) => useStore.getState().setUi({ habitOpen: id })

/* ---------------- the one-line row used on Home and on the Habits screen ---------------- */
export function HabitRow({ h, H, rpg, big = false }) {
  const s = H.by[h.id]
  const showToast = useStore((st) => st.showToast)
  const done = s.today >= 1, partial = s.today > 0 && s.today < 1
  let status = '', action = null
  const quick = (fn, msg) => (e) => { e.stopPropagation(); fn(); sfx('coin'); if (msg) showToast(msg) }
  switch (h.id) {
    case 'read': {
      const b = H.reading[0]
      status = b ? `${b.title} · ${b.pages ? Math.round(((b.page || 0) / b.pages) * 100) : 0}%` : 'เพิ่มหนังสือที่กำลังอ่าน'
      if (H.dayOf().read?.pages) status = `วันนี้ ${H.dayOf().read.pages} หน้า · ${status}`
      break
    }
    case 'exercise': {
      const ex = H.dayOf().exercise || {}
      const sets = MOVES.reduce((a, m) => a + Math.min(SETS, ex[m.id] || 0), 0)
      status = ex.rest ? 'วันพัก (ไม่มีรางวัล)' : sets ? `${sets}/${SETS * MOVES.length} เซ็ต` : `วิดพื้น · สควอท · ซิทอัพ ${SETS}×${REPS}`
      if (!done && !ex.rest) action = <MiniBtn onClick={quick(() => H.allSets(), '💪 ทำครบทุกท่าแล้ว!')} label="ทำครบ" color={h.color} testid="q-exercise" />
      break
    }
    case 'meditate': status = H.dayOf().meditate ? `วันนี้ ${H.dayOf().meditate} นาที` : 'อย่างน้อย 5 นาที'; break
    case 'sleep': {
      const sl = H.dayOf().sleep
      if (H.sleeping) { status = `เข้านอน ${tTime(H.sleeping)} · กดเมื่อตื่น`; action = <MiniBtn onClick={quick(() => { const r = H.wakeUp(); if (r) showToast(`☀️ นอนไป ${hrs(r.hours)}${r.onTime ? ' · เข้านอนตรงเวลา' : ''}`) })} label="ตื่นแล้ว" color={h.color} icon={<Sun size={13} />} testid="q-wake" /> }
      else {
        status = sl ? `นอน ${hrs(sl.hours)}${sl.onTime ? ' · ตรงเวลา' : ''}` : `เป้า ≥6 ชม. · เข้านอนก่อน ${SLEEP_TARGET}`
        const hour = new Date().getHours()
        if (hour >= 18 || hour < 4) action = <MiniBtn onClick={quick(() => H.goToBed(), '🌙 ราตรีสวัสดิ์ กดตื่นแล้วตอนเช้านะ')} label="เข้านอน" color={h.color} icon={<Moon size={13} />} testid="q-bed" />
      }
      break
    }
    case 'nocarb': {
      const f = fastingOf(H.lastMeal, H.fastHours)
      status = f ? `อดมาแล้ว ${Math.floor(f.since)} ชม.${f.done ? ' · ครบแล้ว' : ` · กินได้ ${tTime(f.next.toISOString())}`}` : 'กดเมื่อวันนี้ไม่กินแป้งเลย'
      if (!done) action = <MiniBtn onClick={quick(() => H.toggleNoCarb(), '🥗 ไม่กินแป้ง/น้ำตาล สุดยอด!')} label="ไม่กิน" color={h.color} testid="q-nocarb" />
      break
    }
    case 'vocab': status = H.dayOf().vocab?.rounds ? `วันนี้ ${H.dayOf().vocab.rounds} รอบ · จำได้ ${H.learnt} คำ` : `จำได้แล้ว ${H.learnt} คำ`; break
    case 'nospend': {
      status = rpg.spentToday ? 'วันนี้มีรายจ่ายแล้ว' : done ? 'วันนี้ไม่ใช้เงิน' : `+${rpg.noSpendReward.fiat} FIAT${rpg.noSpendReward.gold ? ` +${rpg.noSpendReward.gold} GOLD (วันเลขเบิ้ล ${rpg.noSpendReward.sale})` : ''} ถ้าวันนี้ไม่ใช้เงิน`
      if (!done && !rpg.spentToday) action = <MiniBtn onClick={quick(() => { const r = rpg.markNoSpend(); if (r) showToast(`✨ วันไม่ใช้เงิน · +${r.fiat} FIAT${r.gold ? ` +${r.gold} GOLD 🛍️` : ''}`) })} label="ยืนยัน" color={h.color} testid="q-nospend" />
      break
    }
  }
  const tappable = h.id !== 'nospend'
  return (
    <div role={tappable ? 'button' : undefined} tabIndex={tappable ? 0 : undefined} onClick={tappable ? () => openHabit(h.id) : undefined}
      className={`habit-row flex items-center gap-3 ${big ? 'py-3' : 'py-2.5'} px-3 ${tappable ? 'cursor-pointer hover:bg-slate-900/[.025]' : ''}`} data-testid={`habit-${h.id}`}>
      <span className={`habit-ico grid place-items-center shrink-0 ${big ? 'w-11 h-11 text-xl' : 'w-9 h-9 text-lg'}`} style={{ background: `${h.color}1a`, color: h.color }}>
        {done ? <Check size={big ? 20 : 17} strokeWidth={3} /> : <Emo k={`hb_${h.id}`} e={h.emoji} size={big ? 26 : 22} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="truncate">{h.name}</span>
          {s.streak > 0 && <span className="text-[10px] font-bold px-1.5 rounded" style={{ background: `${h.color}1a`, color: h.color }}><Emo e="🔥" size={11} />{s.streak}</span>}
        </div>
        <div className="text-[11px] text-slate-500 truncate">{status}</div>
        {partial && <div className="h-1 mt-1 rounded-full bg-slate-900/[.06] overflow-hidden"><div className="h-full" style={{ width: `${s.today * 100}%`, background: h.color }} /></div>}
      </div>
      {action}
    </div>
  )
}
function MiniBtn({ onClick, label, color, icon, testid }) {
  return <button onClick={onClick} data-testid={testid} className="habit-btn shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 text-white" style={{ background: color }}>{icon}{label}</button>
}

/** Today's habits as one card. */
export function HabitsToday({ compact = false }) {
  const H = useHabits()
  const rpg = useRpg()
  const doneN = HABITS.filter((h) => H.by[h.id].today >= 1).length
  return (
    <section className="card overflow-hidden" data-testid="habits-today">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div>
          <div className="font-semibold text-sm">นิสัยวันนี้</div>
          <div className="text-[11px] text-slate-500">ทำแล้ว {doneN}/{HABITS.length} · +{H.todayFiat} FIAT วันนี้{H.mult > 1.01 ? ` · streak ×${H.mult.toFixed(1)}` : ''}</div>
        </div>
        <div className="flex gap-0.5" aria-hidden="true">{HABITS.map((h) => <span key={h.id} className="w-2 h-5 rounded-sm" style={{ background: H.by[h.id].today >= 1 ? h.color : H.by[h.id].today > 0 ? `${h.color}66` : 'rgba(15,23,42,.08)' }} />)}</div>
      </div>
      <div className="divide-y divide-slate-900/[.06]">
        {HABITS.map((h) => <HabitRow key={h.id} h={h} H={H} rpg={rpg} big={!compact} />)}
      </div>
    </section>
  )
}

/* ---------------- 5-week calendar strip shared by every sheet (the last 7 days can be fixed) ---------------- */
function MonthDots({ id, H }) {
  const today = todayISO()
  const rpg = useRpg()
  const [pick, setPick] = useState(null)
  const cells = Array.from({ length: 35 }, (_, i) => addDays(today, i - 34))
  const h = HABIT_BY_ID[id]
  const noSpend = useStore((s) => s.items.rpg?.data?.noSpend) || {}
  const valOf = (d) => (id === 'nospend' ? (noSpend[d] ? 1 : 0) : doneOf(id, { date: d, ...(H.days[d] || {}) }))
  const editable = (d) => d >= addDays(today, -BACKFILL_DAYS) && d <= today
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
        <span>5 สัปดาห์ล่าสุด</span>
        <span>streak <b className="text-slate-800">{H.by[id].streak}</b> · ดีที่สุด <b className="text-slate-800">{H.by[id].best}</b> · รวม {H.by[id].total} วัน</span>
      </div>
      <div className="grid grid-cols-7 gap-1 max-w-[280px]" data-testid="month-dots">
        {cells.map((d) => {
          const v = valOf(d), ed = editable(d)
          const style = { background: v >= 1 ? h.color : v > 0 ? `${h.color}66` : 'rgba(15,23,42,.06)' }
          const ring = d === pick ? 'ring-2 ring-amber-500' : d === today ? 'ring-2 ring-slate-800/40' : ed ? 'ring-1 ring-slate-400/60 ring-dashed' : ''
          return ed
            ? <button key={d} type="button" title={`${tDate(d)} · แตะเพื่อแก้`} onClick={() => setPick(pick === d ? null : d)} className={`aspect-square rounded-[3px] ${ring}`} style={style} data-testid={`dot-${d}`} />
            : <span key={d} title={tDate(d)} className={`aspect-square rounded-[3px] ${ring}`} style={style} />
        })}
      </div>
      <div className="text-[10px] text-slate-500 mt-1.5">ลืมกด? แตะช่องของ {BACKFILL_DAYS} วันล่าสุด (ขอบประ) เพื่อลงย้อนหลังได้</div>
      {pick && <DayFix id={id} d={pick} H={H} rpg={rpg} on={valOf(pick) >= 1} close={() => setPick(null)} />}
      <div className="text-[10px] text-slate-500 mt-1.5">GOLD จาก streak: 7 วัน = 1 · 30 วัน = 3 · 100 วัน = 10 (ได้ครั้งเดียวต่อขั้น) · ได้แล้ว {H.by[id].gold} 🪙</div>
    </div>
  )
}

/** fix one past day of one habit */
function DayFix({ id, d, H, rpg, on, close }) {
  const [pages, setPages] = useState(10)
  const [min, setMin] = useState(10)
  const [bed, setBed] = useState('21:30')
  const [wake, setWake] = useState('05:30')
  const label = d === todayISO() ? 'วันนี้' : tDate(d)
  const done = (v) => { H.setDone(id, d, true, v); sfx('coin'); close() }
  const undo = () => { H.setDone(id, d, false); sfx('click'); close() }
  const box = (children) => <div className="mt-2 px-inner p-3 space-y-2 text-sm" data-testid="day-fix"><div className="flex items-center"><b className="flex-1">{label}</b><button onClick={close} aria-label="ปิด"><X size={15} /></button></div>{children}</div>
  if (id === 'nospend') {
    if (on) return box(<div className="text-xs text-slate-500">วันนี้บันทึกเป็นวันไม่ใช้เงินแล้ว</div>)
    if (d === todayISO()) return box(<div className="text-xs text-slate-500">วันนี้ใช้ปุ่ม “วันนี้ไม่ใช้เงิน” ด้านบน</div>)
    return box(rpg.canNoSpendOn(d)
      ? <Button className="w-full !py-2" onClick={() => { rpg.markNoSpendOn(d); sfx('coin'); close() }} data-testid="fix-nospend">✨ วันนี้ไม่ได้ใช้เงินเลย (+30 FIAT)</Button>
      : <div className="text-xs text-slate-500">{rpg.spentOn(d) ? 'วันนั้นมีรายการใช้จ่ายอยู่ จึงนับเป็นวันไม่ใช้เงินไม่ได้' : 'ลงย้อนหลังได้ไม่เกิน 7 วัน'}</div>)
  }
  const inp = 'field !py-1.5 !w-24 text-center num'
  return box(<>
    {id === 'read' && <div className="flex items-center gap-2">อ่านไป <input className={inp} inputMode="numeric" value={pages} onChange={(e) => setPages(+e.target.value.replace(/\D/g, '') || 0)} /> หน้า</div>}
    {id === 'meditate' && <div className="flex items-center gap-2">นั่งสมาธิ <input className={inp} inputMode="numeric" value={min} onChange={(e) => setMin(+e.target.value.replace(/\D/g, '') || 0)} /> นาที</div>}
    {id === 'sleep' && <div className="flex flex-wrap items-center gap-2">เข้านอน <input type="time" className="field !py-1.5 !w-auto" value={bed} onChange={(e) => setBed(e.target.value)} /> ตื่น <input type="time" className="field !py-1.5 !w-auto" value={wake} onChange={(e) => setWake(e.target.value)} /></div>}
    <div className="flex gap-2">
      <Button className="flex-1 !py-2" onClick={() => done({ pages, min, bed, wake })} data-testid="fix-done">{on ? 'บันทึกใหม่' : { exercise: '💪 ออกกำลังกายครบแล้ว', nocarb: '🥗 ไม่กินแป้งวันนั้น', vocab: '🔤 ท่องศัพท์แล้ว' }[id] || '✓ ทำแล้ว'}</Button>
      {on && <Button variant="ghost" className="!py-2" onClick={undo} data-testid="fix-undo">ยกเลิกวันนั้น</Button>}
    </div>
  </>)
}

/* ---------------- sheets ---------------- */
export function HabitHost() {
  const open = useStore((s) => s.ui.habitOpen)
  const setUi = useStore((s) => s.setUi)
  const close = () => setUi({ habitOpen: null })
  const h = open && HABIT_BY_ID[open]
  if (!open) return null
  return (
    <Sheet open={!!open} onClose={close} title={h ? `${h.emoji} ${h.name}` : ''} wide={open === 'read' || open === 'vocab'}>
      <HabitSheetBody id={open} close={close} />
    </Sheet>
  )
}
function HabitSheetBody({ id, close }) {
  const H = useHabits()
  return (
    <div className="space-y-5" data-testid={`sheet-${id}`}>
      {id === 'read' && <ReadSheet H={H} />}
      {id === 'exercise' && <ExerciseSheet H={H} />}
      {id === 'meditate' && <MeditateSheet H={H} />}
      {id === 'sleep' && <SleepSheet H={H} />}
      {id === 'nocarb' && <NoCarbSheet H={H} />}
      {id === 'vocab' && <VocabSheet H={H} close={close} />}
      {id !== 'vocab' && <MonthDots id={id} H={H} />}
    </div>
  )
}

/* ---- read ---- */
function ReadSheet({ H }) {
  const [adding, setAdding] = useState(!H.reading.length)
  const [form, setForm] = useState({ title: '', author: '', pages: '' })
  const showToast = useStore((s) => s.showToast)
  const remove = useStore((s) => s.remove)
  const add = () => { if (!form.title || !+form.pages) return; H.saveBook({ title: form.title.trim(), author: form.author.trim(), pages: +form.pages, color: SPINES[Math.floor(Math.random() * SPINES.length)] }); setForm({ title: '', author: '', pages: '' }); setAdding(false); sfx('save') }
  return (
    <>
      {H.reading.map((b) => <BookCard key={b.id} b={b} H={H} onDone={(r) => showToast(r.done ? `🎉 อ่านจบ "${b.title}" แล้ว! +2 GOLD · ขึ้นชั้นหนังสือ` : `📖 +${r.delta} หน้า`)} onRemove={() => remove(b.id, { label: 'ลบหนังสือแล้ว' })} />)}
      {adding ? (
        <div className="px-inner p-3 space-y-2" data-testid="book-form">
          <div className="text-sm font-semibold">เพิ่มหนังสือที่กำลังอ่าน</div>
          <input className="field" placeholder="ชื่อหนังสือ" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="book-title" />
          <div className="grid grid-cols-2 gap-2">
            <input className="field" placeholder="ผู้เขียน (ไม่ใส่ก็ได้)" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <input className="field num" type="number" inputMode="numeric" placeholder="จำนวนหน้า" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} data-testid="book-pages" />
          </div>
          <div className="flex gap-2">{H.reading.length > 0 && <Button variant="ghost" className="flex-1 !py-2" onClick={() => setAdding(false)}>ยกเลิก</Button>}<Button className="flex-1 !py-2" onClick={add} disabled={!form.title || !+form.pages} data-testid="book-add">เพิ่มหนังสือ</Button></div>
        </div>
      ) : <button onClick={() => setAdding(true)} className="ui-link text-sm font-semibold flex items-center gap-1"><Plus size={15} /> เพิ่มหนังสืออีกเล่ม</button>}
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="อ่านรวม" v={`${H.pagesTotal.toLocaleString()} หน้า`} />
        <Stat label="อ่านจบ" v={`${H.finished.length} เล่ม`} />
        <Stat label="เฉลี่ย 30 วัน" v={`${Math.round(Object.entries(H.days).filter(([d]) => d > addDays(todayISO(), -30)).reduce((s, [, d]) => s + (d.read?.pages || 0), 0) / 30)} หน้า/วัน`} />
      </div>
      <Shelf books={H.finished} />
    </>
  )
}
const SPINES = ['#b91c1c', '#1d4ed8', '#047857', '#7c3aed', '#b45309', '#be185d', '#0e7490', '#4d7c0f']
function BookCard({ b, H, onDone, onRemove }) {
  const [page, setPage] = useState('')
  const pct = b.pages ? Math.min(1, (b.page || 0) / b.pages) : 0
  const log = (b.log || []).slice(-14)
  const first = log[0], speed = log.length > 1 ? (log[log.length - 1].page - (first?.page || 0)) / Math.max(1, (new Date(log[log.length - 1].date) - new Date(first.date)) / 86400000 || 1) : null
  const left = b.pages - (b.page || 0)
  const eta = speed > 0 ? addDays(todayISO(), Math.ceil(left / speed)) : null
  const save = (to) => { const r = H.readTo(b, to); if (r.delta || r.done) { sfx(r.done ? 'levelup' : 'coin'); onDone(r) } setPage('') }
  return (
    <div className="px-inner p-3" data-testid="book-card">
      <div className="flex gap-3">
        <div className="w-12 h-16 shrink-0 grid place-items-center text-white" style={{ background: b.color || '#1d4ed8', boxShadow: 'inset -4px 0 0 rgba(0,0,0,.2)' }}><BookOpen size={18} /></div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{b.title}</div>
          <div className="text-[11px] text-slate-500 truncate">{b.author || 'ไม่ระบุผู้เขียน'} · {b.pages} หน้า</div>
          <div className="px-hp mt-1.5"><div style={{ width: `${pct * 100}%`, background: '#4f46e5' }} /></div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>หน้า <b className="text-slate-800 num">{b.page || 0}</b> / {b.pages} · <b className="text-indigo-600">{Math.round(pct * 100)}%</b></span>
            <span>{eta ? `คาดว่าจบ ${tDate(eta)}` : `เหลือ ${left} หน้า`}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <input className="field !py-2 flex-1 num" type="number" inputMode="numeric" placeholder={`อ่านถึงหน้าที่… (ตอนนี้ ${b.page || 0})`} value={page} onChange={(e) => setPage(e.target.value)} data-testid="book-page" />
        <Button className="!py-2 !px-4" disabled={!page} onClick={() => save(+page)} data-testid="book-save">บันทึก</Button>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {[5, 10, 20, 30].map((n) => <button key={n} onClick={() => save((b.page || 0) + n)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-900/[.03]">+{n} หน้า</button>)}
        <button onClick={() => save(b.pages)} className="text-xs px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50">อ่านจบแล้ว</button>
        <button onClick={onRemove} className="ml-auto text-xs px-2 py-1 text-slate-400 hover:text-rose-600" aria-label="ลบ"><Trash2 size={14} /></button>
      </div>
    </div>
  )
}
function Shelf({ books }) {
  if (!books.length) return <div className="px-inner p-3 text-xs text-slate-500 text-center">📚 ชั้นหนังสือยังว่าง อ่านจบเล่มแรกแล้วจะขึ้นมาอยู่ที่นี่</div>
  return (
    <div data-testid="shelf">
      <div className="text-sm font-semibold mb-2">📚 ชั้นหนังสือ · อ่านจบ {books.length} เล่ม</div>
      <div className="shelf px-2 pt-3 pb-0 flex items-end gap-1 overflow-x-auto no-scrollbar">
        {books.map((b) => (
          <div key={b.id} title={`${b.title} · จบ ${tDate(b.finishedAt)}`} className="shelf-book shrink-0 flex flex-col items-center justify-end text-white text-[9px] leading-tight px-0.5 py-1"
            style={{ background: b.color || '#1d4ed8', height: 52 + Math.min(40, (b.pages || 100) / 12), width: 22 + Math.min(14, (b.pages || 100) / 60) }}>
            <span className="[writing-mode:vertical-rl] rotate-180 truncate max-h-full">{b.title}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 space-y-1">
        {books.slice(0, 5).map((b) => <div key={b.id} className="flex justify-between text-xs"><span className="truncate"><Emo e="✅" size={12} /> {b.title}</span><span className="text-slate-500 shrink-0 ml-2">{b.pages} หน้า · จบ {tDate(b.finishedAt)}</span></div>)}
      </div>
    </div>
  )
}

/* ---- exercise ---- */
function ExerciseSheet({ H }) {
  const ex = H.dayOf().exercise || {}
  const sets = MOVES.reduce((a, m) => a + Math.min(SETS, ex[m.id] || 0), 0)
  return (
    <>
      <div className="text-xs text-slate-500">กดทีละเซ็ตเมื่อทำเสร็จ ({SETS} เซ็ต × {REPS} ครั้ง) ทำบางส่วนได้รางวัลบางส่วน ทำครบได้เต็ม · ไม่จำกัดเวลา</div>
      {MOVES.map((m) => (
        <div key={m.id} className="px-inner p-3 flex items-center gap-3" data-testid={`move-${m.id}`}>
          <span className="text-2xl w-9 text-center grid place-items-center"><Emo k={{ push: 'hb_exercise', squat: 'hb_squat', sit: 'sk_streak3' }[m.id]} e={m.emoji} size={28} /></span>
          <div className="flex-1">
            <div className="text-sm font-semibold">{m.name} <span className="text-[11px] font-normal text-slate-500">{(Math.min(SETS, ex[m.id] || 0)) * REPS}/{SETS * REPS} ครั้ง · สะสม {H.reps[m.id].toLocaleString()}</span></div>
            <div className="flex gap-1.5 mt-1.5">
              {Array.from({ length: SETS }, (_, i) => {
                const on = (ex[m.id] || 0) > i
                return <button key={i} onClick={() => { H.setSets(m.id, on && (ex[m.id] || 0) === i + 1 ? i : i + 1); sfx('click') }} className="flex-1 h-9 text-xs font-bold border-2" style={{ background: on ? '#f97316' : 'transparent', color: on ? '#fff' : '#94a3b8', borderColor: on ? '#c2410c' : 'rgba(148,163,184,.4)' }} aria-label={`${m.name} เซ็ต ${i + 1}`}>{on ? '✓' : i + 1}</button>
              })}
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => { H.allSets(); sfx('levelup') }} disabled={sets >= SETS * MOVES.length} data-testid="ex-all"><Check size={16} /> ทำครบทุกท่า</Button>
        <Button variant="ghost" className="flex-1" onClick={() => H.restDay()} data-testid="ex-rest">{ex.rest ? 'ยกเลิกวันพัก' : '😌 วันนี้พัก'}</Button>
      </div>
      {ex.rest && <div className="text-xs text-slate-500 text-center">วันพักไม่ได้รางวัล และไม่นับ streak แต่ร่างกายก็ต้องการพักบ้าง</div>}
    </>
  )
}

/* ---- meditate ---- */
function MeditateSheet({ H }) {
  const [goal, setGoal] = useState(5)
  const [left, setLeft] = useState(null) // seconds
  const [run, setRun] = useState(false)
  const started = useRef(null), credited = useRef(0)
  useEffect(() => {
    if (!run) return
    const iv = setInterval(() => setLeft((l) => {
      if (l <= 1) { setRun(false); bell(); const mins = goal - credited.current; if (mins > 0) H.addMeditation(mins); credited.current = goal; useStore.getState().showToast(`🧘 สมาธิครบ ${goal} นาที`); return 0 }
      return l - 1
    }), 1000)
    return () => clearInterval(iv)
  }, [run]) // eslint-disable-line
  const start = () => { if (left == null || left === 0) { setLeft(goal * 60); credited.current = 0 } started.current = Date.now(); setRun(true); bell() }
  const stop = () => { setRun(false); const doneMin = Math.floor((goal * 60 - (left || 0)) / 60) - credited.current; if (doneMin > 0) { H.addMeditation(doneMin); credited.current += doneMin } }
  const reset = () => { setRun(false); setLeft(null) }
  const sec = left ?? goal * 60, pct = 1 - sec / (goal * 60)
  return (
    <>
      <div className="flex flex-col items-center py-2">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90"><circle cx="50" cy="50" r="44" fill="none" stroke="rgba(13,148,136,.15)" strokeWidth="8" /><circle cx="50" cy="50" r="44" fill="none" stroke="#0d9488" strokeWidth="8" strokeDasharray={`${pct * 276.5} 276.5`} strokeLinecap="butt" /></svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div><div className="num text-4xl font-bold" data-testid="med-clock">{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</div><div className="text-[11px] text-slate-500">{run ? 'หายใจช้าๆ…' : left === 0 ? 'ครบแล้ว 🙏' : 'พร้อมเมื่อไหร่ก็เริ่ม'}</div></div>
          </div>
        </div>
        <div className="flex gap-1.5 mt-3">
          {[5, 10, 15, 20, 30].map((m) => <button key={m} disabled={run} onClick={() => { setGoal(m); setLeft(null) }} className={`text-xs px-3 py-1.5 border ${goal === m ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200'}`}>{m} นาที</button>)}
        </div>
        <div className="flex gap-2 mt-3 w-full">
          {run ? <Button className="flex-1" onClick={stop}><Pause size={16} /> หยุด</Button> : <Button className="flex-1" onClick={start} data-testid="med-start"><Play size={16} /> {left ? 'ทำต่อ' : 'เริ่ม'}</Button>}
          <Button variant="ghost" onClick={reset} aria-label="เริ่มใหม่"><RotateCcw size={16} /></Button>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>วันนี้ <b className="num">{H.dayOf().meditate || 0}</b> นาที · สะสม <b className="num">{Math.floor(H.medMin / 60)}</b> ชม. {H.medMin % 60} นาที</span>
        <button onClick={() => { H.addMeditation(5); sfx('coin') }} className="ui-link text-xs font-semibold" data-testid="med-add5">+ บันทึก 5 นาที (ทำเองแล้ว)</button>
      </div>
    </>
  )
}

/* ---- sleep ---- */
function SleepSheet({ H }) {
  const showToast = useStore((s) => s.showToast)
  const today = todayISO()
  const [bed, setBed] = useState(`${addDays(today, -1)}T21:30`)
  const [wake, setWake] = useState(`${today}T05:30`)
  const nights = H.sleeps.slice(-14)
  return (
    <>
      <div className="px-inner p-4 text-center" style={{ background: 'linear-gradient(180deg, rgba(124,58,237,.10), transparent)' }}>
        {H.sleeping ? (
          <>
            <div className="text-sm">เข้านอนเมื่อ <b>{tTime(H.sleeping)}</b> · ผ่านไป {hrs((Date.now() - new Date(H.sleeping)) / 3600000)}</div>
            <div className="flex gap-2 mt-3"><Button className="flex-1" onClick={() => { const r = H.wakeUp(); if (r) showToast(`☀️ นอนไป ${hrs(r.hours)}`) }} data-testid="sleep-wake"><Sun size={16} /> ตื่นแล้ว</Button><Button variant="ghost" onClick={H.cancelBed}>ยกเลิก</Button></div>
          </>
        ) : (
          <>
            <div className="text-sm">เป้าหมาย: เข้านอนก่อน <b>{SLEEP_TARGET}</b> · นอน ≥ 6 ชม. (8 ชม. ได้รางวัลมากกว่า)</div>
            <Button className="w-full mt-3" onClick={() => { H.goToBed(); showToast('🌙 ราตรีสวัสดิ์') }} data-testid="sleep-bed"><Moon size={16} /> เข้านอนตอนนี้</Button>
          </>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="เฉลี่ย 7 คืน" v={H.avgSleep ? `${H.avgSleep.toFixed(1)} ชม.` : '—'} />
        <Stat label="ตรงเวลา 14 คืน" v={`${nights.filter((n) => n.onTime).length} คืน`} />
        <Stat label="≥ 8 ชม." v={`${nights.filter((n) => n.hours >= 8).length} คืน`} />
      </div>
      {nights.length > 0 && (
        <div>
          <div className="text-xs font-medium mb-1.5">14 คืนล่าสุด</div>
          <div className="flex items-end gap-1 h-24 border-b border-slate-900/10 relative">
            <span className="absolute inset-x-0 border-t border-dashed border-violet-400/60" style={{ bottom: `${(6 / 10) * 100}%` }} />
            {nights.map((n) => <div key={n.date} className="flex-1 max-w-[28px] flex flex-col items-center justify-end h-full" title={`${tDate(n.date)} · ${n.hours} ชม.`}><div className="w-full" style={{ height: `${Math.min(1, n.hours / 10) * 100}%`, background: n.hours >= 8 ? '#7c3aed' : n.hours >= 6 ? '#a78bfa' : '#f43f5e', opacity: n.onTime ? 1 : 0.6 }} /></div>)}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{tDate(nights[0].date)}</span><span>เส้นประ = 6 ชม. · สีจาง = เข้านอนเกินเวลา</span></div>
        </div>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-500 text-xs">ลืมกด? บันทึกย้อนหลัง</summary>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="text-[11px] text-slate-500">เข้านอน<input type="datetime-local" className="field !py-2 mt-0.5" value={bed} onChange={(e) => setBed(e.target.value)} /></label>
          <label className="text-[11px] text-slate-500">ตื่น<input type="datetime-local" className="field !py-2 mt-0.5" value={wake} onChange={(e) => setWake(e.target.value)} /></label>
        </div>
        <Button variant="ghost" className="w-full mt-2 !py-2" onClick={() => { H.setSleep(new Date(bed).toISOString(), new Date(wake).toISOString()); showToast('บันทึกการนอนแล้ว') }}>บันทึก</Button>
      </details>
    </>
  )
}

/* ---- no carb + intermittent fasting ---- */
function NoCarbSheet({ H }) {
  const d = H.dayOf()
  const [, tick] = useState(0)
  useEffect(() => { const iv = setInterval(() => tick((x) => x + 1), 30000); return () => clearInterval(iv) }, [])
  const f = fastingOf(H.lastMeal, H.fastHours)
  return (
    <>
      <button onClick={() => { H.toggleNoCarb(); sfx(d.nocarb ? 'click' : 'coin') }} className="w-full px-inner p-4 flex items-center gap-3 text-left" style={d.nocarb ? { background: 'rgba(22,163,74,.12)' } : undefined} data-testid="nocarb-toggle">
        <Emo e={d.nocarb ? '✅' : '🥗'} size={34} />
        <div className="flex-1"><div className="font-semibold">{d.nocarb ? 'วันนี้ไม่กินแป้งและน้ำตาล' : 'วันนี้ไม่กินแป้งหรือน้ำตาลเลย?'}</div><div className="text-xs text-slate-500">{d.nocarb ? 'แตะอีกครั้งเพื่อยกเลิก' : 'แตะเพื่อยืนยัน · +20 FIAT · ติดกันหลายวันยิ่งดี'}</div></div>
      </button>
      <div className="px-inner p-4 space-y-3" data-testid="fasting">
        <div className="flex items-center justify-between"><div className="font-semibold text-sm">⏱️ IF · อดอาหารเป็นช่วง</div>
          <select className="field !py-1 !w-auto text-xs" value={H.fastHours} onChange={(e) => H.setFastHours(+e.target.value)}>{[12, 14, 16, 18, 20].map((n) => <option key={n} value={n}>{n}:{24 - n}</option>)}</select>
        </div>
        {f ? (
          <>
            <div className="text-sm">มื้อล่าสุด <b>{tTime(H.lastMeal)}</b> ({tDate(new Date(H.lastMeal).toLocaleDateString('sv-SE'))}) · อดมาแล้ว <b className="num">{hrs(f.since)}</b></div>
            <div className="px-hp"><div style={{ width: `${f.pct * 100}%`, background: '#16a34a' }} /></div>
            <div className="text-xs text-slate-500">{f.done ? '✅ ครบช่วงอดแล้ว กินได้' : `กินมื้อถัดไปได้ตอน ${tTime(f.next.toISOString())} (อีก ${hrs((f.next - Date.now()) / 3600000)})`}</div>
          </>
        ) : <div className="text-xs text-slate-500">กด "เพิ่งกินเสร็จ" หลังมื้อสุดท้าย แอปจะนับเวลาอดให้</div>}
        <Button variant="ghost" className="w-full !py-2" onClick={() => { H.ateNow(); sfx('click') }} data-testid="ate-now"><Utensils size={15} /> เพิ่งกินเสร็จ</Button>
        <MealLater H={H} />
        {(d.meals || []).length > 0 && <div className="text-[11px] text-slate-500">มื้อวันนี้: {(d.meals || []).map(tTime).join(' · ')}</div>}
      </div>
    </>
  )
}

/** forgot to tap after a meal: log it with the real time (up to 7 days back) */
function MealLater({ H }) {
  const [open, setOpen] = useState(false)
  const pad = (n) => String(n).padStart(2, '0')
  const local = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
  const [at, setAt] = useState(() => local(new Date(Date.now() - 2 * 3600000)))
  const min = local(new Date(Date.now() - BACKFILL_DAYS * 86400000)), max = local(new Date())
  if (!open) return <button className="w-full text-xs ui-link" onClick={() => setOpen(true)} data-testid="meal-later">ลืมกด? บันทึกมื้อย้อนหลัง</button>
  const ok = at >= min && at <= max
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="meal-later-form">
      <span>กินไปตอน</span>
      <input type="datetime-local" className="field !py-1.5 !w-auto" min={min} max={max} value={at} onChange={(e) => setAt(e.target.value)} />
      <Button className="!py-1.5" disabled={!ok} onClick={() => { H.ateNow(new Date(at).toISOString()); sfx('click'); setOpen(false) }} data-testid="meal-later-save">บันทึก</Button>
      {!ok && <span className="text-[11px] text-rose-600">ย้อนหลังได้ไม่เกิน {BACKFILL_DAYS} วัน และต้องไม่ใช่เวลาในอนาคต</span>}
    </div>
  )
}

function Stat({ label, v }) {
  return <div className="px-inner px-2 py-2"><div className="text-[10px] text-slate-500">{label}</div><div className="text-sm font-semibold num">{v}</div></div>
}
