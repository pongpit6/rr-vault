/**
 * Town builder + in-game money.
 *
 * 💵 FIAT  — easy to earn (logging, slips, daily chest, farms, quests of the day), but it
 *            inflates: FIAT prices rise 2% a month since the town was founded, levelling off at +20%
 *            (so an old town never becomes unaffordable).
 * 🪙 GOLD  — scarce, only from milestones: habit streaks (7/30/100), finished books, words learnt,
 *            the weekly habit quest, monthly/main quests, bosses, achievements and new investment profit.
 *            Daily actions never pay GOLD. Gold prices never inflate.
 *
 * Earnings from real activity are *derived* (so they sync and can't be farmed twice);
 * everything bought/claimed is kept in the "rpg" item as a running adjustment (data.fiat / data.gold).
 */

export const INFLATION = 0.02 // per month, on FIAT prices
export const INFLATION_CAP = 1.2 // prices stop rising at +20%
export const GEM_TO_FIAT = 10

/* ---------------- catalog ---------------- */
// per level: [fiat, gold] cost and the perk value
export const BUILDINGS = {
  house: { name: 'บ้านพัก', emoji: '🏠', max: 8, desc: 'ชาวเมืองมาเช่าอยู่ จ่ายค่าเช่าคนละ 2 FIAT/วัน', cost: [[150, 0], [250, 0], [350, 1]], perk: [4, 9, 15], perkText: (v) => `ประชากร +${v} · ค่าเช่า +${v * HOUSE_RENT} FIAT/วัน` },
  farm: { name: 'ฟาร์ม', emoji: '🌾', max: 3, desc: 'ผลผลิต FIAT ทุกวัน', cost: [[200, 0], [400, 0], [700, 2]], perk: [20, 40, 75], perkText: (v) => `+${v} FIAT/วัน` },
  market: { name: 'ตลาดนัด', emoji: '🏪', max: 1, desc: 'ค่าเช่าแผงรายวัน + ส่วนลดร้านค้า', cost: [[450, 0], [900, 2], [1500, 4]], perk: [[25, 5], [65, 10], [120, 15]], perkText: (v) => `+${v[0]} FIAT/วัน · ร้านค้าลด ${v[1]}%` },
  bank: { name: 'ธนาคาร', emoji: '🏦', max: 1, desc: 'ดอกเบี้ยรายวันจาก FIAT ที่เก็บไว้ (สู้เงินเฟ้อ)', cost: [[500, 0], [900, 2], [1500, 5]], perk: [[0.5, 25], [1, 60], [1.5, 110]], perkText: (v) => `ดอกเบี้ย ${v[0]}%/วัน (สูงสุด ${v[1]})` },
  mine: { name: 'เหมืองแร่', emoji: '⛏️', max: 1, desc: 'ขุดแร่ขาย ได้ FIAT ทุกวัน', cost: [[400, 1], [900, 3], [1500, 6]], perk: [40, 85, 150], perkText: (v) => `+${v} FIAT/วัน` },
  library: { name: 'ห้องสมุด', emoji: '📚', max: 1, desc: 'ปาร์ตี้ฉลาดขึ้น ได้ XP มากขึ้น', cost: [[350, 0], [700, 2], [1200, 4]], perk: [5, 10, 15], perkText: (v) => `XP +${v}%` },
  tavern: { name: 'โรงเตี๊ยม', emoji: '🍺', max: 1, desc: 'ที่พักของ NPC ที่จ้างมา', cost: [[300, 0], [700, 1], [1200, 3]], perk: [2, 4, 6], perkText: (v) => `จ้าง NPC ได้ ${v} คน` },
  tower: { name: 'หอสังเกตการณ์', emoji: '🗼', max: 1, desc: 'จับตารายจ่ายรายสัปดาห์ ปลดเควสต์ทองพิเศษ', cost: [[400, 0], [800, 2], [1300, 4]], perk: [1, 2, 4], perkText: (v) => `เควสต์ “สัปดาห์ประหยัด” +${v} GOLD` },
  gym: { name: 'โรงฝึก', emoji: '🏋️', max: 1, desc: 'ปลดล็อกเมื่อออกกำลังกายติดกัน 14 วัน · FIAT จากนิสัยเพิ่ม', cost: [[500, 1], [900, 3], [1500, 5]], perk: [15, 30, 50], perkText: (v) => `FIAT จากนิสัย +${v}%`, req: (h) => h.by.exercise.best >= 14, reqText: 'ออกกำลังกายติดกัน 14 วัน' },
  temple: { name: 'วัดบนเขา', emoji: '🛕', max: 1, desc: 'ปลดล็อกเมื่อนั่งสมาธิสะสม 5 ชั่วโมง · เมืองสงบสุข', cost: [[600, 2], [1000, 3], [1600, 5]], perk: [15, 25, 35], perkText: (v) => `ความสุข +${v}`, req: (h) => h.medMin >= 300, reqText: 'สมาธิสะสม 5 ชม.' },
  school: { name: 'โรงเรียนภาษา', emoji: '🏫', max: 1, desc: 'ปลดล็อกเมื่อจำศัพท์ได้ 300 คำ · XP เพิ่ม', cost: [[500, 2], [900, 3], [1400, 5]], perk: [8, 15, 25], perkText: (v) => `XP +${v}%`, req: (h) => h.learnt >= 300, reqText: 'จำศัพท์ได้ 300 คำ' },
  kitchen: { name: 'ครัวสุขภาพ', emoji: '🥗', max: 1, desc: 'ปลดล็อกเมื่อไม่กินแป้ง/น้ำตาลติดกัน 14 วัน · FIAT รายวัน', cost: [[400, 1], [800, 2], [1200, 4]], perk: [40, 90, 150], perkText: (v) => `+${v} FIAT/วัน`, req: (h) => h.by.nocarb.best >= 14, reqText: 'ไม่กินแป้งติดกัน 14 วัน' },
}
// some upgrades also need a habit milestone
export const LEVEL_REQ = {
  library: { 2: { req: (h) => h.finished.length >= 3, text: 'อ่านจบ 3 เล่ม' }, 3: { req: (h) => h.finished.length >= 10, text: 'อ่านจบ 10 เล่ม' } },
}
export const HOUSE_RENT = 2 // FIAT a day per resident living in a house
export const HALL = { name: 'ศาลากลาง', emoji: '🏛️', cost: [null, [1000, 10], [2500, 25]], plots: [6, 9, 12] }

