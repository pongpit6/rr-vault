import { useMemo } from 'react'
import { useStore, selectList } from '../store'
import { todayISO } from './format'
import { VOCAB } from './vocab'

/**
 * Daily habits. Each day is its own synced item (id `hd-YYYY-MM-DD`, kind 'habitday') so two devices
 * editing different days never clash. Books are 'book' items, vocabulary progress lives in one 'vocab' item,
 * and transient state (asleep since…, last meal) in 'habit-state'.
 *
 * Economy: doing a habit pays FIAT (capped per day, ×up to 2 for streaks). GOLD only comes from milestones:
 * streak 7/30/100 (once each per habit, then every further 100), finishing a book, every 100 words learnt,
 * and one weekly quest (any habit on 5 of 7 days).
 */
export const HABITS = [
  { id: 'read', name: 'อ่านหนังสือ', short: 'อ่าน', emoji: '📖', color: '#4f46e5' },
  { id: 'exercise', name: 'ออกกำลังกาย', short: 'ออกกำลัง', emoji: '💪', color: '#f97316' },
  { id: 'meditate', name: 'นั่งสมาธิ', short: 'สมาธิ', emoji: '🧘', color: '#0d9488' },
  { id: 'sleep', name: 'นอนหลับ', short: 'นอน', emoji: '😴', color: '#7c3aed' },
  { id: 'nocarb', name: 'ไม่กินแป้ง/น้ำตาล', short: 'ไม่แป้ง', emoji: '🥗', color: '#16a34a' },
  { id: 'vocab', name: 'ท่องศัพท์', short: 'ศัพท์', emoji: '🔤', color: '#0284c7' },
  { id: 'nospend', name: 'ไม่ใช้เงิน', short: 'ไม่ใช้เงิน', emoji: '✨', color: '#d97706' },
]
export const HABIT_BY_ID = Object.fromEntries(HABITS.map((h) => [h.id, h]))
export const MOVES = [
  { id: 'push', name: 'วิดพื้น', emoji: '🙌' },
  { id: 'squat', name: 'สควอท', emoji: '🦵' },
  { id: 'sit', name: 'ซิทอัพ', emoji: '🔥' },
]
export const SETS = 4, REPS = 25
export const SLEEP_TARGET = '21:30'
export const DAILY_FIAT_CAP = 150

const dayId = (d) => `hd-${d}`
export const isoOf = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
export const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
const hm = (iso) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() }
const minsOf = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }

/** Did this day count for habit h? (and how strongly, 0–1) */
export function doneOf(h, day = {}, ctx = {}) {
  switch (h) {
    case 'read': return (day.read?.pages || 0) > 0 ? 1 : 0
    case 'exercise': { const ex = day.exercise || {}; const sets = MOVES.reduce((s, m) => s + Math.min(SETS, ex[m.id] || 0), 0); return ex.rest ? 0 : sets / (SETS * MOVES.length) }
    case 'meditate': return (day.meditate || 0) >= 5 ? 1 : 0
    case 'sleep': return day.sleep?.hours >= 6 ? 1 : 0
    case 'nocarb': return day.nocarb ? 1 : 0
    case 'vocab': return (day.vocab?.rounds || 0) > 0 ? 1 : 0
    case 'nospend': return ctx.noSpend?.[day.date] ? 1 : 0
    default: return 0
  }
}

/** FIAT for one habit on one day (before streak multiplier and the daily cap). */
export function fiatOf(h, day = {}, ctx = {}) {
  switch (h) {
    case 'read': return Math.min(30, Math.round(day.read?.pages || 0))
    case 'exercise': { const f = doneOf('exercise', day); return Math.round(f * 24 + (f >= 1 ? 6 : 0)) }
    case 'meditate': { const m = day.meditate || 0; return m >= 5 ? Math.min(30, 15 + (m - 5) * 2) : 0 }
    case 'sleep': { const s = day.sleep; if (!s?.hours) return 0; return (s.hours >= 8 ? 30 : s.hours >= 6 ? 15 : 0) + (s.onTime ? 10 : 0) }
    case 'nocarb': return day.nocarb ? 20 : 0
    case 'vocab': return Math.min(30, (day.vocab?.rounds || 0) * 10)
    default: return 0 // no-spend pays through its own button (rpg.markNoSpend)
  }
}

const MILESTONES = [[7, 1], [30, 3], [100, 10]]
/** GOLD earned from a habit's best streak: 7→1, 30→3, 100→10, then +10 per further 100. */
export const streakGold = (best) => MILESTONES.reduce((s, [n, g]) => s + (best >= n ? g : 0), 0) + (best >= 200 ? Math.floor((best - 100) / 100) * 10 : 0)

