import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BodySchema = z.object({ order_id: z.string().uuid() });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return json({ error: "Autenticação necessária." }, 401);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "Pedido inválido." }, 400);

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

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: order, error: orderError } = await admin
    .from("partner_restock_orders")
    .select("id,created_by,total_amount,notes,partner_stores(name,owner_id),partner_restock_order_items(quantity,unit_price,products(name))")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  if (orderError) return json({ error: "Falha ao consultar reposição." }, 500);
  if (!order) return json({ error: "Pedido não encontrado." }, 404);

  const store = Array.isArray(order.partner_stores) ? order.partner_stores[0] : order.partner_stores;
  const { data: adminRole } = await admin.from("user_roles").select("user_id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (store?.owner_id !== user.id && !adminRole) return json({ error: "Sem permissão." }, 403);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return json({ email_not_configured: true }, 503);

  const { data: roles, error: rolesError } = await admin.from("user_roles").select("user_id").eq("role", "admin");
  if (rolesError) return json({ error: "Falha ao localizar administradores." }, 500);

  const emails: string[] = [];
  for (const role of roles ?? []) {
    const { data } = await admin.auth.admin.getUserById(role.user_id);
    const email = data.user?.email;
    if (email && !emails.includes(email)) emails.push(email);
  }
  if (!emails.length) return json({ error: "Nenhum e-mail administrativo cadastrado." }, 409);

  const items = (order.partner_restock_order_items ?? []) as Array<{
    quantity: number;
    unit_price: number;
    products?: { name?: string } | Array<{ name?: string }> | null;
  }>;

  const itemLines = items.map((item) => {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    return "• " + (product?.name ?? "Produto") + " — " + item.quantity + " un.";
  }).join("\n");

  const appUrl = (Deno.env.get("APP_URL") ?? "https://wholesale-warriors-hub.vercel.app").replace(/\/$/, "");
  const textBody = [
    "Novo pedido de reposição de parceiro",
    "",
    "Loja: " + (store?.name ?? "Parceiro"),
    "Total estimado: " + new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(order.total_amount ?? 0)),
    "",
    "Itens:",
    itemLines || "Itens não informados",
    order.notes ? "\nObservação: " + order.notes : "",
    "",
    "Abrir painel administrativo: " + appUrl + "/admin?tab=restock",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
    body: JSON.stringify({
      from: Deno.env.get("RESTOCK_EMAIL_FROM") ?? "Mansão Maromba <onboarding@resend.dev>",
      to: emails,
      subject: "Novo pedido de reposição — " + (store?.name ?? "Parceiro"),
      text: textBody,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) return json({ error: "Falha ao enviar e-mail administrativo.", provider_status: response.status }, 502);
  return json({ sent: true, recipients: emails.length, id: (result as { id?: string }).id ?? null });
});
