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

async function quote(symbol: string) {
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
