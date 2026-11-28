import { useMemo, useState } from 'react'
import { Sheet } from '../ui'
import { PxIcon } from '../px'
import { saveFortune, Guide, T } from './FortuneKit'
import { TimeChart, Legend, TAKSA_LEVELS } from './FortuneChart'
import { PLANET, POWER, bkkMs, bkkParts, birthPlanet, possiblePlanets, taksaAt, taksaRange, subPeriods, symbolic, bhumiOf, pairTags, toneOf, TONE, pairScore, scoreColor, scoreText } from '../../lib/fortune/taksa'
import { MAIN_TEXT, PAIR_TEXT } from '../../lib/fortune/taksaText'
import { taksaMainTopics, taksaTopics } from '../../lib/fortune/taksaTopics'
import ReadingTopics from './ReadingTopics'
import PixelSummary from '../PixelSummary'

const TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const WD = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
export const thDT = (ms, time = true) => { const p = bkkParts(ms); return `${p.d} ${TH_M[p.m - 1]} ${p.y + 543}${time ? ` ${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}` : ''}` }
const Pl = ({ p, size = 22 }) => <PxIcon name={PLANET[p].icon} size={size} />
const Tone = ({ m, q }) => { const t = TONE[toneOf(m, q)]; return <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: t.color }}>{t.name}</span> }
const left = (ms) => { const d = Math.max(0, ms - Date.now()), days = Math.floor(d / 864e5), mo = Math.round(days / 30.44); return mo >= 24 ? `${Math.floor(mo / 12)} ปี ${mo % 12 ? `${mo % 12} เดือน` : ''}` : days > 60 ? `${mo} เดือน` : days >= 1 ? `${days} วัน` : `${Math.ceil(d / 3600e3)} ชม.` }

/** full reading of a main → sub pair */
function PairSheet({ pair, onClose, birthP }) {
  if (!pair) return null
  const { main: m, planet: q, start, end, hours } = pair, sy = symbolic(hours), tags = pairTags(m, q)
  const bh = bhumiOf(birthP).find((b) => b.planet === q)
  return (
    <Sheet open onClose={onClose} title={`${PLANET[m].name}เสวย · ${PLANET[q].name}แทรก`}>
      <div className="space-y-3 text-sm" data-testid="pair-sheet">
        <div className="flex flex-wrap items-center gap-2"><Pl p={m} size={32} /><span className="text-slate-400">→</span><Pl p={q} size={32} /><Tone m={m} q={q} /><span className="ml-auto text-xs font-bold" style={{ color: scoreColor(pairScore(m, q, birthP)) }}>คะแนนตามสูตร {pairScore(m, q, birthP) > 0 ? '+' : ''}{pairScore(m, q, birthP)} · {scoreText(pairScore(m, q, birthP))}</span></div>
        <div className="text-xs text-slate-500">{thDT(start)} – {thDT(end)} · ระยะตามสูตร {sy.y ? `${sy.y} ปี ` : ''}{sy.m ? `${sy.m} เดือน ` : ''}{sy.d ? `${sy.d} วัน ` : ''}{sy.h ? `${sy.h} ชม.` : ''} ({POWER[m]}×{POWER[q]}÷108 ปีโหร)</div>
        <div className="px-inner p-3"><ReadingTopics rows={taksaTopics(m, q, birthP)} testid="taksa-pair-reading" /></div>
        <details className="px-inner p-3 text-xs text-slate-600">
          <PixelSummary className="font-semibold">ที่มาของคำอ่านและคะแนน</PixelSummary>
          <div className="space-y-2 pt-2">
            <p className="leading-relaxed whitespace-pre-line">{PAIR_TEXT[m][q]}</p>
            <div>{MAIN_TEXT[m]}</div>
            {tags.length > 0 && <div><b>ประเภทคู่ดาว:</b> {tags.map((t) => `คู่${t}`).join(' · ')}</div>}
            {bh && <div><b>ในดวงกำเนิด</b> {PLANET[q].name}อยู่ภูมิ <b>{bh.name}</b> ({bh.text})</div>}
          </div>
        </details>
      </div>
    </Sheet>
  )
}

