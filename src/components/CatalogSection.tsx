import { Grid3X3, List } from "lucide-react";
import ProductCard from "./ProductCard";

const products = [
  {
    badge: "CIMED EDITION",
    name: "MONSTER WHEY 2KG",
    unitPrice: "R$ 249,00",
    wholesalePrice: "R$ 145,00",
    minQty: 12,
  },
  {
    badge: "NEW RELEASE",
    badgeColor: "bg-success",
    name: "PRE-WORKOUT VOLTAGE",
    unitPrice: "R$ 189,00",
    wholesalePrice: "R$ 98,00",
    minQty: 20,
  },
  {
    name: "CREATINE PURE 500G",
    unitPrice: "R$ 120,00",
    wholesalePrice: "R$ 65,00",
    minQty: 15,
  },
  {
    name: 'OVERSIZED "NO PAIN"',
    unitPrice: "R$ 139,00",
    wholesalePrice: "R$ 72,00",
    minQty: 10,
  },
];

const CatalogSection = () => {
  return (
    <section className="py-6">
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
            <button className="p-1.5 rounded-md bg-muted">
              <Grid3X3 className="w-4 h-4 text-foreground" />
            </button>
            <button className="p-1.5 rounded-md">
              <List className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {products.map((product) => (
            <ProductCard key={product.name} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CatalogSection;
