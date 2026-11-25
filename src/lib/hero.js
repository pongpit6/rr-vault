import { doneOf, addDays } from './habits'

/* ---------------- the hero = you ----------------
 * Outfit grows with your rank (the same steps as TITLES). Each outfit has an art brief for PixelLab;
 * until the art is generated the game shows the current sprite with a stand-in tint.
 */
export const OUTFITS = [
  { lv: 1, name: 'ชุดเดินทางผ้าฝ้าย', look: 'เสื้อผ้าฝ้าย กางเกงผ้า ผ้าพันคอ', art: 'simple cotton traveler tunic, cloth trousers, scarf', hue: 0 },
  { lv: 5, name: 'ชุดหนังนักผจญภัย', look: 'เสื้อหนัง เข็มขัดมีกระเป๋า ถุงมือ', art: 'leather adventurer vest, belt pouches, gloves', hue: 0 },
  { lv: 10, name: 'ชุดนักสะสม', look: 'เสื้อแจ็กเก็ตหลายกระเป๋า ผ้าคลุมสั้น', art: 'multi-pocket explorer jacket, short cape', hue: 0 },
  { lv: 20, name: 'ชุดพ่อค้าเดินทาง', look: 'เสื้อคลุมยาวปักลาย ผ้าคาดเอว', art: 'long embroidered travel coat, sash', hue: 0 },
  { lv: 30, name: 'ชุดขุนนางนักเดินทาง', look: 'เกราะเบาสลักลาย เสื้อคลุมกำมะหยี่', art: 'light engraved armor, velvet cloak', hue: 0 },
  { lv: 50, name: 'ชุดเจ้าครองเกาะ', look: 'เสื้อคลุมขลิบทอง มงกุฎใบไม้', art: 'long gold-trimmed royal coat, laurel circlet', hue: 0 },
]
export function outfitOf(level) {
  let i = 0
  while (i + 1 < OUTFITS.length && level >= OUTFITS[i + 1].lv) i++
  return { ...OUTFITS[i], stage: i + 1, of: OUTFITS.length, next: OUTFITS[i + 1] || null }
}

/* ---------------- body condition: the last 7 days of sleep, exercise and meditation ---------------- */
const COND = {
  fit: { name: 'ฟิตพร้อมลุย', emoji: '💪', tip: 'หีบรายวันได้ FIAT เพิ่ม' },
  ok: { name: 'ปกติ', emoji: '🙂', tip: 'นอนตรงเวลาอีกนิดก็ฟิตแล้ว' },
  worn: { name: 'อ่อนล้า', emoji: '😪', tip: 'ฮีโร่เดินช้าลง ลองนอนตรงเวลาหรือขยับตัวสักหน่อย (ไม่มีการหักของ)' },
  rest: { name: 'พักผ่อน', emoji: '☕', tip: 'อยู่ในช่วงพัก' },
}
export function condition7(days = {}, today) {
  let ontime = 0, ex = 0, med = 0, rest = 0, seen = false
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, -i), raw = days[d]
    if (raw) seen = true
    const day = { date: d, ...(raw || {}) }
    if (day.pause) { rest++; continue }
    if (day.sleep?.onTime) ontime++
    if (doneOf('exercise', day) > 0) ex++
    if (doneOf('meditate', day) > 0) med++
  }
  if (!seen) return null
  const n = 7 - rest
  if (n <= 0) return { id: 'rest', score: null, ontime, ex, med, ...COND.rest }
  const part = (v, per7) => Math.min(1, v / Math.max(1, Math.round((n * per7) / 7)))
  const score = 0.4 * part(ontime, 5) + 0.35 * part(ex, 3) + 0.25 * part(med, 4)
  const id = score >= 0.7 ? 'fit' : score >= 0.4 ? 'ok' : 'worn'
  return { id, score, ontime, ex, med, n, ...COND[id] }
}

