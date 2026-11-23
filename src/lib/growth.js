/**
 * Growth: five life areas measured as "how much of the plan you kept" over the last 30 days (each goal capped at 100%,
 * rest days left out), and party members who grow for good as their area's lifetime milestones are reached.
 */
import { doneOf, addDays } from './habits'

// default 30-day targets (days unless noted); scaled down by rest days
export const AREA_TARGETS = { exercise: 12, nocarb: 15, read: 20, vocab: 15, meditate: 20, ontime: 20, nospend: 8, logged: 25 }

export const AREAS = [
  { id: 'body', name: 'ร่างกาย', emoji: '💪', color: '#f97316', member: 'knight', parts: ['exercise', 'nocarb'] },
  { id: 'mind', name: 'การเรียนรู้', emoji: '📖', color: '#4f46e5', member: 'mage', parts: ['read', 'vocab'] },
  { id: 'calm', name: 'พักและจิตใจ', emoji: '🧘', color: '#0d9488', member: 'healer', parts: ['meditate', 'ontime'] },
  { id: 'money', name: 'จัดการเงิน', emoji: '🏹', color: '#d97706', member: 'ranger', parts: ['nospend', 'logged'] },
  { id: 'secure', name: 'ความมั่นคง', emoji: '🛡️', color: '#16a34a', member: 'hero', parts: ['save', 'cover'] },
]
const PART_NAME = { exercise: 'ออกกำลังกาย', nocarb: 'ไม่กินแป้ง', read: 'อ่านหนังสือ', vocab: 'ท่องศัพท์', meditate: 'สมาธิ', ontime: 'นอนตรงเวลา', nospend: 'วันไม่ใช้เงิน', logged: 'วันที่จดบัญชี', save: 'ออม 10% ของรายรับ', cover: 'กันเงินจ่ายหนี้ครบ' }

/**
 * @param days habit days map, noSpend marks, loggedDays Set (days with a money entry),
 * saveRate (this or last month, 0..1 | null), coverage (0..1 | null when no debt)
 */
export function lifeStats({ days = {}, noSpend = {}, loggedDays = new Set(), saveRate = null, coverage = null, today }) {
  const counts = { exercise: 0, nocarb: 0, read: 0, vocab: 0, meditate: 0, ontime: 0, nospend: 0, logged: 0 }
  let rest = 0, seen = false
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i), day = { date: d, ...(days[d] || {}) }
    if (days[d] || noSpend[d] || loggedDays.has(d)) seen = true
    if (day.pause) { rest++; continue }
    for (const id of ['exercise', 'nocarb', 'read', 'vocab', 'meditate']) if (doneOf(id, day) > 0) counts[id]++
    if (day.sleep?.onTime) counts.ontime++
    if (noSpend[d]) counts.nospend++
    if (loggedDays.has(d)) counts.logged++
  }
  const scale = (30 - rest) / 30
  const pct = {}
  for (const k of Object.keys(counts)) pct[k] = Math.min(1, counts[k] / Math.max(1, Math.round(AREA_TARGETS[k] * scale)))
  pct.save = saveRate == null ? null : Math.min(1, saveRate / 0.1)
  pct.cover = coverage == null ? null : Math.min(1, coverage)
  const areas = AREAS.map((a) => {
    const vals = a.parts.map((p) => pct[p]).filter((v) => v != null)
    return {
      ...a, score: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null,
      parts: a.parts.map((p) => ({ id: p, name: PART_NAME[p], pct: pct[p], count: counts[p], target: AREA_TARGETS[p] ? Math.max(1, Math.round(AREA_TARGETS[p] * scale)) : null })),
    }
  })
  return { areas, enough: seen, rest }
}

/* ---------- permanent growth stages (1–3) per party member, from lifetime totals ---------- */
export const STAGES = {
  knight: { area: 'body', name: ['นักเดินทางฝึกหัด', 'นักผจญภัยเหล็ก', 'นักผจญภัยเพลิง'], next: ['ออกกำลังกายรวม 30 วัน', 'ออกกำลังกายรวม 100 วัน'], pts: (g) => g.exerciseDays + Math.floor(g.nocarbDays / 2), at: [30, 100] },
  mage: { area: 'mind', name: ['นักเวทฝึกหัด', 'จอมเวทแห่งหน้ากระดาษ', 'ปราชญ์ผู้รอบรู้'], next: ['อ่านจบ 3 เล่ม (หรือคะแนนความรู้ 60)', 'อ่านจบ 10 เล่ม (หรือคะแนนความรู้ 200)'], pts: (g) => g.books * 20 + Math.floor(g.learnt / 10) + g.readDays, at: [60, 200] },
  healer: { area: 'calm', name: ['นักบวชฝึกหัด', 'ผู้รักษาแห่งความสงบ', 'นักบุญแห่งแสง'], next: ['สมาธิ + นอนตรงเวลา รวม 30 วัน', 'สมาธิ + นอนตรงเวลา รวม 100 วัน'], pts: (g) => g.medDays + g.ontimeNights, at: [30, 100] },
  ranger: { area: 'money', name: ['พรานฝึกหัด', 'พรานเหยี่ยวทอง', 'พรานผู้ไม่พลาดเป้า'], next: ['วันไม่ใช้เงินรวม 20 วัน', 'วันไม่ใช้เงินรวม 60 วัน'], pts: (g) => g.noSpendDays, at: [20, 60] },
}
export function growthOf({ habits, noSpendTotal = 0 }) {
  const by = habits?.by || {}
  const g = {
    exerciseDays: by.exercise?.total || 0, nocarbDays: by.nocarb?.total || 0, readDays: by.read?.total || 0,
    books: habits?.finished?.length || 0, learnt: habits?.learnt || 0, medDays: by.meditate?.total || 0,
    ontimeNights: (habits?.sleeps || []).filter((s) => s.onTime).length, noSpendDays: noSpendTotal,
    activeDays: habits?.activeDays?.length || 0,
  }
  const members = Object.fromEntries(Object.entries(STAGES).map(([id, S]) => {
    const p = S.pts(g), stage = p >= S.at[1] ? 3 : p >= S.at[0] ? 2 : 1
    return [id, { stage, title: S.name[stage - 1], pts: p, nextAt: S.at[stage - 1] ?? null, next: S.next[stage - 1] || null, area: S.area }]
  }))
  // the pet grows with consistency: days with any habit done
  const petStage = g.activeDays >= 100 ? 3 : g.activeDays >= 30 ? 2 : 1
  return { g, members, pet: { stage: petStage, days: g.activeDays, nextAt: petStage === 1 ? 30 : petStage === 2 ? 100 : null } }
}
