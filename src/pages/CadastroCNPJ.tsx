import { useForm } from "react-hook-form";
import { ArrowLeft, Building2, User, MapPin, Phone, FileText } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";
import { isValidCnpj } from "@/lib/brDocuments";

interface CadastroForm {
  password: string;
  confirmPassword: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  responsavel: string;
  cpfResponsavel: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  segmento: string;
  observacoes: string;
}

const formatCNPJ = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  }
  return digits.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3");
};

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
};

const CadastroCNPJ = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\") ? rawNext : "/minha-conta";
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CadastroForm>();

  const onSubmit = async (form: CadastroForm) => {
    try {
      const { data: current, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (current.session) {
        toast.error("Você já está conectado. Acesse Minha conta para consultar seu cadastro ou saia antes de criar outra conta.");
        return;
      }
      // Never include either password in user metadata.
      const { password, confirmPassword: _confirmation, ...registration } = form;
      const email = registration.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: registration.responsavel.trim(),
            phone: registration.whatsapp || registration.telefone,
            cpf: registration.cpfResponsavel,
            cnpj: registration.cnpj,
            address_street: registration.endereco.trim(),
            address_number: registration.numero.trim(),
            address_complement: registration.complemento || null,
            address_city: registration.cidade.trim(),
            address_state: registration.estado,
            address_zip: registration.cep,
            // Descriptive data only; never use this metadata to grant roles.
            reseller_registration: { ...registration, email },
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Não foi possível concluir o cadastro. Tente novamente.");
      if (data.user.identities?.length === 0) {
        toast.error("Não foi possível criar outra conta com este e-mail. Tente entrar ou recuperar sua senha.");
        return;
      }
      setValue("password", "");
      setValue("confirmPassword", "");
      if (data.session) await supabase.auth.signOut();
      toast.success("Cadastro concluído! Entre com seu e-mail e senha.");
      navigate(`/auth?next=${encodeURIComponent(nextPath)}`, { replace: true });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      toast.error(code === "over_email_send_rate_limit" || code === "over_request_rate_limit"
        ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
        : code === "user_already_exists"
        ? "Este e-mail já possui uma conta. Entre ou recupere sua senha."
        : code === "email_address_not_authorized"
        ? "O envio para este e-mail ainda não está liberado. Entre em contato com o suporte."
        : error instanceof Error ? error.message : "Não foi possível enviar o cadastro. Tente novamente.");
    }
  };

  return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-heading font-black text-2xl text-foreground">
            {confirmed ? "CADASTRO CONCLUÍDO!" : "CONFIRME SEU E-MAIL"}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {confirmed
              ? "Seu cadastro foi salvo. Você já pode acessar sua conta."
              : <>Seu cadastro foi recebido. Enviamos um link para <strong>{submittedEmail}</strong>. Abra o e-mail para confirmar sua conta e acessar a plataforma. Confira também a pasta de spam.</>}
          </p>
          {!confirmed && <Button variant="outline" className="w-full" disabled={resending} onClick={resendConfirmation}>
            {resending ? "REENVIANDO..." : "REENVIAR CONFIRMAÇÃO"}
          </Button>}
          <Button onClick={() => confirmed
            ? navigate(nextPath, { replace: true })
            : navigate(`/auth?next=${encodeURIComponent(nextPath)}`, { replace: true })
          } className="w-full font-heading font-bold tracking-wider">
            {nextPath === "/minha-conta" ? "ACESSAR MINHA CONTA" : "CONTINUAR"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="container flex items-center h-14 gap-3">
          <button onClick={() => navigate("/")} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <img src={logo} alt="Família Maromba" className="w-7 h-7 object-contain" />
          <span className="font-heading font-bold text-xs tracking-wider text-foreground">
            CADASTRO REVENDEDOR
          </span>
        </div>
      </header>

      <div className="container px-4 py-8 max-w-lg mx-auto space-y-8">
        {/* Intro */}
        <div className="space-y-3">
          <h1 className="font-heading font-black text-3xl text-foreground italic leading-tight">
            CADASTRE SEU <span className="text-primary">CNPJ</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Preencha os dados abaixo para se tornar um revendedor oficial. Pedido mínimo: <span className="font-bold text-foreground">R$ 2.500,00</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Dados da Empresa */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="w-4 h-4" />
              <h2 className="font-heading font-bold text-sm tracking-wider">DADOS DA EMPRESA</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="razaoSocial">Razão Social *</Label>
                <Input id="razaoSocial" placeholder="Nome registrado na Receita Federal" {...register("razaoSocial", { required: "Campo obrigatório" })} />
                {errors.razaoSocial && <p className="text-destructive text-xs mt-1">{errors.razaoSocial.message}</p>}
              </div>
              <div>
                <Label htmlFor="nomeFantasia">Nome Fantasia *</Label>
                <Input id="nomeFantasia" placeholder="Nome comercial da empresa" {...register("nomeFantasia", { required: "Campo obrigatório" })} />
                {errors.nomeFantasia && <p className="text-destructive text-xs mt-1">{errors.nomeFantasia.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    {...register("cnpj", {
                      required: "Campo obrigatório",
                      validate: (v) => isValidCnpj(v) || "CNPJ inválido",
                    })}
                    onChange={(e) => setValue("cnpj", formatCNPJ(e.target.value))}
                  />
                  {errors.cnpj && <p className="text-destructive text-xs mt-1">{errors.cnpj.message}</p>}
                </div>
                <div>
                  <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
                  <Input id="inscricaoEstadual" placeholder="Opcional" {...register("inscricaoEstadual")} />
                </div>
              </div>
              <div>
                <Label htmlFor="segmento">Segmento *</Label>
                <select
                  id="segmento"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register("segmento", { required: "Selecione um segmento" })}
                >
                  <option value="">Selecione o segmento</option>
                  <option value="academia">Academia / CrossFit</option>
                  <option value="loja_suplementos">Loja de Suplementos</option>
                  <option value="distribuidora">Distribuidora</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="bar_restaurante">Bar / Restaurante</option>
                  <option value="outro">Outro</option>
                </select>
                {errors.segmento && <p className="text-destructive text-xs mt-1">{errors.segmento.message}</p>}
              </div>
            </div>
          </section>

          {/* Dados do Responsável */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <User className="w-4 h-4" />
              <h2 className="font-heading font-bold text-sm tracking-wider">RESPONSÁVEL</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="responsavel">Nome Completo *</Label>
                <Input id="responsavel" placeholder="Nome do responsável" {...register("responsavel", { required: "Campo obrigatório" })} />
                {errors.responsavel && <p className="text-destructive text-xs mt-1">{errors.responsavel.message}</p>}
              </div>
              <div>
                <Label htmlFor="cpfResponsavel">CPF do Responsável *</Label>
                <Input
                  id="cpfResponsavel"
                  placeholder="000.000.000-00"
                  {...register("cpfResponsavel", {
                    required: "Campo obrigatório",
                    validate: (v) => v.replace(/\D/g, "").length === 11 || "CPF inválido",
                  })}
                  onChange={(e) => setValue("cpfResponsavel", formatCPF(e.target.value))}
                />
                {errors.cpfResponsavel && <p className="text-destructive text-xs mt-1">{errors.cpfResponsavel.message}</p>}
              </div>
            </div>
          </section>

          {/* Contato */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Phone className="w-4 h-4" />
              <h2 className="font-heading font-bold text-sm tracking-wider">CONTATO</h2>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com"
                  {...register("email", { required: "Campo obrigatório", pattern: { value: /^\S+@\S+\.\S+$/, message: "E-mail inválido" } })}
                />
                {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    placeholder="(00) 0000-0000"
                    {...register("telefone", { required: "Campo obrigatório" })}
                    onChange={(e) => setValue("telefone", formatPhone(e.target.value))}
                  />
                  {errors.telefone && <p className="text-destructive text-xs mt-1">{errors.telefone.message}</p>}
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    placeholder="(00) 00000-0000"
                    {...register("whatsapp")}
                    onChange={(e) => setValue("whatsapp", formatPhone(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-heading font-bold text-sm text-primary tracking-wider">ACESSO À CONTA</h2>
            <div>
              <Label htmlFor="password">Senha *</Label>
              <Input id="password" type="password" autoComplete="new-password"
                {...register("password", { required: "Crie uma senha", minLength: { value: 8, message: "Use pelo menos 8 caracteres" } })} />
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirme a senha *</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password"
                {...register("confirmPassword", { required: "Confirme sua senha", validate: value => value === watch("password") || "As senhas não coincidem" })} />
              {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </section>

          {/* Endereço */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-4 h-4" />
              <h2 className="font-heading font-bold text-sm tracking-wider">ENDEREÇO</h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Label htmlFor="cep">CEP *</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    {...register("cep", { required: "Campo obrigatório" })}
                    onChange={(e) => setValue("cep", formatCEP(e.target.value))}
                  />
                  {errors.cep && <p className="text-destructive text-xs mt-1">{errors.cep.message}</p>}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="endereco">Endereço *</Label>
                  <Input id="endereco" placeholder="Rua, Avenida..." {...register("endereco", { required: "Campo obrigatório" })} />
                  {errors.endereco && <p className="text-destructive text-xs mt-1">{errors.endereco.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="numero">Número *</Label>
                  <Input id="numero" placeholder="Nº" {...register("numero", { required: "Obrigatório" })} />
                  {errors.numero && <p className="text-destructive text-xs mt-1">{errors.numero.message}</p>}
                </div>
                <div className="col-span-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" placeholder="Sala, andar..." {...register("complemento")} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="bairro">Bairro *</Label>
                  <Input id="bairro" placeholder="Bairro" {...register("bairro", { required: "Obrigatório" })} />
                  {errors.bairro && <p className="text-destructive text-xs mt-1">{errors.bairro.message}</p>}
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input id="cidade" placeholder="Cidade" {...register("cidade", { required: "Obrigatório" })} />
                  {errors.cidade && <p className="text-destructive text-xs mt-1">{errors.cidade.message}</p>}
                </div>
                <div>
                  <Label htmlFor="estado">UF *</Label>
                  <select
                    id="estado"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...register("estado", { required: "Obrigatório" })}
                  >
                    <option value="">UF</option>
                    {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                  {errors.estado && <p className="text-destructive text-xs mt-1">{errors.estado.message}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Observações */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-4 h-4" />
              <h2 className="font-heading font-bold text-sm tracking-wider">OBSERVAÇÕES</h2>
            </div>
            <Textarea
              placeholder="Conte-nos mais sobre seu negócio, volume estimado de compras, etc."
              {...register("observacoes")}
              className="min-h-[100px]"
            />
          </section>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full font-heading font-black text-sm tracking-wider py-6 glow-neon">
            {isSubmitting ? "ENVIANDO..." : "CRIAR CONTA"}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Ao enviar, você concorda com nossos termos de uso e política de privacidade. Seus dados serão utilizados exclusivamente para fins comerciais.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CadastroCNPJ;
