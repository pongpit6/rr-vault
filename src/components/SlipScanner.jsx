import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Loader2, Check, X, AlertTriangle, ArrowRightLeft } from 'lucide-react'
import { Sheet, Button, IconBadge, Money } from './ui'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { exchangeOf } from '../lib/slip'
import { readSlip, peekSlip, onOcrProgress, getWorker } from '../lib/ocr'
import { learnKey } from '../lib/notify'
import { todayISO, round2, shortDate } from '../lib/format'

const pad = (n) => String(n).padStart(2, '0')
const isoOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const shiftDay = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }

/** First guess of a category from the shop name, used until the user teaches one. */
const GUESS = [
  [/กาแฟ|คาเฟ่|cafe|coffee|อเมซอน|amazon|starbucks|ชานม|ชาไข่มุก|ชาไทย|bubble\s*tea|เบเกอรี่|bakery|ขนม|ไอศกรีม|dessert/i, 'cat-coffee'],
  [/ข้าว|อาหาร|ก๋วยเตี๋ยว|ร้านอาหาร|หมู|ไก่|ส้มตำ|ครัว|kitchen|food|restaurant|ชาบู|หมูกระทะ|ปิ้งย่าง|pizza|kfc|mcdonald|grab\s*food|lineman|foodpanda/i, 'cat-food'],
  [/ปตท|ptt|บางจาก|bangchak|shell|เชลล์|caltex|คาลเท็กซ์|น้ำมัน|esso|pt\b/i, 'cat-fuel'],
  [/7-?eleven|เซเว่น|ซีพี|cp\s*all|lotus|โลตัส|big\s*c|บิ๊กซี|makro|แม็คโคร|tops|ท็อปส์|family\s*mart/i, 'cat-grocery'],
  [/grab|bolt|bts|mrt|taxi|แท็กซี่|วิน|ทางด่วน|easy\s*pass|m-?flow/i, 'cat-travel'],
  [/shopee|lazada|ช้อป|shop|central|เซ็นทรัล|uniqlo/i, 'cat-shop'],
  [/การไฟฟ้า|ประปา|mea|pea|การประปา|ค่าไฟ|ค่าน้ำ/i, 'cat-bills'],
  [/ais|true|dtac|ทรู|เอไอเอส|3bb|internet|ais\s*fibre/i, 'cat-phone'],
  [/โรงพยาบาล|hospital|คลินิก|clinic|ร้านยา|เภสัช|pharmacy/i, 'cat-health'],
  [/วัด|มูลนิธิ|ทำบุญ|บริจาค/i, 'cat-gift'],
]
const guessCat = (...names) => { for (const n of names) { const c = n && GUESS.find(([re]) => re.test(n))?.[1]; if (c) return c } return null }

