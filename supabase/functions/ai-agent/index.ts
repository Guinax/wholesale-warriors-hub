import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BASE_URL = "https://zenmux.ai/api/anthropic";
const MODEL = "z-ai/glm-5.3-flashx";

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

const SYSTEM_PROMPT = `Você é o atendente virtual da Representante Oficial Família Maromba, um distribuidor de atacado.
Responda sempre em português do Brasil, de forma curta, direta e simpática.
Categorias da loja: suplementos, roupas, acessórios, equipamento, bebidas e linha Cimed.
Compra a partir de 1 unidade. Preço de atacado automático a partir de 6 unidades. Pagamento por Pix ou cartão de crédito.
"Comprar Lote" exige no mínimo 7 sabores.
Pedidos não pagos expiram 2 horas após o vencimento.
O cliente acompanha a entrega pelo recibo com o código do pedido.
Suporte humano pelo WhatsApp (19) 97115-1107.
Nunca invente preços, prazos ou promoções: se não souber, oriente falar com o suporte.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("ZENMUX_API_KEY");
  if (!apiKey) {
    console.error("ZENMUX_API_KEY ausente no ambiente");
    return json({ error: "Assistente indisponível no momento." }, 200);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Requisição inválida." }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Mensagem inválida." }, 400);

  try {
    const res = await fetch(`${BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: parsed.data.messages,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("zenmux error", res.status, JSON.stringify(data));
      if (res.status === 429) return json({ error: "Muitas mensagens. Tente novamente em instantes." }, 200);
      if (res.status === 401 || res.status === 403) return json({ error: "Assistente indisponível no momento." }, 200);
      return json({ error: "Não consegui responder agora. Tente de novo." }, 200);
    }

    const reply = Array.isArray(data?.content)
      ? data.content.filter((c: { type?: string }) => c?.type === "text").map((c: { text?: string }) => c.text ?? "").join("\n").trim()
      : "";

    return json({ reply: reply || "Não consegui responder agora. Tente de novo." });
  } catch (e) {
    console.error("ai-agent failure", e);
    return json({ error: "Não consegui responder agora. Tente de novo." }, 200);
  }
});
