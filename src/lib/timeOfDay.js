/**
 * One clock for the whole app: four phases of the day (real local time).
 * Backdrops have a PixelLab variant per phase: `<name>` (day), `<name>_morning`, `<name>_evening`, `<name>_night`.
 * Near the end of a phase the next phase fades in over BLEND_MIN minutes.
 */
export const PHASES = [
  { id: 'night', from: 0, name: 'กลางคืน', emoji: '🌙' },
  { id: 'morning', from: 5, name: 'เช้า', emoji: '🌅' },
  { id: 'day', from: 10, name: 'กลางวัน', emoji: '☀️' },
  { id: 'evening', from: 17, name: 'เย็น', emoji: '🌇' },
  { id: 'night', from: 19, name: 'กลางคืน', emoji: '🌙' },
]
export const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p]))
export const BLEND_MIN = 20

/** { id, name, emoji, next, blend } — blend goes 0→1 during the last BLEND_MIN minutes before `next` */
export function todOf(d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
  let i = 0
  for (let k = 0; k < PHASES.length; k++) if (h >= PHASES[k].from) i = k
  const cur = PHASES[i], nxt = PHASES[(i + 1) % PHASES.length]
  const end = i + 1 < PHASES.length ? nxt.from : 24 + PHASES[1].from
  const left = (end - h) * 60
  const next = nxt.id === cur.id ? PHASES[1] : nxt
  return { ...cur, next: next.id, blend: left < BLEND_MIN ? 1 - left / BLEND_MIN : 0 }
}
export const isNight = (d = new Date()) => todOf(d).id === 'night'
/** the sprite name of a backdrop for a phase */
export const phaseArt = (base, phase) => (phase === 'day' ? base : `${base}_${phase}`)

/** draw a backdrop for the current phase with a cross-fade into the next; `draw(img)` draws one image. Returns false if nothing loaded yet. */
export function drawPhased(g, base, still, draw, tod = todOf()) {
  const a = still(phaseArt(base, tod.id)) || still(base)
  if (!a) return false
  draw(a)
  if (tod.blend > 0) { const b = still(phaseArt(base, tod.next)); if (b) { const o = g.globalAlpha; g.globalAlpha = o * tod.blend; draw(b); g.globalAlpha = o } }
  return true
}

/* ---------------- night bonuses (ก ข ค) ---------------- */
/** night hunt: rare drops ×1.5, monsters 10% tougher; a full moon doubles the rare bonus and the glowing chance */
/** glowing monsters: trophy always ×2; materials, rare slot and magic crystals ×glowDrop; gold shards ×glowShard */
export const NIGHT = { rare: 1.5, monPow: 1.1, glow: 0.03, glowTrophy: 2, glowDrop: 2, glowShard: 1.5, moonMult: 2 }
/** moon age 0..1 (0 new, 0.5 full) from the mean synodic month, anchored at the new moon of 2000-01-06 18:14 UTC */
export function moonPhase(d = new Date()) {
  const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5
  return (((days / 29.530588853) % 1) + 1) % 1
}
/** a full-moon night (about a day either side of the full moon) */
export const isFullMoon = (d = new Date()) => Math.abs(moonPhase(d) - 0.5) < 0.035
