import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface PaymentCheckResult {
  paid: boolean;
  payment_status?: string;
  provider?: Record<string, unknown>;
  not_configured?: boolean;
  error?: string;
}

const CANONICAL_SITE_ORIGIN = "https://wholesale-warriors-hub.lovable.app";

/**
 * Gera o link de checkout da InfinitePay para um pedido.
 * O retorno sempre aponta para o domínio público oficial, mesmo quando o checkout
 * é aberto por um preview/URL alternativa. Retorna somente uma URL HTTPS oficial
 * da InfinitePay; falhas não habilitam pagamento manual.
 *
 * Após validar a URL, a navegação externa é iniciada aqui. A Promise fica pendente
 * enquanto o documento atual é descarregado para impedir que o chamador limpe o
 * carrinho e dispare uma navegação interna antes do checkout externo no mobile.
 */
export async function createPaymentLink(
  orderCode: string,
  _redirectUrl: string
): Promise<string> {
  try {
    const redirectUrl = `${CANONICAL_SITE_ORIGIN}/recibo/${encodeURIComponent(orderCode)}`;
    const { data, error } = await supabase.functions.invoke("payment-link", {
      body: { order_code: orderCode, redirect_url: redirectUrl },
    });
    if (error) {
      const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      throw new Error((details as { error?: string } | null)?.error ?? "Não foi possível abrir o pagamento. Tente novamente.");
    }

    const response = data as { url?: unknown; error?: string; not_configured?: boolean } | null;
    if (response?.error || response?.not_configured) {
      throw new Error(response.error ?? "Pagamento não configurado. Fale com o suporte.");
    }
    if (typeof response?.url !== "string") {
      throw new Error("A InfinitePay não retornou um link de pagamento. Tente novamente.");
    }

    const url = new URL(response.url);
    const hostname = url.hostname.toLowerCase();
    const officialHost =
      hostname === "infinitepay.io" ||
      hostname.endsWith(".infinitepay.io") ||
      hostname === "infinitepay.com.br" ||
      hostname.endsWith(".infinitepay.com.br");

    if (url.protocol !== "https:" || !officialHost) {
      throw new Error("A InfinitePay retornou um link inválido. Tente novamente.");
    }

    // Inicia a navegação antes de devolver o controle ao checkout. Isso evita que
    // clearCart() faça o React Router navegar para "/" antes da InfinitePay abrir.
    window.location.assign(url.href);
    return await new Promise<string>(() => {});
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

    if (error) {
      const details = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
      return { paid: false, error: details?.error ?? "Não foi possível consultar a InfinitePay. Tente novamente." };
    }
    return (data as PaymentCheckResult) ?? { paid: false, payment_status: "pending" };
  } catch {
    return { paid: false, error: "Não foi possível consultar a InfinitePay. Verifique sua conexão e tente novamente." };
  }
}
