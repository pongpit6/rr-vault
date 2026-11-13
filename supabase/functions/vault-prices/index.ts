// Price proxy for รณกฤต เรืองชินศิริ Vault.
// GET ?symbols=AAPL,PTT.BK,GC=F,THB=X   -> latest quotes (Yahoo Finance chart API)
// GET ?search=apple                      -> symbol search (Yahoo Finance)
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
