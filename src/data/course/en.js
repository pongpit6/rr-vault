// Lesson map for EN (titles, goals and tasks from the owner's curriculum file). Bodies are added section by section.
import S1 from './en1.js'
import S2 from './en2.js'
import S3 from './en3.js'
import S4 from './en4.js'
const META = [
{
"id": "EN-01",
"sec": 1,
"title": "เสียงและตัวอักษร A–Z",
"goal": "รู้จักรูปใหญ่เล็กและเลียนเสียงคำทักทาย",
"topics": "ชื่ออักษรต่างจากเสียงในคำ; สระ/พยัญชนะ; ฝึกฟัง hi, hello",
"seed": "hello, hi, bye, name",
"example": "Hello. I'm May. = สวัสดี ฉันชื่อเมย์",
"task": "จับคู่อักษรใหญ่เล็ก 10 คู่และทักทายตอบโดยฟังตัวอย่างก่อน"
},
{
"id": "EN-02",
"sec": 1,
"title": "สะกดชื่อและขอให้พูดซ้ำ",
"goal": "สะกดชื่อตนเองและใช้วลีช่วยเมื่อฟังไม่ทัน",
"topics": "การสะกดชื่อ; ตัวเลข 0–10; วลีสำเร็จรูปก่อนเรียนไวยากรณ์",
"seed": "spell, again, please, sorry",
"example": "Could you say that again, please? = ช่วยพูดอีกครั้งได้ไหม",
"task": "ฟังชื่อสั้น 3 ชื่อแล้วจดอักษร ใช้วลีขอให้ซ้ำและสะกดชื่อของตน"
},
{
"id": "EN-03",
"sec": 1,
"title": "ฉัน คุณ และการแนะนำตัว",
"goal": "บอกชื่อและประเทศของตนได้",
"topics": "I/you/he/she/it/we/they + am/is/are; ประโยคบอกเล่า",
"seed": "Thai, student, teacher, from",
"example": "I am from Thailand. = ฉันมาจากประเทศไทย",
"task": "แนะนำตัว 3 ประโยคและจับคู่คนกับข้อมูลจากเสียง"
},
{
"id": "EN-04",
"sec": 1,
"title": "คำถามและปฏิเสธด้วย be",
"goal": "ถามตอบตัวตนและตรวจข้อมูลได้",
"topics": "Am/Is/Are + ประธาน; not; คำตอบสั้น",
"seed": "yes, no, ready, tired",
"example": "Are you a student? No, I'm not. = คุณเป็นนักเรียนไหม ไม่ใช่",
"task": "ถามตอบข้อมูลคน 4 คนโดยไม่อ่านแบบเต็ม"
},
{
"id": "EN-05",
"sec": 1,
"title": "สิ่งของรอบตัว",
"goal": "เรียกสิ่งของหนึ่งชิ้นและหลายชิ้นได้",
"topics": "a/an ตามเสียง; คำนามนับได้พหูพจน์; this/that/these/those",
"seed": "pen, book, bag, phone",
"example": "This is a book. These are pens. = นี่คือหนังสือ เหล่านี้คือปากกา",
"task": "อธิบายภาพของ 6 ชิ้นและแยกหนึ่ง/หลายชิ้นได้"
},
{
"id": "EN-06",
"sec": 1,
"title": "เจ้าของและครอบครัว",
"goal": "บอกว่าใครเป็นใครและของใคร",
"topics": "my/your/his/her/our/their; 's แสดงเจ้าของ; who/whose",
"seed": "mother, father, friend, sister",
"example": "This is my sister. Her name is Anna. = นี่คือพี่สาว/น้องสาวของฉัน เธอชื่อแอนนา",
"task": "วาดผังคนสมมติ 4 คนและตอบคำถามเจ้าของสิ่งของ"
},
{
"id": "EN-07",
"sec": 1,
"title": "ตัวเลข อายุ และข้อมูลติดต่อ",
"goal": "ถามตอบตัวเลขที่ต้องใช้จริง",
"topics": "11–100; How old; เบอร์โทรเป็นวลี; @/dot สำหรับอีเมล",
"seed": "age, number, email, years old",
"example": "I'm twenty-five years old. = ฉันอายุ 25 ปี",
"task": "ฟังเลขแล้วเลือกข้อมูลถูก 4 ใน 5 ข้อและกรอกบัตรข้อมูลสมมติ"
},
{
"id": "EN-08",
"sec": 1,
"title": "จุดตรวจ 1: รู้จักกันครั้งแรก",
"goal": "ทักทาย แนะนำตัว และขอข้อมูลใหม่ได้",
"topics": "รวมบท 01–07; ทบทวนเสียงท้ายคำและจังหวะคำถาม",
"seed": "ข้อมูลบุคคลและของใช้",
"example": "What's your name? = คุณชื่ออะไร",
"task": "สนทนา 60–90 วินาที สะกดชื่อ และเขียนประวัติสั้น 4 ประโยค"
},
{
"id": "EN-09",
"sec": 2,
"title": "บ้านและสิ่งที่มี",
"goal": "บอกว่ามีอะไรและอยู่ตรงไหน",
"topics": "there is/are; in/on/under/next to; is there/are there",
"seed": "room, table, chair, door",
"example": "There is a bag under the table. = มีกระเป๋าอยู่ใต้โต๊ะ",
"task": "อ่าน/ฟังคำบรรยายแล้ววางของในผังห้องให้ตรง"
},
{
"id": "EN-10",
"sec": 2,
"title": "วัน เวลา และปฏิทิน",
"goal": "ถามตอบเวลาและวันนัดพื้นฐาน",
"topics": "What time; days/months; at เวลา/on วัน/in เดือน",
"seed": "Monday, morning, today, o'clock",
"example": "The class is at nine on Monday. = ชั้นเรียนเริ่มเก้าโมงวันจันทร์",
"task": "จับคู่ตารางกับเสียงและเขียนนัด 3 รายการ"
},
{
"id": "EN-11",
"sec": 2,
"title": "กิจวัตรของฉัน",
"goal": "เล่าว่าทำอะไรเป็นประจำ",
"topics": "present simple: I/you/we/they + verb; go to/work at",
"seed": "wake up, eat, work, study",
"example": "I work at a car dealership. = ฉันทำงานที่โชว์รูมขายรถ",
"task": "เรียงกิจวัตร 5 อย่างแล้วเล่าตามข้อมูลจริงหรือสมมติ"
},
{
"id": "EN-12",
"sec": 2,
"title": "กิจวัตรของคนอื่น",
"goal": "เล่ากิจวัตรอีกคนและปฏิเสธได้",
"topics": "he/she + verb-s/-es; don't/doesn't + รูปพื้นฐาน",
"seed": "start, finish, live, watch",
"example": "She starts work at eight. = เธอเริ่มงานแปดโมง",
"task": "อ่านตารางคน 2 คนแล้วบอกเหมือน/ต่าง 4 ประโยค"
},
{
"id": "EN-13",
"sec": 2,
"title": "ถามเรื่องชีวิตประจำวัน",
"goal": "ถามตอบกิจวัตรด้วยข้อมูลใหม่",
"topics": "Do/Does; what/where/when; คำตอบสั้น",
"seed": "weekend, usually, sometimes, never",
"example": "Does he work on Sundays? = เขาทำงานวันอาทิตย์ไหม",
"task": "สัมภาษณ์ 5 คำถาม โดยมีอย่างน้อย 2 ข้อที่ต้องถามต่อ"
},
{
"id": "EN-14",
"sec": 2,
"title": "ความชอบและงานอดิเรก",
"goal": "บอกชอบ/ไม่ชอบและถามความชอบ",
"topics": "like/love + noun หรือ verb-ing; What do you like",
"seed": "music, reading, cooking, football",
"example": "I like making videos. = ฉันชอบทำวิดีโอ",
"task": "สำรวจความชอบ 3 คนแล้วเขียนผล 4 ประโยค"
},
{
"id": "EN-15",
"sec": 2,
"title": "ความสามารถและคำขอพื้นฐาน",
"goal": "บอกสิ่งที่ทำได้และขอความช่วยเหลือ",
"topics": "can/can't + verb; Can you ...?; please",
"seed": "swim, drive, help, open",
"example": "Can you help me, please? = ช่วยฉันหน่อยได้ไหม",
"task": "สลับบทขอความช่วยเหลือ 4 สถานการณ์และตอบรับ/ปฏิเสธสุภาพ"
},
{
"id": "EN-16",
"sec": 2,
"title": "จุดตรวจ 2: หนึ่งวันของฉัน",
"goal": "รวมบ้าน เวลา กิจวัตร ความชอบและความสามารถ",
"topics": "บูรณาการบท 09–15; เสียง -s; คำเน้นในประโยค",
"seed": "ชีวิตประจำวัน",
"example": "I usually study at seven. = ปกติฉันเรียนตอนหนึ่งทุ่ม",
"task": "ฟังตารางใหม่ ตอบคำถาม พูด 90 วินาที และเขียน 6–8 ประโยค"
},
{
"id": "EN-17",
"sec": 3,
"title": "อาหารและการนับ",
"goal": "เลือกใช้จำนวนกับอาหารพื้นฐาน",
"topics": "countable/uncountable; some/any; a bottle of/a cup of",
"seed": "rice, water, apple, coffee",
"example": "I'd like a cup of coffee, please. = ขอกาแฟหนึ่งถ้วยครับ/ค่ะ",
"task": "เลือกซื้อรายการอาหารและแยกหน่วยนับได้ โดยเรียน I'd like เป็นวลีสุภาพ"
},
{
"id": "EN-18",
"sec": 3,
"title": "ราคาและการซื้อของ",
"goal": "ถามราคาและระบุสินค้าที่ต้องการ",
"topics": "How much is/are; how many; จำนวน/สี/ขนาด; this one",
"seed": "price, size, small, large",
"example": "How much is this shirt? = เสื้อเชิ้ตตัวนี้ราคาเท่าไร",
"task": "ซื้อสินค้า 2 ชิ้นจากป้ายราคาใหม่และตรวจยอดเงิน"
},
{
"id": "EN-19",
"sec": 3,
"title": "ร้านอาหาร",
"goal": "สั่งอาหาร ถามสิ่งที่มี และขอใบเสร็จ",
"topics": "I'd like; Can I have; ไม่ใส่ some/any แบบท่องจำโดยไม่ดูบริบท",
"seed": "menu, bill, chicken, vegetarian",
"example": "Can I have the bill, please? = ขอคิดเงินด้วยครับ/ค่ะ",
"task": "แสดงบทสนทนาลูกค้า/พนักงาน เลือกเมนูและแก้รายการที่ฟังผิด"
},
{
"id": "EN-20",
"sec": 3,
"title": "สถานที่และเส้นทาง",
"goal": "ถามทางและทำตามเส้นทางสั้น",
"topics": "Where is; imperative; turn/go; across from/between",
"seed": "left, right, station, straight",
"example": "Go straight and turn left. = ตรงไปแล้วเลี้ยวซ้าย",
"task": "ใช้แผนที่คนละชุดถามตอบจนไปถึงเป้าหมาย"
},
{
"id": "EN-21",
"sec": 3,
"title": "สิ่งที่กำลังทำ",
"goal": "แยกตอนนี้กับกิจวัตร",
"topics": "present continuous: be + verb-ing; now; เทียบ simple present",
"seed": "waiting, working, raining, talking",
"example": "I'm waiting for the bus. = ฉันกำลังรอรถบัส",
"task": "อธิบายภาพ 5 เหตุการณ์และตอบ What are they doing?"
},
{
"id": "EN-22",
"sec": 3,
"title": "เสื้อผ้า อากาศ และการบรรยาย",
"goal": "บรรยายสภาพง่าย ๆ และเลือกของให้เหมาะ",
"topics": "adjectives; It's + สภาพอากาศ; wearing",
"seed": "hot, cold, rainy, jacket",
"example": "It's raining. I'm wearing a jacket. = ฝนกำลังตก ฉันสวมเสื้อแจ็กเก็ตอยู่",
"task": "ฟังอากาศแล้วเลือกเสื้อผ้าและอธิบายภาพคน 3 คน"
},
{
"id": "EN-23",
"sec": 3,
"title": "นัดหมายและชวนทำกิจกรรม",
"goal": "เสนอเวลา ตอบรับ หรือเสนอเวลาใหม่",
"topics": "Let's; Would you like to ...? เป็นวลี; เวลาและวัน",
"seed": "free, busy, tomorrow, meet",
"example": "Let's meet at ten. = เจอกันตอนสิบโมงนะ",
"task": "เทียบตารางว่าง 2 คนแล้วตกลงนัดโดยมีการเปลี่ยนเวลา"
},
{
"id": "EN-24",
"sec": 3,
"title": "จุดตรวจ 3: จัดวันออกไปข้างนอก",
"goal": "สั่งอาหาร ซื้อของ ถามทาง และนัดพบ",
"topics": "บูรณาการบท 17–23; ประโยคสุภาพและการยืนยันข้อมูล",
"seed": "ร้านอาหาร การเดินทาง การนัด",
"example": "Can we meet at the station? = เราเจอกันที่สถานีได้ไหม",
"task": "ทำภารกิจ 3 จุดจากข้อมูลใหม่และเขียนข้อความนัด 4–6 ประโยค"
},
{
"id": "EN-25",
"sec": 4,
"title": "เมื่อวานเป็นอย่างไร",
"goal": "เล่าสถานที่และสภาพในอดีต",
"topics": "was/were; wasn't/weren't; yesterday/last week",
"seed": "home, office, busy, yesterday",
"example": "I was at home yesterday. = เมื่อวานฉันอยู่บ้าน",
"task": "ตอบคำถามอดีต 5 ข้อและเขียนไดอารีสั้น"
},
{
"id": "EN-26",
"sec": 4,
"title": "สิ่งที่ทำไปแล้ว",
"goal": "เล่าเหตุการณ์จบแล้วแบบง่าย",
"topics": "past simple บอกเล่า; regular -ed และ went/ate/had/saw; เสียง -ed",
"seed": "visited, watched, went, ate",
"example": "I visited my friend yesterday. = ฉันไปหาเพื่อนเมื่อวาน",
"task": "เรียงภาพเหตุการณ์ 4 ภาพแล้วเล่าโดยใช้คำอดีต"
},
{
"id": "EN-27",
"sec": 4,
"title": "ถามและปฏิเสธอดีต",
"goal": "ถามว่าเกิดอะไรขึ้นและแก้ข้อมูลได้",
"topics": "Did + verb รูปพื้นฐาน; didn't; was/were แยกจาก did",
"seed": "when, where, last night, travel",
"example": "Did you go to work? No, I didn't. = คุณไปทำงานไหม ไม่ได้ไป",
"task": "สัมภาษณ์วันก่อนหน้า 5 คำถามและสรุปข้อมูลที่ได้"
},
{
"id": "EN-28",
"sec": 4,
"title": "แผนใกล้ตัว",
"goal": "บอกแผนที่ตั้งใจทำ",
"topics": "be going to + verb; time expressions; สะพานสู่ A2",
"seed": "next week, plan, visit, study",
"example": "I'm going to study tonight. = คืนนี้ฉันตั้งใจจะเรียน",
"task": "เล่าแผน 3 อย่าง ถามแผนคู่สนทนาและยืนยันวันเวลา"
},
{
"id": "EN-29",
"sec": 4,
"title": "ความจำเป็นและคำแนะนำง่าย",
"goal": "บอกสิ่งที่ต้องทำและเสนอทางเลือก",
"topics": "need to; should/shouldn't เบื้องต้น; สะพานสู่ A2",
"seed": "rest, check, bring, ticket",
"example": "You should check the time. = คุณควรตรวจเวลา",
"task": "ช่วยแก้ปัญหาการเดินทาง/ลืมของ 3 กรณี พร้อมเหตุผลง่าย ๆ"
},
{
"id": "EN-30",
"sec": 4,
"title": "เปรียบเทียบตัวเลือก",
"goal": "เลือกของหรือเส้นทางจากข้อมูล",
"topics": "comparative: cheaper/bigger/more expensive/better; than; สะพานสู่ A2",
"seed": "cheap, fast, expensive, better",
"example": "This bag is cheaper than that one. = กระเป๋าใบนี้ถูกกว่าใบนั้น",
"task": "อ่านป้ายสินค้า 2–3 แบบและอธิบายเหตุผลเลือก 3 ประโยค"
},
{
"id": "EN-31",
"sec": 4,
"title": "ข้อความและงานในชีวิตจริง",
"goal": "รับส่งข้อความสั้นให้ข้อมูลครบ",
"topics": "เรียงประโยค; and/but/because แบบพื้นฐาน; ทักทาย/ลงท้าย",
"seed": "appointment, message, late, thank you",
"example": "I'm sorry. I'm going to be late. = ขอโทษ ฉันจะไปสาย",
"task": "อ่านข้อความเปลี่ยนนัดแล้วตอบพร้อมเวลาใหม่และเหตุผลสั้น ๆ"
},
{
"id": "EN-32",
"sec": 4,
"title": "จุดตรวจ 4: โครงงานพื้นฐานภาษาอังกฤษ",
"goal": "ทำธุระและเล่าตนเองได้หลายสถานการณ์",
"topics": "รวมทั้งหลักสูตร; แยกผลทักษะจริงจากชื่อระดับ",
"seed": "ตนเอง วันธรรมดา วันก่อนหน้า แผน",
"example": "I work in Thailand, and I study English after work. = ฉันทำงานในไทยและเรียนภาษาอังกฤษหลังเลิกงาน",
"task": "ฟัง/อ่านโจทย์ใหม่ สนทนา 3–5 นาทีแบบมีตัวช่วยน้อย และเขียน 60–80 คำหรือเท่าที่ข้อมูลจำเป็นครบ"
}
]
const BODY = { ...S1, ...S2, ...S3, ...S4 }
export default {
  LANG: 'en',
  SECTIONS: {"1": "เริ่มรู้จักเสียง ตัวอักษร และตัวตน", "2": "ชีวิตประจำวันและข้อมูลรอบตัว", "3": "ทำธุระและสื่อสารในเมือง", "4": "อดีต แผน และการบูรณาการ"},
  SOURCES: [{"name": "Council of Europe — CEFR Companion Volume", "url": "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions"}, {"name": "Council of Europe — ค้นตัวบ่งชี้ CEFR", "url": "https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors-search"}, {"name": "British Council — A1 listening", "url": "https://learnenglish.britishcouncil.org/free-resources/listening/a1"}, {"name": "British Council — Starting Out", "url": "https://learnenglish.britishcouncil.org/free-resources/general/video-series/starting-out"}, {"name": "Nation (2007), The Four Strands", "url": "https://www.tandfonline.com/doi/abs/10.2167/illt039.0"}, {"name": "IES — Organizing Instruction and Study to Improve Student Learning", "url": "https://eric.ed.gov/?id=ED498555"}],
  LESSONS: META.map((l) => ({ ...l, check: +l.id.slice(3) % 8 === 0, body: BODY[l.id] || null })),
}
