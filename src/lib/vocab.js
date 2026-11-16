/**
 * Everyday English → Thai, grouped in levels (1 = most common). Format per line: word|pos|meaning.
 * pos: n noun · v verb · adj adjective · adv adverb · ph phrase. Kept small and practical on purpose;
 * the user can add their own words, and other languages can be added later as separate lists.
 */
const RAW = {
  1: `
time|n|เวลา
day|n|วัน
week|n|สัปดาห์
month|n|เดือน
year|n|ปี
today|adv|วันนี้
tomorrow|adv|พรุ่งนี้
yesterday|adv|เมื่อวาน
morning|n|ตอนเช้า
afternoon|n|ตอนบ่าย
evening|n|ตอนเย็น
night|n|กลางคืน
people|n|ผู้คน
friend|n|เพื่อน
family|n|ครอบครัว
mother|n|แม่
father|n|พ่อ
child|n|เด็ก
wife|n|ภรรยา
husband|n|สามี
house|n|บ้าน
room|n|ห้อง
door|n|ประตู
window|n|หน้าต่าง
table|n|โต๊ะ
chair|n|เก้าอี้
bed|n|เตียง
kitchen|n|ห้องครัว
bathroom|n|ห้องน้ำ
water|n|น้ำ
food|n|อาหาร
rice|n|ข้าว
bread|n|ขนมปัง
egg|n|ไข่
meat|n|เนื้อสัตว์
chicken|n|ไก่
fish|n|ปลา
fruit|n|ผลไม้
vegetable|n|ผัก
coffee|n|กาแฟ
tea|n|ชา
milk|n|นม
sugar|n|น้ำตาล
salt|n|เกลือ
money|n|เงิน
price|n|ราคา
shop|n|ร้านค้า
market|n|ตลาด
bank|n|ธนาคาร
car|n|รถยนต์
bus|n|รถเมล์
road|n|ถนน
city|n|เมือง
country|n|ประเทศ
school|n|โรงเรียน
work|n|งาน
office|n|สำนักงาน
book|n|หนังสือ
phone|n|โทรศัพท์
name|n|ชื่อ
go|v|ไป
come|v|มา
eat|v|กิน
drink|v|ดื่ม
sleep|v|นอนหลับ
wake up|v|ตื่นนอน
sit|v|นั่ง
stand|v|ยืน
walk|v|เดิน
run|v|วิ่ง
see|v|เห็น
look|v|มอง
watch|v|ดู (ตั้งใจดู)
hear|v|ได้ยิน
listen|v|ฟัง
speak|v|พูด
say|v|กล่าว, บอก
talk|v|คุย
read|v|อ่าน
write|v|เขียน
buy|v|ซื้อ
sell|v|ขาย
pay|v|จ่าย
give|v|ให้
take|v|เอา, หยิบ
make|v|ทำ, สร้าง
do|v|ทำ
know|v|รู้
think|v|คิด
want|v|ต้องการ
need|v|จำเป็นต้อง
like|v|ชอบ
love|v|รัก
help|v|ช่วย
open|v|เปิด
close|v|ปิด
start|v|เริ่ม
finish|v|ทำเสร็จ
wait|v|รอ
find|v|หาเจอ
use|v|ใช้
good|adj|ดี
bad|adj|แย่
big|adj|ใหญ่
small|adj|เล็ก
hot|adj|ร้อน
cold|adj|หนาว, เย็น
new|adj|ใหม่
old|adj|เก่า, แก่
happy|adj|มีความสุข
sad|adj|เศร้า
tired|adj|เหนื่อย
hungry|adj|หิว
easy|adj|ง่าย
difficult|adj|ยาก
cheap|adj|ถูก (ราคา)
expensive|adj|แพง
fast|adj|เร็ว
slow|adj|ช้า
early|adj|เช้า, ก่อนเวลา
late|adj|สาย, ช้า
beautiful|adj|สวย
clean|adj|สะอาด
dirty|adj|สกปรก
busy|adj|ยุ่ง
free|adj|ว่าง, ฟรี
always|adv|เสมอ
often|adv|บ่อย
sometimes|adv|บางครั้ง
never|adv|ไม่เคย
now|adv|ตอนนี้
here|adv|ที่นี่
there|adv|ที่นั่น
`,
  2: `
weather|n|สภาพอากาศ
rain|n|ฝน
sun|n|ดวงอาทิตย์
wind|n|ลม
health|n|สุขภาพ
body|n|ร่างกาย
head|n|ศีรษะ
hand|n|มือ
leg|n|ขา
heart|n|หัวใจ
doctor|n|แพทย์
hospital|n|โรงพยาบาล
medicine|n|ยา
exercise|n|การออกกำลังกาย
habit|n|นิสัย
goal|n|เป้าหมาย
plan|n|แผน
problem|n|ปัญหา
idea|n|ความคิด
question|n|คำถาม
answer|n|คำตอบ
job|n|งาน, อาชีพ
salary|n|เงินเดือน
bill|n|ใบแจ้งหนี้
receipt|n|ใบเสร็จ
saving|n|เงินออม
debt|n|หนี้
budget|n|งบประมาณ
tax|n|ภาษี
meeting|n|การประชุม
holiday|n|วันหยุด
trip|n|การเดินทาง
ticket|n|ตั๋ว
hotel|n|โรงแรม
airport|n|สนามบิน
station|n|สถานี
map|n|แผนที่
direction|n|ทิศทาง
clothes|n|เสื้อผ้า
shoes|n|รองเท้า
key|n|กุญแจ
bag|n|กระเป๋า
gift|n|ของขวัญ
breakfast|n|อาหารเช้า
lunch|n|อาหารกลางวัน
dinner|n|อาหารเย็น
dessert|n|ของหวาน
neighbor|n|เพื่อนบ้าน
customer|n|ลูกค้า
boss|n|หัวหน้า
borrow|v|ยืม
lend|v|ให้ยืม
save|v|ประหยัด, เก็บออม
spend|v|ใช้จ่าย
earn|v|หาเงินได้
cost|v|มีราคา
change|v|เปลี่ยน
choose|v|เลือก
decide|v|ตัดสินใจ
remember|v|จำได้
forget|v|ลืม
learn|v|เรียนรู้
teach|v|สอน
try|v|พยายาม, ลอง
practice|v|ฝึกฝน
improve|v|พัฒนา, ปรับปรุง
cook|v|ทำอาหาร
wash|v|ล้าง
carry|v|ถือ, แบก
bring|v|นำมา
send|v|ส่ง
receive|v|ได้รับ
call|v|โทร, เรียก
meet|v|พบ
travel|v|เดินทาง
arrive|v|มาถึง
leave|v|ออกจาก
return|v|กลับ, คืน
follow|v|ตาม
explain|v|อธิบาย
agree|v|เห็นด้วย
believe|v|เชื่อ
hope|v|หวัง
worry|v|กังวล
relax|v|ผ่อนคลาย
enjoy|v|สนุกกับ
important|adj|สำคัญ
different|adj|แตกต่าง
same|adj|เหมือนกัน
ready|adj|พร้อม
sure|adj|แน่ใจ
healthy|adj|สุขภาพดี
strong|adj|แข็งแรง
weak|adj|อ่อนแอ
quiet|adj|เงียบ
noisy|adj|เสียงดัง
safe|adj|ปลอดภัย
dangerous|adj|อันตราย
correct|adj|ถูกต้อง
wrong|adj|ผิด
full|adj|เต็ม, อิ่ม
empty|adj|ว่างเปล่า
careful|adj|ระมัดระวัง
polite|adj|สุภาพ
honest|adj|ซื่อสัตย์
usually|adv|โดยปกติ
already|adv|แล้ว (เรียบร้อย)
still|adv|ยังคง
soon|adv|เร็วๆ นี้
almost|adv|เกือบ
together|adv|ด้วยกัน
`,
  3: `
appointment|n|การนัดหมาย
schedule|n|ตารางเวลา
deadline|n|กำหนดส่ง
experience|n|ประสบการณ์
opportunity|n|โอกาส
decision|n|การตัดสินใจ
reason|n|เหตุผล
result|n|ผลลัพธ์
effort|n|ความพยายาม
progress|n|ความก้าวหน้า
success|n|ความสำเร็จ
mistake|n|ความผิดพลาด
advice|n|คำแนะนำ
information|n|ข้อมูล
knowledge|n|ความรู้
skill|n|ทักษะ
attention|n|ความสนใจ
patience|n|ความอดทน
energy|n|พลังงาน
stress|n|ความเครียด
emotion|n|อารมณ์
discount|n|ส่วนลด
income|n|รายได้
expense|n|ค่าใช้จ่าย
interest|n|ดอกเบี้ย, ความสนใจ
investment|n|การลงทุน
profit|n|กำไร
loss|n|ขาดทุน
insurance|n|ประกัน
contract|n|สัญญา
account|n|บัญชี
balance|n|ยอดคงเหลือ, สมดุล
amount|n|จำนวน
environment|n|สิ่งแวดล้อม
community|n|ชุมชน
government|n|รัฐบาล
news|n|ข่าว
traffic|n|การจราจร
delivery|n|การจัดส่ง
complain|v|บ่น, ร้องเรียน
compare|v|เปรียบเทียบ
prepare|v|เตรียม
manage|v|จัดการ
organize|v|จัดระเบียบ
recommend|v|แนะนำ
suggest|v|เสนอแนะ
require|v|ต้องการ, กำหนด
include|v|รวมถึง
increase|v|เพิ่มขึ้น
decrease|v|ลดลง
reduce|v|ลด
avoid|v|หลีกเลี่ยง
afford|v|มีเงินพอจ่าย
achieve|v|บรรลุ
develop|v|พัฒนา
continue|v|ทำต่อไป
consider|v|พิจารณา
describe|v|บรรยาย
discuss|v|อภิปราย, หารือ
apologize|v|ขอโทษ
appreciate|v|ซาบซึ้ง, ขอบคุณ
deserve|v|สมควรได้รับ
focus|v|โฟกัส, จดจ่อ
breathe|v|หายใจ
recover|v|ฟื้นตัว
encourage|v|ให้กำลังใจ
available|adj|ว่าง, มีให้ใช้
necessary|adj|จำเป็น
possible|adj|เป็นไปได้
comfortable|adj|สบาย
convenient|adj|สะดวก
familiar|adj|คุ้นเคย
responsible|adj|รับผิดชอบ
confident|adj|มั่นใจ
patient|adj|อดทน
grateful|adj|รู้สึกขอบคุณ
anxious|adj|วิตกกังวล
calm|adj|สงบ
serious|adj|จริงจัง
simple|adj|เรียบง่าย
useful|adj|มีประโยชน์
valuable|adj|มีค่า
regular|adj|สม่ำเสมอ
daily|adj|ประจำวัน
recently|adv|เมื่อเร็วๆ นี้
finally|adv|ในที่สุด
especially|adv|โดยเฉพาะ
probably|adv|น่าจะ
immediately|adv|ทันที
gradually|adv|ทีละน้อย
instead|adv|แทนที่จะ
anyway|adv|อย่างไรก็ตาม
`,
  4: `
on time|ph|ตรงเวลา
in advance|ph|ล่วงหน้า
at least|ph|อย่างน้อย
as soon as possible|ph|เร็วที่สุดเท่าที่จะทำได้
by the way|ph|อีกอย่างหนึ่ง
make sure|ph|ทำให้แน่ใจ
take care|ph|ดูแลตัวเอง
look forward to|ph|ตั้งตารอ
give up|ph|ยอมแพ้
find out|ph|ค้นพบ, หาข้อมูล
figure out|ph|คิดออก
set up|ph|ตั้งค่า, จัดตั้ง
work out|ph|ออกกำลังกาย, คิดหาทางออก
pick up|ph|รับ, หยิบขึ้นมา
run out of|ph|หมด (ของใช้)
get used to|ph|ชินกับ
keep in touch|ph|ติดต่อกันไว้
on purpose|ph|โดยตั้งใจ
in the long run|ph|ในระยะยาว
save up|ph|เก็บเงินไว้
cut down on|ph|ลดปริมาณ
pay off|ph|จ่ายหมด, ได้ผลคุ้มค่า
show up|ph|มาปรากฏตัว
put off|ph|เลื่อนออกไป
catch up|ph|ตามให้ทัน
`,
}
const POS = { n: 'n', v: 'v', adj: 'adj', adv: 'adv', ph: 'ph' }
export const POS_TH = { n: 'คำนาม', v: 'คำกริยา', adj: 'คำคุณศัพท์', adv: 'คำกริยาวิเศษณ์', ph: 'วลี' }
export const VOCAB = Object.entries(RAW).flatMap(([lv, txt]) => txt.trim().split('\n').map((line) => {
  const [en, pos, th] = line.split('|')
  return { id: `en:${en}`, en, pos: POS[pos] || 'n', th, lv: +lv, lang: 'en' }
}))
export const VOCAB_LEVELS = { 1: 'พื้นฐาน', 2: 'ชีวิตประจำวัน', 3: 'ใช้งานจริง', 4: 'วลีที่ใช้บ่อย' }
