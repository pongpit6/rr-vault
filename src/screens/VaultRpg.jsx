import { Flame, Swords, Check, Lock, Trophy, ScrollText, Sparkles, MapPin } from 'lucide-react'
import BattleScene from '../components/BattleScene'
import { useBattleEvents, SpriteImg, XpBar } from '../components/RpgBits'
import { Avatar, Icon, Money } from '../components/ui'
import { useProfile } from '../store'
import { useRpg, REALMS } from '../lib/rpg'
import { money, compact } from '../lib/format'

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

export default function VaultRpg({ onAdd }) {
  const rpg = useRpg()
  const profile = useProfile()
  const { events, consume } = useBattleEvents(rpg)
  const groups = ['รายวัน', 'รายสัปดาห์', 'รายเดือน', 'เควสต์หลัก']
  const unlocked = rpg.achievements.filter((a) => a.unlockedAt || a.ready).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">Vault <span className="px-font text-sm text-teal-600 align-middle">RPG</span></h1>
        {rpg.streak > 0 && <div className="px-chip text-orange-600"><Flame size={14} /> {rpg.streak} วันติด</div>}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="space-y-5">
          {/* hero + battle */}
          <section className="px-card overflow-hidden">
            <BattleScene big bosses={rpg.bosses} events={events} onConsumed={consume} tier={rpg.realm.tier} fog={rpg.debtFog} level={rpg.level} />
            <div className="p-4 flex items-center gap-4">
              <div className="px-avatar"><Avatar size={64} ring={false} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{profile.name}</div>
                <div className="text-sm text-slate-500">{rpg.title} <span className="px-font text-[9px] text-slate-400">{rpg.titleEn.toUpperCase()}</span></div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="px-lv">{rpg.level}</div>
                  <div className="flex-1">
                    <XpBar into={rpg.into} need={rpg.need} />
                    <div className="px-font text-[9px] text-slate-500 mt-1">XP {rpg.into}/{rpg.need} · TOTAL {rpg.xp}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5"><MapPin size={13} /> ดินแดนปัจจุบัน: <b className="text-slate-800">{rpg.realm.name}</b></div>
              <div className="flex gap-1">
                {REALMS.map((r) => (
                  <div key={r.tier} className={`flex-1 h-2 ${r.tier <= rpg.realm.tier ? 'bg-teal-500' : 'bg-slate-200'}`} title={r.name} />
                ))}
              </div>
              {rpg.nextRealm && (
                <div className="text-[11px] text-slate-500 mt-1.5">
                  ดินแดนถัดไป “{rpg.nextRealm.name}” เมื่อมูลค่าสุทธิถึง <span className="num font-semibold">{money(rpg.nextRealm.min, { decimals: false })}</span>
                </div>
              )}
            </div>
          </section>

          {/* bosses */}
          <Section icon={Swords} title="BOSS · หนี้ที่ต้องปราบ">
            {rpg.bosses.length === 0 ? (
              <div className="text-sm text-slate-500 py-2">ยังไม่มีบอส ถ้ามีหนี้บัตรหรือเงินกู้ ให้ใส่ยอดในหน้า “กระเป๋า” แล้วบอสจะปรากฏ</div>
            ) : (
              <div className="space-y-3">
                {rpg.bosses.map((b) => (
                  <div key={b.id} className={`px-inner p-3 flex items-center gap-3 ${b.defeated ? 'opacity-70' : ''}`}>
                    <div className="w-16 h-16 grid place-items-center bg-sky-50 shrink-0 relative overflow-hidden">
                      <SpriteImg name={b.sprite} size={54} className={b.defeated ? 'grayscale' : ''} />
                      {b.defeated && <span className="px-stamp">DEFEATED</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{b.name}</span>
                        <span className="px-font text-[8px] text-rose-600">LV.{b.level}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{b.accName}</div>
                      <div className="px-hp mt-1.5"><div style={{ width: `${(b.hp / b.maxHp) * 100}%` }} /></div>
                      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                        <span>HP <Money value={b.hp} decimals={false} /></span>
                        <span>ดาเมจรวม <Money value={b.damage} decimals={false} /> · {b.hits} ครั้ง</span>
                      </div>
                    </div>
                    {b.active && (
                      <button onClick={() => onAdd({ kind: 'payment', to: b.id })} className="px-btn shrink-0" title="บันทึกชำระหนี้">
                        <Swords size={15} /><span className="hidden sm:inline">โจมตี</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* quests */}
          <Section icon={ScrollText} title="QUESTS · เควสต์">
            <div className="space-y-4">
              {groups.map((gname) => (
                <div key={gname}>
                  <div className="text-xs font-semibold text-slate-500 mb-2">{gname}</div>
                  <div className="space-y-2">
                    {rpg.quests.filter((q) => q.tier === gname).map((q) => (
                      <div key={q.name} className={`px-inner p-2.5 flex items-center gap-3 ${q.done ? 'bg-emerald-50' : ''}`}>
                        <div className={`w-6 h-6 grid place-items-center shrink-0 ${q.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {q.done ? <Check size={14} strokeWidth={3} /> : <span className="w-1.5 h-1.5 bg-current" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${q.done ? 'text-emerald-700' : ''}`}>{q.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="px-xp flex-1 !h-1.5"><div style={{ width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }} /></div>
                            <span className="text-[10px] text-slate-500 num shrink-0">
                              {q.money ? `${compact(q.progress)}/${compact(q.goal)}` : `${q.progress}${q.unit || ''}/${q.goal}${q.unit || ''}`}
                            </span>
                          </div>
                        </div>
                        <span className="px-font text-[8px] text-amber-600 shrink-0">+{q.xp}XP</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="space-y-5">
          {/* stats */}
          <Section icon={Sparkles} title="STATUS · ค่าสถานะ">
            <div className="space-y-3">
              {rpg.stats.map((st) => (
                <div key={st.key}>
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="px-font text-[10px] w-9 text-teal-700">{st.key}</span>
                    <span className="flex-1">{st.name}</span>
                    <span className="px-font text-[11px]">{st.value}</span>
                  </div>
                  <div className="px-seg mt-1">
                    {Array.from({ length: 20 }, (_, i) => <span key={i} className={i < Math.round(st.value / 5) ? 'on' : ''} />)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{st.hint}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* achievements */}
          <Section icon={Trophy} title="ACHIEVEMENTS" right={<span className="px-font text-[9px] text-slate-500">{unlocked}/{rpg.achievements.length}</span>}>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
              {rpg.achievements.map((a) => {
                const on = a.unlockedAt || a.ready
                return (
                  <div key={a.id} className={`px-inner p-2 text-center ${on ? '' : 'opacity-50'}`} title={a.desc}>
                    <div className={`mx-auto w-9 h-9 grid place-items-center ${on ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      {on ? <Icon name={a.icon} size={18} /> : <Lock size={15} />}
                    </div>
                    <div className="text-[11px] font-semibold mt-1.5 leading-tight">{a.name}</div>
                    <div className="text-[9px] text-slate-500 leading-tight mt-0.5">{a.desc}</div>
                  </div>
                )
              })}
            </div>
          </Section>

          {/* xp sources */}
          <Section icon={Sparkles} title="XP · ที่มาของค่าประสบการณ์">
            {rpg.xpParts.length ? (
              <div className="space-y-1.5 text-sm">
                {rpg.xpParts.map(([label, v]) => (
                  <div key={label} className="flex justify-between"><span className="text-slate-600">{label}</span><span className="px-font text-[10px] text-amber-600">+{v}</span></div>
                ))}
              </div>
            ) : <div className="text-sm text-slate-500">เริ่มบันทึกรายการเพื่อรับ XP แรก</div>}
            <div className="text-[11px] text-slate-400 mt-3 leading-relaxed">XP มาจากวินัยทางการเงิน ไม่ได้มาจากการใช้เงิน เลเวลจึงไม่ลดลงแม้ตลาดผันผวน</div>
          </Section>
        </div>
      </div>
    </div>
  )
}
