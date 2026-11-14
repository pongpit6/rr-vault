/**
 * Town builder + in-game money.
 *
 * 💵 FIAT  — easy to earn (logging, slips, daily chest, farms, quests of the day), but it
 *            inflates: FIAT prices rise 2% every month since the town was founded.
 * 🪙 GOLD  — scarce, only from weekly/monthly/main quests, beating bosses, achievements
 *            and lucky mines. Gold prices never inflate.
 *
 * Earnings from real activity are *derived* (so they sync and can't be farmed twice);
 * everything bought/claimed is kept in the "rpg" item as a running adjustment (data.fiat / data.gold).
 */

export const INFLATION = 0.02 // per month, on FIAT prices
export const GEM_TO_FIAT = 10

/* ---------------- catalog ---------------- */
// per level: [fiat, gold] cost and the perk value
export const BUILDINGS = {
  house: { name: 'บ้านพัก', emoji: '🏠', max: 8, desc: 'เพิ่มประชากรในเมือง', cost: [[120, 0], [250, 0], [400, 1]], perk: [4, 8, 14], perkText: (v) => `ประชากร +${v}` },
  farm: { name: 'ฟาร์ม', emoji: '🌾', max: 3, desc: 'ผลผลิต FIAT ทุกวัน', cost: [[200, 0], [400, 0], [700, 2]], perk: [20, 40, 70], perkText: (v) => `+${v} FIAT/วัน` },
  market: { name: 'ตลาดนัด', emoji: '🏪', max: 1, desc: 'ค่าเช่าแผงรายวัน + ส่วนลดร้านค้า', cost: [[450, 0], [900, 2], [1500, 4]], perk: [[10, 5], [20, 10], [30, 15]], perkText: (v) => `+${v[0]} FIAT/วัน · ร้านค้าลด ${v[1]}%` },
  bank: { name: 'ธนาคาร', emoji: '🏦', max: 1, desc: 'ดอกเบี้ยรายวันจาก FIAT ที่เก็บไว้ (สู้เงินเฟ้อ)', cost: [[500, 0], [900, 2], [1500, 5]], perk: [[0.1, 30], [0.2, 80], [0.3, 150]], perkText: (v) => `ดอกเบี้ย ${v[0]}%/วัน (สูงสุด ${v[1]})` },
  mine: { name: 'เหมืองทอง', emoji: '⛏️', max: 1, desc: 'ลุ้นได้ GOLD ทุกวันที่เก็บรายได้', cost: [[400, 2], [900, 4], [1500, 8]], perk: [15, 25, 40], perkText: (v) => `โอกาสได้ GOLD ${v}%/วัน` },
  library: { name: 'ห้องสมุด', emoji: '📚', max: 1, desc: 'ปาร์ตี้ฉลาดขึ้น ได้ XP มากขึ้น', cost: [[350, 0], [700, 2], [1200, 4]], perk: [5, 10, 15], perkText: (v) => `XP +${v}%` },
  tavern: { name: 'โรงเตี๊ยม', emoji: '🍺', max: 1, desc: 'ที่พักของ NPC ที่จ้างมา', cost: [[300, 0], [700, 1], [1200, 3]], perk: [2, 4, 6], perkText: (v) => `จ้าง NPC ได้ ${v} คน` },
  tower: { name: 'หอสังเกตการณ์', emoji: '🗼', max: 1, desc: 'จับตารายจ่ายรายสัปดาห์ ปลดเควสต์ทองพิเศษ', cost: [[400, 0], [800, 2], [1300, 4]], perk: [1, 2, 4], perkText: (v) => `เควสต์ “สัปดาห์ประหยัด” +${v} GOLD` },
}
export const HALL = { name: 'ศาลากลาง', emoji: '🏛️', cost: [null, [1000, 10], [2500, 25]], plots: [6, 9, 12] }

