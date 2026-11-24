import { create } from 'zustand'
import { todayISO } from './format'

/* ---------- real weather (Open-Meteo, no key) for the town scene ---------- */
export const useWeather = create(() => ({ data: (() => { try { return JSON.parse(localStorage.getItem('vault:wx')) } catch { return null } })() }))
export async function loadWeather(lat, lon, force = false) {
  const cur = useWeather.getState().data
  if (!force && cur && cur.lat === lat && cur.lon === lon && Date.now() - cur.at < 20 * 60_000) return cur
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,is_day&daily=sunrise,sunset&timezone=Asia%2FBangkok&forecast_days=1`
    const j = await (await fetch(u)).json()
    const c = j.current || {}
    const d = {
      lat, lon, at: Date.now(), temp: c.temperature_2m, rain: c.precipitation || 0, code: c.weather_code ?? 0, cloud: c.cloud_cover ?? 0, wind: c.wind_speed_10m ?? 0,
      sunrise: j.daily?.sunrise?.[0]?.slice(11, 16) || '06:10', sunset: j.daily?.sunset?.[0]?.slice(11, 16) || '18:10',
    }
    useWeather.setState({ data: d })
    try { localStorage.setItem('vault:wx', JSON.stringify(d)) } catch { /* */ }
    return d
  } catch { return cur }
}
/** WMO code → scene weather. 'storm' is also what overspending looks like, so thunder shares it. */
export function sceneWeather(wx) {
  if (!wx) return null
  const c = wx.code
  if (c >= 95) return 'storm'
  if (c >= 51 || wx.rain > 0) return 'rain'
  if (c === 45 || c === 48) return 'fog'
  if (c === 3 || wx.cloud >= 80) return 'cloud'
  return 'sun'
}
export const weatherTH = (w) => ({ storm: 'ฝนฟ้าคะนอง', rain: 'ฝนตก', fog: 'หมอกลง', cloud: 'เมฆมาก', sun: 'แดดดี', leaves: 'ลมหนาว' }[w] || w)

/* ---------- Thai calendar: festivals the town dresses up for ---------- */
// Lunar festivals move every year; dates are listed for the years ahead (Loy Krathong = 12th lunar full moon).
const LUNAR = {
  cny: { 2025: '01-29', 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03' },
  loy: { 2025: '11-05', 2026: '11-24', 2027: '11-13', 2028: '11-02', 2029: '11-21', 2030: '11-10' },
  phansa: { 2025: '07-11', 2026: '07-30', 2027: '07-19', 2028: '07-08', 2029: '06-27', 2030: '07-16' },
}
const md = (iso) => iso.slice(5)
const between = (m, a, b) => (a <= b ? m >= a && m <= b : m >= a || m <= b)
const near = (iso, mmdd, before, after) => {
  if (!mmdd) return false
  const y = +iso.slice(0, 4), t = new Date(`${y}-${mmdd}T12:00:00`), d = new Date(iso + 'T12:00:00')
  const diff = Math.round((d - t) / 86400000)
  return diff >= -before && diff <= after
}
export const EVENTS = {
  newyear: { name: 'ปีใหม่', emoji: '🎆', line: 'โคมไฟและพลุ · ปีใหม่ เริ่มออมใหม่', bonus: 'เควสต์รายวันให้ FIAT ×2' },
  cny: { name: 'ตรุษจีน', emoji: '🧧', line: 'โคมแดงทั่วเมือง · เปิดอั่งเปาที่หีบ', bonus: 'หีบรายวันมีโอกาสได้ GOLD' },
  songkran: { name: 'สงกรานต์', emoji: '💦', line: 'สาดน้ำในเมือง · วันไม่ใช้เงินได้ ×2', bonus: 'วันไม่ใช้เงิน FIAT ×2' },
  phansa: { name: 'เข้าพรรษา', emoji: '🪷', line: 'เดือนงดฟุ่มเฟือย · ไม่เกินงบได้โบนัส', bonus: 'สัปดาห์ที่ไม่เกินงบ +1 GOLD' },
  loy: { name: 'ลอยกระทง', emoji: '🪷', line: 'ร้านกระทงเปิดริมถนน โคมลอยขึ้นฟ้ายามค่ำ', bonus: 'ของตกแต่ง \"แท่นกระทงดาวเรือง\" ซื้อได้เฉพาะช่วงนี้' },
  xmas: { name: 'ส่งท้ายปี', emoji: '🎄', line: 'ตลาดคริสต์มาสในเมือง · สรุปปีของคุณ', bonus: 'เก็บรายได้เมือง ×1.5' },
  payday: { name: 'วันตลาดนัด', emoji: '🏪', line: 'เงินเดือนออก ตลาดนัดมาเยือน · แบ่งเงินตามแผนก่อนใช้', bonus: 'ร้านค้าลด 10%' },
}
export function thaiEvent(iso = todayISO(), payday) {
  const y = +iso.slice(0, 4), m = md(iso)
  if (between(m, '12-29', '01-03')) return { id: 'newyear', ...EVENTS.newyear }
  if (near(iso, LUNAR.cny[y], 2, 3)) return { id: 'cny', ...EVENTS.cny }
  if (between(m, '04-12', '04-16')) return { id: 'songkran', ...EVENTS.songkran }
  if (near(iso, LUNAR.loy[y], 3, 1)) return { id: 'loy', ...EVENTS.loy }
  if (between(m, '12-18', '12-28')) return { id: 'xmas', ...EVENTS.xmas }
  if (near(iso, LUNAR.phansa[y], 0, 30)) return { id: 'phansa', ...EVENTS.phansa }
  if (payday?.day && +iso.slice(8, 10) === Math.min(payday.day, new Date(y, +iso.slice(5, 7), 0).getDate())) return { id: 'payday', ...EVENTS.payday }
  return null
}
/** Thai public holidays (fixed-date ones): NPCs take the day off. */
export function isThaiHoliday(iso = todayISO()) {
  const y = +iso.slice(0, 4), m = md(iso)
  const fixed = ['01-01', '04-06', '04-13', '04-14', '04-15', '05-01', '05-04', '06-03', '07-28', '08-12', '10-13', '10-23', '12-05', '12-10', '12-31']
  return fixed.includes(m) || near(iso, LUNAR.phansa[y], 1, 0) || near(iso, LUNAR.cny[y], 0, 0)
}

/* ---------- money mood: what the town feels like this month ---------- */
export function moneyMood({ budgets = [], rank, overspend = false }) {
  const over = budgets.filter((b) => b.status === 'over').length
  if (overspend || over >= 2) return { id: 'gloom', name: 'ครึ้ม', line: 'ใช้เกินงบ เมฆปกคลุมเมือง' }
  if (over === 1) return { id: 'cloudy', name: 'มีเมฆ', line: 'มีหมวดที่เกินงบ 1 หมวด' }
  if (rank && rank.ratio >= 0.2) return { id: 'bloom', name: 'ดอกไม้บาน', line: 'ออมได้ตามเป้า ดอกไม้บานทั่วเมือง' }
  return { id: 'calm', name: 'สงบ', line: '' }
}
