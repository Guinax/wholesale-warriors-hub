import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Autenticação obrigatória." }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Serviço não configurado." }, 503);

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) return json({ error: "Sessão inválida." }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actorRole, error: roleError } = await admin.from("user_roles")
    .select("user_id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (roleError || !actorRole) return json({ error: "Apenas administradores podem excluir usuários." }, 403);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  if (!body || typeof body !== "object" || !("user_id" in body) || typeof body.user_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id)) {
    return json({ error: "Identificador inválido." }, 400);
  }
  const targetId = body.user_id;
  if (targetId === user.id) return json({ error: "Sua conta administrativa é protegida." }, 403);
  const { data: targetRole, error: targetRoleError } = await admin.from("user_roles")
    .select("user_id").eq("user_id", targetId).eq("role", "admin").maybeSingle();
  if (targetRoleError) return json({ error: "Não foi possível validar a proteção administrativa." }, 500);
  if (targetRole) return json({ error: "Contas administrativas não podem ser excluídas." }, 403);

  // Never erase a customer with orders: financial and fulfillment history must remain intact.
  const { count, error: orderError } = await admin.from("orders")
    .select("id", { count: "exact", head: true }).eq("user_id", targetId);
  if (orderError) return json({ error: "Não foi possível verificar os pedidos vinculados." }, 500);
  if ((count ?? 0) > 0) return json({ error: "Este usuário possui pedidos. Preserve o histórico antes de excluir a conta." }, 409);

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
  if (deleteError) return json({ error: "Exclusão não concluída: " + deleteError.message }, 409);
  return json({ success: true });
});
