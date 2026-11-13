/**
 * Party, gear, skills, shop and the adventure log — all read from real money data.
 * Nothing here is random: every line in the log points back to a transaction or a milestone.
 */
import { money, round2, todayISO } from './format'

/* ---------------- party ---------------- */
export const MEMBERS = [
  { id: 'knight', name: 'อัศวิน', role: 'อัศวิน · หัวหน้าปาร์ตี้', sprite: 'hero', color: '#10b981', area: 'วินัยการบันทึก + ชำระหนี้', join: 'อยู่กับคุณตั้งแต่วันแรก' },
  { id: 'healer', name: 'ลูน่า', role: 'นักบวช', sprite: 'healer', color: '#14b8a6', area: 'เงินกันจ่ายหนี้ + เงินสำรอง', join: 'กันเงินจ่ายหนี้ให้ครบ 100%' },
  { id: 'mage', name: 'ไพร์', role: 'นักเวท', sprite: 'mage', color: '#3b82f6', area: 'การลงทุน', join: 'ส่งเงินเข้าลงทุนครั้งแรก (เช่น เติม Bitkub)' },
  { id: 'ranger', name: 'ฟิน', role: 'นักธนู', sprite: 'ranger', color: '#65a30d', area: 'วินัย + การออม', join: 'บันทึกต่อเนื่อง 7 วัน หรือมีเดือนที่ออมได้ 20%' },
]
export const memberById = Object.fromEntries(MEMBERS.map((m) => [m.id, m]))

const MONEY_LV = [0, 1000, 3000, 6000, 10000, 20000, 35000, 50000, 75000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000, 1500000, 2000000]
function tableLevel(v, table) {
  let i = 0
  while (i + 1 < table.length && v >= table[i + 1]) i++
  return { lv: i + 1, cur: table[i], next: table[i + 1] ?? null, pct: table[i + 1] ? (v - table[i]) / (table[i + 1] - table[i]) : 1 }
}

/* ---------------- gear ---------------- */
export const GEAR_TIERS = [
  { name: 'ไม้', color: '#a16207' },
  { name: 'เหล็ก', color: '#64748b' },
  { name: 'เงิน', color: '#38bdf8' },
  { name: 'ทองคำ', color: '#f59e0b' },
  { name: 'ตำนาน', color: '#a855f7' },
]
const GEAR = [
  { slot: 'weapon', label: 'อาวุธ', names: ['ดาบไม้ฝึกหัด', 'ดาบเหล็ก', 'ดาบเงินพิฆาตดอกเบี้ย', 'ดาบทองคำ', 'ดาบตำนาน “ปลดหนี้”'], th: [0, 3000, 15000, 50000, 150000], unit: 'money', how: 'ยอดชำระหนี้สะสม' },
  { slot: 'armor', label: 'เกราะ', names: ['เสื้อผ้าป่าน', 'เกราะเหล็ก', 'เกราะเงิน', 'เกราะทองคำ', 'เกราะตำนาน “ป้อมปราการ”'], th: [0, 1, 3, 6, 12], unit: 'months', how: 'เงินสำรองพอใช้กี่เดือน' },
  { slot: 'ring', label: 'แหวน', names: ['แหวนเชือก', 'แหวนเหล็ก', 'แหวนเงิน', 'แหวนทองคำ', 'แหวนตำนาน “ดอกเบี้ยทบต้น”'], th: [0, 10000, 50000, 200000, 1000000], unit: 'money', how: 'มูลค่าเงินลงทุนรวม' },
]

