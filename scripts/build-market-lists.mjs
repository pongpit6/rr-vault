// Rebuild src/data/markets.json from public lists:
//   Thai SET+mai: github.com/lumduan/thai-securities-data · S&P 500: github.com/datasets/s-and-p-500-companies
//   Nasdaq-100: github.com/Gary-Strauss/NASDAQ100_Constituents · Hong Kong / China: hand-picked below
// usage: node scripts/build-market-lists.mjs
import { writeFileSync } from 'node:fs'
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} ${r.status}`); return r.text() }
const csv = (t) => t.trim().split('\n').slice(1).map((l) => { const o = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(cur); cur = '' } else cur += ch } o.push(cur); return o })

const thaiShort = (n) => n.replace(/^บริษัท\s*/, '').replace(/\s*จำกัด\s*\(มหาชน\)\s*$/, '').replace(/\s*จำกัด\s*$/, '').replace(/\s+/g, ' ').trim()
const th = JSON.parse(await get('https://raw.githubusercontent.com/lumduan/thai-securities-data/main/thai_securities_all_th.json'))
const thRows = th.map((x) => [x.symbol, thaiShort(x.name), x.market === 'mai' ? 'mai' : 'SET', x.market === 'mai' ? 'mai' : x.sector || x.industry || ''])

const sp = csv(await get('https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv')).map((r) => [r[0].replace('.', '-'), r[1], r[2]])
const ndx = csv(await get('https://raw.githubusercontent.com/Gary-Strauss/NASDAQ100_Constituents/master/data/nasdaq100_constituents.csv')).map((r) => [r[0].replace('.', '-'), r[1], r[3] || r[2]])
const usMap = new Map(); for (const r of [...sp, ...ndx]) if (!usMap.has(r[0])) usMap.set(r[0], r)
const usRows = [...usMap.values()].sort((a, b) => a[0].localeCompare(b[0]))

const cnRows = `0700.HK Tencent|9988.HK Alibaba|3690.HK Meituan|1810.HK Xiaomi|1211.HK BYD|0941.HK China Mobile|0005.HK HSBC|1299.HK AIA|0939.HK China Construction Bank|1398.HK ICBC|3988.HK Bank of China|2318.HK Ping An|0388.HK HKEX|9618.HK JD.com|9999.HK NetEase|1024.HK Kuaishou|9888.HK Baidu|2020.HK Anta Sports|0883.HK CNOOC|0857.HK PetroChina|0386.HK Sinopec|0001.HK CK Hutchison|0016.HK Sun Hung Kai Properties|0002.HK CLP Holdings|0003.HK HK & China Gas|0006.HK Power Assets|0011.HK Hang Seng Bank|0012.HK Henderson Land|0027.HK Galaxy Entertainment|0066.HK MTR|0101.HK Hang Lung Properties|0175.HK Geely Auto|0241.HK Alibaba Health|0267.HK CITIC|0288.HK WH Group|0316.HK OOIL|0669.HK Techtronic|0688.HK China Overseas Land|0762.HK China Unicom|0823.HK Link REIT|0868.HK Xinyi Glass|0960.HK Longfor|0968.HK Xinyi Solar|0981.HK SMIC|0992.HK Lenovo|1038.HK CK Infrastructure|1044.HK Hengan|1088.HK China Shenhua|1093.HK CSPC Pharma|1109.HK China Resources Land|1113.HK CK Asset|1177.HK Sino Biopharm|1209.HK China Resources Mixc|1876.HK Budweiser APAC|1928.HK Sands China|1929.HK Chow Tai Fook|2015.HK Li Auto|2269.HK WuXi Biologics|2313.HK Shenzhou Intl|2319.HK Mengniu Dairy|2331.HK Li Ning|2382.HK Sunny Optical|2388.HK BOC Hong Kong|2628.HK China Life|2688.HK ENN Energy|2899.HK Zijin Mining|3968.HK China Merchants Bank|6618.HK JD Health|6690.HK Haier Smart Home|6862.HK Haidilao|9633.HK Nongfu Spring|9868.HK XPeng|9961.HK Trip.com|9901.HK New Oriental|0285.HK BYD Electronic|0291.HK China Resources Beer|0322.HK Tingyi|0836.HK China Resources Power|1378.HK China Hongqiao|0020.HK SenseTime|9866.HK NIO|2057.HK ZTO Express|600519.SS Kweichow Moutai|300750.SZ CATL|601318.SS Ping An (A)|600036.SS China Merchants Bank (A)|000858.SZ Wuliangye|000333.SZ Midea|002594.SZ BYD (A)|601012.SS LONGi Green Energy|600900.SS Yangtze Power|601899.SS Zijin Mining (A)|601398.SS ICBC (A)|600276.SS Hengrui Medicine|300059.SZ East Money|002415.SZ Hikvision|601166.SS Industrial Bank|600030.SS CITIC Securities`.split('|').map((s) => { const i = s.indexOf(' '); return [s.slice(0, i), s.slice(i + 1)] })

writeFileSync(new URL('../src/data/markets.json', import.meta.url), JSON.stringify({ at: new Date().toISOString().slice(0, 10), th: thRows, us: usRows, cn: cnRows }))
console.log('th', thRows.length, 'us', usRows.length, 'cn', cnRows.length)
