import { useStore } from '../store'
import { visitorFor } from './festivals'
/**
 * Villagers who remember: every line is built from your real data (no AI, just templates).
 * Lines are friendly only, never a scolding: on a quiet day villagers talk about the weather or past wins.
 */
import { NPC_BY_ID, RESIDENTS } from './town'

const fmt = (n) => Math.round(n).toLocaleString('th-TH')
export const APPRENTICE = { id: 'apprentice', sprite: 'npc_apprentice', name: 'ปิ่น เด็กฝึกงานห้องสมุด' }

/**
 * The library apprentice's story: one chapter per reading milestone, unlocked for good.
 * `at` tells what opens the chapter; `need` is the hint shown while it is still closed.
 */
export const APPRENTICE_STORY = [
  { id: 1, title: 'ผู้มาเยือนหน้าประตูเมือง', ok: (h) => h.by.read.total >= 1, need: 'อ่านหนังสือวันแรก',
    text: "ปิ่นมาถึงหมู่บ้านพร้อมหนังสืออ่านค้างและห่อเอกสารจากคาราวาน เขาตามหาห้องสมุดที่รับเด็กฝึก ครูบรรณารักษ์ให้เริ่มด้วยการเรียงสมุดเวรเหมือง แต่ปิ่นอ่านตัวเขียนคนงานไม่ออก จึงขอนั่งฝึกข้างท่านที่เพิ่งเริ่มอ่านเช่นกัน" },
  { id: 2, title: 'ชั้นหนังสือชั้นแรก', ok: (h) => h.finished.length >= 1, need: 'อ่านจบ 1 เล่ม',
    text: (h) => `ปิ่นเขียนชื่อ “${h.finished.at(-1)?.title || 'หนังสือเล่มแรก'}” ลงสมุดอ่าน ช่างตีเหล็กให้ไม้เหลือมาทำชั้นข้างหน้าต่าง เขาวางพจนานุกรมเล่มเล็กคู่กับสมุดเวรเก่า แล้วเริ่มแยกลายมือคนงานแต่ละคนได้` },
  { id: 3, title: 'มุมอ่านใต้หน้าต่าง', ok: (h) => h.pagesTotal >= 500, need: 'อ่านสะสม 500 หน้า',
    text: (h) => `อ่านสะสมผ่านห้าร้อยหน้าแล้ว (${fmt(h.pagesTotal)} หน้า) ปิ่นจัดมุมอ่านให้คนในเมืองนำเอกสารมาเทียบ ชาวนาเอาป้ายลังเหมืองมา ส่วนพ่อค้าหอบสมุดเส้นทางมาด้วย ทั้งคู่เพิ่งรู้ว่าตราบนกระดาษของตนเป็นรูปเดียวกัน` },
  { id: 4, title: 'กุญแจห้องสมุด', ok: (h) => h.finished.length >= 3 || h.by.read.best >= 14, need: 'อ่านจบ 3 เล่ม หรืออ่านติดกัน 14 วัน',
    text: "ครูบรรณารักษ์ให้ปิ่นถือกุญแจห้องเก็บแผนที่ เด็กฝึกพบว่าสายบนแผนที่ไม่ได้บอกถนนอย่างเดียว บางสายเชื่อมตราระฆังของแต่ละถิ่น เขาคัดสำเนาไว้ข้างสมุดอ่าน พร้อมเว้นช่องให้เรื่องจากคนเดินทางมาเติม" },
  { id: 5, title: 'จดหมายเหตุของเมือง', ok: (h) => h.finished.length >= 5, need: 'อ่านจบ 5 เล่ม',
    text: "ปิ่นตั้งชื่อสมุดว่า “จดหมายเหตุแห่งเมือง” เขาแยกเรื่องที่อ่านจากตำราออกจากเรื่องที่ชาวนา ช่าง และพ่อค้าเล่า แต่ละหน้ามีช่องต้นทางกับวันที่ เพื่อให้คนรุ่นหลังรู้ว่าเรื่องใดมีพยาน เรื่องใดยังต้องถามต่อ" },
  { id: 6, title: 'บรรณารักษ์คนใหม่', ok: (h) => h.finished.length >= 10, need: 'อ่านจบ 10 เล่ม',
    text: "ปิ่นได้รับป้ายบรรณารักษ์และโต๊ะรับต้นฉบับของตน สมุดเวรเหมืองอยู่ข้างบันทึกเผ่าป่ากับแผนที่คาราวานแล้ว เขายังเว้นหน้าว่างไว้สำหรับผู้เดินทางกลับมาเล่า และจัดเก้าอี้ตัวแรกให้คนที่บอกว่ายังอ่านไม่เก่ง" },
]

