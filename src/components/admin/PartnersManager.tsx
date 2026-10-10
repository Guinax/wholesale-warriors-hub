import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Clock3, MapPinned, RefreshCw, Store as StoreIcon, XCircle } from "lucide-react";
import PartnerNetworkMap from "@/components/admin/PartnerNetworkMap";

type Store={
  id:string;
  name:string;
  document:string;
  phone:string;
  address:string;
  zip:string|null;
  city:string|null;
  state:string|null;
  status:string;
  is_open:boolean;
  lat:number|null;
  lng:number|null;
  commission_bps:number;
  fee_bps:number;
  terms_version:number;
  accepted_terms_version:number;
  delivery_mode:string;
  own_driver_available:boolean;
  created_at?:string;
  last_seen_at?:string|null;
};
type Inv={store_id:string;on_hand:number;reserved:number};
type Dashboard={stores?:Store[];inventory?:Inv[]};

export default function PartnersManager(){
  const [stores,setStores]=useState<Store[]>([]);
  const [inv,setInv]=useState<Inv[]>([]);
  const [saving,setSaving]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [selectedStoreId,setSelectedStoreId]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    const {data,error}=await supabase.rpc("partner_command" as never,{p_action:"dashboard",p_payload:{}} as never);
    setLoading(false);
    if(error){
      toast.error("Não foi possível carregar os parceiros.",{description:error.message});
      return;
    }
    const dashboard=(data??{}) as unknown as Dashboard;
    setStores(dashboard.stores??[]);
    setInv(dashboard.inventory??[]);
  },[]);

  useEffect(()=>{
    void load();
    const channel=supabase
      .channel("admin-partner-approvals")
      .on("postgres_changes",{event:"*",schema:"public",table:"partner_stores"},()=>void load())
      .on("postgres_changes",{event:"*",schema:"public",table:"partner_inventory"},()=>void load())
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[load]);

  const save=async(s:Store,statusOverride?:string)=>{
    const nextStatus=statusOverride??s.status;
    if(s.commission_bps<0||s.commission_bps>10000||s.fee_bps<0||s.fee_bps>10000||s.commission_bps+s.fee_bps>10000){
      toast.error("Comissão e taxa precisam somar no máximo 100%.");
      return;
    }
    setSaving(s.id);
    const {error}=await supabase.rpc("partner_command" as never,{
      p_action:"admin_store",
      p_payload:{store_id:s.id,status:nextStatus,commission_bps:s.commission_bps,fee_bps:s.fee_bps}
    } as never);
    setSaving(null);
    if(error){
      toast.error(error.message);
      return;
    }
    setStores(current=>current.map(store=>store.id===s.id?{...store,status:nextStatus}:store));
    toast.success(
      nextStatus==="approved"
        ?"Parceiro aprovado com sucesso."
        :nextStatus==="rejected"
          ?"Cadastro marcado como reprovado."
          :"Cadastro do parceiro atualizado."
    );
    await load();
  };

  const orderedStores=useMemo(()=>[...stores].sort((a,b)=>{
    const rank=(status:string)=>status==="pending"?0:status==="approved"?1:status==="rejected"?2:3;
    const diff=rank(a.status)-rank(b.status);
    if(diff!==0)return diff;
    return new Date(b.created_at??0).getTime()-new Date(a.created_at??0).getTime();
  }),[stores]);

  const pendingCount=stores.filter(s=>s.status==="pending").length;
  const approvedCount=stores.filter(s=>s.status==="approved").length;
  const rejectedCount=stores.filter(s=>s.status==="rejected").length;
  const mappedCount=stores.filter(s=>Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng))&&Number(s.lat)>=-90&&Number(s.lat)<=90&&Number(s.lng)>=-180&&Number(s.lng)<=180).length;
  const unmappedCount=stores.length-mappedCount;

  const selectStoreFromMap=(id:string)=>{
    setSelectedStoreId(id);
    window.setTimeout(()=>document.getElementById(`partner-store-${id}`)?.scrollIntoView({behavior:"smooth",block:"center"}),50);
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Parceiros</h2>
        <p className="text-sm text-muted-foreground">Cadastros recebidos aparecem aqui para análise e liberação. Aprovar não abre a loja automaticamente.</p>
      </div>
      <Button variant="outline" size="sm" onClick={()=>void load()} disabled={loading}>
        <RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>
        Atualizar
      </Button>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300"><Clock3 className="w-4 h-4"/><span className="text-xs font-semibold">Em análise</span></div>
        <p className="mt-1 text-2xl font-black">{pendingCount}</p>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4"/><span className="text-xs font-semibold">Aprovados</span></div>
        <p className="mt-1 text-2xl font-black">{approvedCount}</p>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground"><StoreIcon className="w-4 h-4"/><span className="text-xs font-semibold">Total de parceiros</span></div>
        <p className="mt-1 text-2xl font-black">{stores.length}</p>
      </Card>
    </div>

    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MapPinned className="h-5 w-5 text-emerald-600"/>
              <CardTitle className="text-lg">Mapa da rede de parceiros</CardTitle>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Visão exclusiva do administrador. As lojas cadastradas são atualizadas em tempo real no mapa.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{stores.length} cadastrada(s)</Badge>
            <Badge variant="outline">{mappedCount} no mapa</Badge>
            {unmappedCount>0&&<Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">{unmappedCount} sem localização</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-4">
        <PartnerNetworkMap stores={stores} selectedId={selectedStoreId} onSelect={selectStoreFromMap}/>
      </CardContent>
    </Card>

    {orderedStores.length===0
      ?<Card className="p-8 text-center text-sm text-muted-foreground">{loading?"Carregando parceiros...":"Nenhum parceiro cadastrado."}</Card>
      :orderedStores.map(s=>{
        const rows=inv.filter(i=>i.store_id===s.id);
        const available=rows.reduce((n,i)=>n+Math.max(0,Number(i.on_hand)-Number(i.reserved)),0);
        const termsOk=s.accepted_terms_version===s.terms_version;
        const pending=s.status==="pending";
        const approved=s.status==="approved";
        const rejected=s.status==="rejected";
        const suspended=s.status==="suspended";
        const statusLabel=pending?"Pendente":approved?"Aprovado":rejected?"Reprovado":suspended?"Suspenso":s.status;
        const statusClass=approved
          ?"border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          :rejected
            ?"border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
            :suspended
              ?"border-slate-500/40 bg-slate-500/15 text-slate-700 dark:text-slate-300"
              :"border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
        return <Card id={`partner-store-${s.id}`} key={s.id} className={selectedStoreId===s.id?"ring-2 ring-emerald-500/50":pending?"border-amber-400/50 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]":approved?"border-emerald-500/30":""}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{s.name}</CardTitle>
                {pending&&<p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">Aguardando sua liberação</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={statusClass}>{statusLabel}</Badge>
                <Badge
                  variant="outline"
                  className={termsOk
                    ?"border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    :"border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"}
                >
                  {termsOk?"Termos aceitos":"Termos aguardando aceite"}
                </Badge>
                <Badge variant={available>0?"secondary":"outline"}>{available} un. disponíveis</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p><strong>CNPJ:</strong> {s.document}</p>
              <p><strong>Contato:</strong> {s.phone}</p>
              <p className="md:col-span-2"><strong>Endereço:</strong> {s.address} · {s.city}/{s.state} · {s.zip}</p>
              <p><strong>Entrega:</strong> {s.delivery_mode}{s.own_driver_available?" · próprio disponível":""}</p>
              <p><strong>Operação:</strong> {s.is_open?"aberta":"fechada"}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Status</Label>
                <Select value={s.status} onValueChange={v=>setStores(x=>x.map(y=>y.id===s.id?{...y,status:v}:y))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Reprovado</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input type="number" min="0" max="100" step="0.01" value={s.commission_bps/100} onChange={e=>setStores(x=>x.map(y=>y.id===s.id?{...y,commission_bps:Math.round(Number(e.target.value)*100)}:y))}/>
              </div>
              <div>
                <Label>Taxa plataforma (%)</Label>
                <Input type="number" min="0" max="100" step="0.01" value={s.fee_bps/100} onChange={e=>setStores(x=>x.map(y=>y.id===s.id?{...y,fee_bps:Math.round(Number(e.target.value)*100)}:y))}/>
              </div>
            </div>

            {pending?<div className="flex flex-col gap-2 sm:flex-row">
              <Button className="font-bold" disabled={saving===s.id} onClick={()=>void save(s,"approved")}>
                <CheckCircle2 className="w-4 h-4"/>
                {saving===s.id?"Salvando...":"Aprovar parceiro"}
              </Button>
              <Button variant="outline" disabled={saving===s.id} onClick={()=>void save(s,"rejected")}>
                <XCircle className="w-4 h-4"/>
                Reprovar
              </Button>
            </div>:<Button disabled={saving===s.id} onClick={()=>void save(s)}>
              {saving===s.id?"Salvando...":"Salvar status e condições"}
            </Button>}
          </CardContent>
        </Card>;
      })}

    {rejectedCount>0&&<p className="text-xs text-muted-foreground">{rejectedCount} cadastro(s) reprovado(s) permanecem no histórico para conferência.</p>}
  </div>;
}
