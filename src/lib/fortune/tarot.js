/* Daily one-card tarot (Rider–Waite–Smith, 78 cards) + its game effect for the day.
   Texts: Tarot_RWS_Daily_One_Card_Handbook_TH (theme / light / shadow / action / reversed / evening question).
   Each card × orientation (156) gives a different buff to the hunt for the rest of that day. */
import CARDS from './tarotCards.json'
import { ABILITY } from '../cards'

export { CARDS }
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]))
export const SUITS = { maj: { name: 'ไพ่ใหญ่', icon: 'ft_ball' }, wands: { name: 'ไม้เท้า', icon: 'tr_wands', el: 'ไฟ' }, cups: { name: 'ถ้วย', icon: 'tr_cups', el: 'น้ำ' }, swords: { name: 'ดาบ', icon: 'tr_swords', el: 'ลม' }, pentacles: { name: 'เหรียญ', icon: 'tr_pent', el: 'ดิน' } }
export const suitOf = (id) => id.split('_')[0]
const RANKS = ['ace', '02', '03', '04', '05', '06', '07', '08', '09', '10', 'page', 'knight', 'queen', 'king']
const rankOf = (id) => (id.startsWith('maj_') ? +id.slice(4) : RANKS.indexOf(id.split('_')[1]))
export const cardArt = (id) => `./sprites/tarot/${id}.png`

/** how lucky each card is when upright: 1 = ดวงต้องระวัง … 5 = ดวงดีมาก */
const L = {
  maj: [4, 5, 3, 5, 4, 3, 4, 5, 4, 3, 5, 3, 2, 2, 4, 1, 1, 5, 2, 5, 4, 5],
  wands: [5, 3, 4, 5, 2, 5, 3, 4, 2, 1, 4, 4, 4, 4],
  cups: [5, 5, 5, 2, 1, 3, 2, 2, 5, 5, 4, 4, 4, 4],
  swords: [4, 2, 1, 3, 1, 3, 2, 1, 1, 1, 3, 3, 3, 3],
  pentacles: [5, 3, 4, 3, 1, 4, 3, 4, 5, 5, 4, 3, 4, 5],
}
/** reversed: good cards lose some shine, hard cards ease a little */
export function luckOf(id, rev = false) {
  const l = L[suitOf(id) === 'maj' ? 'maj' : suitOf(id)][rankOf(id)]
  if (!rev) return l
  return l >= 4 ? l - 2 : l === 3 ? 2 : l + 1
}
export const LUCK_TEXT = ['', 'ดวงต้องระวัง', 'ดวงเบา ๆ', 'ดวงกลาง ๆ', 'ดวงดี', 'ดวงดีมาก']
export const LUCK_COLOR = ['', '#ef4444', '#f97316', '#64748b', '#0ea5e9', '#16a34a']

/* ---------- game effect ---------- */
const BASE = { mat: 8, sell: 6, rare: 8, crystal: 10, trophy: 6, trophyDrop: 8, proc: 8, mana: 12, elite: 10, night: 10, glow: 12, weaken: 2, power: 3, second: 2 }
const SCALE = [0, 0.5, 0.75, 1, 1.3, 1.6]
const CH = { wands: ['power', 'proc', 'elite'], cups: ['mana', 'glow', 'night'], swords: ['weaken', 'second', 'crystal'], pentacles: ['mat', 'sell', 'trophyDrop', 'trophy'] }
const ALL = Object.keys(BASE)
const r1 = (x) => Math.round(x * 10) / 10
/** the buff a card gives for the day it was drawn: { fx: {ability: %}, stam: {chance %, min, max} | null } */
export function effectOf(id, rev = false) {
  const s = suitOf(id), k = rankOf(id), luck = luckOf(id, rev), sc = SCALE[luck] * (rev ? 0.85 : 1) * (1 + k * 0.03)
  const fx = {}
  let stam = null
  const add = (ch, mult = 1) => { fx[ch] = r1((fx[ch] || 0) + BASE[ch] * sc * mult) }
  if (s === 'maj') {
    stam = { chance: rev ? Math.max(1, luck - 1) : luck, min: 1, max: luck >= 5 ? 3 : luck >= 3 ? 2 : 1 }
    add(ALL[(k + (rev ? 7 : 0)) % ALL.length], 0.8)
  } else {
    const ch = CH[s], i = k + (rev ? 1 : 0)
    add(ch[i % ch.length])
    if (k >= 10) add(ch[(i + 1) % ch.length], 0.5) // court cards: a second, smaller boost
    if (!rev && luck === 5 && (s === 'pentacles' || s === 'wands')) stam = { chance: 2, min: 1, max: 2 }
  }
  return { fx, stam, luck }
}
export const effectLines = (e) => [
  ...Object.entries(e.fx).map(([k, v]) => ({ icon: ABILITY[k].icon, text: `${ABILITY[k].name} +${v}%` })),
  ...(e.stam ? [{ icon: 'Zap', text: `ทุกชั่วโมงมีโอกาส ${e.stam.chance}% ได้พลังกายฟรี ${e.stam.min === e.stam.max ? e.stam.min : `${e.stam.min}–${e.stam.max}`} แต้ม` }] : []),
]

/* ---------- drawing (one card a day, Bangkok date) ---------- */
export const bkkDate = (ms = Date.now()) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10)
/** fair random draw: crypto random index 0–77 and a separate 50:50 orientation */
export function drawCard() {
  const a = new Uint32Array(2)
  crypto.getRandomValues(a)
  // rejection sampling keeps every card exactly 1/78
  let x = a[0]
  const lim = Math.floor(0x100000000 / 78) * 78
  while (x >= lim) { const b = new Uint32Array(1); crypto.getRandomValues(b); x = b[0] }
  return { id: CARDS[x % 78].id, rev: (a[1] & 1) === 1 }
}
/** today's draw from the fortune item, or null */
export const todayDraw = (fortune, ms = Date.now()) => fortune?.tarot?.[bkkDate(ms)] || null

/** the tarot buff the hunt uses at time ms (only on the Bangkok day the card was drawn, from the draw time on) */
export function tarotBuff(fortune, ms = Date.now()) {
  const d = todayDraw(fortune, ms)
  if (!d || !CARD_BY_ID[d.id]) return null
  const e = effectOf(d.id, !!d.rev)
  return { ...e, id: d.id, rev: !!d.rev, at: d.at || 0, day: bkkDate(ms) }
}
/** stamina pulse settings for hourlyOf: every hour after the draw on that day rolls the chance */
export function tarotStam(fortune) {
  if (!fortune?.tarot) return null
  const out = {}
  for (const [day, d] of Object.entries(fortune.tarot)) { const e = CARD_BY_ID[d.id] && effectOf(d.id, !!d.rev); if (e?.stam) out[day] = { ...e.stam, from: d.at || 0 } }
  return out
}
