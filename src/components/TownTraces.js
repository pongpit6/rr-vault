import { prop } from './propArt'
/**
 * "ร่องรอยวันนี้": what you did today leaves a small mark in town until midnight.
 * If the matching building exists the mark sits on it, otherwise a little prop appears beside the town hall.
 * Everything is drawn in half-res units on the town canvas (see TownScene).
 */

// trace → building that shows it
export const TRACE_HOME = { exercise: 'gym', read: 'library', meditate: 'temple', vocab: 'school', nocarb: 'kitchen', saved: 'bank' }

export const TRACE_INFO = {
  read: { emoji: '📖', text: 'อ่านหนังสือ' },
  exercise: { emoji: '💪', text: 'ออกกำลังกาย' },
  meditate: { emoji: '🧘', text: 'นั่งสมาธิ' },
  vocab: { emoji: '🔤', text: 'ท่องศัพท์' },
  nocarb: { emoji: '🥗', text: 'ไม่กินแป้ง' },
  sleep: { emoji: '😴', text: 'นอนพอ' },
  nospend: { emoji: '✨', text: 'ไม่ใช้เงิน' },
  saved: { emoji: '🐷', text: 'ออม/ลงทุน' },
  paid: { emoji: '⚔️', text: 'จ่ายหนี้' },
}

/** list of today's traces for chips: [{id, emoji, text}] */
export function traceList(tr) {
  if (!tr) return []
  return Object.keys(TRACE_INFO).filter((k) => (k === 'sleep' ? tr.sleep != null && tr.sleep >= 6 : tr[k])).map((k) => ({ id: k, ...TRACE_INFO[k] }))
}

/** marks on buildings (called inside the building's 1.5× transform, x = building left, G = ground) */
export function traceOnBuilding(g, type, x, G, now, night) {
  const R = (c, xx, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(xx), Math.round(y), w, h) }
  const blink = Math.floor(now / 400) % 2
  switch (type) {
    case 'gym': // orange pennant + sweat sparks
      if (!prop(g, 'pr_pennant', x + 30, G - 16 + blink, 14)) { R('#1e293b', x + 34, G - 30, 1, 14); R('#f97316', x + 35, G - 30 + blink, 6, 3); R('#fdba74', x + 35, G - 29 + blink, 3, 1) }
      for (let k = 0; k < 3; k++) { const p = (now / 700 + k / 3) % 1; R('#7dd3fc', x + 8 + k * 9, G - 26 - p * 8, 1, 1) }
      break
    case 'library': // warm reading lamp by the door + floating page
      g.fillStyle = 'rgba(253,224,71,.35)'; g.fillRect(x + 4, G - 22, 8, 8)
      prop(g, 'pr_lamp_r', x + 30, G + 1, 10)
      { const p = (now / 1600) % 1; if (!prop(g, 'pr_page', x + 20 + Math.sin(p * 6) * 2, G - 26 - p * 10, 8)) R('#fef3c7', x + 22 + Math.sin(p * 6) * 2, G - 30 - p * 10, 3, 2) }
      break
    case 'temple': // incense smoke + small flag
      for (let k = 0; k < 4; k++) { const p = (now / 1500 + k / 4) % 1; g.fillStyle = `rgba(226,232,240,${0.7 - p * 0.6})`; g.fillRect(x + 32 + Math.sin(p * 5 + k) * 2, G - 6 - p * 18, 1, 2) }
      if (!prop(g, 'pr_incense', x + 28, G + 1, 10)) R('#b45309', x + 32, G - 4, 2, 4)
      break
    case 'school': // "ABC" balloon
      { const b = Math.sin(now / 600) * 1.5; if (prop(g, 'pr_balloon', x + 22, G - 26 + b, 14)) break; R('#f43f5e', x + 26, G - 40 + b, 6, 6); R('#1e293b', x + 28, G - 34 + b, 1, 8); R('#fff', x + 27, G - 39 + b, 1, 1) }
      break
    case 'kitchen': // fresh veg basket at the door
      if (prop(g, 'pr_vegbasket', x + 29, G + 1, 10)) break
      R('#92400e', x + 30, G - 4, 7, 4); R('#16a34a', x + 31, G - 6, 2, 2); R('#ef4444', x + 33, G - 6, 2, 2); R('#f97316', x + 35, G - 5, 1, 1)
      break
    case 'bank': // coins stacking up by the door
      if (prop(g, 'pr_coins', x + 22, G + 1 - blink, 10)) break
      for (let k = 0; k < 3; k++) R(k % 2 ? '#f59e0b' : '#fbbf24', x + 24, G - 2 - k * 2 - (k === 2 ? blink : 0), 5, 2)
      break
    default: break
  }
  if (night) { g.fillStyle = 'rgba(253,224,71,.08)'; g.fillRect(x - 2, G - 40, 40, 40) }
}

