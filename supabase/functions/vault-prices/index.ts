// Price proxy for รณกฤต เรืองชินศิริ Vault.
// GET ?symbols=AAPL,PTT.BK,GC=F,THB=X   -> latest quotes (Yahoo Finance chart API)
// GET ?search=apple                      -> symbol search (Yahoo Finance)
// GET ?spark=AAPL,0700.HK&range=1mo      -> quote + close series per symbol (Market rows)
// GET ?chart=AAPL&range=1y               -> one symbol's chart (Market detail)
// GET ?oil=1                             -> Thai retail fuel prices (Bangchak + PTT OR)
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

async function search(q: string) {
  const r = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`, { headers: UA });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.quotes || [])
    .filter((x: any) => x.symbol)
    .map((x: any) => ({ symbol: x.symbol, name: x.longname || x.shortname || x.symbol, type: x.quoteType, exchange: x.exchDisp || x.exchange }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  try {
    if (url.searchParams.get("oil")) return json(await oil());
    const ch = url.searchParams.get("chart");
    if (ch) return json(await chart(ch, url.searchParams.get("range") || "1mo"));
    const sp = url.searchParams.get("spark");
    if (sp) {
      const list = sp.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
      const range = url.searchParams.get("range") || "1mo";
      return json({ quotes: await Promise.all(list.map((s) => s.startsWith("FUND:") ? fundQuote(s) : chart(s, range))), at: Date.now() });
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
