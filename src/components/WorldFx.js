/**
 * Living-world effects for the town canvas (half-res coordinates, ground line G).
 * back(): behind buildings — clouds, aurora, shooting stars, birds, hall flag colours.
 * front(): over buildings — rain/storm/fog, fireflies, butterflies, bloom, gloom, festival dressing.
 * Deterministic from `now`, so no state is kept between frames.
 */
import { prop } from './propArt'
const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h) }
const hash = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x) }

export const RANK_FLAG = { novice: '#94a3b8', saver: '#10b981', sage: '#8b5cf6', legend: '#fbbf24' }

export function worldBack(g, now, { w, G, night, world }) {
  if (!world) return
  const wx = world.weather
  // cloud deck: more and darker with cloud/rain/storm/gloom
  const dense = wx === 'storm' || world.mood === 'gloom' ? 9 : wx === 'rain' ? 7 : wx === 'cloud' || world.mood === 'cloudy' ? 6 : 0
  if (dense) {
    const col = wx === 'storm' || world.mood === 'gloom' ? (night ? '#1e293b' : '#64748b') : night ? '#334155' : '#cbd5e1'
    for (let i = 0; i < dense; i++) { const x = ((now / (300 + i * 20) + i * 83) % (w + 60)) - 40; const y = 6 + (i % 4) * 9; R(g, col, x, y, 26, 4); R(g, col, x + 5, y - 2, 14, 2); R(g, col, x + 9, y + 4, 12, 2) }
  }
  // aurora: 7 no-spend days in a row
  if (world.aurora && night) {
    for (let i = 0; i < 5; i++) {
      const y0 = 8 + i * 5
      g.fillStyle = ['rgba(74,222,128,.22)', 'rgba(45,212,191,.2)', 'rgba(167,139,250,.18)', 'rgba(74,222,128,.16)', 'rgba(56,189,248,.14)'][i]
      for (let x = 0; x < w; x += 3) { const y = y0 + Math.sin(now / 900 + x / 18 + i) * 4; g.fillRect(x, Math.round(y), 3, 7) }
    }
  }
  // shooting star every ~20 s at night
  if (night && !dense) { const k = (now / 20000) % 1; if (k < 0.12) { const x = w * 0.2 + (hash(Math.floor(now / 20000)) * w * 0.6) + k * 160, y = 6 + k * 60; R(g, '#fff', x, y, 2, 1); R(g, 'rgba(255,255,255,.5)', x - 6, y - 3, 6, 1) } }
  // birds by day (none in rain), bats at night
  if (!dense && wx !== 'rain' && wx !== 'storm') {
    const n = night ? 2 : 4, col = night ? '#0f172a' : '#1e293b'
    for (let i = 0; i < n; i++) { const x = ((now / (90 + i * 15) + i * 140) % (w + 30)) - 15, y = 18 + i * 8 + Math.sin(now / 400 + i) * 3, f = Math.floor(now / 160 + i) % 2; R(g, col, x, y + f, 2, 1); R(g, col, x + 2, y, 2, 1); R(g, col, x + 4, y + f, 2, 1) }
  }
}

