// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Customer auth return flow", () => {
  it("preserves the intended checkout route through customer signup", () => {
    const auth = read("src/pages/Auth.tsx");
    const signup = read("src/pages/CadastroCliente.tsx");

    expect(auth).toContain('/cadastro-cliente?next=');
    expect(auth).toContain("encodeURIComponent(nextPath)");

    expect(signup).toContain("useSearchParams");
    expect(signup).toContain('rawNext.startsWith("/")');
    expect(signup).toContain('!rawNext.startsWith("//")');
    expect(signup).toContain('emailRedirectTo: `${window.location.origin}${nextPath}`');
    expect(signup).toContain('/auth?next=');
  });

  it("does not accept protocol-relative redirect targets", () => {
    const auth = read("src/pages/Auth.tsx");
    const signup = read("src/pages/CadastroCliente.tsx");
    expect(auth).toContain('!rawNext.startsWith("//")');
    expect(signup).toContain('!rawNext.startsWith("//")');
  });
});
