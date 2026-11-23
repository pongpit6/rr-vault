// Price proxy for LifeQuest (formerly R.R. Vault).
// GET ?symbols=AAPL,PTT.BK,GC=F,THB=X   -> latest quotes (Yahoo Finance chart API)
// GET ?search=apple                      -> symbol search (Yahoo Finance)
// GET ?spark=AAPL,0700.HK&range=1mo      -> quote + close series per symbol (Market rows)
// GET ?chart=AAPL&range=1y               -> one symbol's chart (Market detail)
// GET ?oil=1                             -> Thai retail fuel prices (Bangchak + PTT OR)
// GET ?bitkub=1                          -> all Bitkub THB pairs (ticker)   ?bkchart=KUB&range=1mo -> one pair's history
// GET ?fng=1                             -> Bitcoin Fear & Greed (CoinMarketCap intraday + Alternative.me daily)
// GET ?profile=AAPL | BTC-USD | FUND:123 -> what the asset is + market cap (Yahoo quoteSummary / CoinGecko / Finnomena)
// GET ?top=1                             -> the 10 most valuable assets in the world (companies, crypto, gold, silver)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=30" } });

// ---------- Thai mutual funds (Finnomena public NAV API) ----------
const FN_API = "https://www.finnomena.com/fn3/api/fund";
let fundList: any[] | null = null, fundListAt = 0;
async function funds() {
  if (!fundList || Date.now() - fundListAt > 6 * 3600_000) {
    const r = await fetch(`${FN_API}/public/list`, { headers: UA });
    if (r.ok) { fundList = await r.json(); fundListAt = Date.now(); }
  }
  return fundList || [];
}
async function fundSearch(q: string) {
  const s = q.trim().toLowerCase();
  const list = await funds();
  const hits = list.filter((f: any) => f.short_code?.toLowerCase().includes(s) || f.name_th?.toLowerCase().includes(s));
  hits.sort((a: any, b: any) => (a.short_code.toLowerCase().startsWith(s) ? 0 : 1) - (b.short_code.toLowerCase().startsWith(s) ? 0 : 1) || a.short_code.length - b.short_code.length);
  return hits.slice(0, 20).map((f: any) => ({ symbol: `FUND:${f.id}`, code: f.short_code, name: f.name_th, type: "THFUND", exchange: "กองทุนรวมไทย" }));
}
async function fundQuote(symbol: string) {
  const id = symbol.slice(5);
  const r = await fetch(`${FN_API}/v2/public/funds/${id}/latest`, { headers: UA });
  if (!r.ok) return { symbol, error: "not_found" };
  const d = (await r.json())?.data;
  if (!d?.value) return { symbol, error: "not_found" };
  return { symbol, price: d.value, changePct: d.d_change ?? null, currency: "THB", name: d.short_code, exchange: "NAV", time: Date.parse(d.date) };
}
async function fundHist(symbol: string, date: string) {
  const r = await fetch(`${FN_API}/v2/public/funds/${symbol.slice(5)}/nav/q?range=MAX`, { headers: UA });
  if (!r.ok) return { symbol, date, error: "not_found" };
  const navs = (await r.json())?.data?.navs || [];
  let best: any = null;
  for (const n of navs) if (n.date.slice(0, 10) <= date && (!best || n.date > best.date)) best = n;
  return best ? { symbol, date, price: best.value, at: Date.parse(best.date), currency: "THB" } : { symbol, date, error: "no_data" };
}

