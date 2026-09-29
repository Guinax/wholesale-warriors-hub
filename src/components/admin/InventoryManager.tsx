import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Boxes, Plus, RefreshCw, Warehouse } from "lucide-react";
import { toast } from "sonner";

type Source={id:string;name:string;source_type:string;contact_name:string|null;phone:string|null;city:string|null;state:string|null;active:boolean};
type Product={id:string;name:string;category:string};
type Balance={id:string;source_id:string;product_id:string;quantity:number;reserved:number;reorder_point:number};

const InventoryManager=()=>{
 const [sources,setSources]=useState<Source[]>([]),[products,setProducts]=useState<Product[]>([]),[balances,setBalances]=useState<Balance[]>([]);
 const [name,setName]=useState(""),[type,setType]=useState("supplier"),[productId,setProductId]=useState(""),[sourceId,setSourceId]=useState("");
 const [quantity,setQuantity]=useState(0),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{setBusy(true);const [s,p,b]=await Promise.all([
  supabase.from("inventory_sources" as never).select("*").order("name"),
  supabase.from("products").select("id,name,category").eq("active",true).order("name"),
  supabase.from("inventory_balances" as never).select("*")
 ]);if(s.error||p.error||b.error) toast.error("Não foi possível carregar o estoque unificado.");
 setSources((s.data??[]) as unknown as Source[]);setProducts((p.data??[]) as Product[]);setBalances((b.data??[]) as unknown as Balance[]);setBusy(false)},[]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const c=supabase.channel("unified-inventory").on("postgres_changes",{event:"*",schema:"public",table:"inventory_balances"},()=>void load()).subscribe();return()=>{supabase.removeChannel(c)}},[load]);
 const available=useMemo(()=>balances.reduce((n,b)=>n+Math.max(0,b.quantity-b.reserved),0),[balances]);
 const low=useMemo(()=>balances.filter(b=>b.quantity-b.reserved<=b.reorder_point).length,[balances]);
 const addSource=async()=>{if(!name.trim())return;const {error}=await supabase.from("inventory_sources" as never).insert({name:name.trim(),source_type:type} as never);if(error)return toast.error(error.message);setName("");toast.success("Origem cadastrada.");void load()};
 const saveBalance=async()=>{if(!sourceId||!productId||quantity<0)return;const {error}=await supabase.from("inventory_balances" as never).upsert({source_id:sourceId,product_id:productId,quantity,reserved:0,reorder_point:5} as never,{onConflict:"source_id,product_id"});if(error)return toast.error(error.message);toast.success("Saldo atualizado e estoque geral sincronizado.");void load()};
 return <div className="space-y-4">
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
   <Card className="p-4"><p className="text-xs text-muted-foreground">Origens ativas</p><p className="text-2xl font-black">{sources.filter(s=>s.active).length}</p></Card>
   <Card className="p-4"><p className="text-xs text-muted-foreground">Saldo disponível</p><p className="text-2xl font-black">{available}</p></Card>
   <Card className="p-4"><p className="text-xs text-muted-foreground">Produtos/origens</p><p className="text-2xl font-black">{balances.length}</p></Card>
   <Card className="p-4"><p className="text-xs text-muted-foreground">Reposição necessária</p><p className="text-2xl font-black text-destructive">{low}</p></Card>
  </div>
  <div className="grid lg:grid-cols-2 gap-4">
   <Card className="p-4 space-y-3"><div className="flex items-center gap-2"><Warehouse className="w-5 h-5 text-primary"/><h3 className="font-bold">Nova origem de estoque</h3></div>
    <Input value={name} onChange={e=>setName(e.target.value)} placeholder="Fornecedor, vendedor ou depósito"/>
    <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="supplier">Fornecedor</SelectItem><SelectItem value="seller">Vendedor</SelectItem><SelectItem value="warehouse">Depósito</SelectItem></SelectContent></Select>
    <Button onClick={addSource} disabled={!name.trim()}><Plus className="w-4 h-4"/>Cadastrar origem</Button>
   </Card>
   <Card className="p-4 space-y-3"><div className="flex items-center gap-2"><Boxes className="w-5 h-5 text-primary"/><h3 className="font-bold">Atualizar saldo</h3></div>
    <Select value={sourceId} onValueChange={setSourceId}><SelectTrigger><SelectValue placeholder="Origem"/></SelectTrigger><SelectContent>{sources.filter(s=>s.active).map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
    <Select value={productId} onValueChange={setProductId}><SelectTrigger><SelectValue placeholder="Produto"/></SelectTrigger><SelectContent>{products.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
    <Input type="number" min={0} value={quantity} onChange={e=>setQuantity(Math.max(0,Number(e.target.value)))}/>
    <Button onClick={saveBalance} disabled={!sourceId||!productId}>Salvar saldo</Button>
   </Card>
  </div>
  <div className="flex justify-between items-center"><h3 className="font-bold">Mapa do estoque</h3><Button variant="outline" size="sm" onClick={load} disabled={busy}><RefreshCw className={`w-4 h-4 ${busy?"animate-spin":""}`}/>Atualizar</Button></div>
  <div className="space-y-2">{balances.map(b=>{const s=sources.find(x=>x.id===b.source_id),p=products.find(x=>x.id===b.product_id),free=Math.max(0,b.quantity-b.reserved);return <Card key={b.id} className="p-3 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{p?.name??"Produto"}</p><p className="text-xs text-muted-foreground">{s?.name??"Origem"} · {p?.category}</p></div><div className="flex gap-2"><Badge variant="outline">Total {b.quantity}</Badge><Badge variant="outline">Reservado {b.reserved}</Badge><Badge variant={free<=b.reorder_point?"destructive":"secondary"}>Disponível {free}</Badge></div></Card>})}{!balances.length&&<Card className="p-8 text-center text-sm text-muted-foreground">Cadastre uma origem e informe o primeiro saldo para iniciar o controle unificado.</Card>}</div>
 </div>
};
export default InventoryManager;
