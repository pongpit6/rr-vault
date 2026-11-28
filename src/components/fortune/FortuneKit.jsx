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
  ดิถี: "เริ่มที่ธาตุนี้ครับ อักษรบนของเสาวันเกิด (日主) ใช้แทนคุณเวลาเทียบว่าธาตุอื่นเข้ามาหนุน ดึงแรง หรือเพิ่มภาระอย่างไร",
  ก้าน: "ดูอักษรตัวบนของแต่ละเสา นี่คือก้านฟ้า (天干) มี 10 แบบจากธาตุห้าอย่าง แยกหยินกับหยาง เวลาอ่านให้ดูคู่กับอักษรล่างของเสาเดียวกัน",
  กิ่ง: "ดูอักษรตัวล่างของแต่ละเสา นี่คือกิ่งดิน (地支) มี 12 แบบตามนักษัตร ใช้ดูทั้งธาตุที่ซ่อนอยู่และความสัมพันธ์อย่างชงหรือประสาน",
  ธาตุแฝง: "ถ้าอยากรู้ว่ากิ่งหนึ่งมีแรงหนุนอะไรอยู่ข้างใน ให้ดูธาตุแฝง (藏干) ซึ่งนับประกอบกับธาตุที่เห็นบนก้านและส่วนอื่นของผัง",
  สิบเทพ: "ใช้อ่านว่าธาตุที่มาเทียบกับดิถีเกี่ยวกับเรื่องไหน เช่น เพื่อนกับการร่วมงาน ทรัพย์กับเงิน หรืออำนาจกับหน้าที่ ทั้งหมดแยกได้เป็น 10 บทบาท",
  คลัง: "ดูเรื่องที่สะสมไว้ เช่น เงิน ฝีมือ หรือแรงช่วย กิ่ง 辰 未 戌 丑 ใช้เป็นคลังตามเกณฑ์นี้ เมื่อมีกิ่งตรงข้ามมาชง ระบบขึ้นว่าเปิดคลัง ถ้าเป็นคลังทรัพย์ ให้เช็กยอดจริงก่อนวางแผนใช้",
  สามประสาน: "เมื่อกิ่งสามตัวอยู่ครบตามเกณฑ์ 三合 ธาตุที่กลุ่มนั้นโยงถึงจะเด่นขึ้น เช่น 申子辰 เน้นน้ำ ถ้าช่องยังเป็นเส้นประ ให้ดูว่ากิ่งที่รอจะมาตอนไหน",
  รวมทิศ: "กิ่งสามตัวในกลุ่มฤดูเดียวกันเชื่อมกับธาตุเดียว เช่น 寅卯辰 เน้นไม้ ถ้าพบครบ ให้ดูต่อว่าธาตุนั้นช่วยหรือเพิ่มแรงกดให้ผังของคุณ",
  ชง: "กิ่งสองตัวอยู่ตรงข้ามกัน (沖) ให้อ่านว่าตรงไหนมีแรงดึงคนละทางหรืออาจต้องปรับแผน เช่น ถ้าชงกิ่งวันเกิด ให้คุยเรื่องขอบเขตหรือความคาดหวังกับคนใกล้ตัว",
  ลงโทษ: "เป็นชื่อเกณฑ์ 刑 ถ้าเจอในคำอ่าน ให้เริ่มที่ข้อตกลงที่ยังไม่ชัดและระวังการตอบตอนถูกเร่ง",
  หกประสาน: "กิ่งสองตัวเข้าเกณฑ์ประสาน (六合) ถ้าอ่านเรื่องความสัมพันธ์ ให้ดูว่ามีเรื่องไหนที่ทั้งสองฝ่ายอยากไปทางเดียวกันแล้วเริ่มคุยจากตรงนั้น",
  ว่าง: "เกณฑ์ 空亡 เทียบกิ่งกับรอบของเสาวันเกิด ถ้ามีเรื่องที่ยังรอเอกสาร คำตอบ หรือคนอนุมัติ ให้เผื่อเวลาแล้วใช้ความพร้อมจริงตัดสินใจ",
  เสาโชค: "มองเรื่องที่ต้องรับมือหรือฝึกต่อเนื่องราว 10 ปีจากเสาโชค (大運) แล้วเปิดคำอ่านแต่ละปีเพื่อดูว่าช่วงไหนเรื่องนั้นเด่นขึ้น",
  ธาตุที่ช่วย: "ดูว่าธาตุไหนช่วยให้ดิถีสมดุลขึ้นตามสูตรในแอป สี ทิศ และแนวงานเป็นตัวอย่างประกอบ เลือกใช้ส่วนที่เข้ากับชีวิตคุณได้",
  ดาวเสวย: "ดูดาวนี้เพื่อรู้ว่าเรื่องไหนเป็นโจทย์ของช่วงหลายปี แล้วอ่านดาวแทรกต่อว่าตอนนี้โจทย์นั้นมาในรูปไหน",
  ดาวแทรก: "ดูดาวนี้เพื่อรู้ว่าช่วงวันที่แสดงควรใส่ใจเรื่องไหนเพิ่ม อ่านคู่กับดาวเสวย แล้วดูงาน เงิน ความรัก และสุขภาพตามเรื่องที่เกี่ยวกับคุณ",
  ภูมิทักษา: "ใช้ดูว่าดาวดวงหนึ่งเน้นอะไรเมื่อเทียบกับวันเกิด เช่น มนตรีให้ดูแรงช่วยและคำปรึกษา เดชให้ดูหน้าที่ กาลกิณีให้ดูข้อที่ควรเผื่อใจหรือเผื่อเวลา",
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
    ['ft_yinyang', 'ดวงสี่เสา', 'แตะเสาปี เดือน วัน หรือเวลาเพื่อดูว่าบอกเรื่องไหน ตัวบนคือก้าน ตัวล่างคือกิ่ง สีช่วยให้จำธาตุได้เร็วขึ้น: ไม้เขียว ไฟแดง ดินน้ำตาล ทองเทา น้ำสีน้ำเงิน'],
    ['Star', '1. หาตัวคุณ', "ดูตัวบนของเสาวันในกรอบสีทองครับ นี่คือดิถี อ่านก่อนว่าจุดเด่นของธาตุนี้คืออะไร แล้วค่อยดูว่าธาตุอื่นในผังเข้ามาหนุนหรือถ่วงตรงไหน"],
    ['Sun', '2. ดูฤดูเกิด', "เริ่มที่เสาเดือนเพื่อดูฤดูเกิด แล้วแตะดูเหตุผลถ้าอยากรู้ว่ารากธาตุหรือเสาไหนช่วยหนุนเพิ่ม ป้ายแข็งหรืออ่อนบอกกำลังธาตุในผังเท่านั้น"],
    ['el_wood', "3. ธาตุที่ช่วยสมดุลและธาตุที่ควรระวัง", "ดูว่าธาตุไหนช่วยหรือทำให้ต้องระวังมากขึ้นก่อน ถ้าอยากเอาไปใช้ ลองเลือกกิจกรรมที่ช่วยเรื่องที่ติดอยู่จริงจากตัวอย่างด้านล่าง"],
    ['ev_triad', '4. ปฏิกิริยาในดวง', "ช่องสีเต็มคือกิ่งที่พบ ช่องประคือกิ่งที่ยังรอ ถ้าเห็นชงหรือเปิดคลัง อ่านประโยคแรกก่อนว่าชี้เรื่องไหน แล้วค่อยดูว่ากิ่งอะไรทำให้ขึ้นป้ายนี้"],
    ['CalendarDays', '5. ใช้ปฏิทินกับยาม', "แตะวัน ปี หรือยามที่สนใจ แล้วดูว่าด้านไหนควรเดินหน้าหรือระวัง จากนั้นเปิดเหตุผลถ้าอยากรู้ว่ามาจากเกณฑ์ไหน สีคือคะแนนรวมของช่วงนั้น แต่แต่ละด้านอาจให้คำแนะนำต่างกัน"],
  ],
  taksa: [
    ['pl_sun', 'ดาวประจำวันเกิด', 'ทักษาเริ่มจากดาวประจำวันเกิด (วันโหรเปลี่ยนตอน 06:00) แล้วเวียนไปตามลำดับ อาทิตย์ จันทร์ อังคาร พุธ เสาร์ พฤหัส ราหู ศุกร์'],
    ['History', '1. ดาวเสวย = ช่วงชีวิต', "ดูดาวเสวยก่อนว่าช่วงยาวนี้เน้นอะไร เช่น พฤหัสบดีให้ดูความรู้และคำแนะนำ ส่วนศุกร์ให้ดูคุณภาพชีวิต แล้วค่อยอ่านดาวแทรกว่าตอนนี้ควรลงมือกับเรื่องไหน"],
    ['Sparkles', '2. ดาวแทรก = เรื่องที่เน้นตอนนี้', "อ่านตามวันเริ่มและสิ้นสุดที่แสดงครับ ในแต่ละด้านให้ดูประโยคแรกว่าควรเดินหน้า เผื่อเวลา หรือเช็กเงื่อนไข ส่วนบรรทัดท้ายบอกว่าดาวทั้งสองเกี่ยวข้องอย่างไร"],
    ['ev_chart', '3. อ่านกราฟ', "เส้นประชมพูบอกว่าคุณอยู่ตรงไหนวันนี้ แต่ละขั้นคือช่วงดาวแทรก แตะหรือลากไปช่วงที่สนใจแล้วกดอ่านเต็ม ถ้าจะดูช่วงยาวเดียว แตะดาวเสวยด้านล่างเพื่อซูม"],
    ['Map', '4. ภูมิทักษา', "ดูภูมิทักษาเมื่อต้องการรู้ว่าดาวแทรกกระทบเรื่องไหนของคุณเป็นพิเศษ เช่น มนตรีชวนมองหาคำปรึกษา ส่วนคำว่าคู่มิตรหรือคู่ศัตรูเป็นชื่อความสัมพันธ์ระหว่างดาว"],
    ['CalendarDays', '5. วางแผน', "เปิดปีนี้และปีหน้าเพื่อดูวันเปลี่ยนดาวแทรก ถ้าคำอ่านเตือนตรงกับแผนที่มี เช่น เอกสารไม่ครบ ให้เผื่อเวลาเช็กส่วนนั้นก่อนตัดสินใจ"],
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
