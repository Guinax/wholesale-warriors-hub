import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, QrCode, ShieldCheck, Wallet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { computeDueAt, formatCurrency, generateOrderCode, generateTrackingCode } from "@/lib/orderUtils";
import { logAudit } from "@/lib/audit";
import { createPaymentLink } from "@/lib/payments";
import { lookupCep, shippingCostFor, shippingEtaFor } from "@/lib/shipping";

type PaymentMethod = "pix" | "cartao";

const FIELD_LABELS: Record<string, string> = {
  name: "Nome / Razão Social",
  email: "E-mail",
  phone: "WhatsApp",
  street: "Rua",
  number: "Número",
  city: "Cidade",
  state: "UF",
  zip: "CEP",
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
};

const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d{0,3})/, (_, a, b) => (b ? `${a}-${b}` : a));

const maskCnpj = (v: string) =>
  onlyDigits(v)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

const maskCpf = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");


const Pagamento = () => {
  const { items, totalPrice, clearCart } = useCart() as ReturnType<typeof useCart> & { clearCart?: () => void };
  const navigate = useNavigate();
  const { toast } = useToast();

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);
  const pendingOrder = useRef<{ code: string; snapshot: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingEta, setShippingEta] = useState("");
  const [checkingCep, setCheckingCep] = useState(false);
  const [validCep, setValidCep] = useState(false);
  const [validatedState, setValidatedState] = useState("");
  const [docType, setDocType] = useState<"cpf" | "cnpj">("cpf");

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    cnpj: "",
    cpf: "",
    street: "",
    number: "",
    complement: "",
    city: "",
    state: "",
    zip: "",
  });


  useEffect(() => {
    if (items.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione produtos antes de pagar." });
      navigate("/");
    }
  }, [items.length, navigate, toast]);

  // Carrega automaticamente os dados salvos no cadastro
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoadingProfile(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name,email,phone,cnpj,cpf,address_street,address_number,address_complement,address_city,address_state,address_zip")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const filled = {
          name: data.full_name ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
          cnpj: data.cnpj ?? "",
          cpf: data.cpf ?? "",
          street: data.address_street ?? "",
          number: data.address_number ?? "",
          complement: data.address_complement ?? "",
          city: data.address_city ?? "",
          state: data.address_state ?? "",
          zip: data.address_zip ?? "",
        };
        setCustomer(filled);
        setDocType(filled.cnpj && !filled.cpf ? "cnpj" : "cpf");
        const complete = filled.name && filled.email && filled.phone && filled.street && filled.number && filled.city && filled.state && filled.zip;
        if (!complete) setEditing(true);

      } else {
        setEditing(true);
      }
      setLoadingProfile(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const digits = onlyDigits(customer.zip);
    if (digits.length !== 8) {
      setValidCep(false);
      setValidatedState("");
      setShippingCost(0);
      setShippingEta("");
      return;
    }
    let active = true;
    setCheckingCep(true);
    lookupCep(customer.zip).then((info) => {
      if (!active) return;
      if (!info) {
        setValidCep(false);
        setValidatedState("");
        setShippingCost(0);
        setShippingEta("");
        setCheckingCep(false);
        return;
      }
      setValidCep(true);
      setValidatedState(info.state);
      setCustomer((current) => ({
        ...current,
        zip: info.cep,
        street: current.street || info.street,
        city: info.city,
        state: info.state,
      }));
      setShippingCost(shippingCostFor(info.state, totalPrice));
      setShippingEta(shippingEtaFor(info.state));
      setCheckingCep(false);
    });
    return () => { active = false; };
  }, [customer.zip, totalPrice]);

  const orderTotal = totalPrice + shippingCost;

  const validateCustomer = () => {
    const required: (keyof typeof customer)[] = ["name", "email", "phone", "street", "number", "city", "state", "zip"];
    for (const k of required) {
      if (!customer[k].trim()) {
        toast({ title: "Dados incompletos", description: `Preencha: ${FIELD_LABELS[k] ?? k}`, variant: "destructive" });
        return false;
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return false;
    }
    if (onlyDigits(customer.phone).length < 10) {
      toast({ title: "WhatsApp inválido", description: "Informe DDD + número.", variant: "destructive" });
      return false;
    }
    if (onlyDigits(customer.zip).length !== 8 || checkingCep || !validCep || customer.state !== validatedState) {
      toast({ title: "CEP inválido", description: checkingCep ? "Aguarde a validação do CEP." : "Informe um CEP válido para calcular o frete.", variant: "destructive" });
      return false;
    }
    if (docType === "cnpj") {
      if (onlyDigits(customer.cnpj).length !== 14) {
        toast({ title: "CNPJ inválido", description: "O CNPJ deve ter 14 dígitos.", variant: "destructive" });
        return false;
      }
    } else if (onlyDigits(customer.cpf).length !== 11) {
      toast({ title: "CPF inválido", description: "O CPF deve ter 11 dígitos.", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleConfirm = async () => {
    if (submitting) return;
    if (!validateCustomer()) return;
    setSubmitting(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setSubmitting(false);
      toast({ title: "Entre na sua conta para continuar", variant: "destructive" });
      navigate(`/auth?next=${encodeURIComponent("/pagamento")}`);
      return;
    }

    const snapshot = JSON.stringify({ customer, docType, method, items, orderTotal });
    const reusableOrder = pendingOrder.current?.snapshot === snapshot ? pendingOrder.current : null;
    const orderCode = reusableOrder?.code ?? generateOrderCode();
    const trackingCode = generateTrackingCode();
    const dueAt = computeDueAt();

    if (!reusableOrder) {
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      order_code: orderCode,
      tracking_code: trackingCode,
      payment_method: method,
      // Pix aguarda compensação: expira 2h após o vencimento se não for pago
      payment_status: "pending",
      due_at: dueAt.toISOString(),
      delivery_status: "aguardando_pagamento",
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_cnpj: docType === "cnpj" ? customer.cnpj : null,
      customer_cpf: docType === "cpf" ? customer.cpf : null,

      address_street: customer.street,
      address_number: customer.number,
      address_complement: customer.complement || null,
      address_city: customer.city,
      address_state: customer.state,
      address_zip: customer.zip,
      items: items.map((i) => ({
        name: i.name,
        qty: i.qty,
        unit_price: i.priceNum,
        subtotal: i.priceNum * i.qty,
      })),
      total_amount: orderTotal,
    });

    if (error) {
      setSubmitting(false);
      toast({ title: "Erro ao processar pedido", description: error.message, variant: "destructive" });
      return;
    }
    pendingOrder.current = { code: orderCode, snapshot };

    await logAudit("order_created", {
      entity: "orders",
      entity_id: orderCode,
      details: { subtotal: totalPrice, shipping: shippingCost, total: orderTotal, method, items: items.length },
    });

    // Salva automaticamente os dados no perfil para pré-preencher próximas compras
    try {
      await supabase
          .from("profiles")
          .update({
            full_name: customer.name,
            phone: customer.phone,
            ...(docType === "cnpj" ? { cnpj: customer.cnpj || null } : { cpf: customer.cpf || null }),
            address_street: customer.street,
            address_number: customer.number,
            address_complement: customer.complement || null,
            address_city: customer.city,
            address_state: customer.state,
            address_zip: customer.zip,
          })
          .eq("user_id", user.id);
    } catch {
      // falha ao salvar perfil não deve bloquear o pedido
    }


    }

    // Gera a cobrança oficial (Pix/cartão) na InfinitePay e leva o cliente ao checkout
    try {
      const checkoutUrl = await createPaymentLink(orderCode, `${window.location.origin}/recibo/${orderCode}`);
      clearCart?.();
      window.location.href = checkoutUrl;
    } catch (error) {
      toast({
        title: "Pagamento indisponível",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="CHECKOUT SEGURO"
        title="FINALIZAR PAGAMENTO"
        subtitle="Escolha entre Pix ou cartão de crédito. Compra mínima: 1 unidade."
      />

      <main className="container px-3 sm:px-4 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 sm:gap-6 pb-24">
        <div className="lg:hidden">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-xs font-heading font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> VOLTAR ÀS COMPRAS
          </button>
        </div>
        {/* Form */}
        <section className="space-y-4 sm:space-y-6">
          {/* Dados do cliente (vindos do cadastro) */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading font-black text-sm tracking-wider text-foreground">
                DADOS DE ENTREGA
              </h2>
              {!loadingProfile && (
                <button
                  onClick={() => setEditing((e) => !e)}
                  className="text-[11px] font-heading font-bold tracking-wider text-primary hover:underline"
                >
                  {editing ? "USAR DADOS SALVOS" : "EDITAR DADOS"}
                </button>
              )}
            </div>

            {loadingProfile ? (
              <p className="text-xs text-muted-foreground">Carregando seus dados cadastrados...</p>
            ) : !editing ? (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="text-foreground font-semibold">{customer.name}</p>
                {docType === "cnpj"
                  ? customer.cnpj && <p>CNPJ: {customer.cnpj}</p>
                  : customer.cpf && <p>CPF: {customer.cpf}</p>}

                <p>{customer.email} · {customer.phone}</p>
                <p>
                  {customer.street}, {customer.number}
                  {customer.complement ? ` — ${customer.complement}` : ""}
                </p>
                <p>
                  {customer.city}/{customer.state} · CEP {customer.zip}
                </p>
                <p className="text-[10px] pt-1">
                  Dados salvos no seu cadastro. É só confirmar o pagamento.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-[10px] font-heading font-bold tracking-wider text-muted-foreground">
                    TIPO DE DOCUMENTO
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cpf", "cnpj"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDocType(t)}
                        className={`py-2 rounded-md text-[11px] font-heading font-bold tracking-wider border transition-colors ${
                          docType === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-muted-foreground border-border"
                        }`}
                      >
                        {t === "cpf" ? "CPF (PESSOA FÍSICA)" : "CNPJ (EMPRESA)"}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Nome / Razão Social" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
                {docType === "cnpj" ? (
                  <Field label="CNPJ" value={customer.cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" onChange={(v) => setCustomer({ ...customer, cnpj: maskCnpj(v) })} />
                ) : (
                  <Field label="CPF" value={customer.cpf} inputMode="numeric" placeholder="000.000.000-00" onChange={(v) => setCustomer({ ...customer, cpf: maskCpf(v) })} />
                )}
                <Field label="E-mail" type="email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
                <Field label="WhatsApp" value={customer.phone} inputMode="tel" placeholder="(00) 00000-0000" onChange={(v) => setCustomer({ ...customer, phone: maskPhone(v) })} />

                <Field label="Rua" value={customer.street} onChange={(v) => setCustomer({ ...customer, street: v })} />
                <Field label="Número" value={customer.number} inputMode="numeric" onChange={(v) => setCustomer({ ...customer, number: v })} />
                <Field label="Complemento" value={customer.complement} onChange={(v) => setCustomer({ ...customer, complement: v })} />
                <Field label="CEP" value={customer.zip} inputMode="numeric" placeholder="00000-000" onChange={(v) => {
                  const zip = maskCep(v);
                  setValidCep(false);
                  setValidatedState("");
                  setShippingCost(0);
                  setShippingEta("");
                  setCustomer((current) => onlyDigits(current.zip) === onlyDigits(zip)
                    ? { ...current, zip }
                    : { ...current, zip, street: "", city: "", state: "" });
                }} />
                <Field label="Cidade" value={customer.city} onChange={(v) => setCustomer({ ...customer, city: v })} />
                <Field label="UF" value={customer.state} onChange={(v) => setCustomer({ ...customer, state: v.toUpperCase().slice(0, 2) })} />
              </div>
            )}
          </div>


          {/* Métodos de pagamento */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-heading font-black text-sm tracking-wider text-foreground">
              FORMA DE PAGAMENTO
            </h2>
            <Tabs value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <TabsList className="w-full grid grid-cols-2 bg-secondary">
                <TabsTrigger value="pix" className="gap-1.5"><QrCode className="w-3.5 h-3.5" /> PIX</TabsTrigger>
                <TabsTrigger value="cartao" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> CARTÃO</TabsTrigger>
              </TabsList>

              <TabsContent value="pix" className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">O Pix será apresentado no checkout seguro da InfinitePay após continuar.</p>
              </TabsContent>

              <TabsContent value="cartao" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> Os dados do cartão são informados somente no checkout seguro da InfinitePay.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Resumo */}
        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-heading font-black text-sm tracking-wider text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" /> RESUMO DO LOTE
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={i.name} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate pr-2">
                    {i.qty}× {i.name}
                  </span>
                  <span className="text-foreground font-semibold whitespace-nowrap">
                    {formatCurrency(i.priceNum * i.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Produtos</span><span>{formatCurrency(totalPrice)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Frete</span><span>{checkingCep ? "Calculando..." : shippingCost === 0 && shippingEta ? "Grátis" : formatCurrency(shippingCost)}</span></div>
              {shippingEta && <p className="text-[10px] text-muted-foreground">Prazo estimado: {shippingEta}</p>}
              <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-heading font-bold text-xs tracking-wider text-muted-foreground">TOTAL</span>
              <span className="font-heading font-black text-xl text-foreground">{formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>

          <button
            disabled={submitting || checkingCep || !validCep || customer.state !== validatedState}
            onClick={handleConfirm}
            className="w-full bg-primary text-primary-foreground font-heading font-black text-sm tracking-wider py-4 rounded-lg hover:opacity-90 transition-opacity glow-neon disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "ABRINDO CHECKOUT..." : "PAGAR NA INFINITEPAY"}
          </button>
          <p className="text-[10px] text-muted-foreground text-center">
            Ao confirmar, você concorda com os termos de venda no atacado.
          </p>
        </aside>
      </main>
    </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
}) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] font-heading font-bold tracking-wider text-muted-foreground">
      {label}
    </Label>
    <Input
      type={type}
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="bg-secondary border-border text-foreground"
    />
  </div>
);


export default Pagamento;
