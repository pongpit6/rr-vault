// Receives bank notification text and K PLUS result emails (sent by the owner's Gmail Apps Script).
// Emails become transactions directly; other text drops into the inbox.
// Auth: personal token (?t=... or x-vault-token header), stored hashed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseKplus, guessCategory } from "./kplus.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vault-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const hex = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map((b) => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  const token = url.searchParams.get("t") || req.headers.get("x-vault-token");
  if (!token || token.length < 20) return json({ ok: false, error: "missing token" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: tok } = await sb.from("vault_tokens").select("user_id").eq("token_hash", await hex(token)).maybeSingle();
  if (!tok) return json({ ok: false, error: "invalid token" }, 401);

  // accept JSON {text,title,app}, form data, plain text, or ?text= for GET
  let text = url.searchParams.get("text") || "", title = url.searchParams.get("title") || "", app = url.searchParams.get("app") || "";
  let source = "", mailId = "";
  if (req.method === "POST") {
    const raw = await req.text();
    try { const j = JSON.parse(raw); text = j.text ?? j.notification ?? j.body ?? text; title = j.title ?? title; app = j.app ?? app; source = j.source || ""; mailId = j.mailId || ""; }
    catch { text = raw || text; }
  }
  if (source === "email") {
    const res = await fromEmail(sb, tok.user_id, title, text, mailId);
    await sb.from("vault_tokens").update({ last_used_at: new Date().toISOString() }).eq("token_hash", await hex(token));
    return json(res, res.ok ? 200 : 500);
  }
  const msg = [title, text].map((x) => String(x || "").trim()).filter(Boolean).join(" | ").slice(0, 1500);
  if (!/\d/.test(msg)) return json({ ok: true, ignored: "no numbers" });

  const now = new Date();
  const day = now.toISOString().slice(0, 13); // same text within the same hour = duplicate notification
  const id = "inb-" + (await hex(tok.user_id + msg + day)).slice(0, 24);
  const data = { id, raw: msg, app: String(app).slice(0, 60), at: now.toISOString(), source: "webhook" };
  const { error } = await sb.from("vault_items").upsert(
    { user_id: tok.user_id, id, kind: "inbox", data, rev: Date.now(), deleted: false },
    { onConflict: "user_id,id", ignoreDuplicates: true },
  );
  if (error) return json({ ok: false, error: error.message }, 500);
  await sb.from("vault_tokens").update({ last_used_at: now.toISOString() }).eq("token_hash", await hex(token));
  return json({ ok: true, id });
});

// ---------- K PLUS email -> transaction ----------
// deno-lint-ignore no-explicit-any
async function fromEmail(sb: any, uid: string, subject: string, body: string, mailId: string) {
  const p = parseKplus(subject, body);
  if (!p) return { ok: true, ignored: "not a K PLUS transaction" };
  const ref = p.ref || "m" + (await hex(mailId || subject + body)).slice(0, 20);
  const id = "txn-kp-" + ref;
  const rows = (q: any) => q.then((r: any) => r.data || []);
  // already recorded (new or merged)?
  const extra = { ref, src: "email", time: p.time, bankBal: p.bal, bankLast4: p.last4 };
  const seen = await rows(sb.from("vault_items").select("id,data").eq("user_id", uid).eq("kind", "txn").or(`id.eq.${id},data->>ref.eq.${ref},data->>slipRef.eq.${ref}`).limit(1));
  if (seen.length) {
    const s0 = seen[0];
    // a slip imported earlier: keep it, just add the bank balance from the email
    if (s0.data.bankBal == null && p.bal != null) await sb.from("vault_items").update({ data: { ...s0.data, ...extra, time: s0.data.time || p.time }, rev: Date.now() }).eq("user_id", uid).eq("id", s0.id);
    return { ok: true, dup: true, id: s0.id };
  }

  const st = (await rows(sb.from("vault_items").select("data").eq("user_id", uid).eq("id", "settings").limit(1)))[0]?.data || {};
  const cfg = st.emailAuto || {};
  if (cfg.off) return { ok: true, ignored: "paused" };
  const account = cfg.account || "acc-cash";
  const total = Math.round((p.amount + (p.fee || 0)) * 100) / 100;
  const kind = p.income ? "income" : "expense";

  // a matching entry the owner typed in by hand (same account and amount, within a day): attach instead of duplicating
  const d = new Date(p.date + "T00:00:00Z");
  const near = [-1, 0, 1].map((k) => new Date(d.getTime() + k * 864e5).toISOString().slice(0, 10));
  const cands = (await rows(sb.from("vault_items").select("id,data").eq("user_id", uid).eq("kind", "txn").eq("deleted", false)
    .eq("data->>account", account).in("data->>date", near)))
    .filter((r: any) => !r.data.ref && r.data.kind === kind && Math.abs(Number(r.data.amount) - total) < 0.005);
  if (cands.length) {
    const best = cands.sort((a: any, b: any) => Math.abs(Date.parse(a.data.date) - d.getTime()) - Math.abs(Date.parse(b.data.date) - d.getTime()))[0];
    const { error } = await sb.from("vault_items").update({ data: { ...best.data, ...extra }, rev: Date.now() }).eq("user_id", uid).eq("id", best.id);
    return error ? { ok: false, error: error.message } : { ok: true, matched: best.id };
  }

  const category = guessCategory(st.merchantMap || {}, p.payee) || (kind === "income" ? "cat-uncat" : "cat-uncat");
  const data = {
    id, date: p.date, kind, amount: total, account, category, note: p.payee || (p.type === "promptpay" ? "โอนพร้อมเพย์" : "K PLUS"),
    counterparty: p.payee || null, fee: p.fee || 0, ...extra, createdAt: new Date().toISOString(),
  };
  const { error } = await sb.from("vault_items").upsert(
    { user_id: uid, id, kind: "txn", data, rev: Date.now(), deleted: false },
    { onConflict: "user_id,id", ignoreDuplicates: true },
  );
  return error ? { ok: false, error: error.message } : { ok: true, id, category };
}
