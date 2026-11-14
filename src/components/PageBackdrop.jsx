import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { frame, drawStill, drawRealm, skyFor, mix, GROUND } from './BattleScene'

/**
 * A faded, slowly animated pixel scene behind each page (not on the Vault page, which has the real battle).
 * home = your village (real realm + time of day), txns = market, money = treasury, portfolio = mage tower,
 * settings = forge. Runs at ~8 fps and stops when the app is hidden.
 */
const W = 400, H = 240, GY = 196 // canvas px; background shapes are drawn at 2× (half-res space 200×120, ground at 96)

function sky(g, top, bottom, h = 98) {
  for (let i = 0; i < 12; i++) { g.fillStyle = mix(top, bottom, i / 11); g.fillRect(0, Math.floor((i * h) / 12), 200, Math.ceil(h / 12) + 1) }
}
function hills(g, c1, c2) {
  g.fillStyle = c1
  for (let x = 0; x < 200; x++) { const y = 88 - Math.round(6 + 4 * Math.sin(x / 17) + 3 * Math.sin(x / 7.3)); g.fillRect(x, y, 1, 98 - y) }
  g.fillStyle = c2
  for (let x = 0; x < 200; x++) { const y = 96 - Math.round(3 + 3 * Math.sin(x / 11 + 2)); g.fillRect(x, y, 1, 98 - y) }
}
function ground(g, gr) {
  g.fillStyle = gr.grass; g.fillRect(0, 96, 200, 2)
  g.fillStyle = gr.blade; for (let x = 0; x < 200; x += 6) g.fillRect(x, 98, 3, 1)
  g.fillStyle = gr.dirt; g.fillRect(0, 99, 200, 30)
  g.fillStyle = gr.speck
  if (gr.cobble) { for (let y = 101, r = 0; y < 120; y += 4, r++) for (let x = (r % 2) * 4; x < 200; x += 8) g.fillRect(x, y, 6, 1) }
  else for (let x = 2; x < 200; x += 9) g.fillRect(x, 102 + (x % 3), 2, 1)
}
function stars(g, now, n = 26, hmax = 60) {
  for (let i = 0; i < n; i++) {
    const x = (i * 73) % 200, y = (i * 37) % hmax
    if (Math.sin(now / 500 + i) > -0.2) { g.fillStyle = '#e0f2fe'; g.fillRect(x, y, 1, 1) }
  }
}
const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h) }
const bob = (now, k) => (Math.sin(now / 380 + k) > 0 ? 0 : 1)