export const NPCS = [
  { id: 'guard', sprite: 'npc_guard', name: 'ทหารยาม', cost: [300, 0], perk: { happy: 10 }, perkText: 'ความสุข +10', line: 'ข้าเฝ้าประตูเมืองให้ ไม่มีรายจ่ายแปลกปลอมเล็ดลอดเข้ามาได้!' },
  { id: 'fisher', sprite: 'npc_fisher', name: 'ชาวประมง', cost: [350, 0], perk: { fiat: 20, happy: 3 }, perkText: '+20 FIAT/วัน · ความสุข +3', line: 'ตกปลาต้องใจเย็น เหมือนการลงทุนนั่นแหละ' },
  { id: 'baker', sprite: 'npc_baker', name: 'คนทำขนมปัง', cost: [400, 0], perk: { fiat: 25 }, perkText: '+25 FIAT/วัน', line: 'ขนมปังอบเองถูกกว่าซื้อกาแฟทุกเช้านะ~' },
  { id: 'bard', sprite: 'npc_bard', name: 'นักกวีพเนจร', cost: [500, 0], perk: { happy: 16 }, perkText: 'ความสุข +16', line: '♪ ออมวันละนิด จิตแจ่มใส ♪' },
  { id: 'smith', sprite: 'npc_smith', name: 'ช่างตีเหล็ก', cost: [0, 6], perk: { discount: 15 }, perkText: 'ค่าก่อสร้าง FIAT −15%', line: 'สร้างของดีครั้งเดียว ใช้ได้ทั้งชีวิต' },
  { id: 'banker', sprite: 'npc_banker', name: 'นักเวทนายธนาคาร', cost: [0, 10], perk: { bankBoost: 100 }, perkText: 'เพดานดอกเบี้ยธนาคาร ×2', line: 'เงินกระดาษพิมพ์เพิ่มได้ แต่ทองคำ… ต้องขุดเอา' },
]
export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n]))
// villagers who live in town for free
export const RESIDENTS = [{ id: 'farmer', sprite: 'npc_farmer', name: 'ชาวนา', line: 'บันทึกทุกวัน เหมือนรดน้ำต้นไม้ทุกเช้า' }, { id: 'merchant', sprite: 'npc_merchant', name: 'พ่อค้า', line: 'FIAT มีเท่าไหร่ รีบใช้สร้างเมืองก่อนของขึ้นราคานะ!' }]

