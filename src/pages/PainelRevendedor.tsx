import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { lookupCep, maskCepValue, onlyDigitsCep } from "@/lib/shipping";

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
};

type InventoryItem = { store_id:string; product_id:string; on_hand:number; reserved:number; name:string };
type CatalogProduct = { id:string; name:string };

export default function PainelRevendedor() {
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

  const load = async () => {
    const { data, error } = await supabase
      .from("partner_stores" as never)
      .select("id,name,status,is_open,delivery_mode,own_driver_available,delivery_base,delivery_per_km,delivery_per_kg")
      .order("created_at", { ascending: false });
    if (error) return toast.error("Não foi possível carregar suas lojas.");
    const loadedStores=(data ?? []) as unknown as Store[];
    setStores(loadedStores);
    const {data:catalog}=await supabase.from("products").select("id,name").eq("active",true).order("name");
    setCatalogProducts((catalog??[]) as CatalogProduct[]);
    if (loadedStores.length) {
      const { data: accounts } = await supabase.from("partner_payout_accounts" as never).select("store_id,pix_key_type,pix_key,holder_name,holder_document");
      const mapped: typeof pix = {};
      ((accounts ?? []) as unknown as Array<{store_id:string;pix_key_type:string;pix_key:string;holder_name:string;holder_document:string}>).forEach(a=>{ mapped[a.store_id]={pix_key_type:a.pix_key_type,pix_key:a.pix_key,holder_name:a.holder_name,holder_document:a.holder_document}; });
      setPix(mapped);
      const { data: payoutRows } = await supabase.from("partner_payouts" as never).select("id,store_id,amount,status,approved_at,paid_at,receipt_reference").order("paid_at",{ascending:false,nullsFirst:true});
      setPayouts((payoutRows ?? []) as unknown as Payout[]);
    }
    const { data: dashboard, error: dashboardError } = await supabase.rpc("partner_command" as never, { p_action: "dashboard", p_payload: {} } as never);
    if (!dashboardError && dashboard) {
      const d = dashboard as unknown as { offers?: Offer[]; requests?: Request[]; inventory?: InventoryItem[] };
      setOffers(d.offers ?? []);
      setRequests(d.requests ?? []);
      setInventory(d.inventory ?? []);
    }
  };

  useEffect(() => { void load(); }, []);

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
    const { error } = await supabase.rpc("partner_command" as never, { p_action:"register", p_payload:{ ...newStore, document, cep:onlyDigitsCep(newStore.cep), lat, lng, radius_km:radius, terms:true } } as never);
    setRegistering(false);
    if (error) return toast.error(error.message);
    toast.success("Loja enviada para aprovação.");
    setNewStore({ name:"", document:"", phone:"", cep:"", address:"", city:"", state:"", lat:"", lng:"", radius_km:"15", terms:false });
    await load();
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Operação do revendedor</h1>
          <p className="text-muted-foreground">Controle como cada loja atende as entregas locais.</p>
        </div>
        {offers.length > 0 && <section className="space-y-3">
          <h2 className="text-xl font-semibold">Novas entregas na sua região</h2>
          {offers.map((offer) => <Card key={offer.id}><CardContent className="py-5 space-y-3">
            <div className="flex flex-wrap justify-between gap-2"><strong>{offer.city}</strong><span>{Number(offer.distance_km).toFixed(1)} km</span></div>
            <p className="text-sm text-muted-foreground">{offer.items.map((i) => `${i.qty}x ${i.name}`).join(" • ")}</p>
            <div className="flex gap-2"><Button onClick={() => void command("accept", { request_id: offer.id }, "Pedido aceito. Informe a rota para calcular a entrega.")}>Aceitar</Button>
            <Button variant="outline" onClick={() => void command("decline", { request_id: offer.id }, "Oferta recusada.")}>Recusar</Button></div>
          </CardContent></Card>)}
        </section>}

        {requests.filter((r) => ["accepted","quoted","paid","delivering"].includes(r.status)).length > 0 && <section className="space-y-3">
          <h2 className="text-xl font-semibold">Pedidos em operação</h2>
          {requests.filter((r) => ["accepted","quoted","paid","delivering"].includes(r.status)).map((r) => <Card key={r.id}><CardContent className="py-5 space-y-4">
            <div className="flex flex-wrap justify-between gap-2"><strong>{r.store_name ?? "Loja"}</strong><span>{r.order_code ?? r.status}</span></div>
            <p className="text-sm">{r.items?.map((i) => `${i.qty}x ${i.name}`).join(" • ")}</p>
            {r.status === "accepted" && <div className="grid gap-2 md:grid-cols-4">
              <input className="h-10 rounded-md border bg-background px-3" placeholder="Rota km" inputMode="decimal" value={routeKm[r.id] ?? ""} onChange={(e) => setRouteKm((x) => ({...x,[r.id]:e.target.value}))} />
              <input className="h-10 rounded-md border bg-background px-3" placeholder="Peso kg" inputMode="decimal" value={weightKg[r.id] ?? ""} onChange={(e) => setWeightKg((x) => ({...x,[r.id]:e.target.value}))} />
              <input className="h-10 rounded-md border bg-background px-3" placeholder="Prazo min" inputMode="numeric" value={eta[r.id] ?? ""} onChange={(e) => setEta((x) => ({...x,[r.id]:e.target.value}))} />
              <Button onClick={() => void command("quote", { request_id:r.id, route_km:Number(routeKm[r.id]), weight_kg:Number(weightKg[r.id]), eta_minutes:Number(eta[r.id]) }, "Frete calculado e enviado ao cliente.")}>Calcular entrega</Button>
            </div>}
            {r.status === "quoted" && <p className="font-medium">Frete calculado: R$ {Number(r.shipping ?? 0).toFixed(2).replace(".", ",")} • aguardando cliente/pagamento</p>}
            {r.status === "paid" && <Button onClick={() => void command("dispatch", { request_id:r.id }, "Pedido saiu para entrega.")}>Saiu para entrega</Button>}
            {r.status === "delivering" && <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Confirme presencialmente a maioridade do recebedor e peça o código de entrega exibido ao cliente.</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={adultVerified[r.id] ?? false} onChange={(e) => setAdultVerified((x) => ({...x,[r.id]:e.target.checked}))} />
                <span>Confirmo que conferi presencialmente documento oficial com foto e que o recebedor tem 18 anos ou mais.</span>
              </label>
              <div className="flex gap-2">
                <input className="h-10 flex-1 rounded-md border bg-background px-3 uppercase" placeholder="Código do cliente" maxLength={8} value={deliveryCode[r.id] ?? ""} onChange={(e) => setDeliveryCode((x) => ({...x,[r.id]:e.target.value.toUpperCase()}))} />
                <Button disabled={(deliveryCode[r.id] ?? "").length < 4 || !(adultVerified[r.id] ?? false) || saving === r.id} onClick={() => void command("deliver", { request_id:r.id, code:deliveryCode[r.id], adult_verified:adultVerified[r.id] === true }, "Entrega confirmada e estoque baixado.")}>Confirmar entrega</Button>
              </div>
            </div>}
          </CardContent></Card>)}
        </section>}

        {stores.length === 0 && <Card>
          <CardHeader><CardTitle>Ativar operação como revendedor</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <input className="h-10 rounded-md border bg-background px-3" placeholder="Nome da loja" value={newStore.name} onChange={(e)=>setNewStore({...newStore,name:e.target.value})}/>
            <input className="h-10 rounded-md border bg-background px-3" placeholder="CNPJ" inputMode="numeric" value={newStore.document} onChange={(e)=>setNewStore({...newStore,document:e.target.value})}/>
            <input className="h-10 rounded-md border bg-background px-3" placeholder="Telefone / WhatsApp" value={newStore.phone} onChange={(e)=>setNewStore({...newStore,phone:e.target.value})}/>
            <div className="flex gap-2"><input className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3" placeholder="CEP da loja" inputMode="numeric" value={newStore.cep} onChange={(e)=>setNewStore({...newStore,cep:maskCepValue(e.target.value),lat:"",lng:""})}/><Button type="button" variant="outline" disabled={locatingStore} onClick={()=>void locateStore()}>{locatingStore?"Localizando...":"Buscar CEP"}</Button></div>
            <input className="h-10 rounded-md border bg-background px-3" placeholder="Endereço da loja" value={newStore.address} onChange={(e)=>setNewStore({...newStore,address:e.target.value})}/>
            <input className="h-10 rounded-md border bg-muted px-3" aria-label="Cidade e estado" readOnly value={[newStore.city,newStore.state].filter(Boolean).join(" / ")} placeholder="Cidade / UF (automático)"/>
            <div className="space-y-1"><Label>Raio de atendimento (km)</Label><input className="h-10 w-full rounded-md border bg-background px-3" inputMode="decimal" value={newStore.radius_km} onChange={(e)=>setNewStore({...newStore,radius_km:e.target.value})}/></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newStore.terms} onChange={(e)=>setNewStore({...newStore,terms:e.target.checked})}/> Aceito as condições da operação parceira.</label>
            <div className="md:col-span-2"><Button disabled={registering} onClick={()=>void registerStore()}>{registering ? "Enviando..." : "Enviar loja para aprovação"}</Button></div>
            <p className="md:col-span-2 text-xs text-muted-foreground">A loja só recebe pedidos depois da aprovação administrativa, aceite das condições vigentes, configuração de estoque e abertura da operação.</p>
          </CardContent>
        </Card>}
        {payouts.length > 0 && <section className="space-y-3">
          <h2 className="text-xl font-semibold">Meus repasses</h2>
          <p className="text-sm text-muted-foreground">Valores liberados somente após pagamento confirmado e entrega concluída.</p>
          {payouts.map((p) => <Card key={p.id}><CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
            <div><strong>R$ {Number(p.amount).toFixed(2).replace(".", ",")}</strong><p className="text-xs text-muted-foreground">{stores.find(s=>s.id===p.store_id)?.name ?? "Loja parceira"}</p></div>
            <div className="text-right"><span className="text-sm font-medium">{p.status==="eligible"?"Aguardando aprovação":p.status==="approved"?"Aprovado para pagamento":p.status==="paid"?"Pago":p.status==="cancelled"?"Cancelado":p.status}</span>{p.status==="paid"&&<p className="text-xs text-muted-foreground">{p.paid_at?new Date(p.paid_at).toLocaleString("pt-BR"):""}{p.receipt_reference?` • ${p.receipt_reference}`:""}</p>}</div>
          </CardContent></Card>)}
        </section>}

        {stores.map((store) => (
          <Card key={store.id}>
            <CardHeader><CardTitle>{store.name}</CardTitle></CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Modalidade de entrega</Label>
                <Select value={store.delivery_mode} onValueChange={(value: Store["delivery_mode"]) =>
                  setStores((prev) => prev.map((s) => s.id === store.id ? { ...s, delivery_mode: value, own_driver_available: value === "third_party" ? false : s.own_driver_available } : s))
                }>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Entregador próprio</SelectItem>
                    <SelectItem value="third_party">Entregador terceirizado</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div><Label>Motoqueiro disponível agora</Label><p className="text-sm text-muted-foreground">Prioriza entrega própria quando disponível.</p></div>
                <Switch disabled={store.delivery_mode === "third_party"} checked={store.own_driver_available}
                  onCheckedChange={(checked) => setStores((prev) => prev.map((s) => s.id === store.id ? { ...s, own_driver_available: checked } : s))} />
              </div>
              <div className="md:col-span-2 rounded-lg border p-4 space-y-3"><div className="flex items-center justify-between gap-3"><div><Label>Loja recebendo pedidos</Label><p className="text-xs text-muted-foreground">Só abra quando estoque e operação estiverem prontos.</p></div><Switch disabled={store.status!=="approved"} checked={store.is_open} onCheckedChange={(checked)=>setStores(prev=>prev.map(s=>s.id===store.id?{...s,is_open:checked}:s))}/></div><div className="grid gap-2 md:grid-cols-3"><input className="h-10 rounded-md border bg-background px-3" type="number" min="0" step="0.01" aria-label="Taxa base" value={store.delivery_base} onChange={e=>setStores(prev=>prev.map(s=>s.id===store.id?{...s,delivery_base:Number(e.target.value)}:s))}/><input className="h-10 rounded-md border bg-background px-3" type="number" min="0" step="0.01" aria-label="Valor por km" value={store.delivery_per_km} onChange={e=>setStores(prev=>prev.map(s=>s.id===store.id?{...s,delivery_per_km:Number(e.target.value)}:s))}/><input className="h-10 rounded-md border bg-background px-3" type="number" min="0" step="0.01" aria-label="Valor por kg" value={store.delivery_per_kg} onChange={e=>setStores(prev=>prev.map(s=>s.id===store.id?{...s,delivery_per_kg:Number(e.target.value)}:s))}/></div><Button variant="outline" disabled={saving==="settings-"+store.id||store.status!=="approved"} onClick={()=>void saveStoreSettings(store)}>{saving==="settings-"+store.id?"Salvando...":"Salvar abertura e tarifas"}</Button></div>
              <div className="md:col-span-2 rounded-lg border p-4 space-y-3"><div><Label>Estoque desta loja</Label><p className="text-xs text-muted-foreground">Disponível = físico menos reservado em pedidos.</p></div>{catalogProducts.length===0?<p className="text-sm text-muted-foreground">Nenhum produto ativo no catálogo.</p>:catalogProducts.map(p=>{const i=inventory.find(x=>x.store_id===store.id&&x.product_id===p.id)??{store_id:store.id,product_id:p.id,on_hand:0,reserved:0,name:p.name};const key=i.store_id+":"+i.product_id;return <div key={key} className="grid gap-2 border-t pt-3 md:grid-cols-[1fr_110px_1fr_auto] md:items-center"><div><strong className="text-sm">{i.name}</strong><p className="text-xs text-muted-foreground">Físico {i.on_hand} • reservado {i.reserved} • disponível {i.on_hand-i.reserved}</p></div><input className="h-9 rounded-md border bg-background px-2" type="number" min="0" step="1" placeholder={String(i.on_hand)} value={stockDraft[key]??""} onChange={e=>setStockDraft(x=>({...x,[key]:e.target.value}))}/><input className="h-9 rounded-md border bg-background px-2" placeholder="Motivo do ajuste" value={stockReason[key]??""} onChange={e=>setStockReason(x=>({...x,[key]:e.target.value}))}/><Button size="sm" variant="outline" disabled={saving==="stock-"+key} onClick={()=>void saveStock(i.store_id,i.product_id,i.on_hand)}>Atualizar</Button></div>})}</div>
              <div className="md:col-span-2 rounded-lg border p-4 space-y-3">
                <div><Label>Conta PIX para receber repasses</Label><p className="text-xs text-muted-foreground">O cliente paga à plataforma. Esta conta é usada somente para o repasse da sua loja.</p></div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Select value={pix[store.id]?.pix_key_type ?? "cnpj"} onValueChange={(v)=>setPix(x=>({...x,[store.id]:{...(x[store.id]??{pix_key:"",holder_name:"",holder_document:""}),pix_key_type:v}}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cpf">CPF</SelectItem><SelectItem value="cnpj">CNPJ</SelectItem><SelectItem value="email">E-mail</SelectItem><SelectItem value="phone">Telefone</SelectItem><SelectItem value="random">Aleatória</SelectItem></SelectContent></Select>
                  <input className="h-10 rounded-md border bg-background px-3" placeholder="Chave PIX" value={pix[store.id]?.pix_key ?? ""} onChange={e=>setPix(x=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",holder_name:"",holder_document:""}),pix_key:e.target.value}}))}/>
                  <input className="h-10 rounded-md border bg-background px-3" placeholder="Nome do titular" value={pix[store.id]?.holder_name ?? ""} onChange={e=>setPix(x=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",pix_key:"",holder_document:""}),holder_name:e.target.value}}))}/>
                  <input className="h-10 rounded-md border bg-background px-3" placeholder="CPF/CNPJ do titular" value={pix[store.id]?.holder_document ?? ""} onChange={e=>setPix(x=>({...x,[store.id]:{...(x[store.id]??{pix_key_type:"cnpj",pix_key:"",holder_name:""}),holder_document:e.target.value}}))}/>
                </div>
                <Button variant="outline" disabled={saving==="pix-"+store.id} onClick={()=>void savePix(store.id)}>{saving==="pix-"+store.id?"Salvando...":"Salvar conta PIX"}</Button>
              </div>
              <div className="md:col-span-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cadastro: {store.status}</span>
                <Button disabled={saving === store.id} onClick={() => void saveDelivery(store)}>
                  {saving === store.id ? "Salvando..." : "Salvar operação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
