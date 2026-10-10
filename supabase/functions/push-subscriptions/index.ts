import { createClient } from "npm:@supabase/supabase-js@2.103.3";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" },
});
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !anonKey || !serviceKey || !token) return json({ error: "Unauthorized" }, 401);
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: "Bearer " + token } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const { action, role } = body;
  if ((action !== "subscribe" && action !== "unsubscribe") || (role !== "courier" && role !== "partner"))
    return json({ error: "Ação ou perfil inválido" }, 400);
  const admin = createClient(url, serviceKey);
  const eligibility = role === "courier"
    ? await admin.from("courier_profiles").select("id").eq("user_id", user.id).eq("status", "approved").limit(1)
    : await admin.from("partner_stores").select("id").eq("owner_id", user.id).eq("status", "approved").limit(1);
  if (eligibility.error || !eligibility.data?.length) return json({ error: "Perfil não autorizado" }, 403);
  if (action === "unsubscribe") {
    const endpoint = body.endpoint;
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2048)
      return json({ error: "Endpoint inválido" }, 400);
    const { error } = await admin.from("web_push_subscriptions").delete()
      .eq("user_id", user.id).eq("role", role).eq("endpoint", endpoint);
    return error ? json({ error: "Não foi possível cancelar" }, 500) : json({ ok: true });
  }
  const subscription = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2048
      || typeof p256dh !== "string" || p256dh.length > 512
      || typeof auth !== "string" || auth.length > 512)
    return json({ error: "Assinatura inválida" }, 400);
  // Never allow one user to take ownership of another user's endpoint.
  const { data: existing, error: lookupError } = await admin.from("web_push_subscriptions")
    .select("user_id").eq("endpoint", endpoint).maybeSingle();
  if (lookupError) return json({ error: "Falha ao consultar aparelho" }, 500);
  if (existing && existing.user_id !== user.id) return json({ error: "Aparelho já vinculado" }, 409);
  const { error } = await admin.from("web_push_subscriptions").upsert({
    endpoint, user_id: user.id, role, p256dh, auth_secret: auth, updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  return error ? json({ error: "Não foi possível cadastrar aparelho" }, 500) : json({ ok: true });
});
