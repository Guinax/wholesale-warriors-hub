import { useCallback, useEffect, useState } from "react";
import { Bike, CheckCircle2, RefreshCw, ShieldAlert, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Courier = { id:string; courier_code:string; full_name:string; phone:string; cpf:string|null; vehicle_type:string; vehicle_plate:string|null; cnh_number:string|null; cnh_category:string|null; cnh_expiry:string|null; status:"pending"|"approved"|"suspended"; is_online:boolean; created_at:string };
type CourierLocation = { courier_id:string; lat:number; lng:number; accuracy_m:number|null; updated_at:string };

export default function CouriersManager() {
  const [rows,setRows]=useState<Courier[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState<string|null>(null);
  const [locations,setLocations]=useState<Record<string,CourierLocation>>({});

  const load=useCallback(async()=>{
    setLoading(true);
    const [profilesResult, locationsResult]=await Promise.all([
      supabase.from("courier_profiles" as never)
        .select("id,courier_code,full_name,phone,cpf,vehicle_type,vehicle_plate,cnh_number,cnh_category,cnh_expiry,status,is_online,created_at")
        .order("created_at",{ascending:false}),
      supabase.from("courier_locations" as never)
        .select("courier_id,lat,lng,accuracy_m,updated_at"),
    ]);
    setLoading(false);
    if(profilesResult.error) return toast.error(profilesResult.error.message);
    setRows((profilesResult.data??[]) as unknown as Courier[]);
    if(!locationsResult.error){
      const next=Object.fromEntries(((locationsResult.data??[]) as unknown as CourierLocation[]).map((location)=>[location.courier_id,location]));
      setLocations(next);
    }
  },[]);

  useEffect(()=>{
    void load();
    const channel=supabase
      .channel("admin-courier-profiles")
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_profiles"},()=>{void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_locations"},()=>{void load();})
      .subscribe();
    const interval=window.setInterval(()=>{void load();},15000);
    return ()=>{
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  },[load]);

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
        <p className="mt-1 text-xs text-muted-foreground">{c.phone} · {c.vehicle_type}{c.vehicle_plate?" · "+c.vehicle_plate:""}</p>
        <div className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs sm:grid-cols-2">
          <p><span className="text-muted-foreground">CPF:</span> <strong>{c.cpf || "Não informado"}</strong></p>
          <p><span className="text-muted-foreground">Veículo:</span> <strong>{c.vehicle_type}{c.vehicle_plate ? " · " + c.vehicle_plate : ""}</strong></p>
          {c.vehicle_type!=="bike" && <>
            <p><span className="text-muted-foreground">CNH:</span> <strong>{c.cnh_number || "Não informada"}</strong></p>
            <p><span className="text-muted-foreground">Categoria:</span> <strong>{c.cnh_category || "—"}</strong></p>
            <p><span className="text-muted-foreground">Validade:</span> <strong>{c.cnh_expiry ? new Date(c.cnh_expiry+"T12:00:00").toLocaleDateString("pt-BR") : "—"}</strong></p>
          </>}
        </div>
        {locations[c.id] && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <a
            href={`https://www.google.com/maps?q=${locations[c.id].lat},${locations[c.id].lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-primary underline"
          >
            <MapPin className="h-3.5 w-3.5" /> Ver localização operacional
          </a>
          <span className="text-muted-foreground">Atualizada {new Date(locations[c.id].updated_at).toLocaleString("pt-BR")}</span>
        </div>}</div>
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