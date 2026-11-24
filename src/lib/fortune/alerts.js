/* Daily fortune alerts (loaded lazily): BaZi events today / tomorrow, a มหาทักษา sub-period change within 3 days, the tarot card not drawn yet. */
import { natal, dayIdx, pillarName } from './bazi'
import { eventsOf } from './baziReact'
import { taksaAt, bkkMs, birthPlanet, possiblePlanets, PLANET } from './taksa'
import { bkkDate } from './tarot'

export function fortuneAlerts(fortune, now = Date.now()) {
  const b = fortune?.birth, out = [], day = bkkDate(now)
  const p = (ms) => { const d = new Date(ms + 7 * 3600e3); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()] }
  if (b?.date) {
    const N = natal(b)
    const [y, m, d] = p(now), c = dayIdx(y, m, d)
    const ev = eventsOf(N, c, 'วัน').filter((e) => e.rank >= 5)
    if (ev.length) out.push({ key: `fz:${day}`, title: `ดวงวันนี้ ${pillarName(c)}: ${ev.map((e) => e.title).join(' · ')}`, body: ev[0].text })
    const [y2, m2, d2] = p(now + 864e5), c2 = dayIdx(y2, m2, d2)
    const ev2 = eventsOf(N, c2, 'วัน').filter((e) => e.rank >= 8)
    if (ev2.length) out.push({ key: `fz1:${day}`, title: `พรุ่งนี้: ${ev2.map((e) => e.title).join(' · ')}`, body: ev2[0].text })
    const bms = bkkMs(b.date, b.unknownTime ? '12:00' : b.time)
    const opts = b.unknownTime ? possiblePlanets(b.date) : null
    const at = taksaAt(bms, now, opts ? (opts.includes(b.planet) ? b.planet : opts[0]) : birthPlanet(bms))
    if (at && at.sub.end - now < 3 * 864e5) {
      const dd = Math.max(0, Math.ceil((at.sub.end - now) / 864e5))
      out.push({ key: `tk:${at.sub.end}`, title: `ดาวแทรกจะเปลี่ยน${dd ? `ในอีก ${dd} วัน` : 'วันนี้'}`, body: `${PLANET[at.main.planet].name}เสวย · จาก${PLANET[at.sub.planet].name}แทรก เป็น${PLANET[at.next.planet].name}แทรก` })
    }
  }
  const h = new Date(now + 7 * 3600e3).getUTCHours()
  if (!fortune?.tarot?.[day] && h >= 7) out.push({ key: `tr:${day}`, title: 'ยังไม่ได้จั่วไพ่วันนี้', body: 'จั่วไพ่ที่เมนูดวงชะตา › ไพ่ยิปซี ไพ่ดีช่วยเพิ่มพลังการล่าทั้งวัน' })
  return out
}
