// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Melhor Envio integration contracts", () => {
  it("keeps OAuth tokens in private storage behind service-only RPCs", () => {
    const sql = read("supabase/migrations/20260930122000_prepare_melhor_envio_live_quotes.sql");
    expect(sql).toContain("create table if not exists private.melhor_envio_oauth");
    expect(sql).toContain("revoke all on table private.melhor_envio_oauth from public,anon,authenticated,service_role");
    expect(sql).toContain("grant execute on function public.service_melhor_envio_token() to service_role");
    expect(sql).toContain("service_melhor_envio_consume_oauth_state");
  });

  it("expires OAuth state after a short authorization window", () => {
    const sql = read("supabase/migrations/20260930123000_expire_melhor_envio_oauth_state.sql");
    expect(sql).toContain("interval '15 minutes'");
    expect(sql).toContain("oauth_state=p_state");
  });

  it("uses OAuth authorization code flow with anti-CSRF state and minimum shipping scope", () => {
    const source = read("supabase/functions/melhor-envio-callback/index.ts");
    expect(source).toContain('scope: "shipping-calculate"');
    expect(source).toContain("service_melhor_envio_begin_oauth");
    expect(source).toContain("service_melhor_envio_consume_oauth_state");
    expect(source).toContain('grant_type: "authorization_code"');
    expect(source).toContain("/oauth/token");
    expect(source).toContain('/functions/v1/melhor-envio-callback');
    expect(source).toContain("/functions/v1/melhor-envio-callback");
    expect(source).not.toContain("console.log(accessToken");
  });

  it("refreshes expired tokens server-side and retries a 401 quote once", () => {
    const source = read("supabase/functions/melhor-envio-quote/index.ts");
    expect(source).toContain('grant_type: "refresh_token"');
    expect(source).toContain("service_melhor_envio_store_token");
    expect(source).toContain("refresh_expires_at");
    expect(source).toContain("requestQuote(accessToken)");
    expect(source).toContain("response.status === 401");
    expect(source).toContain("provider_unauthorized_after_refresh");
  });

  it("quotes against the official shipment calculate endpoint and trusts custom price", () => {
    const source = read("supabase/functions/melhor-envio-quote/index.ts");
    expect(source).toContain("/api/v2/me/shipment/calculate");
    expect(source).toContain("custom_price");
    expect(source).toContain("custom_delivery_time");
    expect(source).toContain('originCep: (Deno.env.get("MELHOR_ENVIO_ORIGIN_CEP") ?? "13495041")');
  });

  it("falls back instead of inventing package data when product dimensions are missing", () => {
    const source = read("supabase/functions/melhor-envio-quote/index.ts");
    expect(source).toContain('reason: "missing_product_dimensions"');
    expect(source).toContain("weight_kg,width_cm,height_cm,length_cm");
  });

  it("invalidates a live cart quote when cart quantities change", () => {
    const context = read("src/contexts/CartContext.tsx");
    const drawer = read("src/components/CartDrawer.tsx");
    expect(context).toContain('shipping.source === "melhor_envio" && shipping.itemsKey === currentItemsKey');
    expect(drawer).toContain('source = "melhor_envio"');
    expect(drawer).toContain("itemsKey");
  });

  it("keeps provider credentials out of the browser integration client", () => {
    const source = read("src/lib/liveShipping.ts");
    expect(source).not.toContain("MELHOR_ENVIO_CLIENT_SECRET");
    expect(source).not.toContain("MELHOR_ENVIO_CLIENT_ID");
    expect(source).toContain('supabase.functions.invoke("melhor-envio-quote"');
  });
});