export function computeHabits({ days = {}, books = [], vocab = {}, state = {}, noSpend = {}, today = todayISO() }) {
  const ctx = { noSpend }
  const get = (d) => ({ date: d, ...(days[d] || {}) })
  const out = {}
  // rest days ("พักวันนี้" for the whole day, or the exercise rest toggle) pause a streak without breaking it
  const restOf = (id, day) => id !== 'nospend' && !!(day.pause || (id === 'exercise' && day.exercise?.rest))
  const recorded = Object.keys(days).concat(Object.keys(noSpend)).filter(Boolean).sort()
  const first = recorded[0] || today
  for (const h of HABITS) {
    // current streak: today counts if done, otherwise it is still "open" and yesterday's run stands
    let cur = 0
    let d = doneOf(h.id, get(today), ctx) > 0 ? today : addDays(today, -1)
    for (let guard = 0; guard < 2000 && d >= first; guard++) {
      const day = get(d)
      if (doneOf(h.id, day, ctx) > 0) cur++
      else if (!restOf(h.id, day)) break
      d = addDays(d, -1)
    }
    // best streak + totals, walking every calendar day since the first record
    let best = 0, run = 0, total = 0
    for (let x = first, guard = 0; x <= today && guard < 4000; x = addDays(x, 1), guard++) {
      const day = get(x)
      if (doneOf(h.id, day, ctx) > 0) { total++; run++; best = Math.max(best, run) } else if (!restOf(h.id, day) && x !== today) run = 0
    }
    best = Math.max(best, cur)
    // last 30 days hit-rate (rest days are left out of the count)
    let hit = 0, counted = 0
    for (let i = 0; i < 30; i++) { const day = get(addDays(today, -i)); if (restOf(h.id, day)) continue; counted++; hit += doneOf(h.id, day, ctx) > 0 ? 1 : 0 }
    out[h.id] = { ...h, today: doneOf(h.id, get(today), ctx), rest: restOf(h.id, get(today)), streak: cur, best, total, rate30: counted ? hit / counted : 0, gold: streakGold(best) }
  }
  // FIAT: per day, capped, with a streak multiplier from that day's run (approximated by the current streak for today)
  let fiat = 0
  for (const [d, day] of Object.entries(days)) {
    let f = 0
    for (const h of HABITS) f += fiatOf(h.id, { date: d, ...day }, ctx)
    fiat += Math.min(DAILY_FIAT_CAP, f)
  }
  const mult = 1 + Math.min(30, Math.max(...HABITS.map((h) => out[h.id].streak))) / 30 // up to ×2
  const todayFiat = Math.min(DAILY_FIAT_CAP, HABITS.reduce((s, h) => s + fiatOf(h.id, get(today), ctx), 0))
  fiat = Math.round(fiat + todayFiat * (mult - 1))

  // reading
  const finished = books.filter((b) => b.finishedAt).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  const reading = books.filter((b) => !b.finishedAt && !b.dropped)
  const pagesTotal = Object.values(days).reduce((s, d) => s + (d.read?.pages || 0), 0)
  // exercise
  const reps = Object.values(days).reduce((s, d) => { for (const m of MOVES) s[m.id] += Math.min(SETS, d.exercise?.[m.id] || 0) * REPS; return s }, { push: 0, squat: 0, sit: 0 })
  // meditation & sleep
  const medMin = Object.values(days).reduce((s, d) => s + (d.meditate || 0), 0)
  const sleeps = Object.entries(days).filter(([, d]) => d.sleep?.hours).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({ date, ...d.sleep }))
  const last7 = sleeps.filter((s) => s.date > addDays(today, -7))
  const avgSleep = last7.length ? last7.reduce((s, x) => s + x.hours, 0) / last7.length : null
  // vocab
  const cards = vocab.cards || {}
  const learnt = Object.values(cards).filter((c) => (c.box || 0) >= 3).length

  // weekly quest: any habit on ≥5 days of a week (Mon–Sun) → 1 GOLD; each rest day lowers the bar by one (never below 3)
  const weeks = new Map(), pauses = new Map()
  for (const d of Object.keys(days)) {
    const dt = new Date(d + 'T12:00:00'), mon = addDays(d, -((dt.getDay() + 6) % 7))
    if (HABITS.some((h) => h.id !== 'nospend' && doneOf(h.id, get(d), ctx) > 0)) weeks.set(mon, (weeks.get(mon) || 0) + 1)
    else if (days[d]?.pause) pauses.set(mon, (pauses.get(mon) || 0) + 1)
  }
  const weekGoal = (mon) => Math.max(3, 5 - (pauses.get(mon) || 0))
  const thisMon = addDays(today, -((new Date(today + 'T12:00:00').getDay() + 6) % 7))
  const weeklyGold = [...weeks.entries()].filter(([mon, n]) => n >= weekGoal(mon) && mon <= thisMon).length
  const thisWeek = weeks.get(thisMon) || 0
  const thisWeekGoal = weekGoal(thisMon)

  const gold = HABITS.reduce((s, h) => s + out[h.id].gold, 0) + finished.length * 2 + Math.floor(learnt / 100) + weeklyGold

  // life rank: average 30-day hit-rate of the six personal habits
  const core = HABITS.filter((h) => h.id !== 'nospend')
  const life = core.reduce((s, h) => s + out[h.id].rate30, 0) / core.length
  const lifeRank = life >= 0.8 ? { id: 'hero', name: 'วีรบุรุษแห่งวินัย', emoji: '🦸' } : life >= 0.6 ? { id: 'knight', name: 'อัศวินแห่งนิสัย', emoji: '🛡️' } : life >= 0.35 ? { id: 'squire', name: 'ผู้ฝึกตน', emoji: '⚔️' } : { id: 'novice', name: 'เริ่มต้นการเดินทาง', emoji: '🌱' }

  const activeDays = Object.keys(days).filter((d) => HABITS.some((h) => h.id !== 'nospend' && doneOf(h.id, get(d), ctx) > 0))
  return {
    by: out, activeDays, fiat, todayFiat, mult, gold, weeklyGold, thisWeek, thisWeekGoal, paused: !!days[today]?.pause, life, lifeRank,
    reading, finished, pagesTotal, reps, medMin, sleeps, avgSleep, learnt, sleeping: state.sleeping || null,
    lastMeal: state.lastMeal || null, fastHours: state.fastHours || 16,
  }
}

