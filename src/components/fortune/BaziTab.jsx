import { useMemo, useState } from 'react'
import { Sheet } from '../ui'
import { PxIcon } from '../px'
import {
  natal, STEMS, BRANCHES, STEM_TH, STEM_PIN, BRANCH_PIN, ZODIAC, ZODIAC_ICON, EL, EL_ICON, EL_COLOR, stemEl, BRANCH_EL, GOD, GOD_TH, RATE, rate, hoursOf,
  luckPillars, yearPillar, lichun, dayIdx, pillarName,
} from '../../lib/fortune/bazi'
import { DM_TEXT, GOD_TEXT, PALACE, EL_ADVICE, STRENGTH_TEXT, STRUCT_TEXT } from '../../lib/fortune/baziText'
import { thDT } from './TaksaTab'

const TZ = 7 * 3600e3
const nowParts = () => { const d = new Date(Date.now() + TZ); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours() } }
const TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
const Chip = ({ lvl, small }) => <span className={`inline-block rounded-full ${small ? 'px-1.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'} font-semibold text-white`} style={{ background: RATE[lvl].color }}>{RATE[lvl].th}</span>
const ElChip = ({ e }) => <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: EL_COLOR[e] }}><PxIcon name={EL_ICON[e]} size={14} />{EL[e]}</span>
const Stem = ({ s, size = 28 }) => <span className="font-bold leading-none" style={{ color: EL_COLOR[stemEl(s)], fontSize: size }}>{STEMS[s]}</span>
const Branch = ({ b, size = 28 }) => <span className="font-bold leading-none" style={{ color: EL_COLOR[BRANCH_EL[b]], fontSize: size }}>{BRANCHES[b]}</span>

/** why a day / hour / year scores the way it does */
function Why({ r }) {
  return (
    <ul className="space-y-1 text-xs">{r.why.map((w, i) => (
      <li key={i} className="flex gap-1.5"><span className="font-bold w-4 text-center" style={{ color: w.w > 0 ? '#16a34a' : w.w < 0 ? '#dc2626' : '#94a3b8' }}>{w.w > 0 ? '+' : w.w < 0 ? '−' : '·'}</span><span>{w.t}</span></li>))}</ul>
  )
}

/** one pillar (natal or any) against the chart */
function PillarSheet({ N, p, onClose }) {
  if (!p) return null
  const isDay = p.key === 'day', rels = N.rels.filter((r) => r.a === p.key || r.b === p.key)
  return (
    <Sheet open onClose={onClose} title={`${PALACE[p.key].th} ${p.name}`}>
      <div className="space-y-3 text-sm" data-testid="pillar-sheet">
        <div className="text-xs text-slate-500">{PALACE[p.key].text}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="px-inner p-3 text-center"><Stem s={p.s} size={40} /><div className="text-xs mt-1">{STEM_PIN[p.s]} · {STEM_TH[p.s]}</div><div className="text-[11px] text-slate-500">{isDay ? 'ดิถี (ตัวคุณ)' : `${GOD[p.god]} ${GOD_TH[p.god]}`}</div></div>
          <div className="px-inner p-3 text-center"><div className="flex justify-center items-center gap-1"><Branch b={p.b} size={40} /><PxIcon name={ZODIAC_ICON[p.b]} size={32} /></div><div className="text-xs mt-1">{BRANCH_PIN[p.b]} · ปี{ZODIAC[p.b]} · ธาตุ{EL[BRANCH_EL[p.b]]}</div></div>
        </div>
        {isDay ? <div className="px-inner p-3 text-xs">{DM_TEXT[p.s]}</div> : <div className="px-inner p-3 text-xs"><b>{GOD[p.god]} ({GOD_TH[p.god]})</b> อยู่ที่{PALACE[p.key].th}: {GOD_TEXT[p.god].chart} ในด้าน{PALACE[p.key].text}</div>}
        <div className="text-xs space-y-1">
          <div><b>ธาตุแฝงในกิ่ง:</b> {p.hidden.map((h, i) => <span key={i} className="mr-2"><Stem s={h.s} size={14} /> {GOD[h.god]}{i === 0 ? ' (หลัก)' : ''}</span>)}</div>
          <div><b>น่าอิน:</b> {p.nayin.zh} ({p.nayin.th})</div>
          <div><b>ดิถีที่กิ่งนี้:</b> {p.stage.zh} · {p.stage.th}</div>
          {p.stars.length > 0 && <div><b>ดาวเสริม:</b> {p.stars.map((s) => `${s.th} (${s.zh})`).join(' · ')}</div>}
          {p.void && <div><b>ว่าง (空亡):</b> กิ่งนี้อยู่ในช่องว่างของเสาวัน เรื่องของเสานี้มักมาช้าหรือไม่เต็มที่</div>}
          {rels.length > 0 && <div><b>ความสัมพันธ์:</b> {rels.map((r) => `${r.lv}${r.txt}`).join(' · ')}</div>}
        </div>
      </div>
    </Sheet>
  )
}

