import { useEffect, useRef } from 'react'
import { still, drawStill, frame, skyFor, mix, GROUND } from './BattleScene'
import { DECOR_BY_ID } from '../lib/town'
import { NPC_BY_ID, RESIDENTS } from '../lib/town'
import { useStore } from '../store'
import { worldBack, worldFront } from './WorldFx'
import { prop } from './propArt'
import { todOf, drawPhased, phaseArt } from '../lib/timeOfDay'
import { TRACE_HOME, traceOnBuilding, traceProps, traceNoSpend, heroForm, growthAura } from './TownTraces'

const MEMBER_COLOR = { knight: '#f97316', mage: '#6366f1', healer: '#14b8a6', ranger: '#f59e0b' }

/**
 * Side-view pixel town. Background shapes are drawn at half resolution (×2), sprites at full res.
 * Layout (half-res units): gate · town hall · plot 1 · plot 2 · … (the town grows to the right).
 */
export const TH = 120 // half-res height
/** basic decor drawn from PixelLab art (falls back to the hand-drawn shape until the file exists) */
const BASIC_ART = { tree: 'dc_tree', bench: 'dc_bench', lamp: 'dc_lamp', flowers: 'dc_flowers', banner: 'dc_banner', well: 'dc_well', fountain: 'dc_fountain', statue: 'dc_statue' }
export const GYH = 96 // half-res ground line
const K = 1.5 // buildings are drawn 1.5× bigger (3 screen px per unit, still crisp)
const PLOT_W = 62, HALL_W = 84, LEFT = 22, RIGHT = 30
export const townWidth = (plotCount) => LEFT + HALL_W + plotCount * PLOT_W + RIGHT
export const plotX = (i) => LEFT + HALL_W + i * PLOT_W
export const HALL_X = LEFT

function sky(g, top, bottom, w) { for (let i = 0; i < 12; i++) { g.fillStyle = mix(top, bottom, i / 11); g.fillRect(0, Math.floor((i * 98) / 12), w, 10) } }
function hills(g, c1, c2, w) {
  g.fillStyle = c1; for (let x = 0; x < w; x++) { const y = 84 - Math.round(6 + 5 * Math.sin(x / 19) + 3 * Math.sin(x / 7.7)); g.fillRect(x, y, 1, 98 - y) }
  g.fillStyle = c2; for (let x = 0; x < w; x++) { const y = 94 - Math.round(3 + 3 * Math.sin(x / 12 + 2)); g.fillRect(x, y, 1, 98 - y) }
}

/* town life by time of day (PixelLab am_* sprites, half-res coords): rooster at dawn, birds by day, crows at dusk, cat, fireflies and shooting stars at night */
const hs = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }
function townLife(g, now, w, G, phase) {
  const t = now / 1000, put = (name, x, y, sz, flip = false, a = 1) => { const im = still(name); if (!im) return; g.save(); g.globalAlpha = a; g.translate(Math.round(x + sz / 2), Math.round(y)); g.scale(flip ? -1 : 1, 1); g.drawImage(im, -sz / 2, -sz, sz, sz); g.restore() }
  const fly = (name, n, sz, sp) => { for (let i = 0; i < n; i++) { const dir = hs(i, sz) > 0.5, p = ((t * sp * (0.8 + hs(i) * 0.5) + hs(i, 3) * 900) % (w + 60)) - 30; put(name, dir ? p : w - p, 18 + hs(i, 5) * 22 + Math.sin(t * 3 + i) * 2, sz, !dir) } }
  if (phase === 'morning') { put('am_rooster', w * 0.62, G + 1, 8, Math.sin(t * 0.2) > 0); fly('am_bird', 2, 6, 18) }
  if (phase === 'day') fly('am_bird', 3, 6, 20)
  if (phase === 'evening') fly('am_crow', 3, 8, 16)
  if (phase === 'night') {
    put('am_cat', w * 0.38 + Math.sin(t * 0.15) * 30, G + 1, 8, Math.cos(t * 0.15) < 0)
    for (let i = 0; i < 8; i++) put('am_firefly', (hs(i) * w + Math.sin(t * 0.6 + i) * 20 + w) % w, G - 8 - hs(i, 2) * 30 + Math.sin(t * 1.3 + i) * 4, 4, false, 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7))
    const k = (t % 12) / 1.1; if (k < 1) put('am_shoot', w * 0.3 + k * 70, 10 + k * 22, 12, false, 1 - k)
  }
}