const SCENES = {
  home(g, now, o) {
    const night = o.dark || skyFor(new Date().getHours()).night > 0.2
    const s = night ? skyFor(22) : skyFor(new Date().getHours())
    sky(g, s.top, s.bottom)
    if (night) { stars(g, now); R(g, '#fef9c3', 160, 10, 7, 7) } else { R(g, '#fde047', 150, 12, 8, 8) }
    const GR = GROUND[o.tier] || GROUND[1]
    hills(g, ...(GR.hill || s.hill))
    drawRealm(g, o.tier, 98, night ? 0.3 : 0, now, {})
    ground(g, GR)
    return () => {
      // party resting in the village (full-res)
      const ids = ['ranger', 'mage', 'healer'].filter((id) => o.party.includes(id))
      ids.forEach((id, i) => { const im = frame(`${id}_idle`, 0); if (im) g.drawImage(im, 96 + i * 34, GY - 52 + bob(now, i), 52, 52) })
      const h = frame('hero_idle', 0, 'normal', o.hue); if (h) g.drawImage(h, 96 + ids.length * 34, GY - 62 + bob(now, 5))
      drawStill(g, o.pet, 80 + ids.length * 34, GY + 6 - (Math.floor(now / 400) % 2), 22)
    }
  },
  txns(g, now) {
    const s = skyFor(12)
    sky(g, s.top, s.bottom); hills(g, ...s.hill)
    const house = (x, roof) => { R(g, '#f8fafc', x, 82, 9, 6); g.fillStyle = roof; for (let i = 0; i < 5; i++) g.fillRect(x - 1 + i, 81 - i, 11 - 2 * i, 1); R(g, '#38bdf8', x + 2, 84, 2, 2); R(g, '#92400e', x + 6, 85, 2, 3) }
    const stall = (x, c1) => { R(g, '#92400e', x, 82, 1, 6); R(g, '#92400e', x + 12, 82, 1, 6); R(g, '#92400e', x, 86, 13, 2); for (let i = 0; i < 13; i++) R(g, i % 2 ? c1 : '#ffffff', x + i, 79, 1, 3); R(g, '#fbbf24', x + 3, 85, 2, 1); R(g, '#ef4444', x + 7, 85, 2, 1) }
    house(8, '#f87171'); house(24, '#60a5fa'); stall(58, '#ef4444'); stall(82, '#3b82f6'); stall(106, '#f59e0b'); house(160, '#f87171'); house(176, '#60a5fa')
    R(g, '#334155', 50, 78, 1, 10); R(g, '#fef9c3', 49, 76, 3, 2); R(g, '#334155', 134, 78, 1, 10); R(g, '#fef9c3', 133, 76, 3, 2)
    ground(g, GROUND[2])
    return () => {
      // the ranger patrols the market, the merchant and farmer stroll
      const x = 150 + Math.sin(now / 2600) * 90
      const im = frame('ranger_idle', 0)
      if (im) { g.save(); if (Math.cos(now / 2600) < 0) { g.translate(x + 52, 0); g.scale(-1, 1); g.drawImage(im, 0, GY - 52 + bob(now, 1), 52, 52) } else g.drawImage(im, x, GY - 52 + bob(now, 1), 52, 52); g.restore() }
      drawStill(g, 'npc_merchant', 290, GY, 34, true)
      drawStill(g, 'npc_farmer', 340 + Math.sin(now / 1800) * 10, GY, 34)
    }
  },
  money(g, now) {
    R(g, '#334155', 0, 0, 200, 98)
    for (let r = 0, y = 0; y < 98; y += 6, r++) for (let x = -(r % 2) * 6; x < 200; x += 12) { R(g, '#1e293b', x, y, 12, 6); R(g, (x / 12 + r) % 3 ? '#475569' : '#3f4b5f', x + 1, y + 1, 10, 4) }
    const cx = 100, cy = 56
    for (const [rr, c] of [[26, '#94a3b8'], [22, '#64748b'], [18, '#cbd5e1'], [4, '#475569']]) { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill() }
    g.strokeStyle = '#475569'; g.lineWidth = 1
    const rot = now / 4000
    for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 16 * Math.cos(rot + a * Math.PI / 4), cy + 16 * Math.sin(rot + a * Math.PI / 4)); g.stroke() }
    for (const x of [30, 170]) { R(g, '#78350f', x, 40, 2, 8); const f = Math.floor(now / 150) % 2; R(g, '#f97316', x - 1, 36 - f, 4, 4 + f); R(g, '#fde047', x, 37, 2, 2) }
    for (const [x0, w, h] of [[40, 16, 7], [60, 10, 4], [140, 18, 8], [160, 10, 5]]) for (let i = 0; i < h; i++) R(g, i % 2 ? '#f59e0b' : '#fbbf24', x0 + i, 95 - i, Math.max(1, w - 2 * i), 1)
    R(g, '#1e293b', 0, 98, 200, 30); for (let x = 0; x < 200; x += 10) R(g, '#334155', x, 100, 8, 30)
    return () => {
      drawStill(g, 'chest_closed', 40, GY + 6, 30)
      drawStill(g, 'chest_open', 300, GY + 6, 30)
      const im = frame('healer_idle', 0); if (im) g.drawImage(im, 236, GY - 64 + bob(now, 2))
      if (Math.sin(now / 300) > 0.7) R(g, '#fef08a', 320 + (now / 50) % 20, GY - 30, 3, 3)
    }
  },
  portfolio(g, now) {
    sky(g, '#0b1736', '#312e81'); stars(g, now, 40, 80)
    const pts = [[20, 60], [40, 52], [55, 56], [75, 40], [95, 44], [115, 28], [135, 32], [160, 14]]
    g.strokeStyle = '#7dd3fc'; g.lineWidth = 1; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
    pts.forEach(([x, y], i) => R(g, Math.sin(now / 400 + i) > 0 ? '#fde047' : '#fef9c3', x - 1, y - 1, 3, 3))
    hills(g, '#1e3a8a', '#1e40af')
    R(g, '#64748b', 150, 40, 16, 58); for (let x = 150; x < 166; x += 3) R(g, '#475569', x, 37, 2, 3)
    for (let i = 0; i < 10; i++) R(g, '#7c3aed', 148 + i, 36 - i, Math.max(1, 20 - 2 * i), 1)
    const glow = Math.sin(now / 500) > 0 ? '#fde047' : '#fbbf24'; R(g, glow, 156, 52, 4, 5); R(g, glow, 156, 70, 4, 5)
    ground(g, { grass: '#166534', blade: '#14532d', dirt: '#1e293b', speck: '#0f172a' })
    return () => {
      const f = Math.floor(now / 140) % 7
      const im = frame('mage_atk', f); if (im) g.drawImage(im, 90, GY - 64)
      for (let i = 0; i < 4; i++) { const t = ((now / 900 + i / 4) % 1); R(g, '#bae6fd', 160 + t * 120, GY - 40 - t * 60 - i * 6, 3, 3) }
    }
  },
  market(g, now) {
    // trading bazaar at dusk: a big price board with live-ish candles, a fuel pump and the merchant
    const s = skyFor(18)
    sky(g, s.top, s.bottom); hills(g, ...s.hill)
    R(g, '#1e293b', 46, 18, 108, 62); R(g, '#0f172a', 49, 21, 102, 56)
    R(g, '#78350f', 56, 80, 3, 16); R(g, '#78350f', 141, 80, 3, 16)
    const n = 16, base = Math.floor(now / 900)
    let y = 50
    for (let i = 0; i < n; i++) {
      const k = base + i
      const d = Math.sin(k * 1.7) * 5 + Math.sin(k * 0.37) * 3
      const o = y, c = Math.max(26, Math.min(72, y - d))
      const hi = Math.min(o, c) - 2 - (k % 3), lo = Math.max(o, c) + 2 + (k % 2)
      const col = c <= o ? '#34d399' : '#fb7185'
      R(g, col, 52 + i * 6 + 2, hi, 1, lo - hi)
      R(g, col, 52 + i * 6, Math.min(o, c), 5, Math.max(1, Math.abs(c - o)))
      y = c
    }
    for (let x = 52; x < 150; x += 4) R(g, '#334155', x, 70, 2, 1)
    const blink = Math.sin(now / 300) > 0
    R(g, blink ? '#34d399' : '#065f46', 140, 24, 6, 3)
    // fuel pump
    R(g, '#dc2626', 170, 70, 12, 26); R(g, '#fef9c3', 172, 73, 8, 6); R(g, '#111827', 174, 84, 4, 8); R(g, '#475569', 182, 76, 3, 2); R(g, '#475569', 184, 76, 1, 14)
    R(g, (Math.floor(now / 250) % 3) ? '#16a34a' : '#22c55e', 173, 75, 2, 1)
    // awning stall
    for (let i = 0; i < 26; i++) R(g, i % 2 ? '#f59e0b' : '#fff7ed', 8 + i, 74, 1, 4)
    R(g, '#92400e', 8, 78, 1, 18); R(g, '#92400e', 33, 78, 1, 18); R(g, '#92400e', 8, 88, 26, 2)
    R(g, '#fbbf24', 12, 86, 3, 2); R(g, '#a3e635', 18, 86, 3, 2); R(g, '#ef4444', 24, 86, 3, 2)
    ground(g, { ...GROUND[2], cobble: true })
    return () => {
      drawStill(g, 'npc_merchant', 30, GY, 34)
      const x = 210 + Math.sin(now / 2400) * 40
      const im = frame('hero_idle', 0)
      if (im) { g.save(); if (Math.cos(now / 2400) < 0) { g.translate(x + 48, 0); g.scale(-1, 1); g.drawImage(im, 0, GY - 62 + bob(now, 3)) } else g.drawImage(im, x, GY - 62 + bob(now, 3)); g.restore() }
      if (Math.sin(now / 260) > 0.6) R(g, '#fde047', 120 + (now / 40) % 30, 40, 3, 3)
    }
  },
  settings(g, now) {
    const s = skyFor(18)
    sky(g, s.top, s.bottom); hills(g, ...s.hill)
    R(g, '#78350f', 110, 62, 70, 34); for (let i = 0; i < 10; i++) R(g, '#7f1d1d', 106 + i, 60 - i, 78 - 2 * i, 1)
    const fl = Math.floor(now / 160) % 2
    R(g, '#f97316', 122, 74, 16, 14); R(g, fl ? '#fde047' : '#fbbf24', 126, 78 - fl, 8, 8)
    R(g, '#57534e', 150, 68, 4, 10)
    for (let x = 158; x < 176; x += 4) { R(g, '#cbd5e1', x, 70, 1, 14); R(g, '#92400e', x - 1, 82, 3, 2) }
    R(g, '#334155', 60, 88, 18, 4); R(g, '#334155', 65, 92, 8, 4)
    ground(g, GROUND[1])
    return () => {
      const f = Math.floor(now / 110) % 9
      const im = frame('hero_atk', f); if (im) g.drawImage(im, 70, GY - 60)
      if (f === 5) for (let i = 0; i < 3; i++) R(g, '#fde047', 150 + i * 6, GY - 28 - i * 4, 3, 3)
    }
  },
}

