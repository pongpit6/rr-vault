import { useEffect, useMemo, useState } from 'react'
import { Flame, ChevronRight } from 'lucide-react'
import BattleScene, { skinUrl } from './BattleScene'
import { SHEETS } from '../lib/spriteSheets'
import { useStore } from '../store'
import { diffEvents } from '../lib/rpg'
import { statusLines } from '../lib/party'

export function useBattleEvents(rpg) {
  const seen = useStore((s) => s.ui.rpgSeen)
  const setUi = useStore((s) => s.setUi)
  const snap = useMemo(() => ({
    owed: Object.fromEntries(rpg.bosses.map((b) => [b.id, b.hp])),
    level: rpg.level,
    ach: rpg.achievements.filter((a) => a.unlockedAt || a.ready).map((a) => a.id),
    inv: rpg.totals.investIn, res: rpg.totals.reserveIn, inc: rpg.totals.incomes,
    party: rpg.party.filter((p) => p.joined).map((p) => p.id),
  }), [rpg])
  const snapKey = JSON.stringify(snap), seenKey = JSON.stringify(seen || null)
  const events = useMemo(() => diffEvents(seen, snap, rpg.bosses), [snapKey, seenKey]) // eslint-disable-line
  useEffect(() => { if (!seen) setUi({ rpgSeen: snap }) }, [seenKey]) // eslint-disable-line
  const consume = () => setUi({ rpgSeen: snap })
  // older saved snapshots lack the new fields: fill them in without replaying history
  useEffect(() => { if (seen && seen.inv === undefined) setUi({ rpgSeen: { ...seen, inv: snap.inv, res: snap.res, inc: snap.inc, party: snap.party } }) }, [seenKey]) // eslint-disable-line
  return { events, consume }
}

/** Everything the battle scene needs to draw the party as it really is. */
export function sceneProps(rpg) {
  return {
    bosses: rpg.bosses, tier: rpg.realm.tier, fog: rpg.debtFog, level: rpg.level, weather: rpg.weather, chest: rpg.chestReady,
    party: rpg.party, gear: rpg.gearBy, pet: rpg.pet.sprite, skinHue: rpg.skin?.hue || 0, decos: rpg.decos,
    storm: rpg.skills.find((k) => k.id === 'storm')?.unlocked, captions: statusLines(rpg),
  }
}

/** A character's face/body from its idle sprite (sheet or still). */
export function Portrait({ sprite, size = 44, dim = false, hue = 0 }) {
  const sheetName = SHEETS[`${sprite}_idle`] ? `${sprite}_idle` : null
  const [tinted, setTinted] = useState(null)
  useEffect(() => {
    if (!hue || !sheetName) { setTinted(null); return }
    let n = 0
    const tryIt = () => { const u = skinUrl(hue, sheetName); if (u) setTinted(u); else if (n++ < 20) setTimeout(tryIt, 150) }
    tryIt()
  }, [hue, sheetName])
  hue = 0
  const src = tinted || `./sprites/${sheetName || sprite}.png`
  const sp = sheetName ? SHEETS[sheetName] : null
  const k = sp ? size / sp.h : 1
  return (
    <div className="shrink-0 overflow-hidden" style={{
      width: size, height: size, imageRendering: 'pixelated',
      backgroundImage: `url(${src})`, backgroundRepeat: 'no-repeat',
      backgroundSize: sp ? `${sp.w * sp.n * k}px ${size}px` : 'contain', backgroundPosition: sp ? '0 0' : 'center',
      filter: `${dim ? 'brightness(0) opacity(.3)' : ''} ${hue ? `hue-rotate(${hue}deg)` : ''}`.trim() || undefined,
    }} />
  )
}

export function SpriteImg({ name, size = 48, className = '' }) {
  const sp = SHEETS[`${name}_idle`]
  const k = size / sp.h
  return (
    <div className={className} style={{
      width: sp.w * k, height: size, imageRendering: 'pixelated',
      backgroundImage: `url(./sprites/${name}_idle.png)`, backgroundSize: `${sp.w * sp.n * k}px ${size}px`, backgroundPosition: '0 0',
    }} />
  )
}

