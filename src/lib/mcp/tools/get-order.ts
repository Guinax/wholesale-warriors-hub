import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_order",
  title: "Consultar pedido",
  description: "Consulta os detalhes e o status de um pedido pelo seu código (ex: FM-XXXXXX).",
  inputSchema: {
    order_code: z.string().min(3).describe("Código do pedido, como aparece no recibo."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_code }, ctx: ToolContext) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase.rpc("get_order_by_code", { _order_code: order_code });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const order = Array.isArray(data) ? data[0] : data;
    if (!order) return { content: [{ type: "text", text: `Pedido ${order_code} não encontrado.` }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(order) }],
      structuredContent: { order },
    };
  },
});
