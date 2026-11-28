/* BaZi (子平) engine — rules from BaZi_ZiPing_Complete_Handbook_TH:
   year changes at 立春, month at the 12 節 (instants from lunar-javascript, UTC+8), day changes at 23:00 local,
   day pillar = JDN continuous count (1949-10-01 = 甲子), hour stem by 五鼠遁. Local clock = Asia/Bangkok standard time. */
import LJ from 'lunar-javascript'

export const STEMS = '甲乙丙丁戊己庚辛壬癸'
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
export const STEM_TH = ['ไม้หยาง', 'ไม้หยิน', 'ไฟหยาง', 'ไฟหยิน', 'ดินหยาง', 'ดินหยิน', 'ทองหยาง', 'ทองหยิน', 'น้ำหยาง', 'น้ำหยิน']
export const STEM_PIN = ['เจี่ย', 'อี่', 'ปิ่ง', 'ติง', 'อู้', 'จี่', 'เกิง', 'ซิน', 'เหริน', 'กุ่ย']
export const BRANCH_PIN = ['จื่อ', 'โฉ่ว', 'อิ๋น', 'เหม่า', 'เฉิน', 'ซื่อ', 'อู่', 'เว่ย', 'เซิน', 'โหย่ว', 'ซวี', 'ไฮ่']
export const ZODIAC = ['ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง', 'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน']
export const ZODIAC_ICON = ['zd_rat', 'zd_ox', 'zd_tiger', 'zd_rabbit', 'zd_dragon', 'zd_snake', 'zd_horse', 'zd_goat', 'zd_monkey', 'zd_rooster', 'zd_dog', 'zd_pig']
export const EL = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'] // wood fire earth metal water = 0..4
export const EL_ICON = ['el_wood', 'el_fire', 'el_earth', 'el_metal', 'el_water']
export const EL_COLOR = ['#16a34a', '#dc2626', '#a16207', '#64748b', '#2563eb']
export const stemEl = (s) => Math.floor(s / 2)
export const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]
export const BRANCH_YANG = (b) => b % 2 === 0
export const HIDDEN = [[9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 4, 6], [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0]]
export const HOURS = ['23:00–00:59', '01:00–02:59', '03:00–04:59', '05:00–06:59', '07:00–08:59', '09:00–10:59', '11:00–12:59', '13:00–14:59', '15:00–16:59', '17:00–18:59', '19:00–20:59', '21:00–22:59']

const mod = (a, n) => ((a % n) + n) % n
export const pillarName = (c) => STEMS[c % 10] + BRANCHES[c % 12]
export const pillarIdx = (s, b) => { for (let c = 0; c < 60; c++) if (c % 10 === s && c % 12 === b) return c; return -1 }

/* ---------- calendar ---------- */
const TZ = 7 * 3600e3
export const jdn = (Y, M, d) => { const a = Math.floor((14 - M) / 12), y = Y + 4800 - a, m = M + 12 * a - 3; return d + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 }
/** day pillar index of a calendar date */
export const dayIdx = (Y, M, d) => mod(jdn(Y, M, d) + 49, 60)

