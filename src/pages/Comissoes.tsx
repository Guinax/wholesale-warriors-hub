import { useEffect, useMemo, useState } from "react";
import { Calculator, Crown, Gem, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { toast } from "@/hooks/use-toast";

interface Tier {
  id: string;
  label: string;
  min_order: number;
  max_order: number | null;
  commission_pct: number;
  perks: string | null;
  sort_order: number;
}

const tierIcon = (label: string) => {
  if (label === "ELITE") return Crown;
  if (label === "PARCEIRO") return Gem;
  return Sparkles;
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Comissoes = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderValue, setOrderValue] = useState<number>(5000);

  useEffect(() => {
    document.title = "Margem de Comissão — Família Maromba";
    supabase
      .from("commission_tiers")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error)
          toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
        else setTiers(data ?? []);
        setLoading(false);
      });
  }, []);

  const currentTier = useMemo(() => {
    return tiers.find(
      (t) =>
        orderValue >= Number(t.min_order) &&
        (t.max_order == null || orderValue <= Number(t.max_order))
    );
  }, [tiers, orderValue]);

  const commission = currentTier
    ? (orderValue * Number(currentTier.commission_pct)) / 100
    : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        eyebrow="PROGRAMA DE REVENDA"
        title="MARGEM DE COMISSÃO"
        subtitle="Quanto maior o lote, maior sua margem. Veja a faixa em que seu pedido se encaixa e simule seu lucro."
      />

      <main className="container py-6 space-y-8">
        {/* Calculadora */}
        <section className="bg-card border border-primary/30 rounded-2xl p-6 space-y-5 shadow-[0_0_30px_hsl(45_100%_50%/0.06)]">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-black text-base tracking-wider text-foreground">
              SIMULADOR DE LUCRO
            </h2>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-heading font-semibold tracking-widest text-muted-foreground">
              VALOR DO LOTE
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-heading font-bold text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                min={0}
                step={100}
                value={orderValue}
                onChange={(e) => setOrderValue(Number(e.target.value) || 0)}
                className="w-full bg-secondary border border-border rounded-lg pl-12 pr-4 py-4 font-heading font-black text-2xl text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <input
              type="range"
              min={0}
              max={30000}
              step={500}
              value={orderValue}
              onChange={(e) => setOrderValue(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-heading tracking-widest">
              <span>R$ 0</span>
              <span>R$ 30K</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-background rounded-xl p-4 border border-border">
              <p className="text-[10px] font-heading tracking-widest text-muted-foreground">
                FAIXA ATINGIDA
              </p>
              <p className="font-heading font-black text-lg text-foreground mt-1">
                {currentTier?.label ?? "—"}
              </p>
              <p className="text-xs text-primary font-heading font-bold mt-0.5">
                {currentTier ? `${currentTier.commission_pct}% margem` : "Mínimo R$ 2.500"}
              </p>
            </div>
            <div className="bg-primary text-primary-foreground rounded-xl p-4">
              <p className="text-[10px] font-heading tracking-widest opacity-80">
                LUCRO ESTIMADO
              </p>
              <p className="font-heading font-black text-2xl mt-1">{formatBRL(commission)}</p>
              <p className="text-[10px] font-heading font-bold mt-0.5 opacity-90">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                em cima de {formatBRL(orderValue)}
              </p>
            </div>
          </div>
        </section>

        {/* Tabela de faixas */}
        <section className="space-y-3">
          <h2 className="font-heading font-black text-base tracking-wider text-foreground">
            NÍVEIS DE PARCERIA
          </h2>

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando faixas...</p>
          )}

          {tiers.map((t) => {
            const Icon = tierIcon(t.label);
            const isCurrent = currentTier?.id === t.id;
            return (
              <article
                key={t.id}
                className={`relative bg-card border rounded-2xl p-5 space-y-3 transition-all ${
                  isCurrent
                    ? "border-primary shadow-[0_0_30px_hsl(45_100%_50%/0.15)]"
                    : "border-border"
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 right-4 bg-primary text-primary-foreground text-[9px] font-heading font-black tracking-widest px-2 py-1 rounded">
                    SUA FAIXA
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isCurrent ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-lg text-foreground">{t.label}</h3>
                      <p className="text-[10px] font-heading tracking-widest text-muted-foreground">
                        {formatBRL(Number(t.min_order))}
                        {t.max_order ? ` — ${formatBRL(Number(t.max_order))}` : "+"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-black text-3xl text-primary">
                      {Number(t.commission_pct).toFixed(0)}%
                    </p>
                    <p className="text-[9px] font-heading tracking-widest text-muted-foreground">
                      MARGEM
                    </p>
                  </div>
                </div>
                {t.perks && (
                  <p className="text-xs text-foreground/80 border-t border-border pt-3">
                    ✓ {t.perks}
                  </p>
                )}
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default Comissoes;
