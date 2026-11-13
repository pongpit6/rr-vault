import { useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, Check, X, ScanLine, AlertTriangle } from 'lucide-react'
import { Sheet, Button, IconBadge, Money } from './ui'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { slipToP } from '../lib/slip'
import { readSlipImage, onOcrProgress } from '../lib/ocr'
import { parseNotification, learnKey } from '../lib/notify'
import { todayISO, round2 } from '../lib/format'

/** Upload many slips / notification screenshots at once → review → save all. */
export default function SlipScanner({ open, onClose }) {
  const { txns, categories, accounts, settings } = useVault()
  const profile = useStore((s) => s.items.profile?.data)
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(null) // { i, n, pct }
  const [onlyDay, setOnlyDay] = useState(true)
  const [day, setDay] = useState(todayISO())
  const [skipped, setSkipped] = useState(0)
  const T = settings.allocation.targets
  const spendAccs = accounts.filter((a) => !a.archived && ['cash', 'bank', 'ewallet', 'credit', 'invest', 'reserve', 'savings'].includes(a.type))

  const isDupe = (r) => (r.ref && txns.some((t) => t.slipRef === r.ref)) ||
    txns.some((t) => t.date === r.date && Math.abs((t.amount || 0) - r.amount) < 0.01 && (t.kind === (r.direction === 'in' ? 'income' : 'expense')) && (t.fromSlip || t.fromInbox))

  const run = async (files) => {
    files = [...files].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    const found = []
    const owner = profile?.name || ''
    const map = settings.merchantMap || {}
    const off = onOcrProgress((m) => m.status === 'recognizing text' && setBusy((b) => b && { ...b, pct: m.progress, stage: 'อ่านตัวอักษร' }))
    // pre-filter by file date when it is plausible (saves OCR time); the slip's own date decides in the end
    let skip = 0
    if (onlyDay) {
      const near = (f) => { const d = new Date(f.lastModified); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; return Math.abs(Date.parse(k) - Date.parse(day)) <= 86400000 }
      const dated = files.filter(near)
      if (dated.length && dated.length < files.length && files.some((f) => Date.now() - f.lastModified > 120_000)) { skip = files.length - dated.length; files = dated }
    }
    for (let i = 0; i < files.length; i++) {
      setBusy({ i, n: files.length, pct: 0, stage: 'เตรียมภาพ' })
      try {
        const { text, items: parsed, thumb } = await readSlipImage(files[i], owner)
        const data = { text }
        let items = parsed
        if (onlyDay && items.length && items.every((x) => x.date && x.date !== day)) { skip++; continue }
        if (onlyDay) items = items.filter((x) => !x.date || x.date === day)
        if (!items.length) {
          const p = parseNotification(data.text)
          if (p.kind === 'trade' || p.kind?.startsWith('exchange')) {
            // crypto exchange message → let the inbox flow handle it (creates trade / transfer)
            put('inbox', { raw: data.text.replace(/\s+/g, ' ').slice(0, 1500), at: new Date().toISOString(), source: 'slip' })
            found.push({ key: `${i}-x`, thumb, skip: true, info: `ส่ง${p.kind === 'trade' ? 'รายการซื้อขาย' : 'รายการฝาก/ถอน'} ${p.exchange} ไปที่ "รอยืนยัน" แล้ว` })
            continue
          }
          if (p.amount) items = [{ amount: p.amount, direction: p.direction || 'out', counterparty: p.counterparty, bank: p.bank, date: null, fee: 0, ref: null }]
        }
        if (!items.length) { found.push({ key: `${i}-0`, thumb, fail: true }); continue }
        items.forEach((it, k) => {
          const ref = it.ref
          const learned = it.counterparty ? map[learnKey({ counterparty: it.counterparty })] : null
          const r = {
            key: `${i}-${k}`, thumb, include: true,
            amount: it.amount, date: it.date || todayISO(), time: it.time, ref,
            direction: it.direction, counterparty: it.counterparty || '', bank: it.bank, fee: it.fee || 0,
            category: learned?.category || 'cat-uncat', account: learned?.account || T.cash,
            noDate: !it.date,
            exch: slipToP({ ...it, text: it.text }).kind === 'exchange-in',
          }
          r.dupe = isDupe(r) || found.some((f) => !f.skip && !f.fail && f.ref && f.ref === r.ref)
          r.include = !r.dupe
          found.push(r)
        })
      } catch (e) {
        found.push({ key: `${i}-e`, fail: true, err: String(e?.message || e) })
      }
      setRows([...found])
    }
    off()
    setSkipped(skip)
    setBusy(null)
  }

  const upd = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const chosen = rows.filter((r) => r.include && !r.skip && !r.fail && r.amount > 0)
  const total = useMemo(() => round2(chosen.reduce((s, r) => s + (r.exch ? 0 : r.direction === 'in' ? r.amount : -r.amount), 0)), [chosen])

  const save = () => {
    const cur = useStore.getState().items.settings?.data || settings
    const map = { ...(cur.merchantMap || {}) }
    for (const r of chosen) {
      if (r.exch) {
        put('txn', { kind: 'transfer', amount: r.amount, date: r.date, account: r.account, to: T.invest, note: 'เติมเงินเข้า Bitkub', slipRef: r.ref || undefined, fromSlip: true, createdAt: new Date().toISOString() })
        continue
      }
      const kind = r.direction === 'in' ? 'income' : 'expense'
      put('txn', {
        kind, amount: r.amount, date: r.date, account: r.account, category: r.category,
        note: r.counterparty || (kind === 'income' ? 'รับโอน' : 'โอนออก') + (r.bank ? ` · ${r.bank}` : ''),
        counterparty: r.counterparty || undefined, slipRef: r.ref || undefined, fromSlip: true, inDir: r.direction,
        createdAt: new Date().toISOString(),
      })
      const k = r.counterparty && r.category !== 'cat-uncat' ? learnKey({ counterparty: r.counterparty }) : null
      if (k) map[k] = { category: r.category, account: r.account }
    }
    put('settings', { ...cur, merchantMap: map })
    showToast(`บันทึกจากสลิป ${chosen.length} รายการ`)
    setRows([]); onClose()
  }

  const cats = (dir) => categories.filter((c) => c.kind === (dir === 'in' ? 'income' : 'expense'))
  return (
    <Sheet open={open} onClose={() => { if (!busy) { setRows([]); onClose() } }} title="สแกนสลิป / ภาพแจ้งเตือน" wide
      footer={chosen.length > 0 && !busy && (
        <Button className="w-full" onClick={save}><Check size={18} /> บันทึก {chosen.length} รายการ · <Money value={total} sign /></Button>
      )}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { run(e.target.files); e.target.value = '' }} data-testid="slip-input" />
      {!rows.length && !busy && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <button onClick={() => setOnlyDay(!onlyDay)} className={`w-10 h-6 rounded-full relative transition shrink-0 ${onlyDay ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${onlyDay ? 'left-[18px]' : 'left-0.5'}`} /></button>
          <span className="text-slate-600">เอาเฉพาะสลิปของวันที่</span>
          <input type="date" value={day} disabled={!onlyDay} onChange={(e) => setDay(e.target.value)} className="bg-slate-50 rounded-lg px-2 py-1 outline-none disabled:opacity-40" />
        </div>
      )}
      {!rows.length && !busy && (
        <button onClick={() => fileRef.current?.click()} className="w-full card border-dashed border-2 border-emerald-300 bg-emerald-50/50 p-8 flex flex-col items-center gap-3 text-center">
          <IconBadge name="scan" color="#10b981" size={56} icon={26} />
          <div className="font-semibold">เลือกรูปสลิป ได้ทีละหลายรูป</div>
          {onlyDay && <div className="text-xs text-emerald-700 -mt-1">เปิดอัลบั้ม K PLUS แล้วเลือกรูปล่าสุดมาได้เลย ระบบคัดเฉพาะวันที่เลือกให้</div>}
          <div className="text-sm text-slate-500 max-w-xs">สลิปโอนเงิน, ภาพแชต LINE แจ้งเตือน (KBank, Bitkub ฯลฯ) — อ่านในเครื่องคุณเอง ไม่ส่งรูปออกไปไหน</div>
        </button>
      )}
      {busy && (
        <div className="card p-4 mb-3 flex items-center gap-3">
          <Loader2 className="animate-spin text-emerald-600" size={22} />
          <div className="flex-1">
            <div className="text-sm font-medium">กำลังอ่านรูปที่ {busy.i + 1}/{busy.n} · {busy.stage}</div>
            <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden"><div className="h-full grad-bg transition-all" style={{ width: `${((busy.i + (busy.pct || 0)) / busy.n) * 100}%` }} /></div>
            {busy.i === 0 && <div className="text-[11px] text-slate-400 mt-1">ครั้งแรกจะโหลดตัวอ่านภาษาไทย (~10 MB) จากนั้นจะเร็วขึ้น</div>}
          </div>
        </div>
      )}
      {skipped > 0 && !busy && <div className="text-xs text-slate-500 mb-2">ข้าม {skipped} รูปที่ไม่ใช่สลิปของวันที่เลือก</div>}
      <div className="space-y-2.5">
        {rows.map((r) => r.skip || r.fail ? (
          <div key={r.key} className="card p-3 flex items-center gap-3 text-sm">
            {r.thumb && <img src={r.thumb} className="w-10 h-14 object-cover rounded-md border" alt="" />}
            {r.fail ? <><AlertTriangle size={16} className="text-amber-500 shrink-0" /><span className="text-slate-600">อ่านยอดเงินจากรูปนี้ไม่ได้ ลองรูปที่ชัดกว่านี้ หรือกด + บันทึกเอง</span></>
              : <><ScanLine size={16} className="text-emerald-600 shrink-0" /><span className="text-slate-600">{r.info}</span></>}
          </div>
        ) : (
          <div key={r.key} className={`card p-3 ${r.include ? '' : 'opacity-55'}`}>
            <div className="flex gap-3">
              <img src={r.thumb} className="w-12 h-16 object-cover rounded-md border shrink-0" alt="" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                    {[['out', 'จ่ายออก'], ['in', 'รับเข้า']].map(([v, l]) => (
                      <button key={v} onClick={() => upd(r.key, { direction: v, category: 'cat-uncat' })} className={`px-2 py-1 rounded-md ${r.direction === v ? (v === 'in' ? 'bg-emerald-500 text-white' : 'bg-white shadow-sm') : 'text-slate-500'}`}>{l}</button>
                    ))}
                  </div>
                  <input inputMode="decimal" value={r.amount} onChange={(e) => upd(r.key, { amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
                    className={`flex-1 min-w-0 text-right font-semibold text-lg bg-transparent outline-none ${r.direction === 'in' ? 'text-emerald-600' : ''}`} />
                </div>
                <input value={r.counterparty} placeholder="ผู้รับ / ร้าน" onChange={(e) => upd(r.key, { counterparty: e.target.value })} className="w-full text-sm bg-slate-50 rounded-lg px-2 py-1.5 outline-none" />
                <div className="flex items-center gap-2 text-xs">
                  <input type="date" value={r.date} onChange={(e) => upd(r.key, { date: e.target.value, noDate: false })} className={`bg-slate-50 rounded-lg px-2 py-1 outline-none ${r.noDate ? 'ring-1 ring-amber-400' : ''}`} />
                  {r.time && <span className="text-slate-400">{r.time}</span>}
                  <select value={r.account} onChange={(e) => upd(r.key, { account: e.target.value })} className="flex-1 min-w-0 bg-slate-50 rounded-lg px-2 py-1 outline-none">
                    {spendAccs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => upd(r.key, { include: !r.include })} aria-label="เลือก"
                className={`self-start w-7 h-7 rounded-full grid place-items-center border shrink-0 ${r.include ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-slate-300'}`}>
                {r.include ? <Check size={15} /> : <X size={14} />}
              </button>
            </div>
            {r.dupe && <div className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle size={13} /> ดูเหมือนบันทึกไปแล้ว (ยอด/วันที่/เลขอ้างอิงซ้ำ) — ข้ามไว้ให้ก่อน</div>}
            {r.exch ? (
              <div className="mt-2.5 text-xs flex items-center gap-2 text-sky-700 bg-sky-50 rounded-lg px-2.5 py-1.5">
                <IconBadge name="trending" color="#0ea5e9" size={20} icon={12} /> เติมเงินเข้า Bitkub → บันทึกเป็น “โอนเข้ากระเป๋าลงทุน” ไม่นับเป็นรายจ่าย
                <button onClick={() => upd(r.key, { exch: false })} className="ml-auto underline text-slate-500">เป็นรายจ่าย</button>
              </div>
            ) : (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 mt-2.5 pb-0.5">
              {cats(r.direction).map((c) => (
                <button key={c.id} onClick={() => upd(r.key, { category: c.id })}
                  className={`shrink-0 flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border text-xs ${r.category === c.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white'}`}>
                  <IconBadge name={c.icon} color={r.category === c.id ? '#ffffff' : c.color} size={20} icon={12} />{c.name}
                </button>
              ))}
            </div>
            )}
          </div>
        ))}
      </div>
      {rows.length > 0 && !busy && (
        <button onClick={() => fileRef.current?.click()} className="w-full mt-3 py-3 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 flex items-center justify-center gap-2"><ImagePlus size={16} /> เพิ่มรูปอีก</button>
      )}
      <p className="text-[11px] text-slate-400 mt-3">ใช้ได้กับสลิปที่บันทึกไว้ในเครื่อง (ธนาคารส่วนใหญ่เซฟสลิปให้อัตโนมัติ) · ตรวจซ้ำด้วยเลขอ้างอิง/QR ในสลิป</p>
    </Sheet>
  )
}
