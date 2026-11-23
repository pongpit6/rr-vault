import { useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw, Play, Volume2 } from './px'
import { speak, canSpeak } from '../lib/vocab'

/* Writing practice with stroke order. Stroke data: Japanese from KanjiVG (CC BY-SA 3.0),
 * Chinese from Make Me a Hanzi (Arphic Public License), Korean jamo written for this app. */
const LOAD = { ja: () => import('../data/strokes/ja.js'), zh: () => import('../data/strokes/zh.js'), ko: () => import('../data/strokes/ko.js') }
const cache = {}
export async function loadStrokes(lang) {
  if (!cache[lang]) cache[lang] = LOAD[lang]?.().then((m) => m.default).catch(() => ({}))
  return cache[lang] || {}
}
export const CREDIT = { ja: 'ลำดับขีด: KanjiVG (CC BY-SA 3.0)', zh: 'ลำดับขีด: Make Me a Hanzi (Arphic Public License)', ko: 'ลำดับขีด: เขียนตามหลักมาตรฐาน (บนลงล่าง ซ้ายไปขวา)' }

const N = 24
/** sample a path at N points along its length */
function samplePath(d) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  p.setAttribute('d', d); svg.appendChild(p); svg.style.position = 'absolute'; svg.style.width = '0'; document.body.appendChild(svg)
  const L = p.getTotalLength(), pts = []
  for (let i = 0; i < N; i++) { const q = p.getPointAtLength((L * i) / (N - 1)); pts.push([q.x, q.y]) }
  svg.remove()
  return { pts, len: L }
}
/** resample a drawn polyline at N points */
function resample(raw) {
  const seg = [0]
  for (let i = 1; i < raw.length; i++) seg.push(seg[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]))
  const L = seg[seg.length - 1] || 1, out = []
  for (let k = 0, j = 0; k < N; k++) {
    const t = (L * k) / (N - 1)
    while (j < seg.length - 2 && seg[j + 1] < t) j++
    const a = raw[j], b = raw[Math.min(j + 1, raw.length - 1)], f = seg[j + 1] > seg[j] ? (t - seg[j]) / (seg[j + 1] - seg[j]) : 0
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
  }
  return { pts: out, len: L }
}
const meanDist = (a, b) => a.reduce((s, p, i) => s + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0) / a.length

/** grade one drawn stroke against the expected one: shape, place and direction */
function gradeStroke(drawn, want) {
  if (drawn.length < 2) return { ok: false, why: 'ลากให้ยาวกว่านี้' }
  const u = resample(drawn), w = samplePath(want)
  const fwd = meanDist(u.pts, w.pts), back = meanDist(u.pts, [...w.pts].reverse())
  const tol = Math.max(11, Math.min(16, w.len * 0.25))
  if (w.len < 14) { // a dot or a short tick: start near its start, end near its end
    const ok = Math.hypot(u.pts[0][0] - w.pts[0][0], u.pts[0][1] - w.pts[0][1]) < 16 && Math.hypot(u.pts[N - 1][0] - w.pts[N - 1][0], u.pts[N - 1][1] - w.pts[N - 1][1]) < 18
    return { ok, why: ok ? '' : 'ขีดสั้นนี้ยังไม่ตรงตำแหน่ง' }
  }
  if (back < fwd && back < tol) return { ok: false, why: 'ทิศทางกลับด้าน ลองเริ่มจากจุดสีแดง' }
  if (fwd > tol) return { ok: false, why: 'รูปขีดหรือตำแหน่งยังไม่ตรง' }
  if (u.len < w.len * 0.45) return { ok: false, why: 'ขีดสั้นไป' }
  return { ok: true }
}

/**
 * Trace a character stroke by stroke over a faint copy.
 * props: lang, it ({ch, read, ro, hook, say}), onPass(stars)
 */
