/* Monster farming, energy from real discipline, skill tree, discipline chests and the workshop.
 * Everything runs on the "rpg" item (data.farm …), so it syncs like the rest of the game. */
import { MAPS, MAP_BY_ID, MON_BY_ID, MATS, trophyPrice, monPower, BOSS_AFTER } from './farmData'
import { addDays } from './habits'

/* ---------------- energy: real discipline is the fuel ---------------- */
// points per habit done today; harder habits give more
export const ENERGY_PTS = [
  ['logged', 'จดบัญชี', 2], ['read', 'อ่านหนังสือ', 2], ['vocab', 'ท่องศัพท์', 2],
  ['meditate', 'นั่งสมาธิ', 3], ['nospend', 'วันไม่ใช้เงิน', 3], ['ontime', 'นอนตรงเวลา', 4],
  ['nocarb', 'ไม่กินแป้ง/น้ำตาล', 4], ['exercise', 'ออกกำลังกายครบ', 5], ['paid', 'จ่ายหนี้', 5], ['saved', 'ออม/ลงทุน', 5],
]
export const STAMINA_BASE = 20, STAMINA_BONUS_MAX = 20
export function energyOf({ traces = {}, habitDays = {}, condition, today }) {
  const done = { ...traces, ontime: !!habitDays[today]?.sleep?.onTime }
  const parts = ENERGY_PTS.map(([id, name, pts]) => ({ id, name, pts, done: !!done[id] }))
  const pts = parts.filter((p) => p.done).reduce((s, p) => s + p.pts, 0)
  const fit = condition?.id === 'fit' ? 5 : 0
  return {
    parts, pts, fit,
    stamina: STAMINA_BASE + Math.min(STAMINA_BONUS_MAX, pts) + fit,
    mana: 3 + Math.floor(pts / 2),
    hard: ['exercise', 'nocarb', 'paid', 'saved'].filter((k) => done[k]).length, // each one adds rare-drop luck today
  }
}

/* ---------------- skill tree ---------------- */
export const TREE = [
  { id: 'blade', member: 'knight', name: 'คมดาบวินัย', icon: 'sk_slash', type: 'passive', per: 6, text: (r) => `พลังทีม +${r * 6}%` },
  { id: 'storm', member: 'knight', name: 'ฟันพายุ', icon: 'sk_storm', type: 'active', mana: 3, text: (r) => `${3 + r} รอบถัดไปได้ของดรอป ×2` },
  { id: 'bless', member: 'healer', name: 'พรคุ้มครอง', icon: 'sk_shield', type: 'passive', per: 8, text: (r) => `แพ้แล้วมีโอกาสลุกขึ้นสู้ใหม่ ${r * 8}%` },
  { id: 'revive', member: 'healer', name: 'แสงฟื้นฟู', icon: 'sk_heal', type: 'active', mana: 2, text: (r) => `${3 + r} รอบถัดไปไม่แพ้` },
  { id: 'arcane', member: 'mage', name: 'พลังเวท', icon: 'sk_fireball', type: 'passive', per: 5, text: (r) => `พลังทีม +${r * 5}%` },
  { id: 'meteor', member: 'mage', name: 'อุกกาบาต', icon: 'sk_meteor', type: 'active', mana: 3, text: (r) => `${r} ครั้งถัดไปที่เจอหัวหน้า/บอส ชนะแน่นอน + ของประจำตัวเพิ่ม 1` },
  { id: 'eye', member: 'ranger', name: 'สายตาพราน', icon: 'sk_eagle', type: 'passive', per: 4, text: (r) => `โอกาสดรอปวัสดุ +${r * 4}%` },
  { id: 'hawk', member: 'ranger', name: 'ตาเหยี่ยว', icon: 'sk_arrow', type: 'active', mana: 2, text: (r) => `${2 + r} รอบถัดไปดรอปวัสดุแน่นอน` },
]
export const TREE_BY_ID = Object.fromEntries(TREE.map((t) => [t.id, t]))
/** cost to go from rank r-1 to r */
export const rankCost = (r) => (r <= 3 ? { pts: 1 } : r === 4 ? { pts: 1, page: 3, ink: 3 } : { pts: 2, page: 5, ink: 5, star: 1 })

