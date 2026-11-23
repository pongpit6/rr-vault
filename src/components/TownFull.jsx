import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TownScene from './TownScene'
import { X, Plus, Minus } from './px'

/** Full-screen town. Tries real landscape (Android); otherwise turns the view sideways so the phone can be rotated by hand. */
export default function TownFull({ onClose, ...scene }) {
  const [vw, setVw] = useState({ w: innerWidth, h: innerHeight })
  const [zoom, setZoom] = useState(1)
  useEffect(() => {
    const el = document.documentElement
    ;(async () => {
      try { if (el.requestFullscreen && !document.fullscreenElement) await el.requestFullscreen() } catch { /* not allowed */ }
      try { await screen.orientation?.lock?.('landscape') } catch { /* iPhone and desktop can't lock */ }
    })()
    const on = () => setVw({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on); screen.orientation?.addEventListener?.('change', on)
    const esc = (e) => e.key === 'Escape' && close()
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
        <div className="overflow-auto" style={{ height: H - 48 }}>
          <TownScene {...scene} height={height} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
