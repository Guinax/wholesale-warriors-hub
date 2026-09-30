import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, ArrowLeft, MessageCircle, Eye, EyeOff } from "lucide-react";
import { contactWhatsApp } from "@/lib/whatsapp";
import { logAudit } from "@/lib/audit";
import logo from "@/assets/logo.png";

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
  const [mode, setMode] = useState<"login" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  useEffect(() => {
    document.title = "Cadastro e Login | Família Maromba";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = nextPath;
    });
  }, [nextPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      {
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
        {mode === "recovery" && (
          <button type="button" onClick={() => setMode("login")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar para o login
          </button>
        )}
        <div className="text-center space-y-1">
          <img src={logo} alt="Mansão Maromba" className="w-20 h-20 object-contain mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Família Maromba</h1>
          <p className="text-sm text-muted-foreground">{mode === "recovery" ? "Recupere sua senha" : "Entre para finalizar compras e acessar sua conta"}</p>
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
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" placeholder="seu@email.com" /></div></div>
            <div className="space-y-2"><Label htmlFor="password">Senha</Label><div className="relative"><Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={1} placeholder="••••••••" className="pr-10" /><button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{mode === "login" && <button type="button" onClick={() => { setRecoverySent(false); setMode("recovery"); }} className="text-xs text-primary hover:underline">Esqueci minha senha</button>}</div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Aguarde..." : "Entrar"}</Button>
          </form>
        )}
        <div className="text-center text-sm space-y-2">{mode === "login" && <button onClick={() => navigate("/cadastro")} className="text-primary hover:underline">Não tem conta? Cadastre-se</button>}</div>
        <button onClick={() => contactWhatsApp("Olá! Preciso de suporte com a Representante Oficial Família Maromba.")} className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-heading font-bold text-sm py-3 rounded-lg hover:opacity-90 transition-opacity"><MessageCircle className="w-4 h-4" />SUPORTE VIA WHATSAPP</button>
        <p className="text-[10px] text-muted-foreground text-center">(19) 97115-1107 — atendimento direto com nossa equipe</p>
      </Card>
    </div>
  );
};

export default Auth;
