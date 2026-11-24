import { useState } from 'react'
import { useStore } from '../store'
import { Segmented } from '../components/ui'
import { PxIcon } from '../components/px'
import { BirthSheet, useFortune } from '../components/fortune/FortuneKit'
import TarotTab from '../components/fortune/TarotTab'
import TaksaTab from '../components/fortune/TaksaTab'
import BaziTab from '../components/fortune/BaziTab'

/** "ดวงชะตา": BaZi, Thai planetary periods (มหาทักษา) and a daily tarot card — one birth record for all three. */
export default function Fortune({ opt }) {
  const saved = useStore((s) => s.ui.fortuneTab)
  const setUi = useStore((s) => s.setUi)
  const [tab, setTab] = useState(opt || saved || 'bazi')
  const [birthOpen, setBirthOpen] = useState(false)
  const { birth } = useFortune()
  const pick = (t) => { setTab(t); setUi({ fortuneTab: t }) }
  return (
    <div className="space-y-4" data-testid="fortune-screen">
      <section className="hero p-5 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <PxIcon name="ft_ball" size={44} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/75">ดวงชะตา</div>
            <div className="text-xl font-bold leading-tight">ห้องหมอดู</div>
          </div>
          <button onClick={() => setBirthOpen(true)} className="rounded-2xl bg-white/15 px-3 py-2 text-xs text-left" data-testid="birth-open">
            <div className="text-white/70">ข้อมูลเกิด</div>
            <b className="text-sm">{birth?.date ? `${birth.date.split('-').reverse().join('/')} ${birth.unknownTime ? '' : birth.time || ''}` : 'ยังไม่ได้ใส่'}</b>
          </button>
        </div>
      </section>
      <Segmented className="ui-subtabs sticky top-0 z-20" value={tab} onChange={pick}
        options={[{ value: 'bazi', label: 'BaZi' }, { value: 'taksa', label: 'ดาวเสวยอายุ' }, { value: 'tarot', label: 'ไพ่ยิปซี' }]} />
      {tab === 'tarot' ? <TarotTab /> : !birth?.date ? (
        <div className="px-card p-5 text-center space-y-3" data-testid="need-birth">
          <PxIcon name="CalendarDays" size={40} />
          <div className="text-sm text-slate-600">{tab === 'bazi' ? 'BaZi ใช้วัน เวลา และเพศตอนเกิด เพื่อตั้งดวงสี่เสา' : 'มหาทักษาใช้วันและเวลาเกิด เพื่อหาดาวประจำวันเกิดและดาวที่เสวยอายุ'}</div>
          <button className="px-btn" onClick={() => setBirthOpen(true)}>ใส่ข้อมูลเกิด</button>
        </div>
      ) : tab === 'bazi' ? <BaziTab birth={birth} onEdit={() => setBirthOpen(true)} /> : <TaksaTab birth={birth} onEdit={() => setBirthOpen(true)} />}
      <BirthSheet open={birthOpen} onClose={() => setBirthOpen(false)} />
    </div>
  )
}
