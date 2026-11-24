// 06:00 (Bangkok) fortune push. GET ?pub=1 → VAPID public key; POST {action:'test'} (user JWT) → a test push to your phones;
// POST {action:'morning'} with x-cron-key (pg_cron, 23:00 UTC) → every subscribed user gets today's digest.
// VAPID keys and the cron key live in public.push_config (RLS on, no policies → service role only) and are generated here.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "web-push";
import { morningDigest } from "https://pongpit6.github.io/rr-vault/push/fortune.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-key", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function config() {
  const { data } = await sb.from("push_config").select("*").eq("id", 1).single();
  if (data?.vapid_public && data?.vapid_private) return data;
  const k = webpush.generateVAPIDKeys();
  await sb.from("push_config").update({ vapid_public: k.publicKey, vapid_private: k.privateKey }).eq("id", 1);
  return { ...data, vapid_public: k.publicKey, vapid_private: k.privateKey };
}

async function sendTo(cfg: any, subs: any[], payload: (s: any) => Promise<any>) {
  webpush.setVapidDetails("mailto:noreply@lifequest.app", cfg.vapid_public, cfg.vapid_private);
  let sent = 0, gone = 0;
  for (const s of subs) {
    try {
      const msg = await payload(s);
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600, urgency: "normal" });
      await sb.from("push_subs").update({ last_sent: new Date().toISOString() }).eq("endpoint", s.endpoint); sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) { await sb.from("push_subs").delete().eq("endpoint", s.endpoint); gone++; }
      else console.log("push error", e?.statusCode, String(e?.body || e).slice(0, 200));
    }
  }
  return { sent, gone };
}
async function digestFor(userId: string) {
  const { data } = await sb.from("vault_items").select("data").eq("user_id", userId).eq("id", "fortune").eq("deleted", false).maybeSingle();
  const f = data?.data || null;
  if (f && f.alerts === false) return null;
  const d = morningDigest(f);
  return { ...d, tag: "fortune-morning", url: "./#fortune" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  try {
    const cfg = await config();
    if (req.method === "GET" && url.searchParams.get("pub")) return json({ key: cfg.vapid_public });
    const body = await req.json().catch(() => ({}));
    if (body.action === "morning") {
      if (req.headers.get("x-cron-key") !== cfg.cron_key) return json({ error: "forbidden" }, 403);
      const { data: subs } = await sb.from("push_subs").select("*");
      const cache = new Map();
      const r = await sendTo(cfg, (subs || []), async (s) => { if (!cache.has(s.user_id)) cache.set(s.user_id, await digestFor(s.user_id)); const m = cache.get(s.user_id); if (!m) throw { statusCode: 0, body: "alerts off" }; return m });
      return json({ ok: true, ...r });
    }
    // user actions need a signed-in user
    const jwt = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ error: "sign in first" }, 401);
    if (body.action === "test") {
      const { data: subs } = await sb.from("push_subs").select("*").eq("user_id", u.user.id);
      const m = (await digestFor(u.user.id)) || { title: "ทดสอบแจ้งเตือน", body: "แจ้งเตือนดวงถูกปิดอยู่" };
      const r = await sendTo(cfg, subs || [], async () => ({ ...m, title: `(ทดสอบ) ${m.title}` }));
      return json({ ok: true, ...r });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
