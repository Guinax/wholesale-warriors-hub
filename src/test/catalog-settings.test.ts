// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Catalog settings and home realtime contracts", () => {
  it("exposes catalog settings read-only to guests and admin-writable through RLS", () => {
    const sql = read("supabase/migrations/20260930135000_ensure_catalog_settings_data_api.sql");
    expect(sql).toContain("alter table public.catalog_settings enable row level security");
    expect(sql).toContain("to anon, authenticated");
    expect(sql).toContain("grant select on table public.catalog_settings to anon,authenticated");
    expect(sql).toContain("grant insert,update on table public.catalog_settings to authenticated");
    expect(sql).toContain("with check (private.is_admin())");
    expect(sql).toContain("using (private.is_admin())");
  });

  it("publishes catalog settings to Supabase Realtime", () => {
    const sql = read("supabase/migrations/20260930135500_enable_catalog_settings_realtime.sql");
    expect(sql).toContain("alter publication supabase_realtime add table public.catalog_settings");
  });

  it("keeps the home catalog synced with products and catalog settings", () => {
    const source = read("src/components/CatalogSection.tsx");
    expect(source).toContain('channel("home-catalog-realtime")');
    expect(source).toContain('table: "products"');
    expect(source).toContain('table: "catalog_settings"');
    expect(source).toContain('document.visibilityState === "visible"');
    expect(source).toContain("supabase.removeChannel(channel)");
  });

  it("uses typed catalog settings instead of bypassing the client type system", () => {
    const db = read("src/integrations/supabase/database.ts");
    const section = read("src/components/CatalogSection.tsx");
    const manager = read("src/components/admin/CatalogManager.tsx");
    expect(db).toContain("catalog_settings: CatalogSettingsTable");
    expect(section).not.toContain('"catalog_settings" as never');
    expect(manager).not.toContain('"catalog_settings" as never');
  });
});
