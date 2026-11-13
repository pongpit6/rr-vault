import { useEffect, useMemo, useState } from 'react'
import { Inbox as InboxIcon, Check, X, ClipboardPaste, Zap, Settings2, ArrowDownLeft, ArrowUpRight, CreditCard, ArrowLeftRight } from 'lucide-react'
import { AssetLogo } from '../components/Logos'
import { Button, Money, Empty, IconBadge, Label } from '../components/ui'
import { useStore, selectList } from '../store'
import { useVault } from '../lib/useVault'
import { parseNotification, learnKey } from '../lib/notify'
import { todayISO, money, round2 } from '../lib/format'

export function useInbox() {
  const items = useStore((s) => s.items)
  return useMemo(() => selectList(items, 'inbox').sort((a, b) => (b.at || '').localeCompare(a.at || '')).map((x) => ({ ...x, p: parseNotification(x.raw) })), [items])
}

const localDate = (iso) => { const d = iso ? new Date(iso) : new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

/** Build the TxnForm initial values for an inbox item, using what was learned for this counterparty. */
export function draftFromInbox(it, { settings, accounts, assets = [] }) {
  const p = it.p
  const date = localDate(p.time || it.at)
  const T = settings.allocation.targets
  if (p.kind === 'trade') {
    const symbol = `${p.coin}-USD`
    const existing = assets.find((a) => a.symbol === symbol)
    return {
      isTrade: true, side: p.side, mode: 'total', total: p.total, totalCcy: p.fiat === 'THB' ? 'THB' : 'USD', qty: p.qty, feeIn: p.fee || undefined,
      date, account: T.invest, inboxId: it.id, note: `${p.exchange}`,
      ...(existing ? { assetId: existing.id } : { asset: { type: 'crypto', symbol, name: p.coin, source: 'yahoo', currency: 'USD', unit: p.coin } }),
    }
  }
  if (p.kind === 'exchange-in' || p.kind === 'exchange-out') {
    const into = p.kind === 'exchange-in'
    return { kind: 'transfer', amount: p.amount, date, account: into ? T.cash : T.invest, to: into ? T.invest : T.cash, note: `${into ? 'ฝากเงินเข้า' : 'ถอนเงินจาก'} ${p.exchange}`, inboxId: it.id }
  }
  const key = learnKey(p)
  const learned = key ? settings.merchantMap?.[key] : null
  const card = accounts.find((a) => a.type === 'credit' && !a.archived)
  const kind = p.direction === 'in' ? 'income' : 'expense'
  const account = learned?.account || (p.isCard && card ? card.id : settings.allocation.targets.cash)
  return {
    kind, amount: p.amount || undefined, date, note: p.counterparty || '',
    category: learned?.category || (kind === 'income' ? 'cat-other-in' : 'cat-other'), account,
    inboxId: it.id, learnKey: key, learned: !!learned,
  }
}

export default function Inbox({ onAdd, onTrade, go, embedded = false }) {
  const list = useInbox()
  const { settings, accounts, catById, accById, assets } = useVault()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const showToast = useStore((s) => s.showToast)
  const syncNow = useStore((s) => s.syncNow)
  const [paste, setPaste] = useState('')

  useEffect(() => { syncNow(); const iv = setInterval(syncNow, 15000); return () => clearInterval(iv) }, []) // eslint-disable-line

  const addRaw = (raw) => {
    if (!raw.trim()) return
    put('inbox', { raw: raw.trim().slice(0, 1500), at: new Date().toISOString(), source: 'paste' })
    setPaste('')
    showToast('เพิ่มเข้ากล่องรอยืนยันแล้ว')
  }
  const fromClipboard = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) addRaw(t); else showToast('คลิปบอร์ดว่าง') }
    catch { showToast('อ่านคลิปบอร์ดไม่ได้ ให้วางข้อความในช่องแทน') }
  }
  const quickSave = (it) => {
    const d = draftFromInbox(it, { settings, accounts, assets })
    const t = { kind: d.kind, amount: d.amount, date: d.date, note: d.note, category: d.category, account: d.account, createdAt: new Date().toISOString(), fromInbox: true }
    if (d.kind === 'income') { onAdd(d); return } // income goes through the split preview
    put('txn', t)
    remove(it.id, { undo: false })
    showToast(`บันทึก ${money(t.amount)} · ${catById[t.category]?.name || ''}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="ghost" className="!py-2 text-sm" onClick={() => go('settings', 'autocapture')}><Settings2 size={16} /> ตั้งค่าดึงอัตโนมัติ</Button>
      </div>

      <section className="card p-4">
        <Label>วางข้อความแจ้งเตือนจากธนาคาร (LINE / SMS)</Label>
        <textarea className="field min-h-[72px]" placeholder="เช่น รายการเงินออก จำนวนเงิน 350.00 บาท โอนไปยัง ..." value={paste} onChange={(e) => setPaste(e.target.value)} />
        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1 !py-2 text-sm" onClick={fromClipboard}><ClipboardPaste size={16} /> อ่านจากคลิปบอร์ด</Button>
          <Button className="flex-1 !py-2 text-sm" disabled={!paste.trim()} onClick={() => addRaw(paste)}><Check size={16} /> เพิ่ม</Button>
        </div>
      </section>

      {list.length === 0 ? (
        <Empty icon="sparkles" title="ไม่มีรายการรอยืนยัน" text="เมื่อธนาคารแจ้งเตือนเงินเข้า/ออก รายการจะมารอที่นี่ให้แตะยืนยัน" />
      ) : (
        <section className="space-y-2.5">
          {list.map((it) => {
            const p = it.p
            const d = draftFromInbox(it, { settings, accounts, assets })
            const isIn = p.direction === 'in'
            const title = p.kind === 'trade' ? `${p.side === 'buy' ? 'ซื้อ' : 'ขาย'} ${p.coin} ${p.qty}` : p.kind === 'exchange-in' ? `ฝากเงินเข้า ${p.exchange}` : p.kind === 'exchange-out' ? `ถอนเงินจาก ${p.exchange}` : null
            const open = () => (d.isTrade ? onTrade(d) : onAdd(d))
            return (
              <div key={it.id} className="card p-3.5">
                <div className="flex items-start gap-3">
                  {p.kind === 'trade' ? <AssetLogo asset={{ type: 'crypto', symbol: `${p.coin}-USD` }} size={40} /> : (
                  <div className={`w-10 h-10 rounded-2xl grid place-items-center shrink-0 ${p.direction === 'transfer' ? 'bg-sky-50 text-sky-600' : isIn ? 'bg-emerald-50 text-emerald-600' : p.direction ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
                    {p.direction === 'transfer' ? <ArrowLeftRight size={19} /> : p.isCard ? <CreditCard size={19} /> : isIn ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                  </div>)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{title || p.counterparty || (isIn ? 'เงินเข้า' : p.direction ? 'เงินออก' : 'ไม่ทราบประเภท')}</span>
                      <span className={`font-bold num ${p.direction === 'transfer' ? 'text-sky-600' : isIn ? 'text-emerald-600' : 'text-rose'}`}>{p.amount ? `${p.direction === 'transfer' ? '' : isIn ? '+' : '-'}${money(p.amount)}` : '—'}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[p.bank, p.isCard ? 'บัตรเครดิต' : null, new Date(p.time || it.at).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{it.raw}</div>
                    {d.learned && <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1"><Zap size={11} /> จำไว้แล้ว: {catById[d.category]?.name} · {accById[d.account]?.name}</div>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => remove(it.id, { label: 'ทิ้งรายการแล้ว' })} className="px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 flex items-center gap-1"><X size={15} /> ไม่ใช่</button>
                  <Button variant="ghost" className="flex-1 !py-2 text-sm" onClick={open}>{d.isTrade ? 'ตรวจ แล้วบันทึกลงพอร์ต' : d.kind === 'transfer' ? 'ตรวจ แล้วบันทึกการโอน' : 'ตรวจ/แก้ แล้วบันทึก'}</Button>
                  {d.learned && !p.kind && p.amount && p.direction === 'out' && <Button className="!py-2 text-sm" onClick={() => quickSave(it)}><Check size={15} /> บันทึกเลย</Button>}
                </div>
              </div>
            )
          })}
        </section>
      )}
      <div className="text-[11px] text-slate-400">ระบบอ่านยอดเงิน ประเภท และชื่อร้าน/ผู้รับจากข้อความ แล้วจำหมวดที่คุณเลือกไว้สำหรับครั้งถัดไป</div>
    </div>
  )
}

export { InboxIcon, IconBadge, todayISO, round2 }
