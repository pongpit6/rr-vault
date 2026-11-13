import { useEffect, useMemo } from 'react'
import { Flame, ChevronRight } from 'lucide-react'
import BattleScene from './BattleScene'
import { SHEETS } from '../lib/spriteSheets'
import { useStore } from '../store'
import { diffEvents } from '../lib/rpg'

export function useBattleEvents(rpg) {
  const seen = useStore((s) => s.ui.rpgSeen)
  const setUi = useStore((s) => s.setUi)
  const snap = useMemo(() => ({
    owed: Object.fromEntries(rpg.bosses.map((b) => [b.id, b.hp])),
    level: rpg.level,
    ach: rpg.achievements.filter((a) => a.unlockedAt || a.ready).map((a) => a.id),
  }), [rpg])
  const snapKey = JSON.stringify(snap), seenKey = JSON.stringify(seen || null)
  const events = useMemo(() => diffEvents(seen, snap, rpg.bosses), [snapKey, seenKey]) // eslint-disable-line
  useEffect(() => { if (!seen) setUi({ rpgSeen: snap }) }, [seenKey]) // eslint-disable-line
  const consume = () => setUi({ rpgSeen: snap })
  return { events, consume }
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
      <BattleScene bosses={rpg.bosses} events={events} onConsumed={consume} tier={rpg.realm.tier} fog={rpg.debtFog} level={rpg.level} />
      <button onClick={onOpen} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-50 transition">
        <div className="px-lv">{rpg.level}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold truncate">{rpg.title}</span>
            <span className="text-xs text-slate-500 truncate">· {rpg.realm.name}</span>
          </div>
          <XpBar into={rpg.into} need={rpg.need} className="mt-1.5" />
        </div>
        {rpg.streak > 0 && <div className="flex items-center gap-0.5 text-orange-500 text-sm font-semibold"><Flame size={16} />{rpg.streak}</div>}
        <ChevronRight size={18} className="text-slate-400" />
      </button>
    </section>
  )
}
