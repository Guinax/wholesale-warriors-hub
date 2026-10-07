import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const INFINITEPAY_ENDPOINT = "https://api.checkout.infinitepay.io/payment_check";

const BodySchema = z.object({
  order_code: z.string().min(3).max(64),
  transaction_nsu: z.string().min(1).max(128).optional(),
  slug: z.string().min(1).max(128).optional(),
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

  const { order_code, transaction_nsu, slug } = parsed.data;
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

  // Conta CNPJ ativa para conferência dos pagamentos na InfinitePay.
  const handle = "wgsolucoesfinaceira";

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, order_code, payment_status, payment_nsu, total_amount")
    .eq("order_code", order_code)
    .maybeSingle();

  if (orderError) return json({ error: "Falha ao consultar o pedido." }, 500);
  if (!order || order.user_id !== user.id) return json({ error: "Pedido não encontrado." }, 404);

  const closedOrder = ["expired", "cancelled", "canceled"].includes(order.payment_status);

  if (order.payment_status === "paid") {
    const { error: syncError } = await supabase.rpc("service_partner_mark_order_paid", { p_order_id: order.id });
    if (syncError) return json({ error: "Falha ao sincronizar o pedido local." }, 500);
    return json({ paid: true, payment_status: order.payment_status });
  }

  const nsu = transaction_nsu ?? order.payment_nsu ?? undefined;
  let providerResponse: Record<string, unknown> = {};

  try {
    const response = await fetch(INFINITEPAY_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        handle,
        order_nsu: order.order_code,
        ...(nsu ? { transaction_nsu: nsu } : {}),
        ...(slug ? { slug } : {}),
      }),
    });

    const text = await response.text();
    try {
      providerResponse = text ? JSON.parse(text) : {};
    } catch {
      providerResponse = { raw: text.slice(0, 500) };
    }

    if (!response.ok) {
      return json({
        paid: false,
        payment_status: order.payment_status,
        provider_status: response.status,
        pending_provider: true,
      });
    }
  } catch {
    return json({ error: "Não foi possível contatar o provedor de pagamento." }, 502);
  }

  const inner = (providerResponse.data ?? {}) as Record<string, unknown>;
  const paid = providerResponse.paid === true || inner.paid === true;

  if (paid) {
    const expectedCents = Math.round(Number(order.total_amount) * 100);
    const rawAmount = providerResponse.amount ?? inner.amount;
    const providerAmount = Number(rawAmount);
    if (!Number.isFinite(expectedCents) || !Number.isFinite(providerAmount) || providerAmount !== expectedCents) {
      return json({
        paid: false,
        payment_status: order.payment_status,
        error: "Valor confirmado pela InfinitePay não confere com o pedido.",
      }, 409);
    }
  }

  const update: Record<string, unknown> = {
    payment_provider: "infinitepay",
    payment_checked_at: new Date().toISOString(),
    payment_details: closedOrder
      ? { reconciliation_required: paid }
      : providerResponse,
  };
  if (nsu) update.payment_nsu = nsu;

  if (closedOrder) {
    const { error: reconciliationError } = await supabase.from("orders").update(update).eq("id", order.id);
    if (reconciliationError) return json({ error: "Falha ao registrar a reconciliação do pagamento." }, 500);
    return json({
      paid: false,
      provider_paid: paid,
      payment_status: order.payment_status,
      reconciliation_required: paid,
      error: paid ? "Pagamento confirmado após o encerramento do pedido. A equipe precisa reconciliar antes de liberar mercadoria." : "Pedido encerrado e pagamento não confirmado.",
    }, 409);
  }

  if (paid) {
    update.payment_status = "paid";
    update.delivery_status = "preparando";
  }

  const { error: updateError } = await supabase.from("orders").update(update).eq("id", order.id).neq("payment_status", "paid");
  if (updateError) return json({ error: "Falha ao atualizar o pedido." }, 500);
  if (paid) {
    const { error: syncError } = await supabase.rpc("service_partner_mark_order_paid", { p_order_id: order.id });
    if (syncError) return json({ error: "Pagamento confirmado, mas o pedido local precisa de reconciliação operacional." }, 500);
  }

  return json({
    paid,
    payment_status: paid ? "paid" : order.payment_status,
  });
});
