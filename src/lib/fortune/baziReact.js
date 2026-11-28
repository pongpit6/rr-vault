/* BaZi reactions: storages (庫), triads (三合 / 半合 / 拱), seasonal sets (三會), punishments (三刑), pairs (六合 / 沖 / 害 / 破 / 五合),
   stars (神煞), void (空亡) and repeats (伏吟 / 反吟) — what the chart has, what is missing, and the days / hours / years that complete or hit them.
   Rule names and groups follow BaZi_ZiPing_Complete_Handbook_TH ch.16, 22, 23, 25; good / careful labels are this app's reading. */
import { STEMS, BRANCHES, ZODIAC, EL, roleOf, branchRel, starsOn, voidOf } from './bazi.js'

const mod = (a, n) => ((a % n) + n) % n
export const ROLE_NAME = ['เพื่อน', 'ผลงาน', 'ทรัพย์', 'อำนาจ', 'ผู้หนุน']
const ROLE_ADVICE = [
  'แบ่งงานและส่วนแบ่งกับคนที่ร่วมทำให้ชัด',
  'เลือกฝีมือหนึ่งอย่างมาทำเป็นผลงานให้คนลองใช้',
  'เช็กยอดที่เก็บไว้ รายการค้างรับ และเงินที่ต้องกันก่อนใช้',
  'ตกลงหน้าที่และขอบเขตที่คุณตัดสินใจได้ก่อนรับงานเพิ่ม',
  'เลือกเรื่องที่ยังติด แล้วไปถามคนที่มีประสบการณ์ตรง',
]
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
      text: !has(sb) ? `ผังเกิดยังไม่พบคลัง${ROLE_NAME[r]} (${BRANCHES[sb]} ${ZODIAC[sb]}) ถ้ากิ่งนี้มาในวันหรือปีที่อ่าน ค่อยดูเรื่อง${ROLE_NAME[r]}ร่วมกับปฏิกิริยาอื่นของช่วงนั้น`
        : open ? `${ROLE_ADVICE[r]} ผังนี้มี ${BRANCHES[mod(sb + 6, 12)]} ชงกับกิ่งคลังอยู่แล้ว จึงขึ้นว่าเปิดคลัง${ROLE_NAME[r]}${r === 2 ? ' ใช้ชวนเช็กสถานะเงินของคุณในตอนนี้' : ''}`
          : `มีคลัง${ROLE_NAME[r]}ในผัง แต่กิ่งที่ชงเพื่อเปิดคลังยังไม่มา ถ้าอ่านวันหรือปี${ZODIAC[mod(sb + 6, 12)]} (${BRANCHES[mod(sb + 6, 12)]}) ให้ดูเรื่องนี้เพิ่ม: ${ROLE_ADVICE[r]}`,
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
      text: miss.length ? `ตอนนี้มี ${bs(on)} เหลือ ${bs(miss)} (${miss.map((b) => ZODIAC[b]).join('/')}) เมื่อกิ่งที่เหลือมาครบ ธาตุ${EL[e]}จะเด่นขึ้น ค่อยกลับมาดูเรื่อง${ROLE_NAME[r]}ในช่วงนั้น`
        : `${ROLE_ADVICE[r]} ผังเกิดมีสามกิ่งครบ ธาตุ${EL[e]}จึงเด่นขึ้นในบทบาท${ROLE_NAME[r]} ให้ดูสมดุลของธาตุนี้ด้วย` })
  }
  for (const [g, e] of SANHUI) {
    const on = g.filter(has)
    if (on.length < 2) continue
    const miss = g.filter((x) => !has(x)), r = role(e)
    cards.push({ kind: 'season', icon: 'ev_triad', title: `รวมทิศ (三會) ธาตุ${EL[e]} ${bs(g)}`, tone: 'info', role: r, el: e,
      slots: g.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ขาด' })), missing: miss, status: miss.length ? 'partial' : 'full',
      text: miss.length ? `กลุ่มรวมทิศยังรอ ${bs(miss)} ถ้าช่วงไหนเติมครบ ให้กลับมาดูเรื่อง${ROLE_NAME[r]} เพราะธาตุ${EL[e]}จะมีน้ำหนักขึ้นในคำอ่าน` : `${ROLE_ADVICE[r]} กลุ่มฤดูในผังครบ ทำให้ธาตุ${EL[e]}มีน้ำหนักเพิ่ม ให้เทียบกับธาตุที่หนุนหรือถ่วงผังอีกที` })
  }
  for (const g of XING3) {
    const on = g.filter(has)
    if (on.length < 2) continue
    const miss = g.filter((x) => !has(x))
    cards.push({ kind: 'punish', icon: 'ev_punish', title: `ลงโทษสามตัว (三刑) ${bs(g)}`, tone: 'bad', slots: g.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ขาด' })), missing: miss, status: miss.length ? 'partial' : 'full',
      text: miss.length ? `ถ้าเข้าช่วงที่ ${bs(miss)} (${miss.map((b) => ZODIAC[b]).join('/')}) มาเติม ${bs(on)} ให้ครบ ให้ระวังเรื่องที่ตกลงกันไม่ชัด อ่านเอกสารให้ครบและอย่าเพิ่งตอบตอนที่ยังถูกเร่ง` : 'ระวังตอบโต้เร็วเมื่อมีข้อขัดข้อง กลุ่มที่เรียกว่าลงโทษมีครบในผังเกิด ถ้างานหรือข้อตกลงเริ่มตึง ให้ทวนเงื่อนไขกับคนที่เกี่ยวข้องก่อนตอบ' })
  }
  // pairs inside the chart
  for (const r of N.rels) {
    const kind = /ชง/.test(r.txt) ? 'clash' : /รวม|ประสาน/.test(r.txt) ? 'harmony' : /ลงโทษ/.test(r.txt) ? 'punish' : 'harm'
    if (/ครึ่งสามประสาน|รวมทิศ/.test(r.txt)) continue // shown with the triads above
    cards.push({ kind, icon: { clash: 'ev_clash', harmony: 'ev_harmony', punish: 'ev_punish', harm: 'ev_punish' }[kind], title: `${r.lv}${r.txt}`, tone: r.w > 0 ? 'good' : 'bad', slots: [], status: 'pair',
      text: kind === 'clash' ? `เสา${PAIR_TH[r.a]}กับเสา${PAIR_TH[r.b]}มีแรงดึงคนละทาง ถ้าแผนสองเรื่องชนกัน ให้คุยก่อนว่าอะไรต้องทำตามเดิมและอะไรยืดหยุ่นได้`
        : kind === 'harmony' ? `เสา${PAIR_TH[r.a]}กับเสา${PAIR_TH[r.b]}มีจังหวะประสานกัน ถ้าสองฝ่ายอยากได้ผลคล้ายกัน ใช้จุดนั้นเริ่มคุยและตกลงส่วนที่จะช่วยกันทำ`
          : `เสา${PAIR_TH[r.a]}กับเสา${PAIR_TH[r.b]}มีจุดที่ต้องคุยให้ตรงกัน ถ้าคนละฝ่ายเข้าใจข้อตกลงต่างกัน ให้ยกตัวอย่างจริงแล้วทวนข้อที่ยังไม่ชัด` })
  }
  // stars in the chart and the ones you lack
  const want = [['天乙貴人', 'ดาวอุปถัมภ์', 'ev_noble'], ['文昌', 'ดาวปัญญา', 'ev_study'], ['祿', 'ดาวลาภยศ', 'ev_vault'], ['桃花', 'ดาวเสน่ห์', 'ev_peach'], ['驛馬', 'ดาวเดินทาง', 'ev_travel'], ['將星', 'ดาวผู้นำ', 'ev_noble'], ['華蓋', 'ดาวศิลป์/สันโดษ', 'ev_study'], ['羊刃', 'ดาบคม', 'ev_blade']]
  const starAt = {}
  for (let b = 0; b < 12; b++) for (const s of starsOn(N.dm, N.dayB, b)) (starAt[s.zh] ||= []).push(b)
  for (const [zh, th, icon] of want) {
    const at = starAt[zh] || [], got = at.filter(has)
    cards.push({ kind: 'star', icon, title: `${th} (${zh})`, tone: zh === '羊刃' ? 'bad' : 'good', status: got.length ? 'have' : 'missing',
      slots: at.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ไม่มี' })),
      text: got.length ? `${STAR_TEXT[zh]} พบดาวนี้ในผังที่ ${bs(got)}` : `ผังเกิดยังไม่พบดาวนี้ เมื่อเจอกิ่ง${at.map((b) => ZODIAC[b]).join('/')} ค่อยใช้คำแนะนำนี้ประกอบ: ${STAR_TEXT[zh]}` })
  }
  // void
  const vd = voidOf(N.P.day), inVoid = N.pillars.filter((p) => p.key !== 'day' && vd.includes(p.b))
  cards.push({ kind: 'void', icon: 'ev_void', title: `ว่าง (空亡) ${bs(vd)}`, tone: 'info', status: inVoid.length ? 'have' : 'missing', slots: vd.map((b) => ({ b, on: has(b), label: has(b) ? `เสา${where(b).join('/')}` : 'ไม่มี' })),
    text: inVoid.length ? `เผื่อเวลาสำหรับเรื่องที่ยังรอคำตอบหรือเอกสาร เสา${inVoid.map((p) => p.th).join('/')}เข้าเกณฑ์ว่างที่กิ่ง ${bs(vd)} (${vd.map((b) => ZODIAC[b]).join('/')}) ถ้าข้อมูลและกำหนดพร้อมก็เดินหน้าตามจริงได้` : `ผังเกิดไม่มีเสาที่เข้าเกณฑ์ว่าง กิ่ง ${bs(vd)} (${vd.map((b) => ZODIAC[b]).join('/')}) ใช้เทียบเมื่อดูช่วงเวลาอื่น` })
  return cards
}
const PAIR_TH = { year: 'ปี', month: 'เดือน', day: 'วัน', hour: 'เวลา' }
export const STAR_TEXT = {
  天乙貴人: "ดีสำหรับขอคำแนะนำ ถ้าติดเรื่องที่ลองเองมาหลายรอบ เอาคำถามที่เจาะจงไปถามคนที่เคยผ่านเรื่องนั้น",
  文昌: "เหมาะกับอ่าน เขียน หรืออธิบายเรื่องยาก เลือกเรื่องที่อยากให้คนเข้าใจแล้วสรุปเป็นภาษาของคุณเอง",
  祿: "ดีสำหรับตามผลตอบแทนที่ตกลงไว้ เปิดดูยอดกับวันจ่ายก่อนถาม จะคุยได้ชัดขึ้นว่ากำลังรออะไร",
  桃花: "มีจังหวะทำความรู้จักกัน ถ้าอยากคุยต่อ เริ่มจากเรื่องที่สนใจร่วมกันแล้วดูว่าอีกฝ่ายพร้อมรับจังหวะเดียวกันไหม",
  驛馬: "เผื่อเวลาถ้าต้องเปลี่ยนที่หรือเปลี่ยนแผน เช็กเส้นทาง นัดหมาย และคนที่ต้องแจ้งก่อนออกไป",
  將星: "เหมาะกับรับบทนำเมื่อรู้ขอบเขต ถ้าทีมรอคำตัดสินใจ บอกให้ชัดว่าคุณดูส่วนไหนและจะให้คำตอบเมื่อไร",
  華蓋: "เหมาะกับทำงานที่ต้องใช้สมาธิหรือสร้างสรรค์ กันช่วงเงียบให้ได้ลงมือ แล้วค่อยขอความเห็นตรงส่วนที่ติด",
  羊刃: "ระวังเร่งหรือตอบไวเกินไป ถ้าเรื่องเริ่มตึง ลองหยุดสั้น ๆ แล้วค่อยตัดสินใจเมื่อเห็นเงื่อนไขครบ",
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
  const push = (k, title, text, rank, extra) => out.push({ k, ...EV[k], title, text, rank, ...extra })
  for (const [g, e] of SANHE) if (g.includes(b) && !has(b) && g.filter(has).length === 2) {
    const r = roleOf(N.dmEl, e)
    push('triad', `ครบสามประสาน${EL[e]}`, `${ROLE_ADVICE[r]} กิ่ง ${BRANCHES[b]} เติมกลุ่ม ${bs(g)} ครบ ทำให้เรื่อง${ROLE_NAME[r]}เด่นขึ้นในช่วงนี้`, 9, { role: r, element: e })
  }
  for (const [g, e] of SANHUI) if (g.includes(b) && !has(b) && g.filter(has).length === 2) push('season', `ครบรวมทิศ${EL[e]}`, `${ROLE_ADVICE[roleOf(N.dmEl, e)]} เพราะกิ่ง ${BRANCHES[b]} เติมกลุ่ม ${bs(g)} ครบ ธาตุ${EL[e]}จึงมีน้ำหนักเพิ่ม`, 8, { role: roleOf(N.dmEl, e), element: e })
  for (const g of XING3) if (g.includes(b) && !has(b) && g.filter(has).length === 2) push('punish3', 'ครบลงโทษสามตัว', `ระวังตกลงกันเร็วตอนถูกเร่ง เช็กข้อผูกมัดและทวนสิ่งที่แต่ละฝ่ายต้องทำก่อนตอบ กิ่ง ${BRANCHES[b]} เติมกลุ่ม ${bs(g)} ครบในช่วงนี้`, 9)
  for (const r of [2, 3, 4]) {
    const sb = STORE_OF_EL[mod(N.dmEl + r, 5)]
    if (has(sb) && mod(b - sb, 12) === 6) push('vaultOpen', `เปิดคลัง${ROLE_NAME[r]}`, `${ROLE_ADVICE[r]} กิ่ง${ZODIAC[b]}ชงกับ ${BRANCHES[sb]} จึงเข้าเกณฑ์เปิดคลัง${ROLE_NAME[r]}ในช่วงนี้`, r === 2 ? 8 : 5, { role: r })
    else if (!has(sb) && b === sb && r === 2) push('vaultVisit', 'คลังทรัพย์มาเยือน', `เหมาะกับเปิดดูเงินที่เก็บไว้และรายการที่ยังค้าง กิ่ง${ZODIAC[b]}เพิ่มรูปแบบคลังทรัพย์ให้ช่วงนี้ ลองแยกยอดที่ใช้ได้จริงออกจากยอดที่กำลังรอ`, 4, { role: r })
  }
  for (const p of N.pillars) for (const r of branchRel(b, p.b)) {
    if (r.zh === '沖' && (p.key === 'day' || p.key === 'year')) push(p.key === 'day' ? 'clashDay' : 'clashYear', `ชงกิ่ง${p.th}เกิด`, `${p.key === 'day' ? 'ความสัมพันธ์ใกล้ชิดควรคุยให้ตรงกัน ถ้าเห็นต่าง อย่าเพิ่งคิดแทนว่าอีกฝ่ายตั้งใจอะไร' : 'ระวังรับปากตามความคาดหวังของคนรอบตัว ถ้าเป็นเรื่องของครอบครัว ให้บอกว่าส่วนไหนคุณพร้อมรับและส่วนไหนต้องขอคิดก่อน'} กิ่ง ${BRANCHES[b]} ชงกับ ${BRANCHES[p.b]} ในผังเกิด`, p.key === 'day' ? 8 : 6)
    if (r.zh === '六合' && p.key === 'day') push('harmonyDay', 'รวมกิ่งวันเกิด', `เหมาะกับคุยเรื่องที่เคยเข้าใจไม่ตรงกัน ลองฟังให้จบแล้วตกลงสิ่งที่ทำร่วมกันได้หนึ่งข้อ กิ่ง ${BRANCHES[b]} ประสานกับ ${BRANCHES[p.b]} ที่เสาวันเกิด`, 5)
  }
  if (STEM_HE[key2(s, N.dm)] != null) push('dmHe', 'ก้านรวมดิถี', `ดีสำหรับคุยเรื่องร่วมมือกัน ถ้าพร้อมเริ่ม ให้ยืนยันหน้าที่และเงื่อนไขก่อน ก้าน ${STEMS[s]} รวมกับดิถี ${STEMS[N.dm]} ในช่วงนี้`, 5)
  for (const st of starsOn(N.dm, N.dayB, b)) {
    if (st.zh === '羊刃') push('blade', 'ดาบคมมาเยือน', `ระวังรีบเร่งจนพลาดสิ่งที่ต้องเช็ก ถ้าต้องตอบเรื่องสำคัญ ลองเว้นจังหวะสั้น ๆ ก่อนพูดหรือลงมือ ช่วงนี้เข้าเกณฑ์ดาวดาบคม`, 5)
    else if (['天乙貴人', '文昌', '桃花', '驛馬', '祿'].includes(st.zh)) push('star', `${st.th}`, `${STAR_TEXT[st.zh]} ช่วงนี้พบ${st.th} (${st.zh})`, st.zh === '天乙貴人' ? 6 : 3, { symbol: st.zh, icon: { 天乙貴人: 'ev_noble', 文昌: 'ev_study', 桃花: 'ev_peach', 驛馬: 'ev_travel', 祿: 'ev_vault' }[st.zh] })
  }
  if (what === 'วัน' && voidOf(N.P.day).includes(b)) push('void', 'วันว่าง (空亡)', 'เช็กข้อมูลคนอนุมัติและกำหนดจริงก่อนเริ่มงานหรือเซ็นเอกสาร ถ้ายังรอข้อสำคัญ ให้ขอเวลาทวนก่อน วันว่างเป็นชื่อเกณฑ์ที่ใช้เทียบกับผังเกิด', 3)
  if (what !== 'ยาม') {
    if (c === N.P.day) push('repeat', 'ซ้ำเสาวันเกิด (伏吟)', `ถ้าเรื่องเดิมกลับมาคุยกันอีก ให้เลือกจุดที่อยากเปลี่ยนจริงหนึ่งข้อก่อน ช่วงนี้ซ้ำทั้งก้านและกิ่งของเสาวันเกิด`, 4)
    if (mod(s - N.dm, 10) === 6 && mod(b - N.dayB, 12) === 6) push('reverse', 'ชนเสาวันเกิด (反吟)', `ระวังเลือกตอนที่แรงกดดันมาจากหลายทาง ถ้าแผนเริ่มชนกัน ให้เช็กว่าต้องปรับข้อไหนก่อน ก้านคุมและกิ่งชงเสาวันเกิดพร้อมกันในช่วงนี้`, 7)
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