/** Draw the whole town onto a context already scaled ×2 (half-res coords). Returns a full-res foreground painter. */
export function drawTown(g, t, now, o = {}) {
  const w = townWidth(t.plotCount)
  const hour = o.hour ?? new Date().getHours()
  const S = skyFor(o.dark ? 22 : hour)
  const night = o.dark || S.night > 0.2
  const C = {
    wall: night ? '#64748b' : '#f8fafc', wall2: night ? '#475569' : '#e2e8f0', roof: night ? '#7f1d1d' : '#ef4444', roof2: night ? '#1e3a8a' : '#3b82f6', roof3: night ? '#14532d' : '#16a34a',
    win: night ? '#fde047' : '#7dd3fc', wood: night ? '#44403c' : '#92400e', wood2: night ? '#57534e' : '#b45309', stone: night ? '#64748b' : '#cbd5e1', stone2: night ? '#475569' : '#94a3b8',
    gold: night ? '#ca8a04' : '#fbbf24', gold2: night ? '#a16207' : '#f59e0b', leaf: night ? '#14532d' : '#16a34a', leaf2: night ? '#166534' : '#4ade80', dark: '#1e293b',
  }
  const R = (c, x, y, ww, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), ww, h) }
  const roof = (x, y, ww, c, steps = 5) => { g.fillStyle = c; for (let i = 0; i < steps; i++) g.fillRect(x - 1 + i, y - 1 - i, ww + 2 - 2 * i, 1) }
  const winB = (x, y) => { R(C.win, x, y, 2, 2); if (night) { g.fillStyle = 'rgba(253,224,71,.15)'; g.fillRect(x - 2, y - 2, 6, 6) } }
  const smoke = (x, y) => { for (let i = 0; i < 3; i++) { const k = ((now / 1400 + i / 3) % 1); g.fillStyle = `rgba(226,232,240,${0.7 - k * 0.6})`; g.fillRect(x + Math.round(Math.sin(k * 6 + i) * 2), y - k * 14, 2, 2) } }
  const stars = (x, y, lv) => { for (let i = 0; i < lv; i++) R('#facc15', x + i * 3, y, 2, 2) }
  const G = GYH

  // PixelLab backdrop + road, tiled (every other tile mirrored so the seams meet)
  const bgA = still('town_bg'), grA = still('town_ground')
  const tile = (im, y, h) => { for (let x = 0, k = 0; x < w; x += im.width, k++) { if (k % 2) { g.save(); g.translate(x + im.width, 0); g.scale(-1, 1); g.drawImage(im, 0, y, im.width, h); g.restore() } else g.drawImage(im, x, y, im.width, h) } }
  // sky + hills + ground
  sky(g, S.top, S.bottom, w)
  if (night) { for (let i = 0; i < 40; i++) { const x = (i * 73) % w, y = (i * 37) % 60; if (Math.sin(now / 500 + i) > -0.2) R('#e0f2fe', x, y, 1, 1) } R('#fef9c3', w - 40, 10, 7, 7) }
  else R('#fde047', w - 46, 12, 8, 8)
  // drifting clouds (light; the world layer adds the heavy deck)
  if (!night && !(o.world && ['rain', 'storm', 'cloud'].includes(o.world.weather))) for (let i = 0; i < 4; i++) { const x = ((now / 260 + i * 97) % (w + 40)) - 30; R('#ffffff', x, 14 + i * 7, 18, 3); R('#ffffff', x + 4, 12 + i * 7, 10, 2) }
  worldBack(g, now, { w, G, night, world: o.world })
  const GR = GROUND[2]
  hills(g, ...(S.hill || ['#86efac', '#4ade80']), w)
  R(GR.grass, 0, G, w, 2)
  R(GR.dirt, 0, G + 2, w, 30)
  // cobble street
  g.fillStyle = GR.speck; for (let y = G + 5, r = 0; y < 118; y += 4, r++) for (let x = (r % 2) * 4; x < w; x += 8) g.fillRect(x, y, 6, 1)
  if (bgA && grA) {
    // backdrop for this time of day (PixelLab variants town_bg_morning/_evening/_night), cross-fading near the change
    const tod = o.dark ? { id: 'night', blend: 0 } : o.hour != null ? { id: o.hour >= 19 || o.hour < 5 ? 'night' : o.hour < 10 ? 'morning' : o.hour < 17 ? 'day' : 'evening', blend: 0 } : todOf()
    drawPhased(g, 'town_bg', still, (im) => tile(im, G - im.height + 4, im.height), tod)
    const painted = still(phaseArt('town_bg', tod.id)) && tod.id !== 'day'
    if (night && painted) { g.fillStyle = 'rgba(15,23,42,.18)'; g.fillRect(0, 0, w, G + 4) }
    else if (night) { g.fillStyle = 'rgba(15,23,42,.55)'; g.fillRect(0, 0, w, G + 4); for (let i = 0; i < 40; i++) { const x = (i * 73) % w, y = (i * 37) % 50; if (Math.sin(now / 500 + i) > -0.2) R('#e0f2fe', x, y, 1, 1) } R('#fef9c3', w - 40, 10, 7, 7) }
    else if (S.night > 0 && !painted) { g.fillStyle = `rgba(251,146,60,${0.25 * Math.min(1, S.night * 4)})`; g.fillRect(0, 0, w, G + 4) }
    worldBack(g, now, { w, G, night, world: o.world })
    townLife(g, now, w, G, tod.id)
    tile(grA, G, grA.height)
  }

  // gate / sign at the left
  if (!prop(g, 'pr_gate', 0, G + 1, 24)) { R(C.wood, 4, G - 22, 2, 22); R(C.wood, 13, G - 22, 2, 22); R(C.wood2, 2, G - 24, 15, 3) }

  // ---------- town hall ----------
  const big = (ax, fn) => { g.save(); g.translate(ax, G); g.scale(K, K); g.translate(-ax, -G); fn(); g.restore() }
  const hx = HALL_X + 6, hl = t.town.hall
  const hallIm = still(`bld_hall_${hl}`)
  if (hallIm) big(hx, () => { const sz = [38, 44, 50][hl - 1]; g.drawImage(hallIm, hx + 23 - sz / 2, G - sz + 2, sz, sz) })
  else big(hx, () => {
  if (hl === 1) {
    R(C.wood2, hx, G - 22, 46, 22); roof(hx, G - 22, 46, C.roof, 8)
    R(C.wood, hx + 20, G - 12, 7, 12); winB(hx + 6, G - 16); winB(hx + 38, G - 16)
    R(C.dark, hx + 21, G - 34, 1, 8); R('#10b981', hx + 22, G - 34 + (Math.floor(now / 300) % 2), 5, 3)
  } else {
    const hh = hl === 2 ? 30 : 36
    R(C.stone, hx - 2, G - hh, 50, hh); g.fillStyle = C.stone2; for (let x = hx - 2; x < hx + 48; x += 4) g.fillRect(x, G - hh - 2, 2, 2)
    for (let c = 0; c < 4; c++) R(C.wall, hx + 3 + c * 12, G - hh + 8, 3, hh - 8)
    R(C.dark, hx + 19, G - 14, 9, 14); R(C.wood, hx + 20, G - 13, 7, 13)
    // clock
    R('#fef3c7', hx + 20, G - hh + 2, 7, 5); R(C.dark, hx + 23, G - hh + 3, 1, 3); R(C.dark, hx + 23, G - hh + 4, 2, 1)
    if (hl === 3) {
      g.fillStyle = C.gold; for (let i = 0; i < 6; i++) g.fillRect(hx + 13 + i, G - hh - 3 - i, 21 - 2 * i, 1)
      R(C.dark, hx + 23, G - hh - 16, 1, 8); R('#f43f5e', hx + 24, G - hh - 16 + (Math.floor(now / 300) % 2), 5, 3)
      for (const x of [hx - 2, hx + 46]) { R(C.stone2, x, G - hh - 8, 6, hh + 8); R(C.gold2, x, G - hh - 10, 6, 2) }
    }
    winB(hx + 8, G - 18); winB(hx + 38, G - 18)
  }
  stars(hx + 18, G - (hl === 1 ? 46 : hl === 2 ? 40 : 58), hl)
  })

  // ---------- plots ----------
  t.plots.forEach((b, i) => {
    const x = plotX(i) + 5, sel = o.selected === i
    big(x, () => { if (!b) {
      if (prop(g, 'pr_plot', x + 8, G + 4, 20)) return
      R('#a16207', x + 2, G - 1, 32, 1)
      for (let k = 0; k < 4; k++) R('#78350f', x + 4 + k * 8, G - 3, 4, 2)
      R(C.wood, x + 16, G - 12, 1, 11); R('#fef3c7', x + 11, G - 15, 11, 5); R('#a16207', x + 16, G - 14, 1, 3); R('#a16207', x + 15, G - 13, 3, 1)
    } else drawBuilding(b, x) })
    if (sel) {
      const k = Math.floor(now / 250) % 2
      g.strokeStyle = '#facc15'; g.lineWidth = 1; g.strokeRect(x - 3 + 0.5, G - 74 + 0.5 - k, 58, 76)
      R('#facc15', x + 25, G - 80 - k, 5, 3)
    }
  })

  function drawBuilding(b, x) {
    const lv = b.lv
    const art = still(`bld_${b.type}_${lv}`)
    if (art) { const sz = [27, 31, 35][lv - 1]; g.drawImage(art, x + 18 - sz / 2, G - sz + 2, sz, sz); return }
    switch (b.type) {
      case 'house': {
        const ww = 18 + lv * 4, h = 10 + (lv - 1) * 6, y = G - h
        R(C.wall, x + 2, y, ww, h); roof(x + 2, y, ww, [C.roof, C.roof2, C.roof3][i3(x)], 6 + lv)
        winB(x + 5, y + 3); if (lv > 1) winB(x + ww - 4, y + 3); if (lv > 1) winB(x + 5, y + 9)
        R(C.wood, x + ww - 6 + (lv > 1 ? -6 : 0), G - 6, 3, 6)
        if (lv === 3) { R(C.stone2, x + ww - 3, y - 12, 3, 8); smoke(x + ww - 3, y - 13); R('#f472b6', x + 4, y + 6, 6, 1) }
        stars(x + 6, y - 10 - lv * 1, lv); break
      }
      case 'farm': {
        const rows = 2 + lv
        for (let r = 0; r < rows; r++) for (let k = 0; k < 7; k++) { const sway = Math.sin(now / 500 + k + r) > 0.6 ? 1 : 0; R(r % 2 ? '#65a30d' : '#84cc16', x + 2 + k * 3 + sway, G - 3 - r * 2, 2, 2); if (lv > 1 && (k + r) % 3 === 0) R('#f59e0b', x + 2 + k * 3, G - 4 - r * 2, 1, 1) }
        R('#b91c1c', x + 24, G - 12, 11, 12); roof(x + 24, G - 12, 11, '#7f1d1d', 4); R('#fef3c7', x + 28, G - 7, 3, 7)
        if (lv >= 2) { // windmill
          R(C.stone, x + 2, G - 26, 5, 14); const a = now / 600
          for (let k = 0; k < 4; k++) { const ang = a + k * Math.PI / 2; for (let r = 1; r < 8; r++) R('#f8fafc', x + 4 + Math.cos(ang) * r, G - 26 + Math.sin(ang) * r, 1, 1) }
        }
        if (lv === 3) { R(C.stone2, x + 36, G - 20, 5, 20); R(C.stone, x + 36, G - 22, 5, 2) }
        stars(x + 26, G - 18, lv); break
      }
      case 'market': {
        const n = lv
        for (let k = 0; k < n; k++) {
          const sx = x + 1 + k * 12
          R(C.wood, sx, G - 10, 1, 10); R(C.wood, sx + 10, G - 10, 1, 10); R(C.wood, sx, G - 5, 11, 2)
          for (let q = 0; q < 11; q++) R(q % 2 ? ['#ef4444', '#3b82f6', '#f59e0b'][k] : '#fff', sx + q, G - 13, 1, 3)
          R('#fbbf24', sx + 2, G - 7, 2, 2); R('#a3e635', sx + 6, G - 7, 2, 2)
        }
        if (lv === 3) { R(C.wood2, x, G - 22, 36, 2); roof(x, G - 22, 36, '#f59e0b', 5) }
        stars(x + 12, G - (lv === 3 ? 32 : 19), lv); break
      }
      case 'bank': {
        const h = 16 + lv * 4, y = G - h
        R(C.stone, x + 1, y, 32, h); R(C.stone2, x, y - 2, 34, 2)
        for (let c = 0; c < 2 + lv; c++) R(C.wall, x + 3 + c * Math.floor(28 / (1 + lv)), y + 3, 2, h - 3)
        R(C.dark, x + 14, G - 9, 6, 9); R(C.gold, x + 15, y - 7, 5, 5); R(C.gold2, x + 17, y - 6, 1, 3)
        if (lv === 3) { g.fillStyle = C.gold; for (let i = 0; i < 5; i++) g.fillRect(x + 9 + i, y - 8 - i, 16 - 2 * i, 1) }
        stars(x + 13, y - (lv === 3 ? 18 : 11), lv); break
      }
      case 'mine': {
        g.fillStyle = '#78716c'; for (let k = 0; k < 14; k++) g.fillRect(x + 2 + k, G - 4 - k, 32 - 2 * k, 1)
        R(C.dark, x + 12, G - 9, 9, 9); R(C.wood, x + 11, G - 10, 11, 2); R(C.wood, x + 11, G - 10, 2, 10); R(C.wood, x + 20, G - 10, 2, 10)
        R('#57534e', x - 2, G - 1, 40, 1)
        const cx = x + 26 + Math.round(Math.sin(now / 1200) * 4); R('#475569', cx, G - 5, 6, 4); R(C.gold, cx + 1, G - 6, 4, 1)
        if (lv >= 2) { R(C.dark, x + 8, G - 15, 1, 6); R('#fde047', x + 7, G - 16, 3, 2) }
        if (lv === 3) for (let k = 0; k < 4; k++) if (Math.sin(now / 200 + k * 2) > 0.5) R('#fef08a', x + 6 + k * 7, G - 12 - (k % 2) * 4, 1, 1)
        stars(x + 13, G - 22, lv); break
      }
      case 'library': {
        const h = 14 + lv * 5, y = G - h
        R('#a78bfa', x + 2, y, 28, h); roof(x + 2, y, 28, '#4c1d95', 6)
        winB(x + 6, y + 4); winB(x + 24, y + 4); if (lv > 1) { winB(x + 6, y + 11); winB(x + 24, y + 11) }
        R(C.wood, x + 14, G - 7, 4, 7); R('#fef3c7', x + 12, y + 3, 8, 5); R('#1d4ed8', x + 13, y + 4, 2, 3); R('#dc2626', x + 16, y + 4, 2, 3)
        if (lv === 3) { R('#7c3aed', x + 26, y - 14, 6, 14); R('#4c1d95', x + 25, y - 16, 8, 2); R(C.stone2, x + 30, y - 18, 4, 1) }
        stars(x + 10, y - 11, lv); break
      }
      case 'tavern': {
        const h = 14 + (lv - 1) * 6, y = G - h
        R(C.wood2, x + 1, y, 30, h); roof(x + 1, y, 30, '#7c2d12', 6); R(C.wood, x + 13, G - 8, 5, 8)
        winB(x + 4, y + 4); winB(x + 25, y + 4)
        R(C.wood, x + 31, y + 2, 4, 1); R('#fbbf24', x + 32, y + 3, 3, 4); R('#fff7ed', x + 32, y + 3, 3, 1)
        if (lv >= 2) { R(C.wood, x + 1, y + 7, 30, 1); for (let k = 0; k < 8; k++) R(C.wood, x + 2 + k * 4, y + 5, 1, 2) }
        if (lv === 3) for (let k = 0; k < 6; k++) R(['#f87171', '#fde047', '#60a5fa'][k % 3], x + 2 + k * 5, y - 1 + (k % 2), 2, 2)
        smoke(x + 6, y - 6)
        stars(x + 12, y - 11, lv); break
      }
      case 'tower': {
        const h = 22 + lv * 7, y = G - h
        R(C.stone, x + 12, y, 10, h); g.fillStyle = C.stone2; for (let k = 0; k < 10; k += 3) g.fillRect(x + 12 + k, y - 2, 2, 2)
        winB(x + 16, y + 5); if (lv > 1) winB(x + 16, y + 14)
        R(C.dark, x + 16, y - 10, 1, 8); R('#0ea5e9', x + 17, y - 10 + (Math.floor(now / 300) % 2), 5, 3)
        if (night) { const a = Math.sin(now / 900); g.fillStyle = 'rgba(253,224,71,.18)'; g.beginPath(); g.moveTo(x + 17, y + 6); g.lineTo(x + 17 + a * 30 - 8, y + 30); g.lineTo(x + 17 + a * 30 + 8, y + 30); g.fill() }
        stars(x + 13, y - 15, lv); break
      }
      case 'gym': {
        const h = 14 + lv * 4, y = G - h
        R('#fb923c', x + 1, y, 32, h); R('#9a3412', x, y - 2, 34, 3)
        R(C.dark, x + 13, G - 9, 8, 9); winB(x + 4, y + 4); winB(x + 26, y + 4)
        // dumbbell sign, lifting animation
        const up = Math.floor(now / 500) % 2
        R('#1e293b', x + 10, y - 7 - up, 14, 2); R('#1e293b', x + 8, y - 9 - up, 3, 6); R('#1e293b', x + 23, y - 9 - up, 3, 6)
        if (lv >= 2) for (let k = 0; k < 3; k++) R('#fde68a', x + 3 + k * 11, y + 1, 4, 1)
        if (lv === 3) { R('#f97316', x + 34, G - 12, 1, 12); R('#fff', x + 35, G - 12, 5, 3) }
        stars(x + 13, y - 16, lv); break
      }
      case 'temple': {
        const h = 12 + lv * 4, y = G - h
        R('#fef3c7', x + 4, y, 26, h); R('#b45309', x + 2, G - 2, 30, 2)
        g.fillStyle = '#dc2626'; for (let k = 0; k < 7; k++) g.fillRect(x + 1 + k * 2, y - k, 32 - k * 4, 1)
        R(C.gold, x + 16, y - 12, 2, 6); R(C.gold, x + 15, y - 13, 4, 1)
        R(C.dark, x + 14, G - 8, 6, 8); R(C.gold, x + 16, G - 6, 2, 2)
        if (lv >= 2) { R(C.gold, x + 2, y - 2, 2, 3); R(C.gold, x + 30, y - 2, 2, 3) }
        if (lv === 3) for (let k = 0; k < 3; k++) { const b = Math.sin(now / 700 + k) > 0 ? 1 : 0; R('#fde047', x + 8 + k * 9, y + 4 + b, 1, 1) }
        stars(x + 13, y - 20, lv); break
      }
      case 'school': {
        const h = 16 + lv * 4, y = G - h
        R('#93c5fd', x + 1, y, 32, h); roof(x + 1, y, 32, '#1d4ed8', 6)
        winB(x + 4, y + 4); winB(x + 12, y + 4); winB(x + 20, y + 4); winB(x + 28, y + 4)
        R(C.wood, x + 15, G - 8, 5, 8)
        R('#fff', x + 10, y - 4, 14, 4); R('#1e293b', x + 11, y - 3, 2, 2); R('#1e293b', x + 15, y - 3, 1, 2); R('#1e293b', x + 18, y - 3, 3, 2)
        if (lv >= 2) { R(C.wood, x + 33, G - 14, 1, 14); R('#ef4444', x + 34, G - 14, 5, 3) }
        stars(x + 13, y - 14, lv); break
      }
      case 'kitchen': {
        const h = 13 + lv * 4, y = G - h
        R('#bbf7d0', x + 2, y, 30, h); roof(x + 2, y, 30, '#15803d', 5)
        R(C.wood, x + 4, G - 8, 5, 8); winB(x + 22, y + 4)
        for (let k = 0; k < 3 + lv; k++) R(['#ef4444', '#f97316', '#16a34a', '#fde047'][k % 4], x + 12 + (k % 3) * 3, G - 4 - Math.floor(k / 3) * 2, 2, 2)
        smoke(x + 26, y - 6)
        if (lv === 3) R('#fff', x + 10, y - 4, 10, 3)
        stars(x + 13, y - 12, lv); break
      }
      default: break
    }
  }
  function i3(x) { return Math.floor(x / PLOT_W) % 3 }

  // ---------- today's traces ----------
  const tr = o.traces
  if (tr) {
    const homes = new Set()
    t.plots.forEach((b, i) => {
      if (!b) return
      const k = Object.keys(TRACE_HOME).find((key) => TRACE_HOME[key] === b.type)
      if (k && tr[k]) { homes.add(k); const x = plotX(i) + 5; big(x, () => traceOnBuilding(g, b.type, x, G, now, night)) }
    })
    const loose = ['exercise', 'read', 'meditate', 'vocab', 'nocarb', 'saved', 'paid'].filter((k) => tr[k] && !homes.has(k))
    if (loose.length) traceProps(g, loose, HALL_X + 24, G, now)
    if (tr.nospend) traceNoSpend(g, w, G, now)
  }

  // decor (front row)
  const dec = t.decor
  const spots = (k) => LEFT + 4 + Math.round(((k + 0.5) * (w - LEFT - RIGHT)) / Math.max(1, dec.length))
  dec.forEach((id, k) => {
    const x = spots(k), y = G + 12 + (dec.length > 8 && k % 2 ? 9 : 0) // two rows when there are many
    g.save(); g.translate(x, y); g.scale(1.3, 1.3); g.translate(-x, -y)
    const art = still(BASIC_ART[id] || id)
    if (art && (BASIC_ART[id] || id.startsWith('ev_') || id.startsWith('cr_'))) { g.drawImage(art, x - 5, y - 17, 18, 18); g.restore(); return }
    if (id === 'tree') { R(C.wood, x + 2, y - 6, 2, 6); R(C.leaf, x - 2, y - 16, 10, 10); R(C.leaf2, x, y - 15, 4, 3) }
    if (id === 'bench') { R(C.wood2, x, y - 4, 10, 2); R(C.wood, x, y - 2, 1, 2); R(C.wood, x + 9, y - 2, 1, 2); R(C.wood, x, y - 7, 10, 1) }
    if (id === 'lamp') { R('#334155', x, y - 16, 1, 16); R(night ? '#fde047' : '#fef9c3', x - 1, y - 18, 3, 2); if (night) { g.fillStyle = 'rgba(253,224,71,.2)'; g.fillRect(x - 6, y - 22, 13, 12) } }
    if (id === 'flowers') for (let q = 0; q < 6; q++) { R(C.leaf, x + q * 2, y - 2, 1, 2); R(['#f472b6', '#fde047', '#f87171'][q % 3], x + q * 2, y - 3 - (q % 2), 1, 1) }
    if (id === 'banner') { R('#334155', x + 2, y - 18, 1, 18); const wv = Math.floor(now / 250) % 2; R('#10b981', x + 3, y - 18 + wv, 8, 3); R('#38bdf8', x + 3, y - 15 + wv, 8, 3) }
    if (id === 'well') { R(C.stone, x, y - 5, 8, 5); R(C.wood, x, y - 11, 1, 6); R(C.wood, x + 7, y - 11, 1, 6); R(C.roof, x - 1, y - 12, 10, 1) }
    if (id === 'fountain') {
      R(C.stone, x - 4, y - 4, 16, 4); R(C.stone2, x + 2, y - 10, 4, 6)
      for (let q = 0; q < 6; q++) { const k2 = (now / 500 + q / 6) % 1; R('#7dd3fc', x + 3 + Math.round(Math.sin(q * 2) * k2 * 6), y - 12 + k2 * 9 - Math.sin(k2 * Math.PI) * 4, 1, 1) }
    }
    // festival pieces: emoji stand-ins until their PixelLab art is drawn
    if ((id.startsWith('ev_') || id.startsWith('cr_')) && !still(id)) { const it = DECOR_BY_ID[id]; if (it) { g.font = '12px sans-serif'; g.textAlign = 'center'; g.fillText(it.emoji, x + 4, y - 2); g.textAlign = 'left' } }
    if (id === 'statue') { R(C.stone2, x, y - 4, 8, 4); R(C.gold, x + 2, y - 14, 4, 10); R(C.gold2, x + 3, y - 16, 2, 2); if (Math.sin(now / 300) > 0.8) R('#fff', x + 5, y - 13, 1, 1) }
    g.restore()
  })

  // living world on top of buildings
  worldFront(g, now, { w, G, TH, night, world: o.world, hx: hx, hallTop: G - (hl === 1 ? 30 : hl === 2 ? 40 : 58) * K + 8 })
  // night tint
  if (night) { g.fillStyle = 'rgba(15,23,42,.18)'; g.fillRect(0, 0, w, TH) }

  // full-res foreground: walking villagers + the party at the hall
  return () => {
    const W2 = w * 2, GY = G * 2 + 4
    const walkers = [...RESIDENTS.map((r) => r.sprite), ...(o.extra || []), ...t.npcs.map((id) => NPC_BY_ID[id]?.sprite).filter(Boolean)]
    const at = {} // where each speaker stands this frame (for the chat bubble)
    const resting = (o.world && o.world.holiday) || (hour >= 22 || hour < 6)
    walkers.forEach((sp, k) => {
      if (resting && k % 2) return // half the town is asleep / off work
      const span = W2 - 140, speed = 5200 + k * 900
      const ph = now / speed + k * 1.7
      const x = 70 + ((Math.sin(ph) + 1) / 2) * span
      const flip = Math.cos(ph) < 0
      const hop = Math.sin(now / 190 + k) > 0.3 ? 1 : 0
      drawStill(g, sp, x, GY + 16 + (k % 3) * 5 - hop, 34, flip)
      at[sp] = [x, GY + 16 + (k % 3) * 5 - 36]
    })
    const hx2 = HALL_X * 2
    const gr = o.growth
    growthAura(g, hx2 + 8, GY + 18, gr?.members?.knight?.stage, MEMBER_COLOR.knight, now, 50)
    ;(o.party || []).forEach((id, k) => growthAura(g, hx2 + 171 + k * 26, GY + 18, gr?.members?.[id]?.stage, MEMBER_COLOR[id] || '#14b8a6', now, 38))
    const hero = frame('hero_idle', Math.floor(now / 180) % 5, 'normal', o.hue || 0)
    if (hero) g.drawImage(hero, hx2 - 16, GY - 36, (hero.width / hero.height) * 54, 54)
    at.hero = [hx2 + 10, GY - 36]
    if (o.traces?.form) heroForm(g, o.traces.form, hx2 - 6, GY - 40, now)
    ;(o.party || []).forEach((id, k) => { const im = frame(`${id}_idle`, Math.floor(now / 200 + k) % 5); if (im) g.drawImage(im, hx2 + 150 + k * 26, GY - 24, 42, 42); at[id] = [hx2 + 171 + k * 26, GY - 22] })
    // whoever is talking in the town chat gets a speech bubble
    const tk = useStore.getState().ui.townTalk
    if (tk && Date.now() - tk.at < 5000) {
      const sp = tk.who === 'hero' ? 'hero' : ['healer', 'mage', 'ranger'].includes(tk.who) ? tk.who : tk.who === 'apprentice' ? 'npc_apprentice' : tk.who === 'visitor' ? (o.extra || []).find((e) => e.startsWith('visitor_')) : (RESIDENTS.find((r) => r.id === tk.who) || NPC_BY_ID[tk.who])?.sprite
      const p = at[sp]
      if (p) speech(g, tk.text, p[0], p[1], W2)
    }
    if (o.pet) { const ps = [18, 22, 27][(gr?.pet?.stage || 1) - 1]; drawStill(g, o.pet, hx2 - 26 - (ps - 18), GY + 16 - (Math.floor(now / 400) % 2), ps) }
  }
}

