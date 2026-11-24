/* Monster farming, energy from real discipline, skill tree, discipline chests and the workshop.
 * Everything runs on the "rpg" item (data.farm …), so it syncs like the rest of the game. */
import { MAPS, MAP_BY_ID, MON_BY_ID, MATS, trophyPrice, monPower, BOSS_AFTER, bossOf, eliteOf, normalsOf } from './farmData'
import { addDays } from './habits'

/* ---------------- energy: real discipline is the fuel ---------------- */
// points per habit done today; harder habits give more
export const ENERGY_PTS = [
  ['logged', 'จดบัญชี', 2], ['read', 'อ่านหนังสือ', 2], ['vocab', 'ท่องศัพท์', 2],
  ['meditate', 'นั่งสมาธิ', 3], ['nospend', 'วันไม่ใช้เงิน', 3], ['budget', 'ใช้จ่ายอยู่ในงบ', 3], ['ontime', 'นอนตรงเวลา', 4],
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

/* ---------------- skill tree: every skill works by itself ----------------
 * steady skills always apply; chance skills roll each fight and spend mana (from today's discipline) when they fire */
export const TREE = [
  { id: 'blade', member: 'knight', name: 'คมดาบวินัย', icon: 'sk_slash', kind: 'steady', text: (r) => `พลังทีม +${r * 5}%` },
  { id: 'storm', member: 'knight', name: 'ฟันพายุ', icon: 'sk_storm', kind: 'chance', mana: 1, chance: (r) => r * 0.04, text: (r) => `โอกาส ${r * 4}% ที่ของดรอปรอบนั้น ×2` },
  { id: 'bless', member: 'healer', name: 'พรคุ้มครอง', icon: 'sk_shield', kind: 'steady', text: (r) => `แพ้แล้วมีโอกาสลุกขึ้นสู้ใหม่ ${r * 6}%` },
  { id: 'revive', member: 'healer', name: 'แสงฟื้นฟู', icon: 'sk_heal', kind: 'chance', mana: 1, chance: (r) => r * 0.1, text: (r) => `ตอนกำลังจะแพ้ โอกาส ${r * 10}% พลิกเป็นชนะ` },
  { id: 'arcane', member: 'mage', name: 'พลังเวท', icon: 'sk_fireball', kind: 'steady', text: (r) => `พลังทีม +${r * 4}%` },
  { id: 'meteor', member: 'mage', name: 'อุกกาบาต', icon: 'sk_meteor', kind: 'chance', mana: 2, chance: (r) => r * 0.15, text: (r) => `เจอหัวหน้า/บอส โอกาส ${r * 15}% ชนะแน่นอน + ของประจำตัวเพิ่ม 1` },
  { id: 'eye', member: 'ranger', name: 'สายตาพราน', icon: 'sk_eagle', kind: 'steady', text: (r) => `โอกาสดรอปวัสดุ +${r * 4}%` },
  { id: 'hawk', member: 'ranger', name: 'ตาเหยี่ยว', icon: 'sk_arrow', kind: 'chance', mana: 1, chance: (r) => r * 0.06, text: (r) => `โอกาส ${r * 6}% ได้วัสดุเพิ่มอีก 1 ชิ้น` },
]
export const TREE_BY_ID = Object.fromEntries(TREE.map((t) => [t.id, t]))
export const SKILLS_V = 2 // bump to refund every skill point after a rebalance
/** cost to go from rank r-1 to r */
export const rankCost = (r) => (r <= 3 ? { pts: 1 } : r === 4 ? { pts: 1, page: 3, ink: 3 } : { pts: 2, page: 5, ink: 5, star: 1 })

/* ---------------- relics: villagers make them from materials; they work on their own while hunting ---------------- */
export const RELICS = [
  { id: 'rl_sword', npc: 'npc_smith', name: 'ดาบล่าสัตว์', eff: [8, 14, 20], text: (v) => `พลังทีม +${v}%`, need: [{ iron: 4, wood: 4 }, { iron: 8, crystal: 2 }, { iron: 12, crystal: 5, ink: 2 }] },
  { id: 'rl_shield', npc: 'npc_smith', name: 'โล่ไม้โอ๊ก', eff: [5, 10, 15], text: (v) => `โอกาสไม่แพ้ +${v}%`, need: [{ wood: 6, stone: 4 }, { wood: 10, iron: 4 }, { wood: 14, iron: 8, crystal: 2 }] },
  { id: 'rl_flask', npc: 'npc_alchemist', name: 'ขวดยาวิเศษ', eff: [15, 11, 8], text: (v) => `ได้ยาฟื้นพลังเองทุก ${v} รอบ`, need: [{ herb: 6, crystal: 1 }, { herb: 10, crystal: 3 }, { herb: 15, crystal: 5, ink: 2 }] },
  { id: 'rl_dust', npc: 'npc_alchemist', name: 'ผงเรืองแสง', eff: [1, 2, 3], text: (v) => `มานาต่อวัน +${v}`, need: [{ crystal: 2, fiber: 4 }, { crystal: 4, ink: 2 }, { crystal: 6, ink: 4, page: 1 }] },
  { id: 'rl_badge', npc: 'npc_guild', name: 'ตรานักล่า', eff: [26, 23, 20], text: (v) => `บอสแผนที่ออกเมื่อล่าครบ ${v} ตัว`, need: [{ hide: 4, stone: 4 }, { hide: 8, iron: 4 }, { hide: 12, iron: 6, crystal: 3 }] },
  { id: 'rl_map', npc: 'npc_guild', name: 'แผนที่ขุมทรัพย์', eff: [3, 6, 10], text: (v) => `โอกาสของหายาก +${v}%`, need: [{ cloth: 3, ink: 1 }, { cloth: 6, ink: 3 }, { cloth: 9, ink: 5, page: 2 }] },
  { id: 'rl_bag', npc: 'npc_shopgirl', name: 'กระเป๋าใบใหญ่', eff: [10, 20, 30], text: (v) => `โอกาสได้วัสดุชิ้นที่สอง +${v}%`, need: [{ hide: 4, fiber: 4 }, { hide: 8, cloth: 3 }, { hide: 12, cloth: 6, dye: 3 }] },
  { id: 'rl_cloak', npc: 'npc_shopgirl', name: 'เสื้อคลุมพราง', eff: [5, 8, 10], text: (v) => `เจอหัวหน้าบ่อยขึ้น +${v}% (ดรอปดีกว่า)`, need: [{ cloth: 3, dye: 1 }, { cloth: 6, dye: 3 }, { cloth: 9, dye: 5, feather: 4 }] },
  { id: 'rl_snack', npc: 'npc_farmer', name: 'ขนมสัตว์ชั้นดี', eff: [5, 10, 15], text: (v) => `สัตว์เลี้ยงคาบของมาเพิ่ม 1 ชิ้น โอกาส ${v}%`, need: [{ fruit: 4, herb: 4 }, { fruit: 8, herb: 6 }, { fruit: 12, herb: 10, feather: 3 }] },
  { id: 'rl_glasses', npc: 'npc_teacher', name: 'แว่นนักปราชญ์', eff: [1, 1, 2], text: (v) => `แต้มสกิลจากหีบวินัย +${v}`, need: [{ ink: 2, crystal: 1 }, { ink: 4, page: 2 }, { ink: 6, page: 4, star: 1 }] },
]
export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]))
export const NPC_INFO = {
  npc_smith: { name: 'ช่างตีเหล็ก', line: 'เอาแร่กับไม้มา เดี๋ยวตีของดี ๆ ให้' },
  npc_alchemist: { name: 'นักเล่นแร่แปรธาตุ', line: 'สมุนไพรกับคริสตัล… ข้าจะปรุงเวทให้เจ้า' },
  npc_guild: { name: 'หัวหน้ากิลด์นักล่า', line: 'นักล่าตัวจริงต้องมีตราของกิลด์' },
  npc_shopgirl: { name: 'ช่างตัดเสื้อ', line: 'ผ้ากับหนังสวย ๆ มาเลย จะเย็บให้เข้ากับท่าน' },
  npc_farmer: { name: 'ชาวนา', line: 'ผลไม้ป่ากับสมุนไพรเนี่ย สัตว์เลี้ยงชอบนัก' },
  npc_teacher: { name: 'ครูบรรณารักษ์', line: 'หมึกกับหน้าคัมภีร์ คือขุมทรัพย์ของผู้รู้' },
}
export const relicSlots = (level) => 3 + (level >= 20 ? 1 : 0) + (level >= 40 ? 1 : 0)
/** effect values of the relics you are wearing */
export function relicFx(f) {
  const fx = {}
  for (const id of f.worn || []) { const r = RELIC_BY_ID[id], t = (f.relics || {})[id]; if (r && t) fx[id] = r.eff[t - 1] }
  return fx
}

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
  for (const b of rpg.bosses || []) if (!b.isGoal && b.defeated && b.account?.type === 'loan') out.push({ key: `debt:${b.id}`, name: `ปลดหนี้ ${b.accName}`, tier: 3 })
  if (rpg.budgetMonth) out.push({ key: `budget:${rpg.budgetMonth}`, name: 'ทุกหมวดอยู่ในงบทั้งเดือน', tier: 2 })
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
  { id: 'potion', npc: 'npc_alchemist', name: 'ยาฟื้นพลัง', icon: 'Pill', need: { herb: 3 }, gives: 'กันแพ้ 1 ครั้ง (ใช้อัตโนมัติ)' },
  { id: 'kit', npc: 'npc_smith', name: 'ชุดวัสดุก่อสร้าง', icon: 'Hammer', need: { wood: 6, stone: 6, iron: 2 }, gives: 'สร้าง/อัปเกรดอาคารครั้งถัดไป ลด FIAT 40%' },
  { id: 'cr_garden', npc: 'npc_smith', name: 'สวนสมุนไพร', icon: 'Sprout', need: { herb: 6, fruit: 4, wood: 4 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +6' },
  { id: 'cr_totem', npc: 'npc_smith', name: 'เสาโทเท็มนักล่า', icon: 'Trophy', need: { wood: 8, feather: 4, hide: 4 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +8' },
  { id: 'cr_tapestry', npc: 'npc_smith', name: 'ผ้าแขวนลายมอนสเตอร์', icon: 'Flag', need: { fiber: 6, cloth: 3, dye: 3 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +8' },
  { id: 'cr_lamp', npc: 'npc_smith', name: 'โคมคริสตัล', icon: 'Lightbulb', need: { crystal: 4, iron: 4 }, decor: true, gives: 'ของตกแต่งเมือง · ความสุข +10' },
  { id: 'cr_hero', npc: 'npc_smith', name: 'รูปปั้นวีรบุรุษ', icon: 'Award', need: { stone: 15, crystal: 3, star: 1 }, decor: true, gives: 'ของตกแต่งตำนาน · ความสุข +20' },
]
export const CRAFT_DECOR = { cr_garden: 6, cr_totem: 8, cr_tapestry: 8, cr_lamp: 10, cr_hero: 20 }

/* ---------------- shadow soldiers: you in original hero costumes with a shadow aura; expensive, up to 5 ---------------- */
// [id, name, gold, fiat, effect key, value, text]
const SH = [
  ['sh_ninja', 'นินจาเงาจันทร์', 6, 1200, 'shadowProc', 3, 'สกิลแบบมีโอกาสทำงานบ่อยขึ้น +3%'],
  ['sh_pirate', 'กัปตันพายุคลั่ง', 6, 1200, 'shadowRare', 3, 'ของหายาก +3%'],
  ['sh_star', 'ยอดมนุษย์ผ้าคลุมดาว', 8, 1500, 'shadowPower', 6, 'พลังทีม +6%'],
  ['sh_demon', 'นักดาบอสูรโลหิต', 8, 1500, 'shadowBoss', 8, 'ชนะหัวหน้า/บอสง่ายขึ้น +8%'],
  ['sh_crystal', 'ผู้พิทักษ์คริสตัล', 6, 1200, 'shadowGuard', 5, 'กันแพ้ +5%'],
  ['sh_rider', 'นักบิดเกราะมังกร', 10, 2000, 'shadowStamina', 2, 'พลังกาย +2 ต่อวัน'],
  ['sh_boxer', 'นักชกหมัดเงา', 5, 1000, 'shadowTrophy', 5, 'ดรอปของประจำตัว +5%'],
  ['sh_sun', 'จอมเวทสุริยะดำ', 8, 1500, 'shadowMana', 1, 'มานา +1 ต่อวัน'],
  ['sh_samurai', 'ซามูไรเกราะดำ', 7, 1400, 'shadowPower', 5, 'พลังทีม +5%'],
  ['sh_cyborg', 'ไซบอร์กแขนพลังงาน', 7, 1400, 'shadowMat', 5, 'ดรอปวัสดุ +5%'],
  ['sh_astro', 'อัศวินอวกาศ', 6, 1200, 'shadowRaid', 15, 'ป้องกันเมืองตอนถูกบุก +15%'],
  ['sh_dragon', 'อัศวินมังกรทอง', 12, 3000, 'shadowPower', 8, 'พลังทีม +8%'],
  ['sh_assassin', 'นักฆ่าทะเลทราย', 6, 1200, 'shadowRare', 2, 'ของหายาก +2%'],
  ['sh_monk', 'พระสายฟ้า', 8, 1500, 'shadowMana', 1, 'มานา +1 ต่อวัน'],
  ['sh_gun', 'มือปืนพเนจร', 6, 1200, 'shadowElite', 5, 'เจอหัวหน้าบ่อยขึ้น +5%'],
  ['sh_frost', 'นักล่าแม่มดน้ำแข็ง', 6, 1200, 'shadowGuard', 4, 'กันแพ้ +4%'],
]
export const SHADOWS = SH.map(([id, name, gold, fiat, key, val, text], i) => ({ id, name, gold, fiat, key, val, text, art: i }))
export const SHADOW_BY_ID = Object.fromEntries(SHADOWS.map((x) => [x.id, x]))
export const SHADOW_SLOT_LV = [1, 15, 25, 35, 45]
export const shadowSlots = (level) => SHADOW_SLOT_LV.filter((l) => level >= l).length
/** effect totals of the shadow soldiers you field */
export function shadowFx(f) {
  const fx = {}
  for (const id of f.shadowWorn || []) { const x = SHADOW_BY_ID[id]; if (x && (f.shadows || {})[id]) fx[x.key] = (fx[x.key] || 0) + x.val }
  return fx
}

/* ---------------- enhancement: magic crystals push gear from +0 to +10 (never breaks; from +5 a miss drops one step) ---------------- */
export const ENH = [null,
  { p: 1, c: 1, fiat: 20 }, { p: 1, c: 1, fiat: 20 }, { p: 1, c: 1, fiat: 20 }, { p: 0.85, c: 1, fiat: 40 }, { p: 0.7, c: 2, fiat: 60 },
  { p: 0.6, c: 2, fiat: 80 }, { p: 0.5, c: 3, fiat: 100 }, { p: 0.4, c: 3, fiat: 150 }, { p: 0.3, c: 4, fiat: 200 }, { p: 0.2, c: 5, fiat: 300 }]
export const ENH_FX = { weapon: 'พลังทีม', armor: 'กันแพ้', boots: 'เจอหัวหน้า', satchel: 'ดรอปวัสดุ', ring: 'ของหายาก' }
/** next step from level n: chance, crystals, FIAT, what a miss does */
export const enhStep = (n) => (n >= 10 ? null : { ...ENH[n + 1], down: n >= 5 })
export const SHARDS_PER_GOLD = 10

/* ---------------- town raids: monsters come to the town in the background (no stamina), up to 5 times a day ---------------- */
const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }
/** the raids planned for one day (same every time for that date) */
export function raidsOf(date, uid = '') {
  let h = hash(`${uid}:${date}`)
  const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 10000) / 10000
  const n = Math.floor(r() * 6) // 0–5 raids
  const out = []
  for (let i = 0; i < n; i++) out.push({ id: `${date}:${i}`, at: `${date}T${String(7 + Math.floor(r() * 16)).padStart(2, '0')}:${String(Math.floor(r() * 60)).padStart(2, '0')}`, size: 1 + Math.floor(r() * 5), roll: r() })
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

/* ---------------- idle hunting: +1 stamina every hour (no cap), on top of today's discipline stamina ---------------- */
export const HOUR_MS = 3600e3
/** a happy town sometimes sends an extra stamina point with the hourly one: chance = happiness ÷ 2 (%). Same roll on every device. */
export const happyBonusChance = (happiness = 0) => Math.max(0, Math.min(100, happiness)) / 200
const hourRoll = (hourIdx) => { let x = Math.imul(hourIdx ^ 0x9e3779b9, 2654435761) >>> 0; x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0; return (x % 10000) / 10000 }
/** the hourly bank right now: what's banked + whole hours since it was last counted (+ the happiness bonus for those hours) */
export function hourlyOf(f, now = Date.now(), happiness = 0) {
  const h = f.hourly
  if (!h?.at) return { bank: 0, at: new Date(now).toISOString(), nextIn: HOUR_MS, bonus: 0, bonusToday: 0 }
  const start = new Date(h.at).getTime(), since = Math.max(0, now - start), gained = Math.floor(since / HOUR_MS)
  const chance = happyBonusChance(happiness), today = new Date(now).toDateString()
  let bonus = 0, bonusNewToday = 0
  for (let i = 1; i <= gained; i++) {
    const t = start + i * HOUR_MS
    if (hourRoll(Math.floor(t / HOUR_MS)) < chance) { bonus++; if (new Date(t).toDateString() === today) bonusNewToday++ }
  }
  const prevToday = h.bonusDay === today ? h.bonusN || 0 : 0
  return { bank: (h.bank || 0) + gained + bonus, at: new Date(start + gained * HOUR_MS).toISOString(), nextIn: HOUR_MS - (since % HOUR_MS), bonus, bonusToday: prevToday + bonusNewToday, bonusDay: today }
}
/** hunting gives a little XP too: 1 per win, at most this many a day (real life stays the main source) */
export const HUNT_XP_PER_WIN = 1, HUNT_XP_DAY = 30
export const IDLE_AWAY_MS = 5 * 60e3 // with the app closed the party fights about once every 5 minutes
export const IDLE_LIVE_MS = 8e3 // while you watch the hunt it fights every 8 seconds
export const MAP_MODES = [
  { id: 'pick', name: 'แผนที่ที่เลือก', text: 'ล่าแค่แผนที่ที่ปักไว้' },
  { id: 'all', name: 'ทุกแผนที่ที่สู้ไหว', text: 'วนล่าทุกแผนที่ที่ชนะได้ 50% ขึ้นไป' },
  { id: 'safe', name: 'ชนะ 70% ขึ้นไป', text: 'วนล่าเฉพาะแผนที่ที่ชนะได้ 70% ขึ้นไป' },
]

/* ---------------- combat ---------------- */
export function mapUnlocked(map, { level, realmTier }) {
  if (map.unlock.level && level < map.unlock.level) return { ok: false, why: `เลเวล ${map.unlock.level}` }
  if (map.unlock.realm && realmTier < map.unlock.realm) return { ok: false, why: `ดินแดน ${['', 'หมู่บ้านเริ่มต้น', 'เมืองการค้า', 'ปราสาทมั่งคั่ง', 'อาณาจักรทองคำ'][map.unlock.realm]} (มูลค่าสุทธิสูงสุดที่เคยทำได้)` }
  return { ok: true }
}
export function partyPower({ level, gear = [], party = [], skills = {}, traces = {}, fx = {} }) {
  const tiers = gear.reduce((s, g) => s + g.tier, 0)
  const joined = party.filter((p) => p.joined && p.id !== 'knight').length
  let p = 10 + level * 4 + tiers * 10 + joined * 6
  const pct = (skills.blade || 0) * 5 + (party.find((x) => x.id === 'mage')?.joined ? (skills.arcane || 0) * 4 : 0) + (traces.paid ? 10 : 0) + (fx.rl_sword || 0) + (fx.enh?.weapon || 0) + (fx.shadowPower || 0)
  return Math.round(p * (1 + pct / 100))
}
const rnd = () => Math.random()
/** chance to beat one monster with this power (relics, enhanced armor and shadows help) */
export function winChance(power, mon, fx = {}) {
  const mp = monPower(mon)
  return Math.max(0.05, Math.min(0.97, 0.5 + (power - mp) / (2 * mp) + ((fx.rl_shield || 0) + (fx.enh?.armor || 0) + (fx.shadowGuard || 0) + (mon.kind !== 'normal' ? fx.shadowBoss || 0 : 0)) / 100))
}
/** average win rate against a map's everyday monsters */
export const mapWinRate = (map, power, fx) => { const n = normalsOf(map); return n.reduce((s, m) => s + winChance(power, m, fx), 0) / n.length }
/** the maps the idle party hunts in, by mode (falls back to the easiest open map) */
export function huntMaps(f, { level, realmTier, power, fx }) {
  const open = MAPS.filter((m) => mapUnlocked(m, { level, realmTier }).ok)
  const mode = f.mapMode || 'pick'
  if (mode === 'pick') { const m = MAP_BY_ID[f.map]; return [m && open.includes(m) ? m : open[0] || MAPS[0]] }
  const need = mode === 'safe' ? 0.7 : 0.5
  const ok = open.filter((m) => mapWinRate(m, power, fx) >= need)
  return ok.length ? ok : [open[0] || MAPS[0]]
}
/** loot odds per win (tuned for idle hunting: daily stamina + 1 an hour, see claude/game-economy.md) */
/** the two items a map's rare slot can give (half and half) */
export const rareOf = (map) => (map.id === 'meadow' || map.id === 'forest' ? ['crystal', 'ink'] : ['page', 'ink'])
export const RARE_ODDS = { normal: 0.02, elite: 0.08, boss: 0.3 }
export const LOOT = { trophy: 0.34, mat: 0.29, shard: { normal: 0.0045, elite: 0.009, boss: 0.015 }, mcrystal: { normal: 0.02, elite: 0.065, boss: 0.2 } }
/** one fight. f = data.farm (mutated copy), day = today's usage (mana is spent here). returns a log entry */
export function fight(f, day, ctx, mapId = f.map) {
  const map = MAP_BY_ID[mapId] || MAP_BY_ID[f.map], sk = ctx.skills, fx = ctx.fx, procs = [], used = []
  const has = (m) => m === 'knight' || ctx.joined.includes(m)
  const rank = (id) => (has(TREE_BY_ID[id].member) ? sk[id] || 0 : 0)
  const proc = (id) => { const t = TREE_BY_ID[id], r = rank(id); if (!r || day.mana + t.mana > ctx.mana || rnd() >= t.chance(r) + (fx.shadowProc || 0) / 100) return false; day.mana += t.mana; procs.push(t.name); used.push(id); return true }
  const kills = f.kills[map.id] || 0, bossKills = f.bossKills?.[map.id] || 0
  const bossAfter = fx.rl_badge || BOSS_AFTER
  const norm = normalsOf(map)
  const mon = kills >= bossAfter * (bossKills + 1) ? bossOf(map) : rnd() < 0.1 + ((fx.rl_cloak || 0) + (fx.enh?.boots || 0) + (fx.shadowElite || 0)) / 100 ? eliteOf(map) : norm[Math.floor(rnd() * norm.length)]
  let win = rnd() < winChance(ctx.power, mon, fx)
  let meteor = false
  if (mon.kind !== 'normal' && proc('meteor')) { win = true; meteor = true }
  if (!win && proc('revive')) win = true
  if (!win && rank('bless') && rnd() < rank('bless') * 0.06) { win = true; procs.push('พรคุ้มครอง'); used.push('bless') }
  if (!win && (f.potions || 0) > 0) { win = true; f.potions--; procs.push('ยาฟื้นพลัง') }
  f.runs = (f.runs || 0) + 1
  if (fx.rl_flask && f.runs % fx.rl_flask === 0) { f.potions = (f.potions || 0) + 1; procs.push('ได้ยาใหม่') }
  const drops = {}
  const add = (k, n) => { drops[k] = (drops[k] || 0) + n }
  if (win) {
    f.kills[map.id] = kills + 1
    if (mon.kind === 'boss') f.bossKills = { ...(f.bossKills || {}), [map.id]: bossKills + 1 }
    f.dex[mon.id] = (f.dex[mon.id] || 0) + 1
    const big = mon.kind === 'boss' ? 4 : mon.kind === 'elite' ? 2 : 1
    // slot 1: its own trophy
    if (mon.kind !== 'normal' || rnd() < LOOT.trophy + (fx.shadowTrophy || 0) / 100) add(`t:${mon.id}`, 1 + (meteor ? 1 : 0))
    // slot 2: materials (a second piece needs luck)
    const matChance = LOOT.mat + rank('eye') * 0.04 + ctx.hard * 0.05 + ((fx.enh?.satchel || 0) + (fx.shadowMat || 0)) / 100 + (ctx.traces.saved ? 0.1 : 0)
    const mat = () => map.mats[Math.floor(rnd() * map.mats.length)]
    if (rnd() < matChance) { add(mat(), big); if (rnd() < 0.15 + (fx.rl_bag || 0) / 100) add(mat(), 1) }
    if (proc('hawk')) add(mat(), 1)
    // slot 3: something rare
    const rare = RARE_ODDS[mon.kind] + ((fx.rl_map || 0) + (fx.enh?.ring || 0) + (fx.shadowRare || 0)) / 100
    if (rnd() < rare) add(rnd() < 0.5 ? rareOf(map)[0] : rareOf(map)[1], 1)
    // gold shards (very rare) and magic crystals for enhancing gear
    if (rnd() < LOOT.shard[mon.kind]) add('shard', 1)
    if (rnd() < LOOT.mcrystal[mon.kind]) add('mcrystal', 1)
    // the pet brings something back
    if (fx.rl_snack && rnd() < fx.rl_snack / 100) { add(mat(), 1); procs.push('สัตว์เลี้ยงคาบของมา') }
    if (proc('storm')) for (const k of Object.keys(drops)) drops[k] *= 2
    for (const [k, v] of Object.entries(drops)) f.bag[k] = (f.bag[k] || 0) + v
  }
  return { mon: mon.id, map: map.id, win, drops, note: procs.join(' · '), skills: used }
}

/** a raid on the town: each monster is fought by the town guard with part of the party's power (no stamina, no skills) */
export function defendRaid(f, raid, ctx) {
  const maps = MAPS.filter((m) => mapUnlocked(m, ctx).ok)
  const map = maps[Math.floor(raid.roll * maps.length)] || MAPS[0]
  const norm = normalsOf(map), res = { id: raid.id, at: raid.at, map: map.id, mons: [], won: 0, drops: {} }
  const guard = ctx.power * (0.7 + (ctx.towerLv || 0) * 0.1) * (1 + (ctx.fx?.shadowRaid || 0) / 100)
  for (let i = 0; i < raid.size; i++) {
    const mon = rnd() < 0.08 ? eliteOf(map) : norm[Math.floor(rnd() * norm.length)]
    const mp = monPower(mon), win = rnd() < Math.max(0.05, Math.min(0.95, 0.5 + (guard - mp) / (2 * mp)))
    res.mons.push(mon.id)
    if (!win) continue
    res.won++
    f.dex[mon.id] = (f.dex[mon.id] || 0) + 1
    const add = (k, n) => { res.drops[k] = (res.drops[k] || 0) + n; f.bag[k] = (f.bag[k] || 0) + n }
    if (mon.kind !== 'normal' || rnd() < LOOT.trophy) add(`t:${mon.id}`, 1)
    if (rnd() < LOOT.mat) add(map.mats[Math.floor(rnd() * map.mats.length)], 1)
    if (rnd() < LOOT.shard[mon.kind]) add('shard', 1)
    if (rnd() < LOOT.mcrystal[mon.kind]) add('mcrystal', 1)
  }
  return res
}

/** what a material is really used for, read from the current relics, recipes, skills and enhancing (so the text never goes stale) */
export function matUse(k) {
  const out = []
  for (const r of RELICS) if (r.need.some((n) => n[k])) out.push(r.name)
  for (const r of RECIPES) if (r.need[k]) out.push(r.name)
  if (k === 'page' || k === 'ink' || k === 'star') out.push('อัปสกิลขั้น 4–5')
  if (k === 'mcrystal') out.push('ตีบวกอุปกรณ์ +1 ถึง +10')
  if (k === 'shard') return `รวม ${SHARDS_PER_GOLD} เศษเป็น 1 GOLD (ขายไม่ได้)`
  return out.length ? `ใช้ทำ: ${[...new Set(out)].join(', ')}` : 'ขายร้านได้'
}

/* ---------------- selling ---------------- */
export const itemName = (k) => (k.startsWith('t:') ? MON_BY_ID[k.slice(2)]?.trophy : MATS[k]?.name) || k
export const itemPrice = (k) => (k.startsWith('t:') ? trophyPrice(MON_BY_ID[k.slice(2)]) : MATS[k]?.noSell ? 0 : MATS[k]?.price || 0)
export const itemIcon = (k) => (k.startsWith('t:') ? `tro_${k.slice(2)}` : `mat_${k}`)

export function emptyFarm() { return { map: 'meadow', kills: {}, bossKills: {}, bag: {}, dex: {}, skills: {}, relics: {}, worn: [], enh: {}, raids: [], raidSeen: null, shadows: {}, shadowWorn: [], runs: 0, day: null, last: null, mapMode: 'pick', hourly: null, idleAt: null, recent: [], away: null, potions: 0, bond: 0, kit: 0, chests: {}, bonusPts: 0 } }
export { MAPS, MAP_BY_ID, MON_BY_ID, MATS }
