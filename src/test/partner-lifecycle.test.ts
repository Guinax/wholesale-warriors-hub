// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Partner delivery and payout lifecycle contracts", () => {
  it("allows the paid partner request state used by payment synchronization", () => {
    const sql = read("supabase/migrations/20260930110000_sync_partner_request_when_order_paid.sql");
    expect(sql).toContain("status='paid'");
    expect(sql).toContain("payment_pending");
    expect(sql).toContain("delivering");
    expect(sql).toContain("delivered");
  });

  it("keeps payout states and one payout per request constrained", () => {
    const sql = read("supabase/migrations/20260929233500_secure_partner_payout_lifecycle.sql");
    expect(sql).toContain("status in ('pending','eligible','approved','paid','cancelled')");
    expect(sql).toContain("partner_payouts_one_per_request_idx");
    expect(sql).toContain("unique index");
  });

  it("allows payout progress only after paid and delivered", () => {
    const sql = read("supabase/migrations/20260929233500_secure_partner_payout_lifecycle.sql");
    expect(sql).toContain("o.payment_status is distinct from 'paid'");
    expect(sql).toContain("r.status is distinct from 'delivered'");
    expect(sql).toContain("Repasse só pode avançar após pagamento e entrega confirmados.");
  });

  it("requires approver and transfer proof before payout is paid", () => {
    const sql = read("supabase/migrations/20260929233500_secure_partner_payout_lifecycle.sql");
    expect(sql).toContain("new.status='approved' and new.approved_by is null");
    expect(sql).toContain("new.status='paid'");
    expect(sql).toContain("new.paid_by is null");
    expect(sql).toContain("receipt_reference");
    expect(sql).toContain("new.paid_at is null");
  });

  it("prevents reopening a payout already marked paid", () => {
    const sql = read("supabase/migrations/20260929233500_secure_partner_payout_lifecycle.sql");
    expect(sql).toContain("old.status='paid'");
    expect(sql).toContain("Repasse pago não pode ser reaberto.");
  });

  it("blocks delivery when reserved partner stock is inconsistent", () => {
    const sql = read("supabase/migrations/20260930040000_harden_partner_delivery_payout.sql");
    expect(sql).toContain("on_hand>=v.qty and reserved>=v.qty");
    expect(sql).toContain("Reserva de estoque inconsistente. Entrega bloqueada para conferência.");
  });

  it("does not expire partner stock while payment is unresolved", () => {
    const sql = read("supabase/migrations/20260930100000_protect_pending_partner_payments_from_expiry.sql");
    expect(sql).toContain("status in ('searching','accepted','quoted')");
    expect(sql).not.toContain("status in ('searching','accepted','quoted','payment_pending')");
  });

  it("blocks an expired or cancelled order from becoming paid automatically", () => {
    const sql = read("supabase/migrations/20260930113000_block_late_payment_after_inventory_release.sql");
    expect(sql).toContain("old.payment_status in ('expired','cancelled','canceled')");
    expect(sql).toContain("new.payment_status='paid'");
    expect(sql).toContain("Pagamento tardio exige reconciliacao manual");
  });

  it("keeps admin payout actions explicit in the UI", () => {
    const source = read("src/components/admin/PayoutsManager.tsx");
    expect(source).toContain('"approve_payout"');
    expect(source).toContain('"record_payout"');
    expect(source).toContain("receipt_reference");
  });
});
