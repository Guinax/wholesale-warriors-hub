import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Truck, PackageCheck, Boxes, RefreshCw, AlertTriangle, Minus, Plus, MapPin, Package,
} from "lucide-react";
import { formatCurrency, trackingLabel, DELIVERY_STAGES } from "@/lib/orderUtils";
import { logAudit } from "@/lib/audit";

type OrderItem = {
  name?: string;
  qty?: number | string;
  quantity?: number | string;
};

type ExpOrder = {
  id: string;
  order_code: string;
  tracking_code: string | null;
  customer_name: string;
  address_city: string;
  address_state: string;
  total_amount: number;
  payment_status: string;
  delivery_status: string;
  expedition_status: string;
  carrier: string | null;
  driver_name: string | null;
  vehicle_plate: string | null;
  expedition_notes: string | null;
  loaded_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  inventory_allocated_at: string | null;
  fulfillment_store_id: string | null;
  delivery_mode: string | null;
  items: unknown;
  created_at: string;
};

type StockProduct = {
  id: string;
  name: string;
  category: string;
  stock: number;
  wholesale_price: number;
  image_url: string | null;
};

type Movement = {
  id: string;
  product_name: string;
  qty: number;
  reason: string;
  order_code: string | null;
  created_at: string;
};

const EXPEDITION_STEPS = [
  { value: "aguardando", label: "Aguardando separação" },
  { value: "separado", label: "Separado" },
  { value: "carregado", label: "Carregado" },
  { value: "despachado", label: "Despachado" },
  { value: "entregue", label: "Entregue" },
];

const expColor: Record<string, string> = {
  aguardando: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  separado: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  carregado: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  despachado: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  entregue: "bg-green-500/15 text-green-700 dark:text-green-300",
};

const itemQty = (it: OrderItem) => Number(it.qty ?? it.quantity ?? 0);

