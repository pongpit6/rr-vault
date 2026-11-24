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
const MON_H = { normal: 64, elite: 80, boss: 100 }
const SLOT = { knight: 0, healer: 1, mage: 2, ranger: 3 }

/**
 * Animated hunt: the party idles; each fight result plays out — one member steps in and attacks
 * (sword, staff light, fireball, arrow), the monster flashes and shakes, damage pops up,
 * then it falls and its drops float up (or it strikes back when the party loses).
 */
export default function FarmScene({ mapId, party = [], shadows = [], events = [], hue = 0, idleMon }) {
  const cv = useRef(null)
  const S = useRef({ queue: [], cur: null, seen: 0, fx: [], monId: idleMon })
  const P = useRef({}); P.current = { mapId, party, hue, shadows }
  // new fight results join the queue (newest last)
  useEffect(() => {
    const s = S.current
    const fresh = events.filter((e) => e.seq > s.seen)
    if (events.length) s.seen = Math.max(s.seen, ...events.map((e) => e.seq))
    if (fresh.length) s.queue.push(...fresh)
  }, [events])
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
    const s = S.current, { mapId, party, hue, shadows } = P.current
    // next fight from the queue; faster when several are waiting
    if (!s.cur && s.queue.length) {
      const e = s.queue.shift()
      const members = party.filter((p) => p.joined).map((p) => p.id)
      s.cur = { ...e, shadow: shadows.length && Math.random() < 0.35 ? Math.floor(Math.random() * shadows.length) : -1, t: 0, dur: s.queue.length > 2 ? 650 : 1100, who: members[Math.floor(Math.random() * members.length)] || 'knight', dmg: 0, hitDone: false }
      s.monId = e.mon
    }
    const c = s.cur
    if (c) c.t += dt
    const k = c ? c.t / c.dur : 0 // 0..1 progress of this fight

    // background (map art, bottom-aligned), dimmed slightly at the edges
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H)
    const bg = still(`map_${mapId}`)
    if (bg) { const top = GY - 2 * (MAP_GROUND[mapId] || 114); if (top > 0) g.drawImage(bg, 0, 0, 200, 1, 0, 0, 400, top + 2); g.drawImage(bg, 0, top, 400, 240) } else { g.fillStyle = '#bae6fd'; g.fillRect(0, 0, W, H) }

    // shadow soldiers stand behind the party in a dark aura; one lunges in now and then
    shadows.forEach((id, i) => {
      const lunge = c && c.shadow === i && k > 0.2 && k < 0.6
      const x = 4 + i * 34 + (lunge ? Math.sin(((k - 0.2) / 0.4) * Math.PI) * 170 : 0), y = GY - 74
      const fi = lunge ? Math.floor(((k - 0.2) / 0.4) * 8.99) : Math.floor(now / 200 + i) % 6
      const im = frame(lunge ? `${id}_atk` : `${id}_idle`, fi, 'normal', 0)
      if (im) { g.globalAlpha = 0.75; g.drawImage(shadowOf(im, `${id}:${lunge ? 'a' : 'i'}:${fi}`), x - 3, y - 3, 62, 62); g.globalAlpha = 1 }
    })
    // party
    const members = party.filter((p) => p.joined)
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
        sfx('hit')
      }
      if (c && k >= 0.78 && !c.dropDone) {
        c.dropDone = true
        if (c.win) Object.entries(c.drops || {}).forEach(([key, v], i) => s.fx.push({ kind: 'num', text: `+${itemName(key)}${v > 1 ? ` ×${v}` : ''}`, x: W - 80, y: GY - 40 - i * 14, life: 1300, color: '#86efac' }))
        else s.fx.push({ kind: 'num', text: 'แพ้…', x: 120, y: GY - 70, life: 900, color: '#fca5a5' })
      }
    }

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