/** "นำเข้าสลิป": pick slips from the gallery → read QR + text on the phone → review → save all. */
export default function SlipScanner({ open, onClose, shared }) {
  const { txns, categories, accounts, settings } = useVault()
  const profile = useStore((s) => s.items.profile?.data)
  const put = useStore((s) => s.put)
  const setUi = useStore((s) => s.setUi)
  const showToast = useStore((s) => s.showToast)
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(null) // { i, n, pct, stage }
  const [day, setDay] = useState(todayISO())
  const [anyDay, setAnyDay] = useState(false)
  const [note, setNote] = useState(null)
  const T = settings.allocation.targets
  const spendAccs = accounts.filter((a) => !a.archived && ['cash', 'bank', 'ewallet', 'invest', 'reserve', 'savings'].includes(a.type))

  // start downloading the Thai reader as soon as the sheet opens, so the first slip is quicker
  useEffect(() => { if (open) getWorker().catch(() => {}) }, [open])
  // images shared from the gallery: read them straight away, whatever their date
  const sharedDone = useRef(null)
  useEffect(() => { if (open && shared?.length && sharedDone.current !== shared) { sharedDone.current = shared; run(shared, { all: true }) } }, [open, shared]) // eslint-disable-line

  const run = async (files, { all = anyDay } = {}) => {
    files = [...files].filter((f) => f && (f.type || '').startsWith('image/'))
    if (!files.length) return
    const owner = profile?.name || ''
    const map = settings.merchantMap || {}
    const found = [...rows]
    const seen = new Set([...txns.map((t) => t.slipRef).filter(Boolean), ...rows.map((r) => r.ref).filter(Boolean)])
    let skipDay = 0, notSlip = 0, dupes = 0
    // the file date is a cheap first filter (the slip's own date decides in the end)
    if (!all) {
      const recent = files.filter((f) => !f.lastModified || Math.abs(Date.parse(isoOf(f.lastModified)) - Date.parse(day)) <= 86400000)
      if (recent.length < files.length && files.some((f) => Date.now() - f.lastModified > 120_000)) { skipDay += files.length - recent.length; files = recent }
    }
    const off = onOcrProgress((m) => {
      if (m.status === 'recognizing text') setBusy((b) => b && { ...b, pct: m.progress, stage: 'อ่านยอดเงิน' })
      else if (/load|initializ/i.test(m.status)) setBusy((b) => b && { ...b, stage: 'โหลดตัวอ่านภาษาไทย', pct: m.progress || 0 })
    })
    for (let i = 0; i < files.length; i++) {
      setBusy({ i, n: files.length, pct: 0, stage: 'ดู QR ในสลิป' })
      try {
        const peek = await peekSlip(files[i])
        const q = peek.qrInfo
        if (q?.date && !all && q.date !== day) { skipDay++; continue }
        if (q?.ref && seen.has(q.ref)) { dupes++; continue }
        const { slip, thumb } = await readSlip(files[i], owner, peek)
        if (!slip) { notSlip++; found.push({ key: `${Date.now()}-${i}`, thumb, fail: true }); setRows([...found]); continue }
        if (!all && slip.date && slip.date !== day) { skipDay++; continue }
        if (slip.ref && seen.has(slip.ref)) { dupes++; continue }
        if (slip.ref) seen.add(slip.ref)
        const exch = exchangeOf(slip)
        const learned = slip.counterparty ? map[learnKey({ counterparty: slip.counterparty })] : null
        const looseDupe = !slip.ref && txns.some((t) => t.date === (slip.date || day) && Math.abs((t.amount || 0) - slip.amount) < 0.01 && t.fromSlip)
        found.push({
          key: slip.ref || `${Date.now()}-${i}`, thumb, include: !looseDupe, dupe: looseDupe,
          amount: slip.amount, date: slip.date || day, time: slip.time, ref: slip.ref, noDate: !slip.date,
          direction: slip.direction, counterparty: slip.counterparty || '', detail: slip.detail, bank: slip.bank,
          category: learned?.category || (slip.direction === 'in' ? 'cat-gift-in' : guessCat(slip.counterparty, slip.detail)) || 'cat-uncat',
          account: learned?.account || T.cash,
          exch,
        })
      } catch (e) {
        found.push({ key: `${Date.now()}-${i}-e`, fail: true, err: String(e?.message || e) })
      }
      setRows([...found])
    }
    off()
    found.sort((a, b) => (a.fail ? 1 : 0) - (b.fail ? 1 : 0) || `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    setRows([...found])
    setNote({ skipDay, notSlip, dupes })
    setBusy(null)
  }

  const upd = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const chosen = rows.filter((r) => r.include && !r.fail && r.amount > 0)
  const spend = useMemo(() => round2(chosen.reduce((s, r) => s + (r.exch ? 0 : r.direction === 'in' ? -r.amount : r.amount), 0)), [chosen])
  const toInvest = useMemo(() => round2(chosen.reduce((s, r) => s + (r.exch ? r.amount : 0), 0)), [chosen])

  const close = () => { if (busy) return; setRows([]); setNote(null); onClose() }
  const save = () => {
    const cur = useStore.getState().items.settings?.data || settings
    const map = { ...(cur.merchantMap || {}) }
    const now = new Date().toISOString()
    for (const r of chosen) {
      const base = { amount: r.amount, date: r.date, account: r.account, slipRef: r.ref || undefined, fromSlip: true, time: r.time || undefined, createdAt: now }
      if (r.exch) { put('txn', { ...base, kind: 'transfer', to: T.invest, note: `เติมเงินเข้า ${r.exch}` }); continue }
      const kind = r.direction === 'in' ? 'income' : 'expense'
      put('txn', { ...base, kind, category: r.category, note: r.counterparty || (kind === 'income' ? 'รับโอน' : 'โอนออก'), counterparty: r.counterparty || undefined, inDir: r.direction })
      const k = r.counterparty && r.category !== 'cat-uncat' ? learnKey({ counterparty: r.counterparty }) : null
      if (k) map[k] = { category: r.category, account: r.account }
    }
    put('settings', { ...cur, merchantMap: map })
    setUi({ slipImportDay: todayISO() })
    showToast(`บันทึกจากสลิป ${chosen.length} รายการแล้ว`)
    setRows([]); setNote(null); onClose()
  }

  const cats = (dir) => categories.filter((c) => c.kind === (dir === 'in' ? 'income' : 'expense'))
  const dayChips = [[todayISO(), 'วันนี้'], [shiftDay(todayISO(), -1), 'เมื่อวาน']]
  return (
    <Sheet open={open} onClose={close} title="นำเข้าสลิป K PLUS" wide
      footer={chosen.length > 0 && !busy && (
        <Button className="w-full" onClick={save}><Check size={18} /> บันทึกทั้งหมด {chosen.length} รายการ</Button>
      )}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { run(e.target.files); e.target.value = '' }} data-testid="slip-input" />

      {!rows.length && !busy && (
        <>
          <div className="flex items-center gap-1.5 mb-3 text-sm flex-wrap">
            <span className="text-slate-500 mr-1">สลิปของ</span>
            {dayChips.map(([d, l]) => (
              <button key={d} onClick={() => { setDay(d); setAnyDay(false) }} className={`px-3 py-1.5 rounded-full border ${!anyDay && day === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>{l}</button>
            ))}
            <label className={`px-3 py-1.5 rounded-full border relative ${!anyDay && !dayChips.some(([d]) => d === day) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>
              {!dayChips.some(([d]) => d === day) && !anyDay ? shortDate(day) : 'เลือกวัน'}
              <input type="date" value={day} max={todayISO()} onChange={(e) => { if (e.target.value) { setDay(e.target.value); setAnyDay(false) } }} className="absolute inset-0 opacity-0" />
            </label>
            <button onClick={() => setAnyDay(true)} className={`px-3 py-1.5 rounded-full border ${anyDay ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>ทุกวัน</button>
          </div>
          <button onClick={() => fileRef.current?.click()} className="w-full card border-dashed border-2 border-emerald-300 bg-emerald-50/50 p-7 flex flex-col items-center gap-3 text-center">
            <IconBadge name="scan" color="#10b981" size={60} icon={28} />
            <div className="font-semibold text-lg">เลือกรูปสลิปจากคลังรูป</div>
            <div className="text-sm text-slate-600 max-w-xs">เปิดอัลบั้ม <b>K PLUS</b> แล้วเลือกรูปล่าสุดมาได้เลยหลายรูป {anyDay ? '' : <>ระบบจะเก็บเฉพาะสลิปของ<b>{day === todayISO() ? 'วันนี้' : ` ${shortDate(day)}`}</b> ให้เอง</>}</div>
            <div className="text-[11px] text-slate-400">อ่านในเครื่องคุณเอง ไม่ส่งรูปออกไปไหน · สลิปที่เคยนำเข้าแล้วจะไม่ซ้ำ</div>
          </button>
        </>
      )}

      {busy && (
        <div className="card p-4 mb-3 flex items-center gap-3">
          <Loader2 className="animate-spin text-emerald-600 shrink-0" size={22} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">รูปที่ {busy.i + 1}/{busy.n} · {busy.stage}</div>
            <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden"><div className="h-full grad-bg transition-all" style={{ width: `${((busy.i + (busy.pct || 0)) / busy.n) * 100}%` }} /></div>
            {busy.stage === 'โหลดตัวอ่านภาษาไทย' && <div className="text-[11px] text-slate-400 mt-1">ครั้งแรกโหลดประมาณ 10 MB ครั้งต่อไปจะเร็วขึ้นมาก</div>}
          </div>
        </div>
      )}

      {note && !busy && (note.skipDay + note.dupes + note.notSlip > 0) && (
        <div className="text-xs text-slate-500 mb-2 space-x-2">
          {note.skipDay > 0 && <span>ข้าม {note.skipDay} รูปที่ไม่ใช่สลิปของ{anyDay ? 'วันที่เลือก' : day === todayISO() ? 'วันนี้' : ` ${shortDate(day)}`}</span>}
          {note.dupes > 0 && <span>· {note.dupes} สลิปเคยนำเข้าแล้ว</span>}
        </div>
      )}
      {note && !busy && !rows.length && (
        <div className="card p-5 text-center text-sm text-slate-600">ไม่พบสลิปใหม่{anyDay ? '' : `ของ${day === todayISO() ? 'วันนี้' : ` ${shortDate(day)}`}`}
          <div className="mt-3 flex gap-2 justify-center">
            <Button variant="ghost" onClick={() => { setNote(null); fileRef.current?.click() }}><ImagePlus size={16} /> เลือกรูปใหม่</Button>
            {!anyDay && <Button variant="ghost" onClick={() => { setNote(null); setAnyDay(true) }}>ไม่กรองวัน</Button>}
          </div>
        </div>
      )}

      {chosen.length > 0 && !busy && (
        <div className="flex items-center gap-3 mb-3 px-1 text-sm">
          <div className="flex-1">จ่ายออก <Money value={spend} decimals={false} className="font-semibold" /></div>
          {toInvest > 0 && <div className="text-sky-700">เข้าลงทุน <Money value={toInvest} decimals={false} className="font-semibold" /></div>}
        </div>
      )}

      <div className="space-y-2.5">
        {rows.map((r) => r.fail ? (
          <div key={r.key} className="card p-3 flex items-center gap-3 text-sm">
            {r.thumb && <img src={r.thumb} className="w-10 h-14 object-cover rounded-md border" alt="" />}
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <span className="text-slate-600">{r.err ? `อ่านรูปนี้ไม่ได้ (${r.err})` : 'รูปนี้ไม่ใช่สลิป หรืออ่านยอดเงินไม่ได้'}</span>
          </div>
        ) : (
          <div key={r.key} className={`card p-3 transition ${r.include ? '' : 'opacity-50'}`} data-testid="slip-row">
            <div className="flex gap-3">
              <img src={r.thumb} className="w-14 h-[76px] object-cover rounded-lg border shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <input value={r.counterparty} placeholder={r.direction === 'in' ? 'รับจาก' : 'จ่ายให้ / ร้าน'} onChange={(e) => upd(r.key, { counterparty: e.target.value })}
                  className="w-full font-semibold bg-transparent outline-none border-b border-transparent focus:border-slate-200 truncate" />
                {r.detail && <div className="text-xs text-slate-400 truncate">{r.detail}</div>}
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-sm ${r.direction === 'in' ? 'text-emerald-600' : r.exch ? 'text-sky-600' : 'text-slate-500'}`}>{r.direction === 'in' ? '+' : r.exch ? '' : '−'}</span>
                  <input inputMode="decimal" value={r.amount} onChange={(e) => upd(r.key, { amount: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })}
                    className={`w-24 text-xl font-bold num bg-transparent outline-none ${r.direction === 'in' ? 'text-emerald-600' : r.exch ? 'text-sky-600' : ''}`} />
                  <span className="text-xs text-slate-400">บาท</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className={r.noDate ? 'text-amber-600' : ''}>{shortDate(r.date)}{r.time ? ` · ${r.time}` : ''}</span>
                  <span className="text-slate-300">·</span>
                  <select value={r.account} onChange={(e) => upd(r.key, { account: e.target.value })} className="min-w-0 bg-transparent outline-none text-slate-500">
                    {spendAccs.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => upd(r.key, { include: !r.include })} aria-label="เลือก"
                className={`self-start w-8 h-8 rounded-full grid place-items-center border shrink-0 ${r.include ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-slate-300'}`}>
                {r.include ? <Check size={16} /> : <X size={15} />}
              </button>
            </div>
            {r.dupe && <div className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle size={13} /> มียอดเท่ากันวันเดียวกันอยู่แล้ว อาจซ้ำ — ข้ามไว้ให้ก่อน</div>}
            {r.exch ? (
              <div className="mt-2.5 text-xs flex items-center gap-2 text-sky-700 bg-sky-50 rounded-lg px-2.5 py-2">
                <ArrowRightLeft size={14} className="shrink-0" /> เติมเงินเข้า {r.exch} → ย้ายไปกระเป๋าลงทุน ไม่นับเป็นรายจ่าย
                <button onClick={() => upd(r.key, { exch: null, category: 'cat-uncat' })} className="ml-auto underline text-slate-500 shrink-0">เป็นรายจ่าย</button>
              </div>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 mt-2.5 pb-0.5">
                {cats(r.direction).filter((c) => c.id !== 'cat-uncat').sort((a, b) => (b.id === r.category) - (a.id === r.category)).map((c) => (
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
    </Sheet>
  )
}
