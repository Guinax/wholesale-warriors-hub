import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { lookupCep, maskCepValue, onlyDigitsCep } from "@/lib/shipping";
import { Bell, Boxes, CheckCircle2, Clock3, Home, MapPin, Package, Settings2, ShieldCheck, Sparkles, Store as StoreIcon, Truck, WalletCards, Grid2X2, List } from "lucide-react";
import type { PartnerOffer, PartnerRequest } from "@/lib/partnerDelivery";
import PushPermissionButton from "@/components/PushPermissionButton";

const PartnerDeliveryBoard = lazy(() => import("@/components/partners/PartnerDeliveryBoard"));
const PartnerRestockRequest = lazy(() => import("@/components/partners/PartnerRestockRequest"));

type Offer = PartnerOffer;
type Request = PartnerRequest;

type Payout = { id:string; store_id:string; amount:number; paid_amount:number; status:string; approved_at:string|null; paid_at:string|null; receipt_reference:string|null };
type WalletPayment = { id:string; store_id:string; amount:number; receipt_url:string; receipt_reference:string|null; paid_at:string };

type Store = {
  id: string;
  name: string;
  status: string;
  is_open: boolean;
  lat?: number | null;
  lng?: number | null;
  delivery_mode: "own" | "third_party" | "hybrid";
  own_driver_available: boolean;
  delivery_base: number;
  delivery_per_km: number;
  delivery_per_kg: number;
  terms_version: number;
  accepted_terms_version: number;
  last_seen_at?: string | null;
};

type InventoryItem = { store_id:string; product_id:string; on_hand:number; reserved:number; name:string };
type CatalogProduct = { id:string; name:string; image_url:string|null };

