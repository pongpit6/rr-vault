import { useEffect } from 'react'
import { X, Undo2 } from 'lucide-react'
import { ICONS } from '../lib/icons'
import { money } from '../lib/format'
import { useStore, useProfile } from '../store'

export function Icon({ name, size = 18, className = '', strokeWidth = 1.8 }) {
  const C = ICONS[name] || ICONS.more
  return <C size={size} className={className} strokeWidth={strokeWidth} />
}

export function IconBadge({ name, color = '#10b981', size = 40, icon = 18, className = '' }) {
  return (
    <div
      className={`grid place-items-center shrink-0 rounded-2xl ${className}`}
      style={{ width: size, height: size, background: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <Icon name={name} size={icon} />
    </div>
  )
}

export function Money({ value, className = '', sign = false, decimals = true, colored = false }) {
  const privacy = useStore((s) => s.ui.privacy)
  const color = colored ? (value > 0 ? 'text-emerald-600' : value < 0 ? 'text-rose' : '') : ''
  return <span className={`num ${color} ${className}`}>{privacy ? '฿ ••••' : money(value, { sign, decimals })}</span>
}

export function Avatar({ size = 44, ring = true, className = '' }) {
  const profile = useProfile()
  const src = profile.avatar || './avatar.jpg'
  return (
    <div className={`rounded-full p-[2px] shrink-0 ${ring ? 'grad-bg' : ''} ${className}`} style={{ width: size, height: size }}>
      <img src={src} alt="avatar" className="w-full h-full rounded-full object-cover bg-slate-100 border-2 border-white" />
    </div>
  )
}

export function Sheet({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm anim-fade" onClick={onClose} />
      <div
        className={`relative w-full ${wide ? 'md:max-w-2xl' : 'md:max-w-lg'} max-h-[92dvh] flex flex-col bg-white border border-slate-200 rounded-t-[28px] md:rounded-[28px] shadow-2xl anim-sheet md:anim-pop`}
      >
        <div className="md:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-900/10" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2 md:pt-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-900/[.04] text-slate-600" aria-label="ปิด"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-4 flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-5 pb-safe border-t border-slate-200/70">{footer}</div>}
      </div>
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...p }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none'
  const v = {
    primary: 'grad-bg text-white shadow-lg shadow-emerald-500/20 hover:brightness-110',
    ghost: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm',
    danger: 'bg-rose/10 text-rose hover:bg-rose/20 border border-rose/20',
    subtle: 'text-slate-600 hover:text-slate-900 hover:bg-slate-900/[.04]',
  }[variant]
  return <button className={`${base} ${v} ${className}`} {...p}>{children}</button>
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex p-1 rounded-2xl bg-slate-900/[.04] border border-slate-200/70 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 px-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-600'}`}
          style={value === o.value && o.color ? { color: o.color } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({ value, color = 'grad-bg', className = '' }) {
  return (
    <div className={`h-2 rounded-full bg-slate-900/[.05] overflow-hidden ${className}`} style={{ background: '#eef2f6' }}>
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

export function Label({ children, className = '' }) {
  return <div className={`text-xs font-medium text-slate-500 mb-1.5 ${className}`}>{children}</div>
}

export function Toast() {
  const toast = useStore((s) => s.toast)
  const hide = useStore((s) => s.hideToast)
  if (!toast) return null
  return (
    <div className="fixed z-[60] left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top)+12px)] md:top-auto md:bottom-8 anim-pop w-max max-w-[92vw]">
      <div className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl bg-slate-900 text-slate-50 border border-slate-800 shadow-2xl text-sm">
        <span>{toast.text}</span>
        {toast.onUndo && (
          <button onClick={() => { toast.onUndo(); hide() }} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 font-semibold text-sky-300">
            <Undo2 size={15} /> ย้อนกลับ
          </button>
        )}
      </div>
    </div>
  )
}

export function Empty({ icon = 'sparkles', title, text, action }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <IconBadge name={icon} color="#38bdf8" size={56} icon={24} />
      <div className="mt-4 font-semibold">{title}</div>
      {text && <div className="mt-1 text-sm text-slate-500 max-w-xs">{text}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function IconPicker({ value, onChange, color, keys }) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {keys.map((k) => (
        <button key={k} onClick={() => onChange(k)}
          className={`aspect-square grid place-items-center rounded-xl transition ${value === k ? 'bg-slate-900/10 ring-2 ring-sky' : 'bg-slate-900/[.04] hover:bg-slate-900/[.06]'}`}
          style={value === k ? { color } : undefined}>
          <Icon name={k} size={18} />
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange, colors }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button key={c} onClick={() => onChange(c)} className={`w-8 h-8 rounded-full transition ${value === c ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-white scale-110' : ''}`} style={{ background: c }} />
      ))}
    </div>
  )
}
