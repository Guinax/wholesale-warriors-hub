import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, Mail, ArrowLeft, MessageCircle, User, Phone } from "lucide-react";
import { contactWhatsApp } from "@/lib/whatsapp";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Cadastro e Login | Família Maromba";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("Cadastro realizado! Você já pode entrar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado!");
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Ir para a loja
        </button>
        <div className="text-center space-y-1">
          <div className="inline-flex p-3 rounded-full bg-primary/10">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold">Família Maromba</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Entre com suas credenciais" : "Crie sua conta para comprar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-9"
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="pl-9"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9"
                placeholder="seu@email.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>

        <div className="text-center text-sm">
          {mode === "login" ? (
            <button onClick={() => setMode("signup")} className="text-primary hover:underline">
              Não tem conta? Cadastre-se
            </button>
          ) : (
            <button onClick={() => setMode("login")} className="text-primary hover:underline">
              Já tem conta? Entrar
            </button>
          )}
        </div>

        <button
          onClick={() => contactWhatsApp("Olá! Preciso de suporte com a Loja Família Maromba.")}
          className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-heading font-bold text-sm py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="w-4 h-4" />
          SUPORTE VIA WHATSAPP
        </button>
        <p className="text-[10px] text-muted-foreground text-center">
          (19) 97115-1107 — atendimento direto com nossa equipe
        </p>
      </Card>
    </div>
  );
};

export default Auth;
