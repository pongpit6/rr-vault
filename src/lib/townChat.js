/**
 * Town conversations: villagers, the party and you (the hero) greet each other and chat.
 * Every conversation is a few lines back and forth, picked from what really happened today
 * (habits, money, hunting, raids, festivals, weather, time of day). Friendly only, never a scolding.
 */
import { CARD_BY_ID as TAROT } from './fortune/tarot'
import { useStore } from '../store'
import { NPC_BY_ID, RESIDENTS } from './town'
import { visitorFor } from './festivals'
import { MON_BY_ID, MAP_BY_ID } from './farmData'
import { SHADOW_BY_ID } from './farm'
import { APPRENTICE, storyOf } from './townTalk'
import { todOf, isFullMoon, NIGHT } from './timeOfDay'

const PARTY = { healer: { name: 'ลูน่า', sprite: 'healer' }, mage: { name: 'ไพร์', sprite: 'mage' }, ranger: { name: 'ฟิน', sprite: 'ranger' } }
const fmt = (n) => Math.round(n).toLocaleString('th-TH')
const privacyless = (n) => (useStore.getState().ui.privacy ? '฿•••' : `฿${fmt(n)}`)
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length]

/** who can talk right now: id → { name, sprite } */
export function speakers(rpg) {
  const prof = useStore.getState().items.profile?.data || {}
  const hero = { name: (prof.name || 'ฮีโร่').trim().split(/\s+/)[0] || 'ฮีโร่', sprite: 'hero', hero: true }
  const out = { hero }
  for (const r of RESIDENTS) out[r.id] = { name: r.name, sprite: r.sprite }
  for (const id of rpg.town.npcs || []) if (NPC_BY_ID[id]) out[id] = { name: NPC_BY_ID[id].name, sprite: NPC_BY_ID[id].sprite }
  for (const p of rpg.party || []) if (p.joined && PARTY[p.id]) out[p.id] = PARTY[p.id]
  if (storyOf(rpg.habits).arrived) out.apprentice = { name: 'ปิ่น', sprite: APPRENTICE.sprite }
  const g = visitorFor(rpg.world)
  if (g) out.visitor = { name: g.name, sprite: g.sprite }
  return out
}