async function quote(symbol: string) {
  if (symbol.startsWith("FUND:")) return fundQuote(symbol);
  if (symbol.startsWith("BKUB:")) {
    const q = (await bitkub()).items.find((x: any) => x.code === symbol.slice(5));
    return q ? { symbol, price: q.price, changePct: q.changePct, currency: "THB", name: `${q.code}/THB`, exchange: "Bitkub", time: Date.now() } : { symbol, error: "not_found" };
  }
  for (const host of ["query1", "query2"]) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`, { headers: UA });
      if (!r.ok) continue;
      const j = await r.json();
      const res = j?.chart?.result?.[0];
      const m = res?.meta;
      if (!m || m.regularMarketPrice == null) continue;
      const prev = m.previousClose ?? m.chartPreviousClose ?? null;
      return {
        symbol, price: m.regularMarketPrice, prevClose: prev,
        changePct: prev ? ((m.regularMarketPrice - prev) / prev) * 100 : null,
        currency: m.currency, name: m.longName || m.shortName || symbol,
        exchange: m.exchangeName, time: (m.regularMarketTime || 0) * 1000,
      };
    } catch (_) { /* try next host */ }
  }
  return { symbol, error: "not_found" };
}

// Close price of a symbol on (or just before) a date: ?hist=THB=X&date=2025-03-01
async function hist(symbol: string, date: string) {
  if (symbol.startsWith("FUND:")) return fundHist(symbol, date);
  if (symbol.startsWith("BKUB:")) {
    const t = Math.floor(new Date(date + "T00:00:00Z").getTime() / 1000);
    const h = await fetch(`https://api.bitkub.com/tradingview/history?symbol=${symbol.slice(5)}_THB&resolution=1D&from=${t - 7 * 86400}&to=${t + 86400}`, { headers: UA }).then((r) => r.json());
    const ts: number[] = h?.t || [], cl: number[] = h?.c || [];
    let best: number | null = null, bestT = 0;
    ts.forEach((x, i) => { if (cl[i] != null && x <= t + 86400 && x >= bestT) { best = +cl[i]; bestT = x; } });
    return best == null ? { symbol, date, error: "no_data" } : { symbol, date, price: best, at: bestT * 1000, currency: "THB" };
  }
  const t = Math.floor(new Date(date + "T00:00:00Z").getTime() / 1000);
  const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${t - 7 * 86400}&period2=${t + 86400}`, { headers: UA });
  if (!r.ok) return { symbol, date, error: "not_found" };
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const ts: number[] = res?.timestamp || [];
  const close: number[] = res?.indicators?.quote?.[0]?.close || [];
  let best: number | null = null, bestT = 0;
  ts.forEach((x, i) => { if (close[i] != null && x <= t + 86400 && x >= bestT) { best = close[i]; bestT = x; } });
  return best == null ? { symbol, date, error: "no_data" } : { symbol, date, price: best, at: bestT * 1000, currency: res?.meta?.currency };
}

// ---------- Market: quote + series ----------
const INTERVAL: Record<string, string> = { "1d": "5m", "5d": "30m", "1mo": "1d", "3mo": "1d", "6mo": "1d", "1y": "1d", "5y": "1wk", "max": "1mo" };
// Some Yahoo symbols (^SET.BK, CNYTHB=X) have no daily bars: rebuild them from hourly bars or a cross rate.
const dayKey = (t: number) => new Date(t + 7 * 3600_000).toISOString().slice(0, 10);
async function chart(symbol: string, range = "1mo") {
  const r = await chartRaw(symbol, range, INTERVAL[range] || "1d");
  if ((r as any).error || (r as any).c.length >= 3 || range === "1d" || range === "5d") return r;
  const fx = symbol.match(/^([A-Z]{3})THB=X$/);
  if (fx && fx[1] !== "USD") {
    const [a, b] = await Promise.all([chartRaw("THB=X", range, INTERVAL[range] || "1d"), chartRaw(`${fx[1]}=X`, range, INTERVAL[range] || "1d")]) as any[];
    if (!a.error && !b.error && a.c.length > 2) {
      const bm = new Map(b.t.map((t: number, i: number) => [dayKey(t), b.c[i]]));
      const t: number[] = [], c: number[] = [];
      a.t.forEach((x: number, i: number) => { const d = bm.get(dayKey(x)) as number; if (d) { t.push(x); c.push(+(a.c[i] / d).toPrecision(6)); } });
      if (c.length > 2) return { ...r, t, c };
    }
    return r;
  }
  const h = await chartRaw(symbol, ["5y", "max", "2y"].includes(range) ? "2y" : range, "1h") as any;
  if (h.error || h.c.length < 3) return r;
  const days = new Map<string, [number, number]>();
  h.t.forEach((x: number, i: number) => days.set(dayKey(x), [x, h.c[i]]));
  const v = [...days.values()];
  return { ...r, t: v.map((x) => x[0]), c: v.map((x) => x[1]) };
}
async function chartRaw(symbol: string, range: string, interval: string) {
  for (const host of ["query1", "query2"]) {
    try {
      const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`, { headers: UA });
      if (!r.ok) continue;
      const res = (await r.json())?.chart?.result?.[0];
      const m = res?.meta;
      if (!m || m.regularMarketPrice == null) continue;
      const ts: number[] = res.timestamp || [];
      const cl: (number | null)[] = res.indicators?.quote?.[0]?.close || [];
      const t: number[] = [], c: number[] = [];
      ts.forEach((x, i) => { if (cl[i] != null) { t.push(x * 1000); c.push(+(+cl[i]!).toPrecision(7)); } });
      const prev = m.previousClose ?? (range === "1d" ? m.chartPreviousClose : null);
      let pct = m.regularMarketChangePercent ?? (prev ? ((m.regularMarketPrice - prev) / prev) * 100 : null);
      return {
        symbol, price: m.regularMarketPrice, changePct: pct, currency: m.currency,
        name: m.longName || m.shortName || symbol, exchange: m.fullExchangeName || m.exchangeName,
        time: (m.regularMarketTime || 0) * 1000, hi52: m.fiftyTwoWeekHigh, lo52: m.fiftyTwoWeekLow,
        dayHi: m.regularMarketDayHigh, dayLo: m.regularMarketDayLow, prevClose: m.chartPreviousClose, t, c,
      };
    } catch (_) { /* next host */ }
  }
  return { symbol, error: "not_found" };
}

