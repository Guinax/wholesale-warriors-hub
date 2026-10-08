import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { toast } from "@/hooks/use-toast";

interface Review {
  id: string;
  reseller_name: string;
  city: string;
  rating: number;
  comment: string;
  product_name: string | null;
  created_at: string;
}

const Stars = ({ value, size = "w-4 h-4" }: { value: number; size?: string }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`${size} ${
          n <= value ? "fill-primary text-primary" : "text-muted-foreground/30"
        }`}
      />
    ))}
  </div>
);

const Avaliacoes = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Avaliações — Adega Maromba";
    supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
        else setReviews(data ?? []);
        setLoading(false);
      });
  }, []);

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const distribution = useMemo(() => {
    const d = [0, 0, 0, 0, 0];
    reviews.forEach((r) => d[r.rating - 1]++);
    return d;
  }, [reviews]);

  const filtered = filter ? reviews.filter((r) => r.rating === filter) : reviews;

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        eyebrow="A FAMÍLIA APROVA"
        title="AVALIAÇÕES"
        subtitle="O que os revendedores e distribuidores autorizados estão dizendo sobre nossos produtos e atendimento."
      />

      <main className="container py-6 space-y-6">
        {/* Resumo */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <p className="font-heading font-black text-5xl text-foreground">
                {avg.toFixed(1)}
              </p>
              <Stars value={Math.round(avg)} size="w-5 h-5" />
              <p className="text-[10px] font-heading tracking-widest text-muted-foreground mt-1">
                {reviews.length} AVALIAÇÕES
              </p>
            </div>

            <div className="flex-1 min-w-[200px] space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star - 1];
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <button
                    key={star}
                    onClick={() => setFilter(filter === star ? null : star)}
                    className={`w-full flex items-center gap-2 group ${
                      filter === star ? "opacity-100" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <span className="text-xs font-heading font-bold text-foreground w-3">
                      {star}
                    </span>
                    <Star className="w-3 h-3 fill-primary text-primary" />
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-6 text-right">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {filter && (
            <button
              onClick={() => setFilter(null)}
              className="text-[10px] font-heading tracking-widest text-primary hover:underline"
            >
              LIMPAR FILTRO ({filter}★)
            </button>
          )}
        </section>

        {/* Lista */}
        <section className="space-y-3">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-12">Carregando depoimentos...</p>
          )}

          {filtered.map((r) => (
            <article key={r.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    {r.reseller_name}
                  </h3>
                  <p className="text-[10px] font-heading tracking-widest text-muted-foreground mt-0.5">
                    {r.city}
                  </p>
                </div>
                <Stars value={r.rating} />
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed italic">"{r.comment}"</p>
              {r.product_name && (
                <p className="text-[10px] font-heading font-bold tracking-widest text-primary border-t border-border pt-2">
                  ✓ {r.product_name}
                </p>
              )}
            </article>
          ))}

          {!loading && !filtered.length && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma avaliação com esse filtro.
            </p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Avaliacoes;
