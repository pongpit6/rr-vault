import { useEffect, useRef, useState } from 'react'
import { Swords, Backpack, Hammer, BookOpen, Zap, Lock, Gift, Sparkles, Play, Pause } from './px'
import { Emo, PxIcon, hasPx } from './px'
import { Portrait } from './RpgBits'
import { useStore } from '../store'
import { MAPS, MAP_BY_ID, MON_BY_ID, MATS, TREE, rankCost, RECIPES, mapUnlocked, itemName, itemPrice, itemIcon, ENERGY_PTS } from '../lib/farm'
import { monPower, BOSS_AFTER } from '../lib/farmData'

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
const MON_SIZE = { normal: 72, elite: 88, boss: 104 }

export default function FarmTab({ rpg }) {
  const [sub, setSub] = useState('hunt')
  return (
    <div className="space-y-3" data-testid="farm-tab">
      <div className="flex gap-1.5">
        {[['hunt', 'ล่า', Swords], ['bag', 'กระเป๋า', Backpack], ['craft', 'โรงช่าง', Hammer], ['dex', 'สมุดมอนสเตอร์', BookOpen]].map(([id, label, I]) => (
          <button key={id} onClick={() => setSub(id)} className={`px-tab ${sub === id ? 'on' : ''}`} data-testid={`farm-sub-${id}`}><I size={14} /> {label}{id === 'craft' && rpg.chests.length > 0 && <span className="dot" />}</button>
        ))}
      </div>
      {sub === 'hunt' && <Hunt rpg={rpg} />}
      {sub === 'bag' && <Bag rpg={rpg} />}
      {sub === 'craft' && <Craft rpg={rpg} />}
      {sub === 'dex' && <Dex rpg={rpg} />}
    </div>
  )
}

function Energy({ rpg }) {
  const e = rpg.energy
  return (
    <Card icon={Zap} title="ENERGY · พลังจากวินัยวันนี้" testid="farm-energy">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><div className="flex justify-between"><b>พลังกาย</b><span className="num">{rpg.staminaLeft}/{e.stamina}</span></div><Bar pct={rpg.staminaLeft / e.stamina} color="#f97316" /><div className="text-[10px] text-slate-500 mt-0.5">1 รอบการล่า = 1 พลังกาย</div></div>
        <div><div className="flex justify-between"><b>มานา</b><span className="num">{rpg.manaLeft}/{e.mana}</span></div><Bar pct={rpg.manaLeft / Math.max(1, e.mana)} color="#6366f1" /><div className="text-[10px] text-slate-500 mt-0.5">ใช้กดสกิล</div></div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {e.parts.map((p) => <span key={p.id} className={`text-[10px] px-1.5 py-0.5 border ${p.done ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-400'}`}>{p.done ? '✓' : '+'}{p.pts} {p.name}</span>)}
        {e.fit > 0 && <span className="text-[10px] px-1.5 py-0.5 border border-amber-400 bg-amber-50">+5 ร่างกายฟิต 7 วัน</span>}
      </div>
      <div className="text-[10px] text-slate-500 mt-1">ฐาน 20 + จากวินัยสูงสุด 20 · วินัยยาก (ออกกำลังกาย ไม่กินแป้ง จ่ายหนี้ ออม) วันนี้ทำแล้ว {e.hard} อย่าง → ดรอปวัสดุดีขึ้น</div>
    </Card>
  )
}

