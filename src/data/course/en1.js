// English section 1 (EN-01..08). Original lesson content written for this app from the owner's curriculum outline.
// Question kinds: choose / listen (a = index), type / order (a = accepted answers; '/regex/' allowed).
const L = (s) => s

export default {
  'EN-01': {
    words: [
      ['hello', 'เฮล-โล', 'สวัสดี', 'Hello. I\'m May.', 'สวัสดี ฉันชื่อเมย์', 'say hello'],
      ['hi', 'ไฮ', 'หวัดดี (เป็นกันเอง)', 'Hi, Ken!', 'หวัดดี เคน', ''],
      ['bye', 'บาย', 'ลาก่อน บาย', 'Bye! See you.', 'บาย แล้วเจอกัน', 'bye for now'],
      ['name', 'เนม', 'ชื่อ', 'My name is May.', 'ฉันชื่อเมย์', 'first name'],
      ['my', 'มาย', 'ของฉัน', 'My name is Ken.', 'ฉันชื่อเคน', ''],
      ["I'm", 'แอม/ไอม์', 'ฉันคือ (= I am)', "I'm Ann.", 'ฉันชื่อแอน', ''],
      ['nice to meet you', 'ไนซ์ ทู มีท ยู', 'ยินดีที่ได้รู้จัก', 'Nice to meet you, May.', 'ยินดีที่ได้รู้จักนะเมย์', ''],
      ['letter', 'เล็ท-เทอร์', 'ตัวอักษร', 'A is a letter.', 'A เป็นตัวอักษร', 'capital letter'],
    ],
    dialog: {
      lines: [['A', "Hello. I'm May.", 'สวัสดี ฉันชื่อเมย์'], ['B', "Hi, May. I'm Ken.", 'หวัดดีเมย์ ฉันชื่อเคน'], ['A', 'Nice to meet you, Ken.', 'ยินดีที่ได้รู้จักนะเคน'], ['B', 'Nice to meet you, too. Bye!', 'ยินดีที่ได้รู้จักเหมือนกัน บาย']],
      qs: [
        { k: 'choose', q: 'คนแรกชื่ออะไร', o: ['Ken', 'May', 'Ann'], a: 1 },
        { k: 'choose', q: 'คนที่สองชื่ออะไร', o: ['Ken', 'May', 'Bye'], a: 0 },
        { k: 'choose', q: '"Nice to meet you" ใช้ตอนไหน', o: ['ตอนลาจาก', 'ตอนเพิ่งรู้จักกัน', 'ตอนขอโทษ'], a: 1 },
      ],
    },
    grammar: [
      { h: 'ตัวอักษร 26 ตัว มีตัวใหญ่และตัวเล็ก', body: 'อังกฤษมี 26 ตัว แต่ละตัวมีรูปใหญ่ (A B C) และรูปเล็ก (a b c) ตัวใหญ่ใช้ขึ้นต้นประโยคและชื่อคน เช่น May, Ken ส่วนตัวที่เหลือในคำเป็นตัวเล็ก', ex: [['A a · B b · G g · Q q', 'บางคู่หน้าตาต่างกันมาก ต้องจำทีละคู่']] },
      { h: 'ชื่ออักษร ≠ เสียงในคำ', body: 'ชื่ออักษรใช้ตอนสะกด แต่เสียงในคำเปลี่ยนได้ เช่น A ใน name ออก "เอ" แต่ใน cat ออก "แอ" จึงต้องฟังคำจริงทีละคำ อย่าอ่านตามชื่ออักษร', ex: [['name / cat', 'เนม / แคท'], ['he / bed', 'ฮี / เบด']] },
      { h: "I'm = I am", body: "เวลาแนะนำตัวพูดว่า I'm + ชื่อ (เป็นวลีสำเร็จรูปไปก่อน บทที่ 3 จะอธิบาย am/is/are)", ex: [["I'm Ken.", 'ฉันชื่อเคน']] },
    ],
    drills: [
      { k: 'choose', q: 'ตัวเล็กของ G คือ', o: ['q', 'g', 'j', 'y'], a: 1 },
      { k: 'choose', q: 'ตัวใหญ่ของ b คือ', o: ['D', 'P', 'B', 'R'], a: 2 },
      { k: 'listen', say: 'hello', q: 'ได้ยินคำไหน', o: ['hello', 'yellow', 'bye', 'name'], a: 0 },
      { k: 'type', q: 'เติมคำทักทายตอบ: "Hello. I\'m May." → "___, May. I\'m Ken."', a: ['hi', 'hello'] },
      { k: 'order', q: 'เรียงคำ: ยินดีที่ได้รู้จัก', a: ['Nice to meet you'] },
      { k: 'choose', q: 'คำไหนขึ้นต้นด้วยตัวใหญ่ถูกต้อง', o: ['may is here.', 'My name is May.', 'my name is may.'], a: 1, why: 'ขึ้นต้นประโยคและชื่อคนใช้ตัวใหญ่' },
    ],
    tasks: [
      { brief: 'จับคู่ตัวใหญ่-ตัวเล็ก แล้วตอบคำทักทายที่ได้ยิน', gen: 'letters', qs: [
        { k: 'listen', say: "Hello. I'm Lin.", q: 'ได้ยินแล้วควรตอบอย่างไร', o: ["Hi, Lin. I'm …", 'Bye, Lin.', 'Thank you.'], a: 0 },
        { k: 'listen', say: 'Nice to meet you.', q: 'ตอบอะไรดี', o: ['Nice to meet you, too.', 'Hello?', 'My name.'], a: 0 },
      ] },
      { brief: 'จับคู่ตัวอักษร แล้วเลือกคำตอบที่เหมาะ', gen: 'letters', qs: [
        { k: 'listen', say: "Hi! I'm Tom.", q: 'คนพูดชื่ออะไร', o: ['Tim', 'Tom', 'Tam'], a: 1 },
        { k: 'listen', say: 'Bye!', q: 'เขากำลังทำอะไร', o: ['ทักทาย', 'ลาก่อน', 'ถามชื่อ'], a: 1 },
      ] },
    ],
    speak: { repeat: ['Hello.', "Hi, I'm May.", 'Nice to meet you.', 'Nice to meet you, too.', 'Bye!'], prompt: 'ทักทายและบอกชื่อตัวเอง 2 ประโยค', model: "Hello. I'm Ronnakrit. Nice to meet you." },
    write: { prompt: 'เขียนประโยคแนะนำตัว 2 ประโยค (ขึ้นต้นด้วยตัวใหญ่)', model: "Hello. I'm Ronnakrit.", check: ['ขึ้นต้นประโยคด้วยตัวใหญ่', "ใช้ I'm + ชื่อ", 'ชื่อขึ้นต้นด้วยตัวใหญ่'] },
  },

  'EN-02': {
    words: [
      ['spell', 'สเปล', 'สะกด', 'How do you spell your name?', 'ชื่อคุณสะกดยังไง', 'spell a name'],
      ['again', 'อะ-เกน', 'อีกครั้ง', 'Say it again, please.', 'พูดอีกครั้งได้ไหม', 'once again'],
      ['please', 'พลีซ', 'กรุณา โปรด', 'Slowly, please.', 'ช้า ๆ หน่อยนะ', ''],
      ['sorry', 'ซอ-รี่', 'ขอโทษ / อะไรนะ', 'Sorry? Can you say that again?', 'อะไรนะ พูดอีกทีได้ไหม', ''],
      ['slowly', 'สโลว์-ลี่', 'อย่างช้า ๆ', 'Please speak slowly.', 'กรุณาพูดช้า ๆ', 'speak slowly'],
      ['zero', 'ซี-โร่', 'ศูนย์', 'zero, one, two', 'ศูนย์ หนึ่ง สอง', ''],
      ['one', 'วัน', 'หนึ่ง', 'one letter', 'ตัวอักษรหนึ่งตัว', ''],
      ['ten', 'เท็น', 'สิบ', 'ten letters', 'ตัวอักษรสิบตัว', ''],
      ['thank you', 'แธงค์ ยู', 'ขอบคุณ', 'Thank you very much.', 'ขอบคุณมาก', 'thank you very much'],
    ],
    dialog: {
      lines: [['A', "What's your name?", 'คุณชื่ออะไร'], ['B', "I'm Pim.", 'ฉันชื่อพิม'], ['A', 'Sorry? Could you say that again, please?', 'อะไรนะ ช่วยพูดอีกครั้งได้ไหม'], ['B', 'Pim. P-I-M.', 'พิม พี-ไอ-เอ็ม'], ['A', 'Thank you, Pim.', 'ขอบคุณนะพิม']],
      qs: [
        { k: 'choose', q: 'ผู้หญิงชื่ออะไร', o: ['Pam', 'Pim', 'Tim'], a: 1 },
        { k: 'choose', q: 'A พูดว่า "Could you say that again?" เพราะอะไร', o: ['ฟังไม่ทัน', 'ไม่ชอบชื่อ', 'จะลาก่อน'], a: 0 },
        { k: 'choose', q: 'ชื่อสะกดว่า', o: ['P-I-N', 'P-I-M', 'B-I-M'], a: 1 },
      ],
    },
    grammar: [
      { h: 'สะกดชื่อด้วยชื่ออักษร', body: 'เวลาสะกด ให้พูดชื่ออักษรทีละตัวและเว้นจังหวะ เช่น K-E-N (เค-อี-เอ็น) ตัวที่ซ้ำกันพูดว่า double ได้ เช่น ANN = A, double N', ex: [['Ken: K-E-N', 'เค-อี-เอ็น'], ['Ann: A, double N', 'เอ, ดับเบิล เอ็น']] },
      { h: 'วลีช่วยเมื่อฟังไม่ทัน (ใช้เป็นก้อนไปก่อน)', body: 'ไม่ต้องรู้ไวยากรณ์ก็ใช้ได้เลย สามวลีนี้ช่วยให้คุยต่อได้ทุกครั้งที่ฟังไม่ทัน', ex: [['Sorry?', 'อะไรนะ'], ['Could you say that again, please?', 'ช่วยพูดอีกครั้งได้ไหม'], ['Slowly, please.', 'ช้า ๆ หน่อยครับ/ค่ะ']] },
      { h: 'ตัวเลข 0–10', body: 'zero one two three four five six seven eight nine ten · เบอร์โทรอ่านทีละตัว 0 อ่านว่า zero หรือ oh', ex: [['081', 'zero eight one / oh eight one']] },
    ],
    drills: [
      { k: 'listen', say: 'K. E. N.', q: 'ฟังการสะกดแล้วเลือกชื่อ', o: ['Ken', 'Kim', 'Jen'], a: 0 },
      { k: 'listen', say: 'seven', q: 'ได้ยินเลขอะไร', o: ['6', '7', '11', '17'], a: 1 },
      { k: 'type', q: 'ฟังไม่ทัน อยากให้พูดอีกครั้ง พิมพ์วลีสั้น ๆ', a: ['sorry', 'sorry?', 'again please', 'say that again please', '/could you say (that|it) again/', '/can you say (that|it) again/'] },
      { k: 'order', q: 'เรียงคำ: ช่วยพูดอีกครั้งได้ไหม', a: ['Could you say that again please'] },
      { k: 'type', q: 'เขียนตัวเลข "four" เป็นตัวเลข', a: ['4'] },
      { k: 'choose', q: '"ANN" สะกดแบบไหนสั้นที่สุด', o: ['A, N, N', 'A, double N', 'A and N'], a: 1 },
    ],
    tasks: [
      { brief: 'ฟังชื่อที่สะกด 3 ชื่อ แล้วเลือกให้ถูก', qs: [
        { k: 'listen', say: 'My name is Noi. N. O. I.', q: 'ชื่อที่ได้ยิน', o: ['Noi', 'Nui', 'Moi'], a: 0 },
        { k: 'listen', say: 'I am Beam. B. E. A. M.', q: 'ชื่อที่ได้ยิน', o: ['Bean', 'Beam', 'Deam'], a: 1 },
        { k: 'listen', say: 'Jack. J. A. C. K.', q: 'ชื่อที่ได้ยิน', o: ['Jake', 'Jack', 'Zack'], a: 1 },
        { k: 'type', q: 'สะกดชื่อเล่นของคุณเป็นตัวอักษรอังกฤษ (พิมพ์ชื่อ)', a: ['/^[a-z][a-z -]{1,20}$/'] },
      ] },
      { brief: 'ฟังเบอร์โทร แล้วเลือกให้ถูก', qs: [
        { k: 'listen', say: 'zero eight one, two three four', q: 'เบอร์ที่ได้ยิน', o: ['081-234', '018-234', '081-243'], a: 0 },
        { k: 'listen', say: 'My name is Fah. F. A. H.', q: 'ชื่อที่ได้ยิน', o: ['Fah', 'Far', 'Pah'], a: 0 },
        { k: 'listen', say: 'nine, five, zero', q: 'ได้ยินเลขชุดไหน', o: ['950', '590', '915'], a: 0 },
        { k: 'type', q: 'ฟังไม่ทัน พิมพ์วลีขอให้พูดช้าลง', a: ['slowly please', 'please speak slowly', '/slow(ly)? please/', '/speak (more )?slowly/'] },
      ] },
    ],
    speak: { repeat: ['Sorry?', 'Could you say that again, please?', 'Slowly, please.', 'My name is Pim. P-I-M.'], prompt: 'บอกชื่อและสะกดชื่อตัวเอง แล้วพูดวลีขอให้พูดซ้ำ', model: 'My name is Ron. R-O-N. Sorry? Could you say that again, please?' },
    write: { prompt: 'เขียนชื่อคุณและสะกดทีละตัว เช่น Ron: R-O-N', model: 'My name is Ron. R-O-N.', check: ['ชื่อขึ้นต้นตัวใหญ่', 'สะกดครบทุกตัว', 'ใส่จุดท้ายประโยค'] },
  },

  'EN-03': {
    words: [
      ['I', 'ไอ', 'ฉัน', 'I am Thai.', 'ฉันเป็นคนไทย', ''],
      ['you', 'ยู', 'คุณ', 'You are a teacher.', 'คุณเป็นครู', ''],
      ['he / she', 'ฮี / ชี', 'เขา (ชาย) / เธอ (หญิง)', 'She is from Japan.', 'เธอมาจากญี่ปุ่น', ''],
      ['we / they', 'วี / เดย์', 'พวกเรา / พวกเขา', 'We are students.', 'พวกเราเป็นนักเรียน', ''],
      ['Thai', 'ไท', 'คนไทย / ภาษาไทย', 'I am Thai.', 'ฉันเป็นคนไทย', 'Thai food'],
      ['from', 'ฟรอม', 'มาจาก', 'I am from Thailand.', 'ฉันมาจากประเทศไทย', 'come from'],
      ['student', 'สติว-เดนท์', 'นักเรียน', 'She is a student.', 'เธอเป็นนักเรียน', 'university student'],
      ['teacher', 'ที-เชอร์', 'ครู', 'He is my teacher.', 'เขาเป็นครูของฉัน', 'English teacher'],
      ['Thailand', 'ไท-แลนด์', 'ประเทศไทย', 'Thailand is hot.', 'ประเทศไทยร้อน', ''],
      ['Japan', 'จะ-แพน', 'ประเทศญี่ปุ่น', 'Ken is from Japan.', 'เคนมาจากญี่ปุ่น', ''],
    ],
    dialog: {
      lines: [['A', "Hi, I'm Ana. I'm from Brazil.", 'หวัดดี ฉันชื่ออานา ฉันมาจากบราซิล'], ['B', "Hello, Ana. I'm Ton. I'm Thai.", 'สวัสดีอานา ผมชื่อต้น ผมเป็นคนไทย'], ['A', 'Are you a student?', 'คุณเป็นนักเรียนไหม'], ['B', "Yes. And she is my teacher. She's from England.", 'ใช่ และเธอเป็นครูของผม เธอมาจากอังกฤษ']],
      qs: [
        { k: 'choose', q: 'อานามาจากประเทศอะไร', o: ['Thailand', 'Brazil', 'England'], a: 1 },
        { k: 'choose', q: 'ต้นเป็นอะไร', o: ['ครู', 'นักเรียน', 'หมอ'], a: 1 },
        { k: 'choose', q: 'ครูมาจากที่ไหน', o: ['England', 'Japan', 'Brazil'], a: 0 },
      ],
    },
    grammar: [
      { h: 'am / is / are ใช้กับใคร', body: 'I + am · he / she / it + is · you / we / they + are · ใช้บอกว่าเป็นใคร อยู่ไหน หรือเป็นอย่างไร (ภาษาไทยไม่มีคำนี้ แต่อังกฤษขาดไม่ได้)', ex: [['I am Thai.', 'ฉันเป็นคนไทย'], ['She is a teacher.', 'เธอเป็นครู'], ['They are from Japan.', 'พวกเขามาจากญี่ปุ่น']] },
      { h: 'ต้องมีประธานเสมอ', body: 'ภาษาไทยพูดว่า "มาจากไทย" ได้ แต่อังกฤษต้องบอกว่าใคร: I am from Thailand. ห้ามขึ้นต้นด้วย Am from…', ex: [['I am from Thailand. ✓', ''], ['Am from Thailand. ✗', '']] },
      { h: 'a + อาชีพ', body: 'อาชีพหนึ่งคนใส่ a ข้างหน้า: a student, a teacher (บทที่ 5 จะเรียน a / an เพิ่ม)', ex: [['He is a student.', 'เขาเป็นนักเรียน']] },
    ],
    drills: [
      { k: 'choose', q: 'She ___ from Japan.', o: ['am', 'is', 'are'], a: 1 },
      { k: 'choose', q: 'We ___ students.', o: ['am', 'is', 'are'], a: 2 },
      { k: 'type', q: 'เติม: I ___ Thai.', a: ['am'] },
      { k: 'order', q: 'เรียงคำ: ฉันมาจากประเทศไทย', a: ['I am from Thailand'] },
      { k: 'choose', q: 'ประโยคไหนถูก', o: ['Am a teacher.', 'I am teacher.', 'I am a teacher.'], a: 2, why: 'ต้องมีประธาน I และ a หน้าอาชีพ' },
      { k: 'type', q: 'แปล: เขาเป็นครู (ผู้ชาย)', a: ['he is a teacher', "he's a teacher"] },
    ],
    tasks: [
      { brief: 'ฟังข้อมูล 3 คน แล้วจับคู่', data: 'Lina · Mark · Aoi', qs: [
        { k: 'listen', say: 'Hi, I am Lina. I am from Spain. I am a student.', q: 'Lina เป็นอะไร', o: ['teacher', 'student', 'doctor'], a: 1 },
        { k: 'listen', say: 'This is Mark. He is a teacher. He is from Canada.', q: 'Mark มาจากไหน', o: ['Canada', 'Spain', 'Japan'], a: 0 },
        { k: 'listen', say: 'Aoi is from Japan. She is a student, too.', q: 'Aoi มาจากไหน', o: ['China', 'Japan', 'Korea'], a: 1 },
        { k: 'type', q: 'แนะนำตัวเอง 1 ประโยค บอกว่ามาจากไหน', a: ['/^i( am|\'m) from [a-z ]+$/', '/^i am thai$/'] },
      ] },
      { brief: 'ฟังแล้วตอบ ใคร เป็นอะไร มาจากไหน', qs: [
        { k: 'listen', say: 'I am Omar. I am from Egypt.', q: 'Omar มาจากไหน', o: ['Egypt', 'India', 'Italy'], a: 0 },
        { k: 'listen', say: 'She is Mai. She is a teacher. She is Thai.', q: 'Mai เป็นอะไร', o: ['student', 'teacher', 'chef'], a: 1 },
        { k: 'listen', say: 'They are Sam and Jo. They are from England.', q: 'Sam กับ Jo มาจากไหน', o: ['England', 'Thailand', 'Japan'], a: 0 },
        { k: 'type', q: 'เขียน 1 ประโยค: เธอเป็นนักเรียน', a: ['she is a student', "she's a student"] },
      ] },
    ],
    speak: { repeat: ["I'm Ton.", "I'm Thai.", "I'm from Thailand.", 'She is a teacher.'], prompt: 'แนะนำตัว 3 ประโยค: ชื่อ ประเทศ และอาชีพ', model: "Hello. I'm Ronnakrit. I'm from Thailand. I work at a car dealership." },
    write: { prompt: 'เขียนแนะนำตัว 3 ประโยค (ชื่อ ประเทศ อาชีพ)', model: "My name is Ron. I am from Thailand. I am a salesperson.", check: ['ทุกประโยคมีประธาน', 'ใช้ am / is / are ถูกคน', 'มี a หน้าอาชีพ'] },
  },

  'EN-04': {
    words: [
      ['yes', 'เยส', 'ใช่', "Yes, I am.", 'ใช่ ฉันเป็น', ''],
      ['no', 'โน', 'ไม่ใช่', "No, I'm not.", 'ไม่ใช่', ''],
      ['not', 'น็อท', 'ไม่', "He is not tired.", 'เขาไม่เหนื่อย', ''],
      ['ready', 'เร็ด-ดี้', 'พร้อม', 'Are you ready?', 'คุณพร้อมไหม', 'get ready'],
      ['tired', 'ไท-เออร์ด', 'เหนื่อย', "I'm tired today.", 'วันนี้ฉันเหนื่อย', 'very tired'],
      ['busy', 'บิ-ซี่', 'ยุ่ง ไม่ว่าง', 'Are you busy now?', 'ตอนนี้ยุ่งไหม', 'busy day'],
      ['happy', 'แฮป-ปี้', 'มีความสุข ดีใจ', 'She is happy.', 'เธอมีความสุข', ''],
      ['hungry', 'ฮัง-กรี้', 'หิว', 'Are you hungry?', 'หิวไหม', ''],
    ],
    dialog: {
      lines: [['A', 'Are you from Thailand?', 'คุณมาจากไทยไหม'], ['B', 'Yes, I am. Are you a teacher?', 'ใช่ คุณเป็นครูไหม'], ['A', "No, I'm not. I'm a student.", 'ไม่ใช่ ฉันเป็นนักเรียน'], ['B', 'Are you tired?', 'เหนื่อยไหม'], ['A', "A little. But I'm happy!", 'นิดหน่อย แต่ฉันมีความสุข']],
      qs: [
        { k: 'choose', q: 'B มาจากไหน', o: ['Thailand', 'Japan', 'ไม่ได้บอก'], a: 0 },
        { k: 'choose', q: 'A เป็นครูไหม', o: ['เป็น', 'ไม่เป็น เป็นนักเรียน', 'ไม่ได้บอก'], a: 1 },
        { k: 'choose', q: 'A รู้สึกอย่างไร', o: ['เหนื่อยนิดหน่อยแต่มีความสุข', 'หิวมาก', 'โกรธ'], a: 0 },
      ],
    },
    grammar: [
      { h: 'คำถามด้วย be: ย้าย am/is/are ไปหน้า', body: 'บอกเล่า You are ready. → คำถาม Are you ready? ไม่ต้องเติม do', ex: [['Is she a student?', 'เธอเป็นนักเรียนไหม'], ['Are they busy?', 'พวกเขายุ่งไหม']] },
      { h: 'ปฏิเสธ: be + not', body: "I am not / He is not (isn't) / They are not (aren't)", ex: [["She isn't hungry.", 'เธอไม่หิว'], ["I'm not tired.", 'ฉันไม่เหนื่อย']] },
      { h: 'คำตอบสั้น', body: "Yes, I am. / No, I'm not. · Yes, she is. / No, she isn't. — ตอบรับไม่ย่อ (Yes, I'm. ✗)", ex: [['Are you busy? — Yes, I am.', 'ยุ่งไหม — ใช่']] },
    ],
    drills: [
      { k: 'choose', q: 'She ___ a teacher. (เติมให้เป็นบอกเล่า)', o: ['is', 'are', 'am'], a: 0 },
      { k: 'type', q: 'เปลี่ยนเป็นคำถาม: You are ready.', a: ['are you ready'] },
      { k: 'type', q: 'ตอบปฏิเสธแบบสั้น: Are you a student?', a: ["no i'm not", 'no i am not'] },
      { k: 'type', q: 'แก้ให้ถูก: Do you are tired?', a: ['are you tired'] },
      { k: 'choose', q: 'คำตอบไหนถูก: "Is he busy?"', o: ["Yes, he's.", 'Yes, he is.', 'Yes, he does.'], a: 1 },
      { k: 'order', q: 'เรียงคำ: พวกเขาไม่หิว', a: ['They are not hungry', "They aren't hungry"] },
    ],
    tasks: [
      { brief: 'ถามตอบข้อมูลคน 4 คนจากบัตร', data: 'Nok: Thai, student, tired · Leo: Italy, chef, happy · Yuki: Japan, teacher, busy · Sara: Spain, doctor, hungry', qs: [
        { k: 'choose', q: 'Is Leo a chef?', o: ['Yes, he is.', "No, he isn't.", 'Yes, she is.'], a: 0 },
        { k: 'choose', q: 'Is Yuki a student?', o: ['Yes, she is.', "No, she isn't. She's a teacher.", 'Yes, I am.'], a: 1 },
        { k: 'type', q: 'ถามว่า Sara หิวไหม', a: ['is sara hungry'] },
        { k: 'type', q: 'บอกว่า Nok ไม่ได้มาจากญี่ปุ่น', a: ['nok is not from japan', "nok isn't from japan", '/^nok is(n\'t| not) from japan( she is (from thailand|thai))?$/'] },
      ] },
      { brief: 'บัตรชุดใหม่: ตอบให้ตรงข้อมูล', data: 'Max: Germany, student, ready · Ploy: Thai, nurse, busy · Ben: USA, driver, tired', qs: [
        { k: 'choose', q: 'Is Ploy busy?', o: ['Yes, she is.', "No, she isn't.", 'Yes, he is.'], a: 0 },
        { k: 'choose', q: 'Is Ben ready?', o: ['Yes, he is.', "No, he isn't. He's tired.", 'No, I am not.'], a: 1 },
        { k: 'type', q: 'ถามว่า Max เป็นนักเรียนไหม', a: ['is max a student'] },
        { k: 'type', q: 'บอกว่า Ploy ไม่ใช่ครู', a: ['ploy is not a teacher', "ploy isn't a teacher"] },
      ] },
    ],
    speak: { repeat: ['Are you ready?', 'Yes, I am.', "No, I'm not.", "She isn't tired."], prompt: 'ถามคำถาม Are you…? 2 ข้อ แล้วตอบเองทั้งใช่และไม่ใช่', model: "Are you busy? No, I'm not. Are you hungry? Yes, I am." },
    write: { prompt: 'เขียนบทถามตอบ 4 บรรทัดระหว่างคุณกับเพื่อน', model: 'A: Are you a student?\nB: No, I\'m not. I\'m a salesperson.\nA: Are you busy?\nB: Yes, I am.', check: ['คำถามขึ้นต้นด้วย Am/Is/Are', 'ไม่มี do หน้า be', 'คำตอบสั้นถูกรูป'] },
  },

  'EN-05': {
    words: [
      ['pen', 'เพ็น', 'ปากกา', 'This is a pen.', 'นี่คือปากกา', 'a red pen'],
      ['book', 'บุ๊ค', 'หนังสือ', 'These are books.', 'เหล่านี้คือหนังสือ', 'read a book'],
      ['bag', 'แบ็ก', 'กระเป๋า', 'That is my bag.', 'นั่นคือกระเป๋าของฉัน', 'school bag'],
      ['phone', 'โฟน', 'โทรศัพท์', 'This phone is new.', 'โทรศัพท์เครื่องนี้ใหม่', 'mobile phone'],
      ['umbrella', 'อัม-เบรล-ล่า', 'ร่ม', 'That is an umbrella.', 'นั่นคือร่ม', 'open an umbrella'],
      ['key', 'คีย์', 'กุญแจ', 'Those are my keys.', 'นั่นคือกุญแจของฉัน', 'car key'],
      ['watch', 'วอทช์', 'นาฬิกาข้อมือ', 'This is a watch.', 'นี่คือนาฬิกา', ''],
      ['this / that', 'ดิส / แดท', 'นี่ (ใกล้) / นั่น (ไกล)', 'This is a book. That is a bag.', 'นี่คือหนังสือ นั่นคือกระเป๋า', ''],
      ['these / those', 'ดีส / โดส', 'เหล่านี้ / เหล่านั้น', 'These are pens.', 'เหล่านี้คือปากกา', ''],
    ],
    dialog: {
      lines: [['A', 'What is this?', 'นี่คืออะไร'], ['B', "It's an umbrella.", 'มันคือร่ม'], ['A', 'And what are those?', 'แล้วนั่นคืออะไร'], ['B', 'Those are keys. And these are pens.', 'นั่นคือกุญแจ และเหล่านี้คือปากกา']],
      qs: [
        { k: 'choose', q: 'ของชิ้นแรกคืออะไร', o: ['ร่ม', 'กุญแจ', 'ปากกา'], a: 0 },
        { k: 'choose', q: '"those" หมายถึงของที่อยู่', o: ['ใกล้ หลายชิ้น', 'ไกล หลายชิ้น', 'ไกล ชิ้นเดียว'], a: 1 },
        { k: 'choose', q: 'ปากกามีกี่ด้าม', o: ['หนึ่ง', 'หลายด้าม', 'ไม่ได้บอก'], a: 1 },
      ],
    },
    grammar: [
      { h: 'a / an ดูที่ "เสียง" ตัวแรก', body: 'ขึ้นต้นด้วยเสียงสระใช้ an: an umbrella, an apple, an hour (h ไม่ออกเสียง) · นอกนั้นใช้ a: a pen, a university (เสียง "ยู")', ex: [['an umbrella', 'ร่มหนึ่งคัน'], ['a phone', 'โทรศัพท์หนึ่งเครื่อง']] },
      { h: 'หลายชิ้น เติม -s / -es', body: 'book → books · watch → watches (ลงท้าย ch/sh/s/x เติม -es) · key → keys', ex: [['two bags', 'กระเป๋าสองใบ'], ['three watches', 'นาฬิกาสามเรือน']] },
      { h: 'this / that / these / those', body: 'ใกล้: this (ชิ้นเดียว) these (หลายชิ้น) · ไกล: that / those · คู่กับ is หรือ are ให้ตรงจำนวน', ex: [['This is a pen.', 'นี่คือปากกา'], ['Those are keys.', 'นั่นคือกุญแจ (หลายดอก)']] },
    ],
    drills: [
      { k: 'choose', q: '___ umbrella', o: ['a', 'an'], a: 1 },
      { k: 'choose', q: '___ phone', o: ['a', 'an'], a: 0 },
      { k: 'type', q: 'พหูพจน์ของ watch', a: ['watches'] },
      { k: 'choose', q: '___ are my keys. (อยู่ไกล)', o: ['That', 'Those', 'This'], a: 1 },
      { k: 'order', q: 'เรียงคำ: เหล่านี้คือหนังสือ', a: ['These are books'] },
      { k: 'type', q: 'แก้ให้ถูก: This are pens.', a: ['these are pens'] },
    ],
    tasks: [
      { brief: 'อธิบายของบนโต๊ะ 6 ชิ้น', data: 'ใกล้ตัว: ปากกา 1 ด้าม, หนังสือ 3 เล่ม · ไกลตัว: ร่ม 1 คัน, กุญแจ 2 ดอก, กระเป๋า 1 ใบ, นาฬิกา 2 เรือน', qs: [
        { k: 'type', q: 'ปากกา (ใกล้)', a: ['this is a pen'] },
        { k: 'type', q: 'หนังสือ (ใกล้)', a: ['these are books'] },
        { k: 'type', q: 'ร่ม (ไกล)', a: ['that is an umbrella', "that's an umbrella"] },
        { k: 'type', q: 'กุญแจ (ไกล)', a: ['those are keys'] },
      ] },
      { brief: 'ของชุดใหม่: บอกให้ถูกจำนวน', data: 'ใกล้ตัว: โทรศัพท์ 2 เครื่อง, ร่ม 1 คัน · ไกลตัว: กระเป๋า 3 ใบ, นาฬิกา 1 เรือน', qs: [
        { k: 'type', q: 'โทรศัพท์ (ใกล้)', a: ['these are phones'] },
        { k: 'type', q: 'ร่ม (ใกล้)', a: ['this is an umbrella'] },
        { k: 'type', q: 'กระเป๋า (ไกล)', a: ['those are bags'] },
        { k: 'type', q: 'นาฬิกา (ไกล)', a: ['that is a watch', "that's a watch"] },
      ] },
    ],
    speak: { repeat: ['This is a pen.', 'That is an umbrella.', 'These are books.', 'Those are keys.'], prompt: 'มองรอบตัวแล้วบอกของ 4 อย่าง ใกล้ 2 ไกล 2', model: 'This is my phone. These are pens. That is a bag. Those are books.' },
    write: { prompt: 'เขียน 4 ประโยคบรรยายของรอบตัว (มีทั้งชิ้นเดียวและหลายชิ้น)', model: 'This is a pen. These are my keys. That is an umbrella. Those are books.', check: ['a/an ตามเสียง', 'is กับชิ้นเดียว are กับหลายชิ้น', 'เติม -s เมื่อหลายชิ้น'] },
  },

  'EN-06': {
    words: [
      ['mother', 'มา-เธอร์', 'แม่', 'This is my mother.', 'นี่คือแม่ของฉัน', ''],
      ['father', 'ฟา-เธอร์', 'พ่อ', 'His father is a doctor.', 'พ่อของเขาเป็นหมอ', ''],
      ['sister', 'ซิส-เตอร์', 'พี่สาว/น้องสาว', 'Her name is Anna.', 'เธอชื่อแอนนา', 'older sister'],
      ['brother', 'บรา-เธอร์', 'พี่ชาย/น้องชาย', 'My brother is busy.', 'พี่ชายฉันยุ่ง', 'younger brother'],
      ['friend', 'เฟรนด์', 'เพื่อน', 'Ken is my friend.', 'เคนเป็นเพื่อนฉัน', 'best friend'],
      ['his / her', 'ฮิส / เฮอร์', 'ของเขา (ชาย) / ของเธอ (หญิง)', 'Her bag is red.', 'กระเป๋าของเธอสีแดง', ''],
      ['our / their', 'อาว-เออร์ / แดร์', 'ของเรา / ของพวกเขา', 'Their house is big.', 'บ้านของพวกเขาใหญ่', ''],
      ['who', 'ฮู', 'ใคร', 'Who is she?', 'เธอคือใคร', ''],
      ['whose', 'ฮูส', 'ของใคร', 'Whose bag is this?', 'นี่กระเป๋าของใคร', ''],
    ],
    dialog: {
      lines: [['A', 'Who is she?', 'เธอคือใคร'], ['B', 'This is my sister. Her name is Anna.', 'นี่คือพี่สาวฉัน เธอชื่อแอนนา'], ['A', 'Whose phone is this?', 'นี่โทรศัพท์ของใคร'], ['B', "It's Anna's phone. My phone is in my bag.", 'มันเป็นของแอนนา โทรศัพท์ฉันอยู่ในกระเป๋า']],
      qs: [
        { k: 'choose', q: 'แอนนาเป็นอะไรกับ B', o: ['แม่', 'พี่สาว/น้องสาว', 'เพื่อน'], a: 1 },
        { k: 'choose', q: 'โทรศัพท์เป็นของใคร', o: ['ของ B', "ของแอนนา", 'ของ A'], a: 1 },
        { k: 'choose', q: '"Whose" ถามเรื่องอะไร', o: ['ชื่อ', 'เจ้าของ', 'อายุ'], a: 1 },
      ],
    },
    grammar: [
      { h: 'คำบอกเจ้าของ', body: "I → my · you → your · he → his · she → her · we → our · they → their · วางหน้าคำนามเสมอ", ex: [['my mother', 'แม่ของฉัน'], ['their car', 'รถของพวกเขา']] },
      { h: "ชื่อคน + 's", body: "Anna's phone = โทรศัพท์ของแอนนา · my father's car = รถของพ่อฉัน (ลำดับกลับกับภาษาไทย)", ex: [["Ken's bag", 'กระเป๋าของเคน']] },
      { h: 'who / whose', body: 'Who is he? ถามว่าใคร · Whose + ของ + is this? ถามว่าของใคร', ex: [['Whose keys are these?', 'กุญแจพวกนี้ของใคร']] },
    ],
    drills: [
      { k: 'choose', q: 'Anna is my sister. ___ name is Anna.', o: ['His', 'Her', 'Their'], a: 1 },
      { k: 'choose', q: 'Tom and Jo are students. ___ teacher is Mr. Lee.', o: ['Their', 'Our', 'His'], a: 0 },
      { k: 'type', q: 'เขียนเป็นอังกฤษ: กระเป๋าของเคน', a: ["ken's bag"] },
      { k: 'choose', q: '___ is he? — He is my brother.', o: ['Whose', 'Who', 'What'], a: 1 },
      { k: 'order', q: 'เรียงคำ: นี่กระเป๋าของใคร', a: ['Whose bag is this'] },
      { k: 'type', q: 'แก้ให้ถูก: This is mother my.', a: ['this is my mother'] },
    ],
    tasks: [
      { brief: 'ผังคนสมมติ 4 คน แล้วตอบเรื่องเจ้าของ', data: 'Somchai = พ่อ (รถ) · Malee = แม่ (กระเป๋า) · Ploy = น้องสาว (โทรศัพท์) · Joe = เพื่อน (กุญแจ)', qs: [
        { k: 'choose', q: 'Whose car is this?', o: ["It's Somchai's car.", "It's Malee's car.", "It's Joe's car."], a: 0 },
        { k: 'choose', q: 'Who is Ploy?', o: ['She is my mother.', 'She is my sister.', 'He is my friend.'], a: 1 },
        { k: 'type', q: 'บอกว่ากุญแจเป็นของ Joe (Those are …)', a: ["those are joe's keys", "they are joe's keys", "these are joe's keys"] },
        { k: 'type', q: 'แนะนำ Malee 1 ประโยค (This is …)', a: ['this is my mother', 'this is malee', 'this is my mother malee', "this is malee my mother"] },
      ] },
      { brief: 'ผังชุดใหม่', data: 'Lek = พี่ชาย (นาฬิกา) · Fon = เพื่อน (ร่ม) · Mr. Brown = ครู (หนังสือ)', qs: [
        { k: 'choose', q: 'Whose umbrella is this?', o: ["It's Fon's umbrella.", "It's Lek's umbrella.", "It's my umbrella."], a: 0 },
        { k: 'choose', q: 'Who is Lek?', o: ['He is my brother.', 'She is my sister.', 'He is my teacher.'], a: 0 },
        { k: 'type', q: 'บอกว่าหนังสือเป็นของ Mr. Brown (It\'s …)', a: ["it's mr brown's book", "it is mr brown's book", "it's mr. brown's book"] },
        { k: 'type', q: 'ถามว่านาฬิกาเรือนนี้ของใคร', a: ['whose watch is this'] },
      ] },
    ],
    speak: { repeat: ['This is my sister.', 'Her name is Anna.', 'Whose bag is this?', "It's Anna's bag."], prompt: 'แนะนำคนในครอบครัว 2 คน บอกชื่อและของของเขา', model: 'This is my mother. Her name is Malee. This is my father. His car is white.' },
    write: { prompt: 'เขียน 4 ประโยคแนะนำคนในครอบครัวหรือเพื่อน (ข้อมูลสมมติได้)', model: "This is my brother. His name is Lek. This is my friend Fon. Her bag is blue.", check: ['his กับผู้ชาย her กับผู้หญิง', "ใช้ 's แสดงเจ้าของ", 'my/his/her อยู่หน้าคำนาม'] },
  },

  'EN-07': {
    words: [
      ['age', 'เอจ', 'อายุ', 'What is your age?', 'คุณอายุเท่าไร', ''],
      ['years old', 'เยียร์ส โอลด์', 'อายุ … ปี', "I'm thirty years old.", 'ฉันอายุ 30 ปี', ''],
      ['number', 'นัม-เบอร์', 'หมายเลข', "What's your phone number?", 'เบอร์โทรคุณเบอร์อะไร', 'phone number'],
      ['email', 'อี-เมล', 'อีเมล', 'My email is ron@mail.com.', 'อีเมลฉันคือ ron@mail.com', 'email address'],
      ['twenty', 'ทเวน-ตี้', 'ยี่สิบ', 'twenty-five', 'ยี่สิบห้า', ''],
      ['thirteen / thirty', 'เธอร์-ทีน / เธอร์-ตี้', '13 / 30 (ระวังเสียงเน้น)', 'thirTEEN, THIRty', '', ''],
      ['hundred', 'ฮัน-เดร็ด', 'ร้อย', 'one hundred', 'หนึ่งร้อย', ''],
      ['at', 'แอท', '@ ในอีเมล', 'ron at mail dot com', 'ron@mail.com', ''],
      ['dot', 'ด็อท', 'จุด (.)', 'dot com', '.com', ''],
    ],
    dialog: {
      lines: [['A', 'How old are you?', 'คุณอายุเท่าไร'], ['B', "I'm twenty-five years old.", 'ฉันอายุ 25 ปี'], ['A', "What's your phone number?", 'เบอร์โทรคุณเบอร์อะไร'], ['B', "It's zero eight nine, four four one, two seven six zero.", 'ศูนย์แปดเก้า สี่สี่หนึ่ง สองเจ็ดหกศูนย์'], ['A', 'And your email?', 'แล้วอีเมลล่ะ'], ['B', 'nok at mail dot com.', 'nok@mail.com']],
      qs: [
        { k: 'choose', q: 'B อายุเท่าไร', o: ['15', '25', '52'], a: 1 },
        { k: 'choose', q: 'เบอร์โทรขึ้นต้นด้วย', o: ['089', '098', '081'], a: 0 },
        { k: 'choose', q: 'อีเมลคือ', o: ['nok.mail@com', 'nok@mail.com', 'mail@nok.com'], a: 1 },
      ],
    },
    grammar: [
      { h: 'ตัวเลข 11–100', body: '11 eleven · 12 twelve · 13–19 = -teen (เน้นท้าย) · 20, 30 … = -ty (เน้นหน้า) · 21 = twenty-one · 100 = one hundred', ex: [['15 fifteen / 50 fifty', 'ฟิฟ-ทีน / ฟิฟ-ตี้']] },
      { h: 'ถามอายุ', body: 'How old are you? — I\'m 30 (years old). ใช้ be ไม่ใช้ have (I have 30 ✗)', ex: [['How old is she?', 'เธออายุเท่าไร'], ['She is nineteen.', 'เธออายุ 19']] },
      { h: 'เบอร์โทรและอีเมล', body: 'เบอร์อ่านทีละตัว แบ่งเป็นกลุ่ม · @ อ่านว่า at · . อ่านว่า dot', ex: [['ann@mail.com', 'ann at mail dot com']] },
    ],
    drills: [
      { k: 'listen', say: 'thirteen', q: 'ได้ยินเลขอะไร', o: ['13', '30', '3'], a: 0 },
      { k: 'listen', say: 'fifty', q: 'ได้ยินเลขอะไร', o: ['15', '50', '55'], a: 1 },
      { k: 'type', q: 'เขียนเป็นตัวเลข: forty-two', a: ['42'] },
      { k: 'type', q: 'ถามอายุเพื่อน', a: ['how old are you'] },
      { k: 'choose', q: 'ประโยคไหนถูก', o: ['I have 30 years.', 'I am 30 years old.', 'I am 30 years.'], a: 1 },
      { k: 'order', q: 'เรียงคำ: เบอร์โทรคุณเบอร์อะไร', a: ["What's your phone number", 'What is your phone number'] },
    ],
    tasks: [
      { brief: 'ฟังข้อมูลแล้วกรอกบัตร', data: 'บัตร: ชื่อ · อายุ · เบอร์ · อีเมล', qs: [
        { k: 'listen', say: 'My name is Tara. I am thirty-four.', q: 'Tara อายุ', o: ['24', '34', '43'], a: 1 },
        { k: 'listen', say: 'My number is zero six two, five five eight, one nine zero three.', q: 'เบอร์ของ Tara', o: ['062-558-1903', '062-585-1903', '026-558-1903'], a: 0 },
        { k: 'listen', say: 'My email is tara at mail dot com.', q: 'อีเมลของ Tara', o: ['tara@mail.com', 'tara.mail@com', 'mail@tara.com'], a: 0 },
        { k: 'listen', say: 'My brother is seventeen.', q: 'น้องชายอายุ', o: ['17', '70', '7'], a: 0 },
        { k: 'type', q: 'บอกอายุตัวเองเป็นประโยค (I\'m … years old)', a: ['/^i( am|\'m) [a-z0-9 -]+( years old)?$/'] },
      ] },
      { brief: 'บัตรใบใหม่', qs: [
        { k: 'listen', say: 'I am Ben. I am sixty.', q: 'Ben อายุ', o: ['16', '60', '66'], a: 1 },
        { k: 'listen', say: 'Call me at zero nine one, two two four, seven seven eight zero.', q: 'เบอร์ของ Ben', o: ['091-224-7780', '091-242-7780', '019-224-7780'], a: 0 },
        { k: 'listen', say: 'Email me at ben at work dot com.', q: 'อีเมลของ Ben', o: ['ben@work.com', 'work@ben.com', 'ben.work@com'], a: 0 },
        { k: 'listen', say: 'My son is eleven.', q: 'ลูกชายอายุ', o: ['7', '11', '12'], a: 1 },
        { k: 'type', q: 'ถามเบอร์โทรของ Ben', a: ["what's your phone number", 'what is your phone number', "what's your number", 'what is your number'] },
      ] },
    ],
    speak: { repeat: ['How old are you?', "I'm twenty-five years old.", 'thirteen, thirty', 'fifteen, fifty', 'ann at mail dot com'], prompt: 'บอกอายุ เบอร์โทรสมมติ และอีเมลสมมติ', model: "I'm thirty years old. My number is zero eight one, two three four, five six seven eight. My email is ron at mail dot com." },
    write: { prompt: 'กรอกบัตรข้อมูลสมมติเป็นประโยค 3 ประโยค (อายุ เบอร์ อีเมล)', model: "I am 30 years old. My phone number is 081-234-5678. My email is ron@mail.com.", check: ['ใช้ am กับอายุ', 'มี years old หรือแค่ตัวเลข', 'อีเมลมี @ และ .'] },
  },

  'EN-08': {
    check: true,
    words: [
      ["what's your name", 'วอทส์ ยัวร์ เนม', 'คุณชื่ออะไร', "What's your name?", 'คุณชื่ออะไร', ''],
      ['where are you from', 'แวร์ อาร์ ยู ฟรอม', 'คุณมาจากไหน', 'Where are you from?', 'คุณมาจากไหน', ''],
      ['what do you do', 'วอท ดู ยู ดู', 'คุณทำงานอะไร (วลี)', 'What do you do?', 'คุณทำงานอะไร', ''],
      ['see you', 'ซี ยู', 'แล้วเจอกัน', 'See you tomorrow!', 'เจอกันพรุ่งนี้', 'see you later'],
    ],
    dialog: {
      lines: [['A', "Hi! I'm Ken. What's your name?", 'หวัดดี ผมเคน คุณชื่ออะไร'], ['B', "I'm Dao. D-A-O.", 'ฉันชื่อดาว ดี-เอ-โอ'], ['A', 'Where are you from, Dao?', 'มาจากไหนครับ'], ['B', "I'm from Chiang Mai. I'm a nurse. And you?", 'มาจากเชียงใหม่ เป็นพยาบาล แล้วคุณล่ะ'], ['A', "I'm from Japan. I'm thirty-one. This is my friend, Sam.", 'ผมมาจากญี่ปุ่น อายุ 31 นี่คือแซมเพื่อนผม'], ['B', 'Nice to meet you, Sam! See you!', 'ยินดีที่ได้รู้จักนะแซม แล้วเจอกัน']],
      qs: [
        { k: 'choose', q: 'ดาวมาจากไหน', o: ['Bangkok', 'Chiang Mai', 'Japan'], a: 1 },
        { k: 'choose', q: 'ดาวทำงานอะไร', o: ['teacher', 'nurse', 'student'], a: 1 },
        { k: 'choose', q: 'เคนอายุเท่าไร', o: ['13', '30', '31'], a: 2 },
        { k: 'choose', q: 'Sam เป็นใคร', o: ['พี่ชายเคน', 'เพื่อนเคน', 'ครูของดาว'], a: 1 },
      ],
    },
    grammar: [
      { h: 'ทบทวนช่วง 1', body: "ทักทาย (Hello / Nice to meet you) · สะกดชื่อ · am/is/are · คำถามและปฏิเสธด้วย be · a/an และพหูพจน์ · my/his/her + 's · ตัวเลข อายุ และข้อมูลติดต่อ", ex: [["What's your name? — I'm Dao.", ''], ['Where are you from? — I\'m from Thailand.', '']] },
      { h: 'เสียงท้ายคำและจังหวะคำถาม', body: 'ออกเสียงท้ายให้มี (book, bag, cat) ไม่เติมสระ "ซึ" ท้ายคำ · คำถาม Yes/No เสียงขึ้นท้าย (Are you ready↗) คำถาม What/Where เสียงลงท้าย (Where are you from↘)', ex: [['Are you a student? ↗', ''], ['What\'s your name? ↘', '']] },
    ],
    drills: [
      { k: 'type', q: 'ถามชื่อ', a: ["what's your name", 'what is your name'] },
      { k: 'type', q: 'ถามว่ามาจากไหน', a: ['where are you from'] },
      { k: 'choose', q: 'He ___ from Korea.', o: ['am', 'is', 'are'], a: 1 },
      { k: 'choose', q: '___ apple', o: ['a', 'an'], a: 1 },
      { k: 'type', q: 'แปล: นี่คือโทรศัพท์ของพี่สาวฉัน', a: ["this is my sister's phone"] },
      { k: 'listen', say: 'forty', q: 'ได้ยินเลขอะไร', o: ['14', '40', '44'], a: 1 },
      { k: 'type', q: 'ตอบปฏิเสธสั้น: Is she tired?', a: ["no she isn't", 'no she is not'] },
    ],
    tasks: [
      { brief: 'จุดตรวจ: ฟังข้อมูลคนใหม่ แล้วแนะนำตัวและเขียนประวัติ', data: 'คนใหม่: Mina', qs: [
        { k: 'listen', say: 'Hello! My name is Mina. M-I-N-A. I am from Korea.', q: 'Mina มาจากไหน', o: ['Japan', 'Korea', 'China'], a: 1 },
        { k: 'listen', say: 'I am a designer. I am twenty-eight years old.', q: 'Mina อายุเท่าไร', o: ['28', '18', '82'], a: 0 },
        { k: 'listen', say: 'This is my brother. His name is Jun. He is a student.', q: 'Jun เป็นอะไร', o: ['designer', 'student', 'teacher'], a: 1 },
        { k: 'type', q: 'ถาม Mina ว่าเธอเป็นนักเรียนไหม', a: ['are you a student'] },
        { k: 'type', q: 'บอก Mina ว่ายินดีที่ได้รู้จัก', a: ['nice to meet you', 'nice to meet you mina', 'nice to meet you too'] },
      ] },
      { brief: 'จุดตรวจ ชุดใหม่: Paolo', qs: [
        { k: 'listen', say: 'Hi, I am Paolo. P-A-O-L-O. I am from Italy.', q: 'Paolo มาจากไหน', o: ['Spain', 'Italy', 'Brazil'], a: 1 },
        { k: 'listen', say: 'I am a cook. I am forty.', q: 'Paolo อายุเท่าไร', o: ['14', '40', '44'], a: 1 },
        { k: 'listen', say: 'These are my keys, and that is my bag.', q: 'อะไรอยู่ไกล', o: ['keys', 'bag', 'phone'], a: 1 },
        { k: 'type', q: 'ถาม Paolo ว่าอายุเท่าไร', a: ['how old are you'] },
        { k: 'type', q: 'ขอให้ Paolo พูดอีกครั้ง', a: ['sorry', '/(could|can) you say (that|it) again/', 'again please', 'say that again please'] },
      ] },
    ],
    speak: { repeat: ["Hi! I'm Ken.", "What's your name?", 'Where are you from?', 'Nice to meet you!'], prompt: 'พูดแนะนำตัว 60–90 วินาที: ชื่อ สะกดชื่อ มาจากไหน อายุ อาชีพ และแนะนำคนในครอบครัว 1 คน', model: "Hello! My name is Ron. R-O-N. I'm from Thailand. I'm thirty years old. I work at a car dealership. This is my sister. Her name is Ploy. She is a nurse. Nice to meet you!" },
    write: { prompt: 'เขียนประวัติสั้น 4 ประโยค (ชื่อ ประเทศ อายุ อาชีพ/คนในครอบครัว)', model: 'My name is Ron. I am from Thailand. I am 30 years old. My sister is a nurse.', check: ['ทุกประโยคมีประธานและกริยา', 'am/is/are ถูกคน', 'ตัวใหญ่ขึ้นต้นประโยคและชื่อ', 'มีข้อมูลครบ 4 อย่าง'] },
  },
}
void L
