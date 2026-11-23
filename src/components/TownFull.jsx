import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TownScene from './TownScene'
import { X, Plus, Minus, ChevronLeft, ChevronRight } from './px'

/** Full-screen town. Tries real landscape (Android); otherwise turns the view sideways so the phone can be rotated by hand. */
export default function TownFull({ onClose, ...scene }) {
  const [vw, setVw] = useState({ w: innerWidth, h: innerHeight })
  const [zoom, setZoom] = useState(1)
  const stage = useRef(null), drag = useRef(null)
  const scroller = () => stage.current?.querySelector('.town-scroll')
  const pan = (dx) => { const el = scroller(); if (el) el.scrollLeft += dx }
  const step = (dir) => { const el = scroller(); if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' }) }
  useEffect(() => {
    const el = document.documentElement
    ;(async () => {
      try { if (el.requestFullscreen && !document.fullscreenElement) await el.requestFullscreen() } catch { /* not allowed */ }
      try { await screen.orientation?.lock?.('landscape') } catch { /* iPhone and desktop can't lock */ }
    })()
    const on = () => setVw({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on); screen.orientation?.addEventListener?.('change', on)
    const esc = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1) }
    addEventListener('keydown', esc)
    return () => { removeEventListener('resize', on); screen.orientation?.removeEventListener?.('change', on); removeEventListener('keydown', esc) }
  }, []) // eslint-disable-line
  const close = async () => {
    try { screen.orientation?.unlock?.() } catch { /* */ }
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* */ }
    onClose()
  }
  const sideways = vw.h > vw.w // still portrait: rotate the stage 90°
  const W = sideways ? vw.h : vw.w, H = sideways ? vw.w : vw.h
  const height = Math.round((H - 56) * zoom)
  return createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-950" data-testid="town-full">
      <div style={sideways ? { position: 'absolute', width: W, height: H, left: (vw.w - W) / 2, top: (vw.h - H) / 2, transform: 'rotate(90deg)' } : { position: 'absolute', inset: 0 }}>
        <div className="flex items-center gap-2 px-3 h-12 text-white">
          <div className="font-bold flex-1 truncate">เมืองของฉัน</div>
          <button className="w-9 h-9 grid place-items-center bg-white/10" onClick={() => setZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} aria-label="ซูมออก"><Minus size={20} /></button>
          <span className="text-xs w-9 text-center">{zoom}×</span>
          <button className="w-9 h-9 grid place-items-center bg-white/10" onClick={() => setZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))} aria-label="ซูมเข้า"><Plus size={20} /></button>
          <button className="w-9 h-9 grid place-items-center bg-white/10" onClick={close} aria-label="ปิด" data-testid="town-full-close"><X size={20} /></button>
        </div>
        <div ref={stage} className="relative overflow-auto town-full-stage select-none" style={{ height: H - 48, cursor: drag.current ? 'grabbing' : 'grab' }}
          // mouse: wheel and drag move left/right (touch keeps the phone's own swipe)
          onWheel={(e) => pan(e.deltaX + e.deltaY)}
          onPointerDown={(e) => { if (e.pointerType === 'mouse') drag.current = { x: e.clientX, y: e.clientY, moved: 0 } }}
          onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = sideways ? e.clientY - d.y : e.clientX - d.x; d.moved += Math.abs(dx); pan(-dx); d.x = e.clientX; d.y = e.clientY }}
          onPointerUp={() => { setTimeout(() => { drag.current = null }, 0) }} onPointerLeave={() => { drag.current = null }}
          onClickCapture={(e) => { if (drag.current?.moved > 6) { e.stopPropagation(); e.preventDefault() } }}>
          <TownScene {...scene} height={height} />
          <button className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center bg-slate-900/70" onClick={() => step(-1)} aria-label="เลื่อนซ้าย" data-testid="town-full-left"><ChevronLeft size={24} /></button>
          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center bg-slate-900/70" onClick={() => step(1)} aria-label="เลื่อนขวา" data-testid="town-full-right"><ChevronRight size={24} /></button>
        </div>
        <div className="text-[11px] text-slate-400 px-3 -mt-6 relative pointer-events-none">ลากเมาส์ / หมุนล้อเมาส์ / ปุ่มลูกศร ◀ ▶ เพื่อเลื่อนดูทั้งเมือง</div>
      </div>
    </div>,
    document.body,
  )
}
