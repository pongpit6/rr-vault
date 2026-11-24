/**
 * Collector's Album (สมุดสะสมการ์ด): one card per monster (120) plus one glowing card each.
 * - Cards drop as rarely as gold shards (normal 0.45%, elite 0.9%, boss 1.5% per win); a glowing monster gives ×3 and
 *   has a GLOW_CARD chance of its glowing card.
 * - Every card has its own ability (CARD_ABILITY). Copies stack up to level 10: level 1 = the ability's unit,
 *   +10% of it a level, level 10 = 2 × unit (elite ×2, boss ×3). Glowing cards: one level, 3 × unit (× kind).
 * - Copies beyond level 10 (and spare glowing cards) can be sold.
 * - Every Sunday the merchant brings 5 random cards (rarer cards sometimes).
 */
import { MAPS, MAP_BY_ID, MON_BY_ID } from './farmData'

/** every card has its own ability (chosen to fit the monster); unit = % at level 1, level 10 = 2 × unit.
    Every ability is capped in total (cap); the fight-changers (weaken, power, second) much lower. */
export const ABILITY = {
  mat: { name: 'โอกาสดรอปวัสดุ', icon: 'em_basket', unit: 0.5, cap: 20 },
  sell: { name: 'ราคาขายวัสดุ', icon: 'em_moneybag', unit: 0.75, cap: 20 },
  rare: { name: 'โอกาสของหายาก', icon: 'Gem', unit: 0.5, cap: 20 },
  crystal: { name: 'โอกาสผลึกเวท', icon: 'em_mine', unit: 1, cap: 30 },
  trophy: { name: 'ราคาขายของประจำตัว', icon: 'Trophy', unit: 0.5, cap: 20 },
  trophyDrop: { name: 'โอกาสดรอปของประจำตัว', icon: 'Award', unit: 0.5, cap: 15 },
  proc: { name: 'โอกาสสกิลสุ่มทำงาน', icon: 'Sparkles', unit: 1, cap: 20 },
  mana: { name: 'มานาต่อวัน', icon: 'Zap', unit: 2, cap: 40 },
  elite: { name: 'โอกาสเจอหัวหน้า', icon: 'Target', unit: 1, cap: 20 },
  night: { name: 'ของหายากตอนกลางคืน', icon: 'em_night', unit: 1, cap: 25 },
  glow: { name: 'โอกาสเจอตัวเรืองแสง', icon: 'em_glow', unit: 1.5, cap: 30 },
  weaken: { name: 'มอนสเตอร์อ่อนลง', icon: 'em_snow', unit: 0.3, cap: 8 },
  power: { name: 'พลังทีม', icon: 'em_volcano', unit: 0.3, cap: 8 },
  second: { name: 'โอกาสพลิกแพ้เป็นชนะ', icon: 'Shield', unit: 0.2, cap: 5 },
}
/** which ability each monster's card gives */
export const CARD_ABILITY = {
  slime_g: 'mat', rabbit: 'trophyDrop', mushroom: 'crystal', bee: 'proc', boar: 'power', crow: 'trophy', sprout: 'mat', snail: 'sell', ladybug: 'rare', frog_g: 'elite', mole_m: 'mat', duck: 'trophy', worm_m: 'sell', scarecrow: 'weaken', king_slime: 'mat',
  wolf: 'elite', spider: 'weaken', treant: 'sell', owlbear: 'night', goblin: 'trophy', fox_fire: 'glow', beetle: 'power', bat: 'night', deer: 'rare', mushroom_p: 'proc', monkey: 'trophyDrop', raccoon: 'sell', pixie: 'mana', bandit: 'trophy', ent: 'rare',
  mole: 'crystal', rockling: 'weaken', cave_bat: 'night', skeleton: 'second', gem_crab: 'crystal', worm: 'mat', kobold: 'sell', ooze: 'proc', drill: 'crystal', bat_g: 'rare', slime_r: 'weaken', dwarf: 'trophy', spider_c: 'glow', iron_golem: 'power', crystal_wyrm: 'crystal',
  frog: 'proc', leech: 'mana', croc: 'power', wisp: 'glow', lizard: 'elite', mosquito: 'trophyDrop', hag: 'mana', toad_king: 'rare', turtle_s: 'second', eel: 'proc', bog_zombie: 'second', dragonfly: 'night', snake_s: 'weaken', hydra_jr: 'elite', bog_lord: 'mana',
  scorpion: 'weaken', mummy: 'second', cactus: 'sell', vulture: 'trophyDrop', sandworm: 'mat', djinn: 'rare', jackal: 'trophy', beetle_s: 'sell', camel: 'mat', lizard_d: 'elite', tumble: 'trophyDrop', cobra: 'proc', sand_golem: 'power', pharaoh: 'trophy', sphinx: 'rare',
  yeti_jr: 'power', ice_slime: 'weaken', penguin: 'second', snow_wolf: 'elite', frost_bird: 'night', snowman: 'sell', ice_imp: 'proc', mammoth: 'power', seal: 'mat', owl_s: 'night', ice_golem: 'weaken', fox_s: 'glow', walrus: 'trophyDrop', frost_knight: 'second', ice_dragon: 'crystal',
  lava_slime: 'mat', salamander: 'proc', imp: 'mana', magma_golem: 'power', fire_bat: 'night', hellhound: 'elite', ember: 'crystal', fire_crab: 'sell', phoenix_s: 'second', rock_turtle: 'weaken', fire_snake: 'proc', demon_jr: 'trophy', ash_wolf: 'elite', efreet: 'mana', red_dragon: 'power',
  ghost: 'glow', gargoyle: 'weaken', vampire_bat: 'night', armor: 'second', shadow_cat: 'glow', book_mimic: 'mana', chest_mimic: 'rare', wraith: 'night', banshee: 'proc', skull_mage: 'mana', candle: 'glow', doll: 'trophyDrop', lich: 'crystal', death_knight: 'power', shadow_lord: 'glow',
}
export const CARD_CAP = Object.fromEntries(Object.entries(ABILITY).filter(([, a]) => a.cap).map(([k, a]) => [k, a.cap]))
export const CARD_MAX = 10
export const KIND_MULT = { normal: 1, elite: 2, boss: 3 }
/** a glowing card: its ability at 1.5 × the level-10 value, one level only */
export const GLOW_CARD_MULT_PCT = 3
export const CARD_DROP = { normal: 0.0045, elite: 0.009, boss: 0.015 } // same as a gold shard
export const GLOW_CARD_MULT = 3, GLOW_CARD = 0.25
export const SELL_RATE = 0.3

