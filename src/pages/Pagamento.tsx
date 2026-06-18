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

type PaymentMethod = "pix" | "cartao";

const PIX_KEY = "wap33000@gmail.com";


const Pagamento = () => {
  const { items, totalPrice, clearCart } = useCart() as ReturnType<typeof useCart> & { clearCart?: () => void };
  const navigate = useNavigate();
  const { toast } = useToast();

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [cryptoCoin, setCryptoCoin] = useState<"BTC" | "USDT">("BTC");
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
        toast({ title: "Dados incompletos", description: `Preencha: ${k}`, variant: "destructive" });
        return false;
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateCard = () => {
    if (method !== "cartao") return true;
    if (card.number.replace(/\s/g, "").length < 13) {
      toast({ title: "Número de cartão inválido", variant: "destructive" });
      return false;
    }
    if (!card.name || !card.expiry || card.cvv.length < 3) {
      toast({ title: "Dados do cartão incompletos", variant: "destructive" });
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

    clearCart?.();
    navigate(`/recibo/${orderCode}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="CHECKOUT SEGURO"
        title="FINALIZAR PAGAMENTO"
        subtitle="Escolha entre Pix, cartão de crédito ou criptomoedas. Pedido mínimo: R$ 2.500,00."
      />

      <main className="container py-6 grid lg:grid-cols-[1fr_380px] gap-6 pb-24">
        {/* Form */}
        <section className="space-y-6">
          {/* Dados do cliente */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-heading font-black text-sm tracking-wider text-foreground">
              DADOS DE ENTREGA
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome / Razão Social" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
              <Field label="CNPJ (opcional)" value={customer.cnpj} onChange={(v) => setCustomer({ ...customer, cnpj: v })} />
              <Field label="E-mail" type="email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
              <Field label="WhatsApp" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
              <Field label="Rua" value={customer.street} onChange={(v) => setCustomer({ ...customer, street: v })} />
              <Field label="Número" value={customer.number} onChange={(v) => setCustomer({ ...customer, number: v })} />
              <Field label="Complemento" value={customer.complement} onChange={(v) => setCustomer({ ...customer, complement: v })} />
              <Field label="CEP" value={customer.zip} onChange={(v) => setCustomer({ ...customer, zip: v })} />
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
              <TabsList className="w-full grid grid-cols-3 bg-secondary">
                <TabsTrigger value="pix" className="gap-1.5"><QrCode className="w-3.5 h-3.5" /> PIX</TabsTrigger>
                <TabsTrigger value="cartao" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> CARTÃO</TabsTrigger>
                <TabsTrigger value="cripto" className="gap-1.5"><Bitcoin className="w-3.5 h-3.5" /> CRIPTO</TabsTrigger>
              </TabsList>

              <TabsContent value="pix" className="mt-4 space-y-4">
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-48 h-48 bg-white p-3 rounded-xl flex items-center justify-center">
                    {/* QR fake visual */}
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
                    Escaneie o QR Code com o app do seu banco ou copie o código Pix abaixo.
                  </p>
                </div>
                <CopyBox label="CÓDIGO PIX COPIA E COLA" value={pixCode} onCopy={() => handleCopy(pixCode, "Código Pix")} />
                <p className="text-xs font-heading font-bold text-primary text-center">
                  TOTAL: {formatCurrency(totalPrice)}
                </p>
              </TabsContent>

              <TabsContent value="cartao" className="mt-4 space-y-3">
                <Field label="Número do cartão" value={card.number} onChange={(v) => setCard({ ...card, number: v })} placeholder="0000 0000 0000 0000" />
                <Field label="Nome impresso no cartão" value={card.name} onChange={(v) => setCard({ ...card, name: v.toUpperCase() })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Validade" value={card.expiry} onChange={(v) => setCard({ ...card, expiry: v })} placeholder="MM/AA" />
                  <Field label="CVV" value={card.cvv} onChange={(v) => setCard({ ...card, cvv: v.replace(/\D/g, "").slice(0, 4) })} />
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-primary" /> Pagamento criptografado. Em até 12x sem juros no atacado.
                </p>
              </TabsContent>

              <TabsContent value="cripto" className="mt-4 space-y-4">
                <div className="flex gap-2">
                  {(["BTC", "USDT"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCryptoCoin(c)}
                      className={`flex-1 py-2.5 rounded-lg font-heading font-black text-xs tracking-wider transition-colors ${
                        cryptoCoin === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c === "BTC" ? "BITCOIN" : "USDT (TRC20)"}
                    </button>
                  ))}
                </div>
                <CopyBox
                  label={`ENDEREÇO ${cryptoCoin}`}
                  value={CRYPTO_WALLETS[cryptoCoin]}
                  onCopy={() => handleCopy(CRYPTO_WALLETS[cryptoCoin], `Endereço ${cryptoCoin}`)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Envie o equivalente a <strong className="text-foreground">{formatCurrency(totalPrice)}</strong> em {cryptoCoin}.
                  A confirmação ocorre após {cryptoCoin === "BTC" ? "2 confirmações na rede" : "1 confirmação na TRC20"}.
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] font-heading font-bold tracking-wider text-muted-foreground">
      {label}
    </Label>
    <Input
      type={type}
      value={value}
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
