import { useEffect, useMemo, useRef, useState } from 'react'
import { SHEETS } from '../lib/spriteSheets'
import { money } from '../lib/format'
import { useStore } from '../store'
import { ACHIEVEMENTS } from '../lib/rpg'
import { memberById } from '../lib/party'

/* ---------------- sprite sheets (PixelLab art) ---------------- */
const imgs = {}
function sheet(name) {
  if (!imgs[name]) { const im = new Image(); im.src = `./sprites/${name}.png`; imgs[name] = im }
  return imgs[name]
}
Object.keys(SHEETS).forEach(sheet) // preload
const statics = {}
function still(name) {
  if (!statics[name]) { const im = new Image(); im.src = `./sprites/${name}.png`; statics[name] = im }
  const im = statics[name]
  return im.complete && im.naturalWidth ? im : null
}
;['pet_fox', 'pet_owl', 'pet_drake', 'npc_merchant', 'npc_farmer', 'chest_closed', 'chest_open'].forEach(still)
/** draw a static sprite, optionally mirrored, scaled to height h, feet at (x, y) */
function drawStill(g, name, x, y, h, flip = false) {
  const im = still(name); if (!im) return
  const w = (im.width / im.height) * h
  g.save(); g.translate(Math.round(x), Math.round(y - h))
  if (flip) { g.translate(w, 0); g.scale(-1, 1) }
  g.drawImage(im, 0, 0, w, h); g.restore()
}
const TAUNTS = {
  dragon: ['ดอกเบี้ยบัตร 16% ต่อปีนะจ๊ะ~', 'รูดอีกสิ รูดอีก! 🔥', 'จ่ายขั้นต่ำก็พอแล้วมั้ง... ฮ่าๆ', 'ข้ากินโปรผ่อน 0% เป็นอาหารเช้า'],
  golem: ['งวดหน้ามาอีกแล้วนะ', 'ข้าแข็งเหมือนเงินต้น', 'ดอกเบี้ยข้าไม่เคยหลับ', 'ตีเบาไปหน่อยมั้ง?'],
  slime: ['ปุ๊ย~', 'ฝึกอีกรอบไหม?', 'ไม่มีหนี้ก็มาเล่นกับข้าสิ', 'ปุ๊ยๆ 💧'],
}
const QUIPS = ['รับไปเลย!', 'ใกล้หมดแล้ว!', 'ทุกบาทคือดาเมจ!', 'อีกนิดเดียว!']
const PET_LINES = { storm: ['เดือนนี้ใช้เกินรายรับแล้วนะ…', 'ระวังกระเป๋ารั่ว!'], rain: ['ฝนตกแล้ว อยู่บ้านประหยัดเงิน~'], sun: ['วันนี้อากาศดี บันทึกรายการกัน!', 'เก็บเหรียญกันเถอะ!'], leaves: ['ลมหนาวมาแล้ว~'], night: ['ง่วงแล้ว… zZ'] }
/** what each party member does on a quiet turn (pure flavour, no numbers change) */
const IDLE_ACTS = {
  healer: { skill: 'bless', lines: ['ขอพรให้กระเป๋าไม่รั่ว 🙏', 'ทุกคนปลอดภัยดี!'], narr: 'ลูน่าสวดพรคุ้มครองปาร์ตี้ — ยิ่งกันเงินจ่ายหนี้ครบ เธอยิ่งเก่ง' },
  mage: { skill: 'spark', lines: ['ดอกเบี้ยทบต้นคือเวทที่แรงที่สุด ✨', 'เติมมานาด้วยการลงทุน!'], narr: 'ไพร์ยิงเวทเบา ๆ ใส่ศัตรู — ส่งเงินเข้าลงทุนเพื่อปลดล็อกเวทใหญ่' },
  ranger: { skill: 'arrow', lines: ['ข้าเห็นค่ากาแฟแอบอยู่ตรงนั้น!', 'ลาดตระเวนเรียบร้อย'], narr: 'ฟินยิงธนูลาดตระเวน — บันทึกทุกวันเพื่อให้เธอเห็นทุกรายจ่าย' },
}
const tintCache = {}
function hueRotate(data, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  const m = [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072]
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    if (!data[i + 3] || mx - mn < 30) continue // leave greys and outlines alone
    // only armour/cape colours (green → blue); skin, hair and leather keep their colour
    const h = mx === r ? ((g - b) / (mx - mn)) * 60 : mx === g ? (2 + (b - r) / (mx - mn)) * 60 : (4 + (r - g) / (mx - mn)) * 60
    const hue = (h + 360) % 360
    if (hue < 75 || hue > 275) continue
    data[i] = m[0] * r + m[1] * g + m[2] * b; data[i + 1] = m[3] * r + m[4] * g + m[5] * b; data[i + 2] = m[6] * r + m[7] * g + m[8] * b
  }
}
/** Frame `i` of an animation (index into its seq), optionally tinted white (hit) or green (regen), or recoloured (skin). */
function frame(name, i, mode = 'normal', hue = 0) {
  const sp = SHEETS[name], im = sheet(name)
  if (!sp || !im.complete || !im.naturalWidth) return null
  const f = sp.seq[((i % sp.seq.length) + sp.seq.length) % sp.seq.length]
  const key = `${name}:${f}:${mode}:${hue}`
  if (tintCache[key]) return tintCache[key]
  const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h
  const g = c.getContext('2d', { willReadFrequently: !!hue }); g.imageSmoothingEnabled = false
  g.drawImage(im, f * sp.w, 0, sp.w, sp.h, 0, 0, sp.w, sp.h)
  if (hue) { const d = g.getImageData(0, 0, sp.w, sp.h); hueRotate(d.data, hue); g.putImageData(d, 0, 0) }
  if (mode !== 'normal') {
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = mode === 'flash' ? 'rgba(255,255,255,.9)' : mode === 'gold' ? 'rgba(253,224,71,.3)' : 'rgba(74,222,128,.55)'
    g.fillRect(0, 0, sp.w, sp.h)
  }
  tintCache[key] = c
  return c
}

