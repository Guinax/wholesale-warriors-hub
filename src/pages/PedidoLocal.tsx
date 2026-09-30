import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Loader2, Store, Truck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RequestData={id:string;status:string;subtotal:number;shipping:number|null;eta_minutes:number|null;order_code?:string|null;payment_status?:string|null};

export default function PedidoLocal(){
 const {id}=useParams(); const navigate=useNavigate(); const { clearCart } = useCart() as ReturnType<typeof useCart> & { clearCart?: () => void }; const [request,setRequest]=useState<RequestData|null>(null); const [loaded,setLoaded]=useState(false); const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const {data,error}=await supabase.rpc("partner_command" as never,{p_action:"dashboard",p_payload:{}} as never);setLoaded(true);if(error){toast.error("Não foi possível acompanhar o pedido.");return}const row=((data as {requests?:RequestData[]}|null)?.requests??[]).find(x=>x.id===id);setRequest(row??null)},[id]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{
  if(!id)return;
  const channel=supabase.channel(`customer-local-order-${id}`)
   .on("postgres_changes",{event:"*",schema:"public",table:"partner_requests",filter:`id=eq.${id}`},()=>void load())
   .on("postgres_changes",{event:"*",schema:"public",table:"partner_offers"},()=>void load())
   .subscribe();
  return()=>{void supabase.removeChannel(channel)};
 },[id,load]);
 useEffect(()=>{if(!request||["expired","delivered","cancelled","canceled"].includes(request.status))return;const t=setInterval(()=>void load(),15000);return()=>clearInterval(t)},[load,request?.status]);
 useEffect(()=>{if(request?.status==="expired"){toast.info("Nenhuma loja local confirmou a tempo. Vamos continuar pela central.");navigate("/pagamento",{replace:true,state:{forceCentral:true}})}},[request?.status,navigate]);
 const cancel=async()=>{if(!id)return;setBusy(true);const {error}=await supabase.rpc("partner_command" as never,{p_action:"cancel",p_payload:{request_id:id}} as never);setBusy(false);if(error)toast.error(error.message);else{toast.success("Solicitação cancelada.");navigate("/pagamento")}};
 const openPayment=async(code:string)=>{setBusy(true);try{const {createPaymentLink}=await import("@/lib/payments");const url=await createPaymentLink(code,`${window.location.origin}/recibo/${code}`);clearCart?.();window.location.href=url}catch(e){setBusy(false);toast.error(e instanceof Error?e.message:"Pagamento indisponível. Tente novamente.")}};
 const confirm=async()=>{if(!id||request?.shipping==null)return;setBusy(true);const total=Number(request.subtotal)+Number(request.shipping);const {data,error}=await supabase.rpc("partner_command" as never,{p_action:"confirm",p_payload:{request_id:id,total}} as never);if(error){setBusy(false);toast.error(error.message);return}const code=(data as {order_code?:string}|null)?.order_code;if(!code){setBusy(false);toast.error("Pedido não foi criado.");return}await openPayment(code)};
 const label=request?.status==="expired"?"Encaminhando para a central":request?.status==="searching"?"Buscando loja próxima":request?.status==="accepted"?"Loja encontrada — calculando entrega":request?.status==="quoted"?"Entrega local calculada":request?.status==="payment_pending"?"Aguardando pagamento":request?.status==="paid"?"Pagamento confirmado":request?.status==="delivering"?"Saiu para entrega":request?.status==="delivered"?"Entregue":request?.status??"Carregando";
 return <div className="min-h-screen bg-background"><PageHeader eyebrow="ENTREGA LOCAL" title="ACOMPANHAR PEDIDO" subtitle="Acompanhe a loja próxima, o frete e o pagamento em um só lugar."/><main className="container max-w-2xl py-8"><Card><CardContent className="py-6 space-y-5">{!loaded?<div className="flex gap-2 items-center"><Loader2 className="animate-spin"/>Carregando solicitação...</div>:!request?<div className="space-y-3"><p className="font-semibold">Solicitação não encontrada</p><p className="text-sm text-muted-foreground">Ela pode ter sido concluída, cancelada ou expirada. Você pode voltar ao checkout com segurança.</p><Button className="w-full" onClick={()=>navigate("/pagamento",{replace:true,state:{forceCentral:true}})}>Continuar pela central</Button></div>:<><div className="flex gap-3 items-center"><Store/><div><p className="font-semibold">{label}</p><p className="text-sm text-muted-foreground">Mercadorias: R$ {Number(request.subtotal).toFixed(2).replace(".",",")}</p></div></div>{request.shipping!=null&&<div className="rounded-lg border p-4 flex gap-3"><Truck/><div><p>Entrega: R$ {Number(request.shipping).toFixed(2).replace(".",",")}</p>{request.eta_minutes&&<p className="text-sm text-muted-foreground">Previsão: {request.eta_minutes} min</p>}</div></div>}{request.status==="quoted"&&<Button className="w-full" disabled={busy} onClick={()=>void confirm()}>Pagar com InfinitePay</Button>}{request.status==="payment_pending"&&request.order_code&&<Button className="w-full" disabled={busy} onClick={()=>void openPayment(request.order_code!)}>Continuar pagamento na InfinitePay</Button>}{["searching","accepted","quoted"].includes(request.status)&&<Button variant="outline" className="w-full" disabled={busy} onClick={()=>void cancel()}>Cancelar solicitação</Button>}</>}</CardContent></Card></main></div>
}