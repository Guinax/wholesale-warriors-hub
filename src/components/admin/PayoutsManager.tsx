import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/orderUtils";

type Payout={id:string;request_id:string;store_id:string;amount:number;status:string;approved_at:string|null;paid_at:string|null;receipt_reference:string|null};
export default function PayoutsManager(){
 const [rows,setRows]=useState<Payout[]>([]); const [receipt,setReceipt]=useState<Record<string,string>>({}); const [busy,setBusy]=useState<string|null>(null);
 const load=async()=>{const {data,error}=await supabase.from("partner_payouts" as never).select("id,request_id,store_id,amount,status,approved_at,paid_at,receipt_reference").order("approved_at",{ascending:false,nullsFirst:true});if(error)toast.error("Erro ao carregar repasses.");else setRows((data??[]) as unknown as Payout[])};
 useEffect(()=>{void load()},[]);
 const act=async(p:Payout,action:"approve_payout"|"record_payout")=>{if(action==="record_payout"&&!receipt[p.id]?.trim())return toast.error("Informe a referência do comprovante.");setBusy(p.id);const {data,error}=await supabase.rpc("partner_command" as never,{p_action:action,p_payload:{payout_id:p.id,receipt_reference:receipt[p.id]?.trim()}} as never);setBusy(null);if(error)return toast.error(error.message);const r=data as unknown as {error?:string};if(r?.error)return toast.error(r.error);toast.success(action==="approve_payout"?"Repasse aprovado.":"Repasse registrado como pago.");await load()};
 return <div className="space-y-3"><div><h2 className="text-xl font-bold">Repasses aos parceiros</h2><p className="text-sm text-muted-foreground">Somente pedidos pagos e entregues entram nesta fila. O pagamento do cliente permanece centralizado na plataforma.</p></div>
 {rows.length===0&&<Card className="p-8 text-center text-sm text-muted-foreground">Nenhum repasse disponível.</Card>}
 {rows.map(p=><Card key={p.id} className="p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-mono text-xs text-muted-foreground">{p.request_id}</div><strong>{formatCurrency(Number(p.amount))}</strong></div><Badge variant="outline">{p.status}</Badge></div>
 {p.status==="eligible"&&<Button disabled={busy===p.id} onClick={()=>void act(p,"approve_payout")}>Aprovar repasse</Button>}
 {p.status==="approved"&&<div className="flex flex-col sm:flex-row gap-2"><Input placeholder="Referência/comprovante do PIX" value={receipt[p.id]??""} onChange={e=>setReceipt(x=>({...x,[p.id]:e.target.value}))}/><Button disabled={busy===p.id} onClick={()=>void act(p,"record_payout")}>Registrar pagamento</Button></div>}
 {p.status==="paid"&&<p className="text-sm">Pago em {p.paid_at?new Date(p.paid_at).toLocaleString("pt-BR"):"—"} • {p.receipt_reference}</p>}
 </Card>)}</div>
}