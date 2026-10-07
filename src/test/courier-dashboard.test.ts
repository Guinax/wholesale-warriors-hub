// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Courier professional dashboard contracts", () => {
  it("keeps the courier dashboard behind authentication and returns to it after login", () => {
    const app = read("src/App.tsx");
    const page = read("src/pages/Motoqueiro.tsx");
    expect(app).toContain('<Route path="/motoqueiro" element={<ProtectedRoute><Motoqueiro /></ProtectedRoute>} />');
    expect(page).toContain('to="/auth?next=%2Fmotoqueiro"');
    expect(page).toContain('navigate("/motoqueiro", { replace: true })');
  });

  it("sends courier entry buttons through the protected dashboard route", () => {
    const banner = read("src/components/CourierRecruitmentBanner.tsx");
    const landing = read("src/pages/Entregadores.tsx");
    const guard = read("src/components/ProtectedRoute.tsx");
    expect(banner).toContain('navigate("/motoqueiro")');
    expect(landing).toContain('navigate("/motoqueiro")');
    expect(guard).toContain('return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;');
  });

  it("renders a map-first operational dashboard connected to real courier jobs", () => {
    const page = read("src/pages/Motoqueiro.tsx");
    const map = read("src/components/courier/CourierMap.tsx");
    expect(page).toContain("Mapa operacional");
    expect(page).toContain("<CourierMap");
    expect(page).toContain('job.status === "searching"');
    expect(page).toContain('command("accept_job"');
    expect(page).toContain('command("pickup_job"');
    expect(page).toContain('command("deliver_job"');
    expect(map).toContain("Mapa operacional do entregador");
    expect(map).toContain("tile.openstreetmap.org");
  });


  it("requires explicit route start before exposing the customer destination", () => {
    const page = read("src/pages/Motoqueiro.tsx");
    const migration = read("supabase/migrations/20261006123000_courier_start_route_privacy.sql");
    expect(page).toContain("ABRIR ROTA PARA COLETA");
    expect(page).toContain("Iniciar percurso");
    expect(page).toContain("ABRIR GOOGLE MAPS");
    expect(page).toContain('command("start_delivery"');
    expect(migration).toContain("j2.courier_id=c.id and j2.status='delivering'");
    expect(migration).toContain("Inicie o percurso antes de concluir a entrega.");
  });
  it("keeps customer dropoff coordinates private until a courier owns the job", () => {
    const migration = read("supabase/migrations/20261003200500_courier_document_completion.sql");
    expect(migration).toContain("'dropoff_lat',case when j2.courier_id=c.id then r2.lat else null end");
    expect(migration).toContain("'dropoff_lng',case when j2.courier_id=c.id then r2.lng else null end");
    expect(migration).toContain("'customer_street',case when j2.courier_id=c.id then r2.customer->>'street' else null end");
  });

  it("requires approval and online presence before accepting jobs", () => {
    const migration = read("supabase/migrations/20261003200500_courier_document_completion.sql");
    expect(migration).toContain("if c.status<>'approved' or not c.is_online then raise exception 'Fique online para aceitar corridas.'");
    expect(migration).toContain("j.status<>'searching' or j.courier_id is not null");
  });
});