export default function PageBackdrop({ tab, tier = 1, party = [], pet = 'pet_fox', hue = 0 }) {
  const ref = useRef(null)
  const theme = useStore((s) => s.ui.theme) || 'pixel'
  const off = useStore((s) => s.ui.backdropOff)
  const O = useRef({})
  O.current = { tier, party, pet, hue, dark: theme === 'pixel-night' }
  const scene = SCENES[tab]
  const show = scene && !off && theme !== 'minimal'
  useEffect(() => {
    if (!show) return
    const cv = ref.current, g = cv.getContext('2d')
    g.imageSmoothingEnabled = false
    let timer, alive = true
    const draw = () => {
      if (!alive) return
      if (document.visibilityState === 'visible') {
        const now = performance.now()
        g.setTransform(2, 0, 0, 2, 0, 0)
        const fg = scene(g, now, O.current)
        g.setTransform(1, 0, 0, 1, 0, 0)
        fg?.()
      }
      timer = setTimeout(draw, 125)
    }
    draw()
    return () => { alive = false; clearTimeout(timer) }
  }, [show, tab]) // eslint-disable-line
  if (!show) return null
  return <div className="page-backdrop" aria-hidden="true"><canvas ref={ref} width={W} height={H} /></div>
}

/** Reads just what the backdrop needs (realm, party, pet, outfit) without running the whole RPG. */
export function BackdropHost({ tab }) {
  const net = useStore((s) => s.ui._netCache)
  const data = useStore((s) => s.items.rpg?.data) || {}
  const party = Object.keys(data.joined || {})
  const pet = (data.owned || {})[data.equip?.pet] ? data.equip.pet : 'pet_fox'
  const hue = (data.owned || {})[data.equip?.skin] ? ({ skin_royal: 120, skin_flame: 200 }[data.equip.skin] || 0) : 0
  const tier = data.tier ?? (net == null ? 1 : net < 0 ? 0 : net < 10000 ? 1 : net < 100000 ? 2 : net < 1000000 ? 3 : 4)
  return <PageBackdrop tab={tab} tier={tier} party={party} pet={pet} hue={hue} />
}
