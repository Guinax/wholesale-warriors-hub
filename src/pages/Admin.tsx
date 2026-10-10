import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Search, Package, RefreshCw, Eye, ShieldAlert, ArrowLeft, TriangleAlert, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductsManager from "@/components/admin/ProductsManager";
import UsersManager from "@/components/admin/UsersManager";
import AuditLogsManager from "@/components/admin/AuditLogsManager";
import VideosManager from "@/components/admin/VideosManager";
import PagesManager from "@/components/admin/PagesManager";
import CatalogManager from "@/components/admin/CatalogManager";
import ExpeditionManager from "@/components/admin/ExpeditionManager";
import PayoutsManager from "@/components/admin/PayoutsManager";
import PartnersManager from "@/components/admin/PartnersManager";
import OperationReadiness from "@/components/admin/OperationReadiness";
import CouriersManager from "@/components/admin/CouriersManager";
import PartnerRestockOrdersManager from "@/components/admin/PartnerRestockOrdersManager";
import { trackingLabel, formatCurrency, DELIVERY_STAGES } from "@/lib/orderUtils";
import { logAudit } from "@/lib/audit";

type OrderItem = {
  name?: string;
  qty?: number | string;
  quantity?: number | string;
  subtotal?: number | string;
  unit_price?: number | string;
  price?: number | string;
};

type Order = {
  id: string;
  order_code: string;
  tracking_code: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cnpj: string | null;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  payment_details: unknown;
  payment_checked_at: string | null;
  payment_nsu: string | null;
  delivery_status: string;
  address_street: string;
  address_number: string;
  address_complement: string | null;
  address_city: string;
  address_state: string;
  address_zip: string;
  items: unknown;
  created_at: string;
};

const DELIVERY_OPTIONS = [
  { value: "preparando", label: "Preparando pedido" },
  { value: "postado", label: "Postado" },
  { value: "transito", label: "Em trânsito" },
  { value: "saiu_entrega", label: "Saiu para entrega" },
  { value: "entregue", label: "Entregue" },
];

const PAYMENT_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Confirmado" },
  { value: "expired", label: "Expirado" },
  { value: "cancelled", label: "Cancelado" },
];

const deliveryColor: Record<string, string> = {
  preparando: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  postado: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  transito: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  saiu_entrega: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  entregue: "bg-green-500/15 text-green-700 dark:text-green-300",
};

const requiresPaymentReconciliation = (order: Order) => {
  const details = order.payment_details;
  return !!details && typeof details === "object" && (details as Record<string, unknown>).reconciliation_required === true;
};

const paymentColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  paid: "bg-green-500/15 text-green-700 dark:text-green-300",
  expired: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const Admin = () => {
  const [activeTab, setActiveTab] = useState(()=>new URLSearchParams(window.location.search).get("tab")||"orders");
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDelivery, setFilterDelivery] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const [restockUnread,setRestockUnread]=useState(0);

  useEffect(() => {
    document.title = "Painel Admin | Família Maromba";
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadOrders();
      logAudit("admin_access");
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !user?.id) return;
    const loadAdminNotifications=async()=>{
      const {count}=await supabase
        .from("user_notifications" as never)
        .select("id",{count:"exact",head:true})
        .eq("user_id",user.id)
        .eq("type","partner_restock")
        .is("read_at",null);
      setRestockUnread(count??0);
    };
    void loadAdminNotifications();
    const channel=supabase.channel("admin-restock-bell-"+user.id)
      .on("postgres_changes",{event:"*",schema:"public",table:"user_notifications",filter:`user_id=eq.${user.id}`},()=>void loadAdminNotifications())
      .subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[isAdmin,user?.id]);

  const openRestock=async()=>{
    setActiveTab("restock");
    window.history.replaceState(null,"",window.location.pathname+"?tab=restock");
    if(user?.id&&restockUnread>0){
      const{error}=await supabase
        .from("user_notifications" as never)
        .update({read_at:new Date().toISOString()} as never)
        .eq("user_id",user.id)
        .eq("type","partner_restock")
        .is("read_at",null);
      if(!error)setRestockUnread(0);
    }
  };

  // Notificação em tempo real: pagamento confirmado -> pedido pode ser separado
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("orders-payment-confirmed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => void loadOrders())
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, () => void loadOrders())
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const next = payload.new as Order;
          const prevRow = payload.old as Partial<Order>;
          setOrders((prev) => prev.some((o) => o.id === next.id)
            ? prev.map((o) => (o.id === next.id ? { ...o, ...next } : o))
            : [next, ...prev]);
          if (requiresPaymentReconciliation(next) && !(prevRow.payment_details && typeof prevRow.payment_details === "object" && (prevRow.payment_details as Record<string, unknown>).reconciliation_required === true)) {
            toast.error(`Pagamento em reconciliação — ${next.order_code}`, {
              description: "A InfinitePay confirmou o pagamento após o encerramento do pedido. Não libere mercadoria até a conferência.",
              duration: 15000,
            });
          }
          if (next.payment_status === "paid" && prevRow?.payment_status !== "paid") {
            toast.success(`Pagamento confirmado — ${next.order_code}`, {
              description: `${next.customer_name} · ${formatCurrency(Number(next.total_amount))} · o pedido já pode ser separado.`,
              duration: 10000,
            });
            try {
              new Audio(
                "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
              ).play().catch(() => {});
            } catch { /* som opcional */ }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const loadOrders = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar pedidos");
    } else {
      setOrders((data ?? []) as Order[]);
    }
    setFetching(false);
  };

  const updateOrder = async (
    id: string,
    field: "delivery_status" | "payment_status",
    value: string
  ) => {
    const order = orders.find((o) => o.id === id);
    if (field === "payment_status" && value === "paid") {
      toast.error("O pagamento só pode ser confirmado pela InfinitePay.");
      return;
    }
    if (field === "delivery_status" && order && order.payment_status !== "paid") {
      toast.error("O status de entrega só pode ser alterado após a confirmação do pagamento.");
      return;
    }
    const changes: Partial<Pick<Order, "delivery_status" | "payment_status">> = { [field]: value };
    const { error } = await supabase.from("orders").update(changes).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...changes } : o))
    );
    if (selected?.id === id) setSelected({ ...selected, ...changes } as Order);
    logAudit("order_updated", { entity: "orders", entity_id: id, details: { [field]: value } });
    toast.success("Pedido atualizado");
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterDelivery !== "all" && !(o.delivery_status === filterDelivery && o.payment_status === "paid")) return false;
      if (filterPayment !== "all" && o.payment_status !== filterPayment) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.order_code.toLowerCase().includes(q) ||
          (o.tracking_code ?? "").toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, search, filterDelivery, filterPayment]);

  // Pedidos de atacado são atendidos pela central quando somam mais de seis unidades.
  const wholesaleOrders = useMemo(() => orders.filter((order) => {
    const items = Array.isArray(order.items) ? order.items as OrderItem[] : [];
    return items.reduce((total, item) => total + Number(item.qty ?? item.quantity ?? 0), 0) > 6;
  }), [orders]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-destructive/10 mx-auto">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-xl font-bold">Acesso negado</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ({user?.email}) não tem permissão de administrador.
            Peça ao responsável para promover sua conta no banco de dados (tabela{" "}
            <code className="bg-muted px-1 rounded">user_roles</code>).
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={signOut}>Sair</Button>
            <Button onClick={() => navigate("/")}>Ir à loja</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Voltar">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Package className="w-5 h-5 text-primary" />
            <h1 className="font-heading font-bold tracking-wider text-sm">PAINEL ADMIN</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative" onClick={()=>void openRestock()} aria-label={`Reposição de parceiros: ${restockUnread} nova(s)`}>
              <Bell className="h-5 w-5"/>
              {restockUnread>0&&<span className="absolute right-0 top-0 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-black leading-4 text-destructive-foreground">{restockUnread>9?"9+":restockUnread}</span>}
            </Button>
            <span className="hidden sm:inline text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="operation">Conferência</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="pages">Páginas</TabsTrigger>
            <TabsTrigger value="catalog">Catálogo</TabsTrigger>
            <TabsTrigger value="expedition">Expedição</TabsTrigger>
            <TabsTrigger value="payouts">Repasses</TabsTrigger>
            <TabsTrigger value="partners">Parceiros</TabsTrigger>
            <TabsTrigger value="couriers">Entregadores</TabsTrigger>
            <TabsTrigger value="shipping">Logística</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
          </TabsList>
          <TabsContent value="operation" className="mt-4"><OperationReadiness onNavigate={setActiveTab} /></TabsContent>
          <TabsContent value="orders" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Total de pedidos</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Postados</p>
            <p className="text-2xl font-bold">
              {orders.filter((o) => o.delivery_status === "postado" && o.payment_status === "paid").length}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Em trânsito</p>
            <p className="text-2xl font-bold">
              {orders.filter((o) => ["transito", "saiu_entrega"].includes(o.delivery_status)).length}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Entregues</p>
            <p className="text-2xl font-bold">
              {orders.filter((o) => o.delivery_status === "entregue").length}
            </p>
          </Card>
          <Card className="p-3 border-destructive/40">
            <p className="text-xs text-muted-foreground">Reconciliação</p>
            <p className="text-2xl font-bold text-destructive">
              {orders.filter(requiresPaymentReconciliation).length}
            </p>
          </Card>
        </div>

        <Card className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, rastreio, nome ou e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterDelivery} onValueChange={setFilterDelivery}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Entrega" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas entregas</SelectItem>
              {DELIVERY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="sm:w-44"><SelectValue placeholder="Pagamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos pagamentos</SelectItem>
              {PAYMENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadOrders} disabled={fetching}>
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
          </Button>
        </Card>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              {fetching ? "Carregando pedidos..." : "Nenhum pedido encontrado."}
            </Card>
          )}
          {filtered.map((o) => (
            <Card key={o.id} className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{o.order_code}</p>
                  <p className="font-semibold">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_email} · {o.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatCurrency(Number(o.total_amount))}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {o.payment_status === "paid" ? (
                  <Badge className={deliveryColor[o.delivery_status] ?? ""} variant="secondary">
                    {DELIVERY_OPTIONS.find((d) => d.value === o.delivery_status)?.label ?? o.delivery_status}
                  </Badge>
                ) : (
                  <Badge className={paymentColor[o.payment_status] ?? paymentColor.pending} variant="secondary">
                    Entrega: aguardando pagamento
                  </Badge>
                )}
                <Badge className={paymentColor[o.payment_status] ?? ""} variant="secondary">
                  Pgto: {PAYMENT_OPTIONS.find((p) => p.value === o.payment_status)?.label ?? o.payment_status}
                </Badge>
                {requiresPaymentReconciliation(o) && (
                  <Badge variant="destructive" className="gap-1">
                    <TriangleAlert className="w-3 h-3" /> Reconciliação de pagamento
                  </Badge>
                )}
                <Badge variant="outline" className="font-mono text-xs">{trackingLabel(o.tracking_code)}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select
                  value={o.delivery_status}
                  onValueChange={(v) => updateOrder(o.id, "delivery_status", v)}
                  disabled={o.payment_status !== "paid"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={o.payment_status !== "paid" ? "Aguardando pagamento" : undefined} />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center text-xs text-muted-foreground px-3">
                  Pagamento confirmado automaticamente pela InfinitePay
                </div>
                <Button variant="outline" onClick={() => setSelected(o)}>
                  <Eye className="w-4 h-4" /> Detalhes
                </Button>
              </div>
            </Card>
          ))}
        </div>
          </TabsContent>
          <TabsContent value="pages" className="mt-4">
            <PagesManager />
          </TabsContent>
          <TabsContent value="catalog" className="mt-4">
            <CatalogManager />
          </TabsContent>
          <TabsContent value="expedition" className="mt-4">
            <ExpeditionManager />
          </TabsContent>
          <TabsContent value="payouts" className="mt-4">
            <PayoutsManager />
          </TabsContent>
          <TabsContent value="partners" className="mt-4">
            <PartnersManager />
          </TabsContent>
          <TabsContent value="couriers" className="mt-4">
            <CouriersManager />
          </TabsContent>
          <TabsContent value="shipping" className="mt-4 space-y-4">
            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Pedidos do atacado — central logística</h2>
                  <p className="text-xs text-muted-foreground">Atualização em tempo real · pedidos acima de 6 unidades · {wholesaleOrders.length} pedido(s)</p>
                </div>
                <Button variant="outline" size="sm" disabled={fetching} onClick={() => void loadOrders()}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button>
              </div>
              {wholesaleOrders.length === 0 ? <p className="rounded-lg border p-4 text-sm text-muted-foreground">Nenhum pedido de atacado registrado.</p> : (
                <div className="space-y-2">
                  {wholesaleOrders.map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
                      <div className="min-w-0">
                        <p className="font-semibold">#{order.order_code} · {order.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-BR")} · {order.address_city}/{order.address_state}</p>
                        <p className="mt-1 text-xs">{Array.isArray(order.items) ? (order.items as OrderItem[]).reduce((n, item) => n + Number(item.qty ?? item.quantity ?? 0), 0) : 0} unidades · {formatCurrency(Number(order.total_amount))}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={order.payment_status === "paid" && !requiresPaymentReconciliation(order) ? "default" : "destructive"}>{requiresPaymentReconciliation(order) ? "Pagamento em conferência" : order.payment_status === "paid" ? "Pago" : "Aguardando pagamento"}</Badge>
                        <Badge variant="outline">{trackingLabel(order.delivery_status)}</Badge>
                        <Button size="sm" variant="outline" onClick={() => { setSelected(order); setActiveTab("orders"); }}>Ver pedido</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <PartnerRestockOrdersManager />
          </TabsContent>
          <TabsContent value="products" className="mt-4">
            <ProductsManager />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersManager />
          </TabsContent>
          <TabsContent value="audit" className="mt-4">
            <AuditLogsManager />
          </TabsContent>
          <TabsContent value="videos" className="mt-4">
            <VideosManager />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido {selected?.order_code}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="font-semibold mb-1">Cliente</h3>
                <p>{selected.customer_name}</p>
                <p className="text-muted-foreground">{selected.customer_email}</p>
                <p className="text-muted-foreground">{selected.customer_phone}</p>
                {selected.customer_cnpj && (
                  <p className="text-muted-foreground">CNPJ: {selected.customer_cnpj}</p>
                )}
              </section>
              <section>
                <h3 className="font-semibold mb-1">Endereço</h3>
                <p>
                  {selected.address_street}, {selected.address_number}
                  {selected.address_complement ? ` - ${selected.address_complement}` : ""}
                </p>
                <p>{selected.address_city}/{selected.address_state} - {selected.address_zip}</p>
              </section>
              <section>
                <h3 className="font-semibold mb-1">Itens</h3>
                <ul className="space-y-1">
                  {Array.isArray(selected.items) && selected.items.map((it: OrderItem, i: number) => {
                    const qty = Number(it.qty ?? it.quantity ?? 0);
                    const subtotal = Number(
                      it.subtotal ?? (Number(it.unit_price ?? it.price ?? 0) * qty)
                    );
                    return (
                      <li key={i} className="flex justify-between border-b pb-1">
                        <span>{qty}× {it.name}</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-right font-bold mt-2">
                  Total: {formatCurrency(Number(selected.total_amount))}
                </p>
                <p className="text-xs text-muted-foreground text-right">
                  Pagamento: {selected.payment_method}
                </p>
              </section>
              {requiresPaymentReconciliation(selected) && (
                <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <TriangleAlert className="w-4 h-4" /> Pagamento exige reconciliação
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    A InfinitePay confirmou o pagamento após o encerramento deste pedido. Não libere estoque ou entrega até a conferência administrativa.
                  </p>
                  {selected.payment_nsu && <p className="font-mono text-xs mt-2">NSU: {selected.payment_nsu}</p>}
                  {selected.payment_checked_at && <p className="text-xs text-muted-foreground">Verificado em {new Date(selected.payment_checked_at).toLocaleString("pt-BR")}</p>}
                </section>
              )}
              <section>
                <h3 className="font-semibold mb-1">Rastreio</h3>
                <p className="font-mono text-xs">{trackingLabel(selected.tracking_code)}</p>
                <div className="mt-2 space-y-1">
                  {DELIVERY_STAGES.map((stage, idx) => {
                    const currentIdx = DELIVERY_STAGES.findIndex(
                      (s) => s.key === selected.delivery_status
                    );
                    const reached = idx <= currentIdx;
                    return (
                      <div key={stage.key} className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            reached ? "bg-primary" : "bg-muted"
                          }`}
                        />
                        <span className={reached ? "" : "text-muted-foreground"}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
