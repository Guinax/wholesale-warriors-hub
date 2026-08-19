import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Package, Truck, MapPin, Home, MessageCircle, RefreshCw } from "lucide-react";
import jsPDF from "jspdf";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { DELIVERY_STAGES, formatCurrency, computeExpiresAt, formatCountdown, isOrderExpired } from "@/lib/orderUtils";
import { contactWhatsApp } from "@/lib/whatsapp";
import { checkPaymentStatus } from "@/lib/payments";
import { useToast } from "@/hooks/use-toast";


interface Order {
  order_code: string;
  tracking_code: string;
  payment_method: string;
  payment_status: string;
  delivery_status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cnpj: string | null;
  address_street: string;
  address_number: string;
  address_complement: string | null;
  address_city: string;
  address_state: string;
  address_zip: string;
  items: Array<{ name: string; qty: number; unit_price: number; subtotal: number }>;
  total_amount: number;
  created_at: string;
  due_at?: string | null;
  expires_at?: string | null;
}

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão de Crédito",
  cripto: "Criptomoeda",
};

const Recibo = () => {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchOrder = useCallback(async () => {
    if (!code) return null;
    const { data: rows } = await supabase.rpc("get_order_by_code", { _order_code: code });
    const data = Array.isArray(rows) ? rows[0] : rows;
    const next = (data as unknown as Order) ?? null;
    setOrder(next);
    return next;
  }, [code]);

  useEffect(() => {
    (async () => {
      await fetchOrder();
      setLoading(false);
    })();
  }, [fetchOrder]);

  const runPaymentCheck = useCallback(
    async (silent = false) => {
      if (!code) return;
      setChecking(true);
      const res = await checkPaymentStatus(code, {
        transaction_nsu: searchParams.get("transaction_nsu") ?? undefined,
        slug: searchParams.get("slug") ?? undefined,
      });
      setChecking(false);

      if (res.error) {
        if (!silent) {
          toast({ title: "Não foi possível verificar", description: res.error, variant: "destructive" });
        }
        return;
      }

      if (res.paid) {
        await fetchOrder();
        toast({ title: "Pagamento confirmado!", description: "Seu pedido foi aprovado." });
      } else if (!silent) {
        toast({ title: "Pagamento ainda não identificado", description: "Tente novamente em alguns instantes." });
      }
    },
    [code, fetchOrder, searchParams, toast]
  );

  // Verificação automática enquanto o pagamento estiver pendente
  useEffect(() => {
    if (!order || order.payment_status !== "pending") return;
    if (isOrderExpired(order.payment_status, order.due_at)) return;
    runPaymentCheck(true);
    const id = setInterval(() => runPaymentCheck(true), 20000);
    return () => clearInterval(id);
  }, [order?.payment_status, order?.due_at, order, runPaymentCheck]);


  const handleDownloadPDF = () => {
    if (!order) return;
    const doc = new jsPDF();
    const lh = 7;
    let y = 15;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("LOJA OFICIAL FAMÍLIA MAROMBA", 105, y, { align: "center" });
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RECIBO DE PEDIDO", 105, y, { align: "center" });
    y += 10;

    doc.setDrawColor(180);
    doc.line(15, y, 195, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.text(`Pedido: ${order.order_code}`, 15, y);
    doc.text(`Data: ${new Date(order.created_at).toLocaleString("pt-BR")}`, 195, y, { align: "right" });
    y += lh;
    doc.text(`Rastreio: ${order.tracking_code}`, 15, y);
    doc.text(`Pagamento: ${PAYMENT_LABEL[order.payment_method] ?? order.payment_method}`, 195, y, { align: "right" });
    y += lh;
    doc.text(`Status: ${order.payment_status.toUpperCase()}`, 15, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", 15, y);
    y += lh;
    doc.setFont("helvetica", "normal");
    doc.text(`${order.customer_name}`, 15, y); y += lh;
    if (order.customer_cnpj) { doc.text(`CNPJ: ${order.customer_cnpj}`, 15, y); y += lh; }
    doc.text(`${order.customer_email} | ${order.customer_phone}`, 15, y); y += lh;
    doc.text(
      `${order.address_street}, ${order.address_number}${order.address_complement ? ` - ${order.address_complement}` : ""}`,
      15, y
    ); y += lh;
    doc.text(`${order.address_city}/${order.address_state} - CEP ${order.address_zip}`, 15, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("ITENS", 15, y);
    y += lh;
    doc.setFont("helvetica", "normal");
    order.items.forEach((it) => {
      doc.text(`${it.qty}x ${it.name}`, 15, y);
      doc.text(formatCurrency(it.subtotal), 195, y, { align: "right" });
      y += lh;
    });

    y += 4;
    doc.line(15, y, 195, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("TOTAL", 15, y);
    doc.text(formatCurrency(order.total_amount), 195, y, { align: "right" });

    y += 14;
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Acompanhe sua entrega informando o código de rastreio ${order.tracking_code}.`,
      105, y, { align: "center" }
    );

    doc.save(`recibo-${order.order_code}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <p className="text-muted-foreground">Carregando recibo...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="RECIBO NÃO ENCONTRADO" subtitle="O código informado não foi localizado." />
        <div className="container py-10 text-center">
          <Link to="/" className="text-primary underline font-heading font-bold">
            Voltar para a loja
          </Link>
        </div>
      </div>
    );
  }

  void now;
  const expired = isOrderExpired(order.payment_status, order.due_at);
  const pending = order.payment_status === "pending" && !expired;
  const countdown = order.due_at ? formatCountdown(computeExpiresAt(order.due_at)) : "";
  const stageIndex = DELIVERY_STAGES.findIndex((s) => s.key === order.delivery_status);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow={expired ? "PEDIDO EXPIRADO" : pending ? "AGUARDANDO PAGAMENTO" : "PAGAMENTO CONFIRMADO"}
        title={expired ? "PRAZO ENCERRADO" : pending ? "PEDIDO EM ABERTO" : "PEDIDO RECEBIDO!"}
        subtitle={
          expired
            ? "Este pedido não foi pago dentro do prazo e foi cancelado automaticamente."
            : pending
              ? "Conclua o pagamento antes do prazo para garantir seu lote."
              : "Salve seu código de rastreio para acompanhar a entrega."
        }
      />

      <main className="container py-6 max-w-3xl space-y-5 pb-24">
        {/* Confirmação */}
        <div className="bg-card border-2 border-primary rounded-2xl p-6 text-center space-y-3 glow-neon">
          <div className="w-14 h-14 rounded-full bg-primary/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-heading font-black text-xl text-foreground italic">
            {expired ? "PAGAMENTO EXPIRADO" : pending ? "PAGAMENTO PENDENTE" : "PAGAMENTO APROVADO"}
          </h2>
          {order.due_at && (pending || expired) && (
            <div className="text-xs space-y-1">
              <p className="text-muted-foreground">
                Vencimento: {new Date(order.due_at).toLocaleString("pt-BR")}
              </p>
              <p className="text-muted-foreground">
                Expira em: {computeExpiresAt(order.due_at).toLocaleString("pt-BR")}
              </p>
              {pending && (
                <p className="font-heading font-black text-base text-primary">
                  Tempo restante: {countdown}
                </p>
              )}
            </div>
          )}
          {pending && (
            <button
              onClick={() => runPaymentCheck(false)}
              disabled={checking}
              className="inline-flex items-center justify-center gap-2 bg-secondary text-foreground font-heading font-black text-xs tracking-wider px-4 py-2.5 rounded-lg border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              {checking ? "VERIFICANDO..." : "JÁ PAGUEI — VERIFICAR"}
            </button>
          )}

          <p className="text-xs text-muted-foreground">
            Pedido <strong className="text-foreground">{order.order_code}</strong> registrado em{" "}
            {new Date(order.created_at).toLocaleString("pt-BR")}
          </p>
        </div>

        {/* Rastreio */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-black text-sm tracking-wider text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> RASTREIO DA ENTREGA
            </h3>
            <span className="font-mono text-xs bg-secondary px-2.5 py-1 rounded-md text-foreground">
              {order.tracking_code}
            </span>
          </div>

          <div className="space-y-3">
            {DELIVERY_STAGES.map((stage, i) => {
              const done = i <= stageIndex;
              const active = i === stageIndex;
              return (
                <div key={stage.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {i === 0 && <Package className="w-4 h-4" />}
                      {i === 1 && <Truck className="w-4 h-4" />}
                      {i === 2 && <MapPin className="w-4 h-4" />}
                      {i === 3 && <Home className="w-4 h-4" />}
                    </div>
                    {i < DELIVERY_STAGES.length - 1 && (
                      <div className={`w-0.5 flex-1 mt-1 ${done ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <p className={`font-heading font-bold text-sm ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                      {stage.label}
                      {active && <span className="ml-2 text-[10px] tracking-wider">● ATUAL</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Itens */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-heading font-black text-sm tracking-wider text-foreground">ITENS DO PEDIDO</h3>
          <div className="space-y-2">
            {order.items.map((it) => (
              <div key={it.name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{it.qty}× {it.name}</span>
                <span className="text-foreground font-semibold">{formatCurrency(it.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="font-heading font-bold text-xs tracking-wider text-muted-foreground">TOTAL PAGO</span>
            <span className="font-heading font-black text-xl text-foreground">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Forma de pagamento: <strong className="text-foreground">{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</strong>
          </p>
        </div>

        {/* Endereço */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <h3 className="font-heading font-black text-sm tracking-wider text-foreground">ENTREGA EM</h3>
          <p className="text-sm text-foreground font-semibold">{order.customer_name}</p>
          <p className="text-xs text-muted-foreground">
            {order.address_street}, {order.address_number}
            {order.address_complement ? ` - ${order.address_complement}` : ""}<br />
            {order.address_city}/{order.address_state} • CEP {order.address_zip}
          </p>
        </div>

        {/* Ações */}
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-black text-xs tracking-wider py-3.5 rounded-lg hover:opacity-90 transition-opacity glow-neon"
          >
            <Download className="w-4 h-4" /> BAIXAR RECIBO PDF
          </button>
          <button
            onClick={() =>
              contactWhatsApp(
                `Olá! Pedido ${order.order_code} - rastreio ${order.tracking_code}. Gostaria de tirar uma dúvida.`
              )
            }
            className="flex items-center justify-center gap-2 bg-secondary text-foreground font-heading font-black text-xs tracking-wider py-3.5 rounded-lg hover:bg-secondary/80 transition-colors border border-border"
          >
            <MessageCircle className="w-4 h-4" /> FALAR COM CONSULTOR
          </button>
        </div>

        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-primary underline pt-2">
          Voltar para a loja
        </Link>
      </main>
    </div>
  );
};

export default Recibo;
