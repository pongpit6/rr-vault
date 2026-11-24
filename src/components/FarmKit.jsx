import { useEffect, useState } from 'react'
import { Swords, Backpack, Hammer, BookOpen, Zap, Lock, Gift, Sparkles, ScrollText, Castle as Castle2, Ghost, Gem } from './px'
import { Emo, PxIcon, hasPx } from './px'
import { Portrait } from './RpgBits'
import FarmScene from './FarmScene'
import CardAlbum from './CardAlbum'
import { GLOW_CARD_MULT, GLOW_CARD, CARD_DROP } from '../lib/cards'
import { useStore } from '../store'
import { MAPS, MAP_BY_ID, MON_BY_ID, MATS, TREE, rankCost, RECIPES, mapUnlocked, itemName, itemPrice, itemIcon, RELICS, RELIC_BY_ID, NPC_INFO, SHADOWS, SHADOW_SLOT_LV, enhStep, ENH_FX, SHARDS_PER_GOLD, MAP_MODES, huntMaps, mapWinRate, LOOT, RARE_ODDS, rareOf, matUse, happyBonusChance, HUNT_XP_PER_WIN, HUNT_XP_DAY } from '../lib/farm'
import { monPower, BOSS_AFTER, trophyPrice, bossOf, eliteOf, normalsOf } from '../lib/farmData'
import { MAP_LORE, MON_LORE, STORY, STORY_STEPS } from '../lib/farmLore'
import { Sheet } from './ui'
import { todOf, isFullMoon, NIGHT } from '../lib/timeOfDay'
import { MON_GLOW_LORE, MAP_NIGHT, MOON_LEGEND } from '../lib/glowLore'
const NIGHT_BG = ['meadow', 'forest', 'swamp', 'desert', 'snow', 'volcano'] // maps with a painted night backdrop

const Bar = ({ pct, color = '#14b8a6' }) => <div className="px-xp !h-2"><div style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: color }} /></div>
function Card({ icon: I, title, right, children, testid }) {
  return (
    <section className="px-card p-4" data-testid={testid}>
      <div className="flex items-center gap-2 mb-3"><I size={16} /><h2 className="px-font text-[11px] tracking-wide flex-1">{title}</h2>{right}</div>
      {children}
    </section>
  )
}
const ItemIcon = ({ k, size = 28 }) => {
  const key = itemIcon(k)
  if (hasPx(key)) return <PxIcon name={key} size={size} />
  if (k.startsWith('t:')) return <Portrait sprite={`mon_${k.slice(2)}`} size={size} />
  return <span style={{ fontSize: size * 0.7 }}>📦</span>
}

const CardIco = ({ size = 14 }) => <PxIcon name="em_card" size={size} />

export default function FarmTab({ rpg }) {
  const [sub, setSub] = useState('hunt')
  return (
    <div className="space-y-3" data-testid="farm-tab">
      <div className="flex gap-1.5 flex-wrap">
        {[['hunt', 'ล่า', Swords], ['bag', 'กระเป๋า', Backpack], ['craft', 'ชาวเมือง', Hammer], ['dex', 'สมุดมอนสเตอร์', BookOpen], ['cards', 'การ์ด', CardIco], ['story', 'เรื่องราว', ScrollText]].map(([id, label, I]) => (
          <button key={id} onClick={() => setSub(id)} className={`px-tab ${sub === id ? 'on' : ''}`} data-testid={`farm-sub-${id}`}><I size={14} /> {label}{id === 'craft' && rpg.chests.length > 0 && <span className="dot" />}</button>
        ))}
      </div>
      {sub === 'hunt' && <Hunt rpg={rpg} />}
      {sub === 'bag' && <Bag rpg={rpg} />}
      {sub === 'craft' && <Craft rpg={rpg} />}
      {sub === 'dex' && <Dex rpg={rpg} />}
      {sub === 'cards' && <CardAlbum rpg={rpg} />}
      {sub === 'story' && <Story rpg={rpg} />}
    </div>
  )
}

function Energy({ rpg }) {
  const e = rpg.energy
  const mins = Math.ceil(rpg.nextHourIn / 60000)
  return (
    <Card icon={Zap} title="ENERGY · พลังกายและมานา" testid="farm-energy">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><div className="flex justify-between"><b>พลังกาย</b><span className="num">{rpg.staminaLeft}</span></div><Bar pct={rpg.staminaDaily / Math.max(1, e.stamina)} color="#f97316" />
          <div className="text-[10px] text-slate-500 mt-0.5">วันนี้ {rpg.staminaDaily}/{e.stamina} · สะสมรายชั่วโมง {rpg.staminaBank} · +1 ในอีก {mins} นาที</div></div>
        <div><div className="flex justify-between"><b>มานา</b><span className="num">{rpg.manaLeft}/{e.mana}</span></div><Bar pct={rpg.manaLeft / Math.max(1, e.mana)} color="#6366f1" /><div className="text-[10px] text-slate-500 mt-0.5">สกิลโอกาสใช้เองอัตโนมัติ</div></div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {e.parts.map((p) => <span key={p.id} className={`text-[10px] px-1.5 py-0.5 border ${p.done ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-400'}`}>{p.done ? '✓' : '+'}{p.pts} {p.name}</span>)}
        {e.fit > 0 && <span className="text-[10px] px-1.5 py-0.5 border border-amber-400 bg-amber-50">+5 ร่างกายฟิต 7 วัน</span>}
      </div>
      <div className="text-[10px] text-slate-500 mt-1">ทุกวัน: ฐาน 20 + วินัยสูงสุด 20 (รีเซ็ตเที่ยงคืน) · +1 ทุกชั่วโมง สะสมได้ไม่จำกัด · ความสุขของเมือง {rpg.town.happiness}% ให้โอกาส {Math.round(happyBonusChance(rpg.town.happiness) * 100)}% ได้เพิ่มอีก +1 ทุกชั่วโมง (วันนี้ได้ {rpg.happyBonusToday || 0}) · วินัยยาก (ออกกำลังกาย ไม่กินแป้ง จ่ายหนี้ ออม) วันนี้ {e.hard} อย่าง → ดรอปวัสดุดีขึ้น</div>
    </Card>
  )
}

const fmtAgo = (iso) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 60 ? `${m} นาที` : m < 1440 ? `${Math.round(m / 60)} ชั่วโมง` : `${Math.round(m / 1440)} วัน` }