/* ---------- hook + actions ---------- */
export function useHabits() {
  const items = useStore((s) => s.items)
  const put = useStore((s) => s.put)
  const rpgNoSpend = useStore((s) => s.items.rpg?.data?.noSpend) || {}
  const days = useMemo(() => Object.fromEntries(selectList(items, 'habitday').map((d) => [d.date, d])), [items])
  const books = useMemo(() => selectList(items, 'book'), [items])
  const vocab = items.vocab && !items.vocab.deleted ? items.vocab.data : {}
  const state = items['habit-state'] && !items['habit-state'].deleted ? items['habit-state'].data : {}
  const today = todayISO()
  const H = useMemo(() => computeHabits({ days, books, vocab, state, noSpend: rpgNoSpend, today }), [days, books, vocab, state, rpgNoSpend, today])

  const dayOf = (d = today) => ({ date: d, ...(useStore.getState().items[dayId(d)]?.data || {}) })
  const patchDay = (patch, d = today) => { const cur = dayOf(d); put('habitday', { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch), id: dayId(d), date: d }) }
  const patchState = (p) => put('habit-state', { ...(useStore.getState().items['habit-state']?.data || {}), ...p, id: 'habit-state' })

  return {
    ...H, days, books, vocab, state, today, dayOf, patchDay,
    // exercise: +1 set of a move (or set exact), rest day toggle
    addSet: (move, d) => patchDay((c) => ({ exercise: { ...(c.exercise || {}), rest: false, [move]: Math.min(SETS, ((c.exercise || {})[move] || 0) + 1) } }), d),
    setSets: (move, n, d) => patchDay((c) => ({ exercise: { ...(c.exercise || {}), rest: false, [move]: Math.max(0, Math.min(SETS, n)) } }), d),
    allSets: (d) => patchDay({ exercise: { push: SETS, squat: SETS, sit: SETS, rest: false } }, d),
    restDay: (d) => patchDay((c) => ({ exercise: { ...(c.exercise || {}), rest: !(c.exercise || {}).rest } }), d),
    addMeditation: (min, d) => patchDay((c) => ({ meditate: Math.round((c.meditate || 0) + min) }), d),
    togglePause: (d) => patchDay((c) => ({ pause: !c.pause }), d),
    toggleNoCarb: (d) => patchDay((c) => ({ nocarb: !c.nocarb }), d),
    // sleep: bed now → wake now (sleep is credited to the wake day)
    goToBed: (at = new Date().toISOString()) => patchState({ sleeping: at }),
    cancelBed: () => patchState({ sleeping: null }),
    wakeUp: (at = new Date().toISOString(), bedAt) => {
      const bed = bedAt || useStore.getState().items['habit-state']?.data?.sleeping
      if (!bed) return null
      const hours = Math.max(0, (new Date(at) - new Date(bed)) / 3600000)
      if (hours > 16) { patchState({ sleeping: null }); return null }
      const b = hm(bed), onTime = b >= 18 * 60 ? b <= minsOf(SLEEP_TARGET) : false
      const wakeDay = isoOf(new Date(at))
      patchDay({ sleep: { bed, wake: at, hours: Math.round(hours * 10) / 10, onTime } }, wakeDay)
      patchState({ sleeping: null })
      return { hours, onTime }
    },
    setSleep: (bed, wake) => {
      const hours = Math.max(0, (new Date(wake) - new Date(bed)) / 3600000)
      const b = hm(bed), onTime = b >= 18 * 60 ? b <= minsOf(SLEEP_TARGET) : false
      patchDay({ sleep: { bed, wake, hours: Math.round(hours * 10) / 10, onTime } }, isoOf(new Date(wake)))
    },
    ateNow: (at = new Date().toISOString()) => { patchState({ lastMeal: at }); patchDay((c) => ({ meals: [...(c.meals || []), at].slice(-8) }), isoOf(new Date(at))) },
    setFastHours: (n) => patchState({ fastHours: n }),
    // reading
    saveBook: (b) => put('book', { started: today, page: 0, ...b }),
    readTo: (book, page, d = today) => {
      const to = Math.max(0, Math.min(book.pages || 99999, Math.round(page)))
      const delta = Math.max(0, to - (book.page || 0))
      const done = book.pages && to >= book.pages
      put('book', { ...book, page: to, log: [...(book.log || []), { date: d, page: to }].slice(-400), finishedAt: done ? (book.finishedAt || d) : null })
      if (delta) patchDay((c) => ({ read: { pages: (c.read?.pages || 0) + delta, books: [...new Set([...(c.read?.books || []), book.id])] } }), d)
      return { delta, done }
    },
    // vocab
    saveVocab: (v) => put('vocab', { ...(useStore.getState().items.vocab?.data || {}), ...v, id: 'vocab' }),
    vocabRound: (correct, total, d = today) => patchDay((c) => ({ vocab: { rounds: (c.vocab?.rounds || 0) + 1, correct: (c.vocab?.correct || 0) + correct, total: (c.vocab?.total || 0) + total } }), d),
    VOCAB,
  }
}

