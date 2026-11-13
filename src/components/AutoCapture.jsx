import { useState } from 'react'
import { Copy, Check, Smartphone, Apple, Send, KeyRound, Trash2, ShieldCheck } from 'lucide-react'
import { Sheet, Button, Segmented, Label } from './ui'
import { useStore } from '../store'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { makeToken } from '../lib/notify'

const HOOK = `${SUPABASE_URL}/functions/v1/vault-inbox`

function CopyBox({ value, label }) {
  const [ok, setOk] = useState(false)
  return (
    <div>
      {label && <Label>{label}</Label>}
      <button onClick={() => { navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500) }}
        className="w-full flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-left">
        <code className="flex-1 text-[11px] break-all text-slate-700">{value}</code>
        {ok ? <Check size={16} className="text-emerald-600 shrink-0" /> : <Copy size={16} className="text-slate-400 shrink-0" />}
      </button>
    </div>
  )
}

const Step = ({ n, children }) => (
  <li className="flex gap-3"><span className="w-6 h-6 shrink-0 rounded-full grad-bg text-white text-xs font-bold grid place-items-center">{n}</span><div className="text-sm text-slate-700 pt-0.5">{children}</div></li>
)

export default function AutoCapture({ open, onClose }) {
  const session = useStore((s) => s.session)
  const token = useStore((s) => s.ui.inboxToken)
  const setUi = useStore((s) => s.setUi)
  const showToast = useStore((s) => s.showToast)
  const syncNow = useStore((s) => s.syncNow)
  const [os, setOs] = useState(/iphone|ipad/i.test(navigator.userAgent) ? 'ios' : 'android')
  const [busy, setBusy] = useState(false)
  if (!open) return null
  const url = token ? `${HOOK}?t=${token}` : ''

  const create = async () => {
    setBusy(true)
    try {
      const { token: t, hash } = await makeToken()
      const { error } = await supabase.from('vault_tokens').insert({ token_hash: hash, label: navigator.userAgent.slice(0, 60) })
      if (error) throw error
      setUi({ inboxToken: t, inboxTokenHash: hash })
      showToast('สร้างลิงก์ส่วนตัวแล้ว')
    } catch (e) { showToast('สร้างไม่สำเร็จ: ' + (e.message || e)) }
    setBusy(false)
  }
  const revoke = async () => {
    if (!confirm('ยกเลิกลิงก์นี้? แอปที่ตั้งไว้จะส่งเข้ามาไม่ได้อีก')) return
    const hash = useStore.getState().ui.inboxTokenHash
    if (hash) await supabase.from('vault_tokens').delete().eq('token_hash', hash)
    setUi({ inboxToken: null, inboxTokenHash: null })
  }
  const test = async () => {
    setBusy(true)
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'ทดสอบ R.R. Vault', text: 'รายการเงินออก จำนวนเงิน 45.00 บาท ที่ร้าน ทดสอบระบบ', app: 'test' }) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      await syncNow()
      showToast('ส่งทดสอบสำเร็จ ดูในกล่องรอยืนยัน')
    } catch (e) { showToast('ทดสอบไม่สำเร็จ: ' + (e.message || e)) }
    setBusy(false)
  }

  return (
    <Sheet open onClose={onClose} title="บันทึกอัตโนมัติจากแจ้งเตือนธนาคาร" wide>
      {!session ? (
        <div className="text-sm text-slate-600">ต้องเข้าสู่ระบบก่อน (ตั้งค่า → เข้าสู่ระบบเพื่อซิงก์) เพื่อให้แจ้งเตือนส่งเข้าบัญชีของคุณได้</div>
      ) : !token ? (
        <div className="space-y-3">
          <div className="text-sm text-slate-600">ขั้นแรก สร้าง <b>ลิงก์ส่วนตัว</b> สำหรับส่งข้อความแจ้งเตือนเข้า Vault ของคุณ (เก็บเป็นความลับ ใครได้ลิงก์ไปจะส่งรายการเข้ามาได้)</div>
          <Button className="w-full" onClick={create} disabled={busy}><KeyRound size={18} /> สร้างลิงก์ส่วนตัว</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 space-y-2">
            <div className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5"><ShieldCheck size={16} /> ลิงก์ส่วนตัวของคุณ</div>
            <CopyBox value={url} />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 !py-2 text-sm" onClick={test} disabled={busy}><Send size={15} /> ส่งทดสอบ</Button>
              <Button variant="danger" className="!py-2 text-sm" onClick={revoke}><Trash2 size={15} /></Button>
            </div>
          </div>

          <Segmented value={os} onChange={setOs} options={[{ value: 'android', label: 'Android (อัตโนมัติ)' }, { value: 'ios', label: 'iPhone (แชร์ข้อความ)' }]} />

          {os === 'android' ? (
            <ol className="space-y-3">
              <Step n={1}>ติดตั้งแอป <b>MacroDroid</b> จาก Play Store (ฟรี)</Step>
              <Step n={2}>เปิด MacroDroid → <b>Add Macro</b> → Trigger: <b>Device Events → Notification → Notification Received</b> → เลือกแอป <b>LINE</b> → Text content: <b>Contains</b> ใส่ <code>บาท</code></Step>
              <Step n={3}>Actions: <b>Connectivity → HTTP Request</b> → Method <b>POST</b> → URL วางลิงก์ส่วนตัวด้านบน</Step>
              <Step n={4}>ในแท็บ <b>Body</b> เลือก Content type <b>application/json</b> แล้ววาง:
                <div className="mt-2"><CopyBox value={'{"title":"[not_title]","text":"[notification]","app":"[not_app_name]"}'} /></div>
                <div className="text-[11px] text-slate-500 mt-1">ค่าในวงเล็บเหลี่ยมคือข้อความแจ้งเตือนที่ MacroDroid ใส่ให้เอง ถ้าเวอร์ชันของคุณชื่อต่างไป ให้กดปุ่ม “...” ในช่อง Body แล้วเลือก Notification title / Notification text</div>
              </Step>
              <Step n={5}>ตั้งชื่อ Macro เช่น “Vault” แล้วกดบันทึก</Step>
              <Step n={6}><b>สำคัญสำหรับ Samsung:</b> ตั้งค่า → แอป → MacroDroid → แบตเตอรี่ → <b>ไม่จำกัด</b> และอนุญาต <b>การเข้าถึงการแจ้งเตือน</b> ไม่งั้นระบบอาจปิดแอปเบื้องหลัง</Step>
              <Step n={7}>ลองโอนเงิน หรือกด “ส่งทดสอบ” ด้านบน รายการจะเข้ามาที่ <b>กล่องรอยืนยัน</b> ภายในไม่กี่วินาที</Step>
            </ol>
          ) : (
            <ol className="space-y-3">
              <Step n={1}>เปิดแอป <b>คำสั่งลัด (Shortcuts)</b> → แตะ <b>+</b> สร้างคำสั่งใหม่ ตั้งชื่อ “ส่งเข้า Vault”</Step>
              <Step n={2}>แตะ <b>ⓘ</b> (รายละเอียด) → เปิด <b>แสดงในแผ่นแชร์ (Show in Share Sheet)</b> → ประเภทรับข้อมูลเลือก <b>ข้อความ (Text)</b></Step>
              <Step n={3}>เพิ่มการทำงาน <b>รับเนื้อหาของ URL (Get Contents of URL)</b> → วางลิงก์ส่วนตัวด้านบน → วิธี <b>POST</b> → เนื้อหาคำขอ <b>JSON</b> → เพิ่มฟิลด์ชื่อ <code>text</code> ค่าเป็น <b>Shortcut Input</b></Step>
              <Step n={4}>เวลาได้แจ้งเตือนใน LINE: <b>กดค้างที่ข้อความของธนาคาร → แชร์ → ส่งเข้า Vault</b> รายการจะเข้ากล่องรอยืนยันทันที</Step>
              <Step n={5}>หรือวิธีที่ง่ายที่สุด: <b>คัดลอกข้อความ</b> แล้วเปิด Vault → กล่องรอยืนยัน → <b>อ่านจากคลิปบอร์ด</b></Step>
            </ol>
          )}
          <div className="text-[11px] text-slate-400">ข้อความถูกส่งตรงเข้าฐานข้อมูล Supabase ของคุณเท่านั้น ไม่ผ่านบริการอื่น และต้องกดยืนยันทุกครั้งก่อนกลายเป็นรายการจริง</div>
        </div>
      )}
    </Sheet>
  )
}

export { Smartphone, Apple }
