/**
 * Living-world effects for the town canvas (half-res coordinates, ground line G).
 * back(): behind buildings — clouds, aurora, shooting stars, birds, hall flag colours.
 * front(): over buildings — rain/storm/fog, fireflies, butterflies, bloom, gloom, festival dressing.
 * Deterministic from `now`, so no state is kept between frames.
 */
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
    R(g, '#1e293b', hx + 44, fy, 1, 14); const wave = Math.floor(now / 250) % 2
    R(g, c, hx + 45, fy + wave, 7, 4); R(g, c, hx + 45, fy + 1 + wave, 5, 1)
    if (world.rank === 'legend') R(g, '#fff', hx + 47, fy + 1 + wave, 1, 1)
  }
  // golden tree of saving, right of the hall: grows with lifetime saving
  if (world.tree > 0) {
    const x = hx + 62, lv = world.tree, h = 6 + lv * 3
    R(g, '#92400e', x, G - h, 2, h)
    const leaf = night ? '#ca8a04' : '#fbbf24', leaf2 = night ? '#a16207' : '#fde68a'
    R(g, leaf, x - lv - 2, G - h - 4 - lv, 6 + lv * 2, 6 + lv)
    R(g, leaf2, x - lv, G - h - 3 - lv, 2 + lv, 2)
    if (Math.sin(now / 250 + lv) > 0.6) R(g, '#fff', x + 1 + (Math.floor(now / 700) % 3), G - h - 2 - lv, 1, 1)
    if (lv >= 3) for (let i = 0; i < lv; i++) { const k = (now / 2200 + i / lv) % 1; R(g, leaf, x - 2 + i * 2, G - h + k * h, 1, 1) }
  }
  // market sign: BTC mood
  if (world.btc === 'crash' || world.btc === 'pump') {
    const on = Math.floor(now / 350) % 2 === 0
    if (on) { g.fillStyle = world.btc === 'crash' ? 'rgba(244,63,94,.35)' : 'rgba(74,222,128,.35)'; g.fillRect(hx - 2, hallTop - 6, 54, 4) }
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
    for (let x = 10; x < w - 10; x += 14) { const c = ev === 'cny' ? '#ef4444' : ev === 'xmas' ? ['#ef4444', '#22c55e', '#fde047'][(x / 14) % 3 | 0] : ev === 'loy' ? '#fde68a' : ['#fde047', '#f472b6', '#7dd3fc'][(x / 14) % 3 | 0]; R(g, '#334155', x, G - 44, 14, 1); R(g, c, x + 6, G - 44, 3, 4); if (night) { g.fillStyle = 'rgba(253,224,71,.15)'; g.fillRect(x + 3, G - 47, 9, 9) } }
  }
  if (ev === 'newyear' && night) for (let i = 0; i < 3; i++) { const k = ((now / 1600) + i / 3) % 1, cx = w * (0.25 + i * 0.25), cy = 30 - i * 6; if (k < 0.5) R(g, '#fde047', cx, 70 - k * 80, 1, 2); else for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2, r = (k - 0.5) * 40; R(g, ['#f472b6', '#fde047', '#7dd3fc'][i], cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2, 2) } }
  if (ev === 'songkran') for (let i = 0; i < 14; i++) { const k = (now / 900 + i / 14) % 1, x = 30 + hash(i) * (w - 60); R(g, 'rgba(125,211,252,.9)', x + k * 14, G - 10 - Math.sin(k * Math.PI) * 18, 2, 2) }
  if (ev === 'loy') { R(g, '#38bdf8', 0, G + 24, w, 8); for (let i = 0; i < w / 28; i++) { const x = (i * 28 + now / 90) % w, b = Math.sin(now / 500 + i) > 0 ? 1 : 0; R(g, '#16a34a', x, G + 25 - b, 5, 2); R(g, '#f472b6', x + 1, G + 23 - b, 3, 2); R(g, '#fde047', x + 2, G + 21 - b, 1, 2) } }
  if (ev === 'xmas') { const x = w - 60; R(g, '#92400e', x + 5, G - 4, 2, 4); for (let i = 0; i < 5; i++) R(g, '#15803d', x + i, G - 6 - i * 3, 12 - 2 * i, 3); for (let i = 0; i < 6; i++) if (Math.floor(now / 300 + i) % 3) R(g, ['#fde047', '#ef4444', '#7dd3fc'][i % 3], x + 2 + (i * 7) % 9, G - 7 - (i * 5) % 12, 1, 1); R(g, '#fde047', x + 5, G - 22, 2, 2) }
  if (ev === 'phansa') for (let i = 0; i < 3; i++) { const x = 40 + i * 70; R(g, '#fde047', x, G - 18 + (Math.floor(now / 500 + i) % 2), 1, 6); R(g, '#f97316', x, G - 20 + (Math.floor(now / 500 + i) % 2), 1, 2) }
  if (ev === 'payday') for (let i = 0; i < 3; i++) { const x = w - 100 + i * 24; R(g, '#92400e', x, G - 8, 1, 8); R(g, '#92400e', x + 9, G - 8, 1, 8); for (let q = 0; q < 10; q++) R(g, q % 2 ? '#f59e0b' : '#fff', x + q, G - 11, 1, 3); R(g, '#a3e635', x + 2, G - 5, 2, 2); R(g, '#f87171', x + 5, G - 5, 2, 2) }
  // holiday: shop signs "closed"
  if (world.holiday) R(g, '#f43f5e', hx + 20, G - 9, 7, 2)
}
