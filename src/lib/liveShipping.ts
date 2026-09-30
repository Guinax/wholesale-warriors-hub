import { supabase } from "@/integrations/supabase/client";

export type LiveShippingItem = {
  product_id: string;
  qty: number;
};

export type LiveShippingQuote = {
  cost: number;
  etaDays: number;
  serviceName: string;
  company: string;
};

export async function getLiveShippingQuote(
  destinationCep: string,
  items: LiveShippingItem[],
): Promise<LiveShippingQuote | null> {
  const cep = destinationCep.replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep) || !items.length) return null;

  const { data, error } = await supabase.functions.invoke("melhor-envio-quote", {
    body: { destination_cep: cep, items },
  });
  if (error || !data?.available) return null;

  const cost = Number(data.price);
  const etaDays = Number(data.eta_days);
  if (!Number.isFinite(cost) || cost <= 0 || !Number.isFinite(etaDays) || etaDays <= 0) return null;

  return {
    cost: Number(cost.toFixed(2)),
    etaDays: Math.max(1, Math.trunc(etaDays)),
    serviceName: String(data?.service?.service_name ?? "Melhor Envio"),
    company: String(data?.service?.company ?? ""),
  };
}
