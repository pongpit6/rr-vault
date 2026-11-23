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
    text: 'เด็กสวมแว่นถือหนังสือเก่ามาหยุดที่ประตูเมือง “ได้ยินว่าที่นี่มีคนเริ่มอ่านหนังสือแล้ว ข้าขอพักอยู่ด้วยได้ไหม” เขาบอกว่าชื่อปิ่น' },
  { id: 2, title: 'ชั้นหนังสือชั้นแรก', ok: (h) => h.finished.length >= 1, need: 'อ่านจบ 1 เล่ม',
    text: (h) => `ปิ่นเห็นท่านอ่าน “${h.finished.at(-1)?.title || 'หนังสือเล่มแรก'}” จบ เขาตอกตะปูทำชั้นไม้เล็ก ๆ แล้ววางเล่มนั้นไว้ตรงกลาง “เล่มแรกสำคัญที่สุด เพราะมันพิสูจน์ว่าท่านทำได้”` },
  { id: 3, title: 'มุมอ่านใต้หน้าต่าง', ok: (h) => h.pagesTotal >= 500, need: 'อ่านสะสม 500 หน้า',
    text: (h) => `ห้าร้อยหน้าแล้ว (${fmt(h.pagesTotal)} หน้า) ปิ่นลากเก้าอี้มาวางใต้หน้าต่าง จุดตะเกียงไว้ข้าง ๆ “ชาวเมืองเริ่มแวะมานั่งอ่านกันแล้วนะ ท่านเป็นคนเริ่ม”` },
  { id: 4, title: 'กุญแจห้องสมุด', ok: (h) => h.finished.length >= 3 || h.by.read.best >= 14, need: 'อ่านจบ 3 เล่ม หรืออ่านติดกัน 14 วัน',
    text: 'บรรณารักษ์เฒ่ายื่นกุญแจทองเหลืองให้ปิ่น “เจ้าดูแลชั้นหนังสือได้ดี” ปิ่นวิ่งมาบอกท่านเป็นคนแรก แก้มแดงด้วยความดีใจ' },
  { id: 5, title: 'จดหมายเหตุของเมือง', ok: (h) => h.finished.length >= 5, need: 'อ่านจบ 5 เล่ม',
    text: 'ปิ่นเริ่มเขียนสมุดเล่มใหญ่ชื่อ “จดหมายเหตุแห่งเมือง” บันทึกทุกเล่มที่ท่านอ่านจบและทุกวันที่เมืองเปลี่ยนไป “สักวันจะมีคนมาอ่านเรื่องของท่าน”' },
  { id: 6, title: 'บรรณารักษ์คนใหม่', ok: (h) => h.finished.length >= 10, need: 'อ่านจบ 10 เล่ม',
    text: 'วันนี้ปิ่นไม่ใช่เด็กฝึกงานแล้ว ป้ายหน้าห้องสมุดเขียนชื่อเขาเป็นบรรณารักษ์ “ข้าโตมาพร้อมกับชั้นหนังสือของท่าน ขอบคุณที่ไม่หยุดอ่าน”' },
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
  else if (tr.logged) say('farmer', 'เห็นท่านจดบัญชีวันนี้แล้ว ข้าก็ไปรดน้ำแปลงผักต่อละ')
  else say('farmer', 'ฟ้าวันนี้ดี เหมาะจะเริ่มอะไรใหม่ ๆ สักอย่าง')

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
  else if (tr.nospend) say('merchant', 'วันนี้ท่านเดินผ่านแผงข้าไปเฉย ๆ เก่งมาก กระเป๋าตังค์คงยิ้มอยู่')
  else if (rpg.world.mood?.line) say('merchant', rpg.world.mood.line)

  // apprentice: the reading story
  const st = storyOf(h)
  if (st.arrived) {
    const book = h.reading?.[0]
    say('apprentice', tr.read ? `วันนี้ท่านอ่าน${book ? ` “${book.title}”` : ''}ด้วย ข้าจุดตะเกียงรอไว้ที่มุมอ่านแล้วนะ` : st.next ? `บทต่อไปของข้า: ${st.next.need} ข้ารอดูอยู่นะ` : 'ห้องสมุดของเราเต็มไปด้วยเรื่องราวของท่าน')
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
    say('smith', reps ? `ท่านยกตัวเองมาแล้ว ${fmt(reps)} ครั้ง แข็งแรงกว่าค้อนของข้าเสียอีก` : NPC_BY_ID.smith.line)
  }
  if (hired.has('bard')) {
    const ach = [...rpg.achievements].filter((a) => a.unlockedAt).sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))[0]
    say('bard', ach ? `♪ บทเพลงใหม่ของข้าชื่อ “${ach.name}” แต่งให้ท่านโดยเฉพาะ ♪` : NPC_BY_ID.bard.line)
  }
  if (hired.has('banker')) say('banker', h && h.learnt ? `ท่านจำศัพท์ได้ ${fmt(h.learnt)} คำ ความรู้ไม่เฟ้อ เหมือนทองคำ` : NPC_BY_ID.banker.line)

  // weather / festival small talk so a quiet day still feels alive
  if (rpg.world.event) say('farmer', `${rpg.world.event.emoji} ${rpg.world.event.name} มาถึงแล้ว ${rpg.world.event.line}`)
  else if (rpg.world.weather === 'rain') say('merchant', 'ฝนตกแบบนี้ อยู่บ้านอ่านหนังสือก็ดีนะ')
  if (tr.form === 'tired') say('farmer', 'ท่านดูง่วง ๆ นะวันนี้ คืนนี้เข้านอนเร็วหน่อยก็ได้')
  if (tr.form === 'rest') say('merchant', 'วันพักก็สำคัญ พรุ่งนี้ค่อยลุยต่อ')
  return out
}
