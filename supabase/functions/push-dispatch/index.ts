import { createClient } from "npm:@supabase/supabase-js@2.103.3";
import webpush from "npm:web-push@3.6.7";

// Server-only dispatch. Set PUSH_DISPATCH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT in Supabase Edge Function secrets. Never ship private keys to the browser.
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("PUSH_DISPATCH_SECRET");
  if (!secret || req.headers.get("x-push-dispatch-secret") !== secret)
    return new Response("Unauthorized", { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!url || !key || !publicKey || !privateKey || !subject)
    return new Response("Missing server configuration", { status: 503 });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data: jobs, error } = await db.from("web_push_outbox")
    .select("id,kind,target_id,recipient_id,attempts").is("sent_at", null)
    .lt("attempts", 5).order("created_at").limit(30);
  if (error) return new Response("Outbox query failed", { status: 500 });
  let delivered = 0;
  for (const job of jobs || []) {
    // Recheck the real-time business state before sending stale opportunities.
    let eligible = false;
    if (job.kind === "courier_job") {
      const [task, worker] = await Promise.all([
        db.from("courier_jobs").select("id,status,courier_id").eq("id", job.target_id).maybeSingle(),
        db.from("courier_profiles").select("id").eq("user_id", job.recipient_id).eq("status","approved").eq("is_online",true).maybeSingle(),
      ]);
      eligible = !!task.data && task.data.status === "searching" && !task.data.courier_id && !!worker.data;
    } else {
      const offers = await db.from("partner_offers")
        .select("store_id,declined,available_at").eq("request_id",job.target_id).eq("declined",false).lte("available_at",new Date().toISOString());
      const stores = await db.from("partner_stores").select("id").eq("owner_id",job.recipient_id).eq("status","approved").eq("is_open",true);
      eligible = !!offers.data?.some((o) => stores.data?.some((s) => s.id === o.store_id));
    }
    if (!eligible) {
      await db.from("web_push_outbox").update({ sent_at: new Date().toISOString() }).eq("id",job.id);
      continue;
    }
    const subscriptions = await db.from("web_push_subscriptions")
      .select("id,endpoint,p256dh,auth_secret").eq("user_id",job.recipient_id)
      .eq("role",job.kind === "courier_job" ? "courier" : "partner");
    if (subscriptions.error) continue;
    let success = false;
    for (const sub of subscriptions.data || []) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_secret },
        }, JSON.stringify({
          title: job.kind === "courier_job" ? "Nova oportunidade de entrega" : "Novo pedido para sua loja",
          body: job.kind === "courier_job" ? "Abra o aplicativo para avaliar a corrida." : "Abra o painel para conferir o pedido.",
          role: job.kind === "courier_job" ? "courier" : "partner",
          tag: job.kind + "-" + job.target_id,
        }), { TTL: 90, urgency: "high" });
        success = true;
      } catch (failure) {
        const status = (failure as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await db.from("web_push_subscriptions").delete().eq("id", sub.id);
      }
    }
    await db.from("web_push_outbox").update({
      attempts: job.attempts + 1,
      ...(success ? { sent_at: new Date().toISOString() } : {}),
    }).eq("id", job.id).is("sent_at",null);
    if (success) delivered++;
  }
  return new Response(JSON.stringify({ checked: jobs?.length || 0, delivered }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
});