/** what the party did while you were away */
function AwayCard({ rpg }) {
  const a = rpg.farm.away
  if (!a) return null
  return (
    <section className="px-card p-3 bg-amber-50" data-testid="away-card">
      <div className="flex items-center gap-2"><PxIcon name="em_moneybag" size={22} /><b className="text-sm flex-1">ระหว่างที่คุณไม่อยู่ ({fmtAgo(a.from)})</b><button className="px-btn !py-0.5 !px-2 text-[11px]" onClick={() => rpg.setFarm({ away: null })} data-testid="away-ok">รับทราบ</button></div>
      <div className="text-xs mt-1">ทีมออกล่า <b>{a.n}</b> รอบ ชนะ <b>{a.wins}</b> · ได้ {Object.keys(a.drops).length ? Object.entries(a.drops).map(([k, v]) => `${itemName(k)}×${v}`).join(', ') : 'ไม่ได้ของ'}</div>
      {a.cards?.length > 0 && <div className="text-xs mt-1 flex items-center gap-1 flex-wrap"><Emo k="em_card" size={14} /> ได้การ์ด: {a.cards.map((c) => `${MON_BY_ID[c.id]?.name}${c.glow ? ' (เรืองแสง)' : ''}`).join(', ')}</div>}
      {a.night > 0 && <div className="text-xs mt-1 flex items-center gap-1 flex-wrap"><Emo k={a.moon ? 'em_fullmoon' : 'em_night'} size={14} /> ล่ายามราตรี <b>{a.night}</b> รอบ{a.moon ? ' (คืนเพ็ญ)' : ''}{a.glow?.length ? <> · <Emo k="em_glow" size={14} /> เจอตัวเรืองแสง: {a.glow.map((id) => MON_BY_ID[id]?.name).join(', ')}</> : ''}</div>}
    </section>
  )
}

function Hunt({ rpg }) {
  const f = rpg.farm
  const setUi = useStore((s) => s.setUi)
  useEffect(() => { setUi({ huntOpen: true }); return () => setUi({ huntOpen: false }) }, []) // eslint-disable-line
  const fx = { ...rpg.relicFx }
  const maps = huntMaps(f, { level: rpg.level, realmTier: rpg.realm.tier, power: rpg.power, fx })
  const recent = f.recent || []
  const lastL = recent[recent.length - 1]
  const map = MAP_BY_ID[lastL?.map] || maps[0]
  const [shown, setShown] = useState(null)
  const last = MON_BY_ID[shown] || (lastL ? MON_BY_ID[lastL.mon] : map.mons[0])
  const kills = f.kills[map.id] || 0, bossNext = BOSS_AFTER * ((f.bossKills?.[map.id] || 0) + 1)
  const mode = f.mapMode || 'pick'
  return (
    <div className="space-y-3">
      <AwayCard rpg={rpg} />
      <Energy rpg={rpg} />
      <Card icon={Swords} title="HUNT · ล่าอัตโนมัติ" testid="farm-maps">
        <div className="text-[11px] text-slate-500 mb-2">ทีมออกล่าเองเมื่อมีพลังกาย ไม่ต้องกดอะไร · ตอนเปิดหน้านี้สู้ทุก 8 วินาที · ปิดแอปไว้ก็ยังล่าต่อ (ราว 5 นาทีต่อรอบ) · ชนะได้ XP ตัวละ {HUNT_XP_PER_WIN} สูงสุดวันละ {HUNT_XP_DAY} (วันนี้ {rpg.huntXpToday}/{HUNT_XP_DAY}) · กลางคืน 19:00–05:00 มอนแกร่งขึ้น {Math.round((NIGHT.monPow - 1) * 100)}% แต่ของแรร์ ×{NIGHT.rare} และมีตัวเรืองแสง {Math.round(NIGHT.glow * 100)}% (ของประจำตัว 100% ×{NIGHT.glowTrophy} ของอื่นดรอปง่ายขึ้น) · คืนพระจันทร์เต็มดวงโบนัสคูณ {NIGHT.moonMult} · ทีมล่าให้ตอนคุณหลับ ไม่ต้องอดนอน</div>
        <div className="flex flex-wrap gap-1.5 mb-2" data-testid="map-mode">
          {MAP_MODES.map((m) => <button key={m.id} onClick={() => rpg.setFarm({ mapMode: m.id })} className={`px-tab ${mode === m.id ? 'on' : ''}`} title={m.text} data-testid={`mode-${m.id}`}>{m.name}</button>)}
        </div>
        <div className="text-[11px] text-slate-500 mb-2">{MAP_MODES.find((m) => m.id === mode).text}{mode === 'pick' ? ' · แตะแผนที่เพื่อปักหมุด' : ` · ตอนนี้: ${maps.map((m) => m.name).join(', ')}`}</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MAPS.map((m) => {
            const u = mapUnlocked(m, { level: rpg.level, realmTier: rpg.realm.tier })
            const on = maps.includes(m), rate = Math.round(mapWinRate(m, rpg.power, fx) * 100)
            return (
              <button key={m.id} disabled={!u.ok} onClick={() => rpg.setFarm({ map: m.id, mapMode: 'pick' })} className={`px-inner p-2 text-left ${on ? 'ring-2 ring-emerald-500' : ''} ${u.ok ? '' : 'opacity-50'}`} data-testid={`map-${m.id}`}>
                <div className="text-sm font-semibold"><Emo e={m.emoji} size={16} /> {m.name}</div>
                <div className="text-[10px] text-slate-500">{u.ok ? `โอกาสชนะ ~${rate}% · ล่าแล้ว ${f.kills[m.id] || 0}` : <><Lock size={10} /> ปลดล็อก: {u.why}</>}</div>
              </button>
            )
          })}
        </div>
      </Card>
      <section className="px-card overflow-hidden" data-testid="farm-battle">
        <div className="relative">
          <FarmScene mapId={map.id} party={rpg.party} power={rpg.power} skills={f.skills || {}} shadows={f.shadowWorn || []} recent={recent} live={rpg.staminaLeft > 0} onMon={setShown} hue={rpg.skin?.hue || 0} idleMon={map.mons[0].id} />
          <div className="absolute left-2 top-2 px-font text-[10px] bg-white/85 px-1.5 py-0.5">พลังทีม {rpg.power}</div>
          <PhaseBadge />
          <div className="absolute right-2 top-2 text-[11px] bg-white/85 px-1.5 py-0.5"><b>{last.name}</b> · พลัง {monPower(last)}{last.kind !== 'normal' && <span className="text-rose-600"> · {last.kind === 'boss' ? 'บอส' : 'หัวหน้า'}</span>}</div>
          {!rpg.staminaLeft && <div className="absolute left-2 top-[50px] whitespace-nowrap text-[10px] bg-slate-900/80 text-white px-1.5 py-0.5" data-testid="replay-badge">{recent.length ? '▶ รีเพลย์การล่าล่าสุด' : 'ซ้อมกับหุ่นฝึก'} · พลังกายหมด +1 ในอีก {Math.ceil(rpg.nextHourIn / 60000)} นาที</div>}
        </div>
        <div className="p-3 space-y-2">
          <div className="text-[11px] text-slate-500">{map.name}: บอส “{bossOf(map).name}” จะออกมาเมื่อล่าครบ {bossNext} ตัว (ตอนนี้ {kills})</div>
          <Bar pct={kills / bossNext} color="#ef4444" />
          <div className="flex gap-1 flex-wrap text-[10px]" data-testid="farm-passives">
            {TREE.filter((t) => (f.skills?.[t.id] || 0) > 0).map((t) => <span key={t.id} className="px-inner px-1.5 py-0.5 flex items-center gap-1"><Emo k={t.icon} size={14} />{t.name} {t.kind === 'chance' ? `${Math.round(t.chance(f.skills[t.id]) * 100)}%` : `ขั้น ${f.skills[t.id]}`}</span>)}
            {(f.worn || []).map((id) => <span key={id} className="px-inner px-1.5 py-0.5 flex items-center gap-1 bg-amber-50"><Emo k={id} size={14} />{RELIC_BY_ID[id]?.name}</span>)}
            {(f.potions || 0) > 0 && <span className="px-1.5 py-0.5 bg-emerald-50"><Emo e="🧪" size={12} /> ยา ×{f.potions}</span>}
            {!Object.values(f.skills || {}).some(Boolean) && !(f.worn || []).length && <span className="text-slate-400">สกิลและของติดตัวทำงานเองระหว่างสู้ · ลงแต้มที่แท็บ “สกิล” · รับของติดตัวจาก “ชาวเมือง”</span>}
          </div>
          <div className="space-y-0.5 text-[11px]" data-testid="farm-log">
            {[...recent].reverse().slice(0, 12).map((l) => {
              const m = MON_BY_ID[l.mon]
              return <div key={l.seq} className={l.win ? 'text-slate-700' : 'text-rose-500'}><span className="text-slate-400">{l.at ? new Date(l.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}</span> <Emo e={l.win ? '⚔️' : '💥'} size={12} /> {l.night && <Emo k={l.moon ? 'em_fullmoon' : 'em_night'} size={12} />}{l.glow && <span className="text-amber-500 font-semibold"><Emo k="em_glow" size={12} />เรืองแสง </span>}{l.win ? 'ชนะ' : 'แพ้'} {m?.name}{l.card && <span className="text-indigo-600 font-semibold"> <Emo k="em_card" size={12} />การ์ด{l.card.res === 'new' ? 'ใหม่' : l.card.res === 'up' ? ' อัปขั้น' : 'ซ้ำ'}!</span>}{l.glowCard && <span className="text-fuchsia-600 font-semibold"> <Emo k="em_cardglow" size={12} />การ์ดเรืองแสง!</span>}{l.note ? ` (${l.note})` : ''}{Object.keys(l.drops).length ? ' → ' + Object.entries(l.drops).map(([k, v]) => `${itemName(k)}×${v}`).join(', ') : ''}</div>
            })}
            {!recent.length && <div className="text-slate-400">ยังไม่มีการล่า ทีมจะเริ่มเองเมื่อมีพลังกาย</div>}
          </div>
        </div>
      </section>
      <RaidLog rpg={rpg} />
    </div>
  )
}