/** Hours since the last meal and when the eating window opens again. */
export function fastingOf(lastMeal, fastHours = 16, now = Date.now()) {
  if (!lastMeal) return null
  const since = (now - new Date(lastMeal)) / 3600000
  const next = new Date(new Date(lastMeal).getTime() + fastHours * 3600000)
  return { since, next, done: since >= fastHours, pct: Math.min(1, since / fastHours) }
}

/* ---------- vocabulary: Leitner boxes (1 → 5), wrong answers drop to box 1 ---------- */
const BOX_DAYS = [0, 0, 1, 3, 7, 21]
export function nextDue(box, from = todayISO()) { return addDays(from, BOX_DAYS[Math.min(5, box)] || 0) }
export function pickRound(vocab, n = 10, today = todayISO(), list = VOCAB) {
  const cards = vocab.cards || {}
  const all = [...list, ...(vocab.custom || [])]
  const due = all.filter((w) => cards[w.id] && cards[w.id].due <= today).sort((a, b) => (cards[a.id].box || 0) - (cards[b.id].box || 0))
  const fresh = all.filter((w) => !cards[w.id]).sort((a, b) => (a.lv || 1) - (b.lv || 1))
  const pick = [...due.slice(0, n), ...fresh].slice(0, n)
  return pick.map((w) => {
    const pool = all.filter((x) => x.id !== w.id && x.th !== w.th && (x.pos || '') === (w.pos || ''))
    const alt = (pool.length >= 3 ? pool : all.filter((x) => x.id !== w.id && x.th !== w.th))
    const opts = new Set([w.th])
    while (opts.size < 4 && opts.size < alt.length + 1) opts.add(alt[Math.floor(Math.random() * alt.length)].th)
    return { ...w, options: [...opts].sort(() => Math.random() - 0.5) }
  })
}
export function grade(vocab, id, ok, today = todayISO()) {
  const cards = { ...(vocab.cards || {}) }
  const c = cards[id] || { box: 0, seen: 0, right: 0, wrong: 0 }
  const box = ok ? Math.min(5, (c.box || 0) + 1) : 1
  cards[id] = { box, seen: c.seen + 1, right: c.right + (ok ? 1 : 0), wrong: c.wrong + (ok ? 0 : 1), due: nextDue(box, today), last: today }
  return { ...vocab, cards }
}
