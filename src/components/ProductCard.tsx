import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  badge?: string;
  badgeColor?: string;
  name: string;
  unitPrice: string;
  wholesalePrice: string;
  minQty: number;
}

const ProductCard = ({ badge, badgeColor = "bg-primary", name, unitPrice, wholesalePrice, minQty }: ProductCardProps) => {
  const [qty, setQty] = useState(minQty);

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden group hover:border-primary/40 hover:shadow-[0_0_30px_hsl(45_100%_50%/0.08)] transition-all duration-300">
      {/* Image placeholder with gradient */}
      <div className="relative aspect-square bg-gradient-to-br from-secondary to-surface-elevated flex items-center justify-center overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-muted/30 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/50 to-transparent" />
        {badge && (
          <span className={`absolute top-3 left-3 ${badgeColor} text-primary-foreground text-[10px] font-heading font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md`}>
            {badge}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-heading font-bold text-sm tracking-wide text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground">
          Unidade individual: <span className="line-through">{unitPrice}</span>
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-heading font-semibold tracking-wider text-primary">
            ATACADO ({minQty}+ UN)
          </span>
          <span className="font-heading font-black text-xl text-foreground">{wholesalePrice}</span>
        </div>

        {/* Qty controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty(Math.max(minQty, qty - 1))}
            className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-heading font-bold text-sm text-foreground min-w-[2ch] text-center">
            {qty}
          </span>
          <button
            onClick={() => setQty(qty + 1)}
            className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-bold text-xs tracking-wider py-3 rounded-lg hover:opacity-90 transition-opacity hover:shadow-[0_0_20px_hsl(45_100%_50%/0.3)]">
          <ShoppingCart className="w-4 h-4" />
          ADICIONAR AO LOTE
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