/* ---------------- discipline chests: the hard things in real life ---------------- */
export function chestsDue({ habits, rpg, today }) {
  const out = []
  const streakKeys = (id, every, name) => {
    const st = habits?.by?.[id]?.streak || 0
    if (st < every) return
    const start = addDays(today, -(st - 1))
    for (let k = every; k <= st; k += every) out.push({ key: `${id}:${start}:${k}`, name: `${name} ${k} วันติด`, tier: k >= every * 2 ? 2 : 1 })
  }
  streakKeys('exercise', 14, 'ออกกำลังกาย')
  streakKeys('nocarb', 7, 'ไม่กินแป้ง/น้ำตาล')
  streakKeys('meditate', 21, 'นั่งสมาธิ')
  if ((rpg.noSpendStreak || 0) >= 7) for (let k = 7; k <= rpg.noSpendStreak; k += 7) out.push({ key: `nospend:${addDays(today, -(rpg.noSpendStreak - 1))}:${k}`, name: `ไม่ใช้เงิน ${k} วันติด`, tier: 1 })
  for (const b of habits?.finished || []) out.push({ key: `book:${b.id}`, name: `อ่านจบ “${b.title}”`, tier: 1 })
  if (rpg.monthBoss?.done) out.push({ key: `mboss:${rpg.monthBoss.mk}`, name: 'ชนะบอสประจำเดือน', tier: 2 })
  const save = rpg.quests?.find((q) => q.key.endsWith(':save') && q.key.startsWith('m:'))
  if (save?.done) out.push({ key: `save:${save.key}`, name: 'ออมได้ 20% ทั้งเดือน', tier: 2 })
  for (const b of rpg.bosses || []) if (!b.isGoal && b.defeated) out.push({ key: `debt:${b.id}`, name: `ปลดหนี้ ${b.accName}`, tier: 3 })
  return out
}
/** what a chest holds (deterministic from its key, so it can't be re-rolled) */
export function chestLoot(chest) {
  let h = 7; for (const c of chest.key) h = (h * 31 + c.charCodeAt(0)) % 100003
  const pick = (arr) => arr[(h = (h * 17 + 11) % 100003) % arr.length]
  const t = chest.tier
  const mats = {}
  for (let i = 0; i < 3 + t * 2; i++) { const m = pick(['crystal', 'ink', 'iron', 'hide', 'cloth', 'dye', 'feather']); mats[m] = (mats[m] || 0) + 1 }
  return { fiat: 150 * t, points: t >= 2 ? 2 : 1, page: 1 + t, star: t >= 2 ? 1 : 0, mats }
}

