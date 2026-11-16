import { sfx } from './sfx'
import { useEffect, useMemo } from 'react'
import { useStore } from '../store'
import { useVault } from './useVault'
import { postingsOf } from './ledger'
import { round2, todayISO, monthKey } from './format'
import { computeParty } from './party'
import { computeHabits } from './habits'
import { selectList } from '../store'
import { useWeather, loadWeather, sceneWeather, thaiEvent, isThaiHoliday, moneyMood } from './world'
import { usePrices } from './prices'
import { budgetStatus } from './plan'
import { computeTown, computeWallet, priceOf, inflationMult, exchangeRate, EXCHANGE_WEEKLY, BUILDINGS, LEVEL_REQ, HALL, NPC_BY_ID, DECOR_BY_ID, GEM_TO_FIAT, weekKey } from './town'

/**
 * Everything RPG is derived from real data, so it syncs with no extra storage.
 * Only unlocked achievements are persisted (item "rpg") so they stay unlocked.
 */

const localDate = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const loggedDay = (t) => localDate(t.createdAt) || t.date

export const TITLES = [
  [1, 'ผู้ฝึกหัด', 'Novice'], [5, 'นักผจญภัย', 'Adventurer'], [10, 'นักสะสม', 'Collector'],
  [20, 'พ่อค้าผู้มั่งคั่ง', 'Merchant'], [30, 'ขุนนาง', 'Noble'], [50, 'เจ้าครองเกาะ', 'Island Lord'],
]
export const REALMS = [
  { min: -Infinity, name: 'แดนหมอกหนี้', en: 'Debt Mire', tier: 0 },
  { min: 0, name: 'หมู่บ้านเริ่มต้น', en: 'Starter Village', tier: 1 },
  { min: 10000, name: 'เมืองการค้า', en: 'Trade Town', tier: 2 },
  { min: 100000, name: 'ปราสาทมั่งคั่ง', en: 'Wealth Castle', tier: 3 },
  { min: 1000000, name: 'อาณาจักรทองคำ', en: 'Golden Kingdom', tier: 4 },
]

export const xpNeed = (lvl) => 80 + 40 * lvl
export function levelFromXp(xp) {
  let lvl = 1, rest = xp
  while (rest >= xpNeed(lvl)) { rest -= xpNeed(lvl); lvl++ }
  return { level: lvl, into: rest, need: xpNeed(lvl) }
}

const BOSS_KIND = {
  credit: { sprite: 'dragon', name: 'มังกรดอกเบี้ย', en: 'Interest Dragon' },
  loan: { sprite: 'golem', name: 'โกเลมผ่อนงวด', en: 'Installment Golem' },
}

export const ACHIEVEMENTS = [
  { id: 'read_first', name: 'นักอ่านหน้าใหม่', desc: 'อ่านหนังสือวันแรก', icon: 'book', habit: true },
  { id: 'book1', name: 'จบเล่มแรก', desc: 'อ่านหนังสือจบ 1 เล่ม', icon: 'book', habit: true },
  { id: 'book10', name: 'ชั้นหนังสือเต็มแถว', desc: 'อ่านจบ 10 เล่ม', icon: 'book', habit: true },
  { id: 'pages1000', name: 'พันหน้า', desc: 'อ่านรวม 1,000 หน้า', icon: 'book', habit: true },
  { id: 'read30', name: 'หนอนหนังสือ', desc: 'อ่านทุกวัน 30 วันติด', icon: 'book', habit: true },
  { id: 'ex_first', name: 'เหงื่อหยดแรก', desc: 'ออกกำลังกายวันแรก', icon: 'gym', habit: true },
  { id: 'ex7', name: 'ร่างเหล็ก', desc: 'ออกกำลังกายครบ 7 วันติด', icon: 'gym', habit: true },
  { id: 'push1000', name: 'พันวิดพื้น', desc: 'วิดพื้นสะสม 1,000 ครั้ง', icon: 'gym', habit: true },
  { id: 'reps10k', name: 'หมื่นครั้ง', desc: 'ทุกท่ารวม 10,000 ครั้ง', icon: 'gym', habit: true },
  { id: 'med_first', name: 'ลมหายใจแรก', desc: 'นั่งสมาธิครั้งแรก', icon: 'sparkles', habit: true },
  { id: 'med600', name: 'จิตนิ่ง', desc: 'สมาธิสะสม 10 ชั่วโมง', icon: 'sparkles', habit: true },
  { id: 'med30', name: 'พระธุดงค์', desc: 'นั่งสมาธิ 30 วันติด', icon: 'sparkles', habit: true },
  { id: 'sleep_first', name: 'หลับฝันดี', desc: 'บันทึกการนอนครั้งแรก', icon: 'home', habit: true },
  { id: 'sleep8x7', name: 'นอนเต็มอิ่ม', desc: 'นอน ≥ 8 ชม. 7 คืน', icon: 'home', habit: true },
  { id: 'ontime14', name: 'นาฬิกาชีวิต', desc: 'เข้านอนตรงเวลา 14 คืนติด', icon: 'home', habit: true },
  { id: 'carb7', name: 'ลาก่อนแป้ง', desc: 'ไม่กินแป้ง/น้ำตาล 7 วันติด', icon: 'health', habit: true },
  { id: 'carb30', name: 'สายคลีน', desc: 'ไม่กินแป้ง/น้ำตาล 30 วันติด', icon: 'health', habit: true },
  { id: 'vocab50', name: 'คำศัพท์ 50', desc: 'จำศัพท์ได้ 50 คำ', icon: 'edu', habit: true },
  { id: 'vocab300', name: 'นักภาษา', desc: 'จำศัพท์ได้ 300 คำ', icon: 'edu', habit: true },
  { id: 'allsix', name: 'วันสมบูรณ์แบบ', desc: 'ทำครบทั้ง 6 นิสัยในวันเดียว', icon: 'award', habit: true },
  { id: 'life_knight', name: 'อัศวินแห่งนิสัย', desc: 'ยศแห่งวินัยถึงขั้นอัศวิน', icon: 'shield', habit: true },
  { id: 'profit10k', name: 'กำไรหมื่นแรก', desc: 'กำไรจากการลงทุนรวม ฿10,000', icon: 'trending', habit: true },
  { id: 'first_step', name: 'ก้าวแรก', desc: 'บันทึกรายการแรก', icon: 'sparkles' },
  { id: 'streak7', name: 'วินัยเหล็ก', desc: 'บันทึกต่อเนื่อง 7 วัน', icon: 'zap' },
  { id: 'streak30', name: 'ตำนานแห่งวินัย', desc: 'บันทึกต่อเนื่อง 30 วัน', icon: 'award' },
  { id: 'first_strike', name: 'ดาบแรก', desc: 'ชำระหนี้ครั้งแรก', icon: 'shield' },
  { id: 'boss_slayer', name: 'ผู้ปราบบอส', desc: 'ปราบบอสหนี้ได้ 1 ตัว', icon: 'target' },
  { id: 'shield_wall', name: 'กำแพงโล่', desc: 'กันเงินชำระหนี้ครบ 100%', icon: 'vault' },
  { id: 'saver20', name: 'นักออม', desc: 'เดือนที่ออมได้ 20% ขึ้นไป', icon: 'piggy' },
  { id: 'investor', name: 'นักลงทุนฝึกหัด', desc: 'ส่งเงินเข้ากระเป๋าลงทุนครั้งแรก', icon: 'trending' },
  { id: 'first_loot', name: 'นักล่าสมบัติ', desc: 'ซื้อสินทรัพย์ลงทุนครั้งแรก', icon: 'gem' },
  { id: 'diversified', name: 'คลังหลากหลาย', desc: 'ถือสินทรัพย์ 3 ประเภทขึ้นไป', icon: 'coins' },
  { id: 'profit10', name: 'มือทอง', desc: 'พอร์ตกำไรเกิน 10%', icon: 'trending' },
  { id: 'goal_done', name: 'ผู้พิชิตเป้าหมาย', desc: 'ออมครบเป้าหมายแรก', icon: 'target' },
  { id: 'planner', name: 'นักวางแผน', desc: 'ตั้งงบประมาณหรือเป้าหมายการออม', icon: 'scale' },
  { id: 'txn100', name: 'นักบันทึก', desc: 'บันทึกครบ 100 รายการ', icon: 'book' },
  { id: 'free_land', name: 'พ้นแดนหมอก', desc: 'มูลค่าสุทธิเป็นบวก', icon: 'home' },
  { id: 'nw100k', name: 'ปราสาทแรก', desc: 'มูลค่าสุทธิถึง 100,000', icon: 'building' },
  { id: 'nw1m', name: 'ราชาแห่งเกาะ', desc: 'มูลค่าสุทธิถึง 1,000,000', icon: 'gem' },
]

