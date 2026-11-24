import { useEffect, useRef } from 'react'
import { frame, still } from './BattleScene'
import { MON_BY_ID, MAP_BY_ID } from '../lib/farmData'
import { itemName, TREE_BY_ID } from '../lib/farm'
import { popDmg, drawDmg, fmtDmg } from './dmgFx'
import { todOf, drawPhased } from '../lib/timeOfDay'
import { drawAmbientList } from './ambient'
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
/* ambient life on each map (PixelLab sprites am_*): [sprite, count, size, motion, layer, phases] — drawn from time, no state.
   phases: letters of the times of day it appears in (m morning, d day, e evening, n night); default all day */
const AMBIENT = {
  meadow: [['am_cloud', 2, 58, 'drift', 'back', 'mde'], ['am_mist', 3, 40, 'low', 'front', 'm'], ['am_bird', 2, 23, 'fly', 'back', 'md'], ['am_butterfly', 3, 19, 'flutter', 'back', 'md'], ['am_bee', 2, 14, 'flutter', 'back', 'd'], ['am_bunny', 1, 23, 'hop', 'back', 'mde'],
    ['am_crow', 2, 22, 'fly', 'back', 'e'], ['am_dragonfly', 1, 20, 'fly', 'back', 'e'], ['am_firefly', 8, 13, 'flutter', 'back', 'n'], ['am_moth', 2, 16, 'flutter', 'back', 'n'], ['am_owl', 1, 26, 'fly', 'back', 'n'], ['am_shoot', 1, 30, 'shoot', 'back', 'n']],
  forest: [['am_leaf', 7, 14, 'fall', 'front'], ['am_mist', 3, 44, 'low', 'front', 'm'], ['am_bird', 1, 20, 'fly', 'back', 'md'], ['am_squirrel', 1, 22, 'hop', 'back', 'md'], ['am_butterfly', 2, 17, 'flutter', 'back', 'd'],
    ['am_crow', 2, 22, 'fly', 'back', 'e'], ['am_firefly', 5, 13, 'flutter', 'back', 'en'], ['am_firefly', 4, 13, 'flutter', 'back', 'n'], ['am_mushglow', 4, 16, 'ground', 'back', 'n'], ['am_eyes', 2, 18, 'blink', 'back', 'n'], ['am_owl', 1, 26, 'fly', 'back', 'n']],
  mine: [['am_glint', 6, 14, 'twinkle', 'back'], ['am_drop', 4, 12, 'drip', 'front'], ['am_bat', 2, 23, 'fly', 'back', 'md'], ['am_bat', 5, 23, 'fly', 'back', 'en'], ['am_mushglow', 3, 15, 'ground', 'back', 'n']],
  swamp: [['am_mist', 4, 46, 'low', 'front', 'me'], ['am_heron', 1, 28, 'fly', 'back', 'm'], ['am_dragonfly', 2, 23, 'fly', 'back', 'md'], ['am_bubble', 4, 14, 'rise', 'front'], ['am_frog', 1, 20, 'hop', 'back', 'den'],
    ['am_firefly', 4, 13, 'flutter', 'back', 'e'], ['am_firefly', 9, 13, 'flutter', 'back', 'n'], ['am_moth', 2, 16, 'flutter', 'back', 'n'], ['am_eyes', 1, 18, 'blink', 'back', 'n']],
  desert: [['am_cloud', 1, 49, 'drift', 'back', 'md'], ['am_vulture', 2, 32, 'soar', 'back', 'md'], ['am_lizard', 1, 20, 'crawl', 'back', 'md'], ['am_tumble', 1, 32, 'roll', 'back', 'mde'],
    ['am_crow', 1, 22, 'fly', 'back', 'e'], ['am_scorpion', 1, 20, 'crawl', 'back', 'en'], ['am_moth', 1, 15, 'flutter', 'back', 'n'], ['am_shoot', 1, 30, 'shoot', 'back', 'n']],
  snow: [['am_snow', 14, 12, 'fall', 'front'], ['am_bird', 1, 20, 'fly', 'back', 'md'], ['am_snowfox', 1, 24, 'hop', 'back', 'den'], ['am_owl', 1, 26, 'fly', 'back', 'n'], ['am_shoot', 1, 30, 'shoot', 'back', 'n']],
  volcano: [['am_ember', 10, 14, 'rise', 'front'], ['am_ember', 6, 14, 'rise', 'front', 'en'], ['am_bat', 1, 23, 'fly', 'back', 'md'], ['am_crow', 2, 22, 'fly', 'back', 'e'], ['am_bat', 3, 23, 'fly', 'back', 'n']],
  shadow: [['am_wisp', 4, 23, 'flutter', 'back'], ['am_wisp', 3, 23, 'flutter', 'back', 'n'], ['am_bat', 3, 23, 'fly', 'back'], ['am_glint', 3, 12, 'twinkle', 'back'], ['am_eyes', 2, 18, 'blink', 'back', 'en']],
}
/** ambient creatures (shared with the boss scene in ./ambient.js) */
const drawAmbient = (g, mapId, layer, now, phase) => drawAmbientList(g, AMBIENT[mapId], layer, now, phase, { W, GY, still })
const MON_H = { normal: 64, elite: 80, boss: 100 }
/** which chance skill gets the cast animation when several fired in one fight */
const CAST_ORDER = ['meteor', 'revive', 'storm', 'hawk', 'bless']
/** a looping effect sheet frame (fx_*_anim) or a still */
const fxFrame = (name, i) => frame(`${name}_anim`, i) || still(name)
;['fx_slash', 'fx_hit', 'fx_arrow', 'fx_orb', 'fx_meteor', 'fx_aura', 'fx_star'].forEach(still)
/** steady skill per member (drawn as a faint aura when ranked) */
const STEADY = { knight: 'blade', mage: 'arcane', ranger: 'eye', healer: 'bless' }
/** RO-style skill banner over the caster: pops in, holds, fades */
function banner(g, text, x, y, a) {
  const sc = a < 0.15 ? 0.6 + (a / 0.15) * 0.5 : a < 0.25 ? 1.1 - ((a - 0.15) / 0.1) * 0.1 : 1
  g.save(); g.globalAlpha = a > 0.85 ? (1 - a) / 0.15 : 1; g.translate(Math.round(Math.max(60, Math.min(W - 60, x))), Math.round(y)); g.scale(sc, sc)
  g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'
  g.lineWidth = 4; g.strokeStyle = '#1e1b4b'; g.strokeText(text, 0, 0)
  const gr = g.createLinearGradient(0, -11, 0, 2); gr.addColorStop(0, '#fef9c3'); gr.addColorStop(1, '#f59e0b'); g.fillStyle = gr; g.fillText(text, 0, 0)
  g.restore()
}
const SLOT = { ranger: 0, mage: 1, healer: 2, knight: 3 } // the hero stands at the front, facing the monster