/** stand-alone props in front of the hall when the building isn't built yet; returns how many were drawn */
export function traceProps(g, kinds, x0, G, now) {
  const R = (c, xx, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(xx), Math.round(y), w, h) }
  let x = x0
  for (const k of kinds) {
    const y = G + 8
    const PR = { exercise: 'pr_dumbbell', read: 'pr_books', meditate: 'pr_incense', vocab: 'pr_chalk', nocarb: 'pr_vegbasket', saved: 'pr_piggy', paid: 'pr_swordstone' }[k]
    if (PR && prop(g, PR, x - 2, y + 1, 12)) { if (k === 'meditate') for (let i = 0; i < 2; i++) { const p = (now / 1500 + i / 2) % 1; g.fillStyle = `rgba(226,232,240,${0.8 - p * 0.7})`; g.fillRect(Math.round(x + 4 + Math.sin(p * 5 + i)), Math.round(y - 10 - p * 10), 1, 2) } x += 13; continue }
    switch (k) {
      case 'exercise': R('#334155', x, y - 3, 8, 1); R('#1e293b', x - 1, y - 5, 2, 5); R('#1e293b', x + 7, y - 5, 2, 5); break
      case 'read': R('#1d4ed8', x, y - 2, 7, 2); R('#dc2626', x + 1, y - 4, 6, 2); R('#16a34a', x, y - 6, 7, 2); R('#fef3c7', x + 6, y - 6, 1, 6); break
      case 'meditate': R('#b45309', x + 2, y - 3, 3, 3); for (let i = 0; i < 3; i++) { const p = (now / 1500 + i / 3) % 1; g.fillStyle = `rgba(226,232,240,${0.8 - p * 0.7})`; g.fillRect(x + 3 + Math.sin(p * 5) * 1.5, y - 5 - p * 12, 1, 2) } break
      case 'vocab': R('#78350f', x, y - 7, 9, 7); R('#14532d', x + 1, y - 6, 7, 5); R('#fff', x + 2, y - 5, 1, 1); R('#fff', x + 4, y - 4, 2, 1); R('#fff', x + 6, y - 5, 1, 1); break
      case 'nocarb': R('#92400e', x, y - 3, 7, 3); R('#16a34a', x + 1, y - 5, 2, 2); R('#ef4444', x + 3, y - 5, 2, 2); R('#f97316', x + 5, y - 4, 1, 1); break
      case 'saved': R('#f9a8d4', x, y - 6, 8, 6); R('#ec4899', x + 7, y - 4, 2, 2); R('#1e293b', x + 2, y - 4, 1, 1); R('#fbbf24', x + 3, y - 8 - (Math.floor(now / 400) % 2), 2, 2); break
      case 'paid': R('#94a3b8', x + 3, y - 10, 1, 8); R('#64748b', x + 1, y - 4, 5, 1); R('#78716c', x, y - 2, 7, 2); if (Math.sin(now / 250) > 0.6) R('#fff', x + 3, y - 11, 1, 1); break
      default: continue
    }
    x += 12
  }
  return x - x0
}

/** golden sparkle path along the street on a no-spend day */
export function traceNoSpend(g, w, G, now) {
  for (let i = 0; i < 18; i++) {
    const x = ((i * 53 + now / 60) % w)
    if (Math.sin(now / 300 + i * 1.7) > 0.4) { g.fillStyle = i % 3 ? '#fde047' : '#fff7ed'; g.fillRect(Math.round(x), G + 4 + (i % 4) * 3, 1, 1) }
  }
}

/** hero's form today, drawn above the hero at full res (hx, top = head y) */
export function heroForm(g, form, hx, top, now) {
  const R = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h) }
  if (form === 'tired') { // drifting "z z"
    for (let k = 0; k < 2; k++) {
      const p = (now / 1400 + k / 2) % 1, x = hx + 22 + p * 10 + k * 4, y = top - 4 - p * 16
      g.globalAlpha = 1 - p; const zc = '#334155'; R(zc, x, y, 5, 1); R(zc, x + 3, y + 1, 1, 1); R(zc, x + 2, y + 2, 1, 1); R(zc, x + 1, y + 3, 1, 1); R(zc, x, y + 4, 5, 1); g.globalAlpha = 1
    }
  } else if (form === 'sharp') { // sparkles around the head
    for (let k = 0; k < 3; k++) if (Math.sin(now / 220 + k * 2.1) > 0.2) { const x = hx + 4 + k * 12, y = top - 2 - (k % 2) * 6; R('#fde047', x, y, 2, 2); R('#fff', x - 1, y + 0.5, 4, 1) }
  } else if (form === 'rest') { // a steaming cup
    if (!prop(g, 'pr_cup', hx + 24, top + 9, 10)) { R('#f8fafc', hx + 26, top + 2, 6, 5); R('#94a3b8', hx + 32, top + 3, 2, 2) }
    for (let k = 0; k < 2; k++) { const p = (now / 1200 + k / 2) % 1; g.fillStyle = `rgba(241,245,249,${0.9 - p * 0.8})`; g.fillRect(hx + 28 + k * 2 + Math.sin(p * 6), top - p * 10, 1, 2) }
  }
}

/** permanent growth: stage 2 = glow underfoot, stage 3 = rising aura + gold star (full-res coords, cx = centre, fy = feet) */
export function growthAura(g, cx, fy, stage, color, now, h = 40) {
  if (!stage || stage < 2) return
  g.save()
  g.globalAlpha = 0.35; g.fillStyle = color
  g.beginPath(); g.ellipse(cx, fy - 1, 15, 3.5, 0, 0, Math.PI * 2); g.fill()
  g.globalAlpha = 1
  if (stage >= 3) {
    for (let k = 0; k < 5; k++) {
      const p = (now / 1300 + k / 5) % 1
      g.globalAlpha = 1 - p; g.fillStyle = k % 2 ? color : '#fef08a'
      g.fillRect(Math.round(cx - 12 + k * 6 + Math.sin(p * 6 + k) * 2), Math.round(fy - 4 - p * h), 2, 2)
    }
    g.globalAlpha = 1
    if (Math.floor(now / 500) % 2) { g.fillStyle = '#facc15'; g.fillRect(cx - 1, fy - h - 8, 3, 3); g.fillStyle = '#fff'; g.fillRect(cx, fy - h - 7, 1, 1) }
  }
  g.restore()
}
