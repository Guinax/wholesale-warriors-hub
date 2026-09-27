import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const INFINITEPAY_LINKS = "https://api.infinitepay.io/invoices/public/checkout/links";

const BodySchema = z.object({
  order_code: z.string().min(3).max(64),
  redirect_url: z.string().url().max(500),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return json({ error: "Autenticação necessária." }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publicKey || !serviceKey) return json({ error: "Serviço indisponível." }, 500);
  const authClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Sessão inválida." }, 401);

  const handle = Deno.env.get("INFINITEPAY_HANDLE") ?? "";
  if (!handle) return json({ not_configured: true, error: "Handle não configurado." }, 200);

  const supabase = createClient(
    supabaseUrl,
    serviceKey,
    { auth: { persistSession: false } },
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, order_code, items, total_amount, customer_name, customer_email, customer_phone, address_zip, address_street, address_number, address_complement, address_city, address_state, payment_status")
    .eq("order_code", parsed.data.order_code)
    .maybeSingle();

  if (orderError) return json({ error: "Falha ao consultar o pedido." }, 500);
  if (!order) return json({ error: "Pedido não encontrado." }, 404);
  if (order.user_id !== user.id) return json({ error: "Pedido não encontrado." }, 404);
  if (order.payment_status === "paid") return json({ already_paid: true });

  const rawItems = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  if (rawItems.length === 0) return json({ error: "Pedido sem itens." }, 400);

  const requested = rawItems.map((it) => ({
    name: String(it.name ?? "").trim(),
    qty: Math.max(1, Math.floor(Number(it.qty ?? it.quantity ?? 1) || 1)),
  }));
  if (requested.some((it) => !it.name)) return json({ error: "Item inválido no pedido." }, 400);

  const productNames = [...new Set(requested.map((it) => it.name))];
  const { data: catalog, error: catalogError } = await supabase
    .from("products")
    .select("name,price,min_qty,is_active")
    .in("name", productNames)
    .eq("is_active", true);

  if (catalogError) return json({ error: "Falha ao validar preços do catálogo." }, 500);
  const priceByName = new Map((catalog ?? []).map((p) => [String(p.name), p]));
  if (priceByName.size !== productNames.length) {
    return json({ error: "Um ou mais produtos não estão disponíveis." }, 409);
  }

  let merchandiseTotal = 0;
  const items = requested.map((it) => {
    const product = priceByName.get(it.name)!;
    const unit = Number(product.price);
    const minQty = Math.max(1, Number(product.min_qty ?? 1) || 1);
    if (!Number.isFinite(unit) || unit <= 0) throw new Error("Preço inválido no catálogo");
    if (it.qty < minQty) throw new Error(`Quantidade mínima de ${it.name}: ${minQty}`);
    merchandiseTotal += unit * it.qty;
    return {
      description: it.name,
      price: Math.round(unit * 100),
      quantity: it.qty,
    };
  });

  const uf = String(order.address_state ?? "").trim().toUpperCase();
  const validUfs = new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
  if (!validUfs.has(uf)) return json({ error: "UF de entrega inválida." }, 400);

  const southSoutheast = new Set(["SP","RJ","MG","ES","PR","SC","RS"]);
  const centerNortheast = new Set(["GO","MT","MS","DF","BA","SE","AL","PE","PB","RN","CE","PI","MA"]);
  const shippingAmount =
    merchandiseTotal >= 1000 ? 0 :
    uf === "SP" ? 19.9 :
    southSoutheast.has(uf) ? 29.9 :
    centerNortheast.has(uf) ? 39.9 : 49.9;

  if (shippingAmount > 0) {
    items.push({ description: "Frete", price: Math.round(shippingAmount * 100), quantity: 1 });
  }

  const trustedTotal = merchandiseTotal + shippingAmount;
  await supabase
    .from("orders")
    .update({ total_amount: trustedTotal })
    .eq("id", order.id);

  const payload = {
    handle: handle.replace(/^\$/, ""),
    order_nsu: order.order_code,
    redirect_url: parsed.data.redirect_url,
    items,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone_number: String(order.customer_phone ?? "").replace(/\D/g, ""),
    },
    address: {
      cep: String(order.address_zip ?? "").replace(/\D/g, ""),
      street: order.address_street,
      number: order.address_number,
      complement: order.address_complement ?? "",
      city: order.address_city,
      state: order.address_state,
    },
  };

  let providerResponse: Record<string, unknown> = {};
  try {
    const res = await fetch(INFINITEPAY_LINKS, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    try {
      providerResponse = text ? JSON.parse(text) : {};
    } catch {
      providerResponse = { raw: text.slice(0, 500) };
    }
    if (!res.ok) {
      return json({ error: "Não foi possível gerar a cobrança.", provider_status: res.status, provider: providerResponse }, 200);
    }
  } catch {
    return json({ error: "Não foi possível contatar o provedor de pagamento." }, 200);
  }

  const url =
    (providerResponse.url as string) ??
    ((providerResponse.data as Record<string, unknown> | undefined)?.url as string) ??
    null;

  if (!url) return json({ error: "Resposta sem link de pagamento.", provider: providerResponse }, 200);

  await supabase
    .from("orders")
    .update({
      payment_provider: "infinitepay",
      payment_checked_at: new Date().toISOString(),
      payment_details: providerResponse,
    })
    .eq("id", order.id);

  return json({ url });
});
