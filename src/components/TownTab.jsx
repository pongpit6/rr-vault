import { Emo, EmoText, PxIcon } from './px'
import { useState, useEffect , useRef} from 'react'
import TownFull from './TownFull'
import { useActiveTheme } from '../lib/theme'
import { Hammer, Users, Smile, Coins, ArrowUpCircle, Trash2, Sparkles, Repeat, TrendingUp } from './px'
import TownScene from './TownScene'
import { Portrait } from './RpgBits'
import { Sheet } from './ui'
import { useStore } from '../store'
import { weatherTH } from '../lib/world'
import { loadCycle, shareWithTown } from '../lib/btcCycle'
import { visitorFor, decorOnSale, nextDoubleDay, EVENT_DECOR } from '../lib/festivals'
import { EVENTS } from '../lib/world'
import { traceList } from './TownTraces'
import { townLines, storyOf, APPRENTICE } from '../lib/townTalk'
import { townChats, speakers } from '../lib/townChat'
import { happyBonusChance } from '../lib/farm'
import { MessageCircle, BookOpen } from './px'
import { LEVEL_REQ, BUILDINGS, HALL, NPCS, DECOR, priceOf, EXCHANGE_WEEKLY, RESIDENTS, xauPrice } from '../lib/town'

const Art = ({ name, size = 30, fallback }) => { const [ok, setOk] = useState(true); return ok ? <img src={`./sprites/${name}.png`} alt="" width={size} height={size} onError={() => setOk(false)} style={{ imageRendering: 'pixelated' }} className="mx-auto" /> : <span className="text-2xl">{fallback}</span> }
/** the living-world props every town scene gets */
export const sceneWorld = (rpg) => ({ sale: rpg.world.sale?.label || null, cycle: useStore.getState().ui.btcCycle?.zone || null, weather: rpg.world.weather, event: rpg.world.event?.id || null, mood: rpg.world.mood.id, btc: rpg.world.btc, aurora: rpg.world.aurora, tree: rpg.world.tree, rank: rpg.rank.id, holiday: rpg.world.holiday })

