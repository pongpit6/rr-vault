import { useEffect, useRef, useState } from 'react'
import { Camera, Pencil, Eye, EyeOff, Cloud, LogOut, Download, Upload, Tag, ChevronRight, Plus, Trash2, Check, Smartphone, RefreshCw, TriangleAlert } from 'lucide-react'
import { Avatar, Button, Sheet, Label, IconBadge, IconPicker, ColorPicker, Segmented } from '../components/ui'
import AvatarEditor from '../components/AvatarEditor'
import AuthPanel from '../components/AuthPanel'
import { useStore, useProfile } from '../store'
import { useVault } from '../lib/useVault'
import { ICON_KEYS, COLORS } from '../lib/icons'

function Row({ icon, color = '#38bdf8', title, sub, right, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[.03] transition first:rounded-t-[20px] last:rounded-b-[20px]">
      <IconBadge name={icon} color={color} size={36} icon={17} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {sub && <div className="text-xs text-ink-400 truncate">{sub}</div>}
      </div>
      {right ?? <ChevronRight size={16} className="text-ink-600" />}
    </button>
  )
}

export default function Settings() {
  const profile = useProfile()
  const put = useStore((s) => s.put)
  const session = useStore((s) => s.session)
  const sync = useStore((s) => s.sync)
  const privacy = useStore((s) => s.ui.privacy)
  const setUi = useStore((s) => s.setUi)
  const signOut = useStore((s) => s.signOut)
  const syncNow = useStore((s) => s.syncNow)
  const items = useStore((s) => s.items)
  const restoreMany = useStore((s) => s.restoreMany)
  const showToast = useStore((s) => s.showToast)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [nameEdit, setNameEdit] = useState(null)
  const [catsOpen, setCatsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const fileRef = useRef(null)

  const exportJson = () => {
    const data = Object.values(items).filter((i) => !i.deleted)
    const blob = new Blob([JSON.stringify({ app: 'rr-vault', version: 1, exportedAt: new Date().toISOString(), items: data }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `rr-vault-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const importJson = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const j = JSON.parse(await file.text())
      if (!Array.isArray(j.items)) throw new Error('ไฟล์ไม่ถูกต้อง')
      restoreMany(j.items)
      showToast(`นำเข้า ${j.items.length} รายการแล้ว`)
    } catch (err) { showToast('นำเข้าไม่สำเร็จ: ' + err.message) }
    e.target.value = ''
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold pt-2">ตั้งค่า</h1>

      <section className="hero p-5 flex items-center gap-4">
        <button onClick={() => setAvatarOpen(true)} className="relative">
          <Avatar size={76} />
          <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full grid place-items-center bg-ink-700 border border-white/15"><Camera size={14} /></span>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-white/60">เจ้าของ Vault</div>
          <div className="text-lg font-semibold truncate">{profile.name}</div>
          <div className="text-xs text-white/60 truncate">{session?.user?.email || 'ยังไม่ได้เข้าสู่ระบบ (เก็บในเครื่อง)'}</div>
        </div>
        <button onClick={() => setNameEdit(profile.name)} className="p-2 rounded-full hover:bg-white/10"><Pencil size={18} /></button>
      </section>

      <div className="text-sm text-ink-400 px-1">การซิงก์ข้อมูล</div>
      <section className="card divide-y divide-white/5">
        {session ? (
          <>
            <Row icon="vault" color="#10b981" title="ซิงก์ข้ามอุปกรณ์เปิดอยู่"
              sub={sync.state === 'error' ? `ผิดพลาด: ${sync.error}` : sync.at ? `ซิงก์ล่าสุด ${new Date(sync.at).toLocaleTimeString('th-TH')}` : 'กำลังเชื่อมต่อ…'}
              right={<RefreshCw size={16} className={sync.state === 'syncing' ? 'animate-spin text-sky' : 'text-ink-400'} />} onClick={syncNow} />
            <Row icon="more" color="#fb7185" title="ออกจากระบบ" sub="ข้อมูลยังอยู่บนคลาวด์ เข้าสู่ระบบใหม่เมื่อไรก็ได้" right={<LogOut size={16} className="text-rose" />}
              onClick={() => confirm('ออกจากระบบและล้างข้อมูลในเครื่องนี้?') && signOut()} />
          </>
        ) : (
          <Row icon="vault" color="#38bdf8" title="เข้าสู่ระบบเพื่อซิงก์" sub="ใช้ข้อมูลเดียวกันทั้งมือถือและคอม พร้อมสำรองบนคลาวด์" onClick={() => setAuthOpen(true)} />
        )}
      </section>

      <div className="text-sm text-ink-400 px-1">การใช้งาน</div>
      <section className="card divide-y divide-white/5">
        <Row icon="sparkles" color="#a78bfa" title="ซ่อนตัวเลข" sub="เหมาะกับการเปิดแอปในที่สาธารณะ"
          right={<div className={`w-11 h-6 rounded-full p-0.5 transition ${privacy ? 'bg-mint' : 'bg-white/15'}`}><div className={`w-5 h-5 rounded-full bg-white transition ${privacy ? 'translate-x-5' : ''}`} /></div>}
          onClick={() => setUi({ privacy: !privacy })} />
        <Row icon="tag" color="#fbbf24" title="หมวดหมู่รายรับ-รายจ่าย" sub="เพิ่ม แก้ไข หรือลบหมวดหมู่ และเลือกไอคอน" onClick={() => setCatsOpen(true)} />
        <Row icon="phone" color="#10b981" title="ติดตั้งลงมือถือ" sub="Android และ iPhone" onClick={() => setInstallOpen(true)} />
      </section>

      <div className="text-sm text-ink-400 px-1">สำรองข้อมูล</div>
      <section className="card divide-y divide-white/5">
        <Row icon="cash" color="#38bdf8" title="ส่งออกข้อมูล (JSON)" sub="ดาวน์โหลดไฟล์สำรองทั้งหมด" right={<Download size={16} className="text-ink-400" />} onClick={exportJson} />
        <Row icon="receipt" color="#14b8a6" title="นำเข้าข้อมูล" sub="กู้คืนจากไฟล์สำรอง" right={<Upload size={16} className="text-ink-400" />} onClick={() => fileRef.current?.click()} />
      </section>
      <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />

      <div className="text-center text-xs text-ink-600 pt-2 pb-6">รณกฤต เรืองชินศิริ Vault · Phase 1</div>

      <AvatarEditor open={avatarOpen} onClose={() => setAvatarOpen(false)}
        onSave={(avatar) => put('profile', { ...profile, avatar })} onReset={() => put('profile', { ...profile, avatar: null })} />

      <Sheet open={nameEdit !== null} onClose={() => setNameEdit(null)} title="ชื่อที่แสดง"
        footer={<Button className="w-full" onClick={() => { if (nameEdit.trim()) put('profile', { ...profile, name: nameEdit.trim() }); setNameEdit(null) }}><Check size={18} /> บันทึก</Button>}>
        <input className="field" value={nameEdit || ''} onChange={(e) => setNameEdit(e.target.value)} autoFocus />
      </Sheet>

      <Sheet open={authOpen} onClose={() => setAuthOpen(false)} title="เข้าสู่ระบบเพื่อซิงก์">
        <AuthPanel onDone={() => setAuthOpen(false)} />
      </Sheet>

      <Sheet open={installOpen} onClose={() => setInstallOpen(false)} title="ติดตั้งลงมือถือ">
        <div className="space-y-4 text-sm">
          <div className="card p-4">
            <div className="font-semibold mb-1"> iPhone / iPad (Safari)</div>
            <ol className="list-decimal pl-5 text-ink-300 space-y-1">
              <li>เปิดเว็บนี้ด้วย <b>Safari</b></li>
              <li>แตะปุ่ม <b>แชร์</b> (สี่เหลี่ยมที่มีลูกศรชี้ขึ้น)</li>
              <li>เลือก <b>“เพิ่มไปยังหน้าจอโฮม”</b> แล้วแตะ “เพิ่ม”</li>
            </ol>
          </div>
          <div className="card p-4">
            <div className="font-semibold mb-1">🤖 Android (Chrome)</div>
            <ol className="list-decimal pl-5 text-ink-300 space-y-1">
              <li>เปิดเว็บนี้ด้วย <b>Chrome</b></li>
              <li>แตะเมนู <b>⋮</b> มุมขวาบน</li>
              <li>เลือก <b>“ติดตั้งแอป”</b> หรือ “เพิ่มลงในหน้าจอหลัก”</li>
            </ol>
          </div>
          <div className="text-xs text-ink-400">ติดตั้งแล้วจะเปิดแบบเต็มจอเหมือนแอปทั่วไป และใช้งานแบบออฟไลน์ได้</div>
        </div>
      </Sheet>

      <CategoryManager open={catsOpen} onClose={() => setCatsOpen(false)} />
    </div>
  )
}

function CategoryManager({ open, onClose }) {
  const { categories, txns } = useVault()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const [kind, setKind] = useState('expense')
  const [edit, setEdit] = useState(null)
  const list = categories.filter((c) => c.kind === kind)

  const save = () => {
    if (!edit.name.trim()) return
    put('category', { ...edit, name: edit.name.trim(), kind: edit.kind || kind, order: edit.order ?? categories.length + 1 })
    setEdit(null)
  }
  const used = edit?.id && txns.some((t) => t.category === edit.id)

  return (
    <>
      <Sheet open={open && !edit} onClose={onClose} title="หมวดหมู่">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'รายจ่าย' }, { value: 'income', label: 'รายรับ' }]} />
        <div className="mt-3 -mx-2">
          {list.map((c) => (
            <button key={c.id} onClick={() => setEdit({ ...c })} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/5 text-left">
              <IconBadge name={c.icon} color={c.color} size={36} icon={17} />
              <span className="flex-1 text-sm">{c.name}</span>
              <Pencil size={15} className="text-ink-400" />
            </button>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-2" onClick={() => setEdit({ name: '', icon: 'tag', color: '#38bdf8', kind })}><Plus size={16} /> เพิ่มหมวดหมู่</Button>
      </Sheet>
      <Sheet open={open && !!edit} onClose={() => setEdit(null)} title={edit?.id ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
        footer={<div className="flex gap-2">
          {edit?.id && <Button variant="danger" onClick={() => { remove(edit.id, { label: used ? 'ลบหมวดแล้ว (รายการเดิมยังอยู่)' : 'ลบหมวดแล้ว' }); setEdit(null) }}><Trash2 size={17} /></Button>}
          <Button className="flex-1" onClick={save} disabled={!edit?.name?.trim()}><Check size={18} /> บันทึก</Button>
        </div>}>
        {edit && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <IconBadge name={edit.icon} color={edit.color} size={52} icon={24} />
              <input className="field text-lg" placeholder="ชื่อหมวด" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus={!edit.id} />
            </div>
            <Label>สี</Label>
            <ColorPicker value={edit.color} onChange={(color) => setEdit({ ...edit, color })} colors={COLORS} />
            <Label className="mt-4">ไอคอน</Label>
            <IconPicker value={edit.icon} onChange={(icon) => setEdit({ ...edit, icon })} color={edit.color} keys={ICON_KEYS} />
          </>
        )}
      </Sheet>
    </>
  )
}
