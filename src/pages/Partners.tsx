import { ArrowRight, Boxes, CircleDollarSign, MapPin, Package, ShieldCheck, Store, TrendingUp, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const markers = [
  { top: "18%", left: "75%" },
  { top: "31%", left: "18%" },
  { top: "44%", left: "83%" },
  { top: "67%", left: "22%" },
  { top: "75%", left: "70%" },
];

const benefits = [
  { icon: MapPin, title: "Pedidos na sua região", description: "Oportunidades de vendas locais para lojas cadastradas." },
  { icon: TrendingUp, title: "Mais vendas para sua loja", description: "Acompanhe pedidos e resultados pelo painel." },
  { icon: ShieldCheck, title: "Gestão fácil e segura", description: "Estoque e repasses em um só lugar, com aprovação." },
];

const Partners = () => {
  const navigate = useNavigate();
  const accessPartner = () => navigate("/revendedor");

  return (
    <div className="min-h-screen bg-[#080a0b] pb-24 text-zinc-100 md:pb-0">
      <TopNav />
      <main>
        <section className="relative isolate overflow-hidden border-b border-yellow-400/10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_24%,rgba(250,204,21,0.11),transparent_53%)]" />
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-7 sm:px-6 md:min-h-[660px] md:grid-cols-2 md:gap-12 md:py-16 lg:px-8">
            <div className="relative order-first md:order-last">
              <div className="relative mx-auto h-[320px] w-full max-w-xl overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-[#101719] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-[390px]" aria-label="Ilustração da cobertura regional de lojas parceiras; não representa pedidos ou lojas em tempo real">
                <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(30deg,transparent 46%,#354141 47%,#354141 49%,transparent 50%),linear-gradient(120deg,transparent 45%,#2b383a 46%,#2b383a 48%,transparent 49%),linear-gradient(0deg,transparent 92%,#293536 93%,#293536 95%,transparent 96%)", backgroundSize: "105px 100px,130px 95px,100% 55px" }} />
                <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-400/35 bg-yellow-400/10 shadow-[0_0_60px_rgba(250,204,21,0.09)] sm:h-64 sm:w-64" />
                {markers.map((marker, index) => (
                  <div key={index} className="absolute z-10 rounded-full bg-[#151b1c] p-1.5 text-yellow-400 shadow-[0_2px_15px_rgba(0,0,0,0.6)]" style={{ top: marker.top, left: marker.left }}>
                    <MapPin className="h-5 w-5 fill-yellow-400/15" aria-hidden="true" />
                  </div>
                ))}
                <div className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-yellow-400 bg-black text-yellow-400 shadow-[0_0_0_10px_rgba(250,204,21,0.12)]">
                  <Store className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="absolute left-4 top-5 z-20 flex items-center gap-2 rounded-xl border border-white/15 bg-white/95 px-3 py-2.5 text-[#131516] shadow-lg sm:left-7 sm:top-8">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-yellow-400"><Package className="h-5 w-5" /></span>
                  <span><span className="block text-xs font-black">Pedidos próximos</span><span className="block text-[10px] text-zinc-600">Ilustração da rede local</span></span>
                  <ArrowRight className="h-4 w-4 text-yellow-700" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-yellow-400/15 bg-black/80 px-3 py-2 text-center text-[11px] text-zinc-300 backdrop-blur sm:bottom-6">Mapa ilustrativo • Oportunidades reais disponíveis após aprovação</div>
              </div>
            </div>
            <div className="relative z-10 md:order-first">
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/35 bg-yellow-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.13em] text-yellow-200">
                <Store className="h-4 w-4" /> Rede de parceiros
              </span>
              <h1 className="mt-6 max-w-xl font-heading text-4xl font-black leading-[1.07] sm:text-5xl lg:text-6xl">
                Conecte sua loja aos clientes <span className="text-yellow-400">da sua região.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-zinc-300 sm:text-lg">
                Receba oportunidades de pedidos próximos, aumente suas vendas e acompanhe estoque e repasses em um único painel.
              </p>
              <div className="mt-7 flex flex-col gap-3">
                <button type="button" onClick={accessPartner} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 font-black text-black transition hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200">
                  Cadastrar meu comércio <ArrowRight className="h-5 w-5" />
                </button>
                <button type="button" onClick={accessPartner} className="min-h-14 rounded-xl border border-white/30 bg-black/20 px-5 font-bold text-zinc-100 transition hover:border-yellow-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200">
                  Já sou parceiro · acessar painel
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-400" /> Cadastro sujeito à aprovação</span>
                <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-yellow-400" /> Operação local pela loja</span>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
            {benefits.map(({ icon: Icon, title, description }) => (
              <article key={title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:flex-col sm:items-start sm:p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-yellow-400/20 bg-yellow-400/10 text-yellow-400"><Icon className="h-6 w-6" /></span>
                <div><h2 className="font-heading text-base font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p></div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.04] p-5 text-sm text-zinc-300">
            <Boxes className="h-5 w-5 text-yellow-400" />
            <span>Controle de estoque integrado ao fluxo de pedidos.</span>
            <CircleDollarSign className="ml-auto h-5 w-5 text-yellow-400" />
            <span>Repasses acompanhados no painel do parceiro.</span>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default Partners;