// the 12 節 (month starts): lunar-javascript names → month branch
const JIE = { 小寒: 1, XIAO_HAN: 1, 立春: 2, LI_CHUN: 2, 惊蛰: 3, JING_ZHE: 3, 清明: 4, QING_MING: 4, 立夏: 5, LI_XIA: 5, 芒种: 6, MANG_ZHONG: 6, 小暑: 7, XIAO_SHU: 7, 立秋: 8, LI_QIU: 8, 白露: 9, BAI_LU: 9, 寒露: 10, HAN_LU: 10, 立冬: 11, LI_DONG: 11, 大雪: 0, DA_XUE: 0 }
const jieCache = {}
/** all 節 instants (ms, UTC) touching Gregorian year y, sorted */
export function jieOf(y) {
  if (jieCache[y]) return jieCache[y]
  const seen = new Map()
  for (const yy of [y - 1, y, y + 1]) {
    const t = LJ.Solar.fromYmd(yy, 6, 1).getLunar().getJieQiTable()
    for (const [k, s] of Object.entries(t)) if (k in JIE) { const ms = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - 8 * 3600e3; seen.set(ms, { ms, branch: JIE[k], name: k }) }
  }
  return (jieCache[y] = [...seen.values()].sort((a, b) => a.ms - b.ms))
}
const lastJie = (ms) => { const y = new Date(ms + TZ).getUTCFullYear(); const l = [...jieOf(y - 1), ...jieOf(y)].filter((j) => j.ms <= ms).sort((a, b) => a.ms - b.ms); return l[l.length - 1] }
const nextJie = (ms) => { const y = new Date(ms + TZ).getUTCFullYear(); return [...jieOf(y), ...jieOf(y + 1)].filter((j) => j.ms > ms).sort((a, b) => a.ms - b.ms)[0] }
const lichun = (y) => jieOf(y).find((j) => j.branch === 2 && new Date(j.ms + TZ).getUTCFullYear() === y).ms

/** four pillars at instant ms (Bangkok clock). hourKnown=false leaves the hour pillar out */
export function pillarsAt(ms, hourKnown = true) {
  const p = new Date(ms + TZ), Y = p.getUTCFullYear(), H = p.getUTCHours(), Mi = p.getUTCMinutes()
  const yEff = ms >= lichun(Y) ? Y : Y - 1
  const year = mod(yEff - 4, 60)
  const j = lastJie(ms), m = mod(j.branch - 2, 12)
  const month = pillarIdx(mod(2 * mod(year % 10, 5) + 2 + m, 10), j.branch)
  const dd = new Date(ms + TZ + (H >= 23 ? 3600e3 : 0)) // 23:00 rule: the new day starts
  const day = dayIdx(dd.getUTCFullYear(), dd.getUTCMonth() + 1, dd.getUTCDate())
  const h = mod(Math.floor((H * 60 + Mi + 60) / 120), 12)
  const hour = hourKnown ? pillarIdx(mod(2 * mod(day % 10, 5) + h, 10), h) : null
  return { year, month, day, hour, yEff }
}
export const bkk = (date, time = '12:00') => Date.parse(`${date}T${time}:00+07:00`)

/* ---------- ten gods ---------- */
export const GOD = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印']
export const GOD_TH = ['เพื่อนร่วมทาง', 'คู่แข่งแย่งทรัพย์', 'ผลงานรื่นรมย์', 'ความคิดขบถ', 'ลาภนอก', 'ทรัพย์ประจำ', 'แรงกดดัน', 'ยศและกติกา', 'ความรู้แปลก', 'ผู้อุปถัมภ์']
/** ten god of stem t seen from day master dm */
export function godOf(dm, t) {
  const a = stemEl(dm), b = stemEl(t), same = dm % 2 === t % 2, d = mod(b - a, 5)
  const g = d === 0 ? 0 : d === 1 ? 2 : d === 2 ? 4 : d === 3 ? 6 : 8
  return g + (same ? 0 : 1)
}
/** element relation of x to the day master: 0 companion 1 output 2 wealth 3 officer 4 resource */
export const roleOf = (dmEl, x) => mod(x - dmEl, 5)
export const ROLE_TH = ['ธาตุเดียวกับคุณ (เพื่อน)', 'ธาตุที่คุณให้กำเนิด (ผลงาน)', 'ธาตุที่คุณคุม (ทรัพย์)', 'ธาตุที่คุมคุณ (อำนาจ)', 'ธาตุที่ให้กำเนิดคุณ (ผู้หนุน)']

