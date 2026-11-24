import { Sparkles, Emo, EmoText } from './px'

/** five-axis radar, pure SVG, pixel-ish (square points) */
function Radar({ areas, size = 200 }) {
  const c = size / 2, r = size / 2 - 28, n = areas.length
  const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v] }
  const ring = (v) => areas.map((_, i) => pt(i, v).join(',')).join(' ')
  const shape = areas.map((a, i) => pt(i, a.score ?? 0).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} className="mx-auto block" data-testid="life-radar">
      {[0.25, 0.5, 0.75, 1].map((v) => <polygon key={v} points={ring(v)} fill="none" stroke="rgba(15,23,42,.12)" strokeWidth="1" />)}
      {areas.map((_, i) => { const [x, y] = pt(i, 1); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(15,23,42,.08)" /> })}
      <polygon points={shape} fill="rgba(20,184,166,.25)" stroke="#0d9488" strokeWidth="2" strokeLinejoin="round" />
      {areas.map((a, i) => { const [x, y] = pt(i, a.score ?? 0); return <rect key={a.id} x={x - 3} y={y - 3} width="6" height="6" fill={a.color} stroke="#1e293b" strokeWidth="1" /> })}
      {areas.map((a, i) => { const [x, y] = pt(i, 1.2); return <g key={a.id}><foreignObject x={x - 21} y={y - 8} width={16} height={16}><Emo e={a.emoji} size={16} /></foreignObject><text x={x + 6} y={y + 4} textAnchor="middle" fontSize="11" fill="currentColor">{a.score == null ? '—' : Math.round(a.score * 100)}</text></g> })}
    </svg>
  )
}

/** Status: the five life areas as "share of the plan kept", last 30 days */
export function LifeStatsCard({ rpg }) {
  const L = rpg.life
  return (
    <section className="px-card p-4" data-testid="life-stats">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-teal-600" />
        <h2 className="px-font text-[11px] tracking-wide flex-1">STATUS · ค่าพลัง 5 ด้านของชีวิต</h2>
      </div>
      <div className="text-[11px] text-slate-500 mb-2">คิดจากการทำตามเป้า 30 วันล่าสุด แต่ละเป้าเต็มที่ 100% ทำเกินไม่ได้คะแนนเพิ่ม{L.rest ? ` · ไม่นับวันพัก ${L.rest} วัน` : ''}</div>
      {!L.enough ? <div className="text-sm text-slate-500 py-4 text-center">ข้อมูลยังไม่พอ ลองบันทึกนิสัยหรือรายการสักสองสามวัน</div> : (
        <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-center">
          <Radar areas={L.areas} />
          <div className="space-y-2.5">
            {L.areas.map((a) => (
              <div key={a.id}>
                <div className="flex items-baseline gap-2 text-sm"><span><Emo e={a.emoji} size={16} /></span><span className="flex-1 font-semibold">{a.name}</span><span className="px-font text-[11px]">{a.score == null ? '—' : `${Math.round(a.score * 100)}%`}</span></div>
                <div className="px-seg mt-1">{Array.from({ length: 20 }, (_, i) => <span key={i} className={i < Math.round((a.score || 0) * 20) ? 'on' : ''} />)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                  {a.parts.map((p) => <span key={p.id}>{p.name} {p.pct == null ? 'ยังไม่ทราบ' : p.target ? `${p.count}/${p.target}` : `${Math.round(p.pct * 100)}%`}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const STAGE_LABEL = ['', 'ขั้น 1', 'ขั้น 2 · มีรัศมี', 'ขั้น 3 · ออร่าเต็มตัว']
/** one line under each party member: permanent growth stage and what opens the next */
export function GrowthLine({ rpg, id }) {
  const m = rpg.growth?.members?.[id]
  if (!m) return null
  return (
    <div className="mt-2 px-inner px-2.5 py-1.5 text-[11px] flex items-center gap-2" data-testid={`growth-${id}`}>
      <span className="px-font text-[8px] text-amber-600 shrink-0">{'★'.repeat(m.stage)}{'☆'.repeat(3 - m.stage)}</span>
      <span className="flex-1 min-w-0"><b>{m.title}</b> <span className="text-slate-500">{STAGE_LABEL[m.stage]}</span>{m.next && <span className="text-slate-500"> · ถัดไป: {m.next} ({m.pts}/{m.nextAt})</span>}</span>
    </div>
  )
}
