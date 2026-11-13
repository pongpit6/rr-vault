import { useEffect, useMemo, useRef, useState } from 'react'
import { SHEETS } from '../lib/spriteSheets'
import { money } from '../lib/format'
import { useStore } from '../store'
import { ACHIEVEMENTS } from '../lib/rpg'

/* ---------------- sprite sheets (PixelLab art) ---------------- */
const imgs = {}
function sheet(name) {
  if (!imgs[name]) { const im = new Image(); im.src = `./sprites/${name}.png`; imgs[name] = im }
  return imgs[name]
}
Object.keys(SHEETS).forEach(sheet) // preload
const tintCache = {}
/** Frame `i` of an animation (index into its seq), optionally tinted white (hit) or green (regen). */
function frame(name, i, mode = 'normal') {
  const sp = SHEETS[name], im = sheet(name)
  if (!im.complete || !im.naturalWidth) return null
  const f = sp.seq[((i % sp.seq.length) + sp.seq.length) % sp.seq.length]
  const key = `${name}:${f}:${mode}`
  if (tintCache[key]) return tintCache[key]
  const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false
  g.drawImage(im, f * sp.w, 0, sp.w, sp.h, 0, 0, sp.w, sp.h)
  if (mode !== 'normal') {
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = mode === 'flash' ? 'rgba(255,255,255,.9)' : 'rgba(74,222,128,.55)'
    g.fillRect(0, 0, sp.w, sp.h)
  }
  tintCache[key] = c
  return c
}