export default function TaksaTab({ birth, onEdit }) {
  const birthMs = bkkMs(birth.date, birth.unknownTime ? '12:00' : birth.time)
  const opts = birth.unknownTime ? possiblePlanets(birth.date) : null
  const bp = opts ? (opts.includes(birth.planet) ? birth.planet : opts[0]) : birthPlanet(birthMs)
  const [pair, setPair] = useState(null)
  const [mainOpen, setMainOpen] = useState(null)
  const [zoom, setZoom] = useState(null)
  const now = Date.now()
  const at = useMemo(() => taksaAt(birthMs, now, bp), [birthMs, bp]) // eslint-disable-line
  const yr = bkkParts(now).y
  const years = useMemo(() => [yr, yr + 1].map((y) => ({ y, list: taksaRange(birthMs, bkkMs(`${y}-01-01`), bkkMs(`${y + 1}-01-01`), bp) })), [birthMs, bp, yr])
  if (!at) return <div className="px-card p-5 text-sm">วันเกิดอยู่ในอนาคต ตรวจข้อมูลเกิดอีกครั้ง <button className="ui-link" onClick={onEdit}>แก้ไข</button></div>
  const wd = bkkParts(birthMs).wd
  const lifeSubs = at.mains.slice(0, 8).flatMap((m) => subPeriods(m))
  const Y = 365.2425 * 864e5, ten = lifeSubs.filter((x) => x.end > now && x.start < now + 10 * Y)
  const span = at.mains.slice(0, 8), total = 108
  const age = (ms) => (ms - birthMs) / Y
  const ageTxt = (a, b) => { const p = Math.floor(age(a)), q = Math.floor(age(b) - 1e-9); return p === q ? `${p}` : `${p}–${q}` }
  const seg = (f) => (x) => ({ from: f(x.start), to: f(x.end), v: pairScore(x.main, x.planet, bp), title: `${PLANET[x.main].name}เสวย · ${PLANET[x.planet].name}แทรก`, sub: `${thDT(x.start, false)} – ${thDT(x.end, false)} · อายุ ${ageTxt(x.start, x.end)}`, text: PAIR_TEXT[x.main][x.planet], icon: PLANET[x.planet].icon, now: x.start <= now && now < x.end, onOpen: () => setPair(x) })
  return (
    <div className="space-y-4" data-testid="taksa-tab">
      <section className="px-card p-4 space-y-2">
        <div className="flex items-center gap-2"><Pl p={bp} size={28} /><div className="text-sm"><b>ดาวประจำวันเกิด: {PLANET[bp].name}</b><div className="text-[11px] text-slate-500">เกิดวัน{WD[wd]}ตามปฏิทิน{opts ? ' · ไม่ทราบเวลาเกิด' : ` เวลา ${birth.time} น.`} (วันโหรเปลี่ยนตอน 06:00 · พุธหลัง 18:00 เป็นราหู)</div></div></div>
        {opts && opts.length > 1 && <div className="text-xs space-y-1"><div className="text-slate-500">ไม่ทราบเวลาเกิด ดาวเริ่มต้นเป็นได้ {opts.length} แบบ เลือกแบบที่ใช้:</div>
          <div className="flex gap-2">{opts.map((p) => <button key={p} onClick={() => saveFortune((c) => ({ birth: { ...c.birth, planet: p } }))} className={`px-btn text-xs ${p === bp ? '' : 'opacity-50'}`}><Pl p={p} size={16} /> {PLANET[p].name}</button>)}</div></div>}
      </section>

      <section className="px-card p-4 space-y-3" data-testid="taksa-now">
        <div className="text-xs text-slate-500"><T k="ดาวเสวย" /> คือภาพรวมช่วงยาว · <T k="ดาวแทรก" /> คือเรื่องที่เด่นในช่วงย่อย (อายุ {Math.floor((now - birthMs) / (365.2425 * 864e5))} ปี)</div>
        <button onClick={() => setPair(at.sub)} className="w-full text-left flex items-center gap-3" data-testid="taksa-current">
          <div className="flex items-center"><Pl p={at.main.planet} size={48} /><Pl p={at.sub.planet} size={30} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold leading-tight">{PLANET[at.main.planet].name}เสวย · {PLANET[at.sub.planet].name}แทรก</div>
            <div className="mt-1"><Tone m={at.main.planet} q={at.sub.planet} /></div>
          </div>
        </button>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="px-inner p-2"><div className="text-slate-500">ดาวเสวย {PLANET[at.main.planet].name} ({POWER[at.main.planet]} ปี)</div><b>{thDT(at.main.start, false)} – {thDT(at.main.end, false)}</b><div className="text-slate-500">อายุ {at.main.ageFrom}–{at.main.ageTo} ปี</div></div>
          <div className="px-inner p-2"><div className="text-slate-500">ดาวแทรก {PLANET[at.sub.planet].name}</div><b>{thDT(at.sub.start)} – {thDT(at.sub.end)}</b><div className="text-slate-500">ถัดไป {PLANET[at.next.planet].name}แทรก ในอีก {left(at.sub.end)}</div></div>
        </div>
        <div className="px-inner p-3"><ReadingTopics rows={taksaTopics(at.main.planet, at.sub.planet, bp)} testid="taksa-current-reading" /></div>
        <button className="text-xs ui-link" onClick={() => setPair(at.sub)}>ดูที่มาของคำอ่าน</button>
      </section>

      <section className="px-card p-4 space-y-2" data-testid="taksa-chart10">
        <div className="flex items-center gap-2"><PxIcon name="ev_chart" size={20} /><b className="text-sm">กราฟดวง 10 ปีข้างหน้า</b><span className="ml-auto"><Guide which="taksa" /></span></div>
        <TimeChart testid="taksa-c10" items={ten.map(seg((ms) => ms))} x0={now} x1={now + 10 * Y} nowX={now} xTitle="พ.ศ."
          ticks={Array.from({ length: 5 }, (_, i) => { const y = bkkParts(now).y + 1 + i * 2; return { x: bkkMs(`${y}-01-01`), label: String(y + 543) } })} />
        <div className="flex items-center justify-between gap-2"><Legend levels={TAKSA_LEVELS} /><span className="text-[10px] text-slate-500">เส้นแต่ละขั้น = ช่วงดาวแทรก</span></div>
      </section>

      <section className="px-card p-4 space-y-2" data-testid="taksa-chartlife">
        <div className="flex items-center gap-2"><PxIcon name="History" size={20} /><b className="text-sm">{zoom ? `${PLANET[zoom.planet].name}เสวย อายุ ${zoom.ageFrom}–${zoom.ageTo} ปี` : 'กราฟดวงตลอดชีวิต (108 ปี)'}</b>
          {zoom && <button className="ml-auto px-btn px-2 py-0.5 text-[11px]" onClick={() => setZoom(null)} data-testid="life-zoomout">ดูทั้งชีวิต</button>}</div>
        <TimeChart testid="taksa-clife" items={(zoom ? subPeriods(zoom) : lifeSubs).map(seg(age))} x0={zoom ? age(zoom.start) : 0} x1={zoom ? age(zoom.end) : 108} nowX={age(now)} xTitle="อายุ (ปี)"
          ticks={zoom ? Array.from({ length: zoom.ageTo - zoom.ageFrom + 1 }, (_, i) => zoom.ageFrom + i).filter((a, i, arr) => i % Math.ceil(arr.length / 9) === 0).map((a) => ({ x: a, label: String(a) })) : [0, 12, 24, 36, 48, 60, 72, 84, 96, 108].map((a) => ({ x: a, label: String(a) }))} />
        <div className="text-[10px] text-slate-500">แตะดาวเสวยด้านล่างเพื่อซูมเข้าไปดูช่วงนั้น</div>
        <div className="flex h-7 rounded overflow-hidden border-2 border-slate-800" data-testid="life-zoom">
          {span.map((m) => <button key={m.ageFrom} onClick={() => setZoom(zoom === m ? null : m)} className="grid place-items-center" style={{ width: `${(POWER[m.planet] / total) * 100}%`, background: PLANET[m.planet].color + (zoom && zoom !== m ? '55' : ''), outline: zoom === m ? '3px solid #0f172a' : undefined }} title={`${PLANET[m.planet].name} อายุ ${m.ageFrom}–${m.ageTo}`}><PxIcon name={PLANET[m.planet].icon} size={16} /></button>)}
        </div>
        <Legend levels={TAKSA_LEVELS} />
      </section>

      <section className="px-card p-4 space-y-2" data-testid="taksa-years">
        <div className="flex items-center gap-2"><PxIcon name="CalendarDays" size={20} /><b className="text-sm">ปีนี้และปีหน้า</b></div>
        {years.map(({ y, list }) => (
          <div key={y}><div className="text-xs font-semibold text-slate-600 mt-1">พ.ศ. {y + 543}</div>
            {list.map((s, i) => (
              <button key={i} onClick={() => setPair(s)} className="w-full flex items-center gap-2 py-1.5 border-b border-slate-100 text-left text-xs">
                <Pl p={s.main} size={18} /><Pl p={s.planet} size={18} />
                <span className="flex-1">{PLANET[s.main].name} → {PLANET[s.planet].name} · {thDT(s.from, false)} – {thDT(s.to, false)}</span><b style={{ color: scoreColor(pairScore(s.main, s.planet, bp)) }}>{scoreText(pairScore(s.main, s.planet, bp))}</b>
              </button>))}
          </div>))}
      </section>

      <section className="px-card p-4 space-y-2" data-testid="taksa-life">
        <div className="flex items-center gap-2"><PxIcon name="History" size={20} /><b className="text-sm">เส้นชีวิต 108 ปี</b><span className="ml-auto text-[11px] text-slate-500">แตะช่วงเพื่อดูดาวแทรก</span></div>
        <div className="flex h-10 rounded overflow-hidden border-2 border-slate-800">
          {span.map((m) => (
            <button key={m.ageFrom} onClick={() => setMainOpen(m)} className="relative grid place-items-center" style={{ width: `${(POWER[m.planet] / total) * 100}%`, background: PLANET[m.planet].color, outline: m === at.main ? '3px solid #0f172a' : undefined, zIndex: m === at.main ? 1 : 0 }} title={PLANET[m.planet].name}>
              <PxIcon name={PLANET[m.planet].icon} size={18} />
            </button>))}
        </div>
        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">{span.map((m) => <button key={m.ageFrom} onClick={() => setMainOpen(m)} className="flex items-center gap-1 text-left"><Pl p={m.planet} size={14} />{PLANET[m.planet].name} อายุ {m.ageFrom}–{m.ageTo}{m === at.main ? ' ◀ ตอนนี้' : ''}</button>)}</div>
      </section>

      <section className="px-card p-4" data-testid="taksa-bhumi">
        <div className="flex items-center gap-2 mb-2"><PxIcon name="Map" size={20} /><b className="text-sm"><T k="ภูมิทักษา">ภูมิทักษากำเนิด</T></b></div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">{bhumiOf(bp).map((b) => (
          <div key={b.name} className="px-inner p-2 flex items-center gap-2"><Pl p={b.planet} size={20} /><div><b>{b.name}</b> · {PLANET[b.planet].name}<div className="text-[10px] text-slate-500">{b.text}</div></div></div>))}</div>
      </section>

      {mainOpen && (
        <Sheet open onClose={() => setMainOpen(null)} title={`${PLANET[mainOpen.planet].name}เสวยอายุ ${mainOpen.ageFrom}–${mainOpen.ageTo} ปี`}>
          <div className="space-y-2 text-sm">
            <div className="text-xs text-slate-500">{thDT(mainOpen.start, false)} – {thDT(mainOpen.end, false)}</div>
            <div className="px-inner p-3"><ReadingTopics rows={taksaMainTopics(mainOpen.planet)} testid="taksa-main-reading" /></div>
            {subPeriods(mainOpen).map((s) => (
              <button key={s.planet} onClick={() => setPair(s)} className={`w-full flex items-center gap-2 px-inner p-2 text-left text-xs ${s.start <= now && now < s.end ? 'ring-2 ring-violet-500' : ''}`}>
                <Pl p={s.planet} size={20} /><span className="flex-1"><b>{PLANET[s.planet].name}แทรก</b><br />{thDT(s.start, false)} – {thDT(s.end, false)}</span><Tone m={s.main} q={s.planet} />
              </button>))}
          </div>
        </Sheet>
      )}
      <PairSheet pair={pair} onClose={() => setPair(null)} birthP={bp} />
    </div>
  )
}
