import { useEffect, useState } from 'react'
import { Delete, Fingerprint, Lock as LockIcon, Check } from 'lucide-react'
import { Avatar, Sheet, Button } from './ui'
import { useStore, useProfile } from '../store'

/** App lock is per-device: the PIN hash and passkey id live only in this browser. */
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export async function hashPin(pin, salt) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}:rr-vault`))
  return b64(d)
}

export async function bioAvailable() {
  try { return !!(window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())) } catch { return false }
}
export async function bioRegister() {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'R.R. Vault', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'vault-owner', displayName: 'Vault Owner' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    },
  })
  return b64(cred.rawId)
}
export async function bioVerify(id) {
  const r = await navigator.credentials.get({
    publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: unb64(id) }], userVerification: 'required', timeout: 60000 },
  })
  return !!r
}

function PinPad({ value, onChange, onDone, len = 6 }) {
  useEffect(() => {
    const k = (e) => {
      if (/^\d$/.test(e.key) && value.length < len) onChange(value + e.key)
      if (e.key === 'Backspace') onChange(value.slice(0, -1))
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [value, onChange, len])
  useEffect(() => { if (value.length === len) onDone(value) }, [value]) // eslint-disable-line
  return (
    <div className="w-full max-w-[280px] mx-auto">
      <div className="flex justify-center gap-3 mb-8">
        {Array.from({ length: len }, (_, i) => <span key={i} className={`w-3.5 h-3.5 rounded-full transition ${i < value.length ? 'grad-bg scale-110' : 'bg-slate-200'}`} />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((k, i) => k === '' ? <span key={i} /> : (
          <button key={i} onClick={() => k === 'del' ? onChange(value.slice(0, -1)) : value.length < len && onChange(value + k)}
            className="h-16 rounded-2xl bg-white border border-slate-200 shadow-sm text-2xl font-semibold active:scale-95 active:bg-slate-50 transition grid place-items-center">
            {k === 'del' ? <Delete size={22} className="text-slate-500" /> : k}
          </button>
        ))}
      </div>
    </div>
  )
}

export function LockScreen({ onUnlock }) {
  const lock = useStore((s) => s.ui.lock)
  const profile = useProfile()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  const tryBio = async () => { try { if (await bioVerify(lock.bio)) onUnlock() } catch { /* cancelled */ } }
  useEffect(() => { if (lock?.bio) tryBio() }, []) // eslint-disable-line
  const check = async (v) => {
    if ((await hashPin(v, lock.salt)) === lock.hash) onUnlock()
    else { setErr(true); setTimeout(() => { setErr(false); setPin('') }, 500) }
  }
  return (
    <div className="fixed inset-0 z-[100] bg-[#f5f7fa] flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <Avatar size={84} />
      <div className="mt-4 font-semibold">{profile.name} <span className="grad-text">Vault</span></div>
      <div className={`text-sm mt-1 mb-8 flex items-center gap-1.5 ${err ? 'text-rose' : 'text-slate-500'}`}><LockIcon size={14} /> {err ? 'PIN ไม่ถูกต้อง' : 'ใส่ PIN เพื่อปลดล็อก'}</div>
      <div className={err ? 'animate-[shake_.4s]' : ''}><PinPad value={pin} onChange={setPin} onDone={check} len={lock.len || 6} /></div>
      {lock.bio && <button onClick={tryBio} className="mt-6 flex items-center gap-2 text-sky-600 font-medium"><Fingerprint size={22} /> ใช้ Face ID / ลายนิ้วมือ</button>}
    </div>
  )
}

export function LockSettings({ open, onClose }) {
  const lock = useStore((s) => s.ui.lock)
  const setUi = useStore((s) => s.setUi)
  const showToast = useStore((s) => s.showToast)
  const [stage, setStage] = useState('menu')
  const [first, setFirst] = useState('')
  const [pin, setPin] = useState('')
  const [bioOk, setBioOk] = useState(false)
  useEffect(() => { if (open) { setStage(lock?.enabled ? 'menu' : 'new'); setPin(''); setFirst(''); bioAvailable().then(setBioOk) } }, [open]) // eslint-disable-line
  if (!open) return null

  const onPin = async (v) => {
    if (stage === 'new') { setFirst(v); setPin(''); setStage('confirm'); return }
    if (stage === 'confirm') {
      if (v !== first) { showToast('PIN ไม่ตรงกัน ลองใหม่'); setPin(''); setStage('new'); return }
      const salt = b64(crypto.getRandomValues(new Uint8Array(12)))
      setUi({ lock: { enabled: true, salt, hash: await hashPin(v, salt), len: 6, bio: lock?.bio || null } })
      showToast('ตั้ง PIN เรียบร้อย'); setStage('menu'); setPin('')
    }
  }
  const enableBio = async () => {
    try { const id = await bioRegister(); setUi({ lock: { ...lock, bio: id } }); showToast('เปิดใช้ Face ID / ลายนิ้วมือแล้ว') }
    catch { showToast('เปิดใช้ไม่สำเร็จ หรือถูกยกเลิก') }
  }

  return (
    <Sheet open onClose={onClose} title="ล็อกแอป">
      {stage === 'menu' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex gap-2"><Check size={18} /> เปิดล็อกด้วย PIN อยู่ แอปจะล็อกเมื่อเปิดใหม่ หรือออกไปนานกว่า 1 นาที</div>
          {bioOk && !lock?.bio && <Button variant="ghost" className="w-full" onClick={enableBio}><Fingerprint size={18} /> เปิดใช้ Face ID / ลายนิ้วมือ</Button>}
          {lock?.bio && <Button variant="ghost" className="w-full" onClick={() => setUi({ lock: { ...lock, bio: null } })}><Fingerprint size={18} /> ปิด Face ID / ลายนิ้วมือ</Button>}
          <Button variant="ghost" className="w-full" onClick={() => { setStage('new'); setPin('') }}>เปลี่ยน PIN</Button>
          <Button variant="danger" className="w-full" onClick={() => { setUi({ lock: null }); showToast('ปิดล็อกแอปแล้ว'); onClose() }}>ปิดการล็อก</Button>
          <div className="text-[11px] text-slate-500">ล็อกนี้ตั้งแยกในแต่ละเครื่อง (มือถือ/คอม ตั้งได้คนละ PIN)</div>
        </div>
      )}
      {(stage === 'new' || stage === 'confirm') && (
        <div className="py-2">
          <div className="text-center text-sm text-slate-600 mb-6">{stage === 'new' ? 'ตั้ง PIN 6 หลัก' : 'ใส่ PIN อีกครั้งเพื่อยืนยัน'}</div>
          <PinPad value={pin} onChange={setPin} onDone={onPin} len={6} />
        </div>
      )}
    </Sheet>
  )
}
