import { IconBadge, Money } from './ui'
import { TXN_KINDS } from '../lib/defaults'

export function txnVisual(t, catById, accById) {
  if (t.kind === 'transfer') return { icon: 'repeat', color: '#38bdf8', title: 'โอนระหว่างกระเป๋า', sub: `${accById[t.account]?.name || '?'} → ${accById[t.to]?.name || '?'}` }
  if (t.kind === 'payment') return { icon: 'shield', color: '#a78bfa', title: `ชำระ ${accById[t.to]?.name || 'หนี้'}`, sub: `จาก ${accById[t.account]?.name || '?'}` }
  if (t.kind === 'adjust') return { icon: 'scale', color: '#94a3b8', title: 'ปรับยอดให้ตรง', sub: accById[t.account]?.name || '' }
  const c = catById[t.category]
  let sub = accById[t.account]?.name || ''
  if (t.kind === 'income' && t.split) sub = 'แบ่งเข้า ' + Object.keys(t.split).filter((k) => t.split[k]).map((k) => accById[k]?.name).filter(Boolean).join(' · ')
  return { icon: c?.icon || 'more', color: c?.color || '#94a3b8', title: c?.name || TXN_KINDS[t.kind]?.label, sub }
}

export default function TxnRow({ t, catById, accById, onClick }) {
  const v = txnVisual(t, catById, accById)
  const signed = t.kind === 'income' ? t.amount : t.kind === 'expense' ? -t.amount : t.kind === 'adjust' ? t.amount : t.amount
  const neutral = t.kind === 'transfer' || t.kind === 'payment'
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-900/[.035] active:bg-slate-900/[.05] transition text-left">
      <IconBadge name={v.icon} color={v.color} size={42} icon={19} />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium truncate">{t.note || v.title}</div>
        <div className="text-xs text-slate-500 truncate">{t.note ? `${v.title} · ${v.sub}` : v.sub}</div>
      </div>
      <Money value={signed} sign={!neutral} colored={!neutral} className={`text-[15px] font-semibold ${neutral ? 'text-slate-600' : ''}`} />
    </button>
  )
}
