import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return new Response(JSON.stringify({ ok: false, provider: "melhor_envio", error }), { status: 400, headers });
  }

  if (!code) {
    return new Response(JSON.stringify({ ok: true, provider: "melhor_envio", status: "callback_ready" }), { status: 200, headers });
  }

  // OAuth token exchange is enabled only after the Melhor Envio app
  // credentials are stored as server-side Supabase secrets.
  // Never log or return the authorization code.
  return new Response(JSON.stringify({
    ok: false,
    provider: "melhor_envio",
    status: "integration_not_configured",
    state_received: Boolean(state),
    next: "configure_oauth_credentials",
  }), { status: 503, headers });
});