/* ---------------- skills ---------------- */
export const SKILLS = [
  { id: 'slash', member: 'knight', lv: 1, name: 'ฟันดาบ', icon: '⚔️', how: 'ชำระหนี้บัตร/เงินกู้', does: 'ฟันบอสเท่ากับยอดที่จ่ายจริง' },
  { id: 'storm', member: 'knight', lv: 5, name: 'ฟันพายุ', icon: '🌪️', how: 'ชำระหนี้ครั้งละ 5,000 ขึ้นไป', does: 'คริติคอลสองครั้งติด' },
  { id: 'shield', member: 'healer', lv: 1, name: 'โล่ศักดิ์สิทธิ์', icon: '🛡️', how: 'โอนเงินเข้ากระเป๋า “กันชำระหนี้”', does: 'ครอบโล่ทั้งปาร์ตี้ กันเงินไว้จ่ายหนี้' },
  { id: 'heal', member: 'healer', lv: 2, name: 'แสงฟื้นฟู', icon: '💚', how: 'มีรายรับเข้า', does: 'ฟื้นพลังทั้งปาร์ตี้' },
  { id: 'ward', member: 'healer', lv: 4, name: 'บาเรียดอกเบี้ย', icon: '✨', how: 'กันเงินจ่ายหนี้ครบ 100%', does: 'บอสรูดบัตรฟื้นพลังได้ แต่เงินถูกกันไว้แล้ว ไม่กระทบเงินใช้จ่าย' },
  { id: 'fireball', member: 'mage', lv: 1, name: 'ลูกไฟทองคำ', icon: '🔥', how: 'ส่งเงินเข้าลงทุน หรือซื้อสินทรัพย์', does: 'เพิ่มพลังคลังสมบัติ' },
  { id: 'meteor', member: 'mage', lv: 4, name: 'อุกกาบาตกำไร', icon: '☄️', how: 'ส่งเข้าลงทุนครั้งละ 5,000 ขึ้นไป', does: 'เวทใหญ่เต็มจอ' },
  { id: 'arrow', member: 'ranger', lv: 1, name: 'ธนูลาดตระเวน', icon: '🏹', how: 'บันทึกรายการในวันนั้น', does: 'สอดส่องกระเป๋า สรุปว่าวันนี้ใช้อะไรไป' },
  { id: 'eagle', member: 'ranger', lv: 3, name: 'ตาเหยี่ยว', icon: '🦅', how: 'เลเวล 3 ขึ้นไป', does: 'บอกหมวดที่ใช้เงินมากที่สุดของวัน ในบันทึกการผจญภัย' },
  { id: 'streak3', member: 'all', lv: 0, need: 3, name: 'ไฟแห่งวินัย', icon: '🔥', how: 'บันทึกต่อเนื่อง 3 วัน', does: 'หีบรายวันได้เจมเพิ่มตามจำนวนวัน' },
  { id: 'streak30', member: 'all', lv: 0, need: 30, name: 'ตำนานแห่งวินัย', icon: '👑', how: 'บันทึกต่อเนื่อง 30 วัน', does: 'เจมจากหีบรายวัน ×2' },
]

/* ---------------- shop ---------------- */
export const SHOP = [
  { id: 'pet_owl', type: 'pet', name: 'นกฮูกหิมะ', desc: 'สัตว์เลี้ยงเดินตามปาร์ตี้', price: 60, sprite: 'pet_owl' },
  { id: 'pet_drake', type: 'pet', name: 'มังกรน้อยทองคำ', desc: 'สัตว์เลี้ยงหายาก', price: 150, sprite: 'pet_drake' },
  { id: 'skin_royal', type: 'skin', name: 'ชุดอัศวินม่วงราชา', desc: 'เกราะม่วง ผ้าคลุมแดง', price: 80, hue: 120 },
  { id: 'skin_flame', type: 'skin', name: 'ชุดอัศวินกุหลาบ', desc: 'เกราะสีกุหลาบ ผ้าคลุมเขียวมะกอก', price: 80, hue: 200 },
  { id: 'deco_flowers', type: 'deco', name: 'สวนดอกไม้', desc: 'ดอกไม้บานรอบหมู่บ้าน', price: 30 },
  { id: 'deco_lanterns', type: 'deco', name: 'โคมไฟยามค่ำ', desc: 'โคมไฟริมทาง สว่างตอนกลางคืน', price: 40 },
  { id: 'deco_banner', type: 'deco', name: 'ธงประจำปาร์ตี้', desc: 'ปักธงหลังปาร์ตี้', price: 25 },
]
export const PET_DEFAULT = { id: 'pet_fox', name: 'จิ้งจอกมิ้นต์', sprite: 'pet_fox' }

