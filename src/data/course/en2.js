// English section 2 (EN-09..16): daily life and the world around you. Original lesson content written for this app.
// Answers to type/order questions are checked after normalising (lower case, punctuation dropped, contractions expanded).

export default {
  'EN-09': {
    words: [
      ['room', 'รูม', 'ห้อง', 'My room is small.', 'ห้องของฉันเล็ก', 'living room'],
      ['table', 'เท-เบิล', 'โต๊ะ', 'The keys are on the table.', 'กุญแจอยู่บนโต๊ะ', 'kitchen table'],
      ['chair', 'แชร์', 'เก้าอี้', 'There is a cat on the chair.', 'มีแมวอยู่บนเก้าอี้', ''],
      ['door', 'ดอร์', 'ประตู', 'The bag is next to the door.', 'กระเป๋าอยู่ข้างประตู', 'open the door'],
      ['bed', 'เบด', 'เตียง', 'My phone is under the bed.', 'โทรศัพท์ฉันอยู่ใต้เตียง', ''],
      ['window', 'วิน-โดว์', 'หน้าต่าง', 'There are two windows.', 'มีหน้าต่างสองบาน', ''],
      ['under', 'อัน-เดอร์', 'ใต้', 'under the table', 'ใต้โต๊ะ', ''],
      ['next to', 'เน็กซ์ ทู', 'ข้าง ๆ', 'next to the window', 'ข้างหน้าต่าง', ''],
    ],
    dialog: {
      lines: [['A', 'Where are my keys?', 'กุญแจฉันอยู่ไหน'], ['B', 'Are they on the table?', 'อยู่บนโต๊ะหรือเปล่า'], ['A', 'No, there is a bag on the table. There are no keys.', 'ไม่ บนโต๊ะมีกระเป๋า ไม่มีกุญแจ'], ['B', 'Look! They are under the chair, next to the door.', 'ดูสิ อยู่ใต้เก้าอี้ ข้างประตู'], ['A', 'Thanks!', 'ขอบคุณ']],
      qs: [
        { k: 'choose', q: 'A หาอะไร', o: ['กระเป๋า', 'กุญแจ', 'โทรศัพท์'], a: 1 },
        { k: 'choose', q: 'บนโต๊ะมีอะไร', o: ['กุญแจ', 'กระเป๋า', 'ไม่มีอะไร'], a: 1 },
        { k: 'choose', q: 'กุญแจอยู่ที่ไหน', o: ['บนโต๊ะ', 'ใต้เก้าอี้', 'ข้างหน้าต่าง'], a: 1 },
      ],
    },
    grammar: [
      { h: 'There is / There are = มี (อยู่ที่ไหนสักแห่ง)', body: 'ของชิ้นเดียวใช้ There is + a/an ของหลายชิ้นใช้ There are + จำนวน/พหูพจน์ ระวังอย่าใช้ "have" แบบภาษาไทย (ไม่พูดว่า In my room have a bed)', ex: [['There is a bed in my room.', 'ในห้องฉันมีเตียงหนึ่งหลัง'], ['There are two chairs.', 'มีเก้าอี้สองตัว']] },
      { h: 'คำบอกตำแหน่ง in / on / under / next to', body: 'in = ข้างใน · on = บน (แตะพื้นผิว) · under = ข้างใต้ · next to = ข้าง ๆ วางไว้หน้าคำนามเสมอ: on the table, under the bed', ex: [['The cup is on the table.', 'ถ้วยอยู่บนโต๊ะ'], ['The cat is in the box.', 'แมวอยู่ในกล่อง']] },
      { h: 'คำถาม Is there / Are there', body: 'สลับเป็น Is there ...? / Are there ...? ตอบสั้น Yes, there is. / No, there aren\'t.', ex: [['Is there a window? — Yes, there is.', 'มีหน้าต่างไหม มี'], ['Are there any chairs? — No, there aren\'t.', 'มีเก้าอี้ไหม ไม่มี']] },
    ],
    drills: [
      { k: 'choose', q: 'There ___ three books on the bed.', o: ['is', 'are', 'am'], a: 1 },
      { k: 'choose', q: 'There ___ a lamp next to the bed.', o: ['is', 'are', 'have'], a: 0 },
      { k: 'listen', say: 'The bag is under the table.', q: 'กระเป๋าอยู่ไหน', o: ['บนโต๊ะ', 'ใต้โต๊ะ', 'ข้างโต๊ะ'], a: 1 },
      { k: 'type', q: 'แปล: แมวอยู่บนเก้าอี้', a: ['the cat is on the chair', 'there is a cat on the chair'] },
      { k: 'order', q: 'เรียงคำ: มีหน้าต่างไหม', a: ['Is there a window', 'is there a window'] },
      { k: 'choose', q: 'ประโยคไหนถูก', o: ['In my room have a desk.', 'There is a desk in my room.', 'There are a desk in my room.'], a: 1, why: 'ใช้ There is กับของชิ้นเดียว ไม่ใช้ have แบบภาษาไทย' },
    ],
    tasks: [
      { brief: 'ฟังคำบรรยายแล้ววางของในผังห้องให้ถูก', data: 'ผังห้อง: เตียง โต๊ะ เก้าอี้ ประตู หน้าต่าง', qs: [
        { k: 'listen', say: 'There is a lamp on the table.', q: 'โคมไฟอยู่ไหน', o: ['บนโต๊ะ', 'ใต้โต๊ะ', 'บนเตียง'], a: 0 },
        { k: 'listen', say: 'The shoes are under the bed.', q: 'รองเท้าอยู่ไหน', o: ['ข้างประตู', 'ใต้เตียง', 'บนเก้าอี้'], a: 1 },
        { k: 'listen', say: 'There is a plant next to the window.', q: 'ต้นไม้อยู่ไหน', o: ['ข้างหน้าต่าง', 'ข้างประตู', 'ในกล่อง'], a: 0 },
        { k: 'listen', say: 'There are two pictures on the wall.', q: 'บนผนังมีรูปกี่รูป', o: ['1', '2', '3'], a: 1 },
        { k: 'type', q: 'ถามว่า "ในห้องมีทีวีไหม"', a: ['is there a tv in the room', 'is there a tv', 'is there a television in the room', 'is there a television'] },
      ] },
      { brief: 'ห้องใหม่: ห้องครัว', qs: [
        { k: 'listen', say: 'There is a cup in the sink.', q: 'ถ้วยอยู่ไหน', o: ['ในอ่างล้างจาน', 'บนตู้เย็น', 'ใต้โต๊ะ'], a: 0 },
        { k: 'listen', say: 'The cat is on the fridge.', q: 'แมวอยู่ไหน', o: ['ใต้ตู้เย็น', 'บนตู้เย็น', 'ข้างตู้เย็น'], a: 1 },
        { k: 'listen', say: 'There are three chairs next to the table.', q: 'เก้าอี้มีกี่ตัว', o: ['2', '3', '4'], a: 1 },
        { k: 'listen', say: 'Is there any water? No, there isn\'t.', q: 'มีน้ำไหม', o: ['มี', 'ไม่มี', 'ไม่ได้บอก'], a: 1 },
        { k: 'type', q: 'บอกว่า "มีกล้วยสองลูกบนโต๊ะ"', a: ['there are two bananas on the table'] },
      ] },
    ],
    speak: { repeat: ['There is a bed in my room.', 'There are two windows.', 'The bag is under the table.', 'Is there a chair? Yes, there is.'], prompt: 'บรรยายห้องของคุณ 4 ประโยค (มีอะไร อยู่ตรงไหน)', model: 'There is a bed in my room. There is a desk next to the window. My laptop is on the desk. There are two bags under the bed.' },
    write: { prompt: 'เขียนบรรยายห้องของคุณ 4 ประโยค ใช้ There is/are และคำบอกตำแหน่ง', model: 'There is a big bed in my room. There is a table next to the bed. My phone is on the table. There are three books under the table.', check: ['There is + ของชิ้นเดียว / There are + หลายชิ้น', 'มี in/on/under/next to อย่างน้อย 2 คำ', 'ไม่ใช้ have แบบภาษาไทย'] },
  },

  'EN-10': {
    words: [
      ['Monday', 'มัน-เดย์', 'วันจันทร์', 'See you on Monday.', 'เจอกันวันจันทร์', 'on Monday'],
      ['morning', 'มอร์-นิ่ง', 'ตอนเช้า', 'in the morning', 'ตอนเช้า', 'good morning'],
      ['today', 'ทู-เดย์', 'วันนี้', 'Today is Friday.', 'วันนี้วันศุกร์', ''],
      ["o'clock", 'โอ-คล็อก', 'นาฬิกา (ตรง)', "It's nine o'clock.", 'ตอนนี้เก้าโมงตรง', ''],
      ['half past', 'ฮาล์ฟ พาสท์', 'ครึ่ง (เวลา x:30)', 'half past seven', 'เจ็ดโมงครึ่ง', ''],
      ['tomorrow', 'ทู-มอร์-โร่', 'พรุ่งนี้', 'The meeting is tomorrow.', 'ประชุมพรุ่งนี้', ''],
      ['weekend', 'วีค-เอ็นด์', 'วันหยุดสุดสัปดาห์', 'at the weekend', 'ช่วงเสาร์อาทิตย์', ''],
      ['January', 'แจน-นิว-อะ-รี่', 'มกราคม', 'My birthday is in January.', 'วันเกิดฉันอยู่เดือนมกราคม', 'in January'],
    ],
    dialog: {
      lines: [['A', 'What time is it?', 'กี่โมงแล้ว'], ['B', "It's half past eight.", 'แปดโมงครึ่ง'], ['A', 'Oh no! My English class is at nine.', 'แย่แล้ว คลาสภาษาอังกฤษเก้าโมง'], ['B', 'Today? I think your class is on Tuesday.', 'วันนี้เหรอ ฉันว่าคลาสคุณวันอังคารนะ'], ['A', 'Today is Tuesday!', 'วันนี้วันอังคาร!']],
      qs: [
        { k: 'choose', q: 'ตอนนี้กี่โมง', o: ['8:00', '8:30', '9:00'], a: 1 },
        { k: 'choose', q: 'คลาสเริ่มกี่โมง', o: ['8:30', '9:00', '9:30'], a: 1 },
        { k: 'choose', q: 'วันนี้วันอะไร', o: ['จันทร์', 'อังคาร', 'พุธ'], a: 1 },
      ],
    },
    grammar: [
      { h: 'ถามเวลา', body: 'What time is it? → It\'s + เวลา · ตรง = o\'clock · 30 นาที = half past · บอกตัวเลขตรง ๆ ก็ได้ (seven fifteen = 7:15)', ex: [["It's ten o'clock.", 'สิบโมงตรง'], ["It's seven fifteen.", 'เจ็ดโมงสิบห้า']] },
      { h: 'at เวลา · on วัน · in เดือน/ช่วงของวัน', body: 'at + เวลา (at nine) · on + วัน (on Monday) · in + เดือน/ปี/ช่วง (in May, in the morning) · today / tomorrow ไม่ต้องมีคำนำหน้า', ex: [['The class is at nine on Monday.', 'คลาสเริ่มเก้าโมงวันจันทร์'], ['My birthday is in July.', 'วันเกิดฉันเดือนกรกฎาคม']] },
      { h: 'วันและเดือนขึ้นต้นตัวใหญ่', body: 'Monday Tuesday Wednesday Thursday Friday Saturday Sunday · January … December ต้องขึ้นต้นด้วยตัวใหญ่เสมอ', ex: [['on Friday', 'วันศุกร์'], ['in December', 'เดือนธันวาคม']] },
    ],
    drills: [
      { k: 'choose', q: 'The meeting is ___ Monday.', o: ['at', 'on', 'in'], a: 1 },
      { k: 'choose', q: 'I get up ___ six.', o: ['at', 'on', 'in'], a: 0 },
      { k: 'choose', q: 'My birthday is ___ March.', o: ['at', 'on', 'in'], a: 2 },
      { k: 'listen', say: "It's half past four.", q: 'ได้ยินเวลาอะไร', o: ['4:00', '4:30', '5:30'], a: 1 },
      { k: 'type', q: 'ถามว่า "กี่โมงแล้ว"', a: ['what time is it', 'what is the time'] },
      { k: 'order', q: 'เรียงคำ: คลาสเริ่มเก้าโมงวันศุกร์', a: ['The class is at nine on Friday'] },
    ],
    tasks: [
      { brief: 'ฟังนัดหมายแล้วจับคู่กับตาราง', data: 'ตาราง: หมอฟัน · ยิม · ประชุม · กินข้าวกับเพื่อน', qs: [
        { k: 'listen', say: 'The dentist is at ten on Wednesday.', q: 'หมอฟันวันไหน กี่โมง', o: ['พุธ 10:00', 'พฤหัส 10:00', 'พุธ 2:00'], a: 0 },
        { k: 'listen', say: 'I go to the gym at six in the evening.', q: 'ไปยิมกี่โมง', o: ['6 โมงเช้า', '6 โมงเย็น', '7 โมงเย็น'], a: 1 },
        { k: 'listen', say: 'The meeting is on Friday at half past two.', q: 'ประชุมกี่โมง', o: ['2:00', '2:30', '12:30'], a: 1 },
        { k: 'listen', say: 'Lunch with Ploy is on Saturday.', q: 'กินข้าวกับพลอยวันไหน', o: ['ศุกร์', 'เสาร์', 'อาทิตย์'], a: 1 },
        { k: 'type', q: 'เขียนนัด: "ประชุมวันจันทร์ตอนสิบโมง" (The meeting is ...)', a: ["/^the meeting is (at ten( o'?clock)? on monday|on monday at ten( o'?clock)?)$/"] },
      ] },
      { brief: 'ตารางใหม่ของเพื่อน', qs: [
        { k: 'listen', say: 'My yoga class is at seven on Tuesday.', q: 'โยคะวันไหน', o: ['จันทร์', 'อังคาร', 'พฤหัส'], a: 1 },
        { k: 'listen', say: 'The party is on Sunday at eight.', q: 'ปาร์ตี้กี่โมง', o: ['7:00', '8:00', '8:30'], a: 1 },
        { k: 'listen', say: 'My holiday is in April.', q: 'วันหยุดเดือนอะไร', o: ['สิงหาคม', 'เมษายน', 'ตุลาคม'], a: 1 },
        { k: 'listen', say: "It's quarter past nine.", q: 'กี่โมง', o: ['9:15', '9:45', '8:45'], a: 0 },
        { k: 'type', q: 'เขียน: "งานเลี้ยงวันเสาร์" (The party is ...)', a: ['the party is on saturday'] },
      ] },
    ],
    speak: { repeat: ['What time is it?', "It's half past eight.", 'The class is at nine on Monday.', 'My birthday is in January.'], prompt: 'บอกตารางของคุณสัปดาห์นี้ 3 นัด (วัน + เวลา)', model: 'I have English class on Monday at seven. I go to the gym on Wednesday at six. I meet my friend on Saturday at noon.' },
    write: { prompt: 'เขียนนัดหมาย 3 รายการ ใช้ at/on/in ให้ถูก', model: 'The meeting is at ten on Monday. My dentist is on Thursday at three. My holiday is in April.', check: ['at + เวลา, on + วัน, in + เดือน', 'วันและเดือนขึ้นต้นด้วยตัวใหญ่', 'มีครบ 3 นัด'] },
  },

  'EN-11': {
    words: [
      ['wake up', 'เวค อัพ', 'ตื่นนอน', 'I wake up at six.', 'ฉันตื่นหกโมง', 'wake up early'],
      ['eat', 'อีท', 'กิน', 'I eat breakfast at home.', 'ฉันกินอาหารเช้าที่บ้าน', 'eat lunch'],
      ['work', 'เวิร์ค', 'ทำงาน', 'I work at a car dealership.', 'ฉันทำงานที่โชว์รูมรถ', 'work at'],
      ['study', 'สตั๊ด-ดี้', 'เรียน', 'I study English at night.', 'ฉันเรียนอังกฤษตอนกลางคืน', 'study English'],
      ['go to bed', 'โก ทู เบด', 'เข้านอน', 'I go to bed at eleven.', 'ฉันเข้านอนห้าทุ่ม', ''],
      ['breakfast', 'เบรก-ฟัสท์', 'อาหารเช้า', 'I have breakfast at seven.', 'ฉันกินอาหารเช้าเจ็ดโมง', 'have breakfast'],
      ['take a shower', 'เทค อะ ชาว-เวอร์', 'อาบน้ำ (ฝักบัว)', 'I take a shower in the morning.', 'ฉันอาบน้ำตอนเช้า', ''],
      ['every day', 'เอฟ-วรี่ เดย์', 'ทุกวัน', 'I read every day.', 'ฉันอ่านหนังสือทุกวัน', ''],
    ],
    dialog: {
      lines: [['A', 'What do you do every morning?', 'ทุกเช้าคุณทำอะไรบ้าง'], ['B', 'I wake up at six. I take a shower and eat breakfast.', 'ฉันตื่นหกโมง อาบน้ำแล้วกินข้าวเช้า'], ['A', 'Do you go to work by car?', 'คุณขับรถไปทำงานไหม'], ['B', 'Yes. I work at a car dealership. I start at eight thirty.', 'ใช่ ฉันทำงานที่โชว์รูมรถ เริ่มงานแปดโมงครึ่ง'], ['A', 'And in the evening?', 'แล้วตอนเย็นล่ะ'], ['B', 'I study English and go to bed at eleven.', 'เรียนภาษาอังกฤษแล้วเข้านอนห้าทุ่ม']],
      qs: [
        { k: 'choose', q: 'B ตื่นกี่โมง', o: ['5:00', '6:00', '7:00'], a: 1 },
        { k: 'choose', q: 'B ทำงานที่ไหน', o: ['โรงพยาบาล', 'โชว์รูมรถ', 'โรงเรียน'], a: 1 },
        { k: 'choose', q: 'ตอนเย็น B ทำอะไร', o: ['เรียนภาษาอังกฤษ', 'ไปยิม', 'ทำอาหาร'], a: 0 },
      ],
    },
    grammar: [
      { h: 'Present simple: ทำเป็นประจำ', body: 'I / you / we / they + กริยารูปพื้นฐาน ใช้บอกสิ่งที่ทำเป็นนิสัยหรือความจริงทั่วไป (บทนี้ยังไม่มี -s เพราะประธานไม่ใช่ he/she)', ex: [['I work every day.', 'ฉันทำงานทุกวัน'], ['We eat lunch at noon.', 'เรากินข้าวเที่ยงตอนเที่ยงวัน']] },
      { h: 'go to / work at / at home', body: 'go to + สถานที่ (go to work, go to school) · work at + ที่ทำงาน · at home ไม่มี to · go to bed ไม่มี the', ex: [['I go to work at eight.', 'ฉันไปทำงานแปดโมง'], ['I stay at home on Sunday.', 'วันอาทิตย์ฉันอยู่บ้าน']] },
      { h: 'เรียงเหตุการณ์ด้วย first / then / after that', body: 'ช่วยให้เล่ากิจวัตรเป็นลำดับ ฟังลื่นขึ้น', ex: [['First I wake up, then I take a shower.', 'อันดับแรกตื่น จากนั้นอาบน้ำ']] },
    ],
    drills: [
      { k: 'choose', q: 'I ___ at a bank.', o: ['work', 'works', 'working'], a: 0 },
      { k: 'choose', q: 'We go ___ bed at ten.', o: ['to', 'to the', 'at'], a: 0 },
      { k: 'listen', say: 'I have breakfast at seven.', q: 'กินข้าวเช้ากี่โมง', o: ['6:00', '7:00', '11:00'], a: 1 },
      { k: 'type', q: 'แปล: ฉันเรียนภาษาอังกฤษทุกวัน', a: ['i study english every day', 'every day i study english'] },
      { k: 'order', q: 'เรียงคำ: ฉันตื่นนอนหกโมง', a: ['I wake up at six'] },
      { k: 'choose', q: 'ประโยคไหนถูก', o: ['I go to home at six.', 'I go home at six.', 'I go at home at six.'], a: 1, why: 'home ไม่ต้องมี to' },
    ],
    tasks: [
      { brief: 'เรียงกิจวัตรของคนในเสียงให้ถูกลำดับ', data: 'ข้อมูล: กิจวัตรของ Tom', qs: [
        { k: 'listen', say: 'First I wake up at five thirty.', q: 'Tom ตื่นกี่โมง', o: ['5:30', '6:30', '5:00'], a: 0 },
        { k: 'listen', say: 'Then I go running in the park.', q: 'หลังตื่น Tom ทำอะไร', o: ['อาบน้ำ', 'วิ่งในสวน', 'กินข้าว'], a: 1 },
        { k: 'listen', say: 'I work at a hospital. I start at seven.', q: 'Tom ทำงานที่ไหน', o: ['ธนาคาร', 'โรงพยาบาล', 'ร้านกาแฟ'], a: 1 },
        { k: 'listen', say: 'After work I cook dinner and watch TV.', q: 'หลังเลิกงาน Tom ทำอะไร', o: ['ทำอาหารและดูทีวี', 'ไปยิม', 'เรียนภาษา'], a: 0 },
        { k: 'type', q: 'บอกเวลาที่คุณตื่นนอน (I wake up at ...)', a: ['/^i (usually )?(wake|get) up at [a-z0-9: ]+$/'] },
      ] },
      { brief: 'กิจวัตรใหม่: Nok', qs: [
        { k: 'listen', say: 'I wake up at seven and drink coffee.', q: 'Nok ตื่นแล้วทำอะไร', o: ['ดื่มกาแฟ', 'อาบน้ำ', 'วิ่ง'], a: 0 },
        { k: 'listen', say: 'I go to work by train.', q: 'Nok ไปทำงานยังไง', o: ['รถยนต์', 'รถไฟ', 'เดิน'], a: 1 },
        { k: 'listen', say: 'I work at a school. I finish at four.', q: 'Nok เลิกงานกี่โมง', o: ['4:00', '5:00', '14:00'], a: 0 },
        { k: 'listen', say: 'I go to bed at ten thirty.', q: 'Nok เข้านอนกี่โมง', o: ['22:00', '22:30', '23:30'], a: 1 },
        { k: 'type', q: 'บอกว่าคุณทำงาน/เรียนที่ไหน (I work at ... / I study at ...)', a: ['/^i (work|study) (at|in) .+$/'] },
      ] },
    ],
    speak: { repeat: ['I wake up at six.', 'I take a shower and eat breakfast.', 'I go to work at eight.', 'I go to bed at eleven.'], prompt: 'เล่ากิจวัตรวันทำงานของคุณ 5 อย่าง เรียงตามเวลา', model: 'I wake up at six. First I take a shower, then I eat breakfast. I go to work at eight. I work at a car dealership. I study English in the evening and go to bed at eleven.' },
    write: { prompt: 'เขียนกิจวัตร 5 ประโยค (จริงหรือสมมติ) มีเวลาในทุกประโยค', model: 'I wake up at 6:00. I eat breakfast at 6:30. I go to work at 7:30. I finish work at 5:00. I go to bed at 11:00.', check: ['ประธาน I + กริยารูปพื้นฐาน', 'มี at + เวลา', 'go home / go to bed ไม่มีคำเกิน'] },
  },

  'EN-12': {
    words: [
      ['start', 'สตาร์ท', 'เริ่ม', 'She starts work at eight.', 'เธอเริ่มงานแปดโมง', 'start work'],
      ['finish', 'ฟิน-นิช', 'เสร็จ จบ', 'He finishes at five.', 'เขาเลิกงานห้าโมง', 'finish work'],
      ['live', 'ลิฟว์', 'อาศัยอยู่', 'She lives in Bangkok.', 'เธออาศัยอยู่ที่กรุงเทพฯ', 'live in'],
      ['watch', 'วอทช์', 'ดู (ทีวี/หนัง)', 'He watches football.', 'เขาดูฟุตบอล', 'watch TV'],
      ['drive', 'ไดรฟ์', 'ขับรถ', 'My dad drives to work.', 'พ่อขับรถไปทำงาน', 'drive a car'],
      ['go', 'โก', 'ไป', 'She goes to the gym.', 'เธอไปยิม', ''],
      ['have', 'แฮฟว์', 'มี / กิน', 'He has lunch at noon.', 'เขากินข้าวเที่ยงตอนเที่ยง', 'have lunch'],
      ['cook', 'คุก', 'ทำอาหาร', "He doesn't cook.", 'เขาไม่ทำอาหาร', 'cook dinner'],
    ],
    dialog: {
      lines: [['A', 'Tell me about your sister.', 'เล่าเรื่องพี่สาวคุณหน่อย'], ['B', 'She lives in Chiang Mai. She works at a hotel.', 'เธออยู่เชียงใหม่ ทำงานที่โรงแรม'], ['A', 'Does she start early?', 'เธอเริ่มงานเช้าไหม'], ['B', 'Yes. She starts at seven and finishes at four.', 'ใช่ เธอเริ่มเจ็ดโมงและเลิกสี่โมง'], ['A', 'Does she cook?', 'เธอทำอาหารไหม'], ['B', "No, she doesn't. She has dinner with her friends.", 'ไม่ เธอกินข้าวเย็นกับเพื่อน']],
      qs: [
        { k: 'choose', q: 'พี่สาวอยู่ที่ไหน', o: ['กรุงเทพฯ', 'เชียงใหม่', 'ภูเก็ต'], a: 1 },
        { k: 'choose', q: 'เธอเลิกงานกี่โมง', o: ['4:00', '7:00', '5:00'], a: 0 },
        { k: 'choose', q: 'เธอทำอาหารไหม', o: ['ทำทุกวัน', 'ไม่ทำ', 'ทำวันหยุด'], a: 1 },
      ],
    },
    grammar: [
      { h: 'he / she / it + กริยาเติม -s', body: 'ประธานเอกพจน์บุรุษที่ 3 ต้องเติม -s ที่กริยา: work → works, live → lives · คำที่ลงท้าย -sh -ch -s -x -o เติม -es: watch → watches, go → goes · have → has', ex: [['She works at a hotel.', 'เธอทำงานที่โรงแรม'], ['He watches TV.', 'เขาดูทีวี']] },
      { h: 'ปฏิเสธ: don\'t / doesn\'t + กริยารูปพื้นฐาน', body: 'I/you/we/they ใช้ don\'t · he/she/it ใช้ doesn\'t แล้วกริยากลับเป็นรูปพื้นฐาน (ห้ามเติม -s ซ้ำ)', ex: [["He doesn't cook.", 'เขาไม่ทำอาหาร'], ["I don't drive.", 'ฉันไม่ขับรถ']] },
      { h: 'เสียง -s สามแบบ', body: 'works (ส) · lives (ซ) · watches (อิซ) ฟังให้ออกเพราะบอกว่าพูดถึงคนอื่นอยู่', ex: [['works · lives · watches', 'เวิร์คส · ลิฟวซ · วอทชิซ']] },
    ],
    drills: [
      { k: 'choose', q: 'She ___ in Phuket.', o: ['live', 'lives', 'living'], a: 1 },
      { k: 'choose', q: 'He ___ to work by bus.', o: ['go', 'gos', 'goes'], a: 2 },
      { k: 'choose', q: "My brother doesn't ___ coffee.", o: ['drink', 'drinks', 'drinking'], a: 0, why: 'หลัง doesn\'t ใช้กริยารูปพื้นฐาน' },
      { k: 'listen', say: 'She watches movies on Friday.', q: 'เธอทำอะไรวันศุกร์', o: ['ดูหนัง', 'ทำอาหาร', 'ไปยิม'], a: 0 },
      { k: 'type', q: 'เปลี่ยนเป็น he: "I have lunch at noon." → He ...', a: ['he has lunch at noon'] },
      { k: 'type', q: 'ปฏิเสธ: She drives. → She ...', a: ['she does not drive', "she doesn't drive"] },
      { k: 'order', q: 'เรียงคำ: เขาเลิกงานห้าโมง', a: ['He finishes work at five', 'He finishes at five'] },
    ],
    tasks: [
      { brief: 'อ่านตาราง 2 คน แล้วบอกเหมือน/ต่าง', data: 'Mali: ตื่น 6:00 · ขับรถ · ทำงานโรงพยาบาล · ดูทีวีตอนเย็น\nJoe: ตื่น 6:00 · นั่งรถไฟ · ทำงานธนาคาร · ไม่ดูทีวี อ่านหนังสือ', qs: [
        { k: 'choose', q: 'ประโยคไหนตรงกับตาราง', o: ['Mali and Joe wake up at six.', 'Joe drives to work.', 'Mali works at a bank.'], a: 0 },
        { k: 'choose', q: 'ประโยคไหนตรงกับตาราง', o: ['Joe watches TV.', "Joe doesn't watch TV.", "Mali doesn't watch TV."], a: 1 },
        { k: 'type', q: 'บอกว่า Mali ทำงานที่ไหน', a: ['mali works at a hospital', 'she works at a hospital', 'mali works in a hospital', 'she works in a hospital'] },
        { k: 'type', q: 'บอกว่า Joe ไปทำงานอย่างไร', a: ['joe goes to work by train', 'he goes to work by train', 'joe takes the train', 'he takes the train', 'joe takes the train to work', 'he takes the train to work'] },
        { k: 'listen', say: 'Joe reads books in the evening.', q: 'Joe ทำอะไรตอนเย็น', o: ['ดูทีวี', 'อ่านหนังสือ', 'ทำอาหาร'], a: 1 },
      ] },
      { brief: 'ตารางใหม่: Ann กับ Ben', data: 'Ann: ทำงานบ้าน (ทำงานออนไลน์) · ทำอาหารทุกวัน · ไม่ดื่มกาแฟ\nBen: ทำงานร้านอาหาร · ไม่ทำอาหารที่บ้าน · ดื่มกาแฟเช้า', qs: [
        { k: 'choose', q: 'ประโยคไหนตรงกับตาราง', o: ['Ann cooks every day.', 'Ben cooks at home.', 'Ann drinks coffee.'], a: 0 },
        { k: 'choose', q: 'ประโยคไหนตรงกับตาราง', o: ["Ben doesn't drink coffee.", 'Ben works at a restaurant.', 'Ann works at a restaurant.'], a: 1 },
        { k: 'type', q: 'ปฏิเสธเรื่องกาแฟของ Ann', a: ["ann doesn't drink coffee", "she doesn't drink coffee", 'ann does not drink coffee', 'she does not drink coffee'] },
        { k: 'type', q: 'บอกว่า Ben ดื่มกาแฟตอนเช้า', a: ['ben drinks coffee in the morning', 'he drinks coffee in the morning'] },
        { k: 'listen', say: 'Ann works at home.', q: 'Ann ทำงานที่ไหน', o: ['ที่บ้าน', 'ร้านอาหาร', 'ออฟฟิศ'], a: 0 },
      ] },
    ],
    speak: { repeat: ['She starts work at eight.', 'He watches TV.', "He doesn't cook.", 'works · lives · watches'], prompt: 'เล่ากิจวัตรของคนในครอบครัว 1 คน 4 ประโยค มีปฏิเสธ 1 ประโยค', model: "My dad lives in Khon Kaen. He wakes up at five. He drives to work. He doesn't watch TV at night." },
    write: { prompt: 'เขียน 4 ประโยคเปรียบเทียบกิจวัตรของคุณกับเพื่อน (เหมือน 2 ต่าง 2)', model: "I wake up at six, and my friend wakes up at six too. We both work in Bangkok. I drive to work, but she takes the train. She doesn't drink coffee.", check: ['he/she + กริยาเติม -s', "doesn't + กริยารูปพื้นฐาน", 'มีทั้งเหมือนและต่าง'] },
  },

  'EN-13': {
    words: [
      ['usually', 'ยู-ชวล-ลี่', 'โดยปกติ', 'I usually walk to work.', 'ปกติฉันเดินไปทำงาน', ''],
      ['sometimes', 'ซัม-ไทม์ส', 'บางครั้ง', 'She sometimes cooks.', 'บางครั้งเธอทำอาหาร', ''],
      ['never', 'เน-เวอร์', 'ไม่เคย', 'He never drinks coffee.', 'เขาไม่ดื่มกาแฟเลย', ''],
      ['always', 'ออล-เวย์ส', 'เสมอ', 'I always eat breakfast.', 'ฉันกินข้าวเช้าเสมอ', ''],
      ['when', 'เว็น', 'เมื่อไร', 'When do you study?', 'คุณเรียนเมื่อไร', ''],
      ['where', 'แวร์', 'ที่ไหน', 'Where does she work?', 'เธอทำงานที่ไหน', ''],
      ['on Sundays', 'ออน ซัน-เดย์ส', 'ทุกวันอาทิตย์', 'Does he work on Sundays?', 'เขาทำงานวันอาทิตย์ไหม', ''],
      ['free time', 'ฟรี ไทม์', 'เวลาว่าง', 'What do you do in your free time?', 'เวลาว่างคุณทำอะไร', ''],
    ],
    dialog: {
      lines: [['A', 'Do you work on Sundays?', 'คุณทำงานวันอาทิตย์ไหม'], ['B', "No, I don't. I usually go to the market.", 'ไม่ ปกติฉันไปตลาด'], ['A', 'Where is the market?', 'ตลาดอยู่ที่ไหน'], ['B', "It's near my house. My husband sometimes comes too.", 'อยู่ใกล้บ้าน สามีฉันไปด้วยบางครั้ง'], ['A', 'Does he like it?', 'เขาชอบไหม'], ['B', 'Yes, he does. But he never wakes up early!', 'ชอบ แต่เขาไม่เคยตื่นเช้าเลย']],
      qs: [
        { k: 'choose', q: 'B ทำงานวันอาทิตย์ไหม', o: ['ทำ', 'ไม่ทำ', 'บางครั้ง'], a: 1 },
        { k: 'choose', q: 'วันอาทิตย์ B ปกติทำอะไร', o: ['ไปตลาด', 'ไปยิม', 'อยู่บ้าน'], a: 0 },
        { k: 'choose', q: 'สามีตื่นเช้าไหม', o: ['เสมอ', 'บางครั้ง', 'ไม่เคย'], a: 2 },
      ],
    },
    grammar: [
      { h: 'คำถาม Do / Does', body: 'Do + I/you/we/they + กริยารูปพื้นฐาน? · Does + he/she/it + กริยารูปพื้นฐาน? (ไม่เติม -s เพราะ does รับไปแล้ว) ตอบสั้น Yes, I do. / No, she doesn\'t.', ex: [['Do you cook? — Yes, I do.', 'คุณทำอาหารไหม ทำ'], ["Does he work on Sundays? — No, he doesn't.", 'เขาทำงานวันอาทิตย์ไหม ไม่']] },
      { h: 'Wh- + do/does', body: 'What / Where / When + do/does + ประธาน + กริยา?', ex: [['Where does she live?', 'เธออยู่ที่ไหน'], ['What time do you start?', 'คุณเริ่มกี่โมง']] },
      { h: 'คำบอกความถี่วางหน้ากริยา', body: 'always > usually > sometimes > never วางหลังประธาน หน้ากริยาหลัก', ex: [['I usually walk.', 'ปกติฉันเดิน'], ['She never eats meat.', 'เธอไม่กินเนื้อเลย']] },
    ],
    drills: [
      { k: 'choose', q: '___ she live in Bangkok?', o: ['Do', 'Does', 'Is'], a: 1 },
      { k: 'choose', q: 'Does he ___ coffee?', o: ['like', 'likes', 'liking'], a: 0 },
      { k: 'choose', q: 'Do you cook? — Yes, I ___.', o: ['am', 'do', 'does'], a: 1 },
      { k: 'type', q: 'ถาม: "คุณทำงานที่ไหน"', a: ['where do you work'] },
      { k: 'order', q: 'เรียงคำ: ปกติฉันเดินไปทำงาน', a: ['I usually walk to work'] },
      { k: 'listen', say: 'I sometimes eat at home.', q: 'กินที่บ้านบ่อยแค่ไหน', o: ['เสมอ', 'บางครั้ง', 'ไม่เคย'], a: 1 },
    ],
    tasks: [
      { brief: 'สัมภาษณ์ 5 คำถาม แล้วถามต่อจากคำตอบ', data: 'คนที่สัมภาษณ์: Lek', qs: [
        { k: 'type', q: 'ถาม Lek ว่า "คุณทำงานวันเสาร์ไหม"', a: ['do you work on saturday', 'do you work on saturdays'] },
        { k: 'listen', say: 'Yes, I do. I work until noon.', q: 'Lek ทำงานวันเสาร์ถึงกี่โมง', o: ['เที่ยง', 'บ่ายสาม', 'ห้าโมง'], a: 0 },
        { k: 'type', q: 'ถามต่อ: "แล้วตอนบ่ายคุณทำอะไร"', a: ['what do you do in the afternoon', 'and in the afternoon', 'what do you do after that', 'what do you do after work'] },
        { k: 'listen', say: 'I usually play badminton with my son.', q: 'Lek ทำอะไรตอนบ่าย', o: ['ว่ายน้ำ', 'แบดมินตัน', 'ฟุตบอล'], a: 1 },
        { k: 'type', q: 'ถามว่า "ลูกชายคุณเล่นเก่งไหม" แบบง่าย: "ลูกชายคุณชอบไหม"', a: ['does your son like it', 'does he like it', 'does your son like badminton', 'does he like badminton'] },
      ] },
      { brief: 'สัมภาษณ์คนใหม่: Mai', qs: [
        { k: 'type', q: 'ถาม Mai ว่า "คุณอยู่ที่ไหน"', a: ['where do you live'] },
        { k: 'listen', say: 'I live in Nonthaburi, near the river.', q: 'Mai อยู่ที่ไหน', o: ['นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ'], a: 0 },
        { k: 'type', q: 'ถามต่อ: "คุณไปทำงานยังไง"', a: ['how do you go to work', 'how do you get to work'] },
        { k: 'listen', say: 'I usually take a boat. Sometimes I take a taxi.', q: 'ปกติ Mai ไปทำงานด้วยอะไร', o: ['เรือ', 'แท็กซี่', 'รถไฟฟ้า'], a: 0 },
        { k: 'type', q: 'สรุปให้คนอื่นฟัง: "Mai usually ... "', a: ['mai usually takes a boat', 'mai usually takes a boat to work', 'she usually takes a boat', 'she usually takes a boat to work', 'mai usually goes to work by boat', 'she usually goes to work by boat'] },
      ] },
    ],
    speak: { repeat: ['Do you work on Sundays?', "No, I don't.", 'Where does she live?', 'I usually walk to work.'], prompt: 'ถามคู่สนทนา (หรือพูดคนเดียวเป็นทั้งสองฝ่าย) 3 คำถามเรื่องวันหยุด และตอบจริงของคุณ', model: 'What do you do on Sundays? I usually sleep late and go to the market. Do you cook? Yes, I sometimes cook. Where do you eat lunch? I often eat with my family.' },
    write: { prompt: 'เขียนคำถาม 3 ข้อสำหรับเพื่อน และคำตอบของคุณเองใช้คำบอกความถี่', model: 'Do you exercise? I sometimes go running. Where do you eat lunch? I usually eat at work. When do you read? I always read before bed.', check: ['Do/Does + กริยารูปพื้นฐาน', 'คำบอกความถี่อยู่หน้ากริยา', 'มีคำถาม Wh- อย่างน้อย 1 ข้อ'] },
  },

  'EN-14': {
    words: [
      ['like', 'ไลค์', 'ชอบ', 'I like music.', 'ฉันชอบดนตรี', ''],
      ['love', 'เลิฟว์', 'รักมาก ชอบมาก', 'She loves cooking.', 'เธอชอบทำอาหารมาก', ''],
      ['hate', 'เฮท', 'เกลียด ไม่ชอบเลย', 'He hates waiting.', 'เขาเกลียดการรอ', ''],
      ['music', 'มิว-สิค', 'ดนตรี', 'What music do you like?', 'คุณชอบดนตรีแบบไหน', 'listen to music'],
      ['reading', 'รี-ดิ้ง', 'การอ่าน', 'I like reading at night.', 'ฉันชอบอ่านหนังสือตอนกลางคืน', ''],
      ['football', 'ฟุต-บอล', 'ฟุตบอล', 'They love football.', 'พวกเขาชอบฟุตบอลมาก', 'play football'],
      ['hobby', 'ฮอบ-บี้', 'งานอดิเรก', 'My hobby is drawing.', 'งานอดิเรกของฉันคือวาดรูป', ''],
      ['making videos', 'เมค-กิ้ง วิด-ดี-โอส', 'ทำวิดีโอ', 'I like making videos.', 'ฉันชอบทำวิดีโอ', ''],
    ],
    dialog: {
      lines: [['A', 'What do you like doing in your free time?', 'เวลาว่างคุณชอบทำอะไร'], ['B', 'I love making videos. And you?', 'ฉันชอบทำวิดีโอมาก คุณล่ะ'], ['A', 'I like reading and listening to music.', 'ฉันชอบอ่านหนังสือกับฟังเพลง'], ['B', 'Do you like football?', 'คุณชอบฟุตบอลไหม'], ['A', 'Not really. I hate watching sports on TV.', 'ไม่ค่อย ฉันไม่ชอบดูกีฬาทางทีวีเลย']],
      qs: [
        { k: 'choose', q: 'B ชอบทำอะไร', o: ['ทำวิดีโอ', 'อ่านหนังสือ', 'เล่นฟุตบอล'], a: 0 },
        { k: 'choose', q: 'A ชอบอะไร', o: ['ฟุตบอล', 'อ่านหนังสือและฟังเพลง', 'ทำอาหาร'], a: 1 },
        { k: 'choose', q: 'A รู้สึกอย่างไรกับการดูกีฬาทางทีวี', o: ['ชอบมาก', 'เฉย ๆ', 'ไม่ชอบเลย'], a: 2 },
      ],
    },
    grammar: [
      { h: 'like / love / hate + คำนาม หรือ กริยา-ing', body: 'ตามด้วยคำนาม (I like music) หรือกิจกรรมเติม -ing (I like reading) ถ้าใช้กับ he/she อย่าลืม likes / loves / hates', ex: [['I love cooking.', 'ฉันชอบทำอาหารมาก'], ['She likes cats.', 'เธอชอบแมว']] },
      { h: 'ถามความชอบ', body: 'Do you like ...? · What do you like doing? · What kind of music do you like? ตอบนุ่ม ๆ ได้ว่า Not really. (ไม่ค่อย)', ex: [['Do you like coffee? — Yes, I love it.', 'ชอบกาแฟไหม ชอบมาก'], ['Not really.', 'ไม่ค่อยชอบ']] },
      { h: 'การเติม -ing', body: 'ส่วนใหญ่เติม -ing ตรง ๆ (read → reading) · ลงท้าย e ตัด e (make → making) · สระเดียว+พยัญชนะเดียว เบิ้ลตัวท้าย (swim → swimming)', ex: [['make → making · swim → swimming', '']] },
    ],
    drills: [
      { k: 'choose', q: 'I like ___ films.', o: ['watch', 'watching', 'watches'], a: 1 },
      { k: 'choose', q: 'She ___ dancing.', o: ['love', 'loves', 'loving'], a: 1 },
      { k: 'type', q: 'เติม -ing: swim →', a: ['swimming'] },
      { k: 'type', q: 'ถามเพื่อนว่า "คุณชอบทำอาหารไหม"', a: ['do you like cooking', 'do you like to cook'] },
      { k: 'order', q: 'เรียงคำ: งานอดิเรกของฉันคือการอ่าน', a: ['My hobby is reading'] },
      { k: 'listen', say: 'He hates getting up early.', q: 'เขาไม่ชอบอะไร', o: ['ตื่นเช้า', 'ทำงาน', 'กินข้าวเช้า'], a: 0 },
    ],
    tasks: [
      { brief: 'สำรวจความชอบ 3 คน แล้วสรุปผล', data: 'คน: Ploy · Sam · Ken', qs: [
        { k: 'listen', say: 'Ploy: I love painting, but I hate running.', q: 'Ploy ไม่ชอบอะไร', o: ['วาดรูป', 'วิ่ง', 'ร้องเพลง'], a: 1 },
        { k: 'listen', say: 'Sam: I like playing games and cooking.', q: 'Sam ชอบอะไร', o: ['เล่นเกมและทำอาหาร', 'วิ่งและว่ายน้ำ', 'อ่านหนังสือ'], a: 0 },
        { k: 'listen', say: 'Ken: I like music. I play the guitar.', q: 'Ken เล่นเครื่องดนตรีอะไร', o: ['เปียโน', 'กีตาร์', 'กลอง'], a: 1 },
        { k: 'type', q: 'สรุปเรื่อง Ploy: "Ploy loves ..."', a: ['ploy loves painting', 'she loves painting'] },
        { k: 'type', q: 'สรุปเรื่อง Sam (ใช้ likes)', a: ['/^(sam|he) likes (playing games|cooking|playing games and cooking|cooking and playing games)$/'] },
      ] },
      { brief: 'สำรวจชุดใหม่', data: 'คน: Joy · Tim · Fah', qs: [
        { k: 'listen', say: 'Joy: I love swimming. I swim every Saturday.', q: 'Joy ว่ายน้ำวันไหน', o: ['ทุกวันเสาร์', 'ทุกวัน', 'วันอาทิตย์'], a: 0 },
        { k: 'listen', say: "Tim: I don't like cooking. I like eating!", q: 'Tim ชอบอะไร', o: ['ทำอาหาร', 'กิน', 'ทั้งสองอย่าง'], a: 1 },
        { k: 'listen', say: 'Fah: My hobby is taking photos.', q: 'งานอดิเรกของ Fah', o: ['ถ่ายรูป', 'วาดรูป', 'ทำวิดีโอ'], a: 0 },
        { k: 'type', q: 'สรุปเรื่อง Tim (doesn\'t like ...)', a: ["tim doesn't like cooking", "he doesn't like cooking", 'tim does not like cooking', 'he does not like cooking'] },
        { k: 'type', q: 'บอกงานอดิเรกของคุณเอง (My hobby is ... / I like ...)', a: ['/^(my hobby is|i (like|love)) [a-z ]+$/'] },
      ] },
    ],
    speak: { repeat: ['What do you like doing?', 'I love making videos.', 'Do you like football?', 'Not really.'], prompt: 'บอกสิ่งที่ชอบ 2 อย่าง ไม่ชอบ 1 อย่าง และถามกลับ 1 คำถาม', model: "I love reading and I like playing games. I don't like shopping. What about you? What do you like doing?" },
    write: { prompt: 'เขียนผลสำรวจความชอบ 4 ประโยค (คุณ + เพื่อน 2–3 คน)', model: "I like reading. My friend Sam loves cooking. Ploy doesn't like sport. We all like music.", check: ['like/love/hate + คำนาม หรือ -ing', 'he/she ใช้ likes/loves', 'มีปฏิเสธอย่างน้อย 1 ประโยค'] },
  },

  'EN-15': {
    words: [
      ['can', 'แคน', 'ทำได้ / ขอได้ไหม', 'I can swim.', 'ฉันว่ายน้ำได้', ''],
      ["can't", 'แคนท์', 'ทำไม่ได้', "I can't drive.", 'ฉันขับรถไม่เป็น', ''],
      ['swim', 'สวิม', 'ว่ายน้ำ', 'Can you swim?', 'คุณว่ายน้ำเป็นไหม', ''],
      ['help', 'เฮลพ์', 'ช่วย', 'Can you help me, please?', 'ช่วยฉันหน่อยได้ไหม', 'help me'],
      ['open', 'โอ-เพิน', 'เปิด', 'Can you open the window?', 'ช่วยเปิดหน้าต่างได้ไหม', ''],
      ['carry', 'แคร์-รี่', 'ถือ แบก', 'Can I carry that for you?', 'ให้ฉันช่วยถือไหม', ''],
      ['of course', 'ออฟ คอร์ส', 'ได้สิ แน่นอน', 'Of course!', 'ได้เลย', ''],
      ["I'm afraid", 'แอม อะ-เฟรด', 'เกรงว่า (ปฏิเสธสุภาพ)', "Sorry, I'm afraid I can't.", 'ขอโทษ เกรงว่าทำไม่ได้', ''],
    ],
    dialog: {
      lines: [['A', 'Excuse me. Can you help me, please?', 'ขอโทษค่ะ ช่วยหน่อยได้ไหม'], ['B', 'Of course. What is it?', 'ได้สิ มีอะไรเหรอ'], ['A', "I can't open this door.", 'ฉันเปิดประตูนี้ไม่ได้'], ['B', 'Let me try. ... There you go!', 'ขอลองหน่อย ... เปิดได้แล้ว'], ['A', 'Thank you! Can you carry this box too?', 'ขอบคุณ ช่วยถือกล่องนี้ด้วยได้ไหม'], ['B', "Sorry, I'm afraid I can't. My back hurts.", 'ขอโทษนะ เกรงว่าไม่ได้ ปวดหลังอยู่']],
      qs: [
        { k: 'choose', q: 'A ทำอะไรไม่ได้', o: ['เปิดประตู', 'ถือกล่อง', 'ขับรถ'], a: 0 },
        { k: 'choose', q: 'B ช่วยถือกล่องไหม', o: ['ช่วย', 'ไม่ช่วย', 'ช่วยทีหลัง'], a: 1 },
        { k: 'choose', q: 'ทำไม B ปฏิเสธ', o: ['ไม่มีเวลา', 'ปวดหลัง', 'ไม่อยากช่วย'], a: 1 },
      ],
    },
    grammar: [
      { h: "can / can't + กริยารูปพื้นฐาน", body: "บอกความสามารถ ใช้รูปเดียวกับทุกประธาน (He can swim ไม่ใช่ He cans) · ปฏิเสธ can't · ออกเสียง can เบา ๆ (เคิน) ส่วน can't เน้นชัด (แคนท์)", ex: [['She can drive.', 'เธอขับรถเป็น'], ["I can't cook.", 'ฉันทำอาหารไม่เป็น']] },
      { h: 'Can you ...? = ขอความช่วยเหลือ', body: 'Can you + กริยา + please? สุภาพขึ้นเมื่อเติม please และ Excuse me ข้างหน้า · Can I ...? = ขออนุญาต', ex: [['Can you help me, please?', 'ช่วยฉันหน่อยได้ไหม'], ['Can I sit here?', 'นั่งตรงนี้ได้ไหม']] },
      { h: 'ตอบรับ / ปฏิเสธสุภาพ', body: "รับ: Sure. / Of course. / No problem. · ปฏิเสธ: Sorry, I'm afraid I can't. + เหตุผลสั้น ๆ", ex: [['No problem!', 'ไม่มีปัญหา'], ["Sorry, I'm busy now.", 'ขอโทษ ตอนนี้ยุ่งอยู่']] },
    ],
    drills: [
      { k: 'choose', q: 'He ___ speak Japanese.', o: ['can', 'cans', 'can to'], a: 0 },
      { k: 'choose', q: 'Can you ___ me?', o: ['helps', 'help', 'helping'], a: 1 },
      { k: 'listen', say: "I can't swim.", q: 'เขาว่ายน้ำเป็นไหม', o: ['เป็น', 'ไม่เป็น', 'ไม่ได้บอก'], a: 1 },
      { k: 'type', q: 'ขอให้ช่วยเปิดหน้าต่างอย่างสุภาพ', a: ['can you open the window please', 'could you open the window please', 'can you open the window', 'excuse me can you open the window please'] },
      { k: 'type', q: 'ปฏิเสธสุภาพ (Sorry, I\'m afraid ...)', a: ["sorry i'm afraid i can't", "sorry i am afraid i can't", "i'm afraid i can't", 'sorry i am afraid i cannot', "i'm afraid i cannot"] },
      { k: 'order', q: 'เรียงคำ: ฉันนั่งตรงนี้ได้ไหม', a: ['Can I sit here'] },
    ],
    tasks: [
      { brief: 'สลับบทขอความช่วยเหลือ 4 สถานการณ์', data: 'สถานการณ์: ลิฟต์ · ร้านกาแฟ · สำนักงาน · ป้ายรถเมล์', qs: [
        { k: 'choose', q: 'กระเป๋าหนักมาก ขอให้คนช่วยถือ', o: ['Can you carry my bag, please?', 'You carry my bag.', 'Carry bag!'], a: 0 },
        { k: 'listen', say: 'Sure, no problem.', q: 'อีกฝ่ายตอบอย่างไร', o: ['ยินดีช่วย', 'ปฏิเสธ', 'ถามกลับ'], a: 0 },
        { k: 'type', q: 'ขออนุญาตใช้ปากกา', a: ['can i use your pen', 'can i use your pen please', 'can i borrow your pen', 'can i borrow your pen please', 'could i use your pen please', 'could i borrow your pen please'] },
        { k: 'listen', say: "Sorry, I'm afraid I need it now.", q: 'อีกฝ่ายให้ยืมไหม', o: ['ให้', 'ไม่ให้', 'ให้ทีหลัง'], a: 1 },
        { k: 'type', q: 'บอกว่าคุณทำอะไรได้ 1 อย่าง (I can ...)', a: ['/^i can [a-z ]+$/'] },
      ] },
      { brief: 'สถานการณ์ใหม่: ในที่ทำงาน', qs: [
        { k: 'choose', q: 'คอมเพิ่งค้าง อยากให้เพื่อนช่วย', o: ['Can you help me with my computer?', 'You can computer.', 'Help computer you?'], a: 0 },
        { k: 'listen', say: "I'm afraid I can't now. I'm in a meeting.", q: 'ทำไมเพื่อนช่วยไม่ได้', o: ['กำลังประชุม', 'ทำไม่เป็น', 'กลับบ้านแล้ว'], a: 0 },
        { k: 'type', q: 'ขอให้ช่วยพูดช้าลง', a: ['can you speak slowly please', 'can you speak more slowly please', 'could you speak slowly please', 'could you speak more slowly please', 'can you speak slowly', 'can you speak more slowly'] },
        { k: 'listen', say: 'Of course. Can I help you with anything else?', q: 'อีกฝ่ายถามอะไร', o: ['ให้ช่วยอย่างอื่นไหม', 'ชื่ออะไร', 'กี่โมงแล้ว'], a: 0 },
        { k: 'type', q: 'บอกสิ่งที่คุณทำไม่เป็น 1 อย่าง', a: ["/^i (cannot|can't|can not) [a-z ]+$/"] },
      ] },
    ],
    speak: { repeat: ['Can you help me, please?', 'Of course.', "Sorry, I'm afraid I can't.", 'I can swim, but I can\'t drive.'], prompt: 'บอกสิ่งที่ทำได้ 2 อย่าง ทำไม่ได้ 1 อย่าง แล้วขอความช่วยเหลือ 1 ประโยค', model: "I can cook and I can speak a little English. I can't swim. Can you help me with my homework, please?" },
    write: { prompt: 'เขียนข้อความขอความช่วยเหลือเพื่อนร่วมงาน 2 ประโยค และคำตอบปฏิเสธสุภาพ 1 ประโยค', model: "Hi Mook, can you help me with this report, please? I can't open the file. — Sorry, I'm afraid I can't now. I'm in a meeting.", check: ['can + กริยารูปพื้นฐาน', 'มี please', 'ปฏิเสธมีเหตุผลสั้น ๆ'] },
  },

  'EN-16': {
    check: true,
    words: [
      ['daily', 'เดล-ลี่', 'ประจำวัน', 'my daily routine', 'กิจวัตรประจำวันของฉัน', 'daily life'],
      ['routine', 'รู-ทีน', 'กิจวัตร', 'My routine is simple.', 'กิจวัตรของฉันเรียบง่าย', ''],
      ['busy', 'บิ-ซี่', 'ยุ่ง', 'Monday is my busy day.', 'วันจันทร์เป็นวันยุ่งของฉัน', ''],
      ['after work', 'อาฟ-เตอร์ เวิร์ค', 'หลังเลิกงาน', 'I study after work.', 'ฉันเรียนหลังเลิกงาน', ''],
      ['at night', 'แอท ไนท์', 'ตอนกลางคืน', 'I read at night.', 'ฉันอ่านหนังสือตอนกลางคืน', ''],
    ],
    dialog: {
      lines: [['A', 'What does a normal day look like for you?', 'วันปกติของคุณเป็นยังไง'], ['B', 'I usually wake up at six. There is a park next to my house, so I run there.', 'ปกติฉันตื่นหกโมง ข้างบ้านมีสวน ฉันเลยไปวิ่ง'], ['A', 'Do you work on weekends?', 'คุณทำงานเสาร์อาทิตย์ไหม'], ['B', 'Only on Saturday. I finish at noon.', 'แค่วันเสาร์ เลิกเที่ยง'], ['A', 'What do you like doing after work?', 'หลังเลิกงานชอบทำอะไร'], ['B', "I love cooking. I can't cook Thai food well, but I can make pasta!", 'ชอบทำอาหาร ทำอาหารไทยยังไม่เก่ง แต่ทำพาสต้าได้']],
      qs: [
        { k: 'choose', q: 'B วิ่งที่ไหน', o: ['ยิม', 'สวนข้างบ้าน', 'ริมแม่น้ำ'], a: 1 },
        { k: 'choose', q: 'วันเสาร์ B เลิกงานกี่โมง', o: ['เที่ยง', 'บ่ายสาม', 'ห้าโมง'], a: 0 },
        { k: 'choose', q: 'B ทำอาหารอะไรได้', o: ['อาหารไทย', 'พาสต้า', 'ซูชิ'], a: 1 },
        { k: 'choose', q: 'B ทำงานวันอาทิตย์ไหม', o: ['ทำ', 'ไม่ทำ', 'ไม่ได้บอก'], a: 1 },
      ],
    },
    grammar: [
      { h: 'ทบทวนช่วง 2', body: 'There is/are + ตำแหน่ง · at/on/in กับเวลา · present simple (เติม -s กับ he/she) · do/does ถามและปฏิเสธ · คำบอกความถี่ · like + -ing · can/can\'t', ex: [['There is a park next to my house.', ''], ['She usually starts at eight.', ''], ["I can't cook Thai food well.", '']] },
      { h: 'คำเน้นในประโยค', body: 'คำสำคัญ (คำนาม กริยาหลัก ตัวเลข คำปฏิเสธ) พูดชัดและยาวกว่า ส่วน a/the/at/to/can พูดเบาและเร็ว ทำให้ฟังเป็นธรรมชาติ', ex: [['I usually STUDY at SEVEN.', 'เน้น study และ seven'], ["I CAN'T DRIVE.", "เน้น can't"]] },
    ],
    drills: [
      { k: 'choose', q: 'There ___ two parks near my office.', o: ['is', 'are', 'have'], a: 1 },
      { k: 'choose', q: 'She ___ to work at eight.', o: ['go', 'goes', 'going'], a: 1 },
      { k: 'choose', q: '___ he like football?', o: ['Do', 'Does', 'Is'], a: 1 },
      { k: 'type', q: 'แปล: ปกติฉันเรียนตอนหนึ่งทุ่ม', a: ['i usually study at seven', 'i usually study at 7', 'i usually study at seven pm', 'i usually study at 7 pm', 'i usually study at seven in the evening'] },
      { k: 'choose', q: 'My meeting is ___ Friday ___ ten.', o: ['on / at', 'at / on', 'in / at'], a: 0 },
      { k: 'type', q: 'บอกว่าคุณชอบทำอะไรหลังเลิกงาน (I like ... after work)', a: ['/^i (like|love) [a-z ]+ after work$/'] },
      { k: 'listen', say: "He can't swim, but he can ride a bike.", q: 'เขาทำอะไรได้', o: ['ว่ายน้ำ', 'ขี่จักรยาน', 'ทั้งสองอย่าง'], a: 1 },
    ],
    tasks: [
      { brief: 'จุดตรวจ: ฟังตารางใหม่ ตอบคำถาม แล้วเล่าวันของคุณ', data: 'ตาราง: หนึ่งวันของ Daniel', qs: [
        { k: 'listen', say: 'Daniel lives in a small apartment. There is a gym under his building.', q: 'ยิมอยู่ที่ไหน', o: ['ใต้อาคาร', 'ข้างอาคาร', 'บนดาดฟ้า'], a: 0 },
        { k: 'listen', say: 'He starts work at nine and finishes at six.', q: 'Daniel ทำงานกี่โมงถึงกี่โมง', o: ['8–5', '9–6', '9–5'], a: 1 },
        { k: 'listen', say: "He doesn't cook. He usually eats at a small restaurant.", q: 'Daniel กินข้าวที่ไหน', o: ['ที่บ้าน', 'ร้านอาหารเล็ก ๆ', 'ที่ทำงาน'], a: 1 },
        { k: 'listen', say: 'On Sundays he plays tennis. He can play very well.', q: 'วันอาทิตย์ Daniel ทำอะไร', o: ['เทนนิส', 'ว่ายน้ำ', 'ฟุตบอล'], a: 0 },
        { k: 'type', q: 'ถาม Daniel ว่า "คุณเล่นเทนนิสกับใคร"', a: ['who do you play tennis with', 'who do you play with'] },
        { k: 'type', q: 'บอกเวลาที่ Daniel เลิกงาน', a: ['he finishes work at six', 'he finishes at six', 'daniel finishes work at six', 'daniel finishes at six', 'he finishes work at 6', 'he finishes at 6'] },
      ] },
      { brief: 'จุดตรวจ ชุดใหม่: หนึ่งวันของ Suda', qs: [
        { k: 'listen', say: 'Suda lives near the station. There are many cafes there.', q: 'ใกล้สถานีมีอะไร', o: ['ร้านกาแฟหลายร้าน', 'สวน', 'โรงเรียน'], a: 0 },
        { k: 'listen', say: 'She works at home on Monday and Friday.', q: 'Suda ทำงานที่บ้านวันไหน', o: ['จันทร์และศุกร์', 'อังคารและพฤหัส', 'ทุกวัน'], a: 0 },
        { k: 'listen', say: 'She never drinks coffee. She likes green tea.', q: 'Suda ดื่มอะไร', o: ['กาแฟ', 'ชาเขียว', 'น้ำผลไม้'], a: 1 },
        { k: 'listen', say: 'In the evening she studies Korean. She can read Korean letters.', q: 'Suda เรียนอะไร', o: ['ญี่ปุ่น', 'เกาหลี', 'จีน'], a: 1 },
        { k: 'type', q: 'ถาม Suda ว่า "คุณเรียนภาษาเกาหลีที่ไหน"', a: ['where do you study korean'] },
        { k: 'type', q: 'บอกว่า Suda ไม่ดื่มกาแฟ', a: ['she never drinks coffee', "she doesn't drink coffee", 'suda never drinks coffee', "suda doesn't drink coffee", 'she does not drink coffee', 'suda does not drink coffee'] },
      ] },
    ],
    speak: { repeat: ['I usually study at seven.', 'There is a park next to my house.', "I can't cook Thai food well.", 'What do you like doing after work?'], prompt: 'พูด 90 วินาที: บ้าน/ห้องของคุณ เวลาในหนึ่งวัน กิจวัตร สิ่งที่ชอบ และสิ่งที่ทำได้/ไม่ได้', model: "I live in a small house in Bangkok. There is a big tree next to my house. On weekdays I wake up at six and go to work at eight. I work at a car dealership. I usually finish at five. After work I study English, and sometimes I go to the gym. I love watching movies. I can drive, but I can't swim." },
    write: { prompt: 'เขียน 6–8 ประโยคเรื่อง "หนึ่งวันของฉัน" (บ้าน เวลา กิจวัตร ความชอบ ความสามารถ)', model: "I live in an apartment in Bangkok. There is a small kitchen in my room. I usually wake up at 6:00. I go to work at 7:30 by car. I finish work at 5:00. After work I study English or read. I like cooking, but I can't cook very well. I go to bed at 11:00.", check: ['มีอย่างน้อย 6 ประโยค', 'There is/are 1 ประโยค', 'at/on/in กับเวลาถูก', 'มีคำบอกความถี่และ like/can'] },
  },
}
