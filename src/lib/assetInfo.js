/**
 * "What is this asset?" — Thai write-ups for indices, metals, energy, currencies and the main coins,
 * plus live facts (market cap, sector, business summary…) from the price function's ?profile route.
 */
import { FN, H } from './market'

const D = {
  // indices
  '^SET.BK': 'ดัชนีราคาหุ้นทุกตัวในตลาดหลักทรัพย์แห่งประเทศไทย (SET) ใช้ดูภาพรวมตลาดหุ้นไทย',
  '^SET50.BK': 'ดัชนีของหุ้นไทย 50 ตัวที่ใหญ่และซื้อขายคล่องที่สุด เป็นตัวแทนหุ้นใหญ่ของประเทศ',
  '^SET100.BK': 'ดัชนีของหุ้นไทย 100 ตัวที่ใหญ่และซื้อขายคล่องที่สุด',
  '^GSPC': 'S&P 500 คือดัชนีหุ้นใหญ่ 500 บริษัทของสหรัฐ ใช้วัดภาพรวมตลาดหุ้นสหรัฐ และเป็นดัชนีที่กองทุนทั่วโลกนิยมลงทุนตามมากที่สุด',
  '^IXIC': 'Nasdaq Composite คือดัชนีหุ้นทุกตัวในตลาด Nasdaq ของสหรัฐ มีบริษัทเทคโนโลยีเป็นส่วนใหญ่',
  '^NDX': 'Nasdaq-100 คือดัชนีหุ้น 100 บริษัทที่ใหญ่ที่สุดในตลาด Nasdaq (ไม่รวมกลุ่มการเงิน) เน้นเทคโนโลยี',
  '^DJI': 'Dow Jones คือดัชนีหุ้นบลูชิพ 30 บริษัทของสหรัฐ เป็นดัชนีที่เก่าแก่ที่สุดตัวหนึ่ง',
  '^HSI': 'ดัชนีฮั่งเส็งของตลาดหุ้นฮ่องกง รวมบริษัทใหญ่ของฮ่องกงและจีน เช่น Tencent, Alibaba, AIA',
  '000001.SS': 'ดัชนีตลาดหลักทรัพย์เซี่ยงไฮ้ (SSE Composite) วัดภาพรวมหุ้นจีนแผ่นดินใหญ่',
  '^N225': 'ดัชนีนิกเกอิ 225 ของตลาดหุ้นญี่ปุ่น',
  // metals & energy
  'TH-GOLD': 'ราคาทองคำแท่ง 96.5% ต่อน้ำหนัก 1 บาท (15.244 กรัม) ตามมาตรฐานไทย คำนวณจากราคาทองโลกและค่าเงินบาท',
  'GC=F': 'ทองคำในตลาดโลก (สัญญาซื้อขายล่วงหน้า COMEX) ราคาต่อออนซ์เป็นดอลลาร์ ทองถูกใช้เป็นที่พักเงินยามเศรษฐกิจผันผวนและป้องกันเงินเฟ้อ',
  'MGC=F': 'สัญญาทองคำขนาดเล็ก (Micro Gold, 10 ออนซ์) ราคาเคลื่อนไหวตามทองคำโลก',
  'SI=F': 'แร่เงิน (Silver) ใช้ทั้งเป็นโลหะมีค่าและในอุตสาหกรรม เช่น โซลาร์เซลล์ อิเล็กทรอนิกส์ ราคาผันผวนกว่าทองคำ',
  'PL=F': 'แพลทินัม โลหะมีค่าหายาก ใช้มากในอุตสาหกรรมรถยนต์ (ตัวกรองไอเสีย) และเครื่องประดับ',
  'PA=F': 'แพลเลเดียม โลหะมีค่าที่ใช้ในตัวกรองไอเสียรถยนต์เบนซินเป็นหลัก ราคาผันผวนสูง',
  'HG=F': 'ทองแดง โลหะอุตสาหกรรมสำคัญ ใช้ในสายไฟ ก่อสร้าง รถยนต์ไฟฟ้า มักใช้เป็นตัวบอกทิศทางเศรษฐกิจโลก',
  'BZ=F': 'น้ำมันดิบเบรนต์ (ทะเลเหนือ) ราคาอ้างอิงหลักของน้ำมันในยุโรปและเอเชีย รวมถึงราคาน้ำมันในไทย',
  'CL=F': 'น้ำมันดิบ WTI (เวสต์เท็กซัส) ราคาอ้างอิงหลักของน้ำมันในสหรัฐ',
  'NG=F': 'ก๊าซธรรมชาติในตลาดสหรัฐ ใช้ผลิตไฟฟ้าและทำความร้อน ราคาขึ้นลงตามฤดูกาลมาก',
  'RB=F': 'น้ำมันเบนซินสำเร็จรูป (RBOB) ในตลาดสหรัฐ ราคาต่อแกลลอน',
  'HO=F': 'น้ำมันดีเซลและน้ำมันทำความร้อนในตลาดสหรัฐ ราคาต่อแกลลอน',
  // coins
  BTC: 'บิตคอยน์ คริปโตตัวแรกของโลก (2009) จำนวนจำกัด 21 ล้านเหรียญ ไม่มีใครเป็นเจ้าของหรือควบคุม หลายคนเรียกว่า “ทองคำดิจิทัล”',
  ETH: 'อีเธอเรียม บล็อกเชนที่รันสัญญาอัจฉริยะ (smart contract) เป็นฐานของ DeFi, NFT และเหรียญอื่นจำนวนมาก ETH คือค่าธรรมเนียมที่ใช้ในเครือข่าย',
  BNB: 'เหรียญของ Binance กระดานเทรดคริปโตที่ใหญ่ที่สุดในโลก ใช้ลดค่าธรรมเนียมและจ่ายค่าแก๊สบนเครือข่าย BNB Chain',
  SOL: 'โซลานา บล็อกเชนที่เน้นความเร็วสูงและค่าธรรมเนียมต่ำ นิยมใช้ทำแอป DeFi, NFT และมีมคอยน์',
  XRP: 'เหรียญของเครือข่าย XRP Ledger ออกแบบมาเพื่อโอนเงินข้ามประเทศได้เร็วและถูก โดยบริษัท Ripple',
  DOGE: 'โดจคอยน์ เริ่มจากมุกตลกรูปสุนัขชิบะ กลายเป็นมีมคอยน์ที่ใหญ่ที่สุด ไม่มีจำนวนจำกัด ราคาผันผวนตามกระแส',
  ADA: 'คาร์ดาโน บล็อกเชนสัญญาอัจฉริยะที่พัฒนาโดยอิงงานวิจัยทางวิชาการ',
  TRX: 'ทรอน บล็อกเชนที่ใช้โอนเหรียญดอลลาร์ (USDT) มากที่สุดเพราะค่าธรรมเนียมต่ำ',
  AVAX: 'อวาแลนช์ บล็อกเชนสัญญาอัจฉริยะความเร็วสูง ให้สร้างเครือข่ายย่อย (subnet) ของตัวเองได้',
  LINK: 'เชนลิงก์ เครือข่ายส่งข้อมูลโลกจริง (ราคา อากาศ ฯลฯ) เข้าสู่บล็อกเชน (oracle)',
  DOT: 'พอลคาดอต เครือข่ายที่เชื่อมหลายบล็อกเชนให้ทำงานร่วมกัน',
  TON: 'ทอนคอยน์ บล็อกเชนที่ผูกกับแอป Telegram ใช้จ่ายและโอนในแอปแชท',
  SUI: 'ซุย บล็อกเชนรุ่นใหม่ความเร็วสูง พัฒนาโดยทีมอดีตวิศวกรของ Meta',
  LTC: 'ไลท์คอยน์ หนึ่งในเหรียญรุ่นแรก ๆ แยกมาจากบิตคอยน์ ยืนยันธุรกรรมเร็วกว่า',
  BCH: 'บิตคอยน์แคช แยกตัวออกจากบิตคอยน์ในปี 2017 เพื่อให้บล็อกใหญ่ขึ้นและโอนได้ถูกลง',
  PEPE: 'มีมคอยน์รูปกบเปเป้ ไม่มีประโยชน์ใช้งานจริง ราคาขึ้นลงตามกระแสสังคม ความเสี่ยงสูงมาก',
  SHIB: 'มีมคอยน์รูปสุนัขชิบะ ได้แรงบันดาลใจจาก Dogecoin ความเสี่ยงสูงมาก',
  KUB: 'เหรียญของ Bitkub Chain บล็อกเชนสัญชาติไทย ใช้จ่ายค่าธรรมเนียมในเครือข่าย Bitkub',
  USDT: 'Tether เหรียญที่ตรึงมูลค่ากับดอลลาร์สหรัฐ 1:1 (stablecoin) ใช้พักเงินในโลกคริปโต',
  USDC: 'USD Coin เหรียญที่ตรึงมูลค่ากับดอลลาร์สหรัฐ 1:1 ออกโดยบริษัท Circle',
}

