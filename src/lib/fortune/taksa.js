/* มหาทักษา: 8 planets, 108-year cycle — main periods (เสวยอายุ) and sub periods (แทรก).
   Rules from Mahataksa_Main_and_Subperiods_Handbook_TH: day boundary 06:00, Wednesday night (18:00–06:00) = Rahu,
   main periods end on birth anniversaries, sub periods split each main period in proportion (PARENT_SPAN_PROPORTIONAL),
   every interval is [start, end). Times are Asia/Bangkok wall clock (no DST). */

export const CYCLE = [1, 2, 3, 4, 7, 5, 8, 6]
export const POWER = { 1: 6, 2: 15, 3: 8, 4: 17, 7: 10, 5: 19, 8: 12, 6: 21 }
export const PLANET = {
  1: { name: 'อาทิตย์', icon: 'pl_sun', color: '#ef4444' },
  2: { name: 'จันทร์', icon: 'pl_moon', color: '#eab308' },
  3: { name: 'อังคาร', icon: 'pl_mars', color: '#ec4899' },
  4: { name: 'พุธ', icon: 'pl_merc', color: '#22c55e' },
  5: { name: 'พฤหัสบดี', icon: 'pl_jup', color: '#f97316' },
  6: { name: 'ศุกร์', icon: 'pl_venus', color: '#38bdf8' },
  7: { name: 'เสาร์', icon: 'pl_sat', color: '#8b5cf6' },
  8: { name: 'ราหู', icon: 'pl_rahu', color: '#475569' },
}
const TZ = 7 * 3600e3
/** 'YYYY-MM-DD' + 'HH:MM' Bangkok → epoch ms */
export const bkkMs = (date, time = '00:00') => Date.parse(`${date}T${time}:00+07:00`)
/** epoch ms → parts of Bangkok wall clock */
export const bkkParts = (ms) => { const d = new Date(ms + TZ); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), wd: d.getUTCDay() } }

/** the planet of the astrological birth day: before 06:00 counts as the day before; Wednesday 18:00 → Thursday 06:00 is Rahu */
export function birthPlanet(ms) {
  const p = bkkParts(ms - 6 * 3600e3) // shift only to classify the day (the birth instant itself is not moved)
  if (p.wd === 3) return p.h >= 12 ? 8 : 4 // shifted 18:00 = 12:00
  return { 0: 1, 1: 2, 2: 3, 4: 5, 5: 6, 6: 7 }[p.wd]
}
/** when only the date is known: every planet the birth could fall on */
export function possiblePlanets(date) {
  const s = new Set()
  for (let h = 0; h < 24; h++) s.add(birthPlanet(bkkMs(date, `${String(h).padStart(2, '0')}:00`)))
  return [...s]
}

/** birth anniversary n years later (Feb 29 → Feb 28 in common years), same wall time */
export function anniversary(birthMs, years) {
  const p = bkkParts(birthMs), y = p.y + years
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
  const d = p.m === 2 && p.d === 29 && !leap ? 28 : p.d
  return Date.UTC(y, p.m - 1, d, p.h, p.mi) - TZ
}

/** all main periods from birth, for `rounds` × 108 years */
export function mainPeriods(birthMs, rounds = 1, start = birthPlanet(birthMs)) {
  const out = [], r = CYCLE.indexOf(start)
  let acc = 0
  for (let k = 0; k < 8 * rounds; k++) {
    const pl = CYCLE[(r + k) % 8], a0 = acc, a1 = acc + POWER[pl]
    out.push({ planet: pl, ageFrom: a0, ageTo: a1, start: anniversary(birthMs, a0), end: anniversary(birthMs, a1) })
    acc = a1
  }
  return out
}
/** the 8 sub periods of one main period, in proportion of its real length */
export function subPeriods(main) {
  const i = CYCLE.indexOf(main.planet), L = main.end - main.start, out = []
  let w = 0
  for (let j = 0; j < 8; j++) {
    const q = CYCLE[(i + j) % 8], s = main.start + (w / 108) * L
    w += POWER[q]
    out.push({ main: main.planet, planet: q, start: Math.round(s), end: j === 7 ? main.end : Math.round(main.start + (w / 108) * L), hours: 80 * POWER[main.planet] * POWER[q] })
  }
  return out
}
/** symbolic length of a sub period (80 × P[M] × P[Q] astrological hours) as years / months / days / hours */
export function symbolic(hours) { return { y: Math.floor(hours / 8640), m: Math.floor((hours % 8640) / 720), d: Math.floor((hours % 720) / 24), h: hours % 24 } }