/* ---------------- sky by real local time ---------------- */
function skyFor(h) {
  if (h >= 19 || h < 5) return { top: '#0b1736', bottom: '#27407a', night: 0.3, hill: ['#1e5b4b', '#164e3f'] }
  if (h < 7) return { top: '#fbcfe8', bottom: '#fde68a', night: 0.06, hill: ['#6ee7b7', '#34d399'] }
  if (h < 17) return { top: '#7dd3fc', bottom: '#e0f2fe', night: 0, hill: ['#86efac', '#4ade80'] }
  return { top: '#fdba74', bottom: '#c4b5fd', night: 0.1, hill: ['#6ee7b7', '#2fbf8a'] }
}
const mix = (a, b, t) => {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const A = p(a), B = p(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}

/** Background structures drawn in half-resolution space (200 wide) — they grow with the realm tier. */
function drawStructures(g, tier, gy, night) {
  const dark = night > 0.2
  const wall = dark ? '#475569' : '#f8fafc', roof = dark ? '#7f1d1d' : '#f87171', win = dark ? '#fde047' : '#38bdf8'
  const house = (x) => {
    const y = gy - 16
    g.fillStyle = wall; g.fillRect(x, y, 9, 6)
    g.fillStyle = roof; for (let i = 0; i < 5; i++) g.fillRect(x - 1 + i, y - 1 - i, 11 - 2 * i, 1)
    g.fillStyle = win; g.fillRect(x + 2, y + 2, 2, 2)
  }
  const tower = (x, h, flag) => {
    const y = gy - 10 - h
    g.fillStyle = dark ? '#64748b' : '#e2e8f0'; g.fillRect(x, y, 7, h)
    g.fillStyle = dark ? '#475569' : '#cbd5e1'; for (let i = 0; i < 7; i += 2) g.fillRect(x + i, y - 2, 1, 2)
    g.fillStyle = win; g.fillRect(x + 3, y + 4, 1, 2)
    if (flag) { g.fillStyle = '#334155'; g.fillRect(x + 3, y - 8, 1, 6); g.fillStyle = flag; g.fillRect(x + 4, y - 8, 4, 3) }
  }
  if (tier === 0) {
    g.fillStyle = dark ? '#334155' : '#64748b'
    ;[[22, 10], [150, 13], [176, 8]].forEach(([x, h]) => { g.fillRect(x, gy - 10 - h, 1, h); g.fillRect(x - 2, gy - 6 - h, 2, 1); g.fillRect(x + 1, gy - 4 - h, 3, 1) })
  }
  if (tier >= 1) house(150)
  if (tier >= 2) { house(18); house(170) }
  if (tier >= 3) { tower(100, 18, '#10b981'); tower(118, 24, '#0ea5e9'); g.fillStyle = dark ? '#64748b' : '#e2e8f0'; g.fillRect(105, gy - 22, 15, 12) }
  if (tier >= 4) { tower(84, 14, '#fbbf24'); tower(134, 14, '#fbbf24') }
}

/* ---------------- component ---------------- */
export default function BattleScene({ bosses, events = [], onConsumed, tier = 1, fog = 0, big = false, level = 1, hud = true }) {
  const W = 400, H = big ? 220 : 176
  const canvasRef = useRef(null)
  const privacy = useStore((s) => s.ui.privacy)
  const [floats, setFloats] = useState([])
  const [banner, setBanner] = useState(null)
  const [, force] = useState(0)

  const alive = useMemo(() => bosses.filter((b) => b.active).sort((a, b) => b.hp - a.hp), [bosses])
  const S = useRef({ queue: [], fx: [], hpShown: {}, focus: null, focusUntil: 0, cycleStart: 0, cycle: 0, current: null, dying: 0, heal: 0, shake: 0, flash: 0, heroFlash: 0, levelGlow: 0 })
  const P = useRef({})
  P.current = { bosses, alive, tier, fog, privacy }

  // ingest real events: rewind displayed HP to the pre-event value, then replay them as attacks
  useEffect(() => {
    const s = S.current
    if (events.length) {
      const delta = {}
      for (const e of events) if (e.boss) delta[e.boss] = (delta[e.boss] || 0) + (e.type === 'hit' ? e.amount : -e.amount)
      for (const b of bosses) if (delta[b.id] !== undefined) s.hpShown[b.id] = Math.max(0, b.hp + delta[b.id])
      s.queue.push(...events)
      onConsumed?.()
    }
    for (const b of bosses) if (!s.queue.some((e) => e.boss === b.id && !e._done)) s.hpShown[b.id] = b.hp
  }, [events, bosses]) // eslint-disable-line

  const addFloat = (text, x, y, cls) => {
    const id = Math.random()
    setFloats((f) => [...f.slice(-5), { id, text, x, y, cls }])
    setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1600)
  }
  const showBanner = (b, ms = 2400) => { setBanner(b); setTimeout(() => setBanner(null), ms) }

  useEffect(() => {
    const cv = canvasRef.current
    const g = cv.getContext('2d')
    g.imageSmoothingEnabled = false
    let raf, last = performance.now()
    const s = S.current
    s.cycleStart = last
    const BW = W / 2, BH = H / 2 // background works at half resolution for chunky pixels
    const clouds = [[10, 10, 14], [80, 18, 10], [140, 8, 16]]
    const stars = Array.from({ length: 26 }, () => [Math.random() * BW, Math.random() * (BH * 0.45), Math.random() * 6])
    const gy = H - 30 // feet line (full res)
    const heroBaseX = 70

    const pickEnemy = (now) => {
      const ev = s.queue[0]
      if (ev && ev.boss) { s.focus = ev.boss; s.focusUntil = now + 4500 }
      if (s.focus && now < s.focusUntil) { const b = P.current.bosses.find((x) => x.id === s.focus); if (b) return b }
      return P.current.alive[0] || null
    }

    const loop = (now) => {
      const { tier, fog, privacy } = P.current
      const dt = Math.min(50, now - last); last = now
      const hour = new Date().getHours()
      const sky = skyFor(hour)
      const enemy = s.dying > 0 ? s.current : pickEnemy(now)
      if (!s.dying) s.current = enemy
      const kind = enemy ? enemy.sprite : 'slime'
      const sp = SHEETS[`${kind}_idle`]
      const ex0 = W - 70 - sp.w / 2

      // ---- timeline ----
      const CYCLE = 2800
      let t = now - s.cycleStart
      if (t > CYCLE) {
        s.cycleStart = now; t = 0; s.cycle++
        if (s.queue[0]?._done) s.queue.shift()
      }
      const ev = s.queue[0]
      const heroTurn = !ev || ev.type === 'hit'
      const enemyTurn = !ev && kind !== 'slime' && s.cycle % 3 === 2
      const attacking = heroTurn && !enemyTurn

      let hx = heroBaseX, heroAnim = 'hero_idle', heroF = 0
      const target = ex0 - 46
      if (attacking) {
        if (t > 500 && t < 760) hx = heroBaseX + (target - heroBaseX) * ((t - 500) / 260)
        else if (t >= 760 && t < 1300) { hx = target; heroAnim = 'hero_atk'; heroF = Math.min(8, Math.floor((t - 760) / 60)) }
        else if (t >= 1300 && t < 1650) hx = target - (target - heroBaseX) * ((t - 1300) / 350)
      }
      const bob = attacking && t > 500 && t < 1650 ? 0 : (Math.sin(now / 300) > 0 ? 0 : 1)

      let ex = ex0, enemyAnim = `${kind}_idle`, enemyF = Math.floor(now / (kind === 'slime' ? 140 : 170))
      if (enemyTurn && t > 1700 && t < 2400) {
        enemyAnim = `${kind}_atk`; enemyF = Math.min(6, Math.floor((t - 1700) / 100))
        ex = ex0 - 18 * Math.sin(((t - 1700) / 700) * Math.PI)
      }

      const fire = (key, at) => { if (t >= at && s[key] !== s.cycle) { s[key] = s.cycle; return true } return false }
      const ecx = ex0 + sp.w / 2, etop = gy - sp.h
      if (attacking && fire('_hit', 1060)) {
        if (ev && ev.type === 'hit') {
          s.flash = 320; s.shake = 10
          s.hpShown[ev.boss] = Math.max(0, (s.hpShown[ev.boss] ?? 0) - ev.amount)
          addFloat(privacy ? 'CRITICAL!' : `-${money(ev.amount, { decimals: false })}`, ecx, etop + 18, 'crit')
          for (let i = 0; i < 26; i++) s.fx.push({ x: ecx - 10, y: gy - sp.h / 2, vx: Math.random() * 4 - 1, vy: -Math.random() * 3.5, life: 700, c: i % 2 ? '#fbbf24' : '#ffffff', z: 2 })
          if (ev.kill) { s.dying = 1500; showBanner({ text: 'DEFEATED!', sub: `ปราบ${enemy?.name || 'บอส'}สำเร็จ`, cls: 'gold' }, 2800) }
          ev._done = true
        } else {
          s.flash = 140; s.shake = 3
          for (let i = 0; i < 8; i++) s.fx.push({ x: ecx - 12, y: gy - sp.h / 2, vx: Math.random() * 2.5, vy: -Math.random() * 2, life: 380, c: '#f1f5f9', z: 2 })
        }
      }
      if (enemyTurn && fire('_block', 2050)) { s.heroFlash = 180; s.shake = 3; addFloat('BLOCK', heroBaseX + 30, gy - 70, 'block') }
      if (ev && ev.type === 'heal' && fire('_heal', 600)) {
        s.heal = 1000
        s.hpShown[ev.boss] = (s.hpShown[ev.boss] ?? 0) + ev.amount
        addFloat(privacy ? 'REGEN' : `+${money(ev.amount, { decimals: false })}`, ecx, etop + 18, 'heal')
        ev._done = true
      }
      if (ev && ev.type === 'levelup' && fire('_lvl', 300)) {
        s.levelGlow = 1700
        showBanner({ text: 'LEVEL UP!', sub: `เลเวล ${ev.level}`, cls: 'gold' })
        for (let i = 0; i < 34; i++) s.fx.push({ x: heroBaseX + 32, y: gy - 6, vx: Math.random() * 2 - 1, vy: -Math.random() * 3 - 0.6, life: 1300, c: i % 3 ? '#fde047' : '#5eead4', z: 2 })
        ev._done = true
      }
      if (ev && ev.type === 'achievement' && fire('_ach', 300)) {
        showBanner({ text: 'ACHIEVEMENT', sub: ACHIEVEMENTS.find((x) => x.id === ev.id)?.name || '', cls: 'mint' })
        ev._done = true
      }

      // ---- draw background (half res) ----
      const shx = s.shake > 0 ? Math.round((Math.random() - 0.5) * s.shake) : 0
      const shy = s.shake > 0 ? Math.round((Math.random() - 0.5) * s.shake) : 0
      s.shake = Math.max(0, s.shake - dt * 0.025)
      g.setTransform(2, 0, 0, 2, shx, shy)
      const bgy = gy / 2
      for (let i = 0; i < 10; i++) { g.fillStyle = mix(sky.top, sky.bottom, i / 9); g.fillRect(-4, Math.floor((i * bgy) / 10) - 1, BW + 8, Math.ceil(bgy / 10) + 2) }
      if (sky.night > 0.2) {
        stars.forEach(([x, y, p]) => { if (Math.sin(now / 400 + p) > -0.3) { g.fillStyle = '#e0f2fe'; g.fillRect(Math.round(x), Math.round(y), 1, 1) } })
        g.fillStyle = '#fef9c3'; g.fillRect(160, 10, 7, 7); g.fillStyle = sky.top; g.fillRect(163, 9, 5, 6)
      } else {
        const sx = Math.round(20 + ((hour - 6) / 12) * (BW - 40))
        g.fillStyle = '#fde047'; g.fillRect(sx, 10, 8, 8); g.fillRect(sx - 1, 11, 10, 6); g.fillRect(sx + 1, 9, 6, 10)
      }
      g.fillStyle = sky.night > 0.2 ? '#334155' : '#ffffff'
      clouds.forEach((c) => {
        c[0] += dt * 0.004; if (c[0] > BW + 20) c[0] = -24
        g.fillRect(Math.round(c[0]), c[1], c[2], 3); g.fillRect(Math.round(c[0]) + 3, c[1] - 2, c[2] - 6, 2)
      })
      g.fillStyle = sky.hill[0]
      for (let x = 0; x < BW; x++) { const y = bgy - 8 - Math.round(6 + 4 * Math.sin(x / 17) + 3 * Math.sin(x / 7.3)); g.fillRect(x, y, 1, bgy - y + 2) }
      drawStructures(g, tier, bgy + 2, sky.night)
      g.fillStyle = sky.hill[1]
      for (let x = 0; x < BW; x++) { const y = bgy - Math.round(3 + 3 * Math.sin(x / 11 + 2)); g.fillRect(x, y, 1, bgy - y + 2) }
      g.fillStyle = '#22c55e'; g.fillRect(-4, bgy, BW + 8, 2)
      g.fillStyle = '#16a34a'; for (let x = 0; x < BW; x += 6) g.fillRect(x, bgy + 2, 3, 1)
      g.fillStyle = '#b45309'; g.fillRect(-4, bgy + 3, BW + 8, BH - bgy)
      g.fillStyle = '#92400e'; for (let x = 2; x < BW; x += 9) g.fillRect(x, bgy + 6 + (x % 3), 2, 1)

      // ---- sprites (full res) ----
      g.setTransform(1, 0, 0, 1, shx, shy)
      g.fillStyle = 'rgba(15,23,42,.2)'
      g.beginPath(); g.ellipse(hx + 32, gy + 1, 16, 3, 0, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.ellipse(ex + sp.w / 2, gy + 1, sp.w * 0.32, 4, 0, 0, Math.PI * 2); g.fill()

      let mode = 'normal'
      if (s.flash > 0) mode = Math.floor(s.flash / 70) % 2 ? 'flash' : 'normal'
      if (s.heal > 0) mode = Math.floor(s.heal / 130) % 2 ? 'heal' : 'normal'
      g.globalAlpha = s.dying > 0 ? (Math.floor(s.dying / 90) % 2 ? 0.25 : Math.min(1, s.dying / 1500)) : 1
      const eimg = frame(enemyAnim, enemyF, mode)
      if (eimg) g.drawImage(eimg, Math.round(ex) + (s.flash > 180 ? 5 : 0), gy - sp.h + 4)
      g.globalAlpha = 1
      s.flash = Math.max(0, s.flash - dt); s.heal = Math.max(0, s.heal - dt)
      if (s.dying > 0) { s.dying -= dt; if (s.dying <= 0) { s.dying = 0; s.focus = null } }

      const himg = frame(heroAnim, heroF, s.heroFlash > 0 && Math.floor(s.heroFlash / 60) % 2 ? 'flash' : 'normal')
      if (himg) g.drawImage(himg, Math.round(hx), gy - 64 + 4 + bob)
      s.heroFlash = Math.max(0, s.heroFlash - dt)
      if (s.levelGlow > 0) {
        g.fillStyle = `rgba(253,224,71,${(s.levelGlow / 1700) * 0.3})`
        g.fillRect(Math.round(hx) + 8, 0, 48, gy)
        s.levelGlow -= dt
      }
      // slash arc on the hit frame
      if (attacking && t > 980 && t < 1180) {
        g.strokeStyle = ev && ev.type === 'hit' ? 'rgba(253,224,71,.95)' : 'rgba(255,255,255,.8)'
        g.lineWidth = ev && ev.type === 'hit' ? 4 : 2
        g.beginPath(); g.arc(hx + 40, gy - 30, 30, -1.2, 0.9); g.stroke()
      }

      s.fx = s.fx.filter((p) => (p.life -= dt) > 0)
      for (const p of s.fx) { p.x += p.vx; p.y += p.vy; p.vy += 0.12; g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.z, p.z) }

      if (fog > 0.02) {
        for (let i = 0; i < 4; i++) {
          const fx = ((now / (40 + i * 15)) + i * 100) % (W + 160) - 80
          g.fillStyle = `rgba(148,130,180,${fog * 0.5})`
          g.fillRect(Math.round(fx), gy - 44 + i * 6, 92, 8); g.fillRect(Math.round(fx) + 16, gy - 50 + i * 6, 60, 6)
        }
      }
      if (sky.night) { g.fillStyle = `rgba(15,23,60,${sky.night})`; g.fillRect(-10, -10, W + 20, H + 20) }
      g.setTransform(1, 0, 0, 1, 0, 0)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const iv = setInterval(() => force((n) => n + 1), 400)
    return () => { cancelAnimationFrame(raf); clearInterval(iv) }
  }, [H]) // eslint-disable-line

  const s = S.current
  const shown = s.current || alive[0] || null
  const hpShown = shown ? Math.max(0, s.hpShown[shown.id] ?? shown.hp) : 0
  const pct = shown ? Math.max(0, Math.min(1, hpShown / shown.maxHp)) : 0

  return (
    <div className="relative select-none overflow-hidden" style={{ aspectRatio: `${W}/${H}` }}>
      <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }} />
      {hud && (
        <div className="absolute inset-x-0 top-0 p-2 flex justify-between items-start gap-2 pointer-events-none">
          <div className="px-box"><div className="px-font text-[10px] leading-none">LV.{level}</div></div>
          {shown ? (
            <div className="px-box min-w-[46%] max-w-[62%]">
              <div className="flex justify-between items-center gap-2 text-[11px] leading-tight">
                <span className="font-semibold truncate">{shown.name}</span>
                <span className="px-font text-[8px] text-rose-600">BOSS</span>
              </div>
              <div className="px-hp mt-1"><div style={{ width: `${pct * 100}%` }} /></div>
              <div className="px-font text-[8px] mt-0.5 text-slate-600 text-right">
                {privacy ? 'HP ••••' : `HP ${Math.round(hpShown).toLocaleString()}/${Math.round(shown.maxHp).toLocaleString()}`}
              </div>
            </div>
          ) : (
            <div className="px-box"><div className="text-[11px] font-semibold">ฝึกซ้อมกับสไลม์ · ไม่มีบอสหนี้</div></div>
          )}
        </div>
      )}
      {floats.map((f) => (
        <div key={f.id} className={`px-float ${f.cls}`} style={{ left: `${(f.x / W) * 100}%`, top: `${(f.y / H) * 100}%` }}>{f.text}</div>
      ))}
      {banner && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className={`px-banner ${banner.cls}`}>
            <div className="px-font text-sm md:text-base">{banner.text}</div>
            {banner.sub && <div className="text-xs font-semibold mt-0.5">{banner.sub}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
