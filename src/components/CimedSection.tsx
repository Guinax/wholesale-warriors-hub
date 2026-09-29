import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { useState } from "react";
import superCimedLinha from "@/assets/super-cimed-linha.jpeg";
import engovRessaliv from "@/assets/engov-ressaliv.jpeg";

interface CimedProduct {
  name: string;
  badge?: string;
  badgeColor?: string;
  unitPrice: string;
  wholesalePrice: string;
  minQty: number;
  image?: string;
  highlight?: boolean;
}

const cimedProducts: CimedProduct[] = [
  {
    badge: "🔥 MAIS VENDIDO",
    badgeColor: "bg-destructive",
    name: "ENGOV AFTER 250ML (CITRUS / TANGERINA)",
    unitPrice: "R$ 14,90",
    wholesalePrice: "R$ 7,90",
    minQty: 1,
    image: engovRessaliv,
    highlight: true,
  },
  {
    badge: "NOVA LINHA",
    badgeColor: "bg-success",
    name: "SUPER CIMED DESODORANTE 150ML (4 FRAGRÂNCIAS)",
    unitPrice: "R$ 24,90",
    wholesalePrice: "R$ 13,50",
    minQty: 1,
    image: superCimedLinha,
  },
  {
    badge: "CIMED ORAL",
    badgeColor: "bg-primary",
    name: "GEL DENTAL SUPER 12H 90G (KIT 3 SABORES)",
    unitPrice: "R$ 18,90",
    wholesalePrice: "R$ 9,80",
    minQty: 1,
    image: superCimedLinha,
  },
  {
    badge: "CIMED",
    badgeColor: "bg-success",
    name: "RESSALIV AFTER 250ML (LIMÃO / LARANJA)",
    unitPrice: "R$ 13,90",
    wholesalePrice: "R$ 7,50",
    minQty: 1,
    image: engovRessaliv,
  },
];

const CimedProductCard = ({ product }: { product: CimedProduct }) => {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({ name: product.name, unitPrice: product.unitPrice, wholesalePrice: product.wholesalePrice, qty, minQty: 1 });
    setQty(1);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden group hover:border-primary/40 hover:shadow-[0_0_30px_hsl(45_100%_50%/0.08)] transition-all duration-300">
      <div className="relative aspect-square bg-gradient-to-br from-secondary to-surface-elevated flex items-center justify-center overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-muted/30 group-hover:scale-110 transition-transform duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
        {product.badge && (
          <span className={`absolute top-2 left-2 ${product.badgeColor || "bg-primary"} text-primary-foreground text-[9px] font-heading font-bold tracking-wider px-2 py-0.5 rounded-md shadow-md`}>
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-heading font-bold text-xs tracking-wide text-foreground leading-tight line-clamp-2">{product.name}</h3>
        <p className="text-[10px] text-muted-foreground">
          Unitário: <span>{product.unitPrice}</span>
        </p>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[9px] font-heading font-semibold tracking-wider text-primary">
            ATACADO (6+)
          </span>
          <span className="font-heading font-black text-lg text-foreground">{qty >= 6 ? product.wholesalePrice : product.unitPrice}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors">
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-heading font-bold text-xs text-foreground min-w-[2ch] text-center">{qty}</span>
          <button onClick={() => setQty(qty + 1)} className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <button onClick={handleAdd} className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-heading font-bold text-[10px] tracking-wider py-2.5 rounded-lg hover:opacity-90 transition-opacity hover:shadow-[0_0_20px_hsl(45_100%_50%/0.3)]">
          <ShoppingCart className="w-3.5 h-3.5" />
          ADICIONAR
        </button>
      </div>
    </div>
  );
};

const CimedHighlightCard = ({ product }: { product: CimedProduct }) => {
  const { addItem } = useCart();
  const LOT_QTY = 7;
  const unitNum = parseFloat(
    product.wholesalePrice.replace("R$", "").replace(".", "").replace(",", ".").trim()
  );
  const totalNum = unitNum * LOT_QTY;
  const totalStr = `R$ ${totalNum.toFixed(2).replace(".", ",")}`;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border group col-span-2">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
      {product.image && (
        <img src={product.image} alt={product.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
      )}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 space-y-2">
        {product.badge && (
          <span className={`${product.badgeColor || "bg-primary"} text-primary-foreground text-[9px] font-heading font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md`}>
            {product.badge}
          </span>
        )}
        <h3 className="font-heading font-black text-base text-foreground">{product.name}</h3>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground">
              Lote c/ {LOT_QTY} sabores · {product.wholesalePrice}/un
            </p>
            <p className="font-heading font-black text-xl text-foreground">
              {totalStr}<span className="text-xs font-semibold text-muted-foreground">/lote</span>
            </p>
          </div>
          <button
            onClick={() =>
              addItem({
                name: `LOTE ${product.name} (${LOT_QTY} SABORES)`,
                unitPrice: totalStr,
                wholesalePrice: totalStr,
                qty: 1,
                minQty: 1,
              })
            }
            className="bg-primary text-primary-foreground font-heading font-black text-[10px] tracking-wider px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity glow-neon"
          >
            COMPRAR LOTE
          </button>
        </div>
      </div>
    </div>
  );
};

const CimedSection = () => {
  const highlighted = cimedProducts.filter((p) => p.highlight);
  const regular = cimedProducts.filter((p) => !p.highlight);

  return (
    <section className="py-8">
      <div className="container space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="text-center">
            <p className="text-[10px] font-heading font-semibold tracking-[0.3em] text-primary">
              PARCERIA EXCLUSIVA
            </p>
            <h2 className="font-heading font-black text-xl tracking-wide text-foreground">
              CIMED x MAROMBA
            </h2>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Highlight card spans full width */}
          {highlighted.map((p) => (
            <CimedHighlightCard key={p.name} product={p} />
          ))}
          {/* Regular product grid */}
          {regular.map((p) => (
            <CimedProductCard key={p.name} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CimedSection;