function Hunt({ rpg }) {
  const f = rpg.farm, map = MAP_BY_ID[f.map] || MAPS[0]
  const showToast = useStore((s) => s.showToast)
  const [log, setLog] = useState([])
  const [shake, setShake] = useState(0)
  const R = useRef(rpg); R.current = rpg
  const hit = (n) => {
    const out = R.current.farmFight(n)
    if (!out.length) { showToast(R.current.staminaLeft ? 'แผนที่นี้ยังไม่ปลดล็อก' : 'พลังกายหมดแล้ว ทำวินัยเพิ่มเพื่อได้พลังกายอีก'); R.current.setFarm({ auto: false }); return }
    setLog((l) => [...out.reverse(), ...l].slice(0, 12)); setShake((x) => x + 1)
  }
  // auto: one fight every 6 s while this screen is open; on return, catch up the time away (max 8 h, still limited by stamina)
  useEffect(() => {
    if (!f.auto) return
    if (f.last) { const n = Math.min(R.current.staminaLeft, Math.floor(Math.min(8 * 3600e3, Date.now() - new Date(f.last).getTime()) / 60000)); if (n > 0) hit(n) }
    const id = setInterval(() => { if (R.current.staminaLeft > 0) hit(1); else R.current.setFarm({ auto: false }) }, 6000)
    return () => clearInterval(id)
  }, [f.auto, f.map]) // eslint-disable-line
  const last = log[0] ? MON_BY_ID[log[0].mon] : map.mons[0]
  const kills = f.kills[map.id] || 0, bossNext = BOSS_AFTER * ((f.bossKills?.[map.id] || 0) + 1)
  return (
    <div className="space-y-3">
      <Energy rpg={rpg} />
      <Card icon={Swords} title="HUNT · เลือกแผนที่" testid="farm-maps">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MAPS.map((m) => {
            const u = mapUnlocked(m, { level: rpg.level, realmTier: rpg.realm.tier })
            return (
              <button key={m.id} disabled={!u.ok} onClick={() => rpg.setFarm({ map: m.id })} className={`px-inner p-2 text-left ${f.map === m.id ? 'ring-2 ring-emerald-500' : ''} ${u.ok ? '' : 'opacity-50'}`} data-testid={`map-${m.id}`}>
                <div className="text-sm font-semibold">{m.emoji} {m.name}</div>
                <div className="text-[10px] text-slate-500">{u.ok ? `พลังมอน ~${monPower(m.mons[0])} · ล่าแล้ว ${f.kills[m.id] || 0}` : <><Lock size={10} /> ปลดล็อก: {u.why}</>}</div>
              </button>
            )
          })}
        </div>
      </Card>
      <section className="px-card overflow-hidden" data-testid="farm-battle">
        <div className="relative h-44" style={{ backgroundImage: `url(./sprites/map_${map.id}.png)`, backgroundSize: 'cover', backgroundPosition: 'center bottom', imageRendering: 'pixelated', backgroundColor: '#bae6fd' }}>
          <div className="absolute left-2 bottom-3 flex items-end gap-0.5">
            {rpg.party.filter((p) => p.joined).map((p) => <Portrait key={p.id} sprite={p.sprite} size={p.id === 'knight' ? 64 : 52} />)}
          </div>
          <div key={shake} className="absolute right-3 bottom-3 anim-bob"><Portrait sprite={`mon_${last.id}`} size={MON_SIZE[last.kind]} /></div>
          <div className="absolute left-2 top-2 px-font text-[10px] bg-white/85 px-1.5 py-0.5">พลังทีม {rpg.power}</div>
          <div className="absolute right-2 top-2 text-[11px] bg-white/85 px-1.5 py-0.5"><b>{last.name}</b> · พลัง {monPower(last)}{last.kind !== 'normal' && <span className="text-rose-600"> · {last.kind === 'boss' ? 'บอส' : 'หัวหน้า'}</span>}</div>
        </div>
        <div className="p-3 space-y-2">
          <div className="text-[11px] text-slate-500">บอส “{map.mons[9].name}” จะออกมาเมื่อล่าครบ {bossNext} ตัว (ตอนนี้ {kills})</div>
          <Bar pct={kills / bossNext} color="#ef4444" />
          <div className="flex gap-2 flex-wrap">
            <button className="px-btn" onClick={() => hit(1)} disabled={!rpg.staminaLeft} data-testid="farm-hit1"><Swords size={15} /> สู้ 1 รอบ</button>
            <button className="px-btn" onClick={() => hit(5)} disabled={!rpg.staminaLeft}>สู้ 5 รอบ</button>
            <button className={`px-btn ${f.auto ? '!bg-amber-400' : ''}`} onClick={() => rpg.setFarm({ auto: !f.auto, last: new Date().toISOString() })} disabled={!rpg.staminaLeft && !f.auto} data-testid="farm-auto">{f.auto ? <><Pause size={15} /> หยุดออโต้</> : <><Play size={15} /> ออโต้</>}</button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TREE.filter((t) => t.type === 'active' && (f.skills?.[t.id] || 0) > 0).map((t) => (
              <button key={t.id} className="px-inner px-2 py-1 text-xs flex items-center gap-1" disabled={rpg.manaLeft < t.mana} onClick={() => showToast(rpg.castSkill(t.id) ? `ใช้ “${t.name}” แล้ว` : 'มานาไม่พอ หรือสมาชิกยังไม่เข้าทีม')}>
                <Emo k={t.icon} size={18} /> {t.name} <span className="text-indigo-600">{t.mana}✦</span>{f.buffs?.[t.id] ? <span className="text-emerald-600"> ×{f.buffs[t.id]}</span> : null}
              </button>
            ))}
            {!TREE.some((t) => t.type === 'active' && (f.skills?.[t.id] || 0) > 0) && <span className="text-[11px] text-slate-400">ยังไม่มีสกิลกดใช้ ไปเพิ่มแต้มที่แท็บ “สกิล”</span>}
            {(f.potions || 0) > 0 && <span className="text-[11px] px-2 py-1 bg-emerald-50">🧪 ยาฟื้นพลัง ×{f.potions}</span>}
          </div>
          <div className="space-y-0.5 text-[11px]" data-testid="farm-log">
            {log.map((l, i) => {
              const m = MON_BY_ID[l.mon]
              return <div key={i} className={l.win ? 'text-slate-700' : 'text-rose-500'}>{l.win ? '⚔️ ชนะ' : '💥 แพ้'} {m.name}{l.note ? ` (${l.note})` : ''}{Object.keys(l.drops).length ? ' → ' + Object.entries(l.drops).map(([k, v]) => `${itemName(k)}×${v}`).join(', ') : ''}</div>
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

function Bag({ rpg }) {
  const showToast = useStore((s) => s.showToast)
  const bag = Object.entries(rpg.farm.bag || {}).filter(([, v]) => v > 0)
  const trophies = bag.filter(([k]) => k.startsWith('t:')), mats = bag.filter(([k]) => !k.startsWith('t:'))
  const value = trophies.reduce((s, [k, v]) => s + itemPrice(k) * v, 0)
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
        <div className="text-[11px] text-slate-500 mb-2">ใช้ที่โรงช่าง หรือขายก็ได้</div>
        {mats.length ? <div className="space-y-1.5">{mats.map(([k, v]) => (
          <div key={k} className="px-inner p-1.5 flex items-center gap-2 text-xs"><ItemIcon k={k} /><div className="flex-1 min-w-0"><div className="font-semibold">{MATS[k]?.name} ×{v}</div><div className="text-slate-500 truncate">{MATS[k]?.use}</div></div><button className="text-[11px] ui-link shrink-0" onClick={() => sell([k])}>ขาย {(itemPrice(k) * v).toLocaleString()}</button></div>
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
        <div className="text-[11px] text-slate-500 mb-2">ได้จากวินัยที่ยากในชีวิตจริงเท่านั้น: ออกกำลังกาย 14 วันติด, ไม่กินแป้ง 7 วันติด, สมาธิ 21 วันติด, ไม่ใช้เงิน 7 วันติด, อ่านจบ 1 เล่ม, ชนะบอสประจำเดือน, ออม 20% ทั้งเดือน, ปลดหนี้ได้ 1 ก้อน</div>
        {rpg.chests.length ? rpg.chests.map((c) => (
          <div key={c.key} className="px-inner p-2 flex items-center gap-2 mb-1.5"><PxIcon name="g_chest" size={30} /><div className="flex-1 text-sm"><b>{c.name}</b><div className="text-[10px] text-slate-500">{['', 'หีบเงิน', 'หีบทอง', 'หีบตำนาน'][c.tier]}</div></div>
            <button className="px-btn !py-1 text-xs" onClick={() => { const L = rpg.openDiscipline(c); if (L) showToast(`ได้ ${L.fiat} FIAT · แต้มสกิล +${L.points} · หน้าคัมภีร์ ${L.page}${L.star ? ' · ดาวแห่งวินัย 1' : ''}`) }}>เปิด</button></div>
        )) : <div className="text-sm text-slate-400">ยังไม่มีหีบรอเปิด</div>}
      </Card>
      <Card icon={Hammer} title="WORKSHOP · โรงช่าง" testid="workshop" right={<Portrait sprite="npc_smith" size={32} />}>
        <div className="space-y-1.5">
          {RECIPES.map((r) => {
            const ok = Object.entries(r.need).every(([k, v]) => (bag[k] || 0) >= v)
            const done = r.decor && rpg.town.decor.includes(r.id)
            return (
              <div key={r.id} className="px-inner p-2 flex items-center gap-2" data-testid={`recipe-${r.id}`}>
                <Emo k={hasPx(r.id) ? r.id : r.icon} size={28} />
                <div className="flex-1 min-w-0 text-xs"><div className="font-semibold text-sm">{r.name}</div><div className="text-slate-500">{r.gives}</div>
                  <div>{Object.entries(r.need).map(([k, v]) => <span key={k} className={`mr-2 ${(bag[k] || 0) >= v ? 'text-emerald-700' : 'text-rose-500'}`}>{MATS[k].name} {bag[k] || 0}/{v}</span>)}</div></div>
                <button className="px-btn !py-1 text-xs shrink-0" disabled={!ok || done} onClick={() => showToast(rpg.craft(r.id) ? `ทำ “${r.name}” แล้ว` : 'วัสดุไม่พอ')}>{done ? 'มีแล้ว' : 'ทำ'}</button>
              </div>
            )
          })}
        </div>
        <div className="text-[11px] text-slate-500 mt-2">ตอนนี้มี: ยาฟื้นพลัง {rpg.farm.potions || 0} · ชุดวัสดุก่อสร้าง {rpg.farm.kit || 0} · ความผูกพันสัตว์เลี้ยง {rpg.farm.bond || 0} (ดรอป +{Math.min(5, Math.floor((rpg.farm.bond || 0) / 5))}%)</div>
      </Card>
    </div>
  )
}

function Dex({ rpg }) {
  const dex = rpg.farm.dex || {}
  return (
    <div className="space-y-3">
      {MAPS.map((m) => {
        const seen = m.mons.filter((x) => dex[x.id]).length
        return (
          <Card key={m.id} icon={BookOpen} title={`${m.name}`} right={<span className="text-[11px] text-slate-500">{seen}/10{seen === 10 ? ' 🏅' : ''}</span>}>
            <div className="grid grid-cols-5 gap-1.5">
              {m.mons.map((x) => <div key={x.id} className="px-inner p-1 text-center" title={x.name}><Portrait sprite={`mon_${x.id}`} size={44} dim={!dex[x.id]} /><div className="text-[9px] truncate">{dex[x.id] ? x.name : '???'}</div></div>)}
            </div>
          </Card>
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
      <div className="text-[11px] text-slate-500 mb-2">ได้ 1 แต้มทุกเลเวล + จากหีบวินัย · ขั้น 4–5 ใช้หน้าคัมภีร์และหมึกเวท ขั้น 5 ใช้ดาวแห่งวินัย · สกิลของเพื่อนร่วมทีมใช้ได้เมื่อเขาเข้าทีมแล้ว</div>
      <div className="space-y-1.5">
        {TREE.map((t) => {
          const r = f.skills?.[t.id] || 0, c = rankCost(r + 1)
          const member = rpg.party.find((p) => p.id === t.member)
          return (
            <div key={t.id} className={`px-inner p-2 flex items-center gap-2 ${member?.joined ? '' : 'opacity-60'}`}>
              <Emo k={t.icon} size={30} />
              <div className="flex-1 min-w-0 text-xs"><div className="font-semibold text-sm">{t.name} <span className="text-slate-400 font-normal">{member?.name} · {t.type === 'active' ? `กดใช้ ${t.mana} มานา` : 'ติดตัว'}</span></div>
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
