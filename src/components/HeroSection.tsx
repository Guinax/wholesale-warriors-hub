const HeroSection = () => {
  return (
    <section className="relative overflow-hidden py-12 px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="container relative">
        <p className="text-xs font-heading font-semibold tracking-[0.3em] text-primary mb-3">
          PORTAL DE ATACADO
        </p>
        <h1 className="font-heading font-black text-3xl md:text-5xl leading-tight text-foreground mb-4">
          ESTOQUE O<br />
          <span className="text-gradient-neon">HARDCORE</span>
        </h1>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Preços exclusivos para revendedores e academias. Pedido mínimo: R$ 2.500,00.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
