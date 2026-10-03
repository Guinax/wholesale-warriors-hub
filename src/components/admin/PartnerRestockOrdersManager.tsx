import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Boxes, RefreshCw, Store } from "lucide-react";

type RestockItem = {
  id:string;
  product_id:string;
  quantity:number;
  unit_price:number;
  products?:{name?:string;image_url?:string|null}|null;
};
type RestockOrder = {
  id:string;
  store_id:string;
  status:string;
  notes:string|null;
  admin_notes:string|null;
  total_amount:number;
  created_at:string;
  partner_stores?:{name?:string;city?:string|null;state?:string|null}|null;
  partner_restock_order_items?:RestockItem[];
};

const labels:Record<string,string>={
  requested:"Solicitado",
  confirmed:"Confirmado",
  preparing:"Separando",
  ready:"Pronto",
  shipped:"Enviado",
  received:"Recebido",
  cancelled:"Cancelado",
};

export default function PartnerRestockOrdersManager({onPendingChange}:{onPendingChange?:(count:number)=>void}){
  const[orders,setOrders]=useState<RestockOrder[]>([]);
  const[loading,setLoading]=useState(false);
  const[saving,setSaving]=useState<string|null>(null);

  const load=useCallback(async()=>{
    setLoading(true);
    const{data,error}=await supabase
      .from("partner_restock_orders" as never)
      .select("id,store_id,status,notes,admin_notes,total_amount,created_at,partner_stores(name,city,state),partner_restock_order_items(id,product_id,quantity,unit_price,products(name,image_url))")
      .order("created_at",{ascending:false});
    setLoading(false);
    if(error){toast.error("Não foi possível carregar os pedidos de reposição.");return;}
    setOrders((data??[]) as unknown as RestockOrder[]);
  },[]);

  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    const channel=supabase.channel("admin-partner-restock-live")
      .on("postgres_changes",{event:"*",schema:"public",table:"partner_restock_orders"},payload=>{
        if(payload.eventType==="INSERT"){
          toast.success("Novo pedido de reposição recebido",{
            description:"Um parceiro solicitou produtos à sede.",
            duration:12000,
          });
          try{new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play().catch(()=>{});}catch{}
        }
        void load();
      })
      .subscribe();
    return()=>{void supabase.removeChannel(channel);};
  },[load]);

  const pending=useMemo(()=>orders.filter(o=>["requested","confirmed","preparing","ready"].includes(o.status)).length,[orders]);
  useEffect(()=>{onPendingChange?.(pending);},[pending,onPendingChange]);

  const updateStatus=async(order:RestockOrder,status:string)=>{
    setSaving(order.id);
    const{error}=await supabase.from("partner_restock_orders" as never).update({status} as never).eq("id",order.id);
    setSaving(null);
    if(error){toast.error(error.message);return;}
    setOrders(current=>current.map(o=>o.id===order.id?{...o,status}:o));
    toast.success("Status da reposição atualizado.");
  };

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">Reposição dos parceiros</h2>
        <p className="text-sm text-muted-foreground">Pedidos que as lojas parceiras enviam para a sede principal.</p>
      </div>
      <Button variant="outline" size="sm" onClick={()=>void load()} disabled={loading}>
        <RefreshCw className={`h-4 w-4 ${loading?"animate-spin":""}`}/>Atualizar
      </Button>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="p-4"><p className="text-xs text-muted-foreground">Aguardando ação</p><p className="mt-1 text-2xl font-black">{pending}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="mt-1 text-2xl font-black">{orders.length}</p></Card>
      <Card className="p-4"><p className="text-xs text-muted-foreground">Concluídos</p><p className="mt-1 text-2xl font-black">{orders.filter(o=>o.status==="received").length}</p></Card>
    </div>

    {orders.length===0?<Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma solicitação de reposição recebida.</Card>:
      <div className="space-y-3">{orders.map(order=><Card key={order.id} className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Store className="h-4 w-4"/><p className="font-bold">{order.partner_stores?.name??"Parceiro"}</p></div>
            <p className="mt-1 text-xs text-muted-foreground">{[order.partner_stores?.city,order.partner_stores?.state].filter(Boolean).join("/")} · {new Date(order.created_at).toLocaleString("pt-BR")}</p>
          </div>
          <Badge variant={order.status==="requested"?"destructive":order.status==="received"?"secondary":"outline"}>{labels[order.status]??order.status}</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {(order.partner_restock_order_items??[]).map(item=><div key={item.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">{item.products?.image_url&&<img src={item.products.image_url} alt={item.products?.name??"Produto"} className="h-full w-full object-cover"/>}</div>
            <div><p className="text-sm font-semibold">{item.products?.name??"Produto"}</p><p className="text-xs text-muted-foreground">{item.quantity} un. · {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(item.unit_price))}/un.</p></div>
          </div>)}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="text-sm">
            {order.notes&&<p><strong>Observação:</strong> {order.notes}</p>}
            <p className="mt-1"><strong>Total:</strong> {new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(order.total_amount))}</p>
          </div>
          <div className="min-w-[190px]">
            <Select value={order.status} onValueChange={value=>void updateStatus(order,value)} disabled={saving===order.id}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="requested">Solicitado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="preparing">Separando</SelectItem>
                <SelectItem value="ready">Pronto</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>)}</div>}
  </div>;
}
