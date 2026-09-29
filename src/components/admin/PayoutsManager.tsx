import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/orderUtils";

type Payout={id:string;request_id:string;store_id:string;amount:number;status:string;approved_at:string|null;paid_at:string|null;receipt_reference:string|null}; type Store={id:string;name:string}; type Account={store_id:string;pix_key_type:string;pix_key:string;holder_name:string;holder_document:string};
export default function PayoutsManager(){
 const [rows,setRows]=useState<Payout[]>([]); const [stores,setStores]=useState<Record<string,Store>>({}); const [accounts,setAccounts]=useState<Record<string,Account>>({}); const [receipt,setReceipt]=useState<Record<string,string>>({}); const [busy,setBusy]=useState<string|null>(null);
 const load=async()=>{const [{data,error},{data:sd},{data:ad}]=await Promise.all([supabase.from("partner_payouts" as never).select("id,request_id,store_id,amount,status,approved_at,paid_at,receipt_reference").order("approved_at",{ascending:false,nullsFirst:true}),supabase.from("partner_stores" as never).select("id,name"),supabase.from("partner_payout_accounts" as never).select("store_id,pix_key_type,pix_key,holder_name,holder_document")]);if(error)toast.error("Erro ao carregar repasses.");else setRows((data??[]) as unknown as Payout[]);setStores(Object.fromEntries(((sd??[]) as unknown as Store[]).map(x=>[x.id,x])));setAccounts(Object.fromEntries(((ad??[]) as unknown as Account[]).map(x=>[x.store_id,x])))};
 useEffect(()=>{void load()},[]);
 const act=async(p:Payout,action:"approve_payout"|"record_payout")=>{if(action==="record_payout"&&!receipt[p.id]?.trim())return toast.error("Informe a referência do comprovante.");setBusy(p.id);const {data,error}=await supabase.rpc("partner_command" as never,{p_action:action,p_payload:{payout_id:p.id,receipt_reference:receipt[p.id]?.trim()}} as never);setBusy(null);if(error)return toast.error(error.message);const r=data as unknown as {error?:string};if(r?.error)return toast.error(r.error);toast.success(action==="approve_payout"?"Repasse aprovado.":"Repasse registrado como pago.");await load()};
 return <div className="space-y-3"><div><h2 className="text-xl font-bold">Repasses aos parceiros</h2><p className="text-sm text-muted-foreground">Somente pedidos pagos e entregues entram nesta fila. O pagamento do cliente permanece centralizado na plataforma.</p></div>
 {rows.length===0&&<Card className="p-8 text-center text-sm text-muted-foreground">Nenhum repasse disponível.</Card>}
 {rows.map(p=><Card key={p.id} className="p-4 space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><div className="font-mono text-xs text-muted-foreground">{p.request_id}</div><strong>{formatCurrency(Number(p.amount))}</strong><div className="text-sm font-medium">{stores[p.store_id]?.name??"Loja parceira"}</div></div><Badge variant="outline">{p.status}</Badge></div>
 {accounts[p.store_id]?<div className="rounded-md border p-3 text-sm"><strong>Destino PIX:</strong> {accounts[p.store_id].pix_key_type.toUpperCase()} • {accounts[p.store_id].pix_key}<br/><span className="text-muted-foreground">{accounts[p.store_id].holder_name} • {accounts[p.store_id].holder_document}</span></div>:<p className="text-sm text-destructive">Conta PIX ainda não cadastrada pelo parceiro.</p>} {p.status==="eligible"&&<Button disabled={busy===p.id} onClick={()=>void act(p,"approve_payout")}>Aprovar repasse</Button>}
 {p.status==="approved"&&<div className="flex flex-col sm:flex-row gap-2"><Input placeholder="Referência/comprovante do PIX" value={receipt[p.id]??""} onChange={e=>setReceipt(x=>({...x,[p.id]:e.target.value}))}/><Button disabled={busy===p.id} onClick={()=>void act(p,"record_payout")}>Registrar pagamento</Button></div>}
 {p.status==="paid"&&<p className="text-sm">Pago em {p.paid_at?new Date(p.paid_at).toLocaleString("pt-BR"):"—"} • {p.receipt_reference}</p>}
 </Card>)}</div>
}