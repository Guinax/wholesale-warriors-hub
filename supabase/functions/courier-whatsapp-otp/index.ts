import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://wholesale-warriors-hub.vercel.app",
  "http://localhost:5173",
]);

const json = (body: unknown, status = 200, origin?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(origin && allowedOrigins.has(origin)
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          }
        : {}),
    },
  });

const normalizePhone = (value: string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length === 13) return "+" + digits;
  if (digits.length === 11) return "+55" + digits;
  return null;
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? undefined;
  if (req.method === "OPTIONS") return json({ ok: true }, 200, origin);
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Faça login para continuar." }, 401, origin);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) return json({ error: "Configuração interna indisponível." }, 503, origin);

  const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });
  const jwt = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  const user = userData.user;
  if (userError || !user) return json({ error: "Sessão inválida. Entre novamente." }, 401, origin);

  let body: { action?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requisição inválida." }, 400, origin);
  }

  const { data: courier, error: courierError } = await supabase
    .from("courier_profiles")
    .select("id,user_id,full_name,phone,status,cpf,vehicle_type,vehicle_plate,cnh_number,cnh_category,cnh_expiry")
    .eq("user_id", user.id)
    .maybeSingle();

  if (courierError) return json({ error: "Não foi possível consultar o cadastro." }, 500, origin);
  if (!courier) return json({ error: "Cadastre-se como entregador primeiro." }, 400, origin);
  if (courier.status === "suspended") return json({ error: "Cadastro suspenso. Fale com o suporte." }, 403, origin);

  const phone = normalizePhone(courier.phone);
  if (!phone) return json({ error: "Telefone do cadastro inválido." }, 400, origin);

  if (body.action === "send") {
    const metaToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
    const template = Deno.env.get("META_WHATSAPP_OTP_TEMPLATE") || "codigo_confirmacao_entregador";
    const language = Deno.env.get("META_WHATSAPP_OTP_LANGUAGE") || "pt_BR";

    if (!metaToken || !phoneNumberId) {
      return json({
        ok: false,
        pending: true,
        code: "WHATSAPP_PROVIDER_NOT_CONFIGURED",
        message: "Cadastro salvo e em análise. A confirmação automática por WhatsApp será habilitada assim que o serviço estiver disponível.",
      }, 200, origin);
    }

    const { data: existing } = await supabase
      .schema("private")
      .from("courier_whatsapp_otps")
      .select("sent_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.sent_at && Date.now() - new Date(existing.sent_at).getTime() < 60_000) {
      return json({ error: "Aguarde 1 minuto antes de pedir outro código." }, 429, origin);
    }

    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    const pepper = serviceRole;
    const codeHash = await sha256(`${user.id}:${phone}:${code}:${pepper}`);
    const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

    const waResponse = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${metaToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace("+", ""),
        type: "template",
        template: {
          name: template,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: code }],
            },
          ],
        },
      }),
    });

    if (!waResponse.ok) {
      const detail = await waResponse.text();
      console.error("WhatsApp send failed", waResponse.status, detail.slice(0, 800));
      return json({ error: "Não foi possível enviar o código pelo WhatsApp agora." }, 502, origin);
    }

    const { error: otpError } = await supabase
      .schema("private")
      .from("courier_whatsapp_otps")
      .upsert({
        user_id: user.id,
        phone_e164: phone,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempts: 0,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (otpError) {
      console.error("OTP persistence failed", otpError.message);
      return json({ error: "Código enviado, mas não foi possível concluir a validação. Solicite outro código." }, 500, origin);
    }

    return json({ ok: true, sent: true, expires_in_seconds: 300 }, 200, origin);
  }

  if (body.action === "verify") {
    const code = String(body.code ?? "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) return json({ error: "Digite o código de 6 dígitos." }, 400, origin);

    const { data: otp, error: otpReadError } = await supabase
      .schema("private")
      .from("courier_whatsapp_otps")
      .select("phone_e164,code_hash,expires_at,attempts")
      .eq("user_id", user.id)
      .maybeSingle();

    if (otpReadError || !otp) return json({ error: "Peça um novo código pelo WhatsApp." }, 400, origin);
    if (new Date(otp.expires_at).getTime() < Date.now()) return json({ error: "Código expirado. Peça um novo." }, 400, origin);
    if (Number(otp.attempts) >= 5) return json({ error: "Muitas tentativas. Peça um novo código." }, 429, origin);

    const expected = await sha256(`${user.id}:${phone}:${code}:${serviceRole}`);
    if (expected !== otp.code_hash) {
      await supabase
        .schema("private")
        .from("courier_whatsapp_otps")
        .update({ attempts: Number(otp.attempts) + 1, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      return json({ error: "Código inválido." }, 400, origin);
    }

    if (String(courier.cpf ?? "").replace(/\D/g, "").length !== 11) {
      return json({ error: "CPF obrigatório antes da confirmação." }, 400, origin);
    }
    if (courier.vehicle_type !== "bike") {
      if (
        String(courier.cnh_number ?? "").replace(/\D/g, "").length !== 11 ||
        !courier.cnh_category ||
        !courier.cnh_expiry ||
        !courier.vehicle_plate
      ) {
        return json({ error: "Complete CNH e dados do veículo antes da confirmação." }, 400, origin);
      }
    }

    const wasApproved = courier.status === "approved";
    const verifiedAt = new Date().toISOString();

    const { error: approveError } = await supabase
      .from("courier_profiles")
      .update({ status: "approved", phone_verified_at: verifiedAt, updated_at: verifiedAt })
      .eq("id", courier.id);

    if (approveError) return json({ error: "Não foi possível aprovar o cadastro." }, 500, origin);

    await supabase.schema("private").from("courier_whatsapp_otps").delete().eq("user_id", user.id);

    if (!wasApproved) {
      await supabase.from("user_notifications").insert({
        user_id: user.id,
        title: "Cadastro confirmado",
        message: "Seu número foi confirmado pelo WhatsApp. Seu cadastro de entregador está aprovado e você já pode ficar online.",
        type: "courier_approved",
        action_path: "/motoqueiro",
      });
    }

    return json({ ok: true, status: "approved", phone_verified_at: verifiedAt }, 200, origin);
  }

  return json({ error: "Ação inválida." }, 400, origin);
});
