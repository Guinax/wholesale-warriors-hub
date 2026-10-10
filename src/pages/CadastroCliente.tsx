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
const countries = [
  ["BR", "Brasil", "55"], ["PT", "Portugal", "351"], ["US", "Estados Unidos", "1"],
  ["CA", "Canadá", "1"], ["AR", "Argentina", "54"], ["UY", "Uruguai", "598"],
  ["PY", "Paraguai", "595"], ["CL", "Chile", "56"], ["BO", "Bolívia", "591"],
  ["PE", "Peru", "51"], ["CO", "Colômbia", "57"], ["VE", "Venezuela", "58"],
  ["EC", "Equador", "593"], ["MX", "México", "52"], ["CR", "Costa Rica", "506"],
  ["PA", "Panamá", "507"], ["DO", "República Dominicana", "1"], ["CU", "Cuba", "53"],
  ["GT", "Guatemala", "502"], ["HN", "Honduras", "504"], ["SV", "El Salvador", "503"],
  ["NI", "Nicarágua", "505"], ["GB", "Reino Unido", "44"], ["IE", "Irlanda", "353"],
  ["ES", "Espanha", "34"], ["FR", "França", "33"], ["DE", "Alemanha", "49"],
  ["IT", "Itália", "39"], ["CH", "Suíça", "41"], ["AT", "Áustria", "43"],
  ["NL", "Países Baixos", "31"], ["BE", "Bélgica", "32"], ["LU", "Luxemburgo", "352"],
  ["SE", "Suécia", "46"], ["NO", "Noruega", "47"], ["DK", "Dinamarca", "45"],
  ["FI", "Finlândia", "358"], ["PL", "Polônia", "48"], ["UA", "Ucrânia", "380"],
  ["TR", "Turquia", "90"], ["RU", "Rússia", "7"], ["JP", "Japão", "81"],
  ["CN", "China", "86"], ["KR", "Coreia do Sul", "82"], ["IN", "Índia", "91"],
  ["AE", "Emirados Árabes Unidos", "971"], ["IL", "Israel", "972"],
  ["AU", "Austrália", "61"], ["NZ", "Nova Zelândia", "64"],
  ["ZA", "África do Sul", "27"], ["AO", "Angola", "244"], ["MZ", "Moçambique", "258"],
  ["CV", "Cabo Verde", "238"], ["GW", "Guiné-Bissau", "245"], ["ST", "São Tomé e Príncipe", "239"],
] as const;

export default function CadastroCliente() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\") ? rawNext : "/";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("BR");
  const [customDialCode, setCustomDialCode] = useState("");
  const dialCode = country === "OTHER" ? digits(customDialCode) : countries.find(([code]) => code === country)?.[2] ?? "55";
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
    const nationalPhone = digits(phone);
    if (!dialCode || dialCode.length > 3) return toast.error("Informe um código de país válido.");
    if (nationalPhone.length < 4 || nationalPhone.length > 14 || (dialCode + nationalPhone).length > 15) return toast.error("Informe um WhatsApp válido para o país escolhido.");
    const internationalPhone = `+${dialCode}${nationalPhone}`;
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
          data: { full_name: name.trim(), phone: internationalPhone, phone_country: country },
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
          <img src={logo} alt="Família Maromba" className="w-20 h-20 object-contain mx-auto" />
          <h1 className="font-heading font-black text-2xl">CRIAR CONTA</h1>
          <p className="text-sm text-muted-foreground mt-1">Pessoa física — compra a partir de 1 unidade.</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></div>
          <div className="space-y-2">
            <Label htmlFor="phone-country">País do WhatsApp</Label>
            <select id="phone-country" value={country} onChange={(e) => { setCountry(e.target.value); setPhone(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {countries.map(([code, label, callingCode]) => <option key={code} value={code}>{label} (+{callingCode})</option>)}
              <option value="OTHER">Outro país — informar DDI</option>
            </select>
            {country === "OTHER" && <div><Label htmlFor="phone-ddi">Código internacional (DDI)</Label><Input id="phone-ddi" inputMode="numeric" placeholder="Ex.: 234" value={customDialCode} onChange={(e) => setCustomDialCode(digits(e.target.value).slice(0, 3))} required /></div>}
            <Label htmlFor="signup-phone">WhatsApp com código de área</Label>
            <div className="flex items-center gap-2"><span className="shrink-0 rounded-md border border-input bg-muted px-3 py-2 text-sm">+{dialCode}</span><Input id="signup-phone" value={phone} onChange={(e) => setPhone(digits(e.target.value).slice(0, 14))} inputMode="tel" autoComplete="tel-national" placeholder={country === "BR" ? "11999999999" : "Número com código de área"} required /></div>
          </div>
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