/** a pixel speech bubble above (x, y): up to two lines, emoji stripped */
function speech(g, text, x, y, W2) {
  const clean = String(text).replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/\s+/g, ' ').trim()
  g.font = '600 11px sans-serif'
  const segs = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(clean)].map((x) => x.segment) : clean.split('')
  const lines = ['']
  for (const sg of segs) {
    const t = lines[lines.length - 1] + sg
    if (g.measureText(t).width > 168 && lines[lines.length - 1]) { if (lines.length === 2) { lines[1] = lines[1].trimEnd() + '…'; break } lines.push(sg.trimStart()) } else lines[lines.length - 1] = t
  }
  const w = Math.min(190, Math.max(...lines.map((l) => g.measureText(l).width)) + 12), h = lines.length * 13 + 8
  const bx = Math.round(Math.max(4, Math.min(W2 - w - 4, x - w / 2))), by = Math.round(y - h - 8)
  g.fillStyle = '#1e293b'; g.fillRect(bx - 2, by - 2, w + 4, h + 4)
  g.fillStyle = '#ffffff'; g.fillRect(bx, by, w, h)
  g.fillStyle = '#1e293b'; g.fillRect(Math.round(x) - 3, by + h + 2, 6, 3); g.fillRect(Math.round(x) - 1, by + h + 5, 2, 3)
  g.fillStyle = '#0f172a'; g.textBaseline = 'top'
  lines.forEach((l, i) => g.fillText(l, bx + 6, by + 4 + i * 13, w - 10))
  g.textBaseline = 'alphabetic'
}

