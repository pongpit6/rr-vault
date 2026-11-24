/**
 * RO-style damage numbers for the canvas scenes: chunky pixel digits with a gradient and a dark outline,
 * that pop in big, bounce up, drift and fade. Crits are bigger, gold, with a PixelLab starburst and a "CRITICAL" tag.
 * Glyphs are 5×7 bitmaps drawn in code (it is a font, not an object), every number is cached as a small canvas.
 */
// own tiny loader: importing BattleScene here would make an import cycle
const imgs = {}
function still(name) {
  if (typeof Image === 'undefined') return null
  if (!imgs[name]) { const im = new Image(); im.src = `./sprites/${name}.png`; imgs[name] = im }
  return imgs[name].complete && imgs[name].naturalWidth ? imgs[name] : null
}

const G = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00100', '01000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '฿': ['00100', '11110', '10101', '11110', '10101', '11110', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'], D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'], I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'], X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'], V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
}
/** colour ramps (top → bottom) per kind */
export const DMG_STYLE = {
  hit: { ramp: ['#ffffff', '#f1f5f9', '#cbd5e1'], line: '#0f172a', scale: 3 },
  crit: { ramp: ['#fff7ad', '#fde047', '#f59e0b', '#ea580c'], line: '#3b0a0a', scale: 4 },
  hurt: { ramp: ['#fecaca', '#f87171', '#dc2626'], line: '#2b0606', scale: 3 },
  heal: { ramp: ['#dcfce7', '#86efac', '#16a34a'], line: '#052e16', scale: 3 },
  gold: { ramp: ['#fef3c7', '#fcd34d', '#d97706'], line: '#3b2105', scale: 3 },
  sky: { ramp: ['#e0f2fe', '#7dd3fc', '#0284c7'], line: '#082f49', scale: 3 },
  tag: { ramp: ['#ffffff', '#fde68a'], line: '#7c2d12', scale: 2 },
}
const cache = {}
/** a text in pixel glyphs as a canvas (cached) */
export function dmgText(text, kind = 'hit') {
  const key = `${kind}|${text}`
  if (cache[key]) return cache[key]
  const st = DMG_STYLE[kind] || DMG_STYLE.hit, k = st.scale
  const chars = String(text).toUpperCase().split('').map((c) => G[c] || G[' '])
  const w = chars.reduce((s, g) => s + g[0].length + 1, 0) + 1, h = 9
  const c = document.createElement('canvas'); c.width = w * k; c.height = h * k
  const x = c.getContext('2d')
  const plot = (col, off) => {
    let cx = 1
    for (const g of chars) {
      for (let r = 0; r < 7; r++) for (let q = 0; q < g[r].length; q++) if (g[r][q] === '1') {
        x.fillStyle = col === 'ramp' ? st.ramp[Math.min(st.ramp.length - 1, Math.floor((r / 7) * st.ramp.length))] : col
        x.fillRect((cx + q) * k + off[0], (1 + r) * k + off[1], k, k)
      }
      cx += g[0].length + 1
    }
  }
  for (const off of [[-k, 0], [k, 0], [0, -k], [0, k], [-k, -k], [k, k], [-k, k], [k, -k]]) plot(st.line, off) // thick outline
  plot('ramp', [0, 0])
  return (cache[key] = c)
}
/** start a popup: { text, x, y, kind, delay } */
export function popDmg(list, text, x, y, kind = 'hit', delay = 0) {
  list.push({ text: String(text), x, y, kind, t: -delay, life: kind === 'crit' ? 1400 : 1100, vx: (Math.random() - 0.5) * 0.05, rot: (Math.random() - 0.5) * 0.08 })
}
/** advance and draw all popups (canvas pixels, origin top-left) */
export function drawDmg(g, list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]; p.t += dt
    if (p.t < 0) continue
    if (p.t > p.life) { list.splice(i, 1); continue }
    const k = p.t / p.life
    const pop = p.t < 140 ? 1.7 - (p.t / 140) * 0.7 : 1 // big pop-in, then settle
    const rise = p.t < 380 ? -(p.t / 380) * 34 + Math.sin((p.t / 380) * Math.PI) * -10 : -34 + ((p.t - 380) / 1000) * 10 // up, a small bounce, slow sink
    const im = dmgText(p.text, p.kind)
    // one glyph pixel = 1 canvas pixel (2 for crits), so the digits stay crisp and readable
    const st = DMG_STYLE[p.kind] || DMG_STYLE.hit, unit = (p.kind === 'crit' ? 2 : 1) / st.scale, s = pop * unit
    const w = im.width * s, h = im.height * s, cw = g.canvas.width
    const x = Math.max(w / 2 + 2, Math.min(cw - w / 2 - 2, p.x + p.vx * p.t)), y = Math.max(h / 2 + 12, p.y + rise)
    g.save(); g.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1
    if (p.kind === 'crit') {
      const star = still('fx_star')
      if (star) { const sz = Math.max(36, w * 1.05) + Math.sin(p.t / 60) * 3; g.globalAlpha *= 0.7; g.drawImage(star, Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz); g.globalAlpha /= 0.7 }
      const tag = dmgText('CRITICAL', 'tag'), tw = tag.width / 2, th = tag.height / 2
      g.drawImage(tag, Math.round(x - tw / 2), Math.round(y - h / 2 - th + 2), tw, th)
    }
    g.translate(Math.round(x), Math.round(y)); g.rotate(p.rot)
    g.imageSmoothingEnabled = false
    g.drawImage(im, Math.round(-w / 2), Math.round(-h / 2), Math.round(w), Math.round(h))
    g.restore()
  }
}
/** 12345 → "12,345" */
export const fmtDmg = (n) => Math.round(n).toLocaleString('en-US')
;['fx_star'].forEach(still)
