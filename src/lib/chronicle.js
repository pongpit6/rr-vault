/**
 * Month chronicle: what each month looked like, told as an RPG chapter, plus the monthly boss
 * (a challenge you pick yourself, set one step above last month).
 */
import { doneOf, addDays } from './habits'
import { shiftMonth } from './format'

const SAVE_T = ['saving', 'invest', 'reserve']
const daysIn = (mk) => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate() }

/** Numbers for one month (YYYY-MM). */
export function monthStats(mk, { txns = [], accounts = [], days = {}, noSpend = {}, books = [] }, upTo = 31) {
  const inRange = (d) => d.startsWith(mk) && +d.slice(8, 10) <= upTo
  const typeOf = Object.fromEntries(accounts.map((a) => [a.id, a.type]))
  let inc = 0, exp = 0, saved = 0, paid = 0, payN = 0
  for (const t of txns) {
    if (!inRange(t.date)) continue
    if (t.kind === 'income') { inc += t.amount; if (t.split) for (const [k, v] of Object.entries(t.split)) if (SAVE_T.includes(typeOf[k])) saved += v }
    if (t.kind === 'expense') exp += t.amount
    if (t.kind === 'transfer' && SAVE_T.includes(typeOf[t.to]) && !SAVE_T.includes(typeOf[t.account])) saved += t.amount
    if (t.kind === 'trade' && t.side === 'buy' && typeOf[t.account] !== 'invest') saved += t.total || t.amount || 0
    if (t.kind === 'payment') { paid += t.amount; payN++ }
  }
  const n = Math.min(daysIn(mk), upTo)
  const habit = { read: 0, exercise: 0, meditate: 0, sleep: 0, ontime: 0, nocarb: 0, vocab: 0 }
  let pages = 0, medMin = 0, active = 0
  for (let i = 1; i <= n; i++) {
    const d = `${mk}-${String(i).padStart(2, '0')}`, day = { date: d, ...(days[d] || {}) }
    let any = false
    for (const id of Object.keys(habit)) {
      if (id === 'ontime') { if (day.sleep?.onTime) habit.ontime++; continue }
      if (doneOf(id, day) > 0) { habit[id]++; any = true }
    }
    if (any) active++
    pages += day.read?.pages || 0; medMin += day.meditate || 0
  }
  const noSpendDays = Object.keys(noSpend).filter(inRange).length
  const finished = books.filter((b) => b.finishedAt && inRange(b.finishedAt))
  return { mk, inc, exp, saved, paid, payN, saveRate: inc > 0 ? saved / inc : null, habit, pages, medMin, active, noSpendDays, finished, days: n }
}

/** A short RPG-style chapter for a month, highlights first, never a scolding. */
export function monthChapter(cur, prev) {
  const lines = []
  const up = (a, b) => (prev ? a > b : a > 0)
  if (cur.saveRate != null && cur.saveRate >= 0.1) lines.push({ icon: '🐷', text: `ออมและลงทุน ${Math.round(cur.saveRate * 100)}% ของรายรับ`, good: true })
  else if (cur.saved > 0) lines.push({ icon: '🐷', text: `ส่งเงินเข้าออม/ลงทุน ฿${Math.round(cur.saved).toLocaleString()}`, good: true })
  if (cur.payN) lines.push({ icon: '⚔️', text: `ฟันบอสหนี้ ${cur.payN} ครั้ง รวม ฿${Math.round(cur.paid).toLocaleString()}`, good: true })
  if (cur.noSpendDays) lines.push({ icon: '✨', text: `วันไม่ใช้เงิน ${cur.noSpendDays} วัน${prev && cur.noSpendDays > prev.noSpendDays ? ` (มากกว่าเดือนก่อน ${cur.noSpendDays - prev.noSpendDays} วัน)` : ''}`, good: true })
  if (cur.finished.length) lines.push({ icon: '📖', text: `อ่านจบ ${cur.finished.length} เล่ม: ${cur.finished.map((b) => b.title).join(', ')}`, good: true })
  else if (cur.pages) lines.push({ icon: '📖', text: `อ่าน ${cur.pages.toLocaleString()} หน้า ใน ${cur.habit.read} วัน`, good: true })
  if (cur.habit.exercise) lines.push({ icon: '💪', text: `ออกกำลังกาย ${cur.habit.exercise} วัน${up(cur.habit.exercise, prev?.habit.exercise || 0) && prev ? ' เพิ่มขึ้นจากเดือนก่อน' : ''}`, good: true })
  if (cur.medMin) lines.push({ icon: '🧘', text: `สมาธิรวม ${cur.medMin} นาที`, good: true })
  if (cur.habit.ontime) lines.push({ icon: '😴', text: `เข้านอนตรงเวลา ${cur.habit.ontime} คืน`, good: true })
  if (cur.habit.nocarb) lines.push({ icon: '🥗', text: `ไม่กินแป้ง/น้ำตาล ${cur.habit.nocarb} วัน`, good: true })
  if (cur.habit.vocab) lines.push({ icon: '🔤', text: `ท่องศัพท์ ${cur.habit.vocab} วัน`, good: true })
  // title of the chapter: the strongest area of the month
  const score = { saver: (cur.saveRate || 0) * 100 + cur.noSpendDays * 2, slayer: cur.payN * 10, scholar: cur.habit.read + cur.finished.length * 10 + cur.habit.vocab, warrior: cur.habit.exercise + cur.habit.nocarb, monk: cur.habit.meditate + cur.habit.ontime }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0]
  const TITLE = { saver: 'เดือนแห่งกระปุกทอง', slayer: 'เดือนแห่งคมดาบ', scholar: 'เดือนแห่งหน้ากระดาษ', warrior: 'เดือนแห่งเหงื่อและเหล็ก', monk: 'เดือนแห่งความสงบ' }
  const title = best && best[1] > 0 ? TITLE[best[0]] : 'เดือนแห่งการเริ่มต้น'
  return { title, lines, quiet: lines.length === 0 }
}