// ---------- Thai fuel prices ----------
let oilCache: any = null, oilAt = 0;
async function bangchak() {
  const r = await fetch("https://oil-price.bangchak.co.th/ApiOilPrice2/th", { headers: UA });
  if (!r.ok) throw new Error("bangchak " + r.status);
  const d = (await r.json())?.[0];
  const list = JSON.parse(d.OilList || "[]");
  return {
    remark: d.OilRemark2 || "", note: d.OilRemark || "", date: d.OilPriceDate || "",
    items: list.map((o: any) => ({
      name: o.OilName, today: +o.PriceToday || null, tomorrow: +o.PriceTomorrow || null, yesterday: +o.PriceYesterday || null,
      difTomorrow: o.PriceDifTomorrow != null ? +o.PriceDifTomorrow : null, difYesterday: o.PriceDifYesterday != null ? +o.PriceDifYesterday : null,
    })).filter((o: any) => o.today),
  };
}
async function ptt() {
  const body = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><CurrentOilPrice xmlns="http://www.pttor.com"><Language>th</Language></CurrentOilPrice></soap:Body></soap:Envelope>`;
  const r = await fetch("https://orapiweb.pttor.com/oilservice/OilPrice.asmx", {
    method: "POST", body, headers: { ...UA, "Content-Type": "text/xml; charset=utf-8", SOAPAction: '"http://www.pttor.com/CurrentOilPrice"' },
  });
  if (!r.ok) throw new Error("ptt " + r.status);
  const x = (await r.text()).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const items: any[] = [];
  let date = "";
  for (const m of x.matchAll(/<FUEL>([\s\S]*?)<\/FUEL>/g)) {
    const g = (k: string) => (m[1].match(new RegExp(`<${k}>([^<]*)</${k}>`)) || [])[1]?.trim();
    const price = +(g("PRICE") || 0);
    if (!price) continue;
    date = g("PRICE_DATE") || date;
    items.push({ name: g("PRODUCT"), today: price });
  }
  return { date, items };
}
async function oil() {
  if (oilCache && Date.now() - oilAt < 10 * 60_000) return oilCache;
  const [b, p] = await Promise.allSettled([bangchak(), ptt()]);
  oilCache = {
    bangchak: b.status === "fulfilled" ? b.value : { error: String((b as any).reason) },
    ptt: p.status === "fulfilled" ? p.value : { error: String((p as any).reason) },
    at: Date.now(),
  };
  oilAt = Date.now();
  return oilCache;
}

// Bitcoin Fear & Greed: CoinMarketCap's index (re-scored through the day) + Alternative.me (daily, the classic one)
let fngCache: any = null, fngAt = 0;
async function fng() {
  if (fngCache && Date.now() - fngAt < 5 * 60_000) return fngCache;
  const end = Math.floor(Date.now() / 1000), start = end - 90 * 86400;
  const [c, a] = await Promise.allSettled([
    fetch(`https://api.coinmarketcap.com/data-api/v3/fear-greed/chart?start=${start}&end=${end}`, { headers: UA }).then((r) => r.json()),
    fetch("https://api.alternative.me/fng/?limit=90", { headers: UA }).then((r) => r.json()),
  ]);
  const out: any = { at: Date.now() };
  if (c.status === "fulfilled" && c.value?.data) {
    const d = c.value.data, hv = d.historicalValues || {};
    const pick = (x: any) => (x ? { score: +x.score, name: x.name, t: +x.timestamp * 1000 } : null);
    out.cmc = {
      now: pick(hv.now), yesterday: pick(hv.yesterday), lastWeek: pick(hv.lastWeek), lastMonth: pick(hv.lastMonth),
      yearHigh: pick(hv.yearlyHigh), yearLow: pick(hv.yearlyLow),
      series: (d.dataList || []).map((x: any) => ({ t: +x.timestamp * 1000, v: +x.score, btc: +x.btcPrice || null })),
    };
  } else out.cmcError = c.status === "rejected" ? String(c.reason) : "no data";
  if (a.status === "fulfilled" && a.value?.data?.length) {
    const d = a.value.data;
    out.alt = {
      now: { score: +d[0].value, name: d[0].value_classification, t: +d[0].timestamp * 1000, nextIn: +d[0].time_until_update || null },
      series: d.slice().reverse().map((x: any) => ({ t: +x.timestamp * 1000, v: +x.value })),
    };
  } else out.altError = a.status === "rejected" ? String(a.reason) : "no data";
  if (out.cmc || out.alt) { fngCache = out; fngAt = Date.now(); }
  return out;
}