/* ---------------- shadow of last month: you vs. last month at the same day ---------------- */
export function shadowRace(cur, prev) {
  if (!cur || !prev) return null
  const lanes = [
    { id: 'spend', name: 'ใช้จ่าย', icon: '💸', you: cur.exp, ghost: prev.exp, lower: true, money: true },
    { id: 'save', name: 'ออม + ลงทุน', icon: '🐷', you: cur.saved, ghost: prev.saved, money: true },
    { id: 'habit', name: 'วันทำนิสัย + วันไม่ใช้เงิน', icon: '🌱', you: cur.active + cur.noSpendDays, ghost: prev.active + prev.noSpendDays },
  ].map((l) => {
    const tie = Math.abs(l.you - l.ghost) < (l.money ? 1 : 0.5)
    return { ...l, win: !tie && (l.lower ? l.you < l.ghost : l.you > l.ghost), tie }
  })
  const wins = lanes.filter((l) => l.win).length, losses = lanes.filter((l) => !l.win && !l.tie).length
  return { lanes, wins, losses, ahead: wins >= 2, lead: wins - losses }
}

/* ---------------- birthday ---------------- */
const pad = (n) => String(n).padStart(2, '0')
const md = (y, m, d) => { const last = new Date(y, m, 0).getDate(); return `${y}-${pad(m)}-${pad(Math.min(d, last))}` }
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000)
export function birthdayInfo(bday, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bday || '')) return null
  const [by, bm, bd] = bday.split('-').map(Number)
  const ty = +today.slice(0, 4)
  const thisYear = md(ty, bm, bd)
  const last = today >= thisYear ? thisYear : md(ty - 1, bm, bd)
  const prevLast = md(+last.slice(0, 4) - 1, bm, bd)
  const next = today >= thisYear ? md(ty + 1, bm, bd) : thisYear
  const age = +last.slice(0, 4) - by
  const sinceLast = dayDiff(last, today)
  return {
    born: bday, age, last, prevLast, next, daysTo: today === last ? 0 : dayDiff(today, next),
    isToday: today === last, week: sinceLast >= 0 && sinceLast <= 6, sinceLast,
  }
}
/** birthday outfits: one per age, a collectible with its own colour and no bonus */
export const bdaySkin = (id) => {
  const m = /^bday_(\d+)$/.exec(id || '')
  if (!m) return null
  const age = +m[1]
  return { id, type: 'skin', name: `ชุดวันเกิดอายุ ${age}`, desc: 'ของสะสมประจำปี ได้ในสัปดาห์วันเกิด', hue: 0, art: true, sheet: `bday${age % 4}`, bday: age }
}

/** free graduation outfits from the language curriculum: looks only, no bonus */
export const GRAD_SKINS = {
  grad_en: { name: 'ชุดบัณฑิตภาษาอังกฤษ', desc: 'ได้ฟรีเมื่อรับประกาศนียบัตรภาษาอังกฤษ (จบช่วง 1)' },
  grad_ja: { name: 'ชุดบัณฑิตภาษาญี่ปุ่น', desc: 'ได้ฟรีเมื่อรับประกาศนียบัตรภาษาญี่ปุ่น (จบช่วง 1)' },
  grad_zh: { name: 'ชุดบัณฑิตภาษาจีน', desc: 'ได้ฟรีเมื่อรับประกาศนียบัตรภาษาจีน (จบช่วง 1)' },
  grad_ko: { name: 'ชุดบัณฑิตภาษาเกาหลี', desc: 'ได้ฟรีเมื่อรับประกาศนียบัตรภาษาเกาหลี (จบช่วง 1)' },
  grad_doctor: { name: 'ชุดดุษฎีบัณฑิต', desc: 'ได้ฟรีเมื่อจบปริญญาเอกสี่ภาษา' },
}
export const gradSkin = (id) => (GRAD_SKINS[id] ? { id, type: 'skin', ...GRAD_SKINS[id], desc: `${GRAD_SKINS[id].desc} · ใส่เท่ ๆ ไม่มีโบนัส`, hue: 0, art: true, sheet: id, grad: true } : null)
/** any free outfit (birthday or graduation) by id */
export const freeSkin = (id) => bdaySkin(id) || gradSkin(id)

