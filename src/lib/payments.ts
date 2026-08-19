import { supabase } from "@/integrations/supabase/client";

export interface PaymentCheckResult {
  paid: boolean;
  payment_status?: string;
  provider?: Record<string, unknown>;
  error?: string;
}

/**
 * Consulta o status do pagamento na API da InfinitePay através da edge function.
 * Aceita os parâmetros de retorno do checkout (transaction_nsu / slug).
 */
export async function checkPaymentStatus(
  orderCode: string,
  opts: { transaction_nsu?: string; slug?: string } = {}
): Promise<PaymentCheckResult> {
  const { data, error } = await supabase.functions.invoke("payment-check", {
    body: {
      order_code: orderCode,
      ...(opts.transaction_nsu ? { transaction_nsu: opts.transaction_nsu } : {}),
      ...(opts.slug ? { slug: opts.slug } : {}),
    },
  });

  if (error) return { paid: false, error: error.message };
  return (data as PaymentCheckResult) ?? { paid: false, error: "Resposta inválida do servidor." };
}
