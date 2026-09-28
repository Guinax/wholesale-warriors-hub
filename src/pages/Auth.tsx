import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Mail, ArrowLeft, MessageCircle, User, Phone, Eye, EyeOff, MapPin } from "lucide-react";
import { contactWhatsApp } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
};
const maskCpf = (v: string) =>
  onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1-$2");
const maskCnpj = (v: string) =>
  onlyDigits(v)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d{0,3})/, (_, a, b) => (b ? `${a}-${b}` : a));

const getAuthError = (err: unknown) => {
  if (err && typeof err === "object") {
    const value = err as { code?: unknown; message?: unknown };
    return {
      code: typeof value.code === "string" ? value.code : undefined,
      message: typeof value.message === "string" ? value.message : undefined,
    };
  }
  return {};
};

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\") ? rawNext : "/minha-conta";
  const [mode, setMode] = useState<"login" | "signup" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    document.title = "Cadastro e Login | Família Maromba";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = nextPath;
    });
  }, [nextPath]);

  const validateSignup = () => {
    if (onlyDigits(phone).length < 10) {
      toast.error("Informe um WhatsApp válido com DDD");
      return false;
    }
    if (onlyDigits(cpf).length !== 11) {
      toast.error("Informe um CPF válido (11 dígitos)");
      return false;
    }
    if (cnpj && onlyDigits(cnpj).length !== 14) {
      toast.error("CNPJ inválido (14 dígitos)");
      return false;
    }
    if (onlyDigits(zip).length !== 8) {
      toast.error("CEP inválido (8 dígitos)");
      return false;
    }
    if (!street.trim() || !number.trim() || !city.trim() || uf.trim().length !== 2) {
      toast.error("Preencha o endereço completo (rua, número, cidade e UF)");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !validateSignup()) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${nextPath}`,
            data: {
              full_name: fullName,
              phone,
              cpf,
              cnpj: cnpj || null,
              address_street: street,
              address_number: number,
              address_complement: complement || null,
              address_city: city,
              address_state: uf.toUpperCase(),
              address_zip: zip,
            },
          },
        });
        if (error) throw error;
        if (!data.user || data.user.identities?.length === 0) {
          throw new Error("Este e-mail já pode ter cadastro. Tente entrar ou recuperar sua senha.");
        }
        setPassword("");
        await logAudit("signup", { details: { email } });
        toast.success(data.session
          ? "Cadastro realizado! Você já pode entrar na loja."
          : "Cadastro solicitado. Confirme seu e-mail pelo link recebido antes de entrar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await logAudit("login", { details: { email } });
        toast.success("Login realizado!");
        window.location.href = nextPath;
      }
    } catch (err: unknown) {
      const authError = getAuthError(err);
      toast.error(authError.code === "invalid_credentials"
        ? "E-mail ou senha incorretos. Se ainda não criou sua conta nesta loja, toque em Cadastre-se."
        : authError.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) {
      toast.error("Digite seu e-mail para receber o link de recuperação");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setRecoverySent(true);
      toast.success("Enviamos um link de recuperação para seu e-mail.");
    } catch (err: unknown) {
      const authError = getAuthError(err);
      toast.error(authError.message || "Erro ao enviar e-mail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Ir para a loja
        </button>
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 rounded-full bg-primary/10"><Lock className="w-6 h-6 text-primary" /></div>
          <h1 className="text-2xl font-heading font-bold">Família Maromba</h1>
          <p className="text-sm text-muted-foreground">{mode === "login" ? "Entre com suas credenciais" : mode === "recovery" ? "Recupere sua senha" : "Crie sua conta para comprar"}</p>
        </div>
        {mode === "recovery" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            {!recoverySent ? <>
              <div className="space-y-2"><Label htmlFor="email">E-mail cadastrado</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" placeholder="seu@email.com" /></div><p className="text-xs text-muted-foreground">Enviaremos um link seguro para redefinir sua senha.</p></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Aguarde..." : "Enviar link de recuperação"}</Button>
            </> : <div className="rounded-lg bg-primary/10 p-4 text-center space-y-2"><Mail className="w-8 h-8 text-primary mx-auto" /><p className="text-sm font-medium">Verifique sua caixa de entrada</p><p className="text-xs text-muted-foreground">Enviamos instruções para <strong>{email}</strong>. Não esqueça de olhar o spam.</p></div>}
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && <>
              <div className="space-y-2"><Label htmlFor="name">Nome completo</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="pl-9" placeholder="Seu nome" /></div></div>
              <div className="space-y-2"><Label htmlFor="phone">WhatsApp</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="phone" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} required inputMode="tel" className="pl-9" placeholder="(00) 00000-0000" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="cpf">CPF</Label><Input id="cpf" value={cpf} inputMode="numeric" required placeholder="000.000.000-00" onChange={(e) => setCpf(maskCpf(e.target.value))} /></div><div className="space-y-2"><Label htmlFor="cnpj">CNPJ (opcional)</Label><Input id="cnpj" value={cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" onChange={(e) => setCnpj(maskCnpj(e.target.value))} /></div></div>
              <div className="space-y-2"><Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5" /> Endereço de entrega</Label><div className="grid grid-cols-2 gap-3"><Input value={zip} inputMode="numeric" required placeholder="CEP 00000-000" onChange={(e) => setZip(maskCep(e.target.value))} /><Input value={number} inputMode="numeric" required placeholder="Número" onChange={(e) => setNumber(e.target.value)} /></div><Input value={street} required placeholder="Rua / Avenida" onChange={(e) => setStreet(e.target.value)} /><Input value={complement} placeholder="Complemento (opcional)" onChange={(e) => setComplement(e.target.value)} /><div className="grid grid-cols-[1fr_80px] gap-3"><Input value={city} required placeholder="Cidade" onChange={(e) => setCity(e.target.value)} /><Input value={uf} required placeholder="UF" onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} /></div></div>
            </>}
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" placeholder="seu@email.com" /></div></div>
            <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "signup" ? 8 : 1} placeholder="••••••••" className="pr-10" /><button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{mode === "login" && <button type="button" onClick={() => { setRecoverySent(false); setMode("recovery"); }} className="text-xs text-primary hover:underline">Esqueci minha senha</button>}</div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}</Button>
          </form>
        )}
        <div className="text-center text-sm space-y-2">{mode === "recovery" ? <button onClick={() => setMode("login")} className="text-primary hover:underline">Voltar para o login</button> : mode === "login" ? <button onClick={() => setMode("signup")} className="text-primary hover:underline">Não tem conta? Cadastre-se</button> : <button onClick={() => setMode("login")} className="text-primary hover:underline">Já tem conta? Entrar</button>}</div>
        <button onClick={() => contactWhatsApp("Olá! Preciso de suporte com a Loja Família Maromba.")} className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-heading font-bold text-sm py-3 rounded-lg hover:opacity-90 transition-opacity"><MessageCircle className="w-4 h-4" />SUPORTE VIA WHATSAPP</button>
        <p className="text-[10px] text-muted-foreground text-center">(19) 97115-1107 — atendimento direto com nossa equipe</p>
      </Card>
    </div>
  );
};

export default Auth;
