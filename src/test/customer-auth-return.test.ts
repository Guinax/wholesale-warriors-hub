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

  it("preserves the intended route through reseller signup without email confirmation", () => {
    const auth = read("src/pages/Auth.tsx");
    const reseller = read("src/pages/CadastroCNPJ.tsx");

    expect(auth).toContain('/cadastro?next=');
    expect(reseller).toContain("useSearchParams");
    expect(reseller).toContain('rawNext.startsWith("/")');
    expect(reseller).toContain('!rawNext.startsWith("//")');
    expect(reseller).toContain('reseller_registration');
    expect(reseller).toContain('navigate(`/auth?next=${encodeURIComponent(nextPath)}`, { replace: true })');
    expect(reseller).not.toContain("CONFIRME SEU E-MAIL");
    expect(reseller).not.toContain("supabase.auth.resend");
  });

  it("replaces auth history entries so the account back button cannot loop through login", () => {
    const auth = read("src/pages/Auth.tsx");
    const signup = read("src/pages/CadastroCliente.tsx");
    const reseller = read("src/pages/CadastroCNPJ.tsx");
    const account = read("src/pages/MinhaConta.tsx");
    const header = read("src/components/PageHeader.tsx");

    expect(auth).toContain("navigate(nextPath, { replace: true })");
    expect(auth).not.toContain("window.location.href = nextPath");
    expect(signup).toContain("navigate(nextPath, { replace: true })");
    expect(reseller).toContain("navigate(nextPath, { replace: true })");
    expect(account).toContain('backTo="/"');
    expect(header).toContain("backTo ? navigate(backTo) : navigate(-1)");
  });

  it("does not accept protocol-relative redirect targets", () => {
    const auth = read("src/pages/Auth.tsx");
    const signup = read("src/pages/CadastroCliente.tsx");
    const reseller = read("src/pages/CadastroCNPJ.tsx");
    expect(auth).toContain('!rawNext.startsWith("//")');
    expect(signup).toContain('!rawNext.startsWith("//")');
    expect(reseller).toContain('!rawNext.startsWith("//")');
  });
});
