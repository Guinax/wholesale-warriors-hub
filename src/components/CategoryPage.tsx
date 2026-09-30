import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import { useEffect, useState } from "react";
import { Grid3X3, List } from "lucide-react";

export interface CategoryProduct {
  productId?: string;
  badge?: string;
  badgeColor?: string;
  name: string;
  unitPrice: string;
  wholesalePrice: string;
  minQty: number;
  stock?: number;
  image?: string;
}

interface CategoryPageProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  products: CategoryProduct[];
  docTitle: string;
}

const CategoryPage = ({ eyebrow, title, subtitle, products, docTitle }: CategoryPageProps) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    document.title = docTitle;
  }, [docTitle]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <main className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-heading font-semibold tracking-widest text-muted-foreground">
            {products.length} PRODUTOS
          </p>
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-muted" : ""}`}
              aria-label="Visualizar em grade"
            >
              <Grid3X3 className={`w-4 h-4 ${viewMode === "grid" ? "text-foreground" : "text-muted-foreground"}`} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-muted" : ""}`}
              aria-label="Visualizar em lista"
            >
              <List className={`w-4 h-4 ${viewMode === "list" ? "text-foreground" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-sm text-muted-foreground">Em breve novos produtos nesta categoria.</p>
          </div>
        ) : (
          <div className={viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 gap-3"
            : "flex flex-col gap-3"
          }>
            {products.map((p) => (
              <ProductCard key={p.name} {...p} viewMode={viewMode} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CategoryPage;
