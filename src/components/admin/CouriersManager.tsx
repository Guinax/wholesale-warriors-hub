import { useCallback, useEffect, useState } from "react";
import { Bike, CheckCircle2, RefreshCw, ShieldAlert, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Courier = { id:string; courier_code:string; full_name:string; phone:string; cpf:string|null; vehicle_type:string; vehicle_plate:string|null; cnh_number:string|null; cnh_category:string|null; cnh_expiry:string|null; status:"pending"|"approved"|"suspended"; is_online:boolean; created_at:string };
type CourierLocation = { courier_id:string; lat:number; lng:number; accuracy_m:number|null; updated_at:string };
type CourierPayout = { id:string; courier_id:string; amount:number; status:"pending"|"paid"|"cancelled"; created_at:string; paid_at:string|null };

const documentsReady=(c:Courier)=>{
  if((c.cpf??"").replace(/\D/g,"").length!==11) return false;
  if(c.vehicle_type==="bike") return true;
  return (c.cnh_number??"").replace(/\D/g,"").length===11
    && Boolean(c.cnh_category)
    && Boolean(c.cnh_expiry)
    && Boolean(c.vehicle_plate);
};

export default function CouriersManager() {
  const [rows,setRows]=useState<Courier[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState<string|null>(null);
  const [locations,setLocations]=useState<Record<string,CourierLocation>>({});
  const [payouts,setPayouts]=useState<CourierPayout[]>([]);
  const [editing,setEditing]=useState<string|null>(null);
  const [drafts,setDrafts]=useState<Record<string,{cpf:string;vehicle_plate:string;cnh_number:string;cnh_category:string;cnh_expiry:string}>>({});

  const load=useCallback(async()=>{
    setLoading(true);
    const [profilesResult, locationsResult, payoutsResult]=await Promise.all([
      supabase.from("courier_profiles" as never)
        .select("id,courier_code,full_name,phone,cpf,vehicle_type,vehicle_plate,cnh_number,cnh_category,cnh_expiry,status,is_online,created_at")
        .order("created_at",{ascending:false}),
      supabase.from("courier_locations" as never)
        .select("courier_id,lat,lng,accuracy_m,updated_at"),
      supabase.from("courier_payouts" as never)
        .select("id,courier_id,amount,status,created_at,paid_at")
        .order("created_at",{ascending:false}),
    ]);
    setLoading(false);
    if(profilesResult.error) return toast.error(profilesResult.error.message);
    setRows((profilesResult.data??[]) as unknown as Courier[]);
    if(!locationsResult.error){
      const next=Object.fromEntries(((locationsResult.data??[]) as unknown as CourierLocation[]).map((location)=>[location.courier_id,location]));
      setLocations(next);
    }
    if(!payoutsResult.error) setPayouts((payoutsResult.data??[]) as unknown as CourierPayout[]);
  },[]);

  useEffect(()=>{
    void load();
    const channel=supabase
      .channel("admin-courier-profiles")
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_profiles"},()=>{void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_locations"},()=>{void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_payouts"},()=>{void load();})
      .subscribe();
    const interval=window.setInterval(()=>{void load();},15000);
    return ()=>{
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  },[load]);

  const startEditing=(c:Courier)=>{
    setDrafts((current)=>({...current,[c.id]:{
      cpf:c.cpf??"",
      vehicle_plate:c.vehicle_plate??"",
      cnh_number:c.cnh_number??"",
      cnh_category:c.cnh_category??"",
      cnh_expiry:c.cnh_expiry??"",
    }}));
    setEditing(c.id);
  };

  const saveDocuments=async(c:Courier)=>{
    const draft=drafts[c.id];
    if(!draft) return;
    setSaving(c.id);
    const {error}=await supabase.rpc("courier_command" as never,{p_action:"admin_update_documents",p_payload:{courier_id:c.id,...draft}} as never);
    setSaving(null);
    if(error) return toast.error(error.message);
    toast.success("Documentos do entregador atualizados.");
    setEditing(null);
    await load();
  };

  const missingDocuments=(c:Courier)=>{
    const missing:string[]=[];
    if((c.cpf??"").replace(/\D/g,"").length!==11) missing.push("CPF");
    if(c.vehicle_type!=="bike"){
      if((c.cnh_number??"").replace(/\D/g,"").length!==11) missing.push("CNH");
      if(!c.cnh_category) missing.push("categoria");
      if(!c.cnh_expiry) missing.push("validade");
      if(!c.vehicle_plate) missing.push("placa");
    }
    return missing;
  };

  const markPayoutsPaid=async(c:Courier)=>{
    setSaving(c.id);
    const {error}=await supabase.rpc("courier_command" as never,{p_action:"admin_mark_payout_paid",p_payload:{courier_id:c.id}} as never);
    setSaving(null);
    if(error) return toast.error(error.message);
    toast.success("Repasses pendentes marcados como pagos.");
    await load();
  };

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
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Solicitado em: {new Date(c.created_at).toLocaleDateString("pt-BR")} às {new Date(c.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
        </p>
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
      {(() => {
        const pendingAmount=payouts.filter((p)=>p.courier_id===c.id&&p.status==="pending").reduce((sum,p)=>sum+Number(p.amount||0),0);
        return pendingAmount>0 ? <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs">
          <p><span className="text-muted-foreground">Repasse pendente:</span> <strong>{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(pendingAmount)}</strong></p>
          <Button className="mt-2" size="sm" disabled={saving===c.id} onClick={()=>void markPayoutsPaid(c)}>Marcar repasse como pago</Button>
        </div> : null;
      })()}
      {c.status!=="approved"&&!documentsReady(c)&&<>
        <p className="mt-3 text-xs font-semibold text-amber-600">Documentos incompletos: faltam {missingDocuments(c).join(", ")}.</p>
        {editing===c.id ? <div className="mt-3 grid gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 sm:grid-cols-2">
          <Input placeholder="CPF — 11 dígitos" value={drafts[c.id]?.cpf??""} onChange={(e)=>setDrafts((d)=>({...d,[c.id]:{...(d[c.id]??{cpf:"",vehicle_plate:"",cnh_number:"",cnh_category:"",cnh_expiry:""}),cpf:e.target.value}}))}/>
          {c.vehicle_type!=="bike"&&<>
            <Input placeholder="Placa" value={drafts[c.id]?.vehicle_plate??""} onChange={(e)=>setDrafts((d)=>({...d,[c.id]:{...(d[c.id]??{cpf:"",vehicle_plate:"",cnh_number:"",cnh_category:"",cnh_expiry:""}),vehicle_plate:e.target.value}}))}/>
            <Input placeholder="CNH — 11 dígitos" value={drafts[c.id]?.cnh_number??""} onChange={(e)=>setDrafts((d)=>({...d,[c.id]:{...(d[c.id]??{cpf:"",vehicle_plate:"",cnh_number:"",cnh_category:"",cnh_expiry:""}),cnh_number:e.target.value}}))}/>
            <Input placeholder="Categoria da CNH" value={drafts[c.id]?.cnh_category??""} onChange={(e)=>setDrafts((d)=>({...d,[c.id]:{...(d[c.id]??{cpf:"",vehicle_plate:"",cnh_number:"",cnh_category:"",cnh_expiry:""}),cnh_category:e.target.value}}))}/>
            <Input type="date" value={drafts[c.id]?.cnh_expiry??""} onChange={(e)=>setDrafts((d)=>({...d,[c.id]:{...(d[c.id]??{cpf:"",vehicle_plate:"",cnh_number:"",cnh_category:"",cnh_expiry:""}),cnh_expiry:e.target.value}}))}/>
          </>}
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" disabled={saving===c.id} onClick={()=>void saveDocuments(c)}>Salvar documentos</Button>
            <Button size="sm" variant="outline" onClick={()=>setEditing(null)}>Cancelar</Button>
          </div>
        </div> : <Button className="mt-2" size="sm" variant="outline" onClick={()=>startEditing(c)}>Completar documentos</Button>}
      </>}
      <div className="mt-3 flex flex-wrap gap-2">
        {c.status!=="approved"&&<Button disabled={saving===c.id||!documentsReady(c)} onClick={()=>void setStatus(c,"approved")}><CheckCircle2 className="h-4 w-4"/> Aprovar</Button>}
        {c.status!=="suspended"&&<Button disabled={saving===c.id} variant="destructive" onClick={()=>void setStatus(c,"suspended")}><ShieldAlert className="h-4 w-4"/> Suspender</Button>}
        {c.status==="suspended"&&<Button disabled={saving===c.id} variant="outline" onClick={()=>void setStatus(c,"pending")}>Voltar para análise</Button>}
      </div>
    </Card>)}</div>
  </div>;
}