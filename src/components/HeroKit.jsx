import { useMemo, useState } from 'react'
import { Shirt, Ghost, Images, Cake, Flag } from 'lucide-react'
import { Portrait } from './RpgBits'
import { Money, Sheet } from './ui'
import { useStore, selectList } from '../store'
import { useVault } from '../lib/useVault'
import { OUTFITS, rangeStats, bdaySkin, FREEDOM_STEPS } from '../lib/hero'
import { GEAR_TIERS } from '../lib/party'
import { addDays } from '../lib/habits'
import { netWorthSeries } from '../lib/plan'
import { todayISO, shiftMonth } from '../lib/format'

function Section({ icon: I, title, right, children, testid }) {
  return (
    <section className="px-card p-4" data-testid={testid}>
      <div className="flex items-center gap-2 mb-3">
        <I size={16} className="text-teal-600" />
        <h2 className="px-font text-[11px] tracking-wide flex-1">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}
const Bar = ({ pct, color = '#14b8a6' }) => <div className="px-xp !h-2"><div style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: color }} /></div>
const thDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const mkLabel = (mk) => `${MONTHS_TH[+mk.slice(5, 7) - 1]} ${(+mk.slice(0, 4) + 543) % 100}`
const SLOT_EMOJI = { weapon: '🗡️', armor: '🧥', boots: '🥾', satchel: '🎒', ring: '💍' }

/* ---------------- the hero (you): outfit, parts, condition ---------------- */
export function HeroCard({ rpg }) {
  const o = rpg.outfit, c = rpg.condition
  return (
    <Section icon={Shirt} title="HERO · ตัวคุณในเกม" testid="hero-card">
      <div className="flex gap-3">
        <div className="w-24 h-24 grid place-items-center border-2 border-slate-800 bg-emerald-50 shrink-0"><Portrait sprite="hero" size={84} hue={rpg.skin?.hue || 0} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500">ชุดขั้น {o.stage}/{o.of} · ตามยศ “{rpg.title}”</div>
          <div className="font-bold leading-tight">{o.name}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{o.look}</div>
          {o.next ? <div className="text-[11px] text-slate-600 mt-1">ชุดถัดไป “{o.next.name}” ที่เลเวล {o.next.lv} (ตอนนี้ {rpg.level})</div> : <div className="text-[11px] text-amber-700 mt-1">ชุดสูงสุดแล้ว 👑</div>}
          {rpg.skin && <div className="text-[11px] text-violet-700 mt-0.5">สวมสกิน: {rpg.skin.name}</div>}
        </div>
      </div>
      <div className="flex gap-1 mt-3">{OUTFITS.map((x, i) => <div key={i} className="flex-1 h-2" style={{ background: i < o.stage ? '#10b981' : '#e2e8f0' }} title={`${x.name} · เลเวล ${x.lv}`} />)}</div>
      <div className="grid grid-cols-5 gap-1.5 mt-3">
        {rpg.gear.map((g) => (
          <div key={g.slot} className="px-inner p-1.5 text-center" title={`${g.name} · ${g.how}: ${g.valueText}`}>
            <div className="text-lg leading-none">{SLOT_EMOJI[g.slot]}</div>
            <div className="text-[10px] text-slate-500 mt-1">{g.label}</div>
            <div className="text-[10px] font-bold" style={{ color: g.color }}>{g.tierName}</div>
          </div>
        ))}
      </div>
      {c && (
        <div className="mt-3 px-inner p-2.5 text-xs flex items-start gap-2" data-testid="hero-condition">
          <span className="text-xl leading-none">{c.emoji}</span>
          <div className="flex-1">
            <div><b>สภาพร่างกาย 7 วัน: {c.name}</b>{c.score != null && <span className="text-slate-500"> · {Math.round(c.score * 100)}%</span>}</div>
            <div className="text-slate-500">นอนตรงเวลา {c.ontime} คืน · ออกกำลังกาย {c.ex} วัน · สมาธิ {c.med} วัน — {c.tip}</div>
          </div>
        </div>
      )}
      <div className="text-[11px] text-slate-400 mt-2">ชุดแต่ละชิ้นมาจากชีวิตจริง: อาวุธ = จ่ายหนี้ · เสื้อคลุม = เงินสำรอง · รองเท้า = ออกกำลังกาย · กระเป๋า = ความรู้ · แหวน = เงินลงทุน ภาพตัวละครหน้าตาคุณจะมาพร้อมงานวาด PixelLab</div>
    </Section>
  )
}

