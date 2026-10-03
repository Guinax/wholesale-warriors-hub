import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Package, RefreshCw, Truck, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/database";
import { DELIVERY_STAGES, formatCurrency, trackingLabel } from "@/lib/orderUtils";

const deliveryInProgress = new Set(["postado", "transito", "saiu_entrega"]);

type Order = Pick<Database["public"]["Tables"]["orders"]["Row"], "id" | "order_code" | "payment_status" | "delivery_status" | "total_amount" | "tracking_code" | "created_at">;
const statusLabels: Record<string, string> = { pending: "Aguardando pagamento", paid: "Pagamento confirmado", expired: "Pagamento expirado", cancelled: "Cancelado", canceled: "Cancelado", refunded: "Reembolsado" };

type PartnerTracking = {
  id: string;
  order_code?: string | null;
  store_name?: string | null;
  status: string;
  eta_minutes?: number | null;
  route_km?: number | null;
  shipping?: number | null;
  delivery_code?: string | null;
};

const partnerSteps = [
  { key: "payment_pending", label: "Pagamento" },
  { key: "paid", label: "Preparando" },
  { key: "delivering", label: "Em rota" },
  { key: "delivered", label: "Entregue" },
];

const partnerStepIndex = (status?: string | null) => {
  if (!status) return -1;
  if (["accepted", "quoted"].includes(status)) return 0;
  return partnerSteps.findIndex((step) => step.key === status);
};

export default function MeusPedidos() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(20);
  const [partnerTracking, setPartnerTracking] = useState<PartnerTracking[]>([]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError || !data.user) {
        setError("Sua sessão expirou. Entre novamente para consultar seus pedidos.");
        setLoading(false);
      } else setUserId(data.user.id);
    });
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [ordersResult, partnerResult] = await Promise.all([
      supabase.from("orders")
        .select("id,order_code,payment_status,delivery_status,total_amount,tracking_code,created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
      supabase.rpc("partner_command" as never, { p_action: "dashboard", p_payload: {} } as never),
    ]);
    if (ordersResult.error) {
      setError("Não foi possível carregar os pedidos. Tente atualizar.");
    } else {
      setOrders(ordersResult.data ?? []);
      setError("");
    }
    if (!partnerResult.error && partnerResult.data) {
      const dashboard = partnerResult.data as unknown as { requests?: PartnerTracking[] };
      setPartnerTracking(dashboard.requests ?? []);
    } else {
      setPartnerTracking([]);
    }
    setLoading(false);
  }, [userId, limit]);

  useEffect(() => {
    if (!userId) return;
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    const channel = supabase.channel(`my-orders-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, () => void load())
      .subscribe();
    document.addEventListener("visibilitychange", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const trackingByOrder = useMemo(() => {
    const map = new Map<string, PartnerTracking>();
    partnerTracking.forEach((item) => {
      if (item.order_code) map.set(item.order_code, item);
    });
    return map;
  }, [partnerTracking]);

  return <div className="min-h-screen bg-background">
    <PageHeader eyebrow="MINHA CONTA" title="MEUS PEDIDOS" subtitle="Seu histórico de compras, pagamentos e entregas em um só lugar." />
    <main className="container max-w-3xl py-6 space-y-4">
      <div className="flex justify-between items-center gap-3">
        <Link to="/" className="text-sm text-primary underline">Continuar comprando</Link>
        <Button variant="outline" disabled={loading || !userId} onClick={() => void load()}><RefreshCw className="w-4 h-4" /> Atualizar</Button>
      </div>
      {error && <Card role="alert" className="p-4 text-destructive">{error}{!userId && <Link to="/auth?next=%2Fmeus-pedidos" className="block underline mt-2">Entrar novamente</Link>}</Card>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Carregando pedidos...</p>}
      {!loading && !error && orders.length === 0 && <Card className="p-8 text-center space-y-3"><Package className="mx-auto text-primary" /><p>Você ainda não fez pedidos.</p><Link to="/" className="text-primary underline">Ver catálogo</Link></Card>}
      {orders.map((order) => {
        const partner = trackingByOrder.get(order.order_code);
        const step = partnerStepIndex(partner?.status);
        return <Card key={order.id} className="p-4 space-y-3">
          <div className="flex justify-between flex-wrap gap-2"><strong>{order.order_code}</strong><strong>{formatCurrency(order.total_amount)}</strong></div>
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
          <p className="text-sm">{statusLabels[order.payment_status] ?? order.payment_status}</p>

          {partner && <div className="rounded-xl border border-border p-3 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">Loja responsável</p>
                <p className="text-sm font-semibold">{partner.store_name ?? "Parceiro da rede"}</p>
              </div>
              {partner.eta_minutes ? <span className="text-xs text-muted-foreground">Previsão: {partner.eta_minutes} min</span> : null}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {partnerSteps.map((item, index) => {
                const done = step > index;
                const active = step === index;
                return <div key={item.key} className={`rounded-lg border px-2 py-2 text-center ${done ? "border-emerald-500/40 bg-emerald-500/10" : active ? "border-amber-400/50 bg-amber-400/10" : "border-red-500/20 bg-red-500/5 opacity-60"}`}>
                  <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${done ? "bg-emerald-500" : active ? "bg-amber-400" : "bg-red-500"}`} />
                  <p className="text-[10px] font-semibold">{item.label}</p>
                </div>;
              })}
            </div>

            {partner.status === "delivering" && partner.delivery_code && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs text-muted-foreground">Código de entrega</p>
                <p className="mt-1 text-lg font-black tracking-[0.2em]">{partner.delivery_code}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Informe este código ao responsável pela entrega somente quando receber o pedido.</p>
              </div>
            )}
          </div>}

          {order.payment_status === "paid" && !partner && <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {order.delivery_status === "entregue" ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Truck className="w-4 h-4 text-primary" />}
              {DELIVERY_STAGES.find((stage) => stage.key === order.delivery_status)?.label ?? "Preparando pedido"}
            </div>
            {deliveryInProgress.has(order.delivery_status) && trackingLabel(order.tracking_code) !== "Aguardando envio" && (
              <p className="text-sm">Rastreio do pedido: <strong>{trackingLabel(order.tracking_code)}</strong></p>
            )}
            {deliveryInProgress.has(order.delivery_status) && trackingLabel(order.tracking_code) === "Aguardando envio" && (
              <p className="text-xs text-muted-foreground">O rastreio aparecerá aqui assim que a expedição informar o código.</p>
            )}
            {order.delivery_status === "entregue" && <p className="text-xs text-muted-foreground">Pedido entregue. Ele continuará salvo no seu histórico.</p>}
          </div>}
          <Button asChild variant="outline" className="w-full sm:w-auto"><Link to={`/recibo/${encodeURIComponent(order.order_code)}`}>Ver detalhes do pedido</Link></Button>
        </Card>;
      })}
      {orders.length === limit && <Button variant="outline" disabled={loading} onClick={() => setLimit((value) => value + 20)}>Carregar mais pedidos</Button>}
    </main>
  </div>;
}
