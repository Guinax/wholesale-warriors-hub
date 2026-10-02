// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Public storefront and auth routing contracts", () => {
  it("keeps the storefront public while protecting purchase and account routes", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('<Route path="/" element={<Index />} />');
    expect(app).toContain('<Route path="/pagamento" element={<ProtectedRoute><Pagamento /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/recibo/:code" element={<ProtectedRoute><Recibo /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/minha-conta" element={<ProtectedRoute><MinhaConta /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/revendedor" element={<ProtectedRoute><PainelRevendedor /></ProtectedRoute>} />');
    expect(app).toContain('<Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />');
  });

  it("gives guests an explicit login entry from the public header", () => {
    const top = read("src/components/TopNav.tsx");
    expect(top).toContain("!session");
    expect(top).toContain('navigate("/auth")');
    expect(top).toContain("ENTRAR");
  });

  it("exposes the partner area and keeps operational panels approval-gated", () => {
    const top = read("src/components/TopNav.tsx");
    const bottom = read("src/components/BottomNav.tsx");
    const panel = read("src/pages/PainelRevendedor.tsx");
    expect(top).toContain("PARCEIROS");
    expect(top).toContain('navigate("/parceiros")');
    expect(top).toContain('navigate("/revendedor")');
    expect(bottom).toContain('label: "PARCEIROS"');
    expect(bottom).toContain('navigate("/parceiros")');
    expect(read("src/App.tsx")).toContain('<Route path="/parceiros" element={<Partners />} />');
    expect(read("src/pages/Partners.tsx")).toContain('navigate("/revendedor")');
    expect(panel).toContain('const approvedStores = stores.filter((s) => s.status === "approved");');
    expect(panel).toContain("{hasApprovedStore && <>");
    expect(panel).toContain("{approvedStores.map((store)=>");
    expect(panel).toContain("liberados somente para lojas aprovadas");
  });

  it("does not allow an external next redirect after login", () => {
    const auth = read("src/pages/Auth.tsx");
    expect(auth).toContain('rawNext.startsWith("/")');
    expect(auth).toContain('!rawNext.startsWith("//")');
    expect(auth).toContain('!rawNext.includes("\\\\")');
    expect(auth).toContain('"/minha-conta"');
  });
});
