/** Shared OCR helpers (tesseract.js Thai+English + jsQR), loaded lazily. */
import { parseSlipText } from './slip'

let workerP = null
const listeners = new Set()
export const onOcrProgress = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export async function getWorker() {
  if (!workerP) {
    workerP = (async () => {
      const T = (await import('tesseract.js')).default
      return T.createWorker(['tha', 'eng'], 1, { logger: (m) => listeners.forEach((f) => f(m)) })
    })()
  }
  return workerP
}

/** Loads an image Blob into a canvas (downscaled), reads any QR code, and makes a small thumbnail. */
export async function loadImage(blob) {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const max = 2000, k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, c.width, c.height)
    let qr = null
    try {
      const jsQR = (await import('jsqr')).default
      const d = ctx.getImageData(0, 0, c.width, c.height)
      qr = jsQR(d.data, c.width, c.height)?.data || null
    } catch { /* no QR */ }
    const t = document.createElement('canvas'); const tk = 160 / Math.max(c.width, c.height)
    t.width = Math.round(c.width * tk); t.height = Math.round(c.height * tk); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height)
    return { canvas: c, qr, thumb: t.toDataURL('image/jpeg', 0.6) }
  } finally { URL.revokeObjectURL(url) }
}

/** OCR one image → { text, items (parsed slips), thumb, qr } */
export async function readSlipImage(blob, ownerName = '') {
  const { canvas, qr, thumb } = await loadImage(blob)
  const w = await getWorker()
  const { data } = await w.recognize(canvas)
  let items = parseSlipText(data.text, ownerName)
  if (items.length === 1 && !items[0].ref && qr && qr.length < 120) items[0].ref = `qr:${qr}`
  return { text: data.text, items, thumb, qr }
}

export async function sha(blob) {
  const buf = await blob.arrayBuffer()
  const h = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