export function WritePad({ lang, it, onPass }) {
  const [strokes, setStrokes] = useState(null)
  const [done, setDone] = useState(0)
  const [cur, setCur] = useState(null) // points being drawn
  const [msg, setMsg] = useState('')
  const [miss, setMiss] = useState(0)
  const [demo, setDemo] = useState(-1) // stroke index being shown, -1 = none
  const svg = useRef(null), drawing = useRef(null), fails = useRef(0)
  useEffect(() => { let on = true; loadStrokes(lang).then((d) => on && setStrokes(d[it.ch] || [])); setDone(0); setMiss(0); setMsg(''); fails.current = 0; return () => { on = false } }, [lang, it.ch])
  const S = strokes || []
  const finished = S.length > 0 && done >= S.length
  const starts = useMemo(() => S.map((d) => { const m = /M\s*([\d.-]+)[ ,]+([\d.-]+)/.exec(d); return m ? [+m[1], +m[2]] : [0, 0] }), [S])

  const pt = (e) => { const r = svg.current.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 109, ((e.clientY - r.top) / r.height) * 109] }
  const down = (e) => { if (finished || !S.length) return; e.preventDefault(); svg.current.setPointerCapture?.(e.pointerId); drawing.current = [pt(e)]; setCur(drawing.current) }
  const move = (e) => { if (!drawing.current) return; drawing.current = [...drawing.current, pt(e)]; setCur(drawing.current) }
  const up = () => {
    const d = drawing.current; drawing.current = null; setCur(null)
    if (!d || finished) return
    const g = gradeStroke(d, S[done])
    if (g.ok) {
      const n = done + 1; setDone(n); setMsg(''); fails.current = 0
      if (n >= S.length) { const stars = miss === 0 ? 3 : miss <= 2 ? 2 : 1; setMsg(`เขียนครบ ${S.length} ขีด! ${'★'.repeat(stars)}`); onPass?.(stars) }
    } else {
      setMiss((m) => m + 1); fails.current++
      setMsg(`ขีดที่ ${done + 1}: ${g.why}`)
      if (fails.current >= 2) playDemo(done, done)
    }
  }
  const playDemo = (from = 0, to = S.length - 1) => {
    let k = from
    const step = () => { setDemo(k); k++; if (k <= to) setTimeout(step, 700); else setTimeout(() => setDemo(-1), 800) }
    step()
  }
  const reset = () => { setDone(0); setMiss(0); setMsg(''); fails.current = 0 }

  if (strokes && !S.length) return <div className="text-sm text-slate-400 text-center py-6">ตัวนี้ยังไม่มีข้อมูลลำดับขีด</div>
  return (
    <div className="space-y-2" data-testid="write-pad">
      <div className="grid sm:grid-cols-[1fr_200px] gap-3 items-start">
        <svg ref={svg} viewBox="0 0 109 109" className="w-full max-w-[340px] mx-auto aspect-square bg-white border-2 border-slate-800 touch-none select-none"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-testid="write-canvas">
          <path d="M54.5 0V109M0 54.5H109" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth=".6" fill="none" />
          {S.map((d, i) => <path key={`g${i}`} d={d} fill="none" stroke="#94a3b8" strokeOpacity=".28" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />)}
          {S.slice(0, done).map((d, i) => <path key={`d${i}`} d={d} fill="none" stroke="#0f172a" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />)}
          {demo >= 0 && <path key={`demo${demo}`} d={S[demo]} fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" strokeDasharray="1" className="stroke-demo" />}
          {!finished && starts[done] && <g><circle cx={starts[done][0]} cy={starts[done][1]} r="4" fill="#ef4444" /><text x={starts[done][0] + 5} y={starts[done][1] - 4} fontSize="7" fill="#ef4444" fontWeight="bold">{done + 1}</text></g>}
          {cur && <polyline points={cur.map((p) => p.join(',')).join(' ')} fill="none" stroke="#1e293b" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        <div className="text-sm space-y-1.5">
          <div className="text-4xl font-bold">{it.ch}</div>
          <div className="text-sky-700 font-semibold">อ่านว่า {it.read} {it.ro && <span className="text-slate-400 text-xs">({it.ro})</span>}</div>
          {it.hook && <div className="text-slate-600 text-xs">💡 {it.hook}</div>}
          <div className="text-xs text-slate-500">ทั้งหมด {S.length} ขีด · เขียนแล้ว {Math.min(done, S.length)}</div>
          <div className="flex gap-1.5 flex-wrap">
            <button className="px-btn !py-1 text-xs" onClick={() => playDemo()} data-testid="write-demo"><Play size={13} /> ดูวิธีเขียน</button>
            <button className="px-btn !py-1 text-xs" onClick={reset}><RotateCcw size={13} /> เขียนใหม่</button>
            {canSpeak() && <button className="px-btn !py-1 text-xs" onClick={() => speak(it.say || it.ch, lang)}><Volume2 size={13} /></button>}
          </div>
        </div>
      </div>
      <div className={`text-sm min-h-5 ${finished ? 'text-emerald-700 font-bold' : 'text-rose-600'}`} data-testid="write-msg">{msg || (S.length ? 'เริ่มที่จุดสีแดง ลากตามลำดับขีด' : 'กำลังโหลด…')}</div>
      <div className="text-[10px] text-slate-400">{CREDIT[lang]}</div>
    </div>
  )
}