function computeRpg({ accounts, txns, settings, balances, summary, unlocked, portfolio, goals = [], budgets = [], catById = {}, data = {}, privacy = false, wx = null, btcPct = null, habits = null }) {
  portfolio ||= { open: [], value: 0, pnlPct: 0, byType: {} }
  const typesHeld = Object.keys(portfolio.byType).filter((k) => portfolio.byType[k] > 0).length
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const today = todayISO()
  const evNow = thaiEvent(today, settings.payday)
  const chrono = [...txns].sort((a, b) => (a.date + (a.createdAt || '')).localeCompare(b.date + (b.createdAt || '')))

  // ---------- bosses (each debt account) ----------
  const bosses = accounts.filter((a) => (a.type === 'credit' || a.type === 'loan') && !a.archived).map((a) => {
    let bal = a.opening || 0, peak = Math.max(0, -bal), dmg = 0, hits = 0
    for (const t of chrono) {
      for (const p of postingsOf(t, accById, settings)) {
        if (p.acc !== a.id) continue
        bal = round2(bal + p.amt)
        peak = Math.max(peak, -bal)
        if (p.amt > 0 && t.kind === 'payment') { dmg += p.amt; hits++ }
      }
    }
    const owed = Math.max(0, -(balances[a.id] || 0))
    const kind = BOSS_KIND[a.type]
    return {
      id: a.id, account: a, sprite: kind.sprite, name: `${kind.name}`, en: kind.en, accName: a.name,
      hp: owed, maxHp: Math.max(peak, owed), damage: round2(dmg), hits,
      level: Math.max(1, Math.ceil(Math.max(peak, owed) / 5000)),
      defeated: peak > 0 && owed <= 0, active: owed > 0,
    }
  }).filter((b) => b.maxHp > 0)
  // ---------- goal bosses: each savings goal is a creature you defeat by filling it ----------
  const goalBosses = goals.filter((g) => g.target > 0 && g.account).map((g) => {
    const saved = Math.max(0, balances[g.account] || 0)
    const left = Math.max(0, round2(g.target - saved))
    return {
      id: `goal:${g.id}`, goal: g, sprite: 'slime', name: 'สไลม์เป้าหมาย', en: 'Goal Slime', accName: g.name,
      hp: left, maxHp: g.target, damage: round2(Math.min(saved, g.target)), hits: 0,
      level: Math.max(1, Math.ceil(g.target / 10000)), defeated: saved >= g.target, active: left > 0, isGoal: true,
    }
  })
  bosses.push(...goalBosses)

  // ---------- activity ----------
  const days = new Map()
  for (const t of txns) { const d = loggedDay(t); days.set(d, (days.get(d) || 0) + 1) }
  // a day with any habit done counts as an active day too
  for (const d of habits?.activeDays || []) if (!days.has(d)) days.set(d, 1)
  // "วันนี้ไม่ใช้เงิน" days count as logged days (no entry, but a conscious decision)
  const noSpendMarks = data?.noSpend || {}
  for (const d of Object.keys(noSpendMarks)) if (!days.has(d)) days.set(d, 1)
  let noSpendStreak = 0
  {
    const d = new Date(today + 'T12:00:00')
    if (!noSpendMarks[today]) d.setDate(d.getDate() - 1)
    while (noSpendMarks[localDate(d.toISOString())]) { noSpendStreak++; d.setDate(d.getDate() - 1) }
  }
  const noSpendTotal = Object.keys(noSpendMarks).length
  let streak = 0
  {
    const d = new Date()
    if (!days.has(today)) d.setDate(d.getDate() - 1)
    for (;;) {
      const k = localDate(d.toISOString())
      if (!days.has(k)) break
      streak++; d.setDate(d.getDate() - 1)
    }
  }

  let bestStreak = streak
  {
    const sorted = [...days.keys()].filter(Boolean).sort()
    let run = 0, prev = null
    for (const k of sorted) {
      const d = new Date(k + 'T12:00:00')
      run = prev && (d - prev) / 86400000 < 1.5 ? run + 1 : 1
      bestStreak = Math.max(bestStreak, run); prev = d
    }
  }

  const months = {}
  for (const t of txns) {
    const m = monthKey(t.date)
    months[m] ||= { inc: 0, exp: 0 }
    if (t.kind === 'income') months[m].inc += t.amount
    if (t.kind === 'expense') months[m].exp += t.amount
  }
  const investIds = new Set(accounts.filter((a) => a.type === 'invest').map((a) => a.id))
  let investIn = 0, payments = 0
  for (const t of txns) {
    if (t.kind === 'payment') payments++
    if (t.kind === 'income' && t.split) for (const [k, v] of Object.entries(t.split)) if (investIds.has(k)) investIn += v
    if (t.kind === 'transfer' && investIds.has(t.to) && !investIds.has(t.account)) investIn += t.amount
  }

  // ---------- saver rank: (saving + invest + reserve inflow) / income, this month and last ----------
  const rankOf = (ratio) => ratio >= 0.3 ? { id: 'legend', name: 'ตำนานนักออม', emoji: '👑', min: 0.3 } : ratio >= 0.2 ? { id: 'sage', name: 'ปราชญ์การเงิน', emoji: '🔮', min: 0.2 } : ratio >= 0.1 ? { id: 'saver', name: 'นักออม', emoji: '🐷', min: 0.1 } : { id: 'novice', name: 'ฝึกหัด', emoji: '🌱', min: 0 }
  const saveRatioOf = (mk) => {
    let inc = 0, sav = 0
    const typeOf = (id) => accById[id]?.type
    for (const t of txns) {
      if (monthKey(t.date) !== mk) continue
      if (t.kind === 'income') { inc += t.amount; if (t.split) for (const [k, v] of Object.entries(t.split)) if (['saving', 'invest', 'reserve'].includes(typeOf(k))) sav += v }
      if (t.kind === 'transfer' && ['saving', 'invest', 'reserve'].includes(typeOf(t.to)) && !['saving', 'invest', 'reserve'].includes(typeOf(t.account))) sav += t.amount
      if (t.kind === 'trade' && t.side === 'buy' && t.account && !['invest'].includes(typeOf(t.account))) sav += t.total || t.amount || 0
    }
    return inc > 0 ? Math.min(1, sav / inc) : null
  }
  const thisMonthRatio = saveRatioOf(monthKey(today))
  const lastMonthKey = (() => { const d = new Date(today + 'T12:00:00'); d.setMonth(d.getMonth() - 1); return monthKey(d.toISOString().slice(0, 10)) })()
  const lastMonthRatio = saveRatioOf(lastMonthKey)
  const rankRatio = thisMonthRatio ?? lastMonthRatio ?? 0
  const rank = { ...rankOf(rankRatio), ratio: rankRatio, thisMonth: thisMonthRatio, lastMonth: lastMonthRatio, next: [0.1, 0.2, 0.3].find((x) => x > rankRatio) ?? null }

  // ---------- achievements (persisted once unlocked) ----------
  const goodMonths = Object.values(months).filter((m) => m.inc > 0 && (m.inc - m.exp) / m.inc >= 0.2).length
  const h = habits
  const cond = {
    read_first: !!(h && h.by.read.total > 0),
    book1: !!(h && h.finished.length >= 1),
    book10: !!(h && h.finished.length >= 10),
    pages1000: !!(h && h.pagesTotal >= 1000),
    read30: !!(h && h.by.read.best >= 30),
    ex_first: !!(h && h.by.exercise.total > 0),
    ex7: !!(h && h.by.exercise.best >= 7),
    push1000: !!(h && h.reps.push >= 1000),
    reps10k: !!(h && h.reps.push + h.reps.squat + h.reps.sit >= 10000),
    med_first: !!(h && h.by.meditate.total > 0),
    med600: !!(h && h.medMin >= 600),
    med30: !!(h && h.by.meditate.best >= 30),
    sleep_first: !!(h && h.sleeps.length > 0),
    sleep8x7: !!(h && h.sleeps.filter((x) => x.hours >= 8).length >= 7),
    ontime14: !!(h && h.by.sleep.best >= 14),
    carb7: !!(h && h.by.nocarb.best >= 7),
    carb30: !!(h && h.by.nocarb.best >= 30),
    vocab50: !!(h && h.learnt >= 50),
    vocab300: !!(h && h.learnt >= 300),
    allsix: !!(h && Object.values(h.by).filter((x) => x.id !== 'nospend' && x.today >= 1).length >= 6),
    life_knight: !!(h && h.life >= 0.6),
    profit10k: !!((data.profitPeak || 0) >= 10000),
    first_step: txns.length > 0,
    streak7: streak >= 7, streak30: streak >= 30,
    first_strike: payments > 0,
    boss_slayer: bosses.some((b) => b.defeated),
    shield_wall: summary.target > 0 && summary.coverage >= 1,
    saver20: goodMonths > 0,
    investor: investIn > 0,
    txn100: txns.length >= 100,
    goal_done: goals.some((g) => g.target > 0 && (balances[g.account] || 0) >= g.target),
    planner: goals.length > 0 || budgets.length > 0,
    first_loot: txns.some((t) => t.kind === 'trade' && t.side === 'buy'),
    diversified: typesHeld >= 3,
    profit10: portfolio.cost > 0 && portfolio.pnlPct >= 0.1,
    free_land: txns.length > 0 && summary.net >= 0,
    nw100k: summary.net >= 100000,
    nw1m: summary.net >= 1000000,
  }
  const achievements = ACHIEVEMENTS.map((a) => ({ ...a, unlockedAt: unlocked[a.id] || null, ready: !!cond[a.id] }))
  const newlyUnlocked = achievements.filter((a) => a.ready && !a.unlockedAt).map((a) => a.id)
  const unlockedCount = achievements.filter((a) => a.unlockedAt || a.ready).length

  // ---------- XP ----------
  let xp = 0
  const xpParts = []
  const add = (label, v) => { v = Math.round(v); if (v > 0) { xp += v; xpParts.push([label, v]) } }
  add('วันที่บันทึกรายการ', days.size * 10)
  add('รายการที่บันทึก', [...days.values()].reduce((s, n) => s + Math.min(5, n) * 2, 0))
  add('โจมตีบอส (ชำระหนี้)', txns.filter((t) => t.kind === 'payment').reduce((s, t) => s + 20 + Math.min(200, t.amount / 200), 0))
  add('เดือนที่มีเงินเหลือ', Object.values(months).filter((m) => m.inc > m.exp && m.inc > 0).length * 100)
  add('เดือนที่ออมได้ 20%+', goodMonths * 100)
  add('ส่งเงินไปลงทุน', investIn / 500)
  add('ซื้อสินทรัพย์ลงทุน', txns.filter((t) => t.kind === 'trade' && t.side === 'buy').reduce((s, t) => s + 15 + Math.min(300, (t.amount || t.total || 0) / 500), 0))
  if (habits) {
    add('นิสัยที่ทำ', Object.values(habits.by).reduce((s, h) => s + h.total * 5, 0))
    add('หนังสือที่อ่านจบ', habits.finished.length * 100)
    add('คำศัพท์ที่จำได้', habits.learnt)
  }
  add('Achievement', unlockedCount * 50)
  const realmNow = [...REALMS].reverse().find((r) => summary.net >= r.min)
  const debtFog = Math.min(0.55, summary.debts / Math.max(1, summary.assets + summary.debts))
  const town = computeTown(data, { realmTier: realmNow.tier, streak, debtFog })
  if (town.xpBonus) add(`ห้องสมุด +${town.xpBonus}%`, (xp * town.xpBonus) / 100)
  const lv = levelFromXp(xp)
  const title = [...TITLES].reverse().find(([min]) => lv.level >= min)

  // ---------- stats 0..99 ----------
  const cur = months[monthKey(today)] || { inc: 0, exp: 0 }
  const rate = cur.inc > 0 ? (cur.inc - cur.exp) / cur.inc : 0
  const avgExp = Object.values(months).reduce((s, m) => s + m.exp, 0) / Math.max(1, Object.keys(months).length)
  const cash = summary.byType.cash || 0
  const assets = Math.max(1, summary.assets)
  const clamp = (v) => Math.max(0, Math.min(99, Math.round(v)))
  const stats = [
    { key: 'STR', name: 'พลังออม', value: clamp(rate * 200), hint: 'อัตราการออมเดือนนี้' },
    { key: 'DEF', name: 'ป้องกัน', value: clamp((summary.target > 0 ? summary.coverage : 1) * 60 + Math.min(39, avgExp > 0 ? (cash / avgExp) * 10 : 0)), hint: 'เงินกันหนี้ + เงินสำรองกี่เดือน' },
    { key: 'INT', name: 'ปัญญา', value: clamp((((summary.byType.invest || 0) + (summary.byType.saving || 0) + portfolio.value) / assets) * 150 + typesHeld * 8), hint: 'สัดส่วนเงินลงทุน/ออม + ความหลากหลายของพอร์ต' },
    { key: 'AGI', name: 'วินัย', value: clamp(streak * 3.3), hint: 'บันทึกต่อเนื่อง (วัน)' },
    { key: 'LUK', name: 'โชค', value: clamp(50 + (portfolio.cost > 0 ? portfolio.pnlPct * 200 : 0)), hint: 'ผลตอบแทนพอร์ตลงทุน (50 = เท่าทุน)' },
  ]

  // ---------- quests (rewards: FIAT for daily, GOLD for weekly / monthly / main) ----------
  const startOfWeek = weekKey()
  const lastWeek = (() => { const d = new Date(startOfWeek + 'T12:00:00'); d.setDate(d.getDate() - 7); return localDate(d.toISOString()) })()
  const todayCount = days.get(today) || 0
  const weekDays = [...days.keys()].filter((d) => d >= startOfWeek && d <= today).length
  const weekHits = txns.filter((t) => t.kind === 'payment' && t.date >= startOfWeek).length
  const investWeek = txns.filter((t) => t.date >= startOfWeek && ((t.kind === 'transfer' && investIds.has(t.to) && !investIds.has(t.account)) || (t.kind === 'income' && t.split && Object.keys(t.split).some((k) => investIds.has(k))) || (t.kind === 'trade' && t.side === 'buy'))).length
  const firstDay = chrono[0]?.date || today
  const spendDays = new Set(txns.filter((t) => t.kind === 'expense').map((t) => t.date))
  let noSpend = 0
  for (let d = new Date(startOfWeek + 'T12:00:00'); localDate(d.toISOString()) < today; d.setDate(d.getDate() + 1)) {
    const k = localDate(d.toISOString())
    if (k >= firstDay && !spendDays.has(k)) noSpend++
  }
  const weekSpend = (from, to) => txns.filter((t) => t.kind === 'expense' && t.date >= from && t.date < to).reduce((s, t) => s + t.amount, 0)
  const wkShift = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + 7 * n); return localDate(d.toISOString()) }
  const lastWeekSpend = weekSpend(lastWeek, startOfWeek)
  const prevWeeks = [1, 2, 3, 4].map((n) => weekSpend(wkShift(lastWeek, -n), wkShift(lastWeek, -n + 1)))
  const prevAvg = prevWeeks.filter((v) => v > 0).length >= 2 ? prevWeeks.reduce((a, b) => a + b, 0) / prevWeeks.filter((v) => v > 0).length : 0
  const lastMonth = (() => { const d = new Date(today + 'T12:00:00'); d.setDate(1); d.setMonth(d.getMonth() - 1); return monthKey(localDate(d.toISOString())) })()
  const lm = months[lastMonth] || { inc: 0, exp: 0 }
  const lmRate = lm.inc > 0 ? (lm.inc - lm.exp) / lm.inc : 0
  const aliveBosses = bosses.filter((b) => b.active)
  const mk = monthKey(today)
  const quests = [
    { tier: 'รายวัน', key: `d:${today}:1`, name: 'บันทึกรายการวันนี้', progress: Math.min(1, todayCount), goal: 1, fiat: 20 * (evNow?.id === 'newyear' ? 2 : 1) },
    { tier: 'รายวัน', key: `d:${today}:3`, name: 'บันทึกให้ครบ 3 รายการ', progress: Math.min(3, todayCount), goal: 3, fiat: 20 * (evNow?.id === 'newyear' ? 2 : 1) },
    { tier: 'รายสัปดาห์', key: `w:${startOfWeek}:habits`, name: 'ทำนิสัยอย่างน้อย 1 อย่าง ครบ 5 วันในสัปดาห์', progress: Math.min(5, habits?.thisWeek || 0), goal: 5, gold: 1, auto: true, hint: 'ได้ GOLD อัตโนมัติเมื่อครบ' },
    { tier: 'รายสัปดาห์', key: `w:${startOfWeek}:days`, name: 'บันทึกครบ 5 วันในสัปดาห์นี้', progress: Math.min(5, weekDays), goal: 5, fiat: 60 },
    { tier: 'รายสัปดาห์', key: `w:${startOfWeek}:nospend`, name: 'มีวันที่ไม่ใช้จ่ายเลย 2 วัน', progress: Math.min(2, noSpend), goal: 2, fiat: 60, hint: 'นับวันที่ผ่านไปแล้วของสัปดาห์นี้' },
    aliveBosses.length
      ? { tier: 'รายสัปดาห์', key: `w:${startOfWeek}:hit`, name: 'โจมตีบอสอย่างน้อย 1 ครั้ง', progress: Math.min(1, weekHits), goal: 1, fiat: 60 }
      : { tier: 'รายสัปดาห์', key: `w:${startOfWeek}:invest`, name: 'ส่งเงินเข้าลงทุนหรือซื้อสินทรัพย์สัปดาห์นี้', progress: Math.min(1, investWeek), goal: 1, fiat: 60 },
    town.towerGold && prevAvg > 0
      ? { tier: 'รายสัปดาห์', key: `w:${lastWeek}:tower`, name: '🗼 สัปดาห์ที่แล้วใช้จ่ายน้อยกว่าค่าเฉลี่ย', progress: lastWeekSpend < prevAvg ? 1 : 0, goal: 1, fiat: town.towerGold * 40, hint: `ใช้ ${Math.round(lastWeekSpend).toLocaleString()} · เฉลี่ย ${Math.round(prevAvg).toLocaleString()}` }
      : null,
    { tier: 'รายเดือน', key: `m:${lastMonth}:save`, name: 'เดือนที่แล้วออมได้ 20% ของรายรับ', progress: Math.max(0, Math.min(20, Math.round(lmRate * 100))), goal: 20, unit: '%', gold: 5 },
    { tier: 'รายเดือน', key: `m:${mk}:cover`, name: 'กันเงินชำระหนี้ให้ครบ 100%', progress: Math.round((summary.target > 0 ? summary.coverage : 1) * 100), goal: 100, unit: '%', gold: 3 },
    { tier: 'เควสต์หลัก', key: 'main:bosses', name: 'ปราบบอสหนี้ทุกตัว', progress: bosses.filter((b) => b.defeated).length, goal: Math.max(1, bosses.length), gold: 20, need: bosses.length > 0 },
    { tier: 'เควสต์หลัก', key: 'main:free', name: 'ออกจากแดนหมอกหนี้ (มูลค่าสุทธิ ≥ 0)', progress: summary.net >= 0 && txns.length ? 1 : 0, goal: 1, gold: 10 },
    { tier: 'เควสต์หลัก', key: 'main:invest100k', name: 'สะสมเงินลงทุน 100,000', progress: Math.min(100000, Math.round((summary.byType.invest || 0) + portfolio.value)), goal: 100000, money: true, gold: 30 },
  ].filter(Boolean).map((q) => {
    const done = q.progress >= q.goal && q.need !== false
    const claimedAt = (data.claims || {})[q.key] || null
    return { ...q, done, claimedAt: q.auto && done ? 'auto' : claimedAt, claimable: done && !claimedAt && !q.auto }
  })

  // ---------- wallet ----------
  const wallet = computeWallet({ days, txns, data, achievementsUnlocked: Object.keys(unlocked).length, bossesDefeated: bosses.filter((b) => b.defeated).length, habits, habitBoost: town.habitBoost })

  // weather mirrors this month's money: overspending brings storms, otherwise the Thai season
  const mo = new Date().getMonth() + 1
  const dayHash = [...today].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 997
  const overspend = cur.inc > 0 && cur.exp > cur.inc
  const real = sceneWeather(wx)
  const weather = overspend ? 'storm'
    : real === 'rain' || real === 'storm' || real === 'fog' ? real
    : real === 'sun' && (mo >= 11 || mo <= 2) ? 'leaves'
    : real || (mo >= 6 && mo <= 10 && dayHash < 0.45 ? 'rain' : (mo >= 11 || mo <= 2) ? 'leaves' : 'sun')

  const realm = realmNow
  const nextRealm = REALMS.find((r) => r.min > summary.net)
  const party = computeParty({ accounts, txns, summary, portfolio, settings, catById, level: lv.level, into: lv.into, need: lv.need, streak, bestStreak, goodMonths, months, data: { ...data, unlocked }, privacy })
  // ---------- the living world: real weather, Thai calendar, money mood, market mood ----------
  const budgetStates = budgetStatus(budgets, txns)
  const event = evNow
  const world = {
    weather, real, wx, event, holiday: isThaiHoliday(today),
    mood: moneyMood({ budgets: budgetStates, rank, overspend }),
    btc: btcPct == null ? 'flat' : btcPct <= -5 ? 'crash' : btcPct >= 5 ? 'pump' : 'flat', btcPct,
    aurora: noSpendStreak >= 7,
    tree: Math.min(5, Math.floor((party.totals.savingIn || 0) / 2000)), // golden tree grows with lifetime saving
    sunrise: wx?.sunrise || '06:10', sunset: wx?.sunset || '18:10', temp: wx?.temp,
  }

  return {
    inventory: portfolio.open, portfolioValue: portfolio.value,
    xp, xpParts, ...lv, title: title[1], titleEn: title[2], stats, bosses, quests, achievements, newlyUnlocked,
    streak, bestStreak, realm, nextRealm, weather, loggedToday: todayCount, debtFog, town, wallet, days,
    noSpendStreak, noSpendTotal, noSpendToday: !!noSpendMarks[today], spentToday: spendDays.has(today),
    rank, goalBosses, world, habits,
    ...party,
  }
}

