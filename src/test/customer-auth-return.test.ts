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

  it("resends signup confirmation to the same intended destination", () => {
    const signup = read("src/pages/CadastroCliente.tsx");
    expect(signup).toContain('supabase.auth.resend');
    expect(signup).toContain('type: "signup"');
    expect(signup).toContain('emailRedirectTo: `${window.location.origin}${nextPath}`');
    expect(signup).toContain("Date.now() + 60_000");
    expect(signup).toContain("over_email_send_rate_limit");
  });

  it("does not accept protocol-relative redirect targets", () => {
    const auth = read("src/pages/Auth.tsx");
    const signup = read("src/pages/CadastroCliente.tsx");
    expect(auth).toContain('!rawNext.startsWith("//")');
    expect(signup).toContain('!rawNext.startsWith("//")');
  });
});
