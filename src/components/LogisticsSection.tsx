import { Truck, Headphones } from "lucide-react";

const LogisticsSection = () => {
  return (
    <section className="py-8">
      <div className="container space-y-6">
        {/* Logistics info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-heading font-black text-lg text-foreground mb-3 flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            LOGÍSTICA INTEGRADA
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-5">
            Enviamos para todo o Brasil com transportadoras especializadas em cargas pesadas.
            Garantia de integridade do lacre e rastreamento em tempo real direto pelo seu painel de revendedor.
          </p>
          <div className="flex gap-6">
            <div>
              <span className="font-heading font-black text-2xl text-foreground">24H</span>
              <p className="text-[10px] font-heading font-semibold tracking-wider text-primary">DESPACHO</p>
            </div>
            <div>
              <span className="font-heading font-black text-2xl text-foreground">72H</span>
              <p className="text-[10px] font-heading font-semibold tracking-wider text-primary">CAPITAIS</p>
            </div>
          </div>
        </div>

        {/* Support CTA */}
        <div className="bg-secondary border border-border rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold text-sm text-foreground">GERENTE EXCLUSIVO</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tire suas dúvidas agora pelo WhatsApp corporativo.
            </p>
          </div>
          <button className="bg-primary text-primary-foreground font-heading font-bold text-[10px] tracking-wider px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
            CONTATAR AGORA
          </button>
        </div>
      </div>
    </section>
  );
};

export default LogisticsSection;
