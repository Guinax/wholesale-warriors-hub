import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const html = (message: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Melhor Envio</title><body style="font-family:system-ui;padding:32px;max-width:640px;margin:auto"><h1>Melhor Envio</h1><p>${message}</p><p>Você pode fechar esta aba e voltar ao painel administrativo.</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );

const envConfig = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const clientId = Deno.env.get("MELHOR_ENVIO_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("MELHOR_ENVIO_CLIENT_SECRET") ?? "";
  const redirectUri = Deno.env.get("MELHOR_ENVIO_REDIRECT_URI") ?? (supabaseUrl ? `${supabaseUrl}/functions/v1/melhor-envio-callback` : "");
  const userAgent = Deno.env.get("MELHOR_ENVIO_USER_AGENT") ?? "";
  const baseUrl = (Deno.env.get("MELHOR_ENVIO_BASE_URL") ?? "https://melhorenvio.com.br").replace(/\/$/, "");
  return { supabaseUrl, anonKey, serviceKey, clientId, clientSecret, redirectUri, userAgent, baseUrl };
};

const hasProviderConfig = (c: ReturnType<typeof envConfig>) =>
  Boolean(c.clientId && c.clientSecret && c.redirectUri && c.userAgent);

const requireAdmin = async (req: Request, c: ReturnType<typeof envConfig>) => {
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token || !c.supabaseUrl || !c.anonKey || !c.serviceKey) return null;

  const authClient = createClient(c.supabaseUrl, c.anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;

  const admin = createClient(c.supabaseUrl, c.serviceKey, { auth: { persistSession: false } });
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return role ? { user, admin } : null;
};

const randomState = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });
  const c = envConfig();

  if (req.method === "POST") {
    const auth = await requireAdmin(req, c);
    if (!auth) return reply({ error: "Acesso administrativo necessário." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "status";

    const { data: tokenRows } = await auth.admin.rpc("service_melhor_envio_token");
    const token = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows;
    const connected = Boolean(token?.access_token && token?.refresh_token);
    const expiresAt = token?.expires_at ?? null;
    const refreshExpiresAt = token?.refresh_expires_at ?? null;

    if (action === "status") {
      return reply({
        configured: hasProviderConfig(c),
        connected,
        expires_at: expiresAt,
        refresh_expires_at: refreshExpiresAt,
        callback_url: c.redirectUri || null,
        environment: c.baseUrl.includes("sandbox.") ? "sandbox" : "production",
      });
    }

    if (action !== "start") return reply({ error: "Ação inválida." }, 400);
    if (!hasProviderConfig(c)) {
      return reply({
        error: "Credenciais do Melhor Envio ainda não estão configuradas no Supabase.",
        required_secrets: ["MELHOR_ENVIO_CLIENT_ID", "MELHOR_ENVIO_CLIENT_SECRET", "MELHOR_ENVIO_REDIRECT_URI", "MELHOR_ENVIO_USER_AGENT"],
      }, 503);
    }

    const state = randomState();
    const { error: stateError } = await auth.admin.rpc("service_melhor_envio_begin_oauth", { p_state: state });
    if (stateError) return reply({ error: "Não foi possível iniciar a autorização." }, 500);

    const params = new URLSearchParams({
      client_id: c.clientId,
      redirect_uri: c.redirectUri,
      response_type: "code",
      state,
      scope: "shipping-calculate",
    });
    return reply({ authorization_url: `${c.baseUrl}/oauth/authorize?${params.toString()}` });
  }

  if (req.method !== "GET") return reply({ error: "method_not_allowed" }, 405);
  if (!c.supabaseUrl || !c.serviceKey) return html("Serviço indisponível.", 503);

  const url = new URL(req.url);
  const providerError = url.searchParams.get("error");
  if (providerError) return html("A autorização foi cancelada ou recusada pelo Melhor Envio.", 400);

  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  if (!code) return reply({ ok: true, provider: "melhor_envio", status: hasProviderConfig(c) ? "ready" : "integration_not_configured" });
  if (!hasProviderConfig(c)) return html("As credenciais do Melhor Envio ainda não estão configuradas no servidor.", 503);
  if (state.length < 32) return html("Estado OAuth inválido. Reinicie a conexão pelo painel administrativo.", 400);

  const admin = createClient(c.supabaseUrl, c.serviceKey, { auth: { persistSession: false } });
  const { data: stateOk, error: stateError } = await admin.rpc("service_melhor_envio_consume_oauth_state", { p_state: state });
  if (stateError || stateOk !== true) return html("A autorização expirou ou não é válida. Reinicie a conexão pelo painel.", 400);

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirectUri,
    code,
  });

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(`${c.baseUrl}/oauth/token`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": c.userAgent,
      },
      body: tokenBody,
    });
  } catch {
    return html("Não foi possível contatar o Melhor Envio para concluir a autorização.", 502);
  }

  const tokenJson = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok) return html("O Melhor Envio recusou a troca do código de autorização. Verifique o aplicativo e o callback.", 502);

  const accessToken = typeof tokenJson?.access_token === "string" ? tokenJson.access_token : "";
  const refreshToken = typeof tokenJson?.refresh_token === "string" ? tokenJson.refresh_token : "";
  const tokenType = typeof tokenJson?.token_type === "string" ? tokenJson.token_type : "Bearer";
  const expiresIn = Number(tokenJson?.expires_in ?? 2592000);
  const scope = typeof tokenJson?.scope === "string" ? tokenJson.scope : null;

  if (accessToken.length < 20 || refreshToken.length < 20) return html("Resposta OAuth inválida recebida do Melhor Envio.", 502);

  const { error: saveError } = await admin.rpc("service_melhor_envio_store_token", {
    p_access_token: accessToken,
    p_refresh_token: refreshToken,
    p_token_type: tokenType,
    p_expires_in: Number.isFinite(expiresIn) ? Math.max(60, Math.trunc(expiresIn)) : 2592000,
    p_scope: scope,
  });
  if (saveError) return html("A autorização foi recebida, mas não foi possível armazenar o token com segurança.", 500);

  return html("Integração autorizada com sucesso.");
});