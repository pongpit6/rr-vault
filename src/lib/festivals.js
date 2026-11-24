/**
 * Festival content for the town: double-date sale days (1.1 … 12.12), limited decorations sold only during
 * their festival, visitors who come to town for each festival, and the list of artwork still to draw
 * (filled in later with PixelLab; until then emoji / existing sprites stand in).
 *
 * The idea behind double-date days: the real world shouts "SALE!" at you. In the town the shop has a sale
 * too, but the real win is walking past it: a no-spend day on a double date pays 1 GOLD.
 */
import { todayISO } from './format'

/* ---------- double-date sale days ---------- */
const DOUBLE = {
  1: { pct: 10, name: 'ช้อปรับปีใหม่' }, 2: { pct: 10, name: 'ช้อปวาเลนไทน์' }, 3: { pct: 10, name: 'มหกรรมช้อป' }, 4: { pct: 10, name: 'ช้อปรับสงกรานต์' },
  5: { pct: 10, name: 'มหกรรมช้อป' }, 6: { pct: 15, name: 'มิดเยียร์เซล' }, 7: { pct: 10, name: 'มหกรรมช้อป' }, 8: { pct: 10, name: 'ช้อปวันแม่' },
  9: { pct: 15, name: 'มหกรรมช้อป' }, 10: { pct: 15, name: 'มหกรรมช้อป' }, 11: { pct: 30, name: 'ช้อปใหญ่ที่สุดแห่งปี' }, 12: { pct: 20, name: 'ช้อปส่งท้ายปี' },
}
/** today's double date (or null): { id: 'd11', label: '11.11', pct, name } */
export function doubleDay(iso = todayISO()) {
  const m = +iso.slice(5, 7), d = +iso.slice(8, 10)
  if (m !== d) return null
  return { id: `d${m}`, label: `${m}.${m}`, emoji: '🛍️', ...DOUBLE[m] }
}
/** next double date after today */
export function nextDoubleDay(iso = todayISO()) {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10)
  const nm = d < m ? m : m + 1
  const year = nm > 12 ? y + 1 : y, mm = nm > 12 ? 1 : nm
  const date = `${year}-${String(mm).padStart(2, '0')}-${String(mm).padStart(2, '0')}`
  return { date, label: `${mm}.${mm}`, ...DOUBLE[mm] }
}

/* ---------- limited decorations: sold only while their festival is on, kept forever after ---------- */
// event: a festival id from world.js, or 'sale' for any double date. art = PixelLab job still to do.
export const EVENT_DECOR = [
  { id: 'ev_krathong', name: 'แท่นกระทงดาวเรือง', emoji: '🪷', cost: [180, 0], happy: 7, event: 'loy', art: 'banana-leaf krathong with candle on a stone plinth with marigold garland' },
  { id: 'ev_angpao', name: 'โคมอั่งเปาแดง', emoji: '🧧', cost: [220, 0], happy: 8, event: 'cny', art: 'string of red chinese lanterns with gold tassels' },
  { id: 'ev_songkran', name: 'ขันน้ำสงกรานต์', emoji: '💦', cost: [150, 0], happy: 6, event: 'songkran', art: 'silver water bowl with jasmine flowers, splash' },
  { id: 'ev_candle', name: 'เทียนพรรษา', emoji: '🕯️', cost: [200, 0], happy: 8, event: 'phansa', art: 'large carved buddhist lent candle on a stand' },
  { id: 'ev_fireworks', name: 'แท่นพลุปีใหม่', emoji: '🎆', cost: [260, 0], happy: 9, event: 'newyear', art: 'small firework launcher with sparks' },
  { id: 'ev_xmastree', name: 'ต้นสนประดับไฟ', emoji: '🎄', cost: [240, 0], happy: 9, event: 'xmas', art: 'pine tree with fairy lights and star' },
  { id: 'ev_stall', name: 'แผงตลาดนัด', emoji: '🏪', cost: [200, 0], happy: 7, event: 'payday', art: 'small thai market stall with umbrella' },
  { id: 'ev_salesign', name: 'ป้าย "ไม่ช้อปก็รวยได้"', emoji: '🪧', cost: [0, 1], happy: 10, event: 'sale', art: 'wooden sign with a crossed-out shopping bag' },
]

