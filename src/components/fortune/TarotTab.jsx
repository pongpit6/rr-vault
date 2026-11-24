import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store'
import { Sheet } from '../ui'
import { PxIcon } from '../px'
import { useFortune, saveFortune } from './FortuneKit'
import { TAROT_LORE } from '../../lib/fortune/tarotLore'
import { CARDS, CARD_BY_ID, SUITS, suitOf, cardArt, drawCard, bkkDate, effectOf, effectLines, LUCK_TEXT, LUCK_COLOR } from '../../lib/fortune/tarot'

const BACK = './sprites/tarot/back.png'
const thDay = (d) => { const [y, m, dd] = d.split('-'); return `${+dd}/${+m}/${(+y + 543) % 100}` }

/** a tarot card picture (reversed cards are shown upside down) */
export function TarotCard({ id, rev, w = 96, back = false, onClick, className = '', testid }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={`tarot-card shrink-0 ${className}`} style={{ width: w, height: w * 1.5 }} data-testid={testid}>
      <img src={back ? BACK : cardArt(id)} alt={back ? 'หลังไพ่' : CARD_BY_ID[id]?.en} draggable={false}
        style={{ width: '100%', height: '100%', imageRendering: 'pixelated', transform: !back && rev ? 'rotate(180deg)' : undefined }} />
    </button>
  )
}

function Luck({ id, rev }) {
  const e = effectOf(id, rev)
  return <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: LUCK_COLOR[e.luck] }}>{LUCK_TEXT[e.luck]}</span>
}

function Effect({ id, rev }) {
  const lines = effectLines(effectOf(id, rev))
  return (
    <div className="px-inner p-3 text-xs space-y-1.5" data-testid="tarot-effect">
      <div className="font-semibold text-slate-700 flex items-center gap-1.5"><PxIcon name="Swords" size={16} /> พลังไพ่ในเกม (ถึงเที่ยงคืนของวันที่จั่ว)</div>
      {lines.map((l, i) => <div key={i} className="flex items-center gap-2"><PxIcon name={l.icon} size={18} /><span>{l.text}</span></div>)}
    </div>
  )
}

/** the reading of one card in one orientation */
function Reading({ id, rev }) {
  const c = CARD_BY_ID[id]
  const row = (icon, t, v) => <div className="flex gap-2"><PxIcon name={icon} size={18} className="mt-0.5" /><div><div className="text-[11px] text-slate-500">{t}</div><div className="text-sm">{v}</div></div></div>
  return (
    <div className="space-y-2.5">
      {row('ft_ball', 'ธีมวันนี้', c.theme)}
      {rev ? <>
        {row('RotateCcw', 'ไพ่กลับหัวบอกว่า', c.rev)}
        {row('AlertTriangle', 'แก้จุดนี้ก่อน', c.shadow)}
        {row('Target', 'ลองทำวันนี้', c.action)}
      </> : <>
        {row('Sparkles', 'ด้านที่ช่วยคุณ', c.light)}
        {row('AlertTriangle', 'จุดที่ควรระวัง', c.shadow)}
        {row('Target', 'ลองทำวันนี้', c.action)}
      </>}
      {row('Moon', 'ก่อนนอนถามตัวเอง', c.q)}
    </div>
  )
}

