import { Truck, LayoutList } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import productsHero from "@/assets/products-hero.jpeg";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt=""
          className="w-full h-full object-cover"
          width={1024}
          height={768}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      <div className="container relative py-14 px-4 space-y-6">
        {/* Badge */}
        <span className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-heading font-bold text-sm tracking-wider px-5 py-2.5 rounded-md shadow-lg">
          <Truck className="w-5 h-5" />
          PORTAL DE ATACADO
        </span>

        {/* Title */}
        <h1 className="font-heading font-black text-5xl md:text-7xl leading-[0.95] text-foreground italic">
          ESTOQUE O<br />
          <span className="text-gradient-neon">HARDCORE</span>
        </h1>

        {/* Description with left border */}
        <div className="border-l-2 border-primary pl-4 max-w-md">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Preços exclusivos para revendedores, academias e distribuidores.{" "}
            <span className="font-bold text-foreground">
              Pedido mínimo: R$ 2.500,00.
            </span>
          </p>
        </div>

        {/* Product image showcase */}
        <div className="relative mx-auto max-w-sm py-4">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent rounded-2xl blur-2xl" />
          <img
            src={productsHero}
            alt="Mansão Maromba Combo Drinks - Whisky, Vodka, Melancia e Gin"
            className="relative w-full h-auto rounded-2xl shadow-2xl"
            width={600}
            height={400}
          />
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary/90 backdrop-blur-sm text-primary-foreground font-heading font-black text-xs tracking-widest px-6 py-2 rounded-full shadow-lg">
            🔥 COMBO DRINKS — LANÇAMENTO
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 max-w-md pt-4">
          <button className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground font-heading font-black text-sm tracking-wider py-4 rounded-lg hover:opacity-90 transition-opacity glow-neon">
            <LayoutList className="w-5 h-5" />
            VER CATÁLOGO
          </button>
          <button className="w-full flex items-center justify-center bg-card border border-border text-foreground font-heading font-black text-sm tracking-wider py-4 rounded-lg hover:border-primary/50 transition-colors">
            CADASTRAR CNPJ
          </button>
        </div>
      </div>

      {/* Marquee banner */}
      <div className="bg-primary overflow-hidden py-2.5">
        <div className="animate-marquee whitespace-nowrap flex gap-8">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="font-heading font-black text-sm tracking-wider text-primary-foreground">
              • PREÇOS EXCLUSIVOS &nbsp;&nbsp; • MARGEM DE LUCRO MAXIMIZADA &nbsp;&nbsp; • ENTREGA EXPRESSA &nbsp;&nbsp; • SUPORTE DEDICADO &nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
