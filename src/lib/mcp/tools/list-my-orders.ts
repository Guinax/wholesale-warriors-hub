import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_my_orders",
  title: "Meus pedidos",
  description: "Lista os pedidos do usuário autenticado.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Quantidade máxima (padrão 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    // A política de leitura vincula cada pedido ao usuário autenticado.
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(ctx.getToken());
    if (authError || !user) {
      return { content: [{ type: "text", text: "Sessão inválida." }], isError: true };
    }
    const { data, error } = await supabase
      .from("orders")
      .select("order_code,total_amount,payment_method,payment_status,delivery_status,tracking_code,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
