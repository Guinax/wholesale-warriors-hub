import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const INFINITEPAY_ENDPOINT = "https://api.infinitepay.io/invoices/public/checkout/payment_check";

const BodySchema = z.object({
  order_code: z.string().min(3).max(64),
  transaction_nsu: z.string().min(1).max(128).optional(),
  slug: z.string().min(1).max(128).optional(),
  handle: z.string().min(1).max(128).optional(),
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
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  const { order_code, transaction_nsu, slug } = parsed.data;
  const handle = parsed.data.handle ?? Deno.env.get("INFINITEPAY_HANDLE") ?? "";

  if (!handle) {
    // Sem handle configurado: não é erro fatal, apenas não há verificação automática
    return json({ paid: false, payment_status: "pending", not_configured: true });
  }


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_code, payment_status, payment_nsu, total_amount")
    .eq("order_code", order_code)
    .maybeSingle();

  if (orderError) return json({ error: "Falha ao consultar o pedido." }, 500);
  if (!order) return json({ error: "Pedido não encontrado." }, 404);

  // Já pago ou expirado: devolve o estado atual sem consultar o provedor
  if (order.payment_status === "paid" || order.payment_status === "expired") {
    return json({ paid: order.payment_status === "paid", payment_status: order.payment_status });
  }

  const nsu = transaction_nsu ?? order.payment_nsu ?? undefined;

  let providerResponse: Record<string, unknown> = {};
  let paid = false;

  try {
    const res = await fetch(INFINITEPAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        handle,
        order_nsu: order.order_code,
        ...(nsu ? { transaction_nsu: nsu } : {}),
        ...(slug ? { slug } : {}),
      }),
    });

    const text = await res.text();
    try {
      providerResponse = text ? JSON.parse(text) : {};
    } catch {
      providerResponse = { raw: text.slice(0, 500) };
    }

    if (!res.ok) {
      // 404 = fatura ainda não localizada no provedor (pagamento não iniciado/compensado).
      // Não é erro fatal: devolve o estado atual como pendente.
      return json({
        paid: false,
        payment_status: order.payment_status,
        provider_status: res.status,
        provider: providerResponse,
        pending_provider: true,
      });
    }

    const inner = (providerResponse.data ?? {}) as Record<string, unknown>;
    paid = providerResponse.paid === true || providerResponse.success === true || inner.paid === true;
  } catch (_e) {
    return json({ error: "Não foi possível contatar o provedor de pagamento." }, 502);
  }

  const update: Record<string, unknown> = {
    payment_provider: "infinitepay",
    payment_checked_at: new Date().toISOString(),
    payment_details: providerResponse,
  };
  if (nsu) update.payment_nsu = nsu;
  if (paid) update.payment_status = "paid";

  await supabase.from("orders").update(update).eq("id", order.id);

  return json({
    paid,
    payment_status: paid ? "paid" : order.payment_status,
    provider: providerResponse,
  });
});
