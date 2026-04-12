import productsHero from "@/assets/products-hero.jpeg";
import { Flame, Star, TrendingUp } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const highlights = [
  { icon: Flame, label: "MAIS VENDIDO", value: "Whisky Combo" },
  { icon: Star, label: "AVALIAÇÃO", value: "4.9 ★★★★★" },
  { icon: TrendingUp, label: "MARGEM REVENDA", value: "até 68%" },
];

const FeaturedProducts = () => {
  const { addItem } = useCart();

    <section className="py-10">
      <div className="container space-y-6">
        <div className="text-center space-y-2">
          <p className="text-xs font-heading font-semibold tracking-[0.3em] text-primary">
            EM DESTAQUE
          </p>
          <h2 className="font-heading font-black text-2xl md:text-3xl text-foreground">
            COMBO DRINKS MANSÃO
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            A linha de bebidas que está explodindo nas academias e eventos fitness do Brasil.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2">
          {highlights.map((h) => (
            <div
              key={h.label}
              className="bg-card border border-border rounded-xl p-3 text-center space-y-1.5 hover:border-primary/30 transition-colors"
            >
              <h.icon className="w-5 h-5 text-primary mx-auto" />
              <p className="text-[9px] font-heading font-semibold tracking-widest text-muted-foreground">
                {h.label}
              </p>
              <p className="font-heading font-bold text-xs text-foreground">{h.value}</p>
            </div>
          ))}
        </div>

        {/* Large product showcase */}
        <div className="relative rounded-2xl overflow-hidden border border-border group">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
          <img
            src={productsHero}
            alt="Mansão Maromba Combo Drinks"
            className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            width={600}
            height={400}
          />
          <div className="absolute bottom-0 left-0 right-0 z-20 p-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {["Whisky Combo", "Vodka Combo", "Melancia Gin", "Whisky Combo Y"].map(
                (flavor) => (
                  <span
                    key={flavor}
                    className="bg-primary/20 border border-primary/30 text-primary text-[10px] font-heading font-bold tracking-wider px-3 py-1 rounded-full backdrop-blur-sm"
                  >
                    {flavor}
                  </span>
                )
              )}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">A partir de</p>
                <p className="font-heading font-black text-2xl text-foreground">
                  R$ 8,90<span className="text-sm font-semibold text-muted-foreground">/un</span>
                </p>
              </div>
              <button
                onClick={() => addItem({ name: "COMBO DRINKS PACK", wholesalePrice: "R$ 8,90", qty: 24, minQty: 24 })}
                className="bg-primary text-primary-foreground font-heading font-black text-xs tracking-wider px-6 py-3 rounded-lg hover:opacity-90 transition-opacity glow-neon"
              >
                COMPRAR LOTE
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
