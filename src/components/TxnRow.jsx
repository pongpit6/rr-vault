import { useRef, useState } from 'react'
import { Trash2, Copy } from 'lucide-react'
import { IconBadge, Money } from './ui'
import { todayISO } from '../lib/format'
import { AssetLogo, SubLogo } from './Logos'
import { TXN_KINDS } from '../lib/defaults'
import { useStore } from '../store'
import { assetLabel } from '../lib/portfolio'

const itemData = (id) => { const it = id && useStore.getState().items[id]; return it ? it.data : null }
const fmtQ = (q) => Number(q).toLocaleString(undefined, { maximumFractionDigits: Math.abs(Number(q)) < 1 ? 8 : 6 })

export function txnVisual(t, catById, accById) {
  if (t.kind === 'transfer') return { icon: 'repeat', color: '#38bdf8', title: 'โอนระหว่างกระเป๋า', sub: `${accById[t.account]?.name || '?'} → ${accById[t.to]?.name || '?'}` }
  if (t.kind === 'payment') return { icon: 'shield', color: '#a78bfa', title: `ชำระ ${accById[t.to]?.name || 'หนี้'}`, sub: `จาก ${accById[t.account]?.name || '?'}` }
  if (t.kind === 'adjust') return { icon: 'scale', color: '#94a3b8', title: 'ปรับยอดให้ตรง', sub: accById[t.account]?.name || '' }
  if (t.kind === 'trade') {
    const a = itemData(t.assetId)
    const label = a ? assetLabel(a) : 'สินทรัพย์'
    const unit = a?.source === 'thaigold' ? 'บาท' : a?.unit || ''
    const ccy = a?.currency === 'USD' ? '$' : '฿'
    return { asset: a, title: `${t.side === 'sell' ? 'ขาย' : 'ซื้อ'} ${label}`, sub: `${fmtQ(t.qty)} ${unit} @ ${ccy}${fmtQ(t.price)} · ${t.backfill ? 'บันทึกย้อนหลัง' : accById[t.account]?.name || ''}` }
  }
  const c = catById[t.category]
  let sub = accById[t.account]?.name || ''
  if (t.kind === 'income' && t.split) sub = 'แบ่งเข้า ' + Object.keys(t.split).filter((k) => t.split[k]).map((k) => accById[k]?.name).filter(Boolean).join(' · ')
  const subscription = t.subId ? itemData(t.subId) : null
  return { icon: c?.icon || 'more', color: c?.color || '#94a3b8', title: c?.name || TXN_KINDS[t.kind]?.label, sub, subscription }
}

let openRow = null // only one row revealed at a time

export default function TxnRow({ t, catById, accById, onClick }) {
  const v = txnVisual(t, catById, accById)
  const signed = t.kind === 'income' ? t.amount : t.kind === 'expense' ? -t.amount : t.kind === 'trade' ? (t.side === 'sell' ? t.amount : -t.amount) : t.amount
  const neutral = t.kind === 'transfer' || t.kind === 'payment' || t.kind === 'trade'
  const title = t.kind === 'trade' ? v.title : t.note || v.title
  const sub = t.kind === 'trade' ? v.sub : t.note ? `${v.title} · ${v.sub}` : v.sub
  const [dx, setDx] = useState(0)
  const drag = useRef(null)
  const W = 150
  const close = () => setDx(0)
  const onStart = (e) => { const p = e.touches[0]; drag.current = { x: p.clientX, y: p.clientY, base: dx, moved: false, cancel: false } }
  const onMove = (e) => {
    const d = drag.current; if (!d || d.cancel) return
    const p = e.touches[0], ddx = p.clientX - d.x, ddy = p.clientY - d.y
    if (!d.moved) { if (Math.abs(ddy) > Math.abs(ddx)) { d.cancel = true; return } if (Math.abs(ddx) < 6) return; d.moved = true; if (openRow && openRow !== close) openRow(); openRow = close }
    setDx(Math.max(-W, Math.min(0, d.base + ddx)))
  }
  const onEnd = () => { const d = drag.current; drag.current = null; if (!d || !d.moved) return; setDx((x) => (x < -W / 2 ? -W : 0)) }
  const act = (fn) => (e) => { e.stopPropagation(); close(); fn() }
  const del = () => useStore.getState().remove(t.id)
  const dup = () => { const { id, createdAt, inboxId, ...rest } = t; useStore.getState().put('txn', { ...rest, date: todayISO(), createdAt: new Date().toISOString() }); useStore.getState().showToast('ทำซ้ำรายการแล้ว (วันนี้)') }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {dx < 0 && <div className="absolute inset-y-0 right-0 flex" style={{ width: W }}>
        {t.kind !== 'adjust' && <button onClick={act(dup)} className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-sky-500 text-white text-[11px]"><Copy size={17} /> ทำซ้ำ</button>}
        <button onClick={act(del)} className="flex-1 flex flex-col items-center justify-center gap-0.5 bg-rose-500 text-white text-[11px]"><Trash2 size={17} /> ลบ</button>
      </div>}
      <button onClick={() => (dx ? close() : onClick())} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onTouchCancel={onEnd}
        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
        style={{ transform: `translateX(${dx}px)`, transition: drag.current?.moved ? 'none' : 'transform .2s' }}>
        {v.asset ? <AssetLogo asset={v.asset} size={42} /> : v.subscription ? <SubLogo sub={v.subscription} size={42} /> : <IconBadge name={v.icon} color={v.color} size={42} icon={19} />}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium truncate">{title}</div>
          <div className="text-xs text-slate-500 truncate">{sub}</div>
        </div>
        <Money value={signed} sign={!neutral || t.kind === 'trade'} colored={!neutral} className={`text-[15px] font-semibold ${neutral ? 'text-slate-600' : ''}`} />
      </button>
    </div>
  )
}
