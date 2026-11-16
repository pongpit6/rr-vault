import { useEffect } from 'react'
import { useStore } from '../store'
import { useHabits, HABITS, addDays, doneOf } from '../lib/habits'
import { HabitsToday, openHabit } from '../components/HabitKit'
import { todayISO } from '../lib/format'

/** "นิสัย": today's checklist, the week's quest, the life rank and a 12-week heatmap per habit. */
export default function Habits() {
  const H = useHabits()
  const quick = useStore((s) => s.ui.habitQuick)
  useEffect(() => { if (quick) openHabit(H.by.exercise.today >= 1 ? 'read' : 'exercise') }, [quick]) // eslint-disable-line
  const today = todayISO()
  const weeks = typeof window !== 'undefined' && window.innerWidth < 640 ? 6 : 12
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(today, i - (weeks * 7 - 1)))
  const noSpend = useStore((s) => s.items.rpg?.data?.noSpend) || {}
  return (
    <div className="space-y-4" data-testid="habits-screen">
      <section className="hero p-5 relative overflow-hidden" data-testid="life-card">
        <div className="text-xs text-white/75">ยศแห่งวินัย · เฉลี่ย 30 วันของ 6 นิสัย</div>
        <div className="flex items-end gap-3 mt-1">
          <span className="text-4xl">{H.lifeRank.emoji}</span>
          <div><div className="text-2xl font-bold leading-tight">{H.lifeRank.name}</div><div className="text-sm text-white/80 num">{Math.round(H.life * 100)}% ของวันทำครบ</div></div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">เควสต์สัปดาห์</div><b className="text-sm num">{Math.min(5, H.thisWeek)}/5 วัน</b> <span className="text-white/70">→ 1 🪙</span></div>
          <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">FIAT วันนี้</div><b className="text-sm num">+{H.todayFiat}</b>{H.mult > 1.01 && <span className="text-white/70"> ×{H.mult.toFixed(1)}</span>}</div>
          <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">GOLD จากนิสัย</div><b className="text-sm num">{H.gold} 🪙</b></div>
        </div>
      </section>

      <HabitsToday />

      <section className="card p-4" data-testid="habit-heatmap">
        <div className="flex items-baseline justify-between mb-3"><div className="font-semibold text-sm">{weeks} สัปดาห์ล่าสุด</div><div className="text-[11px] text-slate-500">แตะชื่อเพื่อดูรายละเอียด</div></div>
        <div className="space-y-2.5">
          {HABITS.map((h) => (
            <div key={h.id} className="flex items-center gap-2">
              <button onClick={() => h.id !== 'nospend' && openHabit(h.id)} className="w-20 shrink-0 text-left text-xs truncate">{h.emoji} {h.short}</button>
              <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${weeks * 7}, minmax(0,1fr))` }}>
                {cells.map((d) => {
                  const v = h.id === 'nospend' ? (noSpend[d] ? 1 : 0) : doneOf(h.id, { date: d, ...(H.days[d] || {}) })
                  return <span key={d} className="h-3.5 rounded-[2px]" style={{ background: v >= 1 ? h.color : v > 0 ? `${h.color}66` : 'rgba(15,23,42,.06)' }} />
                })}
              </div>
              <span className="w-10 text-right text-[11px] num" style={{ color: h.color }}>🔥{H.by[h.id].streak}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center" data-testid="habit-totals">
        <Total emoji="📖" v={`${H.finished.length} เล่ม`} sub={`${H.pagesTotal.toLocaleString()} หน้า`} onClick={() => openHabit('read')} />
        <Total emoji="💪" v={`${(H.reps.push + H.reps.squat + H.reps.sit).toLocaleString()} ครั้ง`} sub={`วิดพื้น ${H.reps.push.toLocaleString()}`} onClick={() => openHabit('exercise')} />
        <Total emoji="🧘" v={`${Math.floor(H.medMin / 60)} ชม. ${H.medMin % 60} น.`} sub="สมาธิสะสม" onClick={() => openHabit('meditate')} />
        <Total emoji="🔤" v={`${H.learnt} คำ`} sub="จำได้แล้ว" onClick={() => openHabit('vocab')} />
      </section>
    </div>
  )
}
function Total({ emoji, v, sub, onClick }) {
  return <button onClick={onClick} className="px-inner p-3 hover:bg-slate-900/[.02]"><div className="text-xl">{emoji}</div><div className="font-semibold text-sm num mt-1">{v}</div><div className="text-[11px] text-slate-500">{sub}</div></button>
}
