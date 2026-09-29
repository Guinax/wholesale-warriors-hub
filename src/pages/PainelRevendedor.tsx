import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Offer = { id: string; items: Array<{ name: string; qty: number }>; subtotal: number; city: string; distance_km: number; partner_merchandise: number };
type Request = { id: string; status: string; store_id?: string | null; store_name?: string | null; order_code?: string | null; payment_status?: string | null; shipping?: number | null; route_km?: number | null; eta_minutes?: number | null; items: Array<{ name: string; qty: number }> };

type Store = {
  id: string;
  name: string;
  status: string;
  is_open: boolean;
  delivery_mode: "own" | "third_party" | "hybrid";
  own_driver_available: boolean;
};

export default function PainelRevendedor() {
  const [stores, setStores] = useState<Store[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [routeKm, setRouteKm] = useState<Record<string, string>>({});
  const [weightKg, setWeightKg] = useState<Record<string, string>>({});
  const [eta, setEta] = useState<Record<string, string>>({});
  const [deliveryCode, setDeliveryCode] = useState<Record<string, string>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from("partner_stores" as never)
      .select("id,name,status,is_open,delivery_mode,own_driver_available")
      .order("created_at", { ascending: false });
    if (error) return toast.error("Não foi possível carregar suas lojas.");
    setStores((data ?? []) as unknown as Store[]);
    const { data: dashboard, error: dashboardError } = await supabase.rpc("partner_command" as never, { p_action: "dashboard", p_payload: {} } as never);
    if (!dashboardError && dashboard) {
      const d = dashboard as unknown as { offers?: Offer[]; requests?: Request[] };
      setOffers(d.offers ?? []);
      setRequests(d.requests ?? []);
    }
  };

  useEffect(() => { void load(); }, []);

  const saveDelivery = async (store: Store) => {
    setSaving(store.id);
    const { error } = await supabase.rpc("partner_set_delivery_availability" as never, {
      p_store_id: store.id,
      p_delivery_mode: store.delivery_mode,
      p_own_driver_available: store.own_driver_available,
    } as never);
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Disponibilidade de entrega atualizada.");
    void load();
  };

  const command = async (action: string, payload: Record<string, unknown>, success: string) => {
    setSaving(String(payload.request_id ?? action));
    const { data, error } = await supabase.rpc("partner_command" as never, { p_action: action, p_payload: payload } as never);
    setSaving(null);
    if (error) return toast.error(error.message);
    const result = data as unknown as { error?: string };
    if (result?.error) return toast.error(result.error);
    toast.success(success);
    await load();
  };

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Operação do revendedor</h1>
          <p className="text-muted-foreground">Controle como cada loja atende as entregas locais.</p>
        </div>
        {offers.length > 0 && <section className="space-y-3">
          <h2 className="text-xl font-semibold">Novas entregas na sua região</h2>
          {offers.map((offer) => <Card key={offer.id}><CardContent className="py-5 space-y-3">
            <div className="flex flex-wrap justify-between gap-2"><strong>{offer.city}</strong><span>{Number(offer.distance_km).toFixed(1)} km</span></div>
            <p className="text-sm text-muted-foreground">{offer.items.map((i) => `${i.qty}x ${i.name}`).join(" • ")}</p>
            <div className="flex gap-2"><Button onClick={() => void command("accept", { request_id: offer.id }, "Pedido aceito. Informe a rota para calcular a entrega.")}>Aceitar</Button>
            <Button variant="outline" onClick={() => void command("decline", { request_id: offer.id }, "Oferta recusada.")}>Recusar</Button></div>
          </CardContent></Card>)}
        </section>}

        {requests.filter((r) => ["accepted","quoted","paid","delivering"].includes(r.status)).length > 0 && <section className="space-y-3">
          <h2 className="text-xl font-semibold">Pedidos em operação</h2>
          {requests.filter((r) => ["accepted","quoted","paid","delivering"].includes(r.status)).map((r) => <Card key={r.id}><CardContent className="py-5 space-y-4">
            <div className="flex flex-wrap justify-between gap-2"><strong>{r.store_name ?? "Loja"}</strong><span>{r.order_code ?? r.status}</span></div>
            <p className="text-sm">{r.items?.map((i) => `${i.qty}x ${i.name}`).join(" • ")}</p>
            {r.status === "accepted" && <div className="grid gap-2 md:grid-cols-4">
              <input className="h-10 rounded-md border bg-background px-3" placeholder="Rota km" inputMode="decimal" value={routeKm[r.id] ?? ""} onChange={(e) => setRouteKm((x) => ({...x,[r.id]:e.target.value}))} />
              <input className="h-10 rounded-md border bg-background px-3" placeholder="Peso kg" inputMode="decimal" value={weightKg[r.id] ?? ""} onChange={(e) => setWeightKg((x) => ({...x,[r.id]:e.target.value}))} />
              <input className="h-10 rounded-md border bg-background px-3" placeholder="Prazo min" inputMode="numeric" value={eta[r.id] ?? ""} onChange={(e) => setEta((x) => ({...x,[r.id]:e.target.value}))} />
              <Button onClick={() => void command("quote", { request_id:r.id, route_km:Number(routeKm[r.id]), weight_kg:Number(weightKg[r.id]), eta_minutes:Number(eta[r.id]) }, "Frete calculado e enviado ao cliente.")}>Calcular entrega</Button>
            </div>}
            {r.status === "quoted" && <p className="font-medium">Frete calculado: R$ {Number(r.shipping ?? 0).toFixed(2).replace(".", ",")} • aguardando cliente/pagamento</p>}
            {r.status === "paid" && <Button onClick={() => void command("dispatch", { request_id:r.id }, "Pedido saiu para entrega.")}>Saiu para entrega</Button>}
            {r.status === "delivering" && <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Confirme presencialmente a maioridade do recebedor e peça o código de entrega exibido ao cliente.</p>
              <div className="flex gap-2">
                <input className="h-10 flex-1 rounded-md border bg-background px-3 uppercase" placeholder="Código do cliente" maxLength={8} value={deliveryCode[r.id] ?? ""} onChange={(e) => setDeliveryCode((x) => ({...x,[r.id]:e.target.value.toUpperCase()}))} />
                <Button disabled={(deliveryCode[r.id] ?? "").length < 4 || saving === r.id} onClick={() => void command("deliver", { request_id:r.id, code:deliveryCode[r.id], adult_verified:true }, "Entrega confirmada e estoque baixado.")}>Confirmar entrega</Button>
              </div>
            </div>}
          </CardContent></Card>)}
        </section>}

        {stores.length === 0 && <Card><CardContent className="py-8">Nenhuma loja vinculada à sua conta.</CardContent></Card>}
        {stores.map((store) => (
          <Card key={store.id}>
            <CardHeader><CardTitle>{store.name}</CardTitle></CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Modalidade de entrega</Label>
                <Select value={store.delivery_mode} onValueChange={(value: Store["delivery_mode"]) =>
                  setStores((prev) => prev.map((s) => s.id === store.id ? { ...s, delivery_mode: value, own_driver_available: value === "third_party" ? false : s.own_driver_available } : s))
                }>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Entregador próprio</SelectItem>
                    <SelectItem value="third_party">Entregador terceirizado</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div><Label>Motoqueiro disponível agora</Label><p className="text-sm text-muted-foreground">Prioriza entrega própria quando disponível.</p></div>
                <Switch disabled={store.delivery_mode === "third_party"} checked={store.own_driver_available}
                  onCheckedChange={(checked) => setStores((prev) => prev.map((s) => s.id === store.id ? { ...s, own_driver_available: checked } : s))} />
              </div>
              <div className="md:col-span-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cadastro: {store.status}</span>
                <Button disabled={saving === store.id} onClick={() => void saveDelivery(store)}>
                  {saving === store.id ? "Salvando..." : "Salvar operação"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
