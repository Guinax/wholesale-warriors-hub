import comboDrinks from "@/assets/combo-drinks.jpeg";
import { Flame, Star, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

const highlights = [
  { icon: Flame, label: "MAIS VENDIDO", value: "Whisky Combo", to: "/mais-vendidos" },
  { icon: Star, label: "AVALIAÇÃO", value: "4.9 ★★★★★", to: "/avaliacoes" },
  { icon: TrendingUp, label: "MARGEM REVENDA", value: "até 68%", to: "/comissoes" },
];

const FeaturedProducts = () => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  return (
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

        <div className="grid grid-cols-3 gap-2">
          {highlights.map((h) => (
            <button
              key={h.label}
              onClick={() => navigate(h.to)}
              className="bg-card border border-border rounded-xl p-3 space-y-1.5 hover:border-primary/50 hover:shadow-[0_0_20px_hsl(45_100%_50%/0.1)] transition-all"
            >
              <h.icon className="w-5 h-5 text-primary mx-auto" />
              <p className="text-[9px] font-heading font-semibold tracking-widest text-muted-foreground text-center">
                {h.label}
              </p>
              <p className="font-heading font-bold text-xs text-foreground text-center">{h.value}</p>
            </button>
          ))}
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-border group">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
          <img
            src={comboDrinks}
            alt="Mansão Maromba Combo Drinks"
            className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
            width={600}
            height={400}
          />
          <div className="absolute bottom-0 left-0 right-0 z-20 p-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              {["Whisky Combo", "Vodka Combo", "Melancia Gin", "Tigrinho", "Colors Berry"].map(
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
                <p className="text-xs text-muted-foreground">
                  Lote c/ 7 sabores · R$ 8,90/un
                </p>
                <p className="font-heading font-black text-2xl text-foreground">
                  R$ 62,30<span className="text-sm font-semibold text-muted-foreground">/lote</span>
                </p>
              </div>
              <button
                onClick={() =>
                  addItem({
                    name: "LOTE COMBO DRINKS (7 SABORES)",
                    wholesalePrice: "R$ 62,30",
                    qty: 1,
                    minQty: 1,
                  })
                }
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
