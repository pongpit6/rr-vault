/* Monster farming: 8 maps × 10 monsters (8 normal, 1 elite, 1 boss). Each monster drops its own trophy
 * (sell-only) and may drop shared materials (craft or sell). Art: public/sprites/mon_<id>.png (64×64). */

// [id, name, trophy, art prompt]
const M = (rows) => rows.map(([id, name, trophy, art]) => ({ id, name, trophy, art }))
export const MAPS = [
  { id: 'meadow', name: 'ทุ่งหญ้าลมเย็น', emoji: '🌾', tier: 1, unlock: { level: 1 }, mats: ['herb', 'wood', 'fiber'], mons: M([
    ['slime_g', 'สไลม์ใบไม้', 'เมือกใบไม้', 'green leaf slime'], ['rabbit', 'กระต่ายเขาเดียว', 'เขากระต่าย', 'horned rabbit'], ['mushroom', 'เห็ดเดินได้', 'หมวกเห็ด', 'walking red mushroom'],
    ['bee', 'ผึ้งยักษ์', 'เหล็กในผึ้ง', 'giant bee'], ['boar', 'หมูป่าดุ', 'เขี้ยวหมูป่า', 'wild boar'], ['crow', 'อีกาขโมยเหรียญ', 'ขนอีกา', 'crow holding a coin'],
    ['sprout', 'ต้นกล้าซน', 'ใบกล้าวิเศษ', 'angry walking sprout plant'], ['snail', 'หอยทากเปลือกทอง', 'เปลือกหอยทอง', 'snail with golden shell'],
    ['scarecrow', 'หุ่นไล่กาคืนชีพ', 'หมวกฟาง', 'living scarecrow (elite)'], ['king_slime', 'ราชาสไลม์', 'มงกุฎเยลลี่', 'big king slime with crown (boss)'],
  ]) },
  { id: 'forest', name: 'ป่าลึกเงาไม้', emoji: '🌲', tier: 2, unlock: { level: 5 }, mats: ['wood', 'herb', 'hide', 'fruit'], mons: M([
    ['wolf', 'หมาป่าเทา', 'ขนหมาป่า', 'grey wolf'], ['spider', 'แมงมุมป่า', 'ใยแมงมุม', 'forest spider'], ['treant', 'ตอไม้มีชีวิต', 'แก่นไม้', 'small living tree stump'],
    ['owlbear', 'นกฮูกหมี', 'กรงเล็บนกฮูก', 'owlbear cub'], ['goblin', 'ก็อบลินนักขโมย', 'ถุงของโจร', 'goblin thief'], ['fox_fire', 'จิ้งจอกไฟผี', 'หางไฟ', 'ghost fire fox'],
    ['beetle', 'ด้วงเขาเหล็ก', 'เปลือกด้วง', 'iron horn beetle'], ['bat', 'ค้างคาวป่า', 'ปีกค้างคาว', 'forest bat'],
    ['bandit', 'หัวหน้าโจรป่า', 'ผ้าคาดหัวโจร', 'forest bandit leader (elite)'], ['ent', 'พฤกษาโบราณ', 'เมล็ดพันปี', 'ancient tree ent (boss)'],
  ]) },
  { id: 'mine', name: 'ถ้ำเหมืองร้าง', emoji: '⛏️', tier: 3, unlock: { level: 10 }, mats: ['stone', 'iron', 'crystal'], mons: M([
    ['mole', 'ตุ่นนักขุด', 'เล็บตุ่น', 'mole with helmet lamp'], ['rockling', 'ก้อนหินน้อย', 'เศษหินแกร่ง', 'small rock creature'], ['cave_bat', 'ค้างคาวถ้ำ', 'เขี้ยวค้างคาว', 'cave bat'],
    ['skeleton', 'โครงกระดูกคนงาน', 'หมวกคนงาน', 'skeleton miner'], ['gem_crab', 'ปูอัญมณี', 'ก้ามอัญมณี', 'crab with gem shell'], ['worm', 'หนอนยักษ์', 'เกล็ดหนอน', 'giant cave worm'],
    ['kobold', 'โคโบลด์', 'ตะเกียงโคโบลด์', 'kobold with pickaxe'], ['ooze', 'เมือกแร่', 'หยดแร่เหลว', 'metal ooze'],
    ['iron_golem', 'โกเลมเหล็ก', 'แกนเหล็ก', 'iron golem (elite)'], ['crystal_wyrm', 'งูคริสตัล', 'เขี้ยวคริสตัล', 'crystal serpent (boss)'],
  ]) },
  { id: 'swamp', name: 'หนองน้ำหมอกม่วง', emoji: '🐸', tier: 4, unlock: { realm: 2 }, mats: ['herb', 'hide', 'ink'], mons: M([
    ['frog', 'กบพิษ', 'ถุงพิษกบ', 'poison frog'], ['leech', 'ปลิงยักษ์', 'น้ำลายปลิง', 'giant leech'], ['croc', 'จระเข้หนอง', 'ฟันจระเข้', 'swamp crocodile'],
    ['wisp', 'วิญญาณหิ่งห้อย', 'แสงหิ่งห้อย', 'will-o-wisp'], ['lizard', 'มนุษย์กิ้งก่า', 'เกล็ดกิ้งก่า', 'lizardman'], ['mosquito', 'ยุงยักษ์', 'ปีกยุง', 'giant mosquito'],
    ['hag', 'แม่มดหนอง', 'ไม้กวาดเก่า', 'swamp witch'], ['toad_king', 'คางคกยักษ์', 'หูดคางคก', 'big toad'],
    ['hydra_jr', 'ไฮดราน้อย', 'หัวไฮดรา', 'young hydra (elite)'], ['bog_lord', 'เจ้าแห่งหนอง', 'มงกุฎตะไคร่', 'bog lord monster (boss)'],
  ]) },
  { id: 'desert', name: 'ทะเลทรายทองคำ', emoji: '🏜️', tier: 5, unlock: { level: 20 }, mats: ['stone', 'cloth', 'dye'], mons: M([
    ['scorpion', 'แมงป่องทราย', 'หางแมงป่อง', 'sand scorpion'], ['mummy', 'มัมมี่', 'ผ้าพันมัมมี่', 'mummy'], ['cactus', 'กระบองเพชรนักสู้', 'หนามกระบองเพชร', 'fighting cactus'],
    ['vulture', 'แร้งทะเลทราย', 'ขนแร้ง', 'desert vulture'], ['sandworm', 'หนอนทราย', 'ฟันหนอนทราย', 'sandworm'], ['djinn', 'จินนี่น้อย', 'ตะเกียงเก่า', 'small djinn'],
    ['jackal', 'หมาจิ้งจอกทอง', 'สร้อยหมาจิ้งจอก', 'golden jackal warrior'], ['beetle_s', 'ด้วงสการับ', 'ด้วงทอง', 'scarab beetle'],
    ['pharaoh', 'ฟาโรห์คืนชีพ', 'คทาฟาโรห์', 'undead pharaoh (elite)'], ['sphinx', 'สฟิงซ์', 'ขนแผงสฟิงซ์', 'sphinx (boss)'],
  ]) },
  { id: 'snow', name: 'ภูเขาหิมะนิรันดร์', emoji: '🏔️', tier: 6, unlock: { realm: 3 }, mats: ['crystal', 'hide', 'feather'], mons: M([
    ['yeti_jr', 'เยติน้อย', 'ขนเยติ', 'young yeti'], ['ice_slime', 'สไลม์น้ำแข็ง', 'ก้อนน้ำแข็ง', 'ice slime'], ['penguin', 'เพนกวินนักรบ', 'หมวกเพนกวิน', 'warrior penguin'],
    ['snow_wolf', 'หมาป่าหิมะ', 'เขี้ยวน้ำแข็ง', 'white snow wolf'], ['frost_bird', 'นกน้ำแข็ง', 'ขนนกน้ำแข็ง', 'frost bird'], ['snowman', 'มนุษย์หิมะ', 'จมูกแครอท', 'evil snowman'],
    ['ice_imp', 'ภูตน้ำแข็ง', 'เขาภูต', 'ice imp'], ['mammoth', 'แมมมอธน้อย', 'งาแมมมอธ', 'baby mammoth'],
    ['frost_knight', 'อัศวินน้ำแข็ง', 'โล่น้ำแข็ง', 'frost knight (elite)'], ['ice_dragon', 'มังกรน้ำแข็ง', 'เกล็ดน้ำแข็งนิรันดร์', 'ice dragon (boss)'],
  ]) },
  { id: 'volcano', name: 'ภูเขาไฟเพลิงกาฬ', emoji: '🌋', tier: 7, unlock: { level: 30 }, mats: ['iron', 'crystal', 'ink'], mons: M([
    ['lava_slime', 'สไลม์ลาวา', 'หยดลาวา', 'lava slime'], ['salamander', 'ซาลาแมนเดอร์', 'หางไฟ', 'fire salamander'], ['imp', 'อิมป์ไฟ', 'ส้อมอิมป์', 'fire imp'],
    ['magma_golem', 'โกเลมแมกมา', 'หินแมกมา', 'magma golem'], ['fire_bat', 'ค้างคาวไฟ', 'ปีกไฟ', 'fire bat'], ['hellhound', 'หมานรก', 'ปลอกคอเพลิง', 'hellhound'],
    ['ember', 'วิญญาณถ่านไฟ', 'ถ่านนิรันดร์', 'ember spirit'], ['fire_crab', 'ปูภูเขาไฟ', 'ก้ามไฟ', 'volcano crab'],
    ['efreet', 'เอฟรีท', 'แหวนเพลิง', 'efreet fire genie (elite)'], ['red_dragon', 'มังกรเพลิง', 'หัวใจมังกร', 'great red dragon (boss)'],
  ]) },
  { id: 'shadow', name: 'ปราสาทเงา', emoji: '🏰', tier: 8, unlock: { level: 40 }, mats: ['ink', 'crystal', 'cloth', 'dye'], mons: M([
    ['ghost', 'วิญญาณเร่ร่อน', 'ผ้าคลุมวิญญาณ', 'wandering ghost'], ['gargoyle', 'การ์กอยล์', 'ปีกหิน', 'gargoyle'], ['vampire_bat', 'ค้างคาวแวมไพร์', 'เขี้ยวแวมไพร์', 'vampire bat'],
    ['armor', 'ชุดเกราะผีสิง', 'หมวกเกราะผี', 'haunted armor'], ['shadow_cat', 'แมวเงา', 'ตาแมวเงา', 'shadow cat'], ['book_mimic', 'หนังสือมิมิค', 'หน้ากระดาษต้องสาป', 'book mimic monster'],
    ['chest_mimic', 'หีบมิมิค', 'ฟันมิมิค', 'treasure chest mimic'], ['wraith', 'เรธ', 'โซ่วิญญาณ', 'wraith'],
    ['death_knight', 'อัศวินมรณะ', 'ดาบมรณะ', 'death knight (elite)'], ['shadow_lord', 'เจ้าแห่งเงา', 'มงกุฎเงา', 'shadow lord demon king (boss)'],
  ]) },
]
MAPS.forEach((m) => m.mons.forEach((x, i) => { x.map = m.id; x.kind = i === 9 ? 'boss' : i === 8 ? 'elite' : 'normal' }))
export const MON_BY_ID = Object.fromEntries(MAPS.flatMap((m) => m.mons.map((x) => [x.id, x])))
export const MAP_BY_ID = Object.fromEntries(MAPS.map((m) => [m.id, m]))

