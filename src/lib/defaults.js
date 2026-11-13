// Deterministic IDs so the same defaults created on two devices merge instead of duplicating.
export const ACCOUNT_TYPES = {
  cash: { label: 'เงินใช้ได้', short: 'ใช้ได้', icon: 'wallet', color: '#10b981', asset: true, desc: 'เงินในบัญชีที่ใช้จ่ายได้จริง' },
  invest: { label: 'เงินลงทุน', short: 'ลงทุน', icon: 'trending', color: '#38bdf8', asset: true, desc: 'เงินสดที่แยกไว้รอลงทุน' },
  reserve: { label: 'กันชำระหนี้', short: 'กันหนี้', icon: 'shield', color: '#a78bfa', asset: true, desc: 'เงินที่กันไว้จ่ายหนี้ ห้ามแตะ' },
  saving: { label: 'เงินออม/เป้าหมาย', short: 'ออม', icon: 'piggy', color: '#14b8a6', asset: true, desc: 'เงินเก็บสำหรับเป้าหมาย' },
  credit: { label: 'บัตรเครดิต', short: 'บัตร', icon: 'card', color: '#fb7185', asset: false, desc: 'ยอดค้างชำระบัตรเครดิต' },
  loan: { label: 'เงินกู้/ผ่อนชำระ', short: 'เงินกู้', icon: 'bank', color: '#f97316', asset: false, desc: 'สินเชื่อที่ผ่อนเป็นงวด' },
}
export const isDebt = (a) => a && (a.type === 'credit' || a.type === 'loan')

export const DEFAULT_ACCOUNTS = [
  { id: 'acc-cash', name: 'บัญชีใช้จ่าย', type: 'cash', icon: 'wallet', color: '#10b981', opening: 0, order: 1 },
  { id: 'acc-invest', name: 'เงินลงทุน', type: 'invest', icon: 'trending', color: '#38bdf8', opening: 0, order: 2 },
  { id: 'acc-reserve', name: 'กันชำระหนี้', type: 'reserve', icon: 'shield', color: '#a78bfa', opening: 0, order: 3 },
  { id: 'acc-cc1', name: 'บัตรเครดิต', type: 'credit', icon: 'card', color: '#fb7185', opening: 0, limit: 0, dueDay: 25, order: 4 },
  { id: 'acc-loan1', name: 'ผ่อนเงินกู้บัตร', type: 'loan', icon: 'bank', color: '#f97316', opening: 0, installment: 0, dueDay: 5, order: 5 },
]

export const DEFAULT_CATEGORIES = [
  // expense
  ['cat-food', 'อาหาร', 'food', '#f97316', 'expense'],
  ['cat-coffee', 'กาแฟ/ขนม', 'coffee', '#fbbf24', 'expense'],
  ['cat-travel', 'เดินทาง', 'car', '#38bdf8', 'expense'],
  ['cat-fuel', 'น้ำมัน', 'fuel', '#06b6d4', 'expense'],
  ['cat-shop', 'ช้อปปิ้ง', 'bag', '#f472b6', 'expense'],
  ['cat-grocery', 'ของใช้', 'cart', '#a3e635', 'expense'],
  ['cat-bills', 'บิล/ค่าน้ำไฟ', 'zap', '#fbbf24', 'expense'],
  ['cat-phone', 'มือถือ/เน็ต', 'wifi', '#3b82f6', 'expense'],
  ['cat-home', 'บ้าน/ที่พัก', 'home', '#14b8a6', 'expense'],
  ['cat-health', 'สุขภาพ', 'health', '#fb7185', 'expense'],
  ['cat-fun', 'บันเทิง', 'game', '#a78bfa', 'expense'],
  ['cat-edu', 'การศึกษา', 'edu', '#6366f1', 'expense'],
  ['cat-gift', 'ของขวัญ/ทำบุญ', 'gift', '#f472b6', 'expense'],
  ['cat-sub', 'Subscription', 'repeat', '#38bdf8', 'expense'],
  ['cat-fee', 'ดอกเบี้ย/ค่าธรรมเนียม', 'percent', '#94a3b8', 'expense'],
  ['cat-other', 'อื่น ๆ', 'more', '#94a3b8', 'expense'],
  // income
  ['cat-salary', 'เงินเดือน', 'briefcase', '#10b981', 'income'],
  ['cat-bonus', 'โบนัส', 'award', '#fbbf24', 'income'],
  ['cat-freelance', 'งานพิเศษ', 'laptop', '#38bdf8', 'income'],
  ['cat-sell', 'ขายของ', 'store', '#f472b6', 'income'],
  ['cat-dividend', 'ปันผล/ดอกเบี้ย', 'coins', '#a3e635', 'income'],
  ['cat-gift-in', 'ได้รับเงิน', 'handcoins', '#14b8a6', 'income'],
  ['cat-other-in', 'รายรับอื่น', 'more', '#94a3b8', 'income'],
].map(([id, name, icon, color, kind], i) => ({ id, name, icon, color, kind, order: i }))

export const DEFAULT_SETTINGS = {
  id: 'settings',
  allocation: {
    pct: { reserve: 30, cash: 50, invest: 20 },
    capReserveAtGap: true,
    targets: { reserve: 'acc-reserve', cash: 'acc-cash', invest: 'acc-invest' },
  },
  earmarkCredit: true,
  earmarkFrom: 'acc-cash',
}

export const DEFAULT_PROFILE = {
  id: 'profile',
  name: 'รณกฤต เรืองชินศิริ',
  avatar: null, // null => bundled avatar.jpg
}

export const TXN_KINDS = {
  expense: { label: 'รายจ่าย', color: '#fb7185' },
  income: { label: 'รายรับ', color: '#34d399' },
  transfer: { label: 'โอน', color: '#38bdf8' },
  payment: { label: 'ชำระหนี้', color: '#a78bfa' },
  adjust: { label: 'ปรับยอด', color: '#94a3b8' },
}