const DECOR_ART = { tree: 'dc_tree', bench: 'dc_bench', lamp: 'dc_lamp', flowers: 'dc_flowers', banner: 'dc_banner', well: 'dc_well', fountain: 'dc_fountain', statue: 'dc_statue' }
const TRACE_PX = { read: 'hb_read', exercise: 'hb_exercise', meditate: 'hb_meditate', vocab: 'hb_vocab', nocarb: 'hb_nocarb', nospend: 'hb_nospend', sleep: 'hb_sleep', saved: 'PiggyBank', paid: 'sk_slash', logged: 'ScrollText', rest: 'hb_rest' }
/** "ร่องรอยวันนี้": one quiet row of what you did today */
export function TodayTraces({ rpg, className = '', compact = false }) {
  const list = traceList(rpg.traces)
  const form = { tired: '😪 นอนน้อย ฮีโร่ง่วงหน่อย', sharp: '✨ ฮีโร่สดชื่นเต็มที่', rest: '☕ วันพัก ฮีโร่จิบชาสบาย ๆ' }[rpg.traces?.form]
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] ${className}`} data-testid="today-traces">
      <span className="shrink-0 text-slate-500">วันนี้</span>
      {list.length ? list.map((t) => compact ? <span key={t.id} title={t.text} className="shrink-0 text-base leading-none"><Emo k={TRACE_PX[t.id]} e={t.emoji} size={18} /></span> : <span key={t.id} className="shrink-0 px-inner px-1.5 py-0.5"><Emo k={TRACE_PX[t.id]} e={t.emoji} size={14} /> {t.text}</span>) : <span className="text-slate-400 shrink-0">ยังไม่มีร่องรอย ทำอะไรสักอย่างแล้วเมืองจะเปลี่ยน</span>}
      {form && <span className="shrink-0 text-slate-500 ml-1">{form}</span>}
      {rpg.condition && rpg.condition.id !== 'rest' && <span className="shrink-0 text-slate-500 ml-1">· 7 วัน <Emo k={rpg.condition.id === 'rest' ? 'hb_rest' : `cd_${rpg.condition.id}`} e={rpg.condition.emoji} size={16} /> {rpg.condition.name}</span>}
    </div>
  )
}

/** villagers who live in town but aren't hired (the apprentice arrives with the reading story) */
export const sceneExtra = (rpg) => [...(storyOf(rpg.habits).arrived ? [APPRENTICE.sprite] : []), ...(visitorFor(rpg.world) ? [visitorFor(rpg.world).sprite] : [])]

/** town chat: villagers, the party and you talk back and forth, line by line, built from your real day; tap to move on */
export function TownTalk({ rpg, className = '' }) {
  const setUi = useStore((s) => s.setUi)
  const R = useRef(rpg); R.current = rpg
  const [st, setSt] = useState({ order: null, c: 0, l: 0 })
  const chats = townChats(rpg)
  const S = speakers(rpg)
  // a shuffled order, conversations from your real day first
  const order = st.order && st.order.length === chats.length ? st.order : chats.map((x, i) => [i, x.w + Math.random() * 1.5]).sort((a, b) => b[1] - a[1]).map(([i]) => i)
  const cur = chats[order[st.c % Math.max(1, order.length)]]
  const step = () => setSt((s0) => {
    const o = s0.order && s0.order.length === chats.length ? s0.order : order
    const c = chats[o[s0.c % o.length]]
    return c && s0.l + 1 < c.lines.length ? { order: o, c: s0.c, l: s0.l + 1 } : { order: o, c: s0.c + 1, l: 0 }
  })
  useEffect(() => { const done = cur && st.l + 1 >= cur.lines.length; const id = setTimeout(step, done ? 6000 : 2800); return () => clearTimeout(id) }, [st.c, st.l, chats.length]) // eslint-disable-line
  const line = cur?.lines[Math.min(st.l, cur.lines.length - 1)]
  useEffect(() => { if (line) setUi({ townTalk: { who: line[0], text: line[1], at: Date.now() } }) }, [line?.[1]]) // eslint-disable-line
  useEffect(() => () => setUi({ townTalk: null }), []) // eslint-disable-line
  if (!cur) return null
  const shown = cur.lines.slice(0, st.l + 1)
  return (
    <button onClick={step} className={`w-full text-left space-y-1 ${className}`} data-testid="town-talk">
      {shown.slice(-3).map(([who, text], i, arr) => {
        const sp = S[who] || S.hero, hero = who === 'hero', last = i === arr.length - 1
        return (
          <div key={`${st.c}:${shown.length - arr.length + i}`} className={`flex items-end gap-2 ${hero ? 'flex-row-reverse' : ''} ${last ? 'anim-pop' : 'opacity-60'}`}>
            <Portrait sprite={sp.sprite} size={28} />
            <div className={`max-w-[80%] px-2 py-1 text-[12px] leading-snug border-2 border-slate-800 ${hero ? 'bg-emerald-50' : 'bg-white'}`}><b className="text-[10px] text-teal-700 block">{sp.name}</b><EmoText text={text} size={13} /></div>
          </div>
        )
      })}
      <div className="flex justify-end text-[10px] text-slate-400 items-center gap-1"><MessageCircle size={11} /> แตะเพื่อคุยต่อ</div>
    </button>
  )
}

/** the apprentice's story, one chapter per reading milestone */
function TownStory({ rpg }) {
  const st = storyOf(rpg.habits)
  const seen = rpg.econData.storySeen || 0
  const last = st.chapters.at(-1)?.id || 0
  const [open, setOpen] = useState(false)
  useEffect(() => { if (open && last > seen) rpg.markStorySeen(last) }, [open, last]) // eslint-disable-line
  return (
    <Section icon={BookOpen} title="STORY · เรื่องเล่าในเมือง" right={last > seen ? <span className="px-font text-[8px] bg-rose-500 text-white px-1.5 py-0.5">NEW</span> : null}>
      <div className="flex items-center gap-3">
        <Portrait sprite={APPRENTICE.sprite} size={48} dim={!st.arrived} />
        <div className="flex-1 min-w-0 text-sm">
          <b>{st.arrived ? APPRENTICE.name : 'ยังไม่มีใครมาเยือน…'}</b>
          <div className="text-[11px] text-slate-500">{st.arrived ? `${st.chapters.length}/6 บท` : ''}{st.next ? `${st.arrived ? ' · ' : ''}บทถัดไปเปิดเมื่อ: ${st.next.need}` : ' · ครบทุกบทแล้ว'}</div>
        </div>
        {st.arrived && <button className={`${btn} bg-white`} onClick={() => setOpen(!open)} data-testid="story-toggle">{open ? 'ปิด' : 'อ่าน'}</button>}
      </div>
      {open && (
        <div className="mt-3 space-y-2.5" data-testid="story-chapters">
          {st.chapters.map((c) => (
            <div key={c.id} className="px-inner p-3">
              <div className="px-font text-[9px] text-amber-600">บทที่ {c.id}</div>
              <div className="font-semibold text-sm">{c.title}</div>
              <div className="text-[13px] text-slate-600 mt-1 leading-relaxed">{c.text}</div>
            </div>
          ))}
          {st.next && <div className="px-inner p-3 text-xs text-slate-500"><PxIcon name="Lock" size={12} /> บทที่ {st.next.id} “{st.next.title}” · {st.next.need}</div>}
        </div>
      )}
    </Section>
  )
}

/* ---------- money chips ---------- */
export function FiatChip({ v, className = '' }) { return <span className={`px-chip text-emerald-700 ${className}`} title="FIAT — หาง่าย แต่เฟ้อ"><PxIcon name="em_fiat" size={15} /> <b className="num">{Math.round(v).toLocaleString()}</b></span> }
export function GoldChip({ v, className = '' }) { return <span className={`px-chip text-amber-600 ${className}`} title="GOLD — หายาก ไม่เฟ้อ"><PxIcon name="em_gold" size={15} /> <b className="num">{Math.round(v).toLocaleString()}</b></span> }
export function Wallet({ rpg }) { return <><FiatChip v={rpg.fiat} /><GoldChip v={rpg.gold} /></> }

/** "💵 120 · 🪙 2", red when you can't afford that part. */
export function Price({ p, rpg }) {
  if (!p) return null
  return (
    <span className="inline-flex items-center gap-1.5 num text-xs font-semibold">
      {p.fiat > 0 && <span className={rpg.fiat >= p.fiat ? 'text-emerald-700' : 'text-rose'}><PxIcon name="em_fiat" size={13} className="mr-0.5" />{p.fiat.toLocaleString()}</span>}
      {p.gold > 0 && <span className={rpg.gold >= p.gold ? 'text-amber-600' : 'text-rose'}><PxIcon name="em_gold" size={13} className="mr-0.5" />{p.gold}</span>}
      {!p.fiat && !p.gold && <span className="text-slate-500">ฟรี</span>}
    </span>
  )
}

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
const btn = 'px-3 py-1.5 text-xs font-semibold border-2 border-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300'

const DECOR_GROUPS = [
  { key: 'basic', tab: 'ทั่วไป', note: 'ซื้อได้ตลอด', list: DECOR.filter((d) => !d.craft && !d.event) },
  { key: 'craft', tab: 'จากวัสดุมอนสเตอร์', note: 'สร้างที่แท็บชาวเมือง (ล่า → ชาวเมือง) ไม่มีขายในร้าน', list: DECOR.filter((d) => d.craft) },
  { key: 'event', tab: 'เทศกาล', note: 'วางขายเฉพาะช่วงเทศกาลนั้น ซื้อแล้วเก็บไว้ตลอดไป', list: DECOR.filter((d) => d.event) },
]

export default function TownTab({ rpg }) {
  useEffect(() => { loadCycle().then(shareWithTown).catch(() => {}) }, [])
  const T = rpg.town
  const [decTab, setDecTab] = useState('basic')
  const showToast = useStore((s) => s.showToast)
  const theme = useActiveTheme()
  const [sel, setSel] = useState(null) // plot index | 'hall' | null
  const [full, setFull] = useState(false)
  const [res, setRes] = useState(null)
  const party = rpg.party.filter((p) => p.joined && p.id !== 'knight').map((p) => p.id)
  const ok = (done, msg) => { if (done) showToast(msg); else showToast('FIAT/GOLD ไม่พอ หรือทำไม่ได้ตอนนี้') }

  return (
    <div className="space-y-4">
      <section className="px-card overflow-hidden">
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="font-bold">เมืองของฉัน <span className="px-font text-[9px] text-teal-600">HALL LV.{T.town.hall}</span></div>
            <div className="text-[11px] text-slate-500">แตะแปลงที่ดินในฉาก (หรือรายการด้านล่าง) เพื่อสร้าง/อัปเกรด · เลื่อนซ้ายขวาดูทั้งเมือง</div>
          </div>
          <Wallet rpg={rpg} />
        </div>
        <div className="relative">
          <TownScene town={T} party={party} pet={rpg.pet.sprite} hue={rpg.skin?.hue || 0} dark={theme === 'pixel-night'} selected={typeof sel === 'number' ? sel : null} onSelect={setSel} world={sceneWorld(rpg)} traces={rpg.traces} extra={sceneExtra(rpg)} growth={rpg.growth} />
          <button onClick={() => setFull(true)} className="absolute right-2 top-2 px-2 py-1 text-xs font-bold bg-slate-900/80 text-white" data-testid="town-full-open">⛶ ดูเต็มจอ</button>
        </div>
        {full && <TownFull onClose={() => setFull(false)} town={T} party={party} pet={rpg.pet.sprite} hue={rpg.skin?.hue || 0} dark={theme === 'pixel-night'} selected={typeof sel === 'number' ? sel : null} onSelect={(x) => { setFull(false); setSel(x) }} world={sceneWorld(rpg)} traces={rpg.traces} extra={sceneExtra(rpg)} growth={rpg.growth} />}
        <TodayTraces rpg={rpg} className="px-3 py-2 border-t-2 border-slate-800" />
        <TownTalk rpg={rpg} className="px-3 py-2 border-t-2 border-slate-800/10" />
        <div className="grid grid-cols-4 text-center text-[11px] border-t-2 border-slate-800">
          <WorldStrip world={rpg.world} rank={rpg.rank} bdayReady={rpg.bdayReady} />
          <Stat icon={<Users size={13} />} label="ประชากร" v={T.pop} />
          <Stat icon={<Smile size={13} />} label="ความสุข" v={`${T.happiness}%`} />
          <Stat icon={<Coins size={13} />} label="FIAT/วัน" v={`+${T.dailyFiat}`} />
          <Stat icon={<Sparkles size={13} />} label="ร่องรอยวันนี้" v={rpg.traces?.count || 0} />
        </div>
      </section>

      {/* daily collection */}
      <section className="px-card p-3.5 flex items-center gap-3" data-testid="town-collect">
        <PxIcon name="em_basket" size={36} />
        <div className="flex-1 min-w-0 text-sm">
          {res ? <div className="anim-pop font-semibold text-emerald-700">เก็บได้ +{res.fiat} FIAT ({res.days} วัน){res.interest ? ` · ดอกเบี้ย ${res.interest}` : ''}</div>
            : rpg.collectReady ? <div><b>รายได้เมืองสะสม {rpg.collectDays} วัน</b> <span className="num text-emerald-700">+{rpg.collectAmount}</span><div className="text-xs text-slate-500">ฟาร์ม ตลาด NPC{T.bankRate ? ' + ดอกเบี้ยธนาคาร' : ''} · เก็บไว้ได้สูงสุด 7 วัน ไม่หายไปไหน</div></div>
            : <div className="text-slate-500">{T.dailyFiat || T.bankRate ? 'เก็บครบแล้ว รายได้จะสะสมทุกวันที่คุณทำอะไรสักอย่าง' : 'สร้างฟาร์ม ตลาด หรือจ้าง NPC เพื่อมีรายได้รายวัน'}</div>}
        </div>
        <button className={`${btn} bg-emerald-500 text-white`} disabled={!rpg.collectReady} onClick={() => setRes(rpg.collect())}>เก็บ</button>
      </section>

      <TownStory rpg={rpg} />

      <Section icon={Hammer} title={`LAND · ที่ดิน ${T.built.length}/${T.plotCount}`}>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          <button onClick={() => setSel('hall')} className="px-inner p-2 text-center hover:bg-teal-50" data-testid="plot-hall">
            <Art name={`bld_hall_${T.town.hall}`} size={34} fallback={HALL.emoji} /><div className="text-[11px] font-semibold">{HALL.name}</div><div className="px-font text-[8px] text-amber-600">{'★'.repeat(T.town.hall)}</div>
          </button>
          {T.plots.map((b, i) => (
            <button key={i} onClick={() => setSel(i)} className={`px-inner p-2 text-center hover:bg-teal-50 ${sel === i ? 'ring-2 ring-amber-400' : ''}`} data-testid={`plot-${i}`}>
              {b ? <Art name={`bld_${b.type}_${b.lv}`} size={34} fallback={BUILDINGS[b.type].emoji} /> : <Art name="pr_plot" size={34} fallback="➕" />}
              <div className="text-[11px] font-semibold truncate">{b ? BUILDINGS[b.type].name : `แปลง ${i + 1}`}</div>
              <div className="px-font text-[8px] text-amber-600 h-3">{b ? '★'.repeat(b.lv) : <span className="text-slate-400">ว่าง</span>}</div>
            </button>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 mt-2">ที่ดินเพิ่มเมื่อขยายศาลากลาง และเมื่อเดินทางถึงดินแดนใหม่ (มูลค่าสุทธิเพิ่ม)</div>
      </Section>

      <Section icon={Users} title={`NPC · ชาวเมือง (${T.npcs.length}/${T.npcSlots})`}>
        {!T.npcSlots && <div className="text-xs text-slate-500 mb-2">สร้าง <PxIcon name="Beer" size={13} /> โรงเตี๊ยมก่อน เพื่อมีที่พักให้ NPC ที่จ้างมา</div>}
        <div className="grid grid-cols-2 gap-2">
          {RESIDENTS.map((n) => (
            <div key={n.id} className="px-inner p-2.5 flex items-center gap-2">
              <Portrait sprite={n.sprite} size={40} />
              <div className="min-w-0"><div className="text-xs font-semibold">{n.name}</div><div className="text-[10px] text-slate-500">ชาวบ้านดั้งเดิม</div></div>
            </div>
          ))}
          {NPCS.map((n) => {
            const hired = T.npcs.includes(n.id), p = priceOf(n.cost, rpg.econData)
            return (
              <div key={n.id} className={`px-inner p-2.5 ${hired ? 'bg-teal-50' : ''}`} data-testid={`npc-${n.id}`}>
                <div className="flex items-center gap-2">
                  <Portrait sprite={n.sprite} size={40} dim={!hired && !T.npcSlots} />
                  <div className="min-w-0 flex-1"><div className="text-xs font-semibold">{n.name}</div><div className="text-[10px] text-teal-700">{n.perkText}</div></div>
                </div>
                {hired ? <div className="text-[10px] text-slate-500 mt-1.5 italic">“{townLines(rpg).find((l) => l.id === n.id)?.text || n.line}”</div> : (
                  <div className="mt-1.5 flex items-center justify-between gap-1"><Price p={p} rpg={rpg} />
                    <button className={`${btn} bg-violet-500 text-white`} disabled={T.npcs.length >= T.npcSlots || !rpg.afford(p)} onClick={() => ok(rpg.hire(n.id), `${n.name}ย้ายเข้าเมืองแล้ว!`)}>จ้าง</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section icon={Sparkles} title="DECOR · ตกแต่งเมือง">
        <div className="text-[11px] text-slate-500 mb-2">ของแต่งทุกชิ้นเพิ่มความสุขเมือง (สูงสุด 100%) · ติดตั้งแล้ว {T.decor.length} ชิ้น</div>
        <div className="flex gap-1.5 mb-2 flex-wrap" data-testid="decor-tabs">
          {DECOR_GROUPS.map((g) => { const n = g.list.filter((d) => T.decor.includes(d.id)).length; return <button key={g.key} onClick={() => setDecTab(g.key)} className={`px-tab ${decTab === g.key ? 'on' : ''}`} data-testid={`decor-tab-${g.key}`}>{g.tab} <span className="opacity-70">{n}/{g.list.length}</span></button> })}
        </div>
        {DECOR_GROUPS.filter((g) => g.key === decTab).map((grp) => (
          <div key={grp.key} className="mb-3" data-testid={`decor-${grp.key}`}>
            <div className="text-[10px] text-slate-500 mb-1.5">{grp.note}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {grp.list.map((d) => {
                const own = T.decor.includes(d.id), p = rpg.decorPrice ? rpg.decorPrice(d) : priceOf(d.cost, rpg.econData)
                const onSale = !d.event || decorOnSale(d, rpg.world)
                return (
                  <div key={d.id} className={`px-inner p-2 text-center ${own ? 'bg-teal-50' : ''} ${!own && (d.craft || !onSale) ? 'opacity-70' : ''}`}>
                    {d.event && <div className={`text-[9px] font-bold ${onSale ? 'text-rose-600' : 'text-slate-500'}`}><PxIcon name="em_hourglass" size={11} /> {onSale ? 'ขายอยู่ตอนนี้ · ' : ''}เทศกาล{d.event === 'sale' ? 'วันเลขเบิ้ล' : EVENTS[d.event]?.name || ''}</div>}
                    <Art name={DECOR_ART[d.id] || d.id} size={32} fallback={d.emoji} /><div className="text-[11px] font-semibold">{d.name}</div><div className="text-[10px] text-teal-700">ความสุข +{d.happy}</div>{d.scene && <div className="text-[10px] text-slate-500">{d.scene}</div>}
                    {own ? <div className="text-[10px] text-slate-500 mt-1">ติดตั้งแล้ว ✓</div>
                      : d.craft ? <div className="text-[10px] text-slate-500 mt-1">สร้างจากวัสดุที่ชาวเมือง</div>
                      : !onSale ? <div className="text-[10px] text-slate-500 mt-1">รอเทศกาลรอบหน้า</div>
                      : <button className={`${btn} mt-1 w-full bg-white`} disabled={!rpg.afford(p)} onClick={() => ok(rpg.buyDecor(d.id), `ติดตั้ง${d.name}แล้ว`)}><Price p={p} rpg={rpg} /></button>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </Section>

      <FestivalCalendar T={T} />

      <Section icon={Repeat} title="EXCHANGE · แลกเงิน">
        <div className="text-sm">แลก <b>FIAT → GOLD</b> เรต <b className="num">{rpg.exchangeRate}</b> : 1 · สัปดาห์นี้แลกแล้ว {rpg.exchangedThisWeek}/{EXCHANGE_WEEKLY}</div>
        <div className="text-[11px] text-slate-500 mt-1">เรตอิงราคาทองโลก (XAUUSD){xauPrice() ? ` $${Math.round(xauPrice()).toLocaleString()}/ออนซ์` : ''} ÷ 8 · ต่ำสุด 300 สูงสุด 900 · การล่าไม่ดรอป GOLD เป็นเหรียญ มีแค่เศษทองคำ (10 เศษ = 1 GOLD)</div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1"><TrendingUp size={12} className="text-rose" /> เงินเฟ้อสะสม +{Math.round((rpg.inflation - 1) * 100)}% · ราคาที่จ่ายด้วย FIAT ขึ้น 2% ทุกเดือน (สูงสุด +20%) — เก็บ FIAT ไว้เฉย ๆ ค่าจะลดลง ส่วน GOLD ไม่เฟ้อ{T.bankRate ? ` · ธนาคารให้ดอกเบี้ย ${T.bankRate}%/วัน` : ''}</div>
        <div className="mt-2 flex gap-2">
          {[1, 2].map((n) => <button key={n} className={`${btn} bg-amber-400`} disabled={rpg.exchangedThisWeek + n > EXCHANGE_WEEKLY || rpg.fiat < rpg.exchangeRate * n} onClick={() => ok(rpg.exchange(n), `แลกได้ ${n} GOLD`)}>แลก {n} <PxIcon name="em_gold" size={13} /> ({(rpg.exchangeRate * n).toLocaleString()} <PxIcon name="em_fiat" size={13} />)</button>)}
        </div>
      </Section>

      <Section icon={Smile} title="HAPPINESS · ความสุขของเมือง">
        <div className="space-y-1 text-xs">
          {T.happyParts.map(([k, v]) => <div key={k} className="flex justify-between"><span>{k}</span><span className={`num font-semibold ${v < 0 ? 'text-rose' : 'text-emerald-700'}`}>{v > 0 ? '+' : ''}{v}</span></div>)}
          <div className="text-[11px] text-slate-500 pt-1">ความสุขยิ่งสูง รายได้รายวันยิ่งมาก (×{T.happyMult.toFixed(2)}) และทุกชั่วโมงมีโอกาส {Math.round(happyBonusChance(T.happiness) * 100)}% ได้พลังกายเพิ่ม +1 · บ้านเยอะเกินอาคารอื่นจะแออัด</div>
        </div>
      </Section>

      <PlotSheet rpg={rpg} sel={sel} onClose={() => setSel(null)} ok={ok} />
    </div>
  )
}

const Stat = ({ icon, label, v }) => <div className="py-2 border-r-2 last:border-r-0 border-slate-800/10"><div className="flex items-center justify-center gap-1 text-slate-500">{icon}{label}</div><div className="font-bold num text-sm">{v}</div></div>

function PlotSheet({ rpg, sel, onClose, ok }) {
  const T = rpg.town
  const [confirm, setConfirm] = useState(false)
  if (sel == null) return null
  const close = () => { setConfirm(false); onClose() }
  if (sel === 'hall') {
    const p = rpg.hallPrice(), lv = T.town.hall
    return (
      <Sheet open onClose={close} title={`${HALL.name} ระดับ ${lv}`}>
        <div className="text-sm">ศูนย์กลางของเมือง ยิ่งระดับสูง ยิ่งมีที่ดินให้สร้างมากขึ้น</div>
        <div className="mt-3 px-inner p-3 text-sm">ตอนนี้: ที่ดิน {HALL.plots[lv - 1]} แปลง (+ โบนัสจากดินแดน {T.plotCount - HALL.plots[lv - 1]})</div>
        {p ? (
          <div className="mt-3 px-inner p-3">
            <div className="text-sm font-semibold">อัปเกรดเป็นระดับ {lv + 1}: ที่ดิน {HALL.plots[lv]} แปลง</div>
            <div className="mt-2 flex items-center justify-between"><Price p={p} rpg={rpg} /><button className={`${btn} bg-teal-500 text-white`} disabled={!rpg.afford(p)} onClick={() => { ok(rpg.upgradeHall(), 'ขยายศาลากลางแล้ว!'); close() }}><ArrowUpCircle size={13} className="inline -mt-0.5" /> อัปเกรด</button></div>
          </div>
        ) : <div className="mt-3 text-sm text-teal-700 font-semibold">ระดับสูงสุดแล้ว 👑</div>}
      </Sheet>
    )
  }
  const b = T.plots[sel]
  if (!b) {
    return (
      <Sheet open onClose={close} title={`แปลงที่ ${sel + 1} · เลือกสิ่งที่จะสร้าง`}>
        <div className="space-y-2">
          {Object.entries(BUILDINGS).map(([type, B]) => {
            const p = rpg.buildPrice(type, 1), full = T.count(type) >= B.max
            const locked = B.req && !B.req(rpg.habits)
            return (
              <div key={type} className="px-inner p-2.5 flex items-center gap-3" data-testid={`build-${type}`}>
                <span className="w-8 text-center"><Art name={`bld_${type}_1`} size={32} fallback={B.emoji} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{B.name} <span className={`text-[10px] font-normal ${T.count(type) ? 'text-teal-700' : 'text-slate-400'}`}>{B.max === 1 ? (T.count(type) ? 'มีแล้ว' : 'สร้างได้ 1 หลัง') : T.count(type) ? `มีแล้ว ${T.count(type)} · สร้างเพิ่มได้อีก ${Math.max(0, B.max - T.count(type))} (สูงสุด ${B.max})` : `สร้างได้สูงสุด ${B.max} หลัง`}</span></div>
                  {B.max > 1 && T.count(type) > 0 && T.count(type) < B.max && <div className="text-[10px] text-slate-500">แต่ละหลังให้ผลแยกกัน รายได้รวมกัน · หรืออัปเกรดหลังเดิมได้ที่แปลงนั้น</div>}
                  <div className="text-[11px] text-slate-500">{B.desc}</div>
                  <div className="text-[11px] text-teal-700">{B.perkText(B.perk[0])}</div>
                  {locked && <div className="text-[11px] text-amber-700"><PxIcon name="Lock" size={12} /> ต้อง: {B.reqText}</div>}
                </div>
                <div className="flex flex-col items-end gap-1"><Price p={p} rpg={rpg} />
                  <button className={`${btn} bg-teal-500 text-white`} disabled={full || locked || !rpg.afford(p)} onClick={() => { ok(rpg.build(sel, type), `สร้าง${B.name}แล้ว!`); close() }}>{full ? 'ครบแล้ว' : 'สร้าง'}</button>
                </div>
              </div>
            )
          })}
        </div>
      </Sheet>
    )
  }
  const B = BUILDINGS[b.type], next = b.lv < 3 ? rpg.buildPrice(b.type, b.lv + 1) : null
  return (
    <Sheet open onClose={close} title={`${B.name} · แปลงที่ ${sel + 1}`}>
      <div className="text-sm text-slate-600">{B.desc}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {B.perk.map((v, k) => (
          <div key={k} className={`px-inner p-2 ${k + 1 === b.lv ? 'ring-2 ring-teal-500' : k + 1 < b.lv ? 'bg-teal-50' : ''}`}>
            <div className="px-font text-[9px] text-amber-600">{'★'.repeat(k + 1)}</div>
            <div className="text-[11px] mt-1">{B.perkText(v)}</div>
          </div>
        ))}
      </div>
      {next ? (
        <div className="mt-3 px-inner p-3 flex items-center justify-between gap-2">
          <div className="text-sm">อัปเกรดเป็น {'★'.repeat(b.lv + 1)}<div><Price p={next} rpg={rpg} /></div>{LEVEL_REQ[b.type]?.[b.lv + 1] && !LEVEL_REQ[b.type][b.lv + 1].req(rpg.habits) && <div className="text-[11px] text-amber-700">🔒 ต้อง: {LEVEL_REQ[b.type][b.lv + 1].text}</div>}</div>
          <button className={`${btn} bg-teal-500 text-white`} disabled={!rpg.afford(next) || (LEVEL_REQ[b.type]?.[b.lv + 1] && !LEVEL_REQ[b.type][b.lv + 1].req(rpg.habits))} onClick={() => { ok(rpg.upgrade(sel), `อัปเกรด${B.name}แล้ว!`); close() }} data-testid="upgrade-btn"><ArrowUpCircle size={13} className="inline -mt-0.5" /> อัปเกรด</button>
        </div>
      ) : <div className="mt-3 text-sm text-teal-700 font-semibold">ระดับสูงสุดแล้ว ✨</div>}
      <button className="mt-4 text-xs text-rose flex items-center gap-1" onClick={() => { if (!confirm) return setConfirm(true); ok(rpg.demolish(sel), `รื้อ${B.name}แล้ว`); close() }}>
        <Trash2 size={13} /> {confirm ? 'แตะอีกครั้งเพื่อยืนยันการรื้อ (ได้คืน 30% ของค่าสร้างระดับ 1)' : 'รื้อถอน'}
      </button>
    </Sheet>
  )
}

/** One quiet line about the living world: real weather, festival, mood. Rendered only when there is something to say. */
function WorldStrip({ world, rank, bdayReady }) {
  const W = { storm: '⛈️', rain: '🌧️', fog: '🌫️', cloud: '☁️', sun: '☀️', leaves: '🍂' }
  const parts = []
  if (world.wx) parts.push(`${W[world.weather] || '☀️'} ${weatherTH(world.weather)}${world.temp != null ? ` ${Math.round(world.temp)}°` : ''}`)
  if (world.aurora) parts.push('🌌 แสงเหนือ (ไม่ใช้เงิน 7 วัน)')
  if (world.mood.line) parts.push(`${world.mood.id === 'bloom' ? '🌸' : world.mood.id === 'gloom' ? '🌫️' : '🌥️'} ${world.mood.line}`)
  if (world.btc !== 'flat') parts.push(world.btc === 'crash' ? `📉 BTC ร่วง ${world.btcPct}% ป้ายตลาดกะพริบ` : `🎆 BTC พุ่ง +${world.btcPct}%`)
  if (world.holiday && !world.event) parts.push('🏖️ วันหยุด ชาวเมืองพักงาน')
  return (
    <div className="col-span-full space-y-1.5" data-testid="world-strip">
      {world.event && (
        <div className="px-inner px-3 py-2 flex items-center gap-2 text-xs" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,.18), rgba(244,114,182,.12))' }} data-testid="event-banner">
          <span className="text-lg"><Emo e={world.event.emoji} size={16} /></span>
          <div className="flex-1 min-w-0"><b>{world.event.name}</b> · {world.event.line}<div className="text-[10px] text-slate-500">{world.event.bonus}</div></div>
        </div>
      )}
      {world.sale && (
        <div className="px-inner px-3 py-2 flex items-center gap-2 text-xs" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,.16), rgba(251,191,36,.14))' }} data-testid="sale-banner">
          <span className="text-lg">🛍️</span>
          <div className="flex-1 min-w-0"><b>วันเลขเบิ้ล {world.sale.label} · {world.sale.name}</b> · ร้านในเมืองลด {world.sale.pct}%<div className="text-[10px] text-slate-500">ข้างนอกเขาลดราคาล่อใจ ถ้าวันนี้ไม่ใช้เงินเลย กด “วันนี้ไม่ใช้เงิน” รับ +1 GOLD</div></div>
        </div>
      )}
      {world.birthday?.week && (
        <div className="px-inner px-3 py-2 flex items-center gap-2 text-xs" style={{ background: 'linear-gradient(90deg, rgba(244,114,182,.18), rgba(167,139,250,.16))' }} data-testid="bday-banner">
          <span className="text-lg">🎂</span>
          <div className="flex-1 min-w-0"><b>{world.birthday.isToday ? `สุขสันต์วันเกิดอายุ ${world.birthday.age}!` : `สัปดาห์วันเกิดอายุ ${world.birthday.age}`}</b> · ชาวเมืองจัดงานฉลองให้<div className="text-[10px] text-slate-500">{bdayReady ? 'รับชุดวันเกิดประจำปี + 1 GOLD ได้ที่แท็บสถานะ' : 'รับของขวัญปีนี้แล้ว 🎁'}</div></div>
        </div>
      )}
      {parts.length > 0 && <div className="text-[11px] text-slate-500 px-1 flex flex-wrap gap-x-3 gap-y-0.5">{parts.map((p, i) => <span key={i}><EmoText text={p} size={13} /></span>)}</div>}
      {!world.sale && (() => { const n = nextDoubleDay(); return <div className="text-[10px] text-slate-400 px-1">วันเลขเบิ้ลถัดไป {n.label} · ร้านลด {n.pct}%</div> })()}
    </div>
  )
}

/** Home-page version: the living town, wallet and the daily collect, one card. */
export function TownHomeCard({ rpg, onOpen }) {
  const T = rpg.town
  const theme = useActiveTheme()
  const showToast = useStore((s) => s.showToast)
  const party = rpg.party.filter((p) => p.joined && p.id !== 'knight').map((p) => p.id)
  const world = sceneWorld(rpg)
  const W = { storm: '⛈️', rain: '🌧️', fog: '🌫️', cloud: '☁️', sun: '☀️', leaves: '🍂' }
  return (
    <section className="px-card overflow-hidden" data-testid="home-town">
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <button onClick={onOpen} className="flex-1 min-w-0 text-left">
          <div className="font-bold text-sm">เมืองของฉัน <span className="px-font text-[9px] text-teal-600">LV.{rpg.level}</span></div>
          <div className="text-[11px] text-slate-500 truncate"><EmoText size={12} text={(rpg.world.event ? `${rpg.world.event.emoji} ${rpg.world.event.name} · ` : '') + (rpg.world.wx ? `${W[rpg.world.weather] || ''} ${weatherTH(rpg.world.weather)}${rpg.world.temp != null ? ` ${Math.round(rpg.world.temp)}°` : ''} · ` : '')} /><Emo e={rpg.rank.emoji} size={16} /> {rpg.rank.name}</div>
        </button>
        <Wallet rpg={rpg} />
      </div>
      <div onClick={onOpen} className="cursor-pointer">
        <TownScene town={T} party={party} pet={rpg.pet.sprite} hue={rpg.skin?.hue || 0} dark={theme === 'pixel-night'} height={150} world={world} traces={rpg.traces} extra={sceneExtra(rpg)} growth={rpg.growth} />
      </div>
      <TodayTraces rpg={rpg} compact className="px-3 py-1.5 border-t-2 border-slate-800" />
      <TownTalk rpg={rpg} className="px-3 py-1.5 border-t-2 border-slate-800/10" />
      <div className="px-3 py-2.5 flex items-center gap-2 border-t-2 border-slate-800 text-xs">
        <span className="flex-1 min-w-0 truncate text-slate-600"><EmoText size={13} text={rpg.collectReady ? `🧺 รายได้เมืองสะสม ${rpg.collectDays} วัน (+${rpg.collectAmount} FIAT)` : '🧺 รายได้เมืองสะสมทุกวันที่คุณทำอะไรสักอย่าง'} /></span>
        <button className={`${btn} bg-emerald-500 text-white`} disabled={!rpg.collectReady} onClick={() => { const r = rpg.collect(); if (r) showToast(`🧺 +${r.fiat} FIAT`) }} data-testid="home-collect">เก็บ</button>
        <button className={`${btn} bg-white`} onClick={onOpen}>ไปเมือง</button>
      </div>
    </section>
  )
}

/** what each festival brings, and which limited pieces you already own */
function FestivalCalendar({ T }) {
  const rows = [['newyear', '29 ธ.ค.–3 ม.ค.'], ['cny', 'ช่วงตรุษจีน'], ['songkran', '12–16 เม.ย.'], ['phansa', '30 วันแรกของพรรษา'], ['loy', 'ช่วงลอยกระทง'], ['xmas', '18–28 ธ.ค.'], ['payday', 'วันเงินเดือนออก']]
  const piece = (ev) => EVENT_DECOR.find((d) => d.event === ev)
  return (
    <Section icon={Sparkles} title="FESTIVALS · ปฏิทินเทศกาล">
      <div className="space-y-1.5 text-xs" data-testid="festival-calendar">
        {rows.map(([id, when]) => {
          const e = EVENTS[id], d = piece(id)
          return (
            <div key={id} className="flex items-start gap-2">
              <span className="text-base leading-none"><Emo e={e.emoji} size={16} /></span>
              <div className="flex-1 min-w-0"><b>{e.name}</b> <span className="text-slate-500">· {when}</span><div className="text-[10px] text-slate-500">{e.bonus}<EmoText size={12} text={d ? ` · ของเฉพาะเทศกาล: ${d.emoji} ${d.name}${T.decor.includes(d.id) ? ' ✓ มีแล้ว' : ''}` : ''} /></div></div>
            </div>
          )
        })}
        <div className="flex items-start gap-2">
          <PxIcon name="ShoppingBag" size={16} />
          <div className="flex-1 min-w-0"><b>วันเลขเบิ้ล</b> <span className="text-slate-500">· 1.1 ถึง 12.12</span><div className="text-[10px] text-slate-500">ร้านในเมืองลด 10–30% (11.11 ลดมากสุด) · ไม่ใช้เงินในวันนั้นรับ +1 GOLD · ของเฉพาะ: <PxIcon name="em_sign" size={12} /> ป้าย “ไม่ช้อปก็รวยได้”</div></div>
        </div>
      </div>
    </Section>
  )
}
