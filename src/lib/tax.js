/**
 * Thai personal income tax (ภ.ง.ด.90/91), for salaried people with a few common extras.
 * Rules as published for tax year 2569 (filed Jan–Mar 2570): 50% expense deduction on salary capped at 100,000,
 * personal allowance 60,000, progressive brackets below. Caps on the deductions the app can spot are listed in
 * DEDUCTIONS. This is an estimate to plan with, not a filing; the user is told to check with the Revenue Department.
 */
export const TAX_YEAR_NOTE = 'อัตราและเพดานลดหย่อนตามประกาศกรมสรรพากรสำหรับปีภาษี 2569 (ยื่นต้นปี 2570) · เป็นการประมาณเพื่อวางแผน ควรตรวจสอบกับกรมสรรพากรก่อนยื่นจริง'

export const BRACKETS = [
  [150000, 0], [300000, 0.05], [500000, 0.10], [750000, 0.15], [1000000, 0.20], [2000000, 0.25], [5000000, 0.30], [Infinity, 0.35],
]
export const FILE_THRESHOLD_SALARY = 120000 // single, salary-only income: must file above this

export const DEDUCTIONS = [
  { id: 'ss', name: 'ประกันสังคม', cap: () => 9000, words: ['ประกันสังคม', 'social security', 'สปส'], tip: 'หักตามที่จ่ายจริง' },
  { id: 'life', name: 'เบี้ยประกันชีวิต', cap: () => 100000, words: ['ประกันชีวิต', 'life insurance', 'aia', 'เมืองไทยประกัน', 'ไทยประกันชีวิต', 'fwd', 'allianz', 'กรุงเทพประกันชีวิต'], tip: 'กรมธรรม์ 10 ปีขึ้นไป' },
  { id: 'health', name: 'เบี้ยประกันสุขภาพตนเอง', cap: () => 25000, words: ['ประกันสุขภาพ', 'health insurance'], tip: 'รวมกับประกันชีวิตไม่เกิน 100,000' },
  { id: 'parents', name: 'ประกันสุขภาพพ่อแม่', cap: () => 15000, words: ['ประกันสุขภาพพ่อ', 'ประกันสุขภาพแม่', 'ประกันพ่อแม่'] },
  { id: 'rmf', name: 'กองทุน RMF', cap: (inc) => Math.min(500000, inc * 0.3), words: ['rmf'], fund: /RMF/i, tip: '30% ของรายได้ ไม่เกิน 500,000 (รวมกองทุนเกษียณอื่น)' },
  { id: 'esg', name: 'กองทุน Thai ESG / ESGX', cap: (inc) => Math.min(300000, inc * 0.3), words: ['thaiesg', 'thai esg', 'esgx', 'tesg'], fund: /ESG/i, tip: '30% ของรายได้ ไม่เกิน 300,000' },
  { id: 'homeloan', name: 'ดอกเบี้ยเงินกู้ซื้อบ้าน', cap: () => 100000, words: ['ดอกเบี้ยบ้าน', 'ดอกเบี้ยกู้บ้าน', 'home loan'] },
  { id: 'donate', name: 'เงินบริจาค', cap: (inc, net) => Math.max(0, net * 0.1), words: ['บริจาค', 'donate', 'donation'], tip: 'ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน · ต้องมี e-Donation' },
]
export const DED_BY_ID = Object.fromEntries(DEDUCTIONS.map((d) => [d.id, d]))

/** Which deduction (if any) a transaction or a fund looks like. */
export function deductionOf(text = '', fundCode = '') {
  if (fundCode) { for (const d of DEDUCTIONS) if (d.fund?.test(fundCode)) return d }
  const s = String(text).toLowerCase()
  for (const d of DEDUCTIONS) if (d.words.some((w) => s.includes(w))) return d
  return null
}

export function taxOn(net) {
  let tax = 0, lo = 0
  const steps = []
  for (const [hi, r] of BRACKETS) {
    if (net > lo) { const part = Math.min(net, hi) - lo; tax += part * r; steps.push({ lo, hi, rate: r, part, tax: part * r }) }
    lo = hi
  }
  const top = steps.filter((s) => s.part > 0).pop()
  return { tax: Math.round(tax), steps, topRate: top ? top.rate : 0 }
}

/**
 * year: 'YYYY' (Gregorian) · txns, catById, assetById · manual: { [deductionId]: amount, withheld, otherIncome }
 */