// ---------- Bitkub (Thai exchange, THB pairs) ----------
let bkCache: any = null, bkAt = 0;
async function bitkub() {
  if (bkCache && Date.now() - bkAt < 30_000) return bkCache;
  const r = await fetch("https://api.bitkub.com/api/market/ticker", { headers: UA });
  if (!r.ok) throw new Error("bitkub " + r.status);
  const d = await r.json();
  const items = Object.entries(d).filter(([k]) => k.startsWith("THB_")).map(([k, v]: [string, any]) => ({
    code: k.slice(4), price: +v.last, changePct: +v.percentChange, hi: +v.high24hr, lo: +v.low24hr, volTHB: +v.quoteVolume, frozen: !!v.isFrozen,
  })).sort((a, b) => b.volTHB - a.volTHB);
  bkCache = { items, at: Date.now() }; bkAt = Date.now();
  return bkCache;
}
const BK_RES: Record<string, [string, number]> = { "1d": ["15", 1], "5d": ["60", 5], "1mo": ["1D", 31], "3mo": ["1D", 92], "6mo": ["1D", 183], "1y": ["1D", 366], "5y": ["1W", 1830], "max": ["1W", 3650] };
async function bkChart(code: string, range: string) {
  const [res, days] = BK_RES[range] || BK_RES["1mo"];
  const to = Math.floor(Date.now() / 1000), from = to - days * 86400;
  const [h, t] = await Promise.all([
    fetch(`https://api.bitkub.com/tradingview/history?symbol=${code}_THB&resolution=${res}&from=${from}&to=${to}`, { headers: UA }).then((r) => r.json()),
    bitkub(),
  ]);
  const q = t.items.find((x: any) => x.code === code);
  if (!q) return { symbol: `BKUB:${code}`, error: "not_found" };
  const tt: number[] = (h?.t || []).map((x: number) => x * 1000), c: number[] = (h?.c || []).map((x: number) => +x);
  return { symbol: `BKUB:${code}`, price: q.price, changePct: q.changePct, currency: "THB", name: `${code}/THB`, exchange: "Bitkub", time: t.at, dayHi: q.hi, dayLo: q.lo, hi52: c.length > 300 ? Math.max(...c.slice(-365)) : undefined, lo52: c.length > 300 ? Math.min(...c.slice(-365)) : undefined, t: tt, c };
}

