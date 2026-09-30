import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  destination_cep: z.string().regex(/^\d{8}$/),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    qty: z.number().int().min(1).max(100000),
  })).min(1).max(100),
});

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const envConfig = () => ({
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  clientId: Deno.env.get("MELHOR_ENVIO_CLIENT_ID") ?? "",
  clientSecret: Deno.env.get("MELHOR_ENVIO_CLIENT_SECRET") ?? "",
  userAgent: Deno.env.get("MELHOR_ENVIO_USER_AGENT") ?? "",
  baseUrl: (Deno.env.get("MELHOR_ENVIO_BASE_URL") ?? "https://melhorenvio.com.br").replace(/\/$/, ""),
  originCep: (Deno.env.get("MELHOR_ENVIO_ORIGIN_CEP") ?? "13495041").replace(/\D/g, ""),
});

const configured = (c: ReturnType<typeof envConfig>) =>
  Boolean(c.clientId && c.clientSecret && c.userAgent && /^\d{8}$/.test(c.originCep));

type TokenRow = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: string | null;
  refresh_expires_at?: string | null;
};

async function refreshToken(
  c: ReturnType<typeof envConfig>,
  admin: ReturnType<typeof createClient>,
  current: TokenRow,
): Promise<string | null> {
  const refresh = current.refresh_token ?? "";
  const refreshExpires = current.refresh_expires_at ? Date.parse(current.refresh_expires_at) : 0;
  if (refresh.length < 20 || (refreshExpires && refreshExpires <= Date.now())) return null;

  let response: Response;
  try {
    response = await fetch(`${c.baseUrl}/oauth/token`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": c.userAgent,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: c.clientId,
        client_secret: c.clientSecret,
        refresh_token: refresh,
      }),
    });
  } catch {
    return null;
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return null;

  const accessToken = typeof body?.access_token === "string" ? body.access_token : "";
  const refreshToken = typeof body?.refresh_token === "string" ? body.refresh_token : refresh;
  const tokenType = typeof body?.token_type === "string" ? body.token_type : "Bearer";
  const expiresIn = Number(body?.expires_in ?? 2592000);
  const scope = typeof body?.scope === "string" ? body.scope : null;
  if (accessToken.length < 20 || refreshToken.length < 20) return null;

  const { error } = await admin.rpc("service_melhor_envio_store_token", {
    p_access_token: accessToken,
    p_refresh_token: refreshToken,
    p_token_type: tokenType,
    p_expires_in: Number.isFinite(expiresIn) ? Math.max(60, Math.trunc(expiresIn)) : 2592000,
    p_scope: scope,
  });
  return error ? null : accessToken;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const c = envConfig();
  if (!c.supabaseUrl || !c.anonKey || !c.serviceKey) return reply({ error: "Serviço indisponível." }, 503);

  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!jwt) return reply({ error: "Autenticação necessária." }, 401);

  const authClient = createClient(c.supabaseUrl, c.anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
  if (authError || !user) return reply({ error: "Sessão inválida." }, 401);

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return reply({ error: "Dados de cotação inválidos." }, 400);

  if (!configured(c)) {
    return reply({ configured: false, connected: false, available: false, fallback: true, reason: "provider_not_configured" });
  }

  const admin = createClient(c.supabaseUrl, c.serviceKey, { auth: { persistSession: false } });
  const { data: tokenRows, error: tokenError } = await admin.rpc("service_melhor_envio_token");
  if (tokenError) return reply({ configured: true, connected: false, available: false, fallback: true, reason: "token_unavailable" });

  const tokenRow = (Array.isArray(tokenRows) ? tokenRows[0] : tokenRows) as TokenRow | undefined;
  if (!tokenRow?.access_token || !tokenRow?.refresh_token) {
    return reply({ configured: true, connected: false, available: false, fallback: true, reason: "not_connected" });
  }

  let accessToken = tokenRow.access_token;
  const expires = tokenRow.expires_at ? Date.parse(tokenRow.expires_at) : 0;
  if (!expires || expires <= Date.now() + 5 * 60_000) {
    accessToken = await refreshToken(c, admin, tokenRow) ?? "";
    if (!accessToken) {
      return reply({ configured: true, connected: false, available: false, fallback: true, reason: "token_refresh_failed" });
    }
  }

  const requested = new Map<string, number>();
  for (const item of parsed.data.items) requested.set(item.product_id, (requested.get(item.product_id) ?? 0) + item.qty);
  const ids = [...requested.keys()];

  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id,name,unit_price,wholesale_price,active,weight_kg,width_cm,height_cm,length_cm")
    .in("id", ids)
    .eq("active", true);
  if (productsError || !products || products.length !== ids.length) {
    return reply({ configured: true, connected: true, available: false, fallback: true, reason: "product_unavailable" });
  }

  const providerProducts: Array<Record<string, unknown>> = [];
  for (const product of products) {
    const qty = requested.get(String(product.id)) ?? 0;
    const weight = Number(product.weight_kg);
    const width = Number(product.width_cm);
    const height = Number(product.height_cm);
    const length = Number(product.length_cm);
    if (![weight, width, height, length].every((v) => Number.isFinite(v) && v > 0)) {
      return reply({ configured: true, connected: true, available: false, fallback: true, reason: "missing_product_dimensions" });
    }
    const unitValue = Number(qty >= 6 ? product.wholesale_price : product.unit_price);
    if (!Number.isFinite(unitValue) || unitValue <= 0) {
      return reply({ configured: true, connected: true, available: false, fallback: true, reason: "invalid_product_price" });
    }

    let remaining = qty;
    let chunk = 0;
    while (remaining > 0) {
      const quantity = Math.min(remaining, 100);
      providerProducts.push({
        id: `${product.id}-${chunk++}`,
        width,
        height,
        length,
        weight,
        insurance_value: Number(unitValue.toFixed(2)),
        quantity,
      });
      remaining -= quantity;
    }
  }

  const requestQuote = (token: string) => fetch(`${c.baseUrl}/api/v2/me/shipment/calculate`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": c.userAgent,
    },
    body: JSON.stringify({
      from: { postal_code: c.originCep },
      to: { postal_code: parsed.data.destination_cep },
      products: providerProducts,
      options: { receipt: false, own_hand: false },
    }),
  });

  let response: Response;
  try {
    response = await requestQuote(accessToken);
    if (response.status === 401) {
      const refreshed = await refreshToken(c, admin, { ...tokenRow, access_token: accessToken });
      if (!refreshed) {
        return reply({ configured: true, connected: false, available: false, fallback: true, reason: "token_refresh_failed" });
      }
      accessToken = refreshed;
      response = await requestQuote(accessToken);
    }
  } catch {
    return reply({ configured: true, connected: true, available: false, fallback: true, reason: "provider_unreachable" });
  }

  if (response.status === 401) {
    return reply({ configured: true, connected: false, available: false, fallback: true, reason: "provider_unauthorized_after_refresh" });
  }

  const result = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(result)) {
    return reply({ configured: true, connected: true, available: false, fallback: true, reason: "provider_rejected_quote" });
  }

  const options = result.flatMap((row: Record<string, unknown>) => {
    const custom = Number(row.custom_price ?? row.price);
    const eta = Number(row.custom_delivery_time ?? row.delivery_time);
    if (!Number.isFinite(custom) || custom <= 0 || !Number.isFinite(eta) || eta <= 0) return [];
    const company = row.company && typeof row.company === "object" ? row.company as Record<string, unknown> : {};
    return [{
      service_id: row.id ?? null,
      service_name: String(row.name ?? "Serviço"),
      company: String(company.name ?? ""),
      price: Number(custom.toFixed(2)),
      eta_days: Math.max(1, Math.trunc(eta)),
    }];
  }).sort((a, b) => a.price - b.price || a.eta_days - b.eta_days);

  if (!options.length) {
    return reply({ configured: true, connected: true, available: false, fallback: true, reason: "no_shipping_service" });
  }

  return reply({
    configured: true,
    connected: true,
    available: true,
    fallback: false,
    source: "melhor_envio",
    price: options[0].price,
    eta_days: options[0].eta_days,
    service: options[0],
    options: options.slice(0, 10),
  });
});