const FX = { USD: 'ดอลลาร์สหรัฐ', EUR: 'ยูโร', JPY: 'เยนญี่ปุ่น', CNY: 'หยวนจีน', GBP: 'ปอนด์อังกฤษ', SGD: 'ดอลลาร์สิงคโปร์', HKD: 'ดอลลาร์ฮ่องกง', AUD: 'ดอลลาร์ออสเตรเลีย', CHF: 'ฟรังก์สวิส', KRW: 'วอนเกาหลีใต้', TWD: 'ดอลลาร์ไต้หวัน', MYR: 'ริงกิตมาเลเซีย', INR: 'รูปีอินเดีย', VND: 'ดองเวียดนาม', LAK: 'กีบลาว' }

export const SECTOR_TH = {
  Technology: 'เทคโนโลยี', 'Financial Services': 'บริการทางการเงิน', Healthcare: 'สุขภาพ', 'Consumer Cyclical': 'สินค้าฟุ่มเฟือย', 'Consumer Defensive': 'สินค้าจำเป็น',
  'Communication Services': 'สื่อสาร', Industrials: 'อุตสาหกรรม', Energy: 'พลังงาน', Utilities: 'สาธารณูปโภค', 'Real Estate': 'อสังหาริมทรัพย์', 'Basic Materials': 'วัตถุดิบ',
}

