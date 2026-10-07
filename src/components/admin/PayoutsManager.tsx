import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/orderUtils";
import { ReceiptText, Upload, WalletCards } from "lucide-react";

type Payout = {
  id: string;
  request_id: string;
  store_id: string;
  amount: number;
  paid_amount: number;
  status: string;
  approved_at: string | null;
  paid_at: string | null;
};

type Store = { id: string; name: string };
type Account = { store_id: string; pix_key_type: string; pix_key: string; holder_name: string; holder_document: string };
type WalletPayment = {
  id: string;
  store_id: string;
  amount: number;
  receipt_url: string;
  receipt_reference: string | null;
  paid_at: string;
};

type Draft = { amount: string; receipt: File | null; reference: string };

const safeFileName = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100);

export default function PayoutsManager() {
  const [rows, setRows] = useState<Payout[]>([]);
  const [stores, setStores] = useState<Record<string, Store>>({});
  const [accounts, setAccounts] = useState<Record<string, Account>>({});
  const [payments, setPayments] = useState<WalletPayment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ data, error }, { data: sd }, { data: ad }, { data: wp }] = await Promise.all([
      supabase
        .from("partner_payouts" as never)
        .select("id,request_id,store_id,amount,paid_amount,status,approved_at,paid_at")
        .order("created_at", { ascending: true }),
      supabase.from("partner_stores" as never).select("id,name"),
      supabase.from("partner_payout_accounts" as never).select("store_id,pix_key_type,pix_key,holder_name,holder_document"),
      supabase
        .from("partner_wallet_payments" as never)
        .select("id,store_id,amount,receipt_url,receipt_reference,paid_at")
        .order("paid_at", { ascending: false }),
    ]);

    if (error) toast.error("Erro ao carregar carteiras.");
    else setRows((data ?? []) as unknown as Payout[]);

    setStores(Object.fromEntries(((sd ?? []) as unknown as Store[]).map((x) => [x.id, x])));
    setAccounts(Object.fromEntries(((ad ?? []) as unknown as Account[]).map((x) => [x.store_id, x])));
    setPayments((wp ?? []) as unknown as WalletPayment[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const walletRows = useMemo(() => {
    const ids = new Set(rows.map((p) => p.store_id));
    return [...ids].map((storeId) => {
      const credits = rows.filter((p) => p.store_id === storeId);
      const earned = credits.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const paid = credits.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
      const available = Math.max(0, earned - paid);
      return { storeId, earned, paid, available, credits };
    }).sort((a, b) => b.available - a.available);
  }, [rows]);

  const setDraft = (storeId: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [storeId]: { amount: "", receipt: null, reference: "", ...current[storeId], ...patch },
    }));
  };

  const payWallet = async (storeId: string, available: number) => {
    const draft = drafts[storeId] ?? { amount: "", receipt: null, reference: "" };
    const amount = Number(draft.amount.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Informe o valor do PIX.");
    if (amount > available + 0.001) return toast.error("O valor não pode ultrapassar o saldo disponível.");
    if (!draft.receipt) return toast.error("Anexe a imagem ou PDF do comprovante PIX.");
    if (draft.receipt.size > 8 * 1024 * 1024) return toast.error("O comprovante deve ter no máximo 8 MB.");
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(draft.receipt.type)) {
      return toast.error("Use comprovante JPG, PNG, WebP ou PDF.");
    }

    setBusy(storeId);
    let uploadedPath: string | null = null;
    try {
      const filename = safeFileName(draft.receipt.name || "comprovante");
      uploadedPath = `wallet-receipts/${storeId}/${Date.now()}-${filename}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(uploadedPath, draft.receipt, {
          cacheControl: "3600",
          upsert: false,
          contentType: draft.receipt.type,
        });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("media").getPublicUrl(uploadedPath);
      const { data, error } = await supabase.rpc("admin_partner_wallet_pay" as never, {
        p_store_id: storeId,
        p_amount: Math.round(amount * 100) / 100,
        p_receipt_url: publicData.publicUrl,
        p_receipt_reference: draft.reference.trim() || filename,
      } as never);

      if (error) throw error;
      const result = data as unknown as { available_balance?: number; paid_at?: string };
      toast.success(
        `PIX registrado. Saldo restante: ${formatCurrency(Number(result?.available_balance ?? Math.max(0, available - amount)))}.`
      );
      setDrafts((current) => ({ ...current, [storeId]: { amount: "", receipt: null, reference: "" } }));
      await load();
    } catch (error) {
      if (uploadedPath) await supabase.storage.from("media").remove([uploadedPath]);
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar o pagamento.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold"><WalletCards className="h-5 w-5" /> Carteiras dos parceiros</h2>
        <p className="text-sm text-muted-foreground">
          Cada entrega concluída acumula saldo. Faça o PIX manualmente, anexe o comprovante e confirme a baixa no saldo.
        </p>
      </div>

      {walletRows.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum saldo de parceiro disponível.</Card>
      )}

      {walletRows.map(({ storeId, earned, paid, available }) => {
        const account = accounts[storeId];
        const draft = drafts[storeId] ?? { amount: "", receipt: null, reference: "" };
        const history = payments.filter((payment) => payment.store_id === storeId);

        return (
          <Card key={storeId} className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{stores[storeId]?.name ?? "Loja parceira"}</div>
                <div className="mt-1 text-2xl font-black">{formatCurrency(available)}</div>
                <div className="text-xs text-muted-foreground">Saldo disponível para PIX</div>
              </div>
              <Badge variant={available > 0 ? "default" : "outline"}>{available > 0 ? "COM SALDO" : "QUITADO"}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Total gerado</div><strong>{formatCurrency(earned)}</strong></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Total pago</div><strong>{formatCurrency(paid)}</strong></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">A pagar</div><strong>{formatCurrency(available)}</strong></div>
            </div>

            {account ? (
              <div className="rounded-md border p-3 text-sm">
                <strong>Destino PIX:</strong> {account.pix_key_type.toUpperCase()} • {account.pix_key}<br />
                <span className="text-muted-foreground">{account.holder_name} • {account.holder_document}</span>
              </div>
            ) : (
              <p className="text-sm text-destructive">Conta PIX ainda não cadastrada pelo parceiro.</p>
            )}

            {available > 0 && account && (
              <div className="space-y-2 rounded-lg border p-3">
                <div className="grid gap-2 md:grid-cols-[180px_1fr]">
                  <div>
                    <label className="mb-1 block text-xs font-medium">Valor do PIX</label>
                    <Input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={draft.amount}
                      onChange={(e) => setDraft(storeId, { amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Referência/ID do PIX (opcional)</label>
                    <Input
                      placeholder="Ex.: E2E, NSU ou identificação do banco"
                      value={draft.reference}
                      onChange={(e) => setDraft(storeId, { reference: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => setDraft(storeId, { amount: available.toFixed(2).replace(".", ",") })}>
                    Usar saldo total
                  </Button>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                    <Upload className="h-4 w-4" />
                    {draft.receipt ? draft.receipt.name : "Anexar comprovante"}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => setDraft(storeId, { receipt: e.target.files?.[0] ?? null })}
                    />
                  </label>
                  <Button disabled={busy === storeId || !draft.receipt} onClick={() => void payWallet(storeId, available)}>
                    {busy === storeId ? "Registrando..." : "Confirmar PIX e dar baixa"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A data e a hora da baixa são registradas pelo servidor junto com o comprovante. Pagamentos parciais mantêm o saldo restante na carteira.
                </p>
              </div>
            )}

            {history.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Histórico de pagamentos</div>
                {history.slice(0, 6).map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                    <div>
                      <strong>{formatCurrency(Number(payment.amount))}</strong>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payment.paid_at).toLocaleString("pt-BR")}
                        {payment.receipt_reference ? ` • ${payment.receipt_reference}` : ""}
                      </div>
                    </div>
                    <a className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" href={payment.receipt_url} target="_blank" rel="noreferrer">
                      <ReceiptText className="h-4 w-4" /> Ver comprovante
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
