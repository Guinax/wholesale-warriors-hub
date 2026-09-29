import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const INFINITEPAY_LINKS = "https://api.checkout.infinitepay.io/links";

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
  if (!supabaseUrl || !publicKey || !serviceKey) {
    return json({ error: "Serviço indisponível." }, 500);
  }

  const authClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Sessão inválida." }, 401);

  const handle = (Deno.env.get("INFINITEPAY_HANDLE") ?? "").replace(/^\$/, "");
  if (!handle) {
    return json({ not_configured: true, error: "Handle não configurado." }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, order_code, items, total_amount, customer_name, customer_email, customer_phone, address_zip, address_street, address_number, address_complement, address_city, address_state, payment_status, due_at")
    .eq("order_code", parsed.data.order_code)
    .maybeSingle();

  if (orderError) return json({ error: "Falha ao consultar o pedido." }, 500);
  if (!order || order.user_id !== user.id) return json({ error: "Pedido não encontrado." }, 404);
  if (order.payment_status === "paid") return json({ error: "Este pedido já está pago." }, 409);
  if (order.payment_status !== "pending" || (order.due_at && Date.now() > Date.parse(order.due_at) + 2 * 3600_000)) {
    return json({ error: "Pedido encerrado. Faça um novo pedido pelo carrinho." }, 409);
  }
  const redirect = new URL(parsed.data.redirect_url);
  const allowedRedirectOrigins = (Deno.env.get("CHECKOUT_REDIRECT_ORIGINS") ??
    "https://wholesale-warriors-hub.lovable.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!allowedRedirectOrigins.includes(redirect.origin) || redirect.pathname !== `/recibo/${order.order_code}`) {
    return json({ error: "Endereço de retorno inválido." }, 400);
  }

  const rawItems = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
  if (rawItems.length === 0) return json({ error: "Pedido sem itens." }, 400);

  const requested = rawItems.map((item) => ({
    name: String(item.name ?? "").trim(),
    qty: Number(item.qty ?? item.quantity),
  }));
  if (requested.some((item) => !item.name || !Number.isSafeInteger(item.qty) || item.qty < 1)) return json({ error: "Item inválido no pedido." }, 400);

  // Merge duplicate lines before stock checks; splitting a product must not bypass its stock limit.
  const quantities = new Map<string, number>();
  for (const item of requested) quantities.set(item.name, (quantities.get(item.name) ?? 0) + item.qty);
  const productNames = [...quantities.keys()];
  const { data: catalog, error: catalogError } = await supabase
    .from("products")
    .select("name,wholesale_price,min_qty,stock,active")
    .in("name", productNames)
    .eq("active", true);

  if (catalogError) return json({ error: "Falha ao validar preços do catálogo." }, 500);

  const priceByName = new Map((catalog ?? []).map((product) => [String(product.name), product]));
  if (priceByName.size !== productNames.length) {
    return json({ error: "Um ou mais produtos não estão disponíveis." }, 409);
  }

  let merchandiseTotal = 0;
  const items: Array<{ description: string; price: number; quantity: number }> = [];

  for (const [name, qty] of quantities) {
    const requestedItem = { name, qty };
    const product = priceByName.get(requestedItem.name)!;
    const unit = Number(product.wholesale_price);
    const minQty = Math.max(1, Number(product.min_qty ?? 1) || 1);

    if (!Number.isFinite(unit) || unit <= 0) {
      return json({ error: `Preço inválido no catálogo: ${requestedItem.name}` }, 409);
    }
    if (requestedItem.qty < minQty) {
      return json({ error: `Quantidade mínima de ${requestedItem.name}: ${minQty}` }, 409);
    }
    if (requestedItem.qty > Number(product.stock ?? 0)) {
      return json({ error: `Estoque indisponível para ${requestedItem.name}.` }, 409);
    }

    merchandiseTotal += Math.round(unit * 100) * requestedItem.qty / 100;
    items.push({
      description: requestedItem.name,
      price: Math.round(unit * 100),
      quantity: requestedItem.qty,
    });
  }

  const uf = String(order.address_state ?? "").trim().toUpperCase();
  const validUfs = new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
  if (!validUfs.has(uf)) return json({ error: "UF de entrega inválida." }, 400);

  const cep = String(order.address_zip ?? "").replace(/\D/g, "");
  if (cep.length !== 8) return json({ error: "CEP de entrega inválido." }, 400);
  try {
    const cepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!cepResponse.ok) return json({ error: "Não foi possível validar o CEP. Tente novamente." }, 503);
    const address = await cepResponse.json();
    if (address?.erro || String(address?.uf ?? "").toUpperCase() !== uf) {
      return json({ error: "O CEP não corresponde à UF de entrega." }, 400);
    }
  } catch {
    return json({ error: "Não foi possível validar o CEP. Tente novamente." }, 503);
  }

  // O servidor recalcula o frete com os mesmos parâmetros do checkout.
  // Caixa padrão: até 6 unidades; pedidos maiores usam múltiplas caixas.
  const unitsPerBox = 6;
  const totalUnits = [...quantities.values()].reduce((sum, qty) => sum + qty, 0);
  const boxes = Math.max(1, Math.ceil(totalUnits / unitsPerBox));
  const southSoutheast = new Set(["SP","RJ","MG","ES","PR","SC","RS"]);
  const centerNortheast = new Set(["GO","MT","MS","DF","BA","SE","AL","PE","PB","RN","CE","PI","MA"]);
  const baseShipping =
    uf === "SP" ? 19.9 :
    southSoutheast.has(uf) ? 29.9 :
    centerNortheast.has(uf) ? 39.9 : 49.9;
  const extraBoxShipping =
    uf === "SP" ? 14.9 :
    southSoutheast.has(uf) ? 22.9 :
    centerNortheast.has(uf) ? 29.9 : 39.9;
  const shippingAmount = Math.round((baseShipping + Math.max(0, boxes - 1) * extraBoxShipping) * 100) / 100;

  if (shippingAmount > 0) {
    items.push({ description: "Frete", price: Math.round(shippingAmount * 100), quantity: 1 });
  }

  const trustedTotal = Math.round((merchandiseTotal + shippingAmount) * 100) / 100;
  if (Math.round(Number(order.total_amount) * 100) !== Math.round(trustedTotal * 100)) {
    return json({ error: "O preço ou o frete mudou. Atualize seu carrinho antes de pagar." }, 409);
  }
  const { error: totalUpdateError } = await supabase
    .from("orders")
    .update({ total_amount: trustedTotal })
    .eq("id", order.id);
  if (totalUpdateError) return json({ error: "Falha ao atualizar o total do pedido." }, 500);

  const phoneDigits = String(order.customer_phone ?? "").replace(/\D/g, "");
  const phoneNumber = phoneDigits
    ? phoneDigits.startsWith("55") ? `+${phoneDigits}` : `+55${phoneDigits}`
    : "";

  const payload = {
    handle,
    order_nsu: order.order_code,
    redirect_url: parsed.data.redirect_url,
    webhook_url: `${supabaseUrl}/functions/v1/payment-webhook`,
    items,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone_number: phoneNumber,
    },
    address: {
      cep,
      street: order.address_street,
      number: order.address_number,
      complement: order.address_complement ?? "",
    },
  };

  let providerResponse: Record<string, unknown> = {};
  try {
    const response = await fetch(INFINITEPAY_LINKS, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    try {
      providerResponse = text ? JSON.parse(text) : {};
    } catch {
      providerResponse = { raw: text.slice(0, 500) };
    }

    if (!response.ok) {
      return json({
        error: "Não foi possível gerar a cobrança.",
        provider_status: response.status,
        provider: providerResponse,
      }, 502);
    }
  } catch {
    return json({ error: "Não foi possível contatar o provedor de pagamento." }, 502);
  }

  const nestedData = providerResponse.data as Record<string, unknown> | undefined;
  const url = typeof providerResponse.url === "string"
    ? providerResponse.url
    : typeof nestedData?.url === "string"
      ? nestedData.url
      : null;

  if (!url) return json({ error: "Resposta sem link de pagamento.", provider: providerResponse }, 502);

  const { error: paymentUpdateError } = await supabase
    .from("orders")
    .update({
      payment_provider: "infinitepay",
      payment_checked_at: new Date().toISOString(),
      payment_details: providerResponse,
    })
    .eq("id", order.id);
  if (paymentUpdateError) return json({ error: "Cobrança criada, mas o pedido não foi atualizado." }, 500);

  return json({ url });
});