/** where a birth stands at time ms: main + sub period, and the next change */
export function taksaAt(birthMs, ms = Date.now(), start) {
  if (ms < birthMs) return null
  const mains = mainPeriods(birthMs, 2, start)
  const main = mains.find((m) => m.start <= ms && ms < m.end)
  if (!main) return null
  const subs = subPeriods(main), sub = subs.find((s) => s.start <= ms && ms < s.end)
  return { main, sub, subs, mains, next: subs[subs.indexOf(sub) + 1] || subPeriods(mains[mains.indexOf(main) + 1])[0] }
}
/** pieces of [from, to) — each with its main/sub pair (for "this year / next year") */
export function taksaRange(birthMs, from, to, start) {
  const out = []
  for (const m of mainPeriods(birthMs, 2, start)) {
    if (m.end <= from || m.start >= to) continue
    for (const s of subPeriods(m)) { if (s.end <= from || s.start >= to) continue; out.push({ ...s, from: Math.max(s.start, from), to: Math.min(s.end, to) }) }
  }
  return out
}

/* ---------- natal bhumi (ภูมิทักษากำเนิด) and planet pairs ---------- */
export const BHUMI = ['บริวาร', 'อายุ', 'เดช', 'ศรี', 'มูละ', 'อุตสาหะ', 'มนตรี', 'กาลกิณี']
export const BHUMI_TEXT = ['คนรอบตัว ผู้ร่วมงาน ลูกน้อง', 'ความเป็นอยู่ สุขภาพ การดูแลตัวเอง', 'อำนาจ ตำแหน่ง ความรับผิดชอบ', 'โชค ความรื่นรมย์ ทรัพย์ที่ได้มา', 'ฐานทรัพย์สิน รากฐาน บ้าน มรดก', 'ความขยัน งาน การลงแรง', 'ผู้ใหญ่ ผู้สนับสนุน คำแนะนำ', 'สิ่งที่ตำราให้ระวัง อุปสรรค']
export const bhumiOf = (b) => { const r = CYCLE.indexOf(b); return BHUMI.map((name, i) => ({ name, text: BHUMI_TEXT[i], planet: CYCLE[(r + i) % 8] })) }
export const PAIRS = {
  มิตร: [[1, 5], [2, 4], [3, 6], [7, 8]],
  ศัตรู: [[1, 3], [2, 5], [4, 8], [6, 7]],
  สมพล: [[1, 6], [2, 8], [3, 5], [4, 7]],
  ธาตุไฟ: [[1, 7]], ธาตุดิน: [[2, 5]], ธาตุลม: [[3, 8]], ธาตุน้ำ: [[4, 6]],
}
export const pairTags = (a, b) => Object.entries(PAIRS).filter(([, l]) => l.some(([x, y]) => (x === a && y === b) || (x === b && y === a))).map(([k]) => k)

/** tone from the Mahamongkol article (+ supportive, ! careful, ± mixed): rows = main, columns = sub */
const TONE_SRC = { 1: '!±!+!+!+', 2: '!+!+!±!+', 3: '!+!+!±!+', 4: '!+!+!+!+', 7: '!+!±!±+±', 5: '+!±+!+±+', 8: '!!!!±±!+', 6: '!±!+!+!±' }
const COLS = [1, 2, 3, 4, 7, 5, 8, 6]
export const toneOf = (m, q) => TONE_SRC[m][COLS.indexOf(q)]
export const TONE = { '+': { name: 'เกื้อหนุน', color: '#10b981' }, '!': { name: 'ต้องระวัง', color: '#ef4444' }, '±': { name: 'มีทั้งดีและต้องระวัง', color: '#f59e0b' } }