/** today's conversations, the ones built from your real day first */
export function townChats(rpg) {
  const S = speakers(rpg), h = rpg.habits, tr = rpg.traces || {}, f = rpg.farm || {}, w = rpg.world || {}
  const hr = new Date().getHours(), day = new Date().getDate(), tod = todOf().id // shared clock: morning 5-10, day 10-17, evening 17-19, night 19-5
  const me = S.hero.name
  const C = []
  const add = (w8, need, lines) => { if (need.every((id) => S[id])) C.push({ w: w8, lines }) }

  // ---------- the fortune room: today's tarot card ----------
  const pick = (...ids) => ids.find((id) => S[id])
  if (rpg.tarot) {
    const nm = TAROT[rpg.tarot.id]?.th || 'ไพ่', good = rpg.tarot.luck >= 4, sp = pick('bard', 'merchant', 'baker', 'farmer')
    if (sp) add(1.2, [sp], good
      ? [[sp, `ได้ข่าวว่าเช้านี้${me}จั่วได้ไพ่ “${nm}” โบนัสพื้นฐานในเกมมากเลยนี่!`], ['hero', 'ข้าใช้มันเป็นคำถามของวันนี้ เดี๋ยวลองเริ่มเรื่องที่ตั้งใจไว้'], [sp, 'งั้นไปล่าให้ได้ของดี ๆ มาฝากด้วยนะ']]
      : [[sp, `ไพ่วันนี้ของ${me}คือ “${nm}” ใช่ไหม`], ['hero', 'ใช่ วันนี้เลยอยากค่อย ๆ ดูสิ่งที่อยู่ตรงหน้า'], [sp, 'ไพ่ใบเดียวไม่รู้ทั้งวันของเราหรอก ค่อย ๆ ดูแล้วเลือกทางกัน']])
  } else {
    const sp = pick('bard', 'merchant')
    if (sp && tod === 'morning') add(0.6, [sp], [[sp, 'ห้องหมอดูเปิดแล้วนะ ไปจั่วไพ่ประจำวันหรือยัง'], ['hero', 'ยังเลย เดี๋ยวไปจั่ว'], [sp, 'ไพ่ให้โบนัสการล่าตามใบที่จั่ว บางใบมีโอกาสได้พลังกายฟรีด้วย!']])
  }

  // ---------- greetings by the time of day ----------
  if (tod === 'morning') {
    add(1, ['farmer'], [['farmer', `อรุณสวัสดิ์ท่าน${me}! ตื่นเช้าแบบนี้ วันนี้ต้องดีแน่`], ['hero', 'อรุณสวัสดิ์ลุง วันนี้ทุ่งดูเขียวกว่าเมื่อวานนะ'], ['farmer', "เมื่อคืนสไลม์ย้ายเมล็ดอีกแล้ว ข้าจำใบหญ้าประจำบ้านมันได้ แต่ยังไม่รู้ว่าหนีเสียงอะไรกัน"]])
    add(1, ['merchant'], [['merchant', 'เช้านี้มีของใหม่มาลงแผงนะท่าน!'], ['hero', 'ขอดูก่อนนะ ยังไม่ซื้อ ฮ่า ๆ'], ['merchant', "ดูฟรี! ผ้านี่มาจากคาราวานทะเลทราย ปมตรงชายอย่าเพิ่งแกะ มันเป็นแผนที่บ่อน้ำ"]])
  } else if (tod === 'day') {
    add(1, ['merchant', 'farmer'], [['merchant', 'เที่ยงแล้ว ข้าวกล่องข้าขายดีเชียว'], ['farmer', 'ข้าห่อข้าวมาเอง ประหยัดไปอีกวัน'], ['merchant', 'ลุงนี่ทำข้าขาดทุนทุกวันเลย…'], ['hero', 'ผมเข้าข้างลุงนะ ห่อข้าวไปทำงานก็ดีเหมือนกัน']])
    add(1, ['farmer'], [['hero', 'ลุงไม่พักบ้างเหรอ แดดแรงนะ'], ['farmer', "พักสิ ข้าเพิ่งแขวนตะกร้าให้พ้นเป็ดโจรแล้ว บ่ายนี้จะไปดูระฆังในยุ้งอีกหน่อย"]])
  } else if (tod === 'evening') {
    add(1, ['merchant'], [['merchant', 'เย็นแล้ว ข้าจะเก็บแผงละ'], ['hero', 'วันนี้ขายดีไหม'], ['merchant', "พอได้ ๆ แต่เหรียญหายไปสอง ข้าสงสัยอีกาบนยุ้งกำลังจัดงานแต่งอีกแล้ว"]])
    add(1, ['farmer'], [['farmer', 'พระอาทิตย์ตกสวยนะคืนนี้'], ['hero', 'ใช่ ลุงกลับบ้านดี ๆ นะ'], ['farmer', 'ท่านก็เข้านอนให้ตรงเวลาล่ะ พรุ่งนี้จะได้สดชื่น']])
  } else {
    add(1, ['farmer'], [['hero', 'ดึกแล้ว ลุงยังไม่นอนอีกเหรอ'], ['farmer', 'เพิ่งตื่นมาดื่มน้ำ ท่านเองก็รีบนอนนะ'], ['hero', 'ครับ ขอปิดไฟอีกดวงก่อน']])
    if (S.guard) add(1, ['guard'], [['guard', 'เวรยามกลางคืน ทุกอย่างเรียบร้อยครับ'], ['hero', 'ขอบคุณที่เฝ้าเมืองนะ'], ['guard', 'หน้าที่ข้า! ท่านไปพักเถอะ']])
  }

  // ---------- the hunt by the time of day: night bonus, glowing monsters, full moon ----------
  {
    const by0 = (...ids) => ids.find((id) => S[id])
    const rare = NIGHT.rare, glowP = Math.round(NIGHT.glow * 100), moon = tod === 'night' && isFullMoon()
    const recentGlow = (f.recent || []).filter((l) => l.glow).slice(-1)[0], glowMon = recentGlow && MON_BY_ID[recentGlow.mon]
    if (tod === 'morning') {
      add(1, ['farmer'], [['farmer', 'ได้ยินไก่ขันไหมท่าน เช้าแล้ว ทีมล่ากลับมาพักกันหรือยัง'], ['hero', 'กลับมาแล้วครับ เมื่อคืนได้ของมาเพียบ'], ['farmer', 'งั้นกินข้าวเช้าก่อน แล้วค่อยไปทำงานจริงนะ']])
      const sp = by0('baker', 'merchant'); if (sp) add(1, [sp], [[sp, "ขนมปังเช้าอบเสร็จแล้ว! เช้านี้ต้องรีบเก็บก่อนพวกเป็ดทาดินดำรอบตาจะมา"], ['hero', 'กลิ่นหอมมาถึงหน้าบ้านเลย']])
    }
    if (tod === 'evening') {
      const sp = by0('guard', 'farmer'); if (sp) add(1, [sp], [[sp, `ฝูงกากลับรังแล้ว อีกไม่นานก็มืด`], ['hero', 'พอตกกลางคืน มอนสเตอร์จะแกร่งขึ้นใช่ไหม'], [sp, `ใช่ แต่ของหายากก็ดรอปง่ายขึ้น ×${rare} เลยนะ`]])
    }
    if (tod === 'night') {
      const sp = by0('guard', 'smith', 'farmer'); if (sp) add(2, [sp], [[sp, `คืนนี้มอนสเตอร์แกร่งขึ้น ${Math.round((NIGHT.monPow - 1) * 100)}% ระวังตัวด้วยนะ`], ['hero', 'ทีมล่าให้อยู่แล้ว ข้าไปนอนก่อนนะ'], [sp, 'ดีแล้ว พักผ่อนให้พอ พรุ่งนี้ค่อยดูของที่ได้']])
      const s2 = by0('bard', 'merchant', 'farmer'); if (s2) add(1, [s2], [[s2, `กลางคืนมีโอกาสเจอร่างเรืองแสงราว ${glowP}% บางตัวรับมานาจากผลึกจนแสงออกมาจากในตัว`], ['hero', 'ต้องระวังต่างจากร่างปกติยังไงบ้าง'], [s2, 'ตัวที่เคยหนีอาจหันมาไล่ อย่าเดินเข้าใกล้เพียงเพราะอยากเห็นแสงชัด ๆ']])
      if (moon) { const s3 = by0('fisher', 'farmer', 'guard'); if (s3) add(3, [s3], [[s3, 'คืนนี้พระจันทร์เต็มดวง! มอนสเตอร์เรืองแสงออกมาเยอะเป็นสองเท่า'], ['hero', 'ของแรร์ก็ดรอปง่ายขึ้นอีกใช่ไหม'], [s3, 'ใช่ ดูแสงได้แล้วไปพักเถอะ พรุ่งนี้ค่อยเปิดบันทึกของที่ทีมล่าได้']]) }
    }
    // collector cards and the Sunday card merchant
    const nCards = Object.keys(f.cards || {}).length, maxed = Object.values(f.cards || {}).filter((v) => v >= 10).length
    if (new Date().getDay() === 0) { const sp = by0('merchant', 'banker', 'farmer'); if (sp) add(3, [sp], [[sp, 'วันอาทิตย์แล้ว! ข้าเอาการ์ดมอนสเตอร์มาขาย 5 ใบ ไปดูที่แท็บการ์ดนะ'], ['hero', 'มีใบหายาก ๆ ไหม'], [sp, 'บางสัปดาห์ก็มีบอส หรือแม้แต่ใบเรืองแสงนะ ลุ้นเอา']]) }
    else { const sp = by0('merchant', 'farmer'); if (sp) add(1, [sp], [['hero', 'พ่อค้าการ์ดมาวันไหนนะ'], [sp, 'ทุกวันอาทิตย์ มาทีละ 5 ใบ เก็บ FIAT ไว้ให้พอนะ']]) }
    if (nCards > 0) { const sp = by0('bard', 'apprentice', 'farmer'); if (sp) add(2, [sp], [[sp, `สมุดการ์ดของท่านมี ${nCards} ใบแล้วนะ!`], ['hero', "รอยจากมอนสเตอร์ติดอยู่ในแผ่นผลึกเหมือนภาพเลย ปิ่นบอกว่าจะช่วยเรียงตามถิ่น"], [sp, 'ใส่ใบซ้ำทับ ความสามารถก็แรงขึ้นเรื่อย ๆ']]) }
    else { const sp = by0('bard', 'farmer'); if (sp) add(1, [sp], [[sp, "ผลึกจากมอนสเตอร์บางตัวเก็บภาพไว้เป็นการ์ด กิลด์ใส่กรอบให้สะสม หายากพอ ๆ กับเศษทองเลย"], ['hero', 'ถ้าได้มาจะเอาใส่สมุดสะสมไว้']]) }
    if (maxed > 0) { const sp = by0('banker', 'merchant'); if (sp) add(2, [sp], [[sp, 'การ์ดที่เต็มสิบขั้นแล้ว ใบซ้ำเอามาขายให้ข้าได้นะ'], ['hero', 'ดีเลย จะได้เก็บ FIAT ไว้ซื้อใบใหม่']]) }
    // NPC wages: paid when the town income is collected; skipped (never a penalty) when FIAT runs short
    { const hired = (rpg.town?.npcs || []).filter((id) => S[id]); if (hired.length) { const sp = hired[0]; add(1, [sp], [[sp, 'ขอบคุณค่าจ้างนะ ข้าเอาส่วนหนึ่งไปซ่อมของที่บ้านแล้ว'], ['hero', 'ถ้าเดือนไหนเงินตึง ค้างไว้ก่อนได้ไหม'], [sp, 'ได้สิ ข้าก็ยังทำงานให้เหมือนเดิม ไม่ต้องห่วง']]) } }
    // new town decorations
    const dec = rpg.town?.decor || []
    if (dec.includes('dc_koi')) { const sp = by0('fisher', 'farmer'); if (sp) add(2, [sp], [[sp, 'ปลาคาร์ปในบ่อตัวโตขึ้นทุกวันเลยนะ'], ['hero', "ชาวประมงบอกว่าตัวลายแดงจำเวลาให้อาหารได้ แต่ตัวทองจำได้ทุกเวลา"]]) }
    if (dec.includes('dc_gymbar')) { const sp = by0('guard', 'smith'); if (sp) add(2, [sp], [[sp, 'บาร์ออกกำลังกายที่ท่านตั้งไว้ ข้าใช้ทุกเช้าเลย'], ['hero', 'ดีเลย ข้าก็จะไปโหนด้วย']]) }
    if (dec.includes('dc_bookstall')) { const sp = by0('apprentice', 'bard'); if (sp) add(2, [sp], [[sp, 'ซุ้มหนังสือหน้าบ้านมีเล่มใหม่มาอีกแล้ว'], ['hero', 'อ่านวันละนิด สะสมไปเรื่อย ๆ']]) }
    if (dec.includes('dc_piggy')) { const sp = by0('banker', 'merchant'); if (sp) add(2, [sp], [[sp, 'รูปปั้นกระปุกออมสินกลางเมือง เตือนใจทุกคนให้เก็บเงินเลยนะ'], ['hero', 'ตั้งใจไว้แบบนั้นแหละ']]) }
    if (dec.length >= 12) { const sp = by0('bard', 'farmer'); if (sp) add(1, [sp], [[sp, `เมืองเราสวยขึ้นมาก มีของแต่งตั้ง ${dec.length} ชิ้นแล้ว`], ['hero', 'ทุกคนช่วยกันดูแลนะ']]) }
    if (glowMon) { const sp = by0('merchant', 'banker', 'farmer'); if (sp) add(3, [sp], [[sp, `ได้ยินว่าท่านล่า${glowMon.name}ตัวเรืองแสงได้ด้วย!`], ['hero', 'เห็นแสงจากตัวมันก่อน แล้วมันก็เข้ามาไล่เร็วกว่าที่คิด'], [sp, `${glowMon.trophy}จากตัวเรืองแสง เอามาขายข้าได้เลยนะ`]]) }
  }

  // ---------- your real day ----------
  if (tr.exercise) {
    add(3, ['farmer'], [['farmer', 'เห็นท่านออกกำลังกายมาแล้ววันนี้ ตัวดูกระชับขึ้นนะ'], ['hero', 'เหนื่อยแต่สดชื่นดีลุง'], ['farmer', 'ร่างกายคือทุ่งนาผืนแรก ดูแลดีก็ออกรวงงาม']])
    if (S.smith) add(3, ['smith'], [['smith', 'ฮ่า! วันนี้ท่านซ้อมมาอีกแล้วสินะ'], ['hero', 'นิดหน่อยครับ วิดพื้นกับสควอต'], ['smith', 'ข้าก็ฝึกมือจากค้อนทีละวันเหมือนกัน นั่งพักก่อนสิ เดี๋ยวให้ดูงานที่เพิ่งซ่อม']])
  }
  if (tr.read) {
    const book = h?.reading?.[0]?.title
    add(3, S.apprentice ? ['apprentice'] : ['farmer'], [[S.apprentice ? 'apprentice' : 'farmer', `วันนี้อ่าน${book ? ` “${book}”` : 'หนังสือ'}ไปถึงไหนแล้ว`], ['hero', 'ได้อีกหลายหน้าเลย สนุกกว่าที่คิด'], [S.apprentice ? 'apprentice' : 'farmer', 'อ่านจบแล้วเล่าให้ฟังบ้างนะ!']])
  }
  if (tr.meditate) add(3, ['merchant'], [['merchant', 'ท่านดูใจเย็นผิดปกตินะวันนี้'], ['hero', 'นั่งสมาธิมาครับ หัวโล่งดี'], ['merchant', 'งั้นนั่งคุยก่อน ข้าเกือบรีบรับของจากคาราวานเมื่อเช้าเหมือนกัน โชคดีได้เปิดสมุดดูก่อน']])
  if (tr.vocab) add(3, S.banker ? ['banker'] : ['farmer'], [[S.banker ? 'banker' : 'farmer', 'ได้ยินว่าท่านท่องศัพท์ใหม่วันนี้'], ['hero', 'ใช่ จำได้เพิ่มอีกหลายคำ'], [S.banker ? 'banker' : 'farmer', `รวมแล้ว ${fmt(h?.learnt || 0)} คำ คำใหม่ทำให้ฟังเรื่องจากคนต่างเมืองรู้เรื่องขึ้นอีกหน่อย`]])
  if (tr.nocarb) {
    if (S.baker) add(3, ['baker'], [['baker', 'วันนี้ท่านไม่แตะขนมปังข้าอีกแล้ว!'], ['hero', 'ขอโทษนะ ช่วงนี้งดแป้งอยู่'], ['baker', 'ไม่เป็นไร ข้าลองอบผักย่างแล้ว คนซื้อเยอะกว่าเดิมอีก']])
    else add(3, ['merchant'], [['merchant', 'ขนมปังร้อน ๆ ไหมท่าน'], ['hero', 'วันนี้ขอผ่าน งดแป้งอยู่'], ['merchant', 'วินัยดีจริง งั้นผักสดล่ะ ข้ามีมาด้วย']])
  }
  if (tr.nospend) add(3, ['merchant', 'farmer'], [['merchant', `ท่าน${me}เดินผ่านแผงข้าไปเฉย ๆ อีกแล้ว`], ['farmer', 'ก็วันนี้เขาไม่ใช้เงินเลยน่ะสิ'], ['hero', 'ขอเก็บไว้ก่อนนะ วันหลังจะแวะ'], ['merchant', 'แวะมาทักเฉย ๆ ก็ได้ ข้ายังมีเรื่องจากคาราวานจะเล่า']])
  if (tr.paid) add(3, S.guard ? ['guard'] : ['farmer'], [[S.guard ? 'guard' : 'farmer', S.guard ? 'วันนี้ท่านฟันบอสหนี้ไปอีกแผล ข้าเห็นจากบนกำแพง!' : 'ได้ข่าวว่าวันนี้ท่านจ่ายหนี้ไปอีกก้อน!'], ['hero', 'ค่อย ๆ ลดลงทีละก้อน'], [S.guard ? 'guard' : 'farmer', 'ทีละก้อนนี่แหละ เดี๋ยวก็หมด']])
  if (tr.saved) {
    add(3, S.fisher ? ['fisher'] : ['farmer'], [[S.fisher ? 'fisher' : 'farmer', S.fisher ? 'วันนี้ท่านโยนเหยื่อลงบ่อออมอีกแล้วนะ' : 'วันนี้ท่านเก็บเงินเข้าออมอีกแล้วนะ'], ['hero', 'ทีละนิดก็ยังดี'], [S.fisher ? 'fisher' : 'farmer', S.fisher ? 'ปลาใหญ่มาทีหลังเสมอ ใจเย็นไว้' : 'เหมือนปลูกข้าว หว่านทีละกำ เดี๋ยวก็เต็มนา']])
    if (S.mage) add(3, ['mage'], [['mage', 'เงินเข้าคลังลงทุนแล้ว พลังเวทข้าเพิ่มขึ้นเลย!'], ['hero', 'ใช้ให้คุ้มนะไพร์'], ['mage', "ข้าศึกษาผลึกส่งข่าวอยู่ เคยเร่งเวทจนรองเท้าไหม้มาแล้ว คราวนี้จะอ่านรอยต่อก่อนลอง"]])
  }
  if (tr.form === 'tired') add(3, ['farmer'], [['farmer', 'ท่านดูง่วง ๆ นะวันนี้'], ['hero', 'เมื่อคืนนอนน้อยไปหน่อย'], ['farmer', 'คืนนี้เข้านอนเร็วนะ ร่างกายต้องการพัก']])
  if (tr.form === 'sharp') add(2, ['merchant'], [['merchant', 'โอ้ ท่านดูสดชื่นเป็นพิเศษ'], ['hero', 'นอนครบแปดชั่วโมงเลย'], ['merchant', 'หน้าตาสดใสแบบนี้ ต่อราคาข้าได้อีกแน่ ๆ']])
  if ((rpg.streak || 0) >= 7) add(2, ['farmer', 'merchant'], [['farmer', `ท่านจดบัญชีติดกันมา ${rpg.streak} วันแล้วนะ`], ['merchant', 'จริงเหรอ ข้าจดได้สามวันก็ลืมแล้ว'], ['hero', 'จดก่อนนอนทุกคืน เดี๋ยวก็ชินเอง']])

  // ---------- the hunt, raids and the party ----------
  const rec = (f.recent || []).slice(-10), wins = rec.filter((l) => l.win)
  const best = wins.map((l) => MON_BY_ID[l.mon]).filter(Boolean).sort((a, b) => ({ boss: 3, elite: 2, normal: 1 }[b.kind] - { boss: 3, elite: 2, normal: 1 }[a.kind]))[0]
  if (best) {
    const map = MAP_BY_ID[best.map]
    add(2, ['merchant'], [['merchant', `ได้ข่าวว่าทีมท่านปราบ${best.name}ที่${map?.name || 'นอกเมือง'}มา`], ['hero', 'ใช่ ได้ของมาขายด้วยนะ'], ['merchant', 'เอามาเลย ข้ารับซื้อ ราคามิตรภาพ!']])
    if (S.ranger) add(2, ['ranger'], [['ranger', `${best.name}ตัวนั้นวิ่งเร็วมาก แต่ลูกธนูข้าเร็วกว่า`], ['hero', 'ยิงแม่นจริง ๆ ฟิน'], ['ranger', "ข้าโตแถวชายป่า เคยตามจิ้งจอกไฟจนไปโผล่หน้าเหมือง ตั้งแต่นั้นจึงจำทั้งรอยเท้ากับหลักทาง"]])
  }
  const raid = (f.raids || []).filter((r) => Date.now() - new Date(r.at).getTime() < 26 * 3600e3).slice(-1)[0]
  if (raid) {
    const who = S.guard ? 'guard' : 'farmer'
    add(3, [who], raid.won === raid.mons.length
      ? [[who, `เมื่อ${new Date(raid.at).getHours() < 12 ? 'เช้า' : 'บ่าย'}มีมอนสเตอร์ ${raid.mons.length} ตัวบุกเข้าเมือง!`], ['hero', 'แล้วเป็นยังไงบ้าง'], [who, 'ไล่กลับไปหมดเลย ไม่มีใครบาดเจ็บ']]
      : [[who, `มอนสเตอร์บุกมา ${raid.mons.length} ตัว เราไล่ได้ ${raid.won} ตัว`], ['hero', 'ไม่เป็นไร คราวหน้าเราจะแข็งแรงกว่านี้'], [who, 'ข้าจะฝึกเพิ่ม! ท่านก็ทำวินัยต่อนะ ทีมจะได้เก่งขึ้น']])
  }
  if (f.away) add(3, ['farmer'], [['farmer', 'ตอนท่านไม่อยู่ ทีมออกล่าไม่หยุดเลยนะ'], ['hero', `จริงเหรอ ได้กี่ตัว`], ['farmer', `${f.away.wins} ตัว! ของเต็มกระเป๋าเลย`]])
  if (S.healer && S.mage) add(1, ['healer', 'mage'], [['mage', 'ลูน่า ทำไมเจ้าถึงชอบนั่งเงียบหลังกลับจากล่า'], ['healer', "ที่ค่ายภูเขาข้าต้องฟังทั้งคนเจ็บกับสัญญาณพายุ พอกลับเมืองก็ขอพักหูบ้าง ท่าน" + me + 'ก็ควรมีเวลาวางเรื่องในหัวเหมือนกันนะ'], ['hero', 'งั้นข้าขอนั่งเงียบข้าง ๆ สักพักแล้วกัน']])
  if (S.ranger && S.healer) add(1, ['ranger', 'healer'], [['ranger', 'วันนี้ข้าเห็นใบเสร็จร้านกาแฟปลิวมาสามใบ'], ['healer', 'กาแฟอร่อยก็จริง แต่เดือนนี้งบเหลือเท่าไหร่นะ'], ['hero', 'ยังอยู่ในงบ! สบายใจได้']])
  const sh = (f.shadowWorn || []).map((id) => SHADOW_BY_ID[id]).filter(Boolean)[0]
  if (sh) add(2, ['merchant'], [['merchant', `ข้าเห็นเงาของ${sh.name}เดินตามท่านอยู่ น่ากลัวชะมัด`], ['hero', "ไม่ต้องกลัว เป็นเงาบันทึกวิชาของผู้เดินทางที่กิลด์รักษาไว้ มาช่วยฝั่งเรา"], ['merchant', "ถ้างั้นข้าต้องถามเรื่องบ้านเกิดเขา ข้ายังมีแผนที่คาราวานอีกหลายหน้าว่างอยู่"]])
  const enhTop = Math.max(0, ...Object.values(f.enh || {}))
  if (enhTop >= 3 && S.smith) add(2, ['smith'], [['smith', `อุปกรณ์ +${enhTop} ของท่านส่องประกายแบบนี้ ใครตีให้เนี่ย`], ['hero', 'คริสตัลเวทจากการล่าน่ะ'], ['smith', 'ฝีมือเจ้าดีนี่ แต่ระวังนะ เกิน +5 ถ้าพลาดจะลดขั้น']])

  // ---------- festivals, weather and the market ----------
  if (w.event) {
    add(2, ['farmer', 'merchant'], [['farmer', `${w.event.name}มาถึงแล้ว เมืองครึกครื้นจัง`], ['merchant', 'ข้าขายของเทศกาลได้เยอะเลย!'], ['hero', 'สนุกได้ แต่ขอตามงบนะ'], ['farmer', 'นั่นแหละ มีทั้งความสนุกกับวันพรุ่งนี้ให้กลับมาดูแล']])
    if (S.visitor) add(3, ['visitor'], [['visitor', pick(visitorFor(w).lines, day)], ['hero', 'ยินดีต้อนรับสู่เมืองของเรา!'], ['visitor', 'เมืองน่าอยู่จริง ๆ ปีหน้าข้าจะมาอีก']])
    if (w.event.id === 'loy') add(3, ['farmer'], [['farmer', 'คืนนี้ไปลอยกระทงด้วยกันไหม'], ['hero', 'ไปสิ อยากนั่งดูแสงริมท่ากับทุกคนด้วย'], ['farmer', 'ข้าขอลอยหนี้ไปด้วยได้ไหมนะ ฮ่า ๆ'], ['hero', 'หนี้ลอยไม่ได้ลุง ต้องจ่ายเอา!']])
  }
  if (w.weather === 'rain' || w.weather === 'storm') add(2, ['farmer', 'merchant'], [['merchant', 'ฝนตกแบบนี้ ไม่มีคนเดินตลาดเลย'], ['farmer', 'ดีสำหรับนาข้า ดีสำหรับกระเป๋าท่านด้วย'], ['hero', 'อยู่บ้านอ่านหนังสือดีกว่า']])
  if (w.weather === 'sun') add(1, ['farmer'], [['farmer', 'แดดดีแบบนี้ ตากผ้าแห้งไวเชียว'], ['hero', 'ผมว่าจะออกไปเดินเล่นซักหน่อย'], ['farmer', 'เดินดี ไม่เสียเงินแถมได้สุขภาพ']])
  if (w.holiday) add(2, ['merchant'], [['merchant', 'วันหยุดแบบนี้ ห้างลดราคาทั่วเมือง'], ['hero', 'ผมจะพักผ่อนที่บ้านดีกว่า'], ['merchant', 'ท่านนี่ภูมิคุ้มกันโปรโมชั่นสูงจริง ๆ']])
  const cyc = useStore.getState().ui.btcCycle
  if (cyc?.zone === 'bottom' && S.mage) add(2, ['mage', 'merchant'], [['merchant', 'บิตคอยน์ลดราคาแล้ว! ซื้อเลยไหม'], ['mage', 'ใจเย็น ทยอยซื้อตามแผนดีกว่า'], ['hero', 'เห็นด้วยกับไพร์ ไม่ทุ่มหมดหน้าตัก']])
  if (cyc?.zone === 'top') add(2, ['merchant'], [['merchant', 'ตลาดร้อนมาก ใคร ๆ ก็พูดถึงแต่บิตคอยน์'], ['hero', 'ตอนคนตื่นเต้นที่สุด คือตอนที่ต้องระวังที่สุด'], ['merchant', 'คำพูดนี้ข้าขอจดไว้!']])

  // ---------- every other part of the game and your money ----------
  const by = (...ids) => ids.find((id) => S[id]) // first speaker who lives in town
  const f2 = rpg.farm || {}, bag = f2.bag || {}, v = rpg.vault || {}, sum = v.summary || {}
  const cur = rpg.chronicle?.cur, prevS = rpg.chronicle?.prevSame
  // level, skills, chests and quests
  if ((rpg.skillPts || 0) > 0) add(2, [by('banker', 'merchant')], [[by('banker', 'merchant'), `ท่านมีแต้มสกิลค้างอยู่ ${rpg.skillPts} แต้มนะ`], ['hero', 'ลืมไปเลย เดี๋ยวไปลงที่แท็บสกิล'], [by('banker', 'merchant'), 'เลือกตอนที่รู้ว่าทีมต้องการอะไรก็ได้ ช่างเองยังดูชิ้นงานก่อนยกค้อนเลย']])
  if (S.mage && (rpg.skillPts || 0) > 0) add(2, ['mage'], [['mage', 'ข้าอยากได้อุกกาบาตขั้นต่อไปจัง แต้มสกิลยังเหลือไหม'], ['hero', `เหลือ ${rpg.skillPts} แต้ม เดี๋ยวลงให้`]])
  if ((rpg.chests || []).length) add(3, ['farmer'], [['farmer', `มีหีบวินัยรอท่านอยู่ ${rpg.chests.length} ใบนะ อยู่ในแท็บชาวเมืองของหน้าล่า`], ['hero', 'เป็นร่องรอยของวันที่ได้ลงมือจริง ๆ เดี๋ยวไปเปิดดู'], ['farmer', 'หีบนี้เงินซื้อไม่ได้ ได้จากความอดทนเท่านั้น']])
  if (rpg.chestReady) add(2, ['merchant'], [['merchant', 'หีบรายวันของท่านยังไม่ได้เปิดเลยนะ'], ['hero', 'จริงด้วย เดี๋ยวไปเปิด'], ['merchant', 'เปิดฟรีทุกวัน พร้อมแล้วค่อยไปเปิดดูนะ']])
  if (rpg.collectReady) add(2, [by('farmer')], [['farmer', `รายได้เมืองสะสมไว้ ${rpg.collectDays} วันแล้ว (+${fmt(rpg.collectAmount || 0)} FIAT)`], ['hero', 'เก็บได้ที่ไหนนะ'], ['farmer', 'กดเก็บใต้ฉากเมืองเลย เก็บไว้ได้สูงสุด 7 วัน']])
  const claimable = (rpg.quests || []).filter((q) => q.done && !q.claimedAt)
  if (claimable.length) add(3, [by('guard', 'merchant')], [[by('guard', 'merchant'), `เควสต์ “${claimable[0].name}” ทำสำเร็จแล้ว รอรับรางวัลอยู่นะ`], ['hero', 'ไปรับที่แท็บบอสและเควสต์ใช่ไหม'], [by('guard', 'merchant'), 'ใช่แล้ว ข้าจดไว้ให้ กลับจากพักแล้วค่อยไปรับก็ได้']])
  if (rpg.monthBoss && !rpg.monthBoss.chosen && (rpg.monthBoss.options || []).length) add(2, [by('guard', 'farmer')], [[by('guard', 'farmer'), 'เดือนนี้ท่านยังไม่ได้เลือกบอสประจำเดือนเลย'], ['hero', 'มีให้เลือกอะไรบ้างนะ'], [by('guard', 'farmer'), 'ทุกตัวสูงกว่าเดือนก่อนแค่ก้าวเดียว เลือกตัวที่ท้าทายแต่ทำได้']])
  if (rpg.monthBoss?.chosen && !rpg.monthBoss.done) add(2, [by('guard', 'farmer')], [[by('guard', 'farmer'), `บอสประจำเดือน “${rpg.monthBoss.chosen.name}” ทำไปแล้ว ${fmt(rpg.monthBoss.progress)}/${fmt(rpg.monthBoss.chosen.target)}`], ['hero', 'เห็นระยะที่เดินมาแล้ว เดี๋ยวค่อยดูว่าจะเดินต่ออย่างไร']])
  if (rpg.monthBoss?.done) add(3, [by('bard', 'merchant')], [[by('bard', 'merchant'), `ท่านปราบบอสประจำเดือน “${rpg.monthBoss.chosen.name}” แล้ว!`], ['hero', 'ขอบคุณที่อยู่ด้วยกัน เดือนหน้าค่อยดูว่าแรงพอรับเรื่องไหน']])
  // debt bosses, goals and the story act
  const debt = (rpg.bosses || []).filter((b) => b.active && !b.isGoal).sort((a, b) => b.hp - a.hp)[0]
  if (debt && debt.maxHp) {
    const pctLeft = Math.round((debt.hp / debt.maxHp) * 100)
    add(2, [by('guard', 'farmer')], [[by('guard', 'farmer'), `${debt.name} เหลือพลังอีก ${pctLeft}% แล้ว`], ['hero', pctLeft > 50 ? 'ยังอีกไกล แต่ทุกงวดที่จ่ายคือแผลใหม่' : 'เหลือไม่ถึงครึ่ง ใกล้ชนะแล้ว!'], [by('guard', 'farmer'), 'ข้าเห็นท่านไม่ยอมแพ้มาตลอด']])
  }
  if (rpg.act?.free) add(2, ['farmer'], [['farmer', 'ตั้งแต่สะสางภาระได้ ทางข้างหน้าก็ดูชัดขึ้นเยอะเลย'], ['hero', 'ภาคใหม่คือให้เงินลงทุนทำงานแทนบ้าง'], ['farmer', `ตอนนี้อิสรภาพทางการเงิน ${(rpg.act.freedom * 100).toFixed(1)}% แล้วนะ`]])
  const goal = (rpg.goalBosses || rpg.bosses || []).find((b) => b.isGoal && b.active)
  if (goal) add(2, [by('fisher', 'farmer')], [[by('fisher', 'farmer'), `เป้าหมาย “${goal.name}” เหลืออีก ${privacyless(goal.hp)}`], ['hero', 'ค่อย ๆ เติมทุกเดือน'], [by('fisher', 'farmer'), 'เป้าหมายที่มีตัวเลข ไปถึงง่ายกว่าความฝันลอย ๆ']])
  // realm and net worth
  if (rpg.nextRealm && rpg.realmNet != null) add(1, ['merchant'], [['merchant', `ได้ยินว่าอีกไม่ไกลท่านจะย้ายไป${rpg.nextRealm.name}`], ['hero', 'ยังต้องเพิ่มมูลค่าสุทธิอีกหน่อย'], ['merchant', 'ข้าจะย้ายแผงตามไปด้วย ฮ่า ๆ']])
  // money this month
  if (cur && prevS && cur.exp < prevS.exp && cur.exp > 0) add(3, ['merchant', 'farmer'], [['merchant', 'เดือนนี้ท่านใช้เงินน้อยกว่าเดือนก่อน ณ วันเดียวกันนะ'], ['farmer', 'ข้าบอกแล้วว่าเขาทำได้'], ['hero', 'ตัดของที่ไม่จำเป็นออกไปหลายอย่าง']])
  if (cur && cur.saveRate != null && cur.saveRate >= 0.2) add(3, [by('banker', 'fisher', 'farmer')], [[by('banker', 'fisher', 'farmer'), `เดือนนี้ท่านเก็บได้ ${Math.round(cur.saveRate * 100)}% ของรายรับแล้ว`], ['hero', 'แบ่งเก็บก่อนใช้ทุกครั้งที่เงินเข้า'], [by('banker', 'fisher', 'farmer'), 'มีส่วนที่เก็บไว้ดูแลวันข้างหน้าด้วย ข้าก็พยายามแบ่งเสบียงแบบนี้เหมือนกัน']])
  if (cur && cur.noSpendDays >= 3) add(2, ['merchant'], [['merchant', `เดือนนี้ท่านมีวันไม่ใช้เงินแล้ว ${cur.noSpendDays} วัน`], ['hero', 'ตั้งใจว่าจะให้ได้มากกว่าเดือนก่อน']])
  const dleft = (iso) => Math.round((new Date(iso) - new Date(new Date().toDateString())) / 864e5)
  const due = Object.entries(v.cycles || {}).map(([id, c]) => ({ c: c && { ...c, daysLeft: dleft(c.dueDate) }, a: v.accById?.[id] })).find(({ c }) => c && !c.overdue && c.billDue > 0 && c.daysLeft >= 0 && c.daysLeft <= 3)
  if (due) add(3, [by('guard', 'merchant')], [[by('guard', 'merchant'), `บิล${due.a?.name || 'บัตรเครดิต'}ครบกำหนดในอีก ${due.c.daysLeft} วันนะ`], ['hero', 'กันเงินไว้แล้ว จ่ายเต็มจำนวนแน่นอน'], [by('guard', 'merchant'), 'ดี! จ่ายทันเวลา มังกรดอกเบี้ยก็ไม่ตื่น']])
  if ((rpg.portfolioValue || 0) > 0 && S.mage) add(1, ['mage'], [['mage', 'ข้าแวะดูคลังลงทุนมา รอบนี้พยายามดูตามแผนโดยไม่วิ่งตามทุกประกาย'], ['hero', 'ไม่ต้องดูทุกวันก็ได้ไพร์ ปล่อยให้มันทำงาน']])
  if (sum.coverage != null && sum.coverage >= 1 && S.healer) add(2, ['healer'], [['healer', 'เงินกันจ่ายหนี้ครบแล้ว ข้ากางบาเรียไว้ให้ตลอด'], ['hero', 'ขอบคุณลูน่า อุ่นใจขึ้นเยอะ']])
  if (w.sale) add(3, ['merchant'], [['merchant', `วันนี้วันเลขเบิ้ล ${w.sale.label || ''} ลดกระหน่ำ! สนใจอะไรไหม`], ['hero', 'ผ่านไปก่อน ของลดราคาที่ไม่ได้ใช้ก็ยังแพงอยู่ดี'], ['merchant', 'ถ้าวันนี้ท่านไม่ใช้เงินเลย ข้ายอมแพ้ให้ 1 GOLD!']])
  // your body and habits
  const hb = h?.by || {}
  if (rpg.condition?.id === 'fit') add(2, [by('smith', 'farmer')], [[by('smith', 'farmer'), 'เจ็ดวันมานี้ท่านนอนตรง ออกกำลัง ทำสมาธิครบ ร่างกายฟิตเต็มที่'], ['hero', 'พลังกายได้เพิ่มอีก 5 ด้วย']])
  if (rpg.condition?.id === 'worn') add(2, ['farmer'], [['farmer', 'ท่านดูล้า ๆ ช่วงนี้ อย่าหักโหมนะ'], ['hero', 'จะนอนให้ตรงเวลามากขึ้น'], ['farmer', 'ร่างกายพักดี ทุกอย่างก็ดีตาม']])
  if ((hb.exercise?.streak || 0) >= 3) add(2, [by('smith', 'guard', 'farmer')], [[by('smith', 'guard', 'farmer'), `ออกกำลังกายติดกัน ${hb.exercise.streak} วันแล้ว!`], ['hero', 'ถึง 14 วันจะสร้างโรงฝึกได้']])
  if ((hb.read?.streak || 0) >= 3) add(2, [by('apprentice', 'farmer')], [[by('apprentice', 'farmer'), `ท่านอ่านหนังสือติดกัน ${hb.read.streak} วันแล้วนะ`], ['hero', 'ก่อนนอนวันละนิด ติดเป็นนิสัยแล้ว']])
  if ((hb.meditate?.streak || 0) >= 3) add(2, [by('bard', 'merchant')], [[by('bard', 'merchant'), `สมาธิติดกัน ${hb.meditate.streak} วัน ท่านดูนิ่งขึ้นจริง ๆ`], ['hero', 'ใจนิ่ง ก็ไม่ซื้อของตามอารมณ์']])
  if ((hb.nocarb?.streak || 0) >= 3) add(2, [by('baker', 'merchant')], [[by('baker', 'merchant'), `${hb.nocarb.streak} วันแล้วที่ไม่แตะแป้งกับน้ำตาล`], ['hero', 'ร่างกายเบาขึ้นเยอะเลย']])
  if ((h?.finished?.length || 0) > 0) add(1, [by('apprentice', 'banker', 'farmer')], [[by('apprentice', 'banker', 'farmer'), `ท่านอ่านจบไปแล้ว ${h.finished.length} เล่ม`], ['hero', `เล่มล่าสุดคือ “${h.finished[0]?.title || 'หนังสือดี ๆ'}”`]])
  // ---------- the language curriculum (lessons, degrees) ----------
  const pth = h?.path
  if (pth?.lessons > 0) {
    const sp = by('banker', 'farmer')
    add(1, [sp], [[sp, `ได้ข่าวว่าเรียนภาษาผ่านไปแล้ว ${fmt(pth.lessons)} บท`], ['hero', 'ทีละบท ฟังก่อน ฝึกแล้วค่อยใช้เอง'], [sp, 'แบบนี้แหละ ค่อย ๆ ทบต้นเหมือนเงินออม']])
  }
  const degs = Object.entries(pth?.degree || {}).filter(([, k]) => k > 0)
  if (degs.length) {
    const sp = by('bard', 'merchant')
    if (sp) add(1.2, [sp], [[sp, `ท่าน${me}ใส่ชุดบัณฑิตมาด้วย! รับปริญญาแล้วเหรอ`], ['hero', 'ยังอีกไกล ปริญญาเอกต้องจบครบสี่ภาษา'], [sp, 'งั้นข้าจะแต่งเพลงรอไว้ตอนวันรับปริญญาเอกเลย']])
  }
  if ((h?.learnt || 0) >= 50 && S.visitor == null) add(1, [by('banker', 'farmer')], [[by('banker', 'farmer'), `จำศัพท์ได้ ${fmt(h.learnt)} คำแล้ว ไปเที่ยวต่างประเทศได้สบาย`], ['hero', 'ตอนนี้กำลังหัดเขียนตัวอักษรด้วย']])
  // hunting, gear, relics and shadows
  if ((bag.shard || 0) >= 7) add(2, [by('banker', 'merchant')], [[by('banker', 'merchant'), `ท่านมีเศษทองคำ ${bag.shard} เศษแล้ว อีกนิดก็หลอมเป็น GOLD ได้`], ['hero', 'ครบ 10 เศษเมื่อไหร่จะหลอมทันที']])
  if ((bag.mcrystal || 0) >= 3 && S.smith) add(2, ['smith'], [['smith', `คริสตัลเวท ${bag.mcrystal} ก้อนนั่น เอามาตีบวกอุปกรณ์ได้นะ`], ['hero', 'ถ้าเกิน +5 แล้วพลาด จะลดขั้นใช่ไหม'], ['smith', 'ใช่ แต่ไม่มีวันแตก ข้ารับประกัน']])
  if ((rpg.staminaLeft || 0) === 0) add(1, ['farmer'], [['farmer', 'ทีมกลับมาพักแล้ว พลังกายหมดเกลี้ยง'], ['hero', 'ทุกชั่วโมงได้คืน 1 แต้ม หรือไปทำวินัยเพิ่มก็ได้'], ['farmer', 'งั้นข้าว่าไปออกกำลังกายดีกว่า ได้ทั้งสุขภาพทั้งพลัง']])
  if (f2.mapMode === 'safe' || f2.mapMode === 'all') add(1, [by('guard', 'farmer')], [[by('guard', 'farmer'), 'ทีมวนล่าหลายแผนที่เลยนะช่วงนี้'], ['hero', `ตั้งให้ล่า${f2.mapMode === 'safe' ? 'เฉพาะที่ชนะ 70% ขึ้นไป' : 'ทุกแผนที่ที่สู้ไหว'}ไว้`]])
  if (Object.keys(f2.relics || {}).length && S.smith) add(1, ['smith'], [['smith', 'ของติดตัวที่ชาวเมืองทำให้ ใช้ดีไหม'], ['hero', 'ดีมาก อัปขั้นต่อได้ถ้ามีวัสดุครบ']])
  if ((rpg.shadowSlots || 0) > (f2.shadowWorn || []).length && Object.keys(f2.shadows || {}).length) add(1, ['merchant'], [['merchant', 'ช่องทหารเงายังว่างอยู่นะ ไม่ส่งออกรบเหรอ'], ['hero', 'จริงด้วย ไปจัดทีมที่แท็บปาร์ตี้ก่อน']])
  // the town itself
  const T = rpg.town || {}
  const empty = (T.plots || []).filter((b) => !b).length
  if (empty > 0) add(1, ['farmer'], [['farmer', `ที่ดินว่างอีก ${empty} แปลงนะ จะสร้างอะไรดี`], ['hero', 'ฟาร์มหรือบ้านพักน่าจะคุ้มก่อน'], ['farmer', 'ฟาร์มสร้างได้ถึง 3 แปลง ข้าช่วยดูแลให้']])
  if ((T.npcSlots || 0) > (T.npcs || []).length) add(1, ['merchant'], [['merchant', 'โรงเตี๊ยมยังมีห้องว่าง จ้างคนมาช่วยงานเมืองไหม'], ['hero', 'ขอดูก่อนว่าใครให้โบนัสอะไร']])
  if (T.happiness != null && T.happiness < 40) add(2, [by('bard', 'farmer')], [[by('bard', 'farmer'), 'ชาวเมืองดูเหงา ๆ นะช่วงนี้'], ['hero', 'เดี๋ยวหาของตกแต่งกับนักกวีมาเพิ่มความสุข']])
  if ((rpg.happyBonusToday || 0) > 0) add(2, [by('bard', 'farmer')], [[by('bard', 'farmer'), `เมืองเราครึกครื้น ทีมเลยได้พลังกายเพิ่มวันนี้ ${rpg.happyBonusToday} แต้ม`], ['hero', 'ความสุขของชาวเมืองช่วยทีมได้จริง ๆ'], [by('bard', 'farmer'), 'ของตกแต่งกับ NPC ที่จ้างมาช่วยเพิ่มความสุขนะ']])
  if (T.happiness >= 70) add(1, ['merchant', 'farmer'], [['merchant', 'ช่วงนี้ชาวเมืองยิ้มกันทั้งวันเลย'], ['farmer', 'เมืองสุข รายได้เมืองก็ดี ทีมก็มีแรงล่ามากขึ้น'], ['hero', 'งั้นต้องรักษาความสุขไว้ให้ดี']])
  if ((rpg.huntXpToday || 0) >= 30) add(2, [by('guard', 'farmer')], [[by('guard', 'farmer'), 'วันนี้ทีมล่าจน XP เต็มเพดาน 30 แล้วนะ'], ['hero', 'ที่เหลือต้องเก็บจากชีวิตจริง จดบัญชีกับทำนิสัย'], [by('guard', 'farmer'), 'ถูกต้อง เลเวลจริงมาจากวินัยจริง']])
  else if ((rpg.huntXpToday || 0) > 0) add(1, [by('guard', 'farmer')], [[by('guard', 'farmer'), `ทีมได้ XP จากการล่าวันนี้ ${rpg.huntXpToday} แล้ว`], ['hero', 'ชนะตัวละ 1 XP วันละไม่เกิน 30 ใช่ไหม'], [by('guard', 'farmer'), 'ใช่ ส่วนใหญ่ยังต้องมาจากชีวิตจริงนะ']])
  if (rpg.world?.birthday?.week) add(3, ['farmer', 'merchant'], [['farmer', `สัปดาห์นี้ทั้งเมืองฉลองวันเกิดท่าน${me}!`], ['merchant', 'ข้าลดราคาให้วันเดียว ฮ่า ๆ'], ['hero', 'ขอบคุณทุกคนมาก ปีนี้จะดีกว่าปีที่แล้ว']])
  if ((rpg.gold || 0) >= 1 && rpg.exchangeRate) add(1, [by('banker', 'merchant')], [[by('banker', 'merchant'), `ตอนนี้เรตแลก GOLD อยู่ที่ ${fmt(rpg.exchangeRate)} FIAT`], ['hero', 'ทองหายาก เก็บไว้ใช้กับของสำคัญ']])

  // ---------- villagers among themselves ----------
  add(1, ['merchant', 'farmer'], [['merchant', 'ลุง ซื้อจอบใหม่ไหม รุ่นล่าสุดเลย'], ['farmer', "จอบนี่ช่างคนเดิมทำจากแร่เหมืองรุ่นก่อนปิดงาน ข้าจะเอาไปให้เขาซ่อมด้าม"], ['merchant', 'ลุงไม่เคยซื้ออะไรจากข้าเลย!'], ['farmer', "ข้ายังซื้อแป้งจากเจ้าอยู่นี่นา แต่ต้องเก็บให้พ้นเป็ดก่อนถึงจะได้กิน"]])
  if (S.bard) add(1, ['bard', 'guard'].filter((id) => S[id]).length === 2 ? ['bard', 'guard'] : ['bard'], S.guard
    ? [['bard', '♪ ทหารยามยืนตรง ไม่เคยง่วง ไม่เคยหลับ ♪'], ['guard', 'หยุดแต่งกลอนแซวข้าได้แล้ว!'], ['bard', '♪ แต่ตอนบ่ายแอบงีบ ข้าเห็นนะ ♪'], ['hero', 'ฮ่า ๆ ทั้งสองคนพักบ้างก็ได้']]
    : [['bard', `♪ ท่าน${me}ผู้กล้า เก็บเงินทีละน้อย ♪`], ['hero', 'เพลงนี้เพราะดีนะ'], ['bard', 'ข้าแต่งให้ท่านโดยเฉพาะ ฟรี ไม่คิดเงิน!']])
  if (S.fisher && S.baker) add(1, ['fisher', 'baker'], [['fisher', 'วันนี้ได้ปลามาหลายตัว แลกขนมปังไหม'], ['baker', 'ตกลง! ไม่ต้องใช้เงินสักบาท'], ['hero', 'แลกของกันแบบนี้ก็ประหยัดดีนะ']])
  if (S.banker) add(1, ['banker', 'merchant'], [['merchant', 'ท่านนายธนาคาร ฝากเงินได้ดอกเท่าไหร่'], ['banker', 'ตามเงื่อนไขธนาคารเมืองเรา ข้าจดไว้ให้ตรวจทุกครั้งที่เก็บรายได้'], ['merchant', 'ช้าไปสำหรับข้า'], ['banker', 'เร็วช้าอย่างเดียวบอกไม่ได้ ต้องดูด้วยว่ากำลังไปไหนและรับอะไรไหว']])
  if (S.apprentice) add(1, ['apprentice'], [['apprentice', `คุณ${me} ผมกำลังอ่านเรื่องเชือกที่ผูกในป่า คนขับเกวียนบอกว่าเป็นกับดัก แต่บางเส้นอาจเป็นป้ายของคนที่อยู่ที่นั่น`], ['hero', "งั้นต้องดูให้รู้ว่าเส้นไหนมีไว้ทำอะไร"], ['apprentice', "ใช่เลย ครูบอกให้จดเฉพาะสิ่งที่รู้จริง ผมเลยต้องลบไปสามหน้าแล้ว"]])
  if ((rpg.gold || 0) >= 5) add(1, ['merchant'], [['merchant', `ท่านมีทอง ${rpg.gold} เหรียญเลยเหรอ`], ['hero', 'ค่อย ๆ เก็บมาจากวินัยทั้งนั้น'], ['merchant', 'ข้าขายของได้เป็นปียังไม่มีเท่านั้นเลย']])
  add(1, ['farmer'], [['hero', 'ลุงว่าการเก็บเงินที่ยากที่สุดคืออะไร'], ['farmer', 'สำหรับข้าคือยอมกลับมาดูในวันที่ไม่เป็นตามแผน แล้วค่อยเริ่มจากสิ่งที่ทำไหว'], ['hero', 'งั้นวันไหนสะดุด ข้าก็กลับมาคุยกับลุงได้สินะ']])
  return C
}