export default function PainelRevendedor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stockDraft, setStockDraft] = useState<Record<string,string>>({});
  const [stockView, setStockView] = useState<"grid"|"list">("grid");
  const [catalogProducts,setCatalogProducts]=useState<CatalogProduct[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [registering, setRegistering] = useState(false);
  const [newStore, setNewStore] = useState({ name:"", document:"", phone:"", cep:"", address:"", city:"", state:"", lat:"", lng:"", radius_km:"15", terms:false });
  const [locatingStore, setLocatingStore] = useState(false);
  const [pix, setPix] = useState<Record<string,{pix_key_type:string;pix_key:string;holder_name:string;holder_document:string}>>({});
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [walletPayments, setWalletPayments] = useState<WalletPayment[]>([]);
  const [activeTab, setActiveTab] = useState<"inicio"|"pedidos"|"estoque"|"repasses"|"loja">("inicio");
  const switchTab = (tab: "inicio"|"pedidos"|"estoque"|"repasses"|"loja") => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
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
          .select("id,name,status,is_open,lat,lng,delivery_mode,own_driver_available,delivery_base,delivery_per_km,delivery_per_kg,terms_version,accepted_terms_version")
          .order("created_at", { ascending: false });
        if (error) {
          setLoadFailed(true);
          toast.error("Não foi possível consultar lojas parceiras. Verifique as permissões do cadastro.");
          return;
        }
        loadedStores = (data ?? []) as unknown as Store[];
        if (loadedStores.some(store => store.status === "approved")) {
          throw new Error("Não foi possível consultar os pedidos da loja.");
        }
        setStores(loadedStores);
        setOffers([]);
        setRequests([]);
        setInventory([]);
      }

      const {data:catalog}=await supabase.from("products").select("id,name,image_url").eq("active",true).order("name");
      setCatalogProducts((catalog??[]) as CatalogProduct[]);

      if (loadedStores.length) {
        const { data: accounts } = await supabase.from("partner_payout_accounts" as never).select("store_id,pix_key_type,pix_key,holder_name,holder_document");
        const mapped: typeof pix = {};
        ((accounts ?? []) as unknown as Array<{store_id:string;pix_key_type:string;pix_key:string;holder_name:string;holder_document:string}>).forEach(a=>{ mapped[a.store_id]={pix_key_type:a.pix_key_type,pix_key:a.pix_key,holder_name:a.holder_name,holder_document:a.holder_document}; });
        setPix(mapped);
        const [{ data: payoutRows }, { data: walletRows }] = await Promise.all([supabase.from("partner_payouts" as never).select("id,store_id,amount,paid_amount,status,approved_at,paid_at,receipt_reference").order("created_at",{ascending:false}),supabase.from("partner_wallet_payments" as never).select("id,store_id,amount,receipt_url,receipt_reference,paid_at").order("paid_at",{ascending:false})]);
        setPayouts((payoutRows ?? []) as unknown as Payout[]);
        setWalletPayments((walletRows ?? []) as unknown as WalletPayment[]);
      } else {
        setPix({});
        setPayouts([]);
        setWalletPayments([]);
      }
    } catch {
      setLoadFailed(true);
      toast.error("Não foi possível carregar seu painel. Tente novamente.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const heartbeat = () => { void supabase.rpc("partner_heartbeat" as never); };
    heartbeat();
    const timer = window.setInterval(heartbeat, 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") heartbeat(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("partner-operations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_stores" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_inventory" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_requests" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_offers" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_payouts" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_wallet_payments" }, () => void load())
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
    const key=storeId+":"+productId; const qty=Number(stockDraft[key]); const reason="Ajuste de estoque pelo parceiro";
    if(!Number.isInteger(qty)||qty<0||qty>1000000) return toast.error("Informe uma quantidade válida.");
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

  const command = async (action: string, payload: Record<string, unknown>, success: string): Promise<void> => {
    setSaving(String(payload.request_id ?? action));
    try {
      const { data, error } = await supabase.rpc("partner_command" as never, { p_action: action, p_payload: payload } as never);
      if (error) { toast.error(error.message); return; }
      const result = data as unknown as { error?: string };
      if (result?.error) { toast.error(result.error); return; }
      toast.success(success);
      await load();
    } catch {
      toast.error("Não foi possível atualizar o pedido. Confira sua conexão e tente novamente.");
    } finally {
      setSaving(null);
    }
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

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#0c0c0c] text-[#c9bea8]"><p role="status">Carregando seu painel...</p></main>;
  if (loadFailed) return <main className="grid min-h-screen place-items-center bg-[#0c0c0c] p-6 text-[#c9bea8]"><div className="space-y-4 text-center"><p>Não foi possível carregar o painel.</p><Button onClick={()=>void load()}>Tentar novamente</Button></div></main>;

  const approvedStores = stores.filter((s) => s.status === "approved");
  const pendingStores = stores.filter((s) => s.status !== "approved");
  const hasApprovedStore = approvedStores.length > 0;
  const walletPayouts = payouts.filter((p) => p.status !== "cancelled" && p.status !== "pending");
  const waitingPayout = walletPayouts.reduce((sum,p)=>sum+Math.max(0,Number(p.amount||0)-Number(p.paid_amount||0)),0);
  const paidPayout = walletPayouts.reduce((sum,p)=>sum+Number(p.paid_amount||0),0);
  const openStore = approvedStores.find((s) => s.is_open) ?? approvedStores[0] ?? null;
  const totalAvailable = inventory.filter(i => approvedStores.some(s => s.id === i.store_id)).reduce((sum, item) => sum + Math.max(0, Number(item.on_hand) - Number(item.reserved)), 0);\n  const pendingContractStore = approvedStores.find((s) => s.accepted_terms_version !== s.terms_version) ?? null;

  return (
    <div className="contents">
      {stores.some((s) => s.status === "approved") && <div className="fixed bottom-20 right-3 z-40 rounded-xl bg-black/90 p-2 shadow-lg"><PushPermissionButton role="partner" /></div>}
    <main className={hasApprovedStore && ["inicio", "pedidos"].includes(activeTab) ? "min-h-screen bg-[#0c0c0c] pb-24 text-[#f5efdf] md:pb-8" : "min-h-screen bg-[#0a0b0d] text-zinc-100 pb-24 md:pb-8"}>
      <div className="mx-auto min-h-screen max-w-[1600px]">
        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#11100e] px-4 py-3 text-white md:px-7">
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={()=>navigate("/")} className="text-left font-heading text-base font-black leading-tight text-[#e5c66c]" aria-label="Voltar à Home">MANSÃO<br className="sm:hidden"/> MAROMBA</button>
              {hasApprovedStore && <nav className="hidden items-center gap-1 md:flex" aria-label="Painel do parceiro">
                {([{id:"inicio",label:"Entregas",icon:MapPin},{id:"pedidos",label:"Pedidos",icon:Package},{id:"estoque",label:"Estoque",icon:Boxes},{id:"repasses",label:"Repasses",icon:WalletCards},{id:"loja",label:"Minha loja",icon:StoreIcon}] as const).map(item=><button key={item.id} type="button" onClick={()=>switchTab(item.id)} aria-current={activeTab===item.id?"page":undefined} className={"flex items-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold transition "+(activeTab===item.id?"bg-white/10 text-[#e5c66c]":"text-slate-300 hover:bg-white/5")}><item.icon className="h-4 w-4"/>{item.label}</button>)}
              </nav>}
              <div className="flex items-center gap-2">
                {hasApprovedStore && <button type="button" onClick={()=>switchTab("loja")} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"><span className={"h-2 w-2 rounded-full "+(openStore?.is_open?"bg-emerald-400":"bg-slate-500")}/>{openStore?.is_open?"Loja aberta":"Loja fechada"}</button>}
                {hasApprovedStore && <button type="button" onClick={()=>switchTab("pedidos")} aria-label={"Ver pedidos: "+offers.length+" novas solicitações"} className="relative grid h-10 w-10 place-items-center rounded-lg hover:bg-white/5"><Bell className="h-5 w-5"/>{offers.length>0&&<span className="absolute right-0 top-0 rounded-full bg-[#d4af37] px-1.5 text-[10px] font-black text-black">{offers.length}</span>}</button>}
                {!hasApprovedStore && <span className="text-xs text-slate-300">Cadastro de parceiro</span>}
              </div>
            </div>
          </header>

          <div className="space-y-6 p-4 md:p-7">\n            {pendingContractStore && <section role="alert" className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 p-4 shadow-lg">\n              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">\n                <div>\n                  <p className="font-bold text-[#f3d97a]">Ação necessária: contrato da parceria pendente</p>\n                  <p className="mt-1 text-sm text-zinc-300">Revise e aceite o contrato vigente para manter sua loja apta a receber pedidos.</p>\n                </div>\n                <Button className="shrink-0 bg-[#d4af37] font-bold text-black hover:bg-[#e8c65a]" disabled={saving==="terms-"+pendingContractStore.id} onClick={()=>{switchTab("loja"); window.setTimeout(()=>document.getElementById("minha-loja")?.scrollIntoView({behavior:"smooth",block:"start"}),50);}}>Revisar e aceitar</Button>\n              </div>\n            </section>
            {!hasApprovedStore && <section id="visao-geral" className="relative overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-gradient-to-br from-[#1c170a] via-[#101114] to-[#090a0c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] sm:p-6">
              <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-[#d4af37]/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-10 h-44 w-44 rounded-full bg-amber-500/10 blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/10 p-2.5">
                      <StoreIcon className="h-5 w-5 text-[#e5c66c]"/>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e5c66c]">Área do parceiro</p>
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
                    <div className="rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.08] p-3">
                      <ShieldCheck className="h-5 w-5 text-[#e5c66c]"/>
                      <p className="mt-2 text-xs font-black text-yellow-100">Análise da parceria</p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-400">Validação de segurança e condições.</p>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101315] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                      <Sparkles className="h-5 w-5 text-zinc-400"/>
                      <p className="mt-2 text-xs font-black text-zinc-200">Liberação do painel</p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-500">Pedidos, estoque, entrega e repasses.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">{pendingStores.map((store)=><div key={store.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"><div><p className="font-black text-zinc-100">{store.name}</p><p className="mt-1 text-xs text-zinc-500">CNPJ cadastrado · operação ainda bloqueada até aprovação</p></div><span className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-1.5 text-xs font-black text-yellow-200">{store.status==="pending"?"Em análise":store.status==="rejected"?"Revisão necessária":"Aguardando liberação"}</span></div>)}</div>

                  <div className="mt-4 rounded-2xl border border-[#d4af37]/15 bg-[#d4af37]/[0.06] p-3 text-xs leading-5 text-yellow-100">
                    Seu cadastro já está ativo no sistema como solicitação. Não é necessário enviar novamente; a operação será liberada após a aprovação.
                  </div>
                  <Button
                    type="button"
                    className="mt-4 h-11 w-full rounded-xl border border-yellow-300 bg-[#d4af37] font-black text-black shadow-[0_10px_28px_rgba(250,204,21,0.18)] hover:bg-[#e8c65a] hover:text-black sm:w-auto"
                    onClick={() => navigate("/")}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Ir para Home do aplicativo
                  </Button>
                </>}
              </div>
            </section>}

            {hasApprovedStore && <>
              {(activeTab==="inicio" || activeTab==="pedidos") && <Suspense fallback={<p role="status" className="p-8 text-slate-500">Carregando mapa e pedidos...</p>}><PartnerDeliveryBoard
                stores={approvedStores} offers={offers} requests={requests} saving={saving}
                availableStock={totalAvailable} waitingPayout={waitingPayout} showMap={activeTab==="inicio"}
                onCommand={command} onNavigate={switchTab}
              /></Suspense>}
            </>}

            {stores.length===0&&<section id="minha-loja" className="overflow-hidden rounded-3xl border border-[#d4af37]/20 bg-gradient-to-br from-[#17130a] via-[#0f1013] to-[#090a0c] shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
              <div className="relative overflow-hidden border-b border-[#d4af37]/15 px-4 py-6 sm:px-6 sm:py-7">
                <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#d4af37]/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#e5c66c]">
                    <StoreIcon className="h-3.5 w-3.5"/>
                    Seja um parceiro Mansão Maromba
                  </div>
                  <h2 className="mt-4 max-w-2xl text-2xl font-black leading-tight sm:text-3xl">Transforme sua loja em um ponto ativo da rede.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">Receba oportunidades de pedidos próximos, opere seu estoque pelo app e acompanhe entregas e repasses em um só lugar.</p>
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
                      <Package className="mx-auto h-5 w-5 text-[#e5c66c]"/>
                      <p className="mt-2 text-[11px] font-bold text-zinc-200">Pedidos locais</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
                      <Truck className="mx-auto h-5 w-5 text-[#e5c66c]"/>
                      <p className="mt-2 text-[11px] font-bold text-zinc-200">Entrega rápida</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3 text-center">
                      <WalletCards className="mx-auto h-5 w-5 text-[#e5c66c]"/>
                      <p className="mt-2 text-[11px] font-bold text-zinc-200">Repasse centralizado</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="mb-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#e5c66c]">Cadastro da loja</p>
                  <p className="mt-1 text-sm text-zinc-400">Preencha os dados abaixo. Depois da análise, as funções operacionais são liberadas no painel.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Nome da loja</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="Ex.: Adega Central" value={newStore.name} onChange={(e)=>setNewStore({...newStore,name:e.target.value})}/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">CNPJ</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="00.000.000/0000-00" inputMode="numeric" value={newStore.document} onChange={(e)=>setNewStore({...newStore,document:e.target.value})}/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Telefone / WhatsApp</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="(19) 99999-9999" value={newStore.phone} onChange={(e)=>setNewStore({...newStore,phone:e.target.value})}/>
                  </label>
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">CEP da loja</span>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="00000-000" inputMode="numeric" value={newStore.cep} onChange={(e)=>setNewStore({...newStore,cep:maskCepValue(e.target.value),lat:"",lng:""})}/>
                      <Button variant="outline" className="h-12 shrink-0 border-[#d4af37]/25 bg-[#d4af37]/5 px-4 text-yellow-200 hover:bg-[#d4af37]/10 hover:text-yellow-100" disabled={locatingStore} onClick={()=>void locateStore()}>{locatingStore?"Localizando...":"Buscar CEP"}</Button>
                    </div>
                  </div>
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-xs font-semibold text-zinc-300">Endereço da loja</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/60 focus:ring-2 focus:ring-yellow-400/10" placeholder="Rua, número e complemento" value={newStore.address} onChange={(e)=>setNewStore({...newStore,address:e.target.value})}/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Cidade / UF</span>
                    <input className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-300" readOnly value={[newStore.city,newStore.state].filter(Boolean).join(" / ")} placeholder="Preenchido pelo CEP"/>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-300">Raio de atendimento</span>
                    <div className="relative">
                      <input className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 pr-12 text-sm outline-none transition placeholder:text-zinc-600 focus:border-[#d4af37]/60 focus:ring-2 focus:ring-yellow-400/10" inputMode="decimal" placeholder="15" value={newStore.radius_km} onChange={(e)=>setNewStore({...newStore,radius_km:e.target.value})}/>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">km</span>
                    </div>
                  </label>
                </div>

                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-yellow-400" checked={newStore.terms} onChange={(e)=>setNewStore({...newStore,terms:e.target.checked})}/>
                  <span><strong className="text-zinc-100">Aceito as condições da operação parceira.</strong><br/><span className="text-xs text-zinc-500">Pedidos, estoque, entregas e repasses são liberados somente para lojas aprovadas.</span></span>
                </label>

                <Button className="mt-4 h-12 w-full rounded-xl bg-[#d4af37] text-sm font-black text-black shadow-[0_10px_30px_rgba(250,204,21,0.12)] hover:bg-[#e8c65a] sm:w-auto sm:px-6" disabled={registering} onClick={()=>void registerStore()}>{registering?"Enviando...":"Enviar loja para aprovação"}</Button>
              </div>
            </section>}

            {approvedStores.map((store)=><section id="minha-loja" key={store.id} className="space-y-4">
              {activeTab==="loja" && <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-lg font-black">{store.name}</h2><p className="text-xs text-zinc-500">Cadastro: {store.status}</p></div>
                  <Settings2 className="h-5 w-5 text-[#e5c66c]"/>
                </div>
                {store.status==="approved"&&store.accepted_terms_version!==store.terms_version&&<div className="mt-4 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4"><p className="font-semibold text-yellow-200">Condições atualizadas</p><p className="mt-1 text-xs text-zinc-400">Aceite a versão {store.terms_version} para reabrir a operação.</p><Button className="mt-3 bg-[#d4af37] font-bold text-black hover:bg-[#e8c65a]" disabled={saving==="terms-"+store.id} onClick={()=>void acceptTerms(store)}>Aceitar condições</Button></div>}
                <div className="mt-4 space-y-4">
                  <section className={`rounded-2xl border p-4 transition-colors ${store.is_open ? "border-amber-400/40 bg-[#1d1d21]" : "border-white/10 bg-[#18181b]"}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Status operacional <span className={`ml-2 rounded px-2 py-1 text-[10px] ${store.is_open ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{store.is_open ? "RECEBENDO PEDIDOS" : "PAUSADO"}</span></p>
                        <h3 className="mt-2 text-xl font-bold text-white">{store.is_open ? "Loja Aberta" : "Loja Fechada"}</h3>
                        <p className="mt-1 max-w-xs text-xs text-zinc-400">Ative para receber pedidos. É necessário ter estoque disponível e condições aceitas.</p>
                      </div>
                      <Switch aria-label="Abrir ou fechar loja" disabled={store.status!=="approved"} checked={store.is_open} onCheckedChange={(checked)=>setStores(prev=>prev.map(s=>s.id===store.id?{...s,is_open:checked}:s))}/>
                    </div>
                  </section>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-[#18181b] p-3">
                      <Label className="text-xs text-zinc-300">Entrega</Label>
                      <p className="mb-2 mt-1 text-[11px] text-zinc-500">Modalidade</p>
                      <Select value={store.delivery_mode} onValueChange={(value:Store["delivery_mode"])=>setStores(prev=>prev.map(s=>s.id===store.id?{...s,delivery_mode:value,own_driver_available:value==="third_party"?false:s.own_driver_available}:s))}>
                        <SelectTrigger className="h-9 border-white/10 bg-[#121214] text-xs"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="hybrid">Híbrido</SelectItem><SelectItem value="own">Própria</SelectItem><SelectItem value="third_party">Terceirizada</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#18181b] p-3">
                      <Label className="text-xs text-zinc-300">Entregador</Label>
                      <div className="mt-5 flex items-center justify-between gap-2">
                        <div><p className="text-xs font-semibold text-white">{store.own_driver_available ? "Ativo" : "Inativo"}</p><p className="text-[10px] text-zinc-500">Frota interna</p></div>
                        <Switch aria-label="Entregador disponível" disabled={store.delivery_mode==="third_party"} checked={store.own_driver_available} onCheckedChange={(checked)=>setStores(prev=>prev.map(s=>s.id===store.id?{...s,own_driver_available:checked}:s))}/>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#18181b] p-3">
                      <p className="text-xs font-semibold text-zinc-300">Tempo médio</p>
                      <p className="mt-3 text-sm font-bold text-white">Após aceite</p>
                      <p className="mt-1 text-[10px] text-zinc-500">Prazo informado na cotação do pedido</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#18181b] p-3">
                      <p className="text-xs font-semibold text-zinc-300">Taxa de entrega</p>
                      <p className="mt-3 text-lg font-bold text-amber-300">R$ 7,50</p>
                      <p className="mt-1 text-[10px] text-zinc-500">Até 3 km; + R$ 1,50/km adicional</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button className="w-full rounded-full bg-[#facc15] font-bold text-[#121214] hover:bg-yellow-400" disabled={saving==="settings-"+store.id||saving===store.id||store.status!=="approved"} onClick={async()=>{await saveDelivery(store); await saveStoreSettings(store);}}>Confirmar alterações</Button>
                    <p className="text-center text-[11px] text-zinc-500">Salva a operação e a abertura da loja no Supabase.</p>
                  </div>
                </div>
              </div>
              </>}

              {activeTab==="estoque" && <div id="estoque" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-lg font-black">Meu estoque</h2><p className="text-xs text-zinc-500">Disponível = físico menos reservado.</p></div>
                  <div className="flex items-center gap-2"><div className="flex rounded-lg border border-white/10 bg-black/20 p-1"><Button type="button" size="sm" variant="ghost" onClick={()=>setStockView("grid")} className={stockView==="grid"?"bg-[#d4af37]/15 text-yellow-200":"text-zinc-400"}><Grid2X2 className="h-4 w-4"/>Grade</Button><Button type="button" size="sm" variant="ghost" onClick={()=>setStockView("list")} className={stockView==="list"?"bg-[#d4af37]/15 text-yellow-200":"text-zinc-400"}><List className="h-4 w-4"/>Lista</Button></div><Boxes className="h-5 w-5 text-[#e5c66c]"/></div>
                </div>
                <Suspense fallback={<div className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-zinc-500">Carregando reposição...</div>}><PartnerRestockRequest storeId={store.id} products={catalogProducts}/></Suspense>
                {catalogProducts.length===0?<p className="mt-3 text-sm text-zinc-500">Nenhum produto ativo no catálogo.</p>:<div className={stockView==="grid"?"mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3":"mt-4 space-y-2"}>
                  {catalogProducts.map((p)=>{const i=inventory.find((x)=>x.store_id===store.id&&x.product_id===p.id)??{store_id:store.id,product_id:p.id,on_hand:0,reserved:0,name:p.name};const key=i.store_id+":"+i.product_id;return <div key={key} className={`rounded-2xl border border-white/10 bg-black/20 p-3 ${stockView==="list"?"md:flex md:items-center md:justify-between md:gap-4":""}`}>
                    <div className="flex items-start gap-3">
                      <div className={`relative shrink-0 overflow-hidden rounded-xl border border-[#d4af37]/15 bg-white/[0.04] ${stockView==="grid"?"h-24 w-24":"h-16 w-16"}`}>
                        <Package className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-zinc-600"/>
                        {p.image_url&&<img src={p.image_url} alt={p.name} loading="lazy" className="relative h-full w-full object-cover" onError={(e)=>{e.currentTarget.style.display="none";}}/>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold">{i.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">Físico {i.on_hand} · reservado {i.reserved}</p>
                        <p className="mt-1 text-xs font-semibold text-[#e5c66c]">Disponível {i.on_hand-i.reserved}</p>
                      </div>
                    </div>
                    <div className={`mt-3 grid gap-2 ${stockView==="list"?"md:mt-0 md:min-w-[360px] md:grid-cols-[100px_1fr_auto]":""}`}>
                      <input className="h-9 rounded-lg border border-white/10 bg-black/30 px-2" type="number" min="0" step="1" placeholder={String(i.on_hand)} value={stockDraft[key]??""} onChange={(e)=>setStockDraft((x)=>({...x,[key]:e.target.value}))}/>
                      <Button size="sm" variant="outline" className="border-[#d4af37]/25 bg-[#d4af37]/5 text-yellow-200 hover:bg-[#d4af37]/10" disabled={saving==="stock-"+key} onClick={()=>void saveStock(i.store_id,i.product_id,i.on_hand)}>Atualizar estoque</Button>
                    </div>
                  </div>})}
                </div>}
              </div>}

              {activeTab==="repasses" && <div id="repasses" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Minha carteira</h2><p className="text-xs text-zinc-500">Cada entrega concluída acumula crédito. Os pagamentos via PIX baixam apenas o valor efetivamente pago.</p></div><WalletCards className="h-5 w-5 text-[#e5c66c]"/></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl border border-[#d4af37]/25 bg-[#d4af37]/5 p-3"><p className="text-xs text-zinc-500">Saldo disponível</p><p className="mt-1 text-xl font-black text-[#e5c66c]">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(waitingPayout)}</p><p className="mt-1 text-[11px] text-zinc-500">Acumula até o próximo PIX.</p></div><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-xs text-zinc-500">Total já pago</p><p className="mt-1 text-xl font-black">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(paidPayout)}</p><p className="mt-1 text-[11px] text-zinc-500">Baixas registradas com data, hora e comprovante.</p></div></div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <Select value={pix[store.id]?.pix_key_type??"cnpj"} onValueChange={(v)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key:"",holder_name:"",holder_document:""}),pix_key_type:v}}))}><SelectTrigger className="border-white/10 bg-black/20"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="random">Aleatória</SelectItem></SelectContent></Select>
                  <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" placeholder="Chave PIX" value={pix[store.id]?.pix_key??""} onChange={(e)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",holder_name:"",holder_document:""}),pix_key:e.target.value}}))}/>
                  <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" placeholder="Nome do titular" value={pix[store.id]?.holder_name??""} onChange={(e)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",pix_key:"",holder_document:""}),holder_name:e.target.value}}))}/>
                  <input className="h-10 rounded-lg border border-white/10 bg-black/20 px-3" placeholder="CPF/CNPJ do titular" value={pix[store.id]?.holder_document??""} onChange={(e)=>setPix((x)=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",pix_key:"",holder_name:""}),holder_document:e.target.value}}))}/>
                </div>
                <Button variant="outline" className="mt-3 border-white/15 bg-transparent" disabled={saving==="pix-"+store.id} onClick={()=>void savePix(store.id)}>Salvar conta PIX</Button>
              </div>}
            </section>)}

            {hasApprovedStore&&activeTab==="repasses"&&<section className="space-y-3">
              <h2 className="text-lg font-black">Histórico da carteira</h2>
              {walletPayments.length===0&&<div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 text-sm text-zinc-500">Nenhum PIX registrado ainda. O saldo continuará acumulando.</div>}
              {walletPayments.map((payment)=><div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-4"><div><p className="font-bold text-emerald-300">PIX recebido · {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(payment.amount))}</p><p className="text-xs text-zinc-500">{new Date(payment.paid_at).toLocaleString("pt-BR")}{payment.receipt_reference?` · ${payment.receipt_reference}`:""}</p></div><a href={payment.receipt_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#e5c66c] underline">Ver comprovante</a></div>)}
              {payouts.some((p)=>Math.max(0,Number(p.amount)-Number(p.paid_amount||0))>0)&&<div className="rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 text-sm text-yellow-100">Créditos ainda não pagos permanecem na carteira e entram automaticamente no saldo disponível.</div>}
            </section>}

            {(!hasApprovedStore || activeTab==="loja") && <div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 text-sm text-yellow-200">
              A entrega só é liberada depois que o pagamento do cliente é confirmado pela plataforma.
            </div>}
          </div>
        </div>
      </div>

      <nav className={`fixed inset-x-0 bottom-0 z-30 grid ${hasApprovedStore?"grid-cols-6":"grid-cols-2"} border-t border-[#d4af37]/20 bg-[#090b0c]/95 px-2 py-2.5 shadow-[0_-12px_35px_rgba(0,0,0,0.45)] backdrop-blur md:hidden`}>
        {hasApprovedStore ? <>
          <button type="button" onClick={()=>switchTab("inicio")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="inicio"?"text-[#e5c66c]":"text-zinc-400"}`}><MapPin className="h-5 w-5"/><span>Mapa</span></button>
          <button type="button" onClick={()=>switchTab("pedidos")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="pedidos"?"text-[#e5c66c]":"text-zinc-400"}`}><Package className="h-5 w-5"/><span>Pedidos</span></button>
          <button type="button" onClick={()=>navigate("/")} className="mx-1 flex flex-col items-center gap-1 rounded-xl bg-[#d4af37] px-2 py-1 text-[10px] font-black text-black hover:bg-[#e8c65a]" aria-label="Voltar para a Home"><Home className="h-5 w-5"/><span>Home</span></button>
          <button type="button" onClick={()=>switchTab("estoque")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="estoque"?"text-[#e5c66c]":"text-zinc-400"}`}><Boxes className="h-5 w-5"/><span>Estoque</span></button>
          <button type="button" onClick={()=>switchTab("repasses")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="repasses"?"text-[#e5c66c]":"text-zinc-400"}`}><WalletCards className="h-5 w-5"/><span>Repasses</span></button>
          <button type="button" onClick={()=>switchTab("loja")} className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${activeTab==="loja"?"text-[#e5c66c]":"text-zinc-400"}`}><StoreIcon className="h-5 w-5"/><span>Loja</span></button>
        </> : <>
          <span className="flex flex-col items-center gap-1 py-1 text-[10px] text-[#e5c66c]"><StoreIcon className="h-5 w-5"/><span>Cadastro</span></span>
          <button type="button" onClick={()=>navigate("/")} className="mx-1 flex flex-col items-center gap-1 rounded-xl bg-[#d4af37] px-2 py-1 text-[10px] font-black text-black hover:bg-[#e8c65a]" aria-label="Voltar para a Home"><Home className="h-5 w-5"/><span>Home</span></button>
        </>}
      </nav>
    </main>
    </div>
  );
}
