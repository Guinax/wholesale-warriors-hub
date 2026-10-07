import { useCallback, useEffect, useState } from "react";
import { Bike, CheckCircle2, MapPin, ReceiptText, RefreshCw, ShieldAlert, Upload, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Courier = { id:string; courier_code:string; full_name:string; phone:string; cpf:string|null; vehicle_type:string; vehicle_plate:string|null; cnh_number:string|null; cnh_category:string|null; cnh_expiry:string|null; status:"pending"|"approved"|"suspended"; is_online:boolean; created_at:string };
type CourierLocation = { courier_id:string; lat:number; lng:number; accuracy_m:number|null; updated_at:string };
type CourierPayout = { id:string; courier_id:string; amount:number; paid_amount:number; status:"pending"|"partial"|"paid"|"cancelled"; created_at:string; paid_at:string|null };
type CourierAccount = { courier_id:string; pix_key_type:string; pix_key:string; holder_name:string; holder_document:string };
type CourierWalletPayment = { id:string; courier_id:string; amount:number; receipt_url:string; receipt_reference:string|null; paid_at:string };
type WalletDraft = { amount:string; reference:string; receipt:File|null };

const money=(value:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value||0);
const safeFileName=(name:string)=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]/g,"-").slice(-100);

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
  const [accounts,setAccounts]=useState<Record<string,CourierAccount>>({});
  const [payments,setPayments]=useState<CourierWalletPayment[]>([]);
  const [walletDrafts,setWalletDrafts]=useState<Record<string,WalletDraft>>({});

  const load=useCallback(async()=>{
    setLoading(true);
    const [profilesResult, locationsResult, payoutsResult, accountsResult, paymentsResult]=await Promise.all([
      supabase.from("courier_profiles" as never)
        .select("id,courier_code,full_name,phone,cpf,vehicle_type,vehicle_plate,cnh_number,cnh_category,cnh_expiry,status,is_online,created_at")
        .order("created_at",{ascending:false}),
      supabase.from("courier_locations" as never)
        .select("courier_id,lat,lng,accuracy_m,updated_at"),
      supabase.from("courier_payouts" as never)
        .select("id,courier_id,amount,paid_amount,status,created_at,paid_at")
        .order("created_at",{ascending:false}),
      supabase.from("courier_payout_accounts" as never)
        .select("courier_id,pix_key_type,pix_key,holder_name,holder_document"),
      supabase.from("courier_wallet_payments" as never)
        .select("id,courier_id,amount,receipt_url,receipt_reference,paid_at")
        .order("paid_at",{ascending:false}),
    ]);
    setLoading(false);
    if(profilesResult.error) return toast.error(profilesResult.error.message);
    setRows((profilesResult.data??[]) as unknown as Courier[]);
    if(!locationsResult.error){
      const next=Object.fromEntries(((locationsResult.data??[]) as unknown as CourierLocation[]).map((location)=>[location.courier_id,location]));
      setLocations(next);
    }
    if(!payoutsResult.error) setPayouts((payoutsResult.data??[]) as unknown as CourierPayout[]);
    if(!accountsResult.error) setAccounts(Object.fromEntries(((accountsResult.data??[]) as unknown as CourierAccount[]).map((account)=>[account.courier_id,account])));
    if(!paymentsResult.error) setPayments((paymentsResult.data??[]) as unknown as CourierWalletPayment[]);
  },[]);

  useEffect(()=>{
    void load();
    const channel=supabase
      .channel("admin-courier-profiles")
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_profiles"},()=>{void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_locations"},()=>{void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_payouts"},()=>{void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_wallet_payments"},()=>{void load();})
      .on("postgres_changes",{event:"*",schema:"public",table:"courier_payout_accounts"},()=>{void load();})
      .subscribe();
    const interval=window.setInterval(()=>{void load();},15000);
    return ()=>{
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  },[load]);

  const setDraft=(courierId:string,patch:Partial<WalletDraft>)=>{
    setWalletDrafts(current=>({
      ...current,
      [courierId]:{amount:"",reference:"",receipt:null,...current[courierId],...patch},
    }));
  };

  const payWallet=async(c:Courier,available:number)=>{
    const draft=walletDrafts[c.id]??{amount:"",reference:"",receipt:null};
    const amount=Number(draft.amount.replace(",","."));
    if(!Number.isFinite(amount)||amount<=0) return toast.error("Informe o valor do PIX.");
    if(amount>available+0.001) return toast.error("O valor não pode ultrapassar o saldo disponível.");
    if(!draft.receipt) return toast.error("Anexe o comprovante PIX.");
    if(draft.receipt.size>8*1024*1024) return toast.error("O comprovante deve ter no máximo 8 MB.");
    if(!["image/jpeg","image/png","image/webp","application/pdf"].includes(draft.receipt.type)) return toast.error("Use comprovante JPG, PNG, WebP ou PDF.");

    setSaving("wallet-"+c.id);
    let uploadedPath:string|null=null;
    try{
      const filename=safeFileName(draft.receipt.name||"comprovante");
      uploadedPath=`courier-wallet-receipts/${c.id}/${Date.now()}-${filename}`;
      const {error:uploadError}=await supabase.storage.from("media").upload(uploadedPath,draft.receipt,{
        cacheControl:"3600",
        upsert:false,
        contentType:draft.receipt.type,
      });
      if(uploadError) throw uploadError;

      const {data:publicData}=supabase.storage.from("media").getPublicUrl(uploadedPath);
      const {data,error}=await supabase.rpc("admin_courier_wallet_pay" as never,{
        p_courier_id:c.id,
        p_amount:Math.round(amount*100)/100,
        p_receipt_url:publicData.publicUrl,
        p_receipt_reference:draft.reference.trim()||filename,
      } as never);
      if(error) throw error;

      const result=data as unknown as {available_balance?:number};
      toast.success(`PIX registrado. Saldo restante: ${money(Number(result?.available_balance??Math.max(0,available-amount)))}.`);
      setWalletDrafts(current=>({...current,[c.id]:{amount:"",reference:"",receipt:null}}));
      await load();
    }catch(error){
      if(uploadedPath) await supabase.storage.from("media").remove([uploadedPath]);
      toast.error(error instanceof Error?error.message:"Não foi possível registrar o pagamento.");
    }finally{
      setSaving(null);
    }
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
      <div><h2 className="text-lg font-bold">Entregadores</h2><p className="text-sm text-muted-foreground">Aprove cadastros, acompanhe a rede e faça os PIX pela carteira acumulada.</p></div>
      <Button variant="outline" size="icon" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?"h-4 w-4 animate-spin":"h-4 w-4"}/></Button>
    </div>
    {rows.length===0&&!loading&&<Card className="p-8 text-center text-sm text-muted-foreground">Nenhum entregador cadastrado ainda.</Card>}
    <div className="grid gap-3">{rows.map(c=>{
      const walletPayouts=payouts.filter((p)=>p.courier_id===c.id&&p.status!=="cancelled");
      const generated=walletPayouts.reduce((sum,p)=>sum+Number(p.amount||0),0);
      const paid=walletPayouts.reduce((sum,p)=>sum+Number(p.paid_amount||0),0);
      const available=Math.max(0,generated-paid);
      const account=accounts[c.id];
      const draft=walletDrafts[c.id]??{amount:"",reference:"",receipt:null};
      const history=payments.filter((p)=>p.courier_id===c.id);

      return <Card key={c.id} className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><Bike className="h-4 w-4 text-primary"/><strong>{c.full_name}</strong><Badge variant="outline">{c.courier_code}</Badge></div>
          <p className="mt-1 text-xs text-muted-foreground">{c.phone} · {c.vehicle_type}{c.vehicle_plate?" · "+c.vehicle_plate:""}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">Solicitado em: {new Date(c.created_at).toLocaleDateString("pt-BR")} às {new Date(c.created_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</p>
          <div className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs sm:grid-cols-2">
            <p><span className="text-muted-foreground">CPF:</span> <strong>{c.cpf||"Não informado"}</strong></p>
            <p><span className="text-muted-foreground">Veículo:</span> <strong>{c.vehicle_type}{c.vehicle_plate?" · "+c.vehicle_plate:""}</strong></p>
            {c.vehicle_type!=="bike"&&<>
              <p><span className="text-muted-foreground">CNH:</span> <strong>{c.cnh_number||"Não informada"}</strong></p>
              <p><span className="text-muted-foreground">Categoria:</span> <strong>{c.cnh_category||"—"}</strong></p>
              <p><span className="text-muted-foreground">Validade:</span> <strong>{c.cnh_expiry?new Date(c.cnh_expiry+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</strong></p>
            </>}
          </div>
          {locations[c.id]&&<div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <a href={`https://www.google.com/maps?q=${locations[c.id].lat},${locations[c.id].lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline"><MapPin className="h-3.5 w-3.5"/> Ver localização operacional</a>
            <span className="text-muted-foreground">Atualizada {new Date(locations[c.id].updated_at).toLocaleString("pt-BR")}</span>
          </div>}</div>
          <div className="flex items-center gap-2"><Badge variant={c.status==="approved"?"default":c.status==="suspended"?"destructive":"secondary"}>{c.status==="approved"?"Aprovado":c.status==="suspended"?"Suspenso":"Em análise"}</Badge>{c.status==="approved"&&<Badge variant="outline">{c.is_online?"Online":"Offline"}</Badge>}</div>
        </div>

        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 text-sm font-bold"><WalletCards className="h-4 w-4"/> Carteira do entregador</div><div className="mt-1 text-2xl font-black">{money(available)}</div><div className="text-xs text-muted-foreground">Saldo disponível para PIX</div></div>
            <div className="text-right text-xs text-muted-foreground"><div>Gerado: <strong className="text-foreground">{money(generated)}</strong></div><div>Pago: <strong className="text-foreground">{money(paid)}</strong></div></div>
          </div>

          {account?<div className="mt-3 rounded-md border p-3 text-xs"><strong>PIX:</strong> {account.pix_key_type.toUpperCase()} • {account.pix_key}<br/><span className="text-muted-foreground">{account.holder_name} • {account.holder_document}</span></div>:<p className="mt-3 text-xs font-semibold text-amber-600">O entregador ainda não cadastrou a conta PIX.</p>}

          {available>0&&account&&<div className="mt-3 space-y-2">
            <div className="grid gap-2 md:grid-cols-[160px_1fr]">
              <Input inputMode="decimal" placeholder="Valor do PIX" value={draft.amount} onChange={(e)=>setDraft(c.id,{amount:e.target.value})}/>
              <Input placeholder="ID/E2E/NSU do PIX (opcional)" value={draft.reference} onChange={(e)=>setDraft(c.id,{reference:e.target.value})}/>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={()=>setDraft(c.id,{amount:available.toFixed(2).replace(".",",")})}>Usar saldo total</Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"><Upload className="h-4 w-4"/>{draft.receipt?draft.receipt.name:"Anexar comprovante"}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e)=>setDraft(c.id,{receipt:e.target.files?.[0]??null})}/></label>
              <Button size="sm" disabled={saving==="wallet-"+c.id||!draft.receipt} onClick={()=>void payWallet(c,available)}>{saving==="wallet-"+c.id?"Registrando...":"Confirmar PIX e dar baixa"}</Button>
            </div>
          </div>}

          {history.length>0&&<div className="mt-4 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Últimos pagamentos</div>
            {history.slice(0,4).map(payment=><div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-xs"><div><strong>{money(Number(payment.amount))}</strong><div className="text-muted-foreground">{new Date(payment.paid_at).toLocaleString("pt-BR")}{payment.receipt_reference?` · ${payment.receipt_reference}`:""}</div></div><a href={payment.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline"><ReceiptText className="h-3.5 w-3.5"/> Comprovante</a></div>)}
          </div>}
        </div>

        {c.status!=="approved"&&!documentsReady(c)&&<p className="mt-3 text-xs font-semibold text-amber-600">Documentos incompletos: o entregador precisa completar CPF e, para veículo motorizado, CNH e placa antes da aprovação.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status!=="approved"&&<Button disabled={saving===c.id||!documentsReady(c)} onClick={()=>void setStatus(c,"approved")}><CheckCircle2 className="h-4 w-4"/> Aprovar</Button>}
          {c.status!=="suspended"&&<Button disabled={saving===c.id} variant="destructive" onClick={()=>void setStatus(c,"suspended")}><ShieldAlert className="h-4 w-4"/> Suspender</Button>}
          {c.status==="suspended"&&<Button disabled={saving===c.id} variant="outline" onClick={()=>void setStatus(c,"pending")}>Voltar para análise</Button>}
        </div>
      </Card>;
    })}</div>
  </div>;
}
