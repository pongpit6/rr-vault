import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { Sheet } from '../ui'
import { PxIcon } from '../px'
import MorningPush from './MorningPush'

/** the fortune record: { id:'fortune', birth:{date,time,unknownTime,place,sex}, tarot:{ 'YYYY-MM-DD': {id, rev, at, review} } } */
export function useFortune() {
  const data = useStore((s) => s.items.fortune?.data) || {}
  return { ...data, birth: data.birth || null }
}
export function saveFortune(patch) {
  const st = useStore.getState(), cur = st.items.fortune?.data || {}
  st.put('fortune', { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch), id: 'fortune' })
}

export function BirthSheet({ open, onClose }) {
  const { birth } = useFortune()
  const bday = useStore((s) => Object.values(s.items).find((i) => i.kind === 'settings')?.data?.birthday)
  const [f, setF] = useState({})
  useEffect(() => { if (open) setF({ date: birth?.date || bday || '', time: birth?.time || '', unknownTime: !!birth?.unknownTime, place: birth?.place || 'กรุงเทพฯ', sex: birth?.sex || '', alerts: useStore.getState().items.fortune?.data?.alerts !== false }) }, [open]) // eslint-disable-line
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') && (f.unknownTime || /^\d{2}:\d{2}$/.test(f.time || ''))
  const save = () => { const { alerts, ...bf } = f; saveFortune({ alerts, birth: { ...bf, time: f.unknownTime ? '' : f.time } }); if (alerts && typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); useStore.getState().showToast('บันทึกข้อมูลเกิดแล้ว'); onClose() }
  const L = 'block text-xs text-slate-500 mb-1'
  return (
    <Sheet open={open} onClose={onClose} title="ข้อมูลเกิด" footer={<button className="px-btn w-full justify-center" disabled={!ok} onClick={save} data-testid="birth-save">บันทึก</button>}>
      <div className="space-y-3 text-sm" data-testid="birth-sheet">
        <div className="text-xs text-slate-500">เก็บในบัญชีของคุณเท่านั้น ใช้ตั้งดวง BaZi และหาดาวเสวยอายุ (ไพ่ยิปซีไม่ต้องใช้)</div>
        <label className="block"><span className={L}>วันเกิด (ค.ศ.)</span><input type="date" className="field w-full" value={f.date || ''} onChange={(e) => setF({ ...f, date: e.target.value })} data-testid="birth-date" /></label>
        <label className="block"><span className={L}>เวลาเกิด (ตามนาฬิกาไทย)</span><input type="time" className="field w-full" disabled={f.unknownTime} value={f.time || ''} onChange={(e) => setF({ ...f, time: e.target.value })} data-testid="birth-time" /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!f.unknownTime} onChange={(e) => setF({ ...f, unknownTime: e.target.checked })} /> ไม่ทราบเวลาเกิด (เสาเวลาจะเว้นไว้ และดาววันเกิดอาจมีสองแบบ)</label>
        <label className="block"><span className={L}>สถานที่เกิด</span><input className="field w-full" value={f.place || ''} onChange={(e) => setF({ ...f, place: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={f.alerts !== false} onChange={(e) => setF({ ...f, alerts: e.target.checked })} data-testid="birth-alerts" /> แจ้งเตือนดวงประจำวัน (วันพิเศษของ BaZi, ดาวแทรกใกล้เปลี่ยน, ยังไม่จั่วไพ่)</label>
        <MorningPush />
        <div><span className={L}>เพศ (ใช้หาทิศเดินเสาโชค BaZi ตามสูตรดั้งเดิม)</span>
          <div className="flex gap-2">{[['m', 'ชาย'], ['f', 'หญิง'], ['', 'ไม่ระบุ']].map(([v, t]) => (
            <button key={v} onClick={() => setF({ ...f, sex: v })} className={`px-btn flex-1 justify-center ${f.sex === v ? '' : 'opacity-50'}`} data-testid={`birth-sex-${v || 'x'}`}>{t}</button>))}</div>
        </div>
      </div>
    </Sheet>
  )
}

/* ---------- glossary: tap a term to see what it means ---------- */
export const TERMS = {
  ดิถี: 'ก้านฟ้าของวันเกิด (日主) คือตัวคุณ ทุกอย่างในดวงอ่านเทียบกับดิถี',
  ก้าน: 'ก้านฟ้า (天干) 10 ตัว ตัวบนของแต่ละเสา บอกสิ่งที่แสดงออกมาให้เห็น',
  กิ่ง: 'กิ่งดิน (地支) 12 ตัว ตัวล่างของเสา เป็นนักษัตร มีธาตุแฝงซ่อนอยู่ข้างใน',
  ธาตุแฝง: 'ก้านที่ซ่อนอยู่ในกิ่งดิน (藏干) ตัวแรกแรงสุด เป็นรากและพลังที่ยังไม่แสดงออก',
  สิบเทพ: 'บทบาทของแต่ละก้านเมื่อเทียบกับดิถี: เพื่อน ผลงาน ทรัพย์ อำนาจ ผู้หนุน อย่างละหยินหยาง รวม 10',
  คลัง: 'กิ่ง 辰 未 戌 丑 เป็นที่เก็บธาตุ (庫) คลังของธาตุที่เป็นทรัพย์คือคลังทรัพย์ ถูกชงเมื่อไรคลังเปิด',
  สามประสาน: 'กิ่งสามตัวที่รวมเป็นธาตุเดียว (三合) เช่น 申子辰 = น้ำ ครบสามตัวพลังธาตุนั้นพุ่ง มีสองตัวเรียกครึ่งประสาน รอตัวที่ขาดมาเติม',
  รวมทิศ: 'กิ่งสามตัวในฤดูเดียวกัน (三會) เช่น 寅卯辰 = ไม้ แรงกว่าสามประสาน',
  ชง: 'กิ่งที่อยู่ตรงข้ามกัน 6 ตำแหน่ง (沖) ดึงกันคนละทาง ทำให้เรื่องเคลื่อนไหว เปลี่ยนแปลง หรือขัดแย้ง',
  ลงโทษ: 'กลุ่มกิ่งที่ทำโทษกัน (刑) เช่น 寅巳申 ครบสามตัวต้องระวังเรื่องกฎหมาย สัญญา และอุบัติเหตุ',
  หกประสาน: 'กิ่งสองตัวที่ผูกกัน (六合) ช่วยกัน ทำให้ราบรื่น',
  ว่าง: 'สองกิ่งที่ไม่อยู่ในชุดสิบของเสาวันเกิด (空亡) เรื่องที่ตกช่องว่างมักมาช้าหรือไม่เต็มที่',
  เสาโชค: 'ช่วงละ 10 ปี (大運) ไล่จากเสาเดือน เป็นบรรยากาศของทศวรรษนั้น',
  ธาตุที่ช่วย: 'ธาตุที่ทำให้ดวงสมดุล วัน ปี สี ทิศ และงานของธาตุนี้มักเป็นผลดีกับคุณ',
  ดาวเสวย: 'ดาวที่ครองช่วงชีวิตหลายปีตามมหาทักษา (6–21 ปี) เป็นบรรยากาศใหญ่ของช่วงนั้น',
  ดาวแทรก: 'ดาวที่แทรกเข้ามาในคาบหลัก 8 ช่วง เป็นเรื่องที่เน้นในช่วงสั้น ๆ ไม่กี่เดือนถึงไม่กี่ปี',
  ภูมิทักษา: 'ตำแหน่งของดาวทั้ง 8 ในดวงกำเนิด บอกว่าดาวไหนเป็นเงิน อำนาจ ผู้ช่วย หรือสิ่งที่ต้องระวังของคุณ',
}
export function T({ k, children }) {
  const [o, setO] = useState(false)
  return (
    <>
      <button onClick={(e) => { e.stopPropagation(); setO(true) }} className="underline decoration-dotted decoration-violet-400 underline-offset-2" data-testid={`term-${k}`}>{children || k}</button>
      {o && <Sheet open onClose={() => setO(false)} title={k}><div className="text-sm pb-2">{TERMS[k]}</div></Sheet>}
    </>
  )
}

/* ---------- how to read ---------- */
const GUIDES = {
  bazi: [
    ['ft_yinyang', 'ดวงสี่เสา', 'ดวงมี 4 เสา ปี เดือน วัน เวลา แต่ละเสามีก้านฟ้าข้างบนกับกิ่งดิน (นักษัตร) ข้างล่าง สีของตัวอักษรคือธาตุ: เขียวไม้ แดงไฟ น้ำตาลดิน เทาทอง น้ำเงินน้ำ'],
    ['Star', '1. หาตัวคุณ', 'ก้านของเสาวัน (กรอบสีทอง) คือดิถี = ตัวคุณ อ่านนิสัยจากดิถีก่อน'],
    ['Sun', '2. ดูฤดูเกิด', 'เสาเดือนบอกฤดู ถ้าเกิดในฤดูธาตุเดียวกับดิถี ดิถีแข็ง ถ้าไม่ใช่ ดิถีมักอ่อน แอปรวมคะแนนให้ในหัวข้อกำลังดิถี'],
    ['el_wood', '3. ธาตุที่ช่วยกับธาตุที่ทำร้าย', 'ดิถีแข็งต้องระบายพลังไปที่ผลงาน ทรัพย์ อำนาจ ดิถีอ่อนต้องการผู้หนุนและเพื่อน วันหรือปีที่เป็นธาตุที่ช่วยจะดี ธาตุที่ทำร้ายต้องระวัง'],
    ['ev_triad', '4. ปฏิกิริยาในดวง', 'ดูการ์ดปฏิกิริยา: ช่องสีเต็มคือสิ่งที่มีแล้ว ช่องประคือสิ่งที่ขาด วันหรือปีที่เติมช่องที่ขาดคือจังหวะสำคัญ'],
    ['CalendarDays', '5. ใช้ปฏิทินกับยาม', 'สีของวันบอกภาพรวม ไอคอนมุมขวาบนคือเหตุการณ์พิเศษ แตะวันเพื่อดูเหตุผลและยามทั้ง 24 ชม. เลือกทำเรื่องสำคัญในวันและยามสีเขียวหรือม่วง'],
  ],
  taksa: [
    ['pl_sun', 'ดาวประจำวันเกิด', 'ทักษาเริ่มจากดาวประจำวันเกิด (วันโหรเปลี่ยนตอน 06:00) แล้วเวียนไปตามลำดับ อาทิตย์ จันทร์ อังคาร พุธ เสาร์ พฤหัส ราหู ศุกร์'],
    ['History', '1. ดาวเสวย = ช่วงชีวิต', 'แต่ละดาวครองชีวิต 6–21 ปี เป็นบรรยากาศใหญ่ เช่น เสาร์ = ภาระและความอดทน ศุกร์ = ความสุขและทรัพย์'],
    ['Sparkles', '2. ดาวแทรก = เรื่องที่เน้นตอนนี้', 'ในแต่ละช่วงใหญ่มีดาวแทรก 8 ดวงเวียนเข้ามา อ่านเป็นประโยค: “ช่วง[ดาวเสวย] มีเรื่อง[ดาวแทรก]เข้ามาเน้น”'],
    ['ev_chart', '3. อ่านกราฟ', 'แท่งสูงสีม่วง/เขียว = ช่วงดี แท่งต่ำสีส้ม/แดง = ช่วงต้องระวัง เส้นแนวตั้งคือตอนนี้ แตะแท่งเพื่ออ่านคำทำนายของช่วงนั้น'],
    ['Map', '4. ภูมิทักษา', 'ดูว่าดาวที่แทรกอยู่ตอนนี้อยู่ภูมิอะไรในดวงคุณ ศรี = โชคลาภ มนตรี = ผู้ช่วย เดช = อำนาจ กาลกิณี = สิ่งที่ต้องระวัง'],
    ['CalendarDays', '5. วางแผน', 'ดูส่วน “ปีนี้และปีหน้า” ว่าดาวจะเปลี่ยนวันไหน ช่วงดีเหมาะเริ่มเรื่องใหม่ ช่วงระวังเหมาะเก็บเงินและไม่เสี่ยง'],
  ],
}
export function Guide({ which, label = 'วิธีอ่าน' }) {
  const [o, setO] = useState(false)
  return (
    <>
      <button className="px-btn text-xs" onClick={() => setO(true)} data-testid={`guide-${which}`}><PxIcon name="ev_guide" size={16} /> {label}</button>
      {o && (
        <Sheet open onClose={() => setO(false)} title={which === 'bazi' ? 'วิธีอ่าน BaZi' : 'วิธีอ่านดาวเสวยอายุ'}>
          <div className="space-y-2 pb-2" data-testid="guide-sheet">{GUIDES[which].map(([ic, t, x]) => (
            <div key={t} className="px-inner p-3 flex gap-3"><PxIcon name={ic} size={28} /><div><b className="text-sm">{t}</b><div className="text-xs text-slate-600 mt-0.5">{x}</div></div></div>))}</div>
        </Sheet>
      )}
    </>
  )
}

/** a simple bar chart around a zero line: tall up = good, down = careful. items: {label, v, color, on, w, onClick, title} */
export function ScoreBars({ items, h = 120, max = 3, testid, sub }) {
  const total = items.reduce((s, x) => s + (x.w || 1), 0)
  let x0 = 0
  return (
    <div data-testid={testid}>
      <svg viewBox={`0 0 ${total} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: h }}>
        <line x1="0" x2={total} y1={h / 2} y2={h / 2} stroke="#cbd5e1" strokeWidth={total / 400} vectorEffect="non-scaling-stroke" />
        {items.map((it, i) => {
          const w = it.w || 1, v = Math.max(-max, Math.min(max, it.v)), bh = Math.max(2, (Math.abs(v) / max) * (h / 2 - 4)), y = v >= 0 ? h / 2 - bh : h / 2
          const el = <g key={i} onClick={it.onClick} style={{ cursor: it.onClick ? 'pointer' : undefined }}><rect x={x0 + w * 0.08} width={w * 0.84} y={y} height={bh} fill={it.color}><title>{it.title}</title></rect>
            <rect x={x0} width={w} y={0} height={h} fill="transparent" />{it.on && <rect x={x0} width={w} y={0} height={h} fill="none" stroke="#0f172a" strokeWidth="2" vectorEffect="non-scaling-stroke" />}</g>
          x0 += w
          return el
        })}
      </svg>
      {sub}
    </div>
  )
}
