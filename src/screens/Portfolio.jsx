import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Radio, Pencil, Check, TrendingUp, TrendingDown, Trash2 } from 'lucide-react'
import { Sheet, Button, Money, Empty, Label } from '../components/ui'
import { AssetLogo, ItemSprite } from '../components/Logos'
import { useStore } from '../store'
import { useVault } from '../lib/useVault'
import { usePrices, fetchQuotes } from '../lib/prices'
import { ASSET_TYPES, symbolsToPoll, assetLabel } from '../lib/portfolio'
import { money, shortDate, evalAmount } from '../lib/format'
import { GOLD } from '../lib/prices'

const pct = (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`
const fmtQ = (p) => (p == null ? '—' : p >= 1000 ? p.toLocaleString(undefined, { maximumFractionDigits: 2 }) : p.toLocaleString(undefined, { maximumFractionDigits: Math.abs(p) < 1 ? 8 : 6 }))
const ccy = (a) => (a.currency === 'USD' ? '$' : '฿')
const Delta = ({ v, className = '' }) => (
  <span className={`num ${v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose' : 'text-slate-500'} ${className}`}>{v > 0 ? '▲' : v < 0 ? '▼' : ''} {pct(Math.abs(v)).replace('+', '')}</span>
)

export default function Portfolio({ onTrade }) {
  const { portfolio, assets, summary } = useVault()
  const status = usePrices((s) => s.status)
  const at = usePrices((s) => s.at)
  const privacy = useStore((s) => s.ui.privacy)
  const [detail, setDetail] = useState(null)
  const [showClosed, setShowClosed] = useState(false)
  const list = showClosed ? portfolio.holdings : portfolio.open
  const types = Object.entries(portfolio.byType).filter(([, v]) => v > 0)
  const investCash = summary.byType.invest || 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">พอร์ตลงทุน</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchQuotes(symbolsToPoll(assets))} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="อัปเดตราคา">
            <RefreshCw size={18} className={status === 'loading' ? 'animate-spin' : ''} />
          </button>
          <Button className="!py-2 text-sm" onClick={() => onTrade({})}><Plus size={16} /> ซื้อ/ขาย</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <div className="space-y-5">
          <section className="hero p-5 md:p-6">
            <div className="text-sm text-white/75">มูลค่าพอร์ต (ตามราคาตลาด)</div>
            <Money value={portfolio.value} className="text-4xl font-bold" />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>กำไร/ขาดทุน <b className="num">{privacy ? '••••' : `${money(portfolio.pnl, { sign: true })} (${pct(portfolio.pnlPct)})`}</b></span>
              <span className="text-white/80">วันนี้ <b className="num">{privacy ? '••••' : money(portfolio.dayPnl, { sign: true })}</b></span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">ต้นทุน</div><Money value={portfolio.cost} decimals={false} className="font-semibold text-sm" /></div>
              <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">กำไรที่ขายแล้ว</div><Money value={portfolio.realized} decimals={false} className="font-semibold text-sm" /></div>
              <div className="rounded-2xl bg-white/15 px-3 py-2"><div className="text-white/70">เงินสดรอลงทุน</div><Money value={investCash} decimals={false} className="font-semibold text-sm" /></div>
            </div>
            {types.length > 0 && (
              <>
                <div className="mt-4 flex h-2.5 rounded-full overflow-hidden bg-white/25">
                  {types.map(([k, v]) => <div key={k} style={{ width: `${(v / portfolio.value) * 100}%`, background: ASSET_TYPES[k].color }} />)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/85">
                  {types.map(([k, v]) => <span key={k} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: ASSET_TYPES[k].color }} />{ASSET_TYPES[k].label} {Math.round((v / portfolio.value) * 100)}%</span>)}
                </div>
              </>
            )}
          </section>
          <div className="text-[11px] text-slate-500 px-1 flex items-center gap-1.5">
            <Radio size={12} className="text-emerald-500" /> คริปโตอัปเดตแบบ Realtime · หุ้น/โภคภัณฑ์อัปเดตทุก 1 นาที (อาจดีเลย์ ~15 นาทีตามตลาด)
            {at && <span>· ล่าสุด {new Date(at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>

        <section>
          <div className="flex justify-between items-center px-1 mb-2 text-sm">
            <span className="text-slate-500">สินทรัพย์ที่ถือ ({portfolio.open.length})</span>
            {portfolio.holdings.length > portfolio.open.length && (
              <button onClick={() => setShowClosed(!showClosed)} className="text-xs text-sky-600">{showClosed ? 'ซ่อนที่ขายหมดแล้ว' : 'แสดงที่ขายหมดแล้ว'}</button>
            )}
          </div>
          {list.length === 0 ? (
            <div className="card"><Empty icon="trending" title="ยังไม่มีสินทรัพย์" text="บันทึกการซื้อหุ้น คริปโต ทองคำ หรือสินทรัพย์อื่น แล้วติดตามกำไร/ขาดทุนแบบเรียลไทม์"
              action={<Button onClick={() => onTrade({})}><Plus size={18} /> ซื้อสินทรัพย์แรก</Button>} /></div>
          ) : (
            <div className="card divide-y divide-slate-100">
              {list.map((h) => (
                <button key={h.asset.id} onClick={() => setDetail(h.asset.id)} className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-slate-50 transition first:rounded-t-[20px] last:rounded-b-[20px]">
                  <AssetLogo asset={h.asset} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold truncate">{assetLabel(h.asset)}</span>
                      {h.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Realtime" />}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {h.asset.source === 'thaigold' ? `${fmtQ(h.qty)} บาท` : `${fmtQ(h.qty)} ${h.asset.unit || ''}`} · {ccy(h.asset)}{fmtQ(h.price)}
                      {h.changePct != null && <> · <Delta v={h.changePct / 100} /></>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Money value={h.value} className="font-semibold" />
                    <div className="text-xs"><Delta v={h.pnlPct} /></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <AssetDetail id={detail} onClose={() => setDetail(null)} onTrade={(x) => { setDetail(null); onTrade(x) }} />
    </div>
  )
}

function AssetDetail({ id, onClose, onTrade }) {
  const { portfolio, assetById, accById } = useVault()
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const privacy = useStore((s) => s.ui.privacy)
  const [edit, setEdit] = useState(null)
  useEffect(() => setEdit(null), [id])
  const a = assetById[id]
  if (!a) return null
  const h = portfolio.holdings.find((x) => x.asset.id === id) || { qty: 0, lots: [], sells: [], value: 0, cost: 0, pnl: 0, pnlPct: 0, realized: 0 }
  const T = ASSET_TYPES[a.type]
  const isGold = a.source === 'thaigold'
  const unit = isGold ? 'บาท' : a.unit || T.unit

  return (
    <Sheet open onClose={onClose} title={T.label} wide
      footer={<div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={() => onTrade({ assetId: a.id, side: 'sell' })} disabled={!(h.qty > 0)}>{a.type === 'derivative' ? 'ปิดสถานะ' : 'ขาย'}</Button>
        <Button className="flex-1" onClick={() => onTrade({ assetId: a.id })}><Plus size={16} /> {a.type === 'derivative' ? 'เปิดสถานะเพิ่ม' : 'ซื้อเพิ่ม'}</Button>
      </div>}>
      <div className="flex items-center gap-3">
        <AssetLogo asset={a} size={56} />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold truncate">{a.name}</div>
          <div className="text-xs text-slate-500">{a.code ? `${a.code} · ` : a.symbol && a.source === 'yahoo' ? `${a.symbol} · ` : ''}{T.label}{a.exchange ? ` · ${a.exchange}` : ''}</div>
        </div>
        <div className="text-right">
          <div className="font-bold num">{ccy(a)}{fmtQ(h.price)}</div>
          {h.changePct != null && <div className="text-xs"><Delta v={h.changePct / 100} /> วันนี้</div>}
        </div>
      </div>
      {isGold && <div className="mt-2 text-[11px] text-slate-500">ราคาทองแท่ง 96.5% ประมาณจาก Gold Spot × USD/THB × {GOLD.BAHT_GRAMS}g/{GOLD.OZ_GRAMS}g × 0.965 (ราคาสมาคมฯ อาจต่างเล็กน้อย)</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        {[['ถืออยู่', `${fmtQ(h.qty)} ${unit}`], ['มูลค่าตอนนี้', privacy ? '••••' : money(h.value)], ['ต้นทุน', privacy ? '••••' : money(h.cost)],
          ['กำไร/ขาดทุน', privacy ? '••••' : `${money(h.pnl, { sign: true })}`]].map(([k, v], i) => (
          <div key={k} className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <div className="text-[11px] text-slate-500">{k}</div>
            <div className={`font-semibold num text-sm ${i === 3 ? (h.pnl >= 0 ? 'text-emerald-600' : 'text-rose') : ''}`}>{v}</div>
            {i === 3 && <div className="text-[11px]"><Delta v={h.pnlPct} /></div>}
          </div>
        ))}
      </div>
      {h.realized !== 0 && <div className="text-xs text-slate-500 mt-2">กำไร/ขาดทุนที่ขายไปแล้ว: <span className={`num font-semibold ${h.realized >= 0 ? 'text-emerald-600' : 'text-rose'}`}>{money(h.realized, { sign: true })}</span></div>}
      {h.qty > 0 && h.avgPrice > 0 && <div className="text-xs text-slate-500 mt-1">ต้นทุนเฉลี่ย {ccy(a)}{fmtQ(h.avgPrice)} ต่อ{unit}</div>}

      <div className="mt-5 flex items-center justify-between">
        <div className="text-sm font-semibold">ประวัติแต่ละไม้ (Lot)</div>
        <button onClick={() => setEdit({ name: a.name, manualPrice: a.manualPrice || '', multiplier: a.multiplier || '' })} className="text-xs text-sky-600 flex items-center gap-1"><Pencil size={13} /> แก้ไขสินทรัพย์</button>
      </div>
      <div className="mt-2 space-y-2">
        {h.lots.map((l) => (
          <button key={l.txn.id} onClick={() => onTrade(l.txn)} className={`w-full text-left rounded-2xl border p-3 hover:bg-slate-50 ${l.open ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                <span className="text-emerald-600">{a.type === 'derivative' ? (l.side === 'short' ? 'Short' : 'Long') : 'ซื้อ'}</span> {fmtQ(l.qty)} {unit} @ {ccy(a)}{fmtQ(l.price)}
              </span>
              <span className="text-xs text-slate-500">{shortDate(l.txn.date)}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-xs text-slate-500">
                ทุน {privacy ? '••••' : money(l.costTHB)}{a.currency === 'USD' && ` · เรต ${l.fx.toFixed(2)}`}{!l.open && ' · ขายหมดแล้ว'}
                {l.open && l.qtyOpen < l.qty && ` · เหลือ ${fmtQ(l.qtyOpen)}`}
              </div>
              {l.open && (
                <div className="text-right">
                  <span className={`num font-semibold text-sm ${l.pnl >= 0 ? 'text-emerald-600' : 'text-rose'}`}>{privacy ? '••••' : money(l.pnl, { sign: true })}</span>
                  <span className="text-xs ml-1"><Delta v={l.pnlPct} /></span>
                </div>
              )}
            </div>
            {l.open && a.currency === 'USD' && !privacy && (
              <div className="text-[11px] text-slate-500 mt-1 flex gap-3">
                <span>จากราคา <b className={l.pricePnl >= 0 ? 'text-emerald-600' : 'text-rose'}>{money(l.pricePnl, { sign: true })}</b></span>
                <span>จากค่าเงิน <b className={l.fxPnl >= 0 ? 'text-emerald-600' : 'text-rose'}>{money(l.fxPnl, { sign: true })}</b></span>
              </div>
            )}
          </button>
        ))}
        {h.sells.map((s) => (
          <button key={s.txn.id} onClick={() => onTrade(s.txn)} className="w-full text-left rounded-2xl border border-slate-200 p-3 hover:bg-slate-50">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium"><span className="text-rose">{a.type === 'derivative' ? 'ปิด' : 'ขาย'}</span> {fmtQ(s.txn.qty)} {unit} @ {ccy(a)}{fmtQ(s.txn.price)}</span>
              <span className="text-xs text-slate-500">{shortDate(s.txn.date)}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">ได้รับ {privacy ? '••••' : money(s.txn.amount)} เข้า {accById[s.txn.account]?.name} · กำไรจริง <b className={s.pnl >= 0 ? 'text-emerald-600' : 'text-rose'}>{privacy ? '••••' : money(s.pnl, { sign: true })}</b></div>
          </button>
        ))}
      </div>

      {edit && (
        <div className="mt-4 rounded-2xl border border-slate-200 p-3 space-y-2">
          <Label>ชื่อที่แสดง</Label>
          <input className="field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          {a.source === 'manual' && (<><Label>ราคาปัจจุบันต่อหน่วย ({a.currency})</Label><input className="field num" inputMode="decimal" value={edit.manualPrice} onChange={(e) => setEdit({ ...edit, manualPrice: e.target.value })} /></>)}
          {a.type === 'derivative' && (<><Label>ตัวคูณสัญญา (Multiplier)</Label><input className="field num" inputMode="decimal" value={edit.multiplier} onChange={(e) => setEdit({ ...edit, multiplier: e.target.value })} /></>)}
          <div className="flex gap-2">
            {!h.lots.length && !h.sells.length && <Button variant="danger" onClick={() => { remove(a.id, { label: 'ลบสินทรัพย์แล้ว' }); onClose() }}><Trash2 size={16} /></Button>}
            <Button className="flex-1" onClick={() => {
              put('asset', { ...a, name: edit.name.trim() || a.name, manualPrice: a.source === 'manual' ? evalAmount(edit.manualPrice, 8) || 0 : a.manualPrice, multiplier: a.type === 'derivative' ? evalAmount(edit.multiplier) || 1 : a.multiplier })
              setEdit(null)
            }}><Check size={16} /> บันทึก</Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

export { TrendingUp, TrendingDown, ItemSprite }
