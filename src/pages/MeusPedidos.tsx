import { useCallback, useEffect, useState } from "react";
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

export default function MeusPedidos() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(20);

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
    const { data, error: queryError } = await supabase.from("orders")
      .select("id,order_code,payment_status,delivery_status,total_amount,tracking_code,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    if (queryError) setError("Não foi possível carregar os pedidos. Tente atualizar.");
    else { setOrders(data ?? []); setError(""); }
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
      {orders.map((order) => <Card key={order.id} className="p-4 space-y-3">
        <div className="flex justify-between flex-wrap gap-2"><strong>{order.order_code}</strong><strong>{formatCurrency(order.total_amount)}</strong></div>
        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")}</p>
        <p className="text-sm">{statusLabels[order.payment_status] ?? order.payment_status}</p>
        {order.payment_status === "paid" && <div className="rounded-xl border border-border p-3 space-y-2">
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
      </Card>)}
      {orders.length === limit && <Button variant="outline" disabled={loading} onClick={() => setLimit((value) => value + 20)}>Carregar mais pedidos</Button>}
    </main>
  </div>;
}
