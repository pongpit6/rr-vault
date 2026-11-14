import { sfx } from '../lib/sfx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Check, Trash2, ChevronLeft, Loader2, Info, History } from 'lucide-react'
import { Sheet, Button, Segmented, Label, Money } from './ui'
import { AssetLogo, ItemSprite } from './Logos'
import { AccountChips } from './TxnForm'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { ASSET_TYPES, POPULAR_CRYPTO, GOLD_PRESETS, COMMODITY_PRESETS, assetLabel } from '../lib/portfolio'
import { searchSymbols, searchFunds, fetchQuotes, assetPrice, fxUSDTHB, fxOf, fxSym, ccyMark, ccyOfSymbol, GOLD, histPrice } from '../lib/prices'
import { evalAmount, todayISO, money, round2 } from '../lib/format'
import { isDebt } from '../lib/defaults'

const GOLD_UNITS = { baht: ['บาท', 1], salung: ['สลึง', 0.25], gram: ['กรัม', 1 / GOLD.BAHT_GRAMS] }

/** Pick an existing asset or create a new one, then record a buy/sell lot. */
export default function TradeForm({ open, onClose, initial }) {
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const showToast = useStore((s) => s.showToast)
  const { accounts, balances, assets, assetById, portfolio, quotes, settings } = useVault()
  const editing = !!initial?.id
  const [step, setStep] = useState('pick')
  const [asset, setAsset] = useState(null) // existing or draft
  const [f, setF] = useState(null)
  const [adv, setAdv] = useState(false)

  useEffect(() => {
    if (!open) { setF(null); setAsset(null); return }
    setAdv(!!(initial?.fx && initial.fx !== 1) || !!initial?.note)
    const a = initial?.assetId ? assetById[initial.assetId] : initial?.asset || null
    setAsset(a)
    if (a?.symbol && a.source !== 'manual') fetchQuotes([a.symbol, 'THB=X', fxSym(a.currency), a.source === 'thaigold' ? 'GC=F' : null])
    setStep(a ? 'form' : 'pick')
    const investAcc = settings.allocation.targets.invest || accounts.find((x) => x.type === 'invest')?.id
    setF({
      side: initial?.side || 'buy', date: initial?.date || todayISO(),
      qtyStr: initial?.qty ? String(initial.goldUnit ? initial.qty / GOLD_UNITS[initial.goldUnit][1] : initial.qty) : '',
      priceStr: initial?.price ? String(initial.entryCcy === 'THB' && a?.currency && a.currency !== 'THB' ? round2(initial.price * initial.fx) : initial.price) : '',
      feeStr: initial?.feeIn != null ? String(initial.feeIn) : initial?.fee ? String(initial.fee) : '',
      entryCcy: initial?.entryCcy || a?.currency || 'THB',
      fxStr: initial?.fx && initial.fx !== 1 ? String(initial.fx) : '',
      account: initial?.account || investAcc,
      note: initial?.note || '', goldUnit: initial?.goldUnit || 'baht', dir: initial?.dir || 'long',
      marginStr: initial?.margin ? String(initial.margin) : '', amountOverride: '',
      mode: initial?.mode || (a && ['crypto', 'gold', 'fund'].includes(a.type) ? 'total' : 'unit'),
      totalStr: initial?.total ? String(initial.total) : '', totalCcy: initial?.totalCcy || 'THB',
      backfill: !!initial?.backfill, histFx: null, histPx: null,
    })
  }, [open]) // eslint-disable-line

  // historical USD/THB and market price for the trade date (helps backfilling old trades)
  useEffect(() => {
    if (!f || !asset || step !== 'form') return
    if (f.date >= todayISO()) { if (f.histFx || f.histPx) setF((s) => ({ ...s, histFx: null, histPx: null })); return }
    let alive = true
    ;(async () => {
      const fxP = fxSym(asset.currency) ? histPrice(fxSym(asset.currency), f.date) : Promise.resolve(null)
      const pxP = asset.source === 'yahoo' && asset.symbol ? histPrice(asset.symbol, f.date) : Promise.resolve(null)
      const [hf, hp] = await Promise.all([fxP, pxP])
      if (alive) setF((s) => ({ ...s, histFx: hf, histPx: hp }))
    })()
    return () => { alive = false }
  }, [f?.date, asset?.symbol, step]) // eslint-disable-line

  if (!open || !f) return null
  const set = (p) => setF((s) => ({ ...s, ...p }))

  if (step === 'pick') return <AssetPicker onClose={onClose} assets={assets} portfolio={portfolio} onPick={(a) => { setAsset(a); set({ entryCcy: a.currency || 'THB', priceStr: '', mode: ['crypto', 'gold', 'fund'].includes(a.type) ? 'total' : 'unit' }); setStep('form'); if (a.symbol && a.source !== 'manual') fetchQuotes([a.symbol, 'THB=X', fxSym(a.currency), a.source === 'thaigold' ? 'GC=F' : null]) }} />

  // ---------- trade form ----------
  const a = asset
  const T = ASSET_TYPES[a.type]
  const usdFx = fxUSDTHB(quotes)
  const usdAsset = !!a.currency && a.currency !== 'THB' // priced in a foreign currency (USD, HKD, CNY…)
  const QC = a.currency || 'THB', qm = ccyMark(QC)
  const fxLive = usdAsset ? fxOf(QC, quotes) || (QC === 'USD' ? usdFx : 1) : usdFx
  const fx = usdAsset ? (evalAmount(f.fxStr, 6) || f.histFx || fxLive) : 1
  const livePrice = assetPrice(a, quotes)
  const unitMul = a.source === 'thaigold' ? GOLD_UNITS[f.goldUnit][1] : 1
  const qty = (evalAmount(f.qtyStr, 10) || 0) * unitMul
  // price is entered either in the asset's currency or in THB; stored in the asset's quote currency
  const totalMode = f.mode === 'total' && a.type !== 'derivative'
  const inCcy = totalMode ? f.totalCcy : f.entryCcy
  const toQuote = (v) => (usdAsset && inCcy === 'THB' ? v / fx : !usdAsset && inCcy === 'USD' ? v * usdFx : v)
  const priceIn = evalAmount(f.priceStr, 10)
  const feeIn = evalAmount(f.feeStr, 8) || 0
  const fee = toQuote(feeIn)
  const totalIn = evalAmount(f.totalStr, 8) || 0
  let price
  if (totalMode) price = qty > 0 && totalIn > 0 ? (f.side === 'buy' ? toQuote(totalIn) - fee : toQuote(totalIn) + fee) / qty : 0
  else price = !(priceIn > 0) ? (f.histPx || livePrice || 0) : toQuote(priceIn)
  const mult = a.type === 'derivative' ? Number(a.multiplier) || 1 : 1
  const held = portfolio.holdings.find((h) => h.asset.id === a.id)
  const heldQty = (held?.qty || 0) + (editing && initial.side === 'sell' ? Number(initial.qty) : 0)

  let amount // THB moved in/out of the cash account
  if (a.type === 'derivative') {
    if (f.side === 'buy') amount = evalAmount(f.marginStr) || 0
    else {
      // closing: margin share returned + realized P/L
      const lots = held?.lots.filter((l) => l.open) || []
      const avgEntry = lots.length ? lots.reduce((s, l) => s + l.price * l.qtyOpen, 0) / Math.max(1e-9, lots.reduce((s, l) => s + l.qtyOpen, 0)) : price
      const marginShare = held && held.qty ? (held.cost * qty) / held.qty : 0
      const sign = (lots[0]?.side || f.dir) === 'short' ? -1 : 1
      amount = round2(marginShare + (price - avgEntry) * qty * mult * sign * fx - fee * fx)
    }
  } else if (totalMode) {
    amount = round2(inCcy === 'THB' ? totalIn : totalIn * (usdAsset ? fx : usdFx))
  } else {
    const gross = qty * price
    amount = round2((f.side === 'buy' ? gross + fee : gross - fee) * fx)
  }
  const override = evalAmount(f.amountOverride)
  if (override > 0) amount = override
  const valid = qty > 0 && price > 0 && amount > 0 && (f.account || f.backfill) && (f.side === 'buy' || qty <= heldQty + 1e-9)

  const save = () => {
    if (!valid) return
    let assetId = a.id
    if (!assetId) assetId = put('asset', { ...a, id: undefined })
    const t = {
      id: initial?.id, kind: 'trade', side: f.side, assetId, qty: Math.round(qty * 1e8) / 1e8, price, fee, fx, amount,
      entryCcy: f.entryCcy, account: f.backfill ? undefined : f.account, date: f.date, note: f.note.trim(), createdAt: initial?.createdAt || new Date().toISOString(),
      mode: totalMode ? 'total' : 'unit', backfill: f.backfill || undefined,
    }
    if (totalMode) { t.total = totalIn; t.totalCcy = f.totalCcy }
    t.feeIn = feeIn
    Object.keys(t).forEach((k) => t[k] === undefined && delete t[k])
    if (a.source === 'thaigold') t.goldUnit = f.goldUnit
    if (a.type === 'derivative') { t.dir = f.dir; if (f.side === 'buy') t.margin = amount }
    if (!t.id) delete t.id
    put('txn', t)
    if (initial?.inboxId) remove(initial.inboxId, { undo: false })
    sfx('coin')
    showToast(`${f.side === 'buy' ? 'ซื้อ' : 'ขาย'} ${a.name} แล้ว`)
    onClose()
  }

  const fmtQ = (p) => (p >= 1000 ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.toLocaleString(undefined, { maximumFractionDigits: Math.abs(p) < 1 ? 8 : 6 }))
  const ccySym = ccyMark

  return (
    <Sheet open onClose={onClose} title={editing ? 'แก้ไขรายการซื้อขาย' : 'บันทึกการซื้อขาย'}
      footer={<div className="flex gap-2">
        {editing && <Button variant="danger" onClick={() => { remove(initial.id); onClose() }}><Trash2 size={17} /></Button>}
        <Button className="flex-1" disabled={!valid} onClick={save}><Check size={18} /> {f.side === 'buy' ? 'บันทึกการซื้อ' : 'บันทึกการขาย'} {amount > 0 && <span className="num opacity-90">· {money(amount)}</span>}</Button>
      </div>}>
      <div className="flex items-center gap-3">
        {!editing && !initial?.assetId && <button onClick={() => setStep('pick')} className="p-2 -ml-2 rounded-xl hover:bg-slate-100"><ChevronLeft size={20} /></button>}
        <AssetLogo asset={a} size={46} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{a.name}</div>
          <div className="text-xs text-slate-500 truncate">{a.code ? `${a.code} · ` : a.symbol && a.source !== 'manual' ? `${a.symbol} · ` : ''}{T.label}</div>
        </div>
        <div className="text-right">
          {livePrice ? <div className="font-semibold num">{ccySym(a.currency)}{fmtQ(livePrice)}</div> : <div className="text-xs text-slate-400">ไม่มีราคาตลาด</div>}
          {livePrice && <div className="text-[10px] text-slate-500">ราคาล่าสุด</div>}
        </div>
      </div>

      <Segmented className="mt-4" value={f.side} onChange={(side) => set({ side })} options={[
        { value: 'buy', label: a.type === 'derivative' ? 'เปิดสถานะ' : 'ซื้อ', color: '#059669' },
        { value: 'sell', label: a.type === 'derivative' ? 'ปิดสถานะ' : 'ขาย', color: '#e11d48' },
      ]} />
      {f.side === 'sell' && <div className="text-xs text-slate-500 mt-1.5">ถืออยู่ {fmtQ(heldQty / unitMul)} {a.source === 'thaigold' ? GOLD_UNITS[f.goldUnit][0] : a.unit || T.unit} · ตัดต้นทุนแบบ FIFO</div>}

      {a.type === 'derivative' && f.side === 'buy' && (
        <>
          <Label className="mt-4">ทิศทาง</Label>
          <Segmented value={f.dir} onChange={(dir) => set({ dir })} options={[{ value: 'long', label: 'Long ▲', color: '#059669' }, { value: 'short', label: 'Short ▼', color: '#e11d48' }]} />
        </>
      )}

      {/* date first: it drives the historical rate & price */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div>
          <Label>วันที่{f.side === 'buy' ? 'ซื้อ' : 'ขาย'}</Label>
          <input type="date" className="field" value={f.date} onChange={(e) => set({ date: e.target.value || todayISO() })} />
        </div>
        {a.type !== 'derivative' ? (
          <div>
            <Label>กรอกแบบ</Label>
            <Segmented value={f.mode} onChange={(mode) => set({ mode })} options={[{ value: 'total', label: 'ยอดเงิน' }, { value: 'unit', label: 'ราคา/หน่วย' }]} />
          </div>
        ) : <div />}
      </div>

      {totalMode ? (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
            <div>
              <Label>{f.side === 'buy' ? 'จ่ายไปทั้งหมด (รวมค่าธรรมเนียม)' : 'ได้รับเงินสุทธิ (หลังหักค่าธรรมเนียม)'}</Label>
              <input className="field num text-lg" inputMode="decimal" placeholder="เช่น 600" value={f.totalStr} onChange={(e) => set({ totalStr: e.target.value })} autoFocus={!editing} />
            </div>
            <div>
              <Label>สกุล</Label>
              <Segmented className="h-[54px]" value={f.totalCcy} onChange={(totalCcy) => set({ totalCcy })} options={[{ value: 'THB', label: '฿' }, { value: usdAsset ? QC : 'USD', label: usdAsset ? qm : '$' }]} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <Label>ค่าธรรมเนียม ({f.totalCcy})</Label>
              <input className="field num" inputMode="decimal" placeholder="เช่น 1" value={f.feeStr} onChange={(e) => set({ feeStr: e.target.value })} />
            </div>
            <div>
              <Label>{f.side === 'buy' ? 'ได้รับ' : 'ขายไป'} ({a.source === 'thaigold' ? GOLD_UNITS[f.goldUnit][0] : a.unit || T.unit})</Label>
              <input className="field num" inputMode="decimal" placeholder={a.type === 'crypto' ? 'เช่น 0.00025' : '0'} value={f.qtyStr} onChange={(e) => set({ qtyStr: e.target.value })} />
            </div>
          </div>
          {a.source === 'thaigold' && (
            <div className="flex gap-1 mt-1.5 justify-end">
              {Object.entries(GOLD_UNITS).map(([k, [lb]]) => (
                <button key={k} onClick={() => set({ goldUnit: k })} className={`px-2 py-1 rounded-lg text-xs ${f.goldUnit === k ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-slate-100 text-slate-500'}`}>{lb}</button>
              ))}
            </div>
          )}
          {price > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              = ราคาเฉลี่ย <b className="text-slate-700 num">{`${qm}${fmtQ(price)}`}</b>{usdAsset && <> (≈ ฿{fmtQ(round2(price * fx))})</>} ต่อ{a.source === 'thaigold' ? 'บาท' : a.unit || T.unit}
              {f.histPx && <> · ราคาตลาดวันนั้น ≈ {qm}{fmtQ(round2(f.histPx))}</>}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <Label>จำนวน ({a.source === 'thaigold' ? GOLD_UNITS[f.goldUnit][0] : a.unit || T.unit})</Label>
              <input className="field num" inputMode="decimal" placeholder="0" value={f.qtyStr} onChange={(e) => set({ qtyStr: e.target.value })} autoFocus={!editing} />
              {a.source === 'thaigold' && (
                <div className="flex gap-1 mt-1.5">
                  {Object.entries(GOLD_UNITS).map(([k, [lb]]) => (
                    <button key={k} onClick={() => set({ goldUnit: k })} className={`px-2 py-1 rounded-lg text-xs ${f.goldUnit === k ? 'bg-amber-100 text-amber-700 font-semibold' : 'bg-slate-100 text-slate-500'}`}>{lb}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>ราคาต่อหน่วย ({a.type === 'derivative' ? 'จุด' : f.entryCcy})</Label>
              <input className="field num" inputMode="decimal" placeholder={(f.histPx || livePrice) ? String(round2(usdAsset && f.entryCcy === 'THB' ? (f.histPx || livePrice) * fx : (f.histPx || livePrice))) : '0'} value={f.priceStr} onChange={(e) => set({ priceStr: e.target.value })} />
              <div className="text-[10px] text-slate-500 mt-1">{f.histPx ? 'ว่างไว้ = ใช้ราคาปิดของวันนั้น' : a.source === 'thaigold' ? 'ราคาทองต่อ 1 บาททองคำ' : 'ว่างไว้ = ใช้ราคาล่าสุด'}</div>
            </div>
          </div>
          {usdAsset && (
            <div className="mt-3">
              <Label>กรอกราคาเป็น</Label>
              <Segmented value={f.entryCcy} onChange={(entryCcy) => set({ entryCcy, priceStr: '', feeStr: '' })} options={[{ value: QC, label: `${qm} ${QC}` }, { value: 'THB', label: '฿ THB' }]} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {a.type === 'derivative' && f.side === 'buy' ? (
              <div>
                <Label>เงินประกัน (Margin) ฿</Label>
                <input className="field num" inputMode="decimal" placeholder="0" value={f.marginStr} onChange={(e) => set({ marginStr: e.target.value })} />
              </div>
            ) : adv ? (
              <div>
                <Label>ค่าธรรมเนียม ({f.entryCcy})</Label>
                <input className="field num" inputMode="decimal" placeholder="0" value={f.feeStr} onChange={(e) => set({ feeStr: e.target.value })} />
              </div>
            ) : null}
          </div>
        </>
      )}

      {!adv && (usdAsset || !totalMode) && <button onClick={() => setAdv(true)} className="mt-3 text-sm text-sky-600">+ เพิ่มเติม{usdAsset ? ' (เรตค่าเงิน' : ' ('}{!totalMode ? (usdAsset ? ', ค่าธรรมเนียม' : 'ค่าธรรมเนียม') : ''}, บันทึก)</button>}
      {usdAsset && adv && (
        <div className="mt-3">
          <Label>เรต {QC}/THB ณ วันนั้น</Label>
          <input className="field num" inputMode="decimal" placeholder={(f.histFx || fxLive).toFixed(2)} value={f.fxStr} onChange={(e) => set({ fxStr: e.target.value })} />
          <div className="text-[10px] text-slate-500 mt-1">{f.histFx ? `ว่างไว้ = ใช้เรตจริงของวันนั้น (${f.histFx.toFixed(2)}) อัตโนมัติ` : 'ว่างไว้ = ใช้เรตล่าสุด'} · ใช้แยกกำไรจากราคาและจากค่าเงิน</div>
        </div>
      )}

      {/* backfill switch */}
      <button onClick={() => set({ backfill: !f.backfill })} className={`mt-4 w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition ${f.backfill ? 'bg-sky-50 border-sky-300' : 'border-slate-200'}`}>
        <History size={20} className={f.backfill ? 'text-sky-600' : 'text-slate-400'} />
        <div className="flex-1 text-sm">
          <div className="font-medium">บันทึกย้อนหลัง · ไม่หัก/ไม่เพิ่มเงินในกระเป๋า</div>
          <div className="text-xs text-slate-500">ใช้กับรายการเก่าที่ยอดเงินในกระเป๋าตอนนี้ตรงกับความจริงอยู่แล้ว</div>
        </div>
        <div className={`w-11 h-6 rounded-full p-0.5 transition shrink-0 ${f.backfill ? 'bg-sky-500' : 'bg-slate-900/10'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transition ${f.backfill ? 'translate-x-5' : ''}`} /></div>
      </button>
      {!f.backfill && f.date < todayISO() && f.side === 'buy' && <div className="text-[11px] text-sky-700 mt-1.5">เป็นรายการในอดีต? ถ้าเงินออกจากบัญชีไปนานแล้ว ให้เปิด “บันทึกย้อนหลัง” เพื่อไม่ให้หักเงินซ้ำ</div>}

      {!f.backfill && (
        <>
          <Label className="mt-4">{f.side === 'buy' ? 'จ่ายจากกระเป๋า' : 'รับเงินเข้ากระเป๋า'}</Label>
          <AccountChips accounts={accounts} balances={balances} value={f.account} onChange={(account) => set({ account })} filter={(x) => !isDebt(x)} />
        </>
      )}

      {!f.backfill && f.side === 'buy' && amount > (balances[f.account] || 0) && (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          เงินในกระเป๋านี้มี {money(balances[f.account] || 0)} ไม่พอสำหรับรายการนี้ ถ้าเป็นการซื้อที่เกิดขึ้นแล้ว ให้เติมเงินเข้ากระเป๋าหรือปรับยอดให้ตรงก่อน
        </div>
      )}
      <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">{f.side === 'buy' ? 'เงินที่ใช้ทั้งหมด' : 'เงินที่ได้รับ'}</span><span className="font-semibold num">{money(amount || 0)}</span></div>
        {usdAsset && qty > 0 && <div className="flex justify-between text-xs text-slate-500"><span>ในสกุล {QC}</span><span className="num">{qm}{round2((amount || 0) / fx).toLocaleString()}</span></div>}
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">ยอดจริงไม่ตรง? แก้ยอดเงินเอง</summary>
          <input className="field num mt-2" inputMode="decimal" placeholder="ยอดเงินบาทจริงจากแอปโบรกเกอร์" value={f.amountOverride} onChange={(e) => set({ amountOverride: e.target.value })} />
        </details>
      </div>
      {adv && <input className="field mt-3" placeholder="บันทึกช่วยจำ (ไม่บังคับ)" value={f.note} onChange={(e) => set({ note: e.target.value })} />}
    </Sheet>
  )
}

/* ---------------- asset picker ---------------- */
function AssetPicker({ onClose, assets, portfolio, onPick }) {
  const [type, setType] = useState(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [manual, setManual] = useState({ name: '', symbol: '', price: '', unit: '', currency: 'THB', coupon: '', maturity: '', multiplier: '1' })
  const timer = useRef(null)

  useEffect(() => {
    if (!type || !['stock', 'fund', 'derivative', 'crypto'].includes(type) || q.trim().length < 2) { setResults([]); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        if (type === 'fund') {
          const [th, glob] = await Promise.all([searchFunds(q.trim()), searchSymbols(q.trim()).catch(() => [])])
          setResults([...th, ...glob.filter((x) => x.type === 'MUTUALFUND' || x.type === 'ETF')])
        } else {
          const r = await searchSymbols(q.trim())
          setResults(type === 'crypto' ? r.filter((x) => x.type === 'CRYPTOCURRENCY' && x.symbol.endsWith('-USD')) : r.filter((x) => x.type !== 'CRYPTOCURRENCY'))
        }
      } catch { setResults([]) }
      setLoading(false)
    }, 350)
  }, [q, type])

  const owned = assets.filter((a) => portfolio.holdings.some((h) => h.asset.id === a.id && h.qty > 0))
  const pickYahoo = (r, t) => {
    if (r.type === 'THFUND') return onPick({ type: 'fund', symbol: r.symbol, code: r.code, name: r.name, source: 'yahoo', currency: 'THB', unit: 'หน่วย', exchange: 'กองทุนรวมไทย' })
    const ccy = ccyOfSymbol(r.symbol)
    onPick({ type: t, symbol: r.symbol, name: r.name, source: 'yahoo', currency: ccy, unit: t === 'crypto' ? r.symbol.replace('-USD', '') : ASSET_TYPES[t].unit, exchange: r.exchange })
  }

  return (
    <Sheet open onClose={onClose} title={type ? ASSET_TYPES[type].label : 'เลือกสินทรัพย์'} wide>
      {!type && (
        <>
          {owned.length > 0 && (
            <>
              <Label>ที่ถืออยู่</Label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
                {owned.map((a) => (
                  <button key={a.id} onClick={() => onPick(a)} className="shrink-0 flex items-center gap-2 pl-2 pr-3 py-2 rounded-2xl border border-slate-200 hover:bg-slate-50">
                    <AssetLogo asset={a} size={32} /><span className="text-sm font-medium max-w-[120px] truncate">{assetLabel(a)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <Label className="mt-2">สินทรัพย์ใหม่</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(ASSET_TYPES).map(([k, t]) => (
              <button key={k} onClick={() => setType(k)} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-left">
                <ItemSprite name={t.item} size={36} />
                <div className="min-w-0"><div className="text-sm font-semibold">{t.label}</div><div className="text-[11px] text-slate-500 leading-tight">{t.desc}</div></div>
              </button>
            ))}
          </div>
        </>
      )}

      {type && (
        <button onClick={() => { setType(null); setQ('') }} className="text-sm text-sky-600 flex items-center gap-1 mb-3"><ChevronLeft size={16} /> เลือกประเภทอื่น</button>
      )}

      {type === 'gold' && (
        <div className="space-y-2">
          {GOLD_PRESETS.map((p) => (
            <button key={p.symbol} onClick={() => onPick({ type: 'gold', ...p })} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-left">
              <ItemSprite name="gold" size={36} />
              <div className="flex-1"><div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-slate-500">{p.note || `${p.symbol} · ต่อ${p.unit} (USD)`}</div></div>
            </button>
          ))}
        </div>
      )}

      {type === 'commodity' && (
        <div className="grid sm:grid-cols-2 gap-2">
          {COMMODITY_PRESETS.map((p) => (
            <button key={p.symbol} onClick={() => onPick({ type: 'commodity', ...p })} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-left">
              <ItemSprite name={p.item} size={36} />
              <div><div className="font-semibold text-sm">{p.name}</div><div className="text-xs text-slate-500">{p.symbol} · ต่อ{p.unit} (USD)</div></div>
            </button>
          ))}
        </div>
      )}

      {type === 'crypto' && !q && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
          {POPULAR_CRYPTO.map(([s, n]) => {
            const a = { type: 'crypto', symbol: `${s}-USD`, name: n, source: 'yahoo', currency: 'USD', unit: s }
            return (
              <button key={s} onClick={() => onPick(a)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50">
                <AssetLogo asset={a} size={36} /><span className="text-xs font-semibold">{s}</span>
              </button>
            )
          })}
        </div>
      )}

      {['stock', 'crypto', 'fund', 'derivative'].includes(type) && (
        <>
          <div className="relative">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="field !pl-10" autoFocus placeholder={type === 'stock' ? 'ค้นหา เช่น PTT, KBANK, AAPL, NVDA, VOO' : type === 'crypto' ? 'ค้นหาเหรียญอื่น' : type === 'fund' ? 'ค้นหากองทุนไทย เช่น K-GSELECT, SCBSET, SSF' : 'ค้นหาสัญลักษณ์ (ถ้ามี)'} value={q} onChange={(e) => setQ(e.target.value)} />
            {loading && <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
          </div>
          <div className="mt-2 -mx-2">
            {results.map((r) => {
              const a = { type, symbol: r.symbol, code: r.code, name: r.name, source: 'yahoo' }
              return (
                <button key={r.symbol} onClick={() => pickYahoo(r, type)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-slate-50 text-left">
                  <AssetLogo asset={a} size={36} />
                  <div className="flex-1 min-w-0"><div className="text-sm font-semibold">{r.code || r.symbol}</div><div className="text-xs text-slate-500 truncate">{r.name}</div></div>
                  <span className="text-[11px] text-slate-400">{r.exchange}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {['bond', 'fund', 'derivative'].includes(type) && (
        <div className="mt-3 rounded-2xl border border-slate-200 p-3 space-y-2">
          <div className="text-sm font-semibold">{type === 'derivative' ? 'สัญญาที่ไม่มีราคาออนไลน์ / ตั้งค่าเอง' : 'เพิ่มแบบกำหนดเอง'}</div>
          <input className="field" placeholder={type === 'bond' ? 'ชื่อ เช่น พันธบัตรออมทรัพย์ 2569' : type === 'fund' ? 'ชื่อกองทุน เช่น K-USA-A' : 'ชื่อสัญญา เช่น S50Z26'} value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="field num" inputMode="decimal" placeholder={type === 'bond' ? 'ราคาต่อหน่วย (มักเป็น 1,000)' : 'ราคาปัจจุบันต่อหน่วย'} value={manual.price} onChange={(e) => setManual({ ...manual, price: e.target.value })} />
            <Segmented value={manual.currency} onChange={(currency) => setManual({ ...manual, currency })} options={[{ value: 'THB', label: '฿' }, { value: 'USD', label: '$' }]} />
          </div>
          {type === 'bond' && (
            <div className="grid grid-cols-2 gap-2">
              <input className="field num" inputMode="decimal" placeholder="ดอกเบี้ยคูปอง %/ปี" value={manual.coupon} onChange={(e) => setManual({ ...manual, coupon: e.target.value })} />
              <input type="date" className="field" value={manual.maturity} onChange={(e) => setManual({ ...manual, maturity: e.target.value })} title="วันครบกำหนด" />
            </div>
          )}
          {type === 'derivative' && (
            <input className="field num" inputMode="decimal" placeholder="ตัวคูณสัญญา (Multiplier) เช่น 200" value={manual.multiplier} onChange={(e) => setManual({ ...manual, multiplier: e.target.value })} />
          )}
          <Button className="w-full" disabled={!manual.name.trim()} onClick={() => onPick({
            type, name: manual.name.trim(), source: 'manual', manualPrice: evalAmount(manual.price, 8) || 0, currency: manual.currency,
            unit: ASSET_TYPES[type].unit, coupon: evalAmount(manual.coupon) || undefined, maturity: manual.maturity || undefined,
            multiplier: type === 'derivative' ? evalAmount(manual.multiplier) || 1 : undefined,
          })}><Check size={16} /> ใช้สินทรัพย์นี้</Button>
          {type === 'derivative' && <div className="text-[11px] text-slate-500 flex gap-1"><Info size={13} className="shrink-0 mt-0.5" /> ถ้าเลือกจากผลค้นหา (เช่น GC=F, ES=F) ราคาจะอัปเดตอัตโนมัติ</div>}
        </div>
      )}
    </Sheet>
  )
}
