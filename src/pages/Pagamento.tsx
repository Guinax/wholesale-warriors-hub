import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, CreditCard, QrCode, ShieldCheck, Wallet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, generateOrderCode, generateTrackingCode } from "@/lib/orderUtils";
import { logAudit } from "@/lib/audit";

type PaymentMethod = "pix" | "cartao";

const PIX_KEY = "wap33000@gmail.com";

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

const maskCard = (v: string) => onlyDigits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");

const maskExpiry = (v: string) => onlyDigits(v).slice(0, 4).replace(/(\d{2})(\d{1,2})/, "$1/$2");




const Pagamento = () => {
  const { items, totalPrice, clearCart } = useCart() as ReturnType<typeof useCart> & { clearCart?: () => void };
  const navigate = useNavigate();
  const { toast } = useToast();

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    cnpj: "",
    street: "",
    number: "",
    complement: "",
    city: "",
    state: "",
    zip: "",
  });

  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });

  useEffect(() => {
    if (items.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione produtos antes de pagar." });
      navigate("/");
    }
  }, [items.length, navigate, toast]);

  const pixCode = useMemo(
    () =>
      `00020126580014BR.GOV.BCB.PIX0136maromba-${Date.now()}5204000053039865406${totalPrice
        .toFixed(2)}5802BR5921LOJA FAMILIA MAROMBA6009SAO PAULO62070503***6304ABCD`,
    [totalPrice]
  );

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência.` });
  };

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
    if (onlyDigits(customer.zip).length !== 8) {
      toast({ title: "CEP inválido", description: "O CEP deve ter 8 dígitos.", variant: "destructive" });
      return false;
    }
    if (customer.cnpj && onlyDigits(customer.cnpj).length !== 14) {
      toast({ title: "CNPJ inválido", description: "O CNPJ deve ter 14 dígitos.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateCard = () => {
    if (method !== "cartao") return true;
    if (onlyDigits(card.number).length < 13) {
      toast({ title: "Número de cartão inválido", variant: "destructive" });
      return false;
    }
    if (!card.name.trim() || card.cvv.length < 3) {
      toast({ title: "Dados do cartão incompletos", variant: "destructive" });
      return false;
    }
    const [mm, yy] = card.expiry.split("/");
    if (!mm || !yy || +mm < 1 || +mm > 12 || yy.length < 2) {
      toast({ title: "Validade inválida", description: "Use o formato MM/AA.", variant: "destructive" });
      return false;
    }
    return true;
  };


  const handleConfirm = async () => {
    if (!validateCustomer() || !validateCard()) return;
    setSubmitting(true);

    const orderCode = generateOrderCode();
    const trackingCode = generateTrackingCode();

    const { error } = await supabase.from("orders").insert({
      order_code: orderCode,
      tracking_code: trackingCode,
      payment_method: method,
      payment_status: "paid",
      delivery_status: "postado",
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_cnpj: customer.cnpj || null,
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
      total_amount: totalPrice,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Erro ao processar pedido", description: error.message, variant: "destructive" });
      return;
    }

    await logAudit("order_created", {
      entity: "orders",
      entity_id: orderCode,
      details: { total: totalPrice, method, items: items.length },
    });

    clearCart?.();
    navigate(`/recibo/${orderCode}`);
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
          {/* Dados do cliente */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
            <h2 className="font-heading font-black text-sm tracking-wider text-foreground">
              DADOS DE ENTREGA
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome / Razão Social" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
              <Field label="CNPJ (opcional)" value={customer.cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" onChange={(v) => setCustomer({ ...customer, cnpj: maskCnpj(v) })} />
              <Field label="E-mail" type="email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
              <Field label="WhatsApp" value={customer.phone} inputMode="tel" placeholder="(00) 00000-0000" onChange={(v) => setCustomer({ ...customer, phone: maskPhone(v) })} />
              <Field label="Rua" value={customer.street} onChange={(v) => setCustomer({ ...customer, street: v })} />
              <Field label="Número" value={customer.number} inputMode="numeric" onChange={(v) => setCustomer({ ...customer, number: v })} />
              <Field label="Complemento" value={customer.complement} onChange={(v) => setCustomer({ ...customer, complement: v })} />
              <Field label="CEP" value={customer.zip} inputMode="numeric" placeholder="00000-000" onChange={(v) => setCustomer({ ...customer, zip: maskCep(v) })} />

              <Field label="Cidade" value={customer.city} onChange={(v) => setCustomer({ ...customer, city: v })} />
              <Field label="UF" value={customer.state} onChange={(v) => setCustomer({ ...customer, state: v.toUpperCase().slice(0, 2) })} />
            </div>
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
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-44 h-44 sm:w-48 sm:h-48 bg-white p-3 rounded-xl flex items-center justify-center">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage:
                          "linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)",
                        backgroundSize: "12px 12px",
                        backgroundPosition: "0 0, 6px 6px",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Escaneie o QR Code com o app do seu banco ou copie a chave Pix abaixo.
                  </p>
                </div>
                <CopyBox label="CHAVE PIX (E-MAIL)" value={PIX_KEY} onCopy={() => handleCopy(PIX_KEY, "Chave Pix")} />
                <CopyBox label="CÓDIGO PIX COPIA E COLA" value={pixCode} onCopy={() => handleCopy(pixCode, "Código Pix")} />
                <p className="text-xs font-heading font-bold text-primary text-center">
                  TOTAL: {formatCurrency(totalPrice)}
                </p>
              </TabsContent>

              <TabsContent value="cartao" className="mt-4 space-y-3">
                <Field label="Número do cartão" value={card.number} inputMode="numeric" onChange={(v) => setCard({ ...card, number: maskCard(v) })} placeholder="0000 0000 0000 0000" />
                <Field label="Nome impresso no cartão" value={card.name} onChange={(v) => setCard({ ...card, name: v.toUpperCase() })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Validade" value={card.expiry} inputMode="numeric" onChange={(v) => setCard({ ...card, expiry: maskExpiry(v) })} placeholder="MM/AA" />
                  <Field label="CVV" value={card.cvv} inputMode="numeric" placeholder="000" onChange={(v) => setCard({ ...card, cvv: v.replace(/\D/g, "").slice(0, 4) })} />

                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-primary" /> Pagamento criptografado. Em até 12x sem juros no atacado.
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
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-heading font-bold text-xs tracking-wider text-muted-foreground">TOTAL</span>
              <span className="font-heading font-black text-xl text-foreground">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <button
            disabled={submitting}
            onClick={handleConfirm}
            className="w-full bg-primary text-primary-foreground font-heading font-black text-sm tracking-wider py-4 rounded-lg hover:opacity-90 transition-opacity glow-neon disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "PROCESSANDO..." : "CONFIRMAR PAGAMENTO"}
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


const CopyBox = ({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] font-heading font-bold tracking-wider text-muted-foreground">{label}</Label>
    <div className="flex gap-2">
      <div className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-[11px] font-mono text-foreground truncate">
        {value}
      </div>
      <button
        onClick={onCopy}
        className="px-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        aria-label="Copiar"
      >
        <Copy className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default Pagamento;