/* ---------- 12 stages, nayin, void ---------- */
const STAGE = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養']
export const STAGE_TH = ['เกิด', 'อาบน้ำ', 'สวมมงกุฎ', 'รับราชการ', 'รุ่งเรืองสุด', 'ถดถอย', 'อ่อนแรง', 'หมดแรง', 'เก็บสะสม', 'ตัดขาด', 'ปฏิสนธิ', 'บ่มเพาะ']
const BIRTH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]
export const stageOf = (s, b) => { const i = s % 2 === 0 ? mod(b - BIRTH[s], 12) : mod(BIRTH[s] - b, 12); return { zh: STAGE[i], th: STAGE_TH[i], i } }
const NAYIN = '海中金 爐中火 大林木 路旁土 劍鋒金 山頭火 澗下水 城頭土 白蠟金 楊柳木 泉中水 屋上土 霹靂火 松柏木 長流水 沙中金 山下火 平地木 壁上土 金箔金 覆燈火 天河水 大驛土 釵釧金 桑柘木 大溪水 沙中土 天上火 石榴木 大海水'.split(' ')
const NAYIN_TH = 'ทองในทะเล ไฟในเตา ไม้ป่าใหญ่ ดินริมทาง ทองคมดาบ ไฟบนภูเขา น้ำในลำธาร ดินบนกำแพงเมือง ทองขี้ผึ้งขาว ไม้หลิว น้ำในบ่อ ดินบนหลังคา ไฟฟ้าผ่า ไม้สนไซเปรส น้ำไหลยาว ทองในทราย ไฟเชิงเขา ไม้ที่ราบ ดินบนผนัง ทองแผ่นเปลว ไฟตะเกียง น้ำบนฟ้า ดินทางหลวง ทองกำไล ไม้หม่อน น้ำลำห้วยใหญ่ ดินในทราย ไฟบนฟ้า ไม้ทับทิม น้ำมหาสมุทร'.split(' ')
export const nayinOf = (c) => ({ zh: NAYIN[Math.floor(c / 2)], th: NAYIN_TH[Math.floor(c / 2)] })
export const voidOf = (c) => { const q = Math.floor(c / 10); return [mod(10 - 2 * q, 12), mod(11 - 2 * q, 12)] }

