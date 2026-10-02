import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { lookupCep, maskCepValue, onlyDigitsCep } from "@/lib/shipping";
import { Boxes, CheckCircle2, CircleDollarSign, Clock3, Home, MapPin, Package, Settings2, ShieldCheck, Sparkles, Store as StoreIcon, Truck, WalletCards } from "lucide-react";

type Offer = { id: string; items: Array<{ name: string; qty: number }>; subtotal: number; city: string; distance_km: number; partner_merchandise: number };
type Request = { id: string; status: string; store_id?: string | null; store_name?: string | null; order_code?: string | null; payment_status?: string | null; shipping?: number | null; route_km?: number | null; eta_minutes?: number | null; items: Array<{ name: string; qty: number }> };

type Payout = { id:string; store_id:string; amount:number; status:string; approved_at:string|null; paid_at:string|null; receipt_reference:string|null };

type Store = {
  id: string;
  name: string;
  status: string;
  is_open: boolean;
  delivery_mode: "own" | "third_party" | "hybrid";
  own_driver_available: boolean;
  delivery_base: number;
  delivery_per_km: number;
  delivery_per_kg: number;
  terms_version: number;
  accepted_terms_version: number;
};

type InventoryItem = { store_id:string; product_id:string; on_hand:number; reserved:number; name:string };
type CatalogProduct = { id:string; name:string; image_url:string|null };