/* ---------------- workshop ---------------- */
export const RECIPES = [
  { id: 'potion', name: 'ยาฟื้นพลัง', icon: 'Pill', need: { herb: 3 }, gives: 'กันแพ้ 1 ครั้ง (ใช้อัตโนมัติ)' },
  { id: 'treat', name: 'ขนมสัตว์เลี้ยง', icon: 'Gift', need: { fruit: 2, herb: 1 }, gives: 'ความผูกพันสัตว์เลี้ยง +1 (ทุก 5 แต้มเพิ่มโอกาสดรอป 1%, สูงสุด 5%)' },
  { id: 'kit', name: 'ชุดวัสดุก่อสร้าง', icon: 'Hammer', need: { wood: 6, stone: 6, iron: 2 }, gives: 'สร้าง/อัปเกรดอาคารครั้งถัดไป ลด FIAT 40%' },
  { id: 'cr_garden', name: 'สวนสมุนไพร', icon: 'Sprout', need: { herb: 6, fruit: 4, wood: 4 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +6' },
  { id: 'cr_totem', name: 'เสาโทเท็มนักล่า', icon: 'Trophy', need: { wood: 8, feather: 4, hide: 4 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +8' },
  { id: 'cr_tapestry', name: 'ผ้าแขวนลายมอนสเตอร์', icon: 'Flag', need: { fiber: 6, cloth: 3, dye: 3 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +8' },
  { id: 'cr_lamp', name: 'โคมคริสตัล', icon: 'Lightbulb', need: { crystal: 4, iron: 4 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +10' },
  { id: 'cr_hero', name: 'รูปปั้นวีรบุรุษ', icon: 'Award', need: { stone: 15, crystal: 3, star: 1 }, decor: true, gives: 'ของตกแต่งตำนาน · ความสุข +20' },
]
export const CRAFT_DECOR = { cr_garden: 6, cr_totem: 8, cr_tapestry: 8, cr_lamp: 10, cr_hero: 20 }

/* ---------------- combat ---------------- */
export function mapUnlocked(map, { level, realmTier }) {
  if (map.unlock.level && level < map.unlock.level) return { ok: false, why: `เลเวล ${map.unlock.level}` }
  if (map.unlock.realm && realmTier < map.unlock.realm) return { ok: false, why: `ดินแดน ${['', 'หมู่บ้านเริ่มต้น', 'เมืองการค้า', 'ปราสาทมั่งคั่ง', 'อาณาจักรทองคำ'][map.unlock.realm]} (มูลค่าสุทธิจริง)` }
  return { ok: true }
}
export function partyPower({ level, gear = [], party = [], skills = {}, traces = {} }) {
  const tiers = gear.reduce((s, g) => s + g.tier, 0)
  const joined = party.filter((p) => p.joined && p.id !== 'knight').length
  let p = 10 + level * 4 + tiers * 10 + joined * 6
  const pct = (skills.blade || 0) * 6 + (party.find((x) => x.id === 'mage')?.joined ? (skills.arcane || 0) * 5 : 0) + (traces.paid ? 10 : 0)
  return Math.round(p * (1 + pct / 100))
}
const rnd = () => Math.random()
/** one fight. f = data.farm (mutated copy). returns a log entry */
export function fight(f, ctx) {
  const map = MAP_BY_ID[f.map]
  const kills = f.kills[map.id] || 0, bossKills = f.bossKills?.[map.id] || 0
  const mon = kills >= BOSS_AFTER * (bossKills + 1) ? map.mons[9] : rnd() < 0.1 ? map.mons[8] : map.mons[Math.floor(rnd() * 8)]
  const mp = monPower(mon), pw = ctx.power
  let win = rnd() < Math.max(0.05, Math.min(0.97, 0.5 + (pw - mp) / (2 * mp)))
  const b = f.buffs
  let note = ''
  if (!win && mon.kind !== 'normal' && b.meteor > 0) { win = true; b.meteor--; note = 'อุกกาบาต!' }
  if (!win && b.revive > 0) { win = true; b.revive--; note = 'แสงฟื้นฟู' }
  if (!win && ctx.skills.bless && ctx.healer && rnd() < ctx.skills.bless * 0.08) { win = true; note = 'พรคุ้มครอง' }
  if (!win && (f.potions || 0) > 0) { win = true; f.potions--; note = 'ใช้ยาฟื้นพลัง' }
  const drops = {}
  if (win) {
    f.kills[map.id] = kills + 1
    if (mon.kind === 'boss') f.bossKills = { ...(f.bossKills || {}), [map.id]: bossKills + 1 }
    f.dex[mon.id] = (f.dex[mon.id] || 0) + 1
    const mult = b.storm > 0 ? 2 : 1; if (b.storm > 0) b.storm--
    const tro = mon.kind === 'normal' ? (rnd() < 0.55 ? 1 : 0) : 1
    if (tro) drops[`t:${mon.id}`] = tro * mult + (note === 'อุกกาบาต!' ? 1 : 0)
    const matChance = 0.4 + (ctx.skills.eye || 0) * 0.04 + ctx.hard * 0.05 + Math.min(5, Math.floor((f.bond || 0) / 5)) * 0.01 + (ctx.traces.saved ? 0.1 : 0)
    if (b.hawk > 0 || rnd() < matChance) {
      if (b.hawk > 0) b.hawk--
      const m = map.mats[Math.floor(rnd() * map.mats.length)]
      drops[m] = (drops[m] || 0) + mult * (mon.kind === 'boss' ? 4 : mon.kind === 'elite' ? 2 : 1)
    }
    if (mon.kind === 'boss' && rnd() < 0.3) drops.page = (drops.page || 0) + 1
    for (const [k, v] of Object.entries(drops)) f.bag[k] = (f.bag[k] || 0) + v
  }
  return { mon: mon.id, win, drops, note }
}

/* ---------------- selling ---------------- */
export const itemName = (k) => (k.startsWith('t:') ? MON_BY_ID[k.slice(2)]?.trophy : MATS[k]?.name) || k
export const itemPrice = (k) => (k.startsWith('t:') ? trophyPrice(MON_BY_ID[k.slice(2)]) : MATS[k]?.price || 0)
export const itemIcon = (k) => (k.startsWith('t:') ? `tro_${k.slice(2)}` : `mat_${k}`)

export function emptyFarm() { return { map: 'meadow', kills: {}, bossKills: {}, bag: {}, dex: {}, buffs: {}, skills: {}, day: null, auto: false, last: null, potions: 0, bond: 0, kit: 0, chests: {}, bonusPts: 0 } }
export { MAPS, MAP_BY_ID, MON_BY_ID, MATS }
