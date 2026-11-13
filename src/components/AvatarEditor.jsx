import { useEffect, useRef, useState } from 'react'
import { Camera, Check, RotateCcw } from 'lucide-react'
import { Sheet, Button, Label } from './ui'

/** Pick an image, drag to position, slider to zoom → 320×320 JPEG data URL. */
export default function AvatarEditor({ open, onClose, onSave, onReset }) {
  const [img, setImg] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const drag = useRef(null)
  const fileRef = useRef(null)
  const BOX = 260

  useEffect(() => { if (open) { setImg(null); setZoom(1); setPos({ x: 0, y: 0 }) } }, [open])

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const im = new Image()
    im.onload = () => { setImg(im); setZoom(1); setPos({ x: 0, y: 0 }) }
    im.src = url
  }

  const base = img ? BOX / Math.min(img.width, img.height) : 1
  const scale = base * zoom
  const w = img ? img.width * scale : 0, h = img ? img.height * scale : 0
  const clamp = (p) => ({ x: Math.min(0, Math.max(BOX - w, p.x)), y: Math.min(0, Math.max(BOX - h, p.y)) })
  const centered = img ? clamp({ x: (BOX - w) / 2 + pos.x, y: (BOX - h) / 2 + pos.y }) : { x: 0, y: 0 }

  const down = (e) => { drag.current = { sx: e.clientX, sy: e.clientY, p: pos }; e.currentTarget.setPointerCapture(e.pointerId) }
  const move = (e) => { if (!drag.current) return; const d = drag.current; setPos({ x: d.p.x + e.clientX - d.sx, y: d.p.y + e.clientY - d.sy }) }
  const up = () => {
    drag.current = null
    // normalise pos so it stays inside bounds
    const c = centered
    setPos({ x: c.x - (BOX - w) / 2, y: c.y - (BOX - h) / 2 })
  }

  const save = () => {
    const out = 320, k = out / BOX
    const cv = document.createElement('canvas'); cv.width = cv.height = out
    const ctx = cv.getContext('2d')
    ctx.drawImage(img, centered.x * k, centered.y * k, w * k, h * k)
    onSave(cv.toDataURL('image/jpeg', 0.86))
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="เปลี่ยนรูปโปรไฟล์"
      footer={<div className="flex gap-2">
        <Button variant="ghost" onClick={() => { onReset(); onClose() }}><RotateCcw size={16} /> รูปเริ่มต้น</Button>
        <Button className="flex-1" disabled={!img} onClick={save}><Check size={18} /> ใช้รูปนี้</Button>
      </div>}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="flex flex-col items-center">
        <div
          className="relative rounded-full overflow-hidden bg-slate-50 border border-slate-200 touch-none cursor-grab active:cursor-grabbing"
          style={{ width: BOX, height: BOX }}
          onPointerDown={img ? down : undefined} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onClick={!img ? () => fileRef.current?.click() : undefined}
        >
          {img ? (
            <img src={img.src} alt="" draggable={false} className="absolute max-w-none select-none pointer-events-none" style={{ left: centered.x, top: centered.y, width: w, height: h }} />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-slate-500 text-sm">
              <div className="flex flex-col items-center gap-2"><Camera size={28} /> แตะเพื่อเลือกรูป</div>
            </div>
          )}
        </div>
        {img && (
          <div className="w-full mt-5">
            <Label>ซูม · ลากรูปเพื่อจัดตำแหน่ง</Label>
            <input type="range" className="slider" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </div>
        )}
        <Button variant="ghost" className="mt-4 !py-2 text-sm" onClick={() => fileRef.current?.click()}><Camera size={16} /> {img ? 'เลือกรูปอื่น' : 'เลือกรูปจากเครื่อง'}</Button>
      </div>
    </Sheet>
  )
}