/* ---------- monthly boss: you pick one challenge, set one step above last month ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const CHALLENGES = [
  { id: 'nospend', boss: 'ปีศาจช้อปเพลิน', emoji: '👺', unit: 'วัน', name: (n) => `มีวันไม่ใช้เงิน ${n} วัน`, last: (p) => p.noSpendDays, step: 2, min: 4, max: 15, cur: (c) => c.noSpendDays },
  { id: 'read', boss: 'ภูตขี้เกียจอ่าน', emoji: '👻', unit: 'วัน', name: (n) => `อ่านหนังสือ ${n} วัน`, last: (p) => p.habit.read, step: 3, min: 8, max: 25, cur: (c) => c.habit.read },
  { id: 'exercise', boss: 'ยักษ์ขี้เกียจ', emoji: '🗿', unit: 'วัน', name: (n) => `ออกกำลังกาย ${n} วัน`, last: (p) => p.habit.exercise, step: 3, min: 6, max: 22, cur: (c) => c.habit.exercise },
  { id: 'meditate', boss: 'วิญญาณว้าวุ่น', emoji: '🌀', unit: 'วัน', name: (n) => `นั่งสมาธิ ${n} วัน`, last: (p) => p.habit.meditate, step: 3, min: 8, max: 25, cur: (c) => c.habit.meditate },
  { id: 'ontime', boss: 'ค้างคาวนอนดึก', emoji: '🦇', unit: 'คืน', name: (n) => `เข้านอนตรงเวลา ${n} คืน`, last: (p) => p.habit.ontime, step: 3, min: 6, max: 22, cur: (c) => c.habit.ontime },
  { id: 'nocarb', boss: 'สไลม์น้ำตาล', emoji: '🍩', unit: 'วัน', name: (n) => `ไม่กินแป้ง/น้ำตาล ${n} วัน`, last: (p) => p.habit.nocarb, step: 3, min: 6, max: 22, cur: (c) => c.habit.nocarb },
  { id: 'vocab', boss: 'นกแก้วลืมคำ', emoji: '🦜', unit: 'วัน', name: (n) => `ท่องศัพท์ ${n} วัน`, last: (p) => p.habit.vocab, step: 3, min: 8, max: 25, cur: (c) => c.habit.vocab },
  { id: 'save', boss: 'หนูแทะกระเป๋า', emoji: '🐀', unit: '%', name: (n) => `ออม/ลงทุน ${n}% ของรายรับ`, last: (p) => Math.round((p.saveRate || 0) * 100), step: 3, min: 5, max: 30, cur: (c) => Math.round((c.saveRate || 0) * 100) },
]
export const CHALLENGE_BY_ID = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]))
export const challengeTarget = (c, prev) => clamp((prev ? c.last(prev) : 0) + c.step, c.min, c.max)

/** three suggestions: the areas with the most room to grow last month (by share of their max) */
export function suggestChallenges(prev) {
  return [...CHALLENGES].sort((a, b) => (prev ? a.last(prev) / a.max : 0) - (prev ? b.last(prev) / b.max : 0)).slice(0, 3)
}

export const prevMonth = (mk) => shiftMonth(mk, -1)
export const monthDays = daysIn
export const isoAdd = addDays
