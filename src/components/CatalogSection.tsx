import { Grid3X3, List } from "lucide-react";
import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { toCategoryProduct, type DbProduct } from "@/hooks/useProducts";

const productsTable = () => supabase.from("products" as never);

const CatalogSection = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [items, setItems] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogTitle, setCatalogTitle] = useState("CATÁLOGO VIGENTE");
  const [catalogSubtitle, setCatalogSubtitle] = useState("ESTILO CIMED x MAROMBA");

  useEffect(() => {
    const load = async () => {
      const { data } = await productsTable()
        .select("*")
        .eq("active", true)
        .eq("in_catalog", true)
        .order("catalog_order", { ascending: true });
      setItems(((data ?? []) as unknown) as DbProduct[]);
      const { data: settings } = await supabase
        .from("catalog_settings")
        .select("title, subtitle")
        .eq("id", 1)
        .maybeSingle();
      if (settings) {
        setCatalogTitle(settings.title || "CATÁLOGO VIGENTE");
        setCatalogSubtitle(settings.subtitle || "ESTILO CIMED x MAROMBA");
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section id="catalogo" className="py-6 scroll-mt-20">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-black text-lg tracking-wide text-foreground">
              {catalogTitle}
            </h2>
            <p className="text-xs text-primary font-heading font-semibold tracking-wider mt-1">
              {catalogSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-muted" : ""}`}
            >
              <Grid3X3 className={`w-4 h-4 ${viewMode === "grid" ? "text-foreground" : "text-muted-foreground"}`} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-muted" : ""}`}
            >
              <List className={`w-4 h-4 ${viewMode === "list" ? "text-foreground" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-lg bg-secondary animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            O catálogo está sendo preparado. Volte em breve para conferir os produtos disponíveis.
          </p>
        ) : (
          <div className={viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 gap-3"
            : "flex flex-col gap-3"
          }>
            {items.map((p) => (
              <ProductCard key={p.id} {...toCategoryProduct(p)} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CatalogSection;