/** monsters raid the town in the background (up to 5 times a day); this is what happened */
function RaidLog({ rpg }) {
  const list = [...(rpg.farm.raids || [])].reverse().slice(0, 15)
  return (
    <Card icon={Castle2} title="RAIDS · มอนสเตอร์บุกเมือง" testid="raid-log">
      <div className="text-[11px] text-slate-500 mb-2">เกิดเองเบื้องหลัง วันละ 0–5 ครั้ง ครั้งละ 1–5 ตัว ไม่ใช้พลังกาย · ทหารยามใช้พลังทีม 70% (+10% ต่อระดับหอสังเกตการณ์)</div>
      {list.length ? <div className="space-y-1.5">{list.map((r) => {
        const d = new Date(r.at)
        return (
          <div key={r.id} className="px-inner p-2 text-xs">
            <div className="flex items-center gap-2"><b>{d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} {r.at.slice(11, 16)} น.</b><span className="text-slate-500"><Emo e={MAP_BY_ID[r.map]?.emoji} size={16} /> {r.mons.length} ตัวบุก</span><span className={`ml-auto font-bold ${r.won === r.mons.length ? 'text-emerald-600' : r.won ? 'text-amber-600' : 'text-rose-500'}`}>ชนะ {r.won}/{r.mons.length}</span></div>
            <div className="flex gap-0.5 my-1">{r.mons.map((m, i) => <Portrait key={i} sprite={`mon_${m}`} size={24} />)}</div>
            <div className="text-slate-600">{Object.keys(r.drops).length ? 'ได้: ' + Object.entries(r.drops).map(([k, v]) => `${itemName(k)}×${v}`).join(', ') : 'ไม่ได้ของ'}</div>
          </div>
        )
      })}</div> : <div className="text-sm text-slate-400">ยังไม่มีมอนสเตอร์มาบุก</div>}
    </Card>
  )
}

