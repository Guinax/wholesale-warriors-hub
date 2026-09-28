import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, BarChart3, Megaphone, RefreshCw, Save, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/orderUtils";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  category: string;
  wholesale_price: number;
  unit_price: number;
  min_qty: number;
  stock: number;
  image_url: string | null;
  active: boolean;
};

type Order = {
  id: string;
  total_amount: number;
  payment_status: string;
  address_state: string;
  items: unknown;
  created_at: string;
};

type Campaign = {
  id: string;
  name: string;
  headline: string;
  body: string;
  cta: string;
  destination_url: string;
  platforms: string[];
  status: string;
  created_at: string;
};

const SITE_ORIGIN = "https://wholesale-warriors-hub.lovable.app";
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "WhatsApp"];

const CommandCenter = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [cta, setCta] = useState("COMPRAR AGORA");
  const [platforms, setPlatforms] = useState<string[]>(["Instagram", "Facebook"]);

  const db = supabase as any;

  useEffect(() => {
    document.title = "Centro de Comando | Família Maromba";
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
    if (!loading && user && !isAdmin) navigate("/", { replace: true });
  }, [loading, user, isAdmin, navigate]);

  const load = async () => {
    if (!isAdmin) return;
    setBusy(true);
    const [productsRes, ordersRes, campaignsRes] = await Promise.all([
      supabase.from("products").select("id,name,category,wholesale_price,unit_price,min_qty,stock,image_url,active").eq("active", true).order("name"),
      supabase.from("orders").select("id,total_amount,payment_status,address_state,items,created_at").order("created_at", { ascending: false }),
      db.from("admin_campaigns").select("id,name,headline,body,cta,destination_url,platforms,status,created_at").order("created_at", { ascending: false }).limit(12),
    ]);
    if (productsRes.error || ordersRes.error || campaignsRes.error) {
      toast.error("Não foi possível carregar todos os dados do Centro de Comando.");
    }
    setProducts((productsRes.data ?? []) as Product[]);
    setOrders((ordersRes.data ?? []) as Order[]);
    setCampaigns((campaignsRes.data ?? []) as Campaign[]);
    setBusy(false);
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;
  const destinationUrl = selectedProduct ? `${SITE_ORIGIN}/produto/${selectedProduct.id}` : SITE_ORIGIN;

  useEffect(() => {
    if (!selectedProduct) return;
    setCampaignName(`Campanha - ${selectedProduct.name}`);
    setHeadline(`${selectedProduct.name}: destaque que vende`);
    setBody(`Apresente ${selectedProduct.name} com uma oferta clara, benefício direto e chamada para ação. Pedido mínimo: ${selectedProduct.min_qty} unidade(s).`);
  }, [productId]);

  const metrics = useMemo(() => {
    const paid = orders.filter((o) => o.payment_status === "paid");
    const revenue = paid.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const pending = orders.filter((o) => o.payment_status === "pending").length;
    const avgTicket = paid.length ? revenue / paid.length : 0;
    const stateCount = new Map<string, number>();
    paid.forEach((o) => stateCount.set(o.address_state, (stateCount.get(o.address_state) ?? 0) + 1));
    const topState = [...stateCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    const productQty = new Map<string, number>();
    paid.forEach((o) => {
      if (!Array.isArray(o.items)) return;
      o.items.forEach((item: any) => {
        const name = String(item?.name ?? "");
        const qty = Number(item?.qty ?? item?.quantity ?? 0);
        if (name) productQty.set(name, (productQty.get(name) ?? 0) + qty);
      });
    });
    const topProduct = [...productQty.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { revenue, paidCount: paid.length, pending, avgTicket, topState, topProduct };
  }, [orders]);

  const saveCampaign = async () => {
    if (!user || !selectedProduct || !campaignName.trim() || !headline.trim()) {
      toast.error("Selecione um produto e preencha nome e título da campanha.");
      return;
    }
    setBusy(true);
    const { error } = await db.from("admin_campaigns").insert({
      created_by: user.id,
      product_id: selectedProduct.id,
      name: campaignName.trim(),
      headline: headline.trim(),
      body: body.trim(),
      cta: cta.trim() || "COMPRAR AGORA",
      destination_url: destinationUrl,
      media_urls: selectedProduct.image_url ? [selectedProduct.image_url] : [],
      platforms,
      status: "draft",
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível salvar a campanha.", { description: error.message });
      return;
    }
    toast.success("Campanha salva como rascunho.");
    await load();
  };

  const togglePlatform = (platform: string) => {
    setPlatforms((current) => current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform]);
  };

  if (loading || !isAdmin) {
    return <div className="min-h-screen grid place-items-center bg-background">Carregando Centro de Comando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="container h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Voltar ao painel">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div className="min-w-0">
              <p className="font-heading font-black text-sm truncate">CENTRO DE COMANDO</p>
              <p className="text-[11px] text-muted-foreground truncate">Inteligência comercial e campanhas · somente admin</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={busy}>
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Faturamento confirmado</p><p className="text-xl font-black">{formatCurrency(metrics.revenue)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Pedidos pagos</p><p className="text-xl font-black">{metrics.paidCount}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-xl font-black">{metrics.pending}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Ticket médio</p><p className="text-xl font-black">{formatCurrency(metrics.avgTicket)}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">UF com mais pedidos pagos</p><p className="text-xl font-black">{metrics.topState}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Produto mais vendido</p><p className="text-sm font-black line-clamp-2">{metrics.topProduct}</p></Card>
        </section>

        <section className="grid lg:grid-cols-[1.05fr_.95fr] gap-5">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /><h2 className="font-heading font-black">CRIADOR DE CAMPANHA</h2></div>
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Selecione um produto do catálogo" /></SelectTrigger>
                <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nome da campanha</Label><Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex.: Campanha Creatina Setembro" /></div>
            <div className="space-y-2"><Label>Título principal</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Título forte e curto" /></div>
            <div className="space-y-2"><Label>Texto do anúncio</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Benefício, condição e argumento comercial" /></div>
            <div className="space-y-2"><Label>Chamada para ação</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Redes / canais</Label>
              <div className="flex flex-wrap gap-2">{PLATFORMS.map((p) => <Button key={p} type="button" size="sm" variant={platforms.includes(p) ? "default" : "outline"} onClick={() => togglePlatform(p)}>{p}</Button>)}</div>
            </div>
            <Button onClick={saveCampaign} disabled={busy || !selectedProduct} className="w-full"><Save className="w-4 h-4" /> Salvar rascunho</Button>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /><div><h2 className="font-heading font-black">PRÉVIA DO ANÚNCIO</h2><p className="text-xs text-muted-foreground">Arte-base com produto + mensagem + QR Code</p></div></div>
            <div className="p-5 space-y-4">
              <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <div className="aspect-square bg-muted relative grid place-items-center overflow-hidden">
                  {selectedProduct?.image_url ? <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" /> : <div className="text-muted-foreground text-sm">Selecione um produto com imagem</div>}
                  <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur p-4 space-y-2">
                    <p className="text-lg font-black leading-tight">{headline || "Seu título impactante aparece aqui"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{body || "Texto comercial do anúncio."}</p>
                    <div className="flex items-end justify-between gap-3">
                      <div>{selectedProduct && <><p className="text-xs text-muted-foreground">A partir de</p><p className="font-black text-primary">{formatCurrency(selectedProduct.wholesale_price)}</p></>}</div>
                      <div className="bg-white p-1.5 rounded-lg"><QRCodeSVG value={destinationUrl} size={84} level="M" /></div>
                    </div>
                    <div className="rounded-lg bg-primary text-primary-foreground text-center font-heading font-black text-xs tracking-wider py-2">{cta || "COMPRAR AGORA"}</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground break-all">Destino do QR Code: <span className="text-foreground">{destinationUrl}</span></p>
            </div>
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /><h2 className="font-heading font-black">LEITURA COMERCIAL</h2></div>
            <p className="text-sm text-muted-foreground">Use estes sinais como ponto de partida para decidir campanhas. Eles vêm dos pedidos registrados no sistema, não de estimativas externas.</p>
            <div className="text-sm space-y-2">
              <p><strong>Produto de maior giro:</strong> {metrics.topProduct}</p>
              <p><strong>Região com mais pedidos pagos:</strong> {metrics.topState}</p>
              <p><strong>Pedidos pendentes:</strong> {metrics.pending}. Vale acompanhar onde há abandono entre checkout e confirmação.</p>
              <p><strong>Ticket médio confirmado:</strong> {formatCurrency(metrics.avgTicket)}. Esse número ajuda a definir kits, descontos e metas de mídia.</p>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between"><h2 className="font-heading font-black">RASCUNHOS RECENTES</h2><span className="text-xs text-muted-foreground">{campaigns.length} carregados</span></div>
            {campaigns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma campanha salva ainda.</p> : campaigns.slice(0, 6).map((c) => (
              <div key={c.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-sm">{c.name}</p><p className="text-xs text-muted-foreground line-clamp-1">{c.headline}</p></div><span className="text-[10px] uppercase tracking-wider bg-secondary px-2 py-1 rounded">{c.status}</span></div>
                <p className="text-[11px] text-muted-foreground mt-2">{c.platforms.join(" · ") || "Sem canais definidos"}</p>
              </div>
            ))}
          </Card>
        </section>

        <div className="flex justify-center"><Button variant="outline" asChild><Link to="/admin">Voltar ao Painel Admin</Link></Button></div>
      </main>
    </div>
  );
};

export default CommandCenter;
