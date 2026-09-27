import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Pill, Shirt, Dumbbell, Wrench, Wine, Apple } from "lucide-react";
import ProductsManager from "@/components/admin/ProductsManager";
import type { ProductCategory } from "@/hooks/useProducts";

const PAGES: { category: ProductCategory; label: string; path: string; icon: typeof Pill }[] = [
  { category: "suplementos", label: "Suplementos", path: "/suplementos", icon: Pill },
  { category: "roupas", label: "Roupas", path: "/roupas", icon: Shirt },
  { category: "acessorios", label: "Acessórios", path: "/acessorios", icon: Dumbbell },
  { category: "equipamento", label: "Equipamento", path: "/equipamento", icon: Wrench },
  { category: "bebidas", label: "Bebidas", path: "/bebidas", icon: Wine },
  { category: "alimentos", label: "Alimentar", path: "/alimentar", icon: Apple },
];

const PagesManager = () => {
  const [active, setActive] = useState<ProductCategory | null>(null);
  const page = PAGES.find((p) => p.category === active);

  if (page) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setActive(null)} aria-label="Voltar">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="font-heading font-bold tracking-wide text-sm">
              PÁGINA {page.label.toUpperCase()}
            </h2>
            <p className="text-xs text-muted-foreground">{page.path}</p>
          </div>
        </div>
        <ProductsManager lockedCategory={page.category} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {PAGES.map((p) => (
        <Card
          key={p.category}
          role="button"
          tabIndex={0}
          onClick={() => setActive(p.category)}
          onKeyDown={(e) => e.key === "Enter" && setActive(p.category)}
          className="p-4 flex items-center gap-3 cursor-pointer hover:border-primary/60 transition-colors"
        >
          <div className="p-2 rounded-lg bg-secondary">
            <p.icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{p.label}</p>
            <p className="text-xs text-muted-foreground">Editar produtos desta página</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Card>
      ))}
    </div>
  );
};

export default PagesManager;
