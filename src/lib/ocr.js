/** Slip reading in the browser: jsQR for the verification QR, tesseract.js (Thai+English) for the text. */
import { parseSlipText, parseSlipQR, looksLikeSlip } from './slip'

let workerP = null
const listeners = new Set()
export const onOcrProgress = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export async function getWorker() {
  if (!workerP) {
    workerP = (async () => {
      const T = (await import('tesseract.js')).default
      return T.createWorker(['tha', 'eng'], 1, { logger: (m) => listeners.forEach((f) => f(m)) })
    })().catch((e) => { workerP = null; throw e })
  }
  return workerP
}

/** Loads an image Blob into a canvas (max 1600px), reads the QR, makes a small thumbnail. */
export async function loadImage(blob) {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('เปิดรูปไม่ได้')); i.src = url })
    const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0, c.width, c.height)
    let qr = null
    try {
      const jsQR = (await import('jsqr')).default
      // the slip QR sits in the lower right — try that corner first (faster, fewer false hits), then the whole image
      const tryArea = (x, y, w, h) => { const d = ctx.getImageData(x, y, w, h); return jsQR(d.data, w, h, { inversionAttempts: 'dontInvert' })?.data || null }
      qr = tryArea(Math.round(c.width * 0.5), Math.round(c.height * 0.5), Math.round(c.width * 0.5), Math.round(c.height * 0.5)) || tryArea(0, 0, c.width, c.height)
    } catch { /* no QR */ }
    const t = document.createElement('canvas'); const tk = 200 / Math.max(c.width, c.height)
    t.width = Math.round(c.width * tk); t.height = Math.round(c.height * tk); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height)
    return { canvas: c, qr, thumb: t.toDataURL('image/jpeg', 0.7) }
  } finally { URL.revokeObjectURL(url) }
}

/** Black text on white: drops the embossed background picture of K PLUS slips, which ruins OCR. */
function binarize(src, cut = 135) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src, 0, 0)
  const d = ctx.getImageData(0, 0, c.width, c.height), p = d.data
  for (let i = 0; i < p.length; i += 4) {
    const v = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2] < cut ? 0 : 255
    p[i] = p[i + 1] = p[i + 2] = v
  }
  ctx.putImageData(d, 0, 0)
  return c
}

/** Fast look: QR only. Returns { qr: parsed QR info | null, thumb, canvas }. */
export async function peekSlip(blob) {
  const { canvas, qr, thumb } = await loadImage(blob)
  return { canvas, thumb, qrInfo: parseSlipQR(qr) }
}

/** Full read of one slip → { slip | null, thumb, qrInfo, text } */
export async function readSlip(blob, ownerName = '', peeked = null) {
  const { canvas, thumb, qrInfo } = peeked || await peekSlip(blob)
  const w = await getWorker()
  let { data } = await w.recognize(binarize(canvas))
  let slip = parseSlipText(data.text, ownerName, qrInfo)
  if (!slip || !slip.counterparty) { // retry on the untouched image (other banks / dark slips)
    const r2 = await w.recognize(canvas)
    const s2 = parseSlipText(r2.data.text, ownerName, qrInfo)
    if (s2 && (!slip || (s2.counterparty && !slip.counterparty))) { slip = s2; data = r2.data }
  }
  if (slip && !qrInfo && !looksLikeSlip(data.text)) slip = null
  return { slip, thumb, qrInfo, text: data.text }
}
