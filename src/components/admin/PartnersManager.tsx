import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Clock3, RefreshCw, Store as StoreIcon, XCircle } from "lucide-react";

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
  commission_bps:number;
  fee_bps:number;
  terms_version:number;
  accepted_terms_version:number;
  delivery_mode:string;
  own_driver_available:boolean;
  created_at?:string;
};
type Inv={store_id:string;on_hand:number;reserved:number};
type Dashboard={stores?:Store[];inventory?:Inv[]};

export default function PartnersManager(){
  const [stores,setStores]=useState<Store[]>([]);
  const [inv,setInv]=useState<Inv[]>([]);
  const [saving,setSaving]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

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
    toast.success(
      nextStatus==="approved"
        ?"Parceiro aprovado. A operação continua fechada até o aceite das condições."
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

    {orderedStores.length===0
      ?<Card className="p-8 text-center text-sm text-muted-foreground">{loading?"Carregando parceiros...":"Nenhum parceiro cadastrado."}</Card>
      :orderedStores.map(s=>{
        const rows=inv.filter(i=>i.store_id===s.id);
        const available=rows.reduce((n,i)=>n+Math.max(0,Number(i.on_hand)-Number(i.reserved)),0);
        const termsOk=s.accepted_terms_version===s.terms_version;
        const pending=s.status==="pending";
        return <Card key={s.id} className={pending?"border-amber-400/50 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]":""}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">{s.name}</CardTitle>
                {pending&&<p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">Aguardando sua liberação</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={pending?"secondary":"outline"}>{s.status==="pending"?"Em análise":s.status==="approved"?"Aprovado":s.status==="rejected"?"Reprovado":s.status}</Badge>
                <Badge variant={termsOk?"secondary":"destructive"}>{termsOk?"Termos aceitos":"Aceite pendente"}</Badge>
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