export function useRpg() {
  const v = useVault()
  const put = useStore((s) => s.put)
  const privacy = useStore((s) => s.ui.privacy)
  const rpgItem = useStore((s) => s.items.rpg)
  const data = (rpgItem && !rpgItem.deleted && rpgItem.data) || {}
  const unlocked = data.unlocked || {}
  const key = JSON.stringify([v.balances, v.txns.length, v.txns[0]?.id, v.txns[0]?.amount, rpgItem?.rev, todayISO(), Math.round(v.portfolio.value / 10), privacy])
  const items = useStore((s) => s.items)
  const goals = useMemo(() => Object.values(items).filter((i) => i.kind === 'goal' && !i.deleted).map((i) => i.data), [items])
  const budgets = useMemo(() => Object.values(items).filter((i) => i.kind === 'budget' && !i.deleted).map((i) => i.data), [items])
  const wx = useWeather((s) => s.data)
  const btcPct = usePrices((s) => s.quotes['BTC-USD']?.changePct ?? null)
  useEffect(() => {
    const w = v.settings?.weather
    if (!w?.lat) return
    loadWeather(w.lat, w.lon)
    const id = setInterval(() => document.visibilityState === 'visible' && loadWeather(w.lat, w.lon), 20 * 60_000)
    return () => clearInterval(id)
  }, [v.settings?.weather?.lat, v.settings?.weather?.lon])
  const habitItems = useMemo(() => {
    const it = items
    return {
      days: Object.fromEntries(selectList(it, 'habitday').map((d) => [d.date, d])), books: selectList(it, 'book'),
      vocab: it.vocab && !it.vocab.deleted ? it.vocab.data : {}, state: it['habit-state'] && !it['habit-state'].deleted ? it['habit-state'].data : {},
    }
  }, [items])
  const habits = useMemo(() => computeHabits({ ...habitItems, noSpend: data.noSpend || {}, today: todayISO() }), [habitItems, JSON.stringify(data.noSpend || {})]) // eslint-disable-line
  const rpg = useMemo(() => computeRpg({ ...v, unlocked, goals, budgets, data, privacy, wx, btcPct: btcPct == null ? null : Math.round(btcPct), habits }), [key, goals.length, budgets.length, JSON.stringify(data), wx?.at, wx?.code, btcPct == null ? null : Math.round(btcPct), habits]) // eslint-disable-line
  const chestReady = rpg.loggedToday > 0 && data.chestLast !== todayISO()
  const setUi = useStore((s) => s.setUi)
  // new investment profit (open + realized), kept as a high-water mark so a dip never takes GOLD back
  const profitNow = Math.round((v.portfolio.pnl || 0) + (v.portfolio.realized || 0))
  useEffect(() => {
    if (!v.portfolio.value && !v.portfolio.realized) return
    const d = fresh()
    if (profitNow > (d.profitPeak || 0) + 1) put('rpg', { ...d, id: 'rpg', profitPeak: profitNow })
  }, [Math.floor(profitNow / 1000)]) // eslint-disable-line
  const worldLite = JSON.stringify({ weather: rpg.world.weather, event: rpg.world.event?.id || null, mood: rpg.world.mood.id, btc: rpg.world.btc, aurora: rpg.world.aurora, tree: rpg.world.tree, rank: rpg.rank.id, holiday: rpg.world.holiday })
  useEffect(() => { if (JSON.stringify(useStore.getState().ui._worldCache || null) !== worldLite) setUi({ _worldCache: JSON.parse(worldLite) }) }, [worldLite]) // eslint-disable-line
  const fresh = () => useStore.getState().items.rpg?.data || {}
  const save = (patch) => put('rpg', { ...fresh(), id: 'rpg', ...patch })
  const { fiat, gold } = rpg.wallet
  const now = () => new Date().toISOString()
  const logE = (d, e) => [...(d.econLog || []).slice(-80), { at: now(), ...e }]
  /** add (or spend, with negatives) FIAT/GOLD and record it in the adventure log */
  const pay = (dF, dG, e, patch = {}) => {
    const d = fresh()
    save({ fiat: (d.fiat || 0) + dF, gold: (d.gold || 0) + dG, econLog: logE(d, { ...e, fiat: dF || undefined, gold: dG || undefined }), ...patch })
  }
  const afford = (p) => fiat >= p.fiat && gold >= p.gold
  /** "วันนี้ไม่ใช้เงิน": FIAT grows with the run, every 3rd day in a row pays GOLD */
  const noSpendReward = (() => {
    const run = rpg.noSpendToday ? rpg.noSpendStreak : rpg.noSpendStreak + 1
    const x2 = rpg.world.event?.id === 'songkran' ? 2 : 1
    return { run, fiat: (30 + 10 * Math.min(7, run)) * x2, gold: 0 } // GOLD comes from the 7/30/100-day streak milestones instead
  })()
  const markNoSpend = () => {
    if (rpg.noSpendToday || rpg.spentToday) return null
    const d = fresh()
    const r = noSpendReward
    pay(r.fiat, r.gold, { type: 'nospend', run: r.run, text: `วันนี้ไม่ใช้เงิน ✨ ติดกัน ${r.run} วัน` }, { noSpend: { ...(d.noSpend || {}), [localDate(now())]: true } })
    return r
  }
  const openChest = () => {
    if (!chestReady) return null
    const bonus = rpg.streak >= 3 ? Math.min(10, rpg.streak) : 0
    const roll = Math.random()
    let gain = 5 + bonus + (roll > 0.9 ? 15 : roll > 0.6 ? 5 : 0)
    const double = rpg.streak >= 30
    if (double) gain *= 2
    gain *= GEM_TO_FIAT
    const tip = CHEST_TIPS[Math.floor(Math.random() * CHEST_TIPS.length)]
    sfx('coin')
    const d = fresh()
    save({ fiat: (d.fiat || 0) + gain, chestLast: todayISO(), chestCount: (d.chestCount || 0) + 1, chestLog: [...(d.chestLog || []).slice(-40), { at: now(), gain, ccy: 'fiat', rare: roll > 0.9 }] })
    return { gain, rare: roll > 0.9, tip, bonus, double }
  }
  const shopPrice = (item) => priceOf([item.price * GEM_TO_FIAT, 0], data, { discount: rpg.town.shopDiscount + (rpg.world.event?.id === 'payday' ? 10 : 0) })
  const buy = (item) => {
    const d = fresh(), p = shopPrice(item)
    if ((d.owned || {})[item.id] || !afford(p)) return false
    const equip = { ...(d.equip || {}) }
    if (item.type === 'pet') equip.pet = item.id
    if (item.type === 'skin') equip.skin = item.id
    sfx('coin')
    pay(-p.fiat, 0, { icon: '🛒', text: `ซื้อ “${item.name}” จากร้านพ่อค้า` }, { owned: { ...(d.owned || {}), [item.id]: now() }, equip })
    return true
  }

  // ---------- town ----------
  const T = rpg.town
  const townOf = (d) => ({ hall: 1, plots: [], decor: {}, npcs: {}, ...(d.town || {}) })
  const buildPrice = (type, lv) => priceOf(BUILDINGS[type].cost[lv - 1], data, { discount: T.buildDiscount })
  const build = (i, type) => {
    const B = BUILDINGS[type], p = buildPrice(type, 1)
    if (!B || T.plots[i] || T.count(type) >= B.max || !afford(p) || (B.req && !B.req(habits))) return false
    const d = fresh(), town = townOf(d), plots = [...town.plots]
    plots[i] = { type, lv: 1, at: now() }
    sfx('levelup')
    pay(-p.fiat, -p.gold, { icon: B.emoji, text: `สร้าง${B.name}ในแปลงที่ ${i + 1}` }, { town: { ...town, plots } })
    return true
  }
  const upgrade = (i) => {
    const b = T.plots[i]; if (!b || b.lv >= 3) return false
    const B = BUILDINGS[b.type], p = buildPrice(b.type, b.lv + 1)
    const lr = LEVEL_REQ[b.type]?.[b.lv + 1]
    if (!afford(p) || (lr && !lr.req(habits))) return false
    const d = fresh(), town = townOf(d), plots = [...town.plots]
    plots[i] = { ...b, lv: b.lv + 1 }
    sfx('levelup')
    pay(-p.fiat, -p.gold, { icon: '⬆️', text: `อัปเกรด${B.name}เป็นระดับ ${b.lv + 1}` }, { town: { ...town, plots } })
    return true
  }
  const demolish = (i) => {
    const b = T.plots[i]; if (!b) return false
    const refund = Math.round(buildPrice(b.type, 1).fiat * 0.3)
    const d = fresh(), town = townOf(d), plots = [...town.plots]
    plots[i] = null
    pay(refund, 0, { icon: '🪓', text: `รื้อ${BUILDINGS[b.type].name} ได้วัสดุคืน` }, { town: { ...town, plots } })
    return true
  }
  const hallPrice = () => (T.town.hall < 3 ? priceOf(HALL.cost[T.town.hall], data, { discount: T.buildDiscount }) : null)
  const upgradeHall = () => {
    const p = hallPrice(); if (!p || !afford(p)) return false
    const d = fresh(), town = townOf(d)
    sfx('levelup')
    pay(-p.fiat, -p.gold, { icon: '🏛️', text: `ขยายศาลากลางเป็นระดับ ${town.hall + 1} — ได้ที่ดินเพิ่ม` }, { town: { ...town, hall: town.hall + 1 } })
    return true
  }
  const hire = (id) => {
    const n = NPC_BY_ID[id]; if (!n || T.npcs.includes(id) || T.npcs.length >= T.npcSlots) return false
    const p = priceOf(n.cost, data); if (!afford(p)) return false
    const d = fresh(), town = townOf(d)
    sfx('coin')
    pay(-p.fiat, -p.gold, { icon: '🤝', text: `จ้าง${n.name}มาอยู่ในเมือง` }, { town: { ...town, npcs: { ...town.npcs, [id]: now() } } })
    return true
  }
  const dismiss = (id) => { const d = fresh(), town = townOf(d), npcs = { ...town.npcs }; delete npcs[id]; save({ town: { ...town, npcs } }) }
  const buyDecor = (id) => {
    const x = DECOR_BY_ID[id]; if (!x || T.decor.includes(id)) return false
    const p = priceOf(x.cost, data); if (!afford(p)) return false
    const d = fresh(), town = townOf(d)
    sfx('coin')
    pay(-p.fiat, -p.gold, { icon: x.emoji, text: `ตกแต่งเมืองด้วย${x.name}` }, { town: { ...town, decor: { ...town.decor, [id]: now() } } })
    return true
  }
  const collectReady = rpg.loggedToday > 0 && data.collectLast !== todayISO() && (T.dailyFiat > 0 || T.bankRate > 0 || T.goldChance > 0)
  const collect = () => {
    if (!collectReady) return null
    const interest = T.bankRate ? Math.min(T.bankCap, Math.round((fiat * T.bankRate) / 100)) : 0
    const luckyGold = T.goldChance && Math.random() * 100 < T.goldChance ? 1 : 0
    const festive = rpg.world.event?.id === 'xmas' ? 1.5 : 1
    const f = Math.round(T.dailyFiat * festive) + interest
    sfx('coin')
    pay(f, luckyGold, { icon: '🧺', text: `เก็บรายได้เมือง${interest ? ` (ดอกเบี้ยธนาคาร ${interest})` : ''}${luckyGold ? ' · เหมืองเจอทองคำ!' : ''}` }, { collectLast: todayISO() })
    return { fiat: f, interest, gold: luckyGold }
  }
  const claim = (q) => {
    if (!q.claimable) return false
    const d = fresh()
    sfx('levelup')
    pay(q.fiat || 0, q.gold || 0, { icon: q.gold ? '🪙' : '💵', text: `รับรางวัลเควสต์ “${q.name}”` }, { claims: { ...(d.claims || {}), [q.key]: now() } })
    return true
  }
  const wk = weekKey()
  const exchangedThisWeek = (data.exch || {})[wk] || 0
  const exchange = (n = 1) => {
    const rate = exchangeRate(data), cost = rate * n
    if (n < 1 || exchangedThisWeek + n > EXCHANGE_WEEKLY || fiat < cost) return false
    sfx('coin')
    pay(-cost, n, { icon: '⚖️', text: `แลก FIAT เป็น GOLD (เรต ${rate}:1)` }, { exch: { [wk]: exchangedThisWeek + n } })
    return true
  }
  const setEquip = (patch) => save({ equip: { ...(fresh().equip || {}), ...patch } })
  const toggleDeco = (id) => { const off = { ...(fresh().decoOff || {}) }; off[id] = !off[id]; save({ decoOff: off }) }

  // keep milestones (achievements, party joins, level-ups, realms) so they show in the adventure log
  useEffect(() => {
    const d = fresh()
    const now = new Date().toISOString()
    const patch = {}
    if (rpg.newlyUnlocked.length) { patch.unlocked = { ...(d.unlocked || {}) }; rpg.newlyUnlocked.forEach((id) => { patch.unlocked[id] = now }) }
    if (rpg.newlyJoined.length) { patch.joined = { ...(d.joined || {}) }; rpg.newlyJoined.forEach((id) => { patch.joined[id] = now }) }
    if (!d.econStart) patch.econStart = now
    if (d.gems && !d.gemsMigrated) { patch.fiat = (d.fiat || 0) + d.gems * GEM_TO_FIAT; patch.gemsMigrated = d.gems; patch.gems = 0; patch.econLog = [...(d.econLog || []), { at: now, icon: '💱', text: `แปลงเจมเดิม ${d.gems} เป็น FIAT`, fiat: d.gems * GEM_TO_FIAT }] }
    if (!d.maxLevel) patch.maxLevel = rpg.level
    else if (rpg.level > d.maxLevel) { patch.maxLevel = rpg.level; patch.levels = [...(d.levels || []).slice(-40), { lv: rpg.level, at: now }] }
    if (d.tier === undefined) patch.tier = rpg.realm.tier
    else if (rpg.realm.tier !== d.tier) { patch.tier = rpg.realm.tier; patch.realms = [...(d.realms || []).slice(-20), { name: rpg.realm.name, at: now, down: rpg.realm.tier < d.tier }] }
    if (Object.keys(patch).length) save(patch)
  }, [rpg.newlyUnlocked.join(), rpg.newlyJoined.join(), rpg.level, rpg.realm.tier]) // eslint-disable-line

  return {
    ...rpg, vault: v, fiat, gold, chestReady, openChest, buy, shopPrice, setEquip, toggleDeco, chestCount: data.chestCount || 0,
    inflation: inflationMult(data), afford, buildPrice, build, upgrade, demolish, hallPrice, upgradeHall, hire, dismiss, buyDecor,
    collectReady, collect, claim, exchange, exchangeRate: exchangeRate(data), exchangedThisWeek, econData: data,
    markNoSpend, noSpendReward,
  }
}

