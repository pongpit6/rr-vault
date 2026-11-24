/**
 * Town conversations: villagers, the party and you (the hero) greet each other and chat.
 * Every conversation is a few lines back and forth, picked from what really happened today
 * (habits, money, hunting, raids, festivals, weather, time of day). Friendly only, never a scolding.
 */
import { useStore } from '../store'
import { NPC_BY_ID, RESIDENTS } from './town'
import { visitorFor } from './festivals'
import { MON_BY_ID, MAP_BY_ID } from './farmData'
import { SHADOW_BY_ID } from './farm'
import { APPRENTICE, storyOf } from './townTalk'

const PARTY = { healer: { name: 'ลูน่า', sprite: 'healer' }, mage: { name: 'ไพร์', sprite: 'mage' }, ranger: { name: 'ฟิน', sprite: 'ranger' } }
const fmt = (n) => Math.round(n).toLocaleString('th-TH')
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
  const hr = new Date().getHours(), day = new Date().getDate()
  const me = S.hero.name
  const C = []
  const add = (w8, need, lines) => { if (need.every((id) => S[id])) C.push({ w: w8, lines }) }

  // ---------- greetings by the time of day ----------
  if (hr >= 5 && hr < 11) {
    add(1, ['farmer'], [['farmer', `อรุณสวัสดิ์ท่าน${me}! ตื่นเช้าแบบนี้ วันนี้ต้องดีแน่`], ['hero', 'อรุณสวัสดิ์ลุง วันนี้ทุ่งดูเขียวกว่าเมื่อวานนะ'], ['farmer', 'ก็ข้ารดน้ำทุกเช้าเหมือนท่านจดบัญชีทุกวันนั่นแหละ']])
    add(1, ['merchant'], [['merchant', 'เช้านี้มีของใหม่มาลงแผงนะท่าน!'], ['hero', 'ขอดูก่อนนะ ยังไม่ซื้อ ฮ่า ๆ'], ['merchant', 'ดูฟรี! ข้าชอบลูกค้าที่คิดก่อนซื้อ']])
  } else if (hr >= 11 && hr < 17) {
    add(1, ['merchant', 'farmer'], [['merchant', 'เที่ยงแล้ว ข้าวกล่องข้าขายดีเชียว'], ['farmer', 'ข้าห่อข้าวมาเอง ประหยัดไปอีกวัน'], ['merchant', 'ลุงนี่ทำข้าขาดทุนทุกวันเลย…'], ['hero', 'ผมเข้าข้างลุงนะ ห่อข้าวไปทำงานก็ดีเหมือนกัน']])
    add(1, ['farmer'], [['hero', 'ลุงไม่พักบ้างเหรอ แดดแรงนะ'], ['farmer', 'พักแล้วค่อยทำต่อ เหมือนการออมนั่นแหละ ไม่ต้องรีบ แต่อย่าหยุด']])
  } else if (hr >= 17 && hr < 22) {
    add(1, ['merchant'], [['merchant', 'เย็นแล้ว ข้าจะเก็บแผงละ'], ['hero', 'วันนี้ขายดีไหม'], ['merchant', 'พอได้ ๆ ข้าจดรายรับไว้แล้วด้วย เรียนมาจากท่านนั่นแหละ']])
    add(1, ['farmer'], [['farmer', 'พระอาทิตย์ตกสวยนะคืนนี้'], ['hero', 'ใช่ ลุงกลับบ้านดี ๆ นะ'], ['farmer', 'ท่านก็เข้านอนให้ตรงเวลาล่ะ พรุ่งนี้จะได้สดชื่น']])
  } else {
    add(1, ['farmer'], [['hero', 'ดึกแล้ว ลุงยังไม่นอนอีกเหรอ'], ['farmer', 'เพิ่งตื่นมาดื่มน้ำ ท่านเองก็รีบนอนนะ'], ['hero', 'ครับ ขอปิดไฟอีกดวงก่อน']])
    if (S.guard) add(1, ['guard'], [['guard', 'เวรยามกลางคืน ทุกอย่างเรียบร้อยครับ'], ['hero', 'ขอบคุณที่เฝ้าเมืองนะ'], ['guard', 'หน้าที่ข้า! ท่านไปพักเถอะ']])
  }

  // ---------- your real day ----------
  if (tr.exercise) {
    add(3, ['farmer'], [['farmer', 'เห็นท่านออกกำลังกายมาแล้ววันนี้ ตัวดูกระชับขึ้นนะ'], ['hero', 'เหนื่อยแต่สดชื่นดีลุง'], ['farmer', 'ร่างกายคือทุ่งนาผืนแรก ดูแลดีก็ออกรวงงาม']])
    if (S.smith) add(3, ['smith'], [['smith', 'ฮ่า! วันนี้ท่านซ้อมมาอีกแล้วสินะ'], ['hero', 'นิดหน่อยครับ วิดพื้นกับสควอต'], ['smith', 'แข็งแรงกว่าค้อนของข้าแล้วมั้ง มาช่วยตีเหล็กหน่อยไหม']])
  }
  if (tr.read) {
    const book = h?.reading?.[0]?.title
    add(3, S.apprentice ? ['apprentice'] : ['farmer'], [[S.apprentice ? 'apprentice' : 'farmer', `วันนี้อ่าน${book ? ` “${book}”` : 'หนังสือ'}ไปถึงไหนแล้ว`], ['hero', 'ได้อีกหลายหน้าเลย สนุกกว่าที่คิด'], [S.apprentice ? 'apprentice' : 'farmer', 'อ่านจบแล้วเล่าให้ฟังบ้างนะ!']])
  }
  if (tr.meditate) add(3, ['merchant'], [['merchant', 'ท่านดูใจเย็นผิดปกตินะวันนี้'], ['hero', 'นั่งสมาธิมาครับ หัวโล่งดี'], ['merchant', 'งั้นข้าเลิกเชียร์ขายของละ คนใจนิ่งไม่ซื้อของตามอารมณ์หรอก']])
  if (tr.vocab) add(3, S.banker ? ['banker'] : ['farmer'], [[S.banker ? 'banker' : 'farmer', 'ได้ยินว่าท่านท่องศัพท์ใหม่วันนี้'], ['hero', 'ใช่ จำได้เพิ่มอีกหลายคำ'], [S.banker ? 'banker' : 'farmer', `รวมแล้ว ${fmt(h?.learnt || 0)} คำ ความรู้ไม่เฟ้อเหมือนทองคำ`]])
  if (tr.nocarb) {
    if (S.baker) add(3, ['baker'], [['baker', 'วันนี้ท่านไม่แตะขนมปังข้าอีกแล้ว!'], ['hero', 'ขอโทษนะ ช่วงนี้งดแป้งอยู่'], ['baker', 'ไม่เป็นไร ข้าลองอบผักย่างแล้ว คนซื้อเยอะกว่าเดิมอีก']])
    else add(3, ['merchant'], [['merchant', 'ขนมปังร้อน ๆ ไหมท่าน'], ['hero', 'วันนี้ขอผ่าน งดแป้งอยู่'], ['merchant', 'วินัยดีจริง งั้นผักสดล่ะ ข้ามีมาด้วย']])
  }
  if (tr.nospend) add(3, ['merchant', 'farmer'], [['merchant', `ท่าน${me}เดินผ่านแผงข้าไปเฉย ๆ อีกแล้ว`], ['farmer', 'ก็วันนี้เขาไม่ใช้เงินเลยน่ะสิ'], ['hero', 'ขอเก็บไว้ก่อนนะ วันหลังจะแวะ'], ['merchant', 'ข้าเสียลูกค้า แต่ก็ภูมิใจแทนนะ!']])
  if (tr.paid) add(3, S.guard ? ['guard'] : ['farmer'], [[S.guard ? 'guard' : 'farmer', S.guard ? 'วันนี้ท่านฟันบอสหนี้ไปอีกแผล ข้าเห็นจากบนกำแพง!' : 'ได้ข่าวว่าวันนี้ท่านจ่ายหนี้ไปอีกก้อน!'], ['hero', 'ค่อย ๆ ลดลงทีละก้อน'], [S.guard ? 'guard' : 'farmer', 'ทีละก้อนนี่แหละ เดี๋ยวก็หมด']])
  if (tr.saved) {
    add(3, S.fisher ? ['fisher'] : ['farmer'], [[S.fisher ? 'fisher' : 'farmer', S.fisher ? 'วันนี้ท่านโยนเหยื่อลงบ่อออมอีกแล้วนะ' : 'วันนี้ท่านเก็บเงินเข้าออมอีกแล้วนะ'], ['hero', 'ทีละนิดก็ยังดี'], [S.fisher ? 'fisher' : 'farmer', S.fisher ? 'ปลาใหญ่มาทีหลังเสมอ ใจเย็นไว้' : 'เหมือนปลูกข้าว หว่านทีละกำ เดี๋ยวก็เต็มนา']])
    if (S.mage) add(3, ['mage'], [['mage', 'เงินเข้าคลังลงทุนแล้ว พลังเวทข้าเพิ่มขึ้นเลย!'], ['hero', 'ใช้ให้คุ้มนะไพร์'], ['mage', 'ดอกเบี้ยทบต้นคือเวทที่ข้าชอบที่สุด ไม่ต้องร่ายเอง มันโตของมันเอง']])
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
    if (S.ranger) add(2, ['ranger'], [['ranger', `${best.name}ตัวนั้นวิ่งเร็วมาก แต่ลูกธนูข้าเร็วกว่า`], ['hero', 'ยิงแม่นจริง ๆ ฟิน'], ['ranger', 'ฝึกทุกวันน่ะสิ เหมือนท่านจดบัญชีทุกวัน']])
  }
  const raid = (f.raids || []).filter((r) => Date.now() - new Date(r.at).getTime() < 26 * 3600e3).slice(-1)[0]
  if (raid) {
    const who = S.guard ? 'guard' : 'farmer'
    add(3, [who], raid.won === raid.mons.length
      ? [[who, `เมื่อ${new Date(raid.at).getHours() < 12 ? 'เช้า' : 'บ่าย'}มีมอนสเตอร์ ${raid.mons.length} ตัวบุกเข้าเมือง!`], ['hero', 'แล้วเป็นยังไงบ้าง'], [who, 'ไล่กลับไปหมดเลย ไม่มีใครบาดเจ็บ']]
      : [[who, `มอนสเตอร์บุกมา ${raid.mons.length} ตัว เราไล่ได้ ${raid.won} ตัว`], ['hero', 'ไม่เป็นไร คราวหน้าเราจะแข็งแรงกว่านี้'], [who, 'ข้าจะฝึกเพิ่ม! ท่านก็ทำวินัยต่อนะ ทีมจะได้เก่งขึ้น']])
  }
  if (f.away) add(3, ['farmer'], [['farmer', 'ตอนท่านไม่อยู่ ทีมออกล่าไม่หยุดเลยนะ'], ['hero', `จริงเหรอ ได้กี่ตัว`], ['farmer', `${f.away.wins} ตัว! ของเต็มกระเป๋าเลย`]])
  if (S.healer && S.mage) add(1, ['healer', 'mage'], [['mage', 'ลูน่า เวทรักษาของเจ้าใช้มานาเยอะไหม'], ['healer', 'ไม่เยอะหรอก ถ้าท่าน' + me + 'ทำวินัยครบ มานาก็เต็มทุกวัน'], ['hero', 'งั้นพรุ่งนี้ผมจะลุกไปออกกำลังกายแต่เช้าเลย']])
  if (S.ranger && S.healer) add(1, ['ranger', 'healer'], [['ranger', 'วันนี้ข้าเห็นใบเสร็จร้านกาแฟปลิวมาสามใบ'], ['healer', 'กาแฟอร่อยก็จริง แต่เดือนนี้งบเหลือเท่าไหร่นะ'], ['hero', 'ยังอยู่ในงบ! สบายใจได้']])
  const sh = (f.shadowWorn || []).map((id) => SHADOW_BY_ID[id]).filter(Boolean)[0]
  if (sh) add(2, ['merchant'], [['merchant', `ข้าเห็นเงาของ${sh.name}เดินตามท่านอยู่ น่ากลัวชะมัด`], ['hero', 'ไม่ต้องกลัว เขาอยู่ฝั่งเรา'], ['merchant', 'งั้นช่วยเฝ้าแผงข้าด้วยได้ไหม ฮ่า ๆ']])
  const enhTop = Math.max(0, ...Object.values(f.enh || {}))
  if (enhTop >= 3 && S.smith) add(2, ['smith'], [['smith', `อุปกรณ์ +${enhTop} ของท่านส่องประกายแบบนี้ ใครตีให้เนี่ย`], ['hero', 'คริสตัลเวทจากการล่าน่ะ'], ['smith', 'ฝีมือเจ้าดีนี่ แต่ระวังนะ เกิน +5 ถ้าพลาดจะลดขั้น']])

  // ---------- festivals, weather and the market ----------
  if (w.event) {
    add(2, ['farmer', 'merchant'], [['farmer', `${w.event.name}มาถึงแล้ว เมืองครึกครื้นจัง`], ['merchant', 'ข้าขายของเทศกาลได้เยอะเลย!'], ['hero', 'สนุกได้ แต่ขอตามงบนะ'], ['farmer', 'นั่นแหละ สนุกแบบไม่เป็นหนี้']])
    if (S.visitor) add(3, ['visitor'], [['visitor', pick(visitorFor(w).lines, day)], ['hero', 'ยินดีต้อนรับสู่เมืองของเรา!'], ['visitor', 'เมืองน่าอยู่จริง ๆ ปีหน้าข้าจะมาอีก']])
    if (w.event.id === 'loy') add(3, ['farmer'], [['farmer', 'คืนนี้ไปลอยกระทงด้วยกันไหม'], ['hero', 'ไปสิ ขอลอยความฟุ่มเฟือยทิ้งไปด้วย'], ['farmer', 'ข้าขอลอยหนี้ไปด้วยได้ไหมนะ ฮ่า ๆ'], ['hero', 'หนี้ลอยไม่ได้ลุง ต้องจ่ายเอา!']])
  }
  if (w.weather === 'rain' || w.weather === 'storm') add(2, ['farmer', 'merchant'], [['merchant', 'ฝนตกแบบนี้ ไม่มีคนเดินตลาดเลย'], ['farmer', 'ดีสำหรับนาข้า ดีสำหรับกระเป๋าท่านด้วย'], ['hero', 'อยู่บ้านอ่านหนังสือดีกว่า']])
  if (w.weather === 'sun') add(1, ['farmer'], [['farmer', 'แดดดีแบบนี้ ตากผ้าแห้งไวเชียว'], ['hero', 'ผมว่าจะออกไปเดินเล่นซักหน่อย'], ['farmer', 'เดินดี ไม่เสียเงินแถมได้สุขภาพ']])
  if (w.holiday) add(2, ['merchant'], [['merchant', 'วันหยุดแบบนี้ ห้างลดราคาทั่วเมือง'], ['hero', 'ผมจะพักผ่อนที่บ้านดีกว่า'], ['merchant', 'ท่านนี่ภูมิคุ้มกันโปรโมชั่นสูงจริง ๆ']])
  const cyc = useStore.getState().ui.btcCycle
  if (cyc?.zone === 'bottom' && S.mage) add(2, ['mage', 'merchant'], [['merchant', 'บิตคอยน์ลดราคาแล้ว! ซื้อเลยไหม'], ['mage', 'ใจเย็น ทยอยซื้อตามแผนดีกว่า'], ['hero', 'เห็นด้วยกับไพร์ ไม่ทุ่มหมดหน้าตัก']])
  if (cyc?.zone === 'top') add(2, ['merchant'], [['merchant', 'ตลาดร้อนมาก ใคร ๆ ก็พูดถึงแต่บิตคอยน์'], ['hero', 'ตอนคนตื่นเต้นที่สุด คือตอนที่ต้องระวังที่สุด'], ['merchant', 'คำพูดนี้ข้าขอจดไว้!']])

  // ---------- villagers among themselves ----------
  add(1, ['merchant', 'farmer'], [['merchant', 'ลุง ซื้อจอบใหม่ไหม รุ่นล่าสุดเลย'], ['farmer', 'จอบเก่ายังใช้ได้ดี ซ่อมนิดหน่อยก็พอ'], ['merchant', 'ลุงไม่เคยซื้ออะไรจากข้าเลย!'], ['farmer', 'ก็เพราะงั้นข้าถึงมีเงินเก็บไง']])
  if (S.bard) add(1, ['bard', 'guard'].filter((id) => S[id]).length === 2 ? ['bard', 'guard'] : ['bard'], S.guard
    ? [['bard', '♪ ทหารยามยืนตรง ไม่เคยง่วง ไม่เคยหลับ ♪'], ['guard', 'หยุดแต่งกลอนแซวข้าได้แล้ว!'], ['bard', '♪ แต่ตอนบ่ายแอบงีบ ข้าเห็นนะ ♪'], ['hero', 'ฮ่า ๆ ทั้งสองคนพักบ้างก็ได้']]
    : [['bard', `♪ ท่าน${me}ผู้กล้า เก็บเงินทีละน้อย ♪`], ['hero', 'เพลงนี้เพราะดีนะ'], ['bard', 'ข้าแต่งให้ท่านโดยเฉพาะ ฟรี ไม่คิดเงิน!']])
  if (S.fisher && S.baker) add(1, ['fisher', 'baker'], [['fisher', 'วันนี้ได้ปลามาหลายตัว แลกขนมปังไหม'], ['baker', 'ตกลง! ไม่ต้องใช้เงินสักบาท'], ['hero', 'แลกของกันแบบนี้ก็ประหยัดดีนะ']])
  if (S.banker) add(1, ['banker', 'merchant'], [['merchant', 'ท่านนายธนาคาร ฝากเงินได้ดอกเท่าไหร่'], ['banker', 'มากพอให้เงินโตช้า ๆ แต่มั่นคง'], ['merchant', 'ช้าไปสำหรับข้า'], ['banker', 'ช้าแต่ไม่หยุด สุดท้ายชนะเสมอ']])
  if (S.apprentice) add(1, ['apprentice'], [['apprentice', `ท่าน${me} หนังสือเล่มไหนสนุกที่สุดที่เคยอ่าน`], ['hero', 'เล่มที่ทำให้เริ่มจดบัญชีนั่นแหละ'], ['apprentice', 'ข้าจะหามาอ่านบ้าง!']])
  if ((rpg.gold || 0) >= 5) add(1, ['merchant'], [['merchant', `ท่านมีทอง ${rpg.gold} เหรียญเลยเหรอ`], ['hero', 'ค่อย ๆ เก็บมาจากวินัยทั้งนั้น'], ['merchant', 'ข้าขายของได้เป็นปียังไม่มีเท่านั้นเลย']])
  add(1, ['farmer'], [['hero', 'ลุงว่าการเก็บเงินที่ยากที่สุดคืออะไร'], ['farmer', 'คือการเริ่ม พอเริ่มแล้ว ที่เหลือก็แค่ทำซ้ำ'], ['hero', 'งั้นผมผ่านด่านยากที่สุดมาแล้วสินะ']])
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
    ['merchant', [['merchant', 'ปราบบอสได้เมื่อไหร่ ข้าจะลดราคาให้ฉลอง!'], ['hero', 'จำไว้นะ ห้ามเบี้ยว']]],
    ['guard', [['guard', 'ข้าคุมหลังให้ ท่านลุยหน้าได้เต็มที่!']]],
    ['bard', [['bard', '♪ ทีละก้าว ทีละบาท สักวันหนี้จะหมดไป ♪'], ['hero', 'เพลงนี้ให้กำลังใจดีนะ']]],
    ['fisher', [['fisher', 'ใจเย็น ๆ เหมือนตกปลา เดี๋ยวบอสก็อ่อนแรงเอง']]],
    ['apprentice', [['apprentice', `ข้าจดเรื่องของท่าน${me}ไว้ในจดหมายเหตุทุกวันเลยนะ!`]]],
    ['visitor', [['visitor', 'ขอให้ผ่านทุกด่านไปได้ด้วยดี!'], ['hero', 'ขอบคุณที่แวะมานะ']]],
  ]
  if (tr.paid) plain.unshift(['guard', [['guard', 'วันนี้ท่านจ่ายหนี้แล้ว! บอสเจ็บหนักเลย'], ['hero', 'อีกนิดเดียว!']]])
  for (const [id, lines] of plain) if (S[id]) out.push({ id, sprite: S[id].sprite, name: S[id].name, w: 1, lines })
  return out
}
