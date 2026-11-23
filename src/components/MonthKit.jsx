import { useState } from 'react'
import { Swords, ScrollText } from './px'
import { Sheet } from './ui'
import { monthLabel } from '../lib/format'

const btn = 'px-3 py-1.5 text-xs font-semibold border-2 border-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300'

/** Monthly boss: pick one of three challenges (each set one step above last month), then beat it. */
export function MonthBossCard({ rpg }) {
  const B = rpg.monthBoss
  const [pick, setPick] = useState(null)
  if (!B) return null
  const c = B.chosen
  return (
    <section className="px-card p-4" data-testid="month-boss">
      <div className="flex items-center gap-2 mb-3">
        <Swords size={16} className="text-rose-600" />
        <h2 className="px-font text-[11px] tracking-wide flex-1">MONTH BOSS · {monthLabel(B.mk)}</h2>
        {c && <span className="text-[11px] text-amber-600 font-semibold">ชนะ = 🪙2 · 💵150</span>}
      </div>
      {c ? (
        <div className="flex items-center gap-3">
          <div className={`w-16 h-16 grid place-items-center bg-rose-50 border-2 border-slate-800 text-4xl shrink-0 ${B.done ? 'grayscale opacity-60' : 'anim-bob'}`}>{c.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">{c.boss}</div>
            <div className="text-xs text-slate-500">{c.name(c.target)}</div>
            <div className="px-hp mt-1.5"><div style={{ width: `${Math.max(0, 1 - B.progress / c.target) * 100}%` }} /></div>
            <div className="text-[11px] text-slate-500 mt-1 num">{B.done ? '🏆 ปราบได้แล้ว! ไปรับรางวัลที่เควสต์รายเดือน' : `ทำได้ ${B.progress}${c.unit === '%' ? '%' : ''} / ${c.target}${c.unit === '%' ? '%' : ` ${c.unit}`} · เหลือ HP ${Math.max(0, c.target - B.progress)}`}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="text-sm mb-2.5">เลือกบอสของเดือนนี้ 1 ตัว ทุกตัวตั้งเป้าสูงกว่าเดือนก่อนแค่หนึ่งก้าว เลือกแล้วเปลี่ยนไม่ได้จนจบเดือน</div>
          <div className="grid sm:grid-cols-3 gap-2">
            {B.options.map((o) => (
              <button key={o.id} onClick={() => setPick(o.id)} className={`px-inner p-3 text-left ${pick === o.id ? 'ring-2 ring-rose-500 bg-rose-50' : 'hover:bg-slate-900/[.02]'}`} data-testid={`boss-opt-${o.id}`}>
                <div className="text-2xl">{o.emoji}</div>
                <div className="font-semibold text-sm mt-1">{o.boss}</div>
                <div className="text-xs text-slate-600">{o.name(o.target)}</div>
                {o.lastValue != null && <div className="text-[10px] text-slate-400 mt-0.5">เดือนก่อน {o.lastValue}{o.unit === '%' ? '%' : ` ${o.unit}`}</div>}
              </button>
            ))}
          </div>
          <button className={`${btn} mt-3 bg-rose-500 text-white w-full`} disabled={!pick} onClick={() => rpg.chooseMonthBoss(pick)} data-testid="boss-choose">ท้าสู้บอสตัวนี้</button>
        </>
      )}
    </section>
  )
}

const Delta = ({ a, b, unit = '' }) => {
  if (b == null) return null
  const d = a - b
  if (!d) return <span className="text-slate-400">เท่าเดิม</span>
  return <span className={d > 0 ? 'text-emerald-600' : 'text-slate-400'}>{d > 0 ? '▲' : '▼'} {Math.abs(Math.round(d))}{unit}</span>
}

function compareRows(cur, prev) {
  return [
    ['🐷 ออม/ลงทุน', cur.saveRate == null ? '—' : `${Math.round(cur.saveRate * 100)}%`, cur.saveRate == null ? null : Math.round(cur.saveRate * 100), prev?.saveRate == null ? null : Math.round(prev.saveRate * 100), '%'],
    ['✨ วันไม่ใช้เงิน', `${cur.noSpendDays} วัน`, cur.noSpendDays, prev?.noSpendDays],
    ['📖 วันที่อ่าน', `${cur.habit.read} วัน`, cur.habit.read, prev?.habit.read],
    ['💪 วันออกกำลังกาย', `${cur.habit.exercise} วัน`, cur.habit.exercise, prev?.habit.exercise],
    ['🧘 วันทำสมาธิ', `${cur.habit.meditate} วัน`, cur.habit.meditate, prev?.habit.meditate],
    ['😴 นอนตรงเวลา', `${cur.habit.ontime} คืน`, cur.habit.ontime, prev?.habit.ontime],
    ['🥗 ไม่กินแป้ง', `${cur.habit.nocarb} วัน`, cur.habit.nocarb, prev?.habit.nocarb],
    ['🔤 ท่องศัพท์', `${cur.habit.vocab} วัน`, cur.habit.vocab, prev?.habit.vocab],
  ]
}

/** One month told as a chapter + a "you vs last month" table. */
export function MonthChapter({ stats, prev, chapter, label, vsLabel = 'เทียบกับเดือนก่อน' }) {
  return (
    <div data-testid="month-chapter">
      <div className="px-font text-[9px] text-amber-600">{label}</div>
      <div className="font-bold text-lg leading-tight mt-0.5">{chapter.title}</div>
      {chapter.quiet ? <div className="text-sm text-slate-500 mt-2">เดือนนี้ยังเงียบ ๆ ทุกการเดินทางเริ่มจากก้าวเล็ก ๆ</div> : (
        <ul className="mt-2 space-y-1.5">{chapter.lines.map((l, i) => <li key={i} className="flex gap-2 text-sm"><span>{l.icon}</span><span>{l.text}</span></li>)}</ul>
      )}
      <div className="mt-3 px-inner p-2.5">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs">
          <span className="text-slate-500">{prev ? vsLabel : 'สรุปตัวเลข'}</span><span /><span />
          {compareRows(stats, prev).map(([k, v, a, b, u]) => (
            <div key={k} className="contents"><span>{k}</span><b className="num text-right">{v}</b><span className="num text-right text-[11px]">{a == null ? '' : <Delta a={a} b={b} unit={u || ''} />}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Top of the adventure log: this month so far + last month's chapter. */
export function MonthRecapCard({ rpg }) {
  const C = rpg.chronicle
  const [showPrev, setShowPrev] = useState(false)
  if (!C) return null
  return (
    <section className="px-card p-4" data-testid="month-recap">
      <div className="flex items-center gap-2 mb-3">
        <ScrollText size={16} className="text-teal-600" />
        <h2 className="px-font text-[11px] tracking-wide flex-1">CHRONICLE · บทของเดือน</h2>
        {C.prev && <button className="text-xs ui-link" onClick={() => setShowPrev(!showPrev)}>{showPrev ? 'เดือนนี้' : 'ดูเดือนก่อน'}</button>}
      </div>
      {showPrev && C.prev
        ? <MonthChapter stats={C.prev} prev={null} chapter={C.prevChapter} label={`บทที่ผ่านมา · ${monthLabel(C.prev.mk)}`} />
        : <MonthChapter stats={C.cur} prev={C.prevSame} chapter={C.chapter} label={`บทปัจจุบัน · ${monthLabel(C.cur.mk)} (ยังเขียนอยู่)`} vsLabel={`เทียบเดือนก่อน ณ วันที่ ${new Date().getDate()}`} />}
    </section>
  )
}

/** Shown once at the start of a new month: last month's chapter, then choose the new boss. */
export function MonthEndSheet({ rpg }) {
  const C = rpg.chronicle
  const due = C?.prev && rpg.econData.recapSeen !== C.prev.mk && new Date().getDate() <= 10
  const [step, setStep] = useState(0)
  if (!due) return null
  const close = () => rpg.markMonthSeen(C.prev.mk)
  return (
    <Sheet open onClose={close} title={`📜 ปิดเล่ม ${monthLabel(C.prev.mk)}`}>
      {step === 0 ? (
        <>
          <MonthChapter stats={C.prev} prev={null} chapter={C.prevChapter} label="บทที่เพิ่งจบ" />
          <button className={`${btn} mt-4 w-full bg-teal-500 text-white`} onClick={() => (rpg.monthBoss.chosen ? close() : setStep(1))} data-testid="recap-next">{rpg.monthBoss.chosen ? 'ปิด' : 'ต่อไป: เลือกบอสเดือนนี้'}</button>
        </>
      ) : (
        <>
          <MonthBossCard rpg={rpg} />
          <button className={`${btn} mt-3 w-full bg-white`} onClick={close}>{rpg.monthBoss.chosen ? 'เริ่มเดือนใหม่' : 'ไว้เลือกทีหลัง'}</button>
        </>
      )}
    </Sheet>
  )
}
