// Market tab sorts for LifeQuest: market cap (converted to USD so mixed HK/China lists sort fairly)
// and the 7-day change, for up to 200 Yahoo symbols per call.
// GET ?symbols=PTT.BK,AOT.BK,...  ->  { rows: { sym: { cap, chg7 } }, at }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "max-age=600" } });

let crumb: { c: string; cookie: string; at: number } | null = null;
async function yCrumb(force = false) {
  if (!force && crumb && Date.now() - crumb.at < 3600_000) return crumb;
  const r1 = await fetch("https://fc.yahoo.com/", { headers: UA, redirect: "manual" });
  // deno-lint-ignore no-explicit-any
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

// deno-lint-ignore no-explicit-any
const cache = new Map<string, { at: number; v: any }>();
const chunks = (a: string[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function rank(symbols: string[]) {
  const out: Record<string, { cap: number | null; chg7: number | null }> = {};
  const todo = symbols.filter((s) => { const c = cache.get(s); if (c && Date.now() - c.at < 6 * 3600_000) { out[s] = c.v; return false; } return true; });
  if (!todo.length) return out;
  const caps: Record<string, { cap: number | null; ccy: string }> = {};
  await Promise.all(chunks(todo, 100).map(async (part) => {
    try {
      const j = await yGet(`/v7/finance/quote?symbols=${encodeURIComponent(part.join(","))}`);
      for (const q of j?.quoteResponse?.result || []) caps[q.symbol] = { cap: q.marketCap ?? null, ccy: q.currency };
    } catch (_) { /* leave blank */ }
  }));
  const ccys = [...new Set(Object.values(caps).map((c) => c.ccy).filter((c) => c && c !== "USD"))];
  const fx: Record<string, number> = { USD: 1 };
  if (ccys.length) {
    try {
      const f = await yGet(`/v7/finance/quote?symbols=${encodeURIComponent(ccys.map((c) => `${c}USD=X`).join(","))}`);
      for (const q of f?.quoteResponse?.result || []) fx[q.symbol.slice(0, 3)] = q.regularMarketPrice;
    } catch (_) { /* those caps stay blank */ }
  }
  const chg: Record<string, number | null> = {};
  const weekAgo = Date.now() / 1000 - 7 * 86400;
  await Promise.all(chunks(todo, 20).map(async (part) => {
    try {
      const j = await yGet(`/v8/finance/spark?symbols=${encodeURIComponent(part.join(","))}&range=1mo&interval=1d`);
      // deno-lint-ignore no-explicit-any
      const list: any[] = j?.spark?.result ? j.spark.result.map((r: any) => ({ symbol: r.symbol, ...(r.response?.[0] || {}) })) : Object.entries(j || {}).map(([symbol, v]: any) => ({ symbol, ...v }));
      for (const r of list) {
        const ts: number[] = r.timestamp || [], cl: number[] = r.close || r.indicators?.quote?.[0]?.close || [];
        const pts = ts.map((t, i) => [t, cl[i]]).filter((x) => x[1] != null);
        if (pts.length < 2) continue;
        const last = pts[pts.length - 1][1];
        let base = pts[0][1];
        for (const [t, c] of pts) if (t <= weekAgo) base = c;
        chg[r.symbol] = base ? ((last - base) / base) * 100 : null;
      }
    } catch (_) { /* leave blank */ }
  }));
  for (const s of todo) {
    const c = caps[s], unit = c?.ccy === "GBp" || c?.ccy === "ZAc" || c?.ccy === "ILA" ? 0.01 : 1;
    const rate = c?.ccy ? (c.ccy === "USD" ? 1 : fx[c.ccy]) : null;
    const v = { cap: c?.cap && rate ? c.cap * rate * unit : null, chg7: chg[s] ?? null };
    out[s] = v;
    if (v.cap != null || v.chg7 != null) cache.set(s, { at: Date.now(), v });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const syms = (new URL(req.url).searchParams.get("symbols") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200);
    if (!syms.length) return json({ error: "symbols required" }, 400);
    return json({ rows: await rank(syms), at: Date.now() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
