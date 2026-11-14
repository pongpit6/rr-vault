import { useState } from 'react'
import { Hammer, Users, Smile, Coins, ArrowUpCircle, Trash2, Sparkles, Repeat, TrendingUp } from 'lucide-react'
import TownScene from './TownScene'
import { Portrait } from './RpgBits'
import { Sheet } from './ui'
import { useStore } from '../store'
import { BUILDINGS, HALL, NPCS, DECOR, priceOf, EXCHANGE_WEEKLY, RESIDENTS } from '../lib/town'

/* ---------- money chips ---------- */
export function FiatChip({ v, className = '' }) { return <span className={`px-chip text-emerald-700 ${className}`} title="FIAT — หาง่าย แต่เฟ้อ">💵 <b className="num">{Math.round(v).toLocaleString()}</b></span> }
export function GoldChip({ v, className = '' }) { return <span className={`px-chip text-amber-600 ${className}`} title="GOLD — หายาก ไม่เฟ้อ">🪙 <b className="num">{Math.round(v).toLocaleString()}</b></span> }
export function Wallet({ rpg }) { return <><FiatChip v={rpg.fiat} /><GoldChip v={rpg.gold} /></> }

/** "💵 120 · 🪙 2", red when you can't afford that part. */
export function Price({ p, rpg }) {
  if (!p) return null
  return (
    <span className="inline-flex items-center gap-1.5 num text-xs font-semibold">
      {p.fiat > 0 && <span className={rpg.fiat >= p.fiat ? 'text-emerald-700' : 'text-rose'}>💵{p.fiat.toLocaleString()}</span>}
      {p.gold > 0 && <span className={rpg.gold >= p.gold ? 'text-amber-600' : 'text-rose'}>🪙{p.gold}</span>}
      {!p.fiat && !p.gold && <span className="text-slate-500">ฟรี</span>}
    </span>
  )
}

