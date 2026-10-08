import { useEffect, useState } from "react";
import { Flame, ShoppingCart, TrendingUp, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

interface Bestseller {
  id: string;
  product_id: string;
  rank: number;
  name: string;
  image_url: string | null;
  units_sold: number;
  wholesale_price: number;
  unit_price: number;
  stock: number;
}

const MaisVendidos = () => {
  const [items, setItems] = useState<Bestseller[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    document.title = "Mais Vendidos — Adega Maromba";
    let active = true;

    (async () => {
      const { data: ranking, error } = await supabase
        .from("bestsellers")
        .select("id,rank,name,units_sold")
        .order("rank", { ascending: true });

      if (error) {
        if (active) {
          toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
          setLoading(false);
        }
        return;
      }

      const names = [...new Set((ranking ?? []).map((row) => row.name))];
      if (!names.length) {
        if (active) {
          setItems([]);
          setLoading(false);
        }
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id,name,image_url,unit_price,wholesale_price,stock,active")
        .in("name", names)
        .eq("active", true);

      if (productsError) {
        if (active) {
          toast({ title: "Erro ao carregar catálogo", description: productsError.message, variant: "destructive" });
          setLoading(false);
        }
        return;
      }

      const byName = new Map((products ?? []).map((product) => [product.name, product]));
      const merged = (ranking ?? []).flatMap((row) => {
        const product = byName.get(row.name);
        if (!product) return [];
        return [{
          id: row.id,
          product_id: product.id,
          rank: row.rank,
          name: product.name,
          image_url: product.image_url,
          units_sold: row.units_sold,
          wholesale_price: Number(product.wholesale_price),
          unit_price: Number(product.unit_price),
          stock: Number(product.stock ?? 0),
        }];
      });

      if (active) {
        setItems(merged);
        setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  const maxUnits = items[0]?.units_sold ?? 1;

  const handleAdd = (b: Bestseller) => {
    if (b.stock < 1) {
      toast({ title: "Produto indisponível", description: "Este item está sem estoque no momento.", variant: "destructive" });
      return;
    }
    addItem({
      productId: b.product_id,
      name: b.name,
      unitPrice: `R$ ${b.unit_price.toFixed(2).replace(".", ",")}`,
      wholesalePrice: `R$ ${b.wholesale_price.toFixed(2).replace(".", ",")}`,
      qty: 1,
      minQty: 1,
      stock: b.stock,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader
        eyebrow="RANKING OFICIAL"
        title="MAIS VENDIDOS"
        subtitle="Top 10 produtos do mês com base nas unidades enviadas para revendedores em todo o Brasil."
      />

      <main className="container py-6 space-y-3">
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-12">Carregando ranking...</p>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="font-heading font-bold text-sm text-foreground">RANKING EM FORMAÇÃO</p>
            <p className="text-xs text-muted-foreground mt-2">Ainda não há vendas suficientes neste período para montar o ranking.</p>
          </div>
        )}

        {items.map((b) => {
          const isPodium = b.rank <= 3;
          const podiumIcon =
            b.rank === 1 ? <Trophy className="w-5 h-5" /> : <Flame className="w-5 h-5" />;
          const pct = Math.round((b.units_sold / maxUnits) * 100);

          return (
            <article
              key={b.id}
              className={`bg-card rounded-2xl border overflow-hidden transition-all ${
                isPodium
                  ? "border-primary/40 shadow-[0_0_30px_hsl(45_100%_50%/0.08)]"
                  : "border-border"
              }`}
            >
              <div className="flex items-stretch">
                <div
                  className={`flex flex-col items-center justify-center w-16 shrink-0 ${
                    isPodium ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {isPodium && podiumIcon}
                  <span className="font-heading font-black text-2xl">#{b.rank}</span>
                </div>

                <div className="relative w-24 sm:w-32 shrink-0 bg-gradient-to-br from-secondary to-surface-elevated">
                  {b.image_url ? (
                    <img
                      src={b.image_url}
                      alt={b.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-muted/30" />
                    </div>
                  )}
                </div>

                <div className="flex-1 p-3 sm:p-4 space-y-2 min-w-0">
                  <h2 className="font-heading font-bold text-sm sm:text-base text-foreground truncate">
                    {b.name}
                  </h2>

                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="font-heading font-bold text-foreground">
                      {b.units_sold.toLocaleString("pt-BR")}
                    </span>
                    <span className="text-muted-foreground">un. vendidas</span>
                  </div>

                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        Unitário R$ {b.unit_price.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="font-heading font-black text-base text-foreground">
                        R$ {b.wholesale_price.toFixed(2).replace(".", ",")}
                        <span className="text-[10px] font-semibold text-muted-foreground ml-1">
                          /un (atacado 6+)
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleAdd(b)}
                      disabled={b.stock < 1}
                      className="bg-primary text-primary-foreground rounded-lg p-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={b.stock < 1 ? "Produto indisponível" : "Adicionar ao lote"}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
};

export default MaisVendidos;