const CHEST_TIPS = [
  'จ่ายบัตรเต็มจำนวนก่อนวันครบกำหนด = ไม่เสียดอกเลยสักบาท',
  'กันเงินจ่ายหนี้ไว้ก่อน แล้วค่อยใช้ส่วนที่เหลือ',
  'ค่าใช้จ่ายเล็ก ๆ ทุกวัน รวมกันทั้งเดือนอาจเท่าค่าโทรศัพท์',
  'ลงทุนสม่ำเสมอทุกเดือน (DCA) สำคัญกว่าจับจังหวะตลาด',
  'เงินสำรองฉุกเฉิน 3–6 เดือนของรายจ่าย คือโล่ที่ดีที่สุด',
  'เช็ก Subscription ที่ไม่ได้ใช้ ยกเลิกได้ = ได้เงินคืนทุกเดือน',
  'ก่อนซื้อของชิ้นใหญ่ ลองรอ 48 ชั่วโมงก่อนตัดสินใจ',
  'ผ่อน 0% ยังกินวงเงินบัตร อย่าให้ยอดรวมเกินที่จ่ายไหว',
]

/** Compare a snapshot with what this device last displayed → battle events to replay. */
export function diffEvents(prev, snap, bosses) {
  if (!prev) return []
  const ev = []
  for (const b of bosses) {
    const before = prev.owed?.[b.id]
    if (before === undefined) continue
    const d = round2(before - b.hp)
    if (d > 0) ev.push({ type: 'hit', boss: b.id, amount: d, kill: b.hp <= 0 })
    if (d < 0) ev.push({ type: 'heal', boss: b.id, amount: -d })
  }
  if (prev.inv !== undefined && snap.inv > prev.inv + 0.5) ev.push({ type: 'skill', member: 'mage', skill: snap.inv - prev.inv >= 5000 ? 'meteor' : 'fireball', amount: round2(snap.inv - prev.inv) })
  if (prev.res !== undefined && snap.res > prev.res + 0.5) ev.push({ type: 'skill', member: 'healer', skill: 'shield', amount: round2(snap.res - prev.res) })
  if (prev.inc !== undefined && snap.inc > prev.inc) ev.push({ type: 'skill', member: 'healer', skill: 'heal' })
  if (prev.sav !== undefined && snap.sav > prev.sav + 0.5) ev.push({ type: 'skill', member: 'mage', skill: 'bless', amount: round2(snap.sav - prev.sav), text: `ร่ายเวทออม +${Math.round(snap.sav - prev.sav).toLocaleString()}` })
  for (const id of snap.party || []) if (prev.party && !prev.party.includes(id)) ev.push({ type: 'join', member: id })
  if (snap.level > (prev.level || 0) && prev.level) ev.push({ type: 'levelup', level: snap.level })
  for (const id of snap.ach || []) if (!(prev.ach || []).includes(id)) ev.push({ type: 'achievement', id })
  return ev
}
