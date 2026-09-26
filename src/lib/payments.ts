import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface PaymentCheckResult {
  paid: boolean;
  payment_status?: string;
  provider?: Record<string, unknown>;
  not_configured?: boolean;
  error?: string;
}


/**
 * Gera o link de checkout da InfinitePay para um pedido.
 * Retorna somente a URL HTTPS recebida do provedor; falhas não habilitam pagamento manual.
 */
export async function createPaymentLink(
  orderCode: string,
  redirectUrl: string
): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("payment-link", {
      body: { order_code: orderCode, redirect_url: redirectUrl },
    });
    if (error) {
      const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      throw new Error((details as { error?: string } | null)?.error ?? "Não foi possível abrir o pagamento. Tente novamente.");
    }
    const response = data as { url?: unknown; error?: string; not_configured?: boolean } | null;
    if (response?.error || response?.not_configured) throw new Error(response.error ?? "Pagamento não configurado. Fale com o suporte.");
    if (typeof response?.url !== "string") throw new Error("A InfinitePay não retornou um link de pagamento. Tente novamente.");
    const url = new URL(response.url);
    if (url.protocol !== "https:" || !/(^|\.)infinitepay\.io$/.test(url.hostname)) {
      throw new Error("A InfinitePay retornou um link inválido. Tente novamente.");
    }
    return url.href;
  } catch (error) {
    throw error instanceof Error ? error : new Error("Não foi possível abrir o pagamento. Tente novamente.");
  }
}

/**
 * Consulta o status do pagamento na API da InfinitePay através da edge function.
 * Aceita os parâmetros de retorno do checkout (transaction_nsu / slug).
 */
export async function checkPaymentStatus(
  orderCode: string,
  opts: { transaction_nsu?: string; slug?: string } = {}
): Promise<PaymentCheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke("payment-check", {
      body: {
        order_code: orderCode,
        ...(opts.transaction_nsu ? { transaction_nsu: opts.transaction_nsu } : {}),
        ...(opts.slug ? { slug: opts.slug } : {}),
      },
    });

    // Nunca propaga erro: pagamento simplesmente segue pendente.
    if (error) return { paid: false, payment_status: "pending" };
    return (data as PaymentCheckResult) ?? { paid: false, payment_status: "pending" };
  } catch {
    return { paid: false, payment_status: "pending" };
  }
}