function Section({ icon: I, title, right, children }) {
  return (
    <section className="px-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <I size={16} className="text-teal-600" />
        <h2 className="px-font text-[11px] tracking-wide flex-1">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}
const btn = 'px-3 py-1.5 text-xs font-semibold border-2 border-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300'

export default function TownTab({ rpg }) {
  const T = rpg.town
  const showToast = useStore((s) => s.showToast)
  const theme = useStore((s) => s.ui.theme)
  const [sel, setSel] = useState(null) // plot index | 'hall' | null
  const [res, setRes] = useState(null)
  const party = rpg.party.filter((p) => p.joined && p.id !== 'knight').map((p) => p.id)
  const ok = (done, msg) => { if (done) showToast(msg); else showToast('FIAT/GOLD ไม่พอ หรือทำไม่ได้ตอนนี้') }

  return (
    <div className="space-y-4">
      <section className="px-card overflow-hidden">
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="font-bold">เมืองของฉัน <span className="px-font text-[9px] text-teal-600">HALL LV.{T.town.hall}</span></div>
            <div className="text-[11px] text-slate-500">แตะแปลงที่ดินในฉาก (หรือรายการด้านล่าง) เพื่อสร้าง/อัปเกรด · เลื่อนซ้ายขวาดูทั้งเมือง</div>
          </div>
          <Wallet rpg={rpg} />
        </div>
        <TownScene town={T} party={party} pet={rpg.pet.sprite} hue={rpg.skin?.hue || 0} dark={theme === 'pixel-night'} selected={typeof sel === 'number' ? sel : null} onSelect={setSel} />
        <div className="grid grid-cols-4 text-center text-[11px] border-t-2 border-slate-800">
          <Stat icon={<Users size={13} />} label="ประชากร" v={T.pop} />
          <Stat icon={<Smile size={13} />} label="ความสุข" v={`${T.happiness}%`} />
          <Stat icon={<Coins size={13} />} label="FIAT/วัน" v={`+${T.dailyFiat}`} />
          <Stat icon={<Sparkles size={13} />} label="ลุ้น GOLD" v={`${T.goldChance}%`} />
        </div>
      </section>

      {/* daily collection */}
      <section className="px-card p-3.5 flex items-center gap-3" data-testid="town-collect">
        <span className="text-3xl">🧺</span>
        <div className="flex-1 min-w-0 text-sm">
          {res ? <div className="anim-pop font-semibold text-emerald-700">เก็บได้ +{res.fiat} FIAT{res.interest ? ` (ดอกเบี้ย ${res.interest})` : ''}{res.gold ? ' · 🪙 เหมืองเจอทอง +1!' : ''}</div>
            : rpg.collectReady ? <div><b>รายได้เมืองวันนี้พร้อมเก็บ</b><div className="text-xs text-slate-500">ฟาร์ม ตลาด NPC{T.bankRate ? ' + ดอกเบี้ยธนาคาร' : ''}{T.goldChance ? ` · ลุ้นทอง ${T.goldChance}%` : ''}</div></div>
            : rpg.loggedToday ? <div className="text-slate-500">{T.dailyFiat || T.bankRate || T.goldChance ? 'เก็บรายได้วันนี้แล้ว พรุ่งนี้มาใหม่' : 'สร้างฟาร์ม ตลาด หรือจ้าง NPC เพื่อมีรายได้รายวัน'}</div>
            : <div className="text-slate-500">บันทึกรายการวันนี้ก่อน แล้วค่อยมาเก็บรายได้เมือง</div>}
        </div>
        <button className={`${btn} bg-emerald-500 text-white`} disabled={!rpg.collectReady} onClick={() => setRes(rpg.collect())}>เก็บ</button>
      </section>

      <Section icon={Hammer} title={`LAND · ที่ดิน ${T.built.length}/${T.plotCount}`}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          <button onClick={() => setSel('hall')} className="px-inner p-2 text-center hover:bg-teal-50" data-testid="plot-hall">
            <div className="text-2xl">{HALL.emoji}</div><div className="text-[11px] font-semibold">{HALL.name}</div><div className="px-font text-[8px] text-amber-600">{'★'.repeat(T.town.hall)}</div>
          </button>
          {T.plots.map((b, i) => (
            <button key={i} onClick={() => setSel(i)} className={`px-inner p-2 text-center hover:bg-teal-50 ${sel === i ? 'ring-2 ring-amber-400' : ''}`} data-testid={`plot-${i}`}>
              <div className="text-2xl">{b ? BUILDINGS[b.type].emoji : '➕'}</div>
              <div className="text-[11px] font-semibold truncate">{b ? BUILDINGS[b.type].name : `แปลง ${i + 1}`}</div>
              <div className="px-font text-[8px] text-amber-600 h-3">{b ? '★'.repeat(b.lv) : <span className="text-slate-400">ว่าง</span>}</div>
            </button>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 mt-2">ที่ดินเพิ่มเมื่อขยายศาลากลาง และเมื่อเดินทางถึงดินแดนใหม่ (มูลค่าสุทธิเพิ่ม)</div>
      </Section>

      <Section icon={Users} title={`NPC · ชาวเมือง (${T.npcs.length}/${T.npcSlots})`}>
        {!T.npcSlots && <div className="text-xs text-slate-500 mb-2">สร้าง 🍺 โรงเตี๊ยมก่อน เพื่อมีที่พักให้ NPC ที่จ้างมา</div>}
        <div className="grid grid-cols-2 gap-2">
          {RESIDENTS.map((n) => (
            <div key={n.id} className="px-inner p-2.5 flex items-center gap-2">
              <Portrait sprite={n.sprite} size={40} />
              <div className="min-w-0"><div className="text-xs font-semibold">{n.name}</div><div className="text-[10px] text-slate-500">ชาวบ้านดั้งเดิม</div></div>
            </div>
          ))}
          {NPCS.map((n) => {
            const hired = T.npcs.includes(n.id), p = priceOf(n.cost, rpg.econData)
            return (
              <div key={n.id} className={`px-inner p-2.5 ${hired ? 'bg-teal-50' : ''}`} data-testid={`npc-${n.id}`}>
                <div className="flex items-center gap-2">
                  <Portrait sprite={n.sprite} size={40} dim={!hired && !T.npcSlots} />
                  <div className="min-w-0 flex-1"><div className="text-xs font-semibold">{n.name}</div><div className="text-[10px] text-teal-700">{n.perkText}</div></div>
                </div>
                {hired ? <div className="text-[10px] text-slate-500 mt-1.5 italic">“{n.line}”</div> : (
                  <div className="mt-1.5 flex items-center justify-between gap-1"><Price p={p} rpg={rpg} />
                    <button className={`${btn} bg-violet-500 text-white`} disabled={T.npcs.length >= T.npcSlots || !rpg.afford(p)} onClick={() => ok(rpg.hire(n.id), `${n.name}ย้ายเข้าเมืองแล้ว!`)}>จ้าง</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section icon={Sparkles} title="DECOR · ตกแต่งเมือง">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DECOR.map((d) => {
            const own = T.decor.includes(d.id), p = priceOf(d.cost, rpg.econData)
            return (
              <div key={d.id} className={`px-inner p-2 text-center ${own ? 'bg-teal-50' : ''}`}>
                <div className="text-2xl">{d.emoji}</div><div className="text-[11px] font-semibold">{d.name}</div><div className="text-[10px] text-teal-700">ความสุข +{d.happy}</div>
                {own ? <div className="text-[10px] text-slate-500 mt-1">ติดตั้งแล้ว ✓</div> : (
                  <button className={`${btn} mt-1 w-full bg-white`} disabled={!rpg.afford(p)} onClick={() => ok(rpg.buyDecor(d.id), `ติดตั้ง${d.name}แล้ว`)}><Price p={p} rpg={rpg} /></button>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section icon={Repeat} title="EXCHANGE · แลกเงิน">
        <div className="text-sm">แลก <b>FIAT → GOLD</b> เรต <b className="num">{rpg.exchangeRate}</b> : 1 · สัปดาห์นี้แลกแล้ว {rpg.exchangedThisWeek}/{EXCHANGE_WEEKLY}</div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><TrendingUp size={12} className="text-rose" /> เงินเฟ้อสะสม +{Math.round((rpg.inflation - 1) * 100)}% · ราคาที่จ่ายด้วย FIAT ขึ้น 2% ทุกเดือน — เก็บ FIAT ไว้เฉย ๆ ค่าจะลดลง ส่วน GOLD ไม่เฟ้อ{T.bankRate ? ` · ธนาคารให้ดอกเบี้ย ${T.bankRate}%/วัน` : ''}</div>
        <div className="mt-2 flex gap-2">
          {[1, 3].map((n) => <button key={n} className={`${btn} bg-amber-400`} disabled={rpg.exchangedThisWeek + n > EXCHANGE_WEEKLY || rpg.fiat < rpg.exchangeRate * n} onClick={() => ok(rpg.exchange(n), `แลกได้ ${n} GOLD`)}>แลก {n} 🪙 ({(rpg.exchangeRate * n).toLocaleString()} 💵)</button>)}
        </div>
      </Section>

      <Section icon={Smile} title="HAPPINESS · ความสุขของเมือง">
        <div className="space-y-1 text-xs">
          {T.happyParts.map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span className={`num font-semibold ${v < 0 ? 'text-rose' : 'text-emerald-700'}`}>{v > 0 ? '+' : ''}{v}</span></div>)}
          <div className="text-[11px] text-slate-500 pt-1">ความสุขยิ่งสูง รายได้รายวันยิ่งมาก (×{T.happyMult.toFixed(2)}) · บ้านเยอะเกินอาคารอื่นจะแออัด</div>
        </div>
      </Section>

      <PlotSheet rpg={rpg} sel={sel} onClose={() => setSel(null)} ok={ok} />
    </div>
  )
}

const Stat = ({ icon, label, v }) => <div className="py-2 border-r-2 last:border-r-0 border-slate-800/10"><div className="flex items-center justify-center gap-1 text-slate-500">{icon}{label}</div><div className="font-bold num text-sm">{v}</div></div>

function PlotSheet({ rpg, sel, onClose, ok }) {
  const T = rpg.town
  const [confirm, setConfirm] = useState(false)
  if (sel == null) return null
  const close = () => { setConfirm(false); onClose() }
  if (sel === 'hall') {
    const p = rpg.hallPrice(), lv = T.town.hall
    return (
      <Sheet open onClose={close} title={`${HALL.emoji} ${HALL.name} ระดับ ${lv}`}>
        <div className="text-sm">ศูนย์กลางของเมือง ยิ่งระดับสูง ยิ่งมีที่ดินให้สร้างมากขึ้น</div>
        <div className="mt-3 px-inner p-3 text-sm">ตอนนี้: ที่ดิน {HALL.plots[lv - 1]} แปลง (+ โบนัสจากดินแดน {T.plotCount - HALL.plots[lv - 1]})</div>
        {p ? (
          <div className="mt-3 px-inner p-3">
            <div className="text-sm font-semibold">อัปเกรดเป็นระดับ {lv + 1}: ที่ดิน {HALL.plots[lv]} แปลง</div>
            <div className="mt-2 flex items-center justify-between"><Price p={p} rpg={rpg} /><button className={`${btn} bg-teal-500 text-white`} disabled={!rpg.afford(p)} onClick={() => { ok(rpg.upgradeHall(), 'ขยายศาลากลางแล้ว!'); close() }}><ArrowUpCircle size={13} className="inline -mt-0.5" /> อัปเกรด</button></div>
          </div>
        ) : <div className="mt-3 text-sm text-teal-700 font-semibold">ระดับสูงสุดแล้ว 👑</div>}
      </Sheet>
    )
  }
  const b = T.plots[sel]
  if (!b) {
    return (
      <Sheet open onClose={close} title={`แปลงที่ ${sel + 1} · เลือกสิ่งที่จะสร้าง`}>
        <div className="space-y-2">
          {Object.entries(BUILDINGS).map(([type, B]) => {
            const p = rpg.buildPrice(type, 1), full = T.count(type) >= B.max
            return (
              <div key={type} className="px-inner p-2.5 flex items-center gap-3" data-testid={`build-${type}`}>
                <span className="text-2xl w-8 text-center">{B.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{B.name} <span className="text-[10px] text-slate-400 font-normal">{T.count(type)}/{B.max}</span></div>
                  <div className="text-[11px] text-slate-500">{B.desc}</div>
                  <div className="text-[11px] text-teal-700">{B.perkText(B.perk[0])}</div>
                </div>
                <div className="flex flex-col items-end gap-1"><Price p={p} rpg={rpg} />
                  <button className={`${btn} bg-teal-500 text-white`} disabled={full || !rpg.afford(p)} onClick={() => { ok(rpg.build(sel, type), `สร้าง${B.name}แล้ว!`); close() }}>{full ? 'ครบแล้ว' : 'สร้าง'}</button>
                </div>
              </div>
            )
          })}
        </div>
      </Sheet>
    )
  }
  const B = BUILDINGS[b.type], next = b.lv < 3 ? rpg.buildPrice(b.type, b.lv + 1) : null
  return (
    <Sheet open onClose={close} title={`${B.emoji} ${B.name} · แปลงที่ ${sel + 1}`}>
      <div className="text-sm text-slate-600">{B.desc}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {B.perk.map((v, k) => (
          <div key={k} className={`px-inner p-2 ${k + 1 === b.lv ? 'ring-2 ring-teal-500' : k + 1 < b.lv ? 'bg-teal-50' : ''}`}>
            <div className="px-font text-[9px] text-amber-600">{'★'.repeat(k + 1)}</div>
            <div className="text-[11px] mt-1">{B.perkText(v)}</div>
          </div>
        ))}
      </div>
      {next ? (
        <div className="mt-3 px-inner p-3 flex items-center justify-between gap-2">
          <div className="text-sm">อัปเกรดเป็น {'★'.repeat(b.lv + 1)}<div><Price p={next} rpg={rpg} /></div></div>
          <button className={`${btn} bg-teal-500 text-white`} disabled={!rpg.afford(next)} onClick={() => { ok(rpg.upgrade(sel), `อัปเกรด${B.name}แล้ว!`); close() }} data-testid="upgrade-btn"><ArrowUpCircle size={13} className="inline -mt-0.5" /> อัปเกรด</button>
        </div>
      ) : <div className="mt-3 text-sm text-teal-700 font-semibold">ระดับสูงสุดแล้ว ✨</div>}
      <button className="mt-4 text-xs text-rose flex items-center gap-1" onClick={() => { if (!confirm) return setConfirm(true); ok(rpg.demolish(sel), `รื้อ${B.name}แล้ว`); close() }}>
        <Trash2 size={13} /> {confirm ? 'แตะอีกครั้งเพื่อยืนยันการรื้อ (ได้คืน 30% ของค่าสร้างระดับ 1)' : 'รื้อถอน'}
      </button>
    </Sheet>
  )
}
