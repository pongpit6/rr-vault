import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { Sheet } from '../ui'

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
  useEffect(() => { if (open) setF({ date: birth?.date || bday || '', time: birth?.time || '', unknownTime: !!birth?.unknownTime, place: birth?.place || 'กรุงเทพฯ', sex: birth?.sex || '' }) }, [open]) // eslint-disable-line
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(f.date || '') && (f.unknownTime || /^\d{2}:\d{2}$/.test(f.time || ''))
  const save = () => { saveFortune({ birth: { ...f, time: f.unknownTime ? '' : f.time } }); useStore.getState().showToast('บันทึกข้อมูลเกิดแล้ว'); onClose() }
  const L = 'block text-xs text-slate-500 mb-1'
  return (
    <Sheet open={open} onClose={onClose} title="ข้อมูลเกิด" footer={<button className="px-btn w-full justify-center" disabled={!ok} onClick={save} data-testid="birth-save">บันทึก</button>}>
      <div className="space-y-3 text-sm" data-testid="birth-sheet">
        <div className="text-xs text-slate-500">เก็บในบัญชีของคุณเท่านั้น ใช้ตั้งดวง BaZi และหาดาวเสวยอายุ (ไพ่ยิปซีไม่ต้องใช้)</div>
        <label className="block"><span className={L}>วันเกิด (ค.ศ.)</span><input type="date" className="field w-full" value={f.date || ''} onChange={(e) => setF({ ...f, date: e.target.value })} data-testid="birth-date" /></label>
        <label className="block"><span className={L}>เวลาเกิด (ตามนาฬิกาไทย)</span><input type="time" className="field w-full" disabled={f.unknownTime} value={f.time || ''} onChange={(e) => setF({ ...f, time: e.target.value })} data-testid="birth-time" /></label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!f.unknownTime} onChange={(e) => setF({ ...f, unknownTime: e.target.checked })} /> ไม่ทราบเวลาเกิด (เสาเวลาจะเว้นไว้ และดาววันเกิดอาจมีสองแบบ)</label>
        <label className="block"><span className={L}>สถานที่เกิด</span><input className="field w-full" value={f.place || ''} onChange={(e) => setF({ ...f, place: e.target.value })} /></label>
        <div><span className={L}>เพศ (ใช้หาทิศเดินเสาโชค BaZi ตามสูตรดั้งเดิม)</span>
          <div className="flex gap-2">{[['m', 'ชาย'], ['f', 'หญิง'], ['', 'ไม่ระบุ']].map(([v, t]) => (
            <button key={v} onClick={() => setF({ ...f, sex: v })} className={`px-btn flex-1 justify-center ${f.sex === v ? '' : 'opacity-50'}`} data-testid={`birth-sex-${v || 'x'}`}>{t}</button>))}</div>
        </div>
      </div>
    </Sheet>
  )
}