function Bag({ rpg }) {
  const showToast = useStore((s) => s.showToast)
  const bag = Object.entries(rpg.farm.bag || {}).filter(([, v]) => v > 0)
  const trophies = bag.filter(([k]) => k.startsWith('t:')), mats = bag.filter(([k]) => !k.startsWith('t:'))
  const tm = 1 + (rpg.cardFx?.trophy || 0) / 100 // desert cards raise trophy prices
  const value = Math.round(trophies.reduce((s, [k, v]) => s + itemPrice(k) * v * tm, 0))
  const sell = (keys) => { const g = rpg.sellItems(keys); if (g) showToast(`ขายได้ ${g.toLocaleString()} FIAT`) }
  return (
    <div className="space-y-3">
      <Card icon={Backpack} title="TROPHIES · ของประจำตัวมอนสเตอร์" testid="farm-trophies" right={trophies.length > 0 && <button className="px-btn !py-1 text-xs" onClick={() => sell(trophies.map(([k]) => k))} data-testid="sell-trophies">ขายทั้งหมด {value.toLocaleString()} FIAT</button>}>
        <div className="text-[11px] text-slate-500 mb-2">ขายคืนร้านได้อย่างเดียว</div>
        {trophies.length ? <div className="grid grid-cols-2 gap-1.5">{trophies.map(([k, v]) => (
          <div key={k} className="px-inner p-1.5 flex items-center gap-2 text-xs"><ItemIcon k={k} /><div className="flex-1 min-w-0"><div className="truncate font-semibold">{itemName(k)}</div><div className="text-slate-500">×{v} · {itemPrice(k)} FIAT</div></div></div>
        ))}</div> : <div className="text-sm text-slate-400">ยังว่างเปล่า ไปล่ามอนสเตอร์กัน</div>}
      </Card>
      <Card icon={Hammer} title="MATERIALS · วัสดุ" testid="farm-mats">
        <div className="text-[11px] text-slate-500 mb-2">ส่งให้ชาวเมืองทำของติดตัว หรือขายก็ได้</div>
        {mats.length ? <div className="space-y-1.5">{mats.map(([k, v]) => (
          <div key={k} className="px-inner p-1.5 flex items-center gap-2 text-xs"><ItemIcon k={k} /><div className="flex-1 min-w-0"><div className="font-semibold">{MATS[k]?.name} ×{v}</div><div className="text-slate-500 truncate">{k.startsWith("t:") ? "ขายร้านได้อย่างเดียว" : matUse(k)}</div></div>{k === 'shard' ? <button className="px-btn !py-1 text-xs shrink-0" disabled={v < SHARDS_PER_GOLD} onClick={() => { const n = rpg.combineShards(); if (n) showToast(`หลอมได้ ${n} GOLD`) }} data-testid="combine-shards">หลอม {Math.floor(v / SHARDS_PER_GOLD)} GOLD</button> : MATS[k]?.noSell ? null : <button className="text-[11px] ui-link shrink-0" onClick={() => sell([k])}>ขาย {(itemPrice(k) * v).toLocaleString()}</button>}</div>
        ))}</div> : <div className="text-sm text-slate-400">ยังไม่มีวัสดุ</div>}
      </Card>
    </div>
  )
}