/* ---------------- one year of the adventure (birthday to birthday) ---------------- */
const SAVE_T = ['saving', 'invest', 'reserve']
export function rangeStats(from, to, { txns = [], accounts = [], days = {}, noSpend = {}, books = [] }) {
  const inR = (d) => d && d >= from && d <= to
  const typeOf = Object.fromEntries(accounts.map((a) => [a.id, a.type]))
  let inc = 0, exp = 0, saved = 0, paid = 0
  for (const t of txns) {
    if (!inR(t.date)) continue
    if (t.kind === 'income') { inc += t.amount; if (t.split) for (const [k, v] of Object.entries(t.split)) if (SAVE_T.includes(typeOf[k])) saved += v }
    if (t.kind === 'expense') exp += t.amount
    if (t.kind === 'transfer' && SAVE_T.includes(typeOf[t.to]) && !SAVE_T.includes(typeOf[t.account])) saved += t.amount
    if (t.kind === 'trade' && t.side === 'buy' && typeOf[t.account] !== 'invest') saved += t.total || t.amount || 0
    if (t.kind === 'payment') paid += t.amount
  }
  const h = { exercise: 0, read: 0, meditate: 0, vocab: 0, ontime: 0 }
  let active = 0, pages = 0
  for (const [d, raw] of Object.entries(days)) {
    if (!inR(d)) continue
    const day = { date: d, ...raw }
    let any = false
    for (const id of ['exercise', 'read', 'meditate', 'vocab']) if (doneOf(id, day) > 0) { h[id]++; any = true }
    if (day.sleep?.onTime) h.ontime++
    if (any) active++
    pages += day.read?.pages || 0
  }
  const noSpendDays = Object.keys(noSpend).filter(inR).length
  const finished = books.filter((b) => inR((b.finishedAt || '').slice(0, 10)))
  const hasData = txns.some((t) => inR(t.date)) || active > 0
  return { from, to, inc, exp, saved, paid, saveRate: inc > 0 ? saved / inc : null, habit: h, active, pages, noSpendDays, books: finished.length, hasData }
}

/* ---------------- story acts: pay off debt, then build the kingdom ---------------- */
export const FREEDOM_STEPS = [10, 25, 50, 100]
export function storyAct({ bosses = [], coverage = 1, hasCoverTarget = false, invTotal = 0, avgExp = 0 }) {
  const debt = bosses.filter((b) => !b.isGoal)
  const loansLeft = debt.filter((b) => b.account?.type === 'loan' && b.active)
  const cardsLeft = debt.filter((b) => b.account?.type === 'credit' && b.active)
  const owed = debt.reduce((s, b) => s + b.hp, 0)
  const peak = debt.reduce((s, b) => s + b.maxHp, 0)
  // free = no loan left, and whatever is on the cards is already set aside in full
  const free = loansLeft.length === 0 && (cardsLeft.length === 0 || (hasCoverTarget && coverage >= 1))
  const monthlyPassive = (invTotal * 0.04) / 12 // the 4% rule: what the investments could pay each month
  const freedom = avgExp > 0 ? monthlyPassive / avgExp : 0
  return {
    id: free ? 2 : 1, free, owed, peak, loansLeft: loansLeft.length, cardsLeft: cardsLeft.length,
    act1Pct: peak > 0 ? Math.min(1, (peak - owed) / peak) : 1,
    monthlyPassive, freedom, nextStep: FREEDOM_STEPS.find((s) => freedom * 100 < s) || null,
  }
}

/* ---------------- monthly album snapshot ---------------- */
export function albumSnap(rpg, summary) {
  const tiers = Object.fromEntries((rpg.gear || []).map((g) => [g.slot, g.tier]))
  return {
    level: rpg.level, title: rpg.title, outfit: outfitOf(rpg.level).stage, nw: Math.round(summary.net || 0),
    debt: Math.round(summary.debts || 0), invest: Math.round(rpg.totals?.invTotal || 0),
    reserveM: Math.round((rpg.totals?.emergencyMonths || 0) * 10) / 10,
    books: rpg.growth?.g?.books || 0, learnt: rpg.growth?.g?.learnt || 0, exercise: rpg.growth?.g?.exerciseDays || 0,
    tiers, realm: rpg.realm?.tier ?? 0,
  }
}