async function search(q: string) {
  const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`, { headers: UA });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.quotes || [])
    .filter((x: any) => x.symbol)
    .map((x: any) => ({ symbol: x.symbol, name: x.longname || x.shortname || x.symbol, type: x.quoteType, exchange: x.exchDisp || x.exchange }));
}


// ---------- Yahoo crumb (needed by quoteSummary and the batch quote API) ----------
let crumb: { c: string; cookie: string; at: number } | null = null;
async function yCrumb(force = false) {
  if (!force && crumb && Date.now() - crumb.at < 3600_000) return crumb;
  const r1 = await fetch("https://fc.yahoo.com/", { headers: UA, redirect: "manual" });
  const raw = (r1.headers as any).getSetCookie ? (r1.headers as any).getSetCookie() : [r1.headers.get("set-cookie") || ""];
  const cookie = raw.map((c: string) => c.split(";")[0]).filter(Boolean).join("; ");
  const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { ...UA, Cookie: cookie } });
  const c = (await r2.text()).trim();
  if (!r2.ok || !c || c.includes("<")) throw new Error("crumb " + r2.status);
  crumb = { c, cookie, at: Date.now() };
  return crumb;
}
async function yGet(path: string) {
  for (let i = 0; i < 2; i++) {
    const k = await yCrumb(i > 0);
    const r = await fetch(`https://query2.finance.yahoo.com${path}${path.includes("?") ? "&" : "?"}crumb=${encodeURIComponent(k.c)}`, { headers: { ...UA, Cookie: k.cookie } });
    if (r.status === 401 || r.status === 403) continue;
    if (!r.ok) throw new Error("yahoo " + r.status);
    return r.json();
  }
  throw new Error("yahoo auth");
}
const raw = (v: any) => (v && typeof v === "object" ? v.raw ?? null : v ?? null);