const ExpeditionManager = () => {
  const [orders, setOrders] = useState<ExpOrder[]>([]);
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyDrinks, setOnlyDrinks] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, p, m] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("products").select("id,name,category,stock,wholesale_price,image_url").order("category").order("name"),
      supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    if (o.error || p.error) toast.error("Erro ao carregar expedição");
    setOrders(((o.data ?? []) as unknown) as ExpOrder[]);
    setProducts(((p.data ?? []) as unknown) as StockProduct[]);
    setMovements(((m.data ?? []) as unknown) as Movement[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Estoque em tempo real
  useEffect(() => {
    const channel = supabase
      .channel("expedicao-estoque")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const stockByName = useMemo(() => {
    const map = new Map<string, StockProduct>();
    products.forEach((p) => map.set(p.name.trim().toLowerCase(), p));
    return map;
  }, [products]);

  const visibleStock = useMemo(
    () => (onlyDrinks ? products.filter((p) => p.category === "bebidas") : products),
    [products, onlyDrinks]
  );

  const partnerQueue = useMemo(
    () => orders.filter((o) => o.payment_status === "paid" && o.delivery_status !== "entregue" && Boolean(o.fulfillment_store_id)),
    [orders]
  );
  const queue = useMemo(
    () => orders.filter((o) => o.payment_status === "paid" && o.delivery_status !== "entregue" && !o.fulfillment_store_id),
    [orders]
  );

  const patchOrder = async (id: string, patch: Partial<Pick<ExpOrder, "tracking_code" | "expedition_status" | "delivery_status" | "carrier" | "driver_name" | "vehicle_plate" | "expedition_notes" | "loaded_at" | "dispatched_at" | "delivered_at">>, msg = "Expedição atualizada") => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) { toast.error("Erro ao atualizar pedido"); return false; }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } as ExpOrder : o)));
    logAudit("expedition_updated", { entity: "orders", entity_id: id, details: patch });
    toast.success(msg);
    return true;
  };

  const adjustStock = async (p: StockProduct, delta: number) => {
    const next = Math.max(0, p.stock + delta);
    const { error } = await supabase.rpc("admin_adjust_central_stock" as never, { _product_id: p.id, _delta: next - p.stock } as never);
    if (error) { toast.error("Erro ao ajustar estoque"); return; }
    await supabase.from("stock_movements").insert({
      product_id: p.id, product_name: p.name, qty: next - p.stock, reason: "ajuste manual",
    });
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, stock: next } : x)));
  };

  const setStock = async (p: StockProduct, value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    await adjustStock(p, value - p.stock);
  };

  const orderItems = (o: ExpOrder): OrderItem[] => (Array.isArray(o.items) ? o.items as OrderItem[] : []);

  const confirmLoad = async (o: ExpOrder) => {
    if (o.payment_status !== "paid") {
      toast.error("A expedição só pode começar após a confirmação do pagamento.");
      return;
    }
    if (!o.inventory_allocated_at) {
      toast.error("O estoque deste pedido ainda não foi alocado. Não carregue a mercadoria.");
      return;
    }
    await patchOrder(o.id, {
      expedition_status: "carregado",
      loaded_at: new Date().toISOString(),
    }, "Carregamento confirmado");
    load();
  };

  const dispatchOrder = (o: ExpOrder) =>
    patchOrder(o.id, {
      expedition_status: "despachado",
      dispatched_at: new Date().toISOString(),
      delivery_status: "transito",
    }, "Pedido despachado");

  const deliverOrder = (o: ExpOrder) =>
    patchOrder(o.id, {
      expedition_status: "entregue",
      delivered_at: new Date().toISOString(),
      delivery_status: "entregue",
    }, "Entrega concluída");

  const lowStock = products.filter((p) => p.stock <= 5);
  const allocationIssues = queue.filter((o) => !o.inventory_allocated_at);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Na fila</p>
          <p className="text-2xl font-bold">{queue.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">A carregar</p>
          <p className="text-2xl font-bold">
            {queue.filter((o) => ["aguardando", "separado"].includes(o.expedition_status)).length}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Em rota</p>
          <p className="text-2xl font-bold">
            {queue.filter((o) => o.expedition_status === "despachado").length}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Falha de alocação</p>
          <p className="text-2xl font-bold text-destructive">{allocationIssues.length}</p>
          <p className="text-[10px] text-muted-foreground">Pagos centrais bloqueados</p>
        </Card>
      </div>

      {partnerQueue.length > 0 && (
        <Card className="p-3">
          <p className="text-sm font-semibold">Atendimento por lojas parceiras: {partnerQueue.length}</p>
          <p className="text-xs text-muted-foreground">Esses pedidos usam estoque e entrega da loja responsável e não entram na expedição central.</p>
        </Card>
      )}

      <Tabs defaultValue="fila">
        <div className="flex items-center gap-2">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="fila"><Truck className="w-4 h-4 mr-1" /> Expedição</TabsTrigger>
            <TabsTrigger value="estoque"><Boxes className="w-4 h-4 mr-1" /> Estoque</TabsTrigger>
            <TabsTrigger value="mov">Movimentações</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} aria-label="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <TabsContent value="fila" className="space-y-2 mt-4">
          {queue.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {loading ? "Carregando..." : "Nenhum pedido na fila de expedição."}
            </Card>
          )}
          {queue.map((o) => {
            const open = expandedId === o.id;
            return (
              <Card key={o.id} className="p-3 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{o.order_code}</p>
                    <p className="font-semibold">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {o.address_city}/{o.address_state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatCurrency(Number(o.total_amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={expColor[o.expedition_status] ?? ""} variant="secondary">
                    {EXPEDITION_STEPS.find((s) => s.value === o.expedition_status)?.label ?? o.expedition_status}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">{trackingLabel(o.tracking_code)}</Badge>
                  {o.payment_status !== "paid" && (
                    <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Pgto: {o.payment_status}
                    </Badge>
                  )}
                  <Badge variant="secondary" className={o.inventory_allocated_at ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}>
                    {o.inventory_allocated_at ? "Estoque alocado" : "Aguardando alocação"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select
                    value={o.expedition_status}
                    onValueChange={(v) => {
                      if (!o.inventory_allocated_at && v !== "aguardando") {
                        toast.error("Pedido pago sem estoque alocado. Regularize o estoque antes de avançar.");
                        return;
                      }
                      void patchOrder(o.id, { expedition_status: v });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPEDITION_STEPS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => confirmLoad(o)}
                    disabled={!o.inventory_allocated_at || o.expedition_status === "carregado"}
                  >
                    <PackageCheck className="w-4 h-4" /> Confirmar carregamento
                  </Button>
                  <Button variant="outline" onClick={() => setExpandedId(open ? null : o.id)}>
                    {open ? "Fechar" : "Carga e entrega"}
                  </Button>
                </div>

                {open && (
                  <div className="space-y-3 border-t pt-3">
                    <div>
                      <p className="text-xs font-semibold mb-1">Itens da carga</p>
                      <ul className="space-y-1 text-sm">
                        {orderItems(o).map((it: OrderItem, i: number) => {
                          const p = stockByName.get(String(it.name ?? "").trim().toLowerCase());
                          const qty = itemQty(it);
                          const ok = !p || p.stock >= qty;
                          return (
                            <li key={i} className="flex justify-between border-b pb-1">
                              <span>{qty}× {it.name}</span>
                              <span className={ok ? "text-muted-foreground" : "text-destructive"}>
                                {p ? `estoque ${p.stock}` : "sem controle"}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor={`tracking-${o.id}`} className="text-xs font-semibold">Código real de rastreio</label>
                      <Input
                        id={`tracking-${o.id}`}
                        key={o.tracking_code}
                        maxLength={100}
                        placeholder="Informe o código fornecido pela transportadora"
                        defaultValue={trackingLabel(o.tracking_code) === "Aguardando envio" ? "" : (o.tracking_code ?? "")}
                        onBlur={(e) => {
                          const value = e.target.value.trim() || null;
                          if (value !== o.tracking_code) void patchOrder(o.id, { tracking_code: value }, "Rastreio atualizado");
                        }}
                      />
                      <p className="text-xs text-muted-foreground">Entregas locais podem ser acompanhadas pelo status do pedido, sem código de transportadora.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Transportadora"
                        defaultValue={o.carrier ?? ""}
                        onBlur={(e) => e.target.value !== (o.carrier ?? "") && patchOrder(o.id, { carrier: e.target.value })}
                      />
                      <Input
                        placeholder="Motorista"
                        defaultValue={o.driver_name ?? ""}
                        onBlur={(e) => e.target.value !== (o.driver_name ?? "") && patchOrder(o.id, { driver_name: e.target.value })}
                      />
                      <Input
                        placeholder="Placa do veículo"
                        defaultValue={o.vehicle_plate ?? ""}
                        onBlur={(e) => e.target.value !== (o.vehicle_plate ?? "") && patchOrder(o.id, { vehicle_plate: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <Textarea
                      placeholder="Observações da expedição (docas, horário de entrega, etc.)"
                      defaultValue={o.expedition_notes ?? ""}
                      onBlur={(e) => e.target.value !== (o.expedition_notes ?? "") && patchOrder(o.id, { expedition_notes: e.target.value })}
                    />

                    <div className="space-y-1">
                      <p className="text-xs font-semibold">Rastreamento da entrega</p>
                      {DELIVERY_STAGES.map((stage, idx) => {
                        const currentIdx = DELIVERY_STAGES.findIndex((s) => s.key === o.delivery_status);
                        const reached = idx <= currentIdx;
                        return (
                          <div key={stage.key} className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${reached ? "bg-primary" : "bg-muted"}`} />
                            <span className={reached ? "" : "text-muted-foreground"}>{stage.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => dispatchOrder(o)}>
                        <Truck className="w-4 h-4" /> Despachar
                      </Button>
                      <Button size="sm" onClick={() => deliverOrder(o)}>Marcar entregue</Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {o.loaded_at && `Carregado: ${new Date(o.loaded_at).toLocaleString("pt-BR")}. `}
                      {o.dispatched_at && `Despachado: ${new Date(o.dispatched_at).toLocaleString("pt-BR")}.`}
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="estoque" className="space-y-2 mt-4">
          <div className="flex gap-2">
            <Button
              variant={onlyDrinks ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyDrinks(true)}
            >
              Bebidas
            </Button>
            <Button
              variant={!onlyDrinks ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyDrinks(false)}
            >
              Todos os produtos
            </Button>
          </div>
          {visibleStock.map((p) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-muted">
                <Package className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="relative h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category} · {formatCurrency(Number(p.wholesale_price))}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => adjustStock(p, -1)} aria-label="Remover 1">
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  className="w-20 text-center"
                  type="number"
                  defaultValue={p.stock}
                  key={`${p.id}-${p.stock}`}
                  onBlur={(e) => setStock(p, parseInt(e.target.value, 10))}
                />
                <Button variant="outline" size="icon" onClick={() => adjustStock(p, 1)} aria-label="Adicionar 1">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
          {visibleStock.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum produto.</Card>
          )}
        </TabsContent>

        <TabsContent value="mov" className="space-y-2 mt-4">
          {movements.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">Sem movimentações.</Card>
          )}
          {movements.map((m) => (
            <Card key={m.id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{m.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.reason}{m.order_code ? ` · ${m.order_code}` : ""} ·{" "}
                  {new Date(m.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Badge variant="secondary" className={m.qty < 0 ? "bg-destructive/15 text-destructive" : "bg-green-500/15 text-green-700 dark:text-green-300"}>
                {m.qty > 0 ? `+${m.qty}` : m.qty}
              </Badge>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpeditionManager;
