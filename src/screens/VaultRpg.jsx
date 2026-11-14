import { useState } from 'react'
import { Flame, Swords, Check, Lock, Trophy, ScrollText, Sparkles, MapPin, Backpack, Users, Shield, Store, Map as MapIcon, BookOpen, Eye, Castle } from 'lucide-react'
import { ItemSprite, AssetLogo } from '../components/Logos'
import { itemOf, assetLabel } from '../lib/portfolio'
import BattleScene from '../components/BattleScene'
import { useBattleEvents, SpriteImg, XpBar, ChestCard, sceneProps, Portrait } from '../components/RpgBits'
import { Avatar, Icon, Money } from '../components/ui'
import { useProfile, useStore } from '../store'
import { useRpg, REALMS } from '../lib/rpg'
import { SHOP, GEAR_TIERS, memberById } from '../lib/party'
import { money, compact, todayISO, shortDate } from '../lib/format'
import TownTab, { Wallet, Price } from '../components/TownTab'

function Section({ icon: I, title, right, children }) {
  return (
    <section className="px-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <I size={16} className="text-teal-600" />
        <h2 className="px-font text-[11px] tracking-wide flex-1">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}
const Bar = ({ pct, color = '#14b8a6' }) => <div className="px-xp !h-2"><div style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%`, background: color }} /></div>

const REALM_INFO = [
  'หนองน้ำสีม่วง ต้นไม้ตาย หลุมศพ ป้าย “หนี้” และหมอกหนา — ที่ที่หนี้มากกว่าทรัพย์สิน',
  'บ้าน 2 หลัง บ่อน้ำ รั้วไม้ ต้นไม้ · พ่อค้าเดินเล่นในหมู่บ้าน',
  'ตลาดแผงลอย ถนนหินปู โคมไฟ บ้าน 4 หลัง · ชาวนามาเยือน',
  'ปราสาทพร้อมประตูเมือง หอคอยปักธง ถนนหินแกรนิต · อัศวินได้ออร่า',
  'พระราชวังโดมทองคำ ถนนทอง ประกายระยิบระยับ — จุดหมายสูงสุด',
]

/* pixel icons for gear, coloured by tier */
function GearIcon({ slot, color, size = 40 }) {
  const px = {
    weapon: ['....##', '...#c#', '..#c#.', '.#c#..', '##b#..', '.##...', '#..#..'],
    armor: ['#....#', '##cc##', '#cccc#', '#cbbc#', '.#cc#.', '.#cc#.', '..##..'],
    ring: ['..##..', '.#bb#.', '......', '#c..c#', '#c..c#', '.#cc#.', '..##..'],
  }[slot]
  const fill = { '#': '#1e293b', c: color, b: '#fde68a' }
  return (
    <svg width={size} height={size} viewBox="-1 -1 8 9" style={{ imageRendering: 'pixelated' }} shapeRendering="crispEdges">
      {px.flatMap((row, y) => [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[ch]} />)))}
    </svg>
  )
}

const TABS = [
  { id: 'town', label: 'เมือง', icon: Castle },
  { id: 'log', label: 'บันทึกการผจญภัย', icon: BookOpen },
  { id: 'party', label: 'ปาร์ตี้', icon: Users },
  { id: 'gear', label: 'อุปกรณ์', icon: Shield },
  { id: 'skills', label: 'สกิล', icon: Sparkles },
  { id: 'shop', label: 'ร้านค้า', icon: Store },
  { id: 'map', label: 'แผนที่โลก', icon: MapIcon },
  { id: 'quests', label: 'บอส & เควสต์', icon: Swords },
  { id: 'status', label: 'สถานะ', icon: Trophy },
]

export default function VaultRpg({ onAdd, go }) {
  const rpg = useRpg()
  const profile = useProfile()
  const privacy = useStore((s) => s.ui.privacy)
  const tab = useStore((s) => s.ui.rpgTab) || 'town'
  const setUi = useStore((s) => s.setUi)
  const { events, consume } = useBattleEvents(rpg)
  const [preview, setPreview] = useState(null)
  const setTab = (t) => setUi({ rpgTab: t })
  const joined = rpg.party.filter((p) => p.joined).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">Vault <span className="px-font text-sm text-teal-600 align-middle">RPG</span></h1>
        <div className="flex items-center gap-2">
          <Wallet rpg={rpg} />
          {rpg.streak > 0 && <div className="px-chip text-orange-600"><Flame size={14} /> {rpg.streak} วัน</div>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.25fr_1fr] gap-4 items-start">
        <div className="space-y-4 lg:sticky lg:top-4">
          <section className="px-card overflow-hidden">
            <BattleScene big {...sceneProps(rpg)} events={events} onConsumed={consume}
              previewTier={preview} previewName={preview != null ? REALMS[preview].name : ''}
              onChest={() => document.getElementById('daily-chest')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
            {preview != null && (
              <button onClick={() => setPreview(null)} className="w-full py-2 text-sm font-semibold bg-amber-100 text-amber-800 flex items-center justify-center gap-1.5"><Eye size={15} /> กำลังดูตัวอย่าง “{REALMS[preview].name}” · แตะเพื่อกลับดินแดนจริง</button>
            )}
            <div className="p-3.5 flex items-center gap-3">
              <div className="px-avatar"><Avatar size={52} ring={false} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{profile.name}</div>
                <div className="text-xs text-slate-500 truncate">{rpg.title} · ปาร์ตี้ {joined}/4 คน · <MapPin size={11} className="inline -mt-0.5" /> {rpg.realm.name}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="px-lv">{rpg.level}</div>
                  <div className="flex-1"><XpBar into={rpg.into} need={rpg.need} /><div className="px-font text-[9px] text-slate-500 mt-1">XP {rpg.into}/{rpg.need}</div></div>
                </div>
              </div>
            </div>
          </section>
          <div id="daily-chest"><ChestCard rpg={rpg} onAdd={onAdd} /></div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="px-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`px-tab ${tab === t.id ? 'on' : ''}`} data-testid={`rpg-tab-${t.id}`}>
                <t.icon size={14} /> {t.label}
                {t.id === 'shop' && SHOP.some((i) => !rpg.owned[i.id] && rpg.afford(rpg.shopPrice(i))) && <span className="dot" />}
                {t.id === 'town' && rpg.collectReady && <span className="dot" />}
                {t.id === 'quests' && rpg.quests.some((q) => q.claimable) && <span className="dot" />}
              </button>
            ))}
          </div>

          {tab === 'town' && <TownTab rpg={rpg} />}
          {tab === 'log' && <AdventureLog rpg={rpg} />}
          {tab === 'party' && <PartyTab rpg={rpg} />}
          {tab === 'gear' && <GearTab rpg={rpg} />}
          {tab === 'skills' && <SkillsTab rpg={rpg} />}
          {tab === 'shop' && <ShopTab rpg={rpg} />}
          {tab === 'map' && <MapTab rpg={rpg} privacy={privacy} onPreview={(t) => { setPreview(t === rpg.realm.tier ? null : t); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
          {tab === 'quests' && <QuestsTab rpg={rpg} onAdd={onAdd} />}
          {tab === 'status' && <StatusTab rpg={rpg} go={go} />}
        </div>
      </div>
    </div>
  )
}

/* ---------------- adventure log ---------------- */
const WHO_SPRITE = { knight: 'hero', healer: 'healer', mage: 'mage', ranger: 'ranger', boss: 'dragon' }
function dayTitle(d) {
  const t = todayISO()
  const y = new Date(); y.setDate(y.getDate() - 1)
  const ys = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
  return d === t ? 'วันนี้' : d === ys ? 'เมื่อวาน' : shortDate(d)
}
function AdventureLog({ rpg }) {
  const [n, setN] = useState(5)
  if (!rpg.log.length) return <Section icon={BookOpen} title="ADVENTURE LOG"><div className="text-sm text-slate-500">ยังไม่มีเรื่องราว — นำเข้าสลิปหรือบันทึกรายการแรก แล้วปาร์ตี้จะเริ่มออกผจญภัย</div></Section>
  return (
    <div className="space-y-3" data-testid="adventure-log">
      {rpg.log.slice(0, n).map((d) => (
        <section key={d.day} className="px-card p-3.5">
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="font-bold">{dayTitle(d.day)}</h3>
            <span className="text-xs text-slate-400 flex-1">{shortDate(d.day)}</span>
            {(d.out > 0 || d.inc > 0) && <span className="text-[11px] text-slate-500">{d.out > 0 && <>จ่าย <Money value={d.out} decimals={false} /></>}{d.inc > 0 && <> · รับ <Money value={d.inc} decimals={false} className="text-emerald-600" /></>}</span>}
          </div>
          <div className="space-y-2">
            {d.items.map((e, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <div className={`w-9 h-9 grid place-items-center shrink-0 border-2 border-slate-800 ${e.tone === 'bad' ? 'bg-rose-50' : e.tone === 'gold' ? 'bg-amber-50' : 'bg-teal-50'}`}>
                  {e.who === 'pet' ? <Portrait sprite={rpg.pet.sprite} size={28} /> : WHO_SPRITE[e.who] === 'dragon' ? <span className="text-lg">{e.icon}</span> : <Portrait sprite={WHO_SPRITE[e.who]} size={32} hue={e.who === 'knight' ? rpg.skin?.hue : 0} />}
                </div>
                <div className="flex-1 min-w-0 text-sm leading-snug pt-0.5">
                  <span className="mr-1">{e.icon}</span>{e.text}
                </div>
                {e.amount && <span className={`text-xs font-semibold num shrink-0 pt-1 ${e.tone === 'bad' ? 'text-rose-600' : e.tone === 'gold' ? 'text-amber-600' : 'text-emerald-700'}`}>{e.amount}</span>}
              </div>
            ))}
          </div>
        </section>
      ))}
      {rpg.log.length > n && <button onClick={() => setN(n + 7)} className="w-full py-2.5 text-sm font-semibold px-card">ย้อนดูวันก่อนหน้า</button>}
      <div className="text-[11px] text-slate-400 px-1">ทุกบรรทัดมาจากรายการเงินจริงของคุณ: ชำระหนี้ = ฟันบอส · รูดบัตร = บอสฟื้นพลัง · กันเงินจ่ายหนี้ = โล่ · ส่งเงินลงทุน = เวทไฟ · บันทึกรายการ = ลาดตระเวน</div>
    </div>
  )
}

/* ---------------- party ---------------- */
function PartyTab({ rpg }) {
  return (
    <div className="space-y-3">
      {rpg.party.map((m) => {
        const skills = rpg.skills.filter((k) => k.member === m.id)
        return (
          <section key={m.id} className={`px-card p-3.5 ${m.joined ? '' : 'bg-slate-50'}`}>
            <div className="flex gap-3">
              <div className="w-20 h-20 grid place-items-center shrink-0 border-2 border-slate-800" style={{ background: m.joined ? `${m.color}18` : '#f1f5f9' }}>
                <Portrait sprite={m.sprite} size={72} dim={!m.joined} hue={m.id === 'knight' ? rpg.skin?.hue : 0} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{m.name}</span>
                  <span className="text-xs text-slate-500 truncate">{m.role}</span>
                  {m.joined && <span className="ml-auto px-font text-[9px] px-1.5 py-0.5 bg-slate-900 text-white">LV.{m.lv}</span>}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">ดูแลเรื่อง: <b>{m.area}</b></div>
                {m.joined ? (
                  <div className="mt-2">
                    <Bar pct={m.pct} color={m.color} />
                    <div className="text-[11px] text-slate-500 mt-1">เลเวลถัดไป: {m.nextText}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1.5 flex items-start gap-1.5"><Lock size={13} className="shrink-0 mt-0.5" /> จะเข้าร่วมเมื่อ: {m.join}</div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {skills.map((k) => (
                <span key={k.id} className={`text-[11px] px-2 py-1 border ${k.unlocked ? 'border-slate-800 bg-white' : 'border-slate-200 text-slate-400'}`}>{k.icon} {k.name}{!k.unlocked && ` · ${k.lockText}`}</span>
              ))}
            </div>
          </section>
        )
      })}
      <div className="text-[11px] text-slate-400 px-1">สมาชิกที่เข้าร่วมแล้วจะยืนอยู่ในฉากและช่วยกันสู้ แตะตัวละครในฉากเพื่อให้พูดได้</div>
    </div>
  )
}

/* ---------------- gear ---------------- */
function GearTab({ rpg }) {
  return (
    <div className="space-y-3">
      {rpg.gear.map((g) => (
        <section key={g.slot} className="px-card p-3.5">
          <div className="flex gap-3 items-center">
            <div className="w-16 h-16 grid place-items-center border-2 border-slate-800 shrink-0" style={{ background: `${g.color}22` }}><GearIcon slot={g.slot} color={g.color} size={44} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">{g.label} · ขั้น <b style={{ color: g.color }}>{g.tierName}</b></div>
              <div className="font-bold leading-tight">{g.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{g.how}: <b className="text-slate-800">{g.valueText}</b></div>
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            {GEAR_TIERS.map((t, i) => <div key={i} className="flex-1 h-2" style={{ background: i <= g.tier ? t.color : '#e2e8f0' }} title={t.name} />)}
          </div>
          {g.nextName ? (
            <div className="mt-2">
              <Bar pct={g.pct} color={GEAR_TIERS[g.tier + 1].color} />
              <div className="text-[11px] text-slate-600 mt-1">ขั้นถัดไป “{g.nextName}”: {g.toNext}</div>
            </div>
          ) : <div className="text-[11px] text-amber-700 mt-2">ขั้นสูงสุดแล้ว! 👑</div>}
        </section>
      ))}
      <div className="text-[11px] text-slate-400 px-1">ในฉาก: สีคมดาบตอนฟัน = ขั้นอาวุธ · วงแสงใต้เท้าอัศวิน = ขั้นเกราะ · ประกายรอบตัว = ขั้นแหวน (ตั้งแต่ขั้นเงิน)</div>
    </div>
  )
}

/* ---------------- skills ---------------- */
function SkillsTab({ rpg }) {
  const groups = [...rpg.party.map((m) => ({ key: m.id, title: `${m.name} · ${m.role.split(' ')[0]}`, m })), { key: 'all', title: 'สกิลติดตัวทั้งปาร์ตี้' }]
  return (
    <div className="space-y-3">
      {groups.map((gp) => (
        <Section key={gp.key} icon={Sparkles} title={gp.title.toUpperCase()}>
          <div className="space-y-2">
            {rpg.skills.filter((k) => k.member === gp.key).map((k) => (
              <div key={k.id} className={`px-inner p-2.5 flex gap-3 ${k.unlocked ? '' : 'opacity-60'}`}>
                <div className={`w-10 h-10 grid place-items-center text-xl shrink-0 ${k.unlocked ? 'bg-amber-50' : 'bg-slate-100 grayscale'}`}>{k.unlocked ? k.icon : <Lock size={16} className="text-slate-400" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-semibold text-sm">{k.name}</span>{!k.unlocked && <span className="text-[10px] text-amber-700">ปลดล็อก: {k.lockText}</span>}</div>
                  <div className="text-xs text-slate-600 mt-0.5">เมื่อคุณ <b>{k.how}</b> → {k.does}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  )
}

/* ---------------- shop ---------------- */
function ShopTab({ rpg }) {
  const showToast = useStore((s) => s.showToast)
  const types = [['pet', 'สัตว์เลี้ยง'], ['skin', 'ชุดอัศวิน'], ['deco', 'ตกแต่งหมู่บ้าน']]
  return (
    <div className="space-y-3">
      <section className="px-card p-3.5 flex items-center gap-3">
        <Portrait sprite="npc_merchant" size={48} />
        <div className="flex-1 text-sm"><b>พ่อค้าประจำหมู่บ้าน:</b> “ของที่นี่ขายเป็น FIAT นะ ราคาขึ้นทุกเดือนตามเงินเฟ้อ ซื้อตอนนี้คุ้มกว่า!”{rpg.town.shopDiscount ? ` · ตลาดนัดลดให้ ${rpg.town.shopDiscount}%` : ''}</div>
        <div className="flex flex-col gap-1 shrink-0"><Wallet rpg={rpg} /></div>
      </section>
      {types.map(([type, label]) => (
        <Section key={type} icon={Store} title={label.toUpperCase()}>
          <div className="grid grid-cols-2 gap-2">
            {type === 'pet' && (
              <ShopCard name="จิ้งจอกมิ้นต์" desc="สัตว์เลี้ยงตัวแรก" art={<Portrait sprite="pet_fox" size={44} />} owned equipped={rpg.pet.id === 'pet_fox'} onEquip={() => rpg.setEquip({ pet: null })} />
            )}
            {type === 'skin' && (
              <ShopCard name="ชุดอัศวินดั้งเดิม" desc="สีเริ่มต้น" art={<Portrait sprite="hero" size={48} />} owned equipped={!rpg.skin} onEquip={() => rpg.setEquip({ skin: null })} />
            )}
            {SHOP.filter((i) => i.type === type).map((i) => {
              const owned = !!rpg.owned[i.id]
              const equipped = type === 'deco' ? !!rpg.decos[i.id] : type === 'pet' ? rpg.pet.id === i.id : rpg.skin?.id === i.id
              const art = i.type === 'pet' ? <Portrait sprite={i.sprite} size={44} /> : i.type === 'skin' ? <Portrait sprite="hero" size={48} hue={i.hue} /> : <span className="text-3xl">{i.id === 'deco_flowers' ? '🌷' : i.id === 'deco_lanterns' ? '🏮' : '🚩'}</span>
              return (
                <ShopCard key={i.id} name={i.name} desc={i.desc} art={art} price={<Price p={rpg.shopPrice(i)} rpg={rpg} />} owned={owned} equipped={equipped} canBuy={rpg.afford(rpg.shopPrice(i))}
                  onBuy={() => { if (rpg.buy(i)) showToast(`ซื้อ “${i.name}” แล้ว!`) }}
                  onEquip={() => (type === 'deco' ? rpg.toggleDeco(i.id) : rpg.setEquip({ [type]: equipped ? null : i.id }))} deco={type === 'deco'} />
              )
            })}
          </div>
        </Section>
      ))}
    </div>
  )
}
function ShopCard({ name, desc, art, price, owned, equipped, canBuy, onBuy, onEquip, deco }) {
  return (
    <div className={`px-inner p-2.5 flex flex-col items-center text-center ${equipped ? 'ring-2 ring-teal-500' : ''}`}>
      <div className="h-14 grid place-items-center">{art}</div>
      <div className="text-xs font-semibold mt-1 leading-tight">{name}</div>
      <div className="text-[10px] text-slate-500 leading-tight mt-0.5 min-h-[2em]">{desc}</div>
      {owned ? (
        <button onClick={onEquip} className={`mt-2 w-full py-1.5 text-xs font-semibold border-2 border-slate-800 ${equipped ? 'bg-teal-500 text-white' : 'bg-white'}`}>{equipped ? (deco ? 'เปิดอยู่ ✓' : 'ใช้อยู่ ✓') : deco ? 'ปิดอยู่' : 'ใช้'}</button>
      ) : (
        <button onClick={onBuy} disabled={!canBuy} className="mt-2 w-full py-1.5 text-xs font-semibold border-2 border-slate-800 bg-violet-500 text-white disabled:bg-slate-200 disabled:border-slate-300 flex items-center justify-center gap-1 [&_span]:!text-white disabled:[&_span]:!text-slate-500">{price}</button>
      )}
    </div>
  )
}

/* ---------------- world map ---------------- */
function MapTab({ rpg, onPreview, privacy }) {
  const net = rpg.vault.summary.net
  return (
    <div className="space-y-0">
      {[...REALMS].reverse().map((r, i, arr) => {
        const here = r.tier === rpg.realm.tier
        const reached = r.tier <= rpg.realm.tier
        const prev = REALMS[r.tier - 1]
        const pct = here || reached ? 1 : prev && Number.isFinite(prev.min) ? Math.max(0, (net - Math.max(prev.min, 0)) / (r.min - Math.max(prev.min, 0))) : 0
        return (
          <div key={r.tier}>
            <section className={`px-card p-3.5 ${here ? 'ring-2 ring-teal-500' : ''} ${reached ? '' : 'bg-slate-50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 grid place-items-center shrink-0 border-2 border-slate-800 font-bold ${here ? 'bg-teal-500 text-white' : reached ? 'bg-teal-100' : 'bg-slate-200 text-slate-500'}`}>{reached ? (here ? <MapPin size={18} /> : <Check size={18} />) : <Lock size={16} />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-bold">{r.name}</span><span className="px-font text-[8px] text-slate-400">{r.en.toUpperCase()}</span></div>
                  <div className="text-xs text-slate-500">{Number.isFinite(r.min) ? `มูลค่าสุทธิ ${money(r.min, { decimals: false })} ขึ้นไป` : 'มูลค่าสุทธิติดลบ'}{here && ' · คุณอยู่ที่นี่'}</div>
                  <div className="text-xs text-slate-600 mt-1">{REALM_INFO[r.tier]}</div>
                  {!reached && (
                    <div className="mt-2"><Bar pct={pct} /><div className="text-[11px] text-slate-500 mt-1">อีก {privacy ? '฿•••' : money(r.min - net, { decimals: false })} จะเดินทางถึง</div></div>
                  )}
                </div>
              </div>
              {!here && <button onClick={() => onPreview(r.tier)} className="mt-2.5 w-full py-1.5 text-xs font-semibold border-2 border-slate-800 bg-white flex items-center justify-center gap-1.5"><Eye size={13} /> ดูตัวอย่างดินแดนนี้</button>}
            </section>
            {i < arr.length - 1 && <div className="h-4 w-1 bg-slate-300 ml-8" />}
          </div>
        )
      })}
    </div>
  )
}