/* ---------- visitors: one guest per festival walks the street and talks ---------- */
// sprite = what is drawn today (an existing sprite); art = the PixelLab character to make later
export const VISITORS = {
  newyear: { name: 'นักจุดพลุ', sprite: 'visitor_newyear', art: 'firework maker with a lantern pole', lines: ['ปีใหม่แล้ว! ตั้งเป้าออมปีนี้ไว้หรือยัง', 'พลุสวยแป๊บเดียว แต่เงินออมสวยไปทั้งปี'] },
  cny: { name: 'เถ้าแก่ใจดี', sprite: 'visitor_cny', art: 'chinese merchant uncle in red, holding red envelopes', lines: ['ซินเจียยู่อี่ ซินนี้ฮวดไช้! เปิดหีบวันนี้อาจเจออั่งเปาทอง', 'เงินแต๊ะเอียเก็บเข้าบัญชีออมก่อนนะ อาตี๋'] },
  songkran: { name: 'เด็กสาดน้ำ', sprite: 'visitor_songkran', art: 'kid with a water gun and floral shirt', lines: ['สาดน้ำไม่ต้องใช้เงิน! วันไม่ใช้เงินช่วงนี้ได้ FIAT สองเท่า', 'เย็นฉ่ำ ๆ สบายกระเป๋าด้วย'] },
  phansa: { name: 'ชาวบ้านแห่เทียน', sprite: 'visitor_phansa', art: 'villager carrying a lent candle', lines: ['เข้าพรรษาแล้ว ลองงดของฟุ่มเฟือยสักเดือน', 'สัปดาห์ไหนไม่เกินงบ ได้ GOLD 1 เหรียญนะ'] },
  loy: { name: 'นางนพมาศ', sprite: 'visitor_loy', art: 'thai lady in traditional dress holding a krathong', lines: ['ลอยความฟุ่มเฟือยไปกับสายน้ำ เหลือไว้แต่เงินออม', 'แท่นกระทงดาวเรืองมีขายเฉพาะช่วงนี้นะ ตั้งไว้หน้าบ้านสวยทั้งปี'] },
  xmas: { name: 'พ่อค้าตลาดฤดูหนาว', sprite: 'visitor_xmas', art: 'winter market seller with a scarf and cocoa', lines: ['สรุปปีนี้ของท่านเป็นยังไงบ้าง ไปดูบันทึกเดือนได้เลย', 'ช่วงนี้รายได้เมืองเก็บได้ 1.5 เท่า'] },
  payday: { name: 'พ่อค้าตลาดนัด', sprite: 'visitor_payday', art: 'cheerful market vendor', lines: ['เงินเดือนออกแล้ว! แบ่งเข้ากันหนี้และลงทุนก่อนค่อยมาเดินตลาดนะ', 'ร้านในเมืองลด 10% วันนี้วันเดียว'] },
  sale: { name: 'เซลส์แมนเสียงดัง', sprite: 'visitor_sale', art: 'loud salesman with a megaphone and sale tags', lines: ['ลดกระหน่ำ! …แต่ถ้าท่านเดินผ่านไปเฉย ๆ วันนี้ ข้าจะยอมแพ้ให้ 1 GOLD', 'ของลดราคาที่ไม่ได้ใช้ ก็ยังแพงอยู่ดีนะ'] },
}

/** today's visitor (major festival first, then a double date) */
export function visitorFor(world) {
  const id = world?.event?.id || (world?.sale ? 'sale' : null)
  return id && VISITORS[id] ? { id, ...VISITORS[id] } : null
}

/** can this limited decoration be bought right now? */
export const decorOnSale = (item, world) => !item.event || item.event === world?.event?.id || (item.event === 'sale' && !!world?.sale)

/* ---------- artwork still to draw with PixelLab (everything here currently uses a stand-in) ---------- */
export const ART_TODO = [
  ...EVENT_DECOR.map((d) => ({ kind: 'decor', id: d.id, name: d.name, prompt: d.art })),
  ...Object.entries(VISITORS).map(([id, v]) => ({ kind: 'visitor', id: `visitor_${id}`, name: v.name, prompt: v.art })),
]
