import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/index.css'
import '../src/themes.css'
import { LoreBlock, LoreButton } from '../src/components/Lore'
import { HeroCard } from '../src/components/HeroKit'
import { PartyTab, GearList, SkillsTab, ShopTab, MapTab } from '../src/screens/VaultRpg'
import { SkillTree, ShadowCard } from '../src/components/FarmKit'
import { PlotSheet, FestivalCalendar } from '../src/components/TownTab'
import { MEMBERS, SKILLS } from '../src/lib/party'
import { outfitOf } from '../src/lib/hero'
import { WORLD_LORE } from '../src/lib/worldLore'
import IslandAtlas from '../src/components/IslandAtlas'
import BaziTab from '../src/components/fortune/BaziTab'
import TaksaTab from '../src/components/fortune/TaksaTab'
import { CardSheet } from '../src/components/fortune/TarotTab'
import { FortuneStatus } from '../src/components/fortune/FortuneStatus'
import { RATE } from '../src/lib/fortune/bazi'

const mutation = () => { window.__mutations += 1; return true }
window.__mutations = 0
const party = MEMBERS.map((p, i) => ({ ...p, joined: i !== 2, lv: 4, pct: 0.4, nextText: 'ข้อมูลขั้นถัดไป', color: p.color }))
const gear = ['weapon', 'armor', 'boots', 'satchel', 'ring'].map((slot) => ({ slot, tier: 1, name: slot, label: slot, tierName: 'เหล็ก', names: ['ไม้', 'เหล็ก', 'เงิน', 'ทองคำ', 'ตำนาน'], how: 'เกณฑ์เดิม', valueText: '10', nextName: 'เงิน', toNext: '20', pct: 0.4 }))
const rpg = {
  outfit: outfitOf(10), condition: null, title: 'นักสะสม', skin: null, level: 10,
  pet: { id: 'pet_fox', name: 'จิ้งจอกมิ้นต์', sprite: 'pet_fox' }, growth: { pet: { stage: 2, days: 20, nextAt: 30 } },
  party, gear, skills: SKILLS.map(k => ({ ...k, unlocked: true, lockText: 'เกณฑ์เดิม' })),
  farm: { bag: { mcrystal: 10, page: 10, ink: 10, star: 10 }, enh: {}, skills: {}, shadowWorn: [], shadows: { sh_ninja: 1 } },
  fiat: 10000, gold: 1000, skillPts: 20, shadowSlots: 3,
  owned: { grad_en: true, bday_30: true }, realmNet: 0, realm: { tier: 1 }, vault: { summary: { net: 0 } },
  town: { skinPerk: {}, shopDiscount: 0, town: { hall: 1 }, plots: [{ type: 'farm', lv: 1 }, null], plotCount: 6, count: () => 0 },
  shopPrice: () => ({ fiat: 10, gold: 0 }), afford: () => true, hallPrice: () => ({ fiat: 10, gold: 1 }), buildPrice: () => ({ fiat: 10, gold: 0 }),
  habits: { by: { exercise: { best: 0 } }, medMin: 0, learnt: 0 },
  buy: mutation, setEquip: mutation, enhance: mutation, rankUp: mutation, wearShadow: mutation, buyShadow: mutation,
  build: mutation, upgrade: mutation, upgradeHall: mutation, demolish: mutation,
}
function Preview() {
  const mode = new URLSearchParams(location.search).get('panel') || 'catalog'
  const [plot, setPlot] = useState(null)
  const query = new URLSearchParams(location.search)
  const birth = { date: query.get('date') || '1992-03-11', time: '09:30', sex: query.get('sex') || 'm', unknownTime: query.has('unknown') }
  const panels = {
    bazi: <BaziTab birth={birth} onEdit={mutation} />,
    taksa: <TaksaTab birth={birth} onEdit={mutation} />,
    tarot: <CardSheet open id="maj_00" both onClose={() => {}} />,
    statuses: <div className="flex gap-1.5 overflow-x-auto">{RATE.map(level => <div key={level.th} className="px-inner p-1.5 shrink-0 w-14 text-center" data-testid="status-card"><FortuneStatus level={level} small /></div>)}</div>,
    hero: <HeroCard rpg={rpg} />, party: <PartyTab rpg={rpg} />, gear: <GearList rpg={rpg} />,
    skills: <SkillsTab rpg={rpg} />, tree: <SkillTree rpg={rpg} />, shadows: <ShadowCard rpg={rpg} />,
    shop: <ShopTab rpg={rpg} />, map: <MapTab rpg={rpg} onPreview={mutation} privacy={false} />,
    festival: <FestivalCalendar T={{ decor: [] }} />, atlas: <IslandAtlas />,
    building: <><button onClick={() => setPlot('hall')}>เปิดศาลากลาง</button><button onClick={() => setPlot(0)}>เปิดฟาร์ม</button>
      <PlotSheet rpg={rpg} sel={plot} onClose={() => setPlot(null)} ok={mutation} /></>,
    reader: <LoreButton category="pets" id="pet_fox" title="จิ้งจอกมิ้นต์" />,
    catalog: <>{Object.entries(WORLD_LORE).map(([category, entries]) => <section key={category} data-category={category}>
      <h2>{category}</h2>{Object.keys(entries).map(id => <LoreBlock key={id} category={category} id={id} title={id} />)}</section>)}</>,
  }
  return <main className="max-w-xl mx-auto p-3 space-y-3" data-testid="lore-preview">{panels[mode]}</main>
}
createRoot(document.getElementById('root')).render(<Preview />)