/** a day: rating, reasons and its 12 hours */
function DaySheet({ N, ymd, onClose }) {
  if (!ymd) return null
  const [y, m, d] = ymd, c = dayIdx(y, m, d), r = rate(N, c, { label: 'วัน' }), hrs = hoursOf(N, y, m, d), np = nowParts()
  const isToday = np.y === y && np.m === m && np.d === d, curH = np.h === 23 ? 12 : Math.floor((np.h + 1) / 2)
  return (
    <Sheet open onClose={onClose} title={`${d} ${TH_MONTH[m - 1]} ${y + 543}`}>
      <div className="space-y-3 text-sm" data-testid="day-sheet">
        <div className="flex items-center gap-3"><Stem s={c % 10} size={34} /><Branch b={c % 12} size={34} /><PxIcon name={ZODIAC_ICON[c % 12]} size={32} />
          <div className="flex-1"><div className="text-xs text-slate-500">วัน{EL[stemEl(c % 10)]}{STEM_TH[c % 10].slice(-4)} · {ZODIAC[c % 12]}</div><Chip lvl={r.lvl} /></div></div>
        <div className="px-inner p-3 text-xs"><b>{GOD[r.god]} ({GOD_TH[r.god]}):</b> {GOD_TEXT[r.god].period}</div>
        <Why r={r} />
        <div className="font-semibold text-xs pt-1">ยามทั้ง 24 ชั่วโมง (ยามละ 2 ชั่วโมง · แตะเพื่อดูเหตุผล)</div>
        <div className="space-y-1">{hrs.map((h) => (
          <details key={h.h} className={`px-inner px-2 py-1.5 ${isToday && h.h === curH ? 'ring-2 ring-violet-500' : ''}`} data-testid={`hour-${h.h}`}>
            <summary className="flex items-center gap-2 text-xs cursor-pointer list-none">
              <span className="w-[86px] num">{h.label}</span><Stem s={h.c % 10} size={16} /><Branch b={h.c % 12} size={16} /><PxIcon name={ZODIAC_ICON[h.c % 12]} size={18} />
              <span className="flex-1 truncate text-slate-500">{GOD_TH[h.god]}</span>{isToday && h.h === curH && <b className="text-violet-600 text-[10px]">ตอนนี้</b>}<Chip lvl={h.lvl} small />
            </summary>
            <div className="pt-1.5"><Why r={h} />{h.late && <div className="text-[10px] text-slate-500 mt-1">หลัง 23:00 นับเป็นยามชวดของวันถัดไป (กฎวันเปลี่ยน 23:00)</div>}</div>
          </details>))}</div>
      </div>
    </Sheet>
  )
}

function RateSheet({ N, item, onClose }) {
  if (!item) return null
  return (
    <Sheet open onClose={onClose} title={item.title}>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3"><Stem s={item.c % 10} size={34} /><Branch b={item.c % 12} size={34} /><PxIcon name={ZODIAC_ICON[item.c % 12]} size={32} /><div className="flex-1 text-xs text-slate-500">{item.sub}</div><Chip lvl={item.r.lvl} /></div>
        <div className="px-inner p-3 text-xs"><b>{GOD[item.r.god]} ({GOD_TH[item.r.god]}):</b> {GOD_TEXT[item.r.god].period}</div>
        <Why r={item.r} />
      </div>
    </Sheet>
  )
}