/* ---------------- compute ---------------- */
const localDay = (iso) => { if (!iso) return null; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function computeParty({ accounts, txns, summary, portfolio, settings, catById = {}, level, into, need, streak, bestStreak, goodMonths, months, data, privacy }) {
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const isType = (id, ...types) => types.includes(accById[id]?.type)
  const invTotal = round2((summary.byType.invest || 0) + (portfolio?.value || 0))
  const monthsArr = Object.values(months)
  const avgExp = monthsArr.length ? monthsArr.reduce((s, m) => s + m.exp, 0) / monthsArr.length : 0
  const safeCash = (summary.byType.cash || 0) + (summary.byType.savings || 0) + (summary.byType.saving || 0) + Math.max(0, (summary.reserve || 0) - (summary.target || 0))
  const emergencyMonths = avgExp > 0 ? Math.max(0, safeCash) / avgExp : 0
  let debtPaid = 0, reserveIn = 0, investIn = 0, buys = 0, incomes = 0
  for (const t of txns) {
    if (t.kind === 'payment' && isType(t.to, 'credit', 'loan')) debtPaid += t.amount
    if (t.kind === 'transfer' && isType(t.to, 'reserve') && !isType(t.account, 'reserve')) reserveIn += t.amount
    if (t.kind === 'transfer' && isType(t.to, 'invest') && !isType(t.account, 'invest')) investIn += t.amount
    if (t.kind === 'income' && t.split) for (const [k, v] of Object.entries(t.split)) { if (isType(k, 'invest')) investIn += v; if (isType(k, 'reserve')) reserveIn += v }
    if (t.kind === 'trade' && t.side === 'buy') buys++
    if (t.kind === 'income') incomes++
  }
  debtPaid = round2(debtPaid); reserveIn = round2(reserveIn); investIn = round2(investIn)

  // joining: once true it stays (the date is kept in the rpg item)
  const joinedData = data.joined || {}
  const cond = {
    knight: true,
    healer: txns.length > 0 && (summary.target > 0 ? summary.coverage >= 1 : reserveIn > 0 || emergencyMonths >= 1),
    mage: investIn > 0 || buys > 0,
    ranger: bestStreak >= 7 || goodMonths > 0,
  }
  const lvOf = {
    knight: { lv: level, pct: into / need, nextText: `อีก ${need - into} XP` },
    healer: (() => { const v = Math.max(0, summary.reserve || 0) + Math.max(0, safeCash); const r = tableLevel(v, MONEY_LV); return { ...r, nextText: r.next ? `เงินกันหนี้ + เงินสำรองรวมถึง ${money(r.next, { decimals: false })}` : 'เลเวลสูงสุด' } })(),
    mage: (() => { const r = tableLevel(invTotal, MONEY_LV); return { ...r, nextText: r.next ? `เงินลงทุนรวมถึง ${money(r.next, { decimals: false })}` : 'เลเวลสูงสุด' } })(),
    ranger: (() => { const lv = 1 + Math.floor(bestStreak / 5) + goodMonths * 2; const nx = (Math.floor(bestStreak / 5) + 1) * 5; return { lv, pct: (bestStreak % 5) / 5, nextText: `บันทึกต่อเนื่องให้ถึง ${nx} วัน (ตอนนี้ ${streak} วัน) หรือออมให้ได้ 20% อีก 1 เดือน` } })(),
  }
  const party = MEMBERS.map((m) => ({ ...m, joined: !!(cond[m.id] || joinedData[m.id]), joinedAt: joinedData[m.id] || null, ready: cond[m.id], ...lvOf[m.id] }))
  const pm = Object.fromEntries(party.map((p) => [p.id, p]))
  const newlyJoined = party.filter((p) => p.id !== 'knight' && p.ready && !joinedData[p.id]).map((p) => p.id)

  // gear
  const metric = { weapon: debtPaid, armor: emergencyMonths, ring: invTotal }
  const gear = GEAR.map((g) => {
    const v = metric[g.slot]
    let tier = 0; while (tier + 1 < g.th.length && v >= g.th[tier + 1]) tier++
    const next = g.th[tier + 1]
    const fmt = (x) => (g.unit === 'months' ? `${x.toFixed(1)} เดือน` : money(x, { decimals: false }))
    return {
      ...g, tier, name: g.names[tier], tierName: GEAR_TIERS[tier].name, color: GEAR_TIERS[tier].color, value: v,
      valueText: fmt(v), nextName: next != null ? g.names[tier + 1] : null,
      toNext: next != null ? (g.unit === 'months' ? `เงินสำรองให้พอใช้ ${next} เดือน (ตอนนี้ ${v.toFixed(1)})` : `${g.how}อีก ${money(next - v, { decimals: false })}`) : null,
      pct: next != null ? Math.min(1, (v - g.th[tier]) / (next - g.th[tier])) : 1,
    }
  })
  const gearBy = Object.fromEntries(gear.map((g) => [g.slot, g]))

  // skills
  const skills = SKILLS.map((s) => {
    const m = pm[s.member]
    const unlocked = s.member === 'all' ? streak >= s.need || bestStreak >= s.need : !!(m?.joined && m.lv >= s.lv)
    return { ...s, unlocked, owner: m || null, lockText: s.member === 'all' ? `บันทึกต่อเนื่อง ${s.need} วัน` : !m?.joined ? `${m.name}ยังไม่เข้าปาร์ตี้` : `${m.name} เลเวล ${s.lv}` }
  })
  const has = (id) => skills.find((s) => s.id === id)?.unlocked

  // shop / equipment
  const owned = data.owned || {}
  const equip = data.equip || {}
  const pet = SHOP.find((i) => i.id === equip.pet && owned[i.id]) || PET_DEFAULT
  const skin = SHOP.find((i) => i.id === equip.skin && owned[i.id]) || null
  const decos = Object.fromEntries(SHOP.filter((i) => i.type === 'deco' && owned[i.id] && !(data.decoOff || {})[i.id]).map((i) => [i.id, true]))

  const log = buildLog({ txns, accById, catById, pm, gearBy, has, data, privacy, avgDaily: avgExp / 30, summary })
  return { party, newlyJoined, gear, gearBy, skills, owned, equip, pet, skin, decos, log, totals: { debtPaid, reserveIn, investIn, incomes, invTotal, emergencyMonths } }
}

/* ---------------- adventure log ---------------- */
const BOSS_NAME = { credit: 'มังกรดอกเบี้ย', loan: 'โกเลมผ่อนงวด' }
function buildLog({ txns, accById, catById, pm, gearBy, has, data, privacy, avgDaily, summary }) {
  const M = (v) => (privacy ? '฿•••' : money(v, { decimals: false }))
  const joined = (id, day) => pm[id]?.joined && (!pm[id].joinedAt || localDay(pm[id].joinedAt) <= day)
  const since = new Date(); since.setDate(since.getDate() - 45)
  const from = localDay(since.toISOString())
  const byDay = new Map()
  const push = (day, e) => { if (day < from) return; if (!byDay.has(day)) byDay.set(day, []); byDay.get(day).push(e) }
  const daily = new Map() // day → { n, out, inc, cats }
  const big = Math.max(1500, avgDaily * 4)

  for (const t of txns) {
    const day = t.date
    if (!day || day < from) continue
    const at = t.time ? `${day}T${t.time}` : t.createdAt || `${day}T12:00`
    const acc = accById[t.account], to = accById[t.to]
    const d = daily.get(day) || { n: 0, out: 0, inc: 0, cats: {} }
    d.n++
    daily.set(day, d)
    const label = t.note || catById[t.category]?.name || ''
    if (t.kind === 'payment' && (to?.type === 'credit' || to?.type === 'loan')) {
      const storm = has('storm') && t.amount >= 5000
      push(day, { at, who: 'knight', icon: storm ? '🌪️' : '⚔️', tone: 'good', text: `${pm.knight.name}ใช้${gearBy.weapon.name}${storm ? ' ร่าย “ฟันพายุ”' : ''} ฟัน${BOSS_NAME[to.type]} (${to.name})`, amount: `-${M(t.amount)} HP` })
    } else if (t.kind === 'expense' && acc?.type === 'credit') {
      d.out += t.amount; d.cats[t.category] = (d.cats[t.category] || 0) + t.amount
      const ward = joined('healer', day) && has('ward')
      push(day, { at, who: 'boss', icon: '🐉', tone: 'bad', text: `${BOSS_NAME.credit}ดูดพลังจากการรูดบัตร “${label || 'ไม่ระบุ'}”${ward ? ' — ลูน่ากางบาเรีย เงินถูกกันไว้จ่ายแล้ว' : ''}`, amount: `+${M(t.amount)} HP` })
    } else if (t.kind === 'transfer' && to?.type === 'reserve' && acc?.type !== 'reserve') {
      const h = joined('healer', day)
      push(day, { at, who: h ? 'healer' : 'knight', icon: '🛡️', tone: 'good', text: h ? 'ลูน่าร่าย “โล่ศักดิ์สิทธิ์” กันเงินไว้จ่ายหนี้' : 'อัศวินเก็บเงินเข้าคลังกันหนี้', amount: M(t.amount) })
    } else if (t.kind === 'transfer' && to?.type === 'invest' && acc?.type !== 'invest') {
      const m = joined('mage', day), meteor = m && has('meteor') && t.amount >= 5000
      push(day, { at, who: m ? 'mage' : 'knight', icon: meteor ? '☄️' : '🔥', tone: 'good', text: m ? `ไพร์ร่าย “${meteor ? 'อุกกาบาตกำไร' : 'ลูกไฟทองคำ'}” ส่งเงินเข้าคลังลงทุน${t.note ? ` · ${t.note}` : ''}` : `ส่งเงินเข้าคลังลงทุนครั้งแรก${t.note ? ` · ${t.note}` : ''}`, amount: M(t.amount) })
    } else if (t.kind === 'trade') {
      push(day, { at, who: 'mage', icon: t.side === 'buy' ? '💎' : '💰', tone: 'good', text: t.side === 'buy' ? `ไพร์เสกเงินเป็นไอเท็มลงทุน${t.note ? ` (${t.note})` : ''}` : `ขายไอเท็มลงทุนกลับเป็นเงิน${t.note ? ` (${t.note})` : ''}`, amount: M(t.amount) })
    } else if (t.kind === 'income') {
      d.inc += t.amount
      const h = joined('healer', day) && has('heal')
      push(day, { at, who: h ? 'healer' : 'knight', icon: '💰', tone: 'good', text: `ได้รับเงินรางวัล “${label || 'รายรับ'}”${h ? ' · ลูน่าร่ายแสงฟื้นฟูทั้งปาร์ตี้' : ''}`, amount: `+${M(t.amount)}` })
    } else if (t.kind === 'expense') {
      d.out += t.amount; d.cats[t.category] = (d.cats[t.category] || 0) + t.amount
      if (t.amount >= big) push(day, { at, who: 'boss', icon: '💸', tone: 'bad', text: `กระเป๋าโดนโจมตีหนัก: “${label || 'ค่าใช้จ่าย'}”`, amount: `-${M(t.amount)}` })
    }
  }
  // one line per day for everyday spending
  for (const [day, d] of daily) {
    if (!d.out && !d.n) continue
    const r = joined('ranger', day)
    const top = Object.entries(d.cats).sort((a, b) => b[1] - a[1])[0]
    const eagle = r && has('eagle') && top ? ` · ตาเหยี่ยวเห็นว่าเงินไหลไปที่ “${catById[top[0]]?.name || 'อื่น ๆ'}” มากสุด` : ''
    push(day, { at: `${day}T23:59`, who: r ? 'ranger' : 'knight', icon: '🏹', tone: 'info', text: `${r ? 'ฟินลาดตระเวน' : 'อัศวินออกตรวจตลาด'} บันทึก ${d.n} รายการ${d.out ? ` ใช้ไป ${M(d.out)}` : ''}${eagle}`, amount: `+${10 + Math.min(5, d.n) * 2} XP` })
  }
  // milestones kept in the rpg item
  for (const [id, at] of Object.entries(data.joined || {})) if (pm[id]) push(localDay(at), { at, who: id, icon: '✨', tone: 'gold', text: `${pm[id].name} ${pm[id].role.split(' ')[0]} เข้าร่วมปาร์ตี้แล้ว!` })
  for (const l of data.levels || []) push(localDay(l.at), { at: l.at, who: 'knight', icon: '⬆️', tone: 'gold', text: `เลเวลอัป! ปาร์ตี้ขึ้นเป็นเลเวล ${l.lv}` })
  for (const r of data.realms || []) push(localDay(r.at), { at: r.at, who: 'knight', icon: '🗺️', tone: 'gold', text: r.down ? `ถอยกลับไปที่ “${r.name}” — มูลค่าสุทธิลดลง` : `เดินทางถึง “${r.name}”!` })
  for (const [id, at] of Object.entries(data.unlocked || {})) push(localDay(at), { at, who: 'knight', icon: '🏅', tone: 'gold', text: `ได้รับฉายา “${ACH_NAMES[id] || id}”` })
  for (const c of data.chestLog || []) push(localDay(c.at), { at: c.at, who: 'pet', icon: '🎁', tone: 'gold', text: `เปิดหีบสมบัติรายวัน${c.rare ? ' (หายาก!)' : ''}`, amount: `+${c.gain} เจม` })
  for (const b of data.buyLog || []) push(localDay(b.at), { at: b.at, who: 'pet', icon: '🛒', tone: 'info', text: `ซื้อ “${b.name}” จากร้านพ่อค้า`, amount: `-${b.price} เจม` })

  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([day, items]) => {
    const d = daily.get(day)
    return { day, items: items.sort((a, b) => b.at.localeCompare(a.at)), out: d?.out || 0, inc: d?.inc || 0 }
  })
  return days
}
const ACH_NAMES = {
  first_step: 'ก้าวแรก', streak7: 'วินัยเหล็ก', streak30: 'ตำนานแห่งวินัย', first_strike: 'ดาบแรก', boss_slayer: 'ผู้ปราบบอส', shield_wall: 'กำแพงโล่',
  saver20: 'นักออม', investor: 'นักลงทุนฝึกหัด', first_loot: 'นักล่าสมบัติ', diversified: 'คลังหลากหลาย', profit10: 'มือทอง', goal_done: 'ผู้พิชิตเป้าหมาย',
  planner: 'นักวางแผน', txn100: 'นักบันทึก', free_land: 'พ้นแดนหมอก', nw100k: 'ปราสาทแรก', nw1m: 'ราชาแห่งเกาะ',
}

