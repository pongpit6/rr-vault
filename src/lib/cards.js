/**
 * Collector's Album (สมุดสะสมการ์ด): one card per monster (120) plus one glowing card each.
 * - Cards drop as rarely as gold shards (normal 0.45%, elite 0.9%, boss 1.5% per win); a glowing monster gives ×3 and
 *   has a GLOW_CARD chance of its glowing card.
 * - A card in the album gives a passive bonus for its map's stat. Copies stack up to level 10:
 *   level 1 = 1.0%, +0.1% a level, level 10 = 2.0% (elite ×2, boss ×3). Glowing cards have one level only (3/6/9%).
 * - Copies beyond level 10 (and spare glowing cards) can be sold.
 * - Every Sunday the merchant brings 5 random cards (rarer cards sometimes).
 */
import { MAPS, MAP_BY_ID, MON_BY_ID } from './farmData'

export const CARD_STAT = {
  meadow: { key: 'mat', name: 'โอกาสดรอปวัสดุ', icon: 'em_meadow' },
  forest: { key: 'rare', name: 'โอกาสของหายาก', icon: 'em_forest' },
  mine: { key: 'crystal', name: 'โอกาสผลึกเวท', icon: 'em_mine' },
  swamp: { key: 'proc', name: 'โอกาสสกิลสุ่มทำงาน', icon: 'em_swamp' },
  desert: { key: 'trophy', name: 'ราคาขายของประจำตัว', icon: 'em_desert' },
  snow: { key: 'weaken', name: 'มอนสเตอร์อ่อนลง', icon: 'em_snow' },
  volcano: { key: 'power', name: 'พลังทีม', icon: 'em_volcano' },
  shadow: { key: 'glow', name: 'โอกาสเจอตัวเรืองแสง', icon: 'em_glow' },
}
/** stats that change the fight a lot are capped */
export const CARD_CAP = { power: 20, weaken: 20 }
export const CARD_MAX = 10
export const KIND_MULT = { normal: 1, elite: 2, boss: 3 }
export const GLOW_CARD_PCT = { normal: 3, elite: 6, boss: 9 }
export const CARD_DROP = { normal: 0.0045, elite: 0.009, boss: 0.015 } // same as a gold shard
export const GLOW_CARD_MULT = 3, GLOW_CARD = 0.25
export const SELL_RATE = 0.3

/** % bonus of one card at a level */
export const cardPct = (mon, lv) => (lv <= 0 ? 0 : (lv >= CARD_MAX ? 2 : 1 + 0.1 * (lv - 1)) * KIND_MULT[mon.kind])
export const statOf = (mon) => CARD_STAT[mon.map]
/** shop price (FIAT) by rarity and map tier; selling a spare gives SELL_RATE of it */
export function cardPrice(mon, glow = false) {
  const tier = MAP_BY_ID[mon.map]?.tier || 1, base = 60 + 20 * tier
  return glow ? 1500 + 200 * tier : base * { normal: 1, elite: 3, boss: 8 }[mon.kind]
}
export const sellPrice = (mon, glow = false) => Math.round(cardPrice(mon, glow) * SELL_RATE)

/** total bonus from the album: { mat, rare, crystal, proc, trophy, weaken, power, glow } in % */
export function cardFx(f) {
  const fx = {}
  for (const [id, lv] of Object.entries(f.cards || {})) { const m = MON_BY_ID[id]; if (m) { const k = statOf(m).key; fx[k] = (fx[k] || 0) + cardPct(m, lv) } }
  for (const id of Object.keys(f.glowCards || {})) { const m = MON_BY_ID[id]; if (m) { const k = statOf(m).key; fx[k] = (fx[k] || 0) + GLOW_CARD_PCT[m.kind] } }
  for (const [k, cap] of Object.entries(CARD_CAP)) if (fx[k] > cap) fx[k] = cap
  for (const k of Object.keys(fx)) fx[k] = Math.round(fx[k] * 100) / 100
  return fx
}

/** put a card in the album (mutates f): returns 'new' | 'up' | 'spare' */
export function addCard(f, id, glow = false) {
  if (glow) {
    f.glowCards = { ...(f.glowCards || {}) }
    if (!f.glowCards[id]) { f.glowCards[id] = 1; return 'new' }
    f.glowSpare = { ...(f.glowSpare || {}), [id]: (f.glowSpare?.[id] || 0) + 1 }; return 'spare'
  }
  f.cards = { ...(f.cards || {}) }
  const lv = f.cards[id] || 0
  if (lv < CARD_MAX) { f.cards[id] = lv + 1; return lv ? 'up' : 'new' }
  f.cardSpare = { ...(f.cardSpare || {}), [id]: (f.cardSpare?.[id] || 0) + 1 }; return 'spare'
}

/* ---------------- the Sunday card merchant ---------------- */
export const SHOP_ODDS = [['glow', 0.02], ['boss', 0.05], ['elite', 0.15], ['normal', 0.78]]
const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
/** the Sunday (yyyy-mm-dd, local) of the week a date is in, or null if it is not Sunday */
export const sundayOf = (d = new Date()) => (d.getDay() === 0 ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null)
/** 5 cards for a Sunday from the maps you can hunt in (the same on every device) */
export function shopCards(sunday, openMaps) {
  const r = seeded(Number(sunday.replace(/-/g, ''))), maps = openMaps.length ? openMaps : [MAPS[0]], out = []
  const seen = new Set()
  for (let i = 0, tries = 0; i < 5 && tries < 60; tries++) {
    let x = r(), rar = 'normal'
    for (const [k, p] of SHOP_ODDS) { if (x < p) { rar = k; break } x -= p }
    const map = maps[Math.floor(r() * maps.length)], kind = rar === 'glow' ? (r() < 0.8 ? 'normal' : r() < 0.7 ? 'elite' : 'boss') : rar
    const pool = map.mons.filter((m) => m.kind === kind), mon = pool[Math.floor(r() * pool.length)]
    const key = `${mon.id}${rar === 'glow' ? '*' : ''}`
    if (seen.has(key)) continue // no two of the same card in one Sunday
    seen.add(key); i++
    out.push({ id: mon.id, glow: rar === 'glow', price: cardPrice(mon, rar === 'glow') })
  }
  return out
}
