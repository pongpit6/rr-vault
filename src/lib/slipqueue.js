/**
 * Background slip pipeline → "รอยืนยัน" inbox.
 * Sources: (1) images uploaded by MacroDroid / iOS Shortcuts to the private `vault-slips` bucket,
 *          (2) images shared to the app from the gallery (Web Share Target, cached by the service worker).
 * Each slip becomes an inbox item { slip, thumb } that waits for the user's confirmation.
 */
import { create } from 'zustand'
import { useStore, selectList } from '../store'
import { supabase } from './supabase'
import { readSlipImage, sha } from './ocr'
import { looksLikeSlip, slipToP } from './slip'
import { parseNotification } from './notify'

export const useSlipQueue = create(() => ({ busy: false, done: 0, total: 0 }))
const SHARE_CACHE = 'vault-share'

/** Is this slip already a transaction, or already waiting in the inbox (e.g. from a LINE notification)? */
function findDupe(sl, items) {
  const txns = selectList(items, 'txn')
  if (sl.ref && txns.some((t) => t.slipRef === sl.ref)) return 'txn'
  const p = slipToP(sl)
  const when = p.time ? Date.parse(p.time) : null
  const close = (iso) => !when || !iso || Math.abs(Date.parse(iso) - when) < 20 * 60_000
  const kindOf = p.kind === 'exchange-in' ? 'transfer' : p.direction === 'in' ? 'income' : 'expense'
  if (txns.some((t) => t.date === sl.date && Math.abs((t.amount || 0) - sl.amount) < 0.01 && t.kind === kindOf && (t.fromInbox || t.fromSlip) && close(t.createdAt))) return 'txn'
  for (const it of selectList(items, 'inbox')) {
    if (it.slip) { if ((sl.ref && it.slip.ref === sl.ref) || (it.slip.date === sl.date && it.slip.time === sl.time && Math.abs(it.slip.amount - sl.amount) < 0.01)) return 'slip'; continue }
    const q = parseNotification(it.raw)
    if (q.amount && Math.abs(q.amount - sl.amount) < 0.01 && close(it.at)) return { notif: it.id }
  }
  return null
}

/** OCR one image and drop the slip(s) into the inbox. Returns number added. */
export async function ingestSlipBlob(blob, { source = 'share', at } = {}) {
  const st = useStore.getState()
  const owner = st.items.profile?.data?.name || ''
  const hash = (await sha(blob)).slice(0, 24)
  if (st.items[`slip-${hash}-0`]) return 0
  const r = await readSlipImage(blob, owner)
  if (!r.items.length || !looksLikeSlip(r.text)) return 0
  let n = 0
  r.items.forEach((x, k) => {
    const sl = { amount: x.amount, date: x.date || new Date().toISOString().slice(0, 10), time: x.time, ref: x.ref, direction: x.direction, counterparty: x.counterparty, bank: x.bank || 'KBank', text: x.text?.slice(0, 400) }
    const d = findDupe(sl, useStore.getState().items)
    if (d === 'txn' || d === 'slip') return
    if (d?.notif) st.remove(d.notif, { undo: false }) // slip has the richer data; keep one copy
    const raw = `สลิป ${sl.bank || ''} ${sl.direction === 'in' ? 'รับเงิน' : 'โอนเงิน'} ${sl.amount} บาท ${sl.counterparty || ''}`.trim()
    st.put('inbox', { id: `slip-${hash}-${k}`, raw, slip: sl, thumb: r.thumb, at: at || new Date().toISOString(), source })
    n++
  })
  return n
}

let running = false
/** Processes uploaded (server) and shared (local) slips. Safe to call often. */
export async function processSlipQueue() {
  if (running) return 0
  running = true
  let added = 0
  try {
    const st = useStore.getState()
    const pending = selectList(st.items, 'inbox').filter((x) => x.image && !x.slip)
    const shared = await sharedFiles()
    const total = pending.length + shared.length
    if (!total) return 0
    useSlipQueue.setState({ busy: true, done: 0, total })
    for (const it of pending) {
      try {
        const { data: blob, error } = await supabase.storage.from('vault-slips').download(it.image)
        if (error) throw error
        added += await ingestSlipBlob(blob, { source: 'upload', at: it.at })
        await supabase.storage.from('vault-slips').remove([it.image])
        useStore.getState().remove(it.id, { undo: false })
      } catch (e) {
        console.warn('slip download', e) // not signed in / offline → retry later; a missing file is dropped
        if (/not.?found|404/i.test(String(e?.message || e?.statusCode || ''))) useStore.getState().remove(it.id, { undo: false })
      }
      useSlipQueue.setState((s) => ({ done: s.done + 1 }))
    }
    for (const f of shared) {
      try { added += await ingestSlipBlob(f.blob, { source: 'share' }) } catch (e) { console.warn('slip share', e) }
      await f.drop()
      useSlipQueue.setState((s) => ({ done: s.done + 1 }))
    }
    if (added) useStore.getState().showToast(`อ่านสลิปแล้ว ${added} รายการ · รอยืนยัน`)
  } finally {
    running = false
    useSlipQueue.setState({ busy: false })
  }
  return added
}

async function sharedFiles() {
  if (!('caches' in window)) return []
  const c = await caches.open(SHARE_CACHE)
  const keys = await c.keys()
  const out = []
  for (const k of keys) { const res = await c.match(k); if (res) out.push({ blob: await res.blob(), drop: () => c.delete(k) }) }
  return out
}
