// Receives bank notification text (from MacroDroid on Android or an iOS Shortcut) and drops it
// into the owner's Vault inbox. Auth: personal token (?t=... or x-vault-token header), stored hashed.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
  if (req.method === "POST") {
    const raw = await req.text();
    try { const j = JSON.parse(raw); text = j.text ?? j.notification ?? j.body ?? text; title = j.title ?? title; app = j.app ?? app; }
    catch { text = raw || text; }
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