// ---------- CoinGecko (crypto profile + market cap) ----------
const cgCache = new Map<string, any>();
async function cg(path: string, ttl = 600_000) {
  const hit = cgCache.get(path);
  if (hit && Date.now() - hit.at < ttl) return hit.d;
  const r = await fetch(`https://api.coingecko.com/api/v3${path}`, { headers: { ...UA, accept: "application/json" } });
  if (!r.ok) { if (hit) return hit.d; throw new Error("coingecko " + r.status); }
  const d = await r.json();
  cgCache.set(path, { d, at: Date.now() });
  return d;
}
async function coinProfile(code: string) {
  const mk = await cg(`/coins/markets?vs_currency=usd&symbols=${code.toLowerCase()}&include_tokens=top`);
  const m = (mk || []).sort((a: any, b: any) => (b.market_cap || 0) - (a.market_cap || 0))[0];
  if (!m) return { kind: "crypto", error: "not_found" };
  let info: any = {};
  try { info = await cg(`/coins/${m.id}?localization=true&tickers=false&market_data=false&community_data=false&developer_data=false`, 86400_000); } catch (_) { /* market data is enough */ }
  const strip = (h: string) => (h || "").replace(/<[^>]+>/g, "").replace(/\r?\n\r?\n/g, "\n").trim();
  return {
    kind: "crypto", name: m.name, rank: m.market_cap_rank, marketCap: m.market_cap, currency: "USD",
    circulating: m.circulating_supply, maxSupply: m.max_supply, ath: m.ath, athDate: m.ath_date,
    descTh: strip(info?.description?.th || ""), desc: strip(info?.description?.en || ""),
    website: info?.links?.homepage?.[0] || null, since: info?.genesis_date || null, categories: (info?.categories || []).filter(Boolean).slice(0, 4),
  };
}
async function fundProfile(symbol: string) {
  const id = symbol.slice(5);
  const r = await fetch(`${FN_API}/v2/public/funds/${id}`, { headers: UA });
  if (!r.ok) return { kind: "fund", error: "not_found" };
  const d = (await r.json())?.data || {};
  return {
    kind: "fund", name: d.name_th || d.name_en, nameEn: d.name_en, code: d.short_code, amc: d.amc_name_en, category: d.aimc_category_name_th || d.aimc_category_name_en,
    broad: d.aimc_broad_category_name_th, risk: d.risk_spectrum || d.risk_level, fxRisk: d.exchange_rate_risk_spectrum, policy: d.fund_short_desc || d.investment_strategy || null,
    expense: d.net_expense_ratio ?? null, mgmtFee: d.real_management_fee ?? null, frontFee: d.real_front_end_fee ?? null, backFee: d.real_back_end_fee ?? null,
    minFirst: d.minimum_initial ?? null, tax: d.tax_saving_fund || d.fund_tax_type || null, dividend: d.dividend_policy || null, inception: d.inception_date || null,
    feeder: d.main_feeder_fund || null, factSheet: d.fund_fact_sheet || null, currency: d.currency || "THB",
  };
}
async function profile(symbol: string) {
  if (symbol.startsWith("FUND:")) return fundProfile(symbol);
  if (symbol.startsWith("BKUB:")) return coinProfile(symbol.slice(5));
  if (/-USD$/.test(symbol)) return coinProfile(symbol.replace(/-USD$/, ""));
  const j = await yGet(`/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,price,summaryDetail,defaultKeyStatistics,fundProfile,summaryProfile`);
  const r = j?.quoteSummary?.result?.[0] || {};
  const ap = r.assetProfile || r.summaryProfile || {}, pr = r.price || {}, sd = r.summaryDetail || {}, ks = r.defaultKeyStatistics || {}, fp = r.fundProfile || {};
  return {
    kind: pr.quoteType || "EQUITY", name: pr.longName || pr.shortName || symbol, exchange: pr.exchangeName, currency: pr.currency,
    marketCap: raw(pr.marketCap) ?? raw(sd.marketCap), totalAssets: raw(sd.totalAssets), pe: raw(sd.trailingPE), fwdPe: raw(sd.forwardPE), dividendYield: raw(sd.dividendYield) ?? raw(sd.yield),
    beta: raw(sd.beta), hi52: raw(sd.fiftyTwoWeekHigh), lo52: raw(sd.fiftyTwoWeekLow), shares: raw(ks.sharesOutstanding),
    sector: ap.sector || null, industry: ap.industry || null, country: ap.country || null, city: ap.city || null, employees: ap.fullTimeEmployees || null,
    website: ap.website || null, desc: ap.longBusinessSummary || null, family: fp.family || null, category: fp.categoryName || null, expense: raw(fp.feesExpensesInvestment?.annualReportExpenseRatio),
  };
}

