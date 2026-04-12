import { Truck, Headphones, Shield, Clock } from "lucide-react";

const stats = [
  { icon: Clock, value: "24H", label: "DESPACHO" },
  { icon: Truck, value: "72H", label: "CAPITAIS" },
  { icon: Shield, value: "100%", label: "LACRE GARANTIDO" },
];

const LogisticsSection = () => {
  return (
    <section className="py-8">
      <div className="container space-y-6">
        {/* Logistics info */}
        <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
          <h2 className="font-heading font-black text-lg text-foreground mb-3 flex items-center gap-2 relative">
            <Truck className="w-5 h-5 text-primary" />
            LOGÍSTICA INTEGRADA
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5 relative">
            Enviamos para todo o Brasil com transportadoras especializadas em cargas pesadas.
            Garantia de integridade do lacre e rastreamento em tempo real direto pelo seu painel de revendedor.
          </p>
          <div className="grid grid-cols-3 gap-3 relative">
            {stats.map((s) => (
              <div key={s.label} className="bg-secondary rounded-lg p-3 text-center space-y-1">
                <s.icon className="w-4 h-4 text-primary mx-auto" />
                <span className="font-heading font-black text-xl text-foreground block">{s.value}</span>
                <p className="text-[9px] font-heading font-semibold tracking-wider text-primary">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Support CTA */}
        <div className="bg-gradient-to-r from-card to-secondary border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 animate-pulse-glow">
            <Headphones className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold text-sm text-foreground">GERENTE EXCLUSIVO</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tire suas dúvidas agora pelo WhatsApp corporativo.
            </p>
          </div>
          <button className="bg-primary text-primary-foreground font-heading font-bold text-[10px] tracking-wider px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap glow-neon">
            CONTATAR
          </button>
        </div>
      </div>
    </section>
  );
};

export default LogisticsSection;