/* ---------- relations ---------- */
const pairKey = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`)
const STEM_HE = { '0,5': 2, '1,6': 3, '2,7': 4, '3,8': 0, '4,9': 1 } // pair → target element
const STEM_CHONG = new Set(['0,6', '1,7', '2,8', '3,9'])
const LIUHE = { '0,1': 'ดิน', '2,11': 'ไม้', '3,10': 'ไฟ', '4,9': 'ทอง', '5,8': 'น้ำ', '6,7': 'ไฟ/ดิน' }
const HAI = new Set(['0,7', '1,6', '2,5', '3,4', '8,11', '9,10'])
const PO = new Set(['0,9', '3,6', '1,4', '7,10', '2,11', '5,8'])
const SANHE = [[[8, 0, 4], 4], [[11, 3, 7], 0], [[2, 6, 10], 1], [[5, 9, 1], 3]]
const SANHUI = [[[2, 3, 4], 0], [[5, 6, 7], 1], [[8, 9, 10], 3], [[11, 0, 1], 4]]
const XING3 = [[2, 5, 8], [1, 10, 7]]
const SELF_XING = new Set([4, 6, 9, 11])
/** relations between two branches (as Thai labels with good/bad weight) */
export function branchRel(a, b) {
  const out = [], k = pairKey(a, b)
  if (a !== b && mod(b - a, 12) === 6) out.push({ t: 'ชง', zh: '沖', w: -2 })
  if (LIUHE[k]) out.push({ t: `รวม (หกประสาน${LIUHE[k]})`, zh: '六合', w: 1.5 })
  for (const [g, e] of SANHE) if (a !== b && g.includes(a) && g.includes(b)) out.push({ t: `ครึ่งสามประสาน${EL[e]}`, zh: '半合', w: 1 })
  for (const [g, e] of SANHUI) if (a !== b && g.includes(a) && g.includes(b)) out.push({ t: `รวมทิศ${EL[e]}`, zh: '會', w: 0.5 })
  if (HAI.has(k)) out.push({ t: 'ให้โทษ', zh: '害', w: -1 })
  if (PO.has(k)) out.push({ t: 'แตก', zh: '破', w: -0.5 })
  if (k === '0,3') out.push({ t: 'ลงโทษ', zh: '刑', w: -1 })
  for (const g of XING3) if (a !== b && g.includes(a) && g.includes(b)) out.push({ t: 'ลงโทษบางส่วน', zh: '刑', w: -1 })
  if (a === b && SELF_XING.has(a)) out.push({ t: 'ลงโทษตัวเอง', zh: '自刑', w: -0.5 })
  return out
}
export function stemRel(a, b) {
  const k = pairKey(a, b), out = []
  if (k in STEM_HE) out.push({ t: `รวม (แปร${EL[STEM_HE[k]]})`, zh: '合', w: 1 })
  if (STEM_CHONG.has(k)) out.push({ t: 'ชง', zh: '沖', w: -1 })
  return out
}
/** full groups (三合 / 三會 / 三刑) present in a list of branches */
export function groups(bs) {
  const has = (g) => g.every((x) => bs.includes(x)), out = []
  for (const [g, e] of SANHE) if (has(g)) out.push(`สามประสาน${EL[e]} (${g.map((x) => BRANCHES[x]).join('')})`)
  for (const [g, e] of SANHUI) if (has(g)) out.push(`รวมทิศ${EL[e]} (${g.map((x) => BRANCHES[x]).join('')})`)
  for (const g of XING3) if (has(g)) out.push(`ลงโทษครบกลุ่ม (${g.map((x) => BRANCHES[x]).join('')})`)
  return out
}

/* ---------- symbolic stars (base: day master / day branch) ---------- */
const NOBLE = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [3, 5], [3, 5]]
const WENCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3]
const LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0]
const YANGREN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }
const grp = (b) => [[8, 0, 4], [2, 6, 10], [11, 3, 7], [5, 9, 1]].findIndex((g) => g.includes(b))
const TAOHUA = [9, 3, 0, 6], YIMA = [2, 8, 5, 11], HUAGAI = [4, 10, 7, 1], JIANGXING = [0, 6, 3, 9]
export function starsOn(dm, dayBranch, b) {
  const s = [], g = grp(dayBranch)
  if (NOBLE[dm].includes(b)) s.push({ zh: '天乙貴人', th: 'ดาวอุปถัมภ์', w: 1 })
  if (WENCHANG[dm] === b) s.push({ zh: '文昌', th: 'ดาวปัญญา', w: 0.5 })
  if (LU[dm] === b) s.push({ zh: '祿', th: 'ดาวลาภยศ', w: 0.5 })
  if (YANGREN[dm] === b) s.push({ zh: '羊刃', th: 'ดาบคม (แรงเกิน)', w: -0.5 })
  if (TAOHUA[g] === b) s.push({ zh: '桃花', th: 'ดาวเสน่ห์', w: 0.3 })
  if (YIMA[g] === b) s.push({ zh: '驛馬', th: 'ดาวเดินทาง', w: 0 })
  if (HUAGAI[g] === b) s.push({ zh: '華蓋', th: 'ดาวศิลป์/สันโดษ', w: 0 })
  if (JIANGXING[g] === b) s.push({ zh: '將星', th: 'ดาวผู้นำ', w: 0.3 })
  return s
}

/* ---------- the natal chart ---------- */
const SEASON = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4] // month branch → ruling element (辰戌丑未 = earth)
/** 旺相休囚死 of element e in a month ruled by element r: 2 旺, 1 相, 0 休, -1 囚, -2 死 */
const seasonState = (e, r) => ({ 0: 2, 1: 1, 4: 0, 3: -1, 2: -2 })[mod(e - r, 5)]
export const SEASON_TH = { 2: 'ได้ฤดู (旺)', 1: 'ฤดูหนุน (相)', 0: 'ฤดูพัก (休)', '-1': 'ฤดูจำกัด (囚)', '-2': 'เสียฤดู (死)' }

export function natal(birth) {
  const known = !birth.unknownTime && /^\d{2}:\d{2}$/.test(birth.time || '')
  const ms = bkk(birth.date, known ? birth.time : '12:00')
  const P = pillarsAt(ms, known)
  const list = [['year', 'ปี', P.year], ['month', 'เดือน', P.month], ['day', 'วัน', P.day], ['hour', 'เวลา', P.hour]].filter((x) => x[2] != null)
  const dm = P.day % 10, dmEl = stemEl(dm), dayB = P.day % 12, monthB = P.month % 12
  const pillars = list.map(([key, th, c]) => {
    const s = c % 10, b = c % 12
    return { key, th, c, s, b, name: pillarName(c), god: key === 'day' ? null : godOf(dm, s), hidden: HIDDEN[b].map((h) => ({ s: h, god: godOf(dm, h) })), nayin: nayinOf(c), stage: stageOf(dm, b), stars: starsOn(dm, dayB, b), void: voidOf(P.day).includes(b) && key !== 'day' }
  })
  // relations inside the chart
  const rels = []
  for (let i = 0; i < pillars.length; i++) for (let j = i + 1; j < pillars.length; j++) {
    const a = pillars[i], b = pillars[j]
    for (const r of stemRel(a.s, b.s)) rels.push({ a: a.key, b: b.key, lv: 'ก้าน', txt: `${STEMS[a.s]}(${a.th})–${STEMS[b.s]}(${b.th}) ${r.t}`, w: r.w })
    for (const r of branchRel(a.b, b.b)) rels.push({ a: a.key, b: b.key, lv: 'กิ่ง', txt: `${BRANCHES[a.b]}(${a.th})–${BRANCHES[b.b]}(${b.th}) ${r.t}`, w: r.w })
  }
  const grps = groups(pillars.map((p) => p.b))
  // strength model (this app's model, shown with its evidence): season + roots + support − drain
  const ev = [], season = seasonState(dmEl, SEASON[monthB])
  let score = season * 1.5
  ev.push(`เกิดเดือน${BRANCHES[monthB]} ฤดู${EL[SEASON[monthB]]}: ${SEASON_TH[season]} (${season * 1.5 >= 0 ? '+' : ''}${season * 1.5})`)
  for (const p of pillars) {
    p.hidden.forEach((h, i) => {
      if (stemEl(h.s) !== dmEl && roleOf(dmEl, stemEl(h.s)) !== 4) return
      const root = stemEl(h.s) === dmEl, w = (i === 0 ? 1 : 0.5) * (p.key === 'month' ? 1.5 : 1) * (root ? 1 : 0.6)
      score += w; ev.push(`${root ? 'ราก' : 'ผู้หนุนแฝง'} ${STEMS[h.s]} ในกิ่ง${p.th} ${BRANCHES[p.b]} (+${Math.round(w * 10) / 10})`)
    })
    if (p.key === 'day') continue
    const r = roleOf(dmEl, stemEl(p.s))
    if (r === 0 || r === 4) { score += 1; ev.push(`ก้าน${p.th} ${STEMS[p.s]} ${r === 0 ? 'เป็นพวก' : 'ให้กำเนิด'}คุณ (+1)`) }
    else { score -= 1; ev.push(`ก้าน${p.th} ${STEMS[p.s]} ${['', 'ดึงพลังไปเป็นผลงาน', 'ใช้แรงคุมทรัพย์', 'คุมคุณ'][r]} (−1)`) }
  }
  score = Math.round(score * 10) / 10
  const strength = score >= 3.5 ? 'strong' : score <= 0.5 ? 'weak' : 'balanced'
  // favorable elements: support a weak day master, drain/use a strong one; adjust for cold/hot birth months
  const E = (r) => mod(dmEl + r, 5)
  let fav = strength === 'weak' ? [E(4), E(0)] : strength === 'strong' ? [E(1), E(2), E(3)] : [E(1), E(2)]
  let unfav = strength === 'weak' ? [E(3), E(2)] : strength === 'strong' ? [E(4), E(0)] : [E(3)]
  const cold = [11, 0, 1].includes(monthB), hot = [5, 6, 7].includes(monthB)
  if (cold && !fav.includes(1)) { fav = [...fav, 1]; unfav = unfav.filter((x) => x !== 1) }
  if (hot && !fav.includes(4)) { fav = [...fav, 4]; unfav = unfav.filter((x) => x !== 4) }
  // structure from the month: main hidden stem's god (建祿/月劫 when it is the day master's own element)
  const mh = HIDDEN[monthB][0], mg = godOf(dm, mh)
  const structure = mg <= 1 ? (mg === 0 ? '建祿格' : '月劫格') : ['', '', '食神格', '傷官格', '偏財格', '正財格', '七殺格', '正官格', '偏印格', '正印格'][mg]
  // element count (stems 1, branch main 1, other hidden 0.3)
  const count = [0, 0, 0, 0, 0]
  for (const p of pillars) { count[stemEl(p.s)] += 1; p.hidden.forEach((h, i) => { count[stemEl(h.s)] += i === 0 ? 1 : 0.3 }) }
  return { ms, known, P, pillars, dm, dmEl, dayB, monthB, yearB: P.year % 12, rels, groups: grps, score, strength, ev, fav: [...new Set(fav)], unfav: [...new Set(unfav)], cold, hot, structure, structGod: mg, count: count.map((x) => Math.round(x * 10) / 10) }
}

/* ---------- rating a day / hour / year / luck pillar against the chart ---------- */
export const RATE = [
  { th: "ควรใส่ใจมาก", color: '#dc2626' }, { th: 'ระวัง', color: '#f97316' }, { th: 'กลาง ๆ', color: '#94a3b8' }, { th: 'ดี', color: '#0ea5e9' }, { th: 'ดีมาก', color: '#16a34a' },
]
const elWord = (N, e) => (N.fav.includes(e) ? 'หนุนผัง' : N.unfav.includes(e) ? 'เพิ่มแรงกดให้ผัง' : 'ไม่เพิ่มหรือลดคะแนนส่วนนี้')
/** score pillar c against the chart. ctx: extra branch (e.g. the day's branch when rating an hour) */
export function rate(N, c, { against = null, label = '' } = {}) {
  const s = c % 10, b = c % 12, why = []
  let sc = 0
  const se = stemEl(s), be = BRANCH_EL[b]
  const ws = N.fav.includes(se) ? 2 : N.unfav.includes(se) ? -2 : 0
  sc += ws; why.push({ w: ws, t: `${GOD_TH[godOf(N.dm, s)]} (${GOD[godOf(N.dm, s)]}) เป็นบทบาทของก้าน${label} ${STEMS[s]} และธาตุ${EL[se]}${elWord(N, se)}` })
  const wb = N.fav.includes(be) ? 1.5 : N.unfav.includes(be) ? -1.5 : 0
  sc += wb; why.push({ w: wb, t: `ธาตุ${EL[be]}${elWord(N, be)} มาจากกิ่ง${label} ${BRANCHES[b]} (${ZODIAC[b]})` })
  const targets = [...N.pillars.map((p) => ({ b: p.b, th: `กิ่ง${p.th}เกิด`, k: p.key })), ...(against != null ? [{ b: against, th: 'กิ่งของวันนั้น', k: 'ctx' }] : [])]
  for (const t of targets) for (const r of branchRel(b, t.b)) {
    const w = r.w * (t.k === 'day' ? 1.2 : t.k === 'ctx' ? 0.6 : t.k === 'year' ? 0.8 : 0.5)
    sc += w; why.push({ w, t: `${r.t} เมื่อเทียบกิ่ง ${BRANCHES[b]} กับ ${BRANCHES[t.b]} ใน${t.th}` })
  }
  const dms = stemRel(s, N.dm)
  for (const r of dms) { sc += r.w * 0.8; why.push({ w: r.w * 0.8, t: `${r.t} ระหว่างอักษรบน ${STEMS[s]} กับดิถี ${STEMS[N.dm]}` }) }
  for (const st of starsOn(N.dm, N.dayB, b)) if (st.w) { sc += st.w; why.push({ w: st.w, t: `${st.th} (${st.zh}) ขึ้นจากกิ่ง ${BRANCHES[b]}` }) }
  sc = Math.round(sc * 10) / 10
  const lvl = sc >= 3.8 ? 4 : sc >= 1.5 ? 3 : sc > -1 ? 2 : sc > -2.8 ? 1 : 0
  return { score: sc, lvl, why: why.filter((x) => x.w !== 0 || x.t.includes('ก้าน')), god: godOf(N.dm, s) }
}
/** 12 two-hour pillars of a calendar day (the 子 hour starts at 23:00 of the previous evening; listed in clock order 00:00 → 23:00) */
export function hoursOf(N, y, m, d) {
  const day = dayIdx(y, m, d), s0 = day % 10, out = []
  for (let h = 0; h < 12; h++) {
    const c = pillarIdx(mod(2 * mod(s0, 5) + h, 10), h)
    out.push({ h, c, label: h === 0 ? '00:00–00:59' : HOURS[h], ...rate(N, c, { against: day % 12, label: 'ยาม' }) })
  }
  // 23:00–23:59 belongs to the next day's 子 hour
  const nd = mod(day + 1, 60), c23 = pillarIdx(mod(2 * mod(nd % 10, 5), 10), 0)
  out.push({ h: 12, c: c23, label: '23:00–23:59', late: true, ...rate(N, c23, { against: nd % 12, label: 'ยาม' }) })
  return out
}

/* ---------- luck pillars ---------- */
export function luckPillars(N, sex) {
  if (!sex || !N.known) return null
  const yang = N.P.year % 2 === 0, fwd = (sex === 'm') === yang, dir = fwd ? 1 : -1
  const t = fwd ? nextJie(N.ms).ms - N.ms : N.ms - lastJie(N.ms).ms
  const ageDays = t / 1000 / 720 // 3 real days = 1 year (360-day symbolic year)
  const y = Math.floor(ageDays / 360), mo = Math.floor((ageDays % 360) / 30), dd = Math.floor(ageDays % 30)
  const st = new Date(N.ms + TZ); st.setUTCFullYear(st.getUTCFullYear() + y); st.setUTCMonth(st.getUTCMonth() + mo); st.setUTCDate(st.getUTCDate() + dd)
  const startMs = st.getTime() - TZ + (ageDays - Math.floor(ageDays)) * 864e5, out = []
  for (let k = 1; k <= 9; k++) {
    const c = mod(N.P.month + dir * k, 60), from = new Date(startMs + TZ); from.setUTCFullYear(from.getUTCFullYear() + (k - 1) * 10)
    const to = new Date(from.getTime()); to.setUTCFullYear(to.getUTCFullYear() + 10)
    out.push({ k, c, from: from.getTime() - TZ, to: to.getTime() - TZ, age: y + (k - 1) * 10, ...rate(N, c, { label: 'เสาโชค' }) })
  }
  return { fwd, start: { y, m: mo, d: dd, ms: startMs }, list: out }
}
/** year pillar of a Gregorian year (from its 立春) */
export const yearPillar = (y) => mod(y - 4, 60)
export { lichun, nextJie, lastJie }
