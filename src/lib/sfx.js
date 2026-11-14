/** Tiny 8-bit sound effects with Web Audio (no files). Off unless the user turns them on. */
import { useStore } from '../store'

let ctx = null
function ac() {
  if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C() }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}
function tone(freq, start, dur, type = 'square', vol = 0.06) {
  const a = ac(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + start)
  g.gain.setValueAtTime(vol, a.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur)
  o.connect(g).connect(a.destination)
  o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.02)
}
const SOUNDS = {
  save: () => { tone(660, 0, 0.07); tone(990, 0.07, 0.1) },
  coin: () => { tone(988, 0, 0.06); tone(1319, 0.06, 0.18) },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.12)),
  hit: () => { tone(180, 0, 0.08, 'sawtooth', 0.05); tone(120, 0.05, 0.1, 'sawtooth', 0.04) },
  click: () => tone(440, 0, 0.04, 'square', 0.03),
}
export function sfx(name) {
  try { if (useStore.getState().ui.sfx) SOUNDS[name]?.() } catch { /* audio blocked */ }
}
export const previewSfx = (name) => { try { SOUNDS[name]?.() } catch { /* audio blocked */ } }
