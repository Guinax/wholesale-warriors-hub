import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const handle = (Deno.env.get("INFINITEPAY_HANDLE") ?? "").replace(/^\$/, "");
    if (!url || !service || !handle) {
      return reply({ success: false, message: "Server not configured" }, 503);
    }

    const payload = await req.json().catch(() => ({}));
    const orderCode = typeof payload?.order_nsu === "string" ? payload.order_nsu : "";
    if (!orderCode) return reply({ success: false, message: "Pedido não encontrado" }, 400);

    const admin = createClient(url, service);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, order_code, total_amount, payment_status")
      .eq("order_code", orderCode)
      .maybeSingle();

    if (orderError || !order) return reply({ success: false, message: "Pedido não encontrado" }, 400);
    if (order.payment_status === "paid") return reply({ success: true, message: null });

    const transactionNsu = typeof payload?.transaction_nsu === "string" ? payload.transaction_nsu : undefined;
    const slug = typeof payload?.invoice_slug === "string"
      ? payload.invoice_slug
      : typeof payload?.slug === "string"
        ? payload.slug
        : undefined;

    const response = await fetch("https://api.checkout.infinitepay.io/payment_check", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        handle,
        order_nsu: orderCode,
        ...(transactionNsu ? { transaction_nsu: transactionNsu } : {}),
        ...(slug ? { slug } : {}),
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.paid !== true) {
      return reply({ success: false, message: "Pagamento não confirmado" }, 400);
    }

    const expectedCents = Math.round(Number(order.total_amount) * 100);
    const providerAmount = Number(result?.amount);
    if (!Number.isFinite(expectedCents) || !Number.isFinite(providerAmount) || providerAmount !== expectedCents) {
      return reply({ success: false, message: "Valor do pagamento não confere" }, 400);
    }

    const { error } = await admin.from("orders").update({
      payment_status: "paid",
      delivery_status: "postado",
      payment_checked_at: new Date().toISOString(),
      payment_nsu: result.transaction_nsu ?? transactionNsu ?? null,
      payment_provider: "infinitepay",
      payment_details: {
        source: "verified_webhook",
        success: result.success,
        paid: result.paid,
        amount: result.amount,
        paid_amount: result.paid_amount,
        installments: result.installments,
        capture_method: result.capture_method,
        transaction_nsu: result.transaction_nsu ?? transactionNsu ?? null,
        slug: slug ?? null,
      },
    }).eq("id", order.id);

    if (error) throw error;
    return reply({ success: true, message: null });
  } catch (error) {
    return reply({ success: false, message: error instanceof Error ? error.message : "Erro interno" }, 400);
  }
});
