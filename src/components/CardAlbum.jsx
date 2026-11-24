/* Collector's Album (สมุดสะสมการ์ด): monster cards with PixelLab frames + animated PixelLab monsters */
import { useState } from 'react'
import { PxIcon, Emo } from './px'
import { Sheet } from './ui'
import { useStore } from '../store'
import { MAPS, MAP_BY_ID, MON_BY_ID } from '../lib/farmData'
import { SHEETS } from '../lib/spriteSheets'
import { MON_LORE } from '../lib/farmLore'
import { MON_GLOW_LORE } from '../lib/glowLore'
import { CARD_STAT, CARD_CAP, CARD_MAX, KIND_MULT, GLOW_CARD_PCT, CARD_DROP, GLOW_CARD_MULT, GLOW_CARD, SELL_RATE, SHOP_ODDS, cardPct, cardPrice, sellPrice } from '../lib/cards'

const NIGHT_BG = ['meadow', 'forest', 'swamp', 'desert', 'snow', 'volcano']
const pct = (x) => `${+(x * 100).toFixed(2)}%`
const KIND_TH = { normal: 'ทั่วไป', elite: 'หัวหน้า', boss: 'บอส' }

/** one card: map backdrop, the monster moving (8-frame PixelLab strip), PixelLab frame by rarity, name + level */
export function MonCard({ mon, glow = false, lv = 0, size = 88, dim = false, anim = true }) {
  const h = Math.round(size * 4 / 3), frame = glow ? 'glow' : mon.kind
  const bg = `./sprites/map_${mon.map}${glow && NIGHT_BG.includes(mon.map) ? '_night' : ''}.png`
  const sp = `./sprites/mon_${mon.id}${glow ? '_glow' : ''}`, moving = anim && !dim && !!SHEETS[`mon_${mon.id}${glow ? '_glow' : ''}_anim`]
  return (
    <div className="relative select-none" style={{ width: size, height: h, imageRendering: 'pixelated' }}>
      <div className="absolute overflow-hidden" style={{ left: '9%', right: '9%', top: '7%', bottom: '24%', backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center bottom', filter: dim ? 'grayscale(1) brightness(.35)' : undefined }}>
        <div className={moving ? 'card-anim' : ''} style={{ position: 'absolute', left: '8%', right: '8%', bottom: '2%', aspectRatio: '1', backgroundImage: moving ? `url(${sp}_anim.png)` : `url(${sp}.png)`, backgroundSize: moving ? '800% 100%' : '100% 100%', backgroundRepeat: 'no-repeat', filter: dim ? 'brightness(0)' : undefined, opacity: dim ? 0.55 : 1 }} />
      </div>
      <img src={`./sprites/card_${frame}.png`} alt="" className="absolute inset-0 w-full h-full pointer-events-none" style={{ imageRendering: 'pixelated' }} />
      <div className="absolute left-0 right-0 text-center leading-none" style={{ bottom: '8%', fontSize: Math.max(8, size / 9) }}>
        <div className={`font-bold truncate px-[12%] ${glow ? 'text-fuchsia-200' : mon.kind === 'boss' ? 'text-amber-200' : 'text-slate-100'}`} style={{ textShadow: '0 1px 0 #000, 0 0 2px #000' }}>{dim ? '???' : mon.name}</div>
        {!dim && <div className="text-amber-300 mt-0.5" style={{ textShadow: '0 1px 0 #000', fontSize: Math.max(7, size / 11) }}>{glow ? (lv ? '✦ เรืองแสง' : '✦ ใหม่!') : lv ? `ขั้น ${lv}/${CARD_MAX}` : 'ใหม่!'}</div>}
      </div>
    </div>
  )
}

function CardSheet({ rpg, sel, onClose, onSwitch }) {
  const [back, setBack] = useState(false)
  const showToast = useStore((s) => s.showToast)
  if (!sel) return null
  const f = rpg.farm, mon = MON_BY_ID[sel.id], st = CARD_STAT[mon.map], glow = sel.glow
  const lv = glow ? (f.glowCards?.[mon.id] ? 1 : 0) : f.cards?.[mon.id] || 0, spare = (glow ? f.glowSpare : f.cardSpare)?.[mon.id] || 0
  const now = glow ? (lv ? GLOW_CARD_PCT[mon.kind] : 0) : cardPct(mon, lv), next = !glow && lv < CARD_MAX ? cardPct(mon, lv + 1) : null
  const sell = () => { const g = rpg.sellCard(mon.id, glow); if (g) showToast(`ขายการ์ดซ้ำได้ ${g.toLocaleString()} FIAT`) }
  return (
    <Sheet open onClose={() => { setBack(false); onClose() }} title={lv ? `${mon.name}${glow ? ' (เรืองแสง)' : ''}` : '??? (ยังไม่มีการ์ดใบนี้)'}>
      <div className="space-y-3" data-testid="card-sheet">
        <button className="mx-auto block" onClick={() => setBack((b) => !b)} data-testid="card-flip" title="แตะเพื่อพลิกการ์ด">
          {!back ? <MonCard mon={mon} glow={glow} lv={lv} size={200} dim={!lv} />
            : <div className="relative text-left text-[12px] text-slate-100 p-5" style={{ width: 200, height: 267, backgroundImage: `url(./sprites/card_${glow ? 'glow' : mon.kind}.png)`, backgroundSize: '100% 100%', imageRendering: 'pixelated' }}>
                <div className="absolute inset-[7%] bg-slate-900/90 p-2.5 space-y-1.5 overflow-hidden">
                  <div className="flex items-center gap-1 font-bold text-amber-200"><Emo k={st.icon} size={14} /> {st.name}</div>
                  <div>ตอนนี้ <b className="text-emerald-300">+{now}%</b>{next != null && <> · ขั้นถัดไป +{+next.toFixed(2)}%</>}</div>
                  <div className="text-slate-300">{glow ? `การ์ดเรืองแสงมีขั้นเดียว +${GLOW_CARD_PCT[mon.kind]}%` : `ขั้น 1 = ${KIND_MULT[mon.kind]}% · ขั้น 10 = ${2 * KIND_MULT[mon.kind]}% (${KIND_TH[mon.kind]} ×${KIND_MULT[mon.kind]})`}</div>
                  <div className="text-slate-300 text-[11px] leading-snug">{lv ? (glow ? MON_GLOW_LORE[mon.id] : MON_LORE[mon.id]) : 'ยังไม่มีการ์ดใบนี้'}</div>
                </div>
              </div>}
        </button>
        <div className="text-center text-[11px] text-slate-500">แตะการ์ดเพื่อพลิกดู{back ? 'ด้านหน้า' : 'ความสามารถ'}</div>
        <div className="flex gap-1 text-xs justify-center">
          <button onClick={() => onSwitch({ id: mon.id, glow: false })} className={`px-btn px-2 py-1 ${!glow ? 'ring-2 ring-slate-900' : 'opacity-50'}`} data-testid="card-normal">การ์ดปกติ</button>
          <button onClick={() => onSwitch({ id: mon.id, glow: true })} className={`px-btn px-2 py-1 flex items-center gap-1 ${glow ? 'ring-2 ring-slate-900' : 'opacity-50'}`} data-testid="card-glow"><Emo k="em_glow" size={14} /> การ์ดเรืองแสง</button>
        </div>
        <div className="px-inner p-3 text-sm space-y-1">
          <div><b>{KIND_TH[mon.kind]}</b> · <Emo e={MAP_BY_ID[mon.map].emoji} size={14} /> {MAP_BY_ID[mon.map].name}</div>
          <div className="flex items-center gap-1"><Emo k={st.icon} size={14} /> {st.name} <b>+{now}%</b>{CARD_CAP[st.key] ? ` (รวมทุกใบสูงสุด ${CARD_CAP[st.key]}%)` : ''}</div>
          <div className="text-[12px] text-slate-500">{glow ? `ได้จากตัวเรืองแสงเท่านั้น (${pct(GLOW_CARD)} ต่อครั้งที่ล่าชนะ) หรือพ่อค้าวันอาทิตย์` : `ดรอป ${pct(CARD_DROP[mon.kind])} ต่อการชนะ (ตัวเรืองแสง ×${GLOW_CARD_MULT}) · ใส่ทับเพื่ออัปขั้น สูงสุด ${CARD_MAX} ขั้น`} · ราคาที่พ่อค้า {cardPrice(mon, glow).toLocaleString()} FIAT</div>
          {spare > 0 && <div className="flex items-center gap-2 pt-1"><span className="flex-1">การ์ดซ้ำเกินขั้นสูงสุด ×{spare}</span><button className="px-btn !py-1 !px-2 text-xs" onClick={sell} data-testid="card-sell"><PxIcon name="em_sell" size={14} /> ขาย {(sellPrice(mon, glow) * spare).toLocaleString()} FIAT</button></div>}
        </div>
      </div>
    </Sheet>
  )
}

export default function CardAlbum({ rpg }) {
  const [sel, setSel] = useState(null)
  const showToast = useStore((s) => s.showToast)
  const f = rpg.farm, cards = f.cards || {}, gl = f.glowCards || {}, fx = rpg.cardFx || {}
  const total = MAPS.reduce((n, m) => n + m.mons.length, 0)
  const own = Object.keys(cards).length, maxed = Object.values(cards).filter((v) => v >= CARD_MAX).length, glowN = Object.keys(gl).length
  const shop = rpg.cardShopToday
  const daysToSun = (7 - new Date().getDay()) % 7
  const buy = (i) => { const r = rpg.buyCard(i); if (r) showToast(r === 'new' ? 'ได้การ์ดใหม่เข้าสมุด!' : r === 'up' ? 'อัปขั้นการ์ดแล้ว!' : 'การ์ดเต็มขั้นแล้ว เก็บไว้ขายได้'); else showToast('FIAT ไม่พอ') }
  return (
    <div className="space-y-3" data-testid="card-album">
      <CardSheet rpg={rpg} sel={sel} onClose={() => setSel(null)} onSwitch={setSel} />
      <section className="px-card p-3">
        <div className="flex items-center gap-2 mb-1"><PxIcon name="em_album" size={22} /><b className="flex-1">สมุดสะสมการ์ด</b><span className="text-[11px] text-slate-500">{own}/{total} · เต็มขั้น {maxed} · <Emo k="em_glow" size={12} /> {glowN}/{total}</span></div>
        <div className="text-[11px] text-slate-500 mb-2">การ์ดหายากเท่าเศษทอง (ดรอป {pct(CARD_DROP.normal)} / {pct(CARD_DROP.elite)} / {pct(CARD_DROP.boss)} ต่อการชนะ ตัวเรืองแสง ×{GLOW_CARD_MULT}) · ใส่สมุดแล้วได้ความสามารถติดตัวตามแผนที่ ใส่ใบซ้ำทับเพื่ออัปขั้น 1→{CARD_MAX} (1%→2%, หัวหน้า ×2, บอส ×3) · การ์ดเรืองแสงมีขั้นเดียว · ใบซ้ำที่เกินขั้นสูงสุดขายได้ {Math.round(SELL_RATE * 100)}% ของราคาพ่อค้า</div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]" data-testid="card-bonus">
          {MAPS.map((m) => { const st = CARD_STAT[m.id], v = fx[st.key] || 0; return <div key={m.id} className="px-inner px-2 py-1 flex items-center gap-1"><Emo k={st.icon} size={14} /><span className="flex-1 truncate">{st.name}</span><b className={v ? 'text-emerald-600' : 'text-slate-400'}>+{v}%</b>{CARD_CAP[st.key] && <span className="text-slate-400">/{CARD_CAP[st.key]}</span>}</div> })}
        </div>
      </section>
      <section className="px-card p-3" data-testid="card-shop">
        <div className="flex items-center gap-2 mb-1"><PxIcon name="em_cardshop" size={22} /><b className="flex-1">พ่อค้าการ์ดวันอาทิตย์</b>{!shop && <span className="text-[11px] text-slate-500">มาอีก {daysToSun} วัน</span>}</div>
        <div className="text-[11px] text-slate-500 mb-2">ทุกวันอาทิตย์นำการ์ดมา 5 ใบจากแผนที่ที่คุณไปได้ · โอกาส: ทั่วไป {pct(SHOP_ODDS[3][1])} · หัวหน้า {pct(SHOP_ODDS[2][1])} · บอส {pct(SHOP_ODDS[1][1])} · เรืองแสง {pct(SHOP_ODDS[0][1])} · ซื้อได้ใบละครั้ง</div>
        {shop ? <div className="grid grid-cols-5 gap-1">
          {shop.items.map((c) => { const m = MON_BY_ID[c.id]; return <div key={c.i} className="flex flex-col items-center gap-1"><button onClick={() => setSel({ id: c.id, glow: c.glow })}><MonCard mon={m} glow={c.glow} lv={(c.glow ? (gl[c.id] ? 1 : 0) : cards[c.id]) || 0} size={60} anim={false} /></button><button disabled={c.sold || rpg.fiat < c.price} onClick={() => buy(c.i)} className="px-btn !py-0.5 !px-1 text-[10px] w-full disabled:opacity-40" data-testid={`card-buy-${c.i}`}>{c.sold ? 'ซื้อแล้ว' : `${c.price.toLocaleString()} FIAT`}</button></div> })}
        </div> : <div className="text-xs text-slate-400">วันนี้พ่อค้ายังไม่มา แวะมาใหม่วันอาทิตย์นะ</div>}
      </section>
      {MAPS.map((m) => {
        const st = CARD_STAT[m.id], got = m.mons.filter((x) => cards[x.id]).length
        return (
          <section key={m.id} className="px-card p-3">
            <div className="flex items-center gap-2 mb-2 text-sm"><Emo e={m.emoji} size={16} /><b className="flex-1">{m.name}</b><span className="text-[11px] text-slate-500 flex items-center gap-1"><Emo k={st.icon} size={12} /> {st.name} · {got}/{m.mons.length}</span></div>
            <div className="grid grid-cols-5 gap-1.5">
              {m.mons.map((x) => <button key={x.id} onClick={() => setSel({ id: x.id, glow: false })} className="relative" data-testid={`card-${x.id}`}>
                <MonCard mon={x} lv={cards[x.id] || 0} size={62} dim={!cards[x.id]} anim={false} />
                {gl[x.id] && <span className="absolute -top-1 -right-1" title="มีการ์ดเรืองแสง"><Emo k="em_glow" size={14} /></span>}
              </button>)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