/* ---------------- shadow of last month ---------------- */
export function ShadowRaceCard({ rpg }) {
  const s = rpg.shadow
  if (!s) return null
  const you = Math.max(8, Math.min(92, 50 + s.lead * 14))
  return (
    <Section icon={Ghost} title="SHADOW · เงาของตัวเอง" testid="shadow-race" right={<span className="text-[11px] text-slate-500">เดือนก่อน ณ วันที่ {new Date().getDate()}</span>}>
      <div className="relative h-14 px-inner overflow-hidden">
        <div className="absolute inset-x-2 bottom-2 border-b-2 border-dashed border-slate-300" />
        <div className="absolute bottom-2 -translate-x-1/2 opacity-40 grayscale" style={{ left: '50%' }}><Portrait sprite="hero" size={40} /></div>
        <div className="absolute bottom-2 -translate-x-1/2 transition-all" style={{ left: `${you}%` }}><Portrait sprite="hero" size={40} hue={rpg.skin?.hue || 0} /></div>
        <div className="absolute right-1 top-0.5 text-sm">🏁</div>
      </div>
      <div className="text-sm font-semibold mt-2">{s.ahead ? '🏃 คุณนำเงาเดือนก่อนอยู่' : s.lead < 0 ? '👤 เงาเดือนก่อนยังนำอยู่ ยังตามทัน' : '🤝 สูสีกับเดือนก่อน'}</div>
      <div className="space-y-1 mt-2">
        {s.lanes.map((l) => (
          <div key={l.id} className="flex items-center gap-2 text-xs">
            <span className="w-5">{l.icon}</span>
            <span className="flex-1 text-slate-600">{l.name}{l.lower ? ' (น้อยกว่าชนะ)' : ''}</span>
            <span className="num">{l.money ? <Money value={l.you} decimals={false} /> : l.you}</span>
            <span className="text-slate-400">vs</span>
            <span className="num text-slate-500">{l.money ? <Money value={l.ghost} decimals={false} /> : l.ghost}</span>
            <span className={`w-10 text-right font-bold ${l.win ? 'text-emerald-600' : l.tie ? 'text-slate-400' : 'text-rose-500'}`}>{l.win ? 'ชนะ' : l.tie ? 'เสมอ' : 'แพ้'}</span>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-400 mt-2">จบเดือนแล้วชนะเงาอย่างน้อย 2 ใน 3 ด้าน รับ 120 FIAT ในเควสต์รายเดือน</div>
    </Section>
  )
}

/* ---------------- growth album ---------------- */
const ROWS = [
  ['level', 'เลเวล', (v) => v],
  ['nw', 'มูลค่าสุทธิ', null, true],
  ['debt', 'หนี้คงเหลือ', null, true, true],
  ['invest', 'เงินลงทุน', null, true],
  ['reserveM', 'เงินสำรอง (เดือน)', (v) => v?.toFixed(1)],
  ['books', 'หนังสือที่อ่านจบ', (v) => v],
  ['learnt', 'คำศัพท์ที่จำได้', (v) => v],
  ['exercise', 'วันออกกำลังกาย', (v) => v],
]
export function AlbumCard({ rpg }) {
  const v = useVault()
  const items = useStore((s) => s.items)
  const snaps = useMemo(() => selectList(items, 'snap'), [items])
  const mkNow = todayISO().slice(0, 7)
  // pages saved by the game, plus older months rebuilt from the ledger (net worth and level only)
  const pages = useMemo(() => {
    const out = {}
    const series = netWorthSeries(v.accounts, v.txns, v.settings, snaps)
    for (const p of series) out[p.date.slice(0, 7)] = { nw: Math.round(p.value), partial: true }
    const levels = rpg.econData?.levels || []
    for (const mk of Object.keys(out)) {
      const end = `${mk}-31`
      const lv = levels.filter((x) => x.at.slice(0, 10) <= end).map((x) => x.lv)
      if (lv.length) out[mk].level = Math.max(...lv)
    }
    for (const [mk, a] of Object.entries(rpg.album || {})) out[mk] = { ...a }
    return out
  }, [v.accounts, v.txns, v.settings, snaps, rpg.album, rpg.econData?.levels])
  const keys = Object.keys(pages).sort()
  const target = shiftMonth(mkNow, -6)
  const defFrom = [...keys].reverse().find((k) => k <= target) || keys[0]
  const [from, setFrom] = useState(null)
  const a = pages[from || defFrom], b = pages[mkNow] || pages[keys[keys.length - 1]]
  if (!keys.length || !a || !b) return null
  const fk = from || defFrom
  return (
    <Section icon={Images} title="ALBUM · อัลบั้มการเติบโต" testid="growth-album">
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {keys.filter((k) => k !== mkNow).map((k) => <button key={k} onClick={() => setFrom(k)} className={`px-tab shrink-0 !py-1 ${k === fk ? 'on' : ''}`}>{mkLabel(k)}</button>)}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end mt-3 text-center">
        <div><div className="mx-auto w-fit opacity-70"><Portrait sprite="hero" size={56} /></div><div className="text-xs font-semibold mt-1">{mkLabel(fk)}</div>{a.outfit && <div className="text-[10px] text-slate-500">{OUTFITS[a.outfit - 1]?.name}</div>}</div>
        <div className="text-2xl pb-6">➜</div>
        <div><div className="mx-auto w-fit"><Portrait sprite="hero" size={64} hue={rpg.skin?.hue || 0} /></div><div className="text-xs font-semibold mt-1">ตอนนี้</div><div className="text-[10px] text-slate-500">{rpg.outfit.name}</div></div>
      </div>
      <div className="mt-3 divide-y divide-slate-100 text-xs">
        {ROWS.map(([k, label, fmt, money, lowerBetter]) => {
          const x = a[k], y = b[k]
          if (y == null) return null
          const up = x != null && y !== x ? (y > x) !== !!lowerBetter : null
          return (
            <div key={k} className="flex items-center py-1.5 gap-2">
              <span className="flex-1 text-slate-600">{label}</span>
              <span className="num text-slate-400 w-24 text-right">{x == null ? '—' : money ? <Money value={x} decimals={false} /> : fmt(x)}</span>
              <span className={`num w-24 text-right font-semibold ${up == null ? '' : up ? 'text-emerald-600' : 'text-rose-500'}`}>{money ? <Money value={y} decimals={false} /> : fmt(y)}{up == null ? '' : up ? ' ▲' : ' ▼'}</span>
            </div>
          )
        })}
      </div>
      <div className="text-[11px] text-slate-400 mt-2">ทุกเดือนเกมจะเก็บภาพคุณไว้ 1 หน้าอัตโนมัติ เดือนก่อนเริ่มอัลบั้มมีเฉพาะมูลค่าสุทธิ (คำนวณย้อนจากรายการ)</div>
    </Section>
  )
}

/* ---------------- birthday + one year of the adventure ---------------- */
export function BirthdayCard({ rpg }) {
  const v = useVault()
  const put = useStore((s) => s.put)
  const showToast = useStore((s) => s.showToast)
  const [date, setDate] = useState('')
  const [saga, setSaga] = useState(false)
  const b = rpg.birthday
  const owned = Object.keys(rpg.owned || {}).map(bdaySkin).filter(Boolean).sort((x, y) => x.bday - y.bday)
  if (!b) {
    return (
      <Section icon={Cake} title="BIRTHDAY · วันเกิด" testid="birthday-card">
        <div className="text-xs text-slate-600 mb-2">ใส่วันเกิดเพื่อเปิดเทศกาลส่วนตัว: สัปดาห์วันเกิดได้ชุดประจำปี + 1 GOLD และดูสรุป “หนึ่งปีของการผจญภัย”</div>
        <div className="flex gap-2">
          <input type="date" className="field flex-1" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} data-testid="bday-input" />
          <button className="px-btn" disabled={!date} onClick={() => { put('settings', { ...v.settings, birthday: date }); showToast('บันทึกวันเกิดแล้ว 🎂') }} data-testid="bday-save">บันทึก</button>
        </div>
      </Section>
    )
  }
  return (
    <Section icon={Cake} title="BIRTHDAY · วันเกิด" testid="birthday-card" right={<button className="text-xs ui-link" onClick={() => { if (confirm('ล้างวันเกิดที่บันทึกไว้?')) put('settings', { ...v.settings, birthday: null }) }}>แก้ไข</button>}>
      {b.isToday && <div className="text-center text-lg font-bold text-rose-600 mb-2">🎉 สุขสันต์วันเกิดอายุ {b.age} ปี! 🎂</div>}
      <div className="text-sm">อายุ <b>{b.age}</b> ปี · {b.daysTo === 0 ? 'วันนี้คือวันเกิด' : <>อีก <b>{b.daysTo}</b> วันถึงวันเกิดอายุ {b.age + 1} ({thDate(b.next)})</>}</div>
      {rpg.bdayReady && (
        <button className="px-btn w-full mt-2 justify-center" data-testid="bday-claim" onClick={() => { const s = rpg.claimBirthday(); if (s) showToast(`🎂 ได้ “${s.name}” + 1 GOLD`) }}>🎁 รับของขวัญวันเกิด: ชุดวันเกิดอายุ {b.age} + 1 GOLD</button>
      )}
      {owned.length > 0 && <div className="text-[11px] text-slate-500 mt-2">ชุดวันเกิดที่สะสม: {owned.map((s) => s.name.replace('ชุดวันเกิด', '')).join(' · ')} (สวมได้ในร้านค้า)</div>}
      <button className="px-btn w-full mt-2 justify-center" onClick={() => setSaga(true)} data-testid="saga-open">📜 หนึ่งปีของการผจญภัย</button>
      <Sheet open={saga} onClose={() => setSaga(false)} title={`ปีที่ ${b.age + 1} ของชีวิต · ${thDate(b.last)} – วันนี้`}>
        <YearSaga rpg={rpg} b={b} />
      </Sheet>
    </Section>
  )
}

const SAGA_ROWS = [
  ['inc', 'รายรับ', true], ['exp', 'รายจ่าย', true, true], ['saved', 'ออม + ลงทุน', true], ['paid', 'จ่ายหนี้', true],
  ['noSpendDays', 'วันไม่ใช้เงิน'], ['books', 'หนังสือที่อ่านจบ'], ['pages', 'หน้าที่อ่าน'],
  ['habit.exercise', 'วันออกกำลังกาย'], ['habit.meditate', 'วันนั่งสมาธิ'], ['habit.vocab', 'วันท่องศัพท์'], ['habit.ontime', 'คืนที่นอนตรงเวลา'], ['active', 'วันที่ทำนิสัย'],
]
const pick = (o, path) => path.split('.').reduce((x, k) => x?.[k], o)
function YearSaga({ rpg, b }) {
  const v = useVault()
  const items = useStore((s) => s.items)
  const ctx = useMemo(() => ({
    txns: v.txns, accounts: v.accounts, books: selectList(items, 'book'),
    days: Object.fromEntries(selectList(items, 'habitday').map((d) => [d.date, d])), noSpend: rpg.econData?.noSpend || {},
  }), [v.txns, v.accounts, items, rpg.econData?.noSpend])
  const cur = useMemo(() => rangeStats(b.last, todayISO(), ctx), [ctx, b.last])
  const prev = useMemo(() => rangeStats(b.prevLast, addDays(b.last, -1), ctx), [ctx, b.prevLast, b.last])
  const hasPrev = prev.hasData
  return (
    <div className="space-y-3" data-testid="year-saga">
      <div className="text-sm text-slate-600">ตั้งแต่วันเกิดล่าสุด {hasPrev ? `เทียบกับปีก่อนหน้า (${thDate(b.prevLast)} – ${thDate(addDays(b.last, -1))})` : 'ปีก่อนหน้ายังไม่มีข้อมูลในแอป ปีหน้าจะได้เห็นการเทียบ'}</div>
      <div className="divide-y divide-slate-100 text-sm">
        {SAGA_ROWS.map(([k, label, money, lower]) => {
          const x = pick(prev, k), y = pick(cur, k)
          const up = hasPrev && y !== x ? (y > x) !== !!lower : null
          return (
            <div key={k} className="flex items-center gap-2 py-1.5">
              <span className="flex-1 text-slate-600">{label}</span>
              {hasPrev && <span className="num text-slate-400 w-28 text-right">{money ? <Money value={x} decimals={false} /> : x.toLocaleString()}</span>}
              <span className={`num w-28 text-right font-semibold ${up == null ? '' : up ? 'text-emerald-600' : 'text-rose-500'}`}>{money ? <Money value={y} decimals={false} /> : y.toLocaleString()}</span>
            </div>
          )
        })}
      </div>
      {cur.saveRate != null && <div className="text-sm">ออม + ลงทุนเฉลี่ย <b>{Math.round(cur.saveRate * 100)}%</b> ของรายรับ{hasPrev && prev.saveRate != null ? ` (ปีก่อน ${Math.round(prev.saveRate * 100)}%)` : ''}</div>}
      <div className="text-xs text-slate-500">เลเวลตอนนี้ {rpg.level} · {rpg.title} · {rpg.outfit.name} · {rpg.realm.name}</div>
    </div>
  )
}

/* ---------------- story act ---------------- */
export function ActCard({ rpg }) {
  const a = rpg.act
  if (a.id === 1) {
    return (
      <Section icon={Flag} title="ภาคที่ 1 · ปลดหนี้" testid="story-act">
        <div className="text-xs text-slate-600">ปราบหนี้ให้หมด แล้วเรื่องจะเข้าสู่ภาค 2 “สร้างอาณาจักร”</div>
        <div className="mt-2"><Bar pct={a.act1Pct} color="#ef4444" /></div>
        <div className="text-[11px] text-slate-500 mt-1">ปราบไปแล้ว {Math.round(a.act1Pct * 100)}% · หนี้คงเหลือ <Money value={a.owed} decimals={false} /> · เงินกู้ {a.loansLeft} ก้อน · บัตร {a.cardsLeft} ใบ</div>
        <div className="text-[11px] text-slate-400 mt-1">จบภาคเมื่อ: ไม่มีเงินกู้เหลือ และยอดบัตรเครดิตที่ค้างอยู่มีเงินกันจ่ายครบ 100%</div>
      </Section>
    )
  }
  return (
    <Section icon={Flag} title="ภาคที่ 2 · สร้างอาณาจักร" testid="story-act">
      <div className="text-xs text-slate-600">หนี้ไม่กดดันแล้ว เป้าหมายใหม่คือให้เงินลงทุนทำงานแทนคุณ</div>
      <div className="mt-2"><Bar pct={a.freedom} color="#f59e0b" /></div>
      <div className="text-[11px] text-slate-500 mt-1">อิสรภาพทางการเงิน <b>{(a.freedom * 100).toFixed(1)}%</b> · เงินลงทุนจ่ายได้ราว <Money value={a.monthlyPassive} decimals={false} />/เดือน</div>
      <div className="flex gap-1 mt-2">{FREEDOM_STEPS.map((s) => <span key={s} className={`text-[10px] px-1.5 py-0.5 border ${a.freedom * 100 >= s ? 'bg-amber-100 border-amber-400' : 'border-slate-200 text-slate-400'}`}>{s}%</span>)}</div>
      <div className="text-[11px] text-slate-400 mt-1">คิดแบบถอนปีละ 4% ของเงินลงทุน เทียบค่าใช้จ่ายเฉลี่ยต่อเดือน</div>
    </Section>
  )
}