/** Data URL of the knight in a recoloured outfit (for portraits outside the canvas). */
export function skinUrl(hue, name = 'hero_idle') {
  const c = frame(name, 0, 'normal', hue)
  return c ? c.toDataURL() : null
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

/* ---------------- realms: each one looks different ---------------- */
const GROUND = [
  { grass: '#5b6b4f', blade: '#46553d', dirt: '#3f3a4a', speck: '#2a2633', hill: ['#4b5d4f', '#3a4a3e'] }, // debt mire
  { grass: '#22c55e', blade: '#16a34a', dirt: '#b45309', speck: '#92400e' }, // village
  { grass: '#22c55e', blade: '#16a34a', dirt: '#a8a29e', speck: '#78716c', cobble: true }, // trade town
  { grass: '#4ade80', blade: '#22c55e', dirt: '#94a3b8', speck: '#64748b', cobble: true }, // castle
  { grass: '#a3e635', blade: '#65a30d', dirt: '#fbbf24', speck: '#d97706', cobble: true }, // golden kingdom
]

/** Background structures, drawn in half-resolution space (200 wide). */
function drawRealm(g, tier, gy, night, now, decos) {
  const dark = night > 0.2
  const C = {
    wall: dark ? '#475569' : '#f8fafc', wall2: dark ? '#334155' : '#e2e8f0', roof: dark ? '#7f1d1d' : '#f87171', roof2: dark ? '#1e3a8a' : '#60a5fa',
    win: dark ? '#fde047' : '#38bdf8', wood: dark ? '#44403c' : '#92400e', stone: dark ? '#64748b' : '#cbd5e1', stone2: dark ? '#475569' : '#94a3b8',
    gold: dark ? '#ca8a04' : '#fbbf24', gold2: dark ? '#a16207' : '#f59e0b', leaf: dark ? '#14532d' : '#16a34a', leaf2: dark ? '#166534' : '#22c55e',
  }
  const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h) }
  const house = (x, roof = C.roof, w = 9) => {
    const y = gy - 16
    R(C.wall, x, y, w, 6)
    g.fillStyle = roof; for (let i = 0; i < 5; i++) g.fillRect(x - 1 + i, y - 1 - i, w + 2 - 2 * i, 1)
    R(C.win, x + 2, y + 2, 2, 2); R(C.wood, x + w - 3, y + 3, 2, 3)
  }
  const tree = (x, h = 9) => { R(C.wood, x + 2, gy - 10 - 4, 1, 4); R(C.leaf, x, gy - 14 - h + 3, 5, h - 3); R(C.leaf2, x + 1, gy - 14 - h + 1, 3, 3) }
  const tower = (x, h, flag, col = C.stone, col2 = C.stone2) => {
    const y = gy - 10 - h
    R(col, x, y, 7, h)
    g.fillStyle = col2; for (let i = 0; i < 7; i += 2) g.fillRect(x + i, y - 2, 1, 2)
    R(C.win, x + 3, y + 4, 1, 2)
    if (flag) { R('#334155', x + 3, y - 8, 1, 6); const wave = Math.floor(now / 300) % 2; R(flag, x + 4, y - 8 + wave, 4, 3) }
  }
  const stall = (x, c1, c2) => {
    R(C.wood, x, gy - 16, 1, 6); R(C.wood, x + 10, gy - 16, 1, 6); R(C.wood, x, gy - 12, 11, 2)
    for (let i = 0; i < 11; i++) R(i % 2 ? c1 : c2, x + i, gy - 18, 1, 3)
    R(C.gold, x + 3, gy - 13, 2, 1); R('#ef4444', x + 6, gy - 13, 2, 1)
  }
  const lamp = (x) => { R('#334155', x, gy - 20, 1, 10); R(dark ? '#fde047' : '#fef9c3', x - 1, gy - 22, 3, 2); if (dark) { g.fillStyle = 'rgba(253,224,71,.18)'; g.fillRect(x - 5, gy - 26, 11, 10) } }

  if (tier === 0) {
    // dead trees, graves and a sign of debt
    g.fillStyle = dark ? '#334155' : '#57534e'
    ;[[22, 12], [150, 15], [178, 9]].forEach(([x, h]) => { g.fillRect(x, gy - 10 - h, 1, h); g.fillRect(x - 3, gy - 6 - h, 3, 1); g.fillRect(x + 1, gy - 4 - h, 4, 1); g.fillRect(x - 2, gy - 9 - h, 1, 3) })
    ;[40, 58, 130].forEach((x) => { R(dark ? '#475569' : '#78716c', x, gy - 15, 4, 5); R(dark ? '#334155' : '#57534e', x + 1, gy - 14, 2, 1) })
    R(C.wood, 95, gy - 18, 1, 8); R(dark ? '#7f1d1d' : '#991b1b', 90, gy - 21, 12, 5); R('#fecaca', 92, gy - 19, 8, 1)
    g.fillStyle = 'rgba(88,28,135,.35)'; g.fillRect(64, gy - 10, 18, 2); g.fillRect(160, gy - 10, 14, 2)
  }
  if (tier === 1) {
    tree(8); tree(186, 11)
    house(140); house(160, C.roof2)
    R(C.wood, 110, gy - 12, 26, 1); for (let x = 110; x < 136; x += 4) R(C.wood, x, gy - 14, 1, 4) // fence
    R(C.stone, 30, gy - 14, 6, 4); R(C.wood, 30, gy - 19, 1, 5); R(C.wood, 35, gy - 19, 1, 5); R(C.roof, 29, gy - 20, 8, 1) // well
  }
  if (tier === 2) {
    house(12); house(28, C.roof2); house(150); house(170, C.roof2, 11)
    stall(96, '#ef4444', '#fff'); stall(118, '#3b82f6', '#fff')
    lamp(60); lamp(140); tree(186)
  }
  if (tier === 3) {
    house(10); house(178, C.roof2)
    // castle with a gate
    R(C.stone, 70, gy - 26, 64, 16); g.fillStyle = C.stone2; for (let x = 70; x < 134; x += 4) g.fillRect(x, gy - 28, 2, 2)
    R(dark ? '#1e293b' : '#475569', 96, gy - 20, 12, 10); R(C.wood, 98, gy - 18, 8, 8)
    tower(62, 26, '#10b981'); tower(134, 26, '#0ea5e9'); tower(97, 32, '#f43f5e')
    R('#dc2626', 80, gy - 24, 3, 6); R('#dc2626', 121, gy - 24, 3, 6) // banners
    lamp(40); lamp(160)
  }
  if (tier === 4) {
    house(6, C.gold2); house(186, C.gold2, 8)
    // golden palace with domes
    R(C.wall, 58, gy - 26, 84, 16); R(C.gold, 58, gy - 27, 84, 1)
    const dome = (cx, r, y) => { g.fillStyle = C.gold; for (let i = 0; i < r; i++) { const w = Math.round(2 * Math.sqrt(r * r - (r - i) * (r - i))); g.fillRect(cx - w / 2, y - r + i, w, 1) } R(C.gold2, cx, y - r - 4, 1, 4) }
    dome(100, 9, gy - 27); dome(76, 5, gy - 27); dome(124, 5, gy - 27)
    tower(48, 24, '#fbbf24', C.gold, C.gold2); tower(145, 24, '#fbbf24', C.gold, C.gold2)
    R(dark ? '#1e293b' : '#7c2d12', 96, gy - 20, 8, 10)
    for (let i = 0; i < 6; i++) { if (Math.sin(now / 200 + i * 1.7) > 0.6) R('#fef08a', 60 + i * 14, gy - 34 - (i % 3) * 5, 1, 1) }
    lamp(30); lamp(170)
  }
  // shop decorations
  if (decos.deco_lanterns) for (const x of [18, 82, 176]) { R('#334155', x, gy - 18, 1, 8); R('#dc2626', x - 1, gy - 21, 3, 3); if (dark) { g.fillStyle = `rgba(248,113,113,${0.2 + 0.08 * Math.sin(now / 300 + x)})`; g.fillRect(x - 4, gy - 25, 9, 9) } }
  if (decos.deco_flowers) for (let x = 3; x < 200; x += 11) { const c = ['#f472b6', '#fde047', '#a78bfa', '#fb7185'][x % 4]; R('#16a34a', x, gy - 11, 1, 2); R(c, x - 1, gy - 12, 3, 1); R(c, x, gy - 13, 1, 1) }
}

