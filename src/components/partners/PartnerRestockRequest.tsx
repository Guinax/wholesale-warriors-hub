import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PackagePlus, Send, Trash2 } from "lucide-react";

type Product={id:string;name:string;image_url:string|null};
type RestockOrder={id:string;status:string;total_amount:number;created_at:string};

const labels:Record<string,string>={
  requested:"Solicitado",
  confirmed:"Confirmado",
  preparing:"Separando",
  ready:"Pronto",
  shipped:"Enviado",
  received:"Recebido",
  cancelled:"Cancelado",
};

export default function PartnerRestockRequest({storeId,products}:{storeId:string;products:Product[]}){
  const[selected,setSelected]=useState("");
  const[quantity,setQuantity]=useState("1");
  const[cart,setCart]=useState<Record<string,number>>({});
  const[notes,setNotes]=useState("");
  const[sending,setSending]=useState(false);
  const[history,setHistory]=useState<RestockOrder[]>([]);

  const loadHistory=useCallback(async()=>{
    const{data}=await supabase
      .from("partner_restock_orders" as never)
      .select("id,status,total_amount,created_at")
      .eq("store_id",storeId)
      .order("created_at",{ascending:false})
      .limit(5);
    setHistory((data??[]) as unknown as RestockOrder[]);
  },[storeId]);

  useEffect(()=>{void loadHistory();},[loadHistory]);
  useEffect(()=>{
    const channel=supabase.channel("partner-restock-"+storeId)
      .on("postgres_changes",{event:"*",schema:"public",table:"partner_restock_orders",filter:`store_id=eq.${storeId}`},()=>void loadHistory())
      .subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[storeId,loadHistory]);

  const cartRows=useMemo(()=>Object.entries(cart).map(([productId,qty])=>({
    productId,qty,product:products.find(p=>p.id===productId)
  })).filter(row=>row.product),[cart,products]);

  const add=()=>{
    const qty=Number(quantity);
    if(!selected||!Number.isInteger(qty)||qty<=0)return toast.error("Escolha um produto e informe uma quantidade válida.");
    setCart(current=>({...current,[selected]:(current[selected]??0)+qty}));
    setQuantity("1");
  };

  const send=async()=>{
    if(cartRows.length===0)return toast.error("Adicione pelo menos um produto ao pedido.");
    setSending(true);
    const items=cartRows.map(row=>({product_id:row.productId,quantity:row.qty}));
    const{data,error}=await supabase.rpc("create_partner_restock_order" as never,{
      p_store_id:storeId,
      p_items:items,
      p_notes:notes.trim()||null,
    } as never);
    if(error){setSending(false);toast.error(error.message);return;}

    setCart({});
    setNotes("");
    setSending(false);
    toast.success("Pedido de reposição enviado à sede.",{description:"A administração recebeu o alerta no painel e o aviso por e-mail foi enfileirado no servidor."});
    await loadHistory();
  };

  return <div className="mt-4 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] p-4">
    <div className="flex items-center gap-2">
      <PackagePlus className="h-5 w-5 text-[#e5c66c]"/>
      <div><h3 className="font-black text-zinc-100">Pedir reposição à sede</h3><p className="text-xs text-zinc-500">Monte seu pedido de produtos. A administração recebe o alerta automaticamente.</p></div>
    </div>

    <div className="mt-4 grid gap-2 md:grid-cols-[1fr_120px_auto]">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="border-white/10 bg-black/20"><SelectValue placeholder="Escolha o produto"/></SelectTrigger>
        <SelectContent>{products.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
      </Select>
      <Input className="border-white/10 bg-black/20" type="number" min="1" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} aria-label="Quantidade para reposição"/>
      <Button type="button" variant="outline" className="border-[#d4af37]/25 bg-[#d4af37]/5 text-yellow-200" onClick={add}>Adicionar</Button>
    </div>

    {cartRows.length>0&&<div className="mt-3 space-y-2">
      {cartRows.map(row=><div key={row.productId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-lg bg-white/5">{row.product?.image_url&&<img src={row.product.image_url} alt={row.product?.name??"Produto"} className="h-full w-full object-cover"/>}</div>
          <div><p className="text-sm font-bold">{row.product?.name}</p><p className="text-xs text-zinc-500">{row.qty} unidade(s)</p></div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={()=>setCart(current=>{const next={...current};delete next[row.productId];return next;})} aria-label="Remover produto"><Trash2 className="h-4 w-4"/></Button>
      </div>)}
      <Input className="border-white/10 bg-black/20" placeholder="Observação para a sede (opcional)" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={500}/>
      <Button type="button" className="w-full bg-[#d4af37] font-black text-black hover:bg-[#e8c65a]" disabled={sending} onClick={()=>void send()}>
        <Send className="h-4 w-4"/>{sending?"Enviando...":"Enviar pedido à sede"}
      </Button>
    </div>}

    {history.length>0&&<div className="mt-5 border-t border-white/10 pt-4">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Últimas solicitações</p>
      <div className="mt-2 space-y-2">{history.map(order=><div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/15 p-2.5">
        <div><p className="text-xs text-zinc-400">{new Date(order.created_at).toLocaleString("pt-BR")}</p><p className="text-sm font-semibold">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(order.total_amount))}</p></div>
        <Badge variant="outline" className="border-[#d4af37]/25 text-yellow-200">{labels[order.status]??order.status}</Badge>
      </div>)}</div>
    </div>}
  </div>;
}
