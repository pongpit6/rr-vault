import { useState } from 'react'
import { Sheet } from './ui'
import { LoreBlock } from './Lore'
import PixelSummary from './PixelSummary'

const PLACES = [
  { id: 'town', name: 'หมู่บ้านเริ่มต้น', location: 'หุบเขาตอนใต้', image: 'town_bg_morning' },
  { id: 'meadow', name: 'ทุ่งหญ้าลมเย็น', location: 'ตะวันออกของหมู่บ้าน' },
  { id: 'forest', name: 'ป่าลึกเงาไม้', location: 'ถัดจากทุ่งไปตะวันออก' },
  { id: 'mine', name: 'ถ้ำเหมืองร้าง', location: 'หน้าผาทางเหนือของป่า' },
  { id: 'swamp', name: 'หนองน้ำหมอกม่วง', location: 'ใต้เหมือง · ตะวันออกเฉียงใต้ของป่า' },
  { id: 'desert', name: 'ทะเลทรายทองคำ', location: 'พ้นช่องผาตะวันออกเฉียงเหนือ' },
  { id: 'snow', name: 'ภูเขาหิมะนิรันดร์', location: 'เหนือทะเลทราย' },
  { id: 'volcano', name: 'ภูเขาไฟเพลิงกาฬ', location: 'ตะวันตกของแนวเขาหิมะ' },
  { id: 'shadow', name: 'ปราสาทเงา', location: 'ที่ราบสูงระหว่างหิมะกับภูเขาไฟ' },
]

export default function IslandAtlas() {
  const [selected, setSelected] = useState(null)
  return (
    <details className="px-card p-3 mb-3" data-testid="island-atlas">
      <PixelSummary className="py-1 text-sm font-bold">ภูมิศาสตร์และเส้นทางบนทวีป</PixelSummary>
      <p className="text-xs leading-relaxed text-slate-500 my-2">แผนที่ฉบับนี้เริ่มจากหมู่บ้านทางใต้ของทวีป แล้วตามทางเกวียนไปยังทุ่งและป่าทางตะวันออก แตะสถานที่เพื่ออ่านเรื่องของแต่ละชุมชน เส้นทางนอกขอบแผนที่ยังรอรายงานจากผู้เดินทาง</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PLACES.map((place) => (
          <button type="button" key={place.id} onClick={() => setSelected(place)} className="px-inner p-2 text-left min-w-0" data-testid={'atlas-' + place.id}>
            <img src={'./sprites/' + (place.image || 'map_' + place.id) + '.png'} alt="" loading="lazy" className="w-full h-20 object-cover border border-slate-300 mb-1.5" style={{ imageRendering: 'pixelated' }} />
            <div className="text-xs font-semibold break-words">{place.name}</div>
            <div className="text-[11px] leading-relaxed text-slate-500 mt-1">{place.location}</div>
          </button>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500 mt-3">ด้านล่างคือระดับดินแดนตามฐานะของเมือง ส่วนแผนที่นี้รวบรวมถิ่นที่กิลด์สำรวจได้แล้ว</p>
      {selected && <Sheet open onClose={() => setSelected(null)} title={selected.name}>
        <img src={'./sprites/' + (selected.image || 'map_' + selected.id) + '.png'} alt={selected.name} className="w-full h-32 object-cover border-2 border-slate-800 mb-3" style={{ imageRendering: 'pixelated' }} />
        <div className="text-xs text-slate-500">{selected.location}</div>
        <LoreBlock category="places" id={selected.id} defaultOpen />
      </Sheet>}
    </details>
  )
}