/** popup for any card: picture, what the picture shows, reading and game effect (both orientations from the deck list) */
export function CardSheet({ open, onClose, id, rev = false, both = false, day }) {
  const [r, setR] = useState(rev)
  const [cur, setCur] = useState(id)
  const [all, setAll] = useState(both)
  useEffect(() => { setCur(id); setAll(both); setR(rev) }, [id, both, rev])
  if (!open || !cur) return null
  const c = CARD_BY_ID[cur], s = suitOf(cur), showRev = all ? r : rev
  const k = CARDS.findIndex((x) => x.id === cur)
  const go = (d) => { setCur(CARDS[(k + d + CARDS.length) % CARDS.length].id); if (!all) { setAll(true); setR(false) } }
  const lore = TAROT_LORE[cur]
  return (
    <Sheet open onClose={onClose} title={`${c.en} · ${c.th}`}>
      <div className="space-y-3" data-testid="tarot-sheet">
        <div className="flex items-center gap-2">
          <button className="px-btn px-3 py-1 text-xs" onClick={() => go(-1)} aria-label="ไพ่ก่อนหน้า" data-testid="tarot-prev">◀</button>
          <div className="flex-1 text-center text-[11px] text-slate-500">ใบที่ {k + 1} / {CARDS.length}</div>
          <button className="px-btn px-3 py-1 text-xs" onClick={() => go(1)} aria-label="ไพ่ถัดไป" data-testid="tarot-next">▶</button>
        </div>
        <div className="flex gap-3 items-start">
          <TarotCard id={cur} rev={showRev} w={110} />
          <div className="flex-1 min-w-0 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5"><PxIcon name={SUITS[s].icon} size={18} /> {SUITS[s].name}{SUITS[s].el ? ` · ธาตุ${SUITS[s].el}` : ''}</div>
            <div>{showRev ? 'กลับหัว' : 'ตั้งตรง'} · <Luck id={cur} rev={showRev} /></div>
            {day && cur === id && <div className="text-slate-500">จั่ววันที่ {thDay(day)}</div>}
            <div className="text-slate-500">ภาพบนไพ่: {c.img}</div>
          </div>
        </div>
        {all && <div className="flex gap-2">{[false, true].map((v) => <button key={String(v)} onClick={() => setR(v)} className={`px-btn flex-1 justify-center text-xs ${r === v ? '' : 'opacity-50'}`}>{v ? 'กลับหัว' : 'ตั้งตรง'}</button>)}</div>}
        <Reading id={cur} rev={showRev} />
        {lore && (
          <div className="space-y-2" data-testid="tarot-lore">
            <div className="px-inner p-2.5 text-xs leading-relaxed"><div className="flex items-center gap-1.5 font-bold mb-1"><PxIcon name="BookOpen" size={16} /> ตำนานดั้งเดิม</div>{lore[0]}</div>
            <div className="px-inner p-2.5 text-xs leading-relaxed"><div className="flex items-center gap-1.5 font-bold mb-1"><PxIcon name="Castle" size={16} /> ตำนานในโลก LifeQuest</div>{lore[1]}</div>
          </div>
        )}
        <Effect id={cur} rev={showRev} />
      </div>
    </Sheet>
  )
}

const REVIEW = [['hit', 'ตรง', '#10b981'], ['part', 'ตรงบางส่วน', '#f59e0b'], ['miss', 'ไม่ตรง', '#94a3b8']]

