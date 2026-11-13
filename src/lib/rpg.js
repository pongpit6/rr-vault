import { useEffect, useMemo } from 'react'
import { useStore } from '../store'
import { useVault } from './useVault'
import { postingsOf } from './ledger'
import { round2, todayISO, monthKey } from './format'

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

function computeRpg({ accounts, txns, settings, balances, summary, unlocked, portfolio, goals = [], budgets = [] }) {
  portfolio ||= { open: [], value: 0, pnlPct: 0, byType: {} }
  const typesHeld = Object.keys(portfolio.byType).filter((k) => portfolio.byType[k] > 0).length
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const today = todayISO()
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

  // ---------- activity ----------
  const days = new Map()
  for (const t of txns) { const d = loggedDay(t); days.set(d, (days.get(d) || 0) + 1) }
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

  // ---------- achievements (persisted once unlocked) ----------
  const goodMonths = Object.values(months).filter((m) => m.inc > 0 && (m.inc - m.exp) / m.inc >= 0.2).length
  const cond = {
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
  add('ซื้อสินทรัพย์ลงทุน', txns.filter((t) => t.kind === 'trade' && t.side === 'buy').length * 15)
  add('Achievement', unlockedCount * 50)
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

  // ---------- quests ----------
  const startOfWeek = (() => { const d = new Date(); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return localDate(d.toISOString()) })()
  const todayCount = days.get(today) || 0
  const weekDays = [...days.keys()].filter((d) => d >= startOfWeek && d <= today).length
  const weekHits = txns.filter((t) => t.kind === 'payment' && t.date >= startOfWeek).length
  const aliveBosses = bosses.filter((b) => b.active)
  const quests = [
    { tier: 'รายวัน', name: 'บันทึกรายการวันนี้', progress: Math.min(1, todayCount), goal: 1, xp: 10 },
    { tier: 'รายวัน', name: 'บันทึกให้ครบ 3 รายการ', progress: Math.min(3, todayCount), goal: 3, xp: 6 },
    { tier: 'รายสัปดาห์', name: 'บันทึกครบ 5 วันในสัปดาห์นี้', progress: Math.min(5, weekDays), goal: 5, xp: 50 },
    aliveBosses.length
      ? { tier: 'รายสัปดาห์', name: 'โจมตีบอสอย่างน้อย 1 ครั้ง', progress: Math.min(1, weekHits), goal: 1, xp: 20 }
      : { tier: 'รายสัปดาห์', name: 'ส่งเงินเข้ากระเป๋าลงทุน', progress: investIn > 0 ? 1 : 0, goal: 1, xp: 20 },
    { tier: 'รายเดือน', name: 'ออมให้ได้ 20% ของรายรับ', progress: Math.max(0, Math.min(20, Math.round(rate * 100))), goal: 20, unit: '%', xp: 200 },
    { tier: 'รายเดือน', name: 'กันเงินชำระหนี้ให้ครบ 100%', progress: Math.round((summary.target > 0 ? summary.coverage : 1) * 100), goal: 100, unit: '%', xp: 50 },
    { tier: 'เควสต์หลัก', name: 'ปราบบอสหนี้ทุกตัว', progress: bosses.filter((b) => b.defeated).length, goal: Math.max(1, bosses.length), xp: 500 },
    { tier: 'เควสต์หลัก', name: 'ออกจากแดนหมอกหนี้ (มูลค่าสุทธิ ≥ 0)', progress: summary.net >= 0 ? 1 : 0, goal: 1, xp: 300 },
    { tier: 'เควสต์หลัก', name: 'สะสมเงินลงทุน 100,000', progress: Math.min(100000, Math.round(summary.byType.invest || 0)), goal: 100000, money: true, xp: 1000 },
  ].map((q) => ({ ...q, done: q.progress >= q.goal }))

  // weather mirrors this month's money: overspending brings storms, otherwise the Thai season
  const mo = new Date().getMonth() + 1
  const dayHash = [...today].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 997
  const weather = cur.inc > 0 && cur.exp > cur.inc ? 'storm'
    : mo >= 6 && mo <= 10 && dayHash < 0.45 ? 'rain'
    : (mo >= 11 || mo <= 2) ? 'leaves' : 'sun'

  const realm = [...REALMS].reverse().find((r) => summary.net >= r.min)
  const nextRealm = REALMS.find((r) => r.min > summary.net)

  return {
    inventory: portfolio.open, portfolioValue: portfolio.value,
    xp, xpParts, ...lv, title: title[1], titleEn: title[2], stats, bosses, quests, achievements, newlyUnlocked,
    streak, realm, nextRealm, weather, loggedToday: todayCount, debtFog: Math.min(0.55, summary.debts / Math.max(1, summary.assets + summary.debts)),
  }
}

export function useRpg() {
  const v = useVault()
  const put = useStore((s) => s.put)
  const rpgItem = useStore((s) => s.items.rpg)
  const unlocked = (rpgItem && !rpgItem.deleted && rpgItem.data.unlocked) || {}
  const key = JSON.stringify([v.balances, v.txns.length, v.txns[0]?.id, v.txns[0]?.amount, Object.keys(unlocked).length, todayISO(), Math.round(v.portfolio.value / 10)])
  const items = useStore((s) => s.items)
  const goals = useMemo(() => Object.values(items).filter((i) => i.kind === 'goal' && !i.deleted).map((i) => i.data), [items])
  const budgets = useMemo(() => Object.values(items).filter((i) => i.kind === 'budget' && !i.deleted).map((i) => i.data), [items])
  const rpg = useMemo(() => computeRpg({ ...v, unlocked, goals, budgets }), [key, goals.length, budgets.length]) // eslint-disable-line
  const data = (rpgItem && !rpgItem.deleted && rpgItem.data) || {}
  const gems = data.gems || 0
  const chestReady = rpg.loggedToday > 0 && data.chestLast !== todayISO()
  const openChest = () => {
    if (!chestReady) return null
    const bonus = Math.min(10, rpg.streak)
    const roll = Math.random()
    const gain = 5 + bonus + (roll > 0.9 ? 15 : roll > 0.6 ? 5 : 0)
    const tip = CHEST_TIPS[Math.floor(Math.random() * CHEST_TIPS.length)]
    put('rpg', { ...data, id: 'rpg', unlocked: data.unlocked || {}, gems: gems + gain, chestLast: todayISO(), chestCount: (data.chestCount || 0) + 1 })
    return { gain, rare: roll > 0.9, tip, bonus }
  }

  useEffect(() => {
    if (!rpg.newlyUnlocked.length) return
    const now = new Date().toISOString()
    const next = { ...unlocked }
    rpg.newlyUnlocked.forEach((id) => { next[id] = now })
    put('rpg', { ...(useStore.getState().items.rpg?.data || {}), id: 'rpg', unlocked: next })
  }, [rpg.newlyUnlocked.join()]) // eslint-disable-line

  return { ...rpg, vault: v, gems, chestReady, openChest, chestCount: data.chestCount || 0 }
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
  if (snap.level > (prev.level || 0) && prev.level) ev.push({ type: 'levelup', level: snap.level })
  for (const id of snap.ach || []) if (!(prev.ach || []).includes(id)) ev.push({ type: 'achievement', id })
  return ev
}
