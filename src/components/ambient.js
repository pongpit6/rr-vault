/* Ambient creatures drawn from time alone (no state): each entry is [sprite, count, size, motion, layer, phases].
   phases = letters of the times of day it shows in (m morning, d day, e evening, n night). Used by the hunt and boss scenes. */
const PH_LETTER = { morning: 'm', day: 'd', evening: 'e', night: 'n' }
/** true-to-life size in canvas px (a hero is ~60 px tall): insects tiny, small birds < crows < raptors, ground animals by body size.
    This overrides the size in each list; flyers in the back layer are drawn 15% smaller for depth. */
export const AM_SIZE = {
  am_drop: 6, am_bee: 7, am_firefly: 7, am_snow: 7, am_petal: 7, am_ember: 8, am_dandelion: 8, am_glint: 8, am_bubble: 8, am_chick: 8, am_leaf: 9, am_goldspark: 9,
  am_frog: 10, am_rat: 10, am_butterfly: 11, am_goldfly: 11, am_moth: 11, am_candle: 11, am_mushglow: 11, am_lizard: 12, am_scorpion: 12, am_eyes: 12,
  am_dragonfly: 13, am_bird: 13, am_squirrel: 13, am_pigeon: 14, am_dove: 14, am_duck: 14, am_wisp: 14, am_bat: 15, am_bunny: 15, am_chicken: 15,
  am_cat: 16, am_rooster: 16, am_crow: 17, am_owl: 18, am_ghost: 18, am_tumble: 18, am_snowfox: 20, am_heron: 24, am_sheep: 24, am_vulture: 26, am_shoot: 26, am_eagle: 28,
  am_mist: 44, am_cloud: 56,
}
const hsh = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }
export function drawAmbientList(g, list, layer, now, phase = 'day', { W, GY, still }) {
  const L = PH_LETTER[phase]
  for (const [sp, n, sz0, mo, ly, ph = 'mden'] of list || []) {
    if (ly !== layer || !ph.includes(L)) continue
    const sz = Math.round((AM_SIZE[sp] || sz0) * (ly === 'back' && (mo === 'fly' || mo === 'soar' || mo === 'flutter') ? 0.85 : 1))
    const im = still(sp); if (!im) continue
    for (let i = 0; i < n; i++) {
      const r1 = hsh(i, sp.length), r2 = hsh(i + 7, sp.length), t = now / 1000
      let x = 0, y = 0, a = 1, flip = false, sy = 1, rot = 0
      if (mo === 'drift') { x = ((t * 6 + r1 * W) % (W + 80)) - 60; y = 10 + r2 * 30 }
      else if (mo === 'fly') { const sp2 = 40 + r1 * 30, dir = r2 > 0.5 ? 1 : -1, p = ((t * sp2 + r1 * 900) % (W + 140)) - 70; x = dir > 0 ? p : W - p; flip = dir < 0; y = 18 + r2 * 45 + Math.sin(t * 3 + i) * 5; sy = 0.75 + Math.abs(Math.sin(t * 9 + i)) * 0.25 }
      else if (mo === 'soar') { x = W / 2 + Math.cos(t * 0.4 + i * 3) * (90 + r1 * 60); y = 22 + i * 12 + Math.sin(t * 0.8 + i) * 6; flip = Math.sin(t * 0.4 + i * 3) > 0 }
      else if (mo === 'flutter') { x = (r1 * W + Math.sin(t * 0.7 + i * 2) * 40 + W) % W; y = 40 + r2 * (GY - 70) + Math.sin(t * 1.6 + i) * 10; flip = Math.cos(t * 0.7 + i * 2) < 0; if (sp === 'am_firefly' || sp === 'am_wisp') a = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7); else sy = 0.6 + Math.abs(Math.sin(t * 10 + i)) * 0.4 }
      else if (mo === 'fall') { const per = 5 + r1 * 4, k = ((t + r2 * per) % per) / per; x = (r1 * W + Math.sin(t * 1.5 + i) * 14 + k * 30) % W; y = -10 + k * (GY + 10); rot = Math.sin(t * 2 + i) * 0.6; a = k > 0.9 ? (1 - k) * 10 : 1 }
      else if (mo === 'rise') { const per = 3 + r1 * 3, k = ((t + r2 * per) % per) / per; x = r1 * W + Math.sin(t * 2 + i) * 6; y = GY - 6 - k * (sp === 'am_bubble' ? 40 : 120); a = 1 - k }
      else if (mo === 'twinkle') { x = 20 + r1 * (W - 40); y = 20 + r2 * (GY - 60); a = Math.max(0, Math.sin(t * 2.2 + i * 2.3)); if (a < 0.05) continue }
      else if (mo === 'drip') { const per = 2.5 + r1 * 2, k = ((t + r2 * per) % per) / per; x = 30 + r1 * (W - 60); y = 4 + k * k * (GY - 4); a = k > 0.92 ? (1 - k) * 12 : 1 }
      else if (mo === 'roll') { const p = ((t * 26 + r1 * 400) % (W + 60)) - 30; x = p; y = GY - sz - 6 - Math.abs(Math.sin(t * 4)) * 4; rot = t * 4 }
      else if (mo === 'hop') { x = 120 + r1 * 40 + Math.sin(t * 0.3 + r2 * 6) * 30; y = GY - sz - 10 - Math.max(0, Math.sin(t * 2.4 + i)) * 6; flip = Math.cos(t * 0.3 + r2 * 6) < 0; a = 0.9 }
      else if (mo === 'low') { x = ((t * 4 + r1 * W) % (W + 80)) - 60; y = GY - 30 - r2 * 16; a = 0.35 + 0.15 * Math.sin(t * 0.5 + i) }
      else if (mo === 'crawl') { const p = ((t * 9 + r1 * 300) % (W + 60)) - 30, dir = r2 > 0.5; x = dir ? p : W - p; flip = !dir; y = GY - sz - 10 }
      else if (mo === 'ground') { x = 14 + r1 * (W - 160); y = GY - sz - 8 - r2 * 6; a = 0.6 + 0.4 * Math.sin(t * 1.5 + i * 2) }
      else if (mo === 'blink') { x = 10 + r1 * (W - 170); y = GY - 70 - r2 * 30; const k = (t * 0.25 + r2 * 3) % 3; a = k < 1.6 ? (Math.sin(t * 7) > -0.95 ? 1 : 0) : 0; if (a < 0.05) continue }
      else if (mo === 'shoot') { const per = 9 + r1 * 6, k = ((t + r2 * per) % per) / 1.1; if (k > 1) continue; x = W * (0.25 + r1 * 0.5) + k * 120; y = 6 + k * 38; a = 1 - k; rot = 0 }
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, a)); g.translate(Math.round(x + sz / 2), Math.round(y + sz / 2)); if (rot) g.rotate(rot); g.scale(flip ? -1 : 1, sy)
      g.drawImage(im, -sz / 2, -sz / 2, sz, sz); g.restore()
    }
  }
}