export const NPCS = [
  { id: 'guard', sprite: 'npc_guard', name: 'ทหารยาม', cost: [300, 0], perk: { happy: 8 }, perkText: 'ความสุข +8', line: 'ข้าเฝ้าประตูเมืองให้ ไม่มีรายจ่ายแปลกปลอมเล็ดลอดเข้ามาได้!' },
  { id: 'fisher', sprite: 'npc_fisher', name: 'ชาวประมง', cost: [350, 0], perk: { fiat: 12, happy: 3 }, perkText: '+12 FIAT/วัน · ความสุข +3', line: 'ตกปลาต้องใจเย็น เหมือนการลงทุนนั่นแหละ' },
  { id: 'baker', sprite: 'npc_baker', name: 'คนทำขนมปัง', cost: [400, 0], perk: { fiat: 15 }, perkText: '+15 FIAT/วัน', line: 'ขนมปังอบเองถูกกว่าซื้อกาแฟทุกเช้านะ~' },
  { id: 'bard', sprite: 'npc_bard', name: 'นักกวีพเนจร', cost: [500, 0], perk: { happy: 12 }, perkText: 'ความสุข +12', line: '♪ ออมวันละนิด จิตแจ่มใส ♪' },
  { id: 'smith', sprite: 'npc_smith', name: 'ช่างตีเหล็ก', cost: [0, 6], perk: { discount: 15 }, perkText: 'ค่าก่อสร้าง FIAT −15%', line: 'สร้างของดีครั้งเดียว ใช้ได้ทั้งชีวิต' },
  { id: 'banker', sprite: 'npc_banker', name: 'นักเวทนายธนาคาร', cost: [0, 10], perk: { goldChance: 15 }, perkText: 'โอกาสได้ GOLD +15%/วัน', line: 'เงินกระดาษพิมพ์เพิ่มได้ แต่ทองคำ… ต้องขุดเอา' },
]
export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]))
// villagers who live in town for free
export const RESIDENTS = [{ id: 'farmer', sprite: 'npc_farmer', name: 'ชาวนา', line: 'บันทึกทุกวัน เหมือนรดน้ำต้นไม้ทุกเช้า' }, { id: 'merchant', sprite: 'npc_merchant', name: 'พ่อค้า', line: 'FIAT มีเท่าไหร่ รีบใช้สร้างเมืองก่อนของขึ้นราคานะ!' }]

export const DECOR = [
  { id: 'tree', name: 'ต้นไม้ใหญ่', emoji: '🌳', cost: [60, 0], happy: 2 },
  { id: 'bench', name: 'ม้านั่งริมทาง', emoji: '🪑', cost: [80, 0], happy: 2 },
  { id: 'lamp', name: 'โคมไฟถนน', emoji: '🏮', cost: [100, 0], happy: 3 },
  { id: 'flowers', name: 'แปลงดอกไม้', emoji: '🌷', cost: [120, 0], happy: 4 },
  { id: 'well', name: 'บ่อน้ำ', emoji: '🪣', cost: [150, 0], happy: 4 },
  { id: 'fountain', name: 'น้ำพุกลางเมือง', emoji: '⛲', cost: [400, 0], happy: 8 },
  { id: 'statue', name: 'รูปปั้นทองคำ', emoji: '🗽', cost: [0, 5], happy: 10 },
]
export const DECOR_BY_ID = Object.fromEntries(DECOR.map((d) => [d.id, d]))

/* ---------------- helpers ---------------- */
const localDay = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const weekKey = (date = new Date()) => { const d = new Date(date); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return localDay(d.toISOString()) }
export const monthsSince = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / (30.44 * 86400_000))) : 0)
export const inflationMult = (data) => Math.pow(1 + INFLATION, monthsSince(data.econStart))

export function emptyTown() { return { hall: 1, plots: [], decor: {}, npcs: {} } }

