/**
 * Accent colour ("สีหลัก"): drives buttons, the + button, the hero card, active tabs, chips,
 * links, toggles and progress bars. Gains/losses and income/expense keep their own green/red.
 * Applied as CSS variables on <html>; any two colours work because the derived shades are
 * clamped for contrast (white text on the gradient, readable link colour on white and on dark).
 */
export const ACCENTS = [
  { id: 'emerald', name: 'มรกต-ฟ้า', a: ['#10b981', '#0ea5e9'] },
  { id: 'ocean', name: 'ฟ้า-คราม', a: ['#0ea5e9', '#6366f1'] },
  { id: 'grape', name: 'ม่วง-ชมพู', a: ['#8b5cf6', '#ec4899'] },
  { id: 'sunset', name: 'ส้ม-ทอง', a: ['#f97316', '#eab308'] },
  { id: 'rose', name: 'กุหลาบ', a: ['#e11d48', '#f472b6'] },
  { id: 'leaf', name: 'ใบไม้', a: ['#16a34a', '#84cc16'] },
  { id: 'gold', name: 'ทองคำ', a: ['#b45309', '#f59e0b'] },
  { id: 'lagoon', name: 'น้ำทะเล', a: ['#0891b2', '#2dd4bf'] },
  { id: 'coffee', name: 'กาแฟ', a: ['#78350f', '#c2884d'] },
  { id: 'mono', name: 'ขาวดำ', a: ['#0f172a', '#64748b'] },
]
export const DEFAULT_ACCENT = 'emerald'

const hex = (h) => { const s = h.replace('#', ''); const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) }
const toHex = (c) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('')
const lum = (c) => { const [r, g, b] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t)
const WHITE = [255, 255, 255], BLACK = [0, 0, 0], NIGHT = [19, 29, 49]
/** step c toward `to` until contrast with `bg` reaches `min` */
const push = (c, to, bg, min) => { let x = c; for (let i = 0; i < 40 && contrast(x, bg) < min; i++) x = mix(x, to, 0.06); return x }

export function deriveAccent(a1h, a2h) {
  const a1 = hex(a1h), a2 = hex(a2h)
  // gradient stops dark enough for white text (3:1, large/bold UI text)
  const g1 = push(a1, BLACK, WHITE, 2.6), g2 = push(a2, BLACK, WHITE, 2.6)
  const mid = mix(g1, g2, 0.5)
  const ink = push(mix(a1, a2, 0.35), BLACK, WHITE, 4.6) // links/selected chips on white
  const hi = push(mix(a1, a2, 0.35), WHITE, NIGHT, 6) // on dark backgrounds
  const rgba = (c, o) => `rgba(${c.map(Math.round).join(',')},${o})`
  return {
    '--ac1': toHex(g1), '--ac2': toHex(g2), '--ac-mid': toHex(mid), '--ac-ink': toHex(ink), '--ac-hi': toHex(hi),
    '--ac-soft': rgba(mid, 0.12), '--ac-glow1': rgba(a1, 0.1), '--ac-glow2': rgba(a2, 0.1),
    '--ac-shadow1': rgba(g2, 0.5), '--ac-shadow2': rgba(g1, 0.45), '--ac-btn-shadow': rgba(mid, 0.28),
  }
}

/** settings.accent is a preset id or { custom: [hex, hex] } */
export function accentColors(acc) {
  if (acc && typeof acc === 'object' && Array.isArray(acc.custom)) return acc.custom
  return (ACCENTS.find((p) => p.id === acc) || ACCENTS[0]).a
}

const LS = 'vault:accent'
export function applyAccent(acc) {
  const [a, b] = accentColors(acc)
  const vars = deriveAccent(a, b)
  const st = document.documentElement.style
  for (const [k, v] of Object.entries(vars)) st.setProperty(k, v)
  try { localStorage.setItem(LS, JSON.stringify(acc ?? DEFAULT_ACCENT)) } catch { /* private mode */ }
  return vars
}
/** before first paint, from the last-used value */
export function applySavedAccent() {
  try { applyAccent(JSON.parse(localStorage.getItem(LS) || 'null') || DEFAULT_ACCENT) } catch { applyAccent(DEFAULT_ACCENT) }
}