export function XpBar({ into, need, className = '' }) {
  return <div className={`px-xp ${className}`}><div style={{ width: `${Math.min(100, (into / need) * 100)}%` }} /></div>
}

export function RpgHomeCard({ rpg, onOpen }) {
  const { events, consume } = useBattleEvents(rpg)
  return (
    <section className="px-card overflow-hidden anim-pop">
      <BattleScene {...sceneProps(rpg)} events={events} onConsumed={consume} onChest={onOpen} />
      <button onClick={onOpen} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 transition">
        <div className="px-lv">{rpg.level}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold truncate">{rpg.title}</span>
            <span className="text-xs text-slate-500 truncate">· {rpg.realm.name}</span>
          </div>
          <XpBar into={rpg.into} need={rpg.need} className="mt-1.5" />
        </div>
        {rpg.chestReady && <span className="px-font text-[8px] text-amber-600 animate-pulse">CHEST!</span>}
        {rpg.streak > 0 && <div className="flex items-center gap-0.5 text-orange-500 text-sm font-semibold"><Flame size={16} />{rpg.streak}</div>}
        <ChevronRight size={18} className="text-slate-400" />
      </button>
    </section>
  )
}

/** Daily chest: opens once a day after logging at least one transaction. */
export function ChestCard({ rpg, onAdd }) {
  const [res, setRes] = useState(null)
  const [opening, setOpening] = useState(false)
  const open = () => {
    if (!rpg.chestReady || opening) return
    setOpening(true)
    try { navigator.vibrate?.([20, 60, 20, 60, 120]) } catch { /* no haptics */ }
    setTimeout(() => { setRes(rpg.openChest()); setOpening(false) }, 900)
  }
  const sprite = res ? 'chest_open' : 'chest_closed'
  return (
    <section className="px-card p-4">
      <div className="flex items-center gap-4">
        <button onClick={open} disabled={!rpg.chestReady && !res} className={`relative w-20 h-20 grid place-items-center shrink-0 ${rpg.chestReady ? 'px-glow' : ''} ${opening ? 'anim-shake' : ''}`}>
          <img src={`./sprites/${sprite}.png`} alt="" className={`w-16 h-16 ${!rpg.chestReady && !res ? 'grayscale opacity-60' : ''}`} style={{ imageRendering: 'pixelated' }} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="px-font text-[11px] flex-1">DAILY CHEST</h2>
            <span className="px-chip text-emerald-700">💵 <b className="num">{rpg.fiat.toLocaleString()}</b></span>
          </div>
          {res ? (
            <div className="mt-1.5 anim-pop">
              <div className="text-sm font-semibold text-amber-600">{res.rare ? 'หีบหายาก! ' : ''}ได้ +{res.gain} FIAT{res.bonus ? ` (ไฟแห่งวินัย +${res.bonus})` : ''}{res.double ? ' ×2 ตำนานแห่งวินัย' : ''}</div>
              <div className="text-xs text-violet-600 mt-0.5">เอา FIAT ไปสร้างเมืองหรือซื้อของได้ที่แท็บ “เมือง” และ “ร้านค้า”</div>
              <div className="text-xs text-slate-600 mt-1">💡 {res.tip}</div>
            </div>
          ) : rpg.chestReady ? (
            <div className="text-sm text-slate-600 mt-1">หีบสมบัติวันนี้พร้อมแล้ว แตะหีบเพื่อเปิด</div>
          ) : rpg.loggedToday ? (
            <div className="text-sm text-slate-500 mt-1">เปิดหีบวันนี้ไปแล้ว พรุ่งนี้มาใหม่นะ · เปิดมาแล้ว {rpg.chestCount} ครั้ง</div>
          ) : (
            <div className="text-sm text-slate-500 mt-1">บันทึกรายการวันนี้อย่างน้อย 1 รายการ เพื่อปลดล็อกหีบ <button onClick={() => onAdd?.()} className="text-teal-700 font-semibold underline">บันทึกเลย</button></div>
          )}
        </div>
      </div>
    </section>
  )
}