/** villagers who walk into the battle scene to cheer you on: [{ sprite, name, lines: [[who, text]] }], from today's town chat
 *  (only conversations between one villager and the hero; party members are already on stage) plus a few plain cheers */
export function sceneCheers(rpg) {
  const S = speakers(rpg), out = []
  const stage = new Set(['hero', 'healer', 'mage', 'ranger'])
  for (const c of townChats(rpg).sort((a, b) => b.w - a.w)) {
    const npcs = [...new Set(c.lines.map(([w]) => w).filter((w) => !stage.has(w)))]
    if (npcs.length !== 1 || !S[npcs[0]]) continue
    out.push({ id: npcs[0], sprite: S[npcs[0]].sprite, name: S[npcs[0]].name, w: c.w, lines: c.lines.slice(0, 3) })
  }
  const me = S.hero.name, tr = rpg.traces || {}
  const plain = [
    ['farmer', [['farmer', `สู้ ๆ นะท่าน${me}! ทั้งหมู่บ้านเชียร์อยู่`], ['hero', 'ขอบคุณครับลุง!']]],
    ['merchant', [['merchant', 'กลับจากปราบบอสแล้วมาเล่าให้ฟังด้วยนะ ข้าจะเก็บที่ข้างแผงไว้ให้!'], ['hero', 'ได้เลย ข้ามีเรื่องจากระหว่างทางจะเล่า']]],
    ['guard', [['guard', 'ข้าคุมหลังให้ ท่านลุยหน้าได้เต็มที่!']]],
    ['bard', [['bard', '♪ ทีละก้าว ทีละบาท สักวันหนี้จะหมดไป ♪'], ['hero', 'เพลงนี้ให้กำลังใจดีนะ']]],
    ['fisher', [['fisher', 'ใจเย็นไว้ ดูทางก่อนออกแรง ข้ารอฟังเรื่องตอนท่านกลับมา']]],
    ['apprentice', [['apprentice', `ผมเว้นหน้าไว้ให้เรื่องของคุณ${me}ด้วย กลับมาเมื่อไรค่อยเล่าให้ฟังนะ`]]],
    ['visitor', [['visitor', 'ขอให้ผ่านทุกด่านไปได้ด้วยดี!'], ['hero', 'ขอบคุณที่แวะมานะ']]],
  ]
  if (tr.paid) plain.unshift(['guard', [['guard', 'วันนี้ท่านจ่ายหนี้แล้ว! บอสเจ็บหนักเลย'], ['hero', 'อีกนิดเดียว!']]])
  for (const [id, lines] of plain) if (S[id]) out.push({ id, sprite: S[id].sprite, name: S[id].name, w: 1, lines })
  return out
}
