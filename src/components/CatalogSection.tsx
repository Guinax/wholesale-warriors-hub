import { Grid3X3, List } from "lucide-react";
import { useState } from "react";
import ProductCard from "./ProductCard";
import iWantYou from "@/assets/i-want-you.jpeg";
import comboDrinks from "@/assets/combo-drinks.jpeg";
import productsHero from "@/assets/products-hero.jpeg";

const products = [
  {
    badge: "CIMED EDITION",
    name: "MONSTER WHEY 2KG",
    unitPrice: "R$ 249,00",
    wholesalePrice: "R$ 145,00",
    minQty: 12,
    image: productsHero,
  },
  {
    badge: "LANÇAMENTO",
    badgeColor: "bg-success",
    name: "I WANT YOU THERMOGÊNICO",
    unitPrice: "R$ 89,00",
    wholesalePrice: "R$ 49,00",
    minQty: 20,
    image: iWantYou,
  },
  {
    badge: "MAIS VENDIDO",
    badgeColor: "bg-destructive",
    name: "COMBO DRINKS MANSÃO",
    unitPrice: "R$ 15,90",
    wholesalePrice: "R$ 8,90",
    minQty: 24,
    image: comboDrinks,
  },
  {
    name: "CREATINE PURE 500G",
    unitPrice: "R$ 120,00",
    wholesalePrice: "R$ 65,00",
    minQty: 15,
  },
  {
    name: "PRE-WORKOUT VOLTAGE",
    unitPrice: "R$ 189,00",
    wholesalePrice: "R$ 98,00",
    minQty: 20,
  },
  {
    name: 'OVERSIZED "NO PAIN"',
    unitPrice: "R$ 139,00",
    wholesalePrice: "R$ 72,00",
    minQty: 10,
  },
];

const CatalogSection = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  return (
    <section id="catalogo" className="py-6 scroll-mt-20">
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading font-black text-lg tracking-wide text-foreground">
              CATÁLOGO VIGENTE
            </h2>
            <p className="text-xs text-primary font-heading font-semibold tracking-wider mt-1">
              ESTILO CIMED x MAROMBA
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

        <div className={viewMode === "grid"
          ? "grid grid-cols-2 md:grid-cols-3 gap-3"
          : "flex flex-col gap-3"
        }>
          {products.map((product) => (
            <ProductCard key={product.name} {...product} viewMode={viewMode} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CatalogSection;