// ---------- the world's 10 most valuable assets ----------
const TOP_CANDIDATES = "NVDA,AAPL,MSFT,GOOGL,AMZN,META,AVGO,TSM,TSLA,BRK-B,2222.SR,LLY,JPM,WMT,V,ORCL,XOM,MA,NFLX,COST,0700.HK,005930.KS,ASML,UNH,JNJ,PG,HD,BAC,ABBV,PLTR,AMD,SAP,MC.PA,1398.HK,600519.SS,NVO,KO,CSCO,ROG.SW,NESN.SW,7203.T";
const OZ_PER_T = 32150.7466;
const METALS = [{ sym: "GC=F", name: "ทองคำ", nameEn: "Gold", tonnes: 216265 }, { sym: "SI=F", name: "เงิน (Silver)", nameEn: "Silver", tonnes: 1751000 }];
let topCache: any = null, topAt = 0;
async function top10() {
  if (topCache && Date.now() - topAt < 15 * 60_000) return topCache;
  const j = await yGet(`/v7/finance/quote?symbols=${encodeURIComponent(TOP_CANDIDATES + ",GC=F,SI=F")}`);
  const qs: any[] = j?.quoteResponse?.result || [];
  // market caps of non-USD listings are converted with today's FX
  const ccys = [...new Set(qs.map((q) => q.currency).filter((c) => c && c !== "USD"))];
  const fx: Record<string, number> = { USD: 1 };
  if (ccys.length) {
    const f = await yGet(`/v7/finance/quote?symbols=${encodeURIComponent(ccys.map((c) => `${c}USD=X`).join(","))}`);
    for (const q of f?.quoteResponse?.result || []) fx[q.symbol.slice(0, 3)] = q.regularMarketPrice;
  }
  const rows: any[] = [];
  for (const q of qs) {
    const metal = METALS.find((m) => m.sym === q.symbol);
    if (metal) { rows.push({ symbol: q.symbol, name: metal.name, nameEn: metal.nameEn, kind: "metal", marketCap: q.regularMarketPrice * metal.tonnes * OZ_PER_T, price: q.regularMarketPrice, changePct: q.regularMarketChangePercent, currency: "USD" }); continue; }
    if (!q.marketCap) continue;
    const rate = q.currency === "USD" ? 1 : fx[q.currency];
    if (!rate) continue;
    // a few listings quote in sub-units (pence, etc.)
    const unit = q.currency === "GBp" || q.currency === "ZAc" || q.currency === "ILA" ? 0.01 : 1;
    rows.push({ symbol: q.symbol, name: q.longName || q.shortName, kind: "stock", marketCap: q.marketCap * rate * unit, price: q.regularMarketPrice, changePct: q.regularMarketChangePercent, currency: q.currency, country: q.region });
  }
  try {
    const mk = await cg("/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=5&page=1", 300_000);
    for (const c of mk || []) rows.push({ symbol: `${String(c.symbol).toUpperCase()}-USD`, name: c.name, kind: "crypto", marketCap: c.market_cap, price: c.current_price, changePct: c.price_change_percentage_24h, currency: "USD" });
  } catch (_) { /* crypto optional */ }
  rows.sort((a, b) => b.marketCap - a.marketCap);
  topCache = { items: rows.slice(0, 10), next: rows.slice(10, 20), at: Date.now() }; topAt = Date.now();
  return topCache;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  try {
    if (url.searchParams.get("oil")) return json(await oil());
    if (url.searchParams.get("fng")) return json(await fng());
    if (url.searchParams.get("bitkub")) return json(await bitkub());
    if (url.searchParams.get("top")) return json(await top10());
    const pf = url.searchParams.get("profile");
    if (pf) return json({ symbol: pf, ...(await profile(pf)) });
    const bk = url.searchParams.get("bkchart");
    if (bk) return json(await bkChart(bk.toUpperCase(), url.searchParams.get("range") || "1mo"));
    const ch = url.searchParams.get("chart");
    if (ch) return json(await chart(ch, url.searchParams.get("range") || "1mo"));
    const sp = url.searchParams.get("spark");
    if (sp) {
      const list = sp.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
      const range = url.searchParams.get("range") || "1mo";
      return json({ quotes: await Promise.all(list.map((s) => s.startsWith("FUND:") ? fundQuote(s) : s.startsWith("BKUB:") ? bkChart(s.slice(5), range) : chart(s, range))), at: Date.now() });
    }
    const h = url.searchParams.get("hist");
    if (h) return json(await hist(h, url.searchParams.get("date") || new Date().toISOString().slice(0, 10)));
    const fq = url.searchParams.get("funds");
    if (fq) return json({ results: await fundSearch(fq) });
    const q = url.searchParams.get("search");
    if (q) return json({ results: await search(q) });
    const syms = (url.searchParams.get("symbols") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 40);
    if (!syms.length) return json({ error: "symbols or search required" }, 400);
    const quotes = await Promise.all(syms.map(quote));
    return json({ quotes, at: Date.now() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