/** shared materials: every one has a use at the workshop, and can be sold */
export const MATS = {
  herb: { name: 'สมุนไพร', price: 2, use: 'ปรุงยาฟื้นพลัง · อาหารสัตว์' },
  fruit: { name: 'ผลไม้ป่า', price: 2, use: 'อาหารสัตว์' },
  wood: { name: 'ไม้', price: 3, use: 'ชุดวัสดุก่อสร้าง · ของตกแต่ง' },
  fiber: { name: 'ใยพืช', price: 2, use: 'ด้าย (ย้อมชุด)' },
  stone: { name: 'หิน', price: 3, use: 'ชุดวัสดุก่อสร้าง · ของตกแต่ง' },
  iron: { name: 'แร่เหล็ก', price: 5, use: 'ชุดวัสดุก่อสร้าง' },
  crystal: { name: 'คริสตัล', price: 9, use: 'ของตกแต่งพิเศษ · ยาชั้นสูง' },
  hide: { name: 'หนังสัตว์', price: 4, use: 'ของตกแต่ง' },
  feather: { name: 'ขนนก', price: 4, use: 'ของตกแต่ง' },
  cloth: { name: 'ผ้า', price: 4, use: 'ของตกแต่ง · ย้อมชุด' },
  dye: { name: 'สีย้อม', price: 5, use: 'ย้อมสีชุด' },
  ink: { name: 'หมึกเวท', price: 7, use: 'อัปสกิลขั้นสูง' },
  page: { name: 'หน้าคัมภีร์', price: 15, use: 'อัปสกิลขั้นสูง (ได้จากหีบวินัยและบอส)', rare: true },
  star: { name: 'ดาวแห่งวินัย', price: 40, use: 'สกิลขั้นสูงสุด · ของตกแต่งตำนาน (ได้จากหีบวินัยเท่านั้น)', rare: true },
}

/** trophy sell price (FIAT): grows with the map; elites ×2.5, bosses ×6 */
export const trophyPrice = (mon) => { const t = MAP_BY_ID[mon.map].tier; const base = 3 + t; return Math.round(base * (mon.kind === 'boss' ? 6 : mon.kind === 'elite' ? 2.5 : 1)) }
/** monster power (party needs about this much to win reliably) */
export const monPower = (mon) => { const t = MAP_BY_ID[mon.map].tier; return Math.round((12 + t * t * 9) * (mon.kind === 'boss' ? 2.2 : mon.kind === 'elite' ? 1.5 : 1)) }
export const BOSS_AFTER = 30 // kills in a map before its boss shows up