/**
 * Animated hunt: the party idles; each fight result plays out — one member steps in and attacks
 * (sword, staff light, fireball, arrow), the monster flashes and shakes, damage pops up,
 * then it falls and its drops float up (or it strikes back when the party loses).
 */
export default function FarmScene({ mapId, party = [], shadows = [], recent = [], live = false, hue = 0, idleMon, onMon, power = 50, skills = {} }) {
  const cv = useRef(null)
  // fights already on record when the scene opens are not replayed as new; they feed the replay loop
  const S = useRef({ dmg: [], queue: [], cur: null, seen: recent.length ? recent[recent.length - 1].seq : -1, fx: [], monId: idleMon, idleSince: 0, rp: 0, bg: null })
  const P = useRef({}); P.current = { mapId, party, hue, shadows, recent, live, onMon, power, skills }
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
      const cast = CAST_ORDER.find((id) => (e.skills || []).includes(id) && members.includes(TREE_BY_ID[id].member))
      s.cur = { ...e, shadow: shadows.length && Math.random() < 0.35 ? Math.floor(Math.random() * shadows.length) : -1, t: 0, dur: cast ? 2200 : s.queue.length > 2 ? 650 : 1100, who: cast ? TREE_BY_ID[cast].member : members[Math.floor(Math.random() * members.length)] || 'knight', cast, dmg: 0, hitDone: false }
      s.monId = e.mon; s.bg = e.map || s.bg
      P.current.onMon?.(e.mon)
    }
    const c = s.cur
    if (c) c.t += dt
    const k0 = c ? c.t / c.dur : 0 // 0..1 progress of this fight
    // a fight with a chance skill opens with a cast (circle + banner); the attack timeline then runs on k
    const CP = 0.3, k = c && c.cast ? Math.max(0, (k0 - CP) / (1 - CP)) : k0, casting = c && c.cast && k0 < CP
    const { power: pw, skills: sk } = P.current

    // background (map art, bottom-aligned), dimmed slightly at the edges
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H)
    const bgId = s.bg || mapId, tod = todOf()
    // backdrop for this time of day (morning / day / evening / night), cross-fading near the change
    const top = GY - 2 * (MAP_GROUND[bgId] || 114)
    if (!drawPhased(g, `map_${bgId}`, still, (im) => { if (top > 0) g.drawImage(im, 0, 0, 200, 1, 0, 0, 400, top + 2); g.drawImage(im, 0, top, 400, 240) }, tod)) { g.fillStyle = '#bae6fd'; g.fillRect(0, 0, W, H) }

    drawAmbient(g, bgId, 'back', now, tod.id)
    // shadow soldiers: a back row on the far ground between the party members (smaller, purple aura); one lunges in now and then
    shadows.forEach((id, i) => {
      const lunge = c && c.shadow === i && k > 0.2 && k < 0.6, SZ = 46
      const x0 = 40 + i * 46, mx0 = W - 120
      const a = lunge ? (k - 0.2) / 0.4 : 0
      const x = x0 + (lunge ? Math.sin(a * Math.PI) * (mx0 - x0) : 0), y = GY - 8 - SZ
      const fi = lunge ? Math.floor(a * 8.99) : Math.floor(now / 200 + i) % 6
      g.fillStyle = 'rgba(46,16,101,.35)'; g.beginPath(); g.ellipse(x + SZ / 2, GY - 9, SZ * 0.32, 3, 0, 0, 7); g.fill() // a dark pool under its feet
      const im = frame(lunge ? `${id}_atk` : `${id}_idle`, fi, 'normal', 0)
      if (im) { g.globalAlpha = lunge ? 0.9 : 0.72; g.drawImage(shadowOf(im, `${id}:${lunge ? 'a' : 'i'}:${fi}`), Math.round(x - 2), y - 2, SZ + 4, SZ + 4); g.globalAlpha = 1 }
      if (lunge && !c.shadowHit && a > 0.45) {
        c.shadowHit = true
        const sl = still('fx_slash'); if (sl) s.fx.push({ kind: 'img', im: sl, x: mx0 + 40, y: GY - 40, life: 260 })
        popDmg(s.dmg, fmtDmg((P.current.power || 50) * (0.3 + Math.random() * 0.2)), mx0 + 46, GY - 70, 'sky', 60)
      }
    })
    // party
    const members = party.filter((p) => p.joined).sort((a, b) => (SLOT[a.id] ?? 0) - (SLOT[b.id] ?? 0)) // back row first, the hero drawn last (in front)
    const pos = {}
    members.forEach((p, i) => {
      const slot = SLOT[p.id] ?? i
      let x = 18 + slot * 46, sheet = `${p.sprite}_idle`, f = Math.floor(now / 160 + i)
      const h = p.id === 'knight' ? 64 : 56
      pos[p.id] = { x: x + h / 2, top: GY - h }
      // steady skills: a faint aura under whoever has one ranked
      const steady = STEADY[p.id]
      if (steady && (sk || {})[steady] > 0) { const au = still('fx_aura'); if (au) { g.globalAlpha = 0.28 + 0.12 * Math.sin(now / 300 + i); g.drawImage(au, Math.round(x + h / 2 - 26), GY - 22, 52, 26); g.globalAlpha = 1 } }
      if (casting && c.who === p.id) {
        const ci = fxFrame('fx_circle', Math.floor(now / 70)); if (ci) { g.globalAlpha = Math.min(1, k0 / 0.08); g.drawImage(ci, Math.round(x + h / 2 - 32), GY - 22, 64, 32); g.globalAlpha = 1 }
        sheet = `${p.sprite}_atk`; f = Math.min(2, Math.floor(k0 / CP * 3)) // raises the weapon while casting
      } else if (c && c.who === p.id && k < 0.55) {
        const a = Math.min(1, k / 0.55)
        sheet = `${p.sprite}_atk`; f = Math.floor(a * 8.99)
        if (p.id === 'knight') x += Math.sin(a * Math.PI) * 150 // the hero dashes in
        else x += Math.sin(a * Math.PI) * 18
      }
      const im = frame(sheet, f, c && !c.win && k > 0.55 && k < 0.8 ? 'flash' : 'normal', p.id === 'knight' ? hue : 0)
      if (im) g.drawImage(im, Math.round(x), GY - h, h, h)
    })

    // the skill name over the caster while the circle glows
    if (casting && pos[c.who]) banner(g, `${TREE_BY_ID[c.cast].name}!!`, pos[c.who].x, pos[c.who].top - 6, k0 / CP)
    const mon0 = MON_BY_ID[s.monId] || MON_BY_ID[idleMon], mh = MON_H[mon0?.kind] || 64
    const mx = W - mh / 2 - 14, my = GY - mh / 2 // monster centre
    // normal attacks: PixelLab projectiles for ranged members
    if (c && !c.cast && c.who !== 'knight' && k > 0.25 && k < 0.55) {
      const a = (k - 0.25) / 0.3, x0 = 40 + (SLOT[c.who] ?? 1) * 46, x1 = W - 70
      const x = x0 + (x1 - x0) * a, y = GY - 36 - Math.sin(a * Math.PI) * 18
      const im = c.who === 'mage' ? fxFrame('fx_fireball', Math.floor(now / 70)) : c.who === 'ranger' ? still('fx_arrow') : still('fx_orb')
      if (im) g.drawImage(im, Math.round(x - 12), Math.round(y - 12), 24, 24)
    }
    if (c && !c.cast && c.who === 'knight' && k > 0.42 && k < 0.62) { const im = still('fx_slash'); if (im) { g.globalAlpha = 1 - (k - 0.42) / 0.2; g.drawImage(im, Math.round(mx - 30), Math.round(my - 30), 60, 60); g.globalAlpha = 1 } }
    // chance-skill effects
    if (c && c.cast && !casting) {
      const fi = (a, n = 7) => Math.min(n - 1, Math.floor(a * n))
      if (c.cast === 'storm' && k > 0.3 && k < 0.85) { const im = fxFrame('fx_whirl', Math.floor(now / 60)); if (im) g.drawImage(im, Math.round(mx - 40), Math.round(GY - 84), 80, 84) }
      if (c.cast === 'meteor') {
        if (k < 0.5) { const a = k / 0.5, im = still('fx_meteor'); if (im) g.drawImage(im, Math.round(mx + 90 * (1 - a) - 24), Math.round(-40 + (my + 40) * a - 24), 48, 48) }
        else if (k < 0.85) { const im = frame('fx_boom_anim', fi((k - 0.5) / 0.35)); if (im) g.drawImage(im, Math.round(mx - 48), Math.round(GY - 96), 96, 96) }
      }
      if (c.cast === 'hawk' && k < 0.75) { const a = k / 0.75, im = fxFrame('fx_hawk', Math.floor(now / 60)); const x = a < 0.6 ? -30 + (mx + 30) * (a / 0.6) : mx - (a - 0.6) / 0.4 * 200, y = a < 0.6 ? 30 + (my - 30) * (a / 0.6) : my - (a - 0.6) / 0.4 * 90; if (im) { g.save(); if (a >= 0.6) { g.translate(x, 0); g.scale(-1, 1); g.translate(-x, 0) } g.drawImage(im, Math.round(x - 20), Math.round(y - 20), 40, 40); g.restore() } }
      if (c.cast === 'revive' && k < 0.8) Object.values(pos).forEach((q) => { const im = frame('fx_pillar_anim', fi(k / 0.8)); if (im) { g.globalAlpha = 0.85; g.drawImage(im, Math.round(q.x - 20), GY - 110, 40, 110); g.globalAlpha = 1 } })
      if (c.cast === 'bless' && k < 0.9) Object.values(pos).forEach((q, i) => { const im = fxFrame('fx_halo', Math.floor(now / 80) + i); if (im) g.drawImage(im, Math.round(q.x - 18), Math.round(q.top - 14), 36, 36) })
      if ((c.cast === 'revive' || c.cast === 'bless') && !c.healDone && k > 0.2) { c.healDone = true; Object.values(pos).forEach((q, i) => popDmg(s.dmg, `+${fmtDmg(pw * 0.2 * (0.8 + Math.random() * 0.4))}`, q.x, q.top, 'heal', i * 80)) }
    }

    // monster
    const mon = MON_BY_ID[s.monId] || MON_BY_ID[idleMon]
    if (mon) {
      // PixelLab idle animation (8-frame strip) when it exists, else the still; a glowing night monster has its own art
      const g8 = Math.floor(now / 140) % 8, gl = c && c.glow
      const im = (gl && (frame(`mon_${mon.id}_glow_anim`, g8) || still(`mon_${mon.id}_glow`))) || frame(`mon_${mon.id}_anim`, g8) || still(`mon_${mon.id}`)
      const h = MON_H[mon.kind] || 64
      let x = W - h - 14, y = GY - h + (Math.floor(now / 400) % 2), alpha = 1, mode = false
      if (!c && s.spawn && now - s.spawn < 450) { const a = (now - s.spawn) / 450; x += (1 - a) * 140; alpha = a }
      if (c) {
        if (k > 0.5 && k < 0.7) { x += Math.round(Math.sin(now / 25) * 4); mode = true } // hit shake + flash
        if (c.win && k > 0.75) alpha = Math.max(0, 1 - (k - 0.75) / 0.2) // falls
        if (!c.win && k > 0.55 && k < 0.8) x -= Math.sin(((k - 0.55) / 0.25) * Math.PI) * 120 // strikes back
      }
      // a glowing night monster (✨ตัวเรืองแสง): golden aura and sparkles around it
      if (c && c.glow && alpha > 0.05) {
        const au = still('fx_aura'); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha * (0.55 + 0.25 * Math.sin(now / 160))
        if (au) g.drawImage(au, Math.round(x - 10), Math.round(y + h * 0.55), h + 20, h * 0.5)
        g.fillStyle = 'rgba(253,224,71,.18)'; g.beginPath(); g.ellipse(x + h / 2, y + h / 2, h * 0.62, h * 0.58, 0, 0, 7); g.fill(); g.restore()
        if (Math.random() < dt / 90) s.fx.push({ kind: 'spark', x: x + Math.random() * h, y: y + Math.random() * h, vx: 0, vy: -0.03, life: 600 })
        if (!c.glowSaid) { c.glowSaid = true; s.fx.push({ kind: 'num', text: '✨ตัวเรืองแสง!', x: x + h / 2, y: y - 10, life: 1500, color: '#fde047' }) }
      }
      if (im) { g.globalAlpha = alpha; g.drawImage(mode && Math.floor(now / 60) % 2 ? flashOf(im, `${mon.id}${gl ? '_g' : ''}:${g8}`) : im, x, y, h, h); g.globalAlpha = 1 }
      // hit: damage number + sparks + sound once
      if (c && !c.hitDone && k > 0.5) {
        c.hitDone = true
        // RO-style numbers: skills crit, the finishing blow on an elite or boss crits too
        const base = Math.max(8, (c.train ? 30 : pw) * (0.7 + Math.random() * 0.6)), big = c.cast === 'storm' || c.cast === 'meteor' || c.cast === 'hawk'
        const crit = !c.train && (big || (c.win && mon.kind !== 'normal' && Math.random() < 0.5))
        const cx = x + h / 2, cy = y + 4
        if (c.win || c.train) {
          popDmg(s.dmg, fmtDmg(base * (crit ? 2 : 1)), cx, cy, crit ? 'crit' : 'hit')
          if (c.cast === 'storm') popDmg(s.dmg, fmtDmg(base * 1.6), cx - 26, cy + 26, 'crit', 220) // the second slash
        } else {
          popDmg(s.dmg, fmtDmg(base * 0.4), cx, cy, 'hit')
          if (pos.knight) popDmg(s.dmg, fmtDmg(base * 0.6), pos.knight.x, pos.knight.top + 4, 'hurt', 260)
        }
        if (c.note && !c.cast) s.fx.push({ kind: 'num', text: `${c.note}!`, x: cx, y: y - 18, life: 1000, color: '#fde047' })
        { const im = still('fx_hit'); if (im) s.fx.push({ kind: 'img', im, x: cx, y: y + h / 2, life: 260 }) }
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

    // night: a soft moonlight tint over the fighters so they sit in the scene
    if (tod.id === 'night') { g.fillStyle = 'rgba(30,41,90,.16)'; g.fillRect(0, 0, W, H) } else if (tod.id === 'evening') { g.fillStyle = 'rgba(251,146,60,.07)'; g.fillRect(0, 0, W, H) }
    drawAmbient(g, bgId, 'front', now, tod.id)
    // effects
    s.fx = s.fx.filter((p) => (p.life -= dt) > 0)
    for (const p of s.fx) {
      if (p.kind === 'img') { const a = p.life / 260; g.globalAlpha = a; g.drawImage(p.im, Math.round(p.x - 22 - (1 - a) * 6), Math.round(p.y - 22 - (1 - a) * 6), 44 + (1 - a) * 12, 44 + (1 - a) * 12); g.globalAlpha = 1 }
      else if (p.kind === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; g.fillStyle = '#fde047'; g.fillRect(Math.round(p.x), Math.round(p.y), 3, 3) }
      else { p.y -= dt * 0.025; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.lineWidth = 3; g.strokeStyle = '#0f172a'; g.strokeText(p.text, p.x, p.y); g.fillStyle = p.color; g.fillText(p.text, p.x, p.y); g.textAlign = 'left' }
    }
    drawDmg(g, s.dmg, dt)
    if (c && c.t >= c.dur) { s.cur = null; if (c.win) s.spawn = now } // a fresh monster walks in
  }

  const map = MAP_BY_ID[mapId]
  return <canvas ref={cv} width={W} height={H} className="w-full block" style={{ imageRendering: 'pixelated', aspectRatio: `${W} / ${H}` }} aria-label={map?.name} data-testid="farm-scene" />
}
