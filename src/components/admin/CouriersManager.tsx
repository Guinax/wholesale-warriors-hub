import { useCallback, useEffect, useState } from "react";
import { Bike, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Courier = { id:string; courier_code:string; full_name:string; phone:string; vehicle_type:string; vehicle_plate:string|null; status:"pending"|"approved"|"suspended"; is_online:boolean; created_at:string };

export default function CouriersManager() {
  const [rows,setRows]=useState<Courier[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    const {data,error}=await supabase.from("courier_profiles" as never)
      .select("id,courier_code,full_name,phone,vehicle_type,vehicle_plate,status,is_online,created_at")
      .order("created_at",{ascending:false});
    setLoading(false);
    if(error) return toast.error(error.message);
    setRows((data??[]) as unknown as Courier[]);
  },[]);

  useEffect(()=>{void load();},[load]);

  const setStatus=async(c:Courier,status:Courier["status"])=>{
    setSaving(c.id);
    const {error}=await supabase.rpc("courier_command" as never,{p_action:"admin_status",p_payload:{courier_id:c.id,status}} as never);
    setSaving(null);
    if(error) return toast.error(error.message);
    toast.success(status==="approved"?"Entregador aprovado.":status==="suspended"?"Entregador suspenso.":"Cadastro voltou para análise.");
    await load();
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">Entregadores</h2><p className="text-sm text-muted-foreground">Aprove cadastros e acompanhe quem está disponível na rede.</p></div>
      <Button variant="outline" size="icon" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?"h-4 w-4 animate-spin":"h-4 w-4"}/></Button>
    </div>
    {rows.length===0&&!loading&&<Card className="p-8 text-center text-sm text-muted-foreground">Nenhum entregador cadastrado ainda.</Card>}
    <div className="grid gap-3">{rows.map(c=><Card key={c.id} className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><Bike className="h-4 w-4 text-primary"/><strong>{c.full_name}</strong><Badge variant="outline">{c.courier_code}</Badge></div>
        <p className="mt-1 text-xs text-muted-foreground">{c.phone} · {c.vehicle_type}{c.vehicle_plate?" · "+c.vehicle_plate:""}</p></div>
        <div className="flex items-center gap-2"><Badge variant={c.status==="approved"?"default":c.status==="suspended"?"destructive":"secondary"}>{c.status==="approved"?"Aprovado":c.status==="suspended"?"Suspenso":"Em análise"}</Badge>{c.status==="approved"&&<Badge variant="outline">{c.is_online?"Online":"Offline"}</Badge>}</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {c.status!=="approved"&&<Button disabled={saving===c.id} onClick={()=>void setStatus(c,"approved")}><CheckCircle2 className="h-4 w-4"/> Aprovar</Button>}
        {c.status!=="suspended"&&<Button disabled={saving===c.id} variant="destructive" onClick={()=>void setStatus(c,"suspended")}><ShieldAlert className="h-4 w-4"/> Suspender</Button>}
        {c.status==="suspended"&&<Button disabled={saving===c.id} variant="outline" onClick={()=>void setStatus(c,"pending")}>Voltar para análise</Button>}
      </div>
    </Card>)}</div>
  </div>;
}