export default function PainelRevendedor() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockDraft, setStockDraft] = useState<Record<string,string>>({});
  const [stockReason, setStockReason] = useState<Record<string,string>>({});
  const [catalogProducts,setCatalogProducts]=useState<CatalogProduct[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [routeKm, setRouteKm] = useState<Record<string, string>>({});
  const [weightKg, setWeightKg] = useState<Record<string, string>>({});
  const [eta, setEta] = useState<Record<string, string>>({});
  const [deliveryCode, setDeliveryCode] = useState<Record<string, string>>({});
  const [adultVerified, setAdultVerified] = useState<Record<string, boolean>>({});
  const [registering, setRegistering] = useState(false);
  const [newStore, setNewStore] = useState({ name:"", document:"", phone:"", cep:"", address:"", city:"", state:"", lat:"", lng:"", radius_km:"15", terms:false });
  const [locatingStore, setLocatingStore] = useState(false);
  const [pix, setPix] = useState<Record<string,{pix_key_type:string;pix_key:string;holder_name:string;holder_document:string}>>({});
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [activeTab, setActiveTab] = useState<"inicio"|"pedidos"|"estoque"|"repasses">("inicio");
  const switchTab = (tab: "inicio"|"pedidos"|"estoque"|"repasses") => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const load = useCallback(async () => {
    const { data: dashboard, error: dashboardError } = await supabase.rpc("partner_command" as never, { p_action: "dashboard", p_payload: {} } as never);

    let loadedStores: Store[] = [];
    if (!dashboardError && dashboard) {
      const d = dashboard as unknown as { stores?: Store[]; offers?: Offer[]; requests?: Request[]; inventory?: InventoryItem[] };
      loadedStores = d.stores ?? [];
      setStores(loadedStores);
      setOffers(d.offers ?? []);
      setRequests(d.requests ?? []);
      setInventory(d.inventory ?? []);
    } else {
      const { data, error } = await supabase
        .from("partner_stores" as never)
        .select("id,name,status,is_open,delivery_mode,own_driver_available,delivery_base,delivery_per_km,delivery_per_kg,terms_version,accepted_terms_version")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error("Não foi possível carregar o status do seu cadastro. Atualize a página e tente novamente.");
        return;
      }
      loadedStores = (data ?? []) as unknown as Store[];
      setStores(loadedStores);
    }

    const {data:catalog}=await supabase.from("products").select("id,name,image_url").eq("active",true).order("name");
    setCatalogProducts((catalog??[]) as CatalogProduct[]);

    if (loadedStores.length) {
      const { data: accounts } = await supabase.from("partner_payout_accounts" as never).select("store_id,pix_key_type,pix_key,holder_name,holder_document");
      const mapped: typeof pix = {};
      ((accounts ?? []) as unknown as Array<{store_id:string;pix_key_type:string;pix_key:string;holder_name:string;holder_document:string}>).forEach(a=>{ mapped[a.store_id]={pix_key_type:a.pix_key_type,pix_key:a.pix_key,holder_name:a.holder_name,holder_document:a.holder_document}; });
      setPix(mapped);
      const { data: payoutRows } = await supabase.from("partner_payouts" as never).select("id,store_id,amount,status,approved_at,paid_at,receipt_reference").order("paid_at",{ascending:false,nullsFirst:true});
      setPayouts((payoutRows ?? []) as unknown as Payout[]);
    } else {
      setPix({});
      setPayouts([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel("partner-operations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_stores" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_inventory" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_requests" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_offers" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_payouts" }, () => void load())
      .subscribe();
    const fallback = window.setInterval(() => void load(), 30000);
    return () => {
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const acceptTerms = async (store: Store) => {
    setSaving("terms-"+store.id);
    const {error}=await supabase.rpc("partner_command" as never,{p_action:"accept_terms",p_payload:{store_id:store.id,version:store.terms_version}} as never);
    setSaving(null); if(error) return toast.error(error.message);
    toast.success("Condições vigentes aceitas."); await load();
  };

  const saveStoreSettings = async (store: Store) => {
    setSaving("settings-"+store.id);
    const { error } = await supabase.rpc("partner_command" as never,{p_action:"settings",p_payload:{store_id:store.id,is_open:store.is_open,delivery_base:Number(store.delivery_base),delivery_per_km:Number(store.delivery_per_km),delivery_per_kg:Number(store.delivery_per_kg)}} as never);
    setSaving(null);
    if(error) return toast.error(error.message);
    toast.success(store.is_open ? "Loja aberta para receber pedidos." : "Operação da loja atualizada.");
    void load();
  };

  const saveStock = async (storeId:string, productId:string, current:number) => {
    const key=storeId+":"+productId; const qty=Number(stockDraft[key]); const reason=(stockReason[key]??"").trim();
    if(!Number.isInteger(qty)||qty<0||qty>1000000) return toast.error("Informe uma quantidade válida.");
    if(reason.length<3) return toast.error("Informe o motivo do ajuste de estoque.");
    setSaving("stock-"+key);
    const {error}=await supabase.rpc("partner_command" as never,{p_action:"stock",p_payload:{store_id:storeId,product_id:productId,on_hand:qty,reason}} as never);
    setSaving(null); if(error) return toast.error(error.message);
    toast.success(`Estoque atualizado de ${current} para ${qty}.`); setStockDraft(x=>({...x,[key]:""})); setStockReason(x=>({...x,[key]:""})); await load();
  };

  const saveDelivery = async (store: Store) => {
    setSaving(store.id);
    const { error } = await supabase.rpc("partner_set_delivery_availability" as never, {
      p_store_id: store.id,
      p_delivery_mode: store.delivery_mode,
      p_own_driver_available: store.own_driver_available,
    } as never);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Disponibilidade de entrega atualizada.");
    void load();
  };

  const command = async (action: string, payload: Record<string, unknown>, success: string) => {
    setSaving(String(payload.request_id ?? action));
    const { data, error } = await supabase.rpc("partner_command" as never, { p_action: action, p_payload: payload } as never);
    setSaving(null);
    if (error) return toast.error(error.message);
    const result = data as unknown as { error?: string };
    if (result?.error) return toast.error(result.error);
    toast.success(success);
    await load();
  };

  const savePix = async (storeId:string) => {
    const p=pix[storeId];
    if (!p?.pix_key || p.holder_name.trim().length<3 || ![11,14].includes(p.holder_document.replace(/\D/g,"").length)) return toast.error("Confira os dados PIX.");
    setSaving("pix-"+storeId);
    const { error }=await supabase.from("partner_payout_accounts" as never).upsert({store_id:storeId,...p,holder_document:p.holder_document.replace(/\D/g,"")} as never,{onConflict:"store_id"});
    setSaving(null);
    if(error) return toast.error(error.message);
    toast.success("Conta de repasse salva com segurança.");
  };

  const locateStore = async () => {
    const cep = onlyDigitsCep(newStore.cep);
    if (cep.length !== 8) return toast.error("Informe um CEP válido.");
    setLocatingStore(true);
    const info = await lookupCep(cep);
    setLocatingStore(false);
    if (!info) return toast.error("CEP não encontrado.");
    if (info.latitude == null || info.longitude == null) return toast.error("O CEP foi encontrado, mas não possui coordenadas suficientes. Confira o endereço ou tente outro CEP.");
    const address = [info.street, info.neighborhood].filter(Boolean).join(", ");
    setNewStore((x) => ({...x, cep:info.cep, address:address || x.address, city:info.city, state:info.state, lat:String(info.latitude), lng:String(info.longitude)}));
    toast.success("Endereço localizado automaticamente.");
  };

  const registerStore = async () => {
    const document = newStore.document.replace(/\D/g, "");
    if (newStore.name.trim().length < 2 || document.length !== 14 || newStore.phone.trim().length < 8 || onlyDigitsCep(newStore.cep).length !== 8 || newStore.address.trim().length < 5 || !newStore.city || !newStore.state) {
      return toast.error("Preencha corretamente nome, CNPJ, telefone, CEP e endereço.");
    }
    const lat = Number(newStore.lat), lng = Number(newStore.lng), radius = Number(newStore.radius_km);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return toast.error("Informe coordenadas válidas da loja.");
    if (!Number.isFinite(radius) || radius < 1 || radius > 50) return toast.error("O raio deve ficar entre 1 e 50 km.");
    if (!newStore.terms) return toast.error("Aceite as condições de participação.");

    setRegistering(true);
    try {
      const { data: currentDashboard, error: currentDashboardError } = await supabase.rpc("partner_command" as never, { p_action:"dashboard", p_payload:{} } as never);
      if (!currentDashboardError && currentDashboard) {
        const currentStores = (currentDashboard as unknown as { stores?: Store[] }).stores ?? [];
        if (currentStores.length > 0) {
          setStores(currentStores);
          toast.info("Seu cadastro já foi recebido e está em análise. Não é necessário cadastrar novamente.");
          return;
        }
      }

      const { error } = await supabase.rpc("partner_command" as never, { p_action:"register", p_payload:{ ...newStore, document, cep:onlyDigitsCep(newStore.cep), lat, lng, radius_km:radius, terms:true } } as never);
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          await load();
          toast.info("Seu cadastro já existe e está em análise. Atualizamos o painel com o status correto.");
          return;
        }
        toast.error(error.message);
        return;
      }

      toast.success("Cadastro recebido! Sua loja está em análise.");
      setNewStore({ name:"", document:"", phone:"", cep:"", address:"", city:"", state:"", lat:"", lng:"", radius_km:"15", terms:false });
      await load();
    } finally {
      setRegistering(false);
    }
  };

  const approvedStores = stores.filter((s) => s.status === "approved");
  const pendingStores = stores.filter((s) => s.status !== "approved");
  const hasApprovedStore = approvedStores.length > 0;
  const activeRequests = requests.filter((r) => ["accepted","quoted","paid","delivering"].includes(r.status));
  const waitingPayout = payouts.filter((p) => ["eligible","approved"].includes(p.status)).reduce((sum,p)=>sum+Number(p.amount||0),0);
  const paidPayout = payouts.filter((p) => p.status === "paid").reduce((sum,p)=>sum+Number(p.amount||0),0);
  const openStore = approvedStores.find((s) => s.is_open) ?? approvedStores[0] ?? null;
  const totalAvailable = inventory.reduce((sum, item) => sum + Math.max(0, Number(item.on_hand) - Number(item.reserved)), 0);

  return (
    <main className="min-h-screen bg-[#0a0b0d] text-zinc-100 pb-24 md:pb-8">
      <div className="mx-auto min-h-screen max-w-[1500px] md:grid md:grid-cols-[220px_1fr]">
        <aside className="hidden md:flex min-h-screen flex-col border-r border-white/10 bg-[#0d0f12] p-4">
          <div className="px-2 py-4">
            <p className="font-heading text-xl font-black leading-none tracking-tight">MANSÃO</p>
            <p className="font-heading text-xl font-black leading-none tracking-tight">MAROMBA</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-zinc-500">Área do parceiro</p>
          </div>
          <nav className="mt-6 space-y-2 text-sm">
            {hasApprovedStore ? <>
              <button type="button" onClick={()=>switchTab("inicio")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeTab==="inicio"?"bg-yellow-400/15 text-yellow-300":"text-zinc-400 hover:bg-white/5 hover:text-white"}`}><Home className="h-4 w-4"/><span>Visão geral</span></button>
              <button type="button" onClick={()=>switchTab("pedidos")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeTab==="pedidos"?"bg-yellow-400/15 text-yellow-300":"text-zinc-400 hover:bg-white/5 hover:text-white"}`}><Package className="h-4 w-4"/><span>Pedidos</span></button>
              <button type="button" onClick={()=>switchTab("estoque")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeTab==="estoque"?"bg-yellow-400/15 text-yellow-300":"text-zinc-400 hover:bg-white/5 hover:text-white"}`}><Boxes className="h-4 w-4"/><span>Meu estoque</span></button>
              <button type="button" onClick={()=>switchTab("repasses")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeTab==="repasses"?"bg-yellow-400/15 text-yellow-300":"text-zinc-400 hover:bg-white/5 hover:text-white"}`}><WalletCards className="h-4 w-4"/><span>Repasses</span></button>
            </> : <button type="button" className="flex w-full items-center gap-3 rounded-xl bg-yellow-400/15 px-3 py-3 text-left text-yellow-300"><StoreIcon className="h-4 w-4"/><span>Cadastro / aprovação</span></button>}
          </nav>
          <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-500">
            Pagamento centralizado na plataforma. Entrega liberada somente após confirmação.
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0b0d]/95 px-4 py-3 backdrop-blur md:px-7">
            <div className="flex items-center justify-between gap-3">
              <div className="md:hidden">
                <p className="font-heading text-sm font-black">MANSÃO MAROMBA</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Parceiro</p>
              </div>
              <div className="hidden md:block">
                <h1 className="text-2xl font-black">Olá, parceiro</h1>
                <p className="text-sm text-zinc-400">{hasApprovedStore ? "Gerencie pedidos, estoque, entregas e repasses." : "Cadastre sua loja ou acompanhe a aprovação."}</p>
              </div>
              <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${openStore?.is_open?"border-emerald-500/30 bg-emerald-500/10 text-emerald-300":"border-zinc-700 bg-zinc-900 text-zinc-400"}`}>
                <span className={`h-2 w-2 rounded-full ${openStore?.is_open?"bg-emerald-400":"bg-zinc-500"}`} />
                {openStore?.is_open ? "Loja aberta" : "Loja fechada"}
              </div>
            </div>
          </header>

          <div className="space-y-6 p-4 md:p-7">
            {!hasApprovedStore && <section id="visao-geral" className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-[#1c170a] via-[#101114] to-[#090a0c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:p-6">
              <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-yellow-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-10 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-2.5">
                      <StoreIcon className="h-5 w-5 text-yellow-300"/>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-300">Área do parceiro</p>
                      <h1 className="mt-1 text-xl font-black sm:text-2xl">{stores.length===0 ? "Ative sua operação local" : "Cadastro recebido com sucesso"}</h1>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">{stores.length===0 ? "Cadastre sua loja abaixo para entrar na rede de parceiros Mansão Maromba." : "Sua loja já está salva. Agora ela passa pela análise de segurança e condições comerciais antes da liberação operacional."}</p>
                    </div>
                  </div>
                  {stores.length>0&&<span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-black text-amber-200"><Clock3 className="h-3.5 w-3.5"/>Em análise</span>}
                </div>

                {pendingStores.length>0&&<>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300"/>
                      <p className="mt-2 text-xs font-black text-emerald-100">Cadastro recebido</p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-400">Dados da loja registrados.</p>
                    </div>
                    <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.08] p-3">
                      <ShieldCheck className="h-5 w-5 text-yellow-300"/>
                      <p className="mt-2 text-xs font-black text-yellow-100">Análise da parceria</p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-400">Validação de segurança e condições.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <Sparkles className="h-5 w-5 text-zinc-400"/>
                      <p className="mt-2 text-xs font-black text-zinc-200">Liberação do painel</p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-500">Pedidos, estoque, entrega e repasses.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">{pendingStores.map((store)=><div key={store.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"><div><p className="font-black text-zinc-100">{store.name}</p><p className="mt-1 text-xs text-zinc-500">CNPJ cadastrado · operação ainda bloqueada até aprovação</p></div><span className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-black text-yellow-200">{store.status==="pending"?"Em análise":store.status==="rejected"?"Revisão necessária":"Aguardando liberação"}</span></div>)}</div>

                  <div className="mt-4 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.06] p-3 text-xs leading-5 text-yellow-100">
                    Seu cadastro já está ativo no sistema como solicitação. Não é necessário enviar novamente; a operação será liberada após a aprovação.
                  </div>
                  <Button
                    type="button"
                    className="mt-4 h-11 w-full rounded-xl border border-yellow-300 bg-yellow-400 font-black text-black shadow-[0_10px_28px_rgba(250,204,21,0.18)] hover:bg-yellow-300 hover:text-black sm:w-auto"
                    onClick={() => navigate("/")}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Ir para Home do aplicativo
                  </Button>
                </>}
              </div>
            </section>}

            {hasApprovedStore && <>
            {activeTab==="inicio" && <section id="visao-geral" className="space-y-4">
              <div className="md:hidden">
                <h1 className="text-2xl font-black">Início</h1>
                <p className="text-sm text-zinc-400">Operação local em tempo real.</p>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-yellow-400/25 bg-gradient-to-br from-[#241807] via-[#111214] to-[#090a0c] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.4)] sm:p-6">
                <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-xl">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-300">Mansão Maromba • Parceiro</p>
                    <h2 className="mt-2 text-3xl font-black leading-none sm:text-4xl">Venda mais na sua região.</h2>
                    <p className="mt-3 text-sm leading-6 text-zinc-300">Receba pedidos próximos, controle seu estoque e acompanhe entregas e repasses em um único painel.</p>
                  </div>
                  <Button type="button" className="h-11 shrink-0 rounded-xl bg-yellow-400 px-5 font-black text-black hover:bg-yellow-300" onClick={()=>navigate("/")}>
                    Ver produtos
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">Pedidos novos</span><Clock3 className="h-4 w-4 text-yellow-300"/></div>
                  <p className="mt-2 text-3xl font-black">{offers.length}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">Aguardando sua decisão</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">Em andamento</span><Truck className="h-4 w-4 text-yellow-300"/></div>
                  <p className="mt-2 text-3xl font-black">{activeRequests.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">Aguardando repasse</span><CircleDollarSign className="h-4 w-4 text-yellow-300"/></div>
                  <p className="mt-2 text-2xl font-black">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(waitingPayout)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-center justify-between"><span className="text-xs text-zinc-400">Estoque disponível</span><Boxes className="h-4 w-4 text-yellow-300"/></div>
                  <p className="mt-2 text-3xl font-black">{totalAvailable}</p>
                </div>
              </div>
            </section>}

            {activeTab==="pedidos" && <div className="space-y-6">
            {offers.length > 0 && <section id="pedidos" className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-lg font-black">Solicitações próximas</h2><span className="text-xs text-zinc-500">{offers.length} aguardando decisão</span></div>
              <div className="grid gap-3 xl:grid-cols-2">
                {offers.map((offer) => <div key={offer.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black">Pedido próximo</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400"><MapPin className="h-3.5 w-3.5"/>{offer.city} · {Number(offer.distance_km).toFixed(1)} km</p>
                    </div>
                    <span className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2 py-1 text-[11px] font-semibold text-yellow-300">Aguardando aceite</span>
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">{offer.items.map((i)=>`${i.qty}× ${i.name}`).join(" • ")}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button className="bg-yellow-400 font-black text-black hover:bg-yellow-300" disabled={saving===offer.id} onClick={()=>void command("accept",{request_id:offer.id},"Pedido aceito. Informe a rota para calcular a entrega.")}>Aceitar solicitação</Button>
                    <Button variant="outline" className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/5" disabled={saving===offer.id} onClick={()=>void command("decline",{request_id:offer.id},"Oferta recusada.")}>Recusar</Button>
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-500">Após o aceite, o frete é calculado e o cliente confirma o pagamento.</p>
                </div>)}
              </div>
            </section>}

            {activeRequests.length > 0 && <section className="space-y-3">
              <div className="flex items-center justify-between"><h2 className="text-lg font-black">Pedidos em andamento</h2><span className="text-xs text-zinc-500">Atualização em tempo real</span></div>
              <div className="space-y-3">
                {activeRequests.map((r)=><div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-black">{r.order_code ?? "Pedido em preparação"}</p>
                      <p className="text-xs text-zinc-400">{r.store_name ?? "Loja parceira"} · {r.items?.map((i)=>`${i.qty}× ${i.name}`).join(" • ")}</p>
                    </div>
                    <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${r.status==="paid"||r.status==="delivering"?"bg-emerald-500/10 text-emerald-300":"bg-yellow-400/10 text-yellow-300"}`}>
                      {r.status==="accepted"?"Aceito":r.status==="quoted"?"Frete calculado":r.status==="paid"?"Pagamento confirmado":"Em entrega"}
                    </span>
                  </div>
                  {r.status==="accepted"&&<div className="mt-4 grid gap-2 md:grid-cols-4">
                    <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm" placeholder="Rota km" inputMode="decimal" value={routeKm[r.id]??""} onChange={(e)=>setRouteKm((x)=>({...x,[r.id]:e.target.value}))}/>
                    <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm" placeholder="Peso kg" inputMode="decimal" value={weightKg[r.id]??""} onChange={(e)=>setWeightKg((x)=>({...x,[r.id]:e.target.value}))}/>
                    <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm" placeholder="Prazo min" inputMode="numeric" value={eta[r.id]??""} onChange={(e)=>setEta((x)=>({...x,[r.id]:e.target.value}))}/>
                    <Button className="bg-yellow-400 font-bold text-black hover:bg-yellow-300" onClick={()=>void command("quote",{request_id:r.id,route_km:Number(routeKm[r.id]),weight_kg:Number(weightKg[r.id]),eta_minutes:Number(eta[r.id])},"Frete calculado e enviado ao cliente.")}>Calcular entrega</Button>
                  </div>}
                  {r.status==="quoted"&&<p className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-sm text-yellow-200">Frete: R$ {Number(r.shipping??0).toFixed(2).replace(".",",")} · aguardando pagamento do cliente.</p>}
                  {r.status==="paid"&&<div className="mt-4"><Button className="bg-yellow-400 font-bold text-black hover:bg-yellow-300" onClick={()=>void command("dispatch",{request_id:r.id},"Pedido saiu para entrega.")}><Truck className="mr-2 h-4 w-4"/>Saiu para entrega</Button></div>}
                  {r.status==="delivering"&&<div className="mt-4 space-y-3">
                    <label className="flex items-start gap-2 text-sm text-zinc-300"><input type="checkbox" className="mt-1" checked={adultVerified[r.id]??false} onChange={(e)=>setAdultVerified((x)=>({...x,[r.id]:e.target.checked}))}/><span>Confirmei documento oficial com foto e maioridade do recebedor.</span></label>
                    <div className="flex gap-2"><input className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 uppercase" placeholder="Código do cliente" maxLength={8} value={deliveryCode[r.id]??""} onChange={(e)=>setDeliveryCode((x)=>({...x,[r.id]:e.target.value.toUpperCase()}))}/><Button className="bg-yellow-400 font-bold text-black hover:bg-yellow-300" disabled={(deliveryCode[r.id]??"").length<4||!(adultVerified[r.id]??false)||saving===r.id} onClick={()=>void command("deliver",{request_id:r.id,code:deliveryCode[r.id],adult_verified:adultVerified[r.id]===true},"Entrega confirmada e estoque baixado.")}>Confirmar entrega</Button></div>
                  </div>}
                </div>)}
              </div>
            </section>}
            {offers.length===0 && activeRequests.length===0 && <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center"><Package className="mx-auto h-8 w-8 text-zinc-600"/><h2 className="mt-3 font-black">Nenhum pedido agora</h2><p className="mt-1 text-sm text-zinc-500">Novas solicitações e pedidos em andamento aparecerão aqui.</p></div>}
            </div>}

            </>}

            {stores.length===0&&<section id="minha-loja" className="overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-[#17130a] via-[#0f1013] to-[#090a0c] shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
              <div className="relative overflow-hidden border-b border-yellow-400/15 px-4 py-6 sm:px-6 sm:py-7">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-yellow-400/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-yellow-300">
                    <StoreIcon className="h-3.5 w-3.5"/>
                    Seja um parceiro Mansão Maromba
                  </div>
                  <h2 className="mt-4 max-w-2xl text-2xl font-black leading-tight sm:text-3xl">Transforme sua loja em um ponto ativo da rede.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">Receba oportunidades de pedidos próximos, opere seu estoque pelo app e acompanhe entregas e repasses em um só lugar.</p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
                      <Package className="mx-auto h-5 w-5 text-yellow-300"/>
                      <p className="mt-2 text-[11px] font-bold text-zinc-200">Pedidos locais</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
                      <Truck className="mx-auto h-5 w-5 text-yellow-300"/>
                      <p className="mt-2 text-[11px] font-bold text-zinc-200">Entrega rápida</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
                      <WalletCards className="mx-auto h-5 w-5 text-yellow-300"/>
                      <p className="mt-2 text-[11px] font-bold text-zinc-200">Repasse centralizado</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-yellow-300">Cadastro da loja</p>
                  <p className="mt-1 text-sm text-zinc-400">Preencha os dados abaixo. Depois da análise, as funções operacionais são liberadas no painel.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Nome da loja</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="Ex.: Adega Central" value={newStore.name} onChange={(e)=>setNewStore({...newStore,name:e.target.value})}/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">CNPJ</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="00.000.000/0000-00" inputMode="numeric" value={newStore.document} onChange={(e)=>setNewStore({...newStore,document:e.target.value})}/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Telefone / WhatsApp</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="(19) 99999-9999" value={newStore.phone} onChange={(e)=>setNewStore({...newStore,phone:e.target.value})}/>
                  </label>
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">CEP da loja</span>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="00000-000" inputMode="numeric" value={newStore.cep} onChange={(e)=>setNewStore({...newStore,cep:maskCepValue(e.target.value),lat:"",lng:""})}/>
                      <Button variant="outline" className="h-12 shrink-0 border-yellow-400/25 bg-yellow-400/5 px-4 text-yellow-200 hover:bg-yellow-400/10 hover:text-yellow-100" disabled={locatingStore} onClick={()=>void locateStore()}>{locatingStore?"Localizando...":"Buscar CEP"}</Button>
                    </div>
                  </div>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-xs font-semibold text-zinc-300">Endereço da loja</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="Rua, número e complemento" value={newStore.address} onChange={(e)=>setNewStore({...newStore,address:e.target.value})}/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Cidade / UF</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-300" readOnly value={[newStore.city,newStore.state].filter(Boolean).join(" / ")} placeholder="Preenchido pelo CEP"/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Raio de atendimento</span>
                    <div className="relative">
                      <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 pr-12 text-sm outline-none transition placeholder:text-zinc-600 focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/10" inputMode="decimal" placeholder="15" value={newStore.radius_km} onChange={(e)=>setNewStore({...newStore,radius_km:e.target.value})}/>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">km</span>
                    </div>
                  </label>
                </div>

                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-yellow-400" checked={newStore.terms} onChange={(e)=>setNewStore({...newStore,terms:e.target.checked})}/>
                  <span><strong className="text-zinc-100">Aceito as condições da operação parceira.</strong><br/><span className="text-xs text-zinc-500">Pedidos, estoque, entregas e repasses são liberados somente para lojas aprovadas.</span></span>
                </label>

                <Button className="mt-4 h-12 w-full rounded-xl bg-yellow-400 text-sm font-black text-black shadow-[0_10px_30px_rgba(250,204,21,0.12)] hover:bg-yellow-300 sm:w-auto sm:px-6" disabled={registering} onClick={()=>void registerStore()}>{registering?"Enviando...":"Enviar loja para aprovação"}</Button>
              </div>
            </section>}

            {approvedStores.map((store)=><section id="minha-loja" key={store.id} className="space-y-4">
              {activeTab==="inicio" && <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-lg font-black">{store.name}</h2><p className="text-xs text-zinc-500">Cadastro: {store.status}</p></div>
                  <Settings2 className="h-5 w-5 text-yellow-300"/>
                </div>
                {store.status==="approved"&&store.accepted_terms_version!==store.terms_version&&<div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4"><p className="font-semibold text-yellow-200">Condições atualizadas</p><p className="mt-1 text-xs text-zinc-400">Aceite a versão {store.terms_version} para reabrir a operação.</p><Button className="mt-3 bg-yellow-400 font-bold text-black hover:bg-yellow-300" disabled={saving==="terms-"+store.id} onClick={()=>void acceptTerms(store)}>Aceitar condições</Button></div>}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div><Label className="text-zinc-300">Modalidade de entrega</Label><Select value={store.delivery_mode} onValueChange={(value:Store["delivery_mode"])=>setStores((prev)=>prev.map((s)=>s.id===store.id?{...s,delivery_mode:value,own_driver_available:value==="third_party"?false:s.own_driver_available}:s))}><SelectTrigger className="mt-1 border-white/10 bg-black/20"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="own">Entregador próprio</SelectItem><SelectItem value="third_party">Entregador terceirizado</SelectItem><SelectItem value="hybrid">Híbrido</SelectItem></SelectContent></Select></div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"><div><Label className="text-zinc-300">Motoqueiro disponível</Label><p className="text-xs text-zinc-500">Prioriza entrega própria.</p></div><Switch disabled={store.delivery_mode==="third_party"} checked={store.own_driver_available} onCheckedChange={(checked)=>setStores((prev)=>prev.map((s)=>s.id===store.id?{...s,own_driver_available:checked}:s))}/></div>
                </div>
                <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3"><div><Label className="text-zinc-300">Loja recebendo pedidos</Label><p className="text-xs text-zinc-500">Abra somente com estoque e operação prontos.</p></div><Switch disabled={store.status!=="approved"} checked={store.is_open} onCheckedChange={(checked)=>setStores((prev)=>prev.map((s)=>s.id===store.id?{...s,is_open:checked}:s))}/></div>
                  <div className="mt-3 grid gap-2 md:grid-cols-3"><input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" type="number" min="0" step="0.01" aria-label="Taxa base" value={store.delivery_base} onChange={(e)=>setStores((prev)=>prev.map((s)=>s.id===store.id?{...s,delivery_base:Number(e.target.value)}:s))}/><input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" type="number" min="0" step="0.01" aria-label="Valor por km" value={store.delivery_per_km} onChange={(e)=>setStores((prev)=>prev.map((s)=>s.id===store.id?{...s,delivery_per_km:Number(e.target.value)}:s))}/><input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" type="number" min="0" step="0.01" aria-label="Valor por kg" value={store.delivery_per_kg} onChange={(e)=>setStores((prev)=>prev.map((s)=>s.id===store.id?{...s,delivery_per_kg:Number(e.target.value)}:s))}/></div>
                  <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" className="border-white/15 bg-transparent" disabled={saving==="settings-"+store.id||store.status!=="approved"} onClick={()=>void saveStoreSettings(store)}>Salvar tarifas e abertura</Button><Button className="bg-yellow-400 font-bold text-black hover:bg-yellow-300" disabled={saving===store.id} onClick={()=>void saveDelivery(store)}>Salvar operação</Button></div>
                </div>
              </div>
              </>}

              {activeTab==="estoque" && <div id="estoque" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><h2 className="text-lg font-black">Meu estoque</h2><p className="text-xs text-zinc-500">Disponível = físico menos reservado.</p></div>
                  <Boxes className="h-5 w-5 text-yellow-300"/>
                </div>
                {catalogProducts.length===0?<p className="mt-3 text-sm text-zinc-500">Nenhum produto ativo no catálogo.</p>:<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {catalogProducts.map((p)=>{const i=inventory.find((x)=>x.store_id===store.id&&x.product_id===p.id)??{store_id:store.id,product_id:p.id,on_hand:0,reserved:0,name:p.name};const key=i.store_id+":"+i.product_id;return <div key={key} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start gap-3">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                        <Package className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-zinc-600"/>
                        {p.image_url&&<img src={p.image_url} alt={p.name} loading="lazy" className="relative h-full w-full object-cover" onError={(e)=>{e.currentTarget.style.display="none";}}/>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold">{i.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">Físico {i.on_hand} · reservado {i.reserved}</p>
                        <p className="mt-1 text-xs font-semibold text-yellow-300">Disponível {i.on_hand-i.reserved}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <input className="h-9 rounded-lg border border-white/10 bg-black/30 px-2" type="number" min="0" step="1" placeholder={String(i.on_hand)} value={stockDraft[key]??""} onChange={(e)=>setStockDraft((x)=>({...x,[key]:e.target.value}))}/>
                      <input className="h-9 rounded-lg border border-white/10 bg-black/30 px-2" placeholder="Motivo do ajuste" value={stockReason[key]??""} onChange={(e)=>setStockReason((x)=>({...x,[key]:e.target.value}))}/>
                      <Button size="sm" variant="outline" className="border-yellow-400/25 bg-yellow-400/5 text-yellow-200 hover:bg-yellow-400/10" disabled={saving==="stock-"+key} onClick={()=>void saveStock(i.store_id,i.product_id,i.on_hand)}>Atualizar estoque</Button>
                    </div>
                  </div>})}
                </div>}
              </div>}

              {activeTab==="repasses" && <div id="repasses" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Repasses</h2><p className="text-xs text-zinc-500">Cliente paga à plataforma; sua loja recebe depois da entrega.</p></div><WalletCards className="h-5 w-5 text-yellow-300"/></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-zinc-500">Aguardando liberação</p><p className="mt-1 text-xl font-black text-yellow-300">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(waitingPayout)}</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-zinc-500">Já repassado</p><p className="mt-1 text-xl font-black">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(paidPayout)}</p></div></div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <Select value={pix[store.id]?.pix_key_type??"cnpj"} onValueChange={(v)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key:"",holder_name:"",holder_document:""}),pix_key_type:v}}))}><SelectTrigger className="border-white/10 bg-black/20"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="random">Aleatória</SelectItem></SelectContent></Select>
                  <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" placeholder="Chave PIX" value={pix[store.id]?.pix_key??""} onChange={(e)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",holder_name:"",holder_document:""}),pix_key:e.target.value}}))}/>
                  <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" placeholder="Nome do titular" value={pix[store.id]?.holder_name??""} onChange={(e)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",pix_key:"",holder_document:""}),holder_name:e.target.value}}))}/>
                  <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" placeholder="CPF/CNPJ do titular" value={pix[store.id]?.holder_document??""} onChange={(e)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",pix_key:"",holder_name:""}),holder_document:e.target.value}}))}/>
                </div>
                <Button variant="outline" className="mt-3 border-white/15 bg-transparent" disabled={saving==="pix-"+store.id} onClick={()=>void savePix(store.id)}>Salvar conta PIX</Button>
              </div>}
            </section>)}

            {hasApprovedStore&&activeTab==="repasses"&&payouts.length>0&&<section className="space-y-2">
              <h2 className="text-lg font-black">Histórico de repasses</h2>
              {payouts.map((p)=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4"><div><p className="font-bold">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(p.amount))}</p><p className="text-xs text-zinc-500">{stores.find((s)=>s.id===p.store_id)?.name??"Loja parceira"}</p></div><div className="text-right text-sm"><p>{p.status==="eligible"?"Aguardando aprovação":p.status==="approved"?"Aprovado para pagamento":p.status==="paid"?"Pago":p.status==="cancelled"?"Cancelado":p.status}</p>{p.status==="paid"&&<p className="text-xs text-zinc-500">{p.paid_at?new Date(p.paid_at).toLocaleString("pt-BR"):""}{p.receipt_reference?` · ${p.receipt_reference}`:""}</p>}</div></div>)}
            </section>}

            {(!hasApprovedStore || activeTab==="inicio") && <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm text-yellow-200">
              A entrega só é liberada depois que o pagamento do cliente é confirmado pela plataforma.
            </div>}
          </div>
        </div>
      </div>

      <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${hasApprovedStore?"grid-cols-5":"grid-cols-2"} border-t border-white/10 bg-[#0d0f12]/95 px-2 py-2 backdrop-blur md:hidden`}>
        {hasApprovedStore ? <>
          <button type="button" onClick={()=>switchTab("inicio")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="inicio"?"text-yellow-300":"text-zinc-400"}`}><Home className="h-5 w-5"/><span>Início</span></button>
          <button type="button" onClick={()=>switchTab("pedidos")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="pedidos"?"text-yellow-300":"text-zinc-400"}`}><Package className="h-5 w-5"/><span>Pedidos</span></button>
          <button type="button" onClick={()=>navigate("/")} className="mx-1 flex flex-col items-center gap-1 rounded-xl bg-yellow-400 px-2 py-1 text-[10px] font-black text-black hover:bg-yellow-300" aria-label="Voltar para a Home"><Home className="h-5 w-5"/><span>Home</span></button>
          <button type="button" onClick={()=>switchTab("estoque")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="estoque"?"text-yellow-300":"text-zinc-400"}`}><Boxes className="h-5 w-5"/><span>Estoque</span></button>
          <button type="button" onClick={()=>switchTab("repasses")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="repasses"?"text-yellow-300":"text-zinc-400"}`}><WalletCards className="h-5 w-5"/><span>Repasses</span></button>
        </> : <>
          <span className="flex flex-col items-center gap-1 py-1 text-[10px] text-yellow-300"><StoreIcon className="h-5 w-5"/><span>Cadastro</span></span>
          <button type="button" onClick={()=>navigate("/")} className="mx-1 flex flex-col items-center gap-1 rounded-xl bg-yellow-400 px-2 py-1 text-[10px] font-black text-black hover:bg-yellow-300" aria-label="Voltar para a Home"><Home className="h-5 w-5"/><span>Home</span></button>
        </>}
      </nav>
    </main>
  );
}