export function storyOf(h) {
  if (!h) return { chapters: [], next: APPRENTICE_STORY[0], arrived: false }
  const chapters = APPRENTICE_STORY.filter((c) => c.ok(h)).map((c) => ({ ...c, text: typeof c.text === 'function' ? c.text(h) : c.text }))
  return { chapters, next: APPRENTICE_STORY.find((c) => !c.ok(h)) || null, arrived: chapters.length > 0 }
}

/** All lines the town can say right now: [{ id, sprite, name, text }] */
export function townLines(rpg) {
  const h = rpg.habits, tr = rpg.traces || {}, out = []
  const say = (id, text) => {
    const who = id === 'apprentice' ? APPRENTICE : NPC_BY_ID[id] || RESIDENTS.find((r) => r.id === id)
    if (who && text) out.push({ id, sprite: who.sprite, name: who.name, text })
  }
  const hired = new Set(rpg.town.npcs)

  // farmer: the rhythm of logging
  if (rpg.streak >= 3) say('farmer', `บันทึกติดกัน ${rpg.streak} วันแล้ว เหมือนรดน้ำต้นข้าวทุกเช้า ปีนี้รวงคงงาม`)
  else if (tr.logged) say('farmer', "เห็นท่านจดบัญชีแล้ว ข้าก็ต้องลงสมุดเมล็ดบ้าง เผ่าสไลม์ชอบเอาใบหญ้ามาวางแทนลายเซ็น ข้าต้องจำให้ได้ว่าใบไหนเป็นครอบครัวไหน")
  else say('farmer', "วันนี้ข้าจะซ่อมรั้วฝั่งทุ่ง เป็ดโจรยกพวกมาสำรวจอีกแล้ว ถ้าช่วยเฝ้าขนมปังให้ก่อน ข้าจะได้ไม่ต้องเริ่มมื้อเช้าใหม่")

  // festival guest: walks in for the day and says one line
  const guest = visitorFor(rpg.world)
  if (guest) out.push({ id: `visitor_${guest.id}`, sprite: guest.sprite, name: `${guest.name} (แขกเทศกาล)`, text: guest.lines[new Date().getDate() % guest.lines.length] })

  // birthday week: the farmer brings a cake
  const bd = rpg.world.birthday
  if (bd?.week) out.unshift({ id: 'bday', sprite: 'npc_farmer', name: 'ชาวเมือง', text: bd.isToday ? `สุขสันต์วันเกิดครบ ${bd.age} ปี! ทั้งเมืองอบเค้กรอท่านอยู่ที่ลานกลาง 🎂` : `สัปดาห์นี้ทั้งเมืองยังฉลองวันเกิด ${bd.age} ปีของท่านอยู่เลย 🎉` })

  // merchant: money today, never scolding (the BTC cycle comes first when the market is at either end)
  const cyc = useStore.getState().ui.btcCycle
  if (cyc?.zone === 'bottom') say('merchant', `ตลาดบิตคอยน์ลดราคา! สัญญาณก้นรอบติดแล้ว ${cyc.bottomHits ?? '?'} ข้อ พ่อค้าเร่ตั้งป้าย SALE แล้ว… แต่กันเงินจ่ายหนี้ให้ครบก่อนนะ`)
  else if (cyc?.zone === 'top') say('merchant', `หอเตือนภัยชักธงแดง สัญญาณยอดรอบติด ${cyc.peakHits ?? '?'} ข้อแล้ว ช่วงนี้ของแพง ระวังใจตัวเองดี ๆ`)
  else if (cyc?.zone === 'warm') say('merchant', 'ตลาดเริ่มร้อน หอเตือนภัยชักธงส้มแล้ว ค่อย ๆ ทำตามแผนเดิมไว้นะ')
  else if (tr.nospend && rpg.noSpendStreak >= 2) say('merchant', `${rpg.noSpendStreak} วันแล้วที่ท่านไม่ซื้ออะไรจากแผงข้าเลย… ข้าเสียลูกค้า แต่ท่านได้เงินเก็บ ยอมรับเลย`)
  else if (tr.nospend) say('merchant', 'วันนี้แวะมาทักเฉย ๆ ก็ได้ ข้าชอบมีคนฟังเรื่องคาราวาน ไม่จำเป็นต้องซื้อของทุกครั้งหรอก')
  else if (rpg.world.mood?.line) say('merchant', rpg.world.mood.line)

  // apprentice: the reading story
  const st = storyOf(h)
  if (st.arrived) {
    const book = h.reading?.[0]
    say('apprentice', tr.read ? `วันนี้ท่านอ่าน${book ? ` “${book.title}”` : ''}ด้วย ข้าจุดตะเกียงรอไว้ที่มุมอ่านแล้วนะ` : st.next ? `บทต่อไปของข้า: ${st.next.need} ข้ารอดูอยู่นะ` : "ข้าแยกชั้นจดหมายเหตุออกจากคู่มือช่างแล้ว เรื่องของท่านอยู่ข้างเส้นทางคาราวาน มีคนมาเปิดอ่านทุกวันเลย")
  }

  if (hired.has('guard')) {
    const hit = rpg.bosses.filter((b) => !b.isGoal && b.damage > 0).sort((a, b) => b.damage - a.damage)[0]
    say('guard', tr.paid ? 'วันนี้ท่านฟันบอสหนี้อีกแผล! ข้าเห็นกับตาจากบนกำแพง' : hit ? `ตั้งแต่เริ่ม ท่านฟัน${hit.name}ไปแล้ว ฿${fmt(hit.damage)} ข้านับไว้ทุกแผล` : NPC_BY_ID.guard.line)
  }
  if (hired.has('fisher')) say('fisher', tr.saved ? 'วันนี้ท่านโยนเหยื่อลงบ่อออมทรัพย์อีกแล้ว ตกปลาต้องใจเย็น ปลาใหญ่มาทีหลังเสมอ' : `ยศนักออมของท่านตอนนี้คือ “${rpg.rank.name}” ค่อย ๆ ไป น้ำนิ่งไหลลึก`)
  if (hired.has('baker')) {
    const nc = h?.by.nocarb.streak || 0
    say('baker', nc >= 2 ? `${nc} วันแล้วที่ท่านไม่แตะขนมปังของข้า ฮ่า ๆ ข้าอบผักย่างให้แทนดีไหม` : NPC_BY_ID.baker.line)
  }
  if (hired.has('smith')) {
    const reps = h ? h.reps.push + h.reps.squat + h.reps.sit : 0
    say('smith', reps ? `ท่านฝึกสะสมมา ${fmt(reps)} ครั้งแล้ว ข้าจำรอยค้อนแรกของตัวเองได้ดี งานเล็ก ๆ ที่ทำจริงฝากรอยไว้เสมอ` : NPC_BY_ID.smith.line)
  }
  if (hired.has('bard')) {
    const ach = [...rpg.achievements].filter((a) => a.unlockedAt).sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))[0]
    say('bard', ach ? `♪ บทเพลงใหม่ของข้าชื่อ “${ach.name}” แต่งให้ท่านโดยเฉพาะ ♪` : NPC_BY_ID.bard.line)
  }
  if (hired.has('banker')) say('banker', h && h.learnt ? `ท่านจำศัพท์ได้ ${fmt(h.learnt)} คำแล้ว คราวหน้าคาราวานมา ข้าอาจต้องขอให้ช่วยอ่านชื่อของใหม่` : NPC_BY_ID.banker.line)

  // weather / festival small talk so a quiet day still feels alive
  if (rpg.world.event) say('farmer', `${rpg.world.event.emoji} ${rpg.world.event.name} มาถึงแล้ว ${rpg.world.event.line}`)
  else if (rpg.world.weather === 'rain') say('merchant', 'ฝนตกแบบนี้ อยู่บ้านอ่านหนังสือก็ดีนะ')
  if (tr.form === 'tired') say('farmer', 'ท่านดูง่วง ๆ นะวันนี้ คืนนี้เข้านอนเร็วหน่อยก็ได้')
  if (tr.form === 'rest') say('merchant', 'วันนี้พักก่อนก็ได้ เมืองยังมีที่นั่งของท่านเหมือนเดิม')
  return out
}
