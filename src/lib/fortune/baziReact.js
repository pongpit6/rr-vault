/* BaZi reactions: storages (庫), triads (三合 / 半合 / 拱), seasonal sets (三會), punishments (三刑), pairs (六合 / 沖 / 害 / 破 / 五合),
   stars (神煞), void (空亡) and repeats (伏吟 / 反吟) — what the chart has, what is missing, and the days / hours / years that complete or hit them.
   Rule names and groups follow BaZi_ZiPing_Complete_Handbook_TH ch.16, 22, 23, 25; good / careful labels are this app's reading. */
import { STEMS, BRANCHES, ZODIAC, EL, roleOf, branchRel, starsOn, voidOf } from './bazi'

const mod = (a, n) => ((a % n) + n) % n
export const ROLE_NAME = ['เพื่อน', 'ผลงาน', 'ทรัพย์', 'อำนาจ', 'ผู้หนุน']
const STORE_OF_EL = { 4: 4, 0: 7, 1: 10, 3: 1, 2: 4 } // element → its storage branch (earth uses 辰, as many schools do)
const SANHE = [[[8, 0, 4], 4, 0], [[11, 3, 7], 0, 3], [[2, 6, 10], 1, 6], [[5, 9, 1], 3, 9]] // members, element, centre
const SANHUI = [[[2, 3, 4], 0], [[5, 6, 7], 1], [[8, 9, 10], 3], [[11, 0, 1], 4]]
const XING3 = [[2, 5, 8], [1, 10, 7]]
const STEM_HE = { '0,5': 2, '1,6': 3, '2,7': 4, '3,8': 0, '4,9': 1 }
const key2 = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`)
const bs = (l) => l.map((b) => BRANCHES[b]).join('')

/* ---------- what the natal chart holds ---------- */
export function natalReactions(N) {
  const B = N.pillars.map((p) => p.b), has = (b) => B.includes(b), where = (b) => N.pillars.filter((p) => p.b === b).map((p) => p.th)
  const role = (e) => roleOf(N.dmEl, e), cards = []
  // storages: one for each role, the one for wealth first
  for (const r of [2, 3, 4, 1, 0]) {
    const e = mod(N.dmEl + r, 5), sb = STORE_OF_EL[e], open = has(sb) && has(mod(sb + 6, 12))
    cards.push({
      kind: 'vault', icon: 'ev_vault', title: `คลัง${ROLE_NAME[r]} (คลังธาตุ${EL[e]} ${BRANCHES[sb]})`, tone: r === 2 ? 'good' : 'info',
      slots: [{ b: sb, on: has(sb), label: has(sb) ? `อยู่เสา${where(sb).join('/')}` : 'ไม่มีในดวง' }],
      status: !has(sb) ? 'missing' : open ? 'open' : 'closed',
      text: !has(sb) ? `ดวงไม่มี ${BRANCHES[sb]} (${ZODIAC[sb]}) จึงไม่พบรูปแบบคลัง${ROLE_NAME[r]}ในผังเดิม วันหรือปี${ZODIAC[sb]}จะเพิ่มรูปแบบนี้ในการอ่าน ไม่ได้แปลว่าชีวิตขาดเรื่องนี้`
        : open ? `มีคลัง${ROLE_NAME[r]}และมี ${BRANCHES[mod(sb + 6, 12)]} สัมพันธ์แบบชงกับคลังในผัง ${r === 2 ? 'จุดทบทวนคือการรับจ่ายและสิ่งที่สะสม ไม่รับรองเงินเข้า' : 'ใช้เป็นธีมทบทวนเรื่องที่สะสมไว้'}`
          : `มีคลัง${ROLE_NAME[r]}เก็บไว้แต่ยังปิดอยู่ ${r === 2 ? 'ชวนทบทวนทรัพย์ที่สะสม ไม่ใช้ตัดสินนิสัยการออม' : 'อ่านเป็นภาพของการสะสมตามบทบาทนี้'} วันหรือปี${ZODIAC[mod(sb + 6, 12)]} (${BRANCHES[mod(sb + 6, 12)]}) เพิ่มความสัมพันธ์แบบชงที่ระบบเรียกว่าเปิดคลัง`,
      open: sb, opener: mod(sb + 6, 12), role: r,
    })
  }
  // triads and seasonal sets
  for (const [g, e, centre] of SANHE) {
    const on = g.filter(has)
    if (on.length < 2) continue
    const miss = g.filter((x) => !has(x)), r = role(e)
    const name = on.length === 3 ? 'สามประสาน (ครบ)' : on.includes(centre) ? 'ครึ่งสามประสาน (半合)' : 'ประสานเว้นกลาง (拱)'
    cards.push({ kind: 'triad', icon: on.length === 3 ? 'ev_triad' : 'ev_half', title: `${name} ธาตุ${EL[e]} ${bs(g)}`, tone: r === 2 || r === 4 ? 'good' : 'info', role: r, el: e,
      slots: g.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ขาด' })), missing: miss, status: miss.length ? 'partial' : 'full',
      text: miss.length ? `มี ${bs(on)} แล้ว ขาด ${bs(miss)} (${miss.map((b) => ZODIAC[b]).join('/')}) เมื่อวัน เดือน หรือปี${miss.map((b) => ZODIAC[b]).join('/')}มาถึง ระบบจะนับกลุ่มครบและเน้นธาตุ${EL[e]}ในบทบาท${ROLE_NAME[r]}`
        : `พบครบสามกิ่งในผังเดิม ระบบจึงเน้นธาตุ${EL[e]}ในบทบาท${ROLE_NAME[r]} อ่านร่วมกับสมดุลธาตุ ไม่ใช่ผลดีตลอดชีวิต` })
  }
  for (const [g, e] of SANHUI) {
    const on = g.filter(has)
    if (on.length < 2) continue
    const miss = g.filter((x) => !has(x)), r = role(e)
    cards.push({ kind: 'season', icon: 'ev_triad', title: `รวมทิศ (三會) ธาตุ${EL[e]} ${bs(g)}`, tone: 'info', role: r, el: e,
      slots: g.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ขาด' })), missing: miss, status: miss.length ? 'partial' : 'full',
      text: miss.length ? `ขาด ${bs(miss)} ถ้ามาครบระบบจะเน้นกลุ่มฤดูของธาตุ${EL[e]}ในบทบาท${ROLE_NAME[r]} ต้องอ่านร่วมกับส่วนอื่นของผัง` : `พบครบกลุ่มฤดูในผัง ระบบจึงเน้นธาตุ${EL[e]}เป็นพิเศษ ไม่ใช่คำรับรองผลในชีวิต` })
  }
  for (const g of XING3) {
    const on = g.filter(has)
    if (on.length < 2) continue
    const miss = g.filter((x) => !has(x))
    cards.push({ kind: 'punish', icon: 'ev_punish', title: `ลงโทษสามตัว (三刑) ${bs(g)}`, tone: 'bad', slots: g.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ขาด' })), missing: miss, status: miss.length ? 'partial' : 'full',
      text: miss.length ? `มี ${bs(on)} อยู่แล้ว ช่วงที่ ${bs(miss)} (${miss.map((b) => ZODIAC[b]).join('/')}) มาครบ แนวอ่านเน้นตรวจข้อตกลงและจังหวะตอบโต้ ไม่ได้บอกว่าจะเกิดคดีหรืออุบัติเหตุ` : 'พบกลุ่มที่เรียกว่าลงโทษครบในผังเดิม ใช้ทบทวนข้อตกลงและข้อจำกัด ไม่ได้หมายถึงการถูกลงโทษหรือมีปัญหาซ้ำทั้งชีวิต' })
  }
  // pairs inside the chart
  for (const r of N.rels) {
    const kind = /ชง/.test(r.txt) ? 'clash' : /รวม|ประสาน/.test(r.txt) ? 'harmony' : /ลงโทษ/.test(r.txt) ? 'punish' : 'harm'
    if (/ครึ่งสามประสาน|รวมทิศ/.test(r.txt)) continue // shown with the triads above
    cards.push({ kind, icon: { clash: 'ev_clash', harmony: 'ev_harmony', punish: 'ev_punish', harm: 'ev_punish' }[kind], title: `${r.lv}${r.txt}`, tone: r.w > 0 ? 'good' : 'bad', slots: [], status: 'pair',
      text: kind === 'clash' ? `เสา${PAIR_TH[r.a]}กับเสา${PAIR_TH[r.b]}อยู่ในความสัมพันธ์แบบชง แนวอ่านเน้นความต้องการที่ต่างกัน ลองทบทวนเรื่องของสองเสานี้ร่วมกัน` : kind === 'harmony' ? `เสา${PAIR_TH[r.a]}กับเสา${PAIR_TH[r.b]}อยู่ในความสัมพันธ์แบบประสาน ใช้ทบทวนสิ่งที่เชื่อมกัน ไม่ได้รับรองว่าทุกเรื่องจะราบรื่น` : `เสา${PAIR_TH[r.a]}กับเสา${PAIR_TH[r.b]}มีความสัมพันธ์ที่ระบบจัดให้ใส่ใจ ใช้ตรวจสิ่งที่ยังตกลงหรือปรับเข้าหากันไม่ชัด` })
  }
  // stars in the chart and the ones you lack
  const want = [['天乙貴人', 'ดาวอุปถัมภ์', 'ev_noble'], ['文昌', 'ดาวปัญญา', 'ev_study'], ['祿', 'ดาวลาภยศ', 'ev_vault'], ['桃花', 'ดาวเสน่ห์', 'ev_peach'], ['驛馬', 'ดาวเดินทาง', 'ev_travel'], ['將星', 'ดาวผู้นำ', 'ev_noble'], ['華蓋', 'ดาวศิลป์/สันโดษ', 'ev_study'], ['羊刃', 'ดาบคม', 'ev_blade']]
  const starAt = {}
  for (let b = 0; b < 12; b++) for (const s of starsOn(N.dm, N.dayB, b)) (starAt[s.zh] ||= []).push(b)
  for (const [zh, th, icon] of want) {
    const at = starAt[zh] || [], got = at.filter(has)
    cards.push({ kind: 'star', icon, title: `${th} (${zh})`, tone: zh === '羊刃' ? 'bad' : 'good', status: got.length ? 'have' : 'missing',
      slots: at.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ไม่มี' })),
      text: `${STAR_TEXT[zh]} ${got.length ? `มีในดวงที่ ${bs(got)}` : `ไม่พบในผังเดิม วัน${at.map((b) => ZODIAC[b]).join('/')}จะเพิ่มสัญลักษณ์นี้ในการอ่าน ไม่ได้แปลว่าคุณขาดคุณสมบัตินั้น`}` })
  }
  // void
  const vd = voidOf(N.P.day), inVoid = N.pillars.filter((p) => p.key !== 'day' && vd.includes(p.b))
  cards.push({ kind: 'void', icon: 'ev_void', title: `ว่าง (空亡) ${bs(vd)}`, tone: 'info', status: inVoid.length ? 'have' : 'missing', slots: vd.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ไม่มี' })),
    text: `กิ่ง ${bs(vd)} (${vd.map((b) => ZODIAC[b]).join('/')}) เป็นช่องว่างของคุณ ${inVoid.length ? `เสา${inVoid.map((p) => p.th).join('/')}อยู่ในเกณฑ์ช่องว่าง ใช้ทบทวนสิ่งที่ยังไม่ครบและเวลาที่ต้องเผื่อ` : 'ไม่มีเสาตกช่องว่าง'} เกณฑ์นี้ไม่ได้บอกว่าวันนั้นทำอะไรไม่สำเร็จ ให้อ่านร่วมกับความพร้อมจริง` })
  return cards
}
const PAIR_TH = { year: 'ปี', month: 'เดือน', day: 'วัน', hour: 'เวลา' }
export const STAR_TEXT = {
  天乙貴人: "คำอ่านใช้เรื่องคำปรึกษาและแรงสนับสนุนเป็นหัวข้อ ลองระบุว่าตอนนี้ต้องการคำตอบเรื่องใด และใครมีประสบการณ์ตรงพอจะช่วยให้เข้าใจขึ้น",
  文昌: "คำอ่านใช้เรื่องการเรียน การเขียน และสื่อสารความรู้เป็นหัวข้อ ลองเลือกสิ่งที่ยังไม่เข้าใจมาทบทวน แล้วสรุปด้วยคำของตัวเองก่อนนำไปใช้",
  祿: "คำอ่านใช้เรื่องรายได้ประจำกับหน้าที่ที่ทำอยู่เป็นหัวข้อ ลองดูว่าสิ่งที่ควรได้รับมีอะไรต้องติดตาม และมีภาระส่วนใดที่ยังไม่ได้จัดการ",
  桃花: "คำอ่านใช้เรื่องการเข้าหาผู้อื่นและแรงดึงดูดเป็นหัวข้อ ลองคุยความคาดหวังให้ตรงกัน พร้อมเคารพขอบเขตของแต่ละคน",
  驛馬: "คำอ่านใช้เรื่องการเดินทางและเปลี่ยนบริบทเป็นหัวข้อ ลองตรวจแผนที่มีอยู่แล้ว ทั้งเวลา เส้นทาง และสิ่งที่ต้องเตรียมก่อนออกจากจุดเดิม",
  將星: "คำอ่านใช้เรื่องการนำและรับผิดชอบร่วมกับผู้อื่นเป็นหัวข้อ ลองตกลงว่าใครตัดสินใจเรื่องใด และคนในทีมต้องการข้อมูลอะไรจากคุณ",
  華蓋: "คำอ่านใช้เรื่องการค้นคว้า งานศิลป์ และเวลาส่วนตัวเป็นหัวข้อ ลองจัดช่วงเงียบให้ทำสิ่งที่สนใจ พร้อมเว้นช่องให้ถามหรือรับความช่วยเหลือได้",
  羊刃: "คำอ่านใช้เรื่องแรงผลักดันและจังหวะตอบโต้เป็นหัวข้อ ลองหยุดตรวจความพร้อมก่อนเร่งงานหรือคุยเรื่องที่มีอารมณ์ร่วม คำว่าดาบคมเป็นชื่อสัญลักษณ์ในผัง",
}

/* ---------- events that a day / hour / year / luck pillar brings ---------- */
const EV = {
  triad: { icon: 'ev_triad', tone: 'good' }, season: { icon: 'ev_triad', tone: 'good' }, punish3: { icon: 'ev_punish', tone: 'bad' },
  vaultOpen: { icon: 'ev_vault', tone: 'good' }, vaultVisit: { icon: 'ev_vault', tone: 'info' }, clashDay: { icon: 'ev_clash', tone: 'bad' }, clashYear: { icon: 'ev_clash', tone: 'bad' },
  harmonyDay: { icon: 'ev_harmony', tone: 'good' }, dmHe: { icon: 'ev_harmony', tone: 'good' }, star: { icon: 'ev_noble', tone: 'good' }, blade: { icon: 'ev_blade', tone: 'bad' },
  void: { icon: 'ev_void', tone: 'info' }, repeat: { icon: 'ev_repeat', tone: 'info' }, reverse: { icon: 'ev_clash', tone: 'bad' },
}
/** events of pillar c (a day, hour, month, year or luck pillar) against the chart. what: 'วัน' | 'ยาม' | 'ปี' | 'เสาโชค' */
export function eventsOf(N, c, what = 'วัน') {
  const s = c % 10, b = c % 12, B = N.pillars.map((p) => p.b), has = (x) => B.includes(x), out = []
  const push = (k, title, text, rank, icon) => out.push({ k, ...EV[k], ...(icon ? { icon } : {}), title, text, rank })
  for (const [g, e] of SANHE) if (g.includes(b) && !has(b) && g.filter(has).length === 2) {
    const r = roleOf(N.dmEl, e)
    push('triad', `ครบสามประสาน${EL[e]}`, `${what}นี้นำ ${BRANCHES[b]} มาเติม ${bs(g)} ครบ ระบบจึงเน้นบทบาท${ROLE_NAME[r]}:${r === 2 ? ' ทบทวนรายรับ รายจ่าย และข้อเสนอ' : r === 3 ? ' ทบทวนหน้าที่และขอบเขตความรับผิดชอบ' : r === 4 ? ' ทบทวนแหล่งเรียนรู้และคำปรึกษาที่ต้องการ' : r === 1 ? ' เลือกความคิดที่จะนำไปทำเป็นผลงาน' : ' ทบทวนบทบาทและส่วนแบ่งในกลุ่ม'}`, 9)
  }
  for (const [g, e] of SANHUI) if (g.includes(b) && !has(b) && g.filter(has).length === 2) push('season', `ครบรวมทิศ${EL[e]}`, `${what}นี้เติม ${BRANCHES[b]} ครบกลุ่ม ${bs(g)} ธาตุ${EL[e]} (${ROLE_NAME[roleOf(N.dmEl, e)]}ของคุณ) เป็นธีมเด่นตามเกณฑ์กลุ่มฤดู`, 8)
  for (const g of XING3) if (g.includes(b) && !has(b) && g.filter(has).length === 2) push('punish3', 'ครบลงโทษสามตัว', `${what}นี้ ${BRANCHES[b]} มาครบ ${bs(g)} แนวอ่านชวนตรวจเอกสาร ข้อตกลง และวิธีตอบโต้ ไม่ได้ยืนยันเหตุร้าย`, 9)
  for (const r of [2, 3, 4]) {
    const sb = STORE_OF_EL[mod(N.dmEl + r, 5)]
    if (has(sb) && mod(b - sb, 12) === 6) push('vaultOpen', `เปิดคลัง${ROLE_NAME[r]}`, `${what}${ZODIAC[b]}ชง ${BRANCHES[sb]} ระบบนับว่าเปิดคลัง${ROLE_NAME[r]}ตามเกณฑ์ความสัมพันธ์ ${r === 2 ? 'เหมาะตรวจเงินที่สะสมและแผนรับจ่าย ไม่ได้รับรองเงินก้อน' : 'ใช้ทบทวนเรื่องที่สะสมไว้และความพร้อมนำมาใช้'}`, r === 2 ? 8 : 5)
    else if (!has(sb) && b === sb && r === 2) push('vaultVisit', 'คลังทรัพย์มาเยือน', `${what}${ZODIAC[b]}เพิ่มรูปแบบคลังทรัพย์ที่ไม่พบในผังเดิม ใช้เป็นจังหวะทบทวนแผนเงิน ไม่ใช่คำรับรองว่าจะมีทรัพย์เข้ามา`, 4)
  }
  for (const p of N.pillars) for (const r of branchRel(b, p.b)) {
    if (r.zh === '沖' && (p.key === 'day' || p.key === 'year')) push(p.key === 'day' ? 'clashDay' : 'clashYear', `ชงกิ่ง${p.th}เกิด`, `${BRANCHES[b]}ชง${BRANCHES[p.b]} ${p.key === 'day' ? 'แนวอ่านเน้นการปรับความสัมพันธ์ใกล้ชิดหรือพื้นที่ส่วนตัว ตรวจสิ่งที่ต้องตกลงร่วมกัน ไม่ใช่คำวินิจฉัยสุขภาพ' : 'สัมพันธ์แบบชงกับปีเกิด ใช้ทบทวนความคาดหวังจากครอบครัวหรือสังคม ไม่ได้ยืนยันว่าจะขัดแย้ง'}`, p.key === 'day' ? 8 : 6)
    if (r.zh === '六合' && p.key === 'day') push('harmonyDay', 'รวมกิ่งวันเกิด', `${BRANCHES[b]}รวมกับ${BRANCHES[p.b]} แนวอ่านเน้นการประสานความสัมพันธ์ เหมาะคุยความคาดหวังกับคนใกล้ตัวโดยฟังทั้งสองฝ่าย`, 5)
  }
  if (STEM_HE[key2(s, N.dm)] != null) push('dmHe', 'ก้านรวมดิถี', `${STEMS[s]}รวมกับดิถี ${STEMS[N.dm]} แนวอ่านเน้นความร่วมมือ ใช้ทบทวนเงื่อนไขก่อนเจรจาหรือตกลง ไม่รับรองว่าจะมีข้อเสนอเข้ามา`, 5)
  for (const st of starsOn(N.dm, N.dayB, b)) {
    if (st.zh === '羊刃') push('blade', 'ดาบคมมาเยือน', `${what}นี้มีสัญลักษณ์ดาบคม แนวอ่านเน้นแรงผลักกับความใจร้อน ลองเว้นจังหวะตรวจความพร้อมก่อนเร่ง`, 5)
    else if (['天乙貴人', '文昌', '桃花', '驛馬', '祿'].includes(st.zh)) push('star', `${st.th}`, `${what}นี้มี${st.th} (${st.zh}): ${STAR_TEXT[st.zh]}`, st.zh === '天乙貴人' ? 6 : 3, { 天乙貴人: 'ev_noble', 文昌: 'ev_study', 桃花: 'ev_peach', 驛馬: 'ev_travel', 祿: 'ev_vault' }[st.zh])
  }
  if (what === 'วัน' && voidOf(N.P.day).includes(b)) push('void', 'วันว่าง (空亡)', 'วันว่างเป็นชื่อเกณฑ์ในผัง ใช้ทบทวนรายละเอียดที่ยังไม่ครบ การเริ่มงานหรือเซ็นสัญญาควรดูข้อมูลและกำหนดจริง ไม่ต้องงดเพราะชื่อวัน', 3)
  if (what !== 'ยาม') {
    if (c === N.P.day) push('repeat', 'ซ้ำเสาวันเกิด (伏吟)', `${what}นี้ซ้ำเสาวันเกิดทั้งก้านและกิ่ง แนวอ่านเน้นการทบทวนตัวเองและเรื่องเดิม ไม่ได้รับรองว่าเหตุการณ์จะเกิดซ้ำ`, 4)
    if (mod(s - N.dm, 10) === 6 && mod(b - N.dayB, 12) === 6) push('reverse', 'ชนเสาวันเกิด (反吟)', `ก้านคุมและกิ่งชงเสาวันเกิดพร้อมกัน ${what}นี้จึงมีธีมแรงที่ดึงต่างทิศ ลองตรวจสิ่งที่ต้องปรับและข้อมูลก่อนตัดสินใจ`, 7)
  }
  return out.sort((a, b2) => b2.rank - a.rank)
}
export const TONE_COLOR = { good: '#16a34a', bad: '#dc2626', info: '#6366f1' }

/** the next n days (Bangkok dates) that carry events, most important first per day */
export function upcomingEvents(N, dayIdxOf, fromMs, n = 30) {
  const out = []
  for (let i = 0; i < n; i++) {
    const d = new Date(fromMs + 7 * 3600e3 + i * 864e5), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate()
    const ev = eventsOf(N, dayIdxOf(y, m, dd), 'วัน').filter((e) => e.rank >= 5)
    if (ev.length) out.push({ y, m, d: dd, i, ev })
  }
  return out
}