export function worldFront(g, now, { w, G, TH, night, world, hx, hallTop }) {
  if (!world) return
  const wx = world.weather
  // rank flag on the hall
  if (world.rank) {
    const c = RANK_FLAG[world.rank] || RANK_FLAG.novice, fy = hallTop - 14
    const fl = { novice: 'pr_flag_s', saver: 'pr_flag_g', sage: 'pr_flag_p', legend: 'pr_flag_y' }[world.rank] || 'pr_flag_s'
    if (!prop(g, fl, hx + 40, fy + 15, 16)) {
      R(g, '#1e293b', hx + 44, fy, 1, 14); const wave = Math.floor(now / 250) % 2
      R(g, c, hx + 45, fy + wave, 7, 4); R(g, c, hx + 45, fy + 1 + wave, 5, 1)
      if (world.rank === 'legend') R(g, '#fff', hx + 47, fy + 1 + wave, 1, 1)
    }
  }
  // golden tree of saving, right of the hall: grows with lifetime saving
  if (world.tree > 0) {
    const x = hx + 62, lv = world.tree, h = 6 + lv * 3
    const tz = 12 + lv * 4
    if (prop(g, lv >= 3 ? 'pr_gtree_l' : 'pr_gtree_s', x - tz / 2, G + 1, tz)) { if (Math.sin(now / 250 + lv) > 0.6) R(g, '#fff', x - 2 + (Math.floor(now / 700) % 5), G - tz + 4, 1, 1) } else {
    R(g, '#92400e', x, G - h, 2, h)
    const leaf = night ? '#ca8a04' : '#fbbf24', leaf2 = night ? '#a16207' : '#fde68a'
    R(g, leaf, x - lv - 2, G - h - 4 - lv, 6 + lv * 2, 6 + lv)
    R(g, leaf2, x - lv, G - h - 3 - lv, 2 + lv, 2)
    if (Math.sin(now / 250 + lv) > 0.6) R(g, '#fff', x + 1 + (Math.floor(now / 700) % 3), G - h - 2 - lv, 1, 1)
    }
    if (lv >= 3) for (let i = 0; i < lv; i++) { const k = (now / 2200 + i / lv) % 1; R(g, night ? '#ca8a04' : '#fbbf24', x - 2 + i * 2, G - h + k * h, 1, 1) }
  }
  // market sign: BTC mood
  if (world.btc === 'crash' || world.btc === 'pump') {
    const on = Math.floor(now / 350) % 2 === 0
    if (on) { g.fillStyle = world.btc === 'crash' ? 'rgba(244,63,94,.35)' : 'rgba(74,222,128,.35)'; g.fillRect(hx - 2, hallTop - 6, 54, 4) }
  }
  // double-date sale day: bunting with price tags across the street
  if (world.sale) {
    for (let x = 0; x < w; x += 18) { const sag = Math.round(Math.sin((x / w) * Math.PI) * 4); if (!prop(g, 'pr_bunting', x, 30 + sag, 18)) R(g, Math.floor(x / 12) % 2 ? '#ef4444' : '#fbbf24', x, 22 + sag, 5, 5) }
    if (Math.floor(now / 600) % 2) { g.fillStyle = '#ef4444'; g.font = 'bold 6px monospace'; g.fillText(`SALE ${world.sale}`, w / 2 - 18, 34) }
  }
  // BTC cycle: a travelling merchant with a SALE sign near the bottom of the cycle, a watchtower flag near the top
  if (world.cycle === 'bottom') {
    const x = 4, bob = Math.floor(now / 400) % 2
    if (prop(g, 'pr_salecart', x - 2, G + 18 - bob, 26)) { /* PixelLab cart */ } else {
    R(g, '#92400e', x, G - 10, 22, 7); R(g, '#b45309', x, G - 12, 22, 2)            // cart
    R(g, '#1e293b', x + 3, G - 3, 4, 3); R(g, '#1e293b', x + 15, G - 3, 4, 3)          // wheels
    R(g, '#fbbf24', x + 4, G - 14, 3, 2); R(g, '#fbbf24', x + 10, G - 15, 3, 3); R(g, '#f97316', x + 16, G - 14, 3, 2) // coins on the cart
    R(g, '#78350f', x + 24, G - 26, 1, 16)                                              // sign pole
    R(g, '#dc2626', x + 19, G - 31 + bob, 13, 7); g.fillStyle = '#fff'; g.font = 'bold 5px monospace'; g.fillText('SALE', x + 20, G - 26 + bob)
    }
  } else if (world.cycle === 'top' || world.cycle === 'warm') {
    const x = w - 16, wave = Math.floor(now / 220) % 2, c = world.cycle === 'top' ? '#dc2626' : '#f59e0b'
    if (!prop(g, world.cycle === 'top' ? 'pr_tower_r' : 'pr_tower_o', x - 18, G + 1, 34)) { R(g, '#57534e', x, G - 30, 8, 30); R(g, '#78716c', x - 2, G - 32, 12, 3)            // tower
    R(g, '#1c1917', x + 3, G - 24, 2, 3); R(g, '#1c1917', x + 3, G - 14, 2, 3)          // windows
    R(g, '#1e293b', x + 4, G - 44, 1, 12); R(g, c, x + 5, G - 44 + wave, 7, 4); R(g, c, x + 5, G - 43 + wave, 5, 1) } // flag
    if (world.cycle === 'top' && Math.floor(now / 500) % 2) { g.fillStyle = 'rgba(220,38,38,.25)'; g.fillRect(x - 4, G - 48, 16, 6) }
  }
  // bloom: flowers along the street when saving is on track
  if (world.mood === 'bloom') for (let i = 0; i < w / 9; i++) { const x = 6 + i * 9 + hash(i) * 4, c = ['#f472b6', '#fde047', '#fb7185', '#c084fc'][i % 4]; R(g, '#16a34a', x, G + 1, 1, 2); R(g, c, x, G + (Math.sin(now / 600 + i) > 0.5 ? -1 : 0), 2, 2) }
  // butterflies by day in calm/bloom weather, fireflies at night
  if (!night && (wx === 'sun' || wx === 'leaves') && world.mood !== 'gloom') for (let i = 0; i < 3; i++) { const x = ((now / 60 + i * 190 + Math.sin(now / 300 + i) * 20) % (w + 20)) - 10, y = G - 14 - Math.abs(Math.sin(now / 350 + i)) * 12, f = Math.floor(now / 120 + i) % 2; R(g, ['#f97316', '#fde047', '#a78bfa'][i], x - f, y, 2, 2); R(g, ['#f97316', '#fde047', '#a78bfa'][i], x + 2 + f, y, 2, 2) }
  if (night && wx !== 'rain' && wx !== 'storm') for (let i = 0; i < 12; i++) { if (Math.sin(now / 400 + i * 1.7) < 0.2) continue; const x = (hash(i) * w + Math.sin(now / 1500 + i) * 10 + w) % w, y = G - 4 - hash(i, 1) * 30 + Math.sin(now / 900 + i) * 3; R(g, '#fef08a', x, y, 1, 1) }
  // rain / storm
  if (wx === 'rain' || wx === 'storm') {
    g.fillStyle = wx === 'storm' ? 'rgba(186,230,253,.9)' : 'rgba(186,230,253,.75)'
    for (let i = 0; i < 110; i++) { const x = (hash(i) * w + hash(i, 2) * 40) % w, y = ((hash(i, 3) * TH) + now / 4) % TH; g.fillRect(Math.round(x - y * 0.1), Math.round(y), 1, 6) }
    if (wx === 'storm') { g.fillStyle = 'rgba(30,41,59,.2)'; g.fillRect(0, 0, w, TH); if (hash(Math.floor(now / 700)) > 0.85 && (now % 700) < 120) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, w, TH) } }
    // puddles on the street
    for (let i = 0; i < w / 40; i++) { const x = 20 + i * 40 + hash(i, 4) * 20; g.fillStyle = 'rgba(186,230,253,.25)'; g.fillRect(x, G + 8 + (i % 2) * 5, 10, 1) }
  }
  if (wx === 'fog') { g.fillStyle = `rgba(226,232,240,${0.28 + Math.sin(now / 2000) * 0.06})`; g.fillRect(0, G - 40, w, 60) }
  if (world.mood === 'gloom') { g.fillStyle = 'rgba(51,65,85,.14)'; g.fillRect(0, 0, w, TH) }
  // festivals
  const ev = world.event
  if (ev === 'newyear' || ev === 'xmas' || ev === 'cny' || ev === 'loy') {
    // lantern string across the street
    const lan = ev === 'cny' ? 'pr_lantern_r' : ev === 'loy' ? 'pr_lantern_y' : 'pr_lights', step = lan === 'pr_lights' ? 24 : 26
    for (let x = 6; x < w - 6; x += step) { const sw = lan === 'pr_lights' ? 0 : Math.round(Math.sin(now / 700 + x) * 1); if (night) { g.fillStyle = 'rgba(253,224,71,.16)'; g.beginPath(); g.arc(x + step / 2 - 4, G - 58, 6, 0, 7); g.fill() } /* soft round glow, not a box */ if (!prop(g, lan, x + sw, G - (lan === 'pr_lights' ? 52 : 50), lan === 'pr_lights' ? 22 : 14)) { R(g, '#334155', x, G - 44, 14, 1) } }
  }
  if (ev === 'newyear' && night) for (let i = 0; i < 3; i++) { const k = ((now / 1600) + i / 3) % 1, cx = w * (0.25 + i * 0.25), cy = 30 - i * 6; if (k < 0.5) R(g, '#fde047', cx, 70 - k * 80, 1, 2); else for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2, r = (k - 0.5) * 40; R(g, ['#f472b6', '#fde047', '#7dd3fc'][i], cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2) } }
  if (ev === 'songkran') for (let i = 0; i < 14; i++) { const k = (now / 900 + i / 14) % 1, x = 30 + hash(i) * (w - 60); R(g, 'rgba(125,211,252,.9)', x + k * 14, G - 10 - Math.sin(k * Math.PI) * 18, 2, 2) }
  if (ev === 'loy') {
    // Loy Krathong in town: a krathong stall, tables of krathongs and lotus pots along the street, sky lanterns drifting up
    prop(g, 'pr_krathong_stall', Math.round(w * 0.14), G + 17, 24)
    prop(g, 'pr_flower_stand', Math.round(w * 0.43), G + 15, 15)
    for (const [k, fx] of [[0, 0.3], [1, 0.55], [2, 0.8]]) prop(g, k === 1 ? 'pr_lotus_pot' : 'pr_krathong_table', Math.round(w * fx), G + 15, 14)
    const n = night ? 7 : 3
    for (let i = 0; i < n; i++) { const k = (now / 26000 + i / n) % 1, x = (hash(i, 7) * w + Math.sin(now / 1800 + i) * 6 + k * 30) % w, y = G - 20 - k * (G - 10); g.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1; if (night) { g.fillStyle = 'rgba(253,186,116,.18)'; g.fillRect(Math.round(x) - 2, Math.round(y) - 12, 13, 14) } prop(g, 'pr_khomloi', x, y, 9 - Math.round(k * 3)); g.globalAlpha = 1 }
  }
  if (ev === 'xmas') { const x = w - 64; if (!prop(g, 'pr_xmas', x, G + 1, 30)) { R(g, '#92400e', x + 5, G - 4, 2, 4); for (let i = 0; i < 5; i++) R(g, '#15803d', x + i, G - 6 - i * 3, 12 - 2 * i, 3) } else for (let i = 0; i < 5; i++) if (Math.floor(now / 300 + i) % 3 === 0) R(g, ['#fde047', '#ef4444', '#7dd3fc'][i % 3], x + 9 + (i * 7) % 12, G - 8 - (i * 5) % 16, 1, 1) }
  if (ev === 'phansa') for (let i = 0; i < 3; i++) { const x = 40 + i * 70; if (!prop(g, 'pr_candle', x - 7, G + 1, 18)) R(g, '#fde047', x, G - 18, 1, 6); if (Math.floor(now / 500 + i) % 2) R(g, '#fff7ed', x + 1, G - 18, 1, 1) }
  if (ev === 'payday') for (let i = 0; i < 3; i++) { const x = w - 108 + i * 28; if (!prop(g, 'pr_stall', x, G + 1, 26)) { R(g, '#92400e', x, G - 8, 1, 8); R(g, '#92400e', x + 9, G - 8, 1, 8) } }
  // holiday: shop signs "closed"
  if (world.holiday) R(g, '#f43f5e', hx + 20, G - 9, 7, 2)
}
