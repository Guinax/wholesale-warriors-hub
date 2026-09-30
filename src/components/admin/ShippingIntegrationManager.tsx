import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logAudit } from "@/lib/audit";
import { RefreshCw, ExternalLink, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Status = {
  configured: boolean;
  connected: boolean;
  expires_at: string | null;
  refresh_expires_at: string | null;
  callback_url: string | null;
  environment: string;
};

const EXPECTED_CALLBACK = "https://svkatjljeyyuobayjqjv.supabase.co/functions/v1/melhor-envio-callback";

export default function ShippingIntegrationManager() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activeProducts, setActiveProducts] = useState(0);
  const [readyProducts, setReadyProducts] = useState(0);
  const [missingProducts, setMissingProducts] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTarget, setBulkTarget] = useState<"category" | "750ml" | "1l">("category");
  const [bulkWeight, setBulkWeight] = useState("");
  const [bulkWidth, setBulkWidth] = useState("");
  const [bulkHeight, setBulkHeight] = useState("");
  const [bulkLength, setBulkLength] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: products, error: productsError }] = await Promise.all([
      supabase.functions.invoke("melhor-envio-callback", { body: { action: "status" } }),
      supabase.from("products").select("name,category,weight_kg,width_cm,height_cm,length_cm").eq("active", true).order("name"),
    ]);
    setLoading(false);
    if (error) {
      toast.error("Não foi possível consultar a integração do Melhor Envio.");
      return;
    }
    setStatus(data as Status);
    if (!productsError) {
      const rows = (products ?? []) as Array<{name:string;category:string;weight_kg:number|null;width_cm:number|null;height_cm:number|null;length_cm:number|null}>;
      const ready = rows.filter((p) => [p.weight_kg,p.width_cm,p.height_cm,p.length_cm].every((v) => Number(v) > 0));
      const missing = rows.filter((p) => ![p.weight_kg,p.width_cm,p.height_cm,p.length_cm].every((v) => Number(v) > 0));
      setActiveProducts(rows.length);
      setReadyProducts(ready.length);
      setMissingProducts(missing.map((p) => p.name));
      const nextCategories = [...new Set(rows.map((p) => p.category).filter(Boolean))].sort((a,b) => a.localeCompare(b, "pt-BR"));
      setCategories(nextCategories);
      setBulkCategory((current) => current && nextCategories.includes(current) ? current : (nextCategories[0] ?? ""));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyBulkDimensions = async () => {
    const values = [bulkWeight, bulkWidth, bulkHeight, bulkLength].map(Number);
    if ((bulkTarget === "category" && !bulkCategory) || values.some((v) => !Number.isFinite(v) || v <= 0)) {
      toast.error("Selecione o alvo e informe peso/dimensões maiores que zero.");
      return;
    }

    let targetLabel = bulkCategory;
    let targetQuery = supabase
      .from("products")
      .select("id,name,weight_kg,width_cm,height_cm,length_cm")
      .eq("active", true);

    if (bulkTarget === "750ml") {
      targetLabel = "todas as garrafas 750 mL";
      targetQuery = targetQuery.ilike("name", "%750mL%");
    } else if (bulkTarget === "1l") {
      targetLabel = "todas as garrafas 1 L";
      targetQuery = targetQuery.ilike("name", "%1L%");
    } else {
      targetQuery = targetQuery.eq("category", bulkCategory);
    }

    const { data: targetRows, error: targetError } = await targetQuery;
    if (targetError) {
      toast.error("Não foi possível localizar os produtos: " + targetError.message);
      return;
    }

    const pending = (targetRows ?? []).filter((p) =>
      ![p.weight_kg, p.width_cm, p.height_cm, p.length_cm].every((v) => Number(v) > 0)
    );
    if (!pending.length) {
      toast.info("Todos os produtos desse grupo já possuem medidas completas.");
      return;
    }

    if (!confirm(`Aplicar estas medidas a ${pending.length} produto(s) pendente(s) de ${targetLabel}? Produtos já completos não serão alterados.`)) return;

    setSavingBulk(true);
    const [weight_kg, width_cm, height_cm, length_cm] = values;
    const { error } = await supabase
      .from("products")
      .update({ weight_kg, width_cm, height_cm, length_cm })
      .in("id", pending.map((p) => p.id));
    setSavingBulk(false);

    if (error) {
      toast.error("Não foi possível aplicar as medidas: " + error.message);
      return;
    }

    await logAudit("shipping_dimensions_bulk_updated", {
      entity: "products",
      details: {
        target: bulkTarget,
        category: bulkTarget === "category" ? bulkCategory : null,
        updated_products: pending.length,
        weight_kg,
        width_cm,
        height_cm,
        length_cm,
      },
    });
    toast.success(`Peso e dimensões aplicados a ${pending.length} produto(s).`);
    void load();
  };

  const connect = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("melhor-envio-callback", {
      body: { action: "start" },
    });
    setConnecting(false);
    if (error || !data?.authorization_url) {
      toast.error(data?.error ?? "Configure as credenciais do Melhor Envio no Supabase antes de conectar.");
      return;
    }
    const opened = window.open(String(data.authorization_url), "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = String(data.authorization_url);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold">Melhor Envio</h2>
              <p className="text-xs text-muted-foreground">
                Cotação real de frete para pedidos enviados pela central.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={status?.connected ? "default" : "secondary"}>
              {status?.connected ? "Conectado" : status?.configured ? "Aguardando autorização" : "Credenciais pendentes"}
            </Badge>
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Atualizar integração">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <div className="rounded-lg border p-3">
            <p className="text-[10px] text-muted-foreground">Produtos ativos</p>
            <p className="text-xl font-bold">{activeProducts}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] text-muted-foreground">Prontos para frete real</p>
            <p className="text-xl font-bold">{readyProducts}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[10px] text-muted-foreground">Medidas pendentes</p>
            <p className="text-xl font-bold">{Math.max(0, activeProducts - readyProducts)}</p>
          </div>
        </div>

        {missingProducts.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2">
            <p className="font-semibold">Produtos sem peso/dimensões</p>
            <p className="text-muted-foreground">Preencha esses dados em Admin → Produtos para habilitar cotação real:</p>
            <p>{missingProducts.slice(0, 8).join(", ")}{missingProducts.length > 8 ? ` e mais ${missingProducts.length - 8}` : ""}.</p>
          </div>
        )}

        <div className="rounded-lg border p-3 text-xs space-y-2">
          <p><strong>Callback do aplicativo:</strong></p>
          <p className="font-mono break-all">{status?.callback_url || EXPECTED_CALLBACK}</p>
          <p><strong>Ambiente:</strong> {status?.environment === "sandbox" ? "Sandbox" : "Produção"}</p>
          {status?.expires_at && <p><strong>Access token:</strong> válido até {new Date(status.expires_at).toLocaleString("pt-BR")}</p>}
          {status?.refresh_expires_at && <p><strong>Refresh token:</strong> válido até {new Date(status.refresh_expires_at).toLocaleString("pt-BR")}</p>}
        </div>

        {!status?.configured && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2">
            <p className="font-semibold">Faltam os secrets no Supabase:</p>
            <p className="font-mono break-all">MELHOR_ENVIO_CLIENT_ID</p>
            <p className="font-mono break-all">MELHOR_ENVIO_CLIENT_SECRET</p>
            <p className="font-mono break-all">MELHOR_ENVIO_USER_AGENT</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void connect()} disabled={connecting || !status?.configured}>
            <ExternalLink className="w-4 h-4" />
            {status?.connected ? "Reconectar Melhor Envio" : "Conectar Melhor Envio"}
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold">Preencher medidas em lote</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Use apenas quando os produtos da categoria compartilham a mesma embalagem física. Meça uma unidade real antes de aplicar.
          </p>
        </div>
        <div className="grid sm:grid-cols-5 gap-2">
          <div className="sm:col-span-2">
            <Label>Aplicar em</Label>
            <Select value={bulkTarget} onValueChange={(value) => setBulkTarget(value as "category" | "750ml" | "1l")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Categoria específica</SelectItem>
                <SelectItem value="750ml">Todas as garrafas 750 mL</SelectItem>
                <SelectItem value="1l">Todas as garrafas 1 L</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {bulkTarget === "category" && (
            <div className="sm:col-span-2">
              <Label>Categoria</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Peso (kg)</Label>
            <Input type="number" min="0.001" step="0.001" value={bulkWeight} onChange={(e) => setBulkWeight(e.target.value)} />
          </div>
          <div>
            <Label>Largura (cm)</Label>
            <Input type="number" min="0.1" step="0.1" value={bulkWidth} onChange={(e) => setBulkWidth(e.target.value)} />
          </div>
          <div>
            <Label>Altura (cm)</Label>
            <Input type="number" min="0.1" step="0.1" value={bulkHeight} onChange={(e) => setBulkHeight(e.target.value)} />
          </div>
          <div>
            <Label>Comprimento (cm)</Label>
            <Input type="number" min="0.1" step="0.1" value={bulkLength} onChange={(e) => setBulkLength(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => void applyBulkDimensions()} disabled={savingBulk || (bulkTarget === "category" && !bulkCategory)}>
          {savingBulk ? "Aplicando..." : "Aplicar à categoria"}
        </Button>
      </Card>

      <Card className="p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Access token e refresh token ficam em tabela privada e nunca são enviados ao navegador.</p>
          <p>Se o Melhor Envio ou as dimensões do produto não estiverem disponíveis, o checkout mantém automaticamente o frete regional atual.</p>
        </div>
      </Card>
    </div>
  );
}
