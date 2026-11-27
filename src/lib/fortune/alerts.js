/* Daily fortune alerts (loaded lazily): BaZi events today / tomorrow, a มหาทักษา sub-period change within 3 days, the tarot card not drawn yet. */
import { natal, dayIdx, pillarName, rate, RATE, GOD_TH, ZODIAC } from './bazi'
import { eventsOf } from './baziReact'
import { taksaAt, bkkMs, birthPlanet, possiblePlanets, PLANET } from './taksa'
const bkkDate = (ms = Date.now()) => new Date(ms + 7 * 3600e3).toISOString().slice(0, 10)

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
  if (!fortune?.tarot?.[day] && h >= 7) out.push({ key: `tr:${day}`, title: 'ยังไม่ได้จั่วไพ่วันนี้', body: "จั่วไพ่ที่เมนูดวงชะตา › ไพ่ยิปซี เพื่ออ่านธีมประจำวันและรับโบนัสการล่าตามใบที่จั่ว" })
  return out
}

/** the 06:00 morning push: today's day pillar and rating, the biggest events, the มหาทักษา sub period, and the tarot nudge */
export function morningDigest(fortune, now = Date.now()) {
  const b = fortune?.birth
  if (!b?.date) return { title: 'ดวงวันนี้', body: "ใส่ข้อมูลเกิดในเมนูดวงชะตาเพื่ออ่านธีมตามผังตอนเช้า และจั่วไพ่ประจำวันได้" }
  const d = new Date(now + 7 * 3600e3), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate()
  const N = natal(b), c = dayIdx(y, m, dd), r = rate(N, c, { label: 'วัน' })
  const ev = eventsOf(N, c, 'วัน').filter((e) => e.rank >= 5)
  const bms = bkkMs(b.date, b.unknownTime ? '12:00' : b.time), opts = b.unknownTime ? possiblePlanets(b.date) : null
  const at = taksaAt(bms, now, opts ? (opts.includes(b.planet) ? b.planet : opts[0]) : birthPlanet(bms))
  const lines = []
  if (ev.length) lines.push(ev.slice(0, 2).map((e) => `${e.title}: ${e.text}`).join(' / '))
  else lines.push(`วัน${GOD_TH[r.god]}`)
  if (at) lines.push(`${PLANET[at.main.planet].name}เสวย · ${PLANET[at.sub.planet].name}แทรก`)
  lines.push('จั่วไพ่ประจำวันได้แล้ว')
  return { title: `ดวงวันนี้ ${pillarName(c)} (${ZODIAC[c % 12]}) · ${RATE[r.lvl].th}`, body: lines.join(' · ') }
}
