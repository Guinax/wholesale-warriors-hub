import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/orderUtils";
import { Bike, RefreshCw, Store as StoreIcon, WalletCards } from "lucide-react";

type Store = { id: string; name: string; status: string };
type Courier = { id: string; courier_code: string; full_name: string; status: string };
type PartnerCredit = { store_id: string; amount: number; paid_amount: number; status: string; available_at: string | null };
type CourierCredit = { courier_id: string; amount: number; paid_amount: number; status: string };

type Wallet = {
  key: string;
  id: string;
  label: string;
  type: "store" | "courier";
  status: string;
  earned: number;
  paid: number;
  held: number;
  available: number;
  courierCode?: string;
};

function WalletGroup({ wallets, emptyLabel }: { wallets: Wallet[]; emptyLabel: string }) {
  if (wallets.length === 0) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">{emptyLabel}</Card>;
  }
  const availableTotal = wallets.reduce((sum, wallet) => sum + wallet.available, 0);
  const earnedTotal = wallets.reduce((sum, wallet) => sum + wallet.earned, 0);
  const paidTotal = wallets.reduce((sum, wallet) => sum + wallet.paid, 0);
  const heldTotal = wallets.reduce((sum, wallet) => sum + wallet.held, 0);

  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Carteiras</p>
        <p className="text-xl font-bold">{wallets.length}</p>
      </Card>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Saldo disponível</p>
        <p className="text-xl font-bold">{formatCurrency(availableTotal)}</p>
      </Card>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Total já pago</p>
        <p className="text-xl font-bold">{formatCurrency(paidTotal)}</p>
      </Card>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground">Total retido</p>
        <p className="text-xl font-bold">{formatCurrency(heldTotal)}</p>
      </Card>
    </div>
    <p className="text-xs text-muted-foreground">Créditos gerados neste grupo: {formatCurrency(earnedTotal)}. Valores não são misturados com a outra aba.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {wallets.map((wallet) => (
        <Card key={wallet.key} className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-semibold">
                {wallet.type === "store" ? <StoreIcon className="h-4 w-4 shrink-0" /> : <Bike className="h-4 w-4 shrink-0" />}
                <span className="break-words">{wallet.label}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{wallet.type === "store" ? "ID da loja" : "ID do entregador"}: <code className="select-all break-all">{wallet.id}</code></p>
              {wallet.courierCode && <p className="text-xs text-muted-foreground">Código do entregador: {wallet.courierCode}</p>}
            </div>
            <Badge variant="outline">{wallet.type === "store" ? "Loja parceira" : "Motoqueiro"}</Badge>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Saldo disponível</div>
            <div className="text-2xl font-black">{formatCurrency(wallet.available)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-md border p-2"><span className="text-muted-foreground">Total gerado</span><div className="font-semibold">{formatCurrency(wallet.earned)}</div></div>
            <div className="rounded-md border p-2"><span className="text-muted-foreground">Total pago</span><div className="font-semibold">{formatCurrency(wallet.paid)}</div></div>
            <div className="rounded-md border p-2"><span className="text-muted-foreground">Retido</span><div className="font-semibold">{formatCurrency(wallet.held)}</div></div>
          </div>
          <div className="text-xs text-muted-foreground">Situação do cadastro: {wallet.status}</div>
        </Card>
      ))}
    </div>
  </div>;
}