/** Thai write-up for an item (null when there's none) */
export function thaiAbout(it) {
  if (!it) return null
  if (D[it.symbol]) return D[it.symbol]
  if (it.kind === 'fx' && it.ccy) return `อัตราแลกเปลี่ยน${FX[it.ccy] || it.ccy}เทียบเงินบาท ${it.per > 1 ? `(ราคาต่อ ${it.per.toLocaleString()} ${it.ccy}) ` : ''}ใช้ดูว่าต้องใช้กี่บาทแลก 1 หน่วยของสกุลนั้น ถ้าตัวเลขขึ้นแปลว่าบาทอ่อนลง`
  const code = it.symbol.replace(/^BKUB:|-USD$/g, '')
  if ((it.kind === 'crypto' || /^BKUB:|-USD$/.test(it.symbol)) && D[code]) return D[code]
  return null
}

/** where you can actually buy it (indices, commodities) */
export function howToBuy(it) {
  if (it.kind === 'index') return 'ซื้อดัชนีตรง ๆ ไม่ได้ ลงทุนผ่านกองทุนรวมหรือ ETF ที่ลงทุนตามดัชนีนี้ (ค้นหาในแท็บกองทุน)'
  if (it.kind === 'commodity' || (it.kind === 'gold' && it.symbol !== 'TH-GOLD')) return 'นี่คือราคาตลาดล่วงหน้าโลก รายย่อยลงทุนได้ผ่านกองทุนรวม/ETF ที่อ้างอิงสินค้านี้ หรือทองคำแท่งจริงจากร้านทอง'
  return null
}

const cache = new Map()
const LS = 'vault:profile:'
/** live facts for one symbol, cached for a day */
export async function loadProfile(symbol) {
  if (!symbol || symbol === 'TH-GOLD' || /=X$/.test(symbol)) return null
  if (cache.has(symbol)) return cache.get(symbol)
  try { const c = JSON.parse(localStorage.getItem(LS + symbol)); if (c && Date.now() - c.at < 86400_000) { cache.set(symbol, c.d); return c.d } } catch { /* */ }
  const r = await fetch(`${FN}?profile=${encodeURIComponent(symbol)}`, H)
  const d = await r.json()
  if (d.error && !d.name) return null
  cache.set(symbol, d)
  try { localStorage.setItem(LS + symbol, JSON.stringify({ at: Date.now(), d })) } catch { /* storage full */ }
  return d
}

let topMem = null
export async function loadTop10() {
  if (topMem && Date.now() - topMem.at < 10 * 60_000) return topMem
  const r = await fetch(`${FN}?top=1`, H)
  const d = await r.json()
  if (d.items) topMem = d
  return d
}

/** 4.98e12 USD → "4.98 ล้านล้านดอลลาร์" · 3.2e9 THB → "3,200 ล้านบาท" */
export function fmtCap(v, ccy = 'USD') {
  if (v == null || !isFinite(v)) return '—'
  const unit = { USD: 'ดอลลาร์', THB: 'บาท', HKD: 'ดอลลาร์ฮ่องกง', CNY: 'หยวน', EUR: 'ยูโร', JPY: 'เยน' }[ccy] || ccy
  if (v >= 1e12) return `${(v / 1e12).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ล้านล้าน${unit}`
  if (v >= 1e6) return `${Math.round(v / 1e6).toLocaleString('th-TH')} ล้าน${unit}`
  return `${Math.round(v).toLocaleString('th-TH')} ${unit}`
}
/** compact for lists: $4.98T / $812B */
export const capShort = (v) => (v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T` : v >= 1e9 ? `$${Math.round(v / 1e9)}B` : `$${Math.round(v / 1e6)}M`)
