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

  // ---- slip images (MacroDroid file body / iOS Shortcuts file / multipart) → private bucket + inbox placeholder ----
  const ctype = req.headers.get("content-type") || "";
  if (req.method === "POST" && (ctype.startsWith("image/") || ctype.startsWith("multipart/") || ctype.startsWith("application/octet-stream") || url.searchParams.has("slip"))) {
    let bytes: Uint8Array | null = null, type = ctype.startsWith("image/") ? ctype : "image/jpeg";
    if (ctype.startsWith("multipart/")) {
      const fd = await req.formData();
      const f = [...fd.values()].find((v) => v instanceof File) as File | undefined;
      if (f) { bytes = new Uint8Array(await f.arrayBuffer()); type = f.type || type; }
    } else {
      bytes = new Uint8Array(await req.arrayBuffer());
    }
    if (bytes && bytes.length > 100 && !(bytes[0] === 0x7b /* "{" JSON */)) {
      if (bytes.length > 8_000_000) return json({ ok: false, error: "image too large" }, 413);
      const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const path = `${tok.user_id}/${h}.${ext}`;
      const up = await sb.storage.from("vault-slips").upload(path, bytes, { contentType: type, upsert: true });
      if (up.error) return json({ ok: false, error: up.error.message }, 500);
      const now = new Date();
      const id = "img-" + h;
      const { error } = await sb.from("vault_items").upsert(
        { user_id: tok.user_id, id, kind: "inbox", data: { id, raw: "", image: path, at: now.toISOString(), source: "slip-upload" }, rev: Date.now(), deleted: false },
        { onConflict: "user_id,id", ignoreDuplicates: true },
      );
      if (error) return json({ ok: false, error: error.message }, 500);
      await sb.from("vault_tokens").update({ last_used_at: now.toISOString() }).eq("token_hash", await hex(token));
      return json({ ok: true, id, slip: true });
    }
    if (bytes) { // not an image after all: treat as text body below
      const raw = new TextDecoder().decode(bytes);
      return handleText(raw);
    }
  }
  return handleText(null);

  async function handleText(preRaw: string | null) {
  // accept JSON {text,title,app}, form data, plain text, or ?text= for GET
  let text = url.searchParams.get("text") || "", title = url.searchParams.get("title") || "", app = url.searchParams.get("app") || "";
  if (req.method === "POST") {
    const raw = preRaw ?? await req.text();
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
  }
});