/** Canvas wrapper: animates at ~8 fps, horizontally scrollable, tap a plot to select it. */
export default function TownScene({ town, party = [], pet, hue, dark, selected, onSelect, height = 220, world = null, traces = null, extra = null, growth = null }) {
  const cv = useRef(null), box = useRef(null)
  const O = useRef({})
  O.current = { town, party, pet, hue, dark, selected, world, traces, extra, growth }
  const w = townWidth(town.plotCount)
  useEffect(() => {
    const c = cv.current, g = c.getContext('2d')
    g.imageSmoothingEnabled = false
    let timer, alive = true
    const draw = () => {
      if (!alive) return
      if (document.visibilityState === 'visible') {
        const o = O.current, now = performance.now()
        g.setTransform(2, 0, 0, 2, 0, 0)
        const fg = drawTown(g, o.town, now, { party: o.party, pet: o.pet, hue: o.hue, dark: o.dark, selected: o.selected, world: o.world, traces: o.traces, extra: o.extra, growth: o.growth })
        g.setTransform(1, 0, 0, 1, 0, 0)
        fg()
      }
      timer = setTimeout(draw, 125)
    }
    draw()
    return () => { alive = false; clearTimeout(timer) }
  }, [w])
  const click = (e) => {
    const r = cv.current.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * w
    if (x >= HALL_X && x < HALL_X + HALL_W) return onSelect?.('hall')
    const i = Math.floor((x - plotX(0)) / PLOT_W)
    if (i >= 0 && i < town.plotCount) onSelect?.(i)
  }
  return (
    <div ref={box} className="town-scroll overflow-x-auto no-scrollbar" data-testid="town-scene">
      <canvas ref={cv} width={w * 2} height={TH * 2} onClick={click} style={{ height, width: (w * 2 * height) / (TH * 2), imageRendering: 'pixelated', cursor: 'pointer', display: 'block' }} />
    </div>
  )
}
