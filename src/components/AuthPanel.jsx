import { useState } from 'react'
import { Mail, Lock, LogIn } from 'lucide-react'
import { Button, Segmented } from './ui'
import { supabase } from '../lib/supabase'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

export default function AuthPanel({ onDone }) {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const google = async () => {
    setBusy(true); setMsg(null)
    const redirectTo = window.location.origin + window.location.pathname
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
    if (error) { setMsg({ err: true, text: error.message }); setBusy(false) }
  }
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    const fn = mode === 'in'
      ? supabase.auth.signInWithPassword({ email, password: pw })
      : supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
    const { data, error } = await fn
    setBusy(false)
    if (error) return setMsg({ err: true, text: error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message })
    if (mode === 'up' && !data.session) return setMsg({ err: false, text: 'สมัครแล้ว กรุณายืนยันอีเมลที่ส่งไปให้ แล้วกลับมาเข้าสู่ระบบ' })
    onDone?.()
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" className="w-full !bg-white !text-slate-800 hover:!bg-slate-50" onClick={google} disabled={busy}>
        <GoogleMark /> เข้าสู่ระบบด้วย Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-slate-500"><div className="h-px flex-1 bg-slate-900/[.06]" />หรือใช้อีเมล<div className="h-px flex-1 bg-slate-900/[.06]" /></div>
      <Segmented value={mode} onChange={setMode} options={[{ value: 'in', label: 'เข้าสู่ระบบ' }, { value: 'up', label: 'สมัครใหม่' }]} />
      <form onSubmit={submit} className="space-y-2.5">
        <div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="field !pl-10" type="email" required placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="field !pl-10" type="password" required minLength={6} placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></div>
        <Button className="w-full" disabled={busy}><LogIn size={18} /> {mode === 'in' ? 'เข้าสู่ระบบ' : 'สมัครและซิงก์ข้อมูล'}</Button>
      </form>
      {msg && <div className={`text-sm rounded-xl px-3 py-2 ${msg.err ? 'bg-rose/10 text-rose' : 'bg-mint/10 text-emerald-600'}`}>{msg.text}</div>}
    </div>
  )
}
