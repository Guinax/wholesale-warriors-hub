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

  const handle = Deno.env.get("INFINITEPAY_HANDLE") ?? "";
  if (!handle) return json({ not_configured: true, error: "Handle não configurado." }, 200);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_code, items, total_amount, customer_name, customer_email, customer_phone, address_zip, address_street, address_number, address_complement, address_city, address_state, payment_status")
    .eq("order_code", parsed.data.order_code)
    .maybeSingle();

  if (orderError) return json({ error: "Falha ao consultar o pedido." }, 500);
  if (!order) return json({ error: "Pedido não encontrado." }, 404);
  if (order.payment_status === "paid") return json({ already_paid: true });

  const rawItems = Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
  const items = rawItems.map((it) => {
    const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
    const unit = Number(it.unit_price ?? it.price ?? 0);
    return {
      description: String(it.name ?? "Produto"),
      price: Math.max(1, Math.round(unit * 100)),
      quantity: qty,
    };
  });

  if (items.length === 0) {
    items.push({
      description: `Pedido ${order.order_code}`,
      price: Math.max(1, Math.round(Number(order.total_amount) * 100)),
      quantity: 1,
    });
  }

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
