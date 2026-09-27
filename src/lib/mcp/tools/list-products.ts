import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_products",
  title: "Listar produtos",
  description: "Lista os produtos ativos do catálogo da Loja Família Maromba, opcionalmente filtrados por categoria (suplementos, roupas, acessorios, equipamento, bebidas, alimentos).",
  inputSchema: {
    category: z.string().optional().describe("Categoria opcional (ex: suplementos, roupas, acessorios, equipamento)."),
    limit: z.number().int().min(1).max(100).optional().describe("Quantidade máxima de itens (padrão 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, limit }, ctx: ToolContext) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    let q = supabase.from("products").select("id,name,category,unit_price,wholesale_price,min_qty,badge,image_url,active").eq("active", true).order("sort_order", { ascending: true }).limit(limit ?? 50);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