// every decoration also shows up in the battle scene (flowers, lanterns, banner); price per happiness point stays ~30 FIAT
export const DECOR = [
  { id: 'tree', name: 'ต้นไม้ใหญ่', emoji: '🌳', cost: [60, 0], happy: 2 },
  { id: 'bench', name: 'ม้านั่งริมทาง', emoji: '🪑', cost: [90, 0], happy: 3 },
  { id: 'lamp', name: 'โคมไฟถนน', emoji: '🏮', cost: [120, 0], happy: 4, scene: 'โคมแดงในฉากต่อสู้' },
  { id: 'flowers', name: 'แปลงดอกไม้', emoji: '🌷', cost: [150, 0], happy: 5, scene: 'ดอกไม้ในฉากต่อสู้' },
  { id: 'well', name: 'บ่อน้ำ', emoji: '🪣', cost: [200, 0], happy: 7 },
  { id: 'banner', name: 'ธงประจำปาร์ตี้', emoji: '🚩', cost: [240, 0], happy: 8, scene: 'ธงหลังปาร์ตี้ในฉากต่อสู้' },
  { id: 'fountain', name: 'น้ำพุกลางเมือง', emoji: '⛲', cost: [400, 0], happy: 14 },
  { id: 'statue', name: 'รูปปั้นทองคำ', emoji: '🗽', cost: [0, 5], happy: 20 },
]
// decorations bought in the old shop count as the matching town decoration
export const LEGACY_DECO = { deco_flowers: 'flowers', deco_lanterns: 'lamp', deco_banner: 'banner' }
// knight outfits: each gives a small perk so the choice matters
export const SKIN_PERK = {
  skin_royal: { townPct: 5, text: 'รายได้เมือง +5%' },
  skin_flame: { habitPct: 5, text: 'FIAT จากนิสัย +5%' },
}
export const DECOR_BY_ID = Object.fromEntries(DECOR.map((d) => [d.id, d]))

/* ---------------- helpers ---------------- */
const localDay = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
export const weekKey = (date = new Date()) => { const d = new Date(date); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return localDay(d.toISOString()) }
export const monthsSince = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / (30.44 * 86400_000))) : 0)
export const inflationMult = (data) => Math.min(INFLATION_CAP, Math.pow(1 + INFLATION, monthsSince(data.econStart)))

export function emptyTown() { return { hall: 1, plots: [], decor: {}, npcs: {} } }

