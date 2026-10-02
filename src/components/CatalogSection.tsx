import { Grid3X3, List } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { toCategoryProduct, type DbProduct } from "@/hooks/useProducts";

const productsTable = () => supabase.from("products" as never);

const CatalogSection = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [items, setItems] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogTitle, setCatalogTitle] = useState("CATÁLOGO VIGENTE");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const [{ data: products }, { data: settings }] = await Promise.all([
      productsTable()
        .select("*")
        .eq("active", true)
        .eq("in_catalog", true)
        .order("catalog_order", { ascending: true }),
      supabase
        .from("catalog_settings")
        .select("title, subtitle")
        .eq("id", 1)
        .maybeSingle(),
    ]);
    setItems(((products ?? []) as unknown) as DbProduct[]);
    if (settings) {
      setCatalogTitle(settings.title || "CATÁLOGO VIGENTE");
    }
    if (showLoading) setLoading(false);
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("home-catalog-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void load(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "catalog_settings" }, () => {
        void load(false);
      })
      .subscribe();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <section id="catalogo" className="py-6 scroll-mt-20">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-black text-lg tracking-wide text-foreground">
              {catalogTitle}
            </h2>
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