/** Town state → numbers the rest of the game uses. */
export function computeTown(data = {}, { realmTier = 1, streak = 0, debtFog = 0 } = {}) {
  const town = { ...emptyTown(), ...(data.town || {}) }
  const plotCount = HALL.plots[town.hall - 1] + Math.max(0, realmTier - 1) * 2
  const plots = Array.from({ length: plotCount }, (_, i) => town.plots[i] || null)
  const built = plots.filter(Boolean)
  const lvOf = (type) => Math.max(0, ...built.filter((b) => b.type === type).map((b) => b.lv))
  const perk = (type) => { const lv = lvOf(type); return lv ? BUILDINGS[type].perk[lv - 1] : null }
  const npcs = Object.keys(town.npcs || {}).filter((id) => NPC_BY_ID[id])
  const decor = Object.keys(town.decor || {}).filter((id) => DECOR_BY_ID[id])

  const pop = 2 + built.filter((b) => b.type === 'house').reduce((s, b) => s + BUILDINGS.house.perk[b.lv - 1], 0) + npcs.length + RESIDENTS.length
  const happyParts = [['พื้นฐาน', 40]]
  const dh = decor.reduce((s, id) => s + DECOR_BY_ID[id].happy, 0); if (dh) happyParts.push(['ของตกแต่ง', dh])
  const nh = npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.happy || 0), 0); if (nh) happyParts.push(['NPC', nh])
  if (streak) happyParts.push(['บันทึกต่อเนื่อง', Math.min(20, streak)])
  const crowd = Math.max(0, built.filter((b) => b.type === 'house').length - built.filter((b) => b.type !== 'house').length - 1) * 3
  if (crowd) happyParts.push(['บ้านแน่นเกินไป', -crowd])
  if (debtFog > 0.05) happyParts.push(['หมอกหนี้', -Math.round(debtFog * 40)])
  const happiness = Math.max(0, Math.min(100, happyParts.reduce((s, [, v]) => s + v, 0)))
  const happyMult = 0.6 + happiness / 250

  const farmFiat = built.filter((b) => b.type === 'farm').reduce((s, b) => s + BUILDINGS.farm.perk[b.lv - 1], 0)
  const mk = perk('market')
  const npcFiat = npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.fiat || 0), 0)
  const dailyFiat = Math.round((farmFiat + (mk ? mk[0] : 0) + npcFiat) * happyMult)
  const bank = perk('bank')
  const goldChance = (perk('mine') || 0) + npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.goldChance || 0), 0)
  const buildDiscount = npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.discount || 0), 0)
  return {
    town, plots, plotCount, built, npcs, decor, pop, happiness, happyParts, happyMult,
    dailyFiat, farmFiat, npcFiat, marketFiat: mk ? mk[0] : 0, shopDiscount: mk ? mk[1] : 0,
    bankRate: bank ? bank[0] : 0, bankCap: bank ? bank[1] : 0, goldChance: Math.min(90, goldChance), buildDiscount,
    xpBonus: perk('library') || 0, npcSlots: perk('tavern') || 0, towerGold: perk('tower') || 0, lvOf,
    count: (type) => built.filter((b) => b.type === type).length,
  }
}

/** FIAT price after inflation and discounts. */
export function priceOf([fiat, gold], data, { discount = 0 } = {}) {
  return { fiat: fiat ? Math.round((fiat * inflationMult(data) * (1 - discount / 100)) / 5) * 5 : 0, gold }
}

/**
 * Wallet: derived earnings + stored adjustments.
 * days: Map(localDay → number of txns logged that day); txns for slip bonus.
 */
export function computeWallet({ days, txns, data = {}, achievementsUnlocked = 0, bossesDefeated = 0 }) {
  let logFiat = 0
  for (const n of days.values()) logFiat += Math.min(5, n) * 10
  const slipFiat = Math.min(2000, txns.filter((t) => t.fromSlip).length * 5)
  const achGold = achievementsUnlocked * 3
  const bossGold = bossesDefeated * 10
  const fiat = Math.max(0, Math.round(logFiat + slipFiat + (data.fiat || 0)))
  const gold = Math.max(0, Math.round(achGold + bossGold + (data.gold || 0)))
  return { fiat, gold, parts: { logFiat, slipFiat, achGold, bossGold } }
}

/** Exchange FIAT → GOLD: rate rises with inflation, max 3 GOLD a week. */
export const exchangeRate = (data) => Math.round(100 * inflationMult(data))
export const EXCHANGE_WEEKLY = 3
