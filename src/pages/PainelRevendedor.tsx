import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

  const load = async () => {
    const { data, error } = await supabase
      .from("partner_stores" as never)
      .select("id,name,status,is_open,delivery_mode,own_driver_available")
      .order("created_at", { ascending: false });
    if (error) return toast.error("Não foi possível carregar suas lojas.");
    setStores((data ?? []) as unknown as Store[]);
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

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Operação do revendedor</h1>
          <p className="text-muted-foreground">Controle como cada loja atende as entregas locais.</p>
        </div>
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