export default function TarotTab() {
  const { tarot = {} } = useFortune()
  const today = bkkDate()
  const d = tarot[today]
  const [phase, setPhase] = useState(d ? 'shown' : 'idle') // idle → shuffle → down → shown
  const [sheet, setSheet] = useState(null)
  const [suit, setSuit] = useState('maj')
  const [note, setNote] = useState(d?.review?.note || '')
  const draw = () => {
    if (tarot[today]) return
    const c = drawCard()
    saveFortune((cur) => ({ tarot: { ...(cur.tarot || {}), [today]: { ...c, at: Date.now() } } }))
    setPhase('shuffle'); setTimeout(() => setPhase('down'), 1400)
  }
  const review = (v) => saveFortune((cur) => ({ tarot: { ...cur.tarot, [today]: { ...cur.tarot[today], review: { v, note } } } }))
  return (
    <div className="space-y-4" data-testid="tarot-tab">
      <section className="px-card p-4">
        <div className="flex items-center gap-2 mb-3"><PxIcon name="tr_back" size={22} /><b className="text-sm">ไพ่ประจำวัน · {thDay(today)}</b></div>
        {!d && phase === 'idle' && (
          <div className="text-center space-y-3">
            <div className="flex justify-center -space-x-12 py-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ transform: `rotate(${(i - 2) * 7}deg) translateY(${Math.abs(i - 2) * 4}px)` }}><TarotCard back w={84} /></div>)}</div>
            <div className="text-xs text-slate-500">ตั้งคำถามในใจ: “วันนี้ฉันควรใส่ใจเรื่องอะไร และระวังตัวเองตรงไหน?” แล้วจั่ววันละหนึ่งใบ ไพ่อาจออกตั้งตรงหรือกลับหัว และให้พลังในเกมต่างกันทั้ง 156 แบบ</div>
            <button className="px-btn mx-auto" onClick={draw} data-testid="tarot-draw"><PxIcon name="Sparkles" size={18} /> สับไพ่แล้วจั่ว</button>
          </div>
        )}
        {phase === 'shuffle' && <div className="flex justify-center py-6"><div className="tarot-shuffle relative" style={{ width: 96, height: 144 }}>{[0, 1, 2].map((i) => <div key={i} className={`absolute inset-0 tarot-sh${i}`}><TarotCard back w={96} /></div>)}</div></div>}
        {phase === 'down' && d && (
          <div className="text-center space-y-2 py-2">
            <div className="flex justify-center"><div className="tarot-flip"><TarotCard back w={120} onClick={() => setPhase('shown')} testid="tarot-reveal" /></div></div>
            <div className="text-xs text-slate-500">แตะไพ่เพื่อเปิด</div>
          </div>
        )}
        {d && phase === 'shown' && (
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="tarot-in"><TarotCard id={d.id} rev={d.rev} w={110} onClick={() => setSheet({ id: d.id, rev: d.rev, day: today })} testid="tarot-today" /></div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="text-lg font-bold leading-tight">{CARD_BY_ID[d.id].en}</div>
                <div className="text-sm text-slate-600">{CARD_BY_ID[d.id].th} · {d.rev ? 'กลับหัว' : 'ตั้งตรง'}</div>
                <Luck id={d.id} rev={d.rev} />
                <div className="text-sm font-semibold mt-1">{CARD_BY_ID[d.id].theme}</div>
                <button className="text-xs ui-link" onClick={() => setSheet({ id: d.id, rev: d.rev, day: today })}>ดูคำอธิบายเต็ม</button>
              </div>
            </div>
            <Reading id={d.id} rev={d.rev} />
            <Effect id={d.id} rev={d.rev} />
            <div className="px-inner p-3 space-y-2" data-testid="tarot-review">
              <div className="text-xs font-semibold">ทบทวนตอนเย็น: วันนี้ไพ่ตรงไหม?</div>
              <textarea className="field w-full text-sm" rows={2} placeholder="วันนี้เกิดอะไรขึ้นจริง (ไม่บังคับ)" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="flex gap-2">{REVIEW.map(([v, t, col]) => <button key={v} onClick={() => review(v)} className="px-btn flex-1 justify-center text-xs" style={d.review?.v === v ? { background: col, color: '#fff' } : undefined} data-testid={`review-${v}`}>{t}</button>)}</div>
            </div>
          </div>
        )}
      </section>

      <section className="px-card p-4" data-testid="tarot-deck">
        <div className="flex items-center gap-2 mb-2"><PxIcon name="BookOpen" size={20} /><b className="text-sm">ไพ่ทั้งสำรับ 78 ใบ</b><span className="ml-auto text-[11px] text-slate-500">แตะดูความหมายและพลังทั้งสองด้าน</span></div>
        <div className="flex gap-1.5 mb-3 overflow-x-auto">{Object.entries(SUITS).map(([k, s]) => <button key={k} onClick={() => setSuit(k)} className={`px-btn text-xs shrink-0 ${suit === k ? '' : 'opacity-50'}`} data-testid={`deck-${k}`}><PxIcon name={s.icon} size={16} /> {s.name}</button>)}</div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">{CARDS.filter((c) => suitOf(c.id) === suit).map((c) => (
          <div key={c.id} className="text-center"><TarotCard id={c.id} w={64} className="mx-auto" onClick={() => setSheet({ id: c.id, rev: false, both: true })} testid={`card-${c.id}`} />
            <div className="text-[10px] leading-tight mt-0.5 text-slate-600">{c.th}</div></div>))}</div>
      </section>

      <CardSheet open={!!sheet} onClose={() => setSheet(null)} {...(sheet || {})} key={sheet ? sheet.id + sheet.day + sheet.both : 'x'} />
    </div>
  )
}
