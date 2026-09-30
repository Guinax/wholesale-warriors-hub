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
    expect(app).toContain('<Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />');
  });

  it("gives guests an explicit login entry from the public header", () => {
    const top = read("src/components/TopNav.tsx");
    expect(top).toContain("!session");
    expect(top).toContain('navigate("/auth")');
    expect(top).toContain("ENTRAR");
  });

  it("does not allow an external next redirect after login", () => {
    const auth = read("src/pages/Auth.tsx");
    expect(auth).toContain('rawNext.startsWith("/")');
    expect(auth).toContain('!rawNext.startsWith("//")');
    expect(auth).toContain('!rawNext.includes("\\\\")');
    expect(auth).toContain('"/minha-conta"');
  });
});