/** One-line status for under the battle scene, when nothing new is happening. */
export function statusLines(rpg) {
  const L = []
  const today = rpg.log[0]?.day === todayISO() ? rpg.log[0] : null
  if (today) today.items.slice(0, 3).forEach((e) => L.push(`${e.icon} ${e.text}${e.amount ? ` (${e.amount})` : ''}`))
  const boss = rpg.bosses.find((b) => b.active)
  if (boss) L.push(`🐉 ${boss.name}ยังเหลือพลัง — ชำระ${boss.accName}เพื่อให้อัศวินฟัน`)
  else L.push('🟢 ไม่มีบอสหนี้ ปาร์ตี้กำลังฝึกซ้อมกับสไลม์')
  const waiting = rpg.party.find((p) => !p.joined)
  if (waiting) L.push(`👤 ${waiting.name} (${waiting.role}) รอเข้าปาร์ตี้: ${waiting.join}`)
  const g = rpg.gear.find((x) => x.nextName)
  if (g) L.push(`🗡️ อัปเกรด${g.label}เป็น “${g.nextName}”: ${g.toNext}`)
  if (!rpg.loggedToday) L.push('📜 วันนี้ยังไม่ได้บันทึกรายการ — นำเข้าสลิปเพื่อเริ่มการผจญภัยของวันนี้')
  return L
}
