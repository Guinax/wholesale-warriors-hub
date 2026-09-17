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
import { LogOut, Search, Package, RefreshCw, Eye, ShieldAlert, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductsManager from "@/components/admin/ProductsManager";
import UsersManager from "@/components/admin/UsersManager";
import AuditLogsManager from "@/components/admin/AuditLogsManager";
import VideosManager from "@/components/admin/VideosManager";
import PagesManager from "@/components/admin/PagesManager";
import ExpeditionManager from "@/components/admin/ExpeditionManager";
import { formatCurrency, DELIVERY_STAGES } from "@/lib/orderUtils";
import { logAudit } from "@/lib/audit";

type Order = {
  id: string;
  order_code: string;
  tracking_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_cnpj: string | null;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  delivery_status: string;
  address_street: string;
  address_number: string;
  address_complement: string | null;
  address_city: string;
  address_state: string;
  address_zip: string;
  items: any;
  created_at: string;
};

const DELIVERY_OPTIONS = [
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
  postado: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  transito: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  saiu_entrega: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  entregue: "bg-green-500/15 text-green-700 dark:text-green-300",
};

const paymentColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  paid: "bg-green-500/15 text-green-700 dark:text-green-300",
  expired: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  cancelled: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading, signOut } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDelivery, setFilterDelivery] = useState<string>("all");
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [selected, setSelected] = useState<Order | null>(null);

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
    if (field === "delivery_status" && order && order.payment_status !== "paid") {
      toast.error("O status de entrega só pode ser alterado após a confirmação do pagamento.");
      return;
    }
    const { error } = await supabase.from("orders").update({ [field]: value } as any).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
    if (selected?.id === id) setSelected({ ...selected, [field]: value } as Order);
    logAudit("order_updated", { entity: "orders", entity_id: id, details: { [field]: value } });
    toast.success("Pedido atualizado");
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filterDelivery !== "all" && o.delivery_status !== filterDelivery) return false;
      if (filterPayment !== "all" && o.payment_status !== filterPayment) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.order_code.toLowerCase().includes(q) ||
          o.tracking_code.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, search, filterDelivery, filterPayment]);

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
            <span className="hidden sm:inline text-xs text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <Tabs defaultValue="orders">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="pages">Páginas</TabsTrigger>
            <TabsTrigger value="expedition">Expedição</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <Badge variant="outline" className="font-mono text-xs">{o.tracking_code}</Badge>
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
                <Select
                  value={o.payment_status}
                  onValueChange={(v) => updateOrder(o.id, "payment_status", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>Pgto: {opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          <TabsContent value="expedition" className="mt-4">
            <ExpeditionManager />
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
                  {Array.isArray(selected.items) && selected.items.map((it: any, i: number) => {
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
              <section>
                <h3 className="font-semibold mb-1">Rastreio</h3>
                <p className="font-mono text-xs">{selected.tracking_code}</p>
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