export function computeTax({ year, txns, catById = {}, assetById = {}, manual = {}, settings = {} }) {
  const inYear = txns.filter((t) => t.date?.startsWith(year))
  const income = { salary: 0, bonus: 0, other: 0, dividend: 0 }
  for (const t of inYear) {
    if (t.kind !== 'income') continue
    if (t.category === 'cat-salary') income.salary += t.amount
    else if (t.category === 'cat-bonus') income.bonus += t.amount
    else if (t.category === 'cat-dividend') income.dividend += t.amount
    else if (t.category === 'cat-gift-in') continue // gifts between family are generally not taxable income
    else income.other += t.amount
  }
  income.other += +manual.otherIncome || 0
  const salaryLike = income.salary + income.bonus
  const gross = salaryLike + income.other
  // projection to year-end from months recorded so far (salary only)
  const months = new Set(inYear.filter((t) => t.kind === 'income' && t.category === 'cat-salary').map((t) => t.date.slice(0, 7))).size
  const isThisYear = year === String(new Date().getFullYear())
  const payday = settings.payday?.amount || 0
  const now0 = new Date(), pday = settings.payday?.day || 28
  const monthsDue = now0.getMonth() + (now0.getDate() >= pday ? 1 : 0)
  const remaining = isThisYear ? Math.max(0, 12 - Math.max(months, monthsDue)) : 0
  const perMonth = payday || (months ? income.salary / months : 0)
  const projSalary = income.salary + remaining * perMonth
  const projGross = projSalary + income.bonus + income.other

  // auto-detected deductions from this year's records
  const found = {}
  const hits = []
  for (const t of inYear) {
    let d = null, amt = 0
    if (t.kind === 'expense' || t.kind === 'transfer') { d = deductionOf(`${catById[t.category]?.name || ''} ${t.note || ''}`); amt = t.amount }
    if (t.kind === 'trade' && t.side === 'buy') { const a = assetById[t.assetId]; d = deductionOf('', `${a?.symbol || ''} ${a?.name || ''} ${a?.code || ''}`); amt = t.amount || t.total || 0 }
    if (d) { found[d.id] = (found[d.id] || 0) + amt; hits.push({ id: t.id, date: t.date, ded: d.id, amount: amt, note: t.note || catById[t.category]?.name || '' }) }
  }

  const calc = (G) => {
    const expense = Math.min(100000, (G - income.other) * 0.5) // salary-type income only; other income is taken as-is
    const personal = 60000 + (manual.spouse ? 60000 : 0) + (+manual.parents || 0) * 30000
    const raw = {}
    for (const d of DEDUCTIONS) raw[d.id] = (found[d.id] || 0) + (+manual[d.id] || 0)
    const used = {}
    let lifeHealth = 0
    for (const d of DEDUCTIONS) {
      if (d.id === 'donate') continue
      let v = Math.min(raw[d.id], d.cap(G))
      if (d.id === 'life' || d.id === 'health') { v = Math.min(v, 100000 - lifeHealth); lifeHealth += v }
      used[d.id] = Math.max(0, v)
    }
    // RMF + other retirement savings ≤ 500,000 combined (only RMF is tracked here)
    const before = Math.max(0, G - expense - personal - Object.values(used).reduce((s, v) => s + v, 0))
    used.donate = Math.min(raw.donate, DED_BY_ID.donate.cap(G, before))
    const net = Math.max(0, before - used.donate)
    return { expense, personal, used, raw, net, ...taxOn(net) }
  }
  const now = calc(gross)
  const proj = calc(projGross)
  const withheld = +manual.withheld || 0
  // room left that would still lower tax at the projected marginal rate
  const room = proj.topRate > 0 ? DEDUCTIONS.filter((d) => ['rmf', 'esg', 'life', 'health'].includes(d.id)).map((d) => {
    const capLeft = Math.max(0, d.cap(projGross) - (proj.used[d.id] || 0))
    const useful = Math.min(capLeft, proj.net) // can't save more than the taxable base
    return { ...d, left: capLeft, saves: Math.round(useful * proj.topRate) }
  }).filter((x) => x.left > 0) : []

  return {
    year, income, gross, salaryLike, projGross, months, now, proj, withheld,
    refund: withheld - proj.tax, mustFile: projGross > FILE_THRESHOLD_SALARY, found, hits, room,
  }
}