/* ---------------- component ---------------- */
export default function BattleScene({
  bosses, events = [], onConsumed, tier = 1, fog = 0, big = false, level = 1, hud = true, weather = 'sun', chest = false, onChest,
  party = [], gear = null, pet = 'pet_fox', skinHue = 0, decos = {}, storm = false, captions = [], previewTier = null, previewName = '',
}) {
  const W = 400, H = big ? 220 : 176
  const canvasRef = useRef(null)
  const privacy = useStore((s) => s.ui.privacy)
  const [floats, setFloats] = useState([])
  const [banner, setBanner] = useState(null)
  const [bubble, setBubble] = useState(null)
  const [narr, setNarr] = useState(null) // { text, until }
  const [capIdx, setCapIdx] = useState(0)
  const [, force] = useState(0)

  const alive = useMemo(() => bosses.filter((b) => b.active).sort((a, b) => b.hp - a.hp), [bosses])
  const backRow = useMemo(() => ['healer', 'mage', 'ranger'].filter((id) => party.some((p) => p.id === id && p.joined)), [party])
  const S = useRef({ queue: [], fx: [], hpShown: {}, focus: null, focusUntil: 0, cycleStart: 0, cycle: 0, current: null, dying: 0, heal: 0, shake: 0, flash: 0, heroFlash: 0, levelGlow: 0, petX: 40, petHop: 0, heroJump: 0, poke: 0, nextTalk: 0, smoke: [], drops: [], bolt: 0, act: null, proj: [], dome: 0, glow: 0 })
  const P = useRef({})
  P.current = { bosses, alive, tier: previewTier ?? tier, fog: previewTier != null ? (previewTier === 0 ? 0.4 : 0) : fog, privacy, weather, chest, backRow, gear, pet, skinHue, decos, storm }

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

  // rotate the status captions when nothing is being narrated
  useEffect(() => { const iv = setInterval(() => setCapIdx((i) => i + 1), 6000); return () => clearInterval(iv) }, [])

  const addFloat = (text, x, y, cls) => {
    const id = Math.random()
    setFloats((f) => [...f.slice(-5), { id, text, x, y, cls }])
    setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1600)
  }
  const showBanner = (b, ms = 2400) => { setBanner(b); setTimeout(() => setBanner(null), ms) }
  const say = (who, text, x, y, ms = 2600) => { const id = Math.random(); setBubble({ id, who, text, x, y }); setTimeout(() => setBubble((b) => (b?.id === id ? null : b)), ms) }
  const tell = (text, ms = 4500) => setNarr({ text, until: Date.now() + ms, id: Math.random() })
  const buzz = (p) => { try { if (document.visibilityState === 'visible') navigator.vibrate?.(p) } catch { /* no haptics */ } }

  const layout = () => {
    const n = P.current.backRow.length
    const heroBaseX = 60 + 34 * n
    const pos = {}
    P.current.backRow.forEach((id, k) => { pos[id] = heroBaseX - 34 * (k + 1) - 2 })
    return { heroBaseX, pos }
  }

  // tap the scene: pet → hearts, enemy → poke, party member → line, chest → open
  const onTap = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H
    const s = S.current
    if (P.current.chest && x < 50 && y > H - 70) { onChest?.(); return }
    if (Math.abs(x - s.petX) < 16 && y > H - 60) {
      s.petHop = 500; buzz(15)
      for (let i = 0; i < 5; i++) s.fx.push({ x: s.petX, y: H - 60, vx: Math.random() * 1.6 - 0.8, vy: -1 - Math.random(), life: 900, c: '#fb7185', z: 3, g: -0.02 })
      say('pet', ['💚', 'ฮิๆ', 'เก็บเงินเก่งมาก!', 'อยากได้เหรียญ~'][Math.floor(Math.random() * 4)], s.petX, H - 64, 1500)
      return
    }
    const { pos } = layout()
    for (const [id, px] of Object.entries(pos)) {
      if (x > px + 8 && x < px + 46 && y > H - 90) {
        const a = IDLE_ACTS[id]; const m = memberById[id]
        say('hero', a.lines[Math.floor(Math.random() * a.lines.length)], px + 27, H - 86, 1800)
        tell(`${m.name} (${m.role}): ดูแลเรื่อง${m.area}`)
        return
      }
    }
    if (x > W - 150) {
      s.poke = 260; s.shake = 3; buzz(10)
      addFloat('จิ้ม!', x, y - 10, 'block')
      return
    }
    s.heroJump = 420; buzz(8)
  }

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
    const npcs = [
      { name: 'npc_merchant', x: 230, dir: 1, sp: 0.018, nat: 1, minTier: 1, pause: 0 },
      { name: 'npc_farmer', x: 280, dir: -1, sp: 0.014, nat: -1, minTier: 2, pause: 0 },
    ]
    const drops = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H, 0.5 + Math.random()])
    const birds = [[-20, 30, 0.03], [-60, 22, 0.026]]
    s.nextTalk = performance.now() + 3500

    const pickEnemy = (now) => {
      const ev = s.queue[0]
      if (ev && ev.boss) { s.focus = ev.boss; s.focusUntil = now + 4500 }
      if (s.focus && now < s.focusUntil) { const b = P.current.bosses.find((x) => x.id === s.focus); if (b) return b }
      return P.current.alive[0] || null
    }

    const loop = (now) => {
      const { tier, fog, privacy, backRow, gear, skinHue, decos } = P.current
      const dt = Math.min(50, now - last); last = now
      const hour = new Date().getHours()
      const sky = skyFor(hour)
      const enemy = s.dying > 0 ? s.current : pickEnemy(now)
      if (!s.dying) s.current = enemy
      const kind = enemy ? enemy.sprite : 'slime'
      const sp = SHEETS[`${kind}_idle`]
      const ex0 = W - 66 - sp.w / 2
      const { heroBaseX, pos } = layout()
      const M = (v) => (privacy ? '•••' : money(v, { decimals: false }))

      // ---- timeline ----
      const CYCLE = 2800
      let t = now - s.cycleStart
      if (t > CYCLE) {
        s.cycleStart = now; t = 0; s.cycle++
        if (s.queue[0]?._done) s.queue.shift()
        // quiet turn: a party member does something (and the caption says what)
        if (!s.queue.length && backRow.length && s.cycle % 3 === 1) {
          const id = backRow[s.cycle % backRow.length]
          s.act = { member: id, skill: IDLE_ACTS[id].skill, t0: now, idle: true }
          tell(`${IDLE_ACTS[id].skill === 'bless' ? '💚' : IDLE_ACTS[id].skill === 'spark' ? '✨' : '🏹'} ${IDLE_ACTS[id].narr}`)
        }
      }
      const ev = s.queue[0]
      const heroTurn = !ev || ev.type === 'hit'
      const enemyTurn = !ev && kind !== 'slime' && s.cycle % 3 === 2
      const attacking = heroTurn && !enemyTurn && !(s.act && s.act.idle && now - s.act.t0 < 1500)

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

      if (now > s.nextTalk && !s.dying) {
        s.nextTalk = now + 8000 + Math.random() * 5000
        const w = P.current.weather
        if (Math.random() < 0.5 && enemy) { const L = TAUNTS[kind] || TAUNTS.slime; say('boss', L[Math.floor(Math.random() * L.length)], ex0 + sp.w / 2, gy - sp.h - 6) }
        else { const L = PET_LINES[sky.night > 0.2 && w === 'sun' ? 'night' : w] || PET_LINES.sun; say('pet', L[Math.floor(Math.random() * L.length)], s.petX, gy - 34) }
      }
      const fire = (key, at) => { if (t >= at && s[key] !== s.cycle) { s[key] = s.cycle; return true } return false }
      const ecx = ex0 + sp.w / 2, etop = gy - sp.h
      const wcol = gear?.weapon?.color || '#ffffff'
      if (attacking && fire('_hit', 1060)) {
        if (ev && ev.type === 'hit') {
          const crit = P.current.storm && ev.amount >= 5000
          s.flash = crit ? 520 : 320; s.shake = crit ? 14 : 10
          s.hpShown[ev.boss] = Math.max(0, (s.hpShown[ev.boss] ?? 0) - ev.amount)
          addFloat(privacy ? 'CRITICAL!' : `-${money(ev.amount, { decimals: false })}`, ecx, etop + 18, 'crit')
          if (crit) setTimeout(() => addFloat('ฟันพายุ!', ecx - 30, etop, 'gold'), 250)
          for (let i = 0; i < 26; i++) s.fx.push({ x: ecx - 10, y: gy - sp.h / 2, vx: Math.random() * 4 - 1, vy: -Math.random() * 3.5, life: 700, c: i % 2 ? wcol : '#ffffff', z: 2 })
          buzz(ev.kill ? [40, 60, 40, 60, 120] : [25, 40, 50])
          tell(`⚔️ อัศวินใช้${gear?.weapon?.name || 'ดาบ'}${crit ? ' ร่าย “ฟันพายุ”' : ''} ฟัน${enemy?.name || 'บอส'} −${M(ev.amount)} — มาจากการชำระ${enemy?.accName || 'หนี้'}จริง`)
          if (Math.random() < 0.6) say('hero', QUIPS[Math.floor(Math.random() * QUIPS.length)], hx + 34, gy - 74, 1400)
          if (ev.kill) {
            s.dying = 1500; showBanner({ text: 'DEFEATED!', sub: `ปราบ${enemy?.name || 'บอส'}สำเร็จ`, cls: 'gold' }, 2800)
            for (let i = 0; i < 18; i++) s.drops.push({ x: ecx, y: gy - sp.h / 2, vx: Math.random() * 5 - 3.2, vy: -2 - Math.random() * 3, life: 2600 })
          }
          ev._done = true
        } else {
          s.flash = 140; s.shake = 3
          for (let i = 0; i < 8; i++) s.fx.push({ x: ecx - 12, y: gy - sp.h / 2, vx: Math.random() * 2.5, vy: -Math.random() * 2, life: 380, c: '#f1f5f9', z: 2 })
        }
      }
      if (enemyTurn && fire('_block', 2050)) { s.heroFlash = 180; s.shake = 3; addFloat(backRow.includes('healer') ? 'GUARD' : 'BLOCK', heroBaseX + 30, gy - 70, 'block') }
      if (ev && ev.type === 'heal' && fire('_heal', 600)) {
        s.heal = 1000
        s.hpShown[ev.boss] = (s.hpShown[ev.boss] ?? 0) + ev.amount
        addFloat(privacy ? 'REGEN' : `+${money(ev.amount, { decimals: false })}`, ecx, etop + 18, 'heal')
        tell(`🐉 ${enemy?.name || 'บอส'}ฟื้นพลัง +${M(ev.amount)} — จากยอดใหม่ใน${enemy?.accName || 'บัตร'}${backRow.includes('healer') ? ' (ลูน่ากันเงินไว้จ่ายแล้ว)' : ''}`)
        ev._done = true
      }
      if (ev && (ev.type === 'skill' || ev.type === 'join') && fire('_skill', 300)) {
        const id = ev.member
        if (ev.type === 'join') {
          showBanner({ text: 'NEW ALLY!', sub: `${memberById[id]?.name} ${memberById[id]?.role.split(' ')[0]} เข้าร่วมปาร์ตี้`, cls: 'mint' }, 3000)
          tell(`✨ ${memberById[id]?.name} เข้าร่วมปาร์ตี้! เพราะคุณ${memberById[id]?.join}`, 6000)
          s.glow = 1600
        } else if (backRow.includes(id) || ev.skill === 'heal') {
          s.act = { member: backRow.includes(id) ? id : null, skill: ev.skill, t0: now, amount: ev.amount }
          const T = {
            fireball: `🔥 ไพร์ร่าย “ลูกไฟทองคำ” — คุณส่งเงินเข้าลงทุน ${M(ev.amount)}`,
            meteor: `☄️ ไพร์ร่าย “อุกกาบาตกำไร” — ส่งเข้าลงทุนก้อนใหญ่ ${M(ev.amount)}`,
            shield: `🛡️ ลูน่าร่าย “โล่ศักดิ์สิทธิ์” — กันเงินจ่ายหนี้ ${M(ev.amount)}`,
            heal: '💚 มีรายรับเข้า — ทั้งปาร์ตี้ฟื้นพลัง',
          }
          tell(T[ev.skill] || '', 5500)
        } else {
          tell(ev.skill === 'shield' ? `🛡️ อัศวินเก็บเงินเข้าคลังกันหนี้ ${M(ev.amount)}` : `💰 อัศวินส่งเงินเข้าคลังลงทุน ${M(ev.amount)}`, 5000)
          s.glow = 900
        }
        ev._done = true
      }
      if (ev && ev.type === 'levelup' && fire('_lvl', 300)) {
        s.levelGlow = 1700
        showBanner({ text: 'LEVEL UP!', sub: `เลเวล ${ev.level}`, cls: 'gold' })
        tell(`⬆️ ปาร์ตี้เลเวลอัปเป็น ${ev.level}! ได้ XP จากวินัยการเงินของคุณ`)
        for (let i = 0; i < 34; i++) s.fx.push({ x: heroBaseX + 32, y: gy - 6, vx: Math.random() * 2 - 1, vy: -Math.random() * 3 - 0.6, life: 1300, c: i % 3 ? '#fde047' : '#5eead4', z: 2 })
        ev._done = true
      }
      if (ev && ev.type === 'achievement' && fire('_ach', 300)) {
        const a = ACHIEVEMENTS.find((x) => x.id === ev.id)
        showBanner({ text: 'ACHIEVEMENT', sub: a?.name || '', cls: 'mint' })
        tell(`🏅 ได้รับฉายา “${a?.name}” — ${a?.desc}`)
        ev._done = true
      }

      // ---- party member actions (skills + idle flavour) ----
      const act = s.act
      const actT = act ? now - act.t0 : 0
      if (act && actT > 2200) s.act = null
      if (act && !act._fx && actT > 420) {
        act._fx = true
        const px = act.member ? pos[act.member] + 44 : heroBaseX + 40, py = gy - 34
        if (act.skill === 'fireball' || act.skill === 'meteor' || act.skill === 'spark') s.proj.push({ kind: act.skill, x: px, y: py, tx: ecx - 8, ty: gy - sp.h / 2, t: 0, dur: act.skill === 'meteor' ? 700 : 520, amount: act.amount })
        if (act.skill === 'meteor') s.proj.push({ kind: 'meteor', x: ecx - 120, y: -20, tx: ecx - 4, ty: gy - sp.h / 2, t: 0, dur: 900, amount: null })
        if (act.skill === 'arrow') s.proj.push({ kind: 'arrow', x: px, y: py - 4, tx: ecx - 10, ty: gy - sp.h / 2 - 4, t: 0, dur: 380 })
        if (act.skill === 'shield') { s.dome = 1600; addFloat(privacy ? 'SHIELD' : `🛡 ${money(act.amount, { decimals: false })}`, heroBaseX - 20, gy - 92, 'sky') }
        if (act.skill === 'heal' || act.skill === 'bless') {
          s.glow = act.skill === 'heal' ? 1400 : 800
          for (let i = 0; i < (act.skill === 'heal' ? 30 : 12); i++) s.fx.push({ x: 20 + Math.random() * (heroBaseX + 40), y: gy - Math.random() * 10, vx: 0, vy: -0.6 - Math.random() * 0.8, life: 1100, c: i % 2 ? '#86efac' : '#fef08a', z: 2, g: 0 })
          if (act.skill === 'heal') addFloat('HEAL', heroBaseX + 10, gy - 90, 'heal')
        }
      }

      // ---- draw background (half res) ----
      const shx = s.shake > 0 ? Math.round((Math.random() - 0.5) * s.shake) : 0
      const shy = s.shake > 0 ? Math.round((Math.random() - 0.5) * s.shake) : 0
      s.shake = Math.max(0, s.shake - dt * 0.025)
      g.setTransform(2, 0, 0, 2, shx, shy)
      const bgy = gy / 2
      const GR = GROUND[tier] || GROUND[1]
      for (let i = 0; i < 10; i++) { g.fillStyle = mix(sky.top, sky.bottom, i / 9); g.fillRect(-4, Math.floor((i * bgy) / 10) - 1, BW + 8, Math.ceil(bgy / 10) + 2) }
      if (tier === 0) { g.fillStyle = 'rgba(76,29,149,.18)'; g.fillRect(-4, -4, BW + 8, bgy + 8) }
      if (tier === 4 && !sky.night) { g.fillStyle = 'rgba(253,224,71,.12)'; g.fillRect(-4, -4, BW + 8, bgy + 8) }
      if (sky.night > 0.2) {
        stars.forEach(([x, y, p]) => { if (Math.sin(now / 400 + p) > -0.3) { g.fillStyle = '#e0f2fe'; g.fillRect(Math.round(x), Math.round(y), 1, 1) } })
        g.fillStyle = '#fef9c3'; g.fillRect(160, 10, 7, 7); g.fillStyle = sky.top; g.fillRect(163, 9, 5, 6)
      } else {
        const sx = Math.round(20 + ((hour - 6) / 12) * (BW - 40))
        g.fillStyle = '#fde047'; g.fillRect(sx, 10, 8, 8); g.fillRect(sx - 1, 11, 10, 6); g.fillRect(sx + 1, 9, 6, 10)
      }
      g.fillStyle = sky.night > 0.2 ? '#334155' : tier === 0 ? '#94a3b8' : '#ffffff'
      clouds.forEach((c) => {
        c[0] += dt * 0.004; if (c[0] > BW + 20) c[0] = -24
        g.fillRect(Math.round(c[0]), c[1], c[2], 3); g.fillRect(Math.round(c[0]) + 3, c[1] - 2, c[2] - 6, 2)
      })
      const hill = GR.hill || sky.hill
      g.fillStyle = hill[0]
      for (let x = 0; x < BW; x++) { const y = bgy - 8 - Math.round(6 + 4 * Math.sin(x / 17) + 3 * Math.sin(x / 7.3)); g.fillRect(x, y, 1, bgy - y + 2) }
      if (!sky.night && P.current.weather === 'sun' && tier > 0) {
        g.fillStyle = '#334155'
        birds.forEach((b) => { b[0] += dt * b[2]; if (b[0] > BW + 30) b[0] = -40 - Math.random() * 60; const f = Math.floor(now / 220) % 2; g.fillRect(Math.round(b[0]), b[1] + f, 2, 1); g.fillRect(Math.round(b[0]) + 2, b[1] + 1 - f, 1, 1); g.fillRect(Math.round(b[0]) + 3, b[1] + f, 2, 1) })
      }
      drawRealm(g, tier, bgy + 2, sky.night, now, decos)
      // chimney smoke
      const chim = tier === 1 ? [143, 163] : tier === 2 ? [15, 31, 153, 173] : tier >= 3 ? [13, 181] : []
      if (chim.length && Math.random() < dt / 260) { const cx = chim[Math.floor(Math.random() * chim.length)]; s.smoke.push({ x: cx, y: bgy - 21, life: 2600 }) }
      s.smoke = s.smoke.filter((p) => (p.life -= dt) > 0)
      for (const p of s.smoke) { p.y -= dt * 0.006; p.x += dt * 0.003; g.fillStyle = `rgba(226,232,240,${Math.min(0.8, p.life / 2600)})`; const z = p.life > 1500 ? 1 : 2; g.fillRect(Math.round(p.x), Math.round(p.y), z, z) }
      if (chim.length) { g.fillStyle = '#78716c'; chim.forEach((cx) => g.fillRect(cx, bgy - 21, 2, 3)) }
      g.fillStyle = (GR.hill || sky.hill)[1]
      for (let x = 0; x < BW; x++) { const y = bgy - Math.round(3 + 3 * Math.sin(x / 11 + 2)); g.fillRect(x, y, 1, bgy - y + 2) }
      g.fillStyle = GR.grass; g.fillRect(-4, bgy, BW + 8, 2)
      g.fillStyle = GR.blade; for (let x = 0; x < BW; x += 6) g.fillRect(x, bgy + 2, 3, 1)
      g.fillStyle = GR.dirt; g.fillRect(-4, bgy + 3, BW + 8, BH - bgy)
      g.fillStyle = GR.speck
      if (GR.cobble) { for (let y = bgy + 5, r = 0; y < BH; y += 4, r++) for (let x = (r % 2) * 4; x < BW; x += 8) g.fillRect(x, y, 6, 1) }
      else for (let x = 2; x < BW; x += 9) g.fillRect(x, bgy + 6 + (x % 3), 2, 1)
      if (decos.deco_banner) { const bx = Math.round((heroBaseX - 34 * backRow.length - 14) / 2); g.fillStyle = '#334155'; g.fillRect(bx, bgy - 28, 1, 30); const wv = Math.floor(now / 250) % 2; g.fillStyle = '#10b981'; g.fillRect(bx + 1, bgy - 28 + wv, 9, 3); g.fillStyle = '#38bdf8'; g.fillRect(bx + 1, bgy - 25 + wv, 9, 3) }

      // ---- sprites (full res) ----
      g.setTransform(1, 0, 0, 1, shx, shy)
      const wet = P.current.weather === 'rain' || P.current.weather === 'storm'
      for (const n of npcs) {
        if (tier < n.minTier) continue
        if (n.pause > 0) n.pause -= dt
        else {
          n.x += n.dir * n.sp * dt * (wet ? 2.2 : 1)
          if (n.x > W - 30 || n.x < 200) { n.dir *= -1; n.pause = 800 + Math.random() * 2500 }
          if (Math.random() < dt / 9000) n.pause = 1200 + Math.random() * 1800
        }
        const step = n.pause > 0 ? 0 : (Math.floor(now / 160) % 2)
        g.globalAlpha = 0.85
        drawStill(g, n.name, n.x - 12, gy - 24 - step, 24, n.dir !== n.nat)
        g.globalAlpha = 1
      }
      if (P.current.chest) {
        const cb = Math.sin(now / 250) > 0.6 ? 1 : 0
        g.fillStyle = `rgba(253,224,71,${0.25 + 0.15 * Math.sin(now / 200)})`; g.beginPath(); g.ellipse(22, gy + 4, 18, 5, 0, 0, Math.PI * 2); g.fill()
        drawStill(g, 'chest_closed', 8, gy + 8 - cb, 28)
        if (Math.random() < dt / 300) s.fx.push({ x: 10 + Math.random() * 24, y: gy - 20, vx: 0, vy: -0.4, life: 700, c: '#fde047', z: 2, g: 0 })
      }
      g.fillStyle = 'rgba(15,23,42,.2)'
      g.beginPath(); g.ellipse(hx + 32, gy + 1, 16, 3, 0, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.ellipse(ex + sp.w / 2, gy + 1, sp.w * 0.32, 4, 0, 0, Math.PI * 2); g.fill()

      let mode = 'normal'
      if (s.flash > 0) mode = Math.floor(s.flash / 70) % 2 ? 'flash' : 'normal'
      if (s.poke > 0) { mode = 'flash'; s.poke -= dt }
      if (s.heal > 0) mode = Math.floor(s.heal / 130) % 2 ? 'heal' : 'normal'
      g.globalAlpha = s.dying > 0 ? (Math.floor(s.dying / 90) % 2 ? 0.25 : Math.min(1, s.dying / 1500)) : 1
      const eimg = frame(enemyAnim, enemyF, mode)
      if (eimg) g.drawImage(eimg, Math.round(ex) + (s.flash > 180 ? 5 : 0), gy - sp.h + 4)
      g.globalAlpha = 1
      s.flash = Math.max(0, s.flash - dt); s.heal = Math.max(0, s.heal - dt)
      if (s.dying > 0) { s.dying -= dt; if (s.dying <= 0) { s.dying = 0; s.focus = null } }

      // back row: healer, mage, ranger (smaller, behind the knight)
      for (let k = backRow.length - 1; k >= 0; k--) {
        const id = backRow[k]
        const x = pos[id]
        const acting = s.act && s.act.member === id && actT < 7 * 90
        const img = acting ? frame(`${id}_atk`, Math.floor(actT / 90)) : frame(`${id}_idle`, 0, s.glow > 0 && Math.floor(s.glow / 120) % 2 ? 'gold' : 'normal')
        const b = acting ? 0 : (Math.sin(now / 320 + k * 1.3) > 0 ? 0 : 1)
        g.fillStyle = 'rgba(15,23,42,.16)'; g.beginPath(); g.ellipse(x + 27, gy - 1, 12, 2.5, 0, 0, Math.PI * 2); g.fill()
        if (img) g.drawImage(img, Math.round(x), gy - 54 + 1 + b, 54, 54)
      }
      if (s.dome > 0) {
        const a = Math.min(1, s.dome / 600)
        g.strokeStyle = `rgba(125,211,252,${0.9 * a})`; g.lineWidth = 2
        g.fillStyle = `rgba(186,230,253,${0.22 * a})`
        g.beginPath(); g.ellipse((heroBaseX - 34 * backRow.length + heroBaseX + 64) / 2, gy, (34 * backRow.length + 70) / 2, 58, 0, Math.PI, 0); g.fill(); g.stroke()
        s.dome -= dt
      }

      // knight: armour tier glows under him
      const atier = gear?.armor?.tier || 0
      if (atier >= 1) { g.fillStyle = `${gear.armor.color}${atier >= 3 ? '55' : '33'}`; g.beginPath(); g.ellipse(hx + 32, gy, 20 + atier * 2, 5, 0, 0, Math.PI * 2); g.fill() }
      const jump = s.heroJump > 0 ? Math.sin((1 - s.heroJump / 420) * Math.PI) * 18 : 0
      s.heroJump = Math.max(0, s.heroJump - dt)
      const himg = frame(heroAnim, heroF, s.heroFlash > 0 && Math.floor(s.heroFlash / 60) % 2 ? 'flash' : s.glow > 0 && Math.floor(s.glow / 120) % 2 ? 'gold' : 'normal', skinHue)
      if (himg) g.drawImage(himg, Math.round(hx), gy - 64 + 4 + bob - Math.round(jump))
      s.glow = Math.max(0, s.glow - dt)
      const rtier = gear?.ring?.tier || 0
      if (rtier >= 2 && Math.random() < dt / (rtier >= 4 ? 250 : 600)) s.fx.push({ x: hx + 20 + Math.random() * 24, y: gy - 50 + Math.random() * 30, vx: 0, vy: -0.3, life: 600, c: gear.ring.color, z: 1, g: 0 })
      // pet walks in front of the party
      const petTarget = Math.max(8, heroBaseX - 6)
      s.petX += (petTarget - s.petX) * Math.min(1, dt / 220)
      const hop = s.petHop > 0 ? Math.sin((1 - s.petHop / 500) * Math.PI) * 10 : (attacking && t > 900 && t < 1250 ? Math.abs(Math.sin((t - 900) / 350 * Math.PI)) * 6 : 0)
      s.petHop = Math.max(0, s.petHop - dt)
      g.fillStyle = 'rgba(15,23,42,.15)'; g.beginPath(); g.ellipse(s.petX, gy + 7, 8, 2, 0, 0, Math.PI * 2); g.fill()
      drawStill(g, P.current.pet || 'pet_fox', s.petX - 12, gy + 9 - Math.round(hop) - (Math.floor(now / 400) % 2), 24)
      s.heroFlash = Math.max(0, s.heroFlash - dt)
      if (s.levelGlow > 0) {
        g.fillStyle = `rgba(253,224,71,${(s.levelGlow / 1700) * 0.3})`
        g.fillRect(Math.round(hx) + 8, 0, 48, gy)
        s.levelGlow -= dt
      }
      // slash arc on the hit frame, coloured by the weapon tier
      if (attacking && t > 980 && t < 1180) {
        const hit = ev && ev.type === 'hit'
        g.strokeStyle = hit ? wcol : 'rgba(255,255,255,.8)'
        g.lineWidth = hit ? 4 : 2
        g.beginPath(); g.arc(hx + 40, gy - 30, 30, -1.2, 0.9); g.stroke()
        if (hit && P.current.storm && ev.amount >= 5000) { g.beginPath(); g.arc(hx + 46, gy - 26, 24, 0.9, -1.2, true); g.stroke() }
      }

      // projectiles
      s.proj = s.proj.filter((p) => {
        p.t += dt
        const k = Math.min(1, p.t / p.dur)
        const x = p.x + (p.tx - p.x) * k, y = p.y + (p.ty - p.y) * k - (p.kind === 'arrow' ? Math.sin(k * Math.PI) * 10 : 0)
        if (p.kind === 'arrow') { g.strokeStyle = '#78350f'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 10, y + 1); g.lineTo(x, y); g.stroke(); g.fillStyle = '#e2e8f0'; g.fillRect(Math.round(x), Math.round(y) - 1, 3, 3) }
        else {
          const r = p.kind === 'meteor' ? 7 : p.kind === 'spark' ? 3 : 5
          g.fillStyle = p.kind === 'spark' ? '#bae6fd' : '#f97316'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
          g.fillStyle = p.kind === 'spark' ? '#ffffff' : '#fde047'; g.beginPath(); g.arc(x, y, r * 0.5, 0, Math.PI * 2); g.fill()
          if (Math.random() < 0.8) s.fx.push({ x, y, vx: -Math.random(), vy: Math.random() - 0.5, life: 300, c: p.kind === 'spark' ? '#e0f2fe' : '#fb923c', z: 2, g: 0 })
        }
        if (k >= 1) {
          s.flash = Math.max(s.flash, p.kind === 'spark' || p.kind === 'arrow' ? 90 : 220); s.shake = Math.max(s.shake, p.kind === 'meteor' ? 12 : 3)
          const n = p.kind === 'meteor' ? 40 : p.kind === 'fireball' ? 22 : 8
          for (let i = 0; i < n; i++) s.fx.push({ x: p.tx, y: p.ty, vx: Math.random() * 4 - 2, vy: -Math.random() * 3, life: 600, c: p.kind === 'spark' ? '#bae6fd' : i % 2 ? '#fde047' : '#f97316', z: 2 })
          if (p.amount) addFloat(privacy ? '+MANA' : `+${money(p.amount, { decimals: false })} ลงทุน`, p.tx - 10, p.ty - 30, 'gold')
          else if (p.kind === 'arrow') addFloat('ฟิ้ว!', p.tx, p.ty - 26, 'block')
          return false
        }
        return true
      })

      s.fx = s.fx.filter((p) => (p.life -= dt) > 0)
      for (const p of s.fx) { p.x += p.vx; p.y += p.vy; p.vy += p.g ?? 0.12; g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.z, p.z) }

      s.drops = s.drops.filter((d) => (d.life -= dt) > 0)
      for (const d of s.drops) {
        d.x += d.vx; d.y += d.vy; d.vy += 0.18
        if (d.y > gy - 2) { d.y = gy - 2; d.vy *= -0.45; d.vx *= 0.7 }
        g.fillStyle = '#b45309'; g.fillRect(Math.round(d.x) - 2, Math.round(d.y) - 2, 5, 5)
        g.fillStyle = Math.floor(now / 120 + d.x) % 3 ? '#fbbf24' : '#fef08a'; g.fillRect(Math.round(d.x) - 1, Math.round(d.y) - 3, 4, 4)
      }
      const wx = P.current.weather
      if (wx === 'rain' || wx === 'storm') {
        g.fillStyle = wx === 'storm' ? 'rgba(186,230,253,.75)' : 'rgba(186,230,253,.55)'
        for (const d of drops) { d[1] += dt * 0.32 * d[2]; d[0] -= dt * 0.05; if (d[1] > H) { d[1] = -6; d[0] = Math.random() * (W + 40) } if (d[0] < -4) d[0] = W; g.fillRect(Math.round(d[0]), Math.round(d[1]), 1, 5) }
        if (wx === 'storm') {
          g.fillStyle = 'rgba(30,41,59,.18)'; g.fillRect(-10, -10, W + 20, H + 20)
          if (Math.random() < dt / 7000) s.bolt = 220
          if (s.bolt > 0) { g.fillStyle = `rgba(255,255,255,${s.bolt / 500})`; g.fillRect(-10, -10, W + 20, H + 20); s.bolt -= dt }
        }
      } else if (wx === 'leaves') {
        for (const d of drops.slice(0, 18)) { d[1] += dt * 0.03 * d[2]; d[0] += Math.sin(now / 500 + d[2] * 9) * 0.5 - 0.15; if (d[1] > gy) { d[1] = -4; d[0] = Math.random() * W } g.fillStyle = d[2] > 1 ? '#f59e0b' : '#ea580c'; g.fillRect(Math.round(d[0]), Math.round(d[1]), 2, 2) }
      }
      if (sky.night > 0.2 && wx !== 'rain' && wx !== 'storm') {
        for (const d of drops.slice(0, 10)) { const fx = (d[0] + Math.sin(now / 900 + d[2] * 7) * 12) % W, fy = gy - 20 - (d[1] % 60); if (Math.sin(now / 300 + d[2] * 11) > 0) { g.fillStyle = '#fef08a'; g.fillRect(Math.round(fx), Math.round(fy), 2, 2) } }
      }
      if (fog > 0.02) {
        for (let i = 0; i < 4; i++) {
          const fx = ((now / (40 + i * 15)) + i * 100) % (W + 160) - 80
          g.fillStyle = `rgba(148,130,180,${fog * 0.5})`
          g.fillRect(Math.round(fx), gy - 44 + i * 6, 92, 8); g.fillRect(Math.round(fx) + 16, gy - 50 + i * 6, 60, 6)
        }
      }
      if (sky.night) { g.fillStyle = `rgba(15,23,60,${sky.night * 0.85})`; g.fillRect(-10, -10, W + 20, H + 20) }
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
  const live = narr && narr.until > Date.now() ? narr : null
  const cap = live ? live.text : captions.length ? captions[capIdx % captions.length] : null

  return (
    <div className="select-none">
      <div className="relative overflow-hidden touch-manipulation" style={{ aspectRatio: `${W}/${H}` }} onPointerDown={onTap}>
        <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full" style={{ imageRendering: 'pixelated' }} />
        {hud && (
          <div className="absolute inset-x-0 top-0 p-2 flex justify-between items-start gap-2 pointer-events-none">
            <div className="px-box"><div className="px-font text-[10px] leading-none">LV.{level}</div></div>
            {previewTier != null ? (
              <div className="px-box"><div className="text-[11px] font-semibold">ตัวอย่าง: {previewName}</div></div>
            ) : shown ? (
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
        {bubble && (
          <div key={bubble.id} className={`px-bubble ${bubble.who}`} style={{ left: `${Math.min(80, Math.max(16, (bubble.x / W) * 100))}%`, top: `${Math.max(14, (bubble.y / H) * 100)}%` }}>{bubble.text}</div>
        )}
        {banner && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className={`px-banner ${banner.cls}`}>
              <div className="px-font text-sm md:text-base">{banner.text}</div>
              {banner.sub && <div className="text-xs font-semibold mt-0.5">{banner.sub}</div>}
            </div>
          </div>
        )}
      </div>
      {cap && <div className="px-narr" data-testid="narr"><span className="tx" key={live ? live.id : capIdx}>{cap}</span></div>}
    </div>
  )
}
