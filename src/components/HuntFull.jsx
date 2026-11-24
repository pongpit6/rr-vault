/* the hunt scene on the whole screen (landscape; rotated when the phone is held upright) */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from './px'
import FarmScene from './FarmScene'

export default function HuntFull({ onClose, title, ...scene }) {
  const [vw, setVw] = useState({ w: innerWidth, h: innerHeight })
  useEffect(() => {
    const el = document.documentElement
    ;(async () => {
      try { if (el.requestFullscreen && !document.fullscreenElement) await el.requestFullscreen() } catch { /* not allowed */ }
      try { await screen.orientation?.lock?.('landscape') } catch { /* iPhone and desktop can't lock */ }
    })()
    const on = () => setVw({ w: innerWidth, h: innerHeight })
    const esc = (e) => { if (e.key === 'Escape') close() }
    addEventListener('resize', on); addEventListener('keydown', esc); screen.orientation?.addEventListener?.('change', on)
    return () => { removeEventListener('resize', on); removeEventListener('keydown', esc); screen.orientation?.removeEventListener?.('change', on) }
  }, []) // eslint-disable-line
  const close = async () => {
    try { screen.orientation?.unlock?.() } catch { /* */ }
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch { /* */ }
    onClose()
  }
  const sideways = vw.h > vw.w
  const W = sideways ? vw.h : vw.w, H = sideways ? vw.w : vw.h
  const sw = Math.min(W, Math.round(((H - 48) * 400) / 180)) // keep the scene's 400×180 shape
  return createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-950" data-testid="hunt-full">
      <div style={sideways ? { position: 'absolute', width: W, height: H, left: (vw.w - W) / 2, top: (vw.h - H) / 2, transform: 'rotate(90deg)' } : { position: 'absolute', inset: 0 }}>
        <div className="flex items-center gap-2 px-3 h-12 text-white">
          <div className="font-bold flex-1 truncate">{title}</div>
          <button className="w-9 h-9 grid place-items-center bg-white/10" onClick={close} aria-label="ปิด" data-testid="hunt-full-close"><X size={20} /></button>
        </div>
        <div className="mx-auto" style={{ width: sw }}><FarmScene {...scene} /></div>
      </div>
    </div>,
    document.body,
  )
}