export default function BaziTab({ birth, onEdit }) {
  const N = useMemo(() => natal(birth), [birth])
  const np = nowParts()
  const [ym, setYm] = useState([np.y, np.m])
  const [pil, setPil] = useState(null), [day, setDay] = useState(null), [item, setItem] = useState(null), [showEv, setShowEv] = useState(false)
  const luck = useMemo(() => luckPillars(N, birth.sex), [N, birth.sex])
  const todayC = dayIdx(np.y, np.m, np.d), todayR = rate(N, todayC, { label: 'วัน' })
  const hrsToday = useMemo(() => hoursOf(N, np.y, np.m, np.d), [N, np.y, np.m, np.d])
  const curH = np.h === 23 ? 12 : Math.floor((np.h + 1) / 2), hourNow = hrsToday[curH]
  const cal = useMemo(() => {
    const [y, m] = ym, first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), n = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return { first, days: Array.from({ length: n }, (_, i) => { const c = dayIdx(y, m, i + 1); return { d: i + 1, c, r: rate(N, c) } }) }
  }, [N, ym])
  const lichunNow = Date.now() >= lichun(np.y) ? np.y : np.y - 1
  const years = [lichunNow, lichunNow + 1].map((y) => ({ y, c: yearPillar(y), r: rate(N, yearPillar(y), { label: 'ปี' }), from: lichun(y), to: lichun(y + 1) }))
  const curLuck = luck?.list.find((l) => l.from <= Date.now() && Date.now() < l.to)
  const shiftM = (k) => setYm(([y, m]) => { const t = (y * 12 + m - 1) + k; return [Math.floor(t / 12), (t % 12) + 1] })
  const order = ['hour', 'day', 'month', 'year'] // traditional right-to-left reading: year on the right
  return (
    <div className="space-y-4" data-testid="bazi-tab">
      <section className="px-card p-4" data-testid="bazi-chart">
        <div className="flex items-center gap-2 mb-3"><PxIcon name="ft_yinyang" size={22} /><b className="text-sm">ดวงสี่เสา</b><span className="ml-auto text-[11px] text-slate-500">แตะเสาเพื่อดูคำอธิบาย</span></div>
        <div className="grid grid-cols-4 gap-2">{order.map((k) => { const p = N.pillars.find((x) => x.key === k); return p ? (
          <button key={k} onClick={() => setPil(p)} className={`px-inner p-2 text-center ${k === 'day' ? 'ring-2 ring-amber-400' : ''}`} data-testid={`pillar-${k}`}>
            <div className="text-[10px] text-slate-500">{PALACE[k].th}</div>
            <div className="text-[10px] h-4 truncate">{k === 'day' ? 'ดิถี' : GOD[p.god]}</div>
            <Stem s={p.s} size={30} /><div className="flex justify-center"><PxIcon name={EL_ICON[stemEl(p.s)]} size={16} /></div>
            <Branch b={p.b} size={30} /><div className="flex justify-center"><PxIcon name={ZODIAC_ICON[p.b]} size={22} /></div>
            <div className="text-[9px] text-slate-500 leading-tight mt-1">{p.hidden.map((h) => STEMS[h.s]).join(' ')}</div>
          </button>) : <div key={k} className="px-inner p-2 text-center text-[10px] text-slate-400 grid place-items-center">ไม่ทราบเวลาเกิด<button className="ui-link" onClick={onEdit}>ใส่เวลา</button></div> })}</div>
        <div className="text-[11px] text-slate-500 mt-2">เกิด {thDT(N.ms, N.known)} · ปีเปลี่ยนที่ลิบชุน เดือนเปลี่ยนที่สารท 節 วันเปลี่ยน 23:00 ตามเวลาไทย</div>
      </section>

      <section className="px-card p-4 space-y-3" data-testid="bazi-read">
        <div className="flex items-center gap-2"><Stem s={N.dm} size={30} /><b className="text-sm">ดิถีของคุณ: {STEMS[N.dm]} {STEM_TH[N.dm]}</b></div>
        <div className="text-sm">{DM_TEXT[N.dm]}</div>
        <div className="px-inner p-3 text-xs space-y-1">
          <div className="flex items-center gap-2"><b>กำลังดิถี:</b> {N.strength === 'strong' ? 'แข็ง' : N.strength === 'weak' ? 'อ่อน' : 'ค่อนข้างกลาง'} <span className="text-slate-400">(คะแนน {N.score})</span><button className="ui-link ml-auto" onClick={() => setShowEv(!showEv)}>{showEv ? 'ซ่อนเหตุผล' : 'ดูเหตุผล'}</button></div>
          <div>{STRENGTH_TEXT[N.strength]}</div>
          {showEv && <ul className="list-disc pl-4 text-slate-600">{N.ev.map((e, i) => <li key={i}>{e}</li>)}</ul>}
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5"><b>ธาตุที่ช่วยคุณ:</b>{N.fav.map((e) => <ElChip key={e} e={e} />)}</div>
          <div className="flex flex-wrap items-center gap-1.5"><b>ธาตุที่ทำร้ายคุณ:</b>{N.unfav.map((e) => <ElChip key={e} e={e} />)}</div>
          {N.cold && <div className="text-slate-500">เกิดฤดูหนาว ไฟช่วยให้ดวงอุ่นขึ้น</div>}{N.hot && <div className="text-slate-500">เกิดฤดูร้อน น้ำช่วยให้ดวงชุ่มชื้นขึ้น</div>}
        </div>
        <div className="grid gap-1.5">{N.fav.map((e) => (
          <div key={e} className="px-inner p-2 text-[11px] flex gap-2"><PxIcon name={EL_ICON[e]} size={20} /><div><b>เสริมธาตุ{EL[e]}:</b> สี{EL_ADVICE[e].color} · ทิศ{EL_ADVICE[e].dir} · งาน{EL_ADVICE[e].work}<div className="text-slate-500">{EL_ADVICE[e].act}</div></div></div>))}</div>
        <div className="text-xs"><b>โครงสร้างดวง:</b> {STRUCT_TEXT[N.structure]}</div>
        <div className="flex gap-1 items-end h-16">{N.count.map((v, e) => (
          <div key={e} className="flex-1 flex flex-col items-center gap-0.5"><div className="w-full rounded-t" style={{ height: `${Math.max(4, v * 9)}px`, background: EL_COLOR[e] }} /><PxIcon name={EL_ICON[e]} size={16} /><span className="text-[9px] text-slate-500">{EL[e]} {v}</span></div>))}</div>
        {(N.rels.length > 0 || N.groups.length > 0) && <div className="text-xs"><b>ความสัมพันธ์ในดวง:</b> {[...N.groups, ...N.rels.map((r) => `${r.lv}${r.txt}`)].join(' · ')}</div>}
      </section>

      <section className="px-card p-4 space-y-2" data-testid="bazi-today">
        <div className="flex items-center gap-2"><PxIcon name="Sun" size={20} /><b className="text-sm">วันนี้กับยามนี้</b></div>
        <button onClick={() => setDay([np.y, np.m, np.d])} className="w-full px-inner p-2 flex items-center gap-2 text-left text-xs">
          <Stem s={todayC % 10} size={22} /><Branch b={todayC % 12} size={22} /><PxIcon name={ZODIAC_ICON[todayC % 12]} size={24} /><span className="flex-1">วันนี้ · {GOD_TH[todayR.god]}<div className="text-slate-500">{GOD_TEXT[todayR.god].period}</div></span><Chip lvl={todayR.lvl} />
        </button>
        {hourNow && <button onClick={() => setDay([np.y, np.m, np.d])} className="w-full px-inner p-2 flex items-center gap-2 text-left text-xs" data-testid="hour-now">
          <Stem s={hourNow.c % 10} size={22} /><Branch b={hourNow.c % 12} size={22} /><PxIcon name={ZODIAC_ICON[hourNow.c % 12]} size={24} /><span className="flex-1">ยามนี้ {hourNow.label} · {GOD_TH[hourNow.god]}</span><Chip lvl={hourNow.lvl} />
        </button>}
        <div className="flex gap-0.5">{hrsToday.map((h) => <div key={h.h} className="flex-1 text-center" title={h.label}><div className="h-3 rounded-sm" style={{ background: RATE[h.lvl].color, outline: h.h === curH ? '2px solid #0f172a' : undefined }} /><div className="text-[8px] text-slate-500">{h.label.slice(0, 2)}</div></div>)}</div>
      </section>

      <section className="px-card p-4" data-testid="bazi-cal">
        <div className="flex items-center gap-2 mb-2"><PxIcon name="CalendarDays" size={20} />
          <button className="px-btn px-2 text-xs" onClick={() => shiftM(-1)}>◀</button><b className="text-sm flex-1 text-center">{TH_MONTH[ym[1] - 1]} {ym[0] + 543}</b><button className="px-btn px-2 text-xs" onClick={() => shiftM(1)}>▶</button></div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 mb-1">{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((w) => <div key={w}>{w}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: cal.first }, (_, i) => <div key={'e' + i} />)}
          {cal.days.map((x) => { const today = ym[0] === np.y && ym[1] === np.m && x.d === np.d; return (
            <button key={x.d} onClick={() => setDay([ym[0], ym[1], x.d])} className="rounded-md p-0.5 text-center border-2" style={{ background: RATE[x.r.lvl].color + '26', borderColor: today ? '#0f172a' : RATE[x.r.lvl].color + '66' }} data-testid={`cal-${x.d}`}>
              <div className="text-[10px] font-bold leading-tight">{x.d}</div>
              <div className="flex justify-center items-center gap-px leading-none"><Stem s={x.c % 10} size={11} /><Branch b={x.c % 12} size={11} /></div>
              <div className="flex justify-center"><PxIcon name={ZODIAC_ICON[x.c % 12]} size={16} /></div>
            </button>) })}
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-[10px]">{RATE.map((r, i) => <span key={i} className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: r.color }} />{r.th}</span>)}<span className="text-slate-500">· แตะวันเพื่อดูเหตุผลและยามทั้ง 24 ชม.</span></div>
      </section>

      <section className="px-card p-4 space-y-2" data-testid="bazi-years">
        <div className="flex items-center gap-2"><PxIcon name="Star" size={20} /><b className="text-sm">ปีนี้และปีหน้า (เปลี่ยนปีที่ลิบชุน)</b></div>
        {years.map((x) => (
          <button key={x.y} onClick={() => setItem({ title: `ปี ${pillarName(x.c)} (${x.y + 543})`, c: x.c, r: x.r, sub: `${thDT(x.from)} – ${thDT(x.to)}` })} className="w-full px-inner p-2 flex items-center gap-2 text-left text-xs">
            <Stem s={x.c % 10} size={22} /><Branch b={x.c % 12} size={22} /><PxIcon name={ZODIAC_ICON[x.c % 12]} size={24} /><span className="flex-1">พ.ศ. {x.y + 543} ปี{ZODIAC[x.c % 12]} · {GOD_TH[x.r.god]}<div className="text-slate-500">เริ่ม {thDT(x.from)}</div></span><Chip lvl={x.r.lvl} />
          </button>))}
      </section>

      <section className="px-card p-4 space-y-2" data-testid="bazi-luck">
        <div className="flex items-center gap-2"><PxIcon name="History" size={20} /><b className="text-sm">เสาโชค 10 ปี (大運)</b></div>
        {!luck ? <div className="text-xs text-slate-500">{!N.known ? 'ต้องทราบเวลาเกิดจึงคำนวณอายุเริ่มเสาโชคได้' : 'ใส่เพศในข้อมูลเกิดเพื่อหาทิศเดินเสาโชค (ตามสูตรดั้งเดิม)'} <button className="ui-link" onClick={onEdit}>แก้ข้อมูลเกิด</button></div> : <>
          <div className="text-[11px] text-slate-500">เดิน{luck.fwd ? 'หน้า' : 'ถอยหลัง'} · เริ่มเสาแรกอายุ {luck.start.y} ปี {luck.start.m} เดือน {luck.start.d} วัน ({thDT(luck.start.ms, false)})</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">{luck.list.map((l) => (
            <button key={l.k} onClick={() => setItem({ title: `เสาโชค ${pillarName(l.c)} อายุ ${l.age}–${l.age + 10}`, c: l.c, r: l, sub: `${thDT(l.from, false)} – ${thDT(l.to, false)}` })} className={`px-inner p-1.5 text-center shrink-0 w-14 ${l === curLuck ? 'ring-2 ring-violet-500' : ''}`}>
              <div className="text-[9px] text-slate-500">{l.age}+</div><Stem s={l.c % 10} size={20} /><br /><Branch b={l.c % 12} size={20} /><div className="mt-0.5"><Chip lvl={l.lvl} small /></div>
            </button>))}</div>
          {curLuck && <div className="text-xs"><b>ตอนนี้อยู่เสาโชค {pillarName(curLuck.c)}:</b> {GOD_TEXT[curLuck.god].period}</div>}
        </>}
      </section>

      <PillarSheet N={N} p={pil} onClose={() => setPil(null)} />
      <DaySheet N={N} ymd={day} onClose={() => setDay(null)} />
      <RateSheet N={N} item={item} onClose={() => setItem(null)} />
    </div>
  )
}
