import { useState } from 'react'
import { Copy, Check, Smartphone, Apple, Send, KeyRound, Trash2, ShieldCheck } from 'lucide-react'
import { Sheet, Button, Segmented, Label } from './ui'
import { useStore } from '../store'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { makeToken } from '../lib/notify'
import { useVault } from '../lib/useVault'
import { processInbox } from '../lib/autorecord'

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
  const put = useStore((s) => s.put)
  const { settings, accounts, categories } = useVault()
  const [rule, setRule] = useState(null)
  if (!open) return null
  const saveSettings = (patch) => put('settings', { ...(useStore.getState().items.settings?.data || settings), ...patch })
  const nonDebt = accounts.filter((a) => !a.archived && a.type !== 'loan')
  const Toggle = ({ on, onClick, title, sub }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 text-left">
      <div className="flex-1"><div className="text-sm font-medium">{title}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</div>
      <div className={`w-11 h-6 rounded-full p-0.5 transition shrink-0 ${on ? 'bg-mint' : 'bg-slate-900/10'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : ''}`} /></div>
    </button>
  )
  const modeBox = (
    <div className="space-y-2">
      <Toggle on={!!settings.autoRecord} onClick={() => { saveSettings({ autoRecord: !settings.autoRecord }); if (!settings.autoRecord) setTimeout(processInbox, 300) }}
        title="บันทึกทันที ไม่ต้องกดยืนยัน" sub="รายการจากแจ้งเตือนกลายเป็นรายการจริงเลย ร้านใหม่จะอยู่ในหมวด “ยังไม่ใส่หมวด” ให้ใส่ทีหลังรวดเดียว" />
      {settings.autoRecord && <Toggle on={settings.autoSplitIncome !== false} onClick={() => saveSettings({ autoSplitIncome: settings.autoSplitIncome === false })} title="แบ่งรายรับอัตโนมัติ" sub="เงินเข้าแบ่งเป็น หนี้ / ใช้ได้ / ลงทุน ตามที่ตั้งไว้" />}
      {settings.autoRecord && (
        <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
          <div className="text-sm font-medium">ธนาคารไหน เข้ากระเป๋าไหน</div>
          {['KBank', 'SCB', 'Krungthai', 'Krungsri', 'Bangkok Bank', 'ttb'].map((b) => (
            <div key={b} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0 text-slate-600">{b}</span>
              <select className="field !py-1.5 text-sm" value={settings.bankMap?.[b] || ''} onChange={(e) => saveSettings({ bankMap: { ...(settings.bankMap || {}), [b]: e.target.value || undefined } })}>
                <option value="">ค่าเริ่มต้น (เงินใช้ได้)</option>
                {nonDebt.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between"><div className="text-sm font-medium">กฎอัตโนมัติ</div><button onClick={() => setRule({ text: '', kind: 'expense', category: 'cat-food', account: '' })} className="text-xs text-sky-600">+ เพิ่มกฎ</button></div>
        <div className="text-xs text-slate-500 mb-2">ถ้าข้อความมีคำนี้ ให้บันทึกแบบนี้เสมอ (ระบบยังจำร้านที่คุณเคยเลือกหมวดให้เองด้วย)</div>
        {(settings.rules || []).map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-sm py-1.5 border-t border-slate-100">
            <span className="flex-1 truncate">“{r.text}” → {r.kind === 'transfer' ? `โอนไป ${accounts.find((a) => a.id === r.to)?.name}` : categories.find((c) => c.id === r.category)?.name}</span>
            <button onClick={() => saveSettings({ rules: settings.rules.filter((_, k) => k !== i) })} className="text-rose p-1"><Trash2 size={15} /></button>
          </div>
        ))}
        {rule && (
          <div className="mt-2 space-y-2 bg-slate-50 rounded-xl p-2.5">
            <input className="field !py-2 text-sm" placeholder="คำในข้อความ เช่น 7-ELEVEN, GRAB, ชื่อคนโอน" value={rule.text} onChange={(e) => setRule({ ...rule, text: e.target.value })} />
            <Segmented value={rule.kind} onChange={(kind) => setRule({ ...rule, kind, category: kind === 'income' ? 'cat-salary' : 'cat-food' })} options={[{ value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' }, { value: 'transfer', label: 'โอน' }]} />
            {rule.kind === 'transfer' ? (
              <select className="field !py-2 text-sm" value={rule.to || ''} onChange={(e) => setRule({ ...rule, to: e.target.value })}>
                <option value="">โอนไปกระเป๋า…</option>{nonDebt.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : (
              <select className="field !py-2 text-sm" value={rule.category} onChange={(e) => setRule({ ...rule, category: e.target.value })}>
                {categories.filter((c) => c.kind === (rule.kind === 'income' ? 'income' : 'expense') && c.id !== 'cat-uncat').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 !py-2 text-sm" onClick={() => setRule(null)}>ยกเลิก</Button>
              <Button className="flex-1 !py-2 text-sm" disabled={!rule.text.trim() || (rule.kind === 'transfer' && !rule.to)} onClick={() => { const r = { ...rule, text: rule.text.trim() }; saveSettings({ rules: [...(settings.rules || []), r] }); setRule(null) }}>บันทึกกฎ</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
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
        <div className="space-y-3">{modeBox}<div className="text-sm text-slate-600">การส่งแจ้งเตือนจากมือถืออัตโนมัติ ต้องเข้าสู่ระบบก่อน (ตั้งค่า → เข้าสู่ระบบเพื่อซิงก์) ระหว่างนี้วางข้อความหรืออ่านจากคลิปบอร์ดในหน้า “รายการ → รอยืนยัน” ได้</div></div>
      ) : !token ? (
        <div className="space-y-3">
          {modeBox}
          <div className="text-sm text-slate-600">ขั้นแรก สร้าง <b>ลิงก์ส่วนตัว</b> สำหรับส่งข้อความแจ้งเตือนเข้า Vault ของคุณ (เก็บเป็นความลับ ใครได้ลิงก์ไปจะส่งรายการเข้ามาได้)</div>
          <Button className="w-full" onClick={create} disabled={busy}><KeyRound size={18} /> สร้างลิงก์ส่วนตัว</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {modeBox}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 space-y-2">
            <div className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5"><ShieldCheck size={16} /> ลิงก์ส่วนตัวของคุณ</div>
            <CopyBox value={url} />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 !py-2 text-sm" onClick={test} disabled={busy}><Send size={15} /> ส่งทดสอบ</Button>
              <Button variant="danger" className="!py-2 text-sm" onClick={revoke}><Trash2 size={15} /></Button>
            </div>
          </div>

          <div className="text-sm font-semibold pt-2">ตั้งค่าตัวส่งแจ้งเตือนบนมือถือ</div>
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
