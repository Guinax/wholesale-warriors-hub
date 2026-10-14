import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/orderUtils";

type ReportOrder = {
  id: string;
  order_code: string;
  created_at: string;
  delivered_at: string | null;
  customer_name: string | null;
  payment_status: string;
  delivery_status: string;
  fulfillment_store_id: string | null;
  total_amount: number | string;
  items: unknown;
};
type ReportStore = { id: string; name: string };
const PAGE_SIZE = 500;
const MAX_PAGES = 100;
const isDelivered = (status: string) => status === "entregue" || status === "delivered";
const localDate = (timestamp: string | null) =>
  timestamp ? new Intl.DateTimeFormat("sv-SE", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "America/Sao_Paulo",
  }).format(new Date(timestamp)) : "";
const fullDate = (timestamp: string | null) =>
  timestamp ? new Date(timestamp).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
const itemCount = (items: unknown) => Array.isArray(items)
  ? items.reduce((total: number, item: { qty?: number | string; quantity?: number | string }) =>
    total + Number(item.qty ?? item.quantity ?? 0), 0)
  : 0;
const csvCell = (value: unknown) => {
  let cell = String(value ?? "");
  // Proteção contra fórmula ao abrir o CSV em planilhas.
  if (/^[=+@\-\t\r]/.test(cell)) cell = "'" + cell;
  return '"' + cell.replace(/"/g, '""') + '"';
};

export default function OrderHistoryReports() {
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [stores, setStores] = useState<ReportStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limited, setLimited] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("delivered");
  const [storeFilter, setStoreFilter] = useState("all");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: storesData, error: storesError } = await supabase
        .from("partner_stores").select("id,name");
      if (storesError) throw storesError;
      const loaded: ReportOrder[] = [];
      let hitLimit = false;
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error: pageError } = await supabase
          .from("orders").select("*")
          .order("created_at", { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (pageError) throw pageError;
        const batch = (data ?? []) as unknown as ReportOrder[];
        loaded.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        if (page === MAX_PAGES - 1) hitLimit = true;
      }
      setOrders(loaded);
      setStores((storesData ?? []) as ReportStore[]);
      setLimited(hitLimit);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico.");
      setLimited(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const centralIds = useMemo(() => new Set(
    stores.filter((s) => s.name.trim().toLocaleLowerCase("pt-BR") === "adega central").map((s) => s.id)
  ), [stores]);

  const storeName = (order: ReportOrder) =>
    !order.fulfillment_store_id ? "Estoque central / venda direta"
      : stores.find((store) => store.id === order.fulfillment_store_id)?.name ?? "Loja não identificada";
  const isCentral = (order: ReportOrder) =>
    !order.fulfillment_store_id || centralIds.has(order.fulfillment_store_id);

  const filtered = useMemo(() => orders.filter((order) => {
    if (deliveryFilter === "delivered" && !isDelivered(order.delivery_status)) return false;
    if (deliveryFilter === "in_progress" && (isDelivered(order.delivery_status) || order.payment_status !== "paid")) return false;
    if (deliveryFilter === "paid" && order.payment_status !== "paid") return false;
    if (deliveryFilter === "unpaid" && order.payment_status === "paid") return false;
    if (storeFilter === "central" && !isCentral(order)) return false;
    if (storeFilter === "partners" && isCentral(order)) return false;
    if (storeFilter !== "all" && storeFilter !== "central" && storeFilter !== "partners" && order.fulfillment_store_id !== storeFilter) return false;
    const orderDate = localDate(order.created_at);
    if (dateFrom && orderDate < dateFrom) return false;
    if (dateTo && orderDate > dateTo) return false;
    const q = search.trim().toLocaleLowerCase("pt-BR");
    if (q && !(order.order_code.toLocaleLowerCase("pt-BR").includes(q)
        || (order.customer_name ?? "").toLocaleLowerCase("pt-BR").includes(q))) return false;
    return true;
  }), [orders, deliveryFilter, storeFilter, dateFrom, dateTo, search, centralIds]);

  const paid = filtered.filter((order) => order.payment_status === "paid");
  const delivered = filtered.filter((order) => isDelivered(order.delivery_status));
  const paidGross = paid.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const exportCsv = () => {
    if (!filtered.length || loading || error || limited) return;
    const header = ["ID do pedido", "Código", "Data do pedido (Brasília)", "Data da entrega (Brasília)",
      "Cliente", "Loja responsável", "ID da loja", "Tipo de atendimento",
      "Quantidade de unidades", "Status pagamento", "Status entrega", "Valor bruto (R$)"];
    const rows = filtered.map((order) => [
      order.id, order.order_code, fullDate(order.created_at), fullDate(order.delivered_at),
      order.customer_name, storeName(order), order.fulfillment_store_id,
      isCentral(order) ? "Adega Central" : "Varejo de parceiro",
      itemCount(order.items), order.payment_status, order.delivery_status,
      Number(order.total_amount ?? 0).toFixed(2).replace(".", ","),
    ]);
    const data = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", data], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "adega-maromba-historico-pedidos-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">Histórico e relatórios de pedidos</h2>
        <p className="text-sm text-muted-foreground">
          Consulta dos pedidos registrados, inclusive os entregues. As consultas e exportações não alteram os pedidos.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
        <Button type="button" onClick={exportCsv} disabled={loading || Boolean(error) || limited || !filtered.length}>
          <Download className="mr-2 h-4 w-4" />Exportar CSV
        </Button>
      </div>
    </div>
    <Card className="p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-xs font-medium">Data inicial do pedido
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs font-medium">Data final do pedido
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <div className="space-y-1">
          <span className="text-xs font-medium">Status</span>
          <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="delivered">Entregues</SelectItem>
              <SelectItem value="in_progress">Pagos em andamento</SelectItem>
              <SelectItem value="paid">Todos pagos</SelectItem>
              <SelectItem value="unpaid">Não pagos</SelectItem>
              <SelectItem value="all">Todos os status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium">Destino do pedido</span>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as lojas</SelectItem>
              <SelectItem value="central">Adega Central / estoque central</SelectItem>
              <SelectItem value="partners">Lojas parceiras (varejo)</SelectItem>
              {stores.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <label className="space-y-1 text-xs font-medium">Cliente ou número do pedido
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Datas no horário de Brasília. O período usa a data de criação do pedido. Valores são brutos (incluem frete quando cobrado), não representam lucro líquido. Reposições de estoque feitas pelos lojistas ficam em Admin → Logística → Atacado dos parceiros.
      </p>
    </Card>
    {error && <Card role="alert" className="p-3 text-sm text-destructive">Erro ao consultar histórico: {error}</Card>}
    {limited && <Card role="alert" className="p-3 text-sm text-destructive">
      O histórico ultrapassou 50 mil registros. A exportação está bloqueada para evitar um relatório incompleto.
    </Card>}
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><p className="text-xs text-muted-foreground">Pedidos encontrados</p><p className="text-2xl font-bold">{filtered.length}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Pedidos entregues</p><p className="text-2xl font-bold">{delivered.length}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Total bruto dos pagos no filtro</p><p className="text-2xl font-bold">{formatCurrency(paidGross)}</p></Card>
    </div>
    <Card className="p-4 space-y-3">
      {loading ? <p className="text-sm text-muted-foreground">Consultando pedidos...</p> : !error && filtered.length === 0
        ? <p className="text-sm text-muted-foreground">Nenhum pedido encontrado para os filtros selecionados.</p>
        : <div className="space-y-2">
          {filtered.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="font-semibold">{order.order_code} · {order.customer_name ?? "Cliente"}</p>
              <p className="text-xs text-muted-foreground">{fullDate(order.created_at)} · {storeName(order)}</p>
              <p className="text-xs text-muted-foreground">Entrega: {fullDate(order.delivered_at)} · {itemCount(order.items)} unidades</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{order.payment_status === "paid" ? "Pago" : order.payment_status}</Badge>
              <Badge variant="secondary">{isDelivered(order.delivery_status) ? "Entregue" : order.delivery_status}</Badge>
              <strong>{formatCurrency(Number(order.total_amount ?? 0))}</strong>
            </div>
          </div>)}
        </div>}
    </Card>
  </div>;
}