function Craft({ rpg }) {
  const showToast = useStore((s) => s.showToast)
  const bag = rpg.farm.bag || {}
  return (
    <div className="space-y-3">
      <Card icon={Gift} title="DISCIPLINE CHEST · หีบวินัย" testid="discipline-chests">
        <div className="text-[11px] text-slate-500 mb-2">ได้จากวินัยที่ยากในชีวิตจริงเท่านั้น: ออกกำลังกาย 14 วันติด, ไม่กินแป้ง 7 วันติด, สมาธิ 21 วันติด, ไม่ใช้เงิน 7 วันติด, อ่านจบ 1 เล่ม, ชนะบอสประจำเดือน, ออม 20% ทั้งเดือน, ทุกหมวดอยู่ในงบทั้งเดือน, ปิดเงินกู้ได้ 1 ก้อน</div>
        {rpg.chests.length ? rpg.chests.map((c) => (
          <div key={c.key} className="px-inner p-2 flex items-center gap-2 mb-1.5"><PxIcon name="g_chest" size={30} /><div className="flex-1 text-sm"><b>{c.name}</b><div className="text-[10px] text-slate-500">{['', 'หีบเงิน', 'หีบทอง', 'หีบตำนาน'][c.tier]}</div></div>
            <button className="px-btn !py-1 text-xs" onClick={() => { const L = rpg.openDiscipline(c); if (L) showToast(`ได้ ${L.fiat} FIAT · แต้มสกิล +${L.points} · หน้าคัมภีร์ ${L.page}${L.star ? ' · ดาวแห่งวินัย 1' : ''}`) }}>เปิด</button></div>
        )) : <div className="text-sm text-slate-400">ยังไม่มีหีบรอเปิด</div>}
      </Card>
      <Card icon={Sparkles} title="RELICS · ของติดตัว" testid="relic-slots" right={<span className="text-[11px]">สวม {(rpg.farm.worn || []).length}/{rpg.relicSlots}</span>}>
        <div className="text-[11px] text-slate-500 mb-2">ทำงานเองตลอดตอนล่า · ช่องเพิ่มที่เลเวล 20 และ 40 · แตะชิ้นที่ทำแล้วเพื่อสวม/ถอด</div>
        <div className="flex gap-1.5">{Array.from({ length: 5 }, (_, i) => {
          const id = (rpg.farm.worn || [])[i], open = i < rpg.relicSlots
          return <div key={i} className={`w-12 h-12 grid place-items-center border-2 ${open ? 'border-slate-700 bg-white' : 'border-dashed border-slate-300 bg-slate-50'}`} title={id ? RELIC_BY_ID[id].name : open ? 'ว่าง' : i === 3 ? 'เลเวล 20' : 'เลเวล 40'}>{id ? <Emo k={id} size={34} /> : open ? '' : <Lock size={14} />}</div>
        })}</div>
      </Card>
      {Object.entries(NPC_INFO).map(([npc, info]) => {
        const rel = RELICS.filter((r) => r.npc === npc), rec = RECIPES.filter((r) => r.npc === npc)
        return (
          <section key={npc} className="px-card p-4" data-testid={`npc-${npc}`}>
            <div className="flex items-center gap-3 mb-2"><Portrait sprite={npc} size={44} /><div><div className="font-bold text-sm">{info.name}</div><div className="text-[11px] text-slate-500">“{info.line}”</div></div></div>
            <div className="space-y-1.5">
              {rel.map((r) => {
                const t = (rpg.farm.relics || {})[r.id] || 0, need = r.need[t], worn = (rpg.farm.worn || []).includes(r.id)
                const ok = need && Object.entries(need).every(([k, v]) => (bag[k] || 0) >= v)
                return (
                  <div key={r.id} className={`px-inner p-2 flex items-center gap-2 ${worn ? 'ring-2 ring-amber-400' : ''}`} data-testid={`relic-${r.id}`}>
                    <button disabled={!t} onClick={() => { if (!rpg.wearRelic(r.id)) showToast('ช่องเต็มแล้ว ถอดชิ้นอื่นก่อน') }} className={t ? '' : 'opacity-40'}><Emo k={r.id} size={32} /></button>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="font-semibold text-sm">{r.name} {t ? <span className="text-amber-600">{'★'.repeat(t)}</span> : null}{worn && <span className="text-[10px] text-amber-700"> · สวมอยู่</span>}</div>
                      <div className="text-slate-600">{t ? r.text(r.eff[t - 1]) : `ระดับ 1: ${r.text(r.eff[0])}`}{t && t < 3 ? ` → ระดับ ${t + 1}: ${r.text(r.eff[t])}` : ''}</div>
                      {need && <div>{Object.entries(need).map(([k, v]) => <span key={k} className={`mr-2 ${(bag[k] || 0) >= v ? 'text-emerald-700' : 'text-rose-500'}`}>{MATS[k].name} {bag[k] || 0}/{v}</span>)}</div>}
                    </div>
                    {need ? <button className="px-btn !py-1 text-xs shrink-0" disabled={!ok} onClick={() => showToast(rpg.makeRelic(r.id) ? (t ? `อัป ${r.name} เป็นระดับ ${t + 1}` : `ได้ ${r.name}`) : 'วัสดุไม่พอ')}>{t ? 'อัป' : 'ส่งของ'}</button> : <span className="text-[10px] text-amber-700 shrink-0">สูงสุด</span>}
                  </div>
                )
              })}
              {rec.map((r) => {
                const ok = Object.entries(r.need).every(([k, v]) => (bag[k] || 0) >= v), done = r.decor && rpg.town.decor.includes(r.id)
                return (
                  <div key={r.id} className="px-inner p-2 flex items-center gap-2" data-testid={`recipe-${r.id}`}>
                    <Emo k={hasPx(r.id) ? r.id : r.icon} size={28} />
                    <div className="flex-1 min-w-0 text-xs"><div className="font-semibold text-sm">{r.name}</div><div className="text-slate-500">{r.gives}</div>
                      <div>{Object.entries(r.need).map(([k, v]) => <span key={k} className={`mr-2 ${(bag[k] || 0) >= v ? 'text-emerald-700' : 'text-rose-500'}`}>{MATS[k].name} {bag[k] || 0}/{v}</span>)}</div></div>
                    <button className="px-btn !py-1 text-xs shrink-0" disabled={!ok || done} onClick={() => showToast(rpg.craft(r.id) ? `ได้ “${r.name}” แล้ว` : 'วัสดุไม่พอ')}>{done ? 'มีแล้ว' : 'ส่งของ'}</button>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
      <div className="text-[11px] text-slate-500 px-1">ตอนนี้มี: ยาฟื้นพลัง {rpg.farm.potions || 0} · ชุดวัสดุก่อสร้าง {rpg.farm.kit || 0}</div>
    </div>
  )
}

function Dex({ rpg }) {
  const dex = rpg.farm.dex || {}, gdex = rpg.farm.glowDex || {}
  const glowAll = Object.values(gdex).filter((v) => v > 0).length
  const [open, setOpen] = useState(null)
  return (
    <div className="space-y-3">
      <div className="px-inner p-3 text-[12px] text-indigo-100" style={{ background: '#1e1b4b' }} data-testid="glow-dex"><div className="flex items-center gap-1.5 font-semibold text-amber-200 mb-1"><Emo k="em_glowbook" size={18} /> สมุดตัวเรืองแสง {glowAll}/{MAPS.reduce((n, m) => n + m.mons.length, 0)}</div>{MOON_LEGEND}<div className="mt-1 text-indigo-300 flex items-center gap-1"><Emo k="em_nighthunt" size={14} /> ออก 19:00–05:00 โอกาส {pct(NIGHT.glow)} · <Emo k="em_fullmoon" size={14} /> คืนเพ็ญ {pct(NIGHT.glow * NIGHT.moonMult)}</div></div>
      <MonSheet mon={open} seen={open ? dex[open.id] || 0 : 0} glow={open ? rpg.farm.glowDex?.[open.id] || 0 : 0} onClose={() => setOpen(null)} />
      {MAPS.map((m) => {
        const seen = m.mons.filter((x) => dex[x.id]).length, glowN = m.mons.filter((x) => gdex[x.id]).length
        return (
          <Card key={m.id} icon={BookOpen} title={`${m.name}`} right={<span className="text-[11px] text-slate-500 flex items-center gap-1">{seen}/{m.mons.length}{seen === m.mons.length ? ' 🏅' : ''} · <Emo k="em_glow" size={12} />{glowN}/{m.mons.length}</span>}>
            <div className="grid grid-cols-5 gap-1.5">
              {m.mons.map((x) => <button key={x.id} onClick={() => setOpen(x)} className="px-inner p-1 text-center" title={x.name} data-testid={`dex-${x.id}`}><div className="relative"><Portrait sprite={`mon_${x.id}`} size={44} dim={!dex[x.id]} />{gdex[x.id] > 0 && <span className="absolute -top-1 -right-1" title="เคยเจอตัวเรืองแสง"><Emo k="em_glow" size={14} /></span>}</div><div className="text-[9px] truncate">{dex[x.id] ? x.name : '???'}</div></button>)}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

const pct = (x) => `${+(x * 100).toFixed(2)}%`
const KIND_TH = { normal: 'มอนสเตอร์ทั่วไป', elite: 'หัวหน้า', boss: 'บอสประจำแผนที่' }
/** one monster: lore of its land and of itself, power, drops (shown even before you meet it, its name stays hidden) */
/** time of day on the hunt scene: what the night gives (ล่ายามราตรี) */
function PhaseBadge() {
  const [, tick] = useState(0)
  useEffect(() => { const iv = setInterval(() => tick((x) => x + 1), 60000); return () => clearInterval(iv) }, [])
  const tod = todOf(), moon = tod.id === 'night' && isFullMoon()
  const icon = tod.id === 'night' ? (moon ? 'em_fullmoon' : 'em_nighthunt') : { morning: 'em_dawn', day: 'em_day', evening: 'em_dusk' }[tod.id]
  const text = tod.id === 'night'
    ? `${moon ? 'คืนเพ็ญ' : 'ล่ายามราตรี'} · ของแรร์ ×${moon ? 1 + (NIGHT.rare - 1) * NIGHT.moonMult : NIGHT.rare} · ตัวเรืองแสง ${Math.round(NIGHT.glow * (moon ? NIGHT.moonMult : 1) * 100)}% · มอนแกร่ง +${Math.round((NIGHT.monPow - 1) * 100)}%`
    : `${tod.name} · โบนัสล่ายามราตรีเริ่ม 19:00`
  return <div className={`absolute left-2 top-7 text-[10px] px-1.5 py-0.5 flex items-center gap-1 ${tod.id === 'night' ? 'bg-indigo-950/85 text-amber-200' : 'bg-white/85'}`} data-testid="phase-badge"><Emo k={icon} size={14} />{text}</div>
}

function MonSheet({ mon, seen, glow = 0, onClose }) {
  const [form, setForm] = useState('normal')
  useEffect(() => setForm('normal'), [mon?.id])
  if (!mon) return null
  const map = MAP_BY_ID[mon.map], known = seen > 0, g = form === 'glow', gKnown = glow > 0
  return (
    <Sheet open onClose={onClose} title={g ? (gKnown ? `${mon.name} (เรืองแสง)` : '??? (ร่างเรืองแสง)') : known ? mon.name : '??? (ยังไม่เคยเจอ)'}>
      <div className="space-y-3" data-testid="mon-sheet">
        <div className="flex gap-1 text-xs" data-testid="mon-form">
          <button onClick={() => setForm('normal')} className={`px-btn px-2 py-1 ${!g ? 'ring-2 ring-slate-900' : 'opacity-50'}`}>ร่างปกติ</button>
          <button onClick={() => setForm('glow')} className={`px-btn px-2 py-1 flex items-center gap-1 ${g ? 'ring-2 ring-slate-900' : 'opacity-50'}`} data-testid="mon-form-glow"><Emo k="em_glow" size={14} /> ร่างเรืองแสง</button>
        </div>
        <div className="flex gap-3 items-center">
          <div className="w-28 h-28 grid place-items-center border-2 border-slate-800 shrink-0" style={{ backgroundImage: `url(./sprites/map_${map.id}${g && NIGHT_BG.includes(map.id) ? '_night' : ''}.png)`, backgroundSize: 'cover', backgroundPosition: 'center bottom', imageRendering: 'pixelated' }}><Portrait sprite={g ? `mon_${mon.id}_glow` : `mon_${mon.id}`} size={92} dim={g ? !gKnown : !known} /></div>
          <div className="text-sm space-y-0.5">
            <div><b>{KIND_TH[mon.kind]}</b> · <Emo e={map.emoji} size={16} /> {map.name}</div>
            <div>พลัง ~{g ? Math.round(monPower(mon) * NIGHT.monPow) : monPower(mon)}{g ? ' (กลางคืน +10%)' : ''}</div>
            {g ? <div>เจอตัวเรืองแสง <b>{glow}</b> ครั้ง</div> : <div>ล่าได้แล้ว <b>{seen}</b> ตัว</div>}
            {!g && glow > 0 && <div className="text-amber-600 flex items-center gap-1"><Emo k="em_glow" size={14} /> เจอตัวเรืองแสง <b>{glow}</b> ครั้ง</div>}
          </div>
        </div>
        {g ? <>
          <div className="px-inner p-3 text-sm bg-indigo-50"><div className="text-[11px] text-slate-500 mb-0.5">ตำนานตัวเรืองแสง</div>{gKnown ? MON_GLOW_LORE[mon.id] : 'ล่ามันในยามค่ำคืนให้เจอร่างเรืองแสงสักครั้งเพื่ออ่านตำนาน'}</div>
          <div className="px-inner p-3 text-sm"><div className="text-[11px] text-slate-500 mb-0.5">{map.name} ยามราตรี</div>{MAP_NIGHT[map.id]}</div>
          <div>
            <div className="text-[11px] text-slate-500 mb-1">ของที่ดรอปจากร่างเรืองแสง</div>
            <div className="space-y-1.5">
              <div className="px-inner p-2 flex items-center gap-2 text-xs bg-indigo-50"><ItemIcon k={`t:${mon.id}`} /><div className="flex-1"><b>{mon.trophy} ×{NIGHT.glowTrophy}</b> · ดรอปทุกครั้ง<div className="text-slate-500">พบได้ 19:00–05:00 โอกาส {pct(NIGHT.glow)} ต่อตัว (คืนเพ็ญ {pct(NIGHT.glow * NIGHT.moonMult)}) · {trophyPrice(mon) * NIGHT.glowTrophy} FIAT</div></div></div>
              <div className="px-inner p-2 text-xs space-y-0.5"><div>ของอื่นดรอปเหมือนร่างปกติทุกอย่าง แต่โอกาสสูงขึ้น:</div><div className="text-slate-500">วัสดุ ×{NIGHT.glowDrop} · ของหายาก ×{NIGHT.glowDrop} (รวมกลางคืนเป็น ×{NIGHT.glowDrop * NIGHT.rare}) · ผลึกเวท ×{NIGHT.glowDrop} · เศษทอง ×{NIGHT.glowShard} · การ์ด ×{GLOW_CARD_MULT} และโอกาส {pct(GLOW_CARD)} ได้การ์ดเรืองแสง</div></div>
            </div>
          </div>
        </> : <>
        <div className="px-inner p-3 text-sm"><div className="text-[11px] text-slate-500 mb-0.5">ตำนานของมอนสเตอร์</div>{known ? MON_LORE[mon.id] : 'ล่ามันให้ได้สักครั้งเพื่ออ่านตำนาน'}</div>
        <div className="px-inner p-3 text-sm"><div className="text-[11px] text-slate-500 mb-0.5">ดินแดน: {map.name}</div>{MAP_LORE[map.id]}</div>
        <div>
          <div className="text-[11px] text-slate-500 mb-1">ของที่ดรอป</div>
          <div className="space-y-1.5">
            <div className="px-inner p-2 flex items-center gap-2 text-xs"><ItemIcon k={`t:${mon.id}`} /><div className="flex-1"><b>{mon.trophy}</b> · ของประจำตัว (ขายร้านได้อย่างเดียว)<div className="text-slate-500">{mon.kind === 'normal' ? `โอกาส ${pct(LOOT.trophy)}` : 'ดรอปทุกครั้ง'} · {trophyPrice(mon)} FIAT</div></div></div>
            {map.mats.map((k) => <div key={k} className="px-inner p-2 flex items-center gap-2 text-xs"><ItemIcon k={k} /><div className="flex-1"><b>{MATS[k].name}</b> · วัสดุ{mon.kind === 'boss' ? ' ×4' : mon.kind === 'elite' ? ' ×2' : ''}<div className="text-slate-500">โอกาส {pct(LOOT.mat)}+ (สุ่ม 1 ใน {map.mats.length} ชนิด) · {matUse(k)}</div></div></div>)}
            <div className="px-inner p-2 flex items-center gap-2 text-xs bg-indigo-50"><ItemIcon k={`t:${mon.id}`} /><div className="flex-1"><b className="inline-flex items-center gap-1">ตัวเรืองแสง <Emo k="em_glow" size={12} /></b> · ออกเฉพาะกลางคืน (ดูแท็บร่างเรืองแสง)<div className="text-slate-500">โอกาส {pct(NIGHT.glow)} ต่อตัว (คืนเพ็ญ {pct(NIGHT.glow * NIGHT.moonMult)}) · ดรอป{mon.trophy} 100% ทีละ {NIGHT.glowTrophy} ชิ้น ของอื่นโอกาสสูงขึ้น</div></div></div>
            {rareOf(map).map((k) => <div key={k} className="px-inner p-2 flex items-center gap-2 text-xs"><ItemIcon k={k} /><div className="flex-1"><b>{MATS[k].name}</b> · ของหายาก<div className="text-slate-500">โอกาส {pct(RARE_ODDS[mon.kind] / 2)} (กลางคืน ×{NIGHT.rare}, คืนเพ็ญ ×{1 + (NIGHT.rare - 1) * NIGHT.moonMult}) · {matUse(k)}</div></div></div>)}
            <div className="px-inner p-2 flex items-center gap-2 text-xs"><ItemIcon k="mcrystal" /><div className="flex-1"><b>{MATS.mcrystal.name}</b> · ใช้ตีบวก<div className="text-slate-500">โอกาส {pct(LOOT.mcrystal[mon.kind])} · {matUse('mcrystal')}</div></div></div>
            <div className="px-inner p-2 flex items-center gap-2 text-xs bg-amber-50"><ItemIcon k="shard" /><div className="flex-1"><b>{MATS.shard.name}</b> · หายากมาก<div className="text-slate-500">โอกาส {pct(LOOT.shard[mon.kind])} · {matUse('shard')}</div></div></div>
            <div className="px-inner p-2 flex items-center gap-2 text-xs bg-indigo-50"><PxIcon name="em_card" size={28} /><div className="flex-1"><b>การ์ด{mon.name}</b> · ใส่สมุดสะสมการ์ด<div className="text-slate-500">โอกาส {pct(CARD_DROP[mon.kind])} (เท่าเศษทอง) · ตัวเรืองแสง ×{GLOW_CARD_MULT} · ดูในแท็บ “การ์ด”</div></div></div>
          </div>
        </div>
        </>}
      </div>
    </Sheet>
  )
}

/** the story of each map, told in three chapters that open as you hunt there */
function Story({ rpg }) {
  const f = rpg.farm
  return (
    <div className="space-y-3" data-testid="farm-story">
      {MAPS.map((m) => {
        const u = mapUnlocked(m, { level: rpg.level, realmTier: rpg.realm.tier }).ok
        const kills = f.kills?.[m.id] || 0, boss = f.bossKills?.[m.id] || 0
        const open = [u, u && kills >= 15, u && boss > 0]
        const nm = normalsOf(m), half = Math.ceil(nm.length / 2)
        const cast = (i) => (i === 0 ? nm.slice(0, half) : i === 1 ? [...nm.slice(half), eliteOf(m)] : [bossOf(m)])
        return (
          <section key={m.id} className="px-card overflow-hidden">
            <div className="h-20 relative" style={{ backgroundImage: `url(./sprites/map_${m.id}.png)`, backgroundSize: 'cover', backgroundPosition: 'center 70%', imageRendering: 'pixelated', filter: u ? 'none' : 'grayscale(1) brightness(.6)' }}>
              <div className="absolute left-2 bottom-2 bg-slate-900/80 text-white px-2 py-1 text-sm font-bold"><Emo e={m.emoji} size={16} /> {m.name}</div>
              <div className="absolute right-2 bottom-2 bg-white/85 px-1.5 py-0.5 text-[10px]">บท {open.filter(Boolean).length}/3</div>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="text-[12px] text-slate-600 italic">{MAP_LORE[m.id]}</div>
              {STORY[m.id].map((text, i) => (
                <div key={i} className={`px-inner p-2.5 ${open[i] ? '' : 'opacity-60'}`}>
                  <div className="text-[11px] font-bold mb-1">บทที่ {i + 1} {open[i] ? '' : <>· <PxIcon name="Lock" size={11} /> {i === 0 ? 'ปลดล็อกแผนที่ก่อน' : STORY_STEPS[i]}</>}</div>
                  {open[i] ? <div className="text-sm">{text}</div> : <div className="text-sm text-slate-400">…</div>}
                  <div className="flex flex-wrap gap-1 mt-1.5">{cast(i).map((x) => <div key={x.id} title={x.name}><Portrait sprite={`mon_${x.id}`} size={i === 2 ? 48 : 30} dim={!open[i] || !f.dex?.[x.id]} /></div>)}</div>
                </div>
              ))}
              {(() => { const gl = m.mons.filter((x) => f.glowDex?.[x.id]); const on = gl.length > 0
                return <div style={{ background: '#1e1b4b' }} className={`px-inner p-2.5 text-indigo-100 ${on ? '' : 'opacity-80'}`} data-testid={`story-night-${m.id}`}>
                  <div className="text-[11px] font-bold mb-1 flex items-center gap-1 text-amber-200"><Emo k="em_night" size={14} /> บทพิเศษ: ยามราตรี {on ? '' : <>· <PxIcon name="Lock" size={11} /> เจอตัวเรืองแสงในแผนที่นี้สักตัว</>}</div>
                  {on ? <div className="text-sm">{MAP_NIGHT[m.id]}</div> : <div className="text-sm text-indigo-300">…</div>}
                  <div className="flex flex-wrap gap-1 mt-1.5">{gl.map((x) => <div key={x.id} title={`${x.name} (เรืองแสง)`}><Portrait sprite={`mon_${x.id}_glow`} size={30} /></div>)}</div>
                </div> })()}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** the new skill tree (in the Skills tab) */
export function SkillTree({ rpg }) {
  const showToast = useStore((s) => s.showToast)
  const f = rpg.farm, bag = f.bag || {}
  return (
    <Card icon={Sparkles} title="SKILL TREE · ต้นไม้สกิล" testid="skill-tree" right={<span className="text-[11px]">แต้มเหลือ <b>{rpg.skillPts}</b></span>}>
      <div className="text-[11px] text-slate-500 mb-2">ได้ 1 แต้มทุกเลเวล + จากหีบวินัย · ขั้น 4–5 ใช้หน้าคัมภีร์และหมึกเวท ขั้น 5 ใช้ดาวแห่งวินัย · ทุกสกิลทำงานเอง ไม่ต้องกด · สกิลแบบมีโอกาสใช้มานาจากวินัยวันนี้ · สกิลของเพื่อนร่วมทีมทำงานเมื่อเขาเข้าทีมแล้ว</div>
      <div className="space-y-1.5">
        {TREE.map((t) => {
          const r = f.skills?.[t.id] || 0, c = rankCost(r + 1)
          const member = rpg.party.find((p) => p.id === t.member)
          return (
            <div key={t.id} className={`px-inner p-2 flex items-center gap-2 ${member?.joined ? '' : 'opacity-60'}`}>
              <Emo k={t.icon} size={30} />
              <div className="flex-1 min-w-0 text-xs"><div className="font-semibold text-sm">{t.name} <span className="text-slate-400 font-normal">{member?.name} · {t.kind === 'chance' ? `ทำงานเองตามโอกาส · ใช้ ${t.mana} มานาเมื่อทำงาน` : 'ทำงานตลอด'}</span></div>
                <div className="text-slate-600">{r ? t.text(r) : `ขั้น 1: ${t.text(1)}`}</div>
                <div className="flex gap-0.5 mt-0.5">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`w-4 h-1.5 ${n <= r ? 'bg-amber-400' : 'bg-slate-200'}`} />)}</div></div>
              {r < 5 && <button className="px-btn !py-1 text-xs shrink-0" disabled={rpg.skillPts < c.pts || (c.page && (bag.page || 0) < c.page) || (c.ink && (bag.ink || 0) < c.ink) || (c.star && (bag.star || 0) < c.star)}
                onClick={() => showToast(rpg.rankUp(t.id) ? `${t.name} ขั้น ${r + 1}` : 'แต้มหรือวัสดุไม่พอ')}>+ ({c.pts}{c.page ? ` · คัมภีร์ ${c.page} · หมึก ${c.ink}` : ''}{c.star ? ' · ดาว 1' : ''})</button>}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/** +0 → +10 with magic crystals (in the Gear tab) */
export function EnhanceCard({ rpg }) {
  const showToast = useStore((s) => s.showToast)
  const [res, setRes] = useState(null)
  const bag = rpg.farm.bag || {}, enh = rpg.farm.enh || {}
  return (
    <Card icon={Gem} title="ENHANCE · ตีบวกอุปกรณ์" testid="enhance" right={<span className="text-[11px]">คริสตัลเวท <b>{bag.mcrystal || 0}</b></span>}>
      <div className="text-[11px] text-slate-500 mb-2">ระดับอุปกรณ์มาจากชีวิตจริง ส่วนการตีบวกเป็นพลังเสริมจากการล่า · ไม่มีแตก · ตั้งแต่ +5 ถ้าพลาดจะลด 1 ขั้น · +1% ต่อขั้นตามความถนัดของแต่ละชิ้น</div>
      <div className="space-y-1.5">
        {rpg.gear.map((g) => {
          const n = enh[g.slot] || 0, st = enhStep(n)
          return (
            <div key={g.slot} className="px-inner p-2 flex items-center gap-2" data-testid={`enh-${g.slot}`}>
              <div className="relative"><PxIcon name={`gr_${g.slot}${g.tier}`} size={30} />{n >= 7 && <span className="absolute -inset-1 rounded-full animate-pulse" style={{ boxShadow: '0 0 10px 2px rgba(250,204,21,.7)' }} />}</div>
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-semibold text-sm">{g.name} <span className="text-amber-600">+{n}</span></div>
                <div className="text-slate-600">{ENH_FX[g.slot]} +{n}%{st ? ` · ต่อไป +${n + 1}: โอกาส ${Math.round(st.p * 100)}% · คริสตัล ${st.c} · ${st.fiat} FIAT${st.down ? ' · พลาดลด 1 ขั้น' : ''}` : ' · สูงสุดแล้ว'}</div>
              </div>
              {st && <button className="px-btn !py-1 text-xs shrink-0" disabled={(bag.mcrystal || 0) < st.c || rpg.fiat < st.fiat} onClick={() => { const r = rpg.enhance(g.slot); if (r) { setRes({ ...r, slot: g.slot }); showToast(r.ok ? `✨ สำเร็จ! ${g.name} +${r.to}` : `💥 ไม่สำเร็จ${r.to < r.from ? ` ลดเหลือ +${r.to}` : ''}`) } }}>ตีบวก</button>}
            </div>
          )
        })}
      </div>
      {res && <div className={`mt-2 text-center text-sm font-bold ${res.ok ? 'text-amber-600' : 'text-rose-500'}`}>{res.ok ? `✨ +${res.from} → +${res.to}` : `💥 +${res.from} → +${res.to}`}</div>}
    </Card>
  )
}
const SLOT_KEY = { weapon: 'g_weapon', armor: 'g_armor', boots: 'g_boots', satchel: 'g_satchel', ring: 'g_ring' }

/** shadow soldiers (in the Party tab) */
export function ShadowCard({ rpg }) {
  const showToast = useStore((s) => s.showToast)
  const f = rpg.farm, worn = f.shadowWorn || [], own = f.shadows || {}
  return (
    <Card icon={Ghost} title="SHADOW ARMY · ทหารเงา" testid="shadow-army" right={<span className="text-[11px]">ออกรบ {worn.length}/{rpg.shadowSlots}</span>}>
      <div className="text-[11px] text-slate-500 mb-2">ตัวคุณในชุดฮีโร่ต่าง ๆ พร้อมออร่าเงา ช่วยบัพและออกโจมตีในการล่า · ช่องเปิดที่เลเวล {SHADOW_SLOT_LV.join(' / ')} · ซื้อด้วย GOLD + FIAT</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {SHADOWS.map((x) => {
          const has = !!own[x.id], on = worn.includes(x.id)
          return (
            <div key={x.id} className={`px-inner p-2 text-center ${on ? 'ring-2 ring-violet-500' : ''}`} data-testid={`shadow-${x.id}`}>
              <div className="mx-auto w-fit" style={{ filter: has ? 'drop-shadow(0 0 4px rgba(124,58,237,.9))' : 'none' }}><Portrait sprite={x.id} size={52} dim={!has} /></div>
              <div className="text-[11px] font-semibold leading-tight mt-1">{x.name}</div>
              <div className="text-[10px] text-slate-500">{x.text}</div>
              {has ? <button className="px-btn !py-0.5 !px-2 text-[11px] mt-1" onClick={() => { if (!rpg.wearShadow(x.id)) showToast('ช่องเต็มแล้ว') }}>{on ? 'พัก' : 'ออกรบ'}</button>
                : <button className="px-btn !py-0.5 !px-2 text-[11px] mt-1" disabled={rpg.gold < x.gold || rpg.fiat < x.fiat} onClick={() => showToast(rpg.buyShadow(x.id) ? `${x.name} เข้าร่วมทีม` : 'GOLD หรือ FIAT ไม่พอ')}>{x.gold} GOLD + {x.fiat.toLocaleString()}</button>}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
