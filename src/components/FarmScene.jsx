import { useEffect, useRef } from 'react'
import { frame, still } from './BattleScene'
import { MON_BY_ID, MAP_BY_ID } from '../lib/farmData'
import { itemName } from '../lib/farm'
import { sfx } from '../lib/sfx'

const W = 400, H = 180, GY = 168
const shadowCache = {}
/** dark purple aura around a sprite */
function shadowOf(im, key) {
  if (shadowCache[key]) return shadowCache[key]
  const c = document.createElement('canvas'); c.width = im.width + 6; c.height = im.height + 6
  const x = c.getContext('2d')
  x.filter = 'drop-shadow(0 0 3px rgba(124,58,237,1)) drop-shadow(0 0 2px rgba(30,0,60,1))'; x.drawImage(im, 3, 3); x.filter = 'none'
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(46,16,101,.35)'; x.fillRect(0, 0, c.width, c.height)
  return (shadowCache[key] = c)
}
const flashCache = {}
function flashOf(im, key) {
  if (flashCache[key]) return flashCache[key]
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillRect(0, 0, c.width, c.height)
  return (flashCache[key] = c)
}
/** row of each map backdrop (200×120) where feet stand: the sand, grass, cave floor… */
const MAP_GROUND = { meadow: 93, forest: 82, mine: 88, swamp: 95, desert: 95, snow: 112, volcano: 100, shadow: 102 }
/* ambient life on each map (PixelLab sprites am_*): [sprite, count, size, motion, layer] — drawn from time, no state */
const AMBIENT = {
  meadow: [['am_cloud', 2, 58, 'drift', 'back'], ['am_bird', 2, 23, 'fly', 'back'], ['am_butterfly', 3, 19, 'flutter', 'back'], ['am_bunny', 1, 23, 'hop', 'back']],
  forest: [['am_leaf', 7, 14, 'fall', 'front'], ['am_firefly', 5, 13, 'flutter', 'back'], ['am_bird', 1, 20, 'fly', 'back']],
  mine: [['am_glint', 6, 14, 'twinkle', 'back'], ['am_drop', 4, 12, 'drip', 'front'], ['am_bat', 2, 23, 'fly', 'back']],
  swamp: [['am_firefly', 7, 13, 'flutter', 'back'], ['am_bubble', 4, 14, 'rise', 'front'], ['am_dragonfly', 2, 23, 'fly', 'back']],
  desert: [['am_vulture', 2, 32, 'soar', 'back'], ['am_tumble', 1, 32, 'roll', 'back'], ['am_cloud', 1, 49, 'drift', 'back']],
  snow: [['am_snow', 14, 12, 'fall', 'front'], ['am_bird', 1, 20, 'fly', 'back']],
  volcano: [['am_ember', 10, 14, 'rise', 'front'], ['am_bat', 1, 23, 'fly', 'back']],
  shadow: [['am_wisp', 4, 23, 'flutter', 'back'], ['am_bat', 3, 23, 'fly', 'back'], ['am_glint', 3, 12, 'twinkle', 'back']],
}
const hsh = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }
function drawAmbient(g, mapId, layer, now) {
  for (const [sp, n, sz, mo, ly] of AMBIENT[mapId] || []) {
    if (ly !== layer) continue
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
      else if (mo === 'roll') { const p = ((t * 26 + r1 * 400) % (W + 60)) - 30; x = p; y = GY - sz + 2 - Math.abs(Math.sin(t * 4)) * 4; rot = t * 4 }
      else if (mo === 'hop') { x = 120 + r1 * 40 + Math.sin(t * 0.3) * 30; y = GY - 46 - Math.max(0, Math.sin(t * 2.4)) * 8; flip = Math.cos(t * 0.3) < 0; a = 0.9 }
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, a)); g.translate(Math.round(x + sz / 2), Math.round(y + sz / 2)); if (rot) g.rotate(rot); g.scale(flip ? -1 : 1, sy)
      g.drawImage(im, -sz / 2, -sz / 2, sz, sz); g.restore()
    }
  }
}
const MON_H = { normal: 64, elite: 80, boss: 100 }
const SLOT = { ranger: 0, mage: 1, healer: 2, knight: 3 } // the hero stands at the front, facing the monster

/**
 * Animated hunt: the party idles; each fight result plays out — one member steps in and attacks
 * (sword, staff light, fireball, arrow), the monster flashes and shakes, damage pops up,
 * then it falls and its drops float up (or it strikes back when the party loses).
 */