/** Town state → numbers the rest of the game uses. */
export function computeTown(data = {}, { realmTier = 1, streak = 0 } = {}) {
  const town = { ...emptyTown(), ...(data.town || {}) }
  const plotCount = HALL.plots[town.hall - 1] + Math.max(0, realmTier - 1) * 2
  const plots = Array.from({ length: plotCount }, (_, i) => town.plots[i] || null)
  const built = plots.filter(Boolean)
  const lvOf = (type) => Math.max(0, ...built.filter((b) => b.type === type).map((b) => b.lv))
  const perk = (type) => { const lv = lvOf(type); return lv ? BUILDINGS[type].perk[lv - 1] : null }
  const npcs = Object.keys(town.npcs || {}).filter((id) => NPC_BY_ID[id])
  const legacy = Object.keys(data.owned || {}).map((k) => LEGACY_DECO[k]).filter(Boolean)
  const decor = [...new Set([...Object.keys(town.decor || {}), ...legacy])].filter((id) => DECOR_BY_ID[id])
  const skinPerk = (data.owned || {})[data.equip?.skin] ? SKIN_PERK[data.equip.skin] || {} : {}

  const tenants = built.filter((b) => b.type === 'house').reduce((s, b) => s + BUILDINGS.house.perk[b.lv - 1], 0)
  const pop = 2 + tenants + npcs.length + RESIDENTS.length
  const happyParts = [['พื้นฐาน', 40]]
  const dh = decor.reduce((s, id) => s + DECOR_BY_ID[id].happy, 0); if (dh) happyParts.push(['ของตกแต่ง', dh])
  const nh = npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.happy || 0), 0); if (nh) happyParts.push(['NPC', nh])
  if (perk('temple')) happyParts.push(['วัดบนเขา', perk('temple')])
  if (streak) happyParts.push(['บันทึกต่อเนื่อง', Math.min(20, streak)])
  const crowd = Math.max(0, built.filter((b) => b.type === 'house').length - built.filter((b) => b.type !== 'house').length - 1) * 3
  if (crowd) happyParts.push(['บ้านแน่นเกินไป', -crowd])
  const happiness = Math.max(0, Math.min(100, happyParts.reduce((s, [, v]) => s + v, 0)))
  const happyMult = 0.6 + happiness / 250

  const farmFiat = built.filter((b) => b.type === 'farm').reduce((s, b) => s + BUILDINGS.farm.perk[b.lv - 1], 0)
  const mk = perk('market')
  const npcFiat = npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.fiat || 0), 0)
  const rentFiat = tenants * HOUSE_RENT
  const dailyFiat = Math.round((farmFiat + rentFiat + (mk ? mk[0] : 0) + npcFiat + (perk('mine') || 0) + (perk('kitchen') || 0)) * happyMult * (1 + (skinPerk.townPct || 0) / 100))
  const bank = perk('bank')
  const bankBoost = 1 + npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.bankBoost || 0), 0) / 100
  const goldChance = 0 // GOLD no longer comes from luck
  const buildDiscount = npcs.reduce((s, id) => s + (NPC_BY_ID[id].perk.discount || 0), 0)
  return {
    town, plots, plotCount, built, npcs, decor, pop, happiness, happyParts, happyMult,
    dailyFiat, farmFiat, npcFiat, marketFiat: mk ? mk[0] : 0, shopDiscount: mk ? mk[1] : 0,
    bankRate: bank ? bank[0] : 0, bankCap: bank ? Math.round(bank[1] * bankBoost) : 0, goldChance, buildDiscount, rentFiat, habitBoost: (perk('gym') || 0) + (skinPerk.habitPct || 0),
    xpBonus: (perk('library') || 0) + (perk('school') || 0), npcSlots: perk('tavern') || 0, towerGold: perk('tower') || 0, lvOf,
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
export function computeWallet({ days, txns, data = {}, achievementsUnlocked = 0, bossesDefeated = 0, habits = null, habitBoost = 0 }) {
  let logFiat = 0
  for (const n of days.values()) logFiat += Math.min(5, n) * 10
  const slipFiat = Math.min(2000, txns.filter((t) => t.fromSlip).length * 5)
  const habitFiat = habits ? Math.round(habits.fiat * (1 + habitBoost / 100)) : 0
  const achGold = achievementsUnlocked * 3
  const bossGold = bossesDefeated * 10
  const habitGold = habits ? habits.gold : 0
  const profitGold = Math.floor((data.profitPeak || 0) / 10000)
  const fiat = Math.max(0, Math.round(logFiat + slipFiat + habitFiat + (data.fiat || 0)))
  const gold = Math.max(0, Math.round(achGold + bossGold + habitGold + profitGold + (data.gold || 0)))
  return { fiat, gold, parts: { logFiat, slipFiat, habitFiat, achGold, bossGold, habitGold, profitGold } }
}

/** Exchange FIAT → GOLD: rate rises with inflation, max 1 GOLD a week (GOLD should stay scarce). */
export const exchangeRate = (data) => Math.round(100 * inflationMult(data))
export const EXCHANGE_WEEKLY = 1

/** Town income piles up for each active day since the last collection (up to 7), so a missed visit never loses it. */
export const COLLECT_DAYS_MAX = 7
export function pendingDays(days, collectLast, today) {
  let n = 0
  for (const d of days.keys()) if (d && d <= today && (!collectLast || d > collectLast)) n++
  return Math.min(COLLECT_DAYS_MAX, n)
}
