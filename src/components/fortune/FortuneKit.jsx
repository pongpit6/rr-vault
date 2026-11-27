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
  ดิถี: "ธาตุหลักจากก้านฟ้าของวันเกิด (日主) ระบบใช้เป็นตัวแทนตัวคุณเพื่อเทียบกับธาตุอื่น เป็นจุดอ้างอิงในผัง ไม่ใช่คำตัดสินนิสัยหรือความสามารถทั้งหมด",
  ก้าน: "ก้านฟ้า (天干) คืออักษรตัวบนของแต่ละเสา มี 10 แบบ แบ่งเป็นธาตุทั้งห้าอย่างละหยินและหยาง ใช้อ่านร่วมกับตัวล่างและองค์ประกอบอื่น",
  กิ่ง: "กิ่งดิน (地支) คืออักษรตัวล่างของแต่ละเสา มี 12 แบบที่สัมพันธ์กับนักษัตร ภายในแต่ละกิ่งมีธาตุแฝงซึ่งระบบนำไปประกอบการอ่าน",
  ธาตุแฝง: "ก้านฟ้าที่นับว่าอยู่ภายในกิ่งดิน (藏干) ระบบใช้ดูแรงหนุนและบทบาทที่ไม่ได้อยู่บนก้านหลัก ต้องอ่านประกอบทั้งผัง",
  สิบเทพ: "ชื่อบทบาท 10 แบบของธาตุเมื่อเทียบกับดิถี เช่น เพื่อน ผลงาน ทรัพย์ หน้าที่ และผู้หนุน คำว่าเทพในที่นี้เป็นชื่อหมวด ไม่ได้หมายถึงเทพที่จะเข้ามากำหนดเหตุการณ์",
  คลัง: "ชื่อรูปแบบธาตุในกิ่ง 辰 未 戌 丑 (庫) ระบบเรียกการชงกับกิ่งคลังคู่กันว่าเปิดคลัง ใช้ชวนทบทวนเรื่องที่สะสมไว้ ไม่ได้รับรองว่ามีเงินเก็บหรือจะได้เงินก้อน",
  สามประสาน: "กลุ่มกิ่งสามตัวตามเกณฑ์ 三合 เช่น 申子辰 เชื่อมกับธาตุน้ำ ช่องที่ยังว่างหมายถึงระบบไม่พบสมาชิกตัวนั้นในผังเดิม ไม่ได้แปลว่าชีวิตขาดบางอย่าง",
  รวมทิศ: "กลุ่มกิ่งสามตัวในฤดูเดียวกัน (三會) เช่น 寅卯辰 เชื่อมกับธาตุไม้ ระบบเน้นธาตุนั้นเมื่อกลุ่มครบ ผลที่อ่านยังต้องดูบทบาทของธาตุและบริบท",
  ชง: "ความสัมพันธ์ของกิ่งคู่ตรงข้ามตามเกณฑ์ 沖 แนวอ่านใช้แทนแรงที่ดึงต่างทิศหรือการปรับเปลี่ยน ไม่ได้ยืนยันว่าจะเกิดเหตุร้ายหรือขัดแย้งกับใคร",
  ลงโทษ: "ชื่อความสัมพันธ์ของกิ่งตามเกณฑ์ 刑 ระบบใช้เป็นจุดให้ใส่ใจข้อตกลง วิธีตอบโต้ และข้อจำกัด ไม่ใช่การลงโทษทางศีลธรรม และไม่ได้บอกว่าจะเกิดคดีหรืออุบัติเหตุ",
  หกประสาน: "ความสัมพันธ์ของกิ่งเป็นคู่ตามเกณฑ์ 六合 แนวอ่านเชื่อมกับการประสานหรือผูกพัน ไม่ได้รับรองว่าความสัมพันธ์จริงจะราบรื่นทุกเรื่อง",
  ว่าง: "ชื่อเกณฑ์ 空亡 ซึ่งเทียบกิ่งกับชุดรอบของเสาวันเกิด แนวอ่านให้ทบทวนสิ่งที่ยังไม่ครบหรือควรเผื่อเวลา ไม่ได้แปลว่าวันนั้นทำอะไรไม่สำเร็จ",
  เสาโชค: "เสาช่วงละประมาณ 10 ปี (大運) ที่ระบบคำนวณต่อจากเสาเดือน ใช้อ่านเป็นธีมระยะยาวร่วมกับผังกำเนิดและช่วงย่อย ไม่ใช่ผลลัพธ์ตายตัวของทั้งสิบปี",
  ธาตุที่ช่วย: "ธาตุที่สูตรของแอปประเมินว่าช่วยสมดุลของดิถี เป็นผลภายในแบบจำลองนี้ ส่วนสี ทิศ และงานเป็นความเชื่อประกอบ ไม่ได้รับรองผลหรือบังคับให้เปลี่ยนชีวิตตามนั้น",
  ดาวเสวย: "ดาวหลักที่ระบบจัดให้ครองช่วงหลายปีตามมหาทักษา เปรียบเหมือนบทใหญ่ของเรื่อง ใช้อ่านธีมภาพรวมตามวันที่แสดง ไม่ได้หมายความว่าทุกปีจะเกิดเหตุการณ์เหมือนกัน",
  ดาวแทรก: "ดาวช่วงย่อยภายในดาวเสวย เปรียบเหมือนประเด็นที่เด่นขึ้นในบทใหญ่ ให้อ่านประกอบดาวหลักและวันที่เริ่ม–สิ้นสุด หัวข้องาน เงิน ความรักด้านล่างเป็นมุมอ่านจากดาวแทรก",
  ภูมิทักษา: "หมวดบทบาทของดาวเมื่อเทียบกับวันเกิดตามสูตรทักษา เช่น ศรีเชื่อมกับความพอใจ มนตรีกับคำปรึกษา และกาลกิณีกับจุดที่ควรใส่ใจ เป็นความหมายตามแนวอ่าน ไม่ใช่เหตุการณ์ที่รับรองว่าจะเกิด",
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
    ['Star', '1. หาตัวคุณ', "เริ่มที่อักษรตัวบนของเสาวันในกรอบสีทอง เรียกว่าดิถี ระบบใช้ธาตุนี้แทนตัวคุณแล้วเทียบกับส่วนอื่นของผัง ภาพต้นไม้ ไฟ หรือแม่น้ำในคำอ่านเป็นคำเปรียบเทียบสำหรับทบทวนตัวเอง"],
    ['Sun', '2. ดูฤดูเกิด', "เสาเดือนบอกฤดูเกิด ซึ่งเป็นส่วนหนึ่งของคะแนนกำลังดิถี ระบบรวมฤดู รากธาตุ และแรงหนุนจากเสาอื่นด้วย คำว่าแข็งหรืออ่อนหมายถึงสมดุลในผัง ไม่ใช่สุขภาพหรือความสามารถ"],
    ['el_wood', "3. ธาตุที่ช่วยสมดุลและธาตุที่ควรระวัง", "ดูว่าระบบจัดธาตุใดเป็นแรงหนุนหรือแรงถ่วงต่อสมดุล ดิถีแข็งเน้นการนำแรงไปใช้ ดิถีอ่อนเน้นการเตรียมตัวและมีคนช่วย สีหรือทิศที่แนะนำเป็นความเชื่อประกอบ ไม่รับรองผล"],
    ['ev_triad', '4. ปฏิกิริยาในดวง', "ช่องสีเต็มคือสมาชิกกลุ่มที่พบในผัง ช่องประคือตัวที่ยังไม่พบ เมื่อช่วงเวลาเติมกลุ่มครบ ระบบจะแสดงเหตุผลเพิ่มเติม คำว่าชง ลงโทษ หรือเปิดคลังเป็นชื่อเกณฑ์ อ่านคำอธิบายก่อนสรุปดีร้าย"],
    ['CalendarDays', '5. ใช้ปฏิทินกับยาม', "แตะวันหรือช่วงเวลาเพื่อดูหัวข้อคำอ่านกับเหตุผล คะแนนรวมมาจากปัจจัยทั้งบวกและลบ คู่เดียวกันอาจเข้าเกณฑ์หลายชื่อ จึงควรอ่านร่วมกัน สีแสดงระดับตามสูตรแอป ส่วนแผนของคุณให้ดูความพร้อมกับกำหนดเวลาจริงประกอบ"],
  ],
  taksa: [
    ['pl_sun', 'ดาวประจำวันเกิด', 'ทักษาเริ่มจากดาวประจำวันเกิด (วันโหรเปลี่ยนตอน 06:00) แล้วเวียนไปตามลำดับ อาทิตย์ จันทร์ อังคาร พุธ เสาร์ พฤหัส ราหู ศุกร์'],
    ['History', '1. ดาวเสวย = ช่วงชีวิต', "ดาวเสวยบอกหัวข้อหลักของช่วงระยะยาวตามวันที่แสดง เช่น พฤหัสบดีใช้เรื่องความรู้ ส่วนศุกร์ใช้เรื่องความพอใจและคุณภาพชีวิต เริ่มอ่านภาพรวมนี้ก่อน แล้วดูว่าดาวแทรกเพิ่มหัวข้อใดเข้ามา"],
    ['Sparkles', '2. ดาวแทรก = เรื่องที่เน้นตอนนี้', "ดาวแทรกแบ่งช่วงย่อยภายในดาวเสวย คำอ่านคู่ดาวจึงอธิบายความหมายร่วม เสนอสิ่งที่ลองทำได้ และบอกจุดระวัง อ่านตามช่วงวันที่แสดง ส่วนงาน เงิน และความรักด้านล่างขยายหัวข้อจากดาวแทรกแต่ละด้าน"],
    ['ev_chart', '3. อ่านกราฟ', "เส้นแต่ละขั้นคือช่วงดาวแทรก ความสูงและสีเป็นระดับการเกื้อหนุนตามสูตรแอป ไม่ใช่เปอร์เซ็นต์ความสำเร็จหรือความรุนแรงของเหตุร้าย เส้นประชมพูคือวันนี้ แตะหรือลากบนกราฟแล้วกด อ่านเต็ม แตะดาวเสวยด้านล่างเพื่อซูมช่วงนั้น"],
    ['Map', '4. ภูมิทักษา', "ภูมิทักษาเพิ่มมุมอ่านจากวันเกิด เช่น มนตรีเน้นคำปรึกษา เดชเน้นหน้าที่ กาลกิณีเน้นจุดที่ควรใส่ใจ ส่วนชื่อคู่มิตร คู่ศัตรู เป็นประเภทความสัมพันธ์ของดาว ไม่ได้บอกว่าใครเป็นมิตรหรือคิดร้าย"],
    ['CalendarDays', '5. วางแผน', "ดูปีนี้และปีหน้าเพื่อรู้วันเปลี่ยนช่วง แล้วอ่านธีมประกอบแผนที่มีอยู่ คะแนนสูงไม่รับรองผล คะแนนต่ำไม่จำเป็นต้องเลื่อนเรื่องสำคัญ ให้ใช้ข้อมูลและเงื่อนไขจริงเป็นหลัก"],
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