/** % bonus of one card at a level */
export const abilityOf = (mon) => ABILITY[CARD_ABILITY[mon.id]] && { key: CARD_ABILITY[mon.id], ...ABILITY[CARD_ABILITY[mon.id]] }
/** level 1 = unit, +10% of unit a level, level 10 = 2 × unit; elite ×2, boss ×3 */
export const cardPct = (mon, lv) => { const a = abilityOf(mon); return lv <= 0 || !a ? 0 : +((lv >= CARD_MAX ? 2 : 1 + 0.1 * (lv - 1)) * a.unit * KIND_MULT[mon.kind]).toFixed(2) }
export const glowCardPct = (mon) => { const a = abilityOf(mon); return a ? +(a.unit * KIND_MULT[mon.kind] * GLOW_CARD_MULT_PCT).toFixed(2) : 0 }
/** shop price (FIAT) by rarity and map tier; selling a spare gives SELL_RATE of it */
export function cardPrice(mon, glow = false) {
  const tier = MAP_BY_ID[mon.map]?.tier || 1, base = 60 + 20 * tier
  return glow ? 1500 + 200 * tier : base * { normal: 1, elite: 3, boss: 8 }[mon.kind]
}
export const sellPrice = (mon, glow = false) => Math.round(cardPrice(mon, glow) * SELL_RATE)

/** total bonus from the album, by ability key, in % */
export function cardFx(f) {
  const fx = {}
  for (const [id, lv] of Object.entries(f.cards || {})) { const m = MON_BY_ID[id], a = m && abilityOf(m); if (a) fx[a.key] = (fx[a.key] || 0) + cardPct(m, lv) }
  for (const id of Object.keys(f.glowCards || {})) { const m = MON_BY_ID[id], a = m && abilityOf(m); if (a) fx[a.key] = (fx[a.key] || 0) + glowCardPct(m) }
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