/* ---------------- bosses + quests ---------------- */
function QuestsTab({ rpg, onAdd }) {
  const groups = ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'เควสต์หลัก']
  return (
    <div className="space-y-4">
      <Section icon={Swords} title="BOSS · หนี้ที่ต้องปราบ">
        {rpg.bosses.length === 0 ? (
          <div className="text-sm text-slate-500 py-2">ยังไม่มีบอส ถ้ามีหนี้บัตรหรือเงินกู้ ให้ใส่ยอดในหน้า “เงิน” แล้วบอสจะปรากฏ</div>
        ) : (
          <div className="space-y-3">
            {rpg.bosses.map((b) => (
              <div key={b.id} className={`px-inner p-3 flex items-center gap-3 ${b.defeated ? 'opacity-70' : ''}`}>
                <div className="w-16 h-16 grid place-items-center bg-sky-50 shrink-0 relative overflow-hidden">
                  <SpriteImg name={b.sprite} size={54} className={b.defeated ? 'grayscale' : ''} />
                  {b.defeated && <span className="px-stamp">DEFEATED</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-semibold text-sm truncate">{b.name}</span><span className="px-font text-[8px] text-rose-600">LV.{b.level}</span></div>
                  <div className="text-xs text-slate-500 truncate">{b.accName}</div>
                  <div className="px-hp mt-1.5"><div style={{ width: `${(b.hp / b.maxHp) * 100}%` }} /></div>
                  <div className="flex justify-between text-[11px] text-slate-500 mt-1"><span>HP <Money value={b.hp} decimals={false} /></span><span>ดาเมจรวม <Money value={b.damage} decimals={false} /></span></div>
                </div>
                {b.active && <button onClick={() => onAdd({ kind: 'payment', to: b.id })} className="px-btn shrink-0" title="บันทึกชำระหนี้"><Swords size={15} /><span className="hidden sm:inline">โจมตี</span></button>}
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section icon={ScrollText} title="QUESTS · เควสต์">
        <div className="space-y-4">
          {groups.map((gname) => (
            <div key={gname}>
              <div className="text-xs font-semibold text-slate-500 mb-2">{gname}</div>
              <div className="space-y-2">
                {rpg.quests.filter((q) => q.tier === gname).map((q) => (
                  <div key={q.name} className={`px-inner p-2.5 flex items-center gap-3 ${q.done ? 'bg-emerald-50' : ''}`}>
                    <div className={`w-6 h-6 grid place-items-center shrink-0 ${q.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{q.done ? <Check size={14} strokeWidth={3} /> : <span className="w-1.5 h-1.5 bg-current" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm ${q.done ? 'text-emerald-700' : ''}`}>{q.name}</div>
                      {q.hint && <div className="text-[10px] text-slate-400">{q.hint}</div>}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="px-xp flex-1 !h-1.5"><div style={{ width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }} /></div>
                        <span className="text-[10px] text-slate-500 num shrink-0">{q.money ? `${compact(q.progress)}/${compact(q.goal)}` : `${q.progress}${q.unit || ''}/${q.goal}${q.unit || ''}`}</span>
                      </div>
                    </div>
                    {q.claimable ? (
                      <button onClick={() => rpg.claim(q)} className="px-btn shrink-0 !py-1 !px-2 text-[11px] anim-pop" data-testid="claim-btn">รับ {q.gold ? `🪙${q.gold}` : `💵${q.fiat}`}</button>
                    ) : (
                      <span className={`text-[11px] font-semibold shrink-0 num ${q.claimedAt ? 'text-slate-400 line-through' : q.gold ? 'text-amber-600' : 'text-emerald-700'}`}>{q.gold ? `🪙${q.gold}` : `💵${q.fiat}`}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ---------------- status: stats, inventory, achievements, xp ---------------- */
function StatusTab({ rpg, go }) {
  const unlocked = rpg.achievements.filter((a) => a.unlockedAt || a.ready).length
  return (
    <div className="space-y-4">
      <Section icon={Sparkles} title="STATUS · ค่าสถานะ">
        <div className="space-y-3">
          {rpg.stats.map((st) => (
            <div key={st.key}>
              <div className="flex items-baseline gap-2 text-sm"><span className="px-font text-[10px] w-9 text-teal-700">{st.key}</span><span className="flex-1">{st.name}</span><span className="px-font text-[11px]">{st.value}</span></div>
              <div className="px-seg mt-1">{Array.from({ length: 20 }, (_, i) => <span key={i} className={i < Math.round(st.value / 5) ? 'on' : ''} />)}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{st.hint}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section icon={Backpack} title="INVENTORY · คลังสมบัติ" right={<span className="px-font text-[9px] text-slate-500">{rpg.inventory.length} ITEMS</span>}>
        <div className="grid grid-cols-4 gap-2">
          <div className="px-inner p-1.5 text-center" title="เงินสดรอลงทุน">
            <div className="h-11 grid place-items-center"><ItemSprite name="cash" size={36} /></div>
            <div className="text-[10px] font-semibold truncate">เงินสด</div>
            <div className="text-[9px] text-slate-500 num truncate"><Money value={rpg.vault.summary.byType.invest || 0} decimals={false} /></div>
          </div>
          {rpg.inventory.map((h) => (
            <button key={h.asset.id} onClick={() => go?.('portfolio')} className={`px-inner p-1.5 text-center relative ${h.pnl > 0 ? 'px-glow' : ''}`} title={h.asset.name}>
              <div className="h-11 grid place-items-center relative">
                <ItemSprite name={itemOf(h.asset)} size={36} />
                {h.asset.type !== 'gold' && h.asset.type !== 'commodity' && <span className="absolute -bottom-0.5 -right-0.5"><AssetLogo asset={h.asset} size={18} /></span>}
              </div>
              <div className="text-[10px] font-semibold truncate">{assetLabel(h.asset)}</div>
              <div className={`px-font text-[8px] ${h.pnlPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{h.pnlPct >= 0 ? '+' : ''}{(h.pnlPct * 100).toFixed(1)}%</div>
            </button>
          ))}
        </div>
      </Section>
      <Section icon={Trophy} title="ACHIEVEMENTS" right={<span className="px-font text-[9px] text-slate-500">{unlocked}/{rpg.achievements.length}</span>}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {rpg.achievements.map((a) => {
            const on = a.unlockedAt || a.ready
            return (
              <div key={a.id} className={`px-inner p-2 text-center ${on ? '' : 'opacity-50'}`} title={a.desc}>
                <div className={`mx-auto w-9 h-9 grid place-items-center ${on ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{on ? <Icon name={a.icon} size={18} /> : <Lock size={15} />}</div>
                <div className="text-[11px] font-semibold mt-1.5 leading-tight">{a.name}</div>
                <div className="text-[9px] text-slate-500 leading-tight mt-0.5">{a.desc}</div>
              </div>
            )
          })}
        </div>
      </Section>
      <Section icon={Sparkles} title="XP · ที่มาของค่าประสบการณ์">
        {rpg.xpParts.length ? (
          <div className="space-y-1.5 text-sm">{rpg.xpParts.map(([label, v]) => <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="px-font text-[10px] text-amber-600">+{v}</span></div>)}</div>
        ) : <div className="text-sm text-slate-500">เริ่มบันทึกรายการเพื่อรับ XP แรก</div>}
      </Section>
    </div>
  )
}