export default function PayoutsManager() {
  const [stores, setStores] = useState<Store[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [partnerCredits, setPartnerCredits] = useState<PartnerCredit[]>([]);
  const [courierCredits, setCourierCredits] = useState<CourierCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [storesResult, couriersResult, partnerResult, courierResult] = await Promise.all([
      supabase.from("partner_stores" as never).select("id,name,status"),
      supabase.from("courier_profiles" as never).select("id,courier_code,full_name,status"),
      supabase.from("partner_payouts" as never).select("store_id,amount,paid_amount,status,available_at"),
      supabase.from("courier_payouts" as never).select("courier_id,amount,paid_amount,status"),
    ]);
    setLoading(false);
    const failure = [storesResult, couriersResult, partnerResult, courierResult].find((result) => result.error)?.error;
    if (failure) {
      setError(true);
      toast.error("Não foi possível carregar todas as carteiras.", { description: failure.message });
      return;
    }
    setError(false);
    setStores((storesResult.data ?? []) as unknown as Store[]);
    setCouriers((couriersResult.data ?? []) as unknown as Courier[]);
    setPartnerCredits((partnerResult.data ?? []) as unknown as PartnerCredit[]);
    setCourierCredits((courierResult.data ?? []) as unknown as CourierCredit[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const wallets = useMemo(() => {
    const now = Date.now();
    const storeWallets: Wallet[] = stores.map((store) => {
      const credits = partnerCredits.filter((credit) => credit.store_id === store.id && credit.status !== "cancelled");
      const earned = credits.reduce((sum, credit) => sum + Number(credit.amount || 0), 0);
      const paid = credits.reduce((sum, credit) => sum + Number(credit.paid_amount || 0), 0);
      const held = credits.reduce((sum, credit) => {
        const due = credit.available_at ? new Date(credit.available_at).getTime() : 0;
        return sum + (due > now ? Math.max(0, Number(credit.amount || 0) - Number(credit.paid_amount || 0)) : 0);
      }, 0);
      return {
        key: `store:${store.id}`, id: store.id, label: store.name?.trim() || "Loja sem nome",
        type: "store" as const, status: store.status, earned, paid, held,
        available: Math.max(0, earned - paid - held),
      };
    });
    const courierWallets: Wallet[] = couriers.map((courier) => {
      const credits = courierCredits.filter((credit) => credit.courier_id === courier.id && credit.status !== "cancelled");
      const earned = credits.reduce((sum, credit) => sum + Number(credit.amount || 0), 0);
      const paid = credits.reduce((sum, credit) => sum + Number(credit.paid_amount || 0), 0);
      return {
        key: `courier:${courier.id}`, id: courier.id,
        label: courier.full_name?.trim() || "Entregador sem nome",
        type: "courier" as const, status: courier.status,
        courierCode: courier.courier_code, earned, paid, held: 0,
        available: Math.max(0, earned - paid),
      };
    });
    return [...storeWallets, ...courierWallets].sort((a, b) =>
      a.label.localeCompare(b.label, "pt-BR") || a.key.localeCompare(b.key)
    );
  }, [stores, couriers, partnerCredits, courierCredits]);

  const partnerWallets = wallets.filter((wallet) => wallet.type === "store");
  const motorcycleWallets = wallets.filter((wallet) => wallet.type === "courier");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold"><WalletCards className="h-5 w-5" /> Carteiras</h2>
          <p className="text-sm text-muted-foreground">Lojas parceiras e motoqueiros em áreas separadas, com saldo, nome e ID próprio. Esta é uma página de consulta; não efetua pagamentos.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="partners" className="flex flex-wrap items-center justify-center gap-2 py-3 text-xs sm:text-sm">
            <StoreIcon className="h-4 w-4 shrink-0" /> Parceiros ({stores.length})
          </TabsTrigger>
          <TabsTrigger value="couriers" className="flex flex-wrap items-center justify-center gap-2 py-3 text-xs sm:text-sm">
            <Bike className="h-4 w-4 shrink-0" /> Motoqueiros ({couriers.length})
          </TabsTrigger>
        </TabsList>
        {error && <Card role="alert" className="p-6 text-sm text-destructive">Falha ao consultar cadastros ou saldos. Atualize para tentar novamente; nenhum saldo foi presumido como zero.</Card>}
        {!error && loading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando carteiras...</Card>}
        {!error && !loading && (
          <>
            <TabsContent value="partners" className="mt-0">
              <WalletGroup wallets={partnerWallets} emptyLabel="Nenhuma carteira de loja parceira cadastrada." />
            </TabsContent>
            <TabsContent value="couriers" className="mt-0 space-y-3">
              <p className="text-xs text-muted-foreground">Pagamentos e saques de entregadores continuam disponíveis em Admin → Entregadores.</p>
              <WalletGroup wallets={motorcycleWallets} emptyLabel="Nenhuma carteira de motoqueiro cadastrada." />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