export default function FarmScene({ mapId, party = [], shadows = [], recent = [], live = false, hue = 0, idleMon, onMon }) {
  const cv = useRef(null)
  // fights already on record when the scene opens are not replayed as new; they feed the replay loop
  const S = useRef({ queue: [], cur: null, seen: recent.length ? recent[recent.length - 1].seq : -1, fx: [], monId: idleMon, idleSince: 0, rp: 0, bg: null })
  const P = useRef({}); P.current = { mapId, party, hue, shadows, recent, live, onMon }
  // new fight results join the queue (newest last)
  useEffect(() => {
    const s = S.current
    const fresh = recent.filter((e) => e.seq > s.seen)
    if (recent.length) s.seen = Math.max(s.seen, ...recent.map((e) => e.seq))
    if (fresh.length) s.queue.push(...fresh.slice(-6))
  }, [recent])
  useEffect(() => { if (!S.current.cur && !S.current.queue.length) S.current.monId = idleMon }, [idleMon])

  useEffect(() => {
    const g = cv.current.getContext('2d'); g.imageSmoothingEnabled = false
    let raf, last = performance.now(), alive = true
    const loop = (now) => {
      if (!alive) return
      const dt = Math.min(60, now - last); last = now
      draw(g, now, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(raf) }
  }, [])

  function draw(g, now, dt) {
    const s = S.current, { mapId, party, hue, shadows, recent, live } = P.current
    // nothing new and no stamina: replay the last fights (or train on a dummy) so the party never just stands there
    if (!s.cur && !s.queue.length) {
      if (!s.idleSince) s.idleSince = now
      else if (!live && now - s.idleSince > 1800) {
        s.queue.push(recent.length ? { ...recent[s.rp++ % recent.length], replay: true } : { mon: 'scarecrow', map: 'meadow', win: true, drops: {}, note: '', train: true })
        s.idleSince = 0
      }
    } else s.idleSince = 0
    // next fight from the queue; faster when several are waiting
    if (!s.cur && s.queue.length) {
      const e = s.queue.shift()
      const members = party.filter((p) => p.joined).map((p) => p.id)
      s.cur = { ...e, shadow: shadows.length && Math.random() < 0.35 ? Math.floor(Math.random() * shadows.length) : -1, t: 0, dur: s.queue.length > 2 ? 650 : 1100, who: members[Math.floor(Math.random() * members.length)] || 'knight', dmg: 0, hitDone: false }
      s.monId = e.mon; s.bg = e.map || s.bg
      P.current.onMon?.(e.mon)
    }
    const c = s.cur
    if (c) c.t += dt
    const k = c ? c.t / c.dur : 0 // 0..1 progress of this fight

    // background (map art, bottom-aligned), dimmed slightly at the edges
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H)
    const bgId = s.bg || mapId, bg = still(`map_${bgId}`)
    if (bg) { const top = GY - 2 * (MAP_GROUND[bgId] || 114); if (top > 0) g.drawImage(bg, 0, 0, 200, 1, 0, 0, 400, top + 2); g.drawImage(bg, 0, top, 400, 240) } else { g.fillStyle = '#bae6fd'; g.fillRect(0, 0, W, H) }

    drawAmbient(g, bgId, 'back', now)
    // shadow soldiers stand behind the party in a dark aura; one lunges in now and then
    shadows.forEach((id, i) => {
      const lunge = c && c.shadow === i && k > 0.2 && k < 0.6
      const x = 4 + i * 34 + (lunge ? Math.sin(((k - 0.2) / 0.4) * Math.PI) * 170 : 0), y = GY - 74
      const fi = lunge ? Math.floor(((k - 0.2) / 0.4) * 8.99) : Math.floor(now / 200 + i) % 6
      const im = frame(lunge ? `${id}_atk` : `${id}_idle`, fi, 'normal', 0)
      if (im) { g.globalAlpha = 0.75; g.drawImage(shadowOf(im, `${id}:${lunge ? 'a' : 'i'}:${fi}`), x - 3, y - 3, 62, 62); g.globalAlpha = 1 }
    })
    // party
    const members = party.filter((p) => p.joined).sort((a, b) => (SLOT[a.id] ?? 0) - (SLOT[b.id] ?? 0)) // back row first, the hero drawn last (in front)
    members.forEach((p, i) => {
      const slot = SLOT[p.id] ?? i
      let x = 18 + slot * 46, sheet = `${p.sprite}_idle`, f = Math.floor(now / 160 + i)
      if (c && c.who === p.id && k < 0.55) {
        const a = Math.min(1, k / 0.55)
        sheet = `${p.sprite}_atk`; f = Math.floor(a * 8.99)
        if (p.id === 'knight') x += Math.sin(a * Math.PI) * 150 // the hero dashes in
        else x += Math.sin(a * Math.PI) * 18
      }
      const im = frame(sheet, f, c && !c.win && k > 0.55 && k < 0.8 ? 'flash' : 'normal', p.id === 'knight' ? hue : 0)
      const h = p.id === 'knight' ? 64 : 56
      if (im) g.drawImage(im, Math.round(x), GY - h, h, h)
    })

    // projectiles for ranged members
    if (c && c.who !== 'knight' && k > 0.25 && k < 0.55) {
      const a = (k - 0.25) / 0.3, x0 = 40 + (SLOT[c.who] ?? 1) * 46, x1 = W - 70
      const x = x0 + (x1 - x0) * a, y = GY - 36 - Math.sin(a * Math.PI) * 18
      if (c.who === 'mage') { g.fillStyle = '#f97316'; g.fillRect(x - 5, y - 5, 10, 10); g.fillStyle = '#fde047'; g.fillRect(x - 2, y - 2, 5, 5) }
      else if (c.who === 'ranger') { g.fillStyle = '#78350f'; g.fillRect(x - 10, y, 14, 2); g.fillStyle = '#e2e8f0'; g.fillRect(x + 4, y - 1, 3, 4) }
      else { g.fillStyle = 'rgba(253,224,71,.8)'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill() }
    }

    // monster
    const mon = MON_BY_ID[s.monId] || MON_BY_ID[idleMon]
    if (mon) {
      const im = still(`mon_${mon.id}`)
      const h = MON_H[mon.kind] || 64
      let x = W - h - 14, y = GY - h + (Math.floor(now / 400) % 2), alpha = 1, mode = false
      if (!c && s.spawn && now - s.spawn < 450) { const a = (now - s.spawn) / 450; x += (1 - a) * 140; alpha = a }
      if (c) {
        if (k > 0.5 && k < 0.7) { x += Math.round(Math.sin(now / 25) * 4); mode = true } // hit shake + flash
        if (c.win && k > 0.75) alpha = Math.max(0, 1 - (k - 0.75) / 0.2) // falls
        if (!c.win && k > 0.55 && k < 0.8) x -= Math.sin(((k - 0.55) / 0.25) * Math.PI) * 120 // strikes back
      }
      if (im) { g.globalAlpha = alpha; g.drawImage(mode && Math.floor(now / 60) % 2 ? flashOf(im, mon.id) : im, x, y, h, h); g.globalAlpha = 1 }
      // hit: damage number + sparks + sound once
      if (c && !c.hitDone && k > 0.5) {
        c.hitDone = true
        const dmg = c.win ? 20 + Math.floor(Math.random() * 60) : 5 + Math.floor(Math.random() * 15)
        s.fx.push({ kind: 'num', text: c.note ? `${c.note}!` : `-${dmg}`, x: x + h / 2, y: y + 6, life: 900, color: c.win ? '#fde047' : '#e2e8f0' })
        for (let i = 0; i < 8; i++) s.fx.push({ kind: 'spark', x: x + h / 2, y: y + h / 2, vx: (Math.random() - 0.5) * 0.25, vy: -Math.random() * 0.25, life: 500 })
        if (!c.replay && !c.train) sfx('hit')
      }
      if (c && k >= 0.78 && !c.dropDone) {
        c.dropDone = true
        if (c.train) s.fx.push({ kind: 'num', text: 'ซ้อมดี!', x: W - 80, y: GY - 40, life: 1000, color: '#93c5fd' })
        else if (c.win) Object.entries(c.drops || {}).forEach(([key, v], i) => s.fx.push({ kind: 'num', text: `+${itemName(key)}${v > 1 ? ` ×${v}` : ''}`, x: W - 80, y: GY - 40 - i * 14, life: 1300, color: '#86efac' }))
        else s.fx.push({ kind: 'num', text: 'แพ้…', x: 120, y: GY - 70, life: 900, color: '#fca5a5' })
      }
    }

    drawAmbient(g, bgId, 'front', now)
    // effects
    s.fx = s.fx.filter((p) => (p.life -= dt) > 0)
    for (const p of s.fx) {
      if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = '#fde047'; g.fillRect(Math.round(p.x), Math.round(p.y), 3, 3) }
      else { p.y -= dt * 0.025; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#0f172a'; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.color; g.fillText(p.text, p.x, p.y); g.textAlign = 'left' }
    }
    if (c && c.t >= c.dur) { s.cur = null; if (c.win) s.spawn = now } // a fresh monster walks in
  }

  const map = MAP_BY_ID[mapId]
  return <canvas ref={cv} width={W} height={H} className="w-full block" style={{ imageRendering: 'pixelated', aspectRatio: `${W} / ${H}` }} aria-label={map?.name} data-testid="farm-scene" />
}
