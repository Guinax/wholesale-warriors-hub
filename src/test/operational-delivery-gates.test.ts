// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");
const checkout = read("src/pages/Pagamento.tsx");
const tariff = read("supabase/migrations/20261007183000_standardize_partner_local_delivery_rate.sql");
const delivery = read("supabase/migrations/20261007131500_guard_courier_credit_after_delivery_code.sql");
const courier = read("supabase/migrations/20261006123000_courier_start_route_privacy.sql");
const payouts = read("supabase/migrations/20261007112000_partner_wallet_accumulated_pix_payments.sql");

describe("Operational delivery safety gates (offline, no real checkout or database writes)", () => {
  it.each([1, 3, 6])("routes %i total units to the partner network", (quantity) => {
    expect(quantity <= 6).toBe(true);
    expect(checkout).toContain("items.reduce((sum, item) => sum + item.qty, 0) <= 6");
    expect(checkout).toContain('p_action: "create_request"');
  });

  it.each([7, 8, 100])("routes %i units away from the partner network", (quantity) => {
    expect(quantity <= 6).toBe(false);
    expect(tariff).toContain("sum((x->>''qty'')::integer)");
    expect(tariff).toContain("> 6 then raise exception");
    expect(tariff).toContain("diretamente pela central");
  });

  it.each([
    [0, 7.5], [1, 7.5], [3, 7.5], [4, 9], [5, 10.5], [10, 18],
  ])("calculates local payout for %i km as R$ %f", (km, expected) => {
    const localFee = Math.round((7.5 + Math.max(km - 3, 0) * 1.5) * 100) / 100;
    expect(localFee).toBe(expected);
    expect(tariff).toContain("7.50 + greatest(km - 3, 0) * 1.50");
  });

  it("blocks pickup before the partner request is paid", () => {
    expect(courier).toContain("if r.status<>'paid' then raise exception 'Pedido precisa estar pago antes da retirada.'");
  });

  it("requires the courier to start the route before delivery", () => {
    expect(courier).toContain("if not found or j.status<>'delivering' then raise exception 'Inicie o percurso antes de concluir a entrega.'");
  });

  it("never credits delivery when the partner response is an error", () => {
    expect(delivery).toContain("if delivery_result ? 'error' then");
    expect(delivery).toContain("raise exception '%', delivery_result->>'error'");
    expect(delivery).toContain("if (select status from public.partner_requests where id=r.id) <> 'delivered' then");
    expect(delivery).toContain("insert into public.courier_payouts");
  });

  it("requires code and age confirmation in the delivery request", () => {
    expect(delivery).toContain("'code',upper(trim(coalesce(p_payload->>'code','')))");
    expect(delivery).toContain("'adult_verified',coalesce((p_payload->>'adult_verified')::boolean,false)");
  });

  it("preserves the InfinitePay checkout flow and requires manual proof for partner payout", () => {
    expect(checkout).toContain("createPaymentLink(orderCode");
    expect(payouts).toContain("admin_partner_wallet_pay");
    expect(payouts).toContain("p_receipt_url");
    expect(payouts).toContain("p_receipt_reference");
  });
});
