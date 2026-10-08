import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const digits = (value: string) => value.replace(/\D/g, "");
const formatPhone = (value: string) => {
  const d = digits(value).slice(0, 11);
  return d.length <= 10
    ? d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`).trim()
    : d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
};

export default function CadastroCliente() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\") ? rawNext : "/minha-conta";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [resending, setResending] = useState(false);
  const [resendAfter, setResendAfter] = useState(0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return toast.error("Informe seu nome.");
    if (digits(phone).length < 10) return toast.error("Informe um WhatsApp válido com DDD.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast.error("E-mail inválido.");
    if (secret.length < 8) return toast.error("Use uma senha com pelo menos 8 caracteres.");
    if (secret !== confirmSecret) return toast.error("As senhas não coincidem.");

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: secret,
        options: {
          emailRedirectTo: `${window.location.origin}${nextPath}`,
          data: { full_name: name.trim(), phone },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Não foi possível criar sua conta.");
      if (data.user.identities?.length === 0) {
        toast.error("Este e-mail já possui uma conta. Entre ou recupere sua senha.");
        return;
      }
      setSecret("");
      setConfirmSecret("");
      if (data.session) navigate(nextPath, { replace: true });
      else {
        setSentTo(normalizedEmail);
        setResendAfter(Date.now() + 60_000);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (resending) return;
    if (Date.now() < resendAfter) {
      toast.info("Aguarde um minuto entre os envios.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: sentTo,
        options: { emailRedirectTo: `${window.location.origin}${nextPath}` },
      });
      if (error) throw error;
      setResendAfter(Date.now() + 60_000);
      toast.success("Confirmação reenviada. Confira sua caixa de entrada e o spam.");
    } catch (error) {
      const code = (error as { code?: string })?.code;
      toast.error(code === "over_email_send_rate_limit" || code === "over_request_rate_limit"
        ? "Muitas tentativas. Aguarde alguns minutos e tente novamente."
        : "Não foi possível reenviar o e-mail agora.");
    } finally {
      setResending(false);
    }
  };

  if (sentTo) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-4">
        <Card className="w-full max-w-md p-6 text-center space-y-4">
          <h1 className="font-heading font-black text-2xl">CONFIRME SEU E-MAIL</h1>
          <p className="text-sm text-muted-foreground">
            Enviamos um link para <strong>{sentTo}</strong>. Confirme sua conta e depois entre para continuar.
          </p>
          <Button variant="outline" className="w-full" disabled={resending} onClick={() => void resendConfirmation()}>
            {resending ? "REENVIANDO..." : "REENVIAR CONFIRMAÇÃO"}
          </Button>
          <Button className="w-full" onClick={() => navigate(`/auth?next=${encodeURIComponent(nextPath)}`, { replace: true })}>IR PARA O LOGIN</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center">
          <img src={logo} alt="Adega Maromba" className="w-20 h-20 object-contain mx-auto" />
          <h1 className="font-heading font-black text-2xl">CRIAR CONTA</h1>
          <p className="text-sm text-muted-foreground mt-1">Pessoa física — compra a partir de 1 unidade.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></div>
          <div><Label>WhatsApp</Label><Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" autoComplete="tel" required /></div>
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
          <div><Label>Senha</Label><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="new-password" minLength={8} required /></div>
          <div><Label>Confirmar senha</Label><Input type="password" value={confirmSecret} onChange={(e) => setConfirmSecret(e.target.value)} autoComplete="new-password" minLength={8} required /></div>
          <Button type="submit" className="w-full font-heading font-black" disabled={loading}>
            {loading ? "CRIANDO..." : "CRIAR CONTA PARA COMPRAR"}
          </Button>
        </form>

        <div className="border-t pt-4 text-center space-y-2">
          <button onClick={() => navigate("/cadastro")} className="text-xs text-primary hover:underline">Sou empresa ou revendedor — cadastro CNPJ</button>
          <br />
          <button onClick={() => navigate("/auth")} className="text-xs text-muted-foreground hover:text-foreground">Já tenho conta — entrar</button>
        </div>
      </Card>
    </div>
  );
